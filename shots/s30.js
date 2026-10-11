// s30 来客 (the visitor): global 2760–2903, 144 frames (6 s), 1:55–2:01, act 3 (the act's grade, no letterbox).
// A hard cut from s29's warm reader to cold steel. Another night on floor PLACE.K (30), the gallery lamps low
// (LOOK17.lamp); a machine reader of light (agentbody.js, hero tier) comes in by side 1's doorway and reads the
// runs either side of it from 1.2 m out, a row in a fraction of a second and faster each time, turning its
// sheet across the spines like a small lantern; then it turns back to the doorway, which lights again.
// Card 5 lies over local 0.5–5.58 s in the middle of the frame: the band 0.40–0.60 H is the doorway's dark
// mouth and the dim shelves either side, and nothing moves or lights in it while the card is up (the reader
// keeps above 0.31 H; checked frame by frame in a scratch test).
//
// First frame: frontal on the doorway from out over the shaft (7.56 m out from the book plane, 1.6 m up, 20 mm,
//   f/5.6, aimed 2.79 m up the doorway: about 9° up). Warm: the lamps, out of frame, on the stone and the gilt.
//   Cold: the reader 2.4 m deep in the vestibule, its light streaming out of the doorway onto the floor and the
//   dust between us and it (the cold pulse the cut lands on, gone by 0.46 s).
// Last frame: the same, pushed in to 7.26 m; the reader above the arch's left shoulder, turned to the doorway,
//   which is lit cold again from deep inside, dimmer (more are coming: s31).
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { LIB } from 'world/libshader.js';
import { sideNormal } from 'world/geo.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, STEEL } from 'world/agentbody.js';
import { PLACE, at } from 'world/e1_place.js';
import { LOOK17 } from './s17.js';

export const meta = { frames: 144 };
const DUR = meta.frames / 24;

const K = PLACE.K;
const SIDE = PLACE.DOOR;
const P = (a, s, y) => at(SIDE, K, a, s, y);
const ROWY = (r) => LIB.PLINTH + (r - 0.5) * LIB.ROW_H; // the middle of shelf row r (1 at the floor, 8 under the cornice)

export const CAM = { mm: 20, fstop: 5.6, y: 1.6, a: [7.56, 7.26], look: [0.06, 0, 2.79] };
export const LOOK30 = {
  // its sheet on the spines: one row at a time (fan in slopes: ±0.32 m at 1.2 m), and then three rows at a glance
  sheet: { I: 9, w: 0.08, v: 0.3, fan: 0.27, trail: 1.0, len: 0.7 },
  tall: { I: 9, w: 0.08, v: 1.2, fan: 0.85, trail: 1.0, len: 0.7 },
  // the light it sends ahead of it: shaped by the doorway it streams out of (half-width, top), so the walls beside
  // stay dark; on, off: the pulse it comes in on; call, I2: at the end the same light from deeper in, dimmer
  wash: { I: 7.5, jamb: 1.6, top: 5.1, v: 6, on: [-0.25, 0.12], off: [0.2, 0.46], call: [5.6, 6.1], I2: 3.0 },
  // the dust: looking up the doorway's light, motes near its line of sight would clip to white, so while that light
  // is on the dust scatters less forward (g) and is dimmed
  dust: { I: 6, g: 0.55, washed: 0.06, gWashed: 0.15 },
};
const OUT = 1.2; // it reads a run from this far out, turning its sheet across the spines like a small lantern
const HOVER = 3.6; // hanging in front of the run, this far along the side (|s|)
// the stretch of a run a sweep reads (|s|), out past the frame's edge; it stops short of the doorway, where its
// sheet (which nothing stops) would reach through the wall into the vestibule behind
const RUN = [3.33, 6.9];
const LIFT = [0.3, 0, -0.55]; // on its dash across the doorway it swings out and dips (a, s, y), under the frame top
const DEEP = { t: -0.35, p: [-3.6, 0, 2.0] }; // where it comes from: the small arch at the back of the vestibule
const DOOR = { t: 0.5, p: [-0.2, 0, 4.45], v: [2.5, 4, 1.5] }; // under the crown of the arch, clear of the card
const REST = { t: 5.5, p: [1.3, -2.3, 4.7] }; // where it ends: above the arch's shoulder, turned to the doorway
// the sweeps: [t0, t1, run (+1 right of the doorway, -1 left), row, tall], each faster than the one before. A sweep
// turns toward +s (screen right), so its afterglow trails behind it; the last takes three rows at a glance.
export const SWEEP = [
  [1.05, 1.65, 1, 7], [1.85, 2.33, 1, 6], [2.5, 2.8, 1, 7, 1],
  [3.42, 3.72, -1, 7], [3.84, 4.08, -1, 6], [4.22, 4.4, -1, 7, 1],
];
export const CUES = { cut: 0, scan: [1.05, 4.4] };

// its flight: knots (time, place, velocity in the side's a, s, y) joined by cubic Hermite arcs, so place and
// velocity are continuous; while it sweeps it drifts a little with its sheet, and it dashes across the doorway
const KNOTS = [{ ...DEEP, v: [0, 0, 0] }, DOOR];
for (const [t0, t1, run, row] of SWEEP) {
  const v = [0, 0.4, 0];
  const h = 0.2 * (t1 - t0);
  const hop = KNOTS.at(-1).run === -run ? 1 : 0;
  KNOTS.push({ t: t0, p: [OUT, run * HOVER - h, ROWY(row)], v, hop, run });
  KNOTS.push({ t: t1, p: [OUT, run * HOVER + h, ROWY(row)], v, run });
}
KNOTS.push({ ...REST, v: [0, 0, 0] });

// out = [a, s, y, va, vs, vy] at t
export function flight(t, out = []) {
  let i = 1;
  while (i < KNOTS.length - 1 && t > KNOTS[i].t) i++;
  const k0 = KNOTS[i - 1];
  const k1 = KNOTS[i];
  const dt = k1.t - k0.t;
  const u = clamp((t - k0.t) / dt);
  const u2 = u * u;
  const h = [2 * u2 * u - 3 * u2 + 1, u2 * u - 2 * u2 + u, -2 * u2 * u + 3 * u2, u2 * u - u2];
  const d = [6 * u2 - 6 * u, 3 * u2 - 4 * u + 1, -6 * u2 + 6 * u, 3 * u2 - 2 * u];
  for (let j = 0; j < 3; j++) {
    out[j] = h[0] * k0.p[j] + h[1] * dt * k0.v[j] + h[2] * k1.p[j] + h[3] * dt * k1.v[j];
    out[j + 3] = (d[0] * k0.p[j] + d[1] * dt * k0.v[j] + d[2] * k1.p[j] + d[3] * dt * k1.v[j]) / dt;
  }
  if (k1.hop) {
    for (let j = 0; j < 3; j++) {
      out[j] += LIFT[j] * Math.sin(Math.PI * u) ** 2;
      out[j + 3] += (LIFT[j] * Math.PI * Math.sin(2 * Math.PI * u)) / dt;
    }
  }
  return out;
}

// where it looks, [t, a, s, y], eased knot to knot: out of the doorway, along each row it reads, back into the doorway
const GAZE = [[DOOR.t, 5, 0, 3.6], [0.95, 0, RUN[0], ROWY(SWEEP[0][3])]];
for (const [t0, t1, run, row] of SWEEP) {
  const [s0, s1] = run > 0 ? RUN : [-RUN[1], -RUN[0]];
  GAZE.push([t0, 0, s0, ROWY(row)], [t1, 0, s1, ROWY(row)]);
}
GAZE.push([REST.t, -2, 0, 3.4]);
function gaze(t, out) {
  let i = 1;
  while (i < GAZE.length - 1 && t > GAZE[i][0]) i++;
  const u = smoothstep(GAZE[i - 1][0], GAZE[i][0], t);
  for (let j = 1; j < 4; j++) out[j - 1] = lerp(GAZE[i - 1][j], GAZE[i][j], u);
  return out;
}
const iDash = KNOTS.findIndex((k) => k.hop);
const DASH = [KNOTS[iDash - 1].t, KNOTS[iDash].t];

// the reader at t: where it is (a, s, y and their rates), where it looks, how lit, and what its sheet is doing
const _f = [];
export function reader(t, o = {}) {
  flight(t, _f);
  [o.a, o.s, o.y, o.va, o.vs, o.vy] = _f;
  o.gaze = gaze(t, o.gaze || []);
  o.glow = 1;
  o.wash = smoothstep(...LOOK30.wash.on, t) * (1 - smoothstep(...LOOK30.wash.off, t));
  o.call = smoothstep(...LOOK30.wash.call, t); // at the end the doorway lights again: more are coming
  o.dive = smoothstep(DASH[0], DASH[0] + 0.1, t) * (1 - smoothstep(DASH[1] - 0.12, DASH[1], t));
  o.scan = o.arc = o.tall = 0;
  for (const [t0, t1, run, , tall] of SWEEP) {
    const w = smoothstep(t0 - 0.02, t0 + 0.04, t) * (1 - smoothstep(t1 - 0.03, t1 + 0.06, t));
    if (w > o.scan) {
      const d = Math.max(0.3, o.a);
      o.scan = w;
      o.tall = tall ? 1 : 0;
      o.arc = Math.max(0, Math.atan2(o.gaze[1] - o.s, d) - Math.atan2((run > 0 ? RUN[0] : -RUN[1]) - o.s, d));
    }
  }
  return o;
}

// the plan against the cues: the cut lands on the cold pulse, and the scan runs from the first sweep to the last
export function checkCues() {
  const r = {};
  const on = [];
  for (let f = 0; f < meta.frames; f++) if (reader(f / 24, r).scan > 0.5) on.push(f / 24);
  const got = { cut: reader(0, r).wash > 0.5 ? 0 : -1, scan: [on[0], on.at(-1)] };
  const bad = [];
  if (got.cut !== CUES.cut) bad.push(`cut: no pulse at ${CUES.cut}`);
  CUES.scan.forEach((w, i) => Math.abs(got.scan[i] - w) > 1 / 24 && bad.push(`scan[${i}] got ${got.scan[i]} want ${w}`));
  return { got, want: CUES, bad };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K - 2, K + 2], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 30 });
  scene.add(dust.points);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);

  const N = sideNormal(SIDE);
  const OUT_ANG = Math.atan2(-N.z, -N.x); // out of the doorway, toward the shaft
  const pos = new THREE.Vector3();
  const target = P(...CAM.look);
  const body = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const face = new THREE.Vector3();
  const R = {};
  // light streaming out of the doorway from a source inside it at (a, y): the library's sheet, opened to the doorway
  const wash = (origin, a, y, I) => {
    const W = LOOK30.wash;
    const d = Math.max(0.3, 0.06 - a); // from the source out to the doorway's mouth
    U.uBeamO.value.copy(origin);
    U.uBeamAng.value = OUT_ANG;
    U.uBeamW.value = Math.atan(W.jamb / d);
    U.uBeamV.value = W.v;
    U.uFanUp.value = Math.max(1.2, (W.top - y) / d);
    U.uFanDn.value = Math.max(1.5, y / d);
    U.uTrailI.value = 0;
    U.uBeamI.value = I;
  };
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s30] CUES off: ${cc.bad.join('; ')}`);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      pos.copy(P(lerp(CAM.a[0], CAM.a[1], t / DUR), 0, CAM.y));
      setLens(camera, CAM.mm);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = t;
      U.uBeamI.value = 0;

      reader(t, R);
      body.copy(P(R.a, R.s, R.y));
      vel.copy(P(R.a + R.va, R.s + R.vs, R.y + R.vy)).sub(body); // P is affine in a, s, y
      face.copy(P(...R.gaze));
      const S = R.tall ? LOOK30.tall : LOOK30.sheet;
      hero.set({
        time: t, pos: body.toArray(), face: face.toArray(), glow: R.glow, dive: R.dive, vel: vel.toArray(),
        scan: R.scan, scanAt: face.toArray(), scanW: S.w, scanV: S.v, scanFan: [S.fan, S.fan],
        scanTrail: S.trail, scanTrailLen: S.len, scanArc: R.arc,
      });
      hero.update(camera);
      // the library's sheet: its reading sheet in plain steel; before and after, the light out of the doorway
      hero.scanLight(U);
      U.uBeamCol.value.copy(STEEL);
      U.uBeamI.value = S.I * R.scan * R.glow;
      const W = LOOK30.wash;
      if (R.wash > 0) wash(hero.anchor('core'), R.a, R.y, W.I * R.wash * R.glow);
      else if (R.call > 0) wash(P(...DEEP.p), DEEP.p[0], DEEP.p[2], W.I2 * R.call);
      const key = hero.light();
      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      const D = LOOK30.dust;
      const lit = smoothstep(0, 0.15, Math.max(R.wash, R.call));
      dust.uniforms.uG.value = lerp(D.g, D.gWashed, lit);
      dust.update(camera, t, {
        focus: focusDistance(camera, target), fstop: CAM.fstop, width: ctx.width, intensity: D.I * lerp(1, D.washed, lit),
      });
    },
    post() {
      return { dof: { focus: focusDistance(camera, target), fstop: CAM.fstop } };
    },
  };
}
