// s44 · 3:05–3:17 · 升 (global 4440–4727) — and s45 · 3:17–3:27 · 星球 (global 4728–4967) from t = 12
// One take, 22 s, two timeline rows on one module (s45: offset 288, so t runs on from 12).
// s44: on the tutti we are at the lighthouse on floor −100, below its lantern, and every gallery of the
// shaft is lit lime, hundreds of floors of them. The pages no longer fall: they rise like sky lanterns.
// The camera cranes up past the lantern and tilts up the shaft (s06's crane over the balustrade and
// tilt down, mirrored), then climbs: slowly for eight seconds (a gallery every second or two, the
// leaves drifting past), then ever faster, until the galleries pour past as streams of light (from
// t = 9) and the point of light at the end of the shaft opens into a hexagon of night sky. At t = 12
// the eye passes the roof: out.
// s45 (t 12–22): out. The climb brakes at once (at rest about 740 m over the roof by 13) and the camera
// tilts from the zenith to the horizon in 2.4 s, the stars streaking: the roof is a plain of hexagon
// mouths, each one lit, out to a lime coast, a black sea and a lime band of airglow. The pull-back (13.4
// on) multiplies the height: the plain curves into a planet, the eye passes up through the airglow
// (about 15.2, the band closing to a line on the limb), the lens lengthens 18 → 35 mm (15–17). The
// library covers every land (lit mouths, amber and steel reader points among them), the coasts are lime
// bead chains (no bead over 44 km, so the straits stay open and the islands filled), the seas near
// black. At the peak (17, 23,800 km up) the two lighthouses, at Shanghai and Tokyo, fire: their beams,
// starting on the line through the two, turn once clockwise and stop on it at 18.4 (the hush), each
// cell they cross flashing once and each reader they reach lit for good. Then the planet hangs, the
// pull running on slowly (38,000 km by 22).
// First frame (t = 12.0): 18 mm, straight up (89.6°) from the roof on the shaft's axis: all night sky,
// the stars (at 4K star for star the field in s44's mouth); with more than one sample the shutter, open
// across the roof, still catches the mouth's rim and the top galleries in this one frame. Last frame
// (t = 21.958): 35 mm, straight down: the globe about half the frame high, East Asia in the middle,
// north up, the two lighthouses lime points at Shanghai and Tokyo, the stars round it.
// Light: lime only for the library's light (the coasts, the lighthouses and their beams, the airglow);
// the land a dim warm glow of lit mouths; from 12 only the planet is drawn (no text anywhere). Mean
// brightness (960 preview, sRGB 0–255): 3.2 at the first frame, 7 in the tilt, 16–32 over the plain and
// the coasts, 10 at the peak, 12 in the beams, 4.9 at the last frame.
//
// The shaft's top: floor 120 is the last gallery; the roof is the slab above it (its top at
// y = 121 × 7.2 = 871.2 m, the mouth's rim). From the start (eye 0.8 m above floor −100's deck,
// y = −719.2) that is 1590 m: 221 floors in 12 s, 8 of them in the first 8.5 s.
// First frame: low beside the lighthouse, 9.5 m from the axis on bearing 205°, the eye 0.8 m above the
// deck, 20 mm, pitched 28° up at the lantern: the whole lens panel with the mark (turned 8° from us, lit
// from behind by the lamp), the cornice, the dome, the ball and the finial in the lower middle of the
// frame, the galleries climbing round and above it out of the top of the frame.
// Light: every lamp of every gallery lime (floors −102…120), the books and the inscription bands lit
// lime; the stone takes their light only near them, the shadows a cool blue-black; the lantern's lamp
// on (its pale lime), the sheet off; a thin haze up the shaft carries the far end to a glow (the light
// at the end). Mean brightness (960 preview, sRGB 0–255, mean of R, G, B): 32.4, the brightest 0.3 %
// centred at (0.49, 0.52), on the lantern; then 21.5–26 through the climb (the last frame 22.6).
// Last frame (t = 11.958): 18 mm, 0.35 m off the axis, looking straight up (89.6°), 90 m below the roof
// at 2.1 km/s: the galleries are streams of light (six rays from the corner lamps converge on the
// mouth), the mouth a dark hexagon of starry night sky in the middle, about a seventh of the frame wide.
// Motion blur: the frame is drawn once and blurred along each pixel's own path (world/f_mblur.js).
// From 3 floors a second (t = 8.4) the blur grows to a whole floor's travel by 5 (t = 9.0), which nulls
// the floors' flicker at every pixel (each pixel then sees exactly one period of the same pattern); past
// a floor it is a trapezoid that still nulls it. That is also the look: the galleries stream into light.
// Rotation keeps the physical shutter.
// Sound: see CUES (local s; s44 row: global = 4440 + 24 t; s45 row: global = 4728 + 24 t − 288).
import * as THREE from 'three';
import { setLens, handheld, OUTPUT_ASPECT } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep, smootherstep, ease } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Builder, MAT } from 'world/geo.js';
import { Lighthouse } from 'world/lighthouse.js';
import { Pages, rise } from 'world/pages.js';
import { pageAtlas } from 'world/pageatlas.js';
import { Sky } from 'world/f_sky.js';
import { CameraBlur } from 'world/f_mblur.js';
import { Planet, R_EARTH, BEAMS } from 'world/f_planet.js';
import { FLOOR, Y0 } from './s13.js';

export const meta = { frames: 528 };

const DEG = Math.PI / 180;
const SHUTTER = 0.5 / 24;

export const K_TOP = 120; // the last gallery; the roof is the slab above it
export const Y_ROOF = (K_TOP + 1) * LIB.H;
export const Y_START = Y0 + 0.8;
export const OUT = 12; // the eye passes the roof
export const PEAK = 17; // s45: the two lighthouses fire
export const HUSH = 18.4; // s45: the tutti stops, one note left

// ------------------------------------------------------------------------------------------ ascent

// Speed up the shaft: ln v grows at a rate that rises smoothly (a logistic step) from s0 to s1 about t1
// (width w), scaled so that the eye reaches the roof exactly at OUT. Slow and readable for eight seconds
// (the crane, then a floor every second or two: 2.4 floors a second at t = 8), then it pours: 5 at
// t = 9, 70 at t = 11, 300 at the roof (2.2 km/s), the rate of growth settling at s1.
export const ASCENT = { s0: 0.3, s1: 1.45, t1: 8.7, w: 0.5 };
const softplus = (x) => (x > 30 ? x : Math.log1p(Math.exp(x)));
function rawSpeed(t) {
  const { s0, s1, t1, w } = ASCENT;
  t = clamp(t, 0, OUT);
  return Math.exp(s0 * t + (s1 - s0) * w * (softplus((t - t1) / w) - softplus(-t1 / w)));
}
// the climb, tabulated (Simpson per step) and scaled; pure, built once
const STEP = 1 / 960;
const N_STEP = Math.round(OUT / STEP);
const RAW = new Float64Array(N_STEP + 1);
for (let i = 0; i < N_STEP; i++) {
  const a = i * STEP;
  RAW[i + 1] = RAW[i] + (STEP / 6) * (rawSpeed(a) + 4 * rawSpeed(a + STEP / 2) + rawSpeed(a + STEP));
}
const VSCALE = (Y_ROOF - Y_START) / RAW[N_STEP];
export const speedAt = (t) => VSCALE * rawSpeed(t);
export const V_OUT = speedAt(OUT);
// the speed's rate of growth at the mouth, which s45's brake carries across the roof (see S45)
const K_EXIT = ASCENT.s1;

// the eye's height (m, library frame) at t; linear before 0, s45's law after OUT
export function heightAt(t) {
  if (t <= 0) return Y_START + speedAt(0) * t;
  if (t >= OUT) return Y_ROOF + altitudeAt(t);
  const x = t / STEP;
  const i = Math.min(Math.floor(x), N_STEP - 1);
  const u = x - i;
  // cubic Hermite with the speed as slope: smooth to well under a millimetre
  const y0 = RAW[i];
  const y1 = RAW[i + 1];
  const m0 = rawSpeed(i * STEP) * STEP;
  const m1 = rawSpeed((i + 1) * STEP) * STEP;
  const u2 = u * u;
  const u3 = u2 * u;
  const r = (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * m1;
  return Y_START + VSCALE * r;
}
const speedNow = (t) =>
  t >= OUT ? (altitudeAt(t + 1e-4) - altitudeAt(t - 1e-4)) / 2e-4 : t <= 0 ? speedAt(0) : speedAt(t);

// s45: out of the shaft the climb brakes at once (the speed and its growth carried across the roof, then
// an exponential brake: at rest about 740 m up by 13), hangs a breath, and the pull-back multiplies the height
// by e^P(t): P runs 0 → 10.35 over 13.4–17.2 (smootherstep) and on at about 0.09 a second (a softplus from
// 16.8): 23,700 km up at the peak (17), 38,100 km at 22. The tilt: from the zenith down to the horizon in
// 2.4 s, then tracking it (0.7 of the half frame below it, the planet growing round into the frame) until
// the eye looks straight down; the lens 18 → 35 mm over 15–17; the slow turn spends itself (0.4 s).
export const S45 = { brake: 6.6, pull: [13.4, 3.8, 10.35], tail: [16.8, 0.4, 0.095], tilt: 2.4, below: 0.7, lens: [15, 17, 35], spin: 0.4 };
function brakeAt(s) {
  const b = S45.brake;
  const e = Math.exp(-b * s);
  return V_OUT * ((1 - e) / b + ((K_EXIT + b) * (1 - e * (1 + b * s))) / (b * b));
}
function pullAt(t) {
  const [t0, w, a] = S45.pull;
  const [t1, k, r] = S45.tail;
  const x = (t - t1) / k;
  return a * smootherstep(t0, t0 + w, t) + r * k * (x > 30 ? x : Math.log1p(Math.exp(x)));
}
// the eye's height over the roof (m), t ≥ OUT
export function altitudeAt(t) {
  return brakeAt(t - OUT) * Math.exp(pullAt(t));
}

// The blur's travel: the physical shutter, or, from 3 floors a second up, a whole floor. Measured with the
// shutter alone (flashcheck --peak 500): the floors add about 4 % of the picture in transition per floor
// a second to the crane's own 9–18 %; 4 floors a second is still under a quarter, 5.5 is not, and from
// 20 a second the shutter alone smears a floor away. So the floor-long blur is all in by 5.
export const STREAK = { f0: 3, f1: 5 }; // floors per second: the floor-long blur fades in between
// sh: this sample's share of the shutter (the engine spreads its samples over the shutter, so each one
// blurs over its own share: SHUTTER / samples; the floor-long blur stays whole in each)
function travelAt(t, sh = SHUTTER) {
  const v = speedNow(t);
  if (t >= OUT) return v * sh;
  return Math.max(v * sh, LIB.H * smoothstep(STREAK.f0, STREAK.f1, v / LIB.H));
}
// Past a floor, the blur is a box a floor long convolved with one of the rest (a trapezoid): it nulls the
// floors' period whatever the length, where a plain box would leave up to a fifth of the flicker. The
// share of the path each of its ends ramps over (0: a box).
function rampAt(t, sh = SHUTTER) {
  if (t >= OUT) return 0;
  const L = travelAt(t, sh);
  return L > LIB.H ? Math.min(LIB.H, L - LIB.H) / L : 0;
}
// the time window centred on t whose climb is the travel (bisection; the climb is monotonic)
function windowAt(t, sh = SHUTTER) {
  const L = travelAt(t, sh);
  const v = speedNow(t);
  if (L <= v * sh * 1.0001) return sh;
  let lo = sh;
  let hi = Math.max((2 * L) / v, sh * 2);
  while (heightAt(t + hi / 2) - heightAt(t - hi / 2) < L) hi *= 2;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (heightAt(t + m / 2) - heightAt(t - m / 2) < L) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------------------------------------ camera

// Off the axis on bearing BEARING at first, level with the lighthouse's deck; in over the lantern as it
// climbs, to the axis by the roof. Pitch 28° → 84° in the crane (s06's tilt, mirrored), then on to
// the zenith; a slow turn about the shaft's axis the whole way (the hexagon wheels in the frame).
export const CAM = {
  bearing: 205 * DEG,
  r: [9.5, 3.2, 1.4, 0.35], // m from the axis at 0, CRANE, 7 s, OUT
  crane: 3.4, // s: the crane and tilt
  pitch: [28 * DEG, 84 * DEG, 89.6 * DEG],
  turn: 38 * DEG, // the frame's turn over the climb
  lens: [20, 18],
};
const camState = () => ({ pos: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0, focal: 20 });

export function cameraAt(t, out = camState()) {
  const u = clamp(t / CAM.crane);
  const r = t < CAM.crane
    ? lerp(CAM.r[0], CAM.r[1], ease.inOutSine(u))
    : t < 7
      ? lerp(CAM.r[1], CAM.r[2], smootherstep(CAM.crane, 7, t))
      : lerp(CAM.r[2], CAM.r[3], smoothstep(7, OUT, t));
  const b = CAM.bearing + 22 * DEG * smoothstep(0, OUT, t);
  out.pos.set(Math.cos(b) * r, heightAt(t), Math.sin(b) * r);
  out.pitch = t < CAM.crane + 0.4
    ? lerp(CAM.pitch[0], CAM.pitch[1], ease.inOutSine(clamp((t - 0.15) / (CAM.crane + 0.25))))
    : lerp(CAM.pitch[1], CAM.pitch[2], smoothstep(CAM.crane + 0.4, OUT, t));
  // facing the axis at first (yaw = 90° − bearing looks inward), then the slow turn
  out.yaw = Math.PI / 2 - CAM.bearing + 4 * DEG + CAM.turn * ease.inSine(clamp(t / OUT));
  out.roll = 0;
  out.focal = lerp(CAM.lens[0], CAM.lens[1], smoothstep(6, OUT, t));
  if (t > OUT) {
    // s45 (see S45): the turn spends itself, the lens lengthens, the tilt goes over to the horizon's
    const s = t - OUT;
    out.yaw += ((CAM.turn * Math.PI) / 2 / OUT) * S45.spin * -Math.expm1(-s / S45.spin);
    out.focal = lerp(CAM.lens[1], S45.lens[2], smootherstep(S45.lens[0], S45.lens[1], t));
    const half = Math.atan(18 / out.focal / OUTPUT_ASPECT); // half the vertical field (setLens: 36 mm wide)
    const dip = Math.acos(R_EARTH / (R_EARTH + altitudeAt(t)));
    const g = Math.PI / 2 - dip - S45.below * half;
    const k = 1.5 * DEG; // straight down once the horizon has gone round the frame (a smooth max)
    const track = -Math.PI / 2 + (g + Math.sqrt(g * g + k * k)) / 2;
    out.pitch = lerp(CAM.pitch[2], track, smootherstep(0, S45.tilt, s));
  }
  return out;
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
function poseTo(st, t, pos, quat, shake = true) {
  pos.copy(st.pos);
  quat.setFromEuler(_e.set(st.pitch, st.yaw, st.roll, 'YXZ'));
  if (shake) {
    // a little life in the crane, gone once the climb is a flight
    const amp = 0.5 * (1 - smoothstep(2.5, 5, t));
    if (amp > 0) {
      const s = handheld(t, { amp, seed: 44 });
      pos.add(s.pos.applyQuaternion(quat));
      quat.multiply(_q.setFromEuler(s.rot));
    }
  }
}

// ------------------------------------------------------------------------------------------ world

// The roof over the last gallery: the slab (ceiling under, the moulded edge and inscription band
// facing the shaft, as every floor's), its top, and a parapet round the mouth.
function buildRoof() {
  const b = new Builder();
  const { T, AS } = LIB;
  const OUTR = 21.5; // m: the roof is drawn out to here (the cell's own; s45 tiles the planet)
  b.hexRing(AS - 0.16, OUTR, 0, MAT.STONE, true);
  b.hexRing(AS - 0.03, OUTR, -T, MAT.CEILING, false);
  b.hexExtrude(AS, [[-0.16, 0.0], [-0.16, -0.05], [-0.12, -0.09], [-0.05, -0.13], [-0.05, -0.17], [0.0, -0.19]], MAT.STONE);
  b.hexExtrude(AS, [[0.0, -0.19], [0.0, -T + 0.16]], MAT.FASCIA);
  b.hexExtrude(AS, [[0.0, -T + 0.16], [-0.06, -T + 0.13], [-0.06, -T + 0.05], [-0.03, -T + 0.02], [-0.03, -T]], MAT.STONE);
  // parapet: a plinth, a solid wall and a coping, set back from the edge
  b.hexExtrude(AS + 0.25, [[0.46, 0.0], [0.46, 0.95], [0.52, 1.0], [0.52, 1.08], [-0.06, 1.08], [-0.06, 1.0], [0.0, 0.95], [0.0, 0.0]], MAT.STONE);
  return b.geometry();
}

// The lit library: the books and the inscription bands carry the light (lit), the lamps are lime but
// low, so the stone stays dark and the lime is the accent (BIBLE: lime is lit knowledge)
export const LOOK = {
  lamp: 0.6, // the galleries' lamps…
  cast: 0.45, // …and the share of their light that reaches the stone (the globes stay as they are)
  lime: 1, // the lamps' colour, amber 0 … lime 1
  lit: 1.3, // the lit books and the inscription bands
  fogD: 0.0012, // the shaft's air (1/m) and its colour: it carries the far end to a glow
  fog: [0.0022, 0.003, 0.0012],
  amb: [0.00015, 0.0002, 0.0005], // a cool fill: the shadows go blue-black, not green
  lantern: 0.8,
  halo: 0.5,
  leafGlow: 2.0, // the leaves lit from within, like sky lanterns
  exposure: 1.0, // EV (the act's grade is 1.25)
  shadows: [-0.012, -0.006, 0.03], // the grade's shadow tint (the act's is [-0.01, -0.004, 0.02])
};
// The lens panel faces the camera, but not squarely: the lantern's flash fires when the camera's bearing
// is within a few hundredths of a radian of it (main.md: at least 0.1 rad off)
const LENS_OFF = -8 * DEG;

// Sky lanterns: leaves rising up the whole shaft, each on its own; drawn only near the camera's height.
export const LANTERNS = { count: 9000, seed: 44, r0: 2.6, r1: 11.2, ahead: 420, behind: 15 };
const FIELD = {
  seed: LANTERNS.seed,
  y0: Y_START - 12,
  y1: Y_ROOF + 30,
  r0: LANTERNS.r0,
  r1: LANTERNS.r1,
  speed: [0.35, 0.8],
  glow: [0.55, 1.0],
};

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, 4000);

  const lib = new Library({ floors: [FLOOR - 2, K_TOP], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  const U = lib.uniforms;
  // The film carries no credits: the writer's credit once carved in floor 0's rail (library.js: PLAQUE)
  // is drawn by libshader only while uPlaqueK.x > 0. Nothing this shot loads turns it on; it is held
  // off here and checked every frame (update throws), so no frame of s44 or s45 can show it.
  U.uPlaqueK.value.set(0, 0, 0);
  U.uPlaque.value = null;

  const roof = new THREE.Mesh(buildRoof(), lib.material);
  roof.position.y = Y_ROOF;
  roof.frustumCulled = false;
  scene.add(roof);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);
  lh.set({ angle: CAM.bearing + LENS_OFF, glow: 1, beam: 0, vol: 0, trail: 0, dot: 1, windows: 1, bounce: 1.2 });

  const atlas = await pageAtlas({ scale: 2, seed: 4, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LANTERNS.count });
  scene.add(leaves.mesh);

  const sky = new Sky();
  scene.add(sky.mesh);

  // s45: the planet (world/f_planet.js), O at the roof on the shaft's axis, north up in the last frame;
  // from OUT it is all there is (the eye has left the library's geometry behind)
  const planet = new Planet({ origin: new THREE.Vector3(0, Y_ROOF, 0), yaw: cameraAt(22).yaw, sky: sky.uniforms });
  planet.mesh.visible = false;
  scene.add(planet.mesh);
  if (Math.abs(BEAMS.t0 - CUES.beams[0]) > 1e-6 || Math.abs(BEAMS.t0 + BEAMS.turn - CUES.beams[1]) > 1e-6) {
    throw new Error(`[s44] CUES.beams ${CUES.beams} and the planet's beams ${BEAMS.t0}+${BEAMS.turn} disagree`);
  }

  // the look, from LOOK (look-dev changes LOOK and applies it again)
  const LAMP_I = U.uLampI.value;
  function applyLook() {
    lib.setAll((k) => {
      if (k > K_TOP + 1) return { lit: 0, lamp: 0, lime: 1 };
      if (k === K_TOP + 1) return { lit: 1, lamp: 0, lime: 1 }; // the mouth's inscription band
      return { lit: 0.85 + 0.15 * hash(k, 441), lamp: LOOK.lamp * (0.9 + 0.1 * hash(k, 442)), lime: LOOK.lime };
    });
    U.uLampI.value = LAMP_I * LOOK.cast;
    U.uLitGlow.value = LOOK.lit;
    U.uFogD.value = LOOK.fogD;
    U.uFogCol.value.setRGB(...LOOK.fog);
    U.uAmb.value.setRGB(...LOOK.amb);
    lh.set({ lamp: LOOK.lantern, halo: LOOK.halo });
    leaves.uniforms.uGlowI.value = LOOK.leafGlow;
    sky.uniforms.uHazeCol.value.copy(U.uFogCol.value);
    sky.uniforms.uHazeD.value = U.uFogD.value;
  }
  applyLook();

  const blur = new CameraBlur(ctx.width, ctx.height, { maxSamples: 48, step: 1.5 });

  const st = camState();
  const ends = [
    { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
  ];
  const tmpQ = new THREE.Quaternion();
  const tmpP = new THREE.Vector3();
  let frameSeed = 0;
  let frameRamp = 0;
  let frameOut = false;

  // leaves: keep clear of the lantern and of the camera's own path while it is off the axis
  const leaf = { q: new THREE.Quaternion() };
  const camXZ = (y) => {
    // where the camera is when it passes height y (only matters low down, in the crane)
    let lo = -1;
    let hi = OUT;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (heightAt(m) < y) lo = m;
      else hi = m;
    }
    return cameraAt(hi, st).pos.clone();
  };
  const CLEAR = [];
  for (let y = Y_START - 12; y < Y_START + 60; y += 0.5) CLEAR.push(camXZ(y));
  const clearOf = (x, y, z) => {
    if (y < Y0 + 10.5 && Math.hypot(x, z) < 4.3) return false;
    const i = Math.round((y - (Y_START - 12)) / 0.5);
    if (i < 0 || i >= CLEAR.length) return true;
    const c = CLEAR[i];
    return Math.hypot(x - c.x, z - c.z) > 2.4;
  };

  // once the blur outgrows the shutter, the leaves near the eye would smear into bands across the frame:
  // they shrink away within a few blur lengths of it
  function placeLeaves(t, cam, sh) {
    const L = travelAt(t, sh);
    let n = 0;
    for (let i = 0; i < LANTERNS.count; i++) {
      const s = leaves.st;
      s.visible = true;
      s.lime = s.glow = s.burn = 0;
      rise(i, t + 30, FIELD, s);
      const dy = s.y - cam.y;
      if (dy < -LANTERNS.behind || dy > LANTERNS.ahead) continue;
      if (!clearOf(s.x, s.y, s.z)) continue;
      const k = smoothstep(1.2 * L, 3.5 * L, Math.hypot(s.x - cam.x, dy, s.z - cam.z));
      if (k < 0.02) continue;
      s.scale *= k;
      leaves.set(n++, s);
    }
    leaves.mesh.count = n;
    leaves.commit();
  }

  // keep the plan honest: the cues were measured from this climb
  const got = ascentCues();
  const off = (a, b) => (typeof a === 'number' ? !(Math.abs(a - b) <= 0.03) : Object.keys(a ?? {}).some((k) => off(a[k], b?.[k])));
  for (const k of Object.keys(got)) {
    if (off(got[k], CUES[k])) console.warn(`[s44] CUES.${k} is ${JSON.stringify(CUES[k])}, the climb gives ${JSON.stringify(got[k])}`);
  }

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    look: applyLook, // look-dev only
    update(t) {
      if (U.uPlaqueK.value.x !== 0 || U.uPlaque.value) throw new Error('[s44] the carved credit is switched on');
      cameraAt(t, st);
      setLens(camera, st.focal);
      poseTo(st, t, camera.position, camera.quaternion);
      camera.updateMatrixWorld(true);
      frameOut = t >= OUT;
      lib.group.visible = roof.visible = lh.group.visible = leaves.mesh.visible = sky.mesh.visible = !frameOut;
      planet.mesh.visible = frameOut;
      const sh = SHUTTER / Math.max(1, ctx.samples || 1); // this sample's share of the shutter (see travelAt)
      if (frameOut) planet.update(camera, { width: ctx.width, height: ctx.height, t, shutter: sh });
      else {
        lib.update(camera);
        lh.update(camera);
        U.uTime.value = 70 + t;
        placeLeaves(t, camera.position, sh);
        sky.update(camera, ctx.height);
        sky.uniforms.uHazeTop.value = Math.max(0, Y_ROOF - camera.position.y);
      }
      // the blur's two ends: translation over the travel window, rotation over the shutter
      const W = windowAt(t, sh);
      for (const [j, e] of [[0, -1], [1, 1]]) {
        const E = ends[j];
        cameraAt(t + (e * W) / 2, st);
        poseTo(st, t + (e * W) / 2, E.position, tmpQ);
        cameraAt(t + (e * sh) / 2, st);
        poseTo(st, t + (e * sh) / 2, tmpP, E.quaternion);
      }
      // keep the current lens and jitter: the ends differ from now only by the camera's motion
      frameSeed = Math.round(t * 24 * 8);
      frameRamp = rampAt(t, sh);
    },
    render(renderer, target) {
      // s45: the stars as good as infinitely far; the planet's pixels on its sphere, so they blur as the eye flies
      const out = frameOut ? { far: 1e15, sphere: planet.sphere } : {};
      blur.render(renderer, scene, camera, target, ends[0], ends[1], { seed: frameSeed, ramp: frameRamp, ...out });
    },
    post(t) {
      return {
        exposure: LOOK.exposure,
        grade: { shadowTint: LOOK.shadows },
        bloom: { strength: 0.1 },
        halation: { strength: 0.14, threshold: 0.85 },
      };
    },
  };
}

// The climb's cues, measured from it (setup checks CUES against them): the eye passing each floor's
// deck while the floors can still be counted (under STREAK.f0 a second), then every tenth floor; and the
// galleries starting to stream into light and all streaming (the blur growing to a whole floor).
export function ascentCues() {
  const r2 = (x) => +x.toFixed(2);
  const pass = [];
  const tens = [];
  let k = Math.floor(Y_START / LIB.H) + 1;
  for (let f = 0; f <= OUT * 240; f++) {
    const t = f / 240;
    while (k <= K_TOP && heightAt(t) >= k * LIB.H) {
      if (speedAt(t) / LIB.H < STREAK.f0) pass.push({ t: r2(t), k });
      else if (k % 10 === 0) tens.push({ t: r2(t), k });
      k++;
    }
  }
  const when = (rate) => {
    let lo = 0;
    let hi = OUT;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (speedAt(m) / LIB.H < rate) lo = m;
      else hi = m;
    }
    return r2(hi);
  };
  return { floors: { pass, tens }, streaks: [when(STREAK.f0), when(STREAK.f1)] };
}

// Sound cues, local s (s44 row: global = 4440 + 24 t; s45 row: global = 4728 + 24 t − 288).
export const CUES = {
  cut: { t: 0 }, // the tutti lands on the cut
  crane: [0, CAM.crane], // up past the lantern, tilting up the shaft
  // the eye passes floor k's deck (counted while under 3 a second, then every tenth)
  floors: {
    pass: [
      { t: 2.94, k: -99 }, { t: 4.63, k: -98 }, { t: 5.74, k: -97 }, { t: 6.57, k: -96 },
      { t: 7.22, k: -95 }, { t: 7.76, k: -94 }, { t: 8.18, k: -93 },
    ],
    tens: [
      { t: 9.01, k: -90 }, { t: 10.01, k: -80 }, { t: 10.43, k: -70 }, { t: 10.69, k: -60 },
      { t: 10.88, k: -50 }, { t: 11.03, k: -40 }, { t: 11.15, k: -30 }, { t: 11.25, k: -20 },
      { t: 11.34, k: -10 }, { t: 11.42, k: 0 }, { t: 11.49, k: 10 }, { t: 11.56, k: 20 },
      { t: 11.62, k: 30 }, { t: 11.67, k: 40 }, { t: 11.72, k: 50 }, { t: 11.77, k: 60 },
      { t: 11.81, k: 70 }, { t: 11.85, k: 80 }, { t: 11.89, k: 90 }, { t: 11.93, k: 100 },
      { t: 11.97, k: 110 }, { t: 12, k: 120 },
    ],
  },
  streaks: [8.39, 8.98], // the galleries start to stream into light, and all of them do
  out: OUT, // the eye passes the roof (s45's first frame is 12.0)
  peak: PEAK, // s45: the highest point
  beams: [PEAK, HUSH], // s45: both lighthouses' beams sweep the planet once, clockwise, and stop (world/f_planet.js BEAMS)
  hush: HUSH, // s45: the tutti cut, one note left
};
