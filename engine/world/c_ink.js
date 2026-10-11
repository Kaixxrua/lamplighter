// s24's tweet card on the X board: its words flow like ink out of the English and come together as the
// site's Chinese (the tweet's stored translation, translation_zh), the card's foot (its date, its fold bar,
// its bottom border) rising as the text closes up from seven lines to four.
//
// The card is drawn into a texture of a box of the capture, which the page prints over its own print there
// (Leaf.inset); the texture runs a margin past the box (the capture's own texels), so the print's filtering,
// as it reaches over the box's edges, finds there what it finds on the capture (no seam at any blur the
// develop takes it to). Everything in the box but the tweet's text is the capture of the film's
// language (its chrome), copied texel for texel: the card's head (the blurred avatar, Tibo, its buttons,
// ♡ 22864) and its foot, which slides up as the text closes up. The text is ink: its coverage measured on
// the two captures (the English in the en capture, the Chinese in the zh capture: the site's own type, as
// it set them), printed in the card's ink on the card's paper. At the start the English lies as the en
// capture has it, at the end the Chinese as the zh capture has it; in either state the box is the capture
// of that language exactly (to a hair: a coverage of 8 bits), or, in the other language's chrome, the
// same card with the other text (the zh film opens on the English in the zh card, the en film ends on the
// Chinese in the en card).
//
// The flow: the two texts are carried by one swirling field (the curl of a windowed gradient noise, so it
// keeps the ink's area and never carries it out of the card's text box), the English forward from the
// start, the Chinese back from the end; each thins as it is carried far (its coverage taken from a
// blurrier mip), and the one gives way to the other where both are most smeared (half way), so no word is
// ever faded out where it can be read. Under the swirl the whole text closes up from the English's seven
// lines to the Chinese's four: a squash about the first line, so the last English line comes to rest just
// over the risen date. The trace is done on a quarter-size grid (the field is smooth), the ink at full size.
import * as THREE from 'three';
import { makeCanvas } from 'film/lib/text.js';

// Texels of the captures (y down). The card's outer corner is at CARD.x, CARD.y; 'card-local' below is
// from there.
export const INK = {
  box: [3072, 0, 1920, 1408], // the box the card is printed over: on the 64-texel grid (so its mips are the
  // capture's own), from the capture's top (the board's filter row and its rule are in it), wide enough for
  // the card and the date field over the next card
  margin: 64, // the texture's margin past the box, left, right and under it (a texel of mip 6)
  card: [3124, 248, 1476], // the card's outer box: x, y, width; its height is 1108 in English, 856 in Chinese
  head: 160, // card-local: above this row the card is the same in both languages (its head)
  foot: 808, // card-local: the foot's top in the English (the date's top less a margin); 556 in the Chinese
  rise: 252, // how far the foot rises: three lines of 84
  bodyRef: 175, // card-local: a row of the card with nothing on it but its paper and side borders
  rows: { en: [190, 808], zh: [190, 556] }, // card-local rows of each language's text
  cols: [40, 1436], // card-local columns of the text box (inside the card's borders)
  pin: 244, // card-local: the row the squash is about (between the two first lines' centres)
  k: 0.58312, // the squash at the end: the Chinese's first line to its date over the English's (345.5 / 592.5)
  paper: [253, 252, 243], // the card's paper (#FDFCF3), sRGB
  ink: [24, 35, 58], // its text, sRGB
  flowBox: [0, 150, 1476, 680], // card-local box the trace covers (x, y, w, h), at a quarter of the size
  // The board's date field (lime, in the filter row over the next card) as captured is focused: the capture
  // set it to 10-05 by filling it, and its month segment ('10') is left selected (white on the browser's
  // blue). The chrome shows the field as it is once the guest clicks away: the segment in the field's own
  // ink on its lime, the glyphs' own coverage (unmixed from the blue and the white, re-inked).
  focus: { zh: [4878, 66, 72, 68], en: [4698, 66, 68, 68] }, // the selected segment (capture texels, 2 round)
  sel: [39, 101, 164], // the selection's blue, sRGB
  selInk: [255, 255, 255], // the selected glyphs
  field: [193, 244, 30], // the field's lime (#C1F41E)
  fieldInk: [7, 13, 28], // its glyphs (#070D1C)
};

// the texture: the box and its margin (none over the capture's top, where the box starts); where the card's
// corner is in it
const TX = INK.box[0] - INK.margin; // the texture's corner in the capture
const TY = INK.box[1];
const TW = INK.box[2] + 2 * INK.margin;
const TH = INK.box[3] + INK.margin;
const OX = INK.card[0] - TX;
const OY = INK.card[1] - TY;
const CROP_H = TH + INK.rise; // the base capture's crop: room under the card for the foot's slide (blank board)

// The flow, as the ink's physics: s (0 … 1) is the flow's progress.
//   the field: its curl scaled so the ink is carried about D texels over the whole flow (half of it each
//     way at the hand-over), eddies 'lam' texels across, the field changing 'om' noise cells over the flow;
//   'steps': the trace's steps over the whole flow (RK2); 'lod': how blurry the ink gets, carried all the way
//     (a mip level: it thins as it spreads); 'cross': the hand-over from the English to the Chinese;
//     'squash': when the text closes up (and the foot rises), smootherstep over this part of the flow;
//   'bleed': how much body the ink keeps as it spreads (its blurred coverage a → 1 − (1 − a)^(1 + bleed·lod):
//     a stroke carried far goes soft but stays ink, not a grey haze; nothing at lod 0, so the ends are exact).
export const FLOW = { D: 150, lam: 170, om: 1.4, steps: 20, lod: 2.6, bleed: 1.0, cross: [0.4, 0.6], squash: [0.22, 0.78], win: 36 };

const DEFS = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number.isInteger(v) ? `${v}.0` : `${v}`]));

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// gradient noise with its derivatives (quintic; an integer hash, the same on any GPU) and the field
const FIELD = /* glsl */ `
uniform float uD, uLam, uOm, uWinF;
uniform vec4 uWin;          // the text box in the English's frame (card-local): x0, y0, x1, y1
uniform vec2 uSq;           // the squash's part of the flow
uvec3 pcg3d(uvec3 v){
  v = v*1664525u + 1013904223u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  v ^= v >> 16u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  return v;
}
vec3 grad3(vec3 c){ return vec3(pcg3d(uvec3(c)) & uvec3(0xffffu))*(2.0/65535.0) - 1.0; }
vec4 noised(vec3 x){
  vec3 i = floor(x), f = x - i;
  vec3 u = f*f*f*(f*(f*6.0 - 15.0) + 10.0);
  vec3 du = 30.0*f*f*(f*(f - 2.0) + 1.0);
  vec3 ga = grad3(i), gb = grad3(i + vec3(1, 0, 0)), gc = grad3(i + vec3(0, 1, 0)), gd = grad3(i + vec3(1, 1, 0));
  vec3 ge = grad3(i + vec3(0, 0, 1)), gf = grad3(i + vec3(1, 0, 1)), gg = grad3(i + vec3(0, 1, 1)), gh = grad3(i + vec3(1, 1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec3(1, 0, 0)), vc = dot(gc, f - vec3(0, 1, 0)), vd = dot(gd, f - vec3(1, 1, 0));
  float ve = dot(ge, f - vec3(0, 0, 1)), vf = dot(gf, f - vec3(1, 0, 1)), vg = dot(gg, f - vec3(0, 1, 1)), vh = dot(gh, f - vec3(1, 1, 1));
  float k1 = vb - va, k2 = vc - va, k3 = ve - va, k4 = va - vb - vc + vd, k5 = va - vc - ve + vg, k6 = va - vb - ve + vf;
  float k7 = -va + vb + vc - vd + ve - vf - vg + vh;
  vec3 g1 = gb - ga, g2 = gc - ga, g3 = ge - ga, g4 = ga - gb - gc + gd, g5 = ga - gc - ge + gg, g6 = ga - gb - ge + gf;
  vec3 g7 = -ga + gb + gc - gd + ge - gf - gg + gh;
  float n = va + k1*u.x + k2*u.y + k3*u.z + k4*u.x*u.y + k5*u.y*u.z + k6*u.z*u.x + k7*u.x*u.y*u.z;
  vec3 d = ga + g1*u.x + g2*u.y + g3*u.z + g4*u.x*u.y + g5*u.y*u.z + g6*u.z*u.x + g7*u.x*u.y*u.z
    + du*vec3(k1 + k4*u.y + k6*u.z + k7*u.y*u.z, k2 + k5*u.z + k4*u.x + k7*u.z*u.x, k3 + k6*u.x + k5*u.y + k7*u.x*u.y);
  return vec4(n, d);
}
float sqAt(float tau){ float x = clamp((tau - uSq.x)/(uSq.y - uSq.x), 0.0, 1.0); return x*x*x*(x*(x*6.0 - 15.0) + 10.0); }
// the field at p (the English's frame, card-local texels) at flow time tau: the curl of the noise times a
// window that is 0 on the text box's edge (so nothing crosses it); the box's foot is the foot's top as it rises
vec2 vel(vec2 p, float tau){
  vec3 q = vec3(p/uLam, tau*uOm) + 64.0;
  vec4 a = noised(q);
  vec4 b = noised(q*vec3(2.2, 2.2, 1.6) + vec3(17.3, 5.1, 3.7));
  float psi = a.x + 0.4*b.x;
  vec2 gp = (a.yz + 0.88*b.yz)/uLam;
  float m = sqAt(tau);
  float foot = PIN + (FOOT - PIN - RISE*m)/(1.0 - (1.0 - K)*m) - 4.0;
  vec2 lo = clamp((p - uWin.xy)/uWinF, 0.0, 1.0);
  vec2 hi = clamp((vec2(uWin.z, foot) - p)/uWinF, 0.0, 1.0);
  vec2 sl = lo*lo*(3.0 - 2.0*lo), sh = hi*hi*(3.0 - 2.0*hi);
  vec2 dl = 6.0*lo*(1.0 - lo)/uWinF, dh = -6.0*hi*(1.0 - hi)/uWinF;
  float wx = sl.x*sh.x, wy = sl.y*sh.y;
  vec2 gw = vec2((dl.x*sh.x + sl.x*dh.x)*wy, (dl.y*sh.y + sl.y*dh.y)*wx);
  vec2 g = wx*wy*gp + psi*gw;
  float A = 1.5707963*sin(3.1415927*tau);
  return uD*uLam*A*vec2(g.y, -g.x);
}`;

// the trace, on a quarter-size grid over the text: where the ink at each point (now) was at the start (the
// English, traced back) and where it will be at the end (the Chinese, traced on), in the English's frame
const FLOW_FRAG = /* glsl */ `
uniform float uS, uSig;
varying vec2 vUv;
${FIELD}
void main(){
  vec2 c = vec2(FX0 + vUv.x*FW4, FY0 + (1.0 - vUv.y)*FH4);
  vec2 u = vec2(c.x, PIN + (c.y - PIN)/uSig);
  vec2 p = u;
  int n = int(ceil(STEPS*uS));
  float h = uS/float(max(n, 1));
  for (int i = 0; i < int(STEPS); i++){
    if (i >= n) break;
    float ta = uS - float(i)*h;
    vec2 k1 = vel(p, ta);
    p -= h*vel(p - 0.5*h*k1, ta - 0.5*h);
  }
  vec2 dE = p - u;
  p = u;
  n = int(ceil(STEPS*(1.0 - uS)));
  h = (1.0 - uS)/float(max(n, 1));
  for (int i = 0; i < int(STEPS); i++){
    if (i >= n) break;
    float ta = uS + float(i)*h;
    vec2 k1 = vel(p, ta);
    p += h*vel(p + 0.5*h*k1, ta + 0.5*h);
  }
  gl_FragColor = vec4(dE, p - u);
}`;

// the card: its chrome (the base capture), its text in ink
const CARD_FRAG = /* glsl */ `
uniform sampler2D uChrome, uMask, uFlow;
uniform float uM, uSig, uFlowOn, uBaseEN, uW, uLodE, uLodZ, uBleed;
uniform vec3 uPaper, uInk;  // sRGB
varying vec2 vUv;
vec3 lin(vec3 c){ return mix(c/12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
vec3 chrome(vec2 c){ vec2 q = c + vec2(OX, OY); return texture2D(uChrome, vec2(q.x/TW, 1.0 - q.y/CROP_H)).rgb; }
vec2 uvM(vec2 c){ vec2 q = c + vec2(OX, OY); return vec2(q.x/TW, 1.0 - q.y/TH); }
// a text's ink at c, 'lod' blurry: soft as it spreads, but keeping its body (exactly the coverage at lod 0)
float ink(vec2 c, float lod, int ch){
  vec4 m = textureLod(uMask, uvM(c), lod);
  float a = ch == 0 ? m.r : m.g;
  return lod > 0.0 ? 1.0 - pow(1.0 - a, 1.0 + uBleed*lod) : a;
}
void main(){
  vec2 c = vec2(vUv.x*TW, (1.0 - vUv.y)*TH) - vec2(OX, OY);
  float sh = RISE*uM;
  vec3 col;
  if (c.x < 0.0 || c.x >= CW || c.y < HEAD) col = chrome(c);         // round the card, and its head
  else if (c.y >= FOOT - sh) col = chrome(c + vec2(0.0, uBaseEN > 0.5 ? sh : sh - RISE));
  else if (c.x <= COL0 || c.x >= COL1) col = chrome(vec2(c.x, BODYREF));
  else {
    vec2 u = vec2(c.x, PIN + (c.y - PIN)/uSig);
    vec4 d = uFlowOn > 0.5 ? texture2D(uFlow, vec2((c.x - FX0)/FW4, 1.0 - (c.y - FY0)/FH4)) : vec4(0.0);
    vec2 pE = u + d.xy;
    vec2 pZ = u + d.zw;
    pZ.y = PIN + (pZ.y - PIN)*K;
    float aE = uW < 1.0 ? ink(pE, uLodE, 0) : 0.0;
    float aZ = uW > 0.0 ? ink(pZ, uLodZ, 1) : 0.0;
    float rho = mix(aE, aZ, uW);
    col = lin(mix(uPaper, uInk, rho));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

// Coverage of the text in a capture (its green channel between the card's paper and its ink), card-local
// rows [r0, r1) and the text box's columns, into one channel (0 R, 1 G) of an RGBA buffer the texture's size.
// img: the capture's crop (as loadInkCard makes it).
function coverage(img, rows, buf, ch) {
  const cv = makeCanvas(TW, TH);
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, TW, TH, 0, 0, TW, TH);
  const d = g.getImageData(0, 0, TW, TH).data;
  const p = INK.paper[1];
  const k = 255 / (p - INK.ink[1]);
  const [c0, c1] = INK.cols;
  for (let y = OY + rows[0]; y < OY + rows[1]; y++)
    for (let x = OX + c0; x < OX + c1; x++) {
      const o = (y * TW + x) * 4;
      buf[o + ch] = Math.max(0, Math.min(255, Math.round((p - d[o + 1]) * k)));
    }
}

// The date field's selected segment as it is once the field has lost the focus (INK.focus): each texel
// unmixed into the selection's blue, its white glyphs and the field's lime, its glyphs re-inked in the
// field's ink on the lime (a texel those three don't make is left as it is). g: the chrome's canvas.
function unfocus(g, [x, y, w, h]) {
  const im = g.getImageData(x - TX, y - TY, w, h);
  const d = im.data;
  const L = INK.field;
  const u = INK.sel.map((c, i) => c - L[i]);
  const v = INK.selInk.map((c, i) => c - L[i]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const uu = dot(u, u);
  const uv = dot(u, v);
  const vv = dot(v, v);
  const det = uu * vv - uv * uv;
  for (let o = 0; o < d.length; o += 4) {
    const q = [d[o] - L[0], d[o + 1] - L[1], d[o + 2] - L[2]];
    const qu = dot(q, u);
    const qv = dot(q, v);
    const a = (vv * qu - uv * qv) / det; // the blue's share
    const b = (uu * qv - uv * qu) / det; // the glyphs'
    const r = Math.hypot(q[0] - a * u[0] - b * v[0], q[1] - a * u[1] - b * v[1], q[2] - a * u[2] - b * v[2]);
    if (r > 12 || a < -0.05 || b < -0.05 || a + b > 1.05) continue;
    const k = Math.min(Math.max(b, 0), 1);
    for (let i = 0; i < 3; i++) d[o + i] = Math.round(L[i] + k * (INK.fieldInk[i] - L[i]));
  }
  g.putImageData(im, x - TX, y - TY);
}

export class InkCard {
  // en, zh: the two captures' box (s24-x, as loadInkCard crops them); lang: the film's language (its capture
  // is the chrome)
  constructor({ en, zh, lang }) {
    this.baseEN = lang === 'en';
    // the part of the texture over the box (Leaf.inset's sub: its uv, y down)
    this.sub = [INK.margin / TW, 0, INK.box[2] / TW, INK.box[3] / TH];
    // the chrome: the base capture's crop, and room under it; its date field as it is unfocused
    const cv = makeCanvas(TW, CROP_H);
    const cg = cv.getContext('2d', { willReadFrequently: true });
    cg.drawImage(this.baseEN ? en : zh, 0, 0, TW, CROP_H, 0, 0, TW, CROP_H);
    unfocus(cg, INK.focus[lang]);
    this.chrome = this.tex(cv, true);
    // the two texts' coverage: R the English (as the en capture sets it), G the Chinese (as the zh capture)
    const mv = makeCanvas(TW, TH);
    const mg = mv.getContext('2d');
    const im = mg.createImageData(TW, TH);
    for (let i = 3; i < im.data.length; i += 4) im.data[i] = 255;
    coverage(en, INK.rows.en, im.data, 0);
    coverage(zh, INK.rows.zh, im.data, 1);
    mg.putImageData(im, 0, 0);
    this.mask = this.tex(mv, false);
    this.key = '';

    // the trace (a quarter of the size, over the text) and the card (the texture's size, with its mips: the
    // develop blurs it as it does the print)
    const [fx, fy, fw, fh] = INK.flowBox;
    const FW = Math.ceil(fw / 4);
    const FH = Math.ceil(fh / 4);
    this.flowRT = new THREE.WebGLRenderTarget(FW, FH, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    // 8-bit sRGB like the capture's texture, so its mips are made as the print's are (the box at either
    // end is the capture's own, mip for mip)
    this.rt = new THREE.WebGLRenderTarget(TW, TH, {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy: 8,
    });
    const defines = DEFS({
      TW, TH, OX, OY, CROP_H, CW: INK.card[2], FX0: fx, FY0: fy, FW4: FW * 4, FH4: FH * 4,
      HEAD: INK.head, FOOT: INK.foot, RISE: INK.rise, BODYREF: INK.bodyRef, COL0: INK.cols[0], COL1: INK.cols[1],
      PIN: INK.pin, K: INK.k, STEPS: FLOW.steps,
    });
    const srgb = (c) => new THREE.Vector3(...c.map((v) => v / 255));
    const field = {
      uD: { value: FLOW.D },
      uLam: { value: FLOW.lam },
      uOm: { value: FLOW.om },
      uWinF: { value: FLOW.win },
      uWin: { value: new THREE.Vector4(INK.cols[0], INK.rows.en[0], INK.cols[1], INK.foot) },
      uSq: { value: new THREE.Vector2(...FLOW.squash) },
    };
    const mat = (frag, uniforms) =>
      new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false });
    this.flowMat = mat(FLOW_FRAG, { ...field, uS: { value: 0 }, uSig: { value: 1 } });
    this.cardMat = mat(CARD_FRAG, {
      uChrome: { value: this.chrome },
      uMask: { value: this.mask },
      uFlow: { value: this.flowRT.texture },
      uM: { value: 0 },
      uSig: { value: 1 },
      uFlowOn: { value: 0 },
      uBaseEN: { value: this.baseEN ? 1 : 0 },
      uW: { value: 0 },
      uLodE: { value: 0 },
      uLodZ: { value: 0 },
      uBleed: { value: FLOW.bleed },
      uPaper: { value: srgb(INK.paper) },
      uInk: { value: srgb(INK.ink) },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.flowMat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // the flow's state at s (0 … 1): the squash (and the foot's rise), the hand-over, each text's blur
  static state(s) {
    const ss = (a, b, x) => {
      const u = Math.min(Math.max((x - a) / (b - a), 0), 1);
      return u * u * u * (u * (u * 6 - 15) + 10);
    };
    const S = (1 - Math.cos(Math.PI * Math.min(Math.max(s, 0), 1))) / 2; // how far the English has been carried (of 1)
    const m = ss(...FLOW.squash, s);
    return {
      m,
      sig: 1 - (1 - INK.k) * m,
      w: ss(...FLOW.cross, s),
      lodE: FLOW.lod * S ** 0.6,
      lodZ: FLOW.lod * (1 - S) ** 0.6,
    };
  }

  // the card at s into its texture (only when s has changed); returns the texture
  render(renderer, s) {
    s = Math.min(Math.max(s, 0), 1);
    const key = s.toFixed(6);
    if (key === this.key) return this.rt.texture;
    this.key = key;
    const st = InkCard.state(s);
    const flowing = s > 0 && s < 1;
    const prev = renderer.getRenderTarget();
    if (flowing) {
      this.flowMat.uniforms.uS.value = s;
      this.flowMat.uniforms.uSig.value = st.sig;
      this.quad.material = this.flowMat;
      renderer.setRenderTarget(this.flowRT);
      renderer.render(this.scene, this.cam);
    }
    const u = this.cardMat.uniforms;
    u.uM.value = st.m;
    u.uSig.value = st.sig;
    u.uFlowOn.value = flowing ? 1 : 0;
    u.uW.value = st.w;
    u.uLodE.value = st.lodE;
    u.uLodZ.value = st.lodZ;
    this.quad.material = this.cardMat;
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.cam);
    renderer.setRenderTarget(prev);
    return this.rt.texture;
  }

  tex(cv, srgb) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }
}

// The card in a film's language: the texture's part of both captures (s24-x) and the room under it, each
// cropped as it is decoded (the rest of the 7680 × 4320 capture is not kept)
export async function loadInkCard(lang) {
  const crop = async (l) =>
    createImageBitmap(await (await fetch(`/assets/ui/${l}/s24-x.png`)).blob(), TX, TY, TW, CROP_H);
  const [en, zh] = await Promise.all([crop('en'), crop('zh')]);
  const card = new InkCard({ en, zh, lang });
  en.close();
  zh.close();
  return card;
}
