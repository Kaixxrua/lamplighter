// s03 · 0:09–0:13 · 书脊·琥珀光 (global 216–311) · credit: AIGCNEWS 出品 / AIGCNEWS PRESENTS
// The film's first light. Out of the black a row of old folios slides past the lens, very close; off to
// the left a reader is coming along the gallery with a lamp, and its light runs ahead of them over the
// spines — a glint along every gilt band, the grain of the calf, a mote adrift between lens and books.
// The camera settles on a tall brown calf folio as the lamp arrives and stops just behind the lens: the
// highlight slides across the gilt of its red lettering piece and comes to rest on it — the credit.
// First frame: near black, the lamp still far off left (a cut from the black of s02).
// Last frame: the credit held, the lamp at rest; cut to s04 (the next volume, lower down).
// Camera: 50 mm, 0.34 m from A's crest, looking 16° along the row, tracking +x (−0.244 → −0.089 m,
// shelf space) and settling. Lamp: a bull's-eye lantern, beam 3.5°/10°, ending behind the lens and
// to its right; a few motes of dust catch its beam between lens and books.
import * as THREE from 'three';
import { setLens, aim, handheld } from 'film/lib/camera.js';
import { noise1 } from 'film/lib/rng.js';
import { libraryUniforms } from 'world/libshader.js';
import { BookShelf, layoutShelf, bookLabels, book, labelAspect, compartment, BIND, GROUND, LEATHERS, TITLE_CELL } from 'world/bookshelf.js';
import { Dust } from 'world/dust.js';

export const meta = { frames: 96 };

// side 4, row 1 of floor 0: spines face +z, toward the shaft; the gallery lamps of side 4 are above
export const ORIGIN = new THREE.Vector3(0, 1.065, -18.6);
export const LAMP_RGB = new THREE.Color(1.0, 0.62, 0.3);

// A volume next to the credit books: title in compartment titleK (default n-2), volume number below it.
function neighbour(o) {
  const b = book({ bind: BIND.LEATHER, dust: 0.4, ...o });
  const tk = o.titleK ?? b.bands - 2;
  if (o.title) {
    const [y0, y1] = b.bands >= 4 ? compartment(b.h, b.bands, tk) : [b.h * 0.7, b.h * 0.79];
    b.label = { cell: TITLE_CELL[o.title], y0, y1, ground: o.ground };
  }
  if (o.vol !== undefined) {
    const [c0, c1] = compartment(b.h, b.bands, tk - 1);
    const m = (c1 - c0) * 0.2;
    b.label2 = { cell: 48 + o.vol, y0: c0 + m, y1: c1 - m, ground: o.ground === GROUND.RED ? GROUND.BLACK : GROUND.RED };
  }
  return b;
}

// The shelf of the two hero volumes, shared with s04 (out of the cut). A: AIGCNEWS PRESENTS (red
// piece, high); B: the title, LAMPLIGHTER 燃灯者 (black piece, low, so it stays below frame while s03
// holds on A). B carried the authors' credit until the film dropped its credits on 10-07.
export async function heroShelf(U) {
  const A = book({ x: 0, w: 0.082, h: 0.44, d: 0.3, bands: 5, col: [0.075, 0.036, 0.02], wear: 0.25, seed: 0.31, edgeGilt: 1, dust: 0.3 });
  const [a0, a1] = compartment(A.h, A.bands, 3);
  A.label = { cell: 100, y0: a0, y1: a1, ground: GROUND.RED };
  const B = book({ x: 0.0812, w: 0.078, h: 0.4, d: 0.29, bands: 4, col: LEATHERS[5], wear: 0.3, seed: 0.62, edgeGilt: 1, dust: 0.35 });
  const [b0, b1] = compartment(B.h, B.bands, 1);
  B.label = { cell: 101, y0: b0, y1: b1, ground: GROUND.BLACK };

  // what slides past before A, right to left
  const fixed = [A, B];
  const lefts = [
    { w: 0.056, h: 0.415, d: 0.29, col: LEATHERS[0], bands: 5, wear: 0.55, seed: 0.13, title: 'OPERA OMNIA', ground: GROUND.BLACK, vol: 3, titleK: 2 },
    { w: 0.048, h: 0.325, d: 0.235, col: LEATHERS[3], bands: 5, wear: 0.7, seed: 0.27, title: 'NATURALIS HISTORIA', ground: GROUND.RED },
    { w: 0.072, h: 0.455, d: 0.31, col: LEATHERS[5], bands: 6, wear: 0.4, seed: 0.41, title: 'BIBLIOTHECA UNIVERSALIS', ground: GROUND.GILT },
    { w: 0.04, h: 0.31, d: 0.22, bind: BIND.VELLUM, col: [0.4, 0.33, 0.22], bands: 0, strip: 4, wear: 0.5, seed: 0.55 },
    { w: 0.065, h: 0.43, d: 0.3, col: LEATHERS[6], bands: 5, wear: 0.45, seed: 0.68, title: 'SPECULUM MAIUS', ground: GROUND.TAN },
    { w: 0.05, h: 0.4, d: 0.28, col: LEATHERS[8], bands: 5, wear: 0.6, seed: 0.74, title: 'ETYMOLOGIAE', ground: GROUND.RED },
  ];
  let x = A.x - A.w / 2;
  for (const o of lefts) {
    x -= 0.0012 + o.w / 2;
    fixed.push(neighbour({ ...o, x, z: o.z ?? 0 }));
    x -= o.w / 2;
  }
  // and after B, left to right: dark calf, so nothing pale sits next to the credit in s04
  const rights = [
    { w: 0.062, h: 0.42, d: 0.3, col: LEATHERS[9], bands: 5, wear: 0.45, seed: 0.83, title: 'THESAURUS', ground: GROUND.GREEN },
    { w: 0.052, h: 0.37, d: 0.26, col: LEATHERS[2], bands: 5, wear: 0.6, seed: 0.91, title: 'LEXICON', ground: GROUND.RED },
  ];
  x = B.x + B.w / 2;
  for (const o of rights) {
    x += 0.0012 + o.w / 2;
    fixed.push(neighbour({ ...o, x, z: 0 }));
    x += o.w / 2;
  }
  const heroA = {
    aspect: labelAspect(A),
    lines: [
      { text: 'AIGCNEWS', fam: 'garamond', size: 0.27, y: 0.38, weight: 600, tracking: 0.05, maxW: 0.8 },
      { text: '出　品', fam: 'serif', size: 0.22, y: 0.66, weight: 400, tracking: 0.25 },
      { text: 'PRESENTS', fam: 'garamond', size: 0.15, y: 0.86, weight: 600, tracking: 0.28, maxW: 0.6 },
    ],
  };
  const heroB = {
    aspect: labelAspect(B),
    lines: [
      { text: 'LAMPLIGHTER', fam: 'garamond', size: 0.13, y: 0.42, weight: 600, tracking: 0.12, maxW: 0.8 },
      { text: '燃灯者', fam: 'serif', size: 0.14, y: 0.7, weight: 400, tracking: 0.25 },
    ],
  };
  const labels = await bookLabels({ heroes: [heroA, heroB] });
  const layout = layoutShelf({
    seed: 3,
    x0: -1.4,
    x1: 1.2,
    rows: [{ y: 0, classes: ['folio', 'folio', 'quarto', 'quarto', 'octavo'] }],
    fixed,
  });
  const shelf = new BookShelf({ uniforms: U, layout, labels });
  shelf.group.position.copy(ORIGIN);
  return { shelf, A, B };
}

// the reader's lamp: a flame behind glass, breathing a little
export function lampFlicker(t) {
  return 1 + 0.05 * noise1(t * 7, 3) + 0.025 * noise1(t * 19, 5);
}

// The camera glides along the row looking a little ahead (YAW toward +x) and comes to rest with A's
// lettering piece centred. The reader walks behind it, left to right, with a bull's-eye lantern: its
// beam sweeps the spines and stops on A as they stop to read; the lantern ends right of the lens, so
// the highlight on A's gilt comes to rest on the lettering.
const YAW = (16 * Math.PI) / 180;
const DIST = 0.34;
const LABEL_Y = 0.329;
const camX = (t) => -DIST * Math.sin(YAW) - 0.15 * Math.exp(-t / 0.95) + 0.0012 * t;
const camZ = (t) => DIST * Math.cos(YAW) + 0.012 * Math.exp(-t / 1.5);
const lampX = (t) => 0.37 - 1.5 * Math.exp(-t / 0.75);
const lampZ = (t) => 0.6 + 0.15 * Math.exp(-t / 0.75);
const LAMP_Y = 0.39;
const beamX = (t) => -0.6 * (1 + t / 0.4) * Math.exp(-t / 0.4); // critically damped: arrives, no overshoot
const lead = (t) => 0.02 * Math.exp(-t / 0.95); // a little more look-ahead while moving fast

// Where everything is at time t, in shelf space (add ORIGIN): camera, aim point, lantern, beam target,
// focus distance. s04 continues from rig(4 + t).
export function rig(t) {
  const x = camX(t);
  const z = camZ(t);
  return {
    cam: [x, LABEL_Y, z],
    tgt: [x + z * Math.tan(YAW) + lead(t), LABEL_Y, 0],
    lamp: [lampX(t), LAMP_Y, lampZ(t)],
    beam: [beamX(t), LABEL_Y + 0.004, 0],
    focus: DIST + 0.002 + 0.012 * Math.exp(-t / 1.5),
  };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 60);
  const U = libraryUniforms();
  U.uLampI.value = 2; // the gallery lamps far above: barely a glow on the tops of the books
  U.uFogD.value = 0.009;
  const { shelf } = await heroShelf(U);
  scene.add(shelf.group);

  const dust = new Dust({ uniforms: U, count: 16000, box: 0.9, seed: 5 });
  const DU = dust.uniforms;
  DU.uNear.value.set(0.04, 0.1);
  DU.uG.value = 0.3;
  DU.uMoteI.value = 150;
  scene.add(dust.points);

  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const key = new THREE.Vector3();
  const col = new THREE.Color();
  const spot = new THREE.Vector3();

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      setLens(camera, 50);
      const r = rig(t);
      pos.fromArray(r.cam).add(ORIGIN);
      tgt.fromArray(r.tgt).add(ORIGIN);
      aim(camera, pos, tgt, { shake: handheld(t, { amp: 0.08, seed: 3 }) });
      key.fromArray(r.lamp).add(ORIGIN);
      col.copy(LAMP_RGB).multiplyScalar(0.18 * lampFlicker(t));
      shelf.key(key, col, 0.02);
      shelf.beam(spot.fromArray(r.beam).add(ORIGIN), 3.5, 10);
      shelf.update(t);
      DU.uKeyPos.value.copy(key);
      DU.uKeyCol.value.copy(col);
      DU.uKeyR.value = 0.02;
      DU.uKeyDir.value.copy(shelf.uniforms.uKeyDir.value);
      DU.uKeyCone.value.copy(shelf.uniforms.uKeyCone.value);
      dust.update(camera, 3 + t * 0.12, { focus: DIST + 0.002, fstop: 5.6, width: ctx.width });
    },
    post: (t) => ({
      // focus on the crest of the spine at the centre of frame (A at rest)
      dof: { focus: rig(t).focus, fstop: 5.6, maxBlur: 0.02 },
    }),
  };
}
