// s38 结果卡 (the result card): global 3720–3863, 144 frames (6 s), 2:35–2:41, act 3 (its grade), lang.
//
// The return light of s37 has just struck the reader's eye. Its thread up the shaft falls away; the bead that
// is left of it leaves the eye and types what came back, in the air, in mono, on the score's beats: the tool
// (search_github_ai_projects), q: "…", min_stars: 500 (s19's gate), items[0]. Then it drops to where the
// card's top edge will be and runs it, and the edge comes down as a seam that prints the card (c_card.js:
// repocard.js's face, OTTERVALE's spec with this return's first item), a row on each sixteenth: the name, the
// description in the film's language, the same in the other (a size down, fainter), the tags (both), the
// stats, the attribution. The card is whole at 3.333 s; the results after it are typed faint under it (the
// frame holds the first two of the nine); the call's three fields go down to a glimmer, items[0] staying
// over the card as its label. The camera goes from the reader to square on the card. Every word and number
// is assets/ui/s38-result.json's (the search this film's making really ran, 2026-10-05 22:17) and comes from
// nowhere else: heygen-com/hyperframes, 57,228 stars, +89 today, heat 39.2.
//
// lang: the card's face only (which description comes first, the tags' order, the stats' words). The data's
// lines are the return's own, the same in both; everything else is the same pixel for pixel.
//
// The first frame, for s37 to cut to (s37 ends on its impact, CUES.return; this opens in its afterglow):
//   the camera: 40 mm, f/2, focused on the eye; at world (9.91, 217.95, 5.33) looking at (8.21, 217.43,
//   5.41) (CAM38's key 0): 1.76 m from the reader, 0.4 m above it, looking in over the shaft;
//   the reader: AgentBody hero, seed 1, glow 0.9, its clock at READER.time (40 s), at W(...READER.pos) =
//   world (8.19, 217.57, 5.45): floor 30 (PLACE.K), 9.8 m off the axis, over the shaft in front of side 0
//   (PLACE.WALL); it faces down the shaft (FACES[0]); its eye at screen (0.51, 0.47);
//   the lime: the bead on the eye (LOOK38.bead: I × (1 + hit) at the cut, the afterglow's tau 0.15 s, gone
//   by 0.6 s) and the thread from the eye straight down the frame (toward the lens: the axis at floor -100).
//   No spark on the body: agentbody keeps its own lime for s35 and s41;
//   the library: act III's (lit 0, lime 0, lamp LOOK17.lamp, black fog 0.009, no ambient), the dust in the
//   reader's light; the act's grade and nothing over it.
//   Mean luma (Rec. 709 of the sRGB values, of 255): 14.3 in the 1920 keyframe (still: 20 samples, depth of
//   field; median 1; thirds 11.0 / 22.5 / 9.5; mean RGB (19, 14, 9)); 13.8 at 960 (preview; thirds 10.4 /
//   21.7 / 9.3).
// The last frame, for s39 (it opens on it and dissolves inside itself): the camera square on the card, 1 m
// off it (the card 0.64 × 0.32 m, 73% of the frame's width), nothing moving but the dust. Mean luma 94.2
// (zh) and 94.1 (en) in the 1920 keyframes (median 68 / 67; thirds 72.3 / 138.4 / 71.8; mean RGB (99, 93,
// 88)); about 93.5 in both at 960 (the re-rendered preview). s39 takes
// loadCard38, CAM38 and camAt, FRAME38 and W, LOOK38, KEY38 and setup's parts from here.
//
// Cues (CUES, s into the shot), on a 90 BPM grid counted from the cut (a beat 2/3 s, a sixteenth 1/6 s):
// cut 0; leave [0.08, 0.33]; fields[10]: the four typed at 0.667, 1.333, 1.667 and 2, the card's six rows at
// 2.333 … 3.167, a sixteenth apart; unfold [2, 3.333]; card 3.333; rows [3.35, 3.565] (the two in the
// frame). setup recomputes them from the motion itself and warns if they are off.
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { canvasTexture } from 'film/lib/text.js';
import { LIB } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Dust } from 'world/dust.js';
import { AgentBody, LightLines, LightPoints, lightUniforms, LIME } from 'world/agentbody.js';
import { PLACE } from 'world/e1_place.js';
import {
  CARD38, FACE, DATA, specOf, fieldsOf, rowsOf, layoutFace, faceCanvas, drawFaceA, drawFaceB, drawData,
  buildCard, buildData, cardPoint,
} from 'world/c_card.js';
import { LOOK17 } from './s17.js';
import { sidePoint } from 'world/geo.js';

// final: at least 8 samples, as the act's other shots (at 2 the typed lines double as the camera comes down
// to the card: 5–8 px a shutter at 1920, f54–f72); the engine adds more where the camera moves faster (one
// per 1.25 px at 1920: f0–f20, the opening turn, up to 48 at 56 px; --plan: 1576 samples, 10.9 a frame)
export const meta = { frames: 144, quality: { final: { samples: 8 } } };
const WHITE = new THREE.Color(1, 1, 1);
const DUR = meta.frames / 24;

// Where: over the shaft of floor PLACE.K (30), in front of the shelf wall the reader wrote at (side
// PLACE.WALL, 0). The card's frame: its centre STATION.r from the axis on that side's bearing, STATION.y
// over the floor; x to the right as we look at its face, y up, z out of its face (away from the axis,
// toward the gallery). Everything below is in this frame (m) unless it says otherwise.
export const STATION = { side: PLACE.WALL, r: 9.4, y: 1.55 };
const BEAR = (30 + 60 * STATION.side) * (Math.PI / 180);
const N0 = new THREE.Vector3(Math.cos(BEAR), 0, Math.sin(BEAR)); // out of the card's face
const X0 = new THREE.Vector3(Math.sin(BEAR), 0, -Math.cos(BEAR)); // its right
const Y0 = new THREE.Vector3(0, 1, 0);
const C0 = N0.clone().multiplyScalar(STATION.r).setY(PLACE.K * LIB.H + STATION.y);
export const FRAME38 = new THREE.Matrix4().makeBasis(X0, Y0, N0).setPosition(C0);
export const W = (x, y, z, out = new THREE.Vector3()) => out.set(x, y, z).applyMatrix4(FRAME38);

// The reader: hanging off the card's left, a little toward us, turned to it (its eye is where the return
// light came in, at the end of s37).
export const READER = { pos: [-0.62, 0.02, 0.42], seed: 1, time: 40 };

// Times (s): the return light's thread falls away under the eye (thread) and the bead's afterglow of s37's
// impact dies (hit); the bead leaves the eye for the first field (leave) and types the four, each line
// [t0, t1] (type); it drops to the card's top edge and runs it (edge), and the seam comes down the card (seam:
// [t, mm from the top], through the bands' centres on the score's sixteenths); the card is whole (card); the
// rows under it (rows); the fields over it go down to a glimmer, items[0] staying as the card's label (dim).
export const T38 = {
  thread: [0, 0.35],
  hit: [0, 0.6],
  leave: [0.08, 0.33],
  type: [[0.33, 2 / 3], [0.75, 4 / 3], [1.45, 5 / 3], [1.8, 2]],
  edge: [2, 2.2],
  seam: [[2.2, 0], ...FACE.bands.map((b, i) => [7 / 3 + i / 6, b.c]), [3.25, CARD38.H]],
  card: 10 / 3,
  rows: { t0: 3.35, step: 0.075, dur: 0.14, seen: 2 }, // seen: how many of the nine the frame holds
  dim: [2.2, 3.2],
};

// a monotone cubic through points [[t, v], …] (Fritsch–Carlson): the seam never backs up. The slopes at the
// ends are the end segments' unless given (end: [first, last], null keeps one).
function monotone(P, end = [null, null]) {
  const n = P.length;
  const d = P.slice(1).map((p, i) => (p[1] - P[i][1]) / (p[0] - P[i][0]));
  const m = P.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  if (end[0] !== null) m[0] = end[0];
  if (end[1] !== null) m[n - 1] = end[1];
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      m[i] = (3 * a * d[i]) / Math.sqrt(h);
      m[i + 1] = (3 * b * d[i]) / Math.sqrt(h);
    }
  }
  return (t) => {
    if (t <= P[0][0]) return P[0][1];
    if (t >= P[n - 1][0]) return P[n - 1][1];
    let i = 0;
    while (t > P[i + 1][0]) i++;
    const h = P[i + 1][0] - P[i][0];
    const s = (t - P[i][0]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * P[i][1] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * P[i + 1][1] + (s3 - s2) * h * m[i + 1];
  };
}
export const seamAt = monotone(T38.seam); // mm from the card's top edge

// Light (linear). The card: s18's parchment and inks; the printed light (× the albedo: the paper's own, as
// the book's pages in act II), a warm key (the lamps of the side behind us, KEY38, × key), the reader's own
// light (× a.light()); the ink just printed keeps the light over hot[1] mm behind the seam,
// the paper over hot[3]; the heat in lime. The data's light: steady, a glyph's flash as it appears and its
// cooling (s), the fields over the card dimmed to a glimmer, the rows. The bead (the return light, typing),
// the thread (the return light's path down the shaft, falling away), the seam and the card's top edge.
export const LOOK38 = {
  paper: [0.8, 0.755, 0.68],
  inkDark: [0.025, 0.022, 0.018],
  inkAmber: [0.42, 0.14, 0.012],
  inkSteel: [0.11, 0.2, 0.34],
  chip: [0.74, 0.75, 0.76],
  glow: 0.3,
  key: 1, // × KEY38
  reader: { glow: 0.9, light: 1 },
  hot: [1.2, 5, 0.12, 8],
  spill: [0.3, 5],
  heat: 1.1,
  data: { steady: 0.26, label: 0.2, hot: 1.6, cool: 0.18, dim: 0.03, rows: 0.04, rowsHot: 0.2 },
  bead: { I: 2, r: 0.003, halo: 0.2, haloR: 4, hit: 1.5, tau: 0.15 },
  thread: { I: 1.2, w: 0.0012, len: 300 },
  seam: { I: 2.2, w: 0.0009 },
  dust: { I: 2.5, g: 0.55, count: 20000 },
  fog: 0.009,
};

// The warm key: this side's two gallery lamps and its two corner shaft lamps, as the library lights its
// stone (uLampI 14 × the floor's lamp, LOOK17's 0.25 in act III, × lampVar's mean 0.94; the shaft lamps ×
// uShaftK 0.8), as one light at their middle (weighted by what each gives the card's centre) that gives the
// centre what the four give it. Card frame (m), and its colour × intensity.
export const KEY38 = (() => {
  const I0 = 14 * LOOK17.lamp * 0.94;
  const y = PLACE.K * LIB.H;
  const lamps = [
    ...[-1, 1].map((e) => [sidePoint(STATION.side, LIB.LAMP_A, e * LIB.LAMP_OFF, y + LIB.LAMP_Y), 1]),
    ...[0, 1].map((e) => {
      const a = (STATION.side + e) * (Math.PI / 3);
      return [new THREE.Vector3(Math.cos(a) * LIB.SHAFT_R, y + LIB.SHAFT_Y, Math.sin(a) * LIB.SHAFT_R), 0.8];
    }),
  ];
  const inv = FRAME38.clone().invert();
  const P = new THREE.Vector3();
  let sum = 0;
  for (const [L, k] of lamps) {
    const d = L.clone().applyMatrix4(inv);
    const w = (k * I0 * Math.max(d.z / d.length(), 0)) / (d.lengthSq() + 0.3);
    P.addScaledVector(d, w);
    sum += w;
  }
  P.divideScalar(sum);
  const I = (sum * (P.lengthSq() + 0.4)) / (P.z / P.length());
  return { pos: P.toArray().map((v) => +v.toFixed(3)), I: +I.toFixed(3), E: +sum.toFixed(4), col: [1.0, 0.62, 0.3] };
})();

// The camera (card frame, m): on the reader from its right, a little above it, the thread straight down the
// frame under it (s37's right half: the reader above, the beam down the shaft); it turns with the bead to
// the fields as they are typed (the reader leaves at the lower left) and closes on them, comes down with the
// seam to the card, and settles square on to it. 40 mm, f/2. One Catmull-Rom through the keys for where it
// is and one for where it looks, each at its key at the key's time (CAM38.at), run by a monotone cubic over
// its own knots (THREE's centripetal spacing: the square root of each chord), still at the end. On its knots
// a curve's speed is the same either side of a key. (On one even parameter for both, as getPoint takes it,
// each segment's tangent is scaled by its own chord and the speed jumped at the keys: the turn braked from
// 1.8° to 1.0° a frame within a frame at 0.4 s and from 0.5° to 0.2° at 0.9 s, and the closing in lost
// 40% of its speed at 3.35 s.)
export const CAM38 = {
  mm: 40,
  fstop: 2,
  at: [0, 0.4, 0.9, 2, 3.35, DUR],
  pos: [[0.34, 0.4, 1.85], [0.18, 0.42, 1.55], [0.1, 0.4, 1.3], [0.08, 0.3, 1.1], [0.03, 0.06, 1.08], [0, 0, 1]],
  look: [[-0.58, -0.12, 0.42], [-0.22, 0.24, 0.1], [-0.02, 0.24, 0], [0.03, 0.2, 0], [0, 0.02, 0], [0, -0.005, 0]],
};
const POS = new THREE.CatmullRomCurve3(CAM38.pos.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
const LOOKC = new THREE.CatmullRomCurve3(CAM38.look.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
// a curve's knots: 0, then the square root of each chord, summed (THREE's dt for a centripetal segment)
const knots = (C) => C.points.reduce((K, p, i) => (i ? [...K, K[i - 1] + Math.pow(p.distanceToSquared(C.points[i - 1]), 0.25)] : [0]), []);
const KPOS = knots(POS);
const KLOOK = knots(LOOKC);
export const camU = {
  pos: monotone(CAM38.at.map((t, i) => [t, KPOS[i]]), [null, 0]),
  look: monotone(CAM38.at.map((t, i) => [t, KLOOK[i]]), [null, 0]),
};
// the point of curve C (knots K) at knot value k: getPoint's even parameter, segment by segment
function onCurve(C, K, k, out) {
  let i = 0;
  while (i < K.length - 2 && k > K[i + 1]) i++;
  return C.getPoint((i + clamp((k - K[i]) / (K[i + 1] - K[i]), 0, 1)) / (K.length - 1), out);
}
// where the camera is and looks at t (world)
export function camAt(t, out = { pos: new THREE.Vector3(), look: new THREE.Vector3() }) {
  onCurve(POS, KPOS, camU.pos(t), out.pos).applyMatrix4(FRAME38);
  onCurve(LOOKC, KLOOK, camU.look(t), out.look).applyMatrix4(FRAME38);
  return out;
}

// the rows' typing, row j: [t0, t1]
export const rowT = (j) => [T38.rows.t0 + j * T38.rows.step, T38.rows.t0 + j * T38.rows.step + T38.rows.dur];
const sm = (s) => s * s * (3 - 2 * s);

// The bead (card frame) at t: from the eye to the first field, typing each line, back to the next line's
// start between them; at the end of items[0] it drops to the card's top edge and runs it to the right (the
// edge lit behind it, edge[0..1] in mm along it); then it rides the seam's right end, going out into it.
// eyeC: the eye in the card frame; lines: the fields as drawData set them. Returns its light, 0..1.
export function beadAt(t, eyeC, lines, out, edge = [0, 0]) {
  const P = (x, y, z = 0.004) => cardPoint(x, y, z, out);
  const [l0, l1] = T38.leave;
  const ty = T38.type;
  const R = CARD38.R;
  edge[0] = edge[1] = 0;
  if (t <= l0) return out.copy(eyeC), 1;
  if (t < ty[0][0]) {
    const s = sm(clamp((t - l0) / (ty[0][0] - l0)));
    const a = eyeC.clone();
    P(lines[0].x, lines[0].mid);
    out.lerpVectors(a, out, s);
    out.z += 0.06 * Math.sin(Math.PI * s);
    return 1;
  }
  for (let j = 0; j < 4; j++) {
    const [t0, t1] = ty[j];
    const L = lines[j];
    if (t <= t1) {
      P(L.x + clamp((t - t0) / (t1 - t0)) * L.n * L.adv, L.mid);
      return 1;
    }
    if (j < 3 && t < ty[j + 1][0]) {
      const s = sm((t - t1) / (ty[j + 1][0] - t1));
      P(lerp(L.end, lines[j + 1].x, s), lerp(L.mid, lines[j + 1].mid, s));
      return 1;
    }
  }
  const [e0, e1] = T38.edge;
  const xe = lines[3].end;
  if (t < e1) {
    const s = (t - e0) / (e1 - e0);
    if (s < 0.3) {
      P(xe, lerp(lines[3].mid, 0, sm(s / 0.3)));
      return 1;
    }
    const v = sm((s - 0.3) / 0.7);
    edge[0] = lerp(xe, R, v);
    edge[1] = lerp(xe, CARD38.W - R, v);
    P(edge[1], 0);
    return 1;
  }
  edge[0] = R;
  edge[1] = CARD38.W - R;
  P(CARD38.W - R, seamAt(t));
  return 1 - smoothstep(e1, e1 + 0.1, t);
}

// Cue sheet (s into the shot; global frame = 3720 + 24 t). leave: the bead off the eye, to the first field;
// fields: each as it settles, the four typed (tool, q, min_stars, items[0]), then the card's six rows as the
// seam prints them (name, the film's language, the other, the tags, the stats, the attribution); unfold: from
// items[0] typed to the card whole; rows: the results under it as they are typed, those in the frame (the
// first two of the nine; the rest are typed on below it, out of the picture).
const r3 = (x) => +x.toFixed(3);
export const CUES = {
  cut: 0,
  leave: T38.leave,
  fields: [...T38.type.map((l) => r3(l[1])), ...FACE.bands.map((_, i) => r3(7 / 3 + i / 6))],
  unfold: [T38.edge[0], r3(T38.card)],
  card: r3(T38.card),
  rows: [T38.rows.t0, r3(rowT(T38.rows.seen - 1)[1])],
};

// the seam's light, 0..1: on as it leaves the top edge, out once it has run off the foot
export const seamLight = (t) => smoothstep(T38.edge[1] - 0.04, T38.edge[1] + 0.04, t) * (1 - smoothstep(T38.seam.at(-1)[0], T38.card, t));

// The cues recomputed from the shot's own motion (got) against CUES (want): the bead at each field's end,
// the seam over each band's centre, the seam's light gone, the last row in the frame typed.
function checkCues(lines) {
  const first = (f, a = 0, b = DUR) => {
    for (let t = a; t <= b; t += 1 / 480) if (f(t)) return r3(t);
    return null;
  };
  const p = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const typed = lines.map((L, j) => first((t) => beadAt(t, eye, lines, p) > 0 && t >= T38.type[j][0] && p.x >= cardPoint(L.end, 0).x - 1e-6 && Math.abs(p.y - cardPoint(0, L.mid).y) < 1e-6));
  const bands = FACE.bands.map((b) => first((t) => seamAt(t) >= b.c, T38.edge[1]));
  const got = {
    fields: [...typed, ...bands],
    unfold: [T38.edge[0], first((t) => t > T38.edge[1] && seamLight(t) === 0, T38.edge[1])],
    card: first((t) => t > T38.edge[1] && seamLight(t) === 0, T38.edge[1]),
    rows: [rowT(0)[0], r3(rowT(T38.rows.seen - 1)[1])],
  };
  const bad = [];
  const near = (a, b) => Math.abs(a - b) <= 1 / 240 + 1e-9;
  got.fields.forEach((g, i) => !near(g, CUES.fields[i]) && bad.push(`fields[${i}] ${g} vs ${CUES.fields[i]}`));
  if (!near(got.card, CUES.card)) bad.push(`card ${got.card} vs ${CUES.card}`);
  return { got, want: CUES, bad };
}

// ---------------------------------------------------------------------------------------------- setup

// Everything s38 and s39 share: the return, the card's face for a language, its masks and the data's.
export async function loadCard38(ctx, lang = ctx.lang) {
  const json = await ctx.load.json('/assets/ui/s38-result.json');
  const spec = specOf(json.items[0]);
  const L = await layoutFace(spec, lang, json.attribution);
  const ppm = 10;
  const tex = (cv) => canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 });
  const A = faceCanvas(ppm);
  drawFaceA(A, L, ppm);
  const B = faceCanvas(ppm);
  drawFaceB(B, L, ppm);
  const fields = await drawData(fieldsOf(json), DATA.fields, 6);
  const rows = await drawData(rowsOf(json), DATA.rows, 6);
  return { json, spec, L, faceA: tex(A), faceB: tex(B), fields: { ...fields, tex: tex(fields.canvas) }, rows: { ...rows, tex: tex(rows.canvas) } };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 900);
  const K = PLACE.K;
  const lib = new Library({ floors: [K - 12, K + 3], near: 2, mid: 10, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK17.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = LOOK38.fog;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  const dust = new Dust({ uniforms: U, count: LOOK38.dust.count, box: 12, seed: 38 });
  scene.add(dust.points);
  const reader = new AgentBody({ detail: 'hero', seed: READER.seed, uniforms: U, width: ctx.width, height: ctx.height });
  scene.add(reader.group);

  // the card, the fields over it, the rows under it, in the card's frame: the card in the scene, the data's
  // light in the overlay (added after the depth of field, so sharp over the blur; see buildData), in a twin
  // of the frame. Nothing stands between it and the camera.
  const D = await loadCard38(ctx);
  const frame = new THREE.Group();
  frame.position.setFromMatrixPosition(FRAME38);
  frame.quaternion.setFromRotationMatrix(FRAME38);
  scene.add(frame);
  const overlay = new THREE.Scene();
  const oframe = new THREE.Group();
  oframe.position.copy(frame.position);
  oframe.quaternion.copy(frame.quaternion);
  overlay.add(oframe);
  const card = buildCard({ U, faceA: D.faceA, faceB: D.faceB, look: LOOK38 });
  const fields = buildData({ U, tex: D.fields.tex, D: DATA.fields, lines: D.fields.lines });
  const rows = buildData({ U, tex: D.rows.tex, D: DATA.rows, lines: D.rows.lines });
  frame.add(card.mesh);
  oframe.add(fields.mesh, rows.mesh);
  frame.updateMatrixWorld(true);
  oframe.updateMatrixWorld(true);
  const cu = card.u;
  cu.uGlow.value = LOOK38.glow;
  cu.uHeat.value = LOOK38.heat;
  cu.uKeyPos.value.set(...KEY38.pos).applyMatrix4(FRAME38);
  cu.uKeyCol.value.set(...KEY38.col).multiplyScalar(KEY38.I * LOOK38.key);
  cu.uHot.value.set(...LOOK38.hot);
  T38.type.forEach(([t0, t1], j) => fields.u.uLn.value[j].set(t0, t1, D.fields.lines[j].n, 0));
  D.rows.lines.forEach((l, j) => rows.u.uLn.value[j].set(...rowT(j), l.n, LOOK38.data.rows * (1 - 0.07 * j)));
  fields.u.uKey.value.set(0, LOOK38.data.hot, LOOK38.data.cool);
  rows.u.uKey.value.set(0, LOOK38.data.rowsHot, LOOK38.data.cool);

  // light: the thread, the seam, the top edge (lines); the bead (a point)
  const lu = lightUniforms({ uniforms: U, width: ctx.width, height: ctx.height });
  const lines = new LightLines(4, lu);
  const points = new LightPoints(2, lu);
  scene.add(...lines.meshes, ...points.meshes);

  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const inv = FRAME38.clone().invert();
  const body = W(...READER.pos);
  const face = new THREE.Vector3();
  const FACES = [W(-0.35, -0.9, 0.1), W(-0.12, 0.25, 0), W(0.04, 0.02, 0)]; // down where it came from, the fields, the card
  const eye = new THREE.Vector3();
  const eyeC = new THREE.Vector3();
  const bead = new THREE.Vector3();
  const edge = [0, 0];
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const mid = W(0, 0, 0);
  const key = { pos: new THREE.Vector3(), col: new THREE.Color() };
  const cc = checkCues(D.fields.lines);
  if (cc.bad.length) console.warn(`[s38] CUES off: ${cc.bad.join('; ')}`);
  let focus = 1;

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    overlay,
    update(t) {
      camAt(t, cam);
      setLens(camera, CAM38.mm);
      aim(camera, cam.pos, cam.look);
      lib.update(camera);
      U.uTime.value = t;

      // the reader: looking down the shaft where the light came from, up at the fields, at the card
      face.copy(FACES[0]).lerp(FACES[1], smoothstep(0.05, 0.5, t)).lerp(FACES[2], smoothstep(2, 3, t));
      reader.set({ time: READER.time + t, pos: body.toArray(), face: face.toArray(), glow: LOOK38.reader.glow });
      reader.update(camera);
      reader.anchor('eye', eye);
      eyeC.copy(eye).applyMatrix4(inv);
      const bl = beadAt(t, eyeC, D.fields.lines, bead, edge);
      bead.applyMatrix4(FRAME38);
      let nl = 0;
      let np = 0;

      // the thread: the return light's way up the shaft from the lens (floor -100, on the axis), falling away
      const th = clamp((t - T38.thread[0]) / (T38.thread[1] - T38.thread[0]));
      if (th < 1) {
        B.set(0, -100 * LIB.H, 0).sub(eye).normalize();
        A.copy(eye).addScaledVector(B, 0.03 + 30 * th * th);
        B.multiplyScalar(LOOK38.thread.len).add(eye);
        const e = LOOK38.thread.I * (1 - th) ** 2;
        lines.set(nl++, A, B, cA.copy(LIME).multiplyScalar(e), cB.copy(LIME).multiplyScalar(e * 0.25), LOOK38.thread.w, LOOK38.thread.w, 1, 1, 0.3, 5);
      }

      // the top edge lit as the bead runs it, then the seam coming down the card (inset at the corners)
      const on = 1 - smoothstep(T38.seam.at(-1)[0], T38.card, t);
      if (edge[1] > edge[0] && on > 0) {
        const R = CARD38.R;
        const running = t < T38.edge[1];
        const y = running ? 0 : seamAt(t);
        const r = Math.max(R - y, y - (CARD38.H - R), 0);
        const ins = R - Math.sqrt(Math.max(R * R - r * r, 0));
        cardPoint(running ? edge[0] : ins, y, 0.002, A).applyMatrix4(FRAME38);
        cardPoint(running ? edge[1] : CARD38.W - ins, y, 0.002, B).applyMatrix4(FRAME38);
        cA.copy(LIME).multiplyScalar(LOOK38.seam.I * on);
        lines.set(nl++, A, B, cA, cA, LOOK38.seam.w, LOOK38.seam.w, 1, 1, 0.4, 5);
      }
      lines.commit(nl);

      // the bead, still hot from the impact as it leaves the eye; a white-hot core
      const be = LOOK38.bead.I * bl * (1 + LOOK38.bead.hit * Math.exp(-(t - T38.hit[0]) / LOOK38.bead.tau) * (1 - smoothstep(T38.hit[1] - 0.15, T38.hit[1], t)));
      if (be > 1e-3) {
        points.set(np++, bead, cA.copy(LIME).multiplyScalar(be), LOOK38.bead.r, LOOK38.bead.halo, LOOK38.bead.haloR);
        points.set(np++, bead, cB.copy(LIME).lerp(WHITE, 0.45).multiplyScalar(0.5 * be), 0.4 * LOOK38.bead.r, 0, 4);
      }
      points.commit(np);

      // the card: printed down to the seam, then whole; the paper by the seam lit; its light
      const sl = seamLight(t);
      cu.uSeam.value.set(t < T38.edge[1] ? -1 : t < T38.card ? seamAt(t) : 1e4, LOOK38.spill[0] * sl, LOOK38.spill[1]);
      cu.uHot.value.set(LOOK38.hot[0] * sl, LOOK38.hot[1], LOOK38.hot[2] * sl, LOOK38.hot[3]);
      reader.light(key);
      cu.uAgPos.value.copy(key.pos);
      cu.uAgCol.value.set(key.col.r, key.col.g, key.col.b).multiplyScalar(LOOK38.reader.light);

      // the data: typed; the fields over the card down to a glimmer, items[0] staying as its label
      fields.u.uKey.value.x = t;
      rows.u.uKey.value.x = t;
      const dim = smoothstep(T38.dim[0], T38.dim[1], t);
      for (let j = 0; j < 4; j++) fields.u.uLn.value[j].w = lerp(LOOK38.data.steady, j < 3 ? LOOK38.data.dim : LOOK38.data.label, dim);

      // the dust in the reader's light; the focus on the bead, then the card
      dust.uniforms.uKeyPos.value.copy(key.pos);
      dust.uniforms.uKeyCol.value.copy(key.col);
      dust.uniforms.uG.value = LOOK38.dust.g;
      focus = lerp(focusDistance(camera, bead), focusDistance(camera, mid), smoothstep(2, 2.6, t));
      dust.update(camera, t, { focus, fstop: CAM38.fstop, width: ctx.width, intensity: LOOK38.dust.I });
    },
    post() {
      return { dof: { focus, fstop: CAM38.fstop } };
    },
    // for s39, which opens on this shot's last frame: update(DUR + t) carries it on (nothing moves by then
    // but the dust)
    parts: { frame, oframe, overlay, card, fields, rows, reader, lib, dust, D },
  };
}
