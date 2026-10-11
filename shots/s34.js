// s34 — 2:19–2:23 (3336–3431, 96 frames, act 3). The reader writes on, and it is getting harder.
// A hard cut from the old book three floors down (s33) back up to floor K, close on the reader, from below it and
// out over the shaft. The seventh line of the film's own render code ('await ffDone;'), typed while we were away,
// is going down into the book as the shot opens and lands on beat 28; the eighth and last ('await browser.close();')
// comes a tap at a time, the taps further apart and heavier, is pressed home in two heaves and lands on beat 32
// (CUES.glyphs), as card 6 goes. The book ends printed 8/12 (PRINT_END; s40 begins from that). The reader dims a
// little as it goes, sags at each press and does not quite come back up; its hand goes back to the nib and hangs
// there, with nothing left to write.
// Card 6 (local 0.25–3.83 s) is set in the middle of the frame: the reader stays above 0.40 H, its line and its
// book below 0.60 H; between them the dark of the gallery and only the hand's dotted tether.
// W(a, s, y) = at(SIDE, K, a, s, y) (s32): a out from the book plane toward the shaft, s along side 0, y above
// floor K.
// First frame: lens W(8.027, -3.653, 0.559) → W(6.67, -2.90, 1.64), 35 mm f/4, looking up about 35° from under the
//   rail and out over the shaft; the reader at W(6.80, -3.00, 1.90) (0.28 m higher than in s32 and s33), steel,
//   glow 0.95, its clock at 24 s, the only key on its book and the dust; the book 6/12, the seventh line just going
//   down. The library as in s32: s17's lamps (none in frame), no sheet, black fog 0.009, no ambient.
// Last frame (t 3.958): lens W(7.875, -3.568, 0.680) → the same point, 35 mm f/4 (an even 6% push in, all the
//   shot); the reader at W(6.80, -3.00, 1.874) (sagged 2.6 cm), glow 0.87, its clock at 27.47 s and running at 3/4
//   speed, its hand back at the nib W(6.39, -3.00, 1.513), still (stroke 0); the book 8/12 (PRINT_END), its print
//   line still a little bright from the eighth's knock. Card 6 is gone (3.83 s). heroAt, clockAt, glowAt, printAt
//   and topAt run on past the end, for s35.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, STEEL } from 'world/agentbody.js';
import { BookShelf, bookLabels } from 'world/bookshelf.js';
import { CodeGlyphs, CODE } from 'world/e1_glyphs.js';
import { LOOK17 } from './s17.js';
import { LOOK31, LENS as LENS31 } from './s31.js';
import { at, K, SIDE, QBOOK, DESK, SPINE, STEP, deskBook, spineLabels, printAt as print32 } from './s32.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export const BEAT = 2 / 3; // 90 BPM
const GRID0 = -18; // the beat grid's origin (global 121 s, s31's cut) in this shot's time: t 0 is beat 27, a bar
export const beatOf = (t) => (t - GRID0) / BEAT;
const onBeat = (b) => GRID0 + b * BEAT;
// the seventh line lands on beat 28 and the eighth on beat 32, four beats apart (s32's came every two)
const LAND = [onBeat(28), onBeat(32)];
export const CUES = { cut: 0, glyphs: LAND.map((t) => +t.toFixed(3)) };
export const PRINT_END = 8; // lines printed (of 12) as the shot ends: s40 prints the book 8/12
const W = (a, s, y) => at(SIDE, K, a, s, y);
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------- the look
// dy: the reader floats this much higher over its book than in s32 (W(6.80, -3.00, 1.62)), writing at arm's
// length, so that from below the band between it and its line is clear (and its hand's tether is longer).
// The lens: from p0 (looking at l0) at t 0 to p1 (l1) at the end, in a straight, even push.
export const LOOK34 = {
  dy: 0.28,
  cam: { p0: [8.027, -3.653, 0.559], l0: [6.67, -2.9, 1.64], p1: [7.873, -3.567, 0.681], l1: [6.67, -2.9, 1.64], mm: [35, 35] },
  fstop: LENS31.fstop,
};
export function camAt(t, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  const c = LOOK34.cam;
  const e = clamp(t / DUR);
  pos.copy(W(...c.p0)).lerp(W(...c.p1), e);
  look.copy(W(...c.l0)).lerp(W(...c.l1), e);
  return { pos, look };
}
export const lensAt = (t) => lerp(LOOK34.cam.mm[0], LOOK34.cam.mm[1], clamp(t / DUR));

// ---------------------------------------------------------------------------------- the writing
// As in s32: a line is typed at the nib, then pressed down onto the book, and lands: the print rises one STEP.
// The seventh was typed while we were three floors down and is pressed as s32 pressed, only slower; the eighth,
// the last line of CODE, is typed a tap at a time, each tap bringing two or three glyphs and coming later than the
// one before, and is pressed home in two heaves.
// taps: [time, glyphs it types]; n0: glyphs typed at t 0; t1: the press begins; land: it lands (CUES.glyphs);
// press: its curve; dip: how far the reader leans into it (m; s32 0.035); sag: how much of that it keeps after;
// back: s for the hand to go back up to the nib after it lands (s32 0.2).
const PRINT0 = 6; // lines printed at t 0: s32's five and the sixth (landed in s33)
const push = (u) => u * u * (2 - u); // s32's: slow to start, then hard into the book
// two heaves: most of the way, a hold, then hard into the book
const heave = (u) => 0.6 * smoothstep(0, 0.42, u) + 0.4 * (u > 0.58 ? push((u - 0.58) / 0.42) : 0);
export const LINES = [
  { k: 6, n0: CODE[6].length, taps: [], t1: -0.1, land: LAND[0], press: push, dip: 0.03, sag: 0.15, back: 0.3 },
  {
    k: 7, n0: 0,
    taps: [[1.04, 3], [1.16, 3], [1.29, 3], [1.44, 3], [1.6, 2], [1.77, 2], [1.95, 2], [2.14, 2], [2.34, 2]],
    t1: 2.43, land: LAND[1], press: heave, dip: 0.04, sag: 0.4, back: 0.45,
  },
];
const NIB_UP = 0.14; // as s32
const LEAD = 1.5; // the typed line ends this many glyphs left of the nib (s32)
const EM = 0.026; // glyph size (m) as typed (s32)
export const printAt = (t) => STEP * LINES.reduce((p, L) => p + smoothstep(L.land, L.land + 0.1, t), PRINT0);
const pressAt = (L, t) => L.press(clamp((t - L.t1) / (L.land - L.t1)));
// the glyphs typed by t: each tap brings its two or three in a quick run
export const shown = (L, t) => Math.min(CODE[L.k].length, L.taps.reduce((n, [tau, g]) => n + g * smoothstep(tau - 0.02, tau + 0.01 + 0.03 * g, t), L.n0));
// the hand on each tap: down toward the page as the glyphs come and back up, further and slower each time
function strokeAt(L, t) {
  let st = 0;
  L.taps.forEach(([tau], i) => {
    const f = i / Math.max(L.taps.length - 1, 1);
    st = Math.max(st, lerp(0.11, 0.15, f) * (1 - smoothstep(0, lerp(0.07, 0.11, f), Math.abs(t - tau))));
  });
  return st;
}
// the middle of the top of the reader's book (its print front) at t
export const topAt = (t, out = new THREE.Vector3()) => out.copy(W(DESK.a - SPINE.d / 2, DESK.s, DESK.y + Math.max(printAt(t) * (SPINE.h + 0.02) - 0.01, 0)));

// ---------------------------------------------------------------------------------- the reader
// s32's clock runs on (s32 runs it 12–20 s, s33 on to 24); the reader's own clock slows to three quarters by the end
export const clockAt = (t) => {
  const u = clamp(t / DUR);
  return 24 + t - DUR * 0.25 * (u * u * u - (u * u * u * u) / 2);
};
export const glowAt = (t) => 0.95 - 0.08 * smoothstep(0, DUR, t);
export function heroAt(t, out = new THREE.Vector3()) {
  out.copy(W(6.8, -3.0, 1.62 + LOOK34.dy));
  for (const L of LINES) {
    // it leans into each press, and comes back up a little less each time
    if (t >= L.t1 && t < L.land) out.y -= L.dip * pressAt(L, t);
    else if (t >= L.land) out.y -= L.dip * (L.sag + (1 - L.sag) * Math.exp(-(t - L.land) / 0.4));
    // and nods into each tap
    for (const [tau] of L.taps) out.y -= 0.006 * Math.exp(-(((t - tau) / 0.08) ** 2));
  }
  return out;
}

// got / want: the landings measured off the print (where each step is half done), each on a beat; the book 6/12
// at t 0 as s32 left it (at its 12 s, where s33 ends) and PRINT_END/12 at the end
export function checkCues() {
  const got = [];
  let prev = printAt(0);
  for (let f = 1; f <= DUR * 240; f++) {
    const t = f / 240;
    const p = printAt(t);
    const k = Math.round(prev / STEP);
    if (p >= (k + 0.5) * STEP && prev < (k + 0.5) * STEP) got.push(+(t - 0.05).toFixed(3));
    prev = p;
  }
  const bad = [];
  if (got.length !== CUES.glyphs.length || got.some((g, i) => Math.abs(g - CUES.glyphs[i]) > 0.01)) bad.push(`glyphs got ${got} want ${CUES.glyphs}`);
  for (const g of CUES.glyphs) if (Math.abs(beatOf(g) - Math.round(beatOf(g))) > 0.002) bad.push(`glyph ${g} is not on a beat (${beatOf(g).toFixed(3)})`);
  const print = [printAt(0) / STEP, printAt(DUR - 1 / 24) / STEP];
  if (Math.abs(printAt(0) - print32(12)) > 1e-9) bad.push(`print at t 0 ${print[0]}/12, s32 left it ${print32(12) / STEP}/12`);
  if (Math.abs(print[1] - PRINT_END) > 1e-9) bad.push(`print at the end ${print[1]}/12, want ${PRINT_END}/12`);
  return { got: { cut: 0, glyphs: got }, want: CUES, print, bad };
}

export async function setup(ctx) {
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s34] CUES off: ${cc.bad.join('; ')}`);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K - 8, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamI.value = 0; // no sheet: s31's school is long gone down the shaft
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 31 });
  scene.add(dust.points);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the book on the rail, as in s32
  const shelf = new BookShelf({ uniforms: U, layout: { books: [deskBook(printAt(0))], rows: [{ y: 3000 }], x0: -0.02, x1: 0.02 }, labels: await bookLabels(spineLabels()) });
  shelf.group.position.copy(DESK.pos);
  shelf.group.quaternion.copy(QBOOK);
  shelf.uniforms.uEnvCol.value.setRGB(0.08, 0.056, 0.032);
  scene.add(shelf.group);
  const glyphs = await CodeGlyphs.create({ lines: CODE, uniforms: U, height: ctx.height });
  scene.add(glyphs.group);

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const body = new THREE.Vector3();
  const top = new THREE.Vector3();
  const nib = new THREE.Vector3();
  const R = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const wr = new THREE.Vector3();
  const fp = new THREE.Vector3(); // in focus: between the reader and its nib
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      camAt(t, pos, look);
      setLens(camera, lensAt(t));
      aim(camera, pos, look);
      camera.updateMatrixWorld();
      lib.update(camera);
      U.uTime.value = 18 + t;

      topAt(t, top);
      nib.copy(top).addScaledVector(UP, NIB_UP);
      R.setFromMatrixColumn(camera.matrixWorld, 0);
      // the hand writes at the nib, rides the right end of the line down onto the book, and goes back up (s32)
      let writeAt = nib;
      let stroke = 0;
      for (const L of LINES) {
        const N = CODE[L.k].length;
        const emEnd = Math.min(EM, 0.24 / (N * glyphs.adv));
        if (t >= L.land && t < L.land + L.back) {
          wr.copy(top).addScaledVector(R, (N / 2 + LEAD) * glyphs.adv * emEnd).lerp(nib, smoothstep(L.land, L.land + L.back, t));
          writeAt = wr;
        }
        if (t >= L.land || (L.taps.length && t < L.taps[0][0] - 0.12)) continue;
        if (t < L.t1) {
          // the newest glyph a glyph and a half left of the nib, clear of the hand and its light
          tail.copy(nib).addScaledVector(R, -LEAD * glyphs.adv * EM);
          glyphs.set(L.k, { tail, shown: shown(L, t), em: EM, squash: 0, glow: 1 });
          stroke = strokeAt(L, t);
        } else {
          const u = clamp((t - L.t1) / (L.land - L.t1));
          const e = pressAt(L, t);
          const em = lerp(EM, emEnd, e);
          // its middle goes from where it was typed (left of the nib) to the top of the book
          mid.copy(nib).addScaledVector(R, -(N / 2 + LEAD) * glyphs.adv * EM).lerp(top, e);
          tail.copy(mid).addScaledVector(R, (N * glyphs.adv * em) / 2);
          glyphs.set(L.k, { tail, shown: N, em, squash: smoothstep(0.35, 1, u), glow: 1 - smoothstep(0.8, 1, u) });
          writeAt = wr.copy(tail).addScaledVector(R, LEAD * glyphs.adv * em);
          stroke = 0.08; // held just off the line, pushing it down with the stylus
        }
      }
      glyphs.update(camera);

      heroAt(t, body);
      fp.copy(body).lerp(nib, 0.5);
      hero.set({
        time: clockAt(t), pos: body.toArray(), face: top.toArray(), glow: glowAt(t), dive: 0, vel: [0, 0, 0],
        write: 1, writeAt: writeAt.toArray(), stroke,
      });
      hero.update(camera);

      // the book: printed as far as the lines have landed; its print line knocks bright as each lands
      shelf.set(0, { print: printAt(t) });
      shelf.commit();
      let knock = 0;
      for (const L of LINES) if (t >= L.land) knock += Math.exp(-(t - L.land) / 0.25);
      shelf.uniforms.uPrintCol.value.copy(STEEL).multiplyScalar(0.8 + 1.2 * knock);
      const key = hero.light();
      shelf.key(key.pos, key.col, 0.08);
      shelf.update();

      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK31.dust.g;
      dust.update(camera, 18 + t, { focus: focusDistance(camera, fp), fstop: LOOK34.fstop, width: ctx.width, intensity: LOOK31.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, fp), fstop: LOOK34.fstop } };
    },
  };
}
