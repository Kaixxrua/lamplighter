// s13 · 0:35–0:39 · 青柠扫描线 (global 840–935)
// Act II opens in the dark, as on a radar screen. We look straight down the shaft at its bottom, eighty
// metres below, where the lighthouse stands unlit and unseen. Out of s12's black: one lime point and,
// with it, the ping. A page falling past the lantern has been struck by a pulse of light, frozen where
// it was, and has caught: the first signal, up and to the right of the centre, where the dot of the
// AIGCNEWS mark sits. A second later the light comes back and stays, a flame opening into the sheet: a
// line from the centre out through the point (the bar of the mark), and where it meets the galleries
// about the lighthouse, three short marks, one ring after another (range rings). Then the line begins
// to turn, clockwise, quickening to a turn a bar of the score, and paints the rings as it goes, leaving
// an afterglow; leaves falling in the dark light up as it crosses them (blips), each frozen where the
// light found it. Most of them are grey echoes that fade with the afterglow; a few, all GitHub pages,
// READMEs and trending lists, catch lime and stay lit.
// First frame: black but for the lime point (the cut from s12 lands on the ping).
// Last frame: the line pointing down the frame, turning at full speed; the right half of the screen
// swept, the rings glowing behind the line and fading back towards the first signal, the grey echoes
// fading with them, the lime pages and the first signal lit. s14 cuts to the lighthouse.
// Camera: on the shaft's axis, 80 m above the lighthouse's deck (floor −100: deep under anything
// s06 and s10 show), looking straight down, 35 mm, locked off; the frame's top is the world's +x, so a
// bearing θ is at 90° − θ on screen and the sheet turns clockwise.
// Light: the lighthouse's sheet only; every lamp of the library is out, the air black.
// Sound: see CUES (s into the shot; global frame = 840 + 24 t).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH } from 'world/lighthouse.js';
import { Pages, fall } from 'world/pages.js';
import { pageAtlas } from 'world/pageatlas.js';

// the sheet's edge crosses the rings at ~40 px a frame at 4K: eight samples keep it one line
// the light is lime on black: a wider glow than the act's, and less of its warm halation, which
// would rim the lime with orange
export const meta = { frames: 96, quality: { final: { samples: 8 } }, post: { bloom: { strength: 0.16 }, halation: { strength: 0.1 } } };

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const END = meta.frames / 24;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

// ------------------------------------------------------------------------------------------- world

export const START = 1392; // global frame: the clock of the sweep and of the leaves (s14 continues both)
export const FLOOR = -100; // the lighthouse's floor
export const Y0 = FLOOR * LIB.H; // its deck
const LAMP = Y0 + LH.LAMP_Y; // the lantern's lamp: the sheet's origin

export const VIEW = { height: 80, lens: 35 }; // m above the deck, on the axis

// ------------------------------------------------------------------------------------------- sweep

// The sheet: a pulse at 0 (the ping), back at ON as a flame opening to the full fan by OPEN, when it
// begins to turn, reaching OMEGA after ACC seconds.
export const SWEEP = {
  theta0: 45 * DEG, // the first bearing: up and right of the centre on screen, the mark's 45°
  on: 1.0,
  open: 1.5,
  acc: 2.0,
  omega: Math.PI / 2, // rad/s: a turn every four seconds, a bar at 60 bpm
  fan: { up: 0.66, dn: 0.75 },
};

// the sheet's bearing T s after global frame 840 (rad, increasing)
export function sweepAngle(T) {
  const { theta0, open, acc, omega } = SWEEP;
  if (T <= open) return theta0;
  const u = (T - open) / acc;
  if (u >= 1) return theta0 + omega * acc * 0.5 + omega * (T - open - acc);
  return theta0 + omega * acc * (u ** 3 - u ** 4 / 2);
}
// its speed (rad/s): a smoothstep from rest to OMEGA
export const sweepSpeed = (T) => SWEEP.omega * smoothstep(0, 1, (T - SWEEP.open) / SWEEP.acc);

const PULSE = 0.6; // the ping's pulse, decaying in a tenth of a second
const BEAM = 0.55; // the sheet once open, on the galleries and the leaves
const TRAIL = 0.6; // afterglow at full speed…
const PERSIST = 0.35; // …and its time to 1/e (s): the echoes fade, the caught pages stay
const VOL = 0.045; // the line in the air: lime, below the caught pages

function sheetAt(T) {
  const s = smoothstep(SWEEP.on, SWEEP.open, T);
  const w = sweepSpeed(T);
  return {
    angle: sweepAngle(T),
    beam: PULSE * Math.exp(-Math.max(T, 0) / 0.12) + BEAM * s,
    vol: VOL * s,
    fanUp: lerp(0.02, SWEEP.fan.up, s),
    fanDn: lerp(0.02, SWEEP.fan.dn, s),
    trail: TRAIL * (w / SWEEP.omega),
    trailLen: Math.max(0.05, w * PERSIST),
    trailArc: sweepAngle(T) - SWEEP.theta0,
    lamp: 0,
    glow: 0,
    dot: 1,
    windows: 0,
    halo: 0,
  };
}

// ------------------------------------------------------------------------------------------ leaves

// Leaves falling through the dark about the lighthouse, between its deck rail and the balustrades;
// unseen until the sheet finds them. Their clock is T + T_OFF (they have been falling a while).
// The site's sources, GitHub first: READMEs (5) and trending lists (10).
const DESIGNS = [5, 5, 5, 5, 10, 10, 10, 2, 2, 0, 0, 1, 4, 6, 3, 7, 11, 12, 13, 14, 8, 9];
export const FIELD = { seed: 31, y0: Y0 - 14, y1: Y0 + 16, r0: 3.9, r1: 11.6, speed: [0.55, 1.05], swirl: 0, designs: DESIGNS };
export const LEAVES = 1200;
export const T_OFF = 20;
const GITHUB = new Set([5, 10]);
const LIME = 0.12; // share of the GitHub pages the sheet finds that catch

// The first page: a README, frozen at the lamp's height on the first bearing, leaning back from the
// lantern so that the light falls full on its face and we see that face from above.
export const HERO = { r: 7.5, tilt: 45 * DEG, design: 5, seed: 0.37 };

// Which leaves the sheet finds, and when (s since global 840): a leaf is frozen where it is at the first
// instant the turning sheet crosses its bearing while it is inside the fan. Leaves in a wedge about the
// first bearing are not in the field: the line stands there half a second before it turns, and stays
// clean but for the first page (the wedge: the sheet's width and a leaf's flutter, 0.6 m at most).
const plans = new Map();
export function freezePlan(T1 = END + 0.05) {
  if (plans.has(T1)) return plans.get(T1);
  const drop = new Uint8Array(LEAVES);
  const tc = new Float32Array(LEAVES).fill(Infinity);
  const lime = new Uint8Array(LEAVES);
  const st = { q: new THREE.Quaternion() };
  const base = { ...FIELD, flutter: 0 };
  const DT = 1 / 96;
  const delta = (i, T) => {
    fall(i, T + T_OFF, FIELD, st);
    return wrap(Math.atan2(st.z, st.x) - sweepAngle(T));
  };
  for (let i = 0; i < LEAVES; i++) {
    fall(i, 0, base, st);
    const r = Math.hypot(st.x, st.z);
    if (Math.abs(wrap(Math.atan2(st.z, st.x) - SWEEP.theta0)) < 0.05 + 0.65 / r) {
      drop[i] = 1;
      continue;
    }
    const design = st.design;
    let prev = delta(i, SWEEP.open);
    for (let k = 1; SWEEP.open + k * DT <= T1; k++) {
      const T = SWEEP.open + k * DT;
      const d = delta(i, T);
      if (prev > 0 && d <= 0 && prev - d < Math.PI) {
        let lo = T - DT;
        let hi = T;
        for (let j = 0; j < 14; j++) {
          const m = (lo + hi) / 2;
          if (delta(i, m) > 0) lo = m;
          else hi = m;
        }
        fall(i, hi + T_OFF, FIELD, st);
        const e = (st.y - LAMP) / Math.hypot(st.x, st.z);
        if (e > -SWEEP.fan.dn && e < SWEEP.fan.up) {
          tc[i] = hi;
          lime[i] = GITHUB.has(design) && hash(i, FIELD.seed, 77) < LIME ? 1 : 0;
          break;
        }
      }
      prev = d;
    }
  }
  const plan = { drop, tc, lime };
  plans.set(T1, plan);
  return plan;
}

// a caught page: catches in a couple of frames, flares and settles
const GLOW = 0.8; // a caught page's steady lime
export const limeAt = (dt) => (dt < 0 ? 0 : GLOW * (1 - Math.exp(-dt / 0.05)) * (1 + 1.2 * Math.exp(-dt / 0.25)));

const _m = new THREE.Matrix4();
export function heroState(T, st) {
  const { r, tilt } = HERO;
  const th = SWEEP.theta0;
  const out = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
  const n = out.clone().multiplyScalar(-Math.cos(tilt)).add(new THREE.Vector3(0, Math.sin(tilt), 0)); // face: to the lantern and up
  const u = out.clone().multiplyScalar(Math.sin(tilt)).add(new THREE.Vector3(0, Math.cos(tilt), 0)); // the page's top: away and up
  const x = new THREE.Vector3().crossVectors(u, n);
  st.q.setFromRotationMatrix(_m.makeBasis(x, u, n));
  st.x = r * out.x;
  st.y = LAMP;
  st.z = r * out.z;
  st.scale = 1;
  st.bend = 0.7;
  st.twist = 0.5;
  st.curl = 0.4;
  st.ripple = 0.012;
  st.phase = 1.3;
  st.design = HERO.design;
  st.seed = HERO.seed;
  st.lime = GLOW * (1 + 1.0 * Math.exp(-Math.max(T, 0) / 0.25));
}

// --------------------------------------------------------------------------------------------- cues

export const CUES = {
  ping: { t: 0, reverb: 6 }, // the first page caught: the radar's ping, its tail running under s14
  line: { t0: SWEEP.on, t1: SWEEP.open }, // the light comes back as a flame and opens into the sheet
  turn: { t0: SWEEP.open, full: SWEEP.open + SWEEP.acc, omega: 90 }, // starts to turn; deg/s at full speed
  // each leaf the sheet finds: when, its bearing (deg), where across the frame (pan: −1 left, +1 right;
  // the frame's right is the world's +z) and whether it catches
  get blips() {
    const P = freezePlan();
    const st = { q: new THREE.Quaternion() };
    const out = [];
    for (let i = 0; i < LEAVES; i++) {
      if (!(P.tc[i] < END)) continue;
      fall(i, P.tc[i] + T_OFF, FIELD, st);
      out.push({
        t: +P.tc[i].toFixed(3),
        bearing: +((Math.atan2(st.z, st.x) / DEG + 360) % 360).toFixed(1),
        pan: +clamp(st.z / 12, -1, 1).toFixed(2),
        lime: !!P.lime[i],
      });
    }
    return out.sort((a, b) => a.t - b.t);
  },
};

// -------------------------------------------------------------------------------------------- shot

export async function build(ctx, view = VIEW) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 1, 400);
  const kc = Math.floor((Y0 + view.height) / LIB.H);
  const lib = new Library({ floors: [FLOOR - 3, kc], near: 2, mid: kc - FLOOR + 2, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: 0 }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES + 1 });
  scene.add(leaves.mesh);
  const P = freezePlan();
  // Leaves above or below the fan are beyond the light's reach: they are left out, so that they do not
  // cut the line as black flecks between it and us. They fall into the fan unlit, and come up softly
  // through its edge if the afterglow is there.
  const motion = (i, T, sh, st) => {
    if (i === LEAVES) return heroState(T, st);
    if (P.drop[i]) {
      st.visible = false;
      return;
    }
    const frozen = T >= P.tc[i];
    fall(i, (frozen ? P.tc[i] : T) + T_OFF, FIELD, st);
    if (frozen && P.lime[i]) st.lime = limeAt(T - P.tc[i]);
    const e = (st.y - LAMP) / Math.hypot(st.x, st.z);
    if (!frozen && (e > sh.fanUp + 0.05 || e < -sh.fanDn - 0.05)) st.visible = false;
  };

  const pos = new THREE.Vector3(0, Y0 + view.height, 0);
  const target = new THREE.Vector3(0, Y0, 0);
  const up = new THREE.Vector3(1, 0, 0);

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      setLens(camera, view.lens);
      aim(camera, pos, target, { up });
      lib.update(camera);
      U.uTime.value = 40 + t;
      const sh = sheetAt(t);
      lh.set(sh);
      lh.update(camera);
      leaves.fill(LEAVES + 1, t, motion, sh);
    },
  };
}

export async function setup(ctx) {
  return build(ctx, VIEW);
}
