// s37 160 ms (the split): global 3600–3719, 120 frames (5 s), 2:30–2:35, act 3; one picture for both
// languages (the words in it are code).
//
// The query and its return, split. Right: our reader, over the door it pushed open in s36 (the sixth of
// seven lying flat over the shaft, search_github_ai_projects), sends its query (steel) down through the
// doorway to the lighthouse's lens 937 m below, and the return (lime) strikes its eye 160 ms later; the
// timer stops there (the impact). Left: another reader of the same kind, no lime, beats about in a storm of
// pages on another floor and never finds its way. Super slow motion: 160 ms of story over 2.67 s; the
// leaves and the dust all but hang. Then the left goes dark, the doors go, and the right half's camera comes
// down to s38's opening move (s37's last frame is s38's first, one frame early).
//
// ==== s36's LAST FRAME (E1 ends s36 on it; a hard cut: the picture splits, its right half goes on) ====
// Everything below is exported here; E1 imports it and leaves this file alone. If any of it changes, this
// block says so.
// - Camera: end36Camera(cam). s37's right camera one frame before its first, its frustum stretched over the
//   whole 16:9 frame by a film offset, so the right half of s36's last picture is s37's right half to the
//   pixel. At R(0, -0.736, 4.853): world (8.910, 221.053, 5.819), 4.853 m over the doors' faces above the
//   foot of the open doorway; no roll, its right the row's x (the doors upright in the picture), looking
//   down 80.7°; 40 mm, near 0.05, far 1200; f/2, focus on the reader's eye: focusDistance(cam, eye) =
//   3.697 m. Land it still (s37's camera sinks 0.064 m/s; nobody sees that at the cut). Call it last: no
//   setLens / aim after it (they would keep the film offset but lose the pose).
//   In that picture (x, y of the whole frame from its bottom left): the eye (0.750, 0.636); the lens
//   (0.751, 0.200), low in the open doorway; the doorway's head (0.750, 0.816), the lintel and its name
//   above it; door 5's middle (0.478, 0.477), door 4's (0.207, 0.477), door 3 just off the left edge, door
//   7 cut by the right edge.
// - The reader: AgentBody { detail: 'hero', seed: READER.seed (1) }; set({ pos: CORE.toArray(), face:
//   FACE0.toArray() (looking down the shaft), glow: 0.9 (LOOK37.reader.glow), time: 39.79 }) (s37's clock
//   is 40 + clockAt(t), and s38 starts at 40); spark 0, beam 0, dive 0, still. MCP-first is gone by then:
//   s37 has neither the spark nor the label. Its light (reader.light()) keys the doors and the dust.
// - The doors: new Doors({ uniforms: the library's, atlas: await lintelAtlas(), matrix: ROW }).set({ open:
//   DOORS37.open, lit: DOORS37.lit }) (world/c_doors.js): the sixth open, its leaf pushed down 1.4 rad
//   (DOOR.leaf.open), the others shut; the names' own light 0.5 on the sixth, 0.12 on the six it passed
//   over (all seven lit in turn in s36, then the right one held). The reader's light is the only light near
//   them: uDGlowPos = reader.light().pos, uDGlowCol = reader.light().col × LOOK37.doors.glow (10), uDGlowR
//   LOOK37.doors.glowR (0.4); uDKeyCol 0 (the query has not left); uDThru 1; uDGone 0 (the default).
// - The library: Library({ floors: [K - 45, K + 1], near: 2, mid: 10 }); setAll lit 0, lime 0, lamp
//   LOOK17.lamp; uFogD LOOK38.fog, uFogCol black, uAmb 0; uTime = time - 40.
// - The dust: Dust({ count: LOOK38.dust.count, box: 12, seed: 38 }) on the library's uniforms, keyed to
//   reader.light(), uG LOOK38.dust.g; update(cam, time - 40, { focus, fstop: 2, width, intensity:
//   LOOK38.dust.I }).
// - The leaves under the doors (seen through the open doorway only): Pages({ count: LOOK37.column.n }) on
//   pageAtlas({ scale: 2, seed: 1, anisotropy: 8 }), hangLeaves(leaves, story(-1 / 24), eye), keyed to
//   reader.light().
// - No lighthouse model (the lens is a point of light, s37's own), no page storm, no text in the picture.
// - The grade: act 3, as every act-3 shot. s37's first frame (1920, 8 samples): mean luma 13.6, its right
//   half 7.8 (thirds 5.4 / 10.7 / 7.3): the right half of s36's last frame should measure the same.
//
// The action (frames; T37, on the 90 BPM grid from the cut, a beat 16 frames):
// - f0–f16: the split holds; the timer reads 000 ms. The left reader is already darting about its storm.
// - f16 (beam): the query leaves the eye, steel, down through the open doorway; tool_use (steel) is typed
//   under the timer; the timer runs. Its front keeps an even pace on the screen (it slows into the depth)
//   and lights the leaves and the doorway's inside as it passes.
// - f48 (lens): the front lands on the lens; the lens flares (s of picture: LOOK37.lens.tau).
// - f52 (turn): the return leaves the lens, lime, and climbs (quickening into the eye); it lights the
//   leaves lime, then the doorway, through the cut name from behind.
// - f80 (ret): it strikes the eye: the timer stops at 160 ms, → tool_result (lime) is typed, the impact's
//   flash (a lime point on the eye, ~3 frames); the story's clock all but stops (the bead keeps its heat for
//   s38). f88 (stamp): · 160 ms.
// - f88–f100: the left half goes dark (the other reader has not found its way). f94–f119: the seam slides
//   off to the left as the right half fills the frame, and its camera comes down off the doors to s38's
//   opening move; f98–f114 the doors go (a stipple the samples even out); f100–f112 the words go.
// The left: the other reader (AgentBody mid, kind 0, seed 7; no lime) on floor 9 across the shaft, in s10's
// storm (Pages, 2400, s10's designs), darting and turning back (DARTS), its sheet sweeping; its own clock
// runs at half the picture's (LOOK37.left.rate: the storm is slowed, not frozen like the right).
//
// The split: render(renderer, target, t) draws each half on the whole viewport, scissored to its strip, its
// camera's frustum stretched over the rest by a view offset (the light lines and points of agentbody.js
// find their pixels from gl_FragCoord with a viewport at 0); the jitter goes onto both cameras. Both are 40
// mm with near 0.05 and far 1200 and one focus (the reader's eye, the post's one DOF), so the depth of field
// is right in both; motion blur is the frame's samples (each sample poses both halves). The seam is a dark
// bar 0.6% of the width drawn in the margin, no white line.
//
// Measured (1920, 8 samples): the first frame 13.6 (right half 7.8); the last 14.3, s38's first 14.3 (the
// same picture a frame on). Flash check s37 + s38, zh and en, peaks 200 / 300 / 500: no frame a quarter or
// more in transition, no red. --plan: 960 samples, 8 a frame. CUES (s from the cut; checkCues recomputes
// them from the motion in setup): cut 0, beam 0.667, return 3.333, labels [0.667, 3.333, 3.667].
import * as THREE from 'three';
import { setLens, aim, focusDistance, handheld } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep, smootherstep } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { font, makeCanvas, canvasTexture } from 'film/lib/text.js';
import { HEX } from 'film/lib/palette.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { Pages, fall } from 'world/pages.js';
import { pageAtlas } from 'world/pageatlas.js';
import { AgentBody, LightLines, LightPoints, lightUniforms, LIME, STEEL } from 'world/agentbody.js';
import { PLACE } from 'world/e1_place.js';
import { DOOR, Doors, lintelAtlas } from 'world/c_doors.js';
import { LOOK17 } from './s17.js';
import { W, FRAME38, READER, LOOK38, CAM38, camAt } from './s38.js';

export const meta = { frames: 120, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24; // s38's t = 0
const LAST = (meta.frames - 1) / 24; // the last frame
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const WHITE = new THREE.Color(1, 1, 1);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const r3 = (x) => Math.round(x * 1000) / 1000;
const K = PLACE.K;

// ------------------------------------------------------------------------------------------------ time

// s into the shot, on the score's 90 BPM grid counted from the cut (a beat 16 frames, a sixteenth 4): the
// query leaves the eye (beam), its front lands on the lens (lens), the return leaves the lens a sixteenth on
// (turn) and strikes the eye (ret: the timer stops at 160 ms, the impact); the third label (stamp); the left
// half goes dark (dark); the seam slides off to the left while the right half's camera comes down to s38's
// first (fill); the timer and the labels go (text).
export const T37 = {
  beam: 16 / 24,
  lens: 48 / 24,
  turn: 52 / 24,
  ret: 80 / 24,
  stamp: 88 / 24,
  dark: [88 / 24, 100 / 24],
  fill: [94 / 24, LAST],
  doors: [98 / 24, 114 / 24], // the doors go (they are not in s38)
  text: [100 / 24, 112 / 24],
};
export const MS = 160; // the tool's median time (README, measured 2026-08-11)
export const FIG = { ours: '7.4 s', theirs: '25.8 s' }; // end to end (README, 2026-08-11); 3.5× is not written
const SPAN = T37.ret - T37.beam; // 2.667 s of picture for the 160 ms
// After the impact the story's clock all but stops: SETTLE.eps of story in all, easing out over SETTLE.rho s
// of picture (the impact's flash dies in it; the bead keeps 98% of its heat for s38).
const SETTLE = { eps: 0.004, rho: 0.25 };

// story s since the query left (negative before it)
export function story(t) {
  if (t <= T37.ret) return ((t - T37.beam) / SPAN) * (MS / 1000);
  return MS / 1000 + SETTLE.eps * (1 - Math.exp(-(t - T37.ret) / SETTLE.rho));
}
const STORY_END = story(DUR);
// the right half's clock (the reader's, the dust's, the library's): 0 at s38's first frame, as s38 has it
export const clockAt = (t) => story(t) - STORY_END;
// the timer's figure: whole ms, held at 160 from the impact
export function timerMs(t) {
  if (t < T37.beam) return 0;
  if (t >= T37.ret) return MS;
  return Math.min(MS - 1, Math.floor((MS * (t - T37.beam)) / SPAN + 1e-9));
}
// the three labels: tool_use with the query, → tool_result with the return, · 160 ms a half beat on
export const LABELS = [
  { text: 'tool_use', at: T37.beam, col: 'steel', a: 0.95 },
  { text: ' → tool_result', at: T37.ret, col: 'lime', a: 1 },
  { text: ' · 160 ms', at: T37.stamp, col: 'paper', a: 0.8 },
];
export const labelOn = (i, t) => t >= LABELS[i].at;

// ------------------------------------------------------------------------------------------------ look

export const LOOK37 = {
  fstop: CAM38.fstop, // f/2, as s38 opens
  mm: CAM38.mm, // 40 mm in both halves (the post's lens is one lens)
  seam: 0.006, // the dark seam, × the frame's width
  reader: { glow: LOOK38.reader.glow },
  root: 0.3, // m of the query the body draws itself, out of its eye
  beam: { I: 1.0, far: 0.4, w: 0.0012, halo: 0.3, haloR: 5 }, // the query's line (steel): at the eye, at the lens
  front: { I: 2.0, r: 0.004, halo: 0.45, haloR: 6 }, // its front
  lens: { I0: 0.5, flare: 6, tau: 0.16, r: 0.6, halo: 0.5, haloR: 5 }, // the lens down the shaft; its flare (s of picture)
  head: { I: 3, r: 0.004, halo: 0.45, haloR: 6 }, // the return's head (lime)
  thread: LOOK38.thread, // the return's line, as s38 has it from its first frame
  bead: LOOK38.bead,
  hit: { I: 2.5, r: 0.006, halo: 0.4, haloR: 6, tau: 0.0008 }, // the impact's flash on the eye (tau in story s)
  lightFog: 0.0012, // the air the lights see through: the lens shows from 937 m
  key: { front: 1.2, head: 2.5, bead: 1.0 }, // the leaves' key light: the query's front, the return's head, the bead
  column: { n: 60, top: 6, bottom: 70, r0: 0.5, r1: 1.5 }, // the leaves hanging along the query's way down
  doors: { glow: 10, glowR: 0.4, key: 0.25, keyR: 0.6 }, // the reader's light on them (× its own: the only light near them); the query's, the return's
  dust: LOOK38.dust,
  // the other reader: its floor and side, the camera across the axis (r m) and over its floor (y); its clock
  // against the picture's; its library's lamps and air; the storm; its scan
  left: {
    K: 9, bear: 150 * DEG, r: -1.4, y: 1.7, rate: 0.5, t0: 3,
    lamp: 0.55, fog: 0.03, fogCol: [0.03, 0.021, 0.013], pages: 2400, glow: 0.9, scanI: 4,
  },
};

// ---------------------------------------------------------------------------------------------- places

export const LENS = V3(0, -100 * LIB.H, 0); // where s38's thread points: the axis at the lighthouse's floor
export const CORE = W(...READER.pos); // the reader, as s38 has it (floor PLACE.K, 9.8 m off the axis, over side 0)
export const FACE0 = W(-0.35, -0.9, 0.1); // looking down the shaft (s38's FACES[0])
// The seven doors (world/c_doors.js): flat over the shaft a hand above floor K's level, 1.245 m under the
// reader's eye, faces up, lintels toward the axis, the names reading left to right for a camera that looks
// down the well with the axis at the top of its picture. The sixth, search_github_ai_projects, lies under
// the reader, pushed open: the query goes down through its doorway, 0.75 m under its lintel.
// ROW: the row's frame in the world (x right as the names read, y to the lintels, z up; its origin the
// middle of the open doorway, in the plane of the frames' faces); R(): a point of it.
// DOORS37.at: the row's origin in FRAME38 (m); open: each leaf (rad; Doors.set), lit: each name's own light
// (Doors.set; the right one bright, the six it passed over left glowing low after s36 lit them in turn).
export const DOORS37 = { at: [-0.584, -1.35, 0.49], open: [0, 0, 0, 0, 0, DOOR.leaf.open, 0], lit: [0.12, 0.12, 0.12, 0.12, 0.12, 0.5, 0.12] };
export const ROW = (() => {
  const x = V3().setFromMatrixColumn(FRAME38, 0);
  const n = V3().setFromMatrixColumn(FRAME38, 2);
  return new THREE.Matrix4().makeBasis(x, n.negate(), V3(0, 1, 0)).setPosition(W(...DOORS37.at));
})();
export const R = (x, y, z, out = V3()) => out.set(x, y, z).applyMatrix4(ROW);
// The split's camera, in the row's frame: over the foot of the open doorway (HV.y), HV.z over the doors'
// faces, sinking HV.sink m over the split; no roll, turned so that the lens sits at HV.lens of its half:
// the reader above it under the lintel, the query's line between them, the lens in the doorway. HV.h, HV.D:
// how far it stands off the query's line and how high over the eye (the pace of the front, below).
export const HV = { y: -0.736, z: 4.85, sink: 0.25, lens: [0.5, 0.2], h: 0.86, D: 3.605 };

// The query's front and the return's head, m along the ray from the eye. Both move evenly in the angle they
// make with the lens as the split's camera sees them (a constant pace on the screen, not in the shaft): the
// front leaves quickly and slows into the depth; the head comes up slowly and quickens into the eye.
const TH = (s) => Math.atan(HV.h / (HV.D + s));
export function frontS(t, L) {
  if (t <= T37.beam) return 0;
  const u = clamp((t - T37.beam) / (T37.lens - T37.beam));
  if (u >= 1) return L;
  return Math.min(L, HV.h / Math.tan(lerp(TH(0), TH(L), 1 - (1 - u) ** 1.4)) - HV.D);
}
export function headS(t, L) {
  if (t <= T37.turn) return L;
  if (t >= T37.ret) return 0;
  const u = (t - T37.turn) / (T37.ret - T37.turn);
  return Math.max(0, HV.h / Math.tan(lerp(TH(L), TH(0), u ** 1.5)) - HV.D);
}
// the lens's light: its own, and the flare as the query lands
const lensI = (t) => LOOK37.lens.I0 + (t >= T37.lens ? LOOK37.lens.flare * Math.exp(-(t - T37.lens) / LOOK37.lens.tau) : 0);

// the seam, × the frame's width: the middle, then off to the left as the right half fills the frame
export const seamX = (t) => 0.5 * (1 - smootherstep(T37.fill[0], T37.fill[1], t));

const _a = V3();
const _b = V3();
const _c = V3();
const _d = V3();
const _e = V3();

// the split's camera: where it stands; and its turn (square to the row: its right is the row's x, so the
// doors stand upright in the picture; pitched so the lens sits HV.lens[1] up it)
const splitPos = (t, out) => R(0, HV.y, HV.z - (HV.sink * t) / T37.fill[0], out);
const RX = V3().setFromMatrixColumn(ROW, 0);
const RY = V3().setFromMatrixColumn(ROW, 1);
const RZ = V3().setFromMatrixColumn(ROW, 2);
const _m4 = new THREE.Matrix4();
function poseSplit(cam, P) {
  const l = _a.copy(LENS).sub(P);
  const phi = Math.atan2(l.dot(RY), -l.dot(RZ)) + Math.atan((1 - 2 * HV.lens[1]) * Math.tan((cam.fov * DEG) / 2));
  const Y = _b.copy(RY).multiplyScalar(Math.cos(phi)).addScaledVector(RZ, Math.sin(phi));
  const Z = _c.copy(RY).multiplyScalar(-Math.sin(phi)).addScaledVector(RZ, Math.cos(phi));
  cam.position.copy(P);
  cam.quaternion.setFromRotationMatrix(_m4.makeBasis(RX, Y, Z));
  cam.updateMatrixWorld(true);
  return cam;
}
// s36's last frame (E1 lands its camera on this): s37's right half as it is one frame before s37's first,
// its frustum stretched over the whole 16:9 frame by a film offset (the right half of the picture is s37's
// right half to the pixel; the jitter's view offset leaves a film offset alone). 40 mm, near 0.05, far 1200.
export function end36Camera(cam) {
  setLens(cam, LOOK37.mm);
  cam.near = 0.05;
  cam.far = 1200;
  cam.filmOffset = 0;
  cam.updateProjectionMatrix();
  cam.filmOffset = -0.25 * 2 * cam.aspect * Math.tan((cam.fov * DEG) / 2) * cam.getFilmWidth();
  cam.updateProjectionMatrix();
  return poseSplit(cam, splitPos(-1 / 24, V3()));
}
// s38's camera about its first frame: CAM38's key 0 and the speed it leaves it at (so the cut is no jolt)
const C38 = (() => {
  const a = camAt(0);
  const b = camAt(1 / 240);
  return { pos: a.pos.clone(), look: a.look.clone(), vp: b.pos.clone().sub(a.pos).multiplyScalar(240), vl: b.look.clone().sub(a.look).multiplyScalar(240) };
})();
// Turn a camera (no roll) at P so the world point X lands on (nx, ny) of its picture (NDC).
const _eu = new THREE.Euler(0, 0, 0, 'YXZ');
export function solveAim(cam, P, X, nx, ny) {
  const ty = Math.tan((cam.fov * DEG) / 2);
  const q = _a.set(nx * ty * cam.aspect, ny * ty, -1).normalize();
  const w = _b.copy(X).sub(P).normalize();
  const A0 = q.y;
  const B0 = -q.z;
  const pitch = Math.asin(clamp(w.y / Math.hypot(A0, B0), -1, 1)) - Math.atan2(A0, B0);
  const hz = q.y * Math.sin(pitch) + q.z * Math.cos(pitch);
  const yaw = Math.atan2(w.x, w.z) - Math.atan2(q.x, hz);
  cam.position.copy(P);
  cam.quaternion.setFromEuler(_eu.set(pitch, yaw, 0, 'YXZ'));
  cam.updateMatrixWorld(true);
  return cam;
}
const _probe = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1200);
const _sc = { pos: V3(), dir: V3() };
// where X falls in a picture: [x, y] as shares of the frame (y up), for a camera aimed from P at L with aspect a
// in a viewport starting x0 (share of the frame's width) and w wide
function shareOf(X, P, L, a, x0, w) {
  setLens(_probe, LOOK37.mm);
  _probe.aspect = a;
  _probe.updateProjectionMatrix();
  aim(_probe, P, L);
  const v = _c.copy(X).project(_probe);
  return [x0 + (w * (v.x + 1)) / 2, (v.y + 1) / 2];
}
// where s38's camera (as it moves at its first frame) has the eye at picture time tt (whole frame, y up)
function s38Share(eye, tt) {
  const dt = tt - DUR;
  const P = _e.copy(C38.pos).addScaledVector(C38.vp, dt);
  return shareOf(eye, P, _b.copy(C38.look).addScaledVector(C38.vl, dt), 16 / 9, 0, 1);
}
// The right half's camera into cam for its viewport (wR px of Wpx, Hpx high): the split's; then (fill) over to
// s38's path, which it joins at the last frame (one frame before s38's first, moving as s38's camera moves
// there). Its place is blended from the one to the other; it turns so that the eye runs a Hermite across the
// frame, from where the split holds it to where s38 has it, arriving with the speed s38 gives it on screen.
export function placeRight(t, eye, cam, wR, Wpx, Hpx) {
  splitPos(t, _sc.pos);
  setLens(cam, LOOK37.mm);
  cam.aspect = wR / Hpx;
  cam.updateProjectionMatrix();
  const w = smootherstep(T37.fill[0], T37.fill[1], t);
  if (w <= 0) return poseSplit(cam, _sc.pos);
  setLens(_probe, LOOK37.mm);
  _probe.aspect = 8 / 9;
  _probe.updateProjectionMatrix();
  poseSplit(_probe, _sc.pos);
  const ve = _c.copy(eye).project(_probe);
  const e1 = [0.5 + (ve.x + 1) / 4, (ve.y + 1) / 2];
  const h = 1 / 96;
  const e2 = s38Share(eye, LAST);
  const ea = s38Share(eye, LAST - h);
  const eb = s38Share(eye, LAST + h);
  const Dt = LAST - T37.fill[0];
  const u = clamp((t - T37.fill[0]) / Dt, 0, 1);
  const h00 = 2 * u * u * u - 3 * u * u + 1;
  const h01 = 1 - h00;
  const h11 = (u * u * u - u * u) * (Dt / (2 * h));
  const X = h00 * e1[0] + h01 * e2[0] + h11 * (eb[0] - ea[0]);
  const Y = h00 * e1[1] + h01 * e2[1] + h11 * (eb[1] - ea[1]);
  const x0 = 1 - wR / Wpx;
  const P = _sc.pos.lerp(V3().copy(C38.pos).addScaledVector(C38.vp, t - DUR), w);
  return solveAim(cam, P, eye, (2 * (X - x0)) / (1 - x0) - 1, 2 * Y - 1);
}

// ---------------------------------------------------------------------------------------------- the left

// The other reader's flight, in its camera's frame (x right, y up, z away; m from the point in focus): darts,
// each from where the last left it, most of them back the way it came; a stop between, where it looks about
// and sweeps its sheet; never a straight line out.
export const DARTS = (() => {
  const out = [];
  let t = 0;
  let p = [0.15, 0.05, 0];
  for (let i = 0; i < 18; i++) {
    const h = (k) => hash(i, 3700 + k);
    const hold = lerp(0.14, 0.42, h(1));
    const go = lerp(0.24, 0.46, h(2));
    const back = h(3) < 0.65;
    const x = back ? -Math.sign(p[0] || 1) * lerp(0.22, 0.55, h(4)) : clamp(p[0] + (h(5) - 0.5) * 0.7, -0.55, 0.55);
    const q = [x, lerp(-0.22, 0.26, h(6)), lerp(-0.3, 0.3, h(7))];
    // where it looks while it stops: anywhere but where it is going
    const look = [lerp(-3, 3, h(8)), lerp(-1.5, 1.8, h(9)), lerp(-2, 4, h(10))];
    out.push({ t0: t + hold, t1: t + hold + go, a: p, b: q, look, sweep: h(11) * TAU });
    t += hold + go;
    p = q;
  }
  return out;
})();
const backOut = (u) => {
  const c1 = 1.70158;
  const v = u - 1;
  return 1 + (c1 + 1) * v * v * v + c1 * v * v;
};
// at the left's own clock tl: place (camera frame), where it looks (camera frame), moving (0..1), the sweep
function dartAt(tl, out) {
  let i = 0;
  while (i < DARTS.length - 1 && tl >= DARTS[i + 1].t0) i++;
  const d = DARTS[i];
  if (tl < d.t0) {
    // stopped where the previous dart left it (or at the start)
    const prev = i > 0 ? DARTS[i - 1] : null;
    const at = prev ? prev.b : d.a;
    const since = prev ? tl - prev.t1 : 1;
    const bump = Math.exp(-since / 0.08) * 0.03;
    out.p.set(at[0] + bump * Math.sin(41 * tl), at[1] + bump * Math.sin(37 * tl + 1), at[2]);
    out.look.set(...(prev ? prev.look : d.look));
    out.moving = 0;
    out.sweep = (prev ? prev.sweep : 0) + 2.3 * Math.sin(7.5 * tl);
    return out;
  }
  const u = clamp((tl - d.t0) / (d.t1 - d.t0));
  const k = backOut(u);
  out.p.set(lerp(d.a[0], d.b[0], k), lerp(d.a[1], d.b[1], k), lerp(d.a[2], d.b[2], k));
  out.look.set(d.b[0] + 3 * (d.b[0] - d.a[0]), d.b[1] + 3 * (d.b[1] - d.a[1]), d.b[2] + 3 * (d.b[2] - d.a[2]) + 0.5);
  out.moving = Math.sin(Math.PI * u);
  out.sweep = d.sweep;
  return out;
}

// the storm: s10's two flights, about the left camera's height
const DESIGNS = [5, 5, 5, 5, 10, 10, 10, 2, 2, 0, 0, 1, 4, 6, 3, 7, 11, 12, 13, 14, 8, 9]; // s10's: GitHub first
const THIN = 4;

// ---------------------------------------------------------------------------------------------- cues

export const CUES = {
  cut: 0,
  beam: r3(T37.beam),
  return: r3(T37.ret),
  labels: LABELS.map((l) => r3(l.at)),
};
// The cues recomputed from the motion (got) against CUES (want): the query's front leaving the eye, the
// return's head on the eye with the timer at 160, each label first drawn.
export function checkCues() {
  const first = (f, a = 0, b = DUR) => {
    for (let t = a; t <= b + 1e-9; t += 1 / 480) if (f(t)) return r3(t);
    return null;
  };
  const L = 937;
  const got = {
    cut: 0,
    beam: first((t) => frontS(t, L) > 0),
    return: first((t) => headS(t, L) === 0 && timerMs(t) === MS),
    labels: LABELS.map((_, i) => first((t) => labelOn(i, t))),
  };
  const bad = [];
  const near = (a, b) => a !== null && Math.abs(a - b) <= 1 / 240 + 1e-9;
  if (!near(got.beam, CUES.beam)) bad.push(`beam ${got.beam} vs ${CUES.beam}`);
  if (!near(got.return, CUES.return)) bad.push(`return ${got.return} vs ${CUES.return}`);
  got.labels.forEach((g, i) => !near(g, CUES.labels[i]) && bad.push(`labels[${i}] ${g} vs ${CUES.labels[i]}`));
  return { got, want: CUES, bad };
}

// ---------------------------------------------------------------------------------------------- setup

// The leaves hanging along the query's way down: a Pages of LOOK37.column.n leaves on pageAtlas({ scale: 2,
// seed: 1, anisotropy: 8 }), placed as of story time tau (story(t); s36's last frame: story(-1 / 24)) about
// the ray from the eye to the lens, 3–70 m under the eye (under the doors). Their key light is the shot's
// (before the query leaves: reader.light()).
const _hd = V3();
const _ho = V3();
const _hp = V3();
const HOV = { seed: 371, y0: 0, y1: 1, r0: 0, r1: 1e-4, speed: [0.4, 0.9], swirl: 0, tumble: 0.25, designs: DESIGNS };
export function hangLeaves(leaves, tau, eye) {
  const CL = LOOK37.column;
  const dir = _hd.copy(LENS).sub(eye).normalize();
  const O = _ho.copy(eye).addScaledVector(dir, 0.012);
  leaves.fill(CL.n, tau, (i, tt, o, st) => {
    fall(i, tt, o, st);
    const s = CL.top * (CL.bottom / CL.top) ** hash(i, 3711);
    const rho = lerp(CL.r0, CL.r1, Math.sqrt(hash(i, 3712)));
    const a = TAU * hash(i, 3713);
    const P = _hp.copy(O).addScaledVector(dir, s);
    st.x += P.x + rho * Math.cos(a);
    st.z += P.z + rho * Math.sin(a);
    st.y = P.y - lerp(0.4, 0.9, hash(i, 3714)) * tt;
  }, HOV);
}
function camera40() {
  const c = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1200);
  setLens(c, LOOK37.mm);
  return c;
}

export async function setup(ctx) {
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s37] CUES off: ${cc.bad.join('; ')}`);
  const Wpx = ctx.width;
  const Hpx = ctx.height;
  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });

  // ---- the right half: s38's place (floor K, over side 0), looking down the shaft to the lens
  const sceneR = new THREE.Scene();
  const camR = camera40();
  const libR = new Library({ floors: [K - 45, K + 1], near: 2, mid: 10, height: Hpx });
  sceneR.add(libR.group);
  libR.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const UR = libR.uniforms;
  UR.uFogD.value = LOOK38.fog;
  UR.uFogCol.value.setRGB(0, 0, 0);
  UR.uAmb.value.setRGB(0, 0, 0);
  const dustR = new Dust({ uniforms: UR, count: LOOK37.dust.count, box: 12, seed: 38 }); // s38's motes
  sceneR.add(dustR.points);
  const reader = new AgentBody({ detail: 'hero', seed: READER.seed, uniforms: UR, width: Wpx, height: Hpx });
  sceneR.add(reader.group);
  const doors = new Doors({ uniforms: UR, atlas: await lintelAtlas(), matrix: ROW }).set({ open: DOORS37.open, lit: DOORS37.lit });
  sceneR.add(doors.group);
  doors.uniforms.uDGlowR.value = LOOK37.doors.glowR;
  doors.uniforms.uDKeyR.value = LOOK37.doors.keyR;
  const leavesR = new Pages({ uniforms: UR, atlas, count: LOOK37.column.n });
  sceneR.add(leavesR.mesh);
  const luR = lightUniforms({ uniforms: { uFogD: { value: LOOK37.lightFog } }, width: Wpx, height: Hpx });
  const lines = new LightLines(8, luR);
  const points = new LightPoints(8, luR);
  sceneR.add(...lines.meshes, ...points.meshes);

  // ---- the left half: another floor, the storm; no lighthouse
  const LL = LOOK37.left;
  const sceneL = new THREE.Scene();
  const camL = camera40();
  const libL = new Library({ floors: [LL.K - 12, LL.K + 6], near: 2, mid: 8, height: Hpx });
  sceneL.add(libL.group);
  libL.setAll((k) => ({ lit: 0, lime: 0, lamp: LL.lamp * (hash(k, 61) < 0.04 ? 0.2 : 0.72 + 0.28 * hash(k, 62)) }));
  const UL = libL.uniforms;
  UL.uFogD.value = LL.fog;
  UL.uFogCol.value.setRGB(...LL.fogCol);
  const dustL = new Dust({ uniforms: UL, count: 16000, box: 18, seed: 5 });
  sceneL.add(dustL.points);
  const other = new AgentBody({ detail: 'mid', kind: 0, seed: 7, uniforms: UL, width: Wpx, height: Hpx });
  sceneL.add(other.group);
  const leavesL = new Pages({ uniforms: UL, atlas, count: LL.pages });
  sceneL.add(leavesL.mesh);
  const nL = V3(Math.cos(LL.bear), 0, Math.sin(LL.bear)); // the left camera looks along this
  const xL = V3(-nL.z, 0, nL.x); // its right
  const camLPos = nL.clone().multiplyScalar(LL.r).setY(LL.K * LIB.H + LL.y);
  const flights = [
    { seed: 21, y0: camLPos.y - 9, y1: camLPos.y + 9, r0: 1.0, r1: 11.6, speed: [1.4, 2.8], swirl: 0.6, tumble: 0.35, designs: DESIGNS },
    { seed: 22, y0: camLPos.y - 9, y1: camLPos.y + 9, r0: 0.6, r1: 6.0, speed: [1.5, 2.6], swirl: 0.7, tumble: 0.45, designs: DESIGNS },
  ];
  const STORM = Math.round(LL.pages * 0.7);

  // the reference camera: the post reads its lens, near and far (the same in both halves) for the depth of field
  const camera = camera40();

  // ---- the margin: the seam, the left going dark, the timer, the labels, the figures in the corners
  const OW = ctx.outWidth || Wpx;
  const OH = ctx.outHeight || Hpx;
  const canvas = makeCanvas(OW, OH);
  const g2 = canvas.getContext('2d');
  const mtex = canvasTexture(canvas, { srgb: false, mipmaps: false, anisotropy: 1, premultiply: true });
  const COL = { steel: HEX.steel, lime: HEX.lime, paper: HEX.paper };

  // per-frame state
  const eye = V3();
  const ray = { origin: V3(), dir: V3() };
  const A = V3();
  const B = V3();
  const P = V3();
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const key = { pos: V3(), col: new THREE.Color() };
  const glow = { pos: V3(), col: new THREE.Color() };
  const dart = { p: V3(), look: V3(), moving: 0, sweep: 0 };
  const dartB = { p: V3(), look: V3(), moving: 0, sweep: 0 };
  const lp = V3();
  const lv = V3();
  const target = V3();
  const anchor = V3();
  let focus = 3.6;
  let wR = Wpx / 2;
  let wL = Wpx / 2;

  // a point in the left camera's frame (x right, y up, z away from the camera), m
  const camFrame = (x, y, z, out) => out.copy(camLPos).addScaledVector(xL, x).addScaledVector(nL, z + focus).setY(camLPos.y + y);

  return {
    scene: sceneR,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    parts: { sceneR, sceneL, camR, camL, reader, doors, other, libR, libL, leavesR, leavesL, dustR, dustL },
    update(t) {
      const xs = seamX(t);
      wL = Math.round(xs * Wpx);
      wR = Wpx - wL;
      const clock = clockAt(t);
      const tau = story(t);

      // ---- right: the reader, looking down the shaft; its query, the return
      reader.set({ time: READER.time + clock, pos: CORE.toArray(), face: FACE0.toArray(), glow: LOOK37.reader.glow, beam: 0 });
      reader.anchor('eye', eye);
      const beamOn = t < T37.ret ? smoothstep(T37.beam - 0.3, T37.beam, t) : 0;
      if (beamOn > 0) {
        const dir = _a.copy(LENS).sub(eye).normalize();
        const sF = frontS(t, 1e9);
        reader.set({ beam: beamOn, beamDir: dir.toArray(), beamLen: Math.min(LOOK37.root, Math.max(1e-3, sF)) });
      }
      placeRight(t, eye, camR, wR, Wpx, Hpx);
      reader.update(camR);
      reader.uniforms.uRes.value.set(Wpx, Hpx); // each half draws on the whole viewport, scissored (see render)
      luR.uRes.value.set(Wpx, Hpx);
      libR.update(camR);
      UR.uTime.value = clock;
      focus = focusDistance(camR, eye);

      // the query's line and front; the lens; the return's head and line; the bead, the impact's flash
      const dir = ray.dir.copy(LENS).sub(eye).normalize();
      const O = ray.origin.copy(eye).addScaledVector(dir, 0.012);
      const L = O.distanceTo(LENS);
      let nl = 0;
      let np = 0;
      const BM = LOOK37.beam;
      if (t >= T37.beam && t < T37.ret) {
        const sF = frontS(t, L);
        const sH = headS(t, L);
        // steel from the eye to the front (or the head, coming up it)
        const sEnd = t < T37.turn ? sF : sH;
        if (sEnd > 1e-3) {
          B.copy(O).addScaledVector(dir, sEnd);
          cA.copy(STEEL).multiplyScalar(BM.I);
          cB.copy(STEEL).multiplyScalar(lerp(BM.I, BM.I * BM.far, sEnd / L));
          lines.set(nl++, O, B, cA, cB, BM.w, BM.w, 1, t < T37.lens ? 0.6 : 1, BM.halo, BM.haloR);
        }
        if (t < T37.lens) {
          const F = LOOK37.front;
          points.set(np++, B, cA.copy(STEEL).lerp(WHITE, 0.3).multiplyScalar(F.I), F.r, F.halo, F.haloR);
        }
        if (t >= T37.turn) {
          // lime from the head down to the lens: the thread as s38 has it, behind the head
          const H = LOOK37.head;
          const Th = LOOK37.thread;
          const P0 = A.copy(O).addScaledVector(dir, sH);
          const s1 = Math.min(L, sH + Th.len);
          B.copy(O).addScaledVector(dir, s1);
          lines.set(nl++, P0, B, cA.copy(LIME).multiplyScalar(Th.I), cB.copy(LIME).multiplyScalar(Th.I * 0.25), Th.w, Th.w, 0.6, 1, 0.3, 5);
          if (s1 < L) lines.set(nl++, B, LENS, cA.copy(LIME).multiplyScalar(Th.I * 0.25), cB.copy(LIME).multiplyScalar(Th.I * 0.08), Th.w, Th.w, 1, 1, 0.3, 5);
          points.set(np++, P0, cA.copy(LIME).multiplyScalar(H.I), H.r, H.halo, H.haloR);
        }
      }
      if (t >= T37.ret) {
        // s38's first frame: the thread from the eye down the shaft, the bead white-hot on the eye
        const Th = LOOK37.thread;
        A.copy(eye).addScaledVector(dir, 0.03);
        B.copy(eye).addScaledVector(dir, Th.len);
        lines.set(nl++, A, B, cA.copy(LIME).multiplyScalar(Th.I), cB.copy(LIME).multiplyScalar(Th.I * 0.25), Th.w, Th.w, 1, 1, 0.3, 5);
        lines.set(nl++, B, LENS, cA.copy(LIME).multiplyScalar(Th.I * 0.25), cB.copy(LIME).multiplyScalar(Th.I * 0.08), Th.w, Th.w, 1, 1, 0.3, 5);
        const Bd = LOOK37.bead;
        const since = tau - MS / 1000; // story s since the impact
        const be = Bd.I * (1 + Bd.hit * Math.exp(-since / Bd.tau));
        points.set(np++, eye, cA.copy(LIME).multiplyScalar(be), Bd.r, Bd.halo, Bd.haloR);
        points.set(np++, eye, cB.copy(LIME).lerp(WHITE, 0.45).multiplyScalar(0.5 * be), 0.4 * Bd.r, 0, 4);
        const Hi = LOOK37.hit;
        const hf = Hi.I * Math.exp(-since / Hi.tau) * (1 - smoothstep(T37.fill[0], T37.fill[1], t));
        if (hf > 1e-3) points.set(np++, eye, cA.copy(LIME).multiplyScalar(hf), Hi.r, Hi.halo, Hi.haloR);
      }
      const Ln = LOOK37.lens;
      points.set(np++, LENS, cA.copy(LIME).multiplyScalar(lensI(t)), Ln.r, Ln.halo, Ln.haloR);
      lines.commit(nl);
      points.commit(np);

      // the leaves along the query's way down: nearly still; lit by whatever light is passing them
      const KY = LOOK37.key;
      if (t < T37.beam) reader.light(key);
      else if (t < T37.lens) key.pos.copy(O).addScaledVector(dir, frontS(t, L)), key.col.copy(STEEL).multiplyScalar(KY.front);
      else if (t < T37.turn) key.pos.copy(LENS), key.col.setRGB(0, 0, 0);
      else if (t < T37.ret) key.pos.copy(O).addScaledVector(dir, headS(t, L)), key.col.copy(LIME).multiplyScalar(KY.head);
      else key.pos.copy(eye), key.col.copy(LIME).multiplyScalar(KY.bead * Math.exp(-(tau - MS / 1000) / LOOK37.bead.tau));
      leavesR.uniforms.uKeyPos.value.copy(key.pos);
      leavesR.uniforms.uKeyCol.value.copy(key.col);
      // the doors: the reader's glow; the query's light as it passes (not before it leaves); gone over the push
      const DU = doors.uniforms;
      reader.light(glow);
      DU.uDGlowPos.value.copy(glow.pos);
      DU.uDGlowCol.value.copy(glow.col).multiplyScalar(LOOK37.doors.glow);
      DU.uDKeyPos.value.copy(key.pos);
      if (t < T37.beam) DU.uDKeyCol.value.setRGB(0, 0, 0);
      else DU.uDKeyCol.value.copy(key.col).multiplyScalar(LOOK37.doors.key);
      DU.uDGone.value = smoothstep(T37.doors[0], T37.doors[1], t);
      DU.uDSeed.value = (t * 977.13) % 1;
      hangLeaves(leavesR, tau, eye);

      // the dust in the reader's light (as s38)
      reader.light(key);
      dustR.uniforms.uKeyPos.value.copy(key.pos);
      dustR.uniforms.uKeyCol.value.copy(key.col);
      dustR.uniforms.uG.value = LOOK37.dust.g;
      dustR.update(camR, clock, { focus, fstop: LOOK37.fstop, width: Wpx, intensity: LOOK37.dust.I });

      // ---- left: the other reader in the storm, at its own pace
      if (wL < 1 || t >= T37.dark[1]) return;
      const LL = LOOK37.left;
      const tl = LL.rate * t + LL.t0;
      dartAt(tl, dart);
      camFrame(dart.p.x, dart.p.y, dart.p.z, lp);
      dartAt(tl + 0.01, dartB);
      camFrame(dartB.p.x, dartB.p.y, dartB.p.z, lv).sub(lp).multiplyScalar(100); // m/s of its own clock
      camFrame(dart.look.x, dart.look.y, dart.look.z, target);
      const sw = dart.sweep + (dart.moving > 0 ? 0 : 0.6 * Math.sin(5.1 * tl));
      const scanAt = A.copy(lp).addScaledVector(xL, 2 * Math.sin(sw)).addScaledVector(nL, 2 * Math.cos(sw));
      const scan = lerp(1, 0.25, dart.moving);
      other.set({
        time: 20 + tl, pos: lp.toArray(), face: target.toArray(), glow: LL.glow, dive: 0.6 * dart.moving, vel: lv.toArray(),
        scan, scanAt: scanAt.toArray(), scanW: 0.08, scanV: 1.2, scanFan: [0.85, 0.85], scanTrail: 0, scanTrailLen: 0.7, scanArc: 0,
      });
      // the camera: across the axis, on the point in focus, following the reader a little; held by hand
      camFrame(0, 0, 0, anchor);
      target.copy(anchor).lerp(lp, 0.35);
      setLens(camL, LOOK37.mm);
      camL.aspect = wL / Hpx;
      camL.updateProjectionMatrix();
      aim(camL, camLPos, target, { shake: handheld(tl, { amp: 2.2, seed: 37, rate: 1.4 }) });
      other.update(camL);
      other.uniforms.uRes.value.set(Wpx, Hpx);
      other.scanLight(UL);
      UL.uBeamCol.value.copy(STEEL);
      UL.uBeamI.value = LL.scanI * scan * LL.glow;
      libL.update(camL);
      UL.uTime.value = tl;
      other.light(key);
      leavesL.uniforms.uKeyPos.value.copy(key.pos);
      leavesL.uniforms.uKeyCol.value.copy(key.col);
      leavesL.fill(LL.pages, tl, (i, tt, fl, st) => {
        const o = i < STORM ? fl[0] : fl[1];
        fall(i, tt, o, st);
        st.scale *= clamp((st.y - o.y0) / THIN);
        // none on the lens, none through the reader
        const dc = Math.hypot(st.x - camLPos.x, st.y - camLPos.y, st.z - camLPos.z);
        const da = Math.hypot(st.x - lp.x, st.y - lp.y, st.z - lp.z);
        if (dc < 0.8 || da < 0.3) st.visible = false;
      }, flights);
      dustL.uniforms.uKeyPos.value.copy(key.pos);
      dustL.uniforms.uKeyCol.value.copy(key.col);
      dustL.update(camL, tl, { focus, fstop: LOOK37.fstop, width: Wpx });
    },
    render(renderer, target, t) {
      const view = camera.view && camera.view.enabled ? camera.view : null;
      const TW = target.width;
      const TH2 = target.height;
      // Each half is drawn on the whole viewport, scissored to its strip, its camera's frustum stretched over
      // the rest of the frame (a view offset) so its own picture lands in the strip: the light lines and
      // points find their pixels from gl_FragCoord and a viewport at 0, so a viewport at x0 would lose them.
      const half = (cam, scene, x0, w) => {
        if (w < 1) return;
        cam.setViewOffset(w, TH2, -x0 + (view ? view.offsetX : 0), view ? view.offsetY : 0, TW, TH2);
        target.viewport.set(0, 0, TW, TH2);
        target.scissor.set(x0, 0, w, TH2);
        target.scissorTest = true;
        renderer.setRenderTarget(target);
        renderer.render(scene, cam);
        cam.clearViewOffset();
      };
      target.viewport.set(0, 0, TW, TH2);
      target.scissor.set(0, 0, TW, TH2);
      target.scissorTest = false;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, false);
      const auto = renderer.autoClear;
      renderer.autoClear = false;
      const xl = Math.round(seamX(t) * TW);
      if (smoothstep(T37.dark[0], T37.dark[1], t) < 1) half(camL, sceneL, 0, xl);
      half(camR, sceneR, xl, TW - xl);
      renderer.autoClear = auto;
      target.viewport.set(0, 0, TW, TH2);
      target.scissor.set(0, 0, TW, TH2);
      target.scissorTest = false;
      renderer.setRenderTarget(target);
    },
    post() {
      return { dof: { focus, fstop: LOOK37.fstop } };
    },
    margin(t) {
      const c = g2;
      const H = OH;
      const Wd = OW;
      c.clearRect(0, 0, Wd, H);
      const xs = seamX(t) * Wd;
      const dark = smoothstep(T37.dark[0], T37.dark[1], t);
      c.fillStyle = '#000';
      if (dark > 0 && xs > 0) {
        c.globalAlpha = dark;
        c.fillRect(0, 0, xs, H);
      }
      const gap = LOOK37.seam * Wd;
      if (xs > 0) {
        c.globalAlpha = 1;
        c.fillRect(xs - gap / 2, 0, gap, H);
      }
      const pad = 0.045 * H;
      const fs = 0.026 * H;
      const cap = 0.73 * fs;
      const out = 1 - smoothstep(T37.text[0], T37.text[1], t);
      c.textBaseline = 'alphabetic';
      c.font = font('mono', fs, 400);
      c.fillStyle = COL.paper;
      // the figures in the corners: theirs on the left, ours on the right
      if (dark < 1) {
        c.globalAlpha = 0.55 * (1 - dark);
        c.textAlign = 'left';
        c.fillText(FIG.theirs, pad, pad + cap);
      }
      if (out > 0) {
        c.globalAlpha = 0.55 * out;
        c.textAlign = 'right';
        c.fillText(FIG.ours, Wd - pad, pad + cap);
      }
      // the timer and the line under it, low on the right half's left
      if (t >= T37.beam && out > 0) {
        const x0 = Wd / 2 + pad;
        const ts = 0.058 * H;
        c.textAlign = 'left';
        c.font = font('mono', ts, 500);
        c.fillStyle = COL.paper;
        c.globalAlpha = 0.95 * out;
        c.fillText(`${String(timerMs(t)).padStart(3, '0')} ms`, x0, H - pad - 1.9 * fs);
        c.font = font('mono', fs, 400);
        let x = x0;
        LABELS.forEach((l, i) => {
          if (!labelOn(i, t)) return;
          c.fillStyle = COL[l.col];
          c.globalAlpha = l.a * out;
          c.fillText(l.text, x, H - pad);
          x += c.measureText(l.text).width;
        });
      }
      c.globalAlpha = 1;
      mtex.needsUpdate = true;
      return { tex: mtex, alpha: 1 };
    },
  };
}
