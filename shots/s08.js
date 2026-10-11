// s08 · 0:21–0:27 · 光印新书 (global 504–647) · card c2 「每一天，人与机器写下的，都比前一天更多。」
// The flood, close up — and what it is made of: repositories. In an empty slot of an old shelf a cold
// line of light ignites on the board and climbs, and where it has passed a new volume stands: tall,
// uniform, steel-blue cloth, its spine printed, not tooled — ottervale/mcp-server. Beside it an old
// vellum copy of AS WE MAY THINK (Bush, 1945: the first essay about drowning in what has been written);
// around them old calf with raised bands. Then the next repository, and the next, each sooner and
// quicker than the last; the camera backs away and the lines are in the gaps on both shelves, faster
// than anyone could read them — new repositories by the hundred, a paper here and there, and slots
// still empty at the cut: the typing turns to rain. The site exists for exactly this: its core is the
// project library that keeps up with these shelves (s19, s21, s22; the first title plants the
// "mcp server" search of s22).
// First frame: hard cut from s07's falling pages: 50 mm, 1.1 m from the empty slot, the spines of
// row 2 filling the band from the board up, lamp light from the upper right.
// Last frame: 3.4 m back, rows 1 and 2 of side 4 (floor 0), the card in the dark between them, prints
// still racing in the gaps; cut to s09.
// Camera: motion control, no handheld (the machine's shot). Locked off while the first volume prints;
// a slow pull while the five follow (the card stays under their titles); then a pull back and down that
// accelerates with the print rate (distance eased in log space) and is still moving at the cut. Yawed
// 10° so the shelf runs away to the right. Focus on the wall, f/4.
// Light: the gallery lamps of side 4 (amber), the right-hand one outside frame right. The print line is
// steel (machine) and stays below clipping; a small steel key rides the first volume's front so its
// neighbours catch it.
// Sound: CUES.prints (every print: start, duration, place) for the typing; CUES.first.keys is the first
// front crossing each letter of its title (the first keystrokes). The flood keeps more and more fronts
// climbing in frame at once: one at 3 s, about fifteen at the cut.
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { rng } from 'film/lib/rng.js';
import { lin, HEX } from 'film/lib/palette.js';
import { libraryUniforms } from 'world/libshader.js';
import { BookShelf, layoutShelf, bookLabels, book, compartment, BIND, GROUND, LEATHERS, VELLUM, TITLE_CELL } from 'world/bookshelf.js';

export const meta = { frames: 144 };

// side 4 of floor 0, the board of row 2 (world y 1.775); the right-hand gallery lamp of side 4 hangs
// 2 m to the right, 2.5 m up and 4 m out
export const ORIGIN = new THREE.Vector3(2.6, 1.775, -18.6);
const ROW = 0.71;
const X0 = -1.15;
const X1 = 2.45;
const ROWS = [
  { y: -ROW, classes: ['folio'] }, // row 1: the folios
  { y: 0, classes: ['folio', 'quarto', 'quarto', 'octavo', 'octavo', 'small'] }, // row 2
];
const LOW = 0;
const MID = 1;
const CUT = 6.0;

// The 32 spine titles: six old ones for the old cloth and vellum, the rest new ones in mono — invented
// repositories (no real names), stars where a repository has any (either side of the 500 that s19's
// gate asks for), and a few papers.
const OLD = { fam: 'garamond', weight: 600, tracking: 0.1 };
const NEW = { fam: 'mono', weight: 500, tracking: 0.02, size: 0.46 };
const STRIPS = [
  { text: 'AS WE MAY THINK', ...OLD, size: 0.5 },
  { text: 'THE LIBRARY OF BABEL', ...OLD },
  { text: 'COMPUTING MACHINERY AND INTELLIGENCE', ...OLD },
  '四庫全書總目',
  { text: 'A MATHEMATICAL THEORY OF COMMUNICATION', ...OLD },
  { text: 'INFORMATION RETRIEVAL', ...OLD },
  { text: 'ottervale/mcp-server', ...NEW },
  { text: 'quillmesh/agent-loop ★ 38', ...NEW },
  { text: 'brightfern/rag-kit ★ 1.2k', ...NEW },
  { text: 'copperkite/llm-eval ★ 7', ...NEW },
  { text: 'mossgrid/code-agent ★ 512', ...NEW },
  { text: 'tidewren/vision-7b ★ 96', ...NEW },
  { text: 'emberwick/prompt-cache', ...NEW },
  { text: 'saltwick/infer-rs ★ 2.4k', ...NEW },
  { text: 'fogharbor/tts-lite ★ 21', ...NEW },
  { text: 'arXiv:2610.04417', ...NEW },
  { text: 'larkspur/vector-store ★ 3.1k', ...NEW },
  { text: 'hollowfen/diffusion-ui ★ 870', ...NEW },
  { text: 'thornbury/lora-merge ★ 19', ...NEW },
  { text: 'quietmere/kv-cache ★ 205', ...NEW },
  { text: 'ravenmoor/agent-bench ★ 1.6k', ...NEW },
  { text: 'wickfield/tokenizer ★ 44', ...NEW },
  { text: 'amberlane/doc-qa', ...NEW },
  { text: 'stonebrook/robot-policy ★ 330', ...NEW },
  { text: 'glimmerfall/text2video ★ 4.8k', ...NEW },
  { text: 'cindervale/mcp-tools ★ 150', ...NEW },
  { text: 'oakhaven/sft-recipes ★ 57', ...NEW },
  { text: 'rookfield/rerank ★ 12', ...NEW },
  { text: 'arXiv:2610.05128', ...NEW },
  { text: 'driftmoor/speech-kit ★ 640', ...NEW },
  { text: 'arXiv:2610.03391', ...NEW },
  { text: 'brackenhill/mcp-gateway ★ 2', ...NEW },
];
const N_OLD = 6;
const FIRST = 6; // the first volume's title
const TYPED = [7, 8, 9, 10, 11]; // the run that follows it

// a new volume: one tall format, one cloth, printed titles; only the thickness varies with the content
const NEW_CLOTH = [0.03, 0.045, 0.07];
const NEW_H = 0.4;
function newVolume(o) {
  return book({ bind: BIND.CLOTH, h: NEW_H, d: 0.25, col: NEW_CLOTH, wear: 0, dust: 0, bands: 0, ink: 1, print: 0, ...o });
}

// The old calf either side of the first volume: raised bands, the lettering pieces high up (above the
// frame until the camera backs away).
function neighbour(o) {
  const b = book({ bind: BIND.LEATHER, bands: 6, dust: 0.4, edgeGilt: 1, ...o });
  const [y0, y1] = compartment(b.h, b.bands, b.bands - 2);
  b.label = { cell: TITLE_CELL[o.title], y0, y1, ground: o.ground };
  return b;
}
const LEFT = [
  { w: 0.05, h: 0.44, d: 0.28, col: LEATHERS[3], title: 'NOTES BY A.A.L.', ground: GROUND.RED, wear: 0.5, seed: 0.21 },
  { w: 0.068, h: 0.455, d: 0.3, col: LEATHERS[0], title: 'ANALYTICAL ENGINE', ground: GROUND.BLACK, wear: 0.4, seed: 0.47 },
  { w: 0.046, h: 0.43, d: 0.27, col: LEATHERS[5], title: 'COMPUTING MACHINERY', ground: GROUND.RED, wear: 0.6, seed: 0.66 },
  { w: 0.06, h: 0.45, d: 0.29, col: LEATHERS[9], title: 'THEORY OF COMMUNICATION', ground: GROUND.BLACK, wear: 0.45, seed: 0.83 },
];
const RIGHT = [
  { w: 0.07, h: 0.455, d: 0.31, col: LEATHERS[4], title: 'CATALOGUS', ground: GROUND.BLACK, wear: 0.35, seed: 0.12 },
  { w: 0.052, h: 0.435, d: 0.28, col: LEATHERS[2], title: 'INDEX LIBRORUM', ground: GROUND.RED, wear: 0.55, seed: 0.58 },
];

// Where the new volumes go. Pure: everything comes from one seed.
export function plan() {
  const r = rng(808);
  const fixed = [];
  const news = [];
  const widthOf = () => [0.026, 0.03, 0.034, 0.04][Math.floor(r() * 4)];
  const place = (b, row) => {
    b.row = row;
    fixed.push(b);
    return b;
  };
  // a new volume with its left edge at x; returns the next left edge
  const volume = (row, x, w, strip, always = false) => {
    const n = { b: newVolume({ x: x + w / 2, w, seed: r(), strip }), row, x: x + w / 2, y: ROWS[row].y };
    if (always || seenFrom(n) < CUT) {
      place(n.b, row);
      news.push(n);
    }
    return x + w + 0.0012;
  };
  // the first volume between the vellum and the old calf, the five that follow, more calf
  const V = place(book({ x: -0.0402, w: 0.042, h: 0.4, d: 0.25, bind: BIND.VELLUM, col: VELLUM, bands: 0, strip: 0, wear: 0.45, seed: 0.37, dust: 0.35 }), MID);
  let left = V.x - V.w / 2 - 0.0012;
  for (const o of LEFT) {
    place(neighbour({ ...o, x: left - o.w / 2 }), MID);
    left -= o.w + 0.0012;
  }
  let x = volume(MID, -0.018, 0.036, FIRST, true);
  for (const s of TYPED) x = volume(MID, x, widthOf(), s, true);
  for (const o of RIGHT) {
    place(neighbour({ ...o, x: x + o.w / 2 }), MID);
    x += o.w + 0.0012;
  }
  const hand = [left - 0.02, x + 0.02];
  // the rest: gaps along both rows, crowding outwards from either end of the hand, only where the
  // camera will see them
  for (const row of [LOW, MID]) {
    x = X0 + r() * 0.1;
    for (;;) {
      // row 2 crowds from the edges of the hand outwards; row 1 is all crowd
      const out = row === MID ? Math.max(0, x - hand[1], hand[0] - x) : 1;
      const far = smoothstep(0, 0.4, out);
      x += lerp(0.14, 0.03, far) * (0.5 + r());
      const n = Math.max(1, Math.round(lerp(4, 12, far) * (0.5 + r())));
      if (row === MID && x + n * 0.042 > hand[0] && x < hand[1]) x = hand[1];
      if (x + n * 0.042 > X1 - 0.02) break;
      for (let k = 0; k < n; k++) x = volume(row, x, widthOf(), FIRST + 1 + Math.floor(r() * (STRIPS.length - 1 - FIRST)));
      x += 0.0012;
    }
  }
  return { fixed, news, V };
}

// When each volume prints: the first alone (1.25 s); five more one after another, each sooner and
// quicker; then the flood. Its measure is how many fronts are climbing at once: one at 2.2 s, growing
// exponentially to RACE at the cut. Every frame, enough gaps that are in view (or about to come into
// view) ignite to keep that many going, chosen at random among them, each print quicker than the
// last. It runs on past the cut, so the gaps it has not reached yet are still empty when it comes.
const FIRST_T0 = 0.25;
const FIRST_DUR = 1.25;
const TYPED_T0 = [1.38, 1.98, 2.42, 2.76, 3.02];
const TYPED_DUR = [0.78, 0.6, 0.46, 0.36, 0.3];
const FLOOD_T0 = 3.0;
const RACE = 16;
const DUR = [0.5, 0.28];
const DUR_T = 4.4; // prints hold their pace to here, then quicken to the cut

function schedule(news) {
  news[0].t0 = FIRST_T0;
  news[0].dur = FIRST_DUR;
  TYPED.forEach((_, k) => {
    news[1 + k].t0 = TYPED_T0[k];
    news[1 + k].dur = TYPED_DUR[k];
  });
  const rest = news.slice(1 + TYPED.length);
  const r = rng(909);
  for (const n of rest) {
    n.seen = seenFrom(n);
    n.t0 = Infinity;
    n.dur = DUR[1];
  }
  for (let f = Math.round(FLOOD_T0 * 24); f < (CUT + 1) * 24; f++) {
    const t = f / 24;
    const want = Math.exp((Math.log(RACE) * (t - FLOOD_T0)) / (CUT - FLOOD_T0));
    const dur = lerp(DUR[0], DUR[1], smoothstep(DUR_T, CUT, t));
    let active = rest.filter((n) => climbing(n, t)).length;
    const cand = rest.filter((n) => n.t0 === Infinity && n.seen <= t + 0.25);
    while (active < want && cand.length) {
      const n = cand.splice(Math.floor(r() * cand.length), 1)[0];
      // a gap whose foot is below the frame ignites with its front at the bottom edge: what is under
      // it printed out of sight
      const p0 = clamp((band(n.x, t).lo - n.y + 0.01) / (NEW_H + 0.02), 0, 0.8);
      n.dur = dur * (0.85 + 0.3 * r());
      n.t0 = t + r() / 24 - p0 * n.dur;
      active++;
    }
  }
}

// ------------------------------------------------------------------------------------ camera

const YAW = (10 * Math.PI) / 180;
const D0 = 1.1;
const D1 = 3.4;
const LN = Math.log(D1 / D0);
// ln(distance) travelled by t: the speed eases up from rest at 1.2 s to VMAX at 4.6 s and holds it to
// the cut (∫ smoothstep = half its span), scaled so the cut lands on D1
const MOVE = [1.2, 4.6];
const VMAX = LN / (CUT - (MOVE[0] + MOVE[1]) / 2);
function travel(t) {
  const a = clamp((t - MOVE[0]) / (MOVE[1] - MOVE[0]));
  return VMAX * ((MOVE[1] - MOVE[0]) * (a ** 3 - a ** 4 / 2) + Math.max(0, t - MOVE[1]));
}

// shelf-local camera, aim point (on the wall) and focus distance at time t. The card sits just above
// the aim point: the aim stays low enough that it clears the titles of the first six (whose lettering
// runs 0.15–0.29 m up the spine), high enough that the board is the bottom of the frame; then it sinks
// to the dark between rows 1 and 2.
export function rig(t) {
  const L = travel(t);
  const q = L / LN;
  const d = D0 * Math.exp(L);
  const tx = lerp(0.02, 0.45, q);
  const ty = 0.128 - 0.012 * smoothstep(0, 0.1, q) - 0.276 * smoothstep(0.2, 1, q);
  const cam = [tx - d * Math.sin(YAW), ty + 0.04 * d, d * Math.cos(YAW)];
  return { cam, tgt: [tx, ty, 0], focus: d * Math.hypot(1, 0.04) };
}

// What the frame holds on the wall at x, time t: whether x is inside it across, and the band's lower and
// upper edge there (shelf y). A pinhole in the camera's plane, pitched down onto the aim point.
const HALF_W = 18 / 50; // 50 mm on a 36 mm gate
function band(x, t) {
  const { cam, tgt } = rig(t);
  const fx = tgt[0] - cam[0];
  const fz = tgt[2] - cam[2];
  const L = Math.hypot(fx, fz);
  const px = x - cam[0];
  const pz = -cam[2];
  const depth = (px * fx + pz * fz) / L;
  const across = (px * -fz + pz * fx) / L;
  const mid = cam[1] + ((tgt[1] - cam[1]) * depth) / L;
  const h = ((HALF_W / 2.39) * depth * Math.hypot(L, tgt[1] - cam[1])) / L;
  return { inX: depth > 0 && Math.abs(across) < HALF_W * depth * 0.95, lo: mid - h, hi: mid + h };
}

// the first moment a few centimetres of a gap's height, where a print line can climb, are in frame
function seenFrom(n) {
  for (let t = 0; t <= CUT; t += 1 / 24) {
    const b = band(n.x, t);
    if (b.inX && n.y + NEW_H - 0.04 > b.lo && n.y + 0.04 < b.hi) return t;
  }
  return 99;
}

// a volume's print front at t, and whether it is climbing in frame
const frontOf = (n, t) => n.y + clamp((t - n.t0) / n.dur) * (NEW_H + 0.02) - 0.01;
function climbing(n, t) {
  if (!(n.t0 <= t && t < n.t0 + n.dur)) return false;
  const b = band(n.x, t);
  const y = frontOf(n, t);
  return b.inX && y > b.lo && y < b.hi;
}

// ------------------------------------------------------------------------------------ cues

const P = plan();
schedule(P.news);
const order = P.news.filter((n) => n.t0 < CUT).sort((a, b) => a.t0 - b.t0);

// the first title's letters, from the bottom of the spine up, as the front passes them (mono: equal
// advances; the strip is 2048 × 128, the text set at NEW.size of its height and centred)
function letterTimes() {
  const text = STRIPS[FIRST].text;
  const n = [...text].length;
  const s = 128 * NEW.size;
  const adv = 0.6 * s + NEW.tracking * s;
  const w = n * adv - NEW.tracking * s;
  const h = NEW_H;
  const yA = 0.17 * h;
  const yB = h - 0.028;
  const len = yB - yA;
  const yc = (yA + yB) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (text[i] === ' ') continue;
    const lu = (1024 - w / 2 + (i + 0.5) * adv) / 2048;
    const y = yc + (0.5 - lu) * len;
    out.push(FIRST_T0 + ((y + 0.01) / (h + 0.02)) * FIRST_DUR);
  }
  return out.sort((a, b) => a - b);
}

export const CUES = {
  prints: order.map((n) => ({ t: +n.t0.toFixed(3), dur: +n.dur.toFixed(3), x: +n.x.toFixed(3), y: n.y })),
  first: { t0: FIRST_T0, dur: FIRST_DUR, keys: letterTimes().map((t) => +t.toFixed(3)) },
};

// ------------------------------------------------------------------------------------ setup

export async function setup() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 60);
  const U = libraryUniforms();
  U.uLampI.value = 12;
  U.uFogD.value = 0.009;

  const labels = await bookLabels({ strips: STRIPS });
  const layout = layoutShelf({ seed: 18, x0: X0, x1: X1, rows: ROWS, fixed: P.fixed });
  // old cloth and vellum take one of the six old titles
  for (const b of layout.books) if (!b.ink && b.strip >= N_OLD) b.strip %= N_OLD;
  const shelf = new BookShelf({ uniforms: U, layout, labels });
  shelf.uniforms.uBackLit.value = 1;
  shelf.group.position.copy(ORIGIN);
  scene.add(shelf.group);
  const index = new Map(layout.books.map((b, i) => [b, i]));
  const live = P.news.map((n) => ({ i: index.get(n.b), n }));

  const STEEL = lin(HEX.steel);
  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const key = new THREE.Vector3();
  const kc = new THREE.Color();
  const first = P.news[0];

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      setLens(camera, 50);
      const r = rig(t);
      aim(camera, pos.fromArray(r.cam).add(ORIGIN), tgt.fromArray(r.tgt).add(ORIGIN));
      for (const { i, n } of live) shelf.set(i, { print: clamp((t - n.t0) / n.dur) });
      shelf.commit();
      // the print line: steel, eased in at the first ignition
      shelf.uniforms.uPrintCol.value.copy(STEEL).multiplyScalar(0.8 * smoothstep(FIRST_T0, FIRST_T0 + 0.15, t));
      // a key at the first volume's front, 2 cm proud of its spine, while it prints (any closer and the
      // pale ink of the title just under the front goes white)
      const p = clamp((t - first.t0) / first.dur);
      const front = p * (NEW_H + 0.02) - 0.01;
      key.set(first.x, Math.max(front, 0.004), 0.02).add(ORIGIN);
      const on = smoothstep(first.t0, first.t0 + 0.12, t) * (1 - smoothstep(first.t0 + first.dur - 0.1, first.t0 + first.dur + 0.25, t));
      shelf.key(key, kc.copy(STEEL).multiplyScalar(0.0008 * on), 0.012);
      shelf.update(t);
    },
    post: (t) => ({
      dof: { focus: rig(t).focus, fstop: 4, maxBlur: 0.02 },
    }),
  };
}
