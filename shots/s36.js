// s36 — 2:26–2:30 (3504–3599, 96 frames, act 3). The seven doors.
// A hard cut from s35's close-up to straight down the shaft from over it: floor K's gallery and rail across the
// bottom of the frame, the well going down to the lighthouse above them, and over the well, a hand above the
// floor, seven doors in a row lying faces up (world/c_doors.js, laid as s37 lays them: S37.ROW). They come out
// of the dark as the shot opens (c_doors' stipple run backwards, done by 0.3 s). The reader, off the frame
// where s35 left it, comes in from the right to watch from the row's right foot (WATCH). The names light one
// by one on the eighths, left to right in the site's order (CUES.doors, a note each), its gaze going along the
// lintels with the light; at the sixth, search_github_ai_projects, it goes straight over to it, low over it,
// lays its hand on the knob and pushes, and on the bar (CUES.open) the leaf swings down into the well. Under
// it, far down, the lens and the hanging leaves. The spark goes out; the reader rises to s37's place
// (S37.CORE), looking down through the doorway, and the camera comes down onto s37's first frame.
// Row frame (S37.ROW, R()): x to the right as the names read, y up the doors (the lintels toward the axis), z up
// from the doors' faces; its origin the middle of the sixth doorway. The only text in the picture: the seven
// tool names (monospace, the same in both languages).
//
// FIRST FRAME (t = 0, global 3504, beat 37.5 of the 90 BPM grid from s31's cut)
// - Camera: straight down from R(-1.6, 0, 7.8) (world (7.473, 224.000, 6.836)), 28 mm, no film offset; the
//   picture's up the row's y (toward the axis), its right the row's x. f/2 on the reader's eye (8.44 m). It
//   holds till LOOK36.move[0] (1.95 s).
// - The reader, as s35 left it: S35.HERO1 (W(6.80, -3.00, 1.62)), facing S35.AHEAD, glow 0.95, spark 0.8,
//   MCP-first all shown beside the spark; just off the right edge (its middle at (1.13, 0.09) of the frame),
//   in by 0.9 s, small, low right. Its clock 36.763 at s35's pace (0.4): s35 ends on 28.005, and the cut,
//   with the reader off the frame, takes up the 8.7 s.
// - The doors: uDGone 0.945 (their stipple barely begun), all shut, no name lit. The leaves hidden (under the
//   shut door). The lens (LIME × LOOK37.lens.I0) at S37.LENS, down the well.
// - The library as s37 has it (floors K-45 to K+1, LOOK17's lamps, LOOK38's fog, black, no ambient, no beam);
//   s38's dust, keyed to the reader; the book on the rail as s35 left it (8/12, its print steel × 0.8). The
//   grade: act 3, from the timeline.
//
// LAST FRAME (t = 95/24, global 3599), as shots/s37.js (lines 12-48) gives it:
// - Camera: S37.end36Camera(cam), set last (40 mm; looking down 80.7°, toward the lintels; its frustum let out
//   to the left by a film offset, a quarter of the frame), landed still at 3.9 s. f/2 on the reader's eye
//   (3.697 m).
// - The reader: S37.CORE, facing S37.FACE0, glow 0.9, spark 0, push 0, still; its clock 39.7935 = 40 +
//   S37.clockAt(-1/24), running at s37's pace there (0.06).
// - The doors: S37.DOORS37 (the sixth open 1.4 rad; the names' light 0.5 on the sixth, 0.12 on the others,
//   the flares gone), uDGone 0; lit by reader.light() × LOOK37.doors.glow (10), uDGlowR 0.4; uDKeyCol 0,
//   uDThru 1.
// - The leaves: S37.hangLeaves(leaves, S37.story(-1/24), the reader's eye), keyed to it; the lens as above.
// - Measured (1920, 8 samples): the right half's luma 7.81 (thirds 5.32 / 10.64 / 7.48) against s37's first
//   frame's 7.83 (5.44 / 10.68 / 7.37); at a quarter size the two right halves differ by 0.73 in mean |dY|
//   (signed -0.01: the grain), apart from s37's figure ("7.4 s", which comes in with s37) and a frame's
//   motion of the camera and the reader.
//
// How s35's things end: MCP-first fades out over 0-0.4 s, off the frame (it is not seen in this shot); the
// spark holds at 0.8 and goes out as the door swings (3.0-3.5 s). s37 has neither.
import * as THREE from 'three';
import { setLens, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { Pages } from 'world/pages.js';
import { pageAtlas } from 'world/pageatlas.js';
import { AgentBody, LightPoints, lightUniforms, LIME, STEEL } from 'world/agentbody.js';
import { BookShelf, bookLabels } from 'world/bookshelf.js';
import { CodeGlyphs } from 'world/e1_glyphs.js';
import { DOOR, Doors, lintelAtlas, doorX } from 'world/c_doors.js';
import { LOOK17 } from './s17.js';
import { K, QBOOK, DESK, deskBook, spineLabels } from './s32.js';
import * as S35 from './s35.js';
import * as S37 from './s37.js';
import { READER, LOOK38 } from './s38.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
const LAST = DUR - 1 / 24;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease5 = (u) => u * u * u * (u * (6 * u - 15) + 10);
const span = (t, a, b) => ease5(clamp((t - a) / (b - a)));

// ------------------------------------------------------------------------------------------------ time
// 90 BPM, three to a bar, counted from s31's cut: this shot opens on beat 37.5 (global 3504)
export const BEAT = 2 / 3;
const GRID0 = -25;
export const beatOf = (t) => (t - GRID0) / BEAT;
const tOf = (beat) => beat * BEAT + GRID0;
const T35 = S35.meta.frames / 24; // s35's t at this shot's t = 0
// the names light on the eighths from beat 38 to 41, left to right; the sixth is pushed open on beat 42 (a bar)
export const LIGHT = DOOR.names.map((_, i) => tOf(38 + i / 2));
export const OPEN = tOf(42);
export const CUES = { cut: 0, doors: LIGHT.map((x) => +x.toFixed(3)), open: +OPEN.toFixed(3) };

// ----------------------------------------------------------------------------------------------- places
const { ROW, R, CORE, FACE0, LENS, DOORS37, LOOK37 } = S37;
const INV = ROW.clone().invert();
const RX = V3().setFromMatrixColumn(ROW, 0).normalize();
const RY = V3().setFromMatrixColumn(ROW, 1).normalize();
const RZ = V3().setFromMatrixColumn(ROW, 2).normalize();
const toRow = (p) => p.clone().applyMatrix4(INV);
const RIGHT = DOOR.right;

// ------------------------------------------------------------------------------------------- the reader
// From where s35 left it (S35.HERO1, just out from the rail, off the frame's right) it comes over to the foot
// of the row's last door (WATCH, row frame) as the doors come, and hangs there while the names light; on the
// sixth it goes straight to it, low over it to push (PUSH), then rises to s37's place (CORE) as the door swings.
export const HERO0 = S35.heroAt(T35);
const P0 = toRow(HERO0);
const PC = toRow(CORE);
export const WATCH = V3(1.6, -1.3, 1.75);
export const PUSH = V3(0.08, -0.1, 1.2);
const COME = [0.35, 1.3];
const GO = [1.95, 2.8];
const RISE = [3.1, 3.85];
export function heroAt(t, out = V3()) {
  return out.copy(P0).lerp(WATCH, span(t, ...COME)).lerp(PUSH, span(t, ...GO)).lerp(PC, span(t, ...RISE)).applyMatrix4(ROW);
}
// Its clock runs on from s35's pace (0.4) up to its own (1), and as the door swings slows to s37's (the 160 ms
// of the query stretched over 2.7 s of picture: 0.06), to land one frame before s37's first on s37's own
// clock there (40 + S37.clockAt(-1/24), 39.7935; s38 opens at READER.time, 40). The cut from s35 takes up
// the difference (from the close-up to this, where the reader is off the frame, and then 0.08 of it high).
const R37 = (S37.clockAt(0) - S37.clockAt(-1 / 24)) * 24;
const RATE = [0.4, 1, R37];
const T_RATE = [0, 1.5];
const T_SLOW = [3.0, 3.9];
const ramp = (t, a, b) => {
  // the integral of smoothstep(a, b, t) from a
  if (t <= a) return 0;
  if (t >= b) return (b - a) / 2 + (t - b);
  const u = (t - a) / (b - a);
  return (b - a) * (u * u * u - (u * u * u * u) / 2);
};
const run = (t) => RATE[0] * t + (RATE[1] - RATE[0]) * ramp(t, ...T_RATE) - (RATE[1] - RATE[2]) * ramp(t, ...T_SLOW);
export const C36 = READER.time + S37.clockAt(-1 / 24);
export const clockAt = (t) => C36 - run(LAST) + run(t);
export const glowAt = (t) => lerp(S35.glowAt(T35), LOOK37.reader.glow, smoothstep(2.0, 3.9, t));
// the spark, as s35 left it, goes out as the door swings (s37 has none)
export const sparkAt = (t) => S35.sparkAt(T35 + t) * (1 - smoothstep(OPEN, OPEN + 0.5, t));
// Where it looks: round from its wall (S35.AHEAD) to the row's first lintel; along the lintels with the light to
// the sixth; down to the sixth's knob as it goes; then down through the doorway (s37's FACE0).
const lintel = (x, out = V3()) => R(x, DOOR.clear[1] / 2 + DOOR.lintel / 2, 0, out);
export function knobAt(theta, out = V3()) {
  // the sixth leaf's knob (c_doors buildLeaf: on the lock stile, 0.09 below the middle, its top 0.04 proud),
  // the leaf turned theta about its hinge (rotation.y: the free edge goes down, away from the reader)
  const x = DOOR.clear[0] - DOOR.leaf.gap - 0.0425;
  const z = 0.04;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return out.set(doorX(RIGHT) - DOOR.clear[0] / 2 + x * c + z * s, -0.09, -DOOR.leaf.inset - x * s + z * c).applyMatrix4(ROW);
}
const _f = [V3(), V3()];
export function faceAt(t, out = V3()) {
  const read = smoothstep(LIGHT[0] - 0.15, LIGHT[RIGHT] + 0.1, t);
  lintel(lerp(doorX(0), doorX(RIGHT), read), _f[0]);
  out.copy(S35.AHEAD).lerp(_f[0], smoothstep(0.05, 0.55, t));
  out.lerp(knobAt(0, _f[1]), smoothstep(GO[0], GO[1] - 0.2, t));
  return out.lerp(FACE0, smoothstep(...RISE, t));
}
// the hand: to the knob as it comes in, pressing as the leaf goes, then back
const HAND = [2.45, 2.9, 3.25, 3.7];
export const pushAt = (t) => smoothstep(HAND[0], HAND[1], t) * (1 - smoothstep(HAND[2], HAND[3], t));

// --------------------------------------------------------------------------------------------- the doors
// out of the dark as the shot opens (c_doors' stipple, run backwards)
export const goneAt = (t) => 1 - smoothstep(-0.05, 0.3, t);
// the sixth leaf: pushed on the bar, swinging down and coming to rest pushed home (S37.DOORS37.open)
const SWING = 0.65;
export const openAt = (i, t) => (t <= OPEN ? 0 : DOORS37.open[i] * (1 - (1 - clamp((t - OPEN) / SWING)) ** 3));
// each name: a flare on its note, settling to s37's glow (DOORS37.lit: the sixth held, the others low); the
// sixth flares again at the push. What is left of the flares is gone by the end (FLARE.end), as s37 has them.
// The flare stops short of white (FLARE.I 1.1: the brightest letter, the fifth's at 1920, Y 232; only lime
// may clip).
export const FLARE = { I: 1.1, tau: 0.3, push: 0.5, ptau: 0.45, end: [3.4, 3.9] };
export function litAt(i, t) {
  const t0 = LIGHT[i];
  const end = 1 - smoothstep(...FLARE.end, t);
  let v = smoothstep(t0 - 0.04, t0, t) * (DOORS37.lit[i] + end * FLARE.I * (t > t0 ? Math.exp(-(t - t0) / FLARE.tau) : 1));
  if (i === RIGHT) v += end * FLARE.push * (t > OPEN ? Math.exp(-(t - OPEN) / FLARE.ptau) : smoothstep(OPEN - 0.1, OPEN, t));
  return v;
}

// ------------------------------------------------------------------------------------------------ MCP-first
// s35's line, as s35 left it beside the spark; it goes as the doors come
const MCP_LINE = S35.MCP + ' '.repeat(6);
const EM = 0.016;
const GAP = 0.1;
const DROP = 0.028;
export const mcpAt = (t) => 1 - smoothstep(0, 0.4, t);

// ------------------------------------------------------------------------------------------------ the look
// Straight down from over the well, wide (all seven doors and the reader by the rail), then down onto the
// sixth door to s37's first frame: S37.end36Camera, 40 mm, turned from straight down toward the lintels, its
// frustum let out to the left by a film offset so the doorway sits at 0.75 of the frame. The move eases into
// it and lands still; from LOOK36.move[1] on, the camera is end36Camera itself.
export const LOOK36 = {
  wide: { p: [-1.6, 0, 7.8], mm: 28 },
  move: [1.95, 3.9],
  fstop: LOOK37.fstop,
  doorGlow: 1, // × LOOK37.doors.glow, the reader's light on the doors
};
// The reader's light on the doors (× LOOK37.doors.glow) dips to 0.4 while it goes over to the sixth: on its way
// it passes where the brass bands over the posts' plinths mirror it into the lens, and at s37's strength they
// clip to white (only lime may). Back to s37's by the push.
const DIP = { k: 0.4, down: [1.85, 2.15], up: [2.45, 3.2] };
export const doorGlowAt = (t) =>
  LOOK36.doorGlow * (1 - (1 - DIP.k) * smoothstep(...DIP.down, t) * (1 - smoothstep(...DIP.up, t)));
const _cam = S37.end36Camera(new THREE.PerspectiveCamera());
const END = (() => {
  const Y = V3().setFromMatrixColumn(_cam.matrixWorld, 1);
  return { p: toRow(_cam.position), phi: Math.atan2(Y.dot(RZ), Y.dot(RY)), mm: LOOK37.mm };
})();
const _m4 = new THREE.Matrix4();
const _p = V3();
const _y = V3();
const _z = V3();
// the camera at t, into cam (its pose, lens and film offset)
export function placeCamera(cam, t) {
  const u = span(t, ...LOOK36.move);
  if (u >= 1) return S37.end36Camera(cam);
  const w = LOOK36.wide;
  setLens(cam, lerp(w.mm, END.mm, u));
  cam.near = 0.05;
  cam.far = 1200;
  cam.filmOffset = 0;
  cam.updateProjectionMatrix();
  cam.filmOffset = -0.25 * u * 2 * cam.aspect * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.getFilmWidth();
  cam.updateProjectionMatrix();
  const phi = lerp(0, END.phi, u);
  _y.copy(RY).multiplyScalar(Math.cos(phi)).addScaledVector(RZ, Math.sin(phi));
  _z.copy(RY).multiplyScalar(-Math.sin(phi)).addScaledVector(RZ, Math.cos(phi));
  cam.position.copy(_p.set(lerp(w.p[0], END.p.x, u), lerp(w.p[1], END.p.y, u), lerp(w.p[2], END.p.z, u)).applyMatrix4(ROW));
  cam.quaternion.setFromRotationMatrix(_m4.makeBasis(RX, _y, _z));
  cam.updateMatrixWorld(true);
  return cam;
}

// ------------------------------------------------------------------------------------------------ cues
// got / want: each name at its brightest (within half a beat of its note), the last moment the sixth leaf is
// still shut; and the joins: s35's reader, glow and spark at the start; s37's at the end (CORE, glow 0.9, the
// doors as DOORS37 has them).
export function checkCues() {
  const doors = LIGHT.map((t0, i) => {
    let best = -1;
    let at = 0;
    for (let t = t0 - BEAT / 2; t <= t0 + BEAT / 2; t += 1 / 480) if (litAt(i, t) > best + 1e-12) [best, at] = [litAt(i, t), t];
    return +at.toFixed(3);
  });
  let open = 0;
  for (let t = 0; t <= DUR; t += 1 / 480) if (openAt(RIGHT, t) <= 0) open = t;
  const got = { cut: 0, doors, open: +open.toFixed(3) };
  const bad = [];
  got.doors.forEach((g, i) => Math.abs(g - CUES.doors[i]) > 0.01 && bad.push(`doors[${i}] got ${g} want ${CUES.doors[i]}`));
  if (Math.abs(got.open - CUES.open) > 0.01) bad.push(`open got ${got.open} want ${CUES.open}`);
  if (heroAt(0).distanceTo(S35.HERO1) > 1e-9) bad.push('the reader does not start where s35 left it');
  if (Math.abs(glowAt(0) - S35.glowAt(T35)) > 1e-9 || Math.abs(sparkAt(0) - S35.sparkAt(T35)) > 1e-9) bad.push('glow or spark off s35');
  if (Math.abs((clockAt(LAST) - clockAt(LAST - 1 / 24)) * 24 - R37) > 0.01 * R37) bad.push('the clock is not at s37\'s pace by the end');
  if (heroAt(LAST).distanceTo(CORE) > 1e-6 || Math.abs(glowAt(LAST) - LOOK37.reader.glow) > 1e-6 || sparkAt(LAST) > 1e-6 || pushAt(LAST) > 1e-6) bad.push('the reader is not as s37 has it on the last frame');
  if (Math.abs(doorGlowAt(LAST) - 1) > 1e-6) bad.push('the reader\'s light on the doors is not at s37\'s strength on the last frame');
  if (DOOR.names.some((_, i) => Math.abs(openAt(i, LAST) - DOORS37.open[i]) > 1e-3 || Math.abs(litAt(i, LAST) - DOORS37.lit[i]) > 2e-3)) bad.push('the doors are not as s37 has them on the last frame');
  return { got, want: CUES, bad };
}

// ------------------------------------------------------------------------------------------------ setup
export async function setup(ctx) {
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s36] CUES off: ${cc.bad.join('; ')}`);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1200);
  // the library and its dust as s37 has them
  const lib = new Library({ floors: [K - 45, K + 1], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = LOOK38.fog;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamI.value = 0;
  const dust = new Dust({ uniforms: U, count: LOOK38.dust.count, box: 12, seed: 38 });
  scene.add(dust.points);
  const hero = new AgentBody({ detail: 'hero', seed: READER.seed, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the book on the rail, 8/12, as s35 left it
  const shelf = new BookShelf({ uniforms: U, layout: { books: [deskBook(S35.printAt(T35))], rows: [{ y: 3000 }], x0: -0.02, x1: 0.02 }, labels: await bookLabels(spineLabels()) });
  shelf.group.position.copy(DESK.pos);
  shelf.group.quaternion.copy(QBOOK);
  shelf.uniforms.uEnvCol.value.setRGB(0.08, 0.056, 0.032);
  shelf.uniforms.uPrintCol.value.copy(STEEL).multiplyScalar(0.8); // as s35 left it, the knock long gone
  scene.add(shelf.group);
  const mcp = await CodeGlyphs.create({ lines: [MCP_LINE], uniforms: U, height: ctx.height, col: LIME });
  scene.add(mcp.group);
  // the doors, where s37 has them; the reader's light the only light near them
  const doors = new Doors({ uniforms: U, atlas: await lintelAtlas(), matrix: ROW });
  scene.add(doors.group);
  const DU = doors.uniforms;
  DU.uDGlowR.value = LOOK37.doors.glowR;
  DU.uDKeyCol.value.setRGB(0, 0, 0);
  DU.uDThru.value = 1;
  // the leaves hanging in the well under the sixth door (seen through its doorway once it opens), as s37 hangs
  // them on its first frame, from where the reader's eye is then
  const leaves = new Pages({ uniforms: U, atlas: await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 }), count: LOOK37.column.n });
  scene.add(leaves.mesh);
  // the lens, down the well (s37's point)
  const lu = lightUniforms({ uniforms: { uFogD: { value: LOOK37.lightFog } }, width: ctx.width, height: ctx.height });
  const points = new LightPoints(2, lu);
  scene.add(...points.meshes);

  const body = V3();
  const face = V3();
  const knob = V3();
  const eye = V3();
  const eyeEnd = V3();
  const spark = V3();
  const Rc = V3();
  const Uc = V3();
  const tail = V3();
  const lensCol = new THREE.Color();
  const glowCol = new THREE.Color();
  const open = new Array(DOOR.names.length).fill(0);
  const lit = new Array(DOOR.names.length).fill(0);
  // the reader as it is on the last frame, for the leaves
  const pose = (t) => {
    heroAt(t, body);
    hero.set({
      time: clockAt(t), pos: body.toArray(), face: faceAt(t, face).toArray(), glow: glowAt(t), dive: 0, vel: [0, 0, 0],
      write: 0, stroke: 0, spark: sparkAt(t), push: pushAt(t), pushAt: knobAt(openAt(RIGHT, t), knob).toArray(), beam: 0,
    });
  };
  pose(LAST);
  hero.update(S37.end36Camera(new THREE.PerspectiveCamera()));
  hero.anchor('eye', eyeEnd);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      placeCamera(camera, t);
      lib.update(camera);
      const time = clockAt(t);
      U.uTime.value = time - READER.time;

      pose(t);
      hero.update(camera);
      hero.anchor('eye', eye);
      const key = hero.light();

      // MCP-first, beside the spark as in s35, going
      const m = mcpAt(t);
      if (m > 0) {
        hero.anchor('spark', spark);
        Rc.setFromMatrixColumn(camera.matrixWorld, 0);
        Uc.setFromMatrixColumn(camera.matrixWorld, 1);
        const shown = MCP_LINE.length;
        tail.copy(spark).addScaledVector(Rc, GAP + shown * mcp.adv * EM).addScaledVector(Uc, -DROP);
        mcp.set(0, { tail, shown, em: EM, squash: 0, glow: m });
      }
      mcp.update(camera);

      // the doors: coming, their names, the sixth's leaf
      for (let i = 0; i < lit.length; i++) {
        open[i] = openAt(i, t);
        lit[i] = litAt(i, t);
      }
      doors.set({ open, lit });
      DU.uDGone.value = goneAt(t);
      DU.uDSeed.value = (t * 977) % 1;
      DU.uDGlowPos.value.copy(key.pos);
      DU.uDGlowCol.value.copy(glowCol.copy(key.col).multiplyScalar(LOOK37.doors.glow * doorGlowAt(t)));

      // the leaves (still under the shut door till it opens), keyed to the reader
      leaves.mesh.visible = t > OPEN - 1 / 48;
      S37.hangLeaves(leaves, S37.story(-1 / 24) + (time - clockAt(LAST)), eyeEnd);
      leaves.uniforms.uKeyPos.value.copy(key.pos);
      leaves.uniforms.uKeyCol.value.copy(key.col);

      // the lens down the well
      lensCol.copy(LIME).multiplyScalar(LOOK37.lens.I0);
      points.set(0, LENS, lensCol, LOOK37.lens.r, LOOK37.lens.halo, LOOK37.lens.haloR);
      points.commit(1);

      shelf.set(0, { print: S35.printAt(T35) });
      shelf.commit();
      shelf.key(key.pos, key.col, 0.08);
      shelf.update();

      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK38.dust.g;
      dust.update(camera, time - READER.time, { focus: focusDistance(camera, eye), fstop: LOOK36.fstop, width: ctx.width, intensity: LOOK38.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, eye), fstop: LOOK36.fstop } };
    },
  };
}
