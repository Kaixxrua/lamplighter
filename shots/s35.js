// s35 — 2:23–2:26 (3432–3503, 72 frames, act 3). The spark.
// A cut in close on the reader along s34's line of sight (from below, out over the shaft), still where s34 left
// it: bent over its book, its hand at the nib. On the cut (the 'ding', CUES.spark, global 3432) a lime spark
// strikes on its crown and it stops dead: its clock brakes to a standstill in a sixth of a second (CUES.stop) — the
// shards hang where they were, the inner cage stops turning, the hover holds — and it looks up from the page,
// straight ahead (0.04–0.5 s), which stands the spark on top of it. Beside the spark a small line of lime monospace
// types itself out (0.45–0.77 s): MCP-first. Then it breathes out: it lets go of its pen (0.9–1.7 s) and sinks
// back, easing in and out (from 0.75 s), to the height it wrote at in s32 (W(6.80, -3.00, 1.62), where s40 takes it
// up), its clock starting again slowly; the lens comes down with it. The spark settles to a steady glint and
// stays, and so does the line. Its book stays 8/12, under the frame.
// W(a, s, y) = at(SIDE, K, a, s, y) (s32): a out from the book plane toward the shaft, s along side 0, y above
// floor K.
// First frame: lens W(8.080, -3.695, 1.223) → W(6.80, -3.00, 1.888), 50 mm f/4, focus on the reader, looking up
//   24.5° from 1.60 m. The reader at W(6.80, -3.00, 1.875) (s34's t = 4, the frame after its last), its head down
//   to the top of its book W(6.39, -3.00, 1.373), steel, glow 0.87, its clock at 27.5 s, its hand at the nib
//   W(6.39, -3.00, 1.513) (write 1, stroke 0; under the frame), the spark at its brightest (1.6), no word yet. The
//   library as in s34: s17's lamps at LOOK17.lamp (amber; none in frame — the amber along the bottom is side 0's
//   shelves beyond the reader, out of focus), no sheet, black fog 0.009, no ambient; the reader's own light
//   (hero.light(): steel by its glow, a little lime with the spark) is the only key on its book and the dust.
// Last frame (t 2.958): lens W(8.042, -3.674, 1.039) → W(6.80, -3.00, 1.661), 50 mm f/4, focus on the reader,
//   looking up 23.8° from 1.54 m (it came down with 0.8 of the reader's sinking, its look point with 0.89, and
//   closed in 3%). The reader at rest at HERO1 W(6.80, -3.00, 1.62), upright, facing AHEAD W(2.80, -3.00, 1.75)
//   (its wall, 2° up), steel, glow 0.95, its clock at 28.005 s and running at 0.4; its hand let go and back at
//   its side. Its set(): time 28.005, pos HERO1, face AHEAD, glow 0.95, write 0 (writeAt still the nib
//   W(6.39, -3.00, 1.513)), stroke 0, dive 0, vel 0, spark 0.8. The spark is still lit on its crown, steady;
//   MCP-first stands whole in lime, its left end 0.1 m to the right of the spark as the lens sees it, its middle
//   0.028 m below, glyphs 0.016 m. The lights as on the first frame; the book 8/12, under the frame. heroAt,
//   clockAt, glowAt, sparkAt, faceAt, penAt and mcpShown hold or run on past the end, for s36.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, STEEL, LIME, brake } from 'world/agentbody.js';
import { BookShelf, bookLabels } from 'world/bookshelf.js';
import { CodeGlyphs } from 'world/e1_glyphs.js';
import { LOOK17 } from './s17.js';
import { LOOK31, LENS as LENS31 } from './s31.js';
import { at, K, SIDE, QBOOK, DESK, STEP, deskBook, spineLabels } from './s32.js';
import * as S34 from './s34.js';

export const meta = { frames: 72, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export const BEAT = 2 / 3; // 90 BPM
const GRID0 = -22; // the beat grid's origin (global 121 s, s31's cut) in this shot's time: t 0 is beat 33, a bar
export const beatOf = (t) => (t - GRID0) / BEAT;
const T34 = S34.meta.frames / 24; // s34's time at t 0: this shot runs on from it
// the brake: the reader's clock falls to 5% of its pace in 3 TAU, a sixth of a second after the spark (where the
// score stretches time, 160 ms on)
const TAU = 1 / 18;
export const CUES = { cut: 0, spark: 0, stop: +(3 * TAU).toFixed(3) };
const W = (a, s, y) => at(SIDE, K, a, s, y);
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------- the reader
// It sinks back to s32's height from T_SINK[0], easing in and out, and is there on the last frame.
export const HERO1 = W(6.8, -3.0, 1.62);
const T_SINK = [0.75, DUR - 1 / 24];
const ease5 = (u) => u * u * u * (u * (6 * u - 15) + 10);
export const sinkAt = (t) => ease5(clamp((t - T_SINK[0]) / (T_SINK[1] - T_SINK[0])));
export function heroAt(t, out = new THREE.Vector3()) {
  return S34.heroAt(T34 + t, out).lerp(HERO1, sinkAt(t));
}
// its clock: s34's ran at three quarters; the spark brakes it dead (brake, from t 0), and as it sinks it starts
// again, slowly (RATE1 at the end, eased in over T_RESUME)
const RATE0 = 0.75;
const RATE1 = 0.4;
const T_RESUME = [1.0, 2.6];
const ramp = (t, a, b) => {
  // the integral of smoothstep(a, b, t) from a
  if (t <= a) return 0;
  if (t >= b) return (b - a) / 2 + (t - b);
  const u = (t - a) / (b - a);
  return (b - a) * (u * u * u - (u * u * u * u) / 2);
};
export const clockAt = (t) => S34.clockAt(T34) + RATE0 * brake(t, 0, TAU) + RATE1 * ramp(t, ...T_RESUME);
// it brightens a little as it breathes out (s34 left it at 0.87; s32 wrote at 0.95)
export const glowAt = (t) => lerp(S34.glowAt(T34), 0.95, sinkAt(t));
// the spark: struck on the cut, a burst that settles to a steady glint and stays (lime may burn out, BIBLE §3)
export const sparkAt = (t) => smoothstep(-0.03, 0, t) * (0.8 + 0.8 * Math.exp(-Math.max(t, 0) / 0.3));
// it lifts its head from the page as the spark strikes: its face from the top of its book to straight ahead
const LIFT = [0.04, 0.5];
export const liftAt = (t) => smoothstep(LIFT[0], LIFT[1], t);
export const AHEAD = W(2.8, -3.0, 1.75);
export const faceAt = (t, out = new THREE.Vector3()) => S34.topAt(T34 + t, out).lerp(AHEAD, liftAt(t));
// it lets go of its pen as it breathes out (the body's write)
export const penAt = (t) => 1 - smoothstep(0.9, 1.7, t);
// the book, untouched: 8/12 (S34.PRINT_END), as s40 has it
export const printAt = (t) => S34.printAt(T34 + t);

// ---------------------------------------------------------------------------------- MCP-first
// Typed out beside the spark once the head is up, a glyph every TYPE[1] s from TYPE[0], in CodeGlyphs as the code
// was, in lime and smaller (EM). The line runs on through blank glyphs after the word, so the flare of the last
// letters (CodeGlyphs flares the newest) dies away as the others' did.
export const MCP = 'MCP-first';
const LINE = MCP + ' '.repeat(6);
const TYPE = [0.45, 0.035];
const EM = 0.016; // glyph size (m)
const GAP = 0.1; // from the spark to the word's left end (m), clear of the spark's long ray (0.085)
const DROP = 0.028; // the word's middle this far below the spark
export const mcpShown = (t) => clamp((t - TYPE[0]) / TYPE[1], 0, LINE.length);

// ---------------------------------------------------------------------------------- the look
// The lens at p looking at l (W), mm; follow: how much of the reader's sinking the lens (its position, its
// look point) comes down with; push: how far it closes in on the look point over the shot (a fraction of the way).
export const LOOK35 = {
  cam: { p: [8.08, -3.695, 1.223], l: [6.8, -3.0, 1.888], mm: 50 },
  follow: [0.8, 0.89],
  push: 0.03,
  fstop: LENS31.fstop,
};
export function camAt(t, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  const c = LOOK35.cam;
  const down = (HERO1.y - S34.heroAt(T34).y) * sinkAt(t);
  pos.copy(W(...c.p));
  look.copy(W(...c.l));
  pos.lerp(look, (LOOK35.push * t) / DUR);
  pos.y += down * LOOK35.follow[0];
  look.y += down * LOOK35.follow[1];
  return { pos, look };
}
export const lensAt = () => LOOK35.cam.mm;

// got / want: the spark where it burns brightest, the stop where the reader's clock has fallen to 5% of its pace;
// and the joins: the first frame runs on from s34's last (the reader, its clock, glow and book), the last puts the
// reader at HERO1 (s40's start), and the book is 8/12 throughout
export function checkCues() {
  let spark = 0;
  let best = -1;
  let stop = null;
  const h = 1 / 2400;
  for (let f = 0; f <= DUR * 240; f++) {
    const t = f / 240;
    if (sparkAt(t) > best + 1e-12) [best, spark] = [sparkAt(t), t];
    if (stop === null && t > 0 && (clockAt(t + h) - clockAt(t - h)) / (2 * h) <= 0.05 * RATE0) stop = t;
  }
  const got = { cut: 0, spark: +spark.toFixed(3), stop: +(stop ?? -1).toFixed(3) };
  const bad = [];
  for (const k of ['spark', 'stop']) if (Math.abs(got[k] - CUES[k]) > 0.01) bad.push(`${k} got ${got[k]} want ${CUES[k]}`);
  if (heroAt(0).distanceTo(S34.heroAt(T34)) > 1e-9) bad.push('the reader does not start where s34 left it');
  if (Math.abs(clockAt(0) - S34.clockAt(T34)) > 1e-9 || Math.abs(glowAt(0) - S34.glowAt(T34)) > 1e-9) bad.push('clock or glow off s34');
  if (heroAt(DUR - 1 / 24).distanceTo(HERO1) > 1e-9) bad.push('the reader is not at HERO1 on the last frame');
  for (const t of [0, DUR]) if (Math.abs(printAt(t) - S34.PRINT_END * STEP) > 1e-9) bad.push(`the book at ${t} s is ${printAt(t) / STEP}/12`);
  return { got, want: CUES, bad };
}

export async function setup(ctx) {
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s35] CUES off: ${cc.bad.join('; ')}`);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K - 8, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamI.value = 0;
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 31 });
  scene.add(dust.points);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the book on the rail, as s34 left it
  const shelf = new BookShelf({ uniforms: U, layout: { books: [deskBook(printAt(0))], rows: [{ y: 3000 }], x0: -0.02, x1: 0.02 }, labels: await bookLabels(spineLabels()) });
  shelf.group.position.copy(DESK.pos);
  shelf.group.quaternion.copy(QBOOK);
  shelf.uniforms.uEnvCol.value.setRGB(0.08, 0.056, 0.032);
  scene.add(shelf.group);
  const mcp = await CodeGlyphs.create({ lines: [LINE], uniforms: U, height: ctx.height, col: LIME });
  scene.add(mcp.group);

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const body = new THREE.Vector3();
  const top = new THREE.Vector3();
  const nib = new THREE.Vector3();
  const face = new THREE.Vector3();
  const spark = new THREE.Vector3();
  const R = new THREE.Vector3();
  const Uc = new THREE.Vector3();
  const tail = new THREE.Vector3();
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
      U.uTime.value = 22 + t;

      // the hand where s34 left it, at the nib over the book, until it lets go
      S34.topAt(T34 + t, top);
      nib.copy(top).addScaledVector(UP, 0.14);
      heroAt(t, body);
      hero.set({
        time: clockAt(t), pos: body.toArray(), face: faceAt(t, face).toArray(), glow: glowAt(t), dive: 0, vel: [0, 0, 0],
        write: penAt(t), writeAt: nib.toArray(), stroke: 0, spark: sparkAt(t),
      });
      hero.update(camera);

      // MCP-first, its left end GAP to the right of the spark
      hero.anchor('spark', spark);
      R.setFromMatrixColumn(camera.matrixWorld, 0);
      Uc.setFromMatrixColumn(camera.matrixWorld, 1);
      const shown = mcpShown(t);
      if (shown > 0) {
        tail.copy(spark).addScaledVector(R, GAP + shown * mcp.adv * EM).addScaledVector(Uc, -DROP);
        mcp.set(0, { tail, shown, em: EM, squash: 0, glow: 1 });
      }
      mcp.update(camera);

      // the book: its print line still settling from s34's last landing; lit by the reader (and the spark)
      shelf.set(0, { print: printAt(t) });
      shelf.commit();
      const knock = Math.exp(-(T34 + t - S34.LINES[1].land) / 0.25);
      shelf.uniforms.uPrintCol.value.copy(STEEL).multiplyScalar(0.8 + 1.2 * knock);
      const key = hero.light();
      shelf.key(key.pos, key.col, 0.08);
      shelf.update();

      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK31.dust.g;
      dust.update(camera, 22 + t, { focus: focusDistance(camera, body), fstop: LOOK35.fstop, width: ctx.width, intensity: LOOK31.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, body), fstop: LOOK35.fstop } };
    },
  };
}
