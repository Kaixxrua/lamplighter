// s25's works pouring into the UI library's page: the head of the library as a guest sees it, its works'
// previews coming down into their slots like water, row after row (the waterfall).
//
// The page is composed into a texture the size of the print (the leaf prints it as it prints a capture):
// over the page with its slots empty (s24's UI25: every preview a flat slot, its framework badge on it) each
// work's preview comes down from the slot's top as a sheet with a ragged, fingering front, its picture sliding
// down behind the front as it falls and coming to rest in place; the badge stays on top. A slot not yet
// reached is UI25's; a slot filled is the capture's own, texel for texel (when every slot is full the
// texture is the capture's window exactly, and the page prints the capture itself).
import * as THREE from 'three';
import { makeCanvas, canvasTexture } from 'film/lib/text.js';

// FALL: the pour's shape
//   margin: the texels round a preview box that belong to it (the slot's ground in UI25, the preview's
//     soft edge in the capture), as loadPage25 paints them
//   finger: how far the front's fingers reach ahead of its slowest part (texels), and its feather
//   slide: how far the picture slides behind the front (of what the front has still to go)
//   radius: the preview's corners (texels; the site's 5 CSS px)
//   lime: the hair of lime on the front as it falls (0 … 1; the site's own lime, #c1f41e)
export const FALL = { margin: 2, finger: 90, feather: 10, slide: 0.3, radius: 12.5, lime: 1 };

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// The page: UI25 (uBase) where nothing has come, the capture's window (uFull) where it has. The slots lie on
// a grid (NC columns at uColX, NR rows at uRowY, each PW × PH texels); slot i = row·NC + col.
const FALL_FRAG = /* glsl */ `
uniform sampler2D uBase, uFull;
uniform float uColX[NC], uRowY[NR];
uniform vec4 uBadge[NS];     // each slot's badge: x0, y0, x1, y1 (texels, y down; its outline's soft texels in it)
uniform vec2 uLev[NS];       // each slot: its fill (0 … 1), its fingers' seed
uniform float uFinger, uFeather, uSlide, uRadius, uLime;
uniform vec3 uLimeCol;       // sRGB
varying vec2 vUv;
vec3 lin(vec3 c){ return mix(c/12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
// the fingers' lag across a slot (0 … 1): three swells, the slot's own
float lag(float x, float s){
  float v = 0.55*sin(x/83.0 + 6.2832*s) + 0.30*sin(x/37.0 + 17.0*s + 1.3) + 0.15*sin(x/17.0 + 41.0*s + 4.1);
  return 0.5 + 0.5*v;
}
// inside the preview's rounded box (texels from its corner; 1 inside, 0 outside, a texel's feather)
float rounded(vec2 l){
  vec2 q = abs(l - 0.5*vec2(PW, PH)) - (0.5*vec2(PW, PH) - uRadius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  return clamp(0.5 - d, 0.0, 1.0);
}
void main(){
  vec4 base = textureLod(uBase, vUv, 0.0);
  vec2 p = vec2(vUv.x*TW, (1.0 - vUv.y)*TH);            // the texel's centre (y down)
  int col = -1, row = -1;
  for (int c = 0; c < NC; c++) if (p.x >= uColX[c] - MARGIN && p.x < uColX[c] + PW + MARGIN) col = c;
  for (int r = 0; r < NR; r++) if (p.y >= uRowY[r] - MARGIN && p.y < uRowY[r] + PH + MARGIN) row = r;
  if (col < 0 || row < 0){ gl_FragColor = base; return; }
  int i = row*NC + col;
  vec4 b = uBadge[i];
  vec2 lv = uLev[i];
  float L = lv.x;
  if (L <= 0.0 || (p.x >= b.x && p.x < b.z && p.y >= b.y && p.y < b.w)){ gl_FragColor = base; return; }
  if (L >= 1.0){ gl_FragColor = textureLod(uFull, vUv, 0.0); return; }
  vec2 l = p - vec2(uColX[col], uRowY[row]);              // in the preview's box (y down)
  // the front: how deep it has come at this column (from the box's top; its fingers ahead, its feather behind)
  float span = PH + 2.0*MARGIN + uFinger + uFeather;
  float D = L*span - MARGIN - uFinger*lag(l.x, lv.y);
  float a = clamp((D - l.y)/uFeather, 0.0, 1.0);
  // the picture behind it, sliding down to rest
  float off = uSlide*max(PH + MARGIN - max(D, 0.0), 0.0);
  vec2 s = vec2(p.x, p.y + off);
  // the badge is the page's, not the picture's: where the picture would bring its texels (and its shadow's)
  // up with it, it takes the column beside it (the picture is soft, so that is the same colour)
  if (s.x >= b.x - 4.0 && s.x < b.z + 4.0 && s.y >= b.y - 4.0 && s.y < b.w + 4.0) s.x = b.x - 5.0;
  vec3 full = textureLod(uFull, vec2(s.x/TW, 1.0 - s.y/TH), 0.0).rgb;
  // keep the slot's corners round while the picture is moving (at rest it is the capture's own)
  a *= mix(rounded(l), 1.0, step(off, 0.0));
  vec3 c = mix(base.rgb, full, a);
  // a hair of lime on the front as it falls
  float fr = (l.y - D + 0.5*uFeather)/3.0;
  float k = uLime*4.0*L*(1.0 - L)*exp(-fr*fr)*rounded(l);
  c = mix(c, lin(uLimeCol), clamp(k, 0.0, 1.0));
  gl_FragColor = vec4(c, 1.0);
}`;

const DEFS = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number.isInteger(v) && !['NC', 'NR', 'NS'].includes(k) ? `${v}.0` : `${v}`]));

export class Fall {
  // base: the page with its slots empty (UI25's texture); full: the capture's window (its texture); win: the
  // window [x, y, w, h] (capture texels); cards: manifest.json's cards (their preview and badge boxes)
  constructor({ base, full, win, cards }) {
    const [wx, wy, TW, TH] = win;
    const prev = cards.map((c) => c.parts.preview).filter(([, y]) => y < wy + TH);
    const xs = [...new Set(prev.map(([x]) => x))].sort((a, b) => a - b);
    const ys = [...new Set(prev.map(([, y]) => y))].sort((a, b) => a - b);
    const [, , PW, PH] = prev[0];
    if (prev.some(([, , w, h]) => w !== PW || h !== PH) || prev.length !== xs.length * ys.length)
      throw new Error('c_fall: the previews are not one grid');
    this.NC = xs.length;
    this.NR = ys.length;
    this.base = base;
    this.full = full;
    // the slots, row by row; each one's badge (with its outline's soft texels, as loadPage25 puts it back)
    const badge = new Map(cards.map((c) => [c.parts.preview.slice(0, 2).join(), c.parts.badge]));
    this.slots = [];
    for (const y of ys)
      for (const x of xs) {
        const [bx, by, bw, bh] = badge.get([x, y].join());
        this.slots.push({ box: [x - wx, y - wy, PW, PH], badge: [bx - wx - 1, by - wy - 1, bx - wx + bw, by - wy + bh] });
      }
    const NS = this.slots.length;
    this.rt = new THREE.WebGLRenderTarget(TW, TH, {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy: 8,
    });
    const defines = DEFS({ NC: this.NC, NR: this.NR, NS, TW, TH, PW, PH, MARGIN: FALL.margin });
    this.lev = Array.from({ length: NS }, () => new THREE.Vector2());
    this.mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: FALL_FRAG,
      defines,
      uniforms: {
        uBase: { value: base },
        uFull: { value: full },
        uColX: { value: xs.map((x) => x - wx) },
        uRowY: { value: ys.map((y) => y - wy) },
        uBadge: { value: this.slots.map(({ badge: b }) => new THREE.Vector4(...b)) },
        uLev: { value: this.lev },
        uFinger: { value: FALL.finger },
        uFeather: { value: FALL.feather },
        uSlide: { value: FALL.slide },
        uRadius: { value: FALL.radius },
        uLime: { value: FALL.lime },
        uLimeCol: { value: new THREE.Vector3(193 / 255, 244 / 255, 30 / 255) },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.key = '';
  }

  // the page with each slot filled to fill[i] (0 … 1; slots row by row), its fingers' seed seed[i]: UI25
  // itself while nothing has come, the capture itself once all has; else the composed texture
  render(renderer, fill, seed) {
    if (fill.every((f) => f <= 0)) return this.base;
    if (fill.every((f) => f >= 1)) return this.full;
    const key = fill.map((f) => f.toFixed(5)).join();
    if (key !== this.key) {
      this.key = key;
      fill.forEach((f, i) => this.lev[i].set(f, seed[i]));
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(this.rt);
      renderer.render(this.scene, this.cam);
      renderer.setRenderTarget(prev);
    }
    return this.rt.texture;
  }
}

// The capture's window (its works in), as a texture like the page's
export async function loadWindow(file, [x, y, w, h]) {
  const img = await createImageBitmap(await (await fetch(file)).blob(), x, y, w, h);
  const cv = makeCanvas(w, h);
  cv.getContext('2d').drawImage(img, 0, 0);
  img.close();
  return canvasTexture(cv, { srgb: true, mipmaps: true, anisotropy: 8 });
}
