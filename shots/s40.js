// s40 — 2:45–2:51 (3960–4103, 144 frames, act 3). Reuse: the tower of pages.
// The reader lets go of the book it was writing: the half that is printed loosens into steel motes. It dives three
// floors down the shaft, its motes after it, to the book that was already written, draws it out of its bay, and it
// falls open (the old dust goes up); from its pages new ones of steel light fold up, storey on storey, into a tower
// far taller than the half book was. The lens follows the dive from the void, comes in over the rail of floor 27
// after it and looks up the tower as it grows.
// W(a, s, y) = at(SIDE, K3, a, s, y): a out from the shelf face of side 0, s along it, y above floor 27 (K3); floor
// 30 (K), where it starts, is 21.6 m up.
import * as THREE from 'three';
import { setLens, aim, focusDistance, path } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { LIB } from 'world/libshader.js';
import { Dust } from 'world/dust.js';
import { AgentBody, STEEL } from 'world/agentbody.js';
import { BookShelf, bookLabels } from 'world/bookshelf.js';
import { LOOK17 } from './s17.js';
import { LOOK31, LENS as LENS31 } from './s31.js';
import { K, K3, SIDE, DESK, DUSTY, QBOOK, SPINE, STEP, BEAT, at, deskBook, dustyBook, spineLabels } from './s32.js';
import { labels33, LOOK33, LAMP27 } from './s33.js';
import { WallMaterial, Bay, shelfLights } from 'world/d_bay.js';
import { OpenBook } from 'world/d_book.js';
import { PageTower } from 'world/d_tower.js';
import { Motes } from 'world/d_motes.js';
import { rng } from 'film/lib/rng.js';

export const meta = { frames: 144, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export { BEAT };
// 2:45 is the third beat of a bar: the bar lines fall at 1.333 s (the dive) and 4 s (the book opens: the new harmony)
const T_DUST = 0.5 * BEAT; // the half book begins to loosen
const T_DIVE = [2 * BEAT, 3.7]; // off the rail of floor 30 … at rest before the bay of floor 27
const T_OPEN = 6 * BEAT; // the old book lies open
const T_GROW = [T_OPEN + BEAT / 4, T_OPEN + BEAT / 4 + 8 * (BEAT / 4) + 0.32]; // the first storey up … the ninth upright
export const CUES = { cut: 0, dust: T_DUST, dive: T_DIVE, open: T_OPEN, grow: T_GROW };

const V3 = (...a) => new THREE.Vector3(...a);
const DROP = (K - K3) * LIB.H; // 21.6 m
export const W = (a, s, y) => at(SIDE, K3, a, s, y);

// distance run (0..1) between t0 and t1: from rest up to speed over ta, held, down to rest over td
const run = (t, t0, t1, ta, td) => {
  const T = t1 - t0;
  const tc = T - ta - td;
  const tot = ta / 2 + tc + td / 2;
  const x = clamp(t - t0, 0, T);
  if (x < ta) return (x * x) / (2 * ta) / tot;
  if (x < ta + tc) return (ta / 2 + (x - ta)) / tot;
  const y = x - ta - tc;
  return (ta / 2 + tc + y - (y * y) / (2 * td)) / tot;
};

// ---------------------------------------------------------------------------------- the reader
// Where s32 left it (and, it is taken, s36): on the shaft side of its book. It backs off the rail, rising a little,
// and goes down the void 0.9 m off the slab edges; under the slab of floor 28 it turns in over the rail of floor 27
// and comes to rest beside the place the old book will lie open, on its right.
const HERO0 = W(6.8, -3.0, DROP + 1.62);
const REST = W(1.3, -2.3, 1.8);
const FALL = path([W(7.5, -3.0, DROP + 1.8), W(7.65, -3.0, 19.0), W(7.6, -3.0, 13.0), W(7.4, -3.0, 8.2), W(6.2, -2.9, 5.0), W(3.4, -2.6, 2.7), REST]);
const FALL0 = FALL.at(0);
const fallAt = (t) => run(t, T_DIVE[0], T_DIVE[1], 0.42, 0.95);
// then, as the tower grows, it goes up beside it, writing, to near its top
const PEAK = W(1.42, -2.52, 4.8);
const T_RISE = [T_GROW[0] + 0.12, T_GROW[1] + 0.05];
export function heroAt(t, out = V3()) {
  if (t <= T_DIVE[0]) return out.copy(HERO0).lerp(FALL0, smoothstep(0.45, T_DIVE[0] + 0.12, t));
  FALL.at(fallAt(t), out);
  return out.lerp(PEAK, run(t, T_RISE[0], T_RISE[1], 0.35, 0.55));
}

// ---------------------------------------------------------------------------------- the lens
// Out in the void, looking back at the rail of floor 30; it goes down after the reader, outside it and above, under
// the slab of floor 28 and in over the rail, and settles low in the gallery, 4 m from the bay.
const CAM0 = W(9.8, -1.8, DROP + 2.45);
const CAM1 = W(9.6, -1.85, DROP + 2.4);
const RIDE = path([CAM1, W(10.4, -1.9, 20.5), W(10.8, -2.1, 14.5), W(10.4, -2.4, 9.6), W(8.8, -2.9, 5.6), W(6.2, -3.4, 3.6), W(3.3, -3.6, 2.6)]);
const rideAt = (t) => run(t, T_DIVE[0], 3.95, 0.6, 1.2);
// as the tower grows it backs off down the gallery, low, to see it whole (still moving at the cut)
const BACK = W(6.0, -4.2, 1.75);
const backAt = (t) => run(t, T_OPEN + 0.05, DUR + 0.4, 0.7, 1.1);
const LOOK0 = W(6.66, -3.0, DROP + 1.45);
const LECTERN = W(1.0, -3.0, 1.45); // where the old book lies open
const LOOK_OPEN = W(1.0, -3.0, 1.75); // what the lens looks at as it opens (the book a little under the middle)
export const lensAt = (t) => lerp(lerp(28, 24, smoothstep(T_DIVE[0], 2.6, t)), 22, smoothstep(T_OPEN + 0.2, DUR, t));
const _h = V3();
export function camAt(t, pos = V3(), look = V3()) {
  if (t <= T_DIVE[0]) pos.copy(CAM0).lerp(CAM1, smoothstep(0, T_DIVE[0], t));
  else RIDE.at(rideAt(t), pos).lerp(BACK, backAt(t));
  // it looks at the reader (a little ahead of it as it falls), then at the book, then up the tower
  heroAt(t + 0.03, _h);
  look.copy(LOOK0).lerp(_h, smoothstep(0.9, 1.7, t)).lerp(LOOK_OPEN, smoothstep(3.0, 3.7, t));
  look.y += lerp(0, 1.35, smoothstep(T_OPEN + 0.1, DUR - 0.1, t));
  return { pos, look };
}

// ---------------------------------------------------------------------------------- the half book
// It was printed 8/12 (s34 lands the eighth line). Let go, it un-prints from the top down, its print line running
// back the way it came, and what it was goes up as motes.
const PRINT0 = 8 * STEP;
const LOOSE = 0.95; // s: how long it takes to go
export const printAt = (t) => PRINT0 * (1 - smoothstep(T_DUST, T_DUST + LOOSE, t));

// ---------------------------------------------------------------------------------- the old book
// In the bay's frame (Bay's shelf space: x along the wall (+s), y up from board 2, z out toward the shaft), as the
// open book's frame (d_book.js). The reader calls it as it comes in: it tips out on the front edge of its foot, its
// title up to the light, slides out, turns over in the air (half a turn about the diagonal up-and-in: the spine goes
// under, the head to the wall) and falls open flat at the bar line, the covers slapping down. The shelf draws it,
// title and all, until its spine has turned away from the lens; the open book from then on.
const T_TIP = [3.28, 3.5];
const T_FLY = [3.4, 3.94];
const T_TURN = [3.5, 3.88];
const T_FALL = [3.7, T_OPEN];
const TIP = 0.36; // rad
const SPOT = V3(0, LECTERN.y - DUSTY.pos.y, 1.0 - DUSTY.a); // where it lies open (LECTERN, in the bay's frame)
const Q_F = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
const Q_FLAT = new THREE.Quaternion();
const XA = V3(1, 0, 0);
const _q = new THREE.Quaternion();
const _v = V3();
// how far open: shut until the covers let go, falling faster and faster to flat at T_OPEN, a small bounce after
export const openAt = (t) => {
  const x = clamp((t - T_FALL[0]) / (T_FALL[1] - T_FALL[0]), 0, 1);
  const y = clamp((t - T_OPEN) / 0.36, 0, 1);
  return x * x + 0.05 * Math.sin(Math.PI * y) * (1 - y);
};
// the open book's frame (pos, quat in the bay's frame) at t; rec: the shut volume's record origin (book x, y, z)
function oldAt(t, rec, pos, quat) {
  const { h } = SPINE;
  const sag = 0.12 * SPINE.w;
  const th = TIP * smoothstep(T_TIP[0], T_TIP[1], t);
  _q.setFromAxisAngle(XA, th);
  // tipped on the front edge of its foot (the record's origin)
  const P0 = _v.set(0, h / 2, -sag).applyQuaternion(_q).add(rec);
  quat.copy(_q).multiply(Q_F);
  const u = run(t, T_FLY[0], T_FLY[1], 0.2, 0.3);
  if (u <= 0) return pos.copy(P0);
  // out of the bay along z, then over and down onto the spot
  const P1 = V3(P0.x, P0.y + 0.03, P0.z + 0.42);
  const P2 = V3(SPOT.x, SPOT.y + 0.3, SPOT.z - 0.12);
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
  pos.set(0, 0, 0).addScaledVector(P0, a).addScaledVector(P1, b).addScaledVector(P2, c).addScaledVector(SPOT, d);
  quat.slerp(Q_FLAT, smoothstep(T_TURN[0], T_TURN[1], t));
  return pos;
}

// ---------------------------------------------------------------------------------- the tower
// Nine storeys of six pages, 0.4 m each, out of the open book: the first rises out of its pages a sixteenth after the
// bar line, one more swings up on every sixteenth after that (folded over the top of the one below, outward, it
// comes up through 150°), each lit as it starts and its text typed down it in half a second.
const STOREYS = 9;
const STOREY_H = 0.4;
const SWING = 0.32; // s a storey takes to come up
export function storeyAt(t, j, out = {}) {
  const t0 = T_GROW[0] + j * (BEAT / 4);
  const x = clamp((t - t0) / SWING, 0, 1);
  const e = 1 - (1 - x) ** 3;
  out.rise = j === 0 ? e : 1;
  out.swing = j === 0 ? 0 : (5 / 6) * Math.PI * (1 - e);
  out.level = smoothstep(t0 - 0.02, t0 + 0.12, t);
  out.typed = smoothstep(t0 + 0.04, t0 + 0.5, t);
  return out;
}

// ---------------------------------------------------------------------------------- the motes
// The half book's light: a mote for each bit of what was printed, let go as the print line passes it (from the top
// down: the loosening), adrift a moment, then down the shaft after the reader, each a little later than the one
// before, and at the old book into a storey of the tower as that storey lights. The old book's dust: a little off
// the shelf as it is drawn out, more up off its pages as the covers come down, out and slowly down again.
const NL = 360;
const ND = 460;
const NS = 60; // of the dust: off the shelf
const TAU = 2 * Math.PI;
const invSmooth = (s) => 0.5 - Math.sin(Math.asin(1 - 2 * s) / 3);
const LM = (() => {
  const r = rng(401);
  return Array.from({ length: NL }, () => {
    const fy = r() * PRINT0;
    const th = TAU * r();
    const ct = 2 * r() - 1;
    const rad = 0.12 + 0.3 * Math.cbrt(r());
    const st = Math.sqrt(1 - ct * ct);
    return {
      p: V3((r() - 0.5) * SPINE.w * 0.9, fy * SPINE.h, -r() * SPINE.d * 0.9), // in the half book's frame
      t0: T_DUST + LOOSE * invSmooth(clamp(1 - fy / PRINT0, 0.001, 0.999)),
      v: V3((r() - 0.5) * 0.3, 0.08 + 0.22 * r(), 0.04 + 0.22 * r()),
      u: r(),
      lag: 0.04 + 0.2 * r(),
      off: V3(rad * st * Math.cos(th), rad * ct, rad * st * Math.sin(th)),
      j: Math.min(STOREYS - 1, Math.floor(r() * STOREYS)),
      side: Math.floor(r() * 6),
      across: r(),
      up: 0.1 + 0.8 * r(),
      s: 0.0012 + 0.0016 * r(),
      a: 0.7 + 0.6 * r(),
    };
  });
})();
const DM = (() => {
  const r = rng(402);
  return Array.from({ length: ND }, (_, i) => {
    const shelf = i < NS;
    const ang = shelf ? Math.PI * (0.15 + 0.7 * r()) : TAU * r();
    const rad = 0.06 + 0.24 * Math.sqrt(r());
    const out = shelf ? 0.1 + 0.3 * r() : 0.25 + 0.8 * r();
    return {
      b: shelf ? T_FLY[0] + 0.04 + 0.12 * r() : T_OPEN - 0.04 + 0.06 * r(),
      // in the bay's frame: off the top of the gap in the row, or off the open book's spread
      p: shelf ? V3((r() - 0.5) * 0.12, SPINE.h + 0.01 * r(), -0.02 - 0.2 * r()) : V3(Math.cos(ang) * rad * 1.1, 0.004 + 0.02 * r(), Math.sin(ang) * rad * 0.85).add(SPOT),
      v: shelf ? V3((r() - 0.5) * 0.2, 0.05 + 0.2 * r(), out) : V3(Math.cos(ang) * out, 0.15 + 0.6 * r(), Math.sin(ang) * out),
      tau: 0.25 + 0.3 * r(),
      life: 1.0 + 1.6 * r(),
      ph: TAU * r(),
      s: 0.0004 + 0.0008 * r(),
      a: 0.5 + r(),
    };
  });
})();
const _mh = V3();
// a mote of the half book's light at t (world); returns how bright (0: not there)
function lightMote(m, G, t, out) {
  if (t < m.t0) return 0;
  const dt = t - m.t0;
  const k = 0.6 * (1 - Math.exp(-dt / 0.6));
  out.copy(m.v).multiplyScalar(k).add(m.p).applyQuaternion(QBOOK).add(DESK.pos);
  const w = smoothstep(T_DIVE[0] - 0.15 + 0.35 * m.u, T_DIVE[0] + 0.3 + 0.35 * m.u, t);
  // (a wider cloud while it falls fast, so that they do not draw a line down the shaft)
  if (w > 0) out.lerp(heroAt(t - m.lag, _mh).addScaledVector(m.off, 1 + 2.2 * smoothstep(T_DIVE[0], T_DIVE[0] + 0.4, t) * (1 - smoothstep(2.9, 3.5, t))), w);
  const t1 = T_GROW[0] + m.j * (BEAT / 4);
  const w2 = smoothstep(t1 - 0.5, t1 + 0.02, t);
  if (w2 > 0) out.lerp(G, w2);
  return m.a * (1 + 0.8 * Math.exp(-dt / 0.25)) * (1 - smoothstep(t1, t1 + 0.12, t));
}
// a mote of the old book's dust at t (in the bay's frame); returns how bright
function dustMote(m, t, out) {
  if (t < m.b) return 0;
  const dt = t - m.b;
  const k = m.tau * (1 - Math.exp(-dt / m.tau));
  out.copy(m.v).multiplyScalar(k).add(m.p);
  out.x += 0.02 * Math.sin(1.3 * dt + m.ph);
  out.y += 0.015 * Math.sin(1.1 * dt + 2 * m.ph) - 0.04 * dt * dt;
  return m.a * smoothstep(0, 0.06, dt) * Math.exp(-dt / m.life);
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K3 - 12, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamI.value = 0;
  // the bay three floors down: its books modelled (E1's, as s33 shows them), the painted plane opened for them
  const wall = new WallMaterial(lib).attach(lib);
  // E1's lettering for it (s33: the title at the size that reads close to)
  const bay = await Bay.create({ uniforms: U, place: DUSTY, side: SIDE, book: dustyBook(), labels: labels33(), material: wall.material });
  wall.hole(...bay.holeArgs);
  // lit as s33 lights it (floor 27's lamp, a pool about the old book) and by the shot's own lights
  shelfLights(bay.shelf, wall);
  bay.shelf.uniforms.uBackLit.value = 1;
  bay.shelf.uniforms.uEnvCol.value.fromArray(LOOK33.env);
  bay.shelf.key(LAMP27, U.uLampCol.value.clone().multiplyScalar(LOOK33.key), LIB.LAMP_R);
  bay.shelf.beam(DUSTY.pos.clone().add(V3(0, 0.21, 0)), ...LOOK33.pool);
  scene.add(bay.group);
  // the old book, open (its own pages; the same cloth), in the bay's frame
  const rec0 = bay.shelf.books[bay.index];
  const REC = V3(rec0.x, rec0.y, rec0.z);
  const SAG = 0.12 * SPINE.w;
  const old = await OpenBook.create({ uniforms: U, wall, dims: { w: SPINE.w, h: SPINE.h, d: SPINE.d }, cloth: SPINE.col, name: 'heygen-com/hyperframes', folio: 57, sag: SAG });
  old.group.visible = false;
  bay.shelf.group.add(old.group);
  // the tower, standing on its pages
  const tower = await PageTower.create({ uniforms: U, storeys: STOREYS, radius: 0.21, height: STOREY_H });
  tower.group.position.copy(SPOT).add(V3(0, 0.003, 0));
  bay.shelf.group.add(tower.group);
  tower.clip(LECTERN.y + 0.003);
  const sto = {};
  // the motes, and where each of the light's goes into the tower (a point on a page of its storey)
  const motes = new Motes({ count: NL + ND, uniforms: U });
  scene.add(motes.points);
  bay.group.updateMatrixWorld(true);
  const GL = LM.map((m) => {
    const c0 = tower.corner[(m.side + 1) % 6];
    const c1 = tower.corner[m.side];
    const g = V3().lerpVectors(c0, c1, m.across).add(SPOT);
    g.y += 0.003 + (m.j + m.up) * STOREY_H;
    return bay.shelf.group.localToWorld(g);
  });
  const mp = V3();
  const AMBER = U.uLampCol.value;
  const tl = V3();
  const tc = new THREE.Color();
  const obPos = V3();
  const obQuat = new THREE.Quaternion();
  const recQ = new THREE.Quaternion();
  const recP = V3();
  // the hand-over, on the first frame the shut book's spine is turned away from the lens (at the latest as it opens)
  let T_SWAP = T_FALL[0];
  {
    const c = V3();
    const l = V3();
    const n = V3();
    bay.group.updateMatrixWorld(true);
    for (let f = Math.ceil(T_TURN[0] * 24); f / 24 < T_FALL[0]; f++) {
      const t = f / 24;
      camAt(t, c, l);
      oldAt(t, REC, obPos, obQuat);
      bay.shelf.group.localToWorld(obPos);
      n.set(0, -1, 0).applyQuaternion(obQuat).applyQuaternion(bay.q);
      if (n.dot(c.sub(obPos)) < 0) {
        T_SWAP = t;
        break;
      }
    }
  }
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 40 });
  scene.add(dust.points);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the half book on the rail of floor 30, as s32 stands it
  const labels = await bookLabels(spineLabels());
  const desk = new BookShelf({ uniforms: U, layout: { books: [deskBook(PRINT0)], rows: [{ y: 3000 }], x0: -0.02, x1: 0.02 }, labels });
  desk.group.position.copy(DESK.pos);
  desk.group.quaternion.copy(QBOOK);
  desk.uniforms.uEnvCol.value.setRGB(0.08, 0.056, 0.032);
  scene.add(desk.group);

  const pos = V3();
  const look = V3();
  const body = V3();
  const h0 = V3();
  const h1 = V3();
  const vel = V3();
  const face = V3();
  const fp = V3();
  const bookW = V3();
  const nibW = V3();
  const TOP = at(SIDE, K, DESK.a - SPINE.d / 2, DESK.s, DESK.y);
  return {
    scene,
    camera,
    lib, // for shots/_d2_look.js
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      camAt(t, pos, look);
      setLens(camera, lensAt(t));
      aim(camera, pos, look);
      camera.updateMatrixWorld();
      lib.update(camera);
      U.uTime.value = t;

      heroAt(t, body);
      heroAt(t - 0.03, h0);
      heroAt(t + 0.03, h1);
      vel.subVectors(h1, h0).divideScalar(0.06);
      // it looks at its book, then down the void, then at the old one
      // the old book where it is now (the hand goes to it), and the tower's face beside the reader (it writes there)
      oldAt(t, REC, obPos, obQuat);
      bay.shelf.group.localToWorld(bookW.copy(obPos));
      bay.shelf.group.localToWorld(nibW.set(SPOT.x + 0.158, body.y - DUSTY.pos.y - 0.04, SPOT.z + 0.091));
      face.copy(TOP).setY(TOP.y + printAt(t) * SPINE.h).lerp(W(7.6, -3.0, 12), smoothstep(0.7, 1.2, t)).lerp(LECTERN, smoothstep(2.9, 3.5, t));
      face.lerp(nibW, smoothstep(T_RISE[0] - 0.2, T_RISE[0] + 0.1, t));
      const writing = smoothstep(T_RISE[0] - 0.1, T_RISE[0] + 0.15, t) * (1 - smoothstep(DUR - 0.15, DUR + 0.3, t));
      hero.set({
        time: 40 + t,
        pos: body.toArray(),
        face: face.toArray(),
        glow: 1,
        dive: smoothstep(1.5, 5, vel.length()),
        vel: vel.toArray(),
        reach: smoothstep(3.1, 3.35, t) * (1 - smoothstep(3.9, 4.2, t)),
        reachAt: bookW.toArray(),
        write: writing,
        writeAt: nibW.toArray(),
        stroke: (t * 5) % 1,
      });
      hero.update(camera);

      const p = printAt(t);
      desk.group.visible = p > 1e-3;
      desk.set(0, { print: Math.max(p, 1e-3) });
      desk.commit();
      desk.uniforms.uPrintCol.value.copy(STEEL).multiplyScalar(0.8 + 1.4 * smoothstep(T_DUST, T_DUST + 0.2, t));
      const key = hero.light();
      desk.key(key.pos, key.col, 0.08);
      desk.update();
      wall.light(0, key.pos, key.col, 0.08);
      // the old book: the shelf draws it shut until the hand-over, the open book after
      const handed = t >= T_SWAP;
      if (handed) bay.shelf.set(bay.index, { scale: 0 });
      else {
        recQ.copy(obQuat).multiply(Q_F);
        recP.set(0, -SAG, SPINE.h / 2).applyQuaternion(obQuat).add(obPos);
        bay.shelf.set(bay.index, { x: recP.x, y: recP.y, z: recP.z, q: recQ, scale: 1 });
      }
      bay.shelf.commit();
      old.group.visible = handed;
      old.group.position.copy(obPos);
      old.group.quaternion.copy(obQuat);
      old.set({ open: openAt(t) });
      // the tower, and its light on the wall, the bay and the book (three lights up its height)
      for (let j = 0; j < STOREYS; j++) tower.set(j, storeyAt(t, j, sto));
      tower.update();
      [1, 4, 7].forEach((j, i) => {
        const lv = (tower.state[j - 1].level + tower.state[j].level + tower.state[j + 1].level) / 3;
        wall.light(1 + i, tower.light(j, tl), tc.copy(STEEL).multiplyScalar(0.4 * lv), 0.35);
      });
      bay.shelf.update();

      // the motes
      const P = motes.pos;
      const C = motes.col;
      for (let i = 0; i < NL; i++) {
        const e = lightMote(LM[i], GL[i], t, mp);
        P[3 * i] = mp.x;
        P[3 * i + 1] = mp.y;
        P[3 * i + 2] = mp.z;
        C[3 * i] = STEEL.r * 0.9 * e;
        C[3 * i + 1] = STEEL.g * 0.9 * e;
        C[3 * i + 2] = STEEL.b * 0.9 * e;
        motes.size[i] = LM[i].s;
      }
      const tw = tower.state[0].level;
      for (let i = 0; i < ND; i++) {
        const e = dustMote(DM[i], t, mp);
        bay.shelf.group.localToWorld(mp);
        const o = NL + i;
        P[3 * o] = mp.x;
        P[3 * o + 1] = mp.y;
        P[3 * o + 2] = mp.z;
        C[3 * o] = (AMBER.r * 0.3 + STEEL.r * 0.3 * tw) * e;
        C[3 * o + 1] = (AMBER.g * 0.3 + STEEL.g * 0.3 * tw) * e;
        C[3 * o + 2] = (AMBER.b * 0.3 + STEEL.b * 0.3 * tw) * e;
        motes.size[o] = DM[i].s;
      }
      fp.copy(body);
      motes.update(camera, { focus: focusDistance(camera, fp), fstop: LENS31.fstop, width: ctx.width });
      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK31.dust.g;
      dust.update(camera, t, { focus: focusDistance(camera, fp), fstop: LENS31.fstop, width: ctx.width, intensity: LOOK31.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, fp), fstop: LENS31.fstop } };
    },
  };
}
