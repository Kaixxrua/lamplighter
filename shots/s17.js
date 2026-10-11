// s17 · 0:55–1:03 · 七条光河 (global 1320–1511)
// The seven sources. We cut out wide from the lens to the whole lighthouse, seen level and dead on from
// the gallery of its floor, the galleries of the shaft round it in one-point perspective. One after
// another on the first beat, seven rivers of pages pour over the balustrades of seven galleries and
// flow in to it, a star converging on the lantern: GitHub, lime, rising up the middle of the frame from
// the floor below and spreading round the deck in a ring; and three on each side, mirrored, each in a
// colour of its own, from above, level and from below, into a column of pools beside the lantern:
// papers (gold), launches (violet) and posts (silver) on the left, news (blue), threads (teal) and the
// hot lists (rose) on the right. The sheet turns on, a turn a bar, and takes in what it points at: on
// its first turn s13's frozen pages, then the left column at 4 s and the right at 6 s (at 2 s the right
// pools are still filling), and the ring once it has formed, from 6 s on, each page as the sheet comes
// round to its place. It crosses the camera at 3 s and 7 s (the lens flashes). A page taken flies in
// to the glass, swept a little along with the sheet, and burns into light as it gets there.
// First frame: the lighthouse in the middle of the frame, the sheet pointing left, s13's pages frozen
// in the air, grey and lime, GitHub's river starting below. Last frame: the seven rivers converging on
// the lantern, the lime ring round the deck, the frozen pages gone, the left column full again and the
// sheet coming round to it.
// Camera: on the bearing of the middle of a side of the shaft (90°), 15 → 12.8 m from the axis and
// 3.15 → 3.0 m above the deck, level and aimed at the axis at its own height, 16 mm, pushing in slowly.
// Light: the library's lamps turned low, in their own dim yellow (the night, the depth of the shaft
// still showing); the sheet; the pages, each lighting the air about it. The coloured rivers glow in
// their own colours and stay short of white: lime alone may burn out (the rivers alone on black, in
// the act's grade: nothing but lime within 5 of white).
// Sound: see CUES (s into the shot; global frame = 1320 + 24 t).
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH } from 'world/lighthouse.js';
import { Pages, fall, leafState } from 'world/pages.js';
import { Dust } from 'world/dust.js';
import { pageAtlas } from 'world/pageatlas.js';
import { SWEEP, sweepAngle, FIELD, T_OFF, LEAVES, freezePlan, limeAt, heroState, Y0, FLOOR } from './s13.js';
import { LOOK, sheetAt, flashAt, FLASH } from './s14.js';
import { takenPages } from './s15.js';

export const meta = {
  frames: 192,
  quality: { final: { samples: 8 } },
  post: { streak: { strength: 0.4, threshold: 20, tint: [0.85, 1.0, 0.55], length: 0.2, decay: 0.8 } },
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const T0 = 20; // the sweep's clock at this shot's first frame: the sheet points at 180°
const LAMP = Y0 + LH.LAMP_Y;

// Camera: level, on the bearing of the middle of a side, in the lighthouse's gallery, pushing in.
export const CAM = { bearing: 90 * DEG, r: [15, 12.8], h: [3.15, 3.0], lens: 16, fstop: 4 };
// The library's lamps, low (their own colour, the globes' dim yellow): night, the depth of the shaft
// still showing.
export const LOOK17 = { lamp: 0.25 };

// The seven sources, each pouring out of a gallery over its balustrade and gathering by the
// lighthouse until the sheet takes it in. Mirrored pairs about the camera's axis (bearing b ↔ 180° − b),
// three on each side: from above, level and from below, into a column of pools beside the lantern that
// the sheet takes on the beat it points there (left: 4 s, right: 6 s). GitHub on the axis, lime, rising
// from the floor below in front of the tower (via: radius, bearing, height above the deck) and round the
// deck in a ring (r: its radius; thick: its half-height) that the sheet combs as it turns once the
// pages have spread round it (from 6 s). from: bearing (°), floor (from the lighthouse's), height above
// that floor (m); to: bearing (°), height above the deck (m); open: when it starts (s), the seven on the
// first beat one after another.
export const RIVERS = [
  { name: 'github', from: [90, -1, 3.0], via: [[5.4, 90, -4.0], [4.2, 90, -2.8]], to: [90, 0.9], r: 4.2, ring: { thick: 0.15 }, designs: [5, 5, 10, 2], rate: 40, speed: 8, width: [1.0, 0.5], lime: 0.75, open: 0 },
  { name: 'launches', from: [150, 0, 2.6], to: [180, 2.6], designs: [9, 1], col: [0.62, 0.38, 1.0], open: 0.25 },
  { name: 'threads', from: [30, 0, 2.6], to: [0, 2.6], designs: [6], col: [0.2, 0.85, 0.75], open: 0.25 },
  { name: 'papers', from: [160, 1, 2.5], to: [180, 6.0], designs: [0, 1, 8], col: [1.0, 0.6, 0.16], open: 0.5 },
  { name: 'news', from: [20, 1, 2.5], to: [0, 6.0], designs: [4, 3], col: [0.35, 0.55, 1.0], open: 0.5 },
  { name: 'posts', from: [160, -1, 3.0], to: [180, -1.2], designs: [6, 3], col: [0.78, 0.84, 1.0], open: 0.75 },
  { name: 'hot', from: [20, -1, 3.0], to: [0, -1.2], designs: [10, 3], col: [1.0, 0.32, 0.62], open: 0.75 },
];
const FLOW = {
  rate: 40, // pages a second, unless the river says
  speed: 7, // m/s
  out: 0.4, // s for a page to leave its shelf
  width: [1.2, 0.6], // the river's half-width at the source and at the pool (m)
  glow: 0.25, // the coloured rivers' own light (the act's grade lifts it 2.3×: more washes them out to white)
  paper: [0.3, 0.22], // the coloured rivers' paper: its colour times these (new, old)
  halo: { r: 0.6, light: 0.035, lime: 0.08 }, // the air each page lights: radius (m), its light
  mouthR: 4.6, // the pools wait this far from the axis, outside the deck's rail
  pool: [0.15, 1.0], // how far past the mouth a page drifts while it waits (m)
  wait: 0.5, // s to 1/e as it settles there
};
// into the glass: where (radius, the glass's height above the deck), how long (s, and s per m), the
// sweep along with the sheet (share of the flight), the share of it burning into light, the height a
// page from below the rail rises to on its way (above the deck), and how far out a page from below the
// deck swings first, past where it waited (m)
const IN = { r: LH.GLASS_R + 0.1, y: [LH.SILL + 0.3, LH.HEAD - 0.3], dur: [0.35, 0.07], swirl: 0.25, end: 0.35, over: 1.7, out: 0.6 };

const bearingOf = (x, z) => Math.atan2(z, x);
const wrap = (a) => ((a % TAU) + TAU) % TAU;
// the next time (s into the shot) at or after t that the sheet points at bearing b
function passAt(b, t) {
  const th = sweepAngle(T0 + t);
  return t + wrap(b - th) / SWEEP.omega;
}

// the shelves' face and the balustrade along bearing b (the shaft and the walls are hexagons)
const apothemAt = (a, b) => a / Math.cos((((b % (60 * DEG)) + 60 * DEG) % (60 * DEG)) - 30 * DEG);

function riverCurve(R) {
  const [bf, floor, h] = R.from;
  const b = bf * DEG;
  const m = R.to[0] * DEG;
  const y = Y0 + floor * LIB.H + h;
  const ym = Y0 + R.to[1];
  const rm = R.r ?? FLOW.mouthR;
  const rs = apothemAt(LIB.AS, b);
  const at = (r, a, yy) => new THREE.Vector3(Math.cos(a) * r, yy, Math.sin(a) * r);
  const pts = [
    at(apothemAt(LIB.AW, b) - 0.7, b, y), // off the shelves
    at(rs + 0.6, b, y + 0.15), // over the balustrade
    at(rs - 1.2, b, y + 0.1),
    ...(R.via
      ? R.via.map(([r, bb, hh]) => at(r, bb * DEG, Y0 + hh))
      : [at(lerp(rs - 1.2, rm, 0.5), lerp(b, m, 0.55), lerp(y, ym, 0.5))]),
    at(rm, m, ym), // the pool
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 400;
  return { curve, L: curve.getLength(), m, rm, inward: new THREE.Vector3(-Math.cos(m), 0, -Math.sin(m)) };
}

// ------------------------------------------------------------------------------------- page motion

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n1 = new THREE.Vector3();
const _n2 = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _q = new THREE.Quaternion();

// A page flying from P0 into the lantern's glass on bearing b, from t0 for dur seconds: accelerating,
// swept a little along with the sheet, and burning into light as it reaches the glass.
function flyIn(P0, b, t0, dur, t, st, seed) {
  const u = clamp((t - t0) / dur, 0, 1);
  if (u >= 1) {
    st.visible = false;
    return;
  }
  const E = _v.set(Math.cos(b) * IN.r, clamp(P0.y, Y0 + IN.y[0], Y0 + IN.y[1]), Math.sin(b) * IN.r);
  const d = P0.distanceTo(E);
  const tang = _t.set(-Math.sin(b), 0, Math.cos(b)).multiplyScalar(IN.swirl * d);
  const C = _n1.copy(P0).add(E).multiplyScalar(0.5).add(tang);
  if (P0.y < Y0 + IN.over) {
    C.y = Math.max(C.y, 2 * (Y0 + IN.over) - 0.5 * (P0.y + E.y)); // over the rail
    if (P0.y < Y0) {
      // from below the deck: up outside its edge first
      const k = Math.max(1, (Math.hypot(P0.x, P0.z) + IN.out) / Math.hypot(C.x, C.z));
      C.x *= k;
      C.z *= k;
    }
  } else if (P0.y > Y0 + LH.HEAD) C.y = Math.min(C.y, E.y); // down outside the roof, in under its cornice
  const s = u * u;
  const a = (1 - s) * (1 - s), m = 2 * s * (1 - s), c = s * s;
  st.x = a * P0.x + m * C.x + c * E.x;
  st.y = a * P0.y + m * C.y + c * E.y;
  st.z = a * P0.z + m * C.z + c * E.z;
  st.burn = smoothstep(1 - IN.end, 1, s) * 0.95;
  _ax.set(hash(seed, 3) - 0.5, hash(seed, 4) - 0.5, hash(seed, 5) - 0.5).normalize();
  st.q.multiply(_q.setFromAxisAngle(_ax, 5 * s));
}
const flyDur = (d) => IN.dur[0] + IN.dur[1] * d;

// Where page k of river j is at time t (into out): out of the shelves, along the river, into the pool
// at the mouth or round the ring to its place. Returns null if it has not left its shelf yet, else when
// it reaches the mouth (ta), how far along it is (s of L), its bearing (b), on the ring its place and
// when it is nearly there (settle); the river's frame there is left in _t, _n1, _n2.
function riverPos(R, j, k, t, out) {
  const h = (n) => hash(k, 900 + j, n);
  const e = R.open + (k + 0.8 * h(1)) / (R.rate ?? FLOW.rate);
  const tau = t - e;
  if (tau < 0) return null;
  const v = (R.speed ?? FLOW.speed) * lerp(0.85, 1.15, h(2));
  const s0 = 0.5 * v * FLOW.out;
  const s = tau < FLOW.out ? (0.5 * v * tau * tau) / FLOW.out : s0 + v * (tau - FLOW.out);
  const { curve, L, inward } = R.path;
  const sAt = Math.min(s, L);
  curve.getPointAt(sAt / L, _v);
  curve.getTangentAt(sAt / L, _t);
  // across the river: about the vertical, or about the radius where the river climbs
  const ty = _t.y * _t.y;
  _n2.set(Math.cos(R.path.m) * ty, 1 - ty, Math.sin(R.path.m) * ty);
  _n1.crossVectors(_t, _n2).normalize();
  _n2.crossVectors(_n1, _t).normalize();
  const W = R.width ?? FLOW.width;
  const w = lerp(W[0], W[1], sAt / L) * Math.sqrt(h(3));
  const phi = h(4) * TAU;
  const grow = smoothstep(0, FLOW.out, tau);
  const o1 = w * Math.cos(phi) * lerp(0.35, 1, grow);
  const o2 = w * Math.sin(phi) * 0.6 * lerp(0.35, 1, grow);
  const ph = h(5) * TAU + lerp(2.5, 4.5, h(6)) * t; // flutter
  const ta = e + FLOW.out + (L - s0) / v;
  if (R.ring && s >= L) {
    // round the deck to its place on the ring (up to half way round either side), slowing as it comes
    const r = R.path.rm;
    const A = r * Math.PI * h(23);
    const sg = h(24) < 0.5 ? -1 : 1;
    const a = A > 1e-3 ? A * (1 - Math.exp(-(v * (t - ta)) / A)) : 0;
    const b = R.path.m + (sg * a) / r - (o1 + 0.12 * Math.sin(ph)) / r;
    const rr = r + o2;
    out.set(Math.cos(b) * rr, _v.y + (h(25) - 0.5) * 2 * R.ring.thick + 0.1 * Math.cos(ph * 0.9), Math.sin(b) * rr);
    return { ta, grow, ph, s, L, b, place: R.path.m + (sg * A) / r, settle: ta + (2.3 * A) / v };
  }
  out.set(
    _v.x + _n1.x * (o1 + 0.12 * Math.sin(ph)) + _n2.x * o2,
    _v.y + _n1.y * o1 + _n2.y * o2 + 0.1 * Math.cos(ph * 0.9),
    _v.z + _n1.z * (o1 + 0.12 * Math.sin(ph)) + _n2.z * o2,
  );
  if (s >= L) out.addScaledVector(inward, lerp(FLOW.pool[0], FLOW.pool[1], h(7)) * (1 - Math.exp(-(t - ta) / FLOW.wait)));
  return { ta, grow, ph, s, L, b: R.path.m };
}

const _p = new THREE.Vector3();
const _p0 = new THREE.Vector3();
const _X = new THREE.Vector3();
const _N = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
// a leaf gliding along the river: its long side with the flow, banked about it by `bank`
function glide(T, n1, n2, bank, q) {
  _N.copy(n2).multiplyScalar(Math.cos(bank)).addScaledVector(n1, Math.sin(bank));
  _X.crossVectors(T, _N);
  return q.setFromRotationMatrix(_m4.makeBasis(_X, T, _N));
}
// When the sheet takes page k of river j in (at: riverPos's account of it): a pool on the sheet's
// next pass after the page gets there, the ring on its first pass once the page is nearly at its place.
function takeAt(R, j, k, at) {
  const h22 = hash(k, 900 + j, 22);
  return R.ring ? passAt(at.place, Math.max(at.settle, at.ta)) + 0.05 * h22 : passAt(at.b, at.ta) + 0.1 * h22;
}
// Page k of river j at t: along the river, waiting, and in with the sheet when it comes (takeAt).
function riverPage(R, j, k, t, st) {
  const at = riverPos(R, j, k, t, _p);
  if (!at) {
    st.visible = false;
    return;
  }
  const h = (n) => hash(k, 900 + j, n);
  st.x = _p.x;
  st.y = _p.y;
  st.z = _p.z;
  // gliding with the flow (riverPos left the river's frame in _t, _n1, _n2), tumbling slowly once it waits
  glide(_t, _n1, _n2, (h(26) - 0.5) * Math.PI + 0.45 * Math.sin(at.ph * 0.7), _qa);
  _ax.set(h(8) - 0.5, h(9) - 0.5, h(10) - 0.5).normalize();
  _qb.setFromAxisAngle(_ax, h(11) * TAU + lerp(0.6, 1.8, h(12)) * t * (h(13) < 0.5 ? -1 : 1));
  st.q.slerpQuaternions(_qa, _qb, at.s >= at.L ? smoothstep(0, 1.2, t - at.ta) : 0);
  st.scale = lerp(0.9, 1.1, h(14)) * lerp(0.6, 1, at.grow);
  st.bend = (h(15) - 0.5) * 3.0 + 1.0 * Math.sin(at.ph + 1.3);
  st.twist = (h(16) - 0.5) * 5.0;
  st.curl = (h(17) - 0.5) * 2.0;
  st.ripple = lerp(0.01, 0.03, h(18));
  st.phase = h(19) * TAU + 9 * t;
  st.design = R.designs[Math.floor(h(20) * R.designs.length)];
  st.seed = h(21);
  if (R.col) st.glow = FLOW.glow;
  else st.lime = R.lime;
  if (at.s >= at.L) {
    const th = takeAt(R, j, k, at);
    if (t >= th) {
      const b = riverPos(R, j, k, th, _p0).b; // where it waited when the sheet came
      flyIn(_p0, b, th, flyDur(_p0.distanceTo(_p.set(Math.cos(b) * IN.r, _p0.y, Math.sin(b) * IN.r))), t, st, k * 7 + j);
    }
  }
}

// s13's pages, frozen where the sheet found them, less those s14–s16 took: leaf → where it hangs, its
// shape, whether it is lime and since when, and when (t, s into the shot) and on what bearing (b) the
// sheet takes it in, on its first turn.
function frozenField() {
  const P = freezePlan(T0 + 0.05);
  const taken = takenPages();
  const st = leafState();
  const out = new Map();
  for (let i = 0; i <= LEAVES; i++) {
    if (taken.has(i)) continue;
    if (i === LEAVES) heroState(T0, st);
    else {
      if (P.drop[i] || !(P.tc[i] <= T0)) continue;
      fall(i, P.tc[i] + T_OFF, FIELD, st);
    }
    const b = bearingOf(st.x, st.z);
    out.set(i, { pos: new THREE.Vector3(st.x, st.y, st.z), q: st.q.clone(), shape: [st.bend, st.twist, st.curl, st.ripple, st.phase, st.design, st.seed, st.scale], tc: i === LEAVES ? 0 : P.tc[i], lime: i === LEAVES || P.lime[i], t: passAt(b, 0) + 0.06 * hash(i, 41), b });
  }
  return out;
}

// the camera's distance from the axis and height above the deck at t: one push over a span wider than
// the shot, so nearly even
const camU = (t) => smoothstep(-2, meta.frames / 24 + 2, t);
const camR = (t) => lerp(CAM.r[0], CAM.r[1], camU(t));
const camH = (t) => lerp(CAM.h[0], CAM.h[1], camU(t));
// where a point is across the picture at t, −1 at the left edge to 1 at the right (the camera looks
// along −z from the bearing of +z)
const screenX = (p, t) => clamp(p.x / ((camR(t) - p.z) * (18 / CAM.lens)), -1, 1);

// Every page the sheet takes in during the shot: its source, when the sheet takes it (t), when it is
// in, burnt into light at the glass, and where it was in the picture when taken.
function takes() {
  const out = [];
  const end = meta.frames / 24;
  const add = (src, P0, b, t) => {
    const dur = flyDur(P0.distanceTo(_v.set(Math.cos(b) * IN.r, P0.y, Math.sin(b) * IN.r)));
    if (t < end) out.push({ src, t, in: t + dur, x: screenX(P0, t) });
  };
  for (const f of frozenField().values()) add('field', f.pos, f.b, f.t);
  RIVERS.forEach((R, j) => {
    R.path ??= riverCurve(R);
    const n = Math.ceil((R.rate ?? FLOW.rate) * (end - R.open + 0.5));
    for (let k = 0; k < n; k++) {
      const th = takeAt(R, j, k, riverPos(R, j, k, 1e3, _p));
      if (th >= end) continue;
      const b = riverPos(R, j, k, th, _p0).b;
      add(R.name, _p0.clone(), b, th);
    }
  });
  return out;
}

// The takes in batches, one per source per beat: when the sheet takes the first and the last page
// in, when the first and the last are in, how many, and where in the picture (x, first and last).
function takeBatches() {
  const groups = new Map();
  for (const e of takes()) {
    const key = `${e.src}@${Math.floor(e.t)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const r2 = (v) => +v.toFixed(2);
  return [...groups.values()]
    .map((g) => {
      g.sort((a, b) => a.t - b.t);
      const a = g[0];
      const z = g[g.length - 1];
      const ins = g.map((e) => e.in);
      return { src: a.src, t: [r2(a.t), r2(z.t)], in: [r2(Math.min(...ins)), r2(Math.max(...ins))], n: g.length, x: [r2(a.x), r2(z.x)] };
    })
    .sort((p, q) => p.t[0] - q.t[0]);
}

// ------------------------------------------------------------------------------------------- halo

// The air about each page of a river, lit by it: a soft disc of light a fixed size in the world, added
// over whatever is behind it, so a river reads as a stream of light and its pool as a glow.
const HALO_VERT = /* glsl */ `
attribute float aI;
uniform float uPx, uR, uMaxPx, uFogD;
varying float vI;
void main(){
  vec4 mv = modelViewMatrix*vec4(position, 1.0);
  float d = max(-mv.z, 0.1);
  vI = aI*exp(-uFogD*d);
  gl_PointSize = clamp(2.0*uR*uPx/d, 1.0, uMaxPx);
  gl_Position = projectionMatrix*mv;
}`;
const HALO_FRAG = /* glsl */ `
uniform vec3 uCol;
varying float vI;
void main(){
  vec2 q = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0 || vI <= 0.0) discard;
  gl_FragColor = vec4(uCol*(vI*(exp(-r2*4.0) - 0.0183)), 1.0);
}`;

class Halo {
  constructor(n, col, { r, light, fogD }) {
    this.pos = new Float32Array(n * 3);
    this.I = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aI', new THREE.BufferAttribute(this.I, 1));
    this.uniforms = {
      uPx: { value: 1 },
      uR: { value: r },
      uMaxPx: { value: 1024 },
      uFogD: { value: fogD },
      uCol: { value: new THREE.Color(...col).multiplyScalar(light) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 19;
  }
  set(i, st) {
    this.pos[i * 3] = st.x;
    this.pos[i * 3 + 1] = st.y;
    this.pos[i * 3 + 2] = st.z;
    this.I[i] = st.visible ? 1 - st.burn : 0;
  }
  commit(n, camera, height) {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aI.needsUpdate = true;
    this.geo.setDrawRange(0, n);
    this.uniforms.uPx.value = (camera.projectionMatrix.elements[5] * height) / 2;
  }
}

// ------------------------------------------------------------------------------------------ setup

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 900);
  const lib = new Library({ floors: [FLOOR - 10, FLOOR + 12], near: 2, mid: 12, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  // s13's pages, frozen where the sheet found them: the first turn takes them in
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES + 1 });
  scene.add(leaves.mesh);
  const frozen = frozenField();
  const fieldMotion = (i, t, _o, st) => {
    const f = frozen.get(i);
    if (!f) {
      st.visible = false;
      return;
    }
    st.x = f.pos.x;
    st.y = f.pos.y;
    st.z = f.pos.z;
    st.q.copy(f.q);
    [st.bend, st.twist, st.curl, st.ripple, st.phase, st.design, st.seed, st.scale] = f.shape;
    if (f.lime) st.lime = i === LEAVES ? limeAt(T0 + t) : limeAt(T0 + t - f.tc);
    if (t >= f.t) flyIn(f.pos, f.b, f.t, flyDur(f.pos.distanceTo(_v.set(Math.cos(f.b) * IN.r, f.pos.y, Math.sin(f.b) * IN.r))), t, st, i);
  };

  const rivers = RIVERS.map((R, j) => {
    R.path = riverCurve(R);
    const n = Math.ceil((R.rate ?? FLOW.rate) * (meta.frames / 24 - R.open + 0.5));
    const pages = new Pages({ uniforms: U, atlas, count: n });
    if (R.col) {
      // coloured paper, lit from within: its own light, not the lamps', carries the colour
      pages.uniforms.uGlowCol.value.setRGB(...R.col);
      pages.uniforms.uPaper.value.setRGB(...R.col).multiplyScalar(FLOW.paper[0]);
      pages.uniforms.uPaperOld.value.setRGB(...R.col).multiplyScalar(FLOW.paper[1]);
    }
    pages.mesh.userData.river = R.name;
    scene.add(pages.mesh);
    const halo = new Halo(n, R.col ?? U.uLitCol.value.toArray(), { r: FLOW.halo.r, light: R.col ? FLOW.halo.light : FLOW.halo.lime, fogD: U.uFogD.value });
    halo.points.userData.river = R.name;
    scene.add(halo.points);
    return { R, j, n, pages, halo };
  });

  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 14 });
  scene.add(dust.points);

  const grade = (await ctx.load.json('/film/timeline.json')).grades.act2;
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      const r = camR(t);
      const y = Y0 + camH(t);
      pos.set(Math.cos(CAM.bearing) * r, y, Math.sin(CAM.bearing) * r);
      target.set(0, y, 0);
      setLens(camera, CAM.lens);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = 62 + t;
      const sh = sheetAt(T, T - 4);
      lh.set(sh);
      lh.update(camera);
      leaves.fill(LEAVES + 1, t, fieldMotion, null);
      for (const { R, j, n, pages, halo } of rivers) {
        pages.fill(n, t, (k, tt, _o, st) => riverPage(R, j, k, tt, st), null, (k, st) => halo.set(k, st));
        halo.commit(n, camera, ctx.height);
      }
      dust.update(camera, 62 + t, { focus: r, fstop: CAM.fstop, width: ctx.width, intensity: LOOK.dust });
    },
    post(t) {
      const f = flashAt(T0 + t, CAM.bearing);
      const dof = { focus: focusDistance(camera, target.set(0, LAMP, 0)), fstop: CAM.fstop };
      if (f < 1e-4) return { dof };
      return {
        dof,
        exposure: grade.exposure + FLASH.exposure * f,
        bloom: { strength: grade.bloom.strength + FLASH.bloom * f },
        halation: { strength: grade.halation.strength + FLASH.halation * f },
      };
    },
  };
}

// ------------------------------------------------------------------------------------------- cues

export const CUES = {
  cut: { t: 0 }, // out wide from the lens, on the beat (global 1320)
  pings: [0, 1, 2, 3, 4, 5, 6, 7], // the radar's ping goes on, a beat a second (global 1320 + 24 k)
  // the rivers start one after another on the first beat, GitHub first: the organ's arpeggio
  opens: Object.fromEntries(RIVERS.map((R) => [R.name, R.open])),
  // the sheet crosses the camera, the lens flashes
  flashes: [0, 1].map((k) => +(passAt(CAM.bearing, 0) + (k * TAU) / SWEEP.omega).toFixed(2)),
  // the sheet taking pages in, a celesta note a page (score §3): a batch per source per beat (see
  // takeBatches): s13's frozen pages on the first turn, the left column at 4 s, the right at 6 s, the
  // ring from 6 s on
  get takes() {
    return takeBatches();
  },
};
