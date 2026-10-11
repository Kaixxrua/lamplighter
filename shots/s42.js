// s42 — 2:55–2:59 (4200–4295, 96 frames, act 3). The light left on. One picture for both languages: card 7
// (the engine's) carries both lines.
// An empty frame, the lens locked off far out in the void before floor 27's side 0, long (85 mm), looking a little
// down past the lamp at the wall: high on the left the one lime lamp, 27:0, on its rod, 4 m out from the shelves;
// low on the right, in the lamp's pool, the bay s41 ended on — the old book home in its place, the lime ribbon
// hanging from under its foot over the shelf's edge. The reader has gone. A few motes turn in the lamp's light.
// Card 7 (它留下一盏灯，给下一个读者。) runs over the middle, local 0.25–3.83 s: the band across the middle of the
// frame (0.40–0.60 of its height) is the dark wall over the pool — the heads of the row above the book's, the
// board, the feet of the next — and the lamp, the pool, the book and the ribbon are all out of it. No other lamp
// is in the frame (27:1 and 27:14 are the library's dead lamps in act three; 27:12 is far out of it).
// In: a cut back from s41's last frame (close on the spine and the ribbon in the lime pool) to the long view.
// Out: the cut to s43's first frame (in the void across from corner 2, floor 27 wholly lime).
// W(a, s, y) = at(SIDE, K3, a, s, y), as s40 and s41 have it.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { Ribbon } from 'world/d_ribbon.js';
import { Motes } from 'world/d_motes.js';
import { bayScene, W, bookAt, recordOf, ribbonAt, RIB_L, RIB_M, RIB_W, RIB_TEXT, LIME_LEVEL } from './s41.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
export const CUES = { cut: 0 };

const V3 = (...a) => new THREE.Vector3(...a);
// the lens: 15 m out from the shelves (3.6 m short of the shaft's axis), 2 m over the book and a little to the
// lamp's side of it, so that the lamp (11 m off) stands up and to the left of the book (15.2 m off)
export const CAM = W(15.0, -4.3, 4.0);
export const LOOK = W(2.0, -3.9, 3.33);
export const MM = 85;
export const FSTOP = 1.4;
const REST = 10; // s41's clock long after the book came home: everything where s41 left it
// what the lime lamp throws about on the wall here: less than s41's (LIME_SPILL), the band over the pool is card 7's
const SPILL = 0.05;
const DIM = 0.25; // the library's lamp light on the walls, of s41's
const HALO = 1.4; // the lamp's haze, its radius (m; the library's is 2.2): its skirt stays over the band
// the motes: a few, within half a metre of the lamp, rising slowly in its warmth and turning
const NM = 34;
const MOTE_I = 0.5; // what one gives off at 1 m from the lamp (× the lamp's lime)
const rnd = (() => {
  let a = 4242;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
})();
const MOTES = Array.from({ length: NM }, () => {
  const th = 2 * Math.PI * rnd();
  const z = 2 * rnd() - 1;
  const r = 0.36 + 0.26 * rnd();
  const sq = Math.sqrt(1 - z * z);
  return { o: V3(r * sq * Math.cos(th), r * z, r * sq * Math.sin(th)), w: 0.05 + 0.1 * rnd(), up: 0.006 + 0.012 * rnd(), ph: 2 * Math.PI * rnd(), tw: 0.5 + 1.2 * rnd(), g: 0.4 + 0.6 * rnd(), s: 0.0008 + 0.0008 * rnd() };
});

export async function setup(ctx) {
  const env = await bayScene(ctx);
  const { scene, camera, lib, U, wall, bay, dust, REC } = env;
  bay.group.updateMatrixWorld(true);
  const toW = (v) => bay.shelf.group.localToWorld(v);
  // the book at home, as s41 ends
  const p = V3();
  const q = new THREE.Quaternion();
  const recP = V3();
  const recQ = new THREE.Quaternion();
  bookAt(REST, REC, p, q);
  recordOf(p, q, recP, recQ);
  bay.shelf.set(bay.index, { x: recP.x, y: recP.y, z: recP.z, q: recQ, scale: 1 });
  bay.shelf.commit();
  // the ribbon, draped over the board's edge
  const rib = await Ribbon.create({ uniforms: U, wall, shelf: bay.shelf, length: RIB_L, points: RIB_M, width: RIB_W, text: RIB_TEXT, flip: true });
  rib.mesh.material = env.withOne(rib.material);
  scene.add(rib.mesh);
  const P = Array.from({ length: RIB_M }, () => V3());
  const N = Array.from({ length: RIB_M }, () => V3());
  ribbonAt(REST, { toW, q: bay.q, rec: REC }, P, N);
  rib.lay(P, N);
  // the lamp, lime; nothing else of s41's lights (the reader and the tower have gone)
  // and the floor's other lamps (none in the frame) turned low: what is left of the wall is the lamp's
  const I0 = U.uLampI.value;
  U.uLampI.value = I0 * DIM;
  env.setLamp(1);
  env.lamp.glow.material.uniforms.uGlowR = { value: HALO };
  for (const i of [0, 1, 3]) wall.light(i, V3(), new THREE.Color(0, 0, 0), 1);
  wall.light(2, env.LP, U.uLampLime.value.clone().multiplyScalar(I0 * LIME_LEVEL * SPILL), Math.sqrt(0.3));
  bay.shelf.update();
  const book = toW(V3(recP.x, recP.y + 0.21, recP.z)); // the book's middle (world), for the focus
  // the air: s41's dust is a box about the lens, far from the lamp here; these are the shot's own, about the lamp
  dust.points.visible = false;
  const motes = new Motes({ count: NM, uniforms: U, refD: CAM.distanceTo(env.LP) });
  scene.add(motes.points);
  const lime = U.uLampLime.value;
  const mp = V3();
  const YA = V3(0, 1, 0);
  return {
    scene,
    camera,
    lib,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      setLens(camera, MM);
      aim(camera, CAM, LOOK);
      camera.updateMatrixWorld();
      lib.update(camera);
      U.uTime.value = 42 + t;
      // the motes in the lamp's light: each goes slowly round the lamp and up, and catches the light as it turns
      for (let i = 0; i < NM; i++) {
        const M = MOTES[i];
        mp.copy(M.o).applyAxisAngle(YA, M.w * t);
        mp.y += M.up * t;
        const r2 = mp.lengthSq();
        const e = (MOTE_I * M.g * (0.35 + 0.65 * Math.abs(Math.sin(M.tw * t + M.ph)) ** 3)) / r2;
        mp.add(env.LP).toArray(motes.pos, 3 * i);
        motes.col[3 * i] = lime.r * e;
        motes.col[3 * i + 1] = lime.g * e;
        motes.col[3 * i + 2] = lime.b * e;
        motes.size[i] = M.s;
      }
      motes.update(camera, { focus: focusDistance(camera, book), fstop: FSTOP, width: ctx.width });
    },
    post() {
      return { dof: { focus: focusDistance(camera, book), fstop: FSTOP } };
    },
  };
}
