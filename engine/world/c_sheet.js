// Agent C: s39's sheets. A page of the site as a guest saw it (a capture in assets/ui), printed in light
// on a sheet of the library's paper and hung in the air in s38's card frame, square to it. The paper is
// s18's parchment and the site's page background maps to it, as on c_book's pages; its light is the print's
// own (× its albedo), s38's warm key and a little of the reader's; the site's own lime burns a little.
//
// A sheet is three planes of one size. The print goes in the shot's overlay, which the engine adds after
// the depth of field: it is drawn over whatever is there with the sheet's alpha, so sheets may lie on each
// other, in the order given. The veil goes in the scene and takes the light off what the sheet covers by
// the same alpha (black, no depth: nothing behind it comes into focus as it darkens), so the two make a
// dissolve from the scene to the sheet. The proxy, depth only, goes in the scene once the sheet is whole:
// the engine's depth of field and its travel probe (how many samples a frame gets) then find the sheet.
//
// What a shot may set on a sheet: which of the capture is printed (the rest of the sheet is bare paper, and
// trimPrint takes it out of the texture too) and how much of it is on the paper yet (ink); the develop, a
// mip level the print is no sharper than (light that has not come into focus yet); boxes held at a mip
// level whatever the framing (words the film does not show, c_book's masks); boxes that light, each with
// its own strength (a lime line just inside the box, lime ink more than light: on lit paper added light
// only whitens).
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { BOOK_LOOK } from './c_book.js';

// Light (linear). paper, site, limeUI and the rim as the book's pages (BOOK_LOOK). glow: the printed light.
// rim: the lime hair on the sheet's edges and its width (texels). ring: a box that lights: the line's inset
// from the box's edge, its width, the box's corner radius, the halo's reach (texels); the halo's light and
// the box's own (its face), × the line's; how much of the line is ink.
export const SHEET_LOOK = {
  paper: BOOK_LOOK.paper,
  site: BOOK_LOOK.site,
  glow: 0.45,
  limeUI: BOOK_LOOK.limeUI,
  rim: [0.9, 1.5],
  ring: { inset: 5, w: 3.5, r: 9, halo: 12, haloK: 0.25, face: 0.12, ink: 0.85, light: 0.3 },
};

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// p: where we are on the sheet, in the capture's texels (x right, y down). The capture is sampled where it
// is printed (uPrint) and the sheet is bare paper outside it.
const SHEET_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uSize;                 // the capture (texels)
uniform vec4 uRect, uPrint;         // the sheet; what of the capture is printed: x0, y0, x1, y1 (texels, y down)
uniform float uMM;                  // mm a texel
uniform vec4 uHold[8];              // boxes of the print held unreadable: x0, y0, x1, y1
uniform float uHoldN, uHoldLod;     // how many; no sharper than this mip level
uniform float uSharp;               // the develop: the whole print no sharper than this mip level
uniform vec4 uRing[10];             // boxes that light: x0, y0, x1, y1
uniform float uRingI[10];           // each one's light
uniform float uRingN;
uniform vec4 uRingK;                // the line: its inset from the box's edge, its width, the corner radius, the halo's reach
uniform vec4 uRingL;                // the halo's light and the face's, × the line's; the line's ink; its light
uniform vec3 uUIk, uPaper;          // the site's background → our paper; our paper
uniform float uGlow, uLimeK, uAlpha;
uniform float uInk;                 // how much of the print is on the paper yet (0: bare paper)
uniform vec2 uRim;                  // the lime hair on the sheet's edges: its light, its width (texels)
uniform vec3 uKeyPos, uKeyCol, uAgPos, uAgCol;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;

// the print, no sharper than mip level 'sharp' (c_book's develop); anisotropic when it is sharp. Held soft,
// it is four taps half a texel of that level about the point: one tap of a coarse level magnified shows
// the level's texels as blocks, four make the blur smooth.
vec3 develop(sampler2D t, vec2 uv, float sharp){
  vec2 sz = vec2(textureSize(t, 0));
  vec2 gx = dFdx(uv), gy = dFdy(uv);
  vec2 ax = gx*sz, ay = gy*sz;
  float lod0 = 0.5*log2(max(max(dot(ax, ax), dot(ay, ay)), 1e-12));
  vec3 a = textureGrad(t, uv, gx, gy).rgb;
  float L = max(lod0, sharp);
  vec2 o = 0.5*exp2(L)/sz;
  vec3 b = 0.25*(textureLod(t, uv + o, L).rgb + textureLod(t, uv - o, L).rgb
               + textureLod(t, uv + vec2(o.x, -o.y), L).rgb + textureLod(t, uv + vec2(-o.x, o.y), L).rgb);
  return mix(a, b, smoothstep(lod0 - 0.5, lod0 + 0.5, sharp));
}
float limeOf(vec3 c){ return smoothstep(0.30, 0.45, min(c.r, c.g) - c.b)*smoothstep(0.5, 0.7, c.g)*smoothstep(0.25, 0.1, c.b); }
float held(vec2 p){
  float m = 0.0;
  for (int i = 0; i < 8; i++){
    if (float(i) >= uHoldN) break;
    vec2 d = max(uHold[i].xy - p, p - uHold[i].zw);               // > 0 outside the box (texels)
    m = max(m, 1.0 - smoothstep(0.0, 6.0, max(d.x, d.y)));
  }
  return m;
}
// signed distance (texels) to the box b (x0, y0, x1, y1) with corners of radius r: < 0 inside
float rbox(vec2 p, vec4 b, float r){
  vec2 q = abs(p - 0.5*(b.xy + b.zw)) - (0.5*(b.zw - b.xy) - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// lime ink k (0..1) on c and lime light l over it
vec3 limed(vec3 c, float k, float l){
  vec3 tint = uLitCol/max(max(uLitCol.r, uLitCol.g), max(uLitCol.b, 1e-4));
  return mix(c, c*tint, clamp(k, 0.0, 1.0)) + uLitCol*l;
}

void main(){
  vec2 p = vec2(mix(uRect.x, uRect.z, vUv.x), mix(uRect.w, uRect.y, vUv.y));
  vec2 uv = vec2(p.x/uSize.x, 1.0 - p.y/uSize.y);
  float px = 0.5*(length(vec2(dFdx(p.x), dFdy(p.x))) + length(vec2(dFdx(p.y), dFdy(p.y)))) + 1e-6; // texels a pixel
  vec3 ui = develop(uTex, uv, max(uSharp, uHoldLod*held(p)));
  vec2 dp = min(p - uPrint.xy, uPrint.zw - p);
  float inP = step(0.0, min(dp.x, dp.y))*uInk;

  // the paper (the card's tooth), the print on it
  vec2 q = p*uMM;
  float fine = 1.0 - smoothstep(0.08, 0.3, px*uMM);
  float tooth = 0.045*(vnoise2(q*vec2(6.2, 5.4)) - 0.5)*fine + 0.03*(vnoise2(q*vec2(1.04, 1.22) + 7.0) - 0.5);
  vec3 alb = mix(uPaper, ui*uUIk, inP)*(1.0 + tooth);

  // its light: the print's own, the key, the reader's
  vec3 N = normalize(vN);
  vec3 E = vec3(uGlow);
  vec3 Lk = uKeyPos - vW;
  float dk = dot(Lk, Lk);
  E += uKeyCol*(max(dot(N, Lk*inversesqrt(dk)), 0.0)/(dk + 0.4));
  vec3 La = uAgPos - vW;
  float da = dot(La, La);
  E += uAgCol*(max(dot(N, La*inversesqrt(da)), 0.0)/(da + 0.04));
  vec3 c = alb*E;
  c += uLitCol*(uLimeK*limeOf(ui)*inP*uGlow);

  // the boxes that light: a line just inside each, its halo, a little on the box's face
  float ink = 0.0, lit = 0.0;
  for (int i = 0; i < 10; i++){
    if (float(i) >= uRingN) break;
    float I = uRingI[i];
    if (I <= 0.0) continue;
    float sd = rbox(p, uRing[i], uRingK.z);
    float dl = abs(sd + uRingK.x);
    float w = max(uRingK.y, px);
    float line = (uRingK.y/w)*(1.0 - smoothstep(0.5*(w - px), 0.5*(w + px), dl));
    float face = uRingL.y*(1.0 - smoothstep(-px, px, sd));
    ink += min(I, 1.0)*(line + face);
    lit += I*(line + face + uRingL.x*exp(-dl/uRingK.w));
  }
  c = limed(c, uRingL.z*ink, uRingL.w*lit);

  // a hair of lime on the sheet's edges
  vec2 de = min(p - uRect.xy, uRect.zw - p);
  float dE = min(de.x, de.y);
  float rim = smoothstep(uRim.y + px, max(uRim.y - px, 0.0), dE)*clamp(uRim.y/px, 0.25, 1.0);
  c = limed(c, 0.85*rim*min(uRim.x, 1.0), 0.3*uRim.x*rim);

  gl_FragColor = vec4(fog(c, vW), uAlpha);
}`;

const box4 = ([x, y, w, h], v) => v.set(x, y, x + w, y + h);

// The capture as the sheet takes it: everything outside 'print' ([x0, y0, x1, y1], texels) painted the site's
// page background (bg). What is not printed is then not in the texture at all, at any mip level: a mip of
// the whole capture would carry the masthead's rule into the print's first rows, and the develop and the
// held boxes read the print at high mip levels. tex: a loaded texture (its image an <img>, a canvas or a
// bitmap); it is disposed and a new one with its settings returned.
export function trimPrint(tex, [x0, y0, x1, y1], bg = '#fffef9') {
  const img = tex.image;
  const w = img.width;
  const h = img.height;
  const cv = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: w, height: h }) : new OffscreenCanvas(w, h);
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  const t = new THREE.CanvasTexture(cv);
  for (const k of ['colorSpace', 'anisotropy', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'generateMipmaps', 'flipY']) t[k] = tex[k];
  tex.dispose();
  return t;
}

// A sheet, about its own centre, +z its face.
//   U: the library's uniforms; tex: the capture (sRGB, mipmapped) and size, its texels
//   rect: the sheet, [x0, y0, x1, y1] in the capture's texels (y down); print: what of the capture is
//   printed on it (the rest is bare paper); scale: metres a texel
// It returns the print (for the overlay), the veil and the proxy (for the scene): the shot puts all three
// in one place (place) and shows them together (show).
export function buildSheet({ U, tex, size, rect, print = rect, scale, look = SHEET_LOOK }) {
  const [x0, y0, x1, y1] = rect;
  const v3 = (a) => new THREE.Vector3(...a);
  const R = look.ring;
  const u = {
    uTex: { value: tex },
    uSize: { value: new THREE.Vector2(...size) },
    uRect: { value: new THREE.Vector4(...rect) },
    uPrint: { value: new THREE.Vector4(...print) },
    uMM: { value: scale * 1000 },
    uHold: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uHoldN: { value: 0 },
    uHoldLod: { value: 0 },
    uSharp: { value: 0 },
    uRing: { value: Array.from({ length: 10 }, () => new THREE.Vector4()) },
    uRingI: { value: new Array(10).fill(0) },
    uRingN: { value: 0 },
    uRingK: { value: new THREE.Vector4(R.inset, R.w, R.r, R.halo) },
    uRingL: { value: new THREE.Vector4(R.haloK, R.face, R.ink, R.light) },
    uUIk: { value: v3(look.paper.map((p, k) => p / look.site[k])) },
    uPaper: { value: v3(look.paper) },
    uGlow: { value: look.glow },
    uLimeK: { value: look.limeUI },
    uAlpha: { value: 0 },
    uInk: { value: 1 },
    uRim: { value: new THREE.Vector2(...look.rim) },
    uKeyPos: { value: new THREE.Vector3() },
    uKeyCol: { value: new THREE.Vector3() },
    uAgPos: { value: new THREE.Vector3() },
    uAgCol: { value: new THREE.Vector3() },
  };
  const geo = new THREE.PlaneGeometry((x1 - x0) * scale, (y1 - y0) * scale);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { ...u, ...U }, vertexShader: VERT, fragmentShader: LIB_COMMON + SHEET_FRAG,
    transparent: true, depthTest: false, depthWrite: false,
  }));
  const veil = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
  veil.renderOrder = 30; // after the dust and every light of the scene
  const proxy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false }));
  proxy.renderOrder = -1;
  mesh.visible = veil.visible = proxy.visible = false;
  return {
    mesh, veil, proxy, u,
    // the capture's texel (x, y) on the sheet: metres from its centre, y up
    point: (x, y, out = new THREE.Vector3()) => out.set((x - (x0 + x1) / 2) * scale, ((y0 + y1) / 2 - y) * scale, 0),
    // the three at (x, y, z) of their parents' frame (the proxy a hair behind)
    place(x, y, z) {
      mesh.position.set(x, y, z);
      veil.position.set(x, y, z);
      proxy.position.set(x, y, z - 0.0005);
    },
    // how much of the sheet is there, 0..1; whole, it hides what is behind it from the depth too
    show(a, whole = a >= 1) {
      u.uAlpha.value = a;
      veil.material.opacity = a;
      mesh.visible = veil.visible = a > 0;
      proxy.visible = whole;
    },
    // hold these boxes of the print ([x, y, w, h], texels) no sharper than mip 'lod'
    hold(boxes, lod) {
      if (boxes.length > u.uHold.value.length) throw new Error(`c_sheet: ${boxes.length} held boxes, room for ${u.uHold.value.length}`);
      boxes.forEach((b, i) => box4(b, u.uHold.value[i]));
      u.uHoldN.value = boxes.length;
      u.uHoldLod.value = lod;
    },
    // the boxes that light ([x, y, w, h], texels); light(i, I) sets one's strength
    rings(boxes) {
      if (boxes.length > u.uRing.value.length) throw new Error(`c_sheet: ${boxes.length} boxes to light, room for ${u.uRing.value.length}`);
      boxes.forEach((b, i) => box4(b, u.uRing.value[i]));
      u.uRingN.value = boxes.length;
    },
    light(i, I) {
      u.uRingI.value[i] = I;
    },
    // how much of the print is on the paper, 0..1 (0: the sheet bare)
    ink(v) {
      u.uInk.value = v;
    },
  };
}
