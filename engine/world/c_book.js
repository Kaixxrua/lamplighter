// c_book.js · the glowing book of scene 8 (s20–s26), shared by C's shots.
//
// One book on a walnut lectern in the gallery two floors above the lighthouse (FLOOR + 2, side 3, its
// back to the shaft): no sheet reaches that floor (it lies outside the lantern's fan), only the gallery's
// lamps, low, and the book's own light. The book is an oblong folio, a leaf 0.50 × 0.30 m. Its pages are
// paper (s18's parchment and grain) with the site printed on them in light: a captured page (sRGB, as
// shot) is the print's albedo, the site's background mapped to our paper, and the print glows by itself.
// The page block's head, tail and fore-edge are inlaid with lime, like the cards that passed s19's gate,
// and the leaves carry a hair of lime on their outer edges. The front board carries the site's mark,
// redrawn in code from LOGO, inlaid in lime.
//
// Book frame (metres): x across the spread to the reader's right, y the page normal (up the lectern's
// slope), z down the slope toward the reader. The origin is the gutter at the top of the back board,
// half way up the page; the head is at z = -H/2. A leaf's shape is a pure function of its turn e (0 lying
// right, 1 lying left), the cover's opening and a bend; it is integrated along the leaf from the gutter
// on the CPU each frame (see leafAngle). Every material here is lit by libshader's lampLight for the
// floor, plus bookLight: the open page as a soft area light, and the lime edges as strip lamps on what
// lies around the block.
//
// The develop: a page's print can be held at a mip level (uSharp) above the one the view needs, so it
// reads as light that has not come into focus yet. s20 ends with the home page at that blur, s21 brings
// it sharp. It changes the look of the print, never the page.
//
// s22 adds, each off unless a shot sets it (and off, a page is exactly as it was): a second print over
// the first, coming down the page behind a wipe (Leaf.print2, wipe); an inset in the print, the search
// box as it is typed in (Leaf.inset); and cards, boxes of the print lifted off the page (Card).

import * as THREE from 'three';
import { LIB_COMMON, LIB } from 'world/libshader.js';
import { LEATHERS } from 'world/bookshelf.js';
import { LOGO, LH } from 'world/lhshader.js';
import { DEG, sideNormal, sideTangent } from 'world/geo.js';

export const BOOK = {
  W: 0.5, // a leaf, gutter to fore-edge (m)
  H: 0.3, // a leaf, head to tail
  BOX: { gutter: 0.022, fore: 0.014, head: 0.019, tail: 0.02 }, // the print's margins: a 0.464 × 0.261 box, 16:9
  BLOCK: 0.03, // the text block's thickness
  LAMBDA: 0.034, // the gutter's curl length
  STEP: 0.0003, // between the leaves we draw, lying in a pile
  BOARD: 0.0045, // the boards' thickness
  OVER: 0.007, // and their overhang (fore-edge, head, tail)
  TURN_IN: 0.013, // the leather turned in over the boards' inside
  TILT: 16 * DEG, // the lectern's slope
  FLOOR: -98, // FLOOR + 2: two floors above the lighthouse
  SIDE: 3, // bearing 210°
  APOTHEM: 17.3, // the gutter's distance from the axis
  HEIGHT: 1.06, // the gutter above the floor
  NS: 80, // a leaf's mesh: along it
  NW: 12, // and across
  NQ: 6, // the block's side faces: across the leaves
  LEAVES: 300, // the leaf lines seen on the edges
};

export const BOOK_LOOK = {
  paper: [0.8, 0.755, 0.68], // s18's parchment (LOOK18.paper): warm, because act II's grade tints highlights lime
  site: [1.0, 0.991, 0.947], // the site's page background #FFFEF9, linear: it maps to our paper
  endpaper: [0.62, 0.56, 0.45],
  leather: LEATHERS[0], // brown calf
  walnut: [0.085, 0.048, 0.026], // the library's wood
  glow: 0.62, // the printed light, × its albedo: the page's white near 220, under the act II grade
  paperLamp: 0.08, // how much of the gallery's lamps the paper takes: its light is the print's, which keeps the
  // site's colours as shot (at 1 the lamps' orange would outshine the print several times over)
  edge: 1.1, // the lime edges, × uLitCol
  rim: 1.4, // the leaves' lime rim
  rimW: 0.0006, // its width (m)
  logo: 1.5, // the mark on the front board
  limeUI: 0.5, // the site's own lime, lit a little more (the only colour that may burn)
  show: 0.22, // a blank leaf lying on a printed one: the print's light through it
  backShow: 0.12, // a printed leaf seen from behind: its own print through it
  self: 0.5, // blank paper in this book glows too, a little
  spill: 4, // the book's light on what is round it, × the page's radiance × area (it is a magic book)
};

// The book's frame in the world.
export function bookFrame({ side = BOOK.SIDE, floor = BOOK.FLOOR, apothem = BOOK.APOTHEM, height = BOOK.HEIGHT, tilt = BOOK.TILT } = {}) {
  const n = sideNormal(side);
  const T = sideTangent(side);
  const UP = new THREE.Vector3(0, 1, 0);
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const X = T.clone();
  const Y = UP.clone().multiplyScalar(c).addScaledVector(n, -s);
  const Z = n.clone().multiplyScalar(-c).addScaledVector(UP, -s);
  const floorY = floor * LIB.H;
  const O = n.clone().multiplyScalar(apothem).setY(floorY + height);
  const M = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(O);
  const toWorld = (x, y, z, out = new THREE.Vector3()) => out.set(x, y, z).applyMatrix4(M);
  return { O, X, Y, Z, M, n, T, floor, floorY, toWorld };
}

// ------------------------------------------------------------------------------------- leaf shape

// Si(x) = ∫0^x sin t / t dt
function Si(x) {
  let s = 0;
  let term = x;
  const x2 = x * x;
  for (let n = 0; n < 14; n++) {
    s += term / (2 * n + 1);
    term *= -x2 / ((2 * n + 2) * (2 * n + 3));
  }
  return s;
}
const SI_PI = Si(Math.PI);

// A leaf lying in the pile climbs out of the gutter with angle g·exp(-s/λ): it gains λ·Si(g) of height.
// The curl that reaches height h:
export function curlFor(h, lam = BOOK.LAMBDA) {
  const target = Math.min(h / lam, SI_PI * 0.999);
  if (target <= 1e-9) return 0;
  let g = target;
  for (let k = 0; k < 24; k++) {
    const d = Math.sin(g) / g;
    g = Math.min(Math.max(g - (Si(g) - target) / d, 1e-6), Math.PI);
  }
  return g;
}

// The paper's angle s along a leaf (w across it, 0 at the head, 1 at the tail): its two rests blended by
// the turn, plus the bend of the turn (the free edge leads while lifting, trails while landing; the
// tail corner, where the hand is, more than the head).
export function leafAngle(s, w, st) {
  const k = Math.exp(-s / BOOK.LAMBDA);
  return (1 - st.e) * st.gR * k + st.e * (Math.PI - st.gL * k) + st.bend * (1 + st.diag * (w - 0.5)) * (s / BOOK.W);
}

// A leaf's pose: rest heights hR (in the right pile) and hL (left), the turn, the cover's opening.
export function leafPose({ hR, hL = BOOK.STEP, e = 0, open = 1, bend = 0, diag = 0.6 }) {
  return {
    e,
    bend,
    diag,
    gR: curlFor(hR * open),
    gL: curlFor(hL),
    root: (1 - e) * hR * (1 - open),
  };
}

// Rows of points along a leaf from the gutter (book frame), into out[(j*(NS+1) + i)*3].
export function leafRows(st, out, NS = BOOK.NS, NW = BOOK.NW, rowZ = null) {
  const ds = BOOK.W / NS;
  for (let j = 0; j <= NW; j++) {
    const w = NW ? j / NW : 0.5;
    const z = rowZ ? rowZ[j] : -BOOK.H / 2 + w * BOOK.H;
    let x = 0;
    let y = st.root;
    for (let i = 0; i <= NS; i++) {
      const o = (j * (NS + 1) + i) * 3;
      out[o] = x;
      out[o + 1] = y;
      out[o + 2] = z;
      if (i < NS) {
        const a = leafAngle((i + 0.5) * ds, w, st);
        x += Math.cos(a) * ds;
        y += Math.sin(a) * ds;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------- geometry

function gridIndex(nu, nv, flip) {
  const idx = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      if (flip) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  return idx;
}

// A box with a face id per face (aFace) and each face's own coordinates in metres (uv): top/bottom (x, z),
// ±x (z, y), ±z (x, y).
// A point of the print (px, py in the capture's pixels, y down) in the book's frame, on a leaf lying at
// height h on the right.
export function printPoint(px, py, size = [7680, 4320], h = BOOK.BLOCK, out = new THREE.Vector3()) {
  const b = BOOK.BOX;
  const x = b.gutter + (px / size[0]) * (BOOK.W - b.gutter - b.fore);
  const z = BOOK.H / 2 - b.tail - (1 - py / size[1]) * (BOOK.H - b.tail - b.head);
  return out.set(x, h, z);
}

export function slab(x0, x1, y0, y1, z0, z1, ids = {}) {
  const pos = [];
  const nor = [];
  const uv = [];
  const fid = [];
  const idx = [];
  const quad = (pts, n, uvs, id) => {
    const o = pos.length / 3;
    pts.forEach((p, k) => {
      pos.push(...p);
      nor.push(...n);
      uv.push(...uvs[k]);
      fid.push(id);
    });
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  const id = (k) => ids[k] ?? ids.other ?? 0;
  quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], id('+y'));
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], id('-y'));
  quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[z1, y0], [z0, y0], [z0, y1], [z1, y1]], id('+x'));
  quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], id('-x'));
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], id('+z'));
  quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[x1, y0], [x0, y0], [x0, y1], [x1, y1]], id('-z'));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(fid, 1));
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------------------------------- GLSL

const VERT = /* glsl */ `
attribute float aFace;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;
void main(){
  vUv = uv;
  vFace = aFace;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(transpose(inverse(mat3(modelMatrix)))*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// The book's own light: the open page as a soft area light (radiance × area at its centre, a disc's near
// field), and the block's lime edges as strip lamps standing on the back board, on what lies around them.
export const BOOK_LIGHT = /* glsl */ `
uniform mat4 uBkInv;              // world → book frame
uniform vec3 uBkPageC, uBkPageN;  // the giving page: centre, normal (world)
uniform vec3 uBkLeA;              // its radiance × area
uniform float uBkA;               // its area
uniform vec4 uBkBlock;            // the block (book frame): fore-edge x, half height, thickness, -
uniform vec3 uBkEdgeL;            // the lime edges' radiance
uniform float uBkPaperLamp;       // BOOK_LOOK.paperLamp
uniform float uK;                 // the floor
vec3 bookLight(vec3 P, vec3 N, float trans){
  vec3 L = uBkPageC - P;
  float d2 = dot(L, L);
  vec3 l = L*inversesqrt(max(d2, 1e-8));
  float ce = 0.35 + 0.65*max(dot(-l, uBkPageN), 0.0);   // the glow above the page, a soft lamp
  float cr = max(dot(N, l), 0.0) + trans*max(dot(-N, l), 0.0);
  vec3 E = uBkLeA*(ce*cr/(d2 + uBkA/PI));
  vec3 q = (uBkInv*vec4(P, 1.0)).xyz;
  vec3 nb = mat3(uBkInv)*N;
  vec2 off = vec2(max(q.x - uBkBlock.x, 0.0), sign(q.z)*max(abs(q.z) - uBkBlock.y, 0.0));
  float d = length(off);
  float hh = uBkBlock.z - q.y;
  if (d > 1e-4 && hh > 0.0){
    vec2 dirH = off/d;
    float r = inversesqrt(d*d + hh*hh);
    float f = max(nb.y, 0.0)*(1.0 - d*r) + max(-dot(nb.xz, dirH), 0.0)*hh*r;
    E += uBkEdgeL*(0.5*PI*f*smoothstep(-0.12, 0.0, q.x));
  }
  return E;
}`;

// A leaf: paper; on its front, inside the box, the captured page printed in light.
const PAGE_FRAG = /* glsl */ `
uniform sampler2D uTex, uUnder;
uniform float uHasTex, uHasUnder;
uniform vec4 uBox;                       // the print's box in the leaf's uv: u0, v0, u1, v1
uniform vec3 uUIk, uPaper;               // the site's background → our paper; our paper
uniform float uGlow, uSharp, uShow, uBackShow, uLimeK, uRimK, uRimW, uSpillK, uSelf;
uniform vec2 uLeafM;                     // the leaf (m)
uniform vec4 uMask[8];                   // boxes of the print held unreadable: u0, v0, u1, v1 (the print's uv)
uniform float uMaskN, uMaskLod;          // how many; no sharper than this mip level
uniform vec4 uPress;                     // a press on the print: u, v, the ring's radius (m), strength
uniform sampler2D uTex2, uIns;
uniform float uHasTex2, uMask2N;         // a second print over the first (s22's results), held by the first uMask2N boxes
uniform vec4 uWipe;                      // where it has come to: its front (the print's y, 0 top … 1 bottom), width, the front's lime
uniform vec4 uInsBox;                    // an inset in the print (the search box as typed): x, y, w, h (the print's uv, y down)
uniform vec4 uInsUV;                     // the part of the inset's texture over that box: x, y, w, h (its uv, y down)
uniform float uInsK;
uniform vec4 uCut[16];                   // boxes of the print lifted off the page as cards: u0, v0, u1, v1 (the print's uv)
uniform float uCutH[16];                 // how high each stands (m)
uniform float uCutN;
uniform vec4 uCard;                      // on a card: its box in the leaf's uv, for its rim
uniform float uCardRim;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;

// the print, no sharper than mip level 'sharp' (the develop); anisotropic when it is sharp
vec3 develop(sampler2D t, vec2 uv, float sharp){
  vec2 sz = vec2(textureSize(t, 0));
  vec2 gx = dFdx(uv), gy = dFdy(uv);
  vec2 ax = gx*sz, ay = gy*sz;
  float lod0 = 0.5*log2(max(max(dot(ax, ax), dot(ay, ay)), 1e-12));
  vec3 a = textureGrad(t, uv, gx, gy).rgb;
  vec3 b = textureLod(t, uv, max(lod0, sharp)).rgb;
  return mix(a, b, smoothstep(lod0 - 0.5, lod0 + 0.5, sharp));
}
float limeOf(vec3 c){ return smoothstep(0.30, 0.45, min(c.r, c.g) - c.b)*smoothstep(0.5, 0.7, c.g)*smoothstep(0.25, 0.1, c.b); }
float masked(vec2 b, float n){
  float m = 0.0;
  for (int i = 0; i < 8; i++){
    if (float(i) >= n) break;
    vec2 d = max(uMask[i].xy - b, b - uMask[i].zw);            // > 0 outside the box
    m = max(m, 1.0 - smoothstep(0.0, 0.004, max(d.x, d.y)));
  }
  return m;
}

void main(){
  bool front = gl_FrontFacing;
  vec3 N = normalize(vN);
  if (!front) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec2 q = vUv*uLeafM;

  vec2 bs = uBox.zw - uBox.xy;
  vec2 bu = (vUv - uBox.xy)/bs;
  vec2 buc = clamp(bu, 0.0, 1.0);
  float eb = min(min(bu.x, 1.0 - bu.x)*bs.x*uLeafM.x, min(bu.y, 1.0 - bu.y)*bs.y*uLeafM.y);   // into the box (m)
  float fe = fwidth(eb) + 1e-6;
  float inB = smoothstep(-fe, fe, eb);
  float dOut = max(-eb, 0.0);
  float margin = 0.35 + 0.65*exp(-dOut/0.004);                      // the print's light spills a little

  vec3 ui = develop(uTex, buc, max(uSharp, uMaskLod*masked(buc, uMaskN)));
  vec3 un = textureLod(uUnder, buc, 6.5).rgb;                       // what lies under this leaf, through it
  vec3 me = textureLod(uTex, buc, 6.0).rgb;                         // its own print, through it, from behind
  float k2 = 0.0;
  if (uHasTex2 > 0.0){                                              // the second print, down to its front
    k2 = clamp((uWipe.x - (1.0 - buc.y))/uWipe.y, 0.0, 1.0);
    ui = mix(ui, develop(uTex2, buc, max(uSharp, uMaskLod*masked(buc, uMask2N))), k2);
    me = mix(me, textureLod(uTex2, buc, 6.0).rgb, k2);
  }
  if (uInsK > 0.0){                                                 // the inset (the typing)
    vec2 iu = (vec2(buc.x, 1.0 - buc.y) - uInsBox.xy)/uInsBox.zw;
    vec2 iv = uInsUV.xy + iu*uInsUV.zw;
    vec3 ins = develop(uIns, vec2(iv.x, 1.0 - iv.y), uSharp);
    ui = mix(ui, ins, uInsK*step(0.0, iu.x)*step(iu.x, 1.0)*step(0.0, iu.y)*step(iu.y, 1.0));
  }
  // the cards lifted off this page: blank paper where each lay (its light went with it), and its shadow
  float cut = 0.0, ao = 0.0;
  for (int i = 0; i < 16; i++){
    if (float(i) >= uCutN) break;
    float h = uCutH[i];
    vec2 dc2 = max(uCut[i].xy - buc, buc - uCut[i].zw)*bs*uLeafM;  // > 0 outside the box (m)
    float o = max(dc2.x, dc2.y);
    cut = max(cut, (1.0 - smoothstep(-fe, fe, o))*smoothstep(0.00005, 0.00015, h));
    ao = max(ao, smoothstep(0.0, 0.0012, h)*exp(-max(o, 0.0)/(0.0005 + 0.6*h)));
  }

  float fine = 1.0 - smoothstep(0.00015, 0.0005, fwidth(q.x));
  float tooth = 0.05*(vnoise2(q*vec2(3100.0, 2700.0)) - 0.5)*fine + 0.035*(vnoise2(q*vec2(520.0, 610.0) + 7.0) - 0.5);
  vec3 paper = uPaper*(1.0 + tooth);
  float printed = front ? uHasTex : 0.0;
  vec3 alb = mix(paper, ui*uUIk*(1.0 + tooth), printed*inB*(1.0 - cut));

  Surf s = Surf(vW, N, V, alb, vec3(0.02), 0.75, 1.0, 0.2);
  vec3 c = lampLight(s, uK, floorState(uK))*uBkPaperLamp;
  c += alb*(1.0/PI)*bookLight(vW, N, 0.3)*uSpillK;
  if (front){
    c += mix(paper*margin, alb, inB)*(uGlow*uHasTex*(1.0 - (1.0 - uSelf)*cut)) + paper*(uGlow*uSelf*(1.0 - uHasTex));
    c += mix(paper*margin, un*uUIk, inB)*(uGlow*uShow*uHasUnder);
    c += uLitCol*(uLimeK*limeOf(ui)*inB*uHasTex*uGlow*(1.0 - cut));
    c *= 1.0 - 0.35*ao;
    float dd = length((bu - uPress.xy)*bs*uLeafM);                    // the press: a lime ring and its core
    float dr = (dd - uPress.z)/0.0016, dc = dd/0.0045;
    float pr = clamp(uPress.w*(exp(-dr*dr) + 0.6*exp(-dc*dc))*inB, 0.0, 1.0);
    vec3 tint = uLitCol/max(max(uLitCol.r, uLitCol.g), max(uLitCol.b, 1e-4));  // lime ink: added light alone only whitens the sheet
    float wf = 4.0*k2*(1.0 - k2);                                     // the second print's front: a line of lime ink
    float wl = min(uWipe.z*wf*wf*wf*wf*inB*uHasTex2, 1.0);
    if (wl > 0.0) c = mix(c, c*tint, 0.85*wl) + uLitCol*(0.12*wl);
    c = mix(c, c*tint, 0.8*pr) + uLitCol*(0.25*pr);                    // strength 0 leaves the page exactly as it was
  } else {
    c += mix(paper*margin, me*uUIk, inB)*(uGlow*uBackShow*uHasTex) + paper*(uGlow*uSelf);
  }
  // a hair of lime on the leaf's outer edges
  float dE = min((1.0 - vUv.x)*uLeafM.x, min(vUv.y, 1.0 - vUv.y)*uLeafM.y);
  float aa = fwidth(dE) + 1e-6;
  c += uLitCol*(uRimK*smoothstep(uRimW + aa, max(uRimW - aa, 0.0), dE)*clamp(uRimW/aa, 0.25, 1.0));
  if (uCardRim > 0.0){                                              // a card's own edges: a hair of lime ink
    vec2 ce = min(vUv - uCard.xy, uCard.zw - vUv)*uLeafM;
    float dC = min(ce.x, ce.y);
    float ac = fwidth(dC) + 1e-6;
    float rw = 0.4*uRimW;
    float kr = min(uCardRim*smoothstep(rw + ac, max(rw - ac, 0.0), dC)*clamp(rw/ac, 0.25, 1.0), 1.0);
    vec3 tint = uLitCol/max(max(uLitCol.r, uLitCol.g), max(uLitCol.b, 1e-4));
    c = mix(c, c*tint, 0.85*kr) + uLitCol*(0.12*kr);
  }
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// A card's sides (s22): paper seen edge on, glowing a little like all paper in this book, lit by the page
// under it, its lime born hot and cooling to a hair.
const CARD_EDGE_FRAG = /* glsl */ `
uniform float uEdgeK, uGlowK;
uniform vec3 uPaper;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  if (dot(N, V) < 0.0) N = -N;                                       // a thin wall: the side we see
  vec3 alb = uPaper*0.85;
  Surf s = Surf(vW, N, V, alb, vec3(0.03), 0.6, 1.0, 0.0);
  vec3 c = lampLight(s, uK, floorState(uK))*uBkPaperLamp + alb*(1.0/PI)*bookLight(vW, N, 0.3) + alb*uGlowK;
  vec3 tint = uLitCol/max(max(uLitCol.r, uLitCol.g), max(uLitCol.b, 1e-4));
  c = mix(c, c*tint, 0.9*min(uEdgeK, 1.0)) + uLitCol*(0.3*uEdgeK);    // lime ink on the paper, and a little light
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The block's head, tail and fore-edge: the leaves end on, inlaid with lime.
const EDGE_FRAG = /* glsl */ `
uniform float uEdgeK, uLeaves;
uniform vec3 uPaper;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float n = vUv.y*uLeaves;
  float fw = fwidth(n);
  float line = 0.5 + 0.5*cos(6.2831853*n);
  float m = mix(0.8, 0.6 + 0.4*line, 1.0 - smoothstep(0.25, 0.7, fw));
  float tone = 0.9 + 0.2*vnoise2(vec2(vUv.x*37.0, vUv.y*2.0 + 5.0));
  vec3 alb = uPaper*0.85;
  Surf s = Surf(vW, N, V, alb, vec3(0.04), 0.55, 1.0, 0.0);
  vec3 c = lampLight(s, uK, floorState(uK))*uBkPaperLamp + uLitCol*(uEdgeK*m*tone);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

const SQ = Math.SQRT1_2;
const U_LOGO = 1 / LH.LOGO; // LOGO is in metres for the lighthouse's lens; back to the favicon's units
const LOGO_GLSL = /* glsl */ `
#define LG_R0 ${(LOGO.R0 * U_LOGO).toFixed(4)}
#define LG_R1 ${(LOGO.R1 * U_LOGO).toFixed(4)}
#define LG_BA ${(LOGO.BAR_A * U_LOGO).toFixed(4)}
#define LG_BB ${(LOGO.BAR_B * U_LOGO).toFixed(4)}
#define LG_BW ${(LOGO.BAR_W * U_LOGO).toFixed(4)}
#define LG_DR ${(LOGO.DOT_R * U_LOGO).toFixed(4)}
#define LG_DRHO 63.6
// the site's mark, in the favicon's units (ring open over the top right quadrant, bar and dot along 45°)
float logoSd(vec2 p){
  float ring = abs(length(p) - 0.5*(LG_R0 + LG_R1)) - 0.5*(LG_R1 - LG_R0);
  float quad = (p.x >= 0.0 && p.y >= 0.0) ? -min(p.x, p.y) : length(min(p, vec2(0.0)));
  ring = max(ring, -quad);
  float a = dot(p, vec2(${SQ}, ${SQ})), b = dot(p, vec2(-${SQ}, ${SQ}));
  float bar = max(max(LG_BA - a, a - LG_BB), abs(b) - 0.5*LG_BW);
  float dot_ = length(p - LG_DRHO*vec2(${SQ}, ${SQ})) - LG_DR;
  return min(min(ring, bar), dot_);
}`;

// Boards, spine and lectern: leather (with the mark on the front board), endpaper, walnut.
const SOLID_FRAG = /* glsl */ `
uniform float uKind;            // 0 front board, 1 back board, 2 spine, 3 walnut along the book, 4 walnut upright
uniform float uLogoK, uSpillK;
uniform vec3 uLeather, uWalnut, uEndpaper;
uniform vec4 uBoardM;           // a board: length from the joint, half height, the turn-ins, the mark's size (m per unit)
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;
${LOGO_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec2 q = vUv;
  vec3 alb; float rough; vec3 emit = vec3(0.0); float lampK = 1.0;
  float fine = 1.0 - smoothstep(0.0003, 0.0012, fwidth(q.x) + fwidth(q.y));
  if (uKind < 2.5){
    float peb = mix(0.5, 0.6*vnoise2(q*1300.0) + 0.4*vnoise2(q*420.0 + 3.1), fine);
    vec3 leather = uLeather*(0.82 + 0.36*peb);
    rough = 0.4 + 0.22*peb;
    alb = leather;
    if (uKind < 1.5 && vFace < 1.5){
      float dEdge = min(min(q.x, uBoardM.x - q.x), uBoardM.y - abs(q.y));
      float aa = fwidth(dEdge) + 1e-6;
      if (vFace < 0.5){
        // the outside: blind tooled double fillet; on the front, the mark inlaid in lime
        float f = smoothstep(0.0007 + aa, 0.0007 - aa, abs(dEdge - 0.012)) + smoothstep(0.0005 + aa, 0.0005 - aa, abs(dEdge - 0.016));
        alb *= 1.0 - 0.45*clamp(f, 0.0, 1.0);
        rough -= 0.12*clamp(f, 0.0, 1.0);
        if (uKind < 0.5){
          vec2 p = vec2(q.x - 0.5*uBoardM.x, -q.y)/uBoardM.w;
          float sd = logoSd(p)*uBoardM.w;
          float sa = fwidth(sd) + 1e-6;
          float inl = smoothstep(sa, -sa, sd);
          float groove = 1.0 - smoothstep(0.0, 0.0009 + sa, abs(sd));
          alb *= 1.0 - 0.5*groove;
          alb = mix(alb, vec3(0.06, 0.08, 0.02), inl);
          emit += uLitCol*(uLogoK*inl);
        }
      } else {
        // the inside: endpaper, the leather turned in round three edges (not at the joint)
        float dT = min(uBoardM.x - q.x, uBoardM.y - abs(q.y));
        float tooth = 0.05*(vnoise2(q*vec2(2900.0, 2500.0)) - 0.5)*fine + 0.04*(vnoise2(q*vec2(480.0, 530.0) + 2.0) - 0.5);
        float ep = smoothstep(uBoardM.z - aa, uBoardM.z + aa, dT);
        alb = mix(leather, uEndpaper*(1.0 + tooth), ep);
        lampK = mix(1.0, uBkPaperLamp, ep); // paper, like the leaves
        rough = mix(rough, 0.7, ep);
      }
    }
  } else {
    // walnut: streaks along the grain, a slow figure across it
    vec3 qb = (uBkInv*vec4(vW, 1.0)).xyz;
    vec2 g = uKind < 3.5 ? vec2(qb.x, qb.z + 0.6*qb.y) : vec2(vW.y, dot(vW.xz, vec2(0.6, 0.8)));
    float streak = mix(0.5, vnoise2(vec2(g.x*5.0, g.y*170.0)), fine);
    float fig = vnoise2(vec2(g.x*1.2, g.y*30.0) + 4.0);
    alb = uWalnut*(0.72 + 0.4*streak + 0.25*fig);
    rough = 0.36 + 0.1*streak;
  }
  Surf s = Surf(vW, N, V, alb, vec3(0.04), rough, 1.0, 0.0);
  vec3 c = lampLight(s, uK, floorState(uK))*lampK + alb*(1.0/PI)*bookLight(vW, N, 0.0)*uSpillK + emit;
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// ---------------------------------------------------------------------------------------- the book

const WHITE = (() => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

// A leaf: { tex: its print (or null), under: the print it lies on (show-through), hR, hL }.
class Leaf {
  constructor(book, { tex = null, under = null, hR, hL = BOOK.STEP }) {
    this.hR = hR;
    this.hL = hL;
    const NS = BOOK.NS;
    const NW = BOOK.NW;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array((NS + 1) * (NW + 1) * 3);
    const uv = new Float32Array((NS + 1) * (NW + 1) * 2);
    for (let j = 0; j <= NW; j++)
      for (let i = 0; i <= NS; i++) {
        const o = (j * (NS + 1) + i) * 2;
        uv[o] = i / NS;
        uv[o + 1] = 1 - j / NW;
      }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array((NS + 1) * (NW + 1)), 1));
    g.setIndex(gridIndex(NS, NW, true));
    this.geo = g;
    const L = book.look;
    const b = BOOK.BOX;
    this.u = {
      uTex: { value: tex || WHITE },
      uHasTex: { value: tex ? 1 : 0 },
      uUnder: { value: under || WHITE },
      uHasUnder: { value: under ? 1 : 0 },
      uBox: { value: new THREE.Vector4(b.gutter / BOOK.W, b.tail / BOOK.H, 1 - b.fore / BOOK.W, 1 - b.head / BOOK.H) },
      uUIk: { value: new THREE.Vector3(...L.paper.map((p, k) => p / L.site[k])) },
      uGlow: { value: L.glow },
      uSharp: { value: 0 },
      uShow: { value: under ? L.show : 0 },
      uBackShow: { value: L.backShow },
      uLimeK: { value: L.limeUI },
      uRimK: { value: L.rim },
      uRimW: { value: L.rimW },
      uSpillK: { value: 1 },
      uSelf: { value: L.self },
      uLeafM: { value: new THREE.Vector2(BOOK.W, BOOK.H) },
      uMask: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
      uMaskN: { value: 0 },
      uMaskLod: { value: 0 },
      uPress: { value: new THREE.Vector4() },
      // s22's: all off unless set (with them off the page is exactly as before)
      uTex2: { value: WHITE },
      uHasTex2: { value: 0 },
      uMask2N: { value: 0 },
      uWipe: { value: new THREE.Vector4(0, 1, 0, 0) },
      uIns: { value: WHITE },
      uInsK: { value: 0 },
      uInsBox: { value: new THREE.Vector4(0, 0, 1, 1) },
      uInsUV: { value: new THREE.Vector4(0, 0, 1, 1) },
      uCut: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
      uCutH: { value: new Array(16).fill(0) },
      uCutN: { value: 0 },
      uCard: { value: new THREE.Vector4() },
      uCardRim: { value: 0 },
    };
    this.mesh = new THREE.Mesh(g, book.material(PAGE_FRAG, this.u, { side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.pose({ e: 0, open: 0 });
  }
  // e: the turn (0 right … 1 left); open: the cover's opening; bend: the curl of the turn
  pose({ e = 0, open = 1, bend = 0, diag = 0.6 } = {}) {
    leafRows(leafPose({ hR: this.hR, hL: this.hL, e, open, bend, diag }), this.pos);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.e = e;
  }
  // hold these boxes of the print ([x, y, w, h] in the capture's pixels, y down) no sharper than mip 'lod'
  mask(boxes, size, lod) {
    const m = this.u.uMask.value;
    if (boxes.length > m.length) throw new Error(`c_book: ${boxes.length} masked boxes, room for ${m.length}`);
    boxes.forEach(([x, y, w, h], i) => m[i].set(x / size[0], 1 - (y + h) / size[1], (x + w) / size[0], 1 - y / size[1]));
    this.u.uMaskN.value = boxes.length;
    this.u.uMaskLod.value = lod;
  }
  // a press at (px, py) of the print: a lime ring of radius r (m), strength k (× lime)
  press(px, py, size, r, k) {
    this.u.uPress.value.set(px / size[0], 1 - py / size[1], r, k);
  }
  // a second print over the first, held by the first n of mask()'s boxes; it covers the first down to
  // 'front' (the print's height, 0 top … 1 bottom), over 'width', its front a line of lime ('lime')
  print2(tex, n) {
    this.u.uTex2.value = tex;
    this.u.uHasTex2.value = 1;
    this.u.uMask2N.value = n;
  }
  wipe(front, width, lime = 0) {
    this.u.uWipe.value.set(front, width, lime, 0);
  }
  // an inset in the print: tex over the box [x, y, w, h] (the capture's pixels, y down), at k (0 off);
  // sub, the part of tex that goes over the box (its uv, y down: a texture with a margin round the box)
  inset(tex, [x, y, w, h], size, k, sub = [0, 0, 1, 1]) {
    this.u.uIns.value = tex;
    this.u.uInsBox.value.set(x / size[0], y / size[1], w / size[0], h / size[1]);
    this.u.uInsUV.value.set(...sub);
    this.u.uInsK.value = k;
  }
}

// A card (s22's results): a box of a leaf's print lifted off it. Its top is the print, the leaf's own
// material on a strip that lies on the leaf (so a card at rest is the page itself) and stands off along
// the leaf's normal: 'lift' at its head edge, hinged there, its tail edge up by 'tilt'. Its four sides are
// paper, 'thick' deep (no deeper than it stands). The leaf shows blank paper where it lay, and its
// shadow (the leaf's uCut, slot 'slot'). Hidden, and the leaf whole, while it stands under 0.1 mm.
export class Card {
  constructor(book, leaf, box, size, { tex = null, slot = 0, thick = 0.0005 } = {}) {
    const [x, y, w, h] = box;
    this.leaf = leaf;
    this.slot = slot;
    this.thick = thick;
    const B = leaf.u.uBox.value;
    const pu0 = x / size[0];
    const pu1 = (x + w) / size[0];
    const pv0 = 1 - (y + h) / size[1];
    const pv1 = 1 - y / size[1];
    leaf.u.uCut.value[slot].set(pu0, pv0, pu1, pv1);
    leaf.u.uCutN.value = Math.max(leaf.u.uCutN.value, slot + 1);
    // the box in the leaf's uv; its columns: its ends and the leaf's own columns between (it lies on the leaf exactly)
    this.u0 = B.x + pu0 * (B.z - B.x);
    this.u1 = B.x + pu1 * (B.z - B.x);
    this.v0 = B.y + pv0 * (B.w - B.y); // the tail edge
    this.v1 = B.y + pv1 * (B.w - B.y); // the head edge
    const NS = BOOK.NS;
    const us = [this.u0];
    for (let i = Math.floor(this.u0 * NS) + 1; i / NS < this.u1 - 1e-6; i++) us.push(i / NS);
    us.push(this.u1);
    this.us = us;
    const n = us.length;
    // the top: two rows (head, tail) of n
    const top = new THREE.BufferGeometry();
    this.topPos = new Float32Array(2 * n * 3);
    this.topNor = new Float32Array(2 * n * 3);
    const tuv = new Float32Array(2 * n * 2);
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < n; i++) {
        tuv[(r * n + i) * 2] = us[i];
        tuv[(r * n + i) * 2 + 1] = r ? this.v0 : this.v1;
      }
    const tidx = [];
    for (let i = 0; i < n - 1; i++) tidx.push(i, n + i, i + 1, i + 1, n + i, n + i + 1); // front up, as the leaf's
    top.setAttribute('position', new THREE.BufferAttribute(this.topPos, 3));
    top.setAttribute('normal', new THREE.BufferAttribute(this.topNor, 3));
    top.setAttribute('uv', new THREE.BufferAttribute(tuv, 2));
    top.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(2 * n), 1));
    top.setIndex(tidx);
    this.topGeo = top;
    this.u = {
      ...leaf.u,
      uTex: { value: tex || leaf.u.uTex.value },
      uHasTex2: { value: 0 },
      uInsK: { value: 0 },
      uCutN: { value: 0 },
      uMaskN: { value: 0 },
      uPress: { value: new THREE.Vector4() },
      uCard: { value: new THREE.Vector4(this.u0, this.v0, this.u1, this.v1) },
      uCardRim: { value: 0 },
    };
    this.top = new THREE.Mesh(top, book.material(PAGE_FRAG, this.u, { side: THREE.DoubleSide }));
    this.top.frustumCulled = false;
    // the sides: head and tail along it (n − 1 quads each), and its two ends
    const nq = 2 * (n - 1) + 2;
    this.sidePos = new Float32Array(nq * 4 * 3);
    this.sideNor = new Float32Array(nq * 4 * 3);
    const sidx = [];
    for (let k = 0; k < nq; k++) sidx.push(4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3);
    const side = new THREE.BufferGeometry();
    side.setAttribute('position', new THREE.BufferAttribute(this.sidePos, 3));
    side.setAttribute('normal', new THREE.BufferAttribute(this.sideNor, 3));
    side.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nq * 4 * 2), 2));
    side.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(nq * 4), 1));
    side.setIndex(sidx);
    this.sideGeo = side;
    this.edgeU = { uEdgeK: { value: 0 }, uGlowK: { value: book.look.glow * book.look.self } };
    this.side = new THREE.Mesh(side, book.material(CARD_EDGE_FRAG, this.edgeU, { side: THREE.DoubleSide }));
    this.side.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.top, this.side);
    book.group.add(this.group);
    this.pose();
  }

  // the leaf's surface at (u, v) and its normal (book frame), from its grid
  at(u, v, P, Nn) {
    const NS = BOOK.NS;
    const NW = BOOK.NW;
    const pos = this.leaf.pos;
    const fi = Math.min(Math.max(u * NS, 0), NS - 1e-6);
    const fj = Math.min(Math.max((1 - v) * NW, 0), NW - 1e-6);
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    const a = fi - i;
    const b = fj - j;
    const g = (ii, jj, k) => pos[(jj * (NS + 1) + ii) * 3 + k];
    for (let k = 0; k < 3; k++) {
      const p0 = g(i, j, k) + (g(i + 1, j, k) - g(i, j, k)) * a;
      const p1 = g(i, j + 1, k) + (g(i + 1, j + 1, k) - g(i, j + 1, k)) * a;
      P.setComponent(k, p0 + (p1 - p0) * b);
    }
    // along the leaf (its column's segment) × across it (toward the tail) → the normal, up off the front
    const ii = Math.min(i, NS - 1);
    const t = new THREE.Vector3(g(ii + 1, j, 0) - g(ii, j, 0), g(ii + 1, j, 1) - g(ii, j, 1), g(ii + 1, j, 2) - g(ii, j, 2));
    const c = new THREE.Vector3(g(i, j + 1, 0) - g(i, j, 0), g(i, j + 1, 1) - g(i, j, 1), g(i, j + 1, 2) - g(i, j, 2));
    Nn.crossVectors(c, t).normalize();
    return P;
  }

  // lift (m), at the head edge; tilt (rad), the tail edge up about the head edge; edge: its sides' lime
  pose({ lift = 0, tilt = 0, edge = 0, rim = 0 } = {}) {
    const on = lift > 1e-4;
    this.group.visible = on;
    this.leaf.u.uCutH.value[this.slot] = on ? lift + 0.5 * Math.sin(tilt) * (this.v1 - this.v0) * BOOK.H : 0;
    this.edgeU.uEdgeK.value = edge;
    this.u.uCardRim.value = rim;
    if (!on) return;
    const n = this.us.length;
    const wd = (this.v1 - this.v0) * BOOK.H; // the card's width, head to tail (m)
    const th = Math.min(this.thick, lift);
    const P = new THREE.Vector3();
    const Nn = new THREE.Vector3();
    const Z = new THREE.Vector3();
    const cs = Math.cos(tilt);
    const sn = Math.sin(tilt);
    const T = this.topPos;
    const TN = this.topNor;
    const head = [];
    const tail = [];
    const nrm = [];
    for (let i = 0; i < n; i++) {
      this.at(this.us[i], this.v1, P, Nn);
      // across the leaf, toward the tail (the leaf's rows run head → tail along +z)
      Z.set(0, 0, 1).addScaledVector(Nn, -Nn.z).normalize();
      const h = P.clone().addScaledVector(Nn, lift);
      const across = Z.clone().multiplyScalar(cs).addScaledVector(Nn, sn);
      const tl = h.clone().addScaledVector(across, wd);
      const nTop = Nn.clone().multiplyScalar(cs).addScaledVector(Z, -sn);
      head.push(h);
      tail.push(tl);
      nrm.push({ n: nTop, a: across });
      h.toArray(T, i * 3);
      tl.toArray(T, (n + i) * 3);
      nTop.toArray(TN, i * 3);
      nTop.toArray(TN, (n + i) * 3);
    }
    this.topGeo.attributes.position.needsUpdate = true;
    this.topGeo.attributes.normal.needsUpdate = true;
    // the sides
    const S = this.sidePos;
    const SN = this.sideNor;
    let q = 0;
    const quad = (a, b, nv) => {
      // a, b: top points; the quad drops 'th' along each one's top normal
      const pts = [a.p, b.p, b.p.clone().addScaledVector(b.n, -th), a.p.clone().addScaledVector(a.n, -th)];
      pts.forEach((p, k) => {
        p.toArray(S, (q * 4 + k) * 3);
        nv.toArray(SN, (q * 4 + k) * 3);
      });
      q++;
    };
    for (let i = 0; i < n - 1; i++) {
      quad({ p: head[i], n: nrm[i].n }, { p: head[i + 1], n: nrm[i + 1].n }, nrm[i].a.clone().negate());
      quad({ p: tail[i], n: nrm[i].n }, { p: tail[i + 1], n: nrm[i + 1].n }, nrm[i].a);
    }
    const along = (i0, i1) => head[i1].clone().sub(head[i0]).normalize();
    quad({ p: head[0], n: nrm[0].n }, { p: tail[0], n: nrm[0].n }, along(0, 1).negate());
    quad({ p: head[n - 1], n: nrm[n - 1].n }, { p: tail[n - 1], n: nrm[n - 1].n }, along(n - 2, n - 1));
    this.sideGeo.attributes.position.needsUpdate = true;
    this.sideGeo.attributes.normal.needsUpdate = true;
  }

  // a press on the card's print (as Leaf.press)
  press(px, py, size, r, k) {
    this.u.uPress.value.set(px / size[0], 1 - py / size[1], r, k);
  }
}

export class Book {
  // pages: the leaves from the bottom of the right pile up, each { tex, under } (hR is set from the
  // order: the block's top, a step apart)
  constructor({ U, frame = bookFrame(), look = BOOK_LOOK, pages = [] }) {
    this.U = U;
    this.F = frame;
    this.look = look;
    const W = BOOK.W;
    const H = BOOK.H;
    const t = BOOK.BOARD;
    const oh = BOOK.OVER;
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.group.matrix.copy(frame.M);
    this.group.matrixWorldNeedsUpdate = true;
    this.world = new THREE.Group();

    this.bkU = {
      uBkInv: { value: frame.M.clone().invert() },
      uBkPageC: { value: frame.toWorld(W / 2, BOOK.BLOCK + 0.12, 0) }, // the page's light, as from a little above it
      uBkPageN: { value: frame.Y.clone() },
      uBkLeA: { value: new THREE.Vector3() },
      uBkA: { value: 0.464 * 0.261 },
      uBkBlock: { value: new THREE.Vector4(W, H / 2, BOOK.BLOCK, 0) },
      uBkEdgeL: { value: new THREE.Vector3() },
      uBkPaperLamp: { value: look.paperLamp },
      uK: { value: frame.floor },
      uPaper: { value: new THREE.Vector3(...look.paper) },
    };

    // the leaves
    this.leaves = pages.map((p, k) => new Leaf(this, { ...p, hR: BOOK.BLOCK + (k + 1) * BOOK.STEP, hL: (pages.length - k) * BOOK.STEP })); // the first turned lies lowest
    for (const l of this.leaves) this.group.add(l.mesh);
    this.hTop = BOOK.BLOCK + (pages.length + 1) * BOOK.STEP;

    // the block's edges
    const NS = BOOK.NS;
    const NQ = BOOK.NQ;
    const nSide = (NS + 1) * (NQ + 1);
    this.blockPos = new Float32Array((2 * nSide + 2 * (NQ + 1)) * 3);
    const buv = new Float32Array((2 * nSide + 2 * (NQ + 1)) * 2);
    for (let f = 0; f < 2; f++)
      for (let j = 0; j <= NQ; j++)
        for (let i = 0; i <= NS; i++) {
          const o = (f * nSide + j * (NS + 1) + i) * 2;
          buv[o] = i / NS;
          buv[o + 1] = j / NQ;
        }
    for (let k = 0; k < 2; k++)
      for (let j = 0; j <= NQ; j++) {
        const o = (2 * nSide + k * (NQ + 1) + j) * 2;
        buv[o] = k;
        buv[o + 1] = j / NQ;
      }
    const idx = [];
    for (const v of gridIndex(NS, NQ, true)) idx.push(v); // head (z = -H/2): -z
    for (const v of gridIndex(NS, NQ, false)) idx.push(v + nSide); // tail (z = +H/2): +z
    for (const v of gridIndex(NQ, 1, false)) idx.push(v + 2 * nSide); // fore-edge: +x
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(this.blockPos, 3));
    bg.setAttribute('uv', new THREE.BufferAttribute(buv, 2));
    bg.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(this.blockPos.length / 3), 1));
    bg.setIndex(idx);
    this.blockGeo = bg;
    this.edgeU = { uEdgeK: { value: look.edge }, uLeaves: { value: BOOK.LEAVES } };
    this.block = new THREE.Mesh(bg, this.material(EDGE_FRAG, this.edgeU));
    this.block.frustumCulled = false;
    this.group.add(this.block);

    // the boards: the back one under the block, the front one on a hinge at the spine
    const Wc = W + oh;
    const Hc = H + 2 * oh;
    const mark = 0.055 / (LOGO.R1 * U_LOGO); // the ring 0.11 m across
    const solid = (kind, extra = {}) =>
      this.material(SOLID_FRAG, {
        uKind: { value: kind },
        uLogoK: { value: look.logo },
        uSpillK: { value: 1 },
        uLeather: { value: new THREE.Vector3(...look.leather) },
        uWalnut: { value: new THREE.Vector3(...look.walnut) },
        uEndpaper: { value: new THREE.Vector3(...look.endpaper) },
        uBoardM: { value: new THREE.Vector4(Wc, Hc / 2, BOOK.TURN_IN, mark) },
        ...extra,
      });
    this.frontU = null;
    const front = solid(0);
    this.frontU = front.uniforms;
    this.cover = new THREE.Group();
    const cm = new THREE.Mesh(slab(0, Wc, 0, t, -Hc / 2, Hc / 2, { '+y': 0, '-y': 1, other: 2 }), front);
    this.cover.add(cm);
    this.group.add(this.cover);
    this.group.add(new THREE.Mesh(slab(0, Wc, -t, 0, -Hc / 2, Hc / 2, { '+y': 1, '-y': 0, other: 2 }), solid(1)));
    // the spine: a half round of leather, squashed as the book opens
    const sg = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true, Math.PI, Math.PI);
    sg.rotateX(Math.PI / 2);
    const suv = sg.attributes.uv;
    for (let k = 0; k < suv.count; k++) suv.setXY(k, suv.getX(k) * 0.05, suv.getY(k) * Hc);
    sg.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(sg.attributes.position.count).fill(2), 1));
    this.spine = new THREE.Mesh(sg, solid(2));
    this.spine.scale.z = Hc;
    this.group.add(this.spine);

    // the lectern: a sloped board with a ledge at the tail, an apron, a column and a cross foot
    const wal = solid(3);
    const up = solid(4);
    const yb = -t;
    this.group.add(new THREE.Mesh(slab(-0.64, 0.64, yb - 0.032, yb, -0.25, 0.24), wal));
    this.group.add(new THREE.Mesh(slab(-0.64, 0.64, yb, yb + 0.022, H / 2 + oh + 0.004, H / 2 + oh + 0.026), wal));
    this.group.add(new THREE.Mesh(slab(-0.5, 0.5, yb - 0.032 - 0.07, yb - 0.032, -0.19, 0.17), wal));
    const top = frame.toWorld(0, yb - 0.08, -0.01);
    const fy = frame.floorY;
    const col = new THREE.Mesh(slab(-0.07, 0.07, fy, top.y, -0.07, 0.07), up);
    col.position.set(top.x, 0, top.z);
    const a = Math.atan2(frame.n.z, frame.n.x);
    col.rotation.y = -a;
    this.world.add(col);
    for (const r of [0, Math.PI / 2]) {
      const foot = new THREE.Mesh(slab(-0.34, 0.34, fy, fy + 0.07, -0.045, 0.045), up);
      foot.position.set(top.x, 0, top.z);
      foot.rotation.y = -a + r;
      this.world.add(foot);
    }
    this.setCover(0);
  }

  material(frag, own, opts = {}) {
    return new THREE.ShaderMaterial({
      uniforms: { ...own, ...this.bkU, ...this.U },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + BOOK_LIGHT + frag,
      ...opts,
    });
  }

  // the front board: theta 0 closed … π lying open; the gutter forms as it opens
  setCover(theta) {
    const open = Math.min(Math.max(theta / Math.PI, 0), 1);
    this.open = open;
    const yh = this.hTop * (1 - open);
    this.cover.position.set(0, yh, 0);
    this.cover.rotation.set(0, 0, theta);
    const t = BOOK.BOARD;
    const yTop = yh + t;
    const ry = (yTop + t) / 2;
    this.spine.position.set(0, (yTop - t) / 2, 0);
    this.spine.scale.set(Math.min(0.6 * ry, 0.014), ry, this.spine.scale.z);
    this.blockShape(open);
    return open;
  }

  blockShape(open) {
    const NS = BOOK.NS;
    const NQ = BOOK.NQ;
    const H = BOOK.H;
    const nSide = (NS + 1) * (NQ + 1);
    const P = this.blockPos;
    const row = new Float32Array((NS + 1) * 3);
    const zs = [0];
    for (let j = 0; j <= NQ; j++) {
      const h = (BOOK.BLOCK * j) / NQ;
      leafRows(leafPose({ hR: h, open }), row, NS, 0, zs);
      for (let i = 0; i <= NS; i++) {
        for (let f = 0; f < 2; f++) {
          const o = (f * nSide + j * (NS + 1) + i) * 3;
          P[o] = row[i * 3];
          P[o + 1] = row[i * 3 + 1];
          P[o + 2] = f ? H / 2 : -H / 2;
        }
      }
      for (let k = 0; k < 2; k++) {
        const o = (2 * nSide + k * (NQ + 1) + j) * 3;
        P[o] = row[NS * 3];
        P[o + 1] = row[NS * 3 + 1];
        P[o + 2] = k ? H / 2 : -H / 2;
      }
    }
    this.blockGeo.attributes.position.needsUpdate = true;
    this.blockGeo.computeVertexNormals();
    this.foreX = P[2 * nSide * 3 + NQ * 3];
  }

  // the book's own light: page radiance (linear rgb, of the uncovered right page) and lime edge level
  setLight({ page = [0, 0, 0], edge = this.look.edge, logo = this.look.logo } = {}) {
    const A = this.bkU.uBkA.value;
    const k = A * this.look.spill;
    this.bkU.uBkLeA.value.set(page[0] * k, page[1] * k, page[2] * k);
    const lc = this.U.uLitCol.value;
    const edgeL = 0.8 * edge; // the edges' mean radiance, leaf lines and all
    this.bkU.uBkEdgeL.value.set(lc.r * edgeL, lc.g * edgeL, lc.b * edgeL);
    this.bkU.uBkBlock.value.x = this.foreX ?? BOOK.W;
    this.edgeU.uEdgeK.value = edge;
    this.frontU.uLogoK.value = logo;
  }
}
