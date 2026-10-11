// s43 · 2:59–3:05 · 千灯 (global 4296–4439, 144 frames) — lang: only the cards' prints change with ctx.lang
//
// The screenplay: hundreds of agents clip their ribbons and the lamps light one after another; somewhere a
// lamp flashes red and a small repair light flies over and mends it; the site's pages flash past. Here the
// lime s41 lit on floor 27 runs up and down the whole well, faster on every beat; one dead lamp of floor 27
// comes on red (the film's only alarm) and the repair light mends it (the site's ops, healing itself); two
// sheets of printed light carry the membership page (its tracking row: 情报追踪; its tiers: 会员); then the
// whole well, the lime pouring down it to the lighthouse, and a hard cut to s44.
//
// The beat: 90 → 180 BPM, exponentially, thirteen beats in the six seconds (beatT(b) = 6·log2(1 + b/13));
// the thirteenth is s44's t = 0. Five shots, each cut on the frame nearest a beat (CUES.cuts):
//   wide   f0–42   beat 0  in the void across from corner 2, backing off and rising, 20 mm: floor 27 lime,
//                          26, 25, 24 … lighting in turn; on beat 2 lamp 27:14 comes on red
//   alarm  f43–67  beat 3  a cut in toward the lamp from the void (9 → 8.4 m off, 30° round from the wide's
//                          line, 15° above it), 40 mm f/2 on the lamp, its lit shelves behind it: the repair
//                          light (agentbody's 'repair') settles beside it, lays its beam, the red turns lime
//   track  f68–78  beat 5  a sheet of printed light over the void (210° side): the tracking row, the rows
//                          either side dimmed; a reader holds one end; 40 mm f/2.8
//   tiers  f79–88  beat 6  the same, with the table of tiers
//   well   f89–143 beat 7  from floor 8 straight down the shaft: the lime floods in from the frame's edges
//                          and runs down to the lighthouse, the lens zooming after it (20 → 80 mm); the
//                          lantern comes up as a star at the bottom on beat 12.25
//
// First frame (for s42 to cut from): the camera in the void 2 m from the axis on the 300° side, 3.4 m above
// floor 27's deck, 20 mm, looking across at corner 2's lamp (27:14, bearing 120°, dark: one of the library's
// dead lamps); floor 27 wholly lime (setFloor), every other floor as s17 left them (amber, the books dark);
// fog 0.004, black; uLampI × 0.45 (s44's cast), lit glow 1.3; act III's grade (1.2 EV). Luma mean 14.7
// (median 0.4: the lit band of floor 27 across the middle third, 31.6; top 3.8, bottom 8.6), RGB (14, 16, 8).
// Last frame (s44 cuts in low beside the lighthouse, looking up at the lantern): every floor lime (the
// library's dead lamps stay dark, as in s44), the lantern a star at (0.5, 0.6); RGB mean 32.0 (s44's first
// frame: 32.7), luma 41.3 (42.2). Over the well the grade eases from act III's to act IV's with s44's
// shadow tint, 1.2 → 0.7 EV, so the cut changes the picture and not the stock.
//
// Light: steel never shows above 1, only the lime burns. Far readers are given back the energy the
// renderer's pixel floor takes from points finer than a pixel (kept(): glow × up to 30, ribbon × up to 120,
// over the swarm's folding gain), so a far reader's core shows at about 0.5, as a near one's does.
// Flashes: the red pulses at 2 Hz on a raised cosine, the globe about 0.9 % of the frame, its light on the
// stone × 0.3; close up the globe is turned down (× 0.6) so the red never clips. Each sheet prints in and out within its 10–11 frames (in over 0.3 of the shot, out over its
// last 0.28), under a quarter of the frame, cut clear of the masthead (its date) and of the dock.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep, smootherstep, envelope } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { HEX, lin } from 'film/lib/palette.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';
import { AgentBody, AgentSwarm, hover } from 'world/agentbody.js';
import { PLACE } from 'world/e1_place.js';
import { OneLamp, HazeGlow, lampPos } from 'world/d_lamps.js';
import { PrintCard } from 'world/d_card.js';
import { LOOK17 } from './s17.js';
import { FLOOR, Y0 } from './s13.js';
import { LOOK as LOOK44, K_TOP, CAM as CAM44 } from './s44.js';

export const meta = { frames: 144, quality: { final: { samples: 8 } } };

const DEG = Math.PI / 180;
const END = meta.frames / 24;

// ---------------------------------------------------------------------------------------- the beat
// 90 BPM speeding up to 180 by s44's downbeat, exponentially: thirteen beats in the six seconds, the
// thirteenth s44's t = 0 (the tutti). beats(t) counts them; beatT(b) is when beat b falls.
const NB = 13;
export const beats = (t) => NB * (2 ** (t / END) - 1);
export const beatT = (b) => END * Math.log2(1 + b / NB);

// The montage: five shots, each cut on a beat (the frame nearest it). A shot runs from its first frame
// f0; within it, its own clock is t − f0 / 24.
export const SEGS = [
  { name: 'wide', beat: 0 }, // the lamps go on round floor 27, the camera pulls back; one lamp turns red
  { name: 'alarm', beat: 3 }, // the red lamp; the repair light comes and mends it
  { name: 'track', beat: 5 }, // a card: the site's keyword-or-project tracking (情报追踪)
  { name: 'tiers', beat: 6 }, // a card: the site's membership tiers (会员)
  { name: 'well', beat: 7 }, // the whole well, the lime pouring down it to the lighthouse
].map((s) => ({ ...s, f0: Math.round(beatT(s.beat) * 24) }));
// which shot frame f (or a sample of it: the shutter stays within a quarter frame of it) belongs to
export function segAt(t) {
  const f = Math.round(t * 24);
  let i = 0;
  while (i + 1 < SEGS.length && f >= SEGS[i + 1].f0) i++;
  return i;
}

// ---------------------------------------------------------------------------------------- the lamps
// The lime spreads from floor 27 (s41's, lit from the first frame) up and down the shaft: a floor each way
// on the first beat, then 37.5 % more every beat (d floors by beat b: (1.375^b − 1) / 0.375), so the
// bottom of the shaft (floor −102) lights on beat 12.25 and the top (120) on 11.25. A floor lights on the
// sixteenth after its time (the music's semiquavers), over WAVE.fade seconds; its readers clip their
// ribbons just before.
export const WAVE = { k0: PLACE.DUSTY, grow: 1.375, fade: 0.12 };
export const K_BOTTOM = FLOOR - 2;
export function floorBeat(k) {
  const d = Math.abs(k - WAVE.k0);
  if (d === 0) return -Infinity;
  const b = Math.log(1 + d * (WAVE.grow - 1)) / Math.log(WAVE.grow);
  return Math.ceil(b * 4 - 1e-6) / 4;
}
export const floorT = (k) => (k === WAVE.k0 ? -Infinity : beatT(floorBeat(k)));
export const litAt = (k, t) => (k === WAVE.k0 ? 1 : smoothstep(floorT(k), floorT(k) + WAVE.fade, t));

// ---------------------------------------------------------------------------------------- the alarm
// One lamp of floor 27 is dead from the start (the library's own one in thirty: lamp 14, the shaft lamp on
// its bracket at corner 2). On beat 2 it comes on red, the film's only alarm, swelling and sinking twice a
// second (a raised cosine, never a square wave). The repair light flies to it, lays its fix beam on it,
// and the red gives way to the lime of the rest of its floor. Close up (the alarm sub-shot) the globe is
// turned down to `near` of its level, its light on the stone kept, so that only lime ever clips.
export const ALARM = { k: PLACE.DUSTY, j: 14, hz: 2, level: 0.14, near: 0.6, low: 0.3, t0: beatT(2), rise: 0.2, cast: 0.3 };
export const MEND = { fly: [beatT(3) - 0.25, beatT(4) - 0.06], beam: [beatT(4) - 0.04, beatT(4) + 0.34], turn: [beatT(4) + 0.1, beatT(4) + 0.32], lime: 0.6 };
const RED = lin(HEX.alarm);
// the red lamp's level at t (0 once it is mended), and how far it has turned lime (0..1)
export const mended = (t) => smootherstep(MEND.turn[0], MEND.turn[1], t);
export function alarmAt(t) {
  const on = smoothstep(ALARM.t0, ALARM.t0 + ALARM.rise, t);
  const pulse = ALARM.low + (1 - ALARM.low) * (0.5 - 0.5 * Math.cos(2 * Math.PI * ALARM.hz * (t - ALARM.t0)));
  return ALARM.level * on * pulse * (1 - mended(t));
}

// ---------------------------------------------------------------------------------------- the readers
// About three thousand light bodies, each holding a station on its floor: most over the void at the rail
// (the ones a look down the well can see), the rest at the shelves; more of them on the floors the camera
// comes near (20–34 for the first shots, 9 and below for the last). Each clips its ribbon (a lime hand)
// a moment before its floor lights and keeps a little of it.
const perFloor = (k) => (k >= 20 && k <= 34 ? 56 : k >= -12 && k <= 9 ? 40 : 8);
export function stations(keepOut = []) {
  const out = [];
  for (let k = K_BOTTOM; k <= K_TOP; k++) {
    for (let n = 0; n < perFloor(k); n++) {
      const h = (c) => hash(k + 600, n, 430 + c);
      const side = Math.floor(h(0) * 6) % 6;
      const a = (30 + 60 * side) * DEG; // the side's normal
      const shelf = h(2) < 0.42 && side !== 1 && side !== 4; // sides 1 and 4 are doorways: no shelves
      const ap = shelf ? 17.3 + 0.9 * h(3) : LIB.AS - 0.5 - 1.6 * h(3) * h(3);
      const s = (h(1) * 2 - 1) * 0.86 * ap * Math.tan(30 * DEG); // along the side
      const p = [ap * Math.cos(a) - s * Math.sin(a), k * LIB.H + (shelf ? 0.7 + 3.6 * h(4) : 0.6 + 2.4 * h(4)), ap * Math.sin(a) + s * Math.cos(a)];
      if (keepOut.some(([c, r]) => Math.hypot(p[0] - c.x, p[1] - c.y, p[2] - c.z) < r)) continue;
      // facing the books (yaw 0 faces +Z); lead: how long before its floor lights it clips its ribbon
      out.push({ p, k, yaw: Math.atan2(Math.cos(a), Math.sin(a)), lead: 0.06 + 0.26 * h(5), keep: 0.18 + 0.2 * h(6) });
    }
  }
  return out;
}
// a reader's ribbon at t: up over 0.08 s, then sinking to what it keeps
export function ribbonAt(st, t) {
  const t0 = st.k === WAVE.k0 ? -1 - st.lead : floorT(st.k) - st.lead;
  if (t <= t0) return 0;
  return smoothstep(t0, t0 + 0.08, t) * lerp(1, st.keep, smoothstep(t0 + 0.1, t0 + 0.6, t));
}

// ---------------------------------------------------------------------------------------- the cameras
const Y27 = PLACE.DUSTY * LIB.H;
const LAMP_P = lampPos(ALARM.k, ALARM.j);
const UP = new THREE.Vector3(0, 1, 0);
const ring = (deg, r, y, out = new THREE.Vector3()) => out.set(r * Math.cos(deg * DEG), y, r * Math.sin(deg * DEG));

// wide: in the void across from the lamp, backing away from it and rising; the eye follows the lime down
export const WIDE = { bearing: 300, r: [2, 8.5], y: [3.4, 11.5], drop: [0.4, 7.5], focal: 20 };
// alarm: a cut in toward the lamp from the void, above it and a little round from the wide shot's line,
// looking down at it against its pillar and the corner of the well below. d: from the lamp (m); az: round
// from the line in to the axis (deg); el: above the lamp (deg); side, lift: where the eye rests from the
// lamp (m: right, up)
export const NEAR = { d: [9.0, 8.4], az: [34, 30], el: [16, 14], side: 0.6, lift: -0.3, focal: 40, fstop: 2 };
const LAMP_IN = new THREE.Vector3(-LAMP_P.x, 0, -LAMP_P.z).normalize(); // from the lamp in to the axis
const LAMP_T = new THREE.Vector3().crossVectors(UP, LAMP_IN);
export function nearAt(u, out = new THREE.Vector3()) {
  const d = lerp(NEAR.d[0], NEAR.d[1], u), az = lerp(NEAR.az[0], NEAR.az[1], u) * DEG, el = lerp(NEAR.el[0], NEAR.el[1], u) * DEG;
  return out
    .copy(LAMP_P)
    .addScaledVector(LAMP_IN, d * Math.cos(el) * Math.cos(az))
    .addScaledVector(LAMP_T, d * Math.cos(el) * Math.sin(az))
    .addScaledVector(UP, d * Math.sin(el));
}
// the cards: sheets of printed light over the void on the 210° side, facing out; the camera between them
// and the rail, looking back across the shaft
export const SHEET = { bearing: 210, r: 7.3, y: 2.4 };
export const CARDS = {
  // width (m); d: the camera's distance; yaw, tilt (deg): how the sheet is turned from square-on; truck:
  // the camera's drift across it (m); hold: which end the reader holds (−1 left, 1 right); dim: the rest
  // of the sheet against the marked row; fstop: the lens
  // (aim: the eye rests this far right of the sheet's middle, m: toward the reader)
  track: { width: 1.9, d: 3.0, yaw: -14, tilt: 4, truck: [-0.12, 0.12], aim: -0.2, focal: 40, hold: -1, dim: 0.35, fstop: 2.8 },
  tiers: { width: 1.5, d: 3.35, yaw: 16, tilt: 6, truck: [0.1, -0.1], aim: 0.18, focal: 40, hold: 1, dim: 1, fstop: 2.8 },
};
const SHEET_P = ring(SHEET.bearing, SHEET.r, Y27 + SHEET.y);
const SHEET_N = ring(SHEET.bearing, 1, 0); // out from the axis: toward the camera
const SHEET_R = new THREE.Vector3().crossVectors(UP, SHEET_N); // the camera's right
// well: on floor 8, just above where the lime has come to, looking straight down the shaft at the
// lighthouse; it rises a little, turns a little and zooms after the lime. vp: how far under the middle of
// the frame the bottom of the well sits (of half the frame's height); head: which way the frame's top faces
export const WELL = { k: 8, bearing: 205, r: 1.2, y: [2.5, 8.5], head: [24, 36], focal: [20, 80], zoom: 1.3, vp: 0.22 };

// The repair light's flight, in the alarm shot's frame at the lamp (m: to the right of the lamp, above it,
// toward the camera): up out of the void below to its place beside the lamp, on an arc; once the lamp is
// mended it backs off a little.
export const REPAIR = { scale: 1.4, from: [-3.5, -5, 4], at: [1.1, 0.15, 0.6], arc: 0.6, back: 0.25 };
const NEAR_F = new THREE.Vector3()
  .subVectors(LAMP_P, nearAt(0.5))
  .setY(0)
  .normalize();
const NEAR_R = new THREE.Vector3().crossVectors(NEAR_F, UP);
export function repairAt(t, out = new THREE.Vector3()) {
  const w = 1 - (1 - clamp((t - MEND.fly[0]) / (MEND.fly[1] - MEND.fly[0]))) ** 3;
  const back = REPAIR.back * smoothstep(MEND.turn[1], MEND.turn[1] + 0.5, t);
  const at = (c) => lerp(REPAIR.from[c], REPAIR.at[c], w);
  return out
    .copy(LAMP_P)
    .addScaledVector(NEAR_R, at(0) + back)
    .addScaledVector(UP, at(1) + REPAIR.arc * Math.sin(Math.PI * w))
    .addScaledVector(NEAR_F, -at(2) - back);
}

// What the two sheets carry, cut from the capture (px, as the manifest's regions): the tracking row with
// the rows above and below it, and the table of tiers. Both stop short of the masthead (its date is not to
// be read) and of the dock.
export function cardCrops(R) {
  const x = R.tracking[0] - 26;
  const w = R.tracking[2] + 52;
  const rows = R.rows.map((r) => r.box);
  const i = rows.findIndex((b) => b[1] === R.tracking[1]);
  if (i < 1 || i + 1 >= rows.length) throw new Error('[s43] the tracking row is not among the rows');
  const top = Math.min(...R.tiers.map((c) => c.box[1])) + 10;
  const bottom = Math.max(...R.tiers.map((c) => c.box[1] + c.box[3])) + 14;
  const crops = {
    track: [x, rows[i - 1][1] - 12, w, rows[i + 1][1] + rows[i + 1][3] - rows[i - 1][1] + 24],
    tiers: [x, top, w, bottom - top],
  };
  for (const c of Object.values(crops)) {
    if (c[1] < R.masthead[1] + R.masthead[3] + 20 || c[1] + c[3] > R.dock[1] - 20) throw new Error('[s43] a card reaches the masthead or the dock');
  }
  return crops;
}
// a card's print over its shot (u 0..1): up over the first FLASH.in of it, down from FLASH.out
export const FLASH = { in: 0.3, out: 0.72 };
export const flashAt = (u) => smoothstep(0, FLASH.in, u) * (1 - smoothstep(FLASH.out, 1, u));

const _f = new THREE.Vector3();
// the camera at t: st.seg (which shot), st.u (how far through it; a shutter sample just before a cut's
// frame is a little under 0), st.pos, st.tgt, st.focal
export function cameraAt(t, st) {
  const i = segAt(t);
  const f0 = SEGS[i].f0;
  const f1 = i + 1 < SEGS.length ? SEGS[i + 1].f0 : meta.frames;
  const u = (t * 24 - f0) / (f1 - f0);
  st.seg = i;
  st.u = u;
  const name = SEGS[i].name;
  if (name === 'wide') {
    const e = lerp(u, u * u, 0.6);
    ring(WIDE.bearing, lerp(WIDE.r[0], WIDE.r[1], e), Y27 + lerp(WIDE.y[0], WIDE.y[1], e), st.pos);
    st.tgt.copy(LAMP_P);
    st.tgt.y -= lerp(WIDE.drop[0], WIDE.drop[1], e);
    st.focal = WIDE.focal;
  } else if (name === 'alarm') {
    nearAt(u, st.pos);
    _f.subVectors(LAMP_P, st.pos).setY(0).normalize();
    st.tgt.crossVectors(_f, UP).multiplyScalar(NEAR.side).add(LAMP_P);
    st.tgt.y += NEAR.lift;
    st.focal = NEAR.focal;
  } else if (name === 'track' || name === 'tiers') {
    const C = CARDS[name];
    st.pos.copy(SHEET_P).addScaledVector(SHEET_N, C.d).addScaledVector(SHEET_R, lerp(C.truck[0], C.truck[1], u));
    st.pos.y += 0.05;
    st.tgt.copy(SHEET_P).addScaledVector(SHEET_R, C.aim);
    st.focal = C.focal;
  } else {
    const e = 1 - (1 - u) * (1 - u);
    ring(WELL.bearing, WELL.r, WELL.k * LIB.H + lerp(WELL.y[0], WELL.y[1], e), st.pos);
    st.focal = WELL.focal[0] * (WELL.focal[1] / WELL.focal[0]) ** (Math.max(u, 0) ** WELL.zoom);
    const off = Math.atan((WELL.vp * 10.125) / st.focal); // 10.125 mm: half the frame's height on the sensor
    const head = lerp(WELL.head[0], WELL.head[1], u) * DEG;
    st.tgt.set(Math.cos(head) * Math.sin(off), -Math.cos(off), Math.sin(head) * Math.sin(off)).multiplyScalar(100).add(st.pos);
  }
  return st;
}

// ---------------------------------------------------------------------------------------- the look
// Floors not yet reached are act III's (amber lamps, low); a floor the lime has reached is s44's. The
// lamps cast s44's share of their light on the stone throughout. The air: act III's dark until the last
// shot, where it is s44's (thin, so the eye sees to the bottom), its lime haze coming up with the lamps.
export const LOOK = {
  fogD: 0.004, // the first four shots (they see no farther than across the shaft)
  exposure: { wide: 1.2, alarm: 1.2, track: 0.85, tiers: 0.85, well: [1.2, 0.7] }, // (the cards' shots: the shaft held down behind the sheet)
  card: 0.7, // the sheets' printed light (world/d_card.js: glow)
  lantern: [beatT(12.25) - 0.05, beatT(12.25) + 0.18], // the lighthouse's lamp comes on as the lime reaches its deck
  star: { radius: 30, y: 9, core: 5, level: 0.45, col: [0.74, 1.0, 0.3] }, // its light in the haze above the lantern (world/d_lamps.js: HazeGlow)
  swarm: 0.9, // the readers' glow (steel: never above 1)
  size: 1.5, // the readers' size (× agentbody's 0.43 m cage)
  far: [30, 120], // how much of what the pixel floor takes a far reader is given back: core, ribbon
  ribbon: 1, // the ribbons' lime
};
function floorState(k, t) {
  if (k > K_TOP + 1) return { lit: 0, lamp: 0, lime: 1 };
  const w = litAt(Math.min(k, K_TOP), t);
  if (k === K_TOP + 1) return { lit: w, lamp: 0, lime: 1 }; // the mouth's inscription band
  return { lit: w * (0.85 + 0.15 * hash(k, 441)), lamp: lerp(LOOK17.lamp, LOOK44.lamp * (0.9 + 0.1 * hash(k, 442)), w), lime: w };
}

// ---------------------------------------------------------------------------------------- the sound
// s into the shot (global frame = 4296 + 24 t). setup works these out again from the shot and warns if
// they have drifted.
export const CUES = {
  cut: { t: 0 }, // hard cut in from s42 (floor 27 already lime)
  cuts: [1.79, 2.83, 3.29, 3.71], // the montage's own cuts, each on a beat (3, 5, 6, 7): alarm, track, tiers, well
  lamps: [0.64, 5.75], // the first floor after 27 lights … the last (the lighthouse's, −102); faster every beat
  alarm: { t: 1.24, hz: 2 }, // the dead lamp comes on red and pulses, twice a second
  repair: { t: 2.42, fly: [1.55, 2.26], beam: [2.28, 2.66] }, // t: the red gives way to lime
  ui: [
    { t: 2.83, page: 's43-membership', region: 'tracking' }, // 情报追踪: the keyword-or-project tracking row
    { t: 3.29, page: 's43-membership', region: 'tiers' }, // 会员: the tiers
  ],
  lantern: 5.7, // the lighthouse's lamp comes up at the bottom of the well (s44's tutti is its t = 0)
};

// the cues as the shot plays them: [what, got, want]
export function cuesGot() {
  const out = [];
  const near = (what, got, want) => out.push([what, +got.toFixed(2), want]);
  const firstT = (fn) => {
    for (let f = 0; f <= meta.frames * 50; f++) if (fn(f / 1200)) return f / 1200;
    return NaN;
  };
  let n = 0;
  for (let f = 1; f < meta.frames; f++) if (segAt(f / 24) !== segAt((f - 1) / 24)) near(`cuts[${n}]`, f / 24, CUES.cuts[n++]);
  if (n !== CUES.cuts.length) out.push(['cuts.length', n, CUES.cuts.length]);
  const ks = [];
  for (let k = K_BOTTOM; k <= K_TOP; k++) if (k !== WAVE.k0) ks.push(k);
  near('lamps[0]', firstT((t) => ks.some((k) => litAt(k, t) > 0)), CUES.lamps[0]);
  near('lamps[1]', firstT((t) => ks.every((k) => litAt(k, t) > 0)), CUES.lamps[1]);
  near('alarm.t', firstT((t) => alarmAt(t) > 0), CUES.alarm.t);
  near('repair.t', firstT((t) => mended(t) > 0), CUES.repair.t);
  CUES.ui.forEach((c, i) => {
    const s = SEGS.findIndex((x) => x.name === (c.region === 'tracking' ? 'track' : 'tiers'));
    near(`ui[${i}].t`, SEGS[s].f0 / 24, c.t);
  });
  near('lantern', firstT((t) => smoothstep(LOOK.lantern[0], LOOK.lantern[1], t) > 0), CUES.lantern);
  return out;
}

export async function setup(ctx) {
  for (const [what, got, want] of cuesGot()) if (Math.abs(got - want) > 0.02) console.warn(`[s43] CUES.${what}: got ${got}, want ${want}`);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 4000);

  const lib = new Library({ floors: [K_BOTTOM, K_TOP], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  const U = lib.uniforms;
  // The film carries no credits: the credit once carved in floor 0's rail (library.js: PLAQUE) is drawn
  // only while uPlaqueK.x > 0. It is held off here and checked every frame (update throws), as in s44.
  U.uPlaqueK.value.set(0, 0, 0);
  U.uPlaque.value = null;
  U.uLampI.value *= LOOK44.cast;
  U.uLitGlow.value = LOOK44.lit;

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);
  // from the top of the well the lantern's roof hides its lamp: what shows is its light in the haze
  const star = new HazeGlow({ radius: LOOK.star.radius, core: LOOK.star.core, depth: false });
  star.mesh.position.set(0, Y0 + LOOK.star.y, 0);
  scene.add(star.mesh);
  const STAR = new THREE.Color(...LOOK.star.col); // the lantern's lamp (0.86, 1, 0.62) gone lime through the haze

  // the one red lamp, and the library's floors lit by it too
  const lamp = new OneLamp(lib, ALARM).attach(lib);
  scene.add(lamp.group);
  const LIME = U.uLampLime.value.clone();
  const lampCol = new THREE.Color();

  // the readers (none near the red lamp, the sheets or the camera that looks at them)
  const sheetCam = SHEET_P.clone().addScaledVector(SHEET_N, 3);
  const nearCam = nearAt(0);
  const ST = stations([[LAMP_P, 3], [nearCam, 2.5], [SHEET_P, 3.6], [sheetCam, 2.6]]);
  const swarm = new AgentSwarm({ count: ST.length, seed: 43, kinds: 9, size: [0.85, 1.15], scale: LOOK.size, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(swarm.group);
  const place = hover({ stations: ST.map((s) => s.p), bob: 0.05, drift: 0.1, seed: 43 });
  // A reader far from the lens is a point narrower than a pixel, and the pixel floor spreads its light thin
  // (agentbody.js: uMinPx). Here each is given back what the floor takes, up to LOOK.far, so the thousand
  // of them stay points of light down the shaft: the core never above its own brightness (steel stays
  // under 1), the ribbon lime (which may burn). The floor is set by the frame's height, so 4K draws what
  // 1080 draws.
  const minPx = Math.max(0.75, (0.75 * ctx.height) / 1080);
  swarm.uniforms.uMinPx.value = minPx;
  let pxm = 1; // pixels per metre at 1 m from the lens (update sets it)
  const kept = (sig, d, cap) => clamp((minPx * d / (sig * pxm)) ** 2, 1, cap);
  const attr = (i, t, o) => {
    const s = ST[i];
    const d = Math.hypot(s.p[0] - st.pos.x, s.p[1] - st.pos.y, s.p[2] - st.pos.z);
    // (a body under 12 px folds into its core, which agentbody.js brightens by up to 1 + 1.2: taken off here)
    const fold = 1 + 1.2 * (1 - smoothstep(4, 12, (0.43 * LOOK.size * pxm) / d));
    o.glow = kept(0.008 * LOOK.size, d, LOOK.far[0]) / fold;
    o.lime = LOOK.ribbon * ribbonAt(s, t) * kept(0.004 * LOOK.size, d, LOOK.far[1]);
    o.yaw = s.yaw;
  };

  // the repair light (agentbody's 'repair' variant), flying its arc to the red lamp
  const fixer = new AgentBody({ variant: 'repair', scale: REPAIR.scale, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(fixer.group);
  const fixP = new THREE.Vector3();
  const lampAt = LAMP_P.toArray();

  // the grade: act III's, until the lime runs down the well; from there it eases into act IV's as s44 opens
  // on it (its shadow tint), so the hard cut to s44 changes the picture and not the film stock
  const grades = (await ctx.load.json('/film/timeline.json')).grades;
  const G3 = grades.act3;
  const G4 = { ...grades.act4, grade: { ...grades.act4.grade, shadowTint: LOOK44.shadows } };
  const blend = (a, b, k) =>
    typeof b === 'number' ? lerp(a ?? b, b, k) : Array.isArray(b) ? b.map((v, i) => lerp(a?.[i] ?? v, v, k)) : Object.fromEntries(Object.keys(b).map((key) => [key, blend(a?.[key], b[key], k)]));
  const gradeAt = (k) => {
    const g = {};
    for (const key of ['whiteBalance', 'bloom', 'halation', 'vignette', 'grade']) g[key] = blend(G3[key], G4[key], k);
    return g;
  };

  // the cards: the membership page (the only capture this shot uses) on two sheets, and the reader that
  // holds them up
  const entry = (await ctx.load.json('/assets/ui/manifest.json')).entries.find((e) => e.name === 's43-membership' && e.lang === ctx.lang);
  if (!entry) throw new Error(`[s43] no s43-membership capture for '${ctx.lang}'`);
  const tex = await ctx.load.texture(`/assets/ui/${ctx.lang}/s43-membership.png`, { srgb: true, anisotropy: 8 });
  const crops = cardCrops(entry.regions);
  const cards = {};
  for (const name of ['track', 'tiers']) {
    const C = CARDS[name];
    const card = new PrintCard({ tex, size: entry.size, crop: crops[name], width: C.width, look: { glow: LOOK.card } });
    card.mesh.quaternion
      .setFromRotationMatrix(new THREE.Matrix4().makeBasis(SHEET_R, UP, SHEET_N))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-C.tilt * DEG, C.yaw * DEG, 0, 'YXZ')));
    card.mesh.position.copy(SHEET_P);
    card.mesh.visible = false;
    card.mesh.updateMatrixWorld(true);
    scene.add(card.mesh);
    // the reader at one end of it, a hand on its edge
    const e = C.hold * (C.width / 2);
    card.reader = card.mesh.localToWorld(new THREE.Vector3(e + C.hold * 0.36, -0.04, 0.14)).toArray();
    card.edge = card.mesh.localToWorld(new THREE.Vector3(e - C.hold * 0.02, 0.02, 0.012)).toArray();
    cards[name] = card;
  }
  cards.track.mark(entry.regions.tracking, CARDS.track.dim);
  const reader = new AgentBody({ detail: 'mid', seed: 43, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(reader.group);

  const st = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), focal: 20, seg: 0, u: 0 };

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      if (U.uPlaqueK.value.x !== 0 || U.uPlaque.value) throw new Error('[s43] the carved credit is switched on');
      cameraAt(t, st);
      setLens(camera, st.focal);
      aim(camera, st.pos, st.tgt);
      camera.updateMatrixWorld(true);
      pxm = camera.projectionMatrix.elements[5] * 0.5 * ctx.height;
      const well = SEGS[st.seg].name === 'well';

      lib.setAll((k) => floorState(k, t));
      const haze = well ? smoothstep(beatT(7), beatT(12.25), t) : 0;
      U.uFogD.value = well ? LOOK44.fogD : LOOK.fogD;
      U.uFogCol.value.setRGB(...LOOK44.fog).multiplyScalar(haze);
      U.uAmb.value.setRGB(...LOOK44.amb).multiplyScalar(haze);

      // the red lamp: red while the alarm lasts, lime once it is mended
      const m = mended(t);
      const close = SEGS[st.seg].name === 'alarm' ? ALARM.near : 1;
      const red = alarmAt(t) * close;
      const lv = red + m * MEND.lime;
      const kr = red / Math.max(lv, 1e-4);
      const kl = (m * MEND.lime) / Math.max(lv, 1e-4);
      lampCol.setRGB(RED.r * kr + LIME.r * kl, RED.g * kr + LIME.g * kl, RED.b * kr + LIME.b * kl);
      // dead until the alarm (the library's own dark globe); red, it throws only a little of its light on
      // the stone (the red stays small); lime, as much as any lamp
      lamp.set(lampCol, lv > 1e-4 ? lv : 0, lerp(ALARM.cast / close, 1, m));

      const on = smoothstep(LOOK.lantern[0], LOOK.lantern[1], t);
      lh.set({ angle: CAM44.bearing - 8 * DEG, glow: 1, beam: 0, vol: 0, trail: 0, dot: 1, windows: 1, bounce: 1.2, lamp: LOOK44.lantern * on, halo: LOOK44.halo });
      star.set(STAR, LOOK.star.level * on).update(camera);
      lib.update(camera);
      lh.update(camera);
      swarm.set({ time: t, place, glow: LOOK.swarm, attr });
      swarm.update(camera);

      // the repair light: it sets out while the wide shot still runs and is gone with the alarm shot
      const name = SEGS[st.seg].name;
      const flying = t >= MEND.fly[0] && (name === 'wide' || name === 'alarm');
      fixer.group.visible = flying;
      if (flying) {
        repairAt(t, fixP);
        fixer.set({ time: t, pos: fixP.toArray(), face: lampAt, glow: smoothstep(MEND.fly[0], MEND.fly[0] + 0.2, t), fix: envelope(t, MEND.beam[0], MEND.beam[1], 0.08, 0.14), target: lampAt });
        fixer.update(camera);
      }

      // the cards, each in its own shot, and the reader holding the one that shows
      for (const [n, c] of Object.entries(cards)) {
        c.mesh.visible = n === name;
        if (n === name) c.set({ k: flashAt(st.u) });
      }
      const card = cards[name];
      reader.group.visible = !!card;
      if (card) {
        reader.set({ time: t, pos: card.reader, face: card.edge, glow: 1, reach: 1, reachAt: card.edge, ribbon: 1 });
        reader.update(camera);
      }
    },
    post(t) {
      const name = SEGS[segAt(t)].name;
      const e = LOOK.exposure[name];
      const C = CARDS[name];
      const k = name === 'well' ? smoothstep(beatT(7), END, t) : 0;
      return {
        ...(k > 0 ? gradeAt(k) : {}),
        exposure: Array.isArray(e) ? lerp(e[0], e[1], k) : e,
        dof: C ? { focus: focusDistance(camera, SHEET_P), fstop: C.fstop } : name === 'alarm' ? { focus: focusDistance(camera, LAMP_P), fstop: NEAR.fstop } : null,
      };
    },
  };
}
