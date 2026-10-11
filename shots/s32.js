// s32 — 2:07–2:15 (3048–3239, 192 frames, act 3). The reader writes.
// The gallery of floor K is empty again. The reader floats out over the rail, turns back and writes a book that
// stands on the rail: lines of the film's own render tool, typed in steel light at its nib, pressed down and
// printed into the book a slice at a time. Five land, on the bar and then every two beats. The lens goes round it,
// from behind and above it out over the shaft, down and in to a medium shot.
// W(a, s, y) = at(SIDE, K, a, s, y): a in from the shelf face of side 0, s along it, y above floor K.
// First frame = s31's last (its t 6): lens W(5.40, -0.50, 3.00) → W(11, -9, -2), 20 mm f/4, level; the reader at
//   W(6.00, -3.00, 1.70), on screen (0.68, 0.54), 2.9 m off; lamps LOOK17.lamp; s31's school far down the shaft,
//   its steel wash on the stone; nothing printed yet.
// Last frame: lens W(7.35, -2.00, 1.66) → W(6.55, -3.00, 1.38), 28 mm f/4, still moving (0.12 m/s); the reader at
//   W(6.80, -3.00, 1.62), (0.36, 0.26), 1.15 m off, the only key light (steel), on the spine (which faces the shaft);
//   the book printed 5/12, its spine at (0.51, 0.61–0.78); the sixth line half typed at the nib.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, AgentSwarm, STEEL } from 'world/agentbody.js';
import { BookShelf, book, bookLabels, labelAspect, BIND, GROUND } from 'world/bookshelf.js';
import { PLACE, at } from 'world/e1_place.js';
import { sideNormal, sideTangent } from 'world/geo.js';
import { CodeGlyphs, CODE } from 'world/e1_glyphs.js';
import { LOOK17 } from './s17.js';
import { camAt as camAt31, flow, attr, COUNT, LENS as LENS31, LOOK31 } from './s31.js';

export const meta = { frames: 192, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
export const BEAT = 2 / 3; // 90 BPM
const L0 = 2; // the first line lands on a bar (global 129 s), then one every two beats
export const CUES = { cut: 0, glyphs: [0, 1, 2, 3, 4].map((i) => L0 + 2 * i * BEAT) };
const S31 = 6; // s31's t at this shot's t = 0 (its frame 144, one after its last)

// ---------------------------------------------------------------------------------- the place (for s33–s36, E2)
// Floor K (30) is the reader's, K − 3 (27) the floor of the book already written; both books are on side 0 (the
// shelf wall next to the doorway the school came out of), at s = −3.0 along it. `at(side, k, a, s, y)`: a metres
// out from the book plane toward the shaft, s along the side, y above floor k (world metres, a Vector3).
export { PLACE, at };
export const K = PLACE.K;
export const K3 = PLACE.DUSTY;
export const SIDE = PLACE.WALL;
// a book's own frame on side 0 (bookshelf.js shelf space): x along the side (+s), y up, z out toward the shaft
// (the way both spines face)
export const QBOOK = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(sideTangent(SIDE), new THREE.Vector3(0, 1, 0), sideNormal(SIDE).negate()),
);
// The rail top the reader writes on: the balustrade's flat top runs from a 6.22 to 6.56 at y 1.09.
export const RAIL = { a0: 6.22, a1: 6.56, y: 1.09 };
// The reader's book: standing on the rail top at s −3.0, spine to the shaft. DESK.pos is the foot of its spine
// (shelf-space origin of a book: the crest of the spine, at the bottom), world.
export const DESK = { k: K, a: 6.52, s: -3.0, y: RAIL.y };
DESK.pos = at(SIDE, K, DESK.a, DESK.s, DESK.y);
// The book already written: on the wall three floors down, in the bay between the dividers at s −4.76 and −2.38,
// on row 2 (its board top at y 1.775), its spine crest 2.5 cm behind the painted book plane (where s33's modelled
// bay stands; see e1_bay.js when it exists). Same s as the reader's book: straight down the wall from it.
export const DUSTY = { k: K3, a: -0.025, s: -3.0, y: 1.775, row: 2, bay: [-4.76, -2.38] };
DUSTY.pos = at(SIDE, K3, DUSTY.a, DUSTY.s, DUSTY.y);

// ---------------------------------------------------------------------------------- the two books, one binding
// The same volume twice: blue cloth, printed (pale ink rules and title, the film's new books), and at the foot of
// the spine a gilt film-strip mark (two rows of sprocket dots between two rules). spineBook(o) gives a fresh
// bookshelf.js book() record with that spine; o sets the rest (x, y, z, print, dust, wear, strip). spineLabels()
// is the lettering for bookLabels(): hero A is the mark (label cell 100), strip 0 the title of the old one.
export const TITLE = 'heygen-com/hyperframes ★ 57,228'; // s38's result card: 57,228 stars
export const SPINE = { bind: BIND.CLOTH, w: 0.075, h: 0.42, d: 0.26, col: [0.02, 0.045, 0.12], bands: 0, ink: 1, seed: 0.37 };
const MARK = { y0: 0.04, y1: 0.16 }; // of the height
export function spineBook(o = {}) {
  const b = book({ ...SPINE, wear: 0, dust: 0, ...o });
  b.label = { cell: 100, y0: MARK.y0 * b.h, y1: MARK.y1 * b.h, ground: GROUND.GILT };
  return b;
}
export function spineLabels() {
  const aspect = labelAspect(spineBook());
  const dots = (y) => [0.1, 0.3, 0.5, 0.7, 0.9].map((x) => ({ x, y, r: 0.07 }));
  const mark = { aspect, lines: [], rules: [{ w: 0.94, y: 0.37, t: 0.075 }, { w: 0.94, y: 0.63, t: 0.075 }], dots: [...dots(0.15), ...dots(0.85)] };
  return { heroes: [mark], strips: [{ text: TITLE, fam: 'mono', weight: 500, tracking: 0.02, size: 0.46 }] };
}
// the two of them: the reader's, printing (untitled: it has not got that far), and the old one, whole, titled and
// under dust (s33, s40–s42)
export const deskBook = (print = 0) => spineBook({ print });
export const dustyBook = (o = {}) => spineBook({ strip: 0, print: 1, dust: 0.9, wear: 0.3, ...o });

// ---------------------------------------------------------------------------------- the writing
// A line is typed at the nib (TYPE s, in bursts), pressed down onto the book (PRESS s) and lands: the print rises
// one STEP. Five land in this shot, on CUES.glyphs; the sixth is begun as it ends (s34 lands the sixth to the
// eighth, more slowly).
const TYPE = 0.66;
const PRESS = 0.46;
export const STEP = 1 / 12; // of the book (print), per line
export const LINES = [...CUES.glyphs, L0 + 10 * BEAT].map((land, k) => ({ k, t0: land - PRESS - TYPE, t1: land - PRESS, land }));
export const printAt = (t) => STEP * LINES.reduce((p, L) => p + smoothstep(L.land, L.land + 0.1, t), 0);
const typed = (L, t) => {
  const u = clamp((t - L.t0) / TYPE);
  return CODE[L.k].length * clamp(u - 0.045 * Math.sin(6 * Math.PI * u));
};
// pressing: slow to start, then hard into the book
const pressAt = (L, t) => {
  const u = clamp((t - L.t1) / PRESS);
  return u * u * (2 - u);
};
const DIP = 0.035; // how far the reader leans into a press (m)
const EM = 0.026; // glyph size (m) as typed
const UP = new THREE.Vector3(0, 1, 0);
const OUTN = sideNormal(SIDE).negate(); // +a: toward the shaft
const ALONG = sideTangent(SIDE); // +s
// the middle of the top of the reader's book (its print front) at t, and the nib above it
const topAt = (t, out) => out.copy(at(SIDE, K, DESK.a - SPINE.d / 2, DESK.s, DESK.y + Math.max(printAt(t) * (SPINE.h + 0.02) - 0.01, 0)));
const NIB_UP = 0.14;
const LEAD = 1.5; // the typed line ends this many glyphs left of the nib
const TAP = 1 / 8; // how far a tap goes (stroke 0.5 would be a full dip)
const BACK = 0.2; // s: the hand back up to the nib after a line lands (the next is begun 0.21 s after)

// ---------------------------------------------------------------------------------- the lens
// From where s31 left it, round the reader (about PIV) from behind it over the gallery, past its right and out
// over the shaft: 63° in eight seconds, down 1.3 m and in from 2.9 m to 1.15 m off the reader, 20 → 28 mm; fastest
// (0.67 m/s) at 1 s, still turning at the cut. It turns from s31's look down the shaft to PIV.
const PIV = at(SIDE, K, 6.55, -3.0, 1.38);
const C0 = new THREE.Vector3();
const T0 = new THREE.Vector3();
camAt31(S31, C0, T0);
const polar = (p) => {
  const d = p.clone().sub(PIV);
  const a = d.dot(OUTN);
  const s = d.dot(ALONG);
  return { r: Math.hypot(a, s), th: Math.atan2(s, a), h: d.y };
};
const P0 = polar(C0);
const P1 = polar(at(SIDE, K, 7.35, -2.0, 1.66));
// its speed: from rest (as s31 ends) up to its most at 1.6 s, then dying away but not out by the cut
const ramp = (t, a = 0.9, b = 4) => {
  const c = 1 / (1 / a + 1 / b);
  return b * (1 - Math.exp(-t / b)) - c * (1 - Math.exp(-t / c));
};
const orbit = (t) => ramp(Math.max(t, 0)) / ramp(DUR);
export const lensAt = (t) => lerp(LENS31.mm, 28, smoothstep(0.6, 7.6, t));
export function camAt(t, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  const e = orbit(t);
  const r = lerp(P0.r, P1.r, e);
  const th = lerp(P0.th, P1.th, e);
  pos.copy(PIV).addScaledVector(OUTN, r * Math.cos(th)).addScaledVector(ALONG, r * Math.sin(th)).addScaledVector(UP, lerp(P0.h, P1.h, e));
  look.copy(T0).lerp(PIV, smoothstep(0.2, 2.6, t));
  return { pos, look };
}

// ---------------------------------------------------------------------------------- the reader
const HERO0 = at(SIDE, K, 6.0, -3.0, 1.7); // where s31 left it
// it floats out over the rail and turns back to the book: it writes from the shaft side, so its light falls on the
// spine (which faces the shaft, as the dusty one three floors down does, s33)
const HERO1 = at(SIDE, K, 6.8, -3.0, 1.62);
const FACE0 = at(SIDE, K, 11, -9, -2); // what it was looking at: down the shaft
export function heroAt(t, out = new THREE.Vector3()) {
  out.copy(HERO0).lerp(HERO1, smoothstep(0.2, 1.6, t));
  // it leans into each line as it presses it home, and slowly comes back up
  for (const L of LINES) {
    if (t >= L.t1 && t < L.land) out.y -= DIP * pressAt(L, t);
    else if (t >= L.land) out.y -= DIP * Math.exp(-(t - L.land) / 0.3);
  }
  return out;
}

// got / want: the landings measured off the print (where each step is half done)
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
  if (got.length !== CUES.glyphs.length || got.some((g, i) => Math.abs(g - CUES.glyphs[i]) > 0.01)) bad.push(`glyphs got ${got} want ${CUES.glyphs.map((x) => x.toFixed(3))}`);
  return { got: { cut: 0, glyphs: got }, want: CUES, bad };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const lib = new Library({ floors: [K - 8, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  const dust = new Dust({ uniforms: U, count: 30000, box: 18, seed: 31 });
  scene.add(dust.points);
  // s31's school, going on down the shaft and out of the dark it fades into
  const swarm = new AgentSwarm({ count: COUNT, seed: 31, kinds: 9, size: LOOK31.size, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(swarm.group);
  const hero = new AgentBody({ detail: 'hero', seed: 1, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(hero.group);
  // the book on the rail: one volume, its shelf board put out of the way (shelf space y 3000)
  const desk = deskBook(0);
  const shelf = new BookShelf({ uniforms: U, layout: { books: [desk], rows: [{ y: 3000 }], x0: -0.02, x1: 0.02 }, labels: await bookLabels(spineLabels()) });
  shelf.group.position.copy(DESK.pos);
  shelf.group.quaternion.copy(QBOOK);
  // its gilt mark faces away from the reader's light into the warm gallery, and gives that back
  shelf.uniforms.uEnvCol.value.setRGB(0.08, 0.056, 0.032);
  scene.add(shelf.group);
  const glyphs = await CodeGlyphs.create({ lines: CODE, uniforms: U, height: ctx.height });
  scene.add(glyphs.group);

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const body = new THREE.Vector3();
  const face = new THREE.Vector3();
  const top = new THREE.Vector3();
  const nib = new THREE.Vector3();
  const R = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const p = new THREE.Vector3();
  const O = new THREE.Vector3();
  const C = new THREE.Vector3();
  const o = {};
  const fp = new THREE.Vector3(); // in focus: the reader, then where it writes
  const wr = new THREE.Vector3(); // where the hand is sent
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s32] CUES off: ${cc.bad.join('; ')}`);
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
      U.uTime.value = S31 + t;
      swarm.set({ time: S31 + t, place: flow, attr, glow: LOOK31.glow });
      swarm.update(camera);
      washFrom(t);

      // the line being written, and the one being pressed home
      topAt(t, top);
      nib.copy(top).addScaledVector(UP, NIB_UP);
      R.setFromMatrixColumn(camera.matrixWorld, 0);
      // the hand writes at the nib, rides the right end of the line down onto the book, and goes back up
      let writeAt = nib;
      let stroke = 0;
      for (const L of LINES) {
        const N = CODE[L.k].length;
        const emEnd = Math.min(EM, 0.24 / (N * glyphs.adv));
        if (t >= L.land && t < L.land + BACK) {
          wr.copy(top).addScaledVector(R, (N / 2 + LEAD) * glyphs.adv * emEnd).lerp(nib, smoothstep(L.land, L.land + BACK, t));
          writeAt = wr;
        }
        if (t < L.t0 || t >= L.land) continue;
        if (t < L.t1) {
          // the newest glyph a glyph and a half left of the nib, clear of the hand and its light
          tail.copy(nib).addScaledVector(R, -LEAD * glyphs.adv * EM);
          glyphs.set(L.k, { tail, shown: typed(L, t), em: EM, squash: 0, glow: 1 });
          // light taps (the hand never quite comes down: at a full dip, this close, it clips)
          stroke = TAP * (1 - Math.abs(2 * ((t * 5) % 1) - 1));
        } else {
          const u = clamp((t - L.t1) / PRESS);
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
      fp.copy(body).lerp(nib, smoothstep(0.5, 2.0, t));
      face.copy(FACE0).lerp(top, smoothstep(0.15, 1.0, t));
      // it dims a little as it labours (and, this close, keeps its hand under Y 240)
      hero.set({
        time: 12 + t, pos: body.toArray(), face: face.toArray(), glow: 1 - 0.05 * smoothstep(3, 7.5, t), dive: 0, vel: [0, 0, 0],
        write: smoothstep(0.5, 0.85, t), writeAt: writeAt.toArray(), stroke,
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
      dust.update(camera, S31 + t, { focus: focusDistance(camera, fp), fstop: LENS31.fstop, width: ctx.width, intensity: LOOK31.dust.I });
    },
    post() {
      return { dof: { focus: focusDistance(camera, fp), fstop: LENS31.fstop } };
    },
  };

  // s31's school lights the stone as it goes (its wash, the same as there, on s31's clock)
  function washFrom(t) {
    const Wa = LOOK31.wash;
    let sw = 0;
    C.copy(look).sub(pos).setLength(Wa.reach).add(pos);
    O.set(0, 0, 0);
    for (let i = 0; i < COUNT; i++) {
      attr(i, S31 + t, o);
      if (o.glow <= 0) continue;
      swarm.position(i, p);
      const w = o.glow * Math.exp(-p.distanceToSquared(C) / (Wa.sigma * Wa.sigma));
      O.addScaledVector(p, w);
      sw += w;
    }
    U.uBeamI.value = 0;
    if (sw > 1e-4) {
      U.uBeamO.value.copy(O.divideScalar(sw));
      U.uBeamAng.value = Math.atan2(O.z, O.x);
      U.uBeamW.value = Wa.W;
      const j = (((Math.round((U.uBeamAng.value - Math.PI / 6) / (Math.PI / 3)) % 6) + 6) % 6);
      U.uBeamV.value = clamp(Wa.Vk * Math.abs(PLACE.FACE - O.dot(sideNormal(j))), Wa.Vmin, Wa.V);
      U.uFanUp.value = 50;
      U.uFanDn.value = 50;
      U.uTrailI.value = 0;
      U.uBeamCol.value.copy(STEEL);
      U.uBeamI.value = Wa.I * (1 - Math.exp(-sw / Wa.n0));
    }
  }
}
