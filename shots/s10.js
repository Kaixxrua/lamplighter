// s10 · 0:27–0:33 · 纸页暴风雪 (global 648–791) · card c3: 一切都已写下。／却没有人找得到。
// The flood at its height. We fall down the middle of the shaft with the storm, looking straight down
// it, and the shaft turns under us: ring after ring of galleries, amber lamps converging on the dark,
// and between us and the dark a blizzard of pages, READMEs and trending lists first, papers, code,
// news, threads, every script of the library, wheeling about the shaft and falling with us. In the
// eye of the storm, over the abyss, the card in two beats: everything has been written; and no one
// can find any of it. On the second beat the lamps below begin to go out, floor by floor, the dark
// climbing the shaft toward us; the pages go down into it, lost.
// First frame: the shaft from above, turning; pages wheeling down into it.
// Last frame: the storm at its height and the dark come up to it: the lamps out up to floor 3, the
// galleries gone, only the leaves about us still lit, the fall and the turn fastest (s11 cuts in on it).
// Camera: on the shaft's axis (a little off it), looking straight down, 35 mm, f/2.8; falls 15 m from
// floor 7 to floor 5, quickening, and turns 50° about the axis against the storm, quickening.
// Light: the library's lamps as in s05–s09 (floor 6's burn low), out below floor −1 from the start;
// the air of the storm is thicker than in s09, so the depths fade sooner.
// Sound: the noise at its peak; see CUES (s into the shot; global frame = 648 + 24 t).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { Library } from 'world/library.js';
import { Pages, fall } from 'world/pages.js';
import { pageAtlas } from 'world/pageatlas.js';
import { Dust } from 'world/dust.js';

// the storm turns and tumbles fast enough that two samples of the shutter show as two leaves
export const meta = { frames: 144, quality: { final: { samples: 6 } } };

const DEG = Math.PI / 180;
const END = meta.frames / 24;

// ------------------------------------------------------------------------------------------ camera

export const VIEW = {
  x: 0.4, // m off the axis
  z: -0.3,
  y0: 53, // m: the start, in floor 7 (floor k is k·7.2 to (k+1)·7.2)
  y1: 38, // m: the end, in floor 5
  tilt: 3, // deg off straight down
  turn: -50, // deg about the axis over the shot, against the storm's wheel
  lens: 35,
  fstop: 2.8,
  focus: 7, // m
};

// How far through the fall and the turn at time t: both start slow and quicken to the cut.
const sink = (t) => {
  const u = clamp(t / END);
  return 0.25 * u + 0.75 * u * u;
};

function camAt(view, t, pos, target, up) {
  const u = sink(t);
  pos.set(view.x, lerp(view.y0, view.y1, u), view.z);
  const turn = view.turn * u * DEG;
  // looking down, tipped a little; up is the image's top in the world
  const tip = view.tilt * DEG;
  const a = turn + 0.6;
  target.set(pos.x + Math.sin(tip) * Math.cos(a), pos.y - Math.cos(tip), pos.z + Math.sin(tip) * Math.sin(a));
  up.set(Math.cos(turn), 0, Math.sin(turn));
}

// ------------------------------------------------------------------------------------------- lamps

// The lamps as in s05–s09; below the dark line they are out. The line starts under floor −1 and on
// the second beat climbs a floor at a time, quicker and quicker, each floor guttering before it goes.
const DARK0 = -1; // the lowest lit floor at the start
const OUTS = [64, 84, 102, 118, 132]; // frames: floors −1, 0, 1, 2, 3 go out
const GUTTER = 10; // frames of guttering before a floor goes out

function lampOf(k) {
  return hash(k, 61) < 0.04 ? 0.15 : 0.72 + 0.28 * hash(k, 62);
}

// 0..1: how lit floor k's lamps are at frame f
function alive(k, f) {
  if (k < DARK0) return 0;
  const i = k - DARK0;
  if (i >= OUTS.length) return 1;
  const f0 = OUTS[i];
  if (f >= f0) return 0;
  if (f < f0 - GUTTER) return 1;
  // guttering: dips (twelve a second at most) that come oftener and deepen, then out
  const u = (f - (f0 - GUTTER)) / GUTTER;
  const n = hash(k, Math.floor(f / 2), 63);
  return clamp(1 - u * u * 0.6 - (n < 0.3 + 0.5 * u ? 0.35 + 0.5 * n : 0));
}

// the frame a floor (DARK0 + i) is dark from: the last dip of its guttering can put it out a frame or two early
function darkFrom(i) {
  let f = OUTS[i];
  while (f > OUTS[i] - GUTTER && alive(DARK0 + i, f - 1) < 0.05) f--;
  return f;
}

// ------------------------------------------------------------------------------------------- pages

// Two flights of leaves wheeling down the shaft: the storm across the whole shaft, and a thicker
// flight about its middle that we fall through. Each thins out at the bottom of its column, far below
// us, as if into the depths, and starts again above us, out of sight.
const STORM = 2000;
const NEAR = 900;
const LEAVES = STORM + NEAR;
// the site's sources, GitHub first: READMEs and the trending list, code, papers, news, threads; and the
// whispers of every script
const DESIGNS = [5, 5, 5, 5, 10, 10, 10, 2, 2, 0, 0, 1, 4, 6, 3, 7, 11, 12, 13, 14, 8, 9];
const flights = (view) => [
  { seed: 21, y0: view.y1 - 18, y1: view.y0 + 6, r0: 1.0, r1: 11.6, speed: [1.4, 2.8], swirl: 0.6, tumble: 0.35, designs: DESIGNS },
  { seed: 22, y0: view.y1 - 18, y1: view.y0 + 6, r0: 0.6, r1: 6.0, speed: [1.5, 2.6], swirl: 0.7, tumble: 0.45, designs: DESIGNS },
];
const THIN = 4; // m: the bottom of a column where its leaves dwindle away
// the storm's own clock: it runs faster and faster (×1 at the start, ×1.8 at the cut)
const storm = (t) => t + (0.4 * t * t) / END;

function leafAt(i, t, fl, st) {
  const o = i < STORM ? fl[0] : fl[1];
  fall(i, storm(t), o, st);
  st.scale *= clamp((st.y - o.y0) / THIN);
}

// The eye of the storm: while the card is up, no leaf within DEEP of us crosses the calm over the
// abyss where it is written (far ones may: small, and dimmed by the haze). A leaf whose path would
// cross it, or come near it (the nearer, the likelier), is not in the storm at all.
const CARD = [10, 140]; // local frames the card is on screen (c3: global 658–788)
// NDC: the calm about the card's words, a rounded rectangle |x/a|⁴ + |y/b|⁴ < 1
const EYE = { y: 0.02, a: 0.31, b: 0.26, soft: 0.35 };
const DEEP = 26; // m
const REACH = 0.27; // m: a leaf's half-diagonal at scale 1

function eyePlan(view, fl) {
  const hide = new Uint8Array(LEAVES);
  const eMin = new Float32Array(LEAVES).fill(Infinity);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const up = new THREE.Vector3();
  const p = new THREE.Vector3();
  const st = { q: new THREE.Quaternion() };
  const f = view.lens / 1000;
  const blurK = (f * f) / (view.fstop * (view.focus - f)) / 0.036; // CoC per |d − s|/d, in frame widths
  for (let fr = CARD[0]; fr <= CARD[1]; fr++) {
    const t = fr / 24;
    setLens(cam, view.lens);
    camAt(view, t, pos, target, up);
    aim(cam, pos, target, { up });
    cam.updateMatrixWorld(true);
    const tanV = Math.tan((cam.fov * DEG) / 2);
    const tanH = tanV * cam.aspect;
    for (let i = 0; i < LEAVES; i++) {
      leafAt(i, t, fl, st);
      p.set(st.x, st.y, st.z).applyMatrix4(cam.matrixWorldInverse);
      const d = -p.z;
      if (d < 0.05 || d > DEEP) continue;
      const blur = Math.min(0.01, (blurK * Math.abs(d - view.focus)) / d) * 2; // NDC x
      const rx = (REACH * st.scale) / (d * tanH) + blur;
      const ry = (REACH * st.scale) / (d * tanV) + blur * cam.aspect;
      const e = Math.sqrt(Math.hypot((p.x / (d * tanH) / (EYE.a + rx)) ** 2, ((p.y / (d * tanV) - EYE.y) / (EYE.b + ry)) ** 2));
      if (e < eMin[i]) eMin[i] = e;
    }
  }
  for (let i = 0; i < LEAVES; i++) {
    const e = eMin[i];
    if (e < 1 || (e < 1 + EYE.soft && hash(i, 73) < (1 + EYE.soft - e) / EYE.soft)) hide[i] = 1;
  }
  return hide;
}

const plans = new Map();
function planFor(view) {
  const key = JSON.stringify(view);
  if (!plans.has(key)) plans.set(key, eyePlan(view, flights(view)));
  return plans.get(key);
}

// --------------------------------------------------------------------------------------------- cues

// Leaves that brush past the lens: each time a leaf in the storm comes within BRUSH of the camera
// and goes away again, with how near (m), how fast (m/s, against the camera) and where (pan: −1 left
// of the frame, +1 right; the camera looks down, so the frame's right is its x).
const BRUSH = 1.5; // m
function brushes(view) {
  const fl = flights(view);
  const hide = planFor(view);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const up = new THREE.Vector3();
  const p = new THREE.Vector3();
  const st = { q: new THREE.Quaternion() };
  const STEP = 0.5 / 24; // s
  const rel = [new Float32Array(LEAVES * 3), new Float32Array(LEAVES * 3), new Float32Array(LEAVES * 3)];
  const out = [];
  for (let k = 0, t = 0; t <= END; k++, t = k * STEP) {
    setLens(cam, view.lens);
    camAt(view, t, pos, target, up);
    aim(cam, pos, target, { up });
    cam.updateMatrixWorld(true);
    const [r0, r1, r2] = [rel[k % 3], rel[(k + 2) % 3], rel[(k + 1) % 3]]; // now, a step ago, two steps ago
    for (let i = 0; i < LEAVES; i++) {
      if (hide[i]) continue;
      leafAt(i, t, fl, st);
      p.set(st.x, st.y, st.z).applyMatrix4(cam.matrixWorldInverse);
      r0[i * 3] = p.x;
      r0[i * 3 + 1] = p.y;
      r0[i * 3 + 2] = p.z;
      if (k < 2) continue;
      const d0 = Math.hypot(p.x, p.y, p.z);
      const d1 = Math.hypot(r1[i * 3], r1[i * 3 + 1], r1[i * 3 + 2]);
      const d2 = Math.hypot(r2[i * 3], r2[i * 3 + 1], r2[i * 3 + 2]);
      if (d1 < BRUSH && d1 < d2 && d1 <= d0) {
        const v = Math.hypot(p.x - r2[i * 3], p.y - r2[i * 3 + 1], p.z - r2[i * 3 + 2]) / (2 * STEP);
        out.push({ t: +(t - STEP).toFixed(3), d: +d1.toFixed(2), v: +v.toFixed(2), pan: +(r1[i * 3] / d1).toFixed(2) });
      }
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

const camY = (view, t) => lerp(view.y0, view.y1, sink(t));
export const CUES = {
  // the storm's clock: the noise rises with it (×1 at the start, ×1.8 at the cut), and the wind of the
  // fall with the camera's speed (m/s)
  storm: { rate: [1, 1.8], fall: [(VIEW.y0 - VIEW.y1) * 0.25 / END, (VIEW.y0 - VIEW.y1) * 1.75 / END] },
  // each floor's lamps: guttering from t0, dark at t; depth (m) below the camera when they go
  outs: OUTS.map((f, i) => ({
    t0: +((f - GUTTER) / 24).toFixed(3),
    t: +(darkFrom(i) / 24).toFixed(3),
    floor: DARK0 + i,
    depth: +(camY(VIEW, darkFrom(i) / 24) - ((DARK0 + i) * 7.2 + 3.9)).toFixed(1),
  })),
  get brushes() {
    return brushes(VIEW);
  },
};

export async function build(ctx, view = VIEW) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const lib = new Library({ floors: [-60, 9], near: 2, mid: 9, height: ctx.height });
  scene.add(lib.group);
  const U = lib.uniforms;
  U.uFogD.value = 0.03; // the air of the storm, thick with the paper's dust
  U.uFogCol.value.setRGB(0.03, 0.021, 0.013);

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES });
  scene.add(leaves.mesh);
  const dust = new Dust({ uniforms: U, count: 16000, box: 18, seed: 5 });
  scene.add(dust.points);

  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const up = new THREE.Vector3();
  const fl = flights(view);
  const hide = planFor(view);

  return {
    scene,
    camera,
    clearColor: U.uFogCol.value,
    update(t) {
      const f = t * 24;
      lib.setAll((k) => ({ lit: 0, lime: 0, lamp: lampOf(k) * alive(k, f) }));
      setLens(camera, view.lens);
      camAt(view, t, pos, target, up);
      aim(camera, pos, target, { up });
      lib.update(camera);
      U.uTime.value = 30 + t;
      leaves.fill(LEAVES, t, leafAt, fl, (i, st) => {
        if (hide[i]) st.visible = false;
      });
      dust.update(camera, 30 + t, { focus: view.focus, fstop: view.fstop, width: ctx.width });
    },
    post: () => ({ dof: { focus: view.focus, fstop: view.fstop, maxBlur: 0.01 } }),
  };
}

export async function setup(ctx) {
  return build(ctx, VIEW);
}
