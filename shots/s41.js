// s41 — 2:51–2:55 (4104–4199, 96 frames, act 3). The ribbon: the receipt of adoption.
// A close-up on the old book lying open where s40 left it. The tower lifts off its pages and goes up out of the
// frame, the reader on it; the reader comes back down alone, its hand turning lime, and lays a lime ribbon in the
// book: down the gutter from the head and out over the tail, where it hangs with its one word, `adopted`. The book
// shuts on it and goes home to its place on the shelf, the ribbon trailing, the reader lighting its way; then the
// reader goes, up toward the lamp over this bay, and on the bar line the lamp, 27:0 (W(4.0, −4.6, 4.3); not 27:14,
// the one s43 breaks), turns lime: the first lime lamp of act three, and in s41 and s42 the only one. The lens ends
// close on the book at home, its title on the spine and the ribbon over the shelf's edge below it, as the light on
// them turns from amber to lime.
// W(a, s, y) = at(SIDE, K3, a, s, y) (s40's frame). The bay's frame (Bay's shelf space): x along the wall (+s),
// y up from board 2, z out toward the shaft; the open book's frame as d_book.js has it.
import * as THREE from 'three';
import { setLens, aim, focusDistance, path } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { LIB } from 'world/libshader.js';
import { Dust } from 'world/dust.js';
import { AgentBody, STEEL, LIME } from 'world/agentbody.js';
import { LOOK17 } from './s17.js';
import { K3, SIDE, DUSTY, SPINE, BEAT, at, dustyBook } from './s32.js';
import { labels33, LOOK33, LAMP27 } from './s33.js';
import { WallMaterial, Bay, shelfLights, oneLampUniforms, withOneLamp } from 'world/d_bay.js';
import { OneLamp, lampVar, lampPos } from 'world/d_lamps.js';
import { OpenBook } from 'world/d_book.js';
import { PageTower } from 'world/d_tower.js';
import { Ribbon } from 'world/d_ribbon.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export { BEAT };
// 2:51 is the second beat of a bar: the bar lines fall at 0.667 s and 3.333 s (the lamp: a warm bell)
const T_TOWER = [0.05, 1.3]; // the tower lifts off and goes up (out of the frame by about 0.6 s)
const T_COME = [0.3, 0.95]; // the reader comes back down, to the head of the book
const T_LIME = [0.5, BEAT]; // its hand turns lime, by the bar line
const T_LAY = [BEAT + 0.05, 1.22]; // the hand draws the ribbon down the gutter from the head …
const T_DROP = [1.22, 2 * BEAT]; // … over the tail and down, and lets it go on the beat
const T_SHUT = [1.5, 2.0]; // the book shuts on it
const T_HOME = [2.02, 3.08]; // and goes home to its place on the shelf
const T_ESC = [1.55, 2.1]; // the reader comes over to the lens's side of the book as it shuts, to light it home
const T_GO = [3.1, 3.5]; // and when it is in, goes: up and away, toward the lamp
const T_LAMP = 5 * BEAT; // 27:0 turns lime, on the bar line
export const CUES = { cut: 0, ribbon: 2 * BEAT, lamp: T_LAMP };

const V3 = (...a) => new THREE.Vector3(...a);
export const W = (a, s, y) => at(SIDE, K3, a, s, y);
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

// ---------------------------------------------------------------------------------- the lamp
// 27:0 as the library lights it (amber, its own lampVar) until the bell; then lime, a little brighter than the
// floor's amber lamps (the floor's lamp level × 1.3), and the s33 pool on the bay (LAMP27's key, LOOK33.key) in lime
export const LAMP_J = 0;
export const LAMP_AMBER = lampVar(K3, LAMP_J); // 0.90
export const LIME_LEVEL = LOOK17.lamp * 1.3;
// …but it spends its light on the bay (the pool): what it throws about on the walls is about two fifths of an
// amber lamp's, so the wall between it and the bay stays dark (s42 runs card 7 over that band)
export const LIME_SPILL = 0.3;
// 0 amber … 1 lime: a quick swell (0.3 s) from just before the bar line, then held
export const limeAt = (t) => smoothstep(T_LAMP - 0.04, T_LAMP + 0.26, t);

// The scene s41 and s42 share: floor 27 and its neighbours, the bay as s40 has it (E1's books on the library's
// boards, lit as s33 lights it and by the shot's lights), and lamp 27:0 on its own: its amber taken out of every
// shader that reads the library's lamps (withOneLamp) and given back as OneLamp's globe and haze plus a light of
// the shot's (slot 2) once it turns lime. setLamp(x): 0 amber … 1 lime.
export async function bayScene(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 900);
  const lib = new Library({ floors: [K3 - 2, K3 + 2], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamI.value = 0;
  const one = oneLampUniforms();
  one.uOneKJ.value.set(K3, LAMP_J);
  one.uOneAmber.value = LAMP_AMBER;
  const wall = new WallMaterial(lib, { one }).attach(lib);
  const lampM = withOneLamp(lib.lampMaterial, one);
  for (const L of lib.lods) L.lamps.material = lampM;
  lib.glows.material = withOneLamp(lib.glowMaterial, one);
  const bay = await Bay.create({ uniforms: U, place: DUSTY, side: SIDE, book: dustyBook(), labels: labels33(), material: wall.material });
  wall.hole(...bay.holeArgs);
  shelfLights(bay.shelf, wall);
  bay.shelf.mesh.material = withOneLamp(bay.shelf.material, one);
  bay.shelf.uniforms.uBackLit.value = 1;
  bay.shelf.uniforms.uEnvCol.value.fromArray(LOOK33.env);
  scene.add(bay.group);
  const lamp = new OneLamp(lib, { k: K3, j: LAMP_J });
  scene.add(lamp.group);
  const LP = lampPos(K3, LAMP_J);
  const amberKey = U.uLampCol.value.clone().multiplyScalar(LOOK33.key);
  const limeKey = U.uLampLime.value.clone().multiplyScalar(0.95 * LOOK33.key); // about as bright as the amber pool (luminance × 1.15)
  const kc = new THREE.Color();
  const lc = new THREE.Color();
  const setLamp = (x) => {
    one.uOneAmber.value = LAMP_AMBER * (1 - x);
    lamp.set(U.uLampLime.value, LIME_LEVEL * x, 1);
    wall.light(2, LP, lc.copy(U.uLampLime.value).multiplyScalar(U.uLampI.value * LIME_LEVEL * LIME_SPILL * x), Math.sqrt(0.3));
    bay.shelf.key(LAMP27, kc.copy(amberKey).lerp(limeKey, x), LIB.LAMP_R);
  };
  setLamp(0);
  bay.shelf.beam(DUSTY.pos.clone().add(V3(0, 0.21, 0)), ...LOOK33.pool); // (after the key is placed)
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 41 });
  dust.points.material = withOneLamp(dust.points.material, one);
  scene.add(dust.points);
  const rec0 = bay.shelf.books[bay.index];
  return { scene, camera, lib, U, wall, bay, one, lamp, LP, setLamp, dust, REC: V3(rec0.x, rec0.y, rec0.z), withOne: (m) => withOneLamp(m, one) };
}

// ---------------------------------------------------------------------------------- the old book
// Open at SPOT (s40's lectern) until it shuts; then home: up and back over its place, turning back over (the
// half turn of s40 undone), in tipped at the foot, and upright. Its frame (as d_book.js's) in the bay's frame.
const LECTERN = W(1.0, -3.0, 1.45);
export const SPOT = V3(0, LECTERN.y - DUSTY.pos.y, 1.0 - DUSTY.a);
const SAG = 0.12 * SPINE.w;
const TIP = 0.36;
const Q_F = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
const XA = V3(1, 0, 0);
const ZA = V3(0, 0, 1);
const _q = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _p = V3();
export const shutAt = (t) => 1 - smoothstep(T_SHUT[0], T_SHUT[1], t);
// the open book's frame at t (pos, quat: bay frame); rec: the record's origin in its place
export function bookAt(t, rec, pos, quat) {
  const u = run(t, T_HOME[0], T_HOME[1], 0.32, 0.36);
  if (u <= 0) {
    quat.identity();
    return pos.copy(SPOT);
  }
  // tipped on the front edge of its foot as it comes in, upright as it lands
  const th = TIP * (1 - smoothstep(T_HOME[1] - 0.24, T_HOME[1], t));
  _q.setFromAxisAngle(XA, th);
  const PS = _p.set(0, SPINE.h / 2, -SAG).applyQuaternion(_q).add(rec);
  const P1 = V3(SPOT.x, SPOT.y + 0.05, SPOT.z - 0.5);
  const P2 = V3(rec.x, rec.y + SPINE.h / 2 + 0.05, rec.z + 0.42);
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
  pos.set(0, 0, 0).addScaledVector(SPOT, a).addScaledVector(P1, b).addScaledVector(P2, c).addScaledVector(PS, d);
  // turning over (to Q_F, tipped): the spine comes up to face out while the book turns about the way out, so that
  // half way round it lies flat, its title the right way up, and its boards are never square to the lens
  const s = smoothstep(T_HOME[0] + 0.06, T_HOME[1] - 0.3, t);
  quat.setFromAxisAngle(XA, th * s);
  quat.multiply(_qt.setFromAxisAngle(ZA, -Math.PI * s)).multiply(_qt.setFromAxisAngle(XA, (-Math.PI / 2) * s));
  return pos;
}
// the record (bookshelf.js) for the open book's frame: its origin and rotation
export function recordOf(pos, quat, outP, outQ) {
  outQ.copy(quat).multiply(Q_F);
  return outP.set(0, -SAG, SPINE.h / 2).applyQuaternion(quat).add(pos);
}

// ---------------------------------------------------------------------------------- the reader
// At the tower's top as s40 left it (W(1.42, −2.52, 4.80)); it lets the tower go and comes down to the head of the
// book, beyond it from the lens; it lays the ribbon with its hand. As the book shuts it rises over it to the lens's
// side and goes home with it, above it and nearer the lens (out of the frame's top all the way), its light on the
// face of the book the lens sees; when the book is in, it goes up and away toward the lamp.
const PEAK = W(1.42, -2.52, 4.8);
const AT_BOOK = W(0.46, -2.74, 1.8);
const ESCORT = V3(0, 0.4, 0.45); // from the book's frame origin, in the bay's frame
const AWAY = W(1.1, -3.6, 3.7); // up, out and toward 27:0
const REC_ABOUT = V3(0, 0, -0.06); // (the record's origin near enough, for tools without the bay)
const bayW = (v) => W(DUSTY.a + v.z, DUSTY.s + v.x, DUSTY.y + v.y);
const _hp = V3();
const _hq = new THREE.Quaternion();
export function heroAt(t, out = V3(), rec = REC_ABOUT) {
  out.copy(PEAK).lerp(AT_BOOK, run(t, T_COME[0] - 0.15, T_COME[1], 0.25, 0.4));
  bookAt(t + 0.08, rec, _hp, _hq);
  out.lerp(bayW(_hp.add(ESCORT)), run(t, T_ESC[0], T_ESC[1], 0.4, 0.4));
  return out.lerp(AWAY, run(t, T_GO[0], T_GO[1] + 0.5, 0.35, 0.2));
}

// ---------------------------------------------------------------------------------- the ribbon
// 0.65 m of it: fixed under the head of the book, down the gutter (0.41 m), round the tail edge of the pages and
// out, 0.24 m free. Laid by the hand from the head (drawn out of it, so to speak); swaying a little once let go;
// while the book flies home its free end hangs from the tail like a pendulum, leaning against the book's
// acceleration (gravity less what the tail does, a little late); at home it lies on the board from under the
// book's foot, over the board's rounded front edge and down, the word on the hanging part, facing out.
export const RIB_L = 0.65;
export const RIB_M = 131; // points, 5 mm apart
export const RIB_W = 0.018;
// the word's strip of type (as long as the canvas is to its width, so the type is not stretched): the word in its
// middle, 5–11 cm from the tip
export const RIB_TEXT = [RIB_L - 0.135, RIB_L - 0.02];
const PH = SPINE.h - 2 * 0.003; // the page block's height (d_book.js: h less the squares)
const YG = -0.0042; // the ribbon across the gutter, its edges (±9 mm) just over the pages (they dip to −0.009 at the fold)
const S1 = PH - 0.004; // gutter: from 4 mm under the head to the tail edge
const RB = 0.006; // round the tail edge
const S2 = S1 + (Math.PI / 2) * RB;
const G = V3(0, -9.81, 0);
// the ribbon laid in the open book (its frame): the point and printed side's normal at s along it
export function restO(s, P, N) {
  if (s <= S1) {
    N.set(0, 1, 0);
    return P.set(0, YG, -PH / 2 + 0.004 + s);
  }
  if (s <= S2) {
    const f = (s - S1) / RB;
    N.set(0, Math.cos(f), Math.sin(f));
    return P.set(0, YG - RB + RB * Math.cos(f), PH / 2 + RB * Math.sin(f));
  }
  N.set(0, 0, 1);
  return P.set(0, YG - RB - (s - S2), PH / 2 + RB);
}
// how much of it is laid: down the gutter, then over the tail and down, let go on the beat
export const laidAt = (t) =>
  t < T_DROP[0] ? S1 * smoothstep(T_LAY[0], T_LAY[1], t) : S1 + (RIB_L - S1) * smoothstep(T_DROP[0], T_DROP[1], t);
// on the board, in the bay's frame: s from z0, where it comes out under the foot (x: the book's)
const Z_EDGE = 0.04 - DUSTY.a; // the board's front (the library's boards stand to a = +0.04)
const RE = 0.0055;
const Z_UNDER = 0.0252 - SAG; // z0 behind the exit (at home: the record's z less 2.1 cm)
export function drapeB(s, x, z0, P, N) {
  const l1 = Math.max(0, Z_EDGE - 0.004 - z0);
  const l2 = (Math.PI / 2) * RE;
  if (s <= l1) {
    N.set(0, 1, 0);
    return P.set(x, 0.0015, z0 + s);
  }
  if (s <= l1 + l2) {
    const f = (s - l1) / RE;
    N.set(0, Math.cos(f), Math.sin(f));
    return P.set(x, 0.0015 - RE + RE * Math.cos(f), Z_EDGE - 0.004 + RE * Math.sin(f));
  }
  const y = -RE + 0.0015 - (s - l1 - l2);
  N.set(0, 0, 1);
  return P.set(x, y, Z_EDGE - 0.004 + RE + 0.03 * Math.max(0, -0.035 - y));
}
const E_O = V3(0, YG, PH / 2 + 0.002); // where it leaves the shut book, at the tail by the spine (book's frame)
const _bp = V3();
const _bq = new THREE.Quaternion();
const _pv = V3();
const _pn = V3();
const _d = V3();
const _t0 = V3();
const _x = V3();
const _c = [V3(), V3(), V3(), V3()];
const _ex = [V3(), V3(), V3()];
// the exit at t (world)
function exitAt(t, env, out) {
  bookAt(t, env.rec, _bp, _bq);
  return env.toW(out.copy(E_O).applyQuaternion(_bq).add(_bp));
}
// What the exit's acceleration does to the free end, answered as a damped pendulum answers it (0.8 s to swing, a
// fifth past and back, still within about a second): it lags, swings through and settles. The kernel's second
// difference: weights on the exit's places at t − j/120 s.
const SW_H = 1 / 120;
const SW_N = 150;
const SW_D = (() => {
  const w = 7.5;
  const z = 0.45;
  const wd = w * Math.sqrt(1 - z * z);
  const k = Array.from({ length: SW_N + 2 }, (_, j) =>
    j < SW_N ? Math.exp(-z * w * j * SW_H) * Math.sin(wd * j * SW_H) * (1 - smoothstep(0.8 * SW_N, SW_N, j)) : 0,
  );
  const sum = k.reduce((a, b) => a + b, 0) * SW_H * SW_H;
  return k.map((v, j) => ((j > 0 ? k[j - 1] : 0) - 2 * v + (j + 1 < k.length ? k[j + 1] : 0)) / sum);
})();
const _sa = V3();
// the exit's acceleration at t as the pendulum answers it (bay frame)
function swingAt(t, rec, out) {
  out.set(0, 0, 0);
  for (let j = 0; j < SW_D.length; j++) {
    bookAt(t - j * SW_H, rec, _bp, _bq);
    out.addScaledVector(_sa.copy(E_O).applyQuaternion(_bq).add(_bp), SW_D[j]);
  }
  return out;
}
// the whole ribbon at t (world): P, N arrays of RIB_M Vector3; env: { toW(v) bay → world in place, q: the bay's
// rotation, rec }
export function ribbonAt(t, env, P, N) {
  const ds = RIB_L / (RIB_M - 1);
  if (t < T_HOME[0]) {
    const lam = laidAt(t);
    const dt = t - T_DROP[1];
    const sway = dt > 0 ? 0.2 * Math.exp(-dt / 0.4) * Math.sin(2 * Math.PI * 1.4 * dt) : 0;
    restO(S2, _pv, _pn);
    const cs = Math.cos(sway);
    const sn = Math.sin(sway);
    for (let i = 0; i < RIB_M; i++) {
      const s = Math.min(i * ds, lam);
      restO(s, P[i], N[i]);
      if (s > S2 && sway !== 0) {
        // swung about the tail edge (the book's x axis)
        const y = P[i].y - _pv.y;
        const z = P[i].z - _pv.z;
        P[i].set(P[i].x, _pv.y + cs * y - sn * z, _pv.z + sn * y + cs * z);
        N[i].set(0, -sn, cs);
      }
      env.toW(P[i].add(SPOT));
      N[i].applyQuaternion(env.q);
    }
    return;
  }
  // flying home: the free end a pendulum from the exit, leaning against what the exit does
  _d.copy(G).addScaledVector(swingAt(t, env.rec, _ex[0]).applyQuaternion(env.q), -0.9).normalize();
  const E = exitAt(t, env, _c[0]);
  bookAt(t, env.rec, _bp, _bq);
  _t0.set(0, 0, 1).applyQuaternion(_bq).applyQuaternion(env.q); // out of the tail
  _x.set(-1, 0, 0).applyQuaternion(_bq).applyQuaternion(env.q); // across it, printed side's right hand
  const LF = RIB_L - S1;
  // the board is in its way: it cannot swing in past the board's front, and it is caught on the front edge as the
  // foot comes in over it. From then on it lies on the board from under the foot, over the edge and down, drawn
  // up over the edge as the book slides home
  const eb = _ex[1].copy(E_O).applyQuaternion(_bq).add(_bp); // the exit, in the bay's frame
  const zb = _ex[2].set(0, 0, 1).applyQuaternion(env.q);
  const lean = _d.dot(zb);
  const least = -Math.max(0, eb.z - Z_EDGE - 0.005) / LF;
  if (lean < least) _d.addScaledVector(zb, least - lean).normalize();
  _c[1].copy(E).addScaledVector(_t0, 0.025);
  _c[2].copy(_c[1]).addScaledVector(_d, 0.45 * LF);
  _c[3].copy(E).addScaledVector(_t0, 0.02).addScaledVector(_d, LF - 0.03);
  const home = smoothstep(Z_EDGE + 0.015, Z_EDGE - 0.01, eb.z);
  const z0 = eb.z - Z_UNDER;
  // what hangs under the edge still swings across (about the edge), as the pendulum did, and comes to rest
  const across = _d.dot(_ex[0].set(1, 0, 0).applyQuaternion(env.q)) * (1 - smoothstep(T_HOME[1] + 0.1, T_HOME[1] + 0.7, t));
  const hyp = Math.hypot(across, _d.y) || 1;
  const sw = across / hyp;
  const cw = -_d.y / hyp;
  for (let i = 0; i < RIB_M; i++) {
    const s = i * ds;
    if (s <= S1) {
      P[i].copy(E);
      N[i].copy(_t0);
      continue;
    }
    const u = (s - S1) / LF;
    const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    P[i].set(0, 0, 0).addScaledVector(_c[0], a).addScaledVector(_c[1], b).addScaledVector(_c[2], c).addScaledVector(_c[3], d);
    // the tangent, and the printed side square to it and to the book's across
    const da = -3 * (1 - u) ** 2, db = 3 * (1 - u) ** 2 - 6 * u * (1 - u), dc = 6 * u * (1 - u) - 3 * u * u, dd = 3 * u * u;
    _pv.set(0, 0, 0).addScaledVector(_c[0], da).addScaledVector(_c[1], db).addScaledVector(_c[2], dc).addScaledVector(_c[3], dd).normalize();
    N[i].crossVectors(_x, _pv).normalize();
    if (home > 0) {
      drapeB(s - S1, eb.x, z0, _pv, _pn);
      const hy = -RE - _pv.y;
      if (hy > 0) _pv.set(_pv.x + hy * sw, -RE - hy * cw, _pv.z);
      env.toW(_pv);
      P[i].lerp(_pv, home);
      N[i].lerp(_pn.applyQuaternion(env.q), home).normalize();
    }
  }
}

// ---------------------------------------------------------------------------------- the lens
// Close on the open book from the tail side, above it (40 mm, f/2.8); down after the hand as it lays the ribbon
// over the tail, to the hanging end and its word while the book shuts above it; then, as the book goes home, back
// and round to stand square to its place, 1.5 m off (45 mm): the title on the spine, the ribbon below it.
const CAM_A0 = W(1.72, -2.84, 2.02);
const CAM_A1 = W(1.7, -2.85, 2.0);
const LOOK_A = W(1.02, -3.0, 1.42);
const CAM_D = W(1.86, -2.9, 1.56);
const LOOK_D = W(1.2, -3.0, 1.37);
const CAM_B = W(1.9, -2.93, 1.92);
const LOOK_B = W(0.0, -3.0, 1.88);
export const FSTOP = 2.8;
const T_DOWN = [1.2, 1.7];
export const lensAt = (t) => lerp(40, 55, smoothstep(T_HOME[0], T_HOME[1] + 0.1, t));
export const moveAt = (t) => run(t, T_HOME[0] - 0.05, T_HOME[1] + 0.2, 0.3, 0.55);
export const downAt = (t) => run(t, T_DOWN[0], T_DOWN[1], 0.2, 0.25);
// book: the book's middle (world) at t, which the lens follows as it flies
export function camAt(t, book, pos = V3(), look = V3()) {
  const dn = downAt(t);
  const m = moveAt(t);
  pos.copy(CAM_A0).lerp(CAM_A1, smoothstep(0, 1.2, t)).lerp(CAM_D, dn).lerp(CAM_B, m);
  const f = smoothstep(T_HOME[0], T_HOME[0] + 0.3, t) * (1 - smoothstep(T_HOME[1] - 0.25, T_HOME[1] + 0.25, t));
  look.copy(LOOK_A).lerp(LOOK_D, dn).lerp(LOOK_B, m).lerp(book, 0.6 * f);
  return { pos, look };
}

export async function setup(ctx) {
  const env = await bayScene(ctx);
  const { scene, camera, lib, U, wall, bay, dust, REC } = env;
  const toW = (v) => bay.shelf.group.localToWorld(v);
  bay.group.updateMatrixWorld(true);
  const renv = { toW, q: bay.q, rec: REC };
  // the old book, open where s40 left it; its record hidden until it is handed back
  const old = await OpenBook.create({ uniforms: U, wall, dims: { w: SPINE.w, h: SPINE.h, d: SPINE.d }, cloth: SPINE.col, name: 'heygen-com/hyperframes', folio: 57, sag: SAG });
  const om = env.withOne(old.material);
  for (const m of [old.right, old.left, old.spine]) m.material = om;
  bay.shelf.group.add(old.group);
  // the tower, whole, as s40 left it
  const tower = await PageTower.create({ uniforms: U, storeys: 9, radius: 0.21, height: 0.4 });
  for (let j = 0; j < 9; j++) tower.set(j, { rise: 1, swing: 0, level: 1, typed: 1 });
  bay.shelf.group.add(tower.group);
  // the reader
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the ribbon
  const rib = await Ribbon.create({ uniforms: U, wall, shelf: bay.shelf, length: RIB_L, points: RIB_M, width: RIB_W, text: RIB_TEXT, flip: true });
  rib.mesh.material = env.withOne(rib.material);
  scene.add(rib.mesh);
  const P = Array.from({ length: RIB_M }, () => V3());
  const N = Array.from({ length: RIB_M }, () => V3());

  const obPos = V3();
  const obQuat = new THREE.Quaternion();
  const recP = V3();
  const recQ = new THREE.Quaternion();
  const mid = V3();
  const pos = V3();
  const look = V3();
  const body = V3();
  const h0 = V3();
  const h1 = V3();
  const vel = V3();
  const hand = V3();
  const hn = V3();
  const fp = V3();
  const tl = V3();
  const tc = new THREE.Color();
  const T_HAND = T_HOME[0] + 0.22; // the record takes the book back, as its spine comes round into the lens's sight
  return {
    scene,
    camera,
    lib,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      // the book, and where its middle is (the lens follows it home)
      bookAt(t, REC, obPos, obQuat);
      const open = shutAt(t);
      mid.set(0, (SPINE.d / 2) * (1 - open), 0).applyQuaternion(obQuat).add(obPos);
      toW(mid);
      camAt(t, mid, pos, look);
      setLens(camera, lensAt(t));
      aim(camera, pos, look);
      camera.updateMatrixWorld();
      lib.update(camera);
      U.uTime.value = 41 + t;

      // the record has no foot and no fore-edge (a shelf never shows them): the old book's leaves stay inside it
      // until it stands in its place
      const handed = t >= T_HAND;
      old.group.visible = t < T_HOME[1];
      old.spine.visible = !handed;
      old.uniforms.uLeaves.value = handed ? 1 : 0;
      old.group.position.copy(obPos);
      old.group.quaternion.copy(obQuat);
      old.set({ open });
      if (handed) {
        recordOf(obPos, obQuat, recP, recQ);
        bay.shelf.set(bay.index, { x: recP.x, y: recP.y, z: recP.z, q: recQ, scale: 1 });
      } else bay.shelf.set(bay.index, { scale: 0 });
      bay.shelf.commit();

      // the tower goes up, its light with it
      const lift = 3 * Math.max(t - T_TOWER[0], 0) ** 2;
      tower.group.position.set(SPOT.x, SPOT.y + 0.003 + lift, SPOT.z);
      tower.group.updateMatrixWorld(true);
      tower.update();
      const tf = 1 - smoothstep(0.6, T_TOWER[1], t);
      wall.light(3, tower.light(1, tl), tc.copy(STEEL).multiplyScalar(0.4 * tf), 0.35);

      // the reader, its hand at the ribbon's end while it lays it
      heroAt(t, body, REC);
      heroAt(t - 0.03, h0, REC);
      heroAt(t + 0.03, h1, REC);
      vel.subVectors(h1, h0).divideScalar(0.06);
      restO(laidAt(t), hand, hn);
      hand.addScaledVector(hn, 0.012).add(SPOT);
      toW(hand);
      const reach = smoothstep(T_COME[1] - 0.3, T_COME[1], t) * (1 - smoothstep(T_DROP[1] + 0.05, T_DROP[1] + 0.4, t));
      const lime = smoothstep(T_LIME[0], T_LIME[1], t) * (1 - smoothstep(T_SHUT[0], T_SHUT[1], t));
      hero.set({ time: 46 + t, pos: body.toArray(), face: (reach > 0.05 ? hand : mid).toArray(), glow: 1, dive: smoothstep(1.5, 5, vel.length()), vel: vel.toArray(), reach, reachAt: hand.toArray(), ribbon: lime });
      hero.update(camera);
      const key = hero.light();
      wall.light(0, key.pos, key.col, 0.08);
      wall.light(1, hero.anchor('hand', tl), tc.copy(LIME).multiplyScalar(0.012 * lime * reach), 0.05);

      // the lamp
      const x = limeAt(t);
      env.setLamp(x);
      bay.shelf.update();

      // the ribbon
      ribbonAt(t, renv, P, N);
      rib.lay(P, N);

      // the air: lit by the reader, then by the lamp
      fp.copy(mid).lerp(P[RIB_M - 17], Math.max(downAt(t), moveAt(t))); // the gutter, then the word
      dust.uniforms.uKeyPos.value.copy(key.pos).lerp(env.LP, smoothstep(T_GO[0], T_LAMP, t));
      dust.uniforms.uKeyCol.value.copy(key.col).multiplyScalar(1 - smoothstep(T_GO[0], T_GO[1], t)).add(tc.copy(U.uLampLime.value).multiplyScalar(0.4 * x));
      dust.uniforms.uG.value = 0.55;
      dust.update(camera, t, { focus: focusDistance(camera, fp), fstop: FSTOP, width: ctx.width, intensity: 100 });
    },
    post() {
      return { dof: { focus: focusDistance(camera, fp), fstop: FSTOP } };
    },
  };
}
