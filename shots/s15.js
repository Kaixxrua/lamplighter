// s15 · 0:45–0:51 · 片名 (global 1080–1223)
// The title. We cut closer on the axis of s14's last frame: the lantern in the upper middle of the
// frame, its deck below it, the frozen pages in the dark around it, grey and lime. The sheet goes on
// turning, and now it sets the lime pages alight as it passes them: on the left on the cut, behind the
// lighthouse, then on the right (the pages nearest us it leaves lime). Each goes from its edges
// inward, rimmed with lime, and the rim lets go of points of light that rise off the page and stream
// in to gather, in front of the lighthouse, into the title, so that the sheet
// writes it as it turns: 燃, 灯, 者, then LAMPLIGHTER, each stroke lighting as its points land. The
// streams go round the lighthouse, never through it. As 者 is finished the sheet crosses the camera
// (the lens flashes), LAMPLIGHTER is written in the flash's wake, and the title holds while the sheet
// turns on (燃灯者 2.6 s, the whole 2.3 s).
// First frame: the lantern and its deck, the lime pages glowing in the field of frozen grey ones, the
// sheet pointing left. Last frame: the title complete in front of the lighthouse, the pages it took
// burnt away, the sheet pointing right. s16 cuts in to the lens.
// Camera: on s14's bearing (270°) and aimed where s14 ends, 3 m above the deck, so that the cut is a
// punch-in of 1.4 with the lamp where it was: 13.6 → 12.8 m from the axis, 2.6 m above the deck,
// 28 mm, pushing in slowly.
// Light: as in s14, the lighthouse only. The title is its own light, lime, the only colour that glows.
// The portholes of the deck, which s14 lit, go out as the title gathers, and the two that face us,
// either side of 灯 (lit or dark they would read as stops between the characters), are taken away at
// 1.6 s, when the wall they are in is dark. The flash is softer than s14's, the title being written
// through it (flashcheck: at most 24% of the picture changes on a frame, at 200 to 500 cd/m²).
// Sound: see CUES (s into the shot; global frame = 1080 + 24 t).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { font, makeCanvas } from 'film/lib/text.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH } from 'world/lighthouse.js';
import { Pages, fall, PAGE } from 'world/pages.js';
import { Dust } from 'world/dust.js';
import { pageAtlas } from 'world/pageatlas.js';
import { SWEEP, sweepAngle, FIELD, T_OFF, LEAVES, freezePlan, limeAt, heroState, Y0, FLOOR } from './s13.js';
import { LOOK, FLASH, sheetAt, flashAt } from './s14.js';

export const meta = {
  frames: 144,
  quality: { final: { samples: 8 } },
  post: { streak: { strength: 0.4, threshold: 20, tint: [0.85, 1.0, 0.55], length: 0.2, decay: 0.8 } },
};

const DEG = Math.PI / 180;
const T0 = 10; // the sweep's clock (s since global 840) at this shot's first frame
const END = T0 + meta.frames / 24;
const LAMP = Y0 + LH.LAMP_Y;

export const CAM = { bearing: 270 * DEG, r0: 13.6, r1: 12.8, h: 2.6, lens: 28, look: 3.0 };
// the title: its centre on screen (NDC) and distance from the lens when the camera is where it is at
// `ref` s into the shot, and its width as a share of the frame
export const TITLE = { ndc: [0, -0.64], dist: 6.5, width: 0.42, ref: 3 };
// the type: canvas size (px), the Chinese line and the English line (size in canvas heights, tracking in em)
export const TYPE = {
  W: 4096,
  H: 1536,
  zh: { text: '燃灯者', size: 0.5, weight: 400, tracking: 0.3, base: 0.6 },
  en: { text: 'LAMPLIGHTER', size: 0.125, weight: 500, tracking: 0.5, base: 0.81 },
};
// the order of the writing: when each character would gather by design (s), its points landing
// between the two times; the times themselves follow the fire (see the warp in setup)
export const WINDOWS = {
  zh: [[1.0, 2.0], [1.5, 2.5], [2.0, 3.0]],
  en: (j) => [2.6 + 0.06 * j, 3.2 + 0.06 * j],
};
// the fire: the sheet sets each lime page alight DELAY s after it crosses it; the pages it reaches
// after LAST s stay lime; a page burns away in BURN s (shortest, longest)
export const FIRE = { delay: 0.03, last: 2.5, burn: [0.4, 0.55] };
// the points, per page: how far they rise off it and swoop in to the stroke (m), their sway (a share
// of the flight), how long they take to melt into the stroke (s), their light, their speed (m/s) and
// shortest flight (s), and the slices of time (s) within which they are paired by height
export const EMBER = {
  perPage: 1000, // on average: a page lets go of as many as the writing needs while its points can land
  fewest: 500,
  most: 2500,
  lift: 1.6,
  approach: 1.4,
  wander: 0.015,
  melt: 0.3,
  intensity: 0.7,
  speed: 16,
  minFlight: 0.25,
  slice: 0.12,
};
// the roads keep out of a cylinder about the lighthouse (radius, top above the deck, m)
const CLEAR = { r: 3.8, top: 6.6 };
// The lighthouse's windows once the title gathers (s14 brought them up to 1). The two portholes of
// the deck that face us stand either side of 灯 and would read as stops between the characters, lit
// or dark (their rims catch the sheet): they go at `ports` s, when their light is out and the front
// of the deck is dark (the sheet behind the lighthouse gives it nothing). And the flash, a share of
// s14's: the title is being written through it.
const LOOK15 = { portholes: 0, ports: 1.6, flash: 0.6 };
// the strokes' light once gathered
export const GLYPH = { intensity: 1.3 };

// ------------------------------------------------------------------- the burn, ported from pages.js

const _f = new Float32Array(1);
const _u = new Uint32Array(_f.buffer);
const bits = (x) => {
  _f[0] = x;
  return _u[0];
};
function pcg(v) {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}
const hash12 = (x, y) => pcg((pcg(bits(x)) ^ bits(y)) >>> 0) / 4294967295;
function vnoise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy);
  const b = hash12(ix + 1, iy);
  const c = hash12(ix, iy + 1);
  const d = hash12(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
// the threshold a leaf's paper at (u, v) burns at: it is gone once burn * 1.05 passes it
export function burnN(u, v, seed) {
  const s = Math.fround(seed);
  const e = Math.min(u, 1 - u, v, 1 - v);
  return (
    0.6 * vnoise2(u * 5 + s * 17, v * 7 + s * 17) +
    0.25 * vnoise2(u * 19 + s * 5, v * 26.6 + s * 5) +
    0.15 * smoothstep(0, 0.25, e)
  );
}

// the world position of (u, v) on a leaf, ported from pages.js's vertex shader
const _p = new THREE.Vector3();
const _o = new THREE.Vector3();
function leafPoint(st, u, v, out) {
  const W = PAGE.W;
  const H = PAGE.H;
  const qx = (u - 0.5) * W;
  const qy = (v - 0.5) * H;
  const kb = st.bend;
  const th = kb * qx;
  if (Math.abs(kb) > 1e-3) _p.set(Math.sin(th) / kb, qy, (1 - Math.cos(th)) / kb);
  else _p.set(qx, qy, 0.5 * kb * qx * qx);
  const ph = 2 * Math.PI * ((0.7 * qx) / W + qy / H) + st.phase;
  const h = st.twist * qx * qy + 0.5 * st.curl * qy * qy + st.ripple * W * Math.sin(ph);
  _p.x += -Math.sin(th) * h;
  _p.z += Math.cos(th) * h;
  return out.copy(_p).multiplyScalar(st.scale).applyQuaternion(st.q).add(_o.set(st.x, st.y, st.z));
}

// ------------------------------------------------------------------------------------------ the type

// The title set into a canvas, one character at a time (the tracking is wide; kerning does not
// matter): coverage, and each character's box (px) with its gathering window.
function typeset() {
  const { W, H } = TYPE;
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const chars = [];
  const line = (L, fam, caps, win) => {
    const size = L.size * H;
    g.font = font(fam, size, L.weight);
    g.fontVariantCaps = caps;
    g.letterSpacing = '0px';
    const glyphs = [...L.text];
    const adv = glyphs.map((c) => g.measureText(c).width);
    const tr = L.tracking * size;
    const total = adv.reduce((a, b) => a + b, 0) + tr * (glyphs.length - 1);
    let x = W / 2 - total / 2;
    const y = L.base * H;
    glyphs.forEach((c, j) => {
      g.fillText(c, x, y);
      const m = g.measureText(c);
      chars.push({
        c,
        x0: x - m.actualBoundingBoxLeft,
        x1: x + m.actualBoundingBoxRight,
        y0: y - m.actualBoundingBoxAscent,
        y1: y + m.actualBoundingBoxDescent,
        win: win(j),
      });
      x += adv[j] + tr;
    });
  };
  line(TYPE.zh, 'serif', 'normal', (j) => WINDOWS.zh[j]);
  line(TYPE.en, 'garamond', 'all-small-caps', WINDOWS.en);
  const px = g.getImageData(0, 0, W, H).data;
  const cov = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) cov[i] = px[i * 4 + 3];
  return { W, H, cov, chars };
}

// When the stroke at (x, y) px gathers: its character's window, early to late by a coarse noise
// (the strokes fill in patches) and a little from the top left to the bottom right (as one writes).
const RES = 4; // the reveal map is a quarter of the type's resolution
function nearestChar(chars, x, y) {
  let best = 0;
  let bd = Infinity;
  chars.forEach((ch, j) => {
    const dx = Math.max(ch.x0 - x, 0, x - ch.x1);
    const dy = Math.max(ch.y0 - y, 0, y - ch.y1);
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      best = j;
    }
  });
  return best;
}
function revealAt(chars, x, y) {
  const best = chars[nearestChar(chars, x, y)];
  const sx = clamp((x - best.x0) / (best.x1 - best.x0), 0, 1);
  const sy = clamp((y - best.y0) / (best.y1 - best.y0), 0, 1);
  const cell = Math.max(best.y1 - best.y0, best.x1 - best.x0) / 5;
  const n = vnoise2(x / cell + 7.3, y / cell + 1.9);
  const f = clamp(0.62 * (1.7 * n - 0.35) + 0.38 * (0.6 * sy + 0.4 * sx), 0, 1);
  return lerp(best.win[0], best.win[1], f);
}
const T_MAX = 8; // the reveal map stores t / T_MAX in 8 bits
function revealMap(type) {
  const w = type.W / RES;
  const h = type.H / RES;
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const t = revealAt(type.chars, (i + 0.5) * RES, (j + 0.5) * RES);
      const k = (j * w + i) * 4;
      data[k] = Math.round((clamp(t, 0, T_MAX) / T_MAX) * 255);
      data[k + 3] = 255;
    }
  }
  return { w, h, data };
}
// the map read as the GPU reads it (bilinear between texel centres, rows from the top)
function sampleReveal(map, x, y) {
  const fx = clamp(x / RES - 0.5, 0, map.w - 1);
  const fy = clamp(y / RES - 0.5, 0, map.h - 1);
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const i1 = Math.min(i0 + 1, map.w - 1);
  const j1 = Math.min(j0 + 1, map.h - 1);
  const v = (i, j) => (map.data[(j * map.w + i) * 4] / 255) * T_MAX;
  const ax = fx - i0;
  const ay = fy - j0;
  return lerp(lerp(v(i0, j0), v(i1, j0), ax), lerp(v(i0, j1), v(i1, j1), ax), ay);
}

// --------------------------------------------------------------------------------------- the plate

const PLATE_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }`;
const PLATE_FRAG = /* glsl */ `
uniform sampler2D uCov, uReveal; uniform float uT, uI, uRise; uniform vec3 uCol;
varying vec2 vUv;
void main(){
  float cov = texture2D(uCov, vUv).r;
  float ta = texture2D(uReveal, vUv).r*${T_MAX.toFixed(1)};
  float lit = smoothstep(ta - 0.08, ta + uRise, uT);
  gl_FragColor = vec4(uCol*(uI*cov*lit), 1.0);
}`;

// ---------------------------------------------------------------------------------------- the embers

// Each point is drawn as the streak it makes while the shutter is open (its share of it when the
// frame is sampled in time): a quad from where it was to where it is, as wide as its blur circle.
const EMBER_VERT = /* glsl */ `
attribute vec3 aS; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aX; attribute vec4 aT; attribute vec4 aR;
uniform float uT, uDT, uWander, uMelt, uI;
uniform vec3 uCol; uniform vec2 uRes;
uniform float uMinPx, uMaxPx, uFocusD, uLensK;
varying vec3 vCol; varying vec2 vQ; varying float vH, vR, vBokeh;
vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float u){ float v = 1.0 - u; return v*v*v*a + 3.0*v*v*u*b + 3.0*v*u*u*c + u*u*u*d; }
// along its road (see road() below), easing out of the page and into the stroke, swaying a little
vec3 path(float t){
  float u = clamp((t - aT.x)/max(aT.y - aT.x, 1e-3), 0.0, 1.0);
  float e = u*u*(3.0 - 2.0*u);
  float ph = aR.z*6.2831853;
  return bez(aS, aP1, aP2, aX, e) + uWander*distance(aS, aX)*sin(3.14159265*e)*vec3(sin(t*2.3 + ph), sin(t*1.9 + 2.1*ph), sin(t*2.1 + 3.3*ph));
}
void main(){
  float ts = aT.x, ta = aT.y;
  float t0 = max(uT - 0.5*uDT, ts), t1 = uT + 0.5*uDT;
  if (t1 < ts || t0 > ta + uMelt){ gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  vec4 v0 = viewMatrix*vec4(path(t0), 1.0), v1 = viewMatrix*vec4(path(t1), 1.0);
  if (-v0.z < 0.2 || -v1.z < 0.2){ gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  vec4 c0 = projectionMatrix*v0, c1 = projectionMatrix*v1;
  vec2 s0 = c0.xy/c0.w*0.5*uRes, s1 = c1.xy/c1.w*0.5*uRes;
  float dist = -0.5*(v0.z + v1.z);
  float coc = uLensK*abs(dist - uFocusD)/(dist*uFocusD);
  float size = clamp(max(uMinPx, coc), uMinPx, uMaxPx);
  float r = 0.5*size;
  vec2 dd = s1 - s0; float len = length(dd);
  vec2 dir = len > 1e-4 ? dd/len : vec2(1.0, 0.0);
  float a = 0.5 + 0.5*position.x;
  vec2 s = mix(s0, s1, a) + (dir*position.x + vec2(-dir.y, dir.x)*position.y)*r;
  vec4 c = mix(c0, c1, a);
  gl_Position = vec4(s/(0.5*uRes)*c.w, c.z, c.w);
  vQ = vec2((a - 0.5)*len + position.x*r, position.y*r);
  vH = 0.5*len; vR = r;
  // born bright off the rim, steady in flight, melting into the stroke after landing; a dot's light
  // spread along its streak
  float age = uT - ts;
  float I = (1.0 + 1.5*exp(-age/0.1))*(1.0 - smoothstep(ta, ta + uMelt, uT))*(0.6 + 0.8*aR.w);
  vCol = uCol*(uI*I*(uMinPx*uMinPx)/(size*size)/(1.0 + 1.02*len/r));
  vBokeh = smoothstep(uMinPx*1.5, uMinPx*4.0, size);
}`;
const EMBER_FRAG = /* glsl */ `
varying vec3 vCol; varying vec2 vQ; varying float vH, vR, vBokeh;
void main(){
  float dx = max(abs(vQ.x) - vH, 0.0);
  float r2 = (dx*dx + vQ.y*vQ.y)/(vR*vR);
  if (r2 > 1.0) discard;
  float soft = exp(-r2*3.0);
  float disc = smoothstep(1.0, 0.86, sqrt(r2))*(0.75 + 0.35*r2);
  gl_FragColor = vec4(vCol*mix(soft*2.6, disc*1.15, vBokeh), 1.0);
}`;

// ------------------------------------------------------------------------------------------- plan

function camAt(t, pos, target) {
  const u = smoothstep(0, meta.frames / 24, t);
  const r = lerp(CAM.r0, CAM.r1, u);
  pos.set(Math.cos(CAM.bearing) * r, Y0 + CAM.h, Math.sin(CAM.bearing) * r);
  target.set(0, Y0 + CAM.look, 0);
}

// Where the title stands, placed from the camera at TITLE.ref: the lens and its axes, the plate's
// centre and its size (m).
function titleFrame(camera) {
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  camAt(TITLE.ref, pos, target);
  setLens(camera, CAM.lens);
  aim(camera, pos, target);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const ray = new THREE.Vector3(TITLE.ndc[0], TITLE.ndc[1], 0.5).unproject(camera).sub(pos).normalize();
  const centre = pos.clone().addScaledVector(ray, TITLE.dist / ray.dot(fwd));
  const tw = TITLE.width * 2 * TITLE.dist * Math.tan((camera.fov * DEG) / 2) * camera.aspect;
  return {
    pos,
    fwd,
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
    centre,
    tw,
    th: (tw * TYPE.H) / TYPE.W,
  };
}

// The pages that would stand between the lens and the title at some moment of the shot: they are
// not in it.
function hiddenPages(P, F) {
  const hide = new Set();
  const st = { q: new THREE.Quaternion() };
  const v = new THREE.Vector3();
  for (let i = 0; i < LEAVES; i++) {
    if (P.drop[i]) continue;
    const tc = P.tc[i];
    const n = tc <= T0 ? 0 : 12; // a page frozen before the shot stands still
    for (let k = 0; k <= n; k++) {
      const T = n ? lerp(T0, Math.min(tc, END), k / n) : tc;
      fall(i, T + T_OFF, FIELD, st);
      v.set(st.x, st.y, st.z).sub(F.pos);
      const z = v.dot(F.fwd);
      if (z <= 0.2 || z > TITLE.dist + 0.3) continue;
      // project onto the title's plane from the lens
      v.multiplyScalar(TITLE.dist / z).add(F.pos).sub(F.centre);
      if (Math.abs(v.dot(F.right)) < F.tw / 2 + 0.3 && Math.abs(v.dot(F.up)) < F.th / 2 + 0.3) {
        hide.add(i);
        break;
      }
    }
  }
  return hide;
}

// The pages that burn: the lime pages the sheet crosses by FIRE.last (the first page among them),
// each with the time it catches (s into the shot) and how long it burns.
function firePlan(P, hide) {
  const st = { q: new THREE.Quaternion() };
  const th = sweepAngle(T0);
  const out = [];
  const add = (i) => {
    const da = (((Math.atan2(st.z, st.x) - th) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const t = da / SWEEP.omega + FIRE.delay; // the sheet turns at full speed through the shot
    if (t <= FIRE.last) out.push({ i, t, dur: lerp(FIRE.burn[0], FIRE.burn[1], hash(i, 15, 1)) });
  };
  heroState(T0, st);
  add(LEAVES);
  for (let i = 0; i < LEAVES; i++) {
    if (P.drop[i] || hide.has(i) || !P.lime[i] || !(P.tc[i] < T0)) continue;
    fall(i, P.tc[i] + T_OFF, FIELD, st);
    add(i);
  }
  return out;
}

// The pages this shot takes out of the world, burnt or kept out of the title's way: the shots after
// it go on without them.
export function takenPages() {
  const P = freezePlan(END + 0.05);
  const hide = hiddenPages(P, titleFrame(new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 600)));
  return new Set([...hide, ...firePlan(P, hide).map((f) => f.i)]);
}

// A point's road from S on its page to X on the stroke, as the two inner control points of a cubic:
// up off the page and towards the title; in from behind the title, on the side it comes from; and
// round the lighthouse, pushed out of the cylinder about it on the side the road passes.
const UP = new THREE.Vector3(0, 1, 0);
const _D = new THREE.Vector3();
const _a = new THREE.Vector3();
const _q = new THREE.Vector3();
function bezAt(S, P1, P2, X, u, out) {
  const v = 1 - u;
  return out
    .copy(S)
    .multiplyScalar(v * v * v)
    .addScaledVector(P1, 3 * v * v * u)
    .addScaledVector(P2, 3 * v * u * u)
    .addScaledVector(X, u * u * u);
}
function road(S, X, rx, ry, back, right, P1, P2) {
  _D.subVectors(X, S);
  const d = _D.length();
  P1.copy(S).addScaledVector(_a.copy(_D).multiplyScalar(0.5 / d).add(UP).normalize(), EMBER.lift * (0.6 + 0.8 * rx));
  _a.copy(_D).addScaledVector(back, -_D.dot(back));
  if (_a.lengthSq() > 1e-6) _a.normalize().negate();
  P2.copy(X).addScaledVector(_a.addScaledVector(back, 0.5).normalize(), EMBER.approach * (0.6 + 0.8 * ry));
  let pushed = 0;
  for (let it = 0; it < 8; it++) {
    let worst = 0;
    let wx = 0;
    let wz = 0;
    for (let j = 1; j < 24; j++) {
      bezAt(S, P1, P2, X, j / 24, _q);
      if (_q.y - Y0 > CLEAR.top) continue;
      const r = Math.hypot(_q.x, _q.z);
      if (CLEAR.r - r > worst) {
        worst = CLEAR.r - r;
        wx = _q.x;
        wz = _q.z;
      }
    }
    if (worst <= 0) break;
    let n = Math.hypot(wx, wz);
    if (n < 0.05) {
      // straight through the axis: round the side the page is on
      const sg = (S.x * right.x + S.z * right.z) >= 0 ? 1 : -1;
      wx = sg * right.x;
      wz = sg * right.z;
      n = Math.hypot(wx, wz);
    }
    const k = (worst + 0.25) * 1.6;
    P1.x += (wx / n) * k;
    P1.z += (wz / n) * k;
    P2.x += (wx / n) * k;
    P2.z += (wz / n) * k;
    pushed++;
  }
  return pushed;
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 600);
  const lib = new Library({ floors: [FLOOR - 8, FLOOR + 8], near: 2, mid: 8, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: 0 }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES + 1 });
  scene.add(leaves.mesh);
  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 14 });
  scene.add(dust.points);

  // the camera at the title's reference time places the title
  const F = titleFrame(camera);
  const { fwd, right, up, centre, tw, th } = F;
  const pos = F.pos.clone();
  const target = new THREE.Vector3();
  // canvas px → world
  const toWorld = (x, y, out) =>
    out.copy(centre).addScaledVector(right, (x / TYPE.W - 0.5) * tw).addScaledVector(up, (0.5 - y / TYPE.H) * th);

  const type = typeset();
  const map = revealMap(type);

  // the pages: those that would stand between the lens and the title are not in this shot, and the
  // lime ones the sheet crosses burn
  const P = freezePlan(END + 0.05);
  const hide = hiddenPages(P, F);
  const fire = firePlan(P, hide);
  const burning = new Map(fire.map((f) => [f.i, f]));
  // how high a point stands in the frame (the tangent of its elevation from the lens)
  const camY = pos.y;
  const rise = (p) => (p.y - camY) / Math.max(0.2, (p.x - pos.x) * fwd.x + (p.y - pos.y) * fwd.y + (p.z - pos.z) * fwd.z);

  // The points: each burning page lets go of points where its burning rim passes, as it passes (the
  // first of a low-discrepancy sequence over the page, so that any number of them covers it evenly).
  const cand = [];
  {
    const st = { q: new THREE.Quaternion() };
    const S = new THREE.Vector3();
    for (const f of fire) {
      if (f.i === LEAVES) heroState(T0, st);
      else fall(f.i, P.tc[f.i] + T_OFF, FIELD, st);
      const pts = [];
      for (let k = 0; k < EMBER.most; k++) {
        const u = (hash(f.i, 0, 2) + k * 0.7548776662) % 1;
        const v = (hash(f.i, 0, 3) + k * 0.5698402910) % 1;
        leafPoint(st, u, v, S);
        const ts = f.t + f.dur * clamp(burnN(u, v, st.seed) / 1.05, 0, 1);
        const fly = Math.max(S.distanceTo(centre) / EMBER.speed, EMBER.minFlight);
        pts.push({ x: S.x, y: S.y, z: S.z, h: rise(S), ts, key: ts + fly, page: f.i, k });
      }
      cand.push(pts);
    }
  }
  // How many each page lets go: as many as the strokes that gather while its points can land need
  // (the weights of a mixture fitted to the design's timing, iterated as in Richardson–Lucy).
  const N = EMBER.perPage * fire.length;
  const BIN = 0.05;
  const NB = Math.ceil(T_MAX / BIN);
  const bin = (t) => clamp(Math.floor(t / BIN), 0, NB - 1);
  const need = new Float64Array(NB);
  for (let y = 2; y < type.H; y += 4) for (let x = 2; x < type.W; x += 4) if (type.cov[y * type.W + x] > 127) need[bin(sampleReveal(map, x, y))] += 1;
  {
    const sum = need.reduce((a, b) => a + b, 0);
    for (let b = 0; b < NB; b++) need[b] *= N / sum;
  }
  const hist = cand.map((pts) => {
    const h = new Float64Array(NB);
    for (let k = 0; k < 800; k++) h[bin(pts[k].key)] += 1 / 800;
    return h;
  });
  let w = fire.map(() => EMBER.perPage);
  for (let it = 0; it < 80; it++) {
    const sup = new Float64Array(NB);
    hist.forEach((h, i) => h.forEach((x, b) => (sup[b] += w[i] * x)));
    w = w.map((wi, i) => {
      let r = 0;
      hist[i].forEach((x, b) => (r += x > 0 ? (x * need[b]) / Math.max(sup[b], 1e-9) : 0));
      return clamp(wi * r, EMBER.fewest, EMBER.most);
    });
    const sum = w.reduce((a, b) => a + b, 0);
    w = w.map((wi) => clamp((wi * N) / sum, EMBER.fewest, EMBER.most));
  }
  const src = cand.flatMap((pts, i) => pts.slice(0, Math.round(w[i])));
  const n = src.length;
  // where they land: n points on the strokes, uniform over the ink, each with the time its stroke
  // gathers by design and its character
  const ink = [];
  for (let i = 0; i < type.W * type.H; i++) if (type.cov[i] > 127) ink.push(i);
  const tgt = [];
  {
    const X = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      const idx = ink[Math.floor(hash(k, 77, 1) * ink.length)];
      const x = (idx % type.W) + hash(k, 77, 2);
      const y = Math.floor(idx / type.W) + hash(k, 77, 3);
      toWorld(x, y, X);
      tgt.push({ x: X.x, y: X.y, z: X.z, h: rise(X), td: sampleReveal(map, x, y), ch: nearestChar(type.chars, x, y) });
    }
  }
  // The writing follows the fire: the stroke point that comes k-th in the design's order gathers when
  // the k-th earliest point can land, and the reveal map is warped to match.
  src.sort((a, b) => a.key - b.key);
  tgt.sort((a, b) => a.td - b.td);
  const xs = Float64Array.from(tgt, (g) => g.td);
  const ys = Float64Array.from(src, (s) => s.key);
  const warp = (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    return lerp(ys[lo], ys[hi], xs[hi] > xs[lo] ? (x - xs[lo]) / (xs[hi] - xs[lo]) : 0);
  };
  tgt.forEach((g, k) => (g.ta = ys[k]));
  for (let k = 0; k < map.data.length; k += 4) map.data[k] = Math.round((clamp(warp((map.data[k] / 255) * T_MAX), 0, T_MAX) / T_MAX) * 255);
  // Paired by height within slices of time, so that each page's points stream to one band of the
  // strokes and the streams do not cross.
  const posA = new Float32Array(n * 3);
  const p1A = new Float32Array(n * 3);
  const p2A = new Float32Array(n * 3);
  const xA = new Float32Array(n * 3);
  const tA = new Float32Array(n * 4);
  const rA = new Float32Array(n * 4);
  const S = new THREE.Vector3();
  const X = new THREE.Vector3();
  const P1 = new THREE.Vector3();
  const P2 = new THREE.Vector3();
  let rounded = 0;
  for (let k0 = 0, o = 0; k0 < n; ) {
    let k1 = k0 + 1;
    while (k1 < n && src[k1].key - src[k0].key < EMBER.slice) k1++;
    const ss = src.slice(k0, k1).sort((a, b) => a.h - b.h);
    const gg = tgt.slice(k0, k1).sort((a, b) => a.h - b.h);
    for (let j = 0; j < ss.length; j++, o++) {
      const s = ss[j];
      const g = gg[j];
      S.set(s.x, s.y, s.z);
      X.set(g.x, g.y, g.z);
      // a page's points take much the same road
      const rx = 0.7 * hash(s.page, 0, 20) + 0.3 * hash(s.page, s.k, 20);
      const ry = 0.7 * hash(s.page, 0, 21) + 0.3 * hash(s.page, s.k, 21);
      if (road(S, X, rx, ry, fwd, right, P1, P2)) rounded++;
      S.toArray(posA, o * 3);
      P1.toArray(p1A, o * 3);
      P2.toArray(p2A, o * 3);
      X.toArray(xA, o * 3);
      tA.set([s.ts, Math.max(g.ta, s.ts + 0.25), g.ch, 0], o * 4);
      rA.set([rx, ry, hash(s.page, s.k, 22), hash(s.page, s.k, 23)], o * 4);
    }
    k0 = k1;
  }
  // the landing times the sound follows (CUES.strokes) must still be those of the plan
  {
    const span = (j0, j1) => {
      const t = [];
      for (let k = 0; k < n; k++) if (tA[k * 4 + 2] >= j0 && tA[k * 4 + 2] < j1) t.push(tA[k * 4 + 1]);
      t.sort((a, b) => a - b);
      return [t[Math.floor(0.02 * (t.length - 1))], t[Math.floor(0.98 * (t.length - 1))]];
    };
    const zh = [...TYPE.zh.text];
    const got = { ...Object.fromEntries(zh.map((c, j) => [c, span(j, j + 1)])), [TYPE.en.text]: span(zh.length, type.chars.length) };
    for (const [c, [a, b]] of Object.entries(got)) {
      const [ca, cb] = CUES.strokes[c];
      if (Math.abs(a - ca) > 0.03 || Math.abs(b - cb) > 0.03)
        console.warn(`[s15] CUES.strokes.${c} is [${ca}, ${cb}], the plan lands it in [${a.toFixed(2)}, ${b.toFixed(2)}]`);
    }
    const done = got[TYPE.en.text][1] + 0.25;
    if (Math.abs(done - CUES.title.t) > 0.03)
      console.warn(`[s15] CUES.title.t is ${CUES.title.t}, the plan completes the title at ${done.toFixed(2)}`);
  }

  const covTex = new THREE.DataTexture(type.cov, type.W, type.H, THREE.RedFormat, THREE.UnsignedByteType);
  covTex.flipY = false;
  covTex.generateMipmaps = true;
  covTex.minFilter = THREE.LinearMipmapLinearFilter;
  covTex.magFilter = THREE.LinearFilter;
  covTex.anisotropy = 8;
  covTex.needsUpdate = true;
  const revTex = new THREE.DataTexture(map.data, map.w, map.h, THREE.RGBAFormat, THREE.UnsignedByteType);
  revTex.minFilter = THREE.LinearFilter;
  revTex.magFilter = THREE.LinearFilter;
  revTex.needsUpdate = true;
  const lime = U.uLitCol.value;
  const plateU = {
    uCov: { value: covTex },
    uReveal: { value: revTex },
    uT: { value: 0 },
    uI: { value: GLYPH.intensity },
    uRise: { value: 0.45 },
    uCol: { value: lime.clone() },
  };
  // the canvas's rows run from the top: uv.y = 1 at the top of the plate is row 0
  const plateGeo = new THREE.PlaneGeometry(tw, th);
  const uvA = plateGeo.getAttribute('uv');
  for (let k = 0; k < uvA.count; k++) uvA.setY(k, 1 - uvA.getY(k));
  const plate = new THREE.Mesh(
    plateGeo,
    new THREE.ShaderMaterial({
      uniforms: plateU,
      vertexShader: PLATE_VERT,
      fragmentShader: PLATE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  plate.position.copy(centre);
  plate.quaternion.copy(camera.quaternion);
  plate.renderOrder = 21;
  scene.add(plate);

  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  quad.setAttribute('aS', new THREE.InstancedBufferAttribute(posA, 3));
  quad.setAttribute('aP1', new THREE.InstancedBufferAttribute(p1A, 3));
  quad.setAttribute('aP2', new THREE.InstancedBufferAttribute(p2A, 3));
  quad.setAttribute('aX', new THREE.InstancedBufferAttribute(xA, 3));
  quad.setAttribute('aT', new THREE.InstancedBufferAttribute(tA, 4));
  quad.setAttribute('aR', new THREE.InstancedBufferAttribute(rA, 4));
  quad.instanceCount = n;
  const emberU = {
    uT: { value: 0 },
    uDT: { value: 0 },
    uWander: { value: EMBER.wander },
    uMelt: { value: EMBER.melt },
    uI: { value: EMBER.intensity },
    uCol: { value: lime.clone() },
    uRes: { value: new THREE.Vector2(ctx.width, ctx.height) },
    uMinPx: { value: 1.6 },
    uMaxPx: { value: 160 },
    uFocusD: { value: TITLE.dist },
    uLensK: { value: 0 },
  };
  const embers = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({
      uniforms: emberU,
      vertexShader: EMBER_VERT,
      fragmentShader: EMBER_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  embers.frustumCulled = false;
  embers.renderOrder = 22;
  scene.add(embers);

  const motion = (i, T, sh, st) => {
    if (i === LEAVES) heroState(T, st);
    else {
      if (P.drop[i] || hide.has(i)) {
        st.visible = false;
        return;
      }
      const frozen = T >= P.tc[i];
      fall(i, (frozen ? P.tc[i] : T) + T_OFF, FIELD, st);
      if (frozen && P.lime[i]) st.lime = limeAt(T - P.tc[i]);
      const e = (st.y - LAMP) / Math.hypot(st.x, st.z);
      if (!frozen && (e > sh.fanUp + 0.05 || e < -sh.fanDn - 0.05)) st.visible = false;
    }
    const f = burning.get(i);
    if (f) {
      const b = (T - T0 - f.t) / f.dur;
      if (b >= 0.97) st.visible = false;
      else st.burn = Math.max(b, 0);
    }
  };

  const grade = (await ctx.load.json('/film/timeline.json')).grades.act2;
  const fstop = 4;
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      camAt(t, pos, target);
      setLens(camera, CAM.lens);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = 50 + t;
      const sh = sheetAt(T, T - 4);
      sh.windows = lerp(1, LOOK15.portholes, smoothstep(0.3, 1.5, t));
      sh.portsAway = [CAM.bearing, t < LOOK15.ports ? 0 : 30 * DEG];
      lh.set(sh);
      lh.update(camera);
      leaves.fill(LEAVES + 1, T, motion, sh);
      const focus = pos.distanceTo(centre);
      dust.update(camera, 50 + t, { focus, fstop, width: ctx.width, intensity: LOOK.dust });
      plateU.uT.value = t;
      emberU.uT.value = t;
      emberU.uDT.value = (meta.shutter ?? 0.5) / ctx.fps / Math.max(1, ctx.samples || 1);
      const fm = CAM.lens / 1000;
      emberU.uFocusD.value = focus;
      emberU.uLensK.value = ((fm / fstop) * fm * ctx.width) / 0.036;
      emberU.uMinPx.value = Math.max(1.2, (1.6 * ctx.width) / 1920);
      emberU.uMaxPx.value = (160 * ctx.width) / 1920;
    },
    post(t) {
      const f = LOOK15.flash * flashAt(T0 + t, CAM.bearing);
      if (f < 1e-4) return null;
      return {
        exposure: grade.exposure + FLASH.exposure * f,
        bloom: { strength: grade.bloom.strength + FLASH.bloom * f },
        halation: { strength: grade.halation.strength + FLASH.halation * f },
      };
    },
  };
}

// Sound cues, s into the shot (global frame = 1080 + 24 t).
export const CUES = {
  cut: { t: 0 }, // the punch-in lands on the first note of the lamplighter's motif
  // each page the sheet sets alight: when, and where across the frame (pan: −1 left, +1 right); the
  // first page the sheet found in s13 among them
  get ignite() {
    const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 600);
    const P = freezePlan(END + 0.05);
    const fire = firePlan(P, hiddenPages(P, titleFrame(cam)));
    const st = { q: new THREE.Quaternion() };
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    const v = new THREE.Vector3();
    return fire
      .map((f) => {
        if (f.i === LEAVES) heroState(T0, st);
        else fall(f.i, P.tc[f.i] + T_OFF, FIELD, st);
        camAt(f.t, pos, target);
        setLens(cam, CAM.lens);
        aim(cam, pos, target);
        v.set(st.x, st.y, st.z).project(cam);
        return { t: +f.t.toFixed(3), pan: +clamp(v.x, -1, 1).toFixed(2), first: f.i === LEAVES };
      })
      .sort((a, b) => a.t - b.t);
  },
  // when each character's points land (from the plan, which warns in setup if they drift)
  strokes: { 燃: [1.27, 2.3], 灯: [2.12, 2.8], 者: [2.53, 3.1], LAMPLIGHTER: [3.06, 3.42] },
  title: { t: 3.67 }, // the title complete: the last line's points down and their strokes lit (0.25 s)
  // the sheet crossing the camera: the lens flashes
  get flashes() {
    const out = [];
    for (let f = 0; f < meta.frames; f++) {
      const a = flashAt(T0 + f / 24, CAM.bearing);
      if (a > 0.5 && a >= flashAt(T0 + (f - 1) / 24, CAM.bearing) && a > flashAt(T0 + (f + 1) / 24, CAM.bearing)) out.push(+(f / 24).toFixed(3));
    }
    return out;
  },
};
