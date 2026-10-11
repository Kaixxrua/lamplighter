// s28 · 1:39–1:47 · 纸鹤 (global 2376–2567)
// The letter s27 printed folds itself into a crane and flies, and every subscriber's letter with it.
// s27's last frame goes on (the cut makes no sound): the printed letter on its brass plate from 1.48 m
// above. It lifts off the plate and turns its head up the picture; each fold is scored first by the
// light, a lime line drawn along its creases, then folded (FOLD): the kites at 0.3 s, the body at 0.8 s
// (in half: the neck, the tail and the head rise), the wings out to level at 1.22 s. The print stays up,
// so that the masthead, the rows and the seven sources' chips are on the wings as they spread. The
// wings rise to the top of the stroke and come down on the music's second beat (TAKEOFF, 1.968 s): the
// crane leaves the plate and keeps 72 BPM from there. The camera, which came down behind the letter as
// it folded, stays above it and to its left as it flies (a paper crane in profile, 2.25–3.25 s: neck,
// head, tail and the printed wings), then drops under it and tilts up after it as it climbs round the
// shaft into a tight helix about the axis (FLY). From 2.0 s the galleries of the lighthouse's floor and
// the 44 floors above it launch their cranes, 4,513, in a ripple round the shaft both ways from the
// hero's plate (the last at 3.15 s); they climb and swing in toward the axis, a loose cloud turning round
// the shaft as one body, each beating its wings at its own rate, never in step with the hero. From
// 4.27 s, one after another 0.45 s apart, they go forward round the shaft onto five streams, which open
// out between 10 and 24 m into five straight lines up the shaft: from the camera at the end, five spokes
// from the zenith at equal angles round it, the gap below centred on the hero. As each stream is half
// formed its name is written in the air beside it in lime (LABELS: 0.42 s each, on the half-beats 5½ to
// 7½; 邮件 Email, RSS, Telegram, Discord, Webhook; words only), and lights the cranes about it. The
// light (LOOK28): the morning comes down the shaft to meet them; the air thins and, as the camera looks
// up, takes the warm colour of the top of the shaft, the paper's upper faces warming with it and the
// exposure going down 1.6 EV with the camera's tilt so that the light never washes out, and 0.75 EV more
// from the takeoff till the streams form, while the camera turns and climbs past the lit galleries (so
// that their sweep through the picture stays under the flash limit on a bright screen); the depth below
// keeps the night and goes dark. No crane leaves the shaft: they climb toward the light, which the shaft
// (504 m of it built above the lighthouse, the rest lost in the haze) never opens onto.
//
// First frame (s27's last goes on, the same picture; for the cut): from 1.48 m above the paper, 5.4° off
// straight down (30 mm, f/2), the printed letter on its brass plate in the lower third, as s27's last
// frame has it (08:00 lime beside it, the sheet's line above it, the hexagons of the gallery's floor on
// the left, the lighthouse's tower on the right). Brightness (1920 still, Rec.709 luma 0–255): mean
// 59.1, median 49.5; by thirds top 50.0, middle 53.7, bottom 73.5; mean RGB (80, 56, 25); 0.81 %
// clipped (s27's last frame: 58.9 and 49.2, the thirds within 0.3, the same colour; PSNR between the two
// 34.6 dB at 1920 and 44.3 dB scaled to 240 wide: the difference is the grain).
// Last frame: from 14.7 m above the lighthouse's floor and 3.2 m off the axis, looking up the shaft 6°
// off the vertical (22 mm, 79° across, f/11): its hexagons going up to a pale point at (0.50, 0.39) of
// the picture (x, y from the top left), the lamps in rows up the corners; the five streams, spokes from
// that point at equal angles, the gap below centred on the hero (0.51, 0.75; seen from below, its wings
// spread); the words in lime beside their spokes: Webhook (0.43, 0.11), Telegram (0.38, 0.23), Discord
// (0.62, 0.22), 邮件 Email (0.38, 0.57), RSS (0.63, 0.55). Brightness (1920 still): mean 80.6, median
// 64.6; by thirds top 90.6, middle 81.9, bottom 69.2; mean RGB (104, 77, 44), warm; 1.03 % clipped: the
// lamps' globes and the words' lime.
//
// Checks (setup, console.warn on any miss): the CUES against the scene (the takeoff on its beat, the
// words on their half-beats, the streams' forming); the five spokes round the zenith at the end (within
// 1° of their places); each word at its place in the last frame (within 4 px at 1920). Off-line (node,
// the same exported functions): as it climbs the hero keeps ≥ 3.77 m inside the floors' edges, the rails
// and the shaft's lamps above it, the camera ≥ 2.58 m; the flock's yaw, pitch and bank change by 10° or
// less a frame in all but 12 of 589,664 crane-frames (at most 11.5°); the words' ink ≥ 20 px (1920) from
// every crane at the end. Flashes (engine/tools/flashcheck.mjs on the 960 preview, alone and after s27's):
// at 200, 300 and 500 cd/m² no frame has a quarter of the picture in transition (at most 15.9, 20.0 and
// 23.9 %, at f55: 2.3 s, the camera's swing after the crane), nor in the 2.39 band at 500; no red flash.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep, smootherstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { loadFonts } from 'film/lib/text.js';
import { LIB_COMMON, LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';
import { Dust } from 'world/dust.js';
import { Builder } from 'world/geo.js';
import { pageCanvas, trayMark, buildDial, letterMeshes, sheetCentre } from 'world/d_letter.js';
import { HeroCrane, Flock, Labels, labelAtlas, limeLights, craneMatrix, YAW_TRAY, CHANNELS, SCORES, CREASE } from 'world/d_crane.js';
import { Y0, FLOOR } from './s13.js';
import { LOOK } from './s14.js';
import { RIVERS } from './s17.js';
import { LOOK18 } from './s18.js';
import { buildGate, gateMatrix, PASSED } from './s19.js';
import { LOOK27, BELLS, LINE, camAt as cam27, lampAt, sheetState } from './s27.js';

export const meta = {
  frames: 192,
  quality: { final: { samples: 8 } },
  // as s27 (the lantern's core, should it pass through the picture)
  post: { streak: { strength: 0.4, threshold: 20, tint: [0.85, 1.0, 0.55], length: 0.2, decay: 0.8 } },
};

const DEG = Math.PI / 180;
const END = meta.frames / 24;
const LIME = [0.686, 0.879, 0.07]; // #D8F14B
const S27 = 6; // s27's clock at this shot's first frame (the frame after its last)
const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

// a monotone C1 curve through keys (Fritsch–Carlson), flat at the ends (as s27's)
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
// erf (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7)
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const k = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * k - 1.453152027) * k + 1.421413741) * k - 0.284496736) * k + 0.254829592) * k * Math.exp(-a * a);
  return s * y;
}
// from rest to speed v with rise time T (v(τ) = v·(1 − e^{−(τ/T)²})): the distance gone by τ
const rise = (v, T, tau) => (tau <= 0 ? 0 : v * (tau - T * 0.886226925 * erf(tau / T)));

// ------------------------------------------------------------------------------------------ the folds

// The music's beats in this shot (the score's Span from s28 to s30: 18 beats, 60 → 72 BPM over 12 s):
// 0, 0.992, 1.968, 2.929 … The crane takes off on the second, and its wings keep 72 BPM from there.
export const TAKEOFF = 1.968;
export const WING = { period: 60 / 72, phase: TAKEOFF, mid: 10 * DEG, amp: 40 * DEG, down: 0.4 };
// the stroke: from the top (mid + amp) down to the bottom in `down` of the period, back up in the rest
export function stroke(p, mid = WING.mid, amp = WING.amp, down = WING.down) {
  const f = p - Math.floor(p);
  return f < down ? mid + amp * Math.cos((Math.PI * f) / down) : mid - amp * Math.cos((Math.PI * (f - down)) / (1 - down));
}

// The letter folded (s, local): it lifts off the plate and turns its head (A) to −x, the picture's up;
// each step's creases are scored by the light first (a lime line drawn along each, over FOLD.draw),
// then folded: the kites (the two points narrowed), fold 1 (in half: the neck, the tail and the head
// rise), fold 2 (the wings out to level); a breath with the wings spread, the print up; the wings rise
// to the top of the stroke and come down on the takeoff.
export const FOLD = {
  lift: [[0.25, 0], [0.95, 0.07], [TAKEOFF, 0.1]], // m above the plate
  yaw: [0.25, 0.95], // from its place on the plate (YAW_TRAY) to 180°
  shade: [0.25, 0.6], // its shadow on the plate goes
  steps: [
    { step: 'kites', score: 0.3, fold: [0.5, 0.8] },
    { step: 'body', score: 0.8, fold: [0.92, 1.3] },
    { step: 'wings', score: 1.22, fold: [1.34, 1.58] },
  ],
  raise: [1.7, TAKEOFF],
  draw: 0.14,
  score: 2.2, // the scored line's light
};

export function foldAt(t, out = {}) {
  const [K, B, W] = FOLD.steps;
  out.lift = curve(FOLD.lift, t);
  out.yaw = lerp(YAW_TRAY, Math.PI, smootherstep(...FOLD.yaw, t));
  out.psi = Math.PI * smootherstep(...K.fold, t);
  out.phi = CREASE.phi * smootherstep(...B.fold, t);
  const top = WING.mid + WING.amp;
  if (t < TAKEOFF) out.tau = lerp(lerp(out.phi, 0, smootherstep(...W.fold, t)), top, smootherstep(...FOLD.raise, t));
  else out.tau = stroke((t - WING.phase) / WING.period);
  out.shade = 1 - smoothstep(...FOLD.shade, t);
  return out;
}

// each crease's line: how far it is drawn (0..1) and its light
export function scoreAt(t, fold) {
  const S = FOLD.steps[fold];
  const drawn = smoothstep(S.score, S.score + FOLD.draw, t);
  const k = FOLD.score * smoothstep(S.score - 0.02, S.score + 0.04, t) * (1 - smoothstep(S.fold[0] + 0.05, S.fold[1] + 0.12, t));
  return [drawn, k];
}

// ------------------------------------------------------------------------------------------ the flight

// From the takeoff the crane flies on round the shaft as the sheet turned all night (clockwise from
// above: the bearing growing), climbing and turning in toward the axis, slowing along the ground as it
// comes in, till it climbs in a tight helix round the axis (FLY.r) with the flock wheeling round it. Its
// heading follows a steering law (tracked with a lag); integrated once here on a fine step, so the path
// is a fixed function of t. The camera's own heading (HC) follows the crane's till FLY.hold and then
// eases to a stop, so that looking up at the end the picture does not wheel with it.
export const FLY = {
  vh: 3.6, // m/s along the ground, reached over ta…
  ta: 0.9,
  slow: 0.22, // …and this much of it once in at the axis (a steep climb)
  vy: 4.6, // m/s up, reached over ty…
  ty: 1.6,
  level: 0.5, // …and eased to this much of it over `ease` (s after the takeoff), as the streams form
  ease: [3.0, 5.0],
  r: 1.5, // the helix it comes in to (m from the axis)
  turn: 50 * DEG, // its heading inward of the tangent while it is far outside it…
  soft: 2.5, // …over this distance (m)
  lag: 0.4, // the heading's lag (s)
  hold: [2.6, 4.2], // s after the takeoff: the camera's heading stops following
  bob: 0.012, // m, up on each downstroke
};
const C0 = sheetCentre(); // the sheet's centre on the plate (floor-relative)
const HOVER = C0.y + FOLD.lift[FOLD.lift.length - 1][1];
const climb = (tau) => FLY.vy * (1 - Math.exp(-((tau / FLY.ty) ** 2))) * lerp(1, FLY.level, smoothstep(...FLY.ease, tau));
const PATH = (() => {
  const dt = 1 / 1200;
  const n = Math.ceil((END - TAKEOFF + 0.5) / dt) + 2;
  const A = { X: new Float64Array(n), Y: new Float64Array(n), Z: new Float64Array(n), H: new Float64Array(n), V: new Float64Array(n), HC: new Float64Array(n) };
  let x = C0.x;
  let y = HOVER;
  let z = C0.z;
  let h = Math.PI;
  let hc = Math.PI;
  for (let i = 0; i < n; i++) {
    const tau = i * dt;
    const r = Math.hypot(x, z);
    const v = FLY.vh * (1 - Math.exp(-((tau / FLY.ta) ** 2))) * lerp(FLY.slow, 1, smoothstep(FLY.r, FLY.r + 5, r));
    A.X[i] = x;
    A.Y[i] = y;
    A.Z[i] = z;
    A.H[i] = h;
    A.V[i] = v;
    A.HC[i] = hc;
    const want = Math.atan2(z, x) + Math.PI / 2 + FLY.turn * Math.tanh((r - FLY.r) / FLY.soft);
    const dh = (wrap(want - h) / FLY.lag) * dt * smoothstep(0, 0.5, tau);
    h += dh;
    hc += dh * (1 - smoothstep(...FLY.hold, tau));
    x += v * Math.cos(h) * dt;
    z += v * Math.sin(h) * dt;
    y += 0.5 * (climb(tau) + climb(tau + dt)) * dt;
  }
  return { dt, n, ...A };
})();
const sample = (A, tau) => {
  const f = clamp(tau / PATH.dt, 0, PATH.n - 1.001);
  const i = Math.floor(f);
  return lerp(A[i], A[i + 1], f - i);
};

// The crane's place (floor-relative; o: x, y, z), heading (bearing), pitch, bank and wings at t; `smooth`
// leaves out the bob (what the camera follows).
export function heroAt(t, out = {}, smooth = false) {
  const F = foldAt(t);
  const tau = t - TAKEOFF;
  if (tau <= 0) {
    out.x = C0.x;
    out.z = C0.z;
    out.y = C0.y + F.lift;
    out.heading = Math.PI;
    out.yaw = F.yaw;
    out.pitch = 0;
    out.bank = 0;
  } else {
    out.x = sample(PATH.X, tau);
    out.z = sample(PATH.Z, tau);
    out.y = sample(PATH.Y, tau);
    out.heading = sample(PATH.H, tau);
    out.yaw = out.heading;
    const vh = sample(PATH.V, tau);
    const vy = climb(tau);
    // nose up with its climb, the more as the climb steepens (seen from below at the end: its wings a V)
    const g = Math.atan2(vy, vh);
    out.pitch = g * (0.5 + 0.35 * smoothstep(40 * DEG, 70 * DEG, g)) * smoothstep(0, 0.6, tau);
    const e = 0.01;
    const w = (sample(PATH.H, tau + e) - sample(PATH.H, Math.max(0, tau - e))) / (tau + e - Math.max(0, tau - e));
    out.bank = clamp(Math.atan((1.6 * vh * w) / 9.81), -25 * DEG, 25 * DEG);
    if (!smooth) {
      // each downstroke lifts it a little
      const p = (t - WING.phase) / WING.period;
      out.y += FLY.bob * smoothstep(0, 0.4, tau) * Math.sin(2 * Math.PI * (p - Math.floor(p)) - 0.6);
    }
  }
  out.phi = F.phi;
  out.psi = F.psi;
  out.tau = F.tau;
  return out;
}

// ------------------------------------------------------------------------------------------ the camera

// A rig on the crane (its smoothed place o, its heading f along the ground, r = f × up to its right,
// which is toward the axis): the camera b behind it, h above it, s to its right; looking at elevation el,
// turned psi to the right of the heading. At 0 exactly s27's camera at rest over the letter (1.48 m up,
// 5.4° off straight down, the picture's up along −x, 30 mm, f/2); it comes down behind the letter as it
// folds, to see the crane whole from behind and above; drops under it as it takes off and tilts up after
// it, till at the end it looks up the shaft past the crane at the flock spiralling up into the light.
const C27 = cam27(S27);
// keys: the rig's channels at the times in KEYS.t, a monotone curve through each (flat at both ends)
const K0 = { b: -C0.x, h: C27.y - C0.y, s: C0.z - C27.z, el: -(90 - C27.al / DEG), lens: C27.lens };
export const KEYS = {
  t: [0, 0.3, 1.0, 1.9, 2.5, 3.2, 4.0, 4.8, 5.6, 6.6, END],
  b: [K0.b, K0.b, 0.2, 0.8, 0.5, 0.25, 0.3, 0.5, 0.7, 0.8, 0.9],
  h: [K0.h, K0.h, 1.2, 0.75, 0.45, 0.3, -0.3, -0.8, -1.5, -2.3, -3.0],
  s: [K0.s, K0.s, 0, 0, -0.6, -1.1, -1.2, -1.0, -0.8, -0.6, -0.5],
  // (the tilt up after the takeoff spread over 3.2–5.6 s, ≤ 1.4°/frame: faster, the galleries' shelves and
  // rails sweeping through the picture count as flashes on a bright screen; flashcheck at 300 cd/m²; at 500
  // the exposure's dip, LOOK28.dip, takes the rest)
  el: [K0.el, K0.el, -70, -42, -22, -4, 22, 46, 66, 79, 84],
  psi: [0, 0, 0, 0, 40, 76, 68, 52, 38, 29, 25],
  lens: [K0.lens, K0.lens, 30, 30, 29, 27, 25, 24, 23, 22.5, 22],
};
export const CAM = Object.fromEntries(['b', 'h', 's', 'el', 'psi', 'lens'].map((k) => [k, KEYS.t.map((t, i) => [t, KEYS[k][i]])]));
CAM.fstop = [[0, 2], [0.4, 2], [1.8, 5.6], [3.5, 11]];
export function camAt(t, out = {}) {
  const o = heroAt(t, {}, true);
  const hd = t <= TAKEOFF ? Math.PI : sample(PATH.HC, t - TAKEOFF);
  const fx = Math.cos(hd);
  const fz = Math.sin(hd);
  const b = curve(CAM.b, t);
  const h = curve(CAM.h, t);
  const s = curve(CAM.s, t);
  const el = curve(CAM.el, t) * DEG;
  const psi = curve(CAM.psi, t) * DEG;
  out.x = o.x - b * fx - s * fz;
  out.y = o.y + h;
  out.z = o.z - b * fz + s * fx;
  const hx = Math.cos(psi) * fx - Math.sin(psi) * fz;
  const hz = Math.cos(psi) * fz + Math.sin(psi) * fx;
  out.dx = Math.cos(el) * hx;
  out.dy = Math.sin(el);
  out.dz = Math.cos(el) * hz;
  out.lens = curve(CAM.lens, t);
  out.fstop = curve(CAM.fstop, t);
  out.o = o;
  return out;
}

// ------------------------------------------------------------------------------------------- the flock

// Every subscriber's letter, folded the same way at the same hour: cranes rising from the galleries of
// the lighthouse's floor and the floors above it (FLOCK.floors; the morning reaches no lower), from a
// little way in from the rail, in a ripple round the shaft both ways from the hero's plate
// (FLOCK.launch). Each climbs (from rest to its own speed) and swings in toward the axis, its bearing
// tied to its height: the flock turns round the shaft as the hero does, a screw of pitch FLOCK.pitch[0],
// so that it reads as one body; through FLOCK.twist the screw opens out to FLOCK.pitch[1], the climb
// all but straight up into the light. Each crane belongs to one of five streams (CHANNELS, the ways the
// letter is sent): five lines round the axis at radius FLOCK.r.strand, turning with the screw below the
// twist and straight up above it. At first a loose cloud (FLOCK.r.spread; each crane anywhere between
// its stream and the one behind it), it goes forward round the shaft onto the stream ahead of it as that
// stream forms (FLOCK.form: one after another, each half-formed as its label is written, above
// FLOCK.form.y), never back against the flock. Each weaves a small circle about its lane as it climbs
// (FLOCK.circle), so that the flock shows every side of itself; it heads along its path plus FLOCK.ahead
// the screw's way (forward round the shaft even climbing straight up: it never flips), pitched with its
// climb and banked into its turns (flockPose). Wings: the hero's stroke at the crane's own period and
// phase, never in step. Nothing here keeps state: a crane's place and pose are functions of t and its seed.
export const FLOCK = {
  floors: [0, 44], // floors above the lighthouse's (n), inclusive
  perFloor: (n) => (n <= 3 ? 260 : n <= 10 ? 150 : 72), // more where they are seen close
  // the launch: a ripple from the hero's plate round the shaft both ways (`around` s to the far side), a
  // little later the higher the floor, and each crane a little early or late
  launch: { t0: 2.0, around: 0.6, jitter: 0.4, up: 0.004 },
  apo: [12.4, 14.5], // where they rise from: the gallery's walk, inside the rail (apothem, m)…
  rise: [1.15, 1.45], // …at this height above its floor
  clear: { n: 0, bearing: 90 * DEG, half: 22 * DEG }, // none from beside the hero's plate
  vy: [3.0, 5.4], // climb (m/s) and its rise time (s)
  ty: [0.8, 1.4],
  tr: 1.8, // s: the swing in to its lane
  r: { spread: [5.2, 10.6], strand: 8.0, thick: 0.3 }, // the cloud's radii (the middle kept for the hero), the streams'
  pitch: [56, Infinity], // m a turn: the cloud's screw; the streams go straight up
  twist: [10, 24], // m above the lighthouse's floor: the one opening into the other
  // each stream's bearing at height 0 (CHANNELS order): chosen so that, seen from the camera at the end,
  // the five stand at equal angles round the top of the shaft, the gap below the zenith centred on the
  // crane; the first two either side of it, the next two above them, the last at the top (as the
  // labels come into the picture while it tilts up). Recomputed and checked in setup.
  theta: [2.2016, -2.6708, 1.3284, -0.9572, 0.4516],
  // a stream forms `lead` s before its label is written, over `dur` s, each crane up to `lag` s late;
  // only above y (m above the lighthouse's floor)
  form: { lead: 1.0, dur: 2.0, lag: 0.25, y: [10, 22] },
  join: [0.4, 2.4], // s after its launch: how soon a crane can be drawn in
  thick: 3 * DEG, // a stream's width (bearing)
  period: [0.9, 1.1], // × the hero's
  amp: [30 * DEG, 42 * DEG],
  mid: [6 * DEG, 14 * DEG],
  size: [0.88, 1.08],
  grow: 0.3, // s: unfolding from nothing at its launch
  away: { cam: 1.1, hero: 0.45 }, // m: kept off the lens and off the hero
  // each crane weaves about its lane as it climbs (a circle of radius r m at w rad/s, the screw's way
  // round, coming in over `in` s from its launch), so that the flock shows every side of itself, not
  // one flat face all turned the same way
  circle: { r: [0.2, 0.4], w: [2.0, 3.0], in: 1.2 },
  // headed along its path over the ground plus `ahead` m/s the screw's way (more than the weave's
  // speed): it faces forward round the shaft even climbing all but straight up, and never flips
  ahead: 2.5,
  // pitched up with its climb (× pitchK), up to `nose`
  pitchK: 0.8,
  nose: 65 * DEG,
  roll: 0.125, // s: its bank follows its turn's rate taken over this either side of t
};
const STREAMS = CHANNELS.length;
// the screw's turns from height 0 to y (the pitch opening from pitch[0] to pitch[1] through `twist`)
export function turns(y, F = FLOCK) {
  const [a, b] = F.twist;
  let I = 0;
  if (y >= b) I = (b - a) / 2 + (y - b);
  else if (y > a) {
    const u = (y - a) / (b - a);
    I = (b - a) * (u * u * u - 0.5 * u * u * u * u);
  }
  return y / F.pitch[0] + (1 / F.pitch[1] - 1 / F.pitch[0]) * I;
}
export const streamBearing = (j, y) => FLOCK.theta[j] + 2 * Math.PI * turns(y);

export function flockSeeds(F = FLOCK) {
  const floors = [];
  for (let k = F.floors[0]; k <= F.floors[1]; k++) for (let c = 0; c < F.perFloor(k); c++) floors.push(k);
  const all = floors.length;
  const keys = ['t0', 'r0', 'b0', 'y0', 'vy', 'ty', 'rl', 're', 'd0', 'de', 'j', 'lag', 'per', 'ph', 'amp', 'mid', 'size', 'cr', 'cp', 'cw'];
  const P = Object.fromEntries(keys.map((k) => [k, new Float64Array(all)]));
  let n = 0;
  for (let i = 0; i < all; i++) {
    const k = floors[i];
    const u = (m) => hash(i, m, 2800);
    const side = Math.min(5, Math.floor(u(1) * 6));
    const a = lerp(F.apo[0], F.apo[1], u(3));
    const along = (u(2) * 2 - 1) * 0.92 * a * Math.tan(30 * DEG);
    const nb = (30 + 60 * side) * DEG;
    const x = a * Math.cos(nb) - along * Math.sin(nb);
    const z = a * Math.sin(nb) + along * Math.cos(nb);
    const b0 = Math.atan2(z, x);
    if (k === F.clear.n && Math.abs(wrap(b0 - F.clear.bearing)) < F.clear.half) continue;
    const y0 = k * LIB.H + lerp(...F.rise, u(4));
    // the stream it joins: the next one ahead of it round the shaft (the screw's way, the bearing
    // growing), so that every crane goes forward into its stream, never back against the flock
    let j = 0;
    let ahead = Infinity;
    for (let s = 0; s < STREAMS; s++) {
      const a = (((streamBearing(s, y0) - b0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (a < ahead) {
        ahead = a;
        j = s;
      }
    }
    P.t0[n] = F.launch.t0 + (F.launch.around * Math.abs(wrap(b0 - F.clear.bearing))) / Math.PI + F.launch.jitter * u(5) + F.launch.up * k;
    P.r0[n] = Math.hypot(x, z);
    P.b0[n] = b0;
    P.y0[n] = y0;
    P.vy[n] = lerp(...F.vy, u(6));
    P.ty[n] = lerp(...F.ty, u(7));
    P.rl[n] = lerp(...F.r.spread, u(8));
    P.re[n] = (u(9) * 2 - 1) * F.r.thick;
    P.j[n] = j;
    P.lag[n] = F.form.lag * u(16);
    P.d0[n] = -ahead;
    P.de[n] = (u(10) * 2 - 1) * F.thick;
    P.per[n] = WING.period * lerp(...F.period, u(11));
    P.ph[n] = u(12);
    P.amp[n] = lerp(...F.amp, u(13));
    P.mid[n] = lerp(...F.mid, u(14));
    P.size[n] = lerp(...F.size, u(15));
    P.cr[n] = lerp(...F.circle.r, u(17));
    P.cp[n] = 2 * Math.PI * u(18);
    P.cw[n] = lerp(...F.circle.w, u(19));
    n++;
  }
  P.n = n;
  return P;
}

// when stream j forms (s into the shot)
export const formAt = (j, F = FLOCK) => LABELS.t[j] - F.form.lead;

// crane i's place (floor-relative) at t; false before its launch
export function flockAt(P, i, t, out, F = FLOCK) {
  const tau = t - P.t0[i];
  if (tau <= 0) return false;
  const y = P.y0[i] + rise(P.vy[i], P.ty[i], tau);
  const tf = formAt(P.j[i], F) + P.lag[i];
  // (smootherstep: no kick in its turn as it sets off for its stream)
  const W = smootherstep(tf, tf + F.form.dur, t) * smootherstep(...F.form.y, y) * smootherstep(...F.join, tau);
  const rl = lerp(P.rl[i], F.r.strand + P.re[i], W);
  const r = rl + (P.r0[i] - rl) * Math.exp(-((tau / F.tr) ** 2));
  const b = streamBearing(P.j[i], y) + lerp(P.d0[i], P.de[i], W);
  const c = P.cr[i] * smootherstep(0, F.circle.in, tau);
  const a = P.cp[i] + P.cw[i] * tau;
  out.x = r * Math.cos(b) + c * Math.cos(a);
  out.y = y;
  out.z = r * Math.sin(b) + c * Math.sin(a);
  out.tau = tau;
  out.W = W;
  return true;
}

// crane i's heading at t (its path over the ground plus FLOCK.ahead the screw's way), its speed over the
// ground as it heads (never near nothing, so its pitch never jumps) and its climb; false before its launch
const E = 1 / 96; // s: the step for a crane's velocity
const Ha = {};
const Hb = {};
function headingAt(P, i, t, out) {
  if (!flockAt(P, i, t, Ha)) return false;
  flockAt(P, i, t + E, Hb);
  const b = Math.atan2(Ha.z, Ha.x);
  const hx = (Hb.x - Ha.x) / E - FLOCK.ahead * Math.sin(b);
  const hz = (Hb.z - Ha.z) / E + FLOCK.ahead * Math.cos(b);
  out.yaw = Math.atan2(hz, hx);
  out.vh = Math.hypot(hx, hz);
  out.vy = (Hb.y - Ha.y) / E;
  return true;
}

// crane i at t (floor-relative), false before its launch: its place (flockAt), its yaw (headingAt), its
// pitch with its climb, and its bank into its turn, the turn's rate taken over FLOCK.roll s either side
// of t (it rolls into a turn and out of it as a bird does, not at a frame's notice); pitch and bank eased
// in over its first moments, while it is barely moving
const Q = {};
export function flockPose(P, i, t, out) {
  if (!flockAt(P, i, t, out)) return false;
  headingAt(P, i, t, out);
  headingAt(P, i, t + FLOCK.roll, Q);
  const yb = Q.yaw;
  const w = headingAt(P, i, t - FLOCK.roll, Q) ? wrap(yb - Q.yaw) / (2 * FLOCK.roll) : wrap(yb - out.yaw) / FLOCK.roll;
  const k = smoothstep(0, 2 * FLOCK.grow, out.tau);
  out.bank = k * clamp(Math.atan((0.8 * out.vh * w) / 9.81), -30 * DEG, 30 * DEG);
  out.pitch = k * clamp(FLOCK.pitchK * Math.atan2(out.vy, out.vh), -40 * DEG, FLOCK.nose);
  return true;
}

// ------------------------------------------------------------------------------------------ the labels

// One a stream, in the CHANNELS order, written in the air beside it as it forms (on the beat and the
// half-beat), and held where it was written: on its stream's cylinder (r = strand − inset), turned a
// little from it about the axis (side) at its own height (y), each its own width (m) so that at the end
// all five are one size in the picture (FRAC of its width). Where: seen from the camera at the end, each
// sits on the far side of its spoke from the crane's gap (LABELS.at: screen angle clockwise from up about
// the zenith, px from it at 1920), its ink 50 px or more off every stream (30 when it is written), the
// five zig-zagging up the picture in the order they are written (s28h.mjs; checked in setup).
export const LABELS = {
  t: [5.267, 5.727, 6.18, 6.633, 7.08], // the music's beats and half-beats
  at: [[229.0, 300], [125.0, 300], [305.5, 290], [51.0, 290], [336.5, 330]],
  y: [37.15, 56.81, 35.48, 54.08, 35.79], // m above the lighthouse's floor
  side: [-13.85 * DEG, 20.22 * DEG, -13.23 * DEG, 21.86 * DEG, 15.82 * DEG],
  width: [3.89, 7.3, 3.49, 6.61, 3.5], // m
  frac: 0.105,
  inset: 0, // m inside the stream
  write: 0.42, // s to write one
  light: 3.2,
};
export function labelAt(j, t, out = {}) {
  const y = LABELS.y[j];
  const b = streamBearing(j, y) + LABELS.side[j];
  const r = FLOCK.r.strand - LABELS.inset;
  out.x = r * Math.cos(b);
  out.y = y;
  out.z = r * Math.sin(b);
  out.width = LABELS.width[j];
  const t0 = LABELS.t[j];
  out.wipe = clamp((t - t0) / LABELS.write, 0, 1.2);
  out.light = LABELS.light * smoothstep(t0 - 0.02, t0 + 0.08, t);
  return out;
}

// ------------------------------------------------------------------------------------------ the light

// The music's beats (s into the shot): G's Span from s28's first frame to s30's (span s), 18 beats, 60 →
// 72 BPM over its first 3/4 and 72 after: beat φ (a half-beat is φ + 0.5).
export function beatAt(phi, span = 16, b0 = 60, b1 = 72) {
  const T1 = 0.75 * span;
  const a = (b1 - b0) / (120 * T1);
  const b = b0 / 60;
  const n1 = b * T1 + a * T1 * T1;
  if (phi <= n1) return (2 * phi) / (b + Math.sqrt(b * b + 4 * a * phi));
  return T1 + ((phi - n1) * 60) / b1;
}

// The morning comes down the shaft to meet the flock: the air thins from s27's (thick and black, so the
// depth below goes dark) and, as the camera looks up, takes the colour of the light at the top of the
// shaft, which is also the sky behind everything (the clear colour); the paper's upper faces take that
// light (uSky) and the air about it more of it (uAmb); each word written in the air lights the cranes
// round it lime.
export const LOOK28 = {
  fog: [[0, 0.04], [1.6, 0.04], [3.6, 0.012], [6, 0.004]],
  haze: [0.64, 0.48, 0.3], // linear: the top of the shaft's light (the air's colour looking up)
  hazeEl: [0, 45], // deg: over the camera's elevation the air goes from black to it
  sky: [0.36, 0.3, 0.225], // the morning on the paper's upper faces, at full…
  skyT: [1.5, 5.0], // …from nothing over this (s)
  amb: 1.0, // × s27's morning air, over skyT
  ev: [0.6, -1.0], // over the act's grade: s27's at its end, down as the camera looks up into the light…
  evEl: [-15, 40], // …over its elevation (deg; starting a little below level, so that the galleries are not at their brightest as the camera tilts up past them)
  // …and 0.75 EV more while the camera swings off the plate after the crane and tilts and climbs past the
  // galleries, from the takeoff till the streams form: down over dipT[0..1], back over dipT[2..3] (s). At
  // full exposure the galleries' lit rails, shelves and lamps sweeping through the picture make a quarter
  // of it or more swing by 20 cd/m² on every frame of 2.3–5.5 s on a 500 cd/m² screen (flashcheck): the
  // camera's own turn and climb, not the wings (held still: the same) or a light (the camera held: 6–12%).
  dip: -0.75,
  dipT: [1.9, 2.4, 5.6, 6.1],
  wb: [0.1, 0.15], // over skyT
  lime: 2.5, // a written word's light on the cranes about it (× its light)
  mix: [1.0, 2.5], // the crane's light crosses from s27's sheet's to its own
};

// ---------------------------------------------------------------------------------------------- setup

export async function setup(ctx) {
  await loadFonts();
  const tl = await ctx.load.json('/film/timeline.json');
  const grade = tl.grades.act2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 2000);
  const K0 = FLOOR - 40;
  const K1 = FLOOR + 70; // 504 m of the shaft above: the rest is lost in the morning's haze
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

  // as s27: B's gate (s19, side 0), the dial and the plate; the letter is now the crane
  const gb = new Builder();
  gb.setTransform(gateMatrix());
  buildGate(gb);
  scene.add(new THREE.Mesh(gb.geometry(), lib.material));
  const db = new Builder();
  db.setTransform(new THREE.Matrix4().makeTranslation(0, Y0, 0));
  buildDial(db);
  scene.add(new THREE.Mesh(db.geometry(), lib.material));
  const colours = Object.fromEntries(RIVERS.map((R) => [R.name, R.col ?? LIME]));
  const paper = LOOK18.paper;
  const page = await pageCanvas({ paper, ink: paper.map((v) => v * 0.07), colours, repos: PASSED.slice(0, 2) });
  const L = letterMeshes({ U, y0: Y0, page, mark: await trayMark(), LIB_COMMON, paper });
  scene.add(L.top);
  L.trayUniforms.uPhos.value = LOOK27.phos;
  L.trayUniforms.uEnv.value = LOOK27.env;
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
  const SEG = HU.uScore.value.map((v) => v.clone());

  const P = flockSeeds();
  const flock = new Flock({ U, pageTex, paper, sky, lime, count: P.n, LIB_COMMON });
  scene.add(flock.mesh);
  const labels = new Labels({ U, atlas: await labelAtlas() });
  scene.add(labels.group);

  // keep the cues and the layout honest: recompute them from the timeline, the flight and the camera
  {
    const r2 = (x) => +x.toFixed(2);
    const r3 = (x) => +x.toFixed(3);
    const row = (id) => tl.shots.find((s) => s.id === id);
    const span = (row('s30').start - row('s28').start) / 24;
    let t0 = Infinity;
    let t1 = -Infinity;
    for (let i = 0; i < P.n; i++) {
      t0 = Math.min(t0, P.t0[i]);
      t1 = Math.max(t1, P.t0[i]);
    }
    const got = {
      fold: FOLD.steps.map((s) => ({ score: r2(s.score), fold: s.fold.map(r2) })),
      takeoff: r3(beatAt(2, span)),
      wing: { period: r3(WING.period), phase: r3(TAKEOFF) },
      flock: [r2(t0), r2(t1)],
      streams: CHANNELS.map((_, j) => r2(formAt(j))),
      labels: [5.5, 6, 6.5, 7, 7.5].map((b, j) => ({ t: r3(beatAt(b, span)), channel: CHANNELS[j].id })),
    };
    const off = (a, b) =>
      typeof a === 'number' ? !(Math.abs(a - b) <= 0.03) : typeof a === 'string' ? a !== b : Object.keys(a ?? {}).some((k) => off(a[k], b?.[k]));
    for (const k of Object.keys(got)) {
      if (off(got[k], CUES[k])) console.warn(`[s28] CUES.${k} is ${JSON.stringify(CUES[k])}, the scene gives ${JSON.stringify(got[k])}`);
    }
    if (Math.abs(TAKEOFF - got.takeoff) > 0.01) console.warn(`[s28] TAKEOFF ${TAKEOFF} is off the beat (${got.takeoff})`);
    LABELS.t.forEach((t, j) => {
      if (Math.abs(t - got.labels[j].t) > 0.01) console.warn(`[s28] LABELS.t[${j}] ${t} is off its half-beat (${got.labels[j].t})`);
    });
    // seen from the camera at the end: the five streams at equal angles round the zenith, the gap below
    // it on the crane; each label where LABELS.at puts it
    const c = camAt(END);
    const cv = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 2000);
    setLens(cv, c.lens);
    aim(cv, new THREE.Vector3(c.x, c.y, c.z), new THREE.Vector3(c.x + c.dx, c.y + c.dy, c.z + c.dz));
    cv.updateMatrixWorld();
    const q = new THREE.Vector3();
    const px = (x, y, z) => (q.set(x, y, z).project(cv), [(0.5 + q.x / 2) * 1920, (0.5 - q.y / 2) * 1080]);
    const Z = px(c.x, c.y + 1e5, c.z);
    const ang = ([x, y]) => (((Math.atan2(x - Z[0], Z[1] - y) / DEG) % 360) + 360) % 360;
    const h = heroAt(END);
    const ah = ang(px(h.x, h.y, h.z));
    const R = FLOCK.r.strand;
    [36, -36, 108, -108, 180].forEach((o, j) => {
      const b = streamBearing(j, 1000);
      const a = ang(px(R * Math.cos(b), c.y + 30, R * Math.sin(b)));
      const d = ((a - ah - o + 540) % 360) - 180;
      if (Math.abs(d) > 1) console.warn(`[s28] stream ${j} is ${d.toFixed(1)}° off its place round the zenith at the end`);
    });
    LABELS.at.forEach(([th, rho], j) => {
      const p = labelAt(j, END);
      const [x, y] = px(p.x, p.y, p.z);
      const e = Math.hypot(x - (Z[0] + rho * Math.sin(th * DEG)), y - (Z[1] - rho * Math.cos(th * DEG)));
      if (e > 4) console.warn(`[s28] label ${j} is ${e.toFixed(1)} px off its place at the end`);
    });
  }

  const cam = {};
  const H = {};
  const F = {};
  const lab = {};
  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const hp = new THREE.Vector3();
  const v = new THREE.Vector3();
  const M = new THREE.Matrix4();
  const amb = new THREE.Color(...LOOK27.morning.amb);
  const haze = new THREE.Color(...LOOK28.haze);
  const clear = new THREE.Color(0, 0, 0);
  const AW = FLOCK.away;
  // push p (floor-relative, in place) off the point c to at least R: d → d + R·exp(−(d/R)²), monotone
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
  // the focus on the crane (along the camera's axis)
  const focusAt = (t) => {
    const c = camAt(t);
    const h = heroAt(t, {}, true);
    return Math.max(0.05, (h.x - c.x) * c.dx + (h.y - c.y) * c.dy + (h.z - c.z) * c.dz);
  };
  return {
    scene,
    camera,
    clearColor: clear,
    update(t) {
      camAt(t, cam);
      pos.set(cam.x, Y0 + cam.y, cam.z);
      tgt.set(pos.x + cam.dx, pos.y + cam.dy, pos.z + cam.dz);
      setLens(camera, cam.lens);
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 100 + S27 + t;
      // the light
      const m = smoothstep(...LOOK28.skyT, t);
      const el = Math.asin(clamp(cam.dy, -1, 1)) / DEG;
      U.uFogD.value = curve(LOOK28.fog, t);
      U.uFogCol.value.copy(haze).multiplyScalar(smoothstep(...LOOK28.hazeEl, el));
      clear.copy(U.uFogCol.value);
      U.uAmb.value.copy(amb).multiplyScalar(lerp(1, LOOK28.amb, m));
      sky.value.setRGB(...LOOK28.sky).multiplyScalar(m);
      for (let k = K0; k <= K1; k++) lib.setFloor(k, { lamp: lampAt(k, S27 + t) });
      lh.set(sheetState(S27 + t));
      lh.update(camera);
      // the crane
      heroAt(t, H);
      hp.set(H.x, Y0 + H.y, H.z);
      craneMatrix(hp, H.yaw, H.pitch, H.bank, M);
      hero.pose(H.phi, H.tau, M, H.psi);
      HU.uShot.value = S27 + t;
      HU.uMix.value = smoothstep(...LOOK28.mix, t);
      SCORES.forEach((s, i) => {
        const [drawn, k] = scoreAt(t, s.fold);
        const a = SEG[i];
        HU.uScore.value[i].set(a.x, a.y, lerp(a.x, a.z, drawn), lerp(a.y, a.w, drawn));
        HU.uScoreK.value[i] = drawn > 0 ? k : 0;
      });
      L.trayUniforms.uShade.value.x = 0.6 * foldAt(t).shade;
      // the words, and their light on the cranes about them
      for (let j = 0; j < STREAMS; j++) {
        labelAt(j, t, lab);
        v.set(lab.x, Y0 + lab.y, lab.z);
        labels.set(j, v, lab.width, lab.light, lab.wipe);
        lime.value[j].set(v.x, v.y, v.z, LOOK28.lime * lab.light * clamp(lab.wipe, 0, 1));
      }
      // the flock: each crane headed along its path, pitched with its climb, banked into its turn
      let n = 0;
      for (let i = 0; i < P.n; i++) {
        if (!flockPose(P, i, t, F)) continue;
        away(F, cam.x, cam.y, cam.z, AW.cam);
        away(F, H.x, H.y, H.z, AW.hero);
        v.set(F.x, Y0 + F.y, F.z);
        craneMatrix(v, F.yaw, F.pitch, F.bank, M, P.size[i] * smoothstep(0, FLOCK.grow, F.tau));
        flock.set(n++, M, stroke(t / P.per[i] + P.ph[i], P.mid[i], P.amp[i]));
      }
      flock.commit(n);
      dust.update(camera, 100 + S27 + t, { focus: focusAt(t), fstop: cam.fstop, width: ctx.width, intensity: LOOK.dust * LOOK27.dust });
    },
    post(t) {
      const m = smoothstep(...LOOK28.skyT, t);
      const el = Math.asin(clamp(camAt(t).dy, -1, 1)) / DEG;
      const [d0, d1, d2, d3] = LOOK28.dipT;
      const dip = LOOK28.dip * smoothstep(d0, d1, t) * (1 - smoothstep(d2, d3, t));
      return {
        exposure: grade.exposure + lerp(...LOOK28.ev, smoothstep(...LOOK28.evEl, el)) + dip,
        whiteBalance: { temperature: lerp(LOOK28.wb[0], LOOK28.wb[1], m) },
        dof: { focus: focusAt(t), fstop: curve(CAM.fstop, t) },
      };
    },
  };
}

// Sound cues, s into the shot (global frame = 2376 + 24 t).
export const CUES = {
  cut: { t: 0 }, // nothing to hear: s27's last frame goes on (the printed letter on the plate, from above)
  fold: FOLD.steps.map((s) => ({ step: s.step, score: s.score, fold: s.fold })), // each step: its creases scored by the light (a lime line drawn over 0.14 s), then folded over `fold`
  takeoff: TAKEOFF, // beat 2: the first downstroke, the crane leaves the plate
  wing: { period: +WING.period.toFixed(4), phase: TAKEOFF }, // its wings at 72 BPM from the takeoff: a downstroke at phase + k·period
  flock: [2.03, 3.15], // the flock takes off, a ripple round the shaft from the crane's plate: the first launch and the last
  streams: [4.27, 4.73, 5.18, 5.63, 6.08], // each stream starts to form (over 2 s; half-formed as its word is written)
  labels: LABELS.t.map((t, j) => ({ t, channel: CHANNELS[j].id })), // each word written in the air (0.42 s), on the half-beats 5½–7½
};
