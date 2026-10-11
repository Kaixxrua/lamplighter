// s29 · 1:47–1:55 · 读者·私人书架 (global 2568–2759)
// The letters come home: the readers on the galleries light their lamps one after another, and a crane
// comes down to each. s28's last frame goes on (no sound at the cut): looking up the shaft at the five
// streams, their words in lime beside them, which go out within the first second (WORDS). The readers
// are their lamps (no figures, no blue): 186 cases on the rails of floors 2–24, one to three to a side,
// each with an amber desk lamp behind its glass. From beat 9 the lamps come on, the widest in the picture
// on each half-beat 9–11 and the rest while they cross it, rather late than early: the far rings up the
// shaft first, then the galleries the camera tilts down past (131 come on in the picture by 2.8 s, all
// 186 by 4.6 s), and the reader's own last, on beat 12 (2.99 s).
// A crane leaves the flock for each case once its lamp is on and lands on its top (a cubic from its place
// and velocity in the flock; the crane and the moment paired in setup, letters()); eight land in the
// picture, 1.70–3.54 s, the last two on the cases either side of the reader's own. The camera, from s28's
// (its place and velocity), climbs 8.2 m and goes out 8 m to the rail of side 4 three floors above the
// lighthouse's, tilting down from 84° to level as it comes (22 → 40 mm); the hero crane flies on ahead of
// it and lands on the reader's case on beat 14 (4.67 s), coming in along the rail from the left. The
// camera comes in under it to the glass (half the picture's width at 5.83 s) and the shelf behind it:
// s19's ten passed repos, new cloth volumes lettered `owner/repo ★ 2,431`, each shelved on its beat (14½,
// 15, 15½, 16, then every quarter to 17½; a flute note each): a lime edge runs round its spine in 0.3 s
// and stays, fainter, while its own warm light rises in the cloth and the title.
// The light: s28's at its end, carried on (the act's grade; the exposure up as the camera tilts down out
// of the light, and 0.5 EV less while it sweeps past the lit galleries: DIP); the readers' lamps held
// amber as the exposure moves (× 2^(RLAMP.ev − EV)), never yellow-white, and the desk lamp's bulb, shade
// and brass no brighter than its amber (uLit). Only the lime may clip. The readers' cases, which s28's
// shaft does not have, come in over the first 0.9 s (CASES_IN), as the first of their lamps come on.
//
// First frame (s28's last goes on, 1/24 s later; for the cut): from 14.8 m above the lighthouse's floor
// and 3.1 m off the axis, looking up the shaft 6° off the vertical (22 mm, 79° across, f/11), the five
// streams and their words as s28 leaves them, the hero at (0.51, 0.75). Brightness (1920 still, Rec.709
// luma 0–255): mean 80.4, median 64.4; by thirds top 90.1, middle 81.8, bottom 69.3; mean RGB (104, 77,
// 44); 1.03 % clipped (s28's last frame: 80.6 and 64.6, the thirds within 0.5, the same colour). PSNR
// between the two 29.1 dB at 1920 and 32.9 dB scaled to 240 wide: the flock's and the camera's 1/24 s,
// as between two frames of s28's own (on the 960 previews, s28 f190 → f191 29.4 dB, this cut 29.1 dB).
//
// Last frame: the reader's glass shelf, close and warm. Level, 0.88 m from the glass and 1.00 m from the
// spines (40 mm, 48.5° across, f/4): the ten spines across the middle (0.35–0.77 of the width, their
// titles reading down them), the desk lamp lit on the left (0.18), the case's sides and boards framing
// them, the crane on its top above the picture. Brightness (1920 still): mean 49.3, median 41.6; by
// thirds top 39.3, middle 61.4, bottom 47.1; mean RGB (74, 45, 15); 0.01 % clipped (the first title's
// cream ink; the lamp's amber at most (227, 153, 43), never white; no lime clipped). For s30's hard cut
// to cold steel: warm and mid-dark, not near black (half the picture above 41.6), so that s30, darker and
// colder, cuts to another night rather than out of a black frame.
//
// Checks (setup, console.warn on any miss): the CUES against the scene (cuesGot(): the lamps' half-beats,
// span and count in the picture, the letters landing in it, the landing, the glass's half width, the
// books' beats; numbers within 0.03). Off-line (node, the same exported functions): all 186 readers have
// their crane, none perched in the camera's way or the hero's; a letter's top speed at most 1.9 × its own
// in the flock (p90 1.21), its heading turning at most 594°/s (p90 355°/s). Flashes (engine/tools/
// flashcheck.mjs on the 960 preview, alone and after s28's and before s30's): at 200, 300 and 500 cd/m²
// no frame has a quarter of the picture in transition (s29's at most 12.0, 15.4 and 19.7 %, at f36–38,
// the tilt past the galleries under DIP), nor in the 2.39 band at 500 (20.8 %); the cut to s30 13.2 % at
// 200; no red flash. Per frame (YAVG, 960): 84.9 at the first frame, 38.0 at f152 and 58.4 at the last,
// at most 2.2 a frame; across the cut from s28 −0.16.
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { loadFonts } from 'film/lib/text.js';
import { LIB_COMMON, LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';
import { Dust } from 'world/dust.js';
import { Builder } from 'world/geo.js';
import { pageCanvas, trayMark, letterMeshes } from 'world/d_letter.js';
import { HeroCrane, Flock, Labels, labelAtlas, limeLights, craneMatrix, CHANNELS, CREASE } from 'world/d_crane.js';
import { CASE, caseMatrix, buildCaseShell, LAMP, lampPoint, buildDeskLamp, deskLampMaterial, SpineLight, GlassFront, Readers, Lining, LampGlows } from 'world/d_reader.js';
import { BookShelf, layoutShelf, bookLabels, book, BIND } from 'world/bookshelf.js';
import { Y0, FLOOR } from './s13.js';
import { LOOK } from './s14.js';
import { RIVERS } from './s17.js';
import { LOOK18 } from './s18.js';
import { PASSED } from './s19.js';
import { LOOK27, BELLS, LINE, lampAt, sheetState } from './s27.js';
import { TAKEOFF, WING, FLY, stroke, heroAt, camAt as cam28, flockSeeds, flockAt, flockPose, FLOCK, labelAt, beatAt, LOOK28 } from './s28.js';

export const meta = {
  frames: 192,
  quality: { final: { samples: 8 } },
};

const DEG = Math.PI / 180;
const END = meta.frames / 24;
const LIME = [0.686, 0.879, 0.07]; // #D8F14B
const AMBER = [0.807, 0.366, 0.047]; // #E8A33D: the readers' lamps
const S27 = 6; // s27's clock at s28's first frame
const T28 = 8; // s28's clock at this shot's first frame (the frame after its last)
const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
// the music's beat φ of G's Span (s28 → s30, as s28's beatAt), in this shot's seconds
export const beat = (phi) => beatAt(phi) - T28;

// a monotone C1 curve through keys (Fritsch–Carlson), flat at the ends (as s27's and s28's)
function curve(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const d = (j) => (keys[j + 1][1] - keys[j][1]) / (keys[j + 1][0] - keys[j][0]);
  const m = (j) => {
    if (j === 0 || j === n - 1) return 0;
    const a = d(j - 1);
    const b = d(j);
    if (a * b <= 0) return 0;
    const h0 = keys[j][0] - keys[j - 1][0];
    const h1 = keys[j + 1][0] - keys[j][0];
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b);
  };
  const [t0, v0] = keys[i];
  const [t1, v1] = keys[i + 1];
  const h = t1 - t0;
  const u = (t - t0) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m(i + 1);
}

// The C2 cubic through (ts, ys) with the given slopes at its ends: its slopes at every knot
function clamped(ts, ys, m0, m1) {
  const n = ts.length;
  const m = new Array(n).fill(0);
  m[0] = m0;
  m[n - 1] = m1;
  const k = n - 2;
  if (k <= 0) return m;
  const a = [];
  const b = [];
  const c = [];
  const d = [];
  for (let i = 1; i <= k; i++) {
    const h0 = ts[i] - ts[i - 1];
    const h1 = ts[i + 1] - ts[i];
    a.push(1 / h0);
    b.push(2 / h0 + 2 / h1);
    c.push(1 / h1);
    d.push((3 * (ys[i] - ys[i - 1])) / (h0 * h0) + (3 * (ys[i + 1] - ys[i])) / (h1 * h1));
  }
  d[0] -= a[0] * m0;
  d[k - 1] -= c[k - 1] * m1;
  for (let i = 1; i < k; i++) {
    const w = a[i] / b[i - 1];
    b[i] -= w * c[i - 1];
    d[i] -= w * d[i - 1];
  }
  m[k] = d[k - 1] / b[k - 1];
  for (let i = k - 2; i >= 0; i--) m[i + 1] = (d[i] - c[i] * m[i + 2]) / b[i];
  return m;
}
// value (or slope, d = 1) at t of the cubic Hermite through knots ts, values ys, slopes ms
function hermite(ts, ys, ms, t, d = 0) {
  const n = ts.length;
  const tc = clamp(t, ts[0], ts[n - 1]);
  let i = 0;
  while (i < n - 2 && tc > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i];
  const u = (tc - ts[i]) / h;
  if (d) {
    const v = ((6 * u * u - 6 * u) * ys[i] + (3 * u * u - 4 * u + 1) * h * ms[i] + (-6 * u * u + 6 * u) * ys[i + 1] + (3 * u * u - 2 * u) * h * ms[i + 1]) / h;
    return t < ts[0] ? ms[0] : t > ts[n - 1] ? ms[n - 1] : v;
  }
  const u2 = u * u;
  const u3 = u2 * u;
  const v = (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * ms[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * ms[i + 1];
  if (t < ts[0]) return v + (t - ts[0]) * ms[0];
  if (t > ts[n - 1]) return v + (t - ts[n - 1]) * ms[n - 1];
  return v;
}

// ------------------------------------------------------------------------------------------- the reader

// The reader the camera comes to: a case on side 4's rail (it faces +z), HERO.a m along it, on the floor
// HERO.k above the lighthouse's; floor-relative (y from the lighthouse's floor), as s28's.
export const HERO = { side: 4, k: 3, a: 0 };
export const CASE_M = caseMatrix(HERO.side, HERO.a, HERO.k * LIB.H);
// a point in the case's frame → floor-relative world
export const inCase = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(CASE_M);

// The reader's shelf (case frame): s19's PASSED, ottervale first and the rest by their stars, each a new
// cloth volume lettered as s08 letters its new ones (mono 500, tracking 0.02, size 0.46), reading
// `owner/repo ★ 2,431`; warm dark cloths, wider for more stars, standing on the bottom board right of the
// desk lamp, their spines 0.12 m behind the glass.
const NEW = { fam: 'mono', weight: 500, tracking: 0.02, size: 0.46 };
const CLOTH29 = [
  [0.11, 0.028, 0.022], // oxblood: ottervale
  [0.06, 0.035, 0.02],
  [0.025, 0.045, 0.03],
  [0.13, 0.1, 0.06],
  [0.075, 0.024, 0.03],
  [0.03, 0.03, 0.032],
  [0.12, 0.075, 0.03],
  [0.06, 0.06, 0.028],
  [0.09, 0.045, 0.025],
  [0.05, 0.022, 0.018],
];
export const SPINE_Z = -0.12;
export const BOOKS = (() => {
  const s0 = Math.log(667);
  const s1 = Math.log(9412);
  let x = -0.135;
  return PASSED.map((r, i) => {
    const w = 0.03 + 0.016 * clamp((Math.log(r.stars) - s0) / (s1 - s0), 0, 1);
    const h = [0.4, 0.385, 0.415, 0.395, 0.38, 0.405, 0.39, 0.42, 0.385, 0.4][i];
    x += w / 2;
    const b = book({ bind: BIND.CLOTH, x, z: SPINE_Z, w, h, d: 0.25, col: CLOTH29[i], seed: 0.13 + 0.07 * i, wear: 0.08, dust: 0, bands: 0, ink: 1, print: 1, strip: i });
    x += w / 2 + 0.0016;
    return b;
  });
})();
export const STRIPS29 = PASSED.map((r) => ({ text: `${r.owner}/${r.repo} ★ ${r.stars.toLocaleString('en-US')}`, ...NEW }));

// The reader's light. The desk lamp comes on at beat 12; each book is shelved on its beat (the quarter
// beats quicken toward the cut): the lime edge runs round its spine in 0.3 s (s19's pass) and stays,
// fainter, while its own warm light rises in the cloth and the title, a breath of lime in it at first.
export const LAMP_ON = beat(12);
export const BOOK_T = [14.5, 15, 15.5, 16, 16.25, 16.5, 16.75, 17, 17.25, 17.5].map(beat);
export const WORDS = [0.1, 1.0]; // s: s28's words go out over these, within the first second
// The exposure over the act's grade: s28's at its end, carried on (up as the camera tilts down out of the
// light), and DIP.ev less while the camera tilts down past the lit galleries: down over DIP.t[0..1], back
// over DIP.t[2..3] (s), as s28's dip and for its reason (without it their rails and lamps sweeping through
// the picture make a quarter of the 2.39 band or more swing by 20 cd/m² on 1.2–1.75 s on a 500 cd/m²
// screen: 26.1 % at most, flashcheck). The lamps are held (× 2^(RLAMP.ev − EV)): only the room dims.
export const DIP = { ev: -0.5, t: [0.15, 0.75, 2.3, 3.5] };
export const evAt = (t, el) =>
  lerp(...LOOK28.ev, smoothstep(...LOOK28.evEl, el)) + DIP.ev * (smoothstep(DIP.t[0], DIP.t[1], t) - smoothstep(DIP.t[2], DIP.t[3], t));
// (lit: its bulb and the brightest of its shade's enamel, × amber at RLAMP.ev, held as the exposure rises)
export const DESK = { col: [1.0, 0.64, 0.32], I: 0.1, warm: 0.25, lit: 2.2 };
export const OWN = {
  glow: 0.03, // a book's cloth in its own light
  title: 0.12, // its title
  breath: 0.05, // the lime in it as it is shelved (decays in 0.2 s)
  edge: 0.35, // the lime edge's light once it has run round (× edgeI)
  edgeI: 0.5,
  seeds: 0.04, // the glass's seeds in the lamp's light
  refl: 3, // the glass's reflection
  fill: [0.024, 0.0045], // the light about the case's inside: the lamp's, each lit book's
  fillCol: [1.0, 0.72, 0.45],
  lining: [0.8, 0.5], // the case's back: the lamp's spill on it, the light about the case on it
};
export function bookState(i, t, out = {}) {
  const tau = t - BOOK_T[i];
  out.run = tau > -0.02 ? 1 - (1 - clamp((tau + 0.02) / 0.3, 0, 1)) ** 3 : 0;
  out.edge = out.run > 0 ? 1 - (1 - OWN.edge) * smoothstep(0.3, 1.2, tau) : 0;
  out.own = OWN.glow * smoothstep(0, 0.6, tau);
  out.breath = tau > 0 ? OWN.breath * Math.exp(-tau / 0.2) * smoothstep(0, 0.06, tau) : 0;
  out.title = OWN.title * smoothstep(0.05, 0.6, tau);
  return out;
}
export const deskOn = (t) => smoothstep(LAMP_ON, LAMP_ON + DESK.warm, t);

// ------------------------------------------------------------------------------------------- the crane

// The crane flies on from s28 (its place and its velocity at s28's end) to the reader's case and lands on
// its top on the beat (LAND), coming in along the rail; a cubic from the one to the other. Its heading
// is its course; its pitch as s28's, flaring at the end; its bank from its turn, eased in from s28's; its
// wings keep s28's stroke till it flares, then fold to rest.
export const LAND = beat(14);
export const PERCH = inCase(-0.06, CASE.top + 0.001, -0.21);
export const VLAND = new THREE.Vector3(0.26, -0.1, -0.15); // m/s at touchdown (from the left front, seen 3/4)
const H28 = heroAt(T28, {}, true);
const HV28 = (() => {
  const e = 1 / 96;
  const a = heroAt(T28 - e, {}, true);
  const b = heroAt(T28 + e, {}, true);
  return new THREE.Vector3((b.x - a.x) / (2 * e), (b.y - a.y) / (2 * e), (b.z - a.z) / (2 * e));
})();
// (and its acceleration there: the course eases off s28's helix, its second-order expansion at s28's end,
// over BLEND s, so that its place, velocity and acceleration run on through the cut)
const HA28 = (() => {
  const e = 1 / 48;
  const a = heroAt(T28 - e, {}, true);
  const b = heroAt(T28 + e, {}, true);
  return new THREE.Vector3((b.x - 2 * H28.x + a.x) / (e * e), (b.y - 2 * H28.y + a.y) / (e * e), (b.z - 2 * H28.z + a.z) / (e * e));
})();
const BLEND = 2.0;
// through a point on its way out of the helix (WAY.p at WAY.t: still climbing, turning out toward the case)
export const WAY = { t: 2.0, p: new THREE.Vector3(-0.4, 21.9, -5.6) };
const FLIGHT = ['x', 'y', 'z'].map((k) => {
  const ts = [0, WAY.t, LAND];
  const ys = [H28[k], WAY.p[k], PERCH[k]];
  return { ts, ys, ms: clamped(ts, ys, HV28[k], VLAND[k]) };
});
export const REST = 14 * DEG; // the wings at rest, perched

function course(t, out) {
  const tc = Math.min(t, LAND);
  // the blend's weight (6u⁵ − 15u⁴ + 10u³) and its rate
  const u = clamp(tc / BLEND, 0, 1);
  const w = u * u * u * (u * (6 * u - 15) + 10);
  const dw = (30 * u * u * (u - 1) * (u - 1)) / BLEND;
  ['x', 'y', 'z'].forEach((k, i) => {
    const F = FLIGHT[i];
    const p = hermite(F.ts, F.ys, F.ms, tc);
    const v = hermite(F.ts, F.ys, F.ms, tc, 1);
    const q = H28[k] + HV28[k] * tc + 0.5 * HA28[k] * tc * tc;
    const vq = HV28[k] + HA28[k] * tc;
    out[k] = lerp(q, p, w);
    out['v' + k] = lerp(vq, v, w) + (p - q) * dw;
  });
  return out;
}
const Ca = {};
const Cb = {};
// the crane at t (floor-relative): place, yaw (bearing), pitch, bank, wings (tau); smooth: no bob
export function heroFly(t, out = {}, smooth = false) {
  course(t, out);
  const vh = Math.hypot(out.vx, out.vz);
  out.yaw = Math.atan2(out.vz, out.vx);
  const g = Math.atan2(out.vy, vh);
  // (taken over ±0.3 s, so that it levels off as a bird does, not at a frame's notice)
  let fly = 0;
  for (let k = -3; k <= 3; k++) {
    course(t + 0.1 * k, Ca);
    const gk = Math.atan2(Ca.vy, Math.hypot(Ca.vx, Ca.vz));
    fly += gk * (0.5 + 0.35 * smoothstep(40 * DEG, 70 * DEG, gk)) / 7;
  }
  fly = lerp(g * (0.5 + 0.35 * smoothstep(40 * DEG, 70 * DEG, g)), fly, smoothstep(0, 0.5, t));
  fly += 22 * DEG * smoothstep(LAND - 0.7, LAND - 0.2, t);
  out.pitch = lerp(fly, 0, smoothstep(LAND - 0.15, LAND + 0.25, t));
  const e = 0.02;
  course(Math.max(0, t - e), Ca);
  course(t + e, Cb);
  const w = wrap(Math.atan2(Cb.vz, Cb.vx) - Math.atan2(Ca.vz, Ca.vx)) / (t + e - Math.max(0, t - e));
  const bank = clamp(Math.atan((1.6 * vh * w) / 9.81), -25 * DEG, 25 * DEG);
  out.bank = lerp(H28.bank, bank, smoothstep(0, 0.4, t)) * (1 - smoothstep(LAND - 0.5, LAND, t));
  const p = (T28 + t - WING.phase) / WING.period;
  const top = WING.mid + WING.amp;
  out.tau = lerp(lerp(stroke(p), top, smoothstep(LAND - 0.4, LAND - 0.1, t)), REST, smoothstep(LAND + 0.05, LAND + 0.7, t));
  if (!smooth) out.y += FLY.bob * Math.sin(2 * Math.PI * (p - Math.floor(p)) - 0.6) * (1 - smoothstep(LAND - 0.6, LAND - 0.2, t));
  out.phi = CREASE.phi;
  out.psi = Math.PI;
  return out;
}

// ------------------------------------------------------------------------------------------ the camera

// From s28's camera at its end (its place, its velocity, looking up the shaft), a C2 cubic through CAM.p
// at CAM.t, still creeping in at the end; looking at elevation CAM.el and bearing CAM.az (keys).
const C28 = cam28(T28);
const CV28 = (() => {
  const e = 1 / 96;
  const a = cam28(T28 - e);
  const b = cam28(T28 + e);
  return [(b.x - a.x) / (2 * e), (b.y - a.y) / (2 * e), (b.z - a.z) / (2 * e)];
})();
const AZ0 = Math.atan2(C28.dz, C28.dx) / DEG;
const EL0 = Math.asin(C28.dy) / DEG;
export const SPINE = inCase(0, 0.2, -0.12); // the middle of the books' spines
export const CAM = {
  t: [0, LAND, 6.2, END],
  p: [[C28.x, C28.y, C28.z], [-0.25, 22.62, -9.6], [-0.03, 22.96, -10.85], [SPINE.x, SPINE.y, SPINE.z + 1.0]],
  vEnd: [0, 0, -0.06],
  el: [[0, EL0], [0.6, 80], [1.4, 66], [2.2, 48], [3.0, 32], [3.8, 20], [4.6, 12], [5.5, 4], [6.5, 1], [END, 0]],
  az: [[0, AZ0], [3, AZ0 - 4], [5.5, -84], [END, -90]],
  lens: [[0, 22], [2.5, 23], [LAND, 27], [6, 34], [END, 40]],
  fstop: [[0, C28.fstop], [2.5, C28.fstop], [LAND, 8], [6.2, 4], [END, 4]],
};
const CP = [0, 1, 2].map((k) => {
  const ys = CAM.p.map((p) => p[k]);
  return { ys, ms: clamped(CAM.t, ys, CV28[k], CAM.vEnd[k]) };
});
export function camAt(t, out = {}) {
  out.x = hermite(CAM.t, CP[0].ys, CP[0].ms, t);
  out.y = hermite(CAM.t, CP[1].ys, CP[1].ms, t);
  out.z = hermite(CAM.t, CP[2].ys, CP[2].ms, t);
  const el = curve(CAM.el, t) * DEG;
  const az = curve(CAM.az, t) * DEG;
  out.dx = Math.cos(el) * Math.cos(az);
  out.dy = Math.sin(el);
  out.dz = Math.cos(el) * Math.sin(az);
  out.lens = curve(CAM.lens, t);
  out.fstop = curve(CAM.fstop, t);
  return out;
}

// ------------------------------------------------------------------------------------ the far readers

// The other readers (world/d_reader.js's Readers): cases on the rails of the floors FAR.k above the
// lighthouse's, one to three to a side up to FAR.low and none, one or two above it (none beside the
// reader the camera comes to). Their lamps come on from beat 9, each while it is crossing the picture
// where it can (from FAR.lead s after it comes in to FAR.lead s before it goes out, rather late than
// early: a few and then many), so that the far rings light first, up the shaft, then the galleries the
// camera comes down past, and last the reader's own on beat 12: the morning comes down the shaft. The
// one that stands widest in the picture on each half-beat 9–11½ comes on on it; the ones the camera
// never sees, at any time up to FAR.last.
export const FAR = {
  k: [2, 24],
  low: 8,
  share: { low: [0, 0.3, 0.75], high: [0.25, 0.73, 1] }, // the chance of no more than none, one, two
  a: 5.4, // m along the rail, either side of its middle
  clear: 2.4, // none this near the reader's own (m along its rail)
  beats: [9, 9.5, 10, 10.5, 11, 11.5].map(beat),
  alone: 0.15, // s: the first lamp has this long to itself
  lead: [0.12, 0.4],
  late: 0.6, // its moment in its time in the picture: u^late
  last: 4.6,
};
// their lamps' look: the glow's radius (m) and its peak (× amber) at RLAMP.ev, kept as the exposure rises
// (× 2^(RLAMP.ev − EV): a lamp stays amber, never yellow-white); the lamp's light on the inside of its case
// (radiant intensity) and about it; its mouth seen through the glass (kept as the glow)
// (near: the reader's own lamp has such a glow too, from afar, going as the camera comes to it over these s)
export const RLAMP = { r: 0.5, glow: 1.3, ev: 0.2, light: 0.8, fill: 5, mouth: 1.5, near: [3.8, 4.8] };
// their cases come in over these (s): s28's shaft has none, and this shot's first frame goes on from its last
export const CASES_IN = [0, 0.9];
// how wide a case's glass stands in the picture at t (px at 1920; 0 when it is out of it or turned away):
// p the middle of its glass, n its normal (floor-relative)
const V = {};
export function pictured(p, n, t, edge = 0.95) {
  camAt(t, V);
  const x = p.x - V.x;
  const y = p.y - V.y;
  const z = p.z - V.z;
  const d = x * V.dx + y * V.dy + z * V.dz;
  const r = Math.hypot(x, y, z);
  const face = -(x * n.x + y * n.y + z * n.z) / r;
  if (d < 0.05 || face < 0.03) return 0;
  // the camera's right and up (no roll)
  const h = Math.hypot(V.dx, V.dz);
  const sx = ((-x * V.dz + z * V.dx) / h / d) * (V.lens / 18);
  const sy = ((-(x * V.dx + z * V.dz) * V.dy) / h + y * h) / d * (V.lens / 18) * (16 / 9);
  if (Math.abs(sx) > edge || Math.abs(sy) > edge) return 0;
  return ((2 * CASE.half) / r) * (V.lens / 36) * 1920 * face;
}
// each: { k, side, a, bay (its lamp's: -1 left, 1 right), seed, m (its matrix, floor-relative), p, n (its
// glass's middle and normal), seen ([first, last] s in the picture, or null), shown (it comes on in the
// picture), on (s), beat (on a half-beat) }
export const READERS = (() => {
  const list = [];
  for (let k = FAR.k[0]; k <= FAR.k[1]; k++) {
    for (let side = 0; side < 6; side++) {
      const u = (j) => hash(k, side, j, 2900);
      const share = k <= FAR.low ? FAR.share.low : FAR.share.high;
      const n = share.concat(2).findIndex((s) => u(0) < s);
      for (let j = 0; j < n; j++) {
        const a = FAR.a * ((2 * (j + 0.15 + 0.7 * u(1 + j))) / n - 1);
        if (k === HERO.k && side === HERO.side && Math.abs(a - HERO.a) < FAR.clear) continue;
        list.push({ k, side, a, bay: u(4 + j) < 0.5 ? -1 : 1, seed: u(7 + j), m: caseMatrix(side, a, k * LIB.H) });
      }
    }
  }
  // when each is in the picture, and its lamp's moment
  const t0 = FAR.beats[0] + FAR.alone;
  list.forEach((c, i) => {
    c.p = new THREE.Vector3(0, CASE.clear / 2, CASE.glass).applyMatrix4(c.m);
    c.n = new THREE.Vector3(0, 0, 1).transformDirection(c.m);
    let first = -1;
    let last = -1;
    for (let f = 0; f < meta.frames; f++) {
      if (!pictured(c.p, c.n, f / 24)) continue;
      if (first < 0) first = f;
      last = f;
    }
    c.seen = first < 0 ? null : [first / 24, last / 24];
    const lo = c.seen ? Math.max(c.seen[0] + FAR.lead[0], t0) : 0;
    const hi = c.seen ? c.seen[1] - FAR.lead[1] : -1;
    c.shown = hi >= lo;
    c.on = c.shown ? lerp(lo, hi, hash(i, 1, 2901) ** FAR.late) : lerp(t0, FAR.last, hash(i, 2, 2901));
  });
  for (const tb of FAR.beats) {
    let best = null;
    let wide = 0;
    for (const c of list) {
      if (c.beat || !c.seen || tb < c.seen[0] + FAR.lead[0] || tb > c.seen[1] - FAR.lead[1]) continue;
      const w = pictured(c.p, c.n, tb, 0.8);
      if (w > wide) [best, wide] = [c, w];
    }
    if (best) [best.on, best.beat, best.shown] = [tb, true, true];
  }
  return list;
})();

// --------------------------------------------------------------------------------- the readers' letters

// A crane leaves the flock for each reader's case and lands on its top, the lamp first and then the letter
// (as the reader the camera comes to): it lands MAIL.after s after the lamp comes on (and not before
// MAIL.first), and flies a cubic from its place and velocity in the flock through a point MAIL.over in
// front of and above the case's top (case frame, x on the side it comes from) MAIL.lead s before it lands,
// to its perch on the top, landing at MAIL.v (case frame, x either way; the hero's way in). It turns from
// the flock's heading to its course over MAIL.turn s; it flares, folds its wings and sits. Which crane, and
// when it leaves: paired in setup (letters()), the readers in the picture first, each the crane and the
// moment (MAIL.leg s before it is at MAIL.over, on a frame) that make its way there most like its flight:
// a mean speed of MAIL.pace × its own (cost: |ln| of the ratio), setting off towards it (MAIL.head × 1 − cos).
export const MAIL = {
  after: [0.6, 1.6],
  first: [1.7, 2.3],
  leg: [0.8, 2.4], // s, in 9 steps
  pace: 0.8,
  head: 1,
  over: [0.35, 0.28, 0.35],
  lead: 0.6,
  v: [0.26, -0.1, -0.15],
  turn: 0.7,
  toward: 0.6, // m/s
  short: 12,
  fast: [1.2, 3], // its top speed over this × its own costs this much a unit
  late: [0, 0.4, 0.8, 1.2], // s
  seen: 0.25, // s before its case leaves the picture
  ok: 0.8,
};
// the letters: [{ r (its reader), i (its crane), leave, land, ts, ys/ms ([x, y, z]), u (its way in over the
// ground, unit [x, z]), bank0 (in the flock) }]
export function letters(P) {
  const taken = new Uint8Array(P.n);
  const list = [];
  const A = {};
  const B = {};
  // the flock on frame f of this shot: [x, y, z, vx, vy, vz] each (NaN: not flying)
  const at = new Map();
  const flockOn = (f) => {
    if (!at.has(f)) {
      const a = new Float32Array(P.n * 6).fill(NaN);
      for (let i = 0; i < P.n; i++) {
        if (!flockAt(P, i, T28 + f / 24, A) || !flockAt(P, i, T28 + (f + 0.5) / 24, B)) continue;
        a.set([A.x, A.y, A.z, (B.x - A.x) * 48, (B.y - A.y) * 48, (B.z - A.z) * 48], i * 6);
      }
      at.set(f, a);
    }
    return at.get(f);
  };
  const order = READERS.map((c, r) => r).sort((a, b) => READERS[b].shown - READERS[a].shown || READERS[a].on - READERS[b].on);
  for (const r of order) {
    const c = READERS[r];
    const h = (m) => hash(r, m, 2902);
    let land0 = Math.max(c.on + lerp(...MAIL.after, h(1)), lerp(...MAIL.first, h(2)));
    // (while its case is in the picture, where it can)
    if (c.shown) land0 = Math.max(Math.min(land0, c.seen[1] - MAIL.seen), c.on + MAIL.after[0], MAIL.first[0]);
    const side = h(4) < 0.5 ? -1 : 1; // it comes in from −side, going +side
    const perch = new THREE.Vector3(side * (0.05 + 0.12 * h(5)), CASE.top + 0.001, -0.21).applyMatrix4(c.m);
    const over = new THREE.Vector3(-side * MAIL.over[0], CASE.top + MAIL.over[1], MAIL.over[2]).applyMatrix4(c.m);
    const vl = new THREE.Vector3(side * MAIL.v[0], MAIL.v[1], MAIL.v[2]).transformDirection(c.m).multiplyScalar(Math.hypot(...MAIL.v));
    const uh = Math.hypot(vl.x, vl.z);
    const u = [vl.x / uh, vl.z / uh];
    // landing then: the MAIL.short likeliest [cost, crane, frame], then of those the one whose way is least
    // faster than its flight
    const fly = (land) => {
      const t1 = land - MAIL.lead; // at MAIL.over
      const short = [];
      const fs = new Set([...Array(9).keys()].map((s) => Math.max(1, Math.round(24 * (t1 - lerp(...MAIL.leg, s / 8))))));
      for (const f of fs) {
        const a = flockOn(f);
        const dt = t1 - f / 24;
        for (let i = 0, j = 0; i < P.n; i++, j += 6) {
          if (taken[i] || Number.isNaN(a[j])) continue;
          const dx = over.x - a[j];
          const dy = over.y - a[j + 1];
          const dz = over.z - a[j + 2];
          const d = Math.hypot(dx, dy, dz);
          const sp = Math.hypot(a[j + 3], a[j + 4], a[j + 5]);
          const k = Math.abs(Math.log(d / dt / (MAIL.pace * sp))) + MAIL.head * (1 - (dx * a[j + 3] + dy * a[j + 4] + dz * a[j + 5]) / (d * sp));
          if (short.length === MAIL.short && k >= short[MAIL.short - 1][0]) continue;
          short.push([k, i, f]);
          short.sort((p, q) => p[0] - q[0]);
          short.length = Math.min(short.length, MAIL.short);
        }
      }
      let L = null;
      for (const [k, i, f] of short) {
        const leave = f / 24;
        const e = 1 / 96;
        flockAt(P, i, T28 + leave - e, A);
        flockAt(P, i, T28 + leave + e, B);
        const v0 = [(B.x - A.x) / (2 * e), (B.y - A.y) / (2 * e), (B.z - A.z) / (2 * e)];
        flockPose(P, i, T28 + leave, A);
        const ts = [leave, t1, land];
        const ys = ['x', 'y', 'z'].map((q) => [A[q], over[q], perch[q]]);
        const ms = ys.map((y, q) => clamped(ts, y, v0[q], [vl.x, vl.y, vl.z][q]));
        const M = { r, i, leave, land, ts, ys, ms, u, yaw0: A.yaw, pitch0: A.pitch, bank0: A.bank };
        let top = 0;
        for (let s = leave; s < land; s += 1 / 48) top = Math.max(top, Math.hypot(...letterCourse(M, s, Ka).v));
        M.cost = k + MAIL.fast[1] * Math.max(0, top / Math.hypot(...v0) - MAIL.fast[0]);
        if (!L || M.cost < L.cost) L = M;
      }
      return L;
    };
    // (and later, when no crane can get there by then as it flies)
    let L = null;
    for (const late of MAIL.late) {
      const M = fly(land0 + late);
      if (!L || M.cost < L.cost) L = M;
      if (L.cost < MAIL.ok) break;
    }
    taken[L.i] = 1;
    const { leave, land } = L;
    // its own heading, unwound from the flock's
    L.psi = new Float32Array(Math.ceil((land - leave) * 96) + 2);
    for (let s = 0, y = L.yaw0; s < L.psi.length; s++) {
      letterCourse(L, leave + s / 96, Ka);
      y += wrap(Math.atan2(Ka.v[2] + MAIL.toward * L.u[1], Ka.v[0] + MAIL.toward * L.u[0]) - y);
      L.psi[s] = y;
    }
    list.push(L);
  }
  return list;
}
// a letter's place and velocity at t (held before and after its flight)
function letterCourse(L, t, out) {
  const tc = clamp(t, L.leave, L.land);
  for (let k = 0; k < 3; k++) {
    out.p[k] = hermite(L.ts, L.ys[k], L.ms[k], tc);
    out.v[k] = hermite(L.ts, L.ys[k], L.ms[k], tc, 1);
  }
  return out;
}
const Ka = { p: [0, 0, 0], v: [0, 0, 0] };
// its yaw at t: from the flock's (s28's headingAt) to its own over MAIL.turn s; its own, its path over the
// ground plus MAIL.toward m/s its way in (so it never turns on nothing), unwound in setup (L.psi, every
// 1/96 s: so it never flips round)
function letterYaw(L, t) {
  const s = clamp(t - L.leave, 0, L.land - L.leave) * 96;
  const j = Math.min(Math.floor(s), L.psi.length - 2);
  return lerp(L.yaw0, lerp(L.psi[j], L.psi[j + 1], s - j), smoothstep(L.leave, L.leave + MAIL.turn, t));
}
// a letter's crane at t (≥ its leave; floor-relative): place, yaw, pitch and bank (as flockPose), wing (T:
// s28's clock)
export function letterAt(L, P, t, out) {
  const K = letterCourse(L, t, Ka);
  [out.x, out.y, out.z] = K.p;
  out.yaw = letterYaw(L, t);
  const w = (letterYaw(L, t + FLOCK.roll) - letterYaw(L, t - FLOCK.roll)) / (2 * FLOCK.roll);
  const vh = Math.hypot(K.v[0] + MAIL.toward * L.u[0], K.v[2] + MAIL.toward * L.u[1]);
  const ease = smoothstep(L.leave, L.leave + MAIL.turn, t);
  out.bank = lerp(L.bank0, clamp(Math.atan((0.8 * vh * w) / 9.81), -30 * DEG, 30 * DEG), ease);
  const pitch = lerp(L.pitch0, clamp(FLOCK.pitchK * Math.atan2(K.v[1], vh), -40 * DEG, FLOCK.nose), ease);
  out.pitch = (pitch + 22 * DEG * smoothstep(L.land - 0.7, L.land - 0.2, t)) * (1 - smoothstep(L.land - 0.15, L.land + 0.25, t));
  const i = L.i;
  const T = T28 + t;
  const top = P.mid[i] + P.amp[i];
  out.wing = lerp(lerp(stroke(T / P.per[i] + P.ph[i], P.mid[i], P.amp[i]), top, smoothstep(L.land - 0.4, L.land - 0.1, t)), REST, smoothstep(L.land + 0.05, L.land + 0.7, t));
  out.tau = 10;
  return out;
}

// The cues as the scene gives them (setup checks CUES against them): the lamps that come on in the picture
// (the widest on each half-beat 9–11½, and all of them), the letters that land in it, and the push to the
// glass: the first frame its glass stands half the picture's width.
const r3 = (x) => Math.round(x * 1000) / 1000;
export function cuesGot(L) {
  const on = READERS.filter((c) => c.shown).map((c) => c.on);
  const seen = L.filter((l) => READERS[l.r].seen && l.land >= READERS[l.r].seen[0] && l.land <= READERS[l.r].seen[1]).map((l) => l.land);
  const p = inCase(0, CASE.clear / 2, CASE.glass);
  const n = new THREE.Vector3(0, 0, 1).transformDirection(CASE_M);
  let glass = END;
  for (let f = meta.frames - 1; f >= 0 && pictured(p, n, f / 24, 5) >= 960; f--) glass = f / 24;
  return {
    lamps: {
      beats: READERS.filter((c) => c.beat).map((c) => r3(c.on)).sort((a, b) => a - b),
      span: [r3(Math.min(...on)), r3(Math.max(...on))],
      n: on.length,
      own: r3(LAMP_ON),
    },
    letters: { span: [r3(Math.min(...seen)), r3(Math.max(...seen))], n: seen.length },
    land: r3(LAND),
    glass: r3(glass),
    books: BOOK_T.map(r3),
  };
}

// ---------------------------------------------------------------------------------------------- setup

export async function setup(ctx) {
  await loadFonts();
  const tl = await ctx.load.json('/film/timeline.json');
  const grade = tl.grades.act2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 2000);
  const K0 = FLOOR - 40;
  const K1 = FLOOR + 70;
  const lib = new Library({ floors: [K0, K1], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK27.night.lamp }));
  const U = lib.uniforms;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);
  U.uBeamW.value = LOOK27.beamW[1];
  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);
  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 27 });
  scene.add(dust.points);

  // the cranes' paper: s27's printed page (as s28; the letter's own meshes are not shown)
  const colours = Object.fromEntries(RIVERS.map((R) => [R.name, R.col ?? LIME]));
  const paper = LOOK18.paper;
  const page = await pageCanvas({ paper, ink: paper.map((v) => v * 0.07), colours, repos: PASSED.slice(0, 2) });
  const L = letterMeshes({ U, y0: Y0, page, mark: await trayMark(), LIB_COMMON, paper });
  const pageTex = L.uniforms.uPage.value;
  const sky = { value: new THREE.Color(0, 0, 0) };
  const lime = limeLights();
  const hero = new HeroCrane({ U, pageTex, paper, sky, lime, LIB_COMMON });
  scene.add(hero.mesh);
  const HU = hero.uniforms;
  HU.uRows.value.forEach((r, i) => {
    r.z = BELLS[i] + LINE.lag;
    r.w = LINE.dur;
  });
  HU.uHot.value.set(...LOOK27.hot);
  HU.uShot.value = S27 + T28;
  HU.uMix.value = 1;
  const P = flockSeeds();
  // the readers' letters: crane → its letter
  const LETTERS = letters(P);
  const mail = new Map(LETTERS.map((L) => [L.i, L]));
  // the cues against the scene (as s28)
  {
    const got = cuesGot(LETTERS);
    const off = (a, b) =>
      typeof a === 'number' ? !(Math.abs(a - b) <= 0.03) : (Array.isArray(a) && a.length !== b?.length) || Object.keys(a ?? {}).some((k) => off(a[k], b?.[k]));
    for (const k of Object.keys(got)) {
      if (off(got[k], CUES[k])) console.warn(`[s29] CUES.${k} is ${JSON.stringify(CUES[k])}, the scene gives ${JSON.stringify(got[k])}`);
    }
  }
  const flock = new Flock({ U, pageTex, paper, sky, lime, count: P.n, LIB_COMMON });
  scene.add(flock.mesh);
  const labels = new Labels({ U, atlas: await labelAtlas() });
  scene.add(labels.group);

  // the reader's case: its walnut and brass in the library's light; behind its glass the shelf and the
  // desk lamp, lit by nothing but the lamp and the books
  const CW = new THREE.Matrix4().makeTranslation(0, Y0, 0).multiply(CASE_M);
  const cb = new Builder();
  cb.setTransform(CW);
  buildCaseShell(cb, { boards: false });
  scene.add(new THREE.Mesh(cb.geometry(), lib.material));
  const dark = { uLampI: { value: 0 }, uBeamI: { value: 0 }, uLHFill: { value: new THREE.Color(0, 0, 0) }, uAmb: { value: new THREE.Color(0, 0, 0) } };
  const labels29 = await bookLabels({ strips: STRIPS29 });
  const run = [BOOKS[0].x - BOOKS[0].w / 2 - 0.0012, BOOKS[9].x + BOOKS[9].w / 2 + 0.0012];
  const layout = layoutShelf({ seed: 29, x0: -0.065, x1: 0.065, rows: [{ y: 0, x0: run[0], x1: run[1] }], fixed: BOOKS });
  const side = CASE.half + 0.025; // the case's inner sides, as the shelf's dividers
  const shelf = new BookShelf({ uniforms: { ...U, ...dark }, layout, labels: labels29, dividers: [-side, side] });
  CW.decompose(shelf.group.position, shelf.group.quaternion, shelf.group.scale);
  shelf.uniforms.uShelfDust.value = 0.1;
  shelf.uniforms.uBackLit.value = 1;
  scene.add(shelf.group);
  const spines = new SpineLight({ U, books: layout.books, strips: labels29.strips, rows: labels29.stripRows });
  shelf.group.add(spines.mesh);
  const lb = new Builder();
  buildDeskLamp(lb, CW);
  const lampMat = deskLampMaterial(U);
  scene.add(new THREE.Mesh(lb.geometry(), lampMat));
  spines.uniforms.uEdgeI.value = OWN.edgeI;
  const glass = new GlassFront({ U });
  glass.uniforms.uSeeds.value.set(OWN.seeds, 0, 3, 0);
  glass.uniforms.uRefl.value = OWN.refl;
  CW.decompose(glass.group.position, glass.group.quaternion, glass.group.scale);
  scene.add(glass.group);
  const lining = new Lining({ U, matrix: CW });
  scene.add(lining.mesh);
  const bulb = lampPoint(LAMP.bulb).applyMatrix4(CW);
  const axis = LAMP.axis.clone().transformDirection(CW);
  lampMat.uniforms.uBulb.value.copy(bulb);
  lampMat.uniforms.uAxis.value.copy(axis);
  glass.uniforms.uBulb.value.copy(bulb);
  lining.uniforms.uBulb.value.copy(bulb);
  lining.uniforms.uBooks.value = BOOKS[0].x - BOOKS[0].w / 2;
  [lining.uniforms.uSpill.value, lining.uniforms.uAo.value] = OWN.lining;
  const aim29 = bulb.clone().add(axis);
  const kc = new THREE.Color();
  const bs = {};
  // the other readers' cases, their lamps and what they light
  const toWorld = new THREE.Matrix4().makeTranslation(0, Y0, 0);
  const readers = new Readers({ U, material: lib.material, cases: READERS.map((c) => ({ m: toWorld.clone().multiply(c.m), seed: c.seed, on: c.on, bay: c.bay })) });
  scene.add(readers.group);
  readers.uniforms.uGR.value = RLAMP.r;
  readers.uniforms.uRes.value = ctx.height / 1080;
  readers.uniforms.uRdI.value = RLAMP.light;
  readers.uniforms.uRdFill.value = RLAMP.fill;
  const own = new LampGlows({ uniforms: readers.uniforms, points: [{ p: bulb, n: new THREE.Vector3(0, 0, 1).transformDirection(CW), seed: 0.5, on: LAMP_ON }] });
  scene.add(own.mesh);

  const cam = {};
  const H = {};
  const F = {};
  const lab = {};
  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const v = new THREE.Vector3();
  const M = new THREE.Matrix4();
  const amb = new THREE.Color(...LOOK27.morning.amb);
  const haze = new THREE.Color(...LOOK28.haze);
  const clear = new THREE.Color(0, 0, 0);
  const AW = FLOCK.away;
  // push p (floor-relative, in place) off the point c to at least R (as s28)
  const away = (p, cx, cy, cz, R) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dy, dz);
    if (d > 3 * R) return;
    if (d < 1e-6) {
      p.y = cy + R;
      return;
    }
    const k = (d + R * Math.exp(-((d / R) ** 2))) / d;
    p.x = cx + dx * k;
    p.y = cy + dy * k;
    p.z = cz + dz * k;
  };
  // the focus: on the crane till it lands, then on the books' spines
  const focusAt = (t) => {
    const c = camAt(t);
    const h = heroFly(t, {}, true);
    const fc = Math.max(0.05, (h.x - c.x) * c.dx + (h.y - c.y) * c.dy + (h.z - c.z) * c.dz);
    const fb = Math.max(0.05, (SPINE.x - c.x) * c.dx + (SPINE.y - c.y) * c.dy + (SPINE.z - c.z) * c.dz);
    return lerp(fc, fb, smoothstep(LAND, LAND + 1.0, t));
  };
  return {
    scene,
    camera,
    clearColor: clear,
    update(t) {
      const T = T28 + t;
      camAt(t, cam);
      pos.set(cam.x, Y0 + cam.y, cam.z);
      tgt.set(pos.x + cam.dx, pos.y + cam.dy, pos.z + cam.dz);
      setLens(camera, cam.lens);
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 100 + S27 + T;
      // the light: s28's at its end, carried on
      const el = Math.asin(clamp(cam.dy, -1, 1)) / DEG;
      U.uFogD.value = LOOK28.fog[LOOK28.fog.length - 1][1];
      U.uFogCol.value.copy(haze).multiplyScalar(smoothstep(...LOOK28.hazeEl, el));
      clear.copy(U.uFogCol.value);
      U.uAmb.value.copy(amb).multiplyScalar(LOOK28.amb);
      sky.value.setRGB(...LOOK28.sky);
      for (let k = K0; k <= K1; k++) lib.setFloor(k, { lamp: lampAt(k, S27 + T) });
      lh.set(sheetState(S27 + T));
      lh.update(camera);
      // the crane
      heroFly(t, H);
      v.set(H.x, Y0 + H.y, H.z);
      craneMatrix(v, H.yaw, H.pitch, H.bank, M);
      hero.pose(H.phi, H.tau, M, H.psi);
      // the words, and their light on the cranes about them (s28's, going out as the camera looks down)
      const wordsK = 1 - smoothstep(...WORDS, t);
      for (let j = 0; j < CHANNELS.length; j++) {
        labelAt(j, T, lab);
        v.set(lab.x, Y0 + lab.y, lab.z);
        labels.set(j, v, lab.width, lab.light * wordsK, lab.wipe);
        lime.value[j].set(v.x, v.y, v.z, LOOK28.lime * lab.light * wordsK * clamp(lab.wipe, 0, 1));
      }
      // the reader's light: the desk lamp, and each book's own as it is shelved
      kc.setRGB(...DESK.col).multiplyScalar(DESK.I * deskOn(t));
      shelf.key(bulb, kc, 0.012);
      shelf.beam(aim29, 45, 62);
      shelf.update();
      lampMat.uniforms.uBulbCol.value.copy(kc);
      glass.uniforms.uBulbCol.value.copy(kc);
      glass.uniforms.uHaze.value.copy(U.uFogCol.value);
      glass.uniforms.uShot.value = T;
      readers.uniforms.uRdT.value = t;
      readers.fadeIn(smoothstep(...CASES_IN, t));
      const hold = 2 ** (RLAMP.ev - grade.exposure - evAt(t, el));
      readers.uniforms.uGI.value = RLAMP.glow * hold;
      readers.uniforms.uRdMouth.value = RLAMP.mouth * hold;
      own.uniforms.uGI.value = RLAMP.glow * hold * (1 - smoothstep(...RLAMP.near, t));
      lampMat.uniforms.uLit.value.setRGB(...AMBER).multiplyScalar(DESK.lit * hold * deskOn(t));
      readers.uniforms.uHaze.value.copy(U.uFogCol.value);
      let lit = 0;
      for (let i = 0; i < BOOKS.length; i++) {
        bookState(i, t, bs);
        shelf.set(i, { glow: bs.breath, glowHue: 1 });
        spines.set(i, bs.run, bs.edge, bs.title, bs.own);
        lit += bs.own / OWN.glow;
      }
      shelf.commit();
      // the light about the inside of the case: the lamp's off the board, the books' own (the shelf's
      // ambient, and the lamp's brass)
      dark.uAmb.value.setRGB(...OWN.fillCol).multiplyScalar(OWN.fill[0] * deskOn(t) + OWN.fill[1] * lit);
      lampMat.uniforms.uRoom.value.copy(dark.uAmb.value).multiplyScalar(20);
      lining.uniforms.uRoom.value.copy(lampMat.uniforms.uRoom.value);
      lining.uniforms.uBulbCol.value.copy(kc);
      // the flock climbing on
      let n = 0;
      for (let i = 0; i < P.n; i++) {
        const L = mail.get(i);
        const gone = L && t >= L.leave; // off to its reader
        if (gone) letterAt(L, P, t, F);
        else if (!flockPose(P, i, T, F)) continue;
        away(F, cam.x, cam.y, cam.z, AW.cam);
        away(F, H.x, H.y, H.z, AW.hero);
        v.set(F.x, Y0 + F.y, F.z);
        craneMatrix(v, F.yaw, F.pitch, F.bank, M, P.size[i] * smoothstep(0, FLOCK.grow, F.tau));
        flock.set(n++, M, gone ? F.wing : stroke(T / P.per[i] + P.ph[i], P.mid[i], P.amp[i]));
      }
      flock.commit(n);
      dust.update(camera, 100 + S27 + T, { focus: focusAt(t), fstop: cam.fstop, width: ctx.width, intensity: LOOK.dust * LOOK27.dust });
    },
    post(t) {
      const el = Math.asin(clamp(camAt(t).dy, -1, 1)) / DEG;
      return {
        exposure: grade.exposure + evAt(t, el),
        whiteBalance: { temperature: LOOK28.wb[1] },
        dof: { focus: focusAt(t), fstop: curve(CAM.fstop, t) },
      };
    },
  };
}

// Sound cues, s into the shot (global frame = 2568 + 24 t).
export const CUES = {
  cut: { t: 0 }, // nothing to hear: s28's last frame goes on (looking up the shaft at the five streams)
  // the readers' lamps: the widest in the picture on each half-beat 9–11, n in all in the picture over the
  // span (a few, then many: the far rings first, then the galleries the camera comes down past), the
  // reader's own on beat 12
  lamps: { beats: [0.411, 0.848, 1.282, 1.714, 2.143], span: [0.411, 2.795], n: 131, own: 2.993 },
  letters: { span: [1.7, 3.542], n: 8 }, // cranes land on readers' cases in the picture (the last beside the reader's own)
  land: 4.667, // the crane lands on the reader's case (beat 14)
  glass: 5.833, // the push to the glass: it stands half the picture's width
  books: [5.083, 5.5, 5.917, 6.333, 6.542, 6.75, 6.958, 7.167, 7.375, 7.583], // each book lights, a flute note: beats 14½, 15, 15½, 16, then on every quarter to 17½
};
