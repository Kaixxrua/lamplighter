// Film runtime: loads one timeline row (a shot), renders deterministic frames through the post stack.
//
// Shot module contract (shots/<module>.js):
//   export const meta = { frames, shutter?: 0.5, jitter?: true, adaptive?: true, post?: {...}, quality?: { final: {...} } };
//   export async function setup(ctx) → { scene, camera, update(t, ctx), post?(t, ctx), render?(renderer, target, t), overlay? }
//   - update(t) MUST be a pure function of t (seconds since the module's own t = 0). It is called
//     several times per frame at sub-frame times (motion blur), and frames may be rendered in any order.
//     ctx.samples is the frame's own sample count (see TRAVEL), which can differ from frame to frame.
//   - post(t) returns overrides for POST_DEFAULTS (exposure, grade, dof, streak, fade, letterbox …).
//   - render() is optional, for split screens or multi-scene compositing; it must draw into `target`.
//   - overlay is optional: a THREE.Scene drawn with the same camera into its own HDR layer (cleared to
//     black) and added after depth of field, before bloom. For emissive things in focus that must stay
//     sharp over a defocused background (s09's thread). Nothing in the scene occludes it, so the shot
//     keeps occluders out of its way. Read after every update(), like scene and camera.
//   - margin(t) is optional: { tex, alpha } — a display-space, premultiplied canvas texture at the
//     output size, printed over the letterbox bars after everything else (s11's edge print).
import * as THREE from 'three';
import { Post, mergePost } from './post.js';
import { loadFonts, typesetCard, canvasTexture } from '../lib/text.js';
import { halton, hash } from '../lib/rng.js';
import { envelope, track } from '../lib/ease.js';

export const FPS = 24;

export const QUALITY = {
  draft: { renderScale: 0.5, samples: 1, bloomLevels: 6, dof: 0 },
  preview: { renderScale: 1.0, samples: 1, bloomLevels: 7, dof: 0 },
  final: { renderScale: 1.0, samples: 2, maxSamples: 96, bloomLevels: 7, dof: 1 },
  still: { renderScale: 1.0, samples: 8, maxSamples: 96, bloomLevels: 7, dof: 1 },
};

// Motion blur is the mean of a frame's samples, spread evenly over the shutter, and `samples` is the
// least a frame gets. Where the camera's own motion carries the picture further than TRAVEL pixels per
// sample (pixels of a 1920-wide frame, so a frame gets the same count at every size), it gets more, in
// steps of four, up to maxSamples: a whip at 8 samples was a string of copies 9 px apart (s31 f20).
// Asking for a count (--samples) fixes it, and so does meta.adaptive: false; a shot that draws its own
// frame (render()) keeps its own. What no count smooths is a glint thinner than a pixel moving fast:
// each copy lands on a pixel's sample point or misses it, so its streak stays a fine grain (s26's
// lantern rim at 48, 96 and 192); the shuffled pairing below keeps that grain from lining up.
const TRAVEL = 1.25;

export class Film {
  constructor(opts) {
    this.opts = opts;
  }

  async init() {
    const o = this.opts;
    await loadFonts();
    this.timeline = await (await fetch('/film/timeline.json', { cache: 'no-store' })).json();
    const row = this.timeline.shots.find((s) => s.id === o.shot);
    // shots outside the timeline (look-dev, tests) sit far past the end: no cards, no letterbox
    this.row = row || { id: o.shot, module: o.shot, start: 100000, frames: null, offset: 0, act: 0 };
    this.mod = await import(`/shots/${this.row.module}.js`);
    this.meta = this.mod.meta || {};
    const q = { ...QUALITY[o.quality], ...(this.meta.quality?.[o.quality] || {}) };
    if (o.samples) q.samples = o.samples;
    if (o.renderScale) q.renderScale = o.renderScale;
    this.q = q;
    this.plan = new Map(); // local frame → { travel, samples }

    this.outW = o.width;
    this.outH = o.height;
    this.inW = Math.round((o.width * q.renderScale) / 2) * 2;
    this.inH = Math.round((o.height * q.renderScale) / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    gl.disable(gl.DITHER);
    this.gl = gl;
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer = renderer;

    this.post = new Post(renderer, {
      inW: this.inW,
      inH: this.inH,
      outW: this.outW,
      outH: this.outH,
      bloomLevels: q.bloomLevels,
      dofQuality: q.dof,
    });

    const loader = new THREE.TextureLoader();
    this.ctx = {
      THREE,
      renderer,
      width: this.inW,
      height: this.inH,
      outWidth: this.outW,
      outHeight: this.outH,
      fps: FPS,
      lang: o.lang,
      quality: o.quality,
      samples: q.samples,
      frames: this.row.frames ?? this.meta.frames,
      globalStart: this.row.start,
      offset: this.row.offset || 0,
      row: this.row,
      load: {
        texture: (url, { srgb = true, anisotropy = 8, repeat = false, mipmaps = true } = {}) =>
          new Promise((resolve, reject) =>
            loader.load(
              url,
              (t) => {
                t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                t.anisotropy = anisotropy;
                t.generateMipmaps = mipmaps;
                t.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
                if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
                resolve(t);
              },
              undefined,
              reject,
            ),
          ),
        json: async (url) => (await fetch(url, { cache: 'no-store' })).json(),
      },
    };
    this.shot = await this.mod.setup(this.ctx);
    if (!this.shot || !this.shot.update) throw new Error(`shot ${o.shot}: setup() must return { scene, camera, update }`);
    this._prepareCards();
    this.pixels = new Uint8Array(this.outW * this.outH * 4);
    // compile everything once so the first timed frame is honest (two samples compile what more do)
    this.renderFrame(0, null, Math.min(q.samples, 2));
    return this.info();
  }

  info() {
    const gl = this.gl;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
      shot: this.row.id,
      module: this.row.module,
      frames: this.ctx.frames,
      globalStart: this.row.start,
      inW: this.inW,
      inH: this.inH,
      outW: this.outW,
      outH: this.outH,
      samples: this.q.samples,
      maxSamples: this.adaptive() ? this.q.maxSamples : this.q.samples,
      quality: this.opts.quality,
      lang: this.opts.lang,
    };
  }

  adaptive() {
    const q = this.q;
    return q.samples > 1 && q.maxSamples > q.samples && !this.opts.samples && !this.shot.render && this.meta.adaptive !== false;
  }

  // How far the camera's own motion carries the picture during one frame's shutter, in pixels of a
  // 1920-wide frame: the scene's depth at the frame's own time, drawn small, carried through the cameras
  // at the shutter's two ends. The 99th percentile, so a sliver at the edge does not set it; a point
  // that passes the eye within the shutter counts as endless.
  travelAt(localFrame) {
    const { shot, ctx } = this;
    const shutter = (this.meta.shutter ?? 0.5) / FPS;
    const tc = (localFrame + (this.row.offset || 0)) / FPS;
    ctx.samples = this.q.samples;
    const vp = [-0.5, 0.5, 0].map((e) => {
      shot.update(tc + e * shutter, ctx);
      shot.camera.updateWorldMatrix(true, false);
      return new THREE.Matrix4().multiplyMatrices(shot.camera.projectionMatrix, shot.camera.matrixWorldInverse);
    });
    const { data, width, height } = this.post.depthProbe(shot.scene, shot.camera);
    const back = vp[2].invert();
    const a = vp[0].multiply(back).elements;
    const b = vp[1].multiply(back).elements;
    const hx = 960;
    const hy = (960 * this.inH) / this.inW;
    const out = new Float32Array(width * height);
    for (let j = 0, i = 0; j < height; j++) {
      const y = ((j + 0.5) / height) * 2 - 1;
      for (let c = 0; c < width; c++, i++) {
        const x = ((c + 0.5) / width) * 2 - 1;
        const z = ((data[4 * i] + data[4 * i + 1] / 255 + data[4 * i + 2] / 65025) / 255) * 2 - 1;
        const wa = a[3] * x + a[7] * y + a[11] * z + a[15];
        const wb = b[3] * x + b[7] * y + b[11] * z + b[15];
        if (wa < 1e-3 || wb < 1e-3) {
          out[i] = Infinity;
          continue;
        }
        const dx = (b[0] * x + b[4] * y + b[8] * z + b[12]) / wb - (a[0] * x + a[4] * y + a[8] * z + a[12]) / wa;
        const dy = (b[1] * x + b[5] * y + b[9] * z + b[13]) / wb - (a[1] * x + a[5] * y + a[9] * z + a[13]) / wa;
        out[i] = Math.hypot(dx * hx, dy * hy);
      }
    }
    out.sort();
    return out[Math.floor(0.99 * (out.length - 1))];
  }

  // { travel, samples } of one frame (see TRAVEL); travel is null where the count is fixed
  planAt(localFrame) {
    let p = this.plan.get(localFrame);
    if (!p) {
      const q = this.q;
      if (!this.adaptive()) p = { travel: null, samples: q.samples };
      else {
        const travel = this.travelAt(localFrame);
        const need = Math.ceil(travel / TRAVEL);
        p = { travel, samples: need <= q.samples ? q.samples : Math.min(q.maxSamples, 4 * Math.ceil(need / 4)) };
      }
      this.plan.set(localFrame, p);
    }
    return p;
  }

  _prepareCards() {
    this.cards = [];
    const cards = this.timeline.cards || [];
    const a = this.row.start;
    const b = this.row.start + (this.ctx.frames ?? 1e9);
    for (const c of cards) {
      if (c.end <= a || c.start >= b) continue;
      const canv = typesetCard(c, this.outW, this.outH);
      const layers = canv.map((cv, i) => ({
        tex: canvasTexture(cv, { srgb: false, mipmaps: false, anisotropy: 1, premultiply: true }),
        delay: c.layers[i].delay || 0,
      }));
      this.cards.push({ ...c, layers });
    }
  }

  cardsAt(g) {
    const out = [];
    for (const c of this.cards) {
      if (g < c.start || g >= c.end) continue;
      for (const L of c.layers) {
        const alpha = envelope(g, c.start + L.delay, c.end, c.fadeIn ?? 18, c.fadeOut ?? 12);
        if (alpha > 0) out.push({ tex: L.tex, alpha });
      }
    }
    return out.slice(0, 2);
  }

  letterboxAt(g) {
    const keys = this.timeline.letterbox;
    if (!keys || !keys.length) return 0;
    return track(keys, g);
  }

  // Depth-only pass with each opaque shader's own vertex stage, so the full pass shades every pixel
  // once (the software rasteriser tests depth before running the fragment shader). Transparent and
  // non-shader materials sit it out; the twins are pushed back a hair so the real pass wins ties.
  depthPrepass(scene, cam) {
    const twins = (this._depthTwins ??= new WeakMap());
    const swapped = [];
    scene.traverseVisible((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      if (m.transparent || !m.depthWrite || !m.depthTest || !m.isShaderMaterial) {
        swapped.push([o, null]);
        return;
      }
      let d = twins.get(m);
      if (!d) {
        d = new THREE.ShaderMaterial({
          vertexShader: m.vertexShader,
          fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
          uniforms: m.uniforms,
          defines: m.defines,
          side: m.side,
          colorWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 2,
        });
        twins.set(m, d);
      }
      swapped.push([o, m]);
    });
    for (const [o, m] of swapped) {
      if (m) o.material = twins.get(m);
      else o.visible = false;
    }
    this.renderer.render(scene, cam);
    for (const [o, m] of swapped) {
      if (m) o.material = m;
      else o.visible = true;
    }
  }

  // count: exactly this many samples, whatever the frame's plan says (the warm-up)
  renderFrame(localFrame, profile = null, count = null) {
    const { renderer, post, shot } = this;
    const K = count ?? this.planAt(localFrame).samples;
    this.ctx.samples = K;
    const shutter = (this.meta.shutter ?? 0.5) / FPS;
    const tc = (localFrame + (this.row.offset || 0)) / FPS;
    const jitter = K > 1 && this.meta.jitter !== false;
    // The sub-pixel offsets go to the shutter times in a shuffled order, fixed per frame. Paired in step
    // (offset k with time k), Halton's alternation laid the copies of a fast, thin, bright edge into regular
    // stripes across its smear, finer but more regular with more samples (s26's lantern ring at 48 and 96).
    const order = jitter ? [...Array(K).keys()].sort((a, b) => hash(a, localFrame, 0x5a17) - hash(b, localFrame, 0x5a17)) : null;
    for (let k = 0; k < K; k++) {
      const t = K > 1 ? tc + ((k + 0.5) / K - 0.5) * shutter : tc;
      shot.update(t, this.ctx);
      const cam = shot.camera;
      if (jitter) cam.setViewOffset(this.inW, this.inH, halton(order[k] + 1, 2) - 0.5, halton(order[k] + 1, 3) - 0.5, this.inW, this.inH);
      renderer.setRenderTarget(post.sceneRT);
      if (shot.render) shot.render(renderer, post.sceneRT, t);
      else {
        renderer.setClearColor(shot.clearColor ?? 0x000000, 1);
        renderer.clear(true, true, false);
        renderer.autoClear = false;
        if (this.meta.prepass === true) this.depthPrepass(shot.scene, cam);
        renderer.render(shot.scene, cam);
        renderer.autoClear = true;
      }
      if (shot.overlay) {
        renderer.setRenderTarget(post.overlayTarget());
        renderer.setClearColor(0x000000, 1);
        renderer.clear(true, true, false);
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.render(shot.overlay, cam);
        renderer.autoClear = autoClear;
      }
      if (jitter) cam.clearViewOffset();
      if (K > 1) post.accumulate(k === 0, 1 / K, !!shot.overlay);
    }
    if (K > 1) shot.update(tc, this.ctx);
    if (profile) {
      this._sync(K > 1 ? post.accumRT : post.sceneRT);
      profile.scene = performance.now();
    }
    const p = mergePost(
      this.timeline.grades?.[`act${this.row.act}`],
      this.timeline.grades?.[this.row.grade],
      this.meta.post,
      shot.post ? shot.post(tc, this.ctx) : null,
    );
    const g = this.row.start + localFrame;
    const lb = p.letterbox ?? this.letterboxAt(g);
    const src = K > 1 ? post.accumRT.texture : post.sceneRT.texture;
    const overlay = shot.overlay ? (K > 1 ? post.ovAccumRT : post.ovRT).texture : null;
    if (profile) {
      post.nameMaterials();
      post.prof = {};
      post.profT = performance.now();
    }
    const margin = shot.margin ? shot.margin(tc, this.ctx) : null;
    const out = post.run(src, p, { camera: shot.camera, frame: g, cards: this.cardsAt(g), letterbox: lb, pack: true, overlay, margin });
    if (profile) {
      this._sync(out);
      profile.post = performance.now();
      profile.passes = post.prof;
      post.prof = null;
    }
    return out;
  }

  // Force the GPU process to finish (gl.finish() does not block under Chromium): read one pixel.
  _sync(rt) {
    const isByte = rt.texture.type === THREE.UnsignedByteType;
    const buf = isByte ? new Uint8Array(4) : new Uint16Array(4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, 1, 1, buf);
  }

  // Render, read back, and start the upload without waiting for it: the next frame renders while
  // the previous one is still travelling to the sink. Two buffers; a buffer is reused only after
  // its previous upload completed. Call flush() after the last frame.
  async renderAndSend(localFrame, { profile = false } = {}) {
    if (!this.bufs) {
      this.bufs = [this.pixels, new Uint8Array(this.pixels.length)];
      this.inflight = [null, null];
      this.slot = 0;
    }
    const t0 = performance.now();
    const prof = profile ? {} : null;
    const rt = this.renderFrame(localFrame, prof);
    const slot = (this.slot = 1 - this.slot);
    const tw = performance.now();
    if (this.inflight[slot]) {
      await this.inflight[slot];
      // Frame Blobs live in the browser process; V8 does not feel their size, so collect them now
      // (renderer launched with --js-flags=--expose-gc) or the blob store runs out of memory.
      globalThis.gc?.();
    }
    const wait = performance.now() - tw;
    this.renderer.readRenderTargetPixels(rt, 0, 0, this.outW, this.outH, this.bufs[slot]);
    const t1 = performance.now();
    this.inflight[slot] = fetch(`/__frame/${localFrame}`, { method: 'POST', body: new Blob([this.bufs[slot]]) }).then((res) => {
      if (!res.ok) throw new Error(`sink refused frame ${localFrame}: ${res.status}`);
    });
    const r = { total: t1 - t0, render: t1 - t0 - wait, wait, fetchCall: performance.now() - t1, samples: this.ctx.samples };
    if (prof) {
      r.scene = prof.scene - t0;
      r.post = prof.post - prof.scene;
      r.read = t1 - prof.post - wait;
      r.passes = Object.fromEntries(Object.entries(prof.passes).map(([k, v]) => [k, Math.round(v)]));
    }
    return r;
  }

  async flush() {
    await Promise.all((this.inflight || []).filter(Boolean));
  }
}
