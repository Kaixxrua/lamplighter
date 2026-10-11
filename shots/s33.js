// s33 — 2:15–2:19 (3240–3335, 96 frames, act 3). The book already written.
// A (0–2 s): s32 goes on — its own setup and update, on its clock at 8 + t — so the first frame is the one after
//   s32's last. The sixth line lands at 0.667 s; then the lens swings its look down the wall and drifts out over the
//   shaft: the rail, the cornice, the galleries below one under another.
// B (2–4 s): cut, on the bar, to three floors down. One bay of the same wall, modelled (e1_bay.js): among volumes
//   nobody has touched for a long time stands the same spine — the blue cloth, the gilt film-strip mark at its
//   foot — whole, titled `heygen-com/hyperframes ★ 57,228`, dust on its head and on the board. The floor's one
//   live lamp on that side lights it from the upper left; motes hang in front of it. Far off, once: a ping.
// W(a, s, y) = at(SIDE, K, a, s, y), W27 the same on floor K−3; B(x, y, z): bookshelf.js shelf space at the old
//   book (S32.DUSTY.pos, QBOOK): x along the wall, y up from its board, z out toward the shaft.
// First frame = s32's (its t 8): lens W(7.35, -2.00, 1.66) → W(6.55, -3.00, 1.38), 28 mm f/4; the reader at
//   W(6.80, -3.00, 1.62), steel, the only key; the book printed 5/12, the sixth line half typed.
// Last frame: lens B(0.10, 0.47, 1.17) → B(0, 0.225, 0), 50 mm f/4, pushing in at 8 cm/s; the old book's spine at
//   (0.50, 0.10–0.94) of the frame; lit by floor K−3's lamp at W27(4.0, -4.6, 4.3), amber, a pool from the upper
//   left; no steel, no lime.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, smoothstep } from 'film/lib/ease.js';
import { LIB, libraryUniforms } from 'world/libshader.js';
import { Dust } from 'world/dust.js';
import { dustyBay } from 'world/e1_bay.js';
import * as S32 from './s32.js';
import { LOOK17 } from './s17.js';
import { LENS as LENS31 } from './s31.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const FPS = 24;
const DUR = meta.frames / FPS;
const T32 = 8; // s32's clock at t = 0 here
const T31 = 6 + T32; // s31's
export const BEAT = S32.BEAT;
const CUT = 48; // the frame B begins on
export const CROSS = CUT / FPS; // 2.0 s: beat 24 (global 137 s), a bar line
// a sample belongs to the frame it is nearest (the shutter is half a frame), so no frame is exposed across the cut
const inB = (t) => Math.round(t * FPS) >= CUT;

// ---------------------------------------------------------------------------------- A: the tilt
// From where s32 left the lens it swings its look down the wall, three floors, to the rail of floor K−3 above the
// bay where the old book stands, and drifts out over the shaft as it goes, clear of the balusters; the ease runs
// to TILT1, so it is still going at the cut.
const TILT0 = 0.55;
const TILT1 = 2.3;
const OUT = S32.at(S32.SIDE, S32.K, 9.0, -2.7, 1.9); // where the lens drifts to
const DOWN = S32.at(S32.SIDE, S32.K3, 6.2, -3.0, 1.1); // what it ends up looking at: K−3's rail, over the bay
const UP = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _l = new THREE.Vector3();
const _d = new THREE.Vector3();
const yawPitch = (d) => [Math.atan2(d.z, d.x), Math.asin(d.y / d.length())];
const [YAW1, PITCH1] = yawPitch(DOWN.clone().sub(OUT));
export const tiltAt = (t) => smoothstep(TILT0, TILT1, t);
// the lens of A at t: s32's own path, carried on, then the tilt (yaw and pitch turned evenly from s32's look to
// the look down, so the horizon stays level)
export function camA(t, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  S32.camAt(T32 + t, _p, _l);
  const e = tiltAt(t);
  pos.copy(_p).lerp(OUT, e);
  if (e <= 0) return { pos, look: look.copy(_l) };
  const [y0, p0] = yawPitch(_d.copy(_l).sub(_p));
  let dy = YAW1 - y0;
  dy -= 2 * Math.PI * Math.round(dy / (2 * Math.PI));
  const y = y0 + dy * e;
  const p = lerp(p0, PITCH1, e);
  look.set(Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)).add(pos);
  return { pos, look };
}
const FAR = 8; // focus once it looks down the shaft: with 28 mm at f/4 everything from 3.6 m on is sharp

// ---------------------------------------------------------------------------------- B: three floors down
export const LOOK33 = {
  mm: 50,
  fstop: 4,
  // the lens (shelf space at the old book) at the cut and at the end, and what it looks at: a slow push in from
  // a little above and to the right, the whole spine in frame throughout
  cam: [[0.16, 0.53, 1.3], [0.1, 0.47, 1.17]],
  look: [[0, 0.227, 0], [0, 0.225, 0]],
  key: 30, // the lamp's light on the bay (radiant intensity, × its colour)
  pool: [2, 7], // …which falls as a pool about the old book: full within 2° of it from the lamp, gone at 7° (0.6 m)
  env: [0.03, 0.02, 0.012], // what the gilt gives back of the gallery
  dust: { count: 12000, box: 3, I: 100, g: 0.55 },
  title: 0.78, // the title's em of its strip (s32 letters it at 0.46, unseen there): as large as the strip holds
};
// floor K−3's lamp on this side nearest the bay: the one at −LAMP_OFF (libshader's lamp 0 of side 0, which burns;
// lamp 1, at +LAMP_OFF, is one of the library's dead ones)
export const LAMP27 = S32.at(S32.SIDE, S32.K3, S32.PLACE.FACE - LIB.LAMP_A, -LIB.LAMP_OFF, LIB.LAMP_Y);
export const inBay = (v, out = new THREE.Vector3()) => out.fromArray(v).applyQuaternion(S32.QBOOK).add(S32.DUSTY.pos);
// the old book's lettering: s32's, the title at the size that reads from here
export function labels33() {
  const L = S32.spineLabels();
  L.strips[0] = { ...L.strips[0], size: LOOK33.title };
  return L;
}
const B0 = [inBay(LOOK33.cam[0]), inBay(LOOK33.look[0])];
const B1 = [inBay(LOOK33.cam[1]), inBay(LOOK33.look[1])];
const SPINE = inBay([0, 0.21, 0]); // in focus: the middle of the spine
export function camB(t, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  const u = (t - CROSS) / (DUR - CROSS); // even: it is moving when the shot comes in and when it goes out
  pos.copy(B0[0]).lerp(B1[0], u);
  look.copy(B0[1]).lerp(B1[1], u);
  return { pos, look };
}

export const CUES = {
  cut: 0,
  glyphs: [+(S32.LINES[5].land - T32).toFixed(3)], // the sixth line lands (beat 22)
  tilt: [TILT0, CROSS],
  cross: CROSS, // the cut to the old book
  ping: +(CROSS + BEAT).toFixed(3), // beat 25: far off, once (sound only: no light of it reaches here)
};

// got / want, off what the shot does: the landing off s32's print (where its step is half done); the tilt from when
// the lens first leaves s32's path to the cut; the cut off the first frame B has; the ping off the score's grid
// (beats counted from s31's cut, 14 s before this shot begins; three to the bar)
const GRID0 = -14;
const beatOf = (t) => (t - GRID0) / BEAT;
export function checkCues() {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const glyphs = [];
  let tilt0 = -1;
  let prev = S32.printAt(T32);
  for (let f = 1; f <= DUR * 240; f++) {
    const t = f / 240;
    const p = S32.printAt(T32 + t);
    const k = Math.round(prev / S32.STEP);
    if (!inB(t) && p >= (k + 0.5) * S32.STEP && prev < (k + 0.5) * S32.STEP) glyphs.push(+(t - 0.05).toFixed(3));
    prev = p;
    if (tilt0 < 0) {
      camA(t, a, b);
      S32.camAt(T32 + t, c, d);
      if (a.distanceTo(c) > 1e-7) tilt0 = +((f - 1) / 240).toFixed(3);
    }
  }
  let cross = -1;
  for (let f = 0; f < meta.frames && cross < 0; f++) if (inB(f / FPS)) cross = f / FPS;
  const ping = +(GRID0 + Math.round(beatOf(CUES.ping)) * BEAT).toFixed(3);
  const got = { cut: 0, glyphs, tilt: [tilt0, cross], cross, ping };
  const off = (g, w) => Math.abs(g - w) > 0.01;
  const bar = Math.round(beatOf(cross));
  const bad = [];
  if (glyphs.length !== CUES.glyphs.length || glyphs.some((g, i) => off(g, CUES.glyphs[i]))) bad.push(`glyphs got ${glyphs} want ${CUES.glyphs}`);
  if (off(tilt0, CUES.tilt[0]) || off(cross, CUES.tilt[1])) bad.push(`tilt got ${got.tilt} want ${CUES.tilt}`);
  if (off(cross, CUES.cross) || off(beatOf(cross), bar) || bar % 3 !== 0) bad.push(`cross got ${cross} (beat ${beatOf(cross).toFixed(2)}) want ${CUES.cross}, on a bar`);
  if (off(ping, CUES.ping) || !(CUES.ping > cross && CUES.ping < DUR)) bad.push(`ping got ${ping} want ${CUES.ping}, in B`);
  return { got, want: CUES, bad };
}

export async function setup(ctx) {
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s33] CUES off: ${cc.bad.join('; ')}`);
  // ------------------------------------------------------------------ A
  const A = await S32.setup(ctx);
  const camera = A.camera;
  // A's lens goes in where aim() finishes s32's (its updateMatrixWorld), once per update, so that everything s32
  // does with the lens after that (the library's floors picked by the frustum, the reader, the glyphs, the dust)
  // sees it.
  let pending = -1;
  const cpos = new THREE.Vector3();
  const clook = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const base = camera.updateMatrixWorld.bind(camera);
  camera.updateMatrixWorld = (force) => {
    if (pending >= 0) {
      camA(pending, cpos, clook);
      pending = -1;
      camera.position.copy(cpos);
      camera.quaternion.setFromRotationMatrix(m.lookAt(cpos, clook, UP));
    }
    return base(force);
  };
  let dustA = null;
  A.scene.traverse((o) => {
    if (o.isPoints && o.material?.uniforms?.uFocusD) dustA = o.material.uniforms;
  });

  // ------------------------------------------------------------------ B
  // its own uniforms (nothing of A's is touched): the same night, the same lamps
  const UB = libraryUniforms();
  const st = UB.uFloorState.value.image.data;
  for (let i = 0; i < LIB.FLOOR_COUNT; i++) st[i * 4 + 1] = LOOK17.lamp;
  UB.uFloorState.value.needsUpdate = true;
  UB.uFogD.value = 0.009;
  UB.uFogCol.value.setRGB(0, 0, 0);
  UB.uAmb.value.setRGB(0, 0, 0);
  const sceneB = new THREE.Scene();
  const cameraB = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 200);
  setLens(cameraB, LOOK33.mm);
  const bay = await dustyBay({ uniforms: UB, place: S32.DUSTY, book: S32.dustyBook(), labels: labels33() });
  bay.shelf.group.position.copy(S32.DUSTY.pos);
  bay.shelf.group.quaternion.copy(S32.QBOOK);
  bay.shelf.uniforms.uBackLit.value = 1;
  bay.shelf.uniforms.uEnvCol.value.fromArray(LOOK33.env);
  const keyCol = UB.uLampCol.value.clone().multiplyScalar(LOOK33.key);
  bay.shelf.key(LAMP27, keyCol, LIB.LAMP_R);
  bay.shelf.beam(SPINE, ...LOOK33.pool);
  bay.shelf.update();
  sceneB.add(bay.shelf.group);
  const dustB = new Dust({ uniforms: UB, count: LOOK33.dust.count, box: LOOK33.dust.box, seed: 33 });
  dustB.uniforms.uKeyPos.value.copy(LAMP27);
  dustB.uniforms.uKeyCol.value.copy(keyCol);
  dustB.uniforms.uKeyR.value = LIB.LAMP_R;
  dustB.uniforms.uKeyDir.value.copy(bay.shelf.uniforms.uKeyDir.value);
  dustB.uniforms.uKeyCone.value.copy(bay.shelf.uniforms.uKeyCone.value);
  dustB.uniforms.uG.value = LOOK33.dust.g;
  sceneB.add(dustB.points);
  const bpos = new THREE.Vector3();
  const blook = new THREE.Vector3();

  let focus = 1;
  let fstop = LENS31.fstop;
  const shot = {
    scene: A.scene,
    camera,
    clearColor: A.clearColor,
    update(t) {
      if (inB(t)) {
        camB(t, bpos, blook);
        aim(cameraB, bpos, blook);
        UB.uTime.value = T31 + t;
        focus = focusDistance(cameraB, SPINE);
        fstop = LOOK33.fstop;
        dustB.update(cameraB, T31 + t, { focus, fstop, width: ctx.width, intensity: LOOK33.dust.I });
        shot.scene = sceneB;
        shot.camera = cameraB;
        return;
      }
      pending = t;
      A.update(T32 + t);
      pending = -1;
      focus = lerp(A.post().dof.focus, FAR, smoothstep(0.6, 1.5, t));
      fstop = LENS31.fstop;
      if (dustA) dustA.uFocusD.value = focus;
      shot.scene = A.scene;
      shot.camera = camera;
    },
    post() {
      return { dof: { focus, fstop } };
    },
  };
  shot.update(0);
  return shot;
}
