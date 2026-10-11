// s46 — The cosmos (act IV, 8 s, global 4968–5159; card 8 over local 1.5–7.5 s).
//
// s45 goes on. The eye keeps pulling away from the Earth, the drift it left s45 with swelling into one
// long surge that dies away: by the end it is 800 times as high (30 million km) and at rest. The Earth
// sinks to the lower part of the frame as it shrinks (the eye's path leans off the vertical over the
// first 1.6 s; the view itself does not turn, so the stars hold still) and becomes a point of light: its
// two lighthouses, which keep their size on screen, close on each other and merge into one lime point.
// Meanwhile the stars, the very field s45 showed, gather into hexagonal rings about that point (world/
// f_cosmos.js): each star has a depth, so the eye's travel slides it, by parallax alone, toward the
// Earth's point and onto a ring; the rings are hidden in the random field and come out only as the eye
// nears the end (hexReveal), widening outward like the galleries of a shaft seen from above (s06, s13).
// A share of the stars stays where it is.
//
// First frame (t = 0, s45's clock 22): s45's last pose, one frame on: 35 mm, straight down from about
// 38,000 km over Shanghai, north up, the Earth about half the frame high, East Asia in the middle, the
// two lighthouses lit; the night round it is s45's, star for star; the eye climbing at s45's rate.
// Last frame (t = 7.958): the eye at rest, the Earth a lime point at 0.78 of the frame's height, the
// stars in rings round it. Card 8 (1.5–7.5 s) sits in the frame's middle band (0.40–0.60): the Earth
// has left it by 1 s, and while the card is up the stars there are dimmed (CARD.scrim), so the words
// sit on a quiet dark and the rings pass behind them as a shade; with the card gone they come back.
//
// The light is s45's: the planet (world/f_planet.js, unchanged) drawn into a target of its own and laid
// over the stars; s45's grade and post. Nothing in this shot draws text: no library is built (s44.js
// is imported for its camera law only), and the frame holds four meshes, all from world/f_cosmos.js.
import * as THREE from 'three';
import { setLens, OUTPUT_ASPECT } from 'film/lib/camera.js';
import { smoothstep, smootherstep } from 'film/lib/ease.js';
import { cameraAt, altitudeAt, Y_ROOF, LOOK, S45 } from './s44.js';
import { Sky } from 'world/f_sky.js';
import { CameraBlur } from 'world/f_mblur.js';
import { Planet, R_EARTH } from 'world/f_planet.js';
import { Cosmos, starField, hexLayout } from 'world/f_cosmos.js';

export const meta = { frames: 192 };

const DEG = Math.PI / 180;
const SHUTTER = 0.5 / 24;
export const T0 = 22; // s45's clock (s44.js) at t = 0: its last frame is 21.958
export const END = 8; // the shot's end: the eye at rest, the rings exact

// The pull: the eye's height is s45's at 22 times e^L(t), L(0) = 0, L'(0) = s45's rate there (V0, about
// 0.095 a second), L''(0) = 0 (s45's rate is all but constant there):
//   L'(t) = V0/(1 + (t/tau)²) + PULL (t/tp)² e^(2(1 − t/tp)),
// s45's drift handed over to a surge that peaks at tp (PULL a second) and dies away; PULL is what makes
// the height GROW times s45's by END. The slide: the eye's path leans from the vertical toward the frame's
// top by GAMMA over slide (smootherstep: no jolt at the cut), so the Earth sinks to AT of the frame's
// height in the last frame.
export const S46 = { tau: 1, tp: 1.1, grow: 800, slide: [0, 1.6], at: 0.78 };
const base = cameraAt(T0); // s45's last pose
const A0 = altitudeAt(T0);
export const V0 = (Math.log(altitudeAt(T0 + 1e-3)) - Math.log(altitudeAt(T0 - 1e-3))) / 2e-3;
const Lv = (t) => V0 * S46.tau * Math.atan(t / S46.tau);
const Lp = (t) => {
  const y = t / S46.tp;
  return S46.tp * (Math.E ** 2 / 4) * (1 - Math.exp(-2 * y) * (1 + 2 * y + 2 * y * y));
};
export const PULL = (Math.log(S46.grow) - Lv(END)) / Lp(END);
export const pullAt = (t) => Lv(t) + PULL * Lp(t);
export const altitude = (t) => A0 * Math.exp(pullAt(t));

// s45's pitch: tracking the planet until the eye looks straight down (s44.js cameraAt), on the height now
function trackAt(A) {
  const half = Math.atan(18 / base.focal / OUTPUT_ASPECT);
  const dip = Math.acos(R_EARTH / (R_EARTH + A));
  const g = Math.PI / 2 - dip - S45.below * half;
  const k = 1.5 * DEG;
  return -Math.PI / 2 + (g + Math.sqrt(g * g + k * k)) / 2;
}

// the eye: from the Earth's centre (C, s45's eye 0.35 m off its axis) along a direction leaning from the
// vertical toward the frame's top (looking down, the yaw's forward)
const C = new THREE.Vector3(base.pos.x, Y_ROOF - R_EARTH, base.pos.z);
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(-Math.sin(base.yaw), 0, -Math.cos(base.yaw));
export let GAMMA = 0;
const slideAt = (t) => GAMMA * smootherstep(S46.slide[0], S46.slide[1], t);
const _e = new THREE.Euler();
function poseAt(t, pos, quat) {
  const g = slideAt(t);
  const r = R_EARTH + altitude(t);
  pos.copy(C).addScaledVector(UP, r * Math.cos(g)).addScaledVector(FWD, r * Math.sin(g));
  quat.setFromEuler(_e.set(trackAt(altitude(t)), base.yaw, 0, 'YXZ'));
}

// a camera at t (35 mm, no jitter)
export function cameraOf(t, cam = new THREE.PerspectiveCamera(50, OUTPUT_ASPECT, 0.3, 4000)) {
  poseAt(t, cam.position, cam.quaternion);
  setLens(cam, base.focal);
  cam.updateMatrixWorld(true);
  return cam;
}
// the Earth's centre on screen (share of the frame's height from its top)
export function earthY(t) {
  const cam = cameraOf(t);
  const p = new THREE.Vector3(0, Y_ROOF - R_EARTH, 0).project(cam);
  return (1 - p.y) / 2;
}
// GAMMA: the Earth's centre at S46.at in the last frame
{
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < 60; i++) {
    GAMMA = (lo + hi) / 2;
    if (earthY(END) < S46.at) lo = GAMMA;
    else hi = GAMMA;
  }
}

// the eye's travel so far over the whole (to END), and its direction
const P0 = cameraOf(0).position.clone();
const TRAVEL = cameraOf(END).position.clone().sub(P0);
const DELTA = TRAVEL.length();
const AWAY = TRAVEL.clone().divideScalar(DELTA);
const moveAt = (t, out) => out.copy(cameraOf(t, _cam).position).sub(P0).divideScalar(DELTA);
const _cam = new THREE.PerspectiveCamera(50, OUTPUT_ASPECT, 0.3, 4000);

// The rings' reveal: the share of the travel along its direction done (a star's slide onto its ring
// follows it), 10 % and 90 %.
export function revealAt(share) {
  let lo = 0;
  let hi = END;
  const w = new THREE.Vector3();
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (moveAt(m, w).dot(AWAY) < share) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// Local seconds. cut: s45's last frame goes on (the pull carries straight across). hexReveal: the stars
// gather into the rings (the share of the travel 10 % → 90 %).
export const CUES = {
  cut: { t: 0 },
  hexReveal: [1.86, 4.36],
};

// the last frame, as hexLayout reads it: frame-height coordinates (x right, y down, 0 at the centre); the
// rings' centre is where the eye's whole travel points away from (within a pixel of the Earth's point)
function layoutView(cam) {
  const tanV = Math.tan((cam.fov * DEG) / 2) / cam.zoom;
  const inv = cam.matrixWorldInverse;
  const v = new THREE.Vector3();
  const toScreen = (d) => {
    v.copy(d).transformDirection(inv);
    if (v.z > -1e-6) return null;
    return [v.x / -v.z / (2 * tanV), -v.y / -v.z / (2 * tanV)];
  };
  const toDir = (x, y) => new THREE.Vector3(2 * x * tanV, -2 * y * tanV, -1).normalize().applyQuaternion(cam.quaternion);
  return { toScreen, toDir, centre: toScreen(AWAY.clone().negate()), half: [cam.aspect / 2, 0.5], away: AWAY };
}

// Card 8 (global 5004–5148: here 1.5–7.5 s, in over 18 frames, out over 12) sits in the band 0.40–0.60 of
// the height: while it is up the stars there are dimmed (f_cosmos's scrim, soft-edged over 0.34–0.66), so
// the rings pass behind the words as ghosts; as the words go, the rings come up whole.
export const CARD = { t: [1.5, 7.5], fade: [0.75, 0.5], scrim: 0.6 };
const scrimAt = (t) =>
  CARD.scrim * smoothstep(CARD.t[0], CARD.t[0] + CARD.fade[0], t) * (1 - smoothstep(CARD.t[1] - CARD.fade[1], CARD.t[1], t));

export async function setup(ctx) {
  const camera = new THREE.PerspectiveCamera(50, OUTPUT_ASPECT, 0.3, 4000);

  // the cut: the first pose is s45's at 22, and the pull carries its rate across
  {
    const c = cameraOf(0);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(base.pitch, base.yaw, base.roll, 'YXZ'));
    const dp = c.position.distanceTo(base.pos);
    const dq = c.quaternion.angleTo(q);
    if (!(dp < 1e-3 && dq < 1e-7)) throw new Error(`[s46] the first pose is not s45's at 22 (${dp} m, ${dq} rad off)`);
  }

  // s45's sky (its uniforms: the night's colour, the Milky Way, the stars' intensity); the planet is given
  // one with all three off, so its target holds the Earth alone
  const sky = new Sky().uniforms;
  const dark = { uStarI: { value: 0 }, uMilky: { value: 0 }, uSkyCol: { value: new THREE.Color(0, 0, 0) }, uGalN: sky.uGalN };
  const planet = new Planet({ origin: new THREE.Vector3(0, Y_ROOF, 0), yaw: cameraAt(22).yaw, sky: dark });
  const { center, radius } = planet.sphere;
  const p0 = cameraOf(0).position;
  const D0 = Math.hypot(center.x - p0.x, center.y - p0.y, center.z - p0.z);

  // the stars that can reach the frame (it spans about 36° from the rings' centre), on their rings
  const stars = starField(AWAY.clone().negate(), 47 * DEG);
  const layout = hexLayout(stars, layoutView(cameraOf(END)));
  const cosmos = new Cosmos({ planet, sky, stars, size: 2 ** Math.ceil(Math.log2(0.9 * ctx.height)), ref: { theta: Math.asin(radius / D0), altitude: D0 - radius } });
  cosmos.setLayout(layout.rho);
  const scene = cosmos.scene;
  // nothing else in the frame: the night, the stars, the Earth from its target, the lighthouses
  const own = [cosmos.night, cosmos.points, cosmos.earth, cosmos.beams];
  if (scene.children.length !== own.length || own.some((m) => m.parent !== scene) || cosmos.iscene.children.length !== 1 || cosmos.iscene.children[0] !== planet.mesh) {
    throw new Error('[s46] the frame holds something besides the night, the stars, the Earth and the lighthouses');
  }

  // keep the plan honest: the cues from the pull
  const got = [revealAt(0.1), revealAt(0.9)];
  if (got.some((v, i) => !(Math.abs(v - CUES.hexReveal[i]) <= 0.03))) {
    console.warn(`[s46] CUES.hexReveal is ${JSON.stringify(CUES.hexReveal)}, the pull gives [${got.map((v) => v.toFixed(2))}]`);
  }

  const blur = new CameraBlur(ctx.width, ctx.height, { maxSamples: 48, step: 1.5 });
  const ends = [
    { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
  ];
  const move = new THREE.Vector3();
  let seed = 0;

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    layout, // look-dev only
    cosmos,
    update(t) {
      const sh = SHUTTER / Math.max(1, ctx.samples || 1); // this sample's share of the shutter (s44.js)
      cameraOf(t, camera);
      moveAt(t, move);
      cosmos.update(camera, { width: ctx.width, height: ctx.height, T: T0 + t, shutter: sh, move, scrim: scrimAt(t) });
      // the blur's two ends: the shutter's
      poseAt(t - sh / 2, ends[0].position, ends[0].quaternion);
      poseAt(t + sh / 2, ends[1].position, ends[1].quaternion);
      seed = Math.round((T0 + t) * 24 * 8);
    },
    render(renderer, target) {
      cosmos.renderEarth(renderer);
      // the stars as good as infinitely far; the Earth's pixels on its sphere, as in s45
      blur.render(renderer, scene, camera, target, ends[0], ends[1], { seed, far: 1e15, sphere: planet.sphere });
    },
    post() {
      return {
        exposure: LOOK.exposure,
        grade: { shadowTint: LOOK.shadows },
        bloom: { strength: 0.1 },
        halation: { strength: 0.14, threshold: 0.85 },
      };
    },
  };
}
