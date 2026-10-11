// s31 鱼群 (the school): global 2904–3047, 144 frames (6 s), 2:01–2:07, act 3 (the act's grade, no letterbox).
// Then dozens, then hundreds: the machine readers pour out of side 1's doorway on floor PLACE.K like a school of
// fish (agentbody.js's crowd tier: the nine cages of the nine kinds of MCP client the site connects, no text; 300
// out of the door in three waves, 40, 110, 150), left along the gallery, round the corner and along side 0, out over
// the balustrade, where a second school (120) pouring down the shaft from the floors above meets it; then all of
// them dive down the shaft in a spiral, lighting the floors they pass. A chase at speed: the camera runs with the
// reader of s30 (hero tier, streaking as it flies), which drops off its perch into the school (the school parts
// round it), and when the school dives it stops at the rail and watches it go.
// The beat comes in on the cut (90 BPM, 3/4, bars at 0, 2 and 4 s): the corner on bar 2, the merge on its third
// beat (3.33 s), the dive on bar 3 (the lens turns from the gallery down the shaft, centred on it) (CUES.turns,
// checked against the plan in setup).
// First frame (cut from s30's last, the doorway lighting up cold again): the lens on side 1 at D(4.6, 2.4, 1.4) (a off
// the book plane, s along it, y over the floor) looking up at D(0.4, −0.5, 3.0), +17°, 20 mm, f/4; the school's head
// just out of the doorway's mouth, its light on the vestibule's back; the reader still on its perch at D(1.3, −2.3,
// 4.7), facing into the doorway, screen (0.32, 0.25). Lamps LOOK17.lamp.
// Last frame (for s32): the lens on side 0 at W(5.4, −0.5, 3.0) (world 11.68, 219.00, 6.17), still, looking down the
// shaft at W(11, −9, −2) (world 11.08, 214.00, −3.99), −26°, no roll, 20 mm, f/4; the reader stopped over the rail at
// W(6.0, −3.0, 1.7) (world 12.41, 217.70, 3.70), 2.9 m off, screen (0.68, 0.54), facing that same point, glow 1, no
// dive, its clock at 12 s (s30's 0–6, then 6 + t); the gallery empty, the school far below, its light on the stone
// almost gone (the sheet at I 0.08); lamps LOOK17.lamp, the dust's key on the reader.
import * as THREE from 'three';
import { setLens, aim, path, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { hash, noise1 } from 'film/lib/rng.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, AgentSwarm, STEEL } from 'world/agentbody.js';
import { PLACE, at } from 'world/e1_place.js';
import { sideNormal } from 'world/geo.js';
import { LOOK17 } from './s17.js';

export const meta = { frames: 144, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export const BEAT = 2 / 3; // 90 BPM
export const CUES = { cut: 0, turns: [2, 2 + 2 * BEAT, 4] }; // the corner, the merge, the dive

const K = PLACE.K;
const D = (a, s, y) => at(PLACE.DOOR, K, a, s, y); // side 1, the doorway they pour out of
const W = (a, s, y) => at(PLACE.WALL, K, a, s, y); // side 0, where the reader stays

// Distance along a path by time t from speed knots [[t, v], ...], the speed eased between knots (smoothstep):
// a segment adds dt·(v0·u + (v1 − v0)·(u³ − u⁴/2)) by its fraction u, so the speed is smooth and the sum exact.
function travel(knots) {
  const cum = [0];
  for (let k = 1; k < knots.length; k++) cum.push(cum[k - 1] + (knots[k][0] - knots[k - 1][0]) * 0.5 * (knots[k - 1][1] + knots[k][1]));
  return (t) => {
    if (t <= knots[0][0]) return knots[0][1] * (t - knots[0][0]);
    for (let k = 1; k < knots.length; k++) {
      const [t0, v0] = knots[k - 1];
      const [t1, v1] = knots[k];
      if (t > t1) continue;
      const u = (t - t0) / (t1 - t0);
      return cum[k - 1] + (t1 - t0) * (v0 * u + (v1 - v0) * (u ** 3 - u ** 4 / 2));
    }
    return cum.at(-1) + knots.at(-1)[1] * (t - knots.at(-1)[0]);
  };
}

// The school's spine: from the dark beyond the vestibule's far arch, out of the doorway, left along side 1, round
// the corner, along side 0, out over the balustrade, and down the shaft in a spiral round its axis.
const LEDGE = W(8.9, -5.4, 0.3);
function spiral(n) {
  const r0 = Math.hypot(LEDGE.x, LEDGE.z);
  const f0 = Math.atan2(LEDGE.z, LEDGE.x);
  return Array.from({ length: n }, (_, j) => {
    const k = j + 1;
    const r = lerp(r0, 9.4, Math.min(1, k / 3));
    const f = f0 - 0.42 * k; // on round the way it came: the angle falls from side 1 to side 0
    return new THREE.Vector3(r * Math.cos(f), LEDGE.y - 3.2 * k - 0.35 * k * k, r * Math.sin(f));
  });
}
export const MAIN = [
  D(-6.6, 0, 1.5), D(-3.4, 0, 1.7), D(-0.6, 0, 2.3), D(1.7, -1.2, 2.6), D(2.7, -4.2, 2.7), D(2.8, -7.4, 2.7),
  W(2.6, 6.6, 2.6), W(2.4, 2.6, 2.5), W(2.6, -1.2, 2.4), W(3.5, -3.6, 2.2), W(6.3, -5.0, 1.9), LEDGE, ...spiral(9),
];
// the school from above comes down the shaft beside the gallery and meets the first just out over the balustrade
const JOIN = 11;
export const CASCADE = [W(10.6, 5.0, 16), W(10.3, 2.2, 10.5), W(9.9, -0.6, 6.0), W(9.4, -3.4, 2.6), ...MAIN.slice(JOIN)];

// The reader: on its perch over the doorway's left shoulder (where s30 left it), down into the school, along with
// it, and out of it at the rail, where it stops.
export const HEROP = [D(1.3, -2.3, 4.7), D(2.0, -3.2, 3.8), D(3.0, -5.2, 3.0), D(3.6, -7.8, 2.8), W(3.7, 6.4, 2.6), W(3.9, 2.5, 2.4), W(4.4, -0.5, 2.1), W(5.2, -2.2, 1.85), W(6.0, -3.0, 1.7)];
export const HEROV = [[0, 0], [0.5, 0], [1.0, 9], [2.6, 9], [3.95, 1.2], [4.6, 0], [6, 0]];
// The camera: right of the doorway, then after the reader along the gallery, on the shaft side of the school.
export const CAMP = [D(4.6, 2.4, 1.4), D(4.8, -0.5, 1.55), D(4.9, -3.5, 1.7), D(4.9, -6.0, 1.85), W(4.9, 7.0, 2.1), W(5.0, 3.5, 2.5), W(5.3, 0.8, 2.9), W(5.4, -0.5, 3.0)];
export const CAMV = [[0, 0.6], [0.55, 1.0], [1.15, 4.0], [1.65, 6.5], [2.75, 6.5], [3.55, 3.5], [4.45, 0.4], [6, 0.1]];
export const LENS = { mm: 20, fstop: 4 };
// what it looks at: the doorway, then a little ahead of the reader, then across the shaft and down
const LOOK = { door: D(0.4, -0.5, 3.0), end: W(11, -9, -2), ahead: 0.45, in: [0.3, 1.1], out: [3.4, 4.6] };

const V3 = () => new THREE.Vector3();
const ride = (points, knots) => {
  const p = path(points);
  const d = travel(knots);
  const L = p.length();
  const end = d(DUR);
  return { p, L, d, at: (t, out) => p.at(clamp(d(t) / end), out) };
};
const HERO = ride(HEROP, HEROV);
const CAM = ride(CAMP, CAMV);
export const heroAt = (t, out = V3()) => HERO.at(t, out);
const _h = V3();
// the lens and what it looks at: the doorway, then where the reader will be in LOOK.ahead s, then the shaft
export function camAt(t, pos = V3(), look = V3()) {
  CAM.at(t, pos);
  heroAt(t + LOOK.ahead, _h);
  look.copy(LOOK.door).lerp(_h, smoothstep(...LOOK.in, t)).lerp(LOOK.end, smoothstep(...LOOK.out, t));
  return { pos, look };
}

// The school: NM bodies out of the doorway in three waves (dozens, then hundreds), and NC from the floors above,
// the first of them meeting it on the merge cue. Each rides its spine at its own speed in a lane of a flattened
// disc round it (R across, wheeling slowly); the spine meanders a little, and the lane widens out of the doorway.
const NM = 300;
const NC = 120;
export const COUNT = NM + NC;
const SPEED = 8;
const WAVES = [[-0.97, -0.65, 40], [-0.65, -0.32, 110], [-0.32, 0, 150]]; // [first, last out of the dark (s), bodies]
const MS = path(MAIN);
const CS = path(CASCADE);
const ML = MS.length();
const CL = CS.length();
const arc = (p, j, n) => {
  const ls = p.curve.getLengths();
  return ls[Math.round((j / (n - 1)) * (ls.length - 1))];
};
const MD = MAIN.map((_, j) => arc(MS, j, MAIN.length)); // distance along the spine at each of its points
const MJ = MD[JOIN];
const CJ = arc(CS, 4, CASCADE.length); // where the school from above reaches MAIN[JOIN]
const RC = 1.1;
// across: tight in the doorway, spread in the gallery, nearer the wall along side 0, opening out down the shaft
const RM = (d) => {
  const r = lerp(lerp(1.0, 1.4, smoothstep(MD[2], MD[3] + 1, d)), 1.1, smoothstep(MD[5], MD[7], d));
  return lerp(r, 2.2, smoothstep(MD[11], MD[13], d));
};
const TAU = Math.PI * 2;
const BODY = [];
for (let i = 0; i < COUNT; i++) {
  const h = (c) => hash(i, 31, c);
  const main = i < NM;
  const v = SPEED * (main ? 0.95 + 0.1 * h(1) : 0.97 + 0.06 * h(1));
  let tau;
  if (main) {
    let j = i;
    let w = 0;
    while (j >= WAVES[w][2]) j -= WAVES[w++][2];
    tau = lerp(WAVES[w][0], WAVES[w][1], (j + h(0)) / WAVES[w][2]);
  } else tau = CUES.turns[1] + 1.5 * ((i - NM + h(0)) / NC) - CJ / v; // reaching MAIN[JOIN] over 1.5 s from the cue
  BODY.push({ main, tau, v, r: Math.sqrt(h(2)), th: TAU * h(3), om: (0.15 + 0.25 * h(4)) * (h(5) < 0.5 ? -1 : 1), n: 37 * h(6) });
}

const UP = new THREE.Vector3(0, 1, 0);
const _P = V3();
const _T = V3();
const _N = V3();
const _B = V3();
const _C = V3();
// the lens and the reader at the last few t asked (the swarm asks at t and t ± dt, body by body)
const NEAR = Array.from({ length: 4 }, () => ({ t: NaN, cam: V3(), hero: V3() }));
let nearI = 0;
const nearAt = (t) => {
  for (const n of NEAR) if (n.t === t) return n;
  const n = NEAR[(nearI = (nearI + 1) % NEAR.length)];
  n.t = t;
  CAM.at(t, n.cam);
  heroAt(t, n.hero);
  return n;
};
// keep out of a sphere of radius r round c, softly: a body r·x away (x < 1) is put r·(1 + x²)/2 away along the
// same line (from the lens: where it shows stays put, only its size is held down)
const keepOut = (p, c, r) => {
  _C.subVectors(p, c);
  const x = _C.length() / r;
  if (x < 1) p.copy(c).addScaledVector(_C, (0.5 * (1 + x * x)) / Math.max(x, 1e-3));
};
// where body i is at t (pure in t)
export function flow(i, t, out) {
  const b = BODY[i];
  const S = b.main ? MS : CS;
  const L = b.main ? ML : CL;
  const d = b.v * (t - b.tau);
  const u = clamp(d / L);
  S.at(u, _P);
  S.tangent(u, _T).normalize();
  _P.addScaledVector(_T, d - u * L); // beyond either end it carries straight on
  _N.crossVectors(_T, UP);
  if (_N.lengthSq() < 1e-6) _N.set(1, 0, 0);
  _N.normalize();
  _B.crossVectors(_N, _T);
  const dm = b.main ? d : d - CJ + MJ; // the same place measured along the first school's spine
  const R = b.main ? RM(d) : lerp(RC, RM(dm), smoothstep(CJ - 2, CJ + 3, d));
  const th = b.th + b.om * t;
  const bend = 0.3 * Math.sin(0.33 * dm) * smoothstep(MD[3], MD[4], dm);
  const side = R * b.r * Math.cos(th) + bend + 0.1 * noise1(0.7 * t + b.n, 3);
  const up = 0.6 * R * b.r * Math.sin(th) + 0.1 * noise1(0.7 * t + b.n, 5);
  out.copy(_P).addScaledVector(_N, side).addScaledVector(_B, up);
  const n = nearAt(t);
  keepOut(out, n.hero, 1.6); // the school parts round the reader
  keepOut(out, n.cam, 2.2);
  return out;
}
// each body fades in out of the dark it comes from, and out at the far end of the spiral
export function attr(i, t, o) {
  const b = BODY[i];
  const d = b.v * (t - b.tau);
  o.glow = smoothstep(0, 1.2, d) * (1 - smoothstep(ML - 6, ML + 4, b.main ? d : d - CJ + MJ));
}

// how fast the lens turns (rad per 0.2 s, positive to the left)
const _a = V3();
const _b = V3();
const yawAt = (t) => {
  camAt(t, _a, _b);
  return Math.atan2(_b.x - _a.x, _b.z - _a.z);
};
export const turning = (t) => {
  const w = yawAt(t + 0.1) - yawAt(t - 0.1);
  return w - TAU * Math.round(w / TAU);
};
// the plan against the cues: the cut lands with the head of the school in the vestibule; the corner where the lens
// turns fastest; the merge when the first of the school from above reaches the first; the dive half way through
// the lens turning from the reader to the shaft (the reader brakes over the same second)
export function checkCues() {
  const inside = BODY.some((b) => b.main && b.v * -b.tau > MD[1] && b.v * -b.tau < MD[2] + 1);
  let tc = -1;
  for (let f = 29, top = 0; f <= 72; f++) {
    const w = Math.abs(turning(f / 24));
    if (w > top) [top, tc] = [w, f / 24];
  }
  const first = (main, d) => Math.min(...BODY.filter((b) => b.main === main).map((b) => b.tau + d / b.v));
  const meet = [first(true, MJ), first(false, CJ)]; // the first of each school at MAIN[JOIN]
  const got = { cut: inside ? 0 : -1, turns: [tc, Math.max(...meet), (LOOK.out[0] + LOOK.out[1]) / 2], meet };
  const bad = [];
  if (got.cut !== CUES.cut) bad.push('cut: the school is not in the doorway');
  CUES.turns.forEach((w, i) => Math.abs(got.turns[i] - w) > 1 / 24 && bad.push(`turns[${i}] got ${got.turns[i].toFixed(3)} want ${w.toFixed(3)}`));
  return { got, want: CUES, bad };
}

// The light: the gallery lamps low (LOOK17.lamp). The school's own light on the stone is the library's sheet, from
// where the school is thickest just ahead of the lens (each body weighted by its glow and its nearness to a point
// reach m ahead along the line of sight, sigma m), turned out from the shaft's axis through there onto what is
// behind the school (the vestibule, the books, the floors the spiral passes), and the stronger the more of them
// (n0 for 1 − 1/e of I).
export const LOOK31 = {
  wash: { I: 4.5, n0: 40, reach: 4, sigma: 6, W: 0.65, V: 2.4, Vk: 0.9, Vmin: 0.35 },
  dust: { I: 2.5, g: 0.55 },
  roll: { k: 0.3, max: 0.1 }, // the lens banks into its turns: rad per (rad per 0.2 s), and at most
  size: [0.45, 0.75], // the school's bodies, the reader being 1
  glow: 0.75, // the school's: where they crowd their light adds up (at 0.8 a few core-on-core pixels reached Y 243)
};
const FACE0 = D(-2, 0, 3.4); // where s30 left the reader looking: into the doorway
// m metres on along a ride's path from where it is at t
const ahead = (R, t, m, out) => R.p.at(clamp(R.d(t) / R.d(DUR) + m / R.L), out);

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K - 8, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 31 });
  scene.add(dust.points);
  const swarm = new AgentSwarm({ count: COUNT, seed: 31, kinds: 9, size: LOOK31.size, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(swarm.group);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);

  const pos = V3();
  const look = V3();
  const body = V3();
  const h0 = V3();
  const h1 = V3();
  const vel = V3();
  const fwd = V3();
  const face = V3();
  const p = V3();
  const O = V3();
  const C = V3();
  const o = {};
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s31] CUES off: ${cc.bad.join('; ')}`);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      camAt(t, pos, look);
      setLens(camera, LENS.mm);
      const R = LOOK31.roll;
      aim(camera, pos, look, { roll: clamp(R.k * turning(t), -R.max, R.max) });
      lib.update(camera);
      U.uTime.value = t;
      swarm.set({ time: t, place: flow, attr, glow: LOOK31.glow });
      swarm.update(camera);

      // the reader, on s30's clock: from the doorway it turns to its flight, and at the rail to the shaft
      heroAt(t, body);
      heroAt(t - 0.05, h0);
      heroAt(t + 0.05, h1);
      vel.subVectors(h1, h0).divideScalar(0.1);
      ahead(HERO, t, 2, fwd);
      face.copy(FACE0).lerp(fwd, smoothstep(0.45, 0.9, t)).lerp(LOOK.end, smoothstep(3.7, 4.5, t));
      hero.set({ time: 6 + t, pos: body.toArray(), face: face.toArray(), glow: 1, dive: smoothstep(1.5, 5, vel.length()), vel: vel.toArray() });
      hero.update(camera);

      // the school's light on the stone
      const Wa = LOOK31.wash;
      let sw = 0;
      C.copy(look).sub(pos).setLength(Wa.reach).add(pos);
      O.set(0, 0, 0);
      for (let i = 0; i < COUNT; i++) {
        attr(i, t, o);
        if (o.glow <= 0) continue;
        swarm.position(i, p);
        const w = o.glow * Math.exp(-p.distanceToSquared(C) / (Wa.sigma * Wa.sigma));
        O.addScaledVector(p, w);
        sw += w;
      }
      U.uBeamI.value = 0;
      if (sw > 1e-4) {
        U.uBeamO.value.copy(O.divideScalar(sw));
        U.uBeamAng.value = Math.atan2(O.z, O.x);
        U.uBeamW.value = Wa.W;
        // the sheet lights a band of the same height at any distance: held to about the distance from the source
        // to the book plane, so it does not run up the wall when the school is near it (out of the doorway)
        const j = (((Math.round((U.uBeamAng.value - Math.PI / 6) / (Math.PI / 3)) % 6) + 6) % 6);
        U.uBeamV.value = clamp(Wa.Vk * Math.abs(PLACE.FACE - O.dot(sideNormal(j))), Wa.Vmin, Wa.V);
        U.uFanUp.value = 50;
        U.uFanDn.value = 50;
        U.uTrailI.value = 0;
        U.uBeamCol.value.copy(STEEL);
        U.uBeamI.value = Wa.I * (1 - Math.exp(-sw / Wa.n0));
      }
      const key = hero.light();
      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK31.dust.g;
      dust.update(camera, t, { focus: focusDistance(camera, body), fstop: LENS.fstop, width: ctx.width, intensity: LOOK31.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, body), fstop: LENS.fstop } };
    },
  };
}
