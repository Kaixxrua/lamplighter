// Agent D2 · the tower of pages (s40). New pages of steel light come up out of an open book and go on up, storey on
// storey, six pages to a storey round a hexagon (the library's own figure). They carry the lines the reader writes
// (e1_glyphs.js CODE, the film's own render.mjs) in the light's steel, typed from the top of a page down as it comes
// up. The first storey rises out of the old pages (cut off at their surface); each one above it swings up from where
// it hangs folded over the top edge of the one below, so every column of pages is one long hinged strip. All light:
// additive, no depth write, dimmed by the fog; a page seen from behind (through the tower) fainter.
//
// Its frame (PageTower.group): the origin on the axis at the old pages' surface, y up; the hexagon's corners at
// 0°, 60° … from +x toward +z, so a flat side faces +z.
//   const tower = await PageTower.create({ uniforms: lib.uniforms, storeys, radius, height });
//   group.add(tower.group); in update(t): tower.set(j, { rise, swing, level, typed }) for each storey j (rise 0..1:
//   how far it has come up out of the pages, storey 0 only; swing (rad): how far it still hangs out from upright,
//   storeys 1…; level: its light 0..1; typed: how much of its text is written 0..1); then tower.update(camera).
//   tower.light(j, out) → Vector3: the middle of storey j (world), for a light there.
import * as THREE from 'three';
import { loadFonts, font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';
import { STEEL } from './agentbody.js';
import { CODE } from './e1_glyphs.js';

const VARIANTS = 6; // one text per column; a column's storeys run on down it
const TW = 256; // px a page in the atlas
const TH = 448;

// The pages' text: CODE, a line at a time, wrapped at a page's width; column v starts v lines further on.
async function pageAtlas(storeys) {
  await loadFonts();
  const cv = makeCanvas(TW * VARIANTS, TH * storeys);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff';
  g.font = font('mono', 15, 500);
  g.textBaseline = 'alphabetic';
  const cols = 25;
  const rows = [];
  for (const line of CODE) {
    for (let i = 0; i < line.length; ) {
      const n = i ? cols - 2 : cols;
      rows.push((i ? '  ' : '') + line.slice(i, i + n));
      i += n;
    }
    rows.push('');
  }
  const lead = 21;
  // column v, storey s: the page at (v·TW, s·TH), the top storey's page lowest in the canvas
  for (let v = 0; v < VARIANTS; v++) {
    let k = (v * 5) % rows.length;
    for (let s = 0; s < storeys; s++) {
      for (let y = s * TH + 32; y < (s + 1) * TH - 14; y += lead, k++) g.fillText(rows[k % rows.length], v * TW + 14, y);
    }
  }
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 });
}

const VERT = /* glsl */ `
attribute vec2 aUv; attribute vec2 aCell; attribute vec2 aState; // aCell: column, storey; aState: level, typed
uniform float uStoreys;
varying vec2 vUv; varying vec2 vTex; varying vec2 vState; varying vec3 vW;
void main(){
  vUv = aUv; vState = aState;
  vTex = vec2((aCell.x + aUv.x)/${VARIANTS.toFixed(1)}, 1.0 - (aCell.y + 1.0 - aUv.y)/uStoreys);
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uText; uniform vec3 uCol; uniform float uGain, uFogD, uBack, uSheet, uEdge, uClipY;
varying vec2 vUv; varying vec2 vTex; varying vec2 vState; varying vec3 vW;
void main(){
  float level = vState.x;
  if (level <= 0.0 || vW.y < uClipY) discard;
  // the text, typed from the top of the page down: written rows shown, the row being written brightest
  float typed = vState.y;
  float down = 1.0 - vUv.y;
  float m = texture2D(uText, vTex).r;
  float shown = 1.0 - smoothstep(typed - 0.012, typed + 0.012, down);
  float front = exp(-abs(down - typed)*30.0)*step(0.002, typed)*step(typed, 0.998);
  // the sheet, and its edges no thinner than about a pixel
  vec2 fw = max(fwidth(vUv), vec2(1e-5));
  vec2 e = min(vUv, 1.0 - vUv)/fw;
  float edge = 1.0 - smoothstep(0.5, 1.4, min(e.x, e.y));
  float a = uSheet*(0.6 + 0.4*vUv.y) + m*shown*(1.0 + 0.7*front) + uEdge*edge + 0.12*front;
  float face = gl_FrontFacing ? 1.0 : uBack;
  gl_FragColor = vec4(uCol*(a*uGain*level*face*exp(-uFogD*distance(vW, cameraPosition))), 1.0);
}`;

export class PageTower {
  static async create(o) {
    const storeys = o.storeys ?? 9;
    return new PageTower({ ...o, storeys, text: await pageAtlas(storeys) });
  }

  constructor({ uniforms, storeys = 9, radius = 0.21, height = 0.4, text, gain = 0.7, sheet = 0.05, edge = 0.25, back = 0.35, lean = 0.012, jitter = 0.015, seed = 40 }) {
    this.N = storeys;
    // each page leans out from the one below it a little more (the tower opens as it rises), and a little unevenly
    this.lean = lean;
    let h = seed * 9301 + 49297;
    const rnd = () => ((h = (h * 9301 + 49297) % 233280) / 233280) * 2 - 1;
    this.jit = Array.from({ length: 6 }, () => Array.from({ length: storeys }, () => jitter * rnd()));
    this.R = radius;
    this.H = height;
    const n = storeys * 6;
    this.state = Array.from({ length: storeys }, () => ({ rise: 0, swing: 0, level: 0, typed: 0 }));
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 4 * 3);
    this.st = new Float32Array(n * 4 * 2);
    const uv = [];
    const cell = [];
    const idx = [];
    for (let j = 0; j < storeys; j++) {
      for (let i = 0; i < 6; i++) {
        const v0 = (j * 6 + i) * 4;
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        for (let k = 0; k < 4; k++) cell.push(i, j);
        idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aState', new THREE.BufferAttribute(this.st, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aCell', new THREE.Float32BufferAttribute(cell, 2));
    g.setIndex(idx);
    this.uniforms = {
      uText: { value: text },
      uCol: { value: STEEL.clone() },
      uGain: { value: gain },
      uSheet: { value: sheet },
      uEdge: { value: edge },
      uBack: { value: back },
      uStoreys: { value: storeys },
      uClipY: { value: -1e9 },
      uFogD: uniforms.uFogD,
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    // the hexagon: corners at 0°, 60° … (x toward z); side i runs from corner i + 1 (its left, seen from outside)
    // to corner i, its outward normal at 60°·i + 30°
    this.corner = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(radius * Math.cos((i * Math.PI) / 3), 0, radius * Math.sin((i * Math.PI) / 3)));
    this.normal = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(Math.cos(((2 * i + 1) * Math.PI) / 6), 0, Math.sin(((2 * i + 1) * Math.PI) / 6)));
    this.update();
  }

  set(j, patch) {
    Object.assign(this.state[j], patch);
    return this;
  }

  // the clip: nothing of the tower below this world height (the old pages' surface)
  clip(y) {
    this.uniforms.uClipY.value = y;
    return this;
  }

  // lay the pages out from the storeys' state (each column a hinged strip, storey 0 rising out of the pages)
  update() {
    const P = this.pos;
    const S = this.st;
    const H = this.H;
    const L = new THREE.Vector3();
    const Rr = new THREE.Vector3();
    const up = new THREE.Vector3();
    const across = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      const cl = this.corner[(i + 1) % 6];
      const cr = this.corner[i];
      const nrm = this.normal[i];
      let phi = 0;
      const s0 = this.state[0];
      L.copy(cl).setY(-H * (1 - s0.rise));
      Rr.copy(cr).setY(-H * (1 - s0.rise));
      for (let j = 0; j < this.N; j++) {
        const s = this.state[j];
        if (j > 0) phi += s.swing + this.lean;
        const ph = phi + this.jit[i][j];
        up.set(nrm.x * Math.sin(ph), Math.cos(ph), nrm.z * Math.sin(ph)).multiplyScalar(H);
        const o = (j * 6 + i) * 4;
        // the page a little inside its place: a hair of dark between it and its neighbours
        across.subVectors(Rr, L).multiplyScalar(0.02);
        const bl = L.clone().add(across).addScaledVector(up, 0.012);
        const br = Rr.clone().sub(across).addScaledVector(up, 0.012);
        const quad = [bl, br, br.clone().addScaledVector(up, 0.976), bl.clone().addScaledVector(up, 0.976)];
        for (let k = 0; k < 4; k++) {
          P[(o + k) * 3] = quad[k].x;
          P[(o + k) * 3 + 1] = quad[k].y;
          P[(o + k) * 3 + 2] = quad[k].z;
          S[(o + k) * 2] = s.level;
          S[(o + k) * 2 + 1] = s.typed;
        }
        L.add(up);
        Rr.add(up);
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aState.needsUpdate = true;
    return this;
  }

  // the middle of storey j as it stands upright (world)
  light(j, out = new THREE.Vector3()) {
    return this.group.localToWorld(out.set(0, (j + 0.5) * this.H, 0));
  }
}
