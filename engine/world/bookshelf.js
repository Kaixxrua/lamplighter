// Books for close-ups: a shelf of modelled volumes — rounded leather spines with raised bands, gilt
// tooling and lettering pieces; limp vellum lettered in ink; cloth with titles running down the spine;
// page blocks, gilt edges and dust seen from above — lit like the rest of the library (lamps, scan
// line, lantern spill, fog) plus an optional key light of the shot's own (a reader's candle, the
// printing light) that the neighbouring volumes shadow.
//
// The library paints its far books on the walls (libshader books()); this module is for shots that
// come within arm's length of a shelf: s03 s04 s08 s29 s32–s34 s40 s41.
//
// Shelf-local frame: x along the shelf, y up from the top of the board the books stand on, z out of
// the wall toward the reader. Spines face +z with their crests near z = 0. Put `shelf.group` in the
// world; rows are boards at heights rows[i].y.
//
// Every volume owns a row of a float texture (TEXELS texels): transform (so a shot can take a book
// down, open a gap or stack books), dimensions, binding, colour, labels and live state (printed
// amount, glow, lime, dust). set(i, {...}) then commit(); keep the shot's update(t) pure in t.
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { rng } from '../runtime/lib/rng.js';
import { loadFonts, font, makeCanvas, canvasTexture, drawTracked } from '../runtime/lib/text.js';

export const BIND = { LEATHER: 0, VELLUM: 1, CLOTH: 2 };
// Label grounds: a leather lettering piece (red, black, green, tan), or lettering straight on the
// binding, in ink (vellum) or in gilt.
export const GROUND = { RED: 0, BLACK: 1, GREEN: 2, TAN: 3, INK: 4, GILT: 5 };
export const PART = { SPINE: 0, BOARD: 1, PAGES: 2, CAP: 3, SHELF: 4, BACK: 5 };

const TEXELS = 9;
const BW = 0.0045; // raised band half-width (m)
const BH = 0.0024; // raised band height
const SQ = 0.003; // squares: how far the boards stand beyond the page block
export const SHELF = { BOARD: 0.035, DEPTH: 0.42, FRONT: 0.02, ROW: 0.71, CLEAR: 0.675 };

// ------------------------------------------------------------------------------------ layout

const SIZE = {
  folio: { h: [0.37, 0.46], w: [0.045, 0.085], d: [0.26, 0.32] },
  quarto: { h: [0.27, 0.33], w: [0.032, 0.06], d: [0.2, 0.245] },
  octavo: { h: [0.195, 0.245], w: [0.022, 0.045], d: [0.13, 0.165] },
  small: { h: [0.15, 0.175], w: [0.016, 0.03], d: [0.1, 0.12] },
};
export const LEATHERS = [
  [0.105, 0.052, 0.026], // brown calf
  [0.105, 0.052, 0.026],
  [0.13, 0.068, 0.034],
  [0.2, 0.11, 0.05], // tan calf
  [0.16, 0.028, 0.02], // red morocco
  [0.025, 0.055, 0.035], // green morocco
  [0.014, 0.012, 0.011], // black
  [0.07, 0.065, 0.03], // olive
  [0.06, 0.03, 0.018], // dark brown
  [0.09, 0.035, 0.02], // russia
];
export const CLOTHS = [
  [0.02, 0.026, 0.06],
  [0.09, 0.02, 0.025],
  [0.025, 0.045, 0.03],
  [0.13, 0.1, 0.06],
  [0.03, 0.03, 0.032],
];
export const VELLUM = [0.4, 0.33, 0.22];

// Raised bands of a leather spine (n = 0: a smooth spine).
export function bandsOf(h, n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(h * (0.17 + (0.66 * k) / Math.max(n - 1, 1)));
  return out;
}

// The compartment between band k and band k+1, inset from both: [y0, y1].
export function compartment(h, n, k, inset = 0.0035) {
  const b = bandsOf(h, n);
  return [b[k] + BW + inset, b[k + 1] - BW - inset];
}

const SEG = (detail) => (detail >= 1 ? 22 : 12); // spine profile segments (φ from -π/2 to π/2)
const sagitta = (bind, w) => (bind === BIND.LEATHER ? 0.17 : bind === BIND.CLOTH ? 0.12 : 0.1) * w;

// Arc length from the spine's crest to its edge, along the same polyline the geometry uses.
export function halfArcOf(w, s, detail = 1) {
  const n = SEG(detail);
  let L = 0;
  let px = 0;
  let pz = 0;
  for (let i = n / 2 + 1; i <= n; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / n;
    const x = (w / 2) * Math.sin(phi);
    const z = -s * (1 - Math.cos(phi));
    L += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return L;
}

// A book record with defaults; `o` overrides any field.
export function book(o = {}) {
  const b = {
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    q: new THREE.Quaternion(),
    w: 0.04,
    h: 0.25,
    d: 0.16,
    bind: BIND.LEATHER,
    seed: 0.5,
    wear: 0.4,
    bands: 5,
    col: LEATHERS[0],
    label: null, // { cell (0..63 atlas, 100/101 hero A/B), y0, y1, ground }
    label2: null, // { cell, y0, y1, ground }
    strip: -1, // vertical title strip (cloth, vellum)
    print: 1,
    glow: 0,
    glowHue: 0,
    dust: 0.25,
    edgeGilt: 0,
    lime: 0,
    ink: 0, // cloth titles: 0 tooled in gilt, 1 printed in pale ink (a new, machine-made volume)
    detail: 1,
    ...o,
  };
  b.s = o.s ?? sagitta(b.bind, b.w);
  b.halfArc = halfArcOf(b.w, b.s, b.detail);
  return b;
}

// Title and volume labels for a generic volume, given its binding and the rng.
function dress(b, r, set) {
  const n = b.bands;
  if (b.bind === BIND.LEATHER) {
    if (n >= 4) {
      const lab = r() < 0.78 || set;
      if (lab) {
        const [y0, y1] = compartment(b.h, n, n - 2);
        b.label = { cell: set ? set.cell : r.int(0, 47), y0, y1, ground: set ? set.ground : r.pick([0, 0, 1, 1, 2, 3]) };
        if (set || r() < 0.3) {
          const [c0, c1] = compartment(b.h, n, n - 3);
          const m = (c1 - c0) * 0.2;
          b.label2 = { cell: 48 + (set ? set.vol % 16 : r.int(0, 15)), y0: c0 + m, y1: c1 - m, ground: b.label.ground === 0 ? 1 : 0 };
        }
      }
    } else {
      b.label = { cell: set ? set.cell : r.int(0, 47), y0: b.h * 0.7, y1: b.h * 0.79, ground: GROUND.GILT };
    }
  } else if (b.bind === BIND.CLOTH) {
    if (r() < 0.8) b.strip = r.int(0, 15);
    else b.label = { cell: r.int(0, 47), y0: b.h * 0.72, y1: b.h * 0.84, ground: GROUND.GILT };
  } else {
    if (r() < 0.6) b.strip = r.int(0, 15);
    else b.label = { cell: r.int(0, 47), y0: b.h * 0.66, y1: b.h * 0.8, ground: GROUND.INK };
  }
}

const CLASSES = ['folio', 'quarto', 'quarto', 'octavo', 'octavo', 'octavo', 'small'];

function randomRun(r, x, row, budget, detail) {
  const out = [];
  const isSet = r() < 0.32;
  const cls = r.pick(row.classes ?? CLASSES);
  const bindRoll = r();
  const bind = bindRoll < 0.68 ? BIND.LEATHER : bindRoll < 0.78 ? BIND.VELLUM : BIND.CLOTH;
  const S = SIZE[cls];
  const count = isSet ? (bind === BIND.VELLUM ? r.int(2, 3) : r.int(3, 10)) : 1;
  const base = {
    h: r.range(...S.h),
    w: r.range(...S.w),
    d: r.range(...S.d),
    col: bind === BIND.LEATHER ? r.pick(LEATHERS) : bind === BIND.CLOTH ? r.pick(CLOTHS) : VELLUM,
    bands: bind === BIND.LEATHER ? (r() < 0.82 ? r.pick([4, 5, 5, 5, 6]) : 0) : 0,
    wear: r.range(0.2, 0.85),
    cell: r.int(0, 47),
    ground: r.pick([0, 0, 1, 1, 2, 3]),
  };
  const vol0 = r.int(0, 6);
  for (let k = 0; k < count && budget > 0.01; k++) {
    const w = isSet ? base.w * r.range(0.9, 1.1) : base.w;
    if (w > budget) break;
    const b = book({
      x: x + w / 2,
      y: row.y,
      z: r() < 0.06 ? -r.range(0.012, 0.035) : r.range(-0.004, 0.004),
      w,
      h: isSet ? base.h : base.h,
      d: base.d,
      bind,
      col: base.col.map((c) => c * r.range(0.88, 1.12)),
      bands: base.bands,
      wear: Math.min(1, base.wear * r.range(0.8, 1.2)),
      seed: r(),
      dust: r.range(0.15, 0.6),
      detail,
    });
    dress(b, r, isSet ? { cell: base.cell, ground: base.ground, vol: vol0 + k } : null);
    if (isSet) b.dust = base.wear * 0.6;
    out.push(b);
    const gap = r.range(0.0004, 0.0018);
    x += w + gap;
    budget -= w + gap;
  }
  return { books: out, x };
}

// Fill [a, b] on a row with random volumes, then spread the leftover across the gaps.
function fillSpan(r, row, a, b, detail) {
  const books = [];
  let x = a;
  let guard = 0;
  while (b - x > 0.016 && guard++ < 400) {
    if (r() < 0.025 && b - x > 0.06) {
      x += r.range(0.012, 0.04); // a volume missing
      continue;
    }
    const run = randomRun(r, x, row, b - x, detail);
    if (!run.books.length) break;
    books.push(...run.books);
    x = run.x;
  }
  const spare = b - x;
  if (books.length && spare > 0) {
    books.forEach((bk, i) => {
      bk.x += (spare * (i + 1)) / (books.length + 1);
    });
  }
  return books;
}

// rows: [{ y, x0?, x1?, detail?, classes? (size classes to draw from) }]; fixed: complete book() records placed as given (x = centre).
export function layoutShelf({ seed = 1, x0 = -2, x1 = 2, rows = [{ y: 0 }], fixed = [] } = {}) {
  const r = rng(seed);
  const books = [];
  rows.forEach((row, ri) => {
    const a0 = row.x0 ?? x0;
    const a1 = row.x1 ?? x1;
    const detail = row.detail ?? 1;
    const mine = fixed.filter((f) => (f.row ?? 0) === ri).sort((p, q) => p.x - q.x);
    let cursor = a0;
    for (const f of mine) {
      const left = f.x - f.w / 2 - 0.0012;
      books.push(...fillSpan(r, row, cursor, left, detail));
      f.y = row.y;
      books.push(f);
      cursor = f.x + f.w / 2 + 0.0012;
    }
    books.push(...fillSpan(r, row, cursor, a1, detail));
  });
  return { books, rows, x0, x1 };
}

// ------------------------------------------------------------------------------------ lettering

// 48 titles (cells 0–47) and 16 volume numbers (48–63). Under the Babel nonsense runs a quiet
// genealogy: the catalogues, encyclopedias and thinking machines that came before this one.
const TITLES = [
  ['ARS', 'MAGNA'], ['DE ARTE', 'COMBINATORIA'], ['CHARACTERISTICA', 'UNIVERSALIS'], ['BIBLIOTHECA', 'UNIVERSALIS'],
  ['NATURALIS', 'HISTORIA'], ['ETYMOLOGIAE'], ['SPECULUM', 'MAIUS'], ['ELEMENTA'],
  ['ANALYTICAL', 'ENGINE'], ['NOTES', 'BY A.A.L.'], ['AS WE MAY', 'THINK'], ['COMPUTING', 'MACHINERY'],
  ['THEORY OF', 'COMMUNICATION'], ['MCV'], ['DHCMRLCHTDJ'], ['AXAXAXAS', 'MLÖ'],
  ['TLÖN'], ['ORBIS', 'TERTIUS'], ['BABEL'], ['VINDICATIONES'],
  ['ΒΙΒΛΙΟΘΗΚΗ'], ['ΜΟΥΣΕΙΟΝ'], ['ΠΙΝΑΚΕΣ'], ['ORGANON'],
  ['四庫全書'], ['永樂大典'], ['太平御覽'], ['說文解字'],
  ['夢溪筆談'], ['天工開物'], ['爾雅'], ['七略'],
  ['ENCYCLOPÉDIE'], ['DICTIONNAIRE', 'RAISONNÉ'], ['CYCLOPAEDIA'], ['THESAURUS'],
  ['LEXICON'], ['INDEX', 'LIBRORUM'], ['CATALOGUS'], ['CONCORDANTIAE'],
  ['ALMAGESTUM'], ['CANON'], ['HORTUS', 'SANITATIS'], ['OPERA', 'OMNIA'],
  ['ANNALES'], ['MISCELLANEA'], ['SYLVA', 'SYLVARUM'], ['NOVUM', 'ORGANUM'],
];
export const TITLE_CELL = Object.fromEntries(TITLES.map((t, i) => [t.join(' '), i]));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
const STRIPS = [
  'THE LIBRARY OF BABEL', 'A MATHEMATICAL THEORY OF COMMUNICATION', 'COMPUTING MACHINERY AND INTELLIGENCE',
  'AS WE MAY THINK', 'THE ART OF MEMORY', 'ON COMPUTABLE NUMBERS', 'A CATALOGUE OF EVERYTHING', 'INDEX OF INDEXES',
  '四庫全書總目', '文獻通考', 'AN ESSAY TOWARDS A REAL CHARACTER', 'INFORMATION RETRIEVAL', 'LUX IN TENEBRIS',
  'FIAT LUX', '藝文類聚', 'THE PRINCIPLES OF RADAR',
];
export const STRIP_TITLES = STRIPS; // the default spine titles, for a shot that letters some of its own
const isCJK = (s) => /[㐀-鿿]/.test(s);

function fitFont(g, text, fam, size, weight, caps, tracking, maxW) {
  let s = size;
  for (let k = 0; k < 40; k++) {
    g.font = font(fam, s, weight);
    g.fontVariantCaps = caps;
    g.letterSpacing = `${tracking * s}px`;
    if (g.measureText(text).width - tracking * s <= maxW) break;
    s *= 0.96;
  }
  return s;
}

function drawCell(g, x, y, W, H, i) {
  g.save();
  g.beginPath();
  g.rect(x, y, W, H);
  g.clip();
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  if (i >= 48) {
    let s = fitFont(g, 'TOM.', 'garamond', H * 0.2, 600, 'normal', 0.16, W * 0.8);
    drawTracked(g, 'TOM.', x + W / 2, y + H * 0.4, { tracking: 0.16 * s });
    s = fitFont(g, ROMAN[i - 48], 'garamond', H * 0.36, 600, 'normal', 0.06, W * 0.8);
    drawTracked(g, ROMAN[i - 48], x + W / 2, y + H * 0.8, { tracking: 0.06 * s });
  } else {
    const lines = TITLES[i];
    const cjk = isCJK(lines[0]);
    const n = lines.length;
    const base = cjk ? [0.66] : n === 1 ? [0.62] : [0.45, 0.77];
    lines.forEach((t, k) => {
      const fam = cjk ? 'serif' : 'garamond';
      const s = fitFont(g, t, fam, H * (cjk ? 0.4 : n === 1 ? 0.3 : 0.25), cjk ? 400 : 600, 'normal', cjk ? 0.12 : 0.07, W * 0.84);
      drawTracked(g, t, x + W / 2, y + H * base[k], { tracking: (cjk ? 0.12 : 0.07) * s });
    });
  }
  g.restore();
}

function drawStrip(g, y, W, H, spec) {
  const { text, fam = 'garamond', weight = 600, tracking = 0.1, size = 0.62 } = typeof spec === 'string' ? { text: spec } : spec;
  g.save();
  g.beginPath();
  g.rect(0, y, W, H);
  g.clip();
  g.fillStyle = '#fff';
  if (isCJK(text)) {
    // upright characters, one after another along the spine: each is drawn turned a quarter left so
    // the shader's quarter turn stands it up again
    const s = H * 0.74;
    g.font = font('serif', s, 400);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const step = s * 1.18;
    const chars = [...text];
    const x0 = W / 2 - (step * (chars.length - 1)) / 2;
    chars.forEach((c, k) => {
      g.save();
      g.translate(x0 + k * step, y + H / 2);
      g.rotate(-Math.PI / 2);
      g.fillText(c, 0, 0);
      g.restore();
    });
  } else {
    // a '★' (GitHub stars; none of the faces has one) is drawn as a path in a space's cell
    const line = text.replaceAll('★', ' ');
    g.textBaseline = 'alphabetic';
    const s = fitFont(g, line, fam, H * size, weight, 'normal', tracking, W * 0.94);
    const base = y + H * 0.5 + s * 0.33;
    const w = drawTracked(g, line, W / 2, base, { tracking: tracking * s });
    for (let k = text.indexOf('★'); k >= 0; k = text.indexOf('★', k + 1)) {
      const x = W / 2 - w / 2 + g.measureText(line.slice(0, k)).width + (g.measureText(' ').width - tracking * s) / 2;
      star(g, x, base - 0.36 * s, 0.4 * s);
    }
  }
  g.restore();
}

function star(g, cx, cy, R) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.4 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  g.closePath();
  g.fill();
}

// A hero lettering piece: lines = [{ text, fam: 'garamond'|'serif', size (of height), y (baseline,
// of height), weight, caps, tracking (em), maxW (of width) }]; aspect = width / height.
function drawHero(spec) {
  const W = 2048;
  const H = Math.round(W / spec.aspect);
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  for (const L of spec.lines) {
    const tr = L.tracking ?? 0.08;
    const s = fitFont(g, L.text, L.fam ?? 'garamond', L.size * H, L.weight ?? 600, L.caps ?? 'normal', tr, (L.maxW ?? 0.84) * W);
    drawTracked(g, L.text, W / 2, L.y * H, { tracking: tr * s });
  }
  // a rule or an ornament between lines, if asked
  for (const R of spec.rules ?? []) {
    g.fillRect(W * (0.5 - R.w / 2), R.y * H - (R.t * H) / 2, W * R.w, R.t * H);
  }
  for (const D of spec.dots ?? []) {
    g.beginPath();
    g.arc(W * D.x, H * D.y, D.r * H, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 });
}

// Lettering atlases: 64 label cells (8×8 of 512×384), spine strips (2048×128 each), hero pieces.
// strips: a shot's own spine titles, 16 or up to 32 (a string, or { text, fam, weight, tracking, size:
// em / strip height, 0.62 by default }); STRIPS by default.
export async function bookLabels({ heroes = [], strips = STRIPS } = {}) {
  await loadFonts();
  const CW = 512;
  const CH = 384;
  const cv = makeCanvas(CW * 8, CH * 8);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 64; i++) drawCell(g, (i % 8) * CW, Math.floor(i / 8) * CH, CW, CH, i);
  const rows = strips.length > 16 ? 32 : 16;
  const sv = makeCanvas(2048, 128 * rows);
  const h = sv.getContext('2d');
  h.fillStyle = '#000';
  h.fillRect(0, 0, 2048, 128 * rows);
  strips.slice(0, rows).forEach((t, k) => drawStrip(h, k * 128, 2048, 128, t));
  return {
    labels: canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 }),
    strips: canvasTexture(sv, { srgb: false, mipmaps: true, anisotropy: 16 }),
    heroA: heroes[0] ? drawHero(heroes[0]) : null,
    heroB: heroes[1] ? drawHero(heroes[1]) : null,
    stripRows: rows,
  };
}

// Aspect (width / height) of a book's first lettering piece, for drawing its hero texture.
export const labelAspect = (b) => (0.86 * b.halfArc * 2) / (b.label.y1 - b.label.y0);

// ------------------------------------------------------------------------------------ geometry

class Geo {
  constructor() {
    this.p = [];
    this.n = [];
    this.bk = [];
    this.part = [];
    this.arc = [];
    this.idx = [];
  }
  get count() {
    return this.p.length / 3;
  }
  v(x, y, z, book, part, arc = 0, nx = 0, ny = 0, nz = 0) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.bk.push(book);
    this.part.push(part);
    this.arc.push(arc);
    return this.count - 1;
  }
  // a planar quad; corners in order around the face, flipped if needed to face along n
  quad(a, b, c, d, n, book, part) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const ok = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0;
    const P = ok ? [a, b, c, d] : [a, d, c, b];
    const i = P.map((q) => this.v(q[0], q[1], q[2], book, part, 0, n[0], n[1], n[2]));
    this.idx.push(i[0], i[1], i[2], i[0], i[2], i[3]);
  }
  box(lo, hi, book, part, faces = 'xyzXYZ') {
    const [x0, y0, z0] = lo;
    const [x1, y1, z1] = hi;
    if (faces.includes('X')) this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], book, part);
    if (faces.includes('x')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], book, part);
    if (faces.includes('Y')) this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], book, part);
    if (faces.includes('y')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], book, part);
    if (faces.includes('Z')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], book, part);
    if (faces.includes('z')) this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1], book, part);
  }
  // smooth normals over a vertex range from the triangles in an index range
  smooth(v0, v1, i0, i1) {
    const N = new Float64Array((v1 - v0) * 3);
    for (let t = i0; t < i1; t += 3) {
      const [a, b, c] = [this.idx[t], this.idx[t + 1], this.idx[t + 2]];
      const P = (k) => [this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]];
      const [pa, pb, pc] = [P(a), P(b), P(c)];
      const e1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
      const e2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      for (const k of [a, b, c]) for (let j = 0; j < 3; j++) N[(k - v0) * 3 + j] += n[j];
    }
    for (let k = v0; k < v1; k++) {
      const o = (k - v0) * 3;
      const l = Math.hypot(N[o], N[o + 1], N[o + 2]) || 1;
      for (let j = 0; j < 3; j++) this.n[k * 3 + j] = N[o + j] / l;
    }
  }
}

function spineHeights(h, bands, detail) {
  const ys = [];
  const step = detail >= 1 ? 0.008 : 0.024;
  for (let y = 0; y < h; y += step) ys.push(y);
  ys.push(h);
  for (const yb of bands) for (let k = -4; k <= 4; k++) ys.push(yb + (BW * k) / 4);
  for (const e of [0.0007, 0.0018, 0.0032]) ys.push(e, h - e);
  ys.sort((a, b) => a - b);
  const out = [];
  for (const y of ys) {
    const c = Math.min(h, Math.max(0, y));
    if (!out.length || c - out[out.length - 1] > 0.0003) out.push(c);
  }
  out[out.length - 1] = h;
  return out;
}

function bandBump(y, bands) {
  let b = 0;
  for (const yb of bands) {
    const t = (y - yb) / BW;
    if (Math.abs(t) < 1) b = Math.max(b, BH * Math.pow(1 - t * t, 1.5));
  }
  return b;
}

// the head and tail of the spine roll back where the leather is turned in over the headband
function capRoll(y, h) {
  const e = 0.003;
  let r = 0;
  if (y > h - e) r = ((y - (h - e)) / e) ** 2;
  if (y < e) r = ((e - y) / e) ** 2;
  return 0.0022 * r;
}

function buildBook(G, b, bi) {
  const { w, h, d, s } = b;
  const hw = w / 2;
  const bt = Math.min(0.0035, w * 0.12);
  const n = SEG(b.detail);
  const bands = b.bind === BIND.LEATHER ? bandsOf(h, b.bands) : [];
  // profile across the spine: the left joint groove, the rounded spine, the right joint groove
  const prof = [];
  prof.push({ x: -hw, z: -s - 0.0045, phi: null }, { x: -hw + 0.0011, z: -s - 0.0022, phi: null });
  for (let i = 0; i <= n; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / n;
    prof.push({ x: hw * Math.sin(phi), z: -s * (1 - Math.cos(phi)), phi });
  }
  prof.push({ x: hw - 0.0011, z: -s - 0.0022, phi: null }, { x: hw, z: -s - 0.0045, phi: null });
  // signed arc length from the crest
  const arc = [0];
  for (let j = 1; j < prof.length; j++) arc.push(arc[j - 1] + Math.hypot(prof[j].x - prof[j - 1].x, prof[j].z - prof[j - 1].z));
  const mid = arc[2 + n / 2];
  for (let j = 0; j < arc.length; j++) arc[j] -= mid;
  const ys = spineHeights(h, bands, b.detail);
  const v0 = G.count;
  const i0 = G.idx.length;
  const NJ = prof.length;
  for (const y of ys) {
    const bump = bandBump(y, bands);
    const roll = capRoll(y, h);
    for (let j = 0; j < NJ; j++) {
      const P = prof[j];
      let x = P.x;
      let z = P.z;
      if (P.phi !== null) {
        // displace along the profile normal; bands fade out toward the joints
        const nx = Math.sin(P.phi) / hw;
        const nz = Math.cos(P.phi) / Math.max(s, 1e-4);
        const l = Math.hypot(nx, nz);
        const disp = bump * Math.pow(Math.cos(P.phi), 0.25);
        x += (disp * nx) / l;
        z += (disp * nz) / l - roll;
      }
      G.v(x, y, z, bi, PART.SPINE, arc[j]);
    }
  }
  for (let i = 0; i + 1 < ys.length; i++) {
    for (let j = 0; j + 1 < NJ; j++) {
      const a = v0 + i * NJ + j;
      const c = a + NJ + 1;
      G.idx.push(a, a + 1, c, a, c, a + NJ);
    }
  }
  G.smooth(v0, G.count, i0, G.idx.length);
  // the cap over the head of the spine: a fan from behind the crest to the top row
  const top = v0 + (ys.length - 1) * NJ;
  const cc = G.v(0, h, -s - 0.0045, bi, PART.CAP, 0, 0, 1, 0);
  for (let j = 0; j + 1 < NJ; j++) {
    const a = top + j;
    const pa = [G.p[a * 3], h, G.p[a * 3 + 2]];
    const pb = [G.p[(a + 1) * 3], h, G.p[(a + 1) * 3 + 2]];
    const ia = G.v(pa[0], h, pa[2], bi, PART.CAP, 0, 0, 1, 0);
    const ib = G.v(pb[0], h, pb[2], bi, PART.CAP, 0, 0, 1, 0);
    G.idx.push(cc, ia, ib);
  }
  // boards (covers) and the page block
  const zb = -s - 0.0045;
  G.box([-hw, 0, -d], [-hw + bt, h, zb], bi, PART.BOARD, 'xXYz');
  G.box([hw - bt, 0, -d], [hw, h, zb], bi, PART.BOARD, 'xXYz');
  G.quad([-hw + bt, h - SQ, -d + SQ], [hw - bt, h - SQ, -d + SQ], [hw - bt, h - SQ, zb + 0.0025], [-hw + bt, h - SQ, zb + 0.0025], [0, 1, 0], bi, PART.PAGES);
}

function buildShelf(G, layout, dividers) {
  const { x0, x1 } = layout;
  const D = SHELF.DEPTH;
  const F = SHELF.FRONT;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const row of layout.rows) {
    G.box([x0 - 0.3, row.y - SHELF.BOARD, -D + F], [x1 + 0.3, row.y, F], -1, PART.SHELF, 'yYZ');
    yMin = Math.min(yMin, row.y - SHELF.BOARD);
    yMax = Math.max(yMax, row.y + SHELF.ROW - SHELF.BOARD);
  }
  // the board above the top row
  G.box([x0 - 0.3, yMax, -D + F], [x1 + 0.3, yMax + SHELF.BOARD, F], -1, PART.SHELF, 'yYZ');
  G.quad([x0 - 0.3, yMin, -D + F], [x1 + 0.3, yMin, -D + F], [x1 + 0.3, yMax + SHELF.BOARD, -D + F], [x0 - 0.3, yMax + SHELF.BOARD, -D + F], [0, 0, 1], -1, PART.BACK);
  for (const xd of dividers) G.box([xd - 0.025, yMin, -D + F], [xd + 0.025, yMax + SHELF.BOARD, F], -1, PART.SHELF, 'xXZ');
}

// ------------------------------------------------------------------------------------ shading

const VERT = /* glsl */ `
attribute float aBook, aPart, aArc;
uniform sampler2D uBooks;
varying vec3 vW, vN, vS, vL, vAxY;
varying float vBook, vPart, vArc;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }
void main(){
  vec3 p = position, n = normal, ay = vec3(0.0, 1.0, 0.0);
  if (aBook > -0.5){
    int b = int(aBook + 0.5);
    vec4 T0 = texelFetch(uBooks, ivec2(0, b), 0);
    vec4 Q = texelFetch(uBooks, ivec2(1, b), 0);
    p = qrot(Q, p*T0.w) + T0.xyz; n = qrot(Q, n); ay = qrot(Q, ay);
  }
  vS = p; vL = position;
  vec4 w = modelMatrix*vec4(p, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*n); vAxY = normalize(mat3(modelMatrix)*ay);
  vBook = aBook; vPart = aPart; vArc = aArc;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// rows: strips in the strip atlas (16 gives the same source as before there were 32)
const frag = (rows) => /* glsl */ `
uniform sampler2D uBooks; uniform int uCount;
uniform sampler2D uLabels, uStrips, uHeroA, uHeroB;
uniform vec3 uKeyPos, uKeyLocal, uKeyCol, uKeyDir; uniform float uKeyR, uKeyShadow; uniform vec2 uKeyCone;
uniform vec3 uEnvCol, uPrintCol, uGlowCol, uCamLocal;
uniform float uShelfDust, uBackLit;
float gInk;   // this volume's titles: 0 gilt, 1 printed ink (set per fragment in main)
varying vec3 vW, vN, vS, vL, vAxY;
varying float vBook, vPart, vArc;

const float BW = ${BW.toFixed(5)};
const vec3 GILT = vec3(0.92, 0.66, 0.29);

vec4 BK(int b, int i){ return texelFetch(uBooks, ivec2(i, b), 0); }
vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }

// box-filtered coverage of [-hw, hw] in a pixel of size px centred at d
float boxLine(float d, float hw, float px){ return (clamp(d + hw, -0.5*px, 0.5*px) - clamp(d - hw, -0.5*px, 0.5*px))/px; }
float boxFill(vec2 q, vec2 hs, float px){ return boxLine(q.x, hs.x, px)*boxLine(q.y, hs.y, px); }
float disc(vec2 q, float r, float px){ return clamp((r - length(q))/px + 0.5, 0.0, 1.0); }

struct BookMat { vec3 alb; vec3 f0; float rough; float ao; vec3 emit; vec2 g; float gilt; };

float bandY(float k, float n, float h){ return h*(0.17 + 0.66*k/max(n - 1.0, 1.0)); }

vec3 groundCol(float g){
  if (g < 0.5) return vec3(0.11, 0.018, 0.013);
  if (g < 1.5) return vec3(0.013, 0.012, 0.011);
  if (g < 2.5) return vec3(0.018, 0.05, 0.03);
  return vec3(0.22, 0.13, 0.06);
}

// a small gilt fleuron: four petals, an open ring, four dots on the diagonals
float fleuron(vec2 q, float R, float px){
  vec2 p = q/R; float r = length(p); float a = atan(p.y, p.x);
  float pr = px/R;
  float petal = 0.26 + 0.64*pow(abs(cos(2.0*a)), 2.2);
  float f = clamp((petal - r)/pr + 0.5, 0.0, 1.0);
  f *= 1.0 - clamp((0.045 - abs(r - 0.2))/pr + 0.5, 0.0, 1.0);
  vec2 dq = abs(p) - vec2(0.44);
  f = max(f, clamp((0.085 - length(dq))/pr + 0.5, 0.0, 1.0));
  return f;
}

// mask and its gradient (per metre) from a texture, around uv; e = tap offset in uv
float maskTaps(sampler2D t, vec2 uv, vec2 e, vec2 metres, out vec2 grad){
  float m = texture(t, uv).r;
  float mx = texture(t, uv + vec2(e.x, 0.0)).r - texture(t, uv - vec2(e.x, 0.0)).r;
  float my = texture(t, uv + vec2(0.0, e.y)).r - texture(t, uv - vec2(0.0, e.y)).r;
  grad = vec2(mx/(2.0*e.x*metres.x), my/(2.0*e.y*metres.y));
  return m;
}

// lettering of a label (y0..y1 on the spine, half-width hwA by arc length)
float letters(float cell, float y0, float y1, float hwA, float arc, float y, out vec2 grad){
  grad = vec2(0.0);
  float hh = 0.5*(y1 - y0), yc = 0.5*(y0 + y1);
  vec2 q = vec2(arc, y - yc);
  if (abs(q.x) > hwA || abs(q.y) > hh) return 0.0;
  if (cell > 99.5){
    vec2 uv = vec2(0.5 + 0.5*q.x/hwA, 0.5 + 0.5*q.y/hh);
    vec2 e = vec2(1.5/2048.0, 1.5/2048.0*hwA/hh);
    if (cell < 100.5) return maskTaps(uHeroA, uv, e, vec2(2.0*hwA, 2.0*hh), grad);
    return maskTaps(uHeroB, uv, e, vec2(2.0*hwA, 2.0*hh), grad);
  }
  // a 4:3 cell, centred and contained in the label
  float sc = min(2.0*hwA, 2.0*hh*4.0/3.0);
  vec2 l = vec2(0.5 + q.x/sc, 0.5 + q.y/(sc*0.75));
  if (l.x < 0.0 || l.x > 1.0 || l.y < 0.0 || l.y > 1.0) return 0.0;
  vec2 c = vec2(mod(cell, 8.0), floor(cell/8.0));
  vec2 uv = vec2((c.x + l.x)/8.0, 1.0 - (c.y + 1.0 - l.y)/8.0);
  return maskTaps(uLabels, uv, vec2(1.5/4096.0, 1.5/3072.0), vec2(sc*8.0, sc*0.75*8.0), grad);
}

// a title running down the spine (top to bottom, letter tops toward +arc)
float stripTitle(float k, float h, float halfArc, float arc, float y, out vec2 grad){
  grad = vec2(0.0);
  float yA = 0.17*h, yB = h - 0.028;
  float len = yB - yA, wid = len/16.0, hwS = 0.82*halfArc;
  if (wid > 2.0*hwS){ wid = 2.0*hwS; len = wid*16.0; }
  float yc = 0.5*(yA + yB);
  float lu = 0.5 + (yc - y)/len, lv = 0.5 + arc/wid;
  if (lu < 0.0 || lu > 1.0 || lv < 0.0 || lv > 1.0) return 0.0;
  vec2 uv = vec2(lu, 1.0 - (k + 1.0 - lv)/${rows}.0);
  vec2 gq;
  float m = maskTaps(uStrips, uv, vec2(1.5/2048.0, 1.5/${128 * rows}.0), vec2(len, wid*${rows}.0), gq);
  grad = vec2(gq.y, -gq.x);   // (along arc, along y)
  return m;
}

void labelPiece(inout BookMat m, vec4 L, float ground, float halfArc, float arc, float y, float px, inout float gilt){
  if (L.x < -0.5) return;
  float hwA = 0.86*halfArc;
  float yc = 0.5*(L.y + L.z), hh = 0.5*(L.z - L.y);
  vec2 q = vec2(arc, y - yc);
  float inside = boxFill(q, vec2(hwA, hh), px);
  if (inside <= 0.0) return;
  vec2 grad;
  float t = letters(L.x, L.y, L.z, hwA, arc, y, grad);
  if (ground < 3.5){
    // the lettering piece: thin leather pared and pasted on; its edge stands a little proud
    vec3 gc = groundCol(ground)*(0.85 + 0.3*vnoise2(q*900.0));
    m.alb = mix(m.alb, gc, inside);
    float ex = hwA - abs(q.x), ey = hh - abs(q.y);
    m.g += vec2(-sign(q.x)*(1.0 - smoothstep(0.0, 0.0005, ex)), -sign(q.y)*(1.0 - smoothstep(0.0, 0.0005, ey)))*0.45*inside;
    float fil = max(boxLine(ex - 0.0014, 0.00026, px)*step(0.0011, ey), boxLine(ey - 0.0014, 0.00026, px)*step(0.0011, ex));
    gilt = max(gilt, max(fil, t)*inside);
    m.g -= 0.0001*grad*inside;
  } else if (ground < 4.5){
    m.alb = mix(m.alb, vec3(0.03, 0.018, 0.01), t*0.92);   // ink on vellum
  } else {
    gilt = max(gilt, t);
    m.g -= 0.0001*grad;
  }
}

void wearAndGilt(inout BookMat m, float gilt, float W, vec2 q, float seed, float px){
  float keep = smoothstep(0.2, 0.5, vnoise2(q*420.0 + seed*3.0) + 0.5 - 0.95*W);
  gilt *= keep;
  m.alb = mix(m.alb, m.alb*1.9 + vec3(0.022, 0.015, 0.009), W*0.7);
  m.rough = mix(m.rough, 0.85, W);
  // gold leaf follows the grain of the leather under it and crinkles a little where the tool pressed it
  vec2 cr = vec2(vnoise2(q*2600.0 + 1.7), vnoise2(q*2600.0 + 9.3)) - 0.5;
  m.g += cr*0.07*gilt*smoothstep(0.0008, 0.0002, px);
  m.gilt = gilt;
  m.alb = mix(m.alb, vec3(0.0), gilt);
  m.f0 = mix(m.f0, GILT*(0.88 + 0.16*vnoise2(q*600.0)), gilt);
  m.rough = mix(m.rough, 0.3 + 0.12*vnoise2(q*500.0 + 4.0), gilt);
}

void spineLeather(inout BookMat m, vec4 dim, vec4 kind, vec4 col, vec4 lab, vec4 lab2, float g2, float arc, float y, float px){
  float h = dim.y, halfArc = col.w;
  float seed = kind.y, wear = kind.z, nb = kind.w;
  vec2 q = vec2(arc, y);
  float u = arc/halfArc;
  float fine = smoothstep(0.0012, 0.0003, px);
  // mottled calf or morocco grain; half the calf is sprinkled with dark specks
  vec3 c = col.rgb*(0.7 + 0.62*fbm2(q*45.0 + seed*37.0));
  float gr = vnoise2(q*900.0 + seed*13.0);
  c *= 1.0 + (0.24*(gr - 0.5) + 0.12*(vnoise2(q*2300.0) - 0.5))*fine;
  vec2 cq = q/0.0009; vec2 ci = floor(cq); vec2 cf = fract(cq) - 0.5;
  vec2 off = vec2(hash12(ci + 3.1), hash12(ci + 7.7)) - 0.5;
  float speck = step(hash12(ci + seed*91.0), 0.22)*clamp((0.17 - length(cf - off*0.5))/(px/0.0009) + 0.5, 0.0, 1.0);
  c *= 1.0 - 0.55*speck*step(fract(seed*7.0), 0.5);
  float e = 0.0002;
  m.g += vec2(vnoise2((q + vec2(e, 0.0))*900.0 + seed*13.0) - gr, vnoise2((q + vec2(0.0, e))*900.0 + seed*13.0) - gr)/e*0.0001*fine;
  m.alb = c; m.f0 = vec3(0.04); m.rough = 0.48 + 0.12*gr;
  float gilt = 0.0;
  float crest = 0.0;
  if (nb > 0.5){
    for (int k = 0; k < 6; k++){
      if (float(k) >= nb) break;
      float dy = y - bandY(float(k), nb, h);
      gilt = max(gilt, boxLine(abs(dy) - (BW + 0.0024), 0.00032, px));
      vec2 dq = vec2((fract(arc/0.0032 + 0.5) - 0.5)*0.0032, dy);
      gilt = max(gilt, disc(dq, 0.00062, px));
      crest = max(crest, 1.0 - smoothstep(0.0, BW, abs(dy)));
    }
    // head and tail rolls: a line of lozenges between two fillets
    for (int i = 0; i < 2; i++){
      float dy = y - (i == 0 ? h - 0.0095 : 0.0095);
      float fx = (fract(arc/0.0042 + 0.5) - 0.5)*0.0042;
      gilt = max(gilt, clamp((0.0013 - (abs(fx)*1.2 + abs(dy)*1.9))/px + 0.5, 0.0, 1.0));
      gilt = max(gilt, boxLine(abs(dy) - 0.0027, 0.00028, px));
    }
    // compartments without a lettering piece: a fillet panel and a fleuron
    float t = (y/h - 0.17)/0.66*(nb - 1.0);
    float k = floor(t);
    if (k >= 0.0 && k < nb - 1.0){
      float ya = bandY(k, nb, h) + BW, yb = bandY(k + 1.0, nb, h) - BW;
      float yc = 0.5*(ya + yb), hh = 0.5*(yb - ya);
      bool l1 = lab.x > -0.5 && abs(yc - 0.5*(lab.y + lab.z)) < hh;
      bool l2 = lab2.x > -0.5 && abs(yc - 0.5*(lab2.y + lab2.z)) < hh;
      if (!l1 && !l2){
        vec2 qc = vec2(arc, y - yc);
        vec2 fr = vec2(halfArc - 0.0045, hh - 0.0034);
        float frame = max(boxLine(abs(qc.x) - fr.x, 0.0003, px)*step(abs(qc.y), fr.y + 0.0003),
                          boxLine(abs(qc.y) - fr.y, 0.0003, px)*step(abs(qc.x), fr.x + 0.0003));
        gilt = max(gilt, frame);
        gilt = max(gilt, fleuron(qc, min(0.6*hh, 0.52*halfArc), px));
      }
    }
  } else {
    for (int i = 0; i < 2; i++){
      float dy = y - (i == 0 ? h - 0.012 : 0.012);
      gilt = max(gilt, max(boxLine(dy - 0.0016, 0.0003, px), boxLine(dy + 0.0016, 0.0003, px)));
    }
  }
  labelPiece(m, lab, lab.w, halfArc, arc, y, px, gilt);
  labelPiece(m, lab2, g2, halfArc, arc, y, px, gilt);
  // wear: joints, head and tail, band crests, scuffs
  float W = smoothstep(0.86, 1.0, abs(u))*(0.5 + 0.5*vnoise2(q*160.0))*0.7;
  W += smoothstep(0.014, 0.0, min(y, h - y))*0.9;
  W += crest*0.7 + smoothstep(0.62, 0.82, vnoise2(q*85.0 + seed*5.0))*0.5;
  W = clamp(W*wear, 0.0, 1.0);
  // old calf crazes across the spine
  float craze = (1.0 - smoothstep(0.0, 0.035, abs(vnoise2(vec2(arc*55.0, y*420.0) + seed*9.0) - 0.5)))*wear*fine;
  m.alb *= 1.0 - 0.45*craze;
  wearAndGilt(m, gilt, W, q, seed, px);
}

void spineCloth(inout BookMat m, vec4 dim, vec4 kind, vec4 col, vec4 lab, float strip, float arc, float y, float px){
  float h = dim.y, halfArc = col.w, seed = kind.y, wear = kind.z;
  vec2 q = vec2(arc, y);
  float fine = smoothstep(0.0008, 0.00022, px);
  vec2 f = vec2(3300.0, 3100.0);
  vec2 ph = TAU*q*f;
  float wv = sin(ph.x)*sin(ph.y);
  m.alb = col.rgb*(0.84 + 0.32*fbm2(q*30.0 + seed*11.0))*(1.0 + 0.14*wv*fine);
  m.g += vec2(cos(ph.x)*sin(ph.y)*f.x, sin(ph.x)*cos(ph.y)*f.y)*TAU*0.0000045*fine;
  m.f0 = vec3(0.035); m.rough = 0.8;
  float gilt = 0.0;
  for (int i = 0; i < 2; i++){
    float dy = y - (i == 0 ? h - 0.013 : 0.013);
    gilt = max(gilt, max(boxLine(dy - 0.0017, 0.00032, px), boxLine(dy + 0.0017, 0.00032, px)));
  }
  vec2 grad;
  float tt = strip > -0.5 ? stripTitle(strip, h, halfArc, arc, y, grad) : 0.0;
  if (gInk > 0.5){
    // printed, not tooled: title and rules in flat pale ink
    m.alb = mix(m.alb, vec3(0.6, 0.62, 0.64), max(tt, gilt));
    gilt = 0.0;
  } else if (strip > -0.5){ gilt = max(gilt, tt); m.g -= 0.00008*grad; }
  labelPiece(m, lab, lab.w, halfArc, arc, y, px, gilt);
  float W = clamp((smoothstep(0.012, 0.0, min(y, h - y)) + smoothstep(0.88, 1.0, abs(arc/halfArc))*0.6)*wear, 0.0, 1.0);
  wearAndGilt(m, gilt, W*0.8, q, seed, px);
}

void spineVellum(inout BookMat m, vec4 dim, vec4 kind, vec4 col, vec4 lab, float strip, float arc, float y, float px){
  float h = dim.y, halfArc = col.w, seed = kind.y, wear = kind.z;
  vec2 q = vec2(arc, y);
  vec3 c = col.rgb*(0.82 + 0.3*fbm2(q*22.0 + seed*7.0));
  c *= mix(1.0, 0.72, smoothstep(0.55, 1.0, abs(arc/halfArc)));                 // handled edges
  c *= 1.0 - 0.25*smoothstep(0.55, 0.8, fbm2(q*9.0 + seed*3.0))*wear;           // soiling
  m.alb = c; m.f0 = vec3(0.04); m.rough = 0.42;
  vec2 grad;
  if (strip > -0.5){
    float t = stripTitle(strip, h, halfArc, arc, y, grad);
    m.alb = mix(m.alb, vec3(0.03, 0.018, 0.01), t*0.9);
  }
  float g = 0.0;
  labelPiece(m, lab, lab.w, halfArc, arc, y, px, g);
  m.gilt = 0.0;
}

// paper seen edge-on from above; gilt edges for the fine bindings
void pageEdges(inout BookMat m, vec3 L, float edgeGilt, float seed, float px){
  float str = vnoise2(vec2(L.x*5200.0 + seed*50.0, L.z*24.0));
  m.alb = vec3(0.5, 0.44, 0.33)*(0.82 + 0.3*str)*(0.85 + 0.3*vnoise2(L.xz*120.0));
  m.rough = 0.8;
  if (edgeGilt > 0.5){
    m.alb = vec3(0.0); m.f0 = GILT*(0.85 + 0.2*str); m.rough = 0.26 + 0.1*str;
    m.gilt = 1.0;
  }
}

// light from the shot's own key (a candle, a lantern's beam, the printing light), widened for its size
// (Karis); a beam if uKeyCone is set (cos of the outer and inner half-angles about uKeyDir)
vec3 keyLight(Surf s, float vis){
  vec3 dl = uKeyPos - s.P; float d2 = dot(dl, dl); float d = sqrt(d2); vec3 l = dl/d;
  vec3 E = uKeyCol/(d2 + uKeyR*uKeyR);
  if (uKeyCone.x > -1.0) E *= smoothstep(uKeyCone.x, uKeyCone.y, dot(-l, uKeyDir));
  float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
  float a = s.rough*s.rough;
  float a2 = clamp(a + uKeyR/(2.0*d), 0.0, 1.0);
  vec3 spec = ggx(s.N, s.V, l, sqrt(a2), s.f0)*(a/a2)*(a/a2);
  return E*vis*(diff*s.albedo + PI*spec);
}

// neighbouring volumes between a point and the key light (boxes in shelf space, rotation ignored)
float rowShadow(int b, vec3 P, vec3 L){
  vec3 D = L - P;
  D.x += D.x >= 0.0 ? 1e-5 : -1e-5;
  int dir = D.x > 0.0 ? 1 : -1;
  float len = length(D);
  float vis = 1.0;
  for (int k = 1; k <= 6; k++){
    int j = b + dir*k;
    if (j < 0 || j >= uCount) break;
    vec4 T0 = BK(j, 0); vec4 dm = BK(j, 2);
    // a volume still being printed stands only as high as its print front
    float pr = BK(j, 7).x;
    float top = pr < 0.999 ? clamp(pr*(dm.y + 0.02) - 0.01, 0.0, dm.y) : dm.y;
    vec3 lo = vec3(T0.x - 0.5*dm.x*T0.w, T0.y, T0.z - dm.z*T0.w);
    vec3 hi = vec3(T0.x + 0.5*dm.x*T0.w, T0.y + top*T0.w, T0.z - 0.35*dm.w*T0.w);
    if (dir > 0 ? lo.x > L.x : hi.x < L.x) break;
    vec3 inv = 1.0/D;
    vec3 t0 = (lo - P)*inv, t1 = (hi - P)*inv;
    vec3 tn = min(t0, t1), tf = max(t0, t1);
    float te = max(max(tn.x, tn.y), max(tn.z, 0.0)), tx = min(min(tf.x, tf.y), min(tf.z, 1.0));
    if (tx > te) vis *= 1.0 - smoothstep(0.0, 0.003 + 0.25*uKeyR*te*len, (tx - te)*len);
  }
  return vis;
}

void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  float px = max(length(dFdx(P)), length(dFdy(P)));
  int part = int(vPart + 0.5);
  BookMat m; m.alb = vec3(0.05); m.f0 = vec3(0.04); m.rough = 0.6; m.ao = 1.0; m.emit = vec3(0.0); m.g = vec2(0.0); m.gilt = 0.0;
  int b = int(vBook + 0.5);
  vec3 Bv = normalize(vAxY - N*dot(vAxY, N) + vec3(0.0, 0.0, 1e-5));
  vec3 Tv = cross(Bv, N);
  bool cap = false;
  float capD = 0.0;
  if (vBook > -0.5){
    vec4 dim = BK(b, 2), kind = BK(b, 3), col = BK(b, 4), lab = BK(b, 5), lab2 = BK(b, 6), live = BK(b, 7), ext = BK(b, 8);
    gInk = ext.w;
    if (live.x < 0.999){
      float front = live.x*(dim.y + 0.02) - 0.01;
      if (vL.y > front) discard;
      // the line runs across the spine and wraps a little way round the boards, fading behind it
      float wrap = part == 0 ? 1.0 : exp(-max(-vL.z, 0.0)/0.02);
      m.emit += uPrintCol*(exp(-(front - vL.y)/0.004) + 0.08*exp(-(front - vL.y)/0.03))*wrap;
      // from above, what shows through the open top is the slice being printed, not the hollow inside:
      // a fragment is under it when the ray to it crosses the front inside the volume's footprint
      vec4 T0b = BK(b, 0);
      vec3 cb = qrot(vec4(-BK(b, 1).xyz, BK(b, 1).w), uCamLocal - T0b.xyz)/T0b.w;
      if (cb.y > front){
        vec3 c = cb + (vL - cb)*((front - cb.y)/(vL.y - cb.y));
        cap = abs(c.x) < 0.5*dim.x && c.z < 0.0 && c.z > -dim.z;
        capD = -c.z;
      }
    }
    float y = vL.y;
    if (part == 0){
      if (kind.x < 0.5) spineLeather(m, dim, kind, col, lab, lab2, ext.z, vArc, y, px);
      else if (kind.x < 1.5) spineVellum(m, dim, kind, col, lab, lab2.w, vArc, y, px);
      else spineCloth(m, dim, kind, col, lab, lab2.w, vArc, y, px);
      // occlusion: the grooves at the joints, the board, volumes standing proud on either side
      float u = abs(vArc)/col.w;
      m.ao *= mix(0.3, 1.0, smoothstep(1.06, 0.74, u));
      m.ao *= mix(0.55, 1.0, smoothstep(0.0, 0.04, y));
      float zs = BK(b, 0).z, prou = 0.0;
      if (b > 0) prou = max(prou, BK(b - 1, 0).z - zs);
      if (b + 1 < uCount) prou = max(prou, BK(b + 1, 0).z - zs);
      m.ao *= exp(-max(prou, 0.0)*35.0);
    } else if (part == 1 || part == 3){
      vec3 c = kind.x < 0.5 ? col.rgb : (kind.x < 1.5 ? col.rgb*0.95 : col.rgb);
      float up = smoothstep(0.5, 0.9, N.y);
      m.alb = c*(0.85 + 0.3*vnoise2(vL.xz*300.0 + vL.y*40.0))*mix(1.0, 1.5, up*kind.z);
      m.rough = 0.62;
      if (part == 1 && N.y < 0.5) m.ao = 0.35;
    } else {
      pageEdges(m, vL, ext.x, kind.y, px);
      m.ao = 0.75;
    }
    // dust settles on what faces up
    float up = smoothstep(0.6, 0.95, N.y);
    float cover = clamp(live.w*up*(0.45 + 0.55*fbm2(vS.xz*55.0 + float(b))), 0.0, 1.0);
    m.alb = mix(m.alb, vec3(0.3, 0.27, 0.23), cover*0.85);
    m.f0 = mix(m.f0, vec3(0.03), cover);
    m.rough = mix(m.rough, 0.95, cover);
    // a book lit from within (amber reader's shelf → lime) and the lime of lit knowledge
    float lit = live.y;
    m.emit += mix(vec3(1.0, 0.62, 0.3), uLitCol, live.z)*lit*(part == 0 ? 0.5 + 0.5*(1.0 - m.gilt) : 0.25);
    m.emit += uLitCol*ext.y*(part == 0 ? 0.35 + 2.6*m.gilt : 0.2)*uLitGlow;
  } else if (part == 4){
    vec2 q = abs(N.y) > 0.5 ? vS.xz : (abs(N.z) > 0.5 ? vS.xy : vS.zy);
    float gq = vnoise2(vec2(q.x*2.2, q.y*95.0));
    float rq = vnoise2(vec2(q.x*0.8 + gq, q.y*320.0));
    m.alb = vec3(0.1, 0.058, 0.03)*(0.68 + 0.45*gq + 0.22*rq);
    m.rough = 0.45 + 0.2*rq;
    float cover = uShelfDust*smoothstep(0.6, 0.95, N.y)*(0.5 + 0.5*fbm2(vS.xz*30.0));
    m.alb = mix(m.alb, vec3(0.28, 0.25, 0.21), cover*0.8);
    m.rough = mix(m.rough, 0.95, cover);
    if (N.y < -0.5) m.ao = 0.5;
  } else {
    m.alb = vec3(0.018, 0.012, 0.008)*(0.8 + 0.4*vnoise2(vS.xy*vec2(3.0, 60.0)));
    m.rough = 0.8; m.ao = 0.3;
    if (uBackLit > 0.0){
      // the back boards above the books: dark walnut catching bounce light, darkest in the shadow of
      // the board above, and dark low down where the volumes stand close
      float yr = mod(vS.y, ${SHELF.ROW.toFixed(3)});
      float lit = smoothstep(0.3, 0.42, yr)*(1.0 - 0.9*smoothstep(0.42, ${(SHELF.CLEAR - 0.015).toFixed(3)}, yr));
      m.alb = mix(m.alb, vec3(0.085, 0.052, 0.029)*(0.7 + 0.6*vnoise2(vS.xy*vec2(2.0, 70.0))), uBackLit);
      m.ao = mix(m.ao, 0.05 + 0.65*lit, uBackLit);
    }
  }
  N = normalize(N - m.g.x*Tv - m.g.y*Bv);
  if (cap){
    m.alb = vec3(0.02); m.f0 = vec3(0.02); m.rough = 0.9; m.ao = 1.0;
    // the slice glows where it meets the spine and goes dark behind it: a lit lip, not a lid
    m.emit = uPrintCol*(0.06 + 0.7*exp(-capD/0.012));
    N = normalize(vAxY);
  }
  // geometric specular anti-aliasing (Kaplanyan): widen the lobe where the normal varies within a pixel
  vec3 dnx = dFdx(N), dny = dFdy(N);
  float var = 0.25*(dot(dnx, dnx) + dot(dny, dny));
  float a2 = m.rough*m.rough*m.rough*m.rough;
  m.rough = sqrt(sqrt(min(a2 + min(2.0*var, 0.18), 1.0)));
  Surf s; s.P = P; s.N = N; s.V = V; s.albedo = m.alb; s.f0 = m.f0; s.rough = m.rough; s.ao = m.ao; s.wrap = 0.0;
  float k = floor((P.y + 1e-3)/uH);
  vec4 st = floorState(k);
  vec3 c = vec3(0.0);
  if (uLampI > 0.0) c += lampLight(s, k, st)*s.ao;
  if (uKeyCol.r + uKeyCol.g + uKeyCol.b > 0.0){
    float vis = (uKeyShadow > 0.5 && vBook > -0.5) ? rowShadow(b, vS, uKeyLocal) : 1.0;
    c += keyLight(s, vis)*mix(1.0, s.ao, 0.5);
  }
  c += beamLight(s) + lanternFill(s)*s.ao + uAmb*s.albedo*20.0*s.ao + uEnvCol*s.f0*s.ao*(0.6 + 0.4*N.y) + m.emit;
  gl_FragColor = vec4(fog(c, P), 1.0);
}`;

const _inv = new THREE.Matrix4();
const _cam = new THREE.Vector3();

export class BookShelf {
  // uniforms: libraryUniforms() (shared with the library, so lamps, scan line and fog agree)
  constructor({ uniforms, layout, labels, dividers = [] }) {
    this.books = layout.books;
    this.n = this.books.length;
    this.data = new Float32Array(this.n * TEXELS * 4);
    this.tex = new THREE.DataTexture(this.data, TEXELS, this.n, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    for (let i = 0; i < this.n; i++) this._write(i);
    this.tex.needsUpdate = true;

    const G = new Geo();
    this.books.forEach((b, i) => buildBook(G, b, i));
    buildShelf(G, layout, dividers);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
    geo.setAttribute('aBook', new THREE.Float32BufferAttribute(G.bk, 1));
    geo.setAttribute('aPart', new THREE.Float32BufferAttribute(G.part, 1));
    geo.setAttribute('aArc', new THREE.Float32BufferAttribute(G.arc, 1));
    geo.setIndex(G.count > 65535 ? new THREE.Uint32BufferAttribute(G.idx, 1) : new THREE.Uint16BufferAttribute(G.idx, 1));
    this.vertexCount = G.count;

    const own = {
      uBooks: { value: this.tex },
      uCount: { value: this.n },
      uLabels: { value: labels.labels },
      uStrips: { value: labels.strips },
      uHeroA: { value: labels.heroA ?? labels.labels },
      uHeroB: { value: labels.heroB ?? labels.labels },
      uKeyPos: { value: new THREE.Vector3() }, // world
      uKeyLocal: { value: new THREE.Vector3() }, // shelf space (set by update)
      uKeyCol: { value: new THREE.Color(0, 0, 0) }, // radiant intensity, linear RGB; 0 = off
      uKeyR: { value: 0.01 }, // source radius (m)
      uKeyDir: { value: new THREE.Vector3(0, 0, -1) }, // world; for a beam
      uKeyCone: { value: new THREE.Vector2(-2, -1) }, // cos(outer), cos(inner) half-angles; x <= -1: all round
      uKeyShadow: { value: 1 },
      uEnvCol: { value: new THREE.Color(0.012, 0.008, 0.005) }, // what polished gilt reflects when no light is on it
      uPrintCol: { value: new THREE.Color(0, 0, 0) },
      uCamLocal: { value: new THREE.Vector3() }, // shelf space (set before each render)
      uBackLit: { value: 0 }, // 0: the back boards stay black; 1: they catch bounce light above the books
      uGlowCol: { value: new THREE.Color(1.0, 0.62, 0.3) },
      uShelfDust: { value: 0.4 },
    };
    this.uniforms = { ...uniforms, ...own };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: LIB_COMMON + VERT,
      fragmentShader: LIB_COMMON + frag(labels.stripRows ?? 16),
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.onBeforeRender = (renderer, scene, camera) => {
      _cam.setFromMatrixPosition(camera.matrixWorld);
      this.uniforms.uCamLocal.value.copy(_cam).applyMatrix4(_inv.copy(this.mesh.matrixWorld).invert());
    };
    this.group = new THREE.Group();
    this.group.add(this.mesh);
  }

  _write(i) {
    const b = this.books[i];
    const o = i * TEXELS * 4;
    const D = this.data;
    const L1 = b.label ?? { cell: -1, y0: 0, y1: 0, ground: 0 };
    const L2 = b.label2 ?? { cell: -1, y0: 0, y1: 0, ground: 1 };
    const rows = [
      [b.x, b.y, b.z, b.scale],
      [b.q.x, b.q.y, b.q.z, b.q.w],
      [b.w, b.h, b.d, b.s],
      [b.bind, b.seed, b.wear, b.bind === BIND.LEATHER ? b.bands : 0],
      [b.col[0], b.col[1], b.col[2], b.halfArc],
      [L1.cell, L1.y0, L1.y1, L1.ground],
      [L2.cell, L2.y0, L2.y1, b.strip],
      [b.print, b.glow, b.glowHue, b.dust],
      [b.edgeGilt, b.lime, L2.ground, b.ink],
    ];
    rows.forEach((r, k) => D.set(r, o + k * 4));
  }

  // change a volume's live state or placement; call commit() once after a batch
  set(i, patch) {
    Object.assign(this.books[i], patch);
    this._write(i);
    this._dirty = true;
  }

  commit() {
    if (this._dirty) {
      this.tex.needsUpdate = true;
      this._dirty = false;
    }
  }

  // key light in world space: position, colour × intensity, radius
  key(pos, col, r = 0.01) {
    this.uniforms.uKeyPos.value.copy(pos);
    this.uniforms.uKeyCol.value.copy(col);
    this.uniforms.uKeyR.value = r;
  }

  // make the key a beam toward a world point, with soft edges between inner and outer half-angles (degrees)
  beam(target, inner, outer) {
    const U = this.uniforms;
    U.uKeyDir.value.copy(target).sub(U.uKeyPos.value).normalize();
    U.uKeyCone.value.set(Math.cos((outer * Math.PI) / 180), Math.cos((inner * Math.PI) / 180));
  }

  update() {
    this.group.updateMatrixWorld(true);
    _inv.copy(this.mesh.matrixWorld).invert();
    this.uniforms.uKeyLocal.value.copy(this.uniforms.uKeyPos.value).applyMatrix4(_inv);
  }
}
