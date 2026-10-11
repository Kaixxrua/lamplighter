// s23 · 论文阅读：图表从页面上浮起 · 72 frames (global frames: this row's start in film/timeline.json + 24 t)
// The projects page lands on the left (s22's turn, 0.55 s in) and the page under it is a paper as a guest
// reads it on the site: FrameMorrow, the top paper of 10-05 in the site's arXiv ranking (title, byline and
// abstract on the left; on the right the same day's papers with their HF upvotes), coming sharp. The guest's
// page has no figure (its tables, images and maths are empty), so the chart that rises off it is made of the
// page's own numbers and nothing else: an axis prints itself across the paper under the same-day list, the
// list's own count glyphs are printed under it (moved there, not set again), and ten bars stand up out of
// slits in the axis, rank 1 to 10, each as tall as its HF upvotes (93 … 21), a little past and back, their
// edges born lime and cooling to a hair. FrameMorrow's (2nd; its row is lime on the page) is lime ink, and its
// count keeps its row's pale lime under it, a tag; the others are the page's ink at 60 %. We come in over the
// list as the bars come up under it, round to face the chart, and come to rest on it; the bars go back into
// the page, the last first, as we rise off it, and the paper lifts (the turn lands 0.55 s into s24, on s24's
// X page).
// Flashing: the paper's turn sweeps up through the picture at the end, over three frames (f66–f68: 31 % of
// the picture in transition at f67, zh and en); the rest of s23 stays under a tenth (at most 9 %, the
// camera's drift). s22+s23 pass, zh and en (zh: two frames reach a quarter, s22's f13 at 25.1 % and s23's f67,
// in different seconds; en: one); the cut 8.6 %, as s22's last frames.
// First frame: s22's last, moving on: cam (0.610, 0.378, 0.413), target (0.400, 0.029, 0.000), 0.58 m, az 27°,
// el 37°, 85 mm f/4, at s22's velocity (0.29 m/s, up and back). The join is C1: the 0.75 s key leaves room
// for s22's velocity in every coordinate, so glideFrom's clamp never bites (1920 px: no hitch at the cut).
// Last frame (f71, 2.958 s): cam (0.484, 0.434, 0.502), target (0.370, 0.030, 0.031), 0.63 m, az 13.6°,
// el 39.8°, 85 mm f/5.6, rising and drawing back at 0.24 m/s (0.22 m/s at 3 s, and on at that after: camAt
// carries on past 3 s); the paper lifted out of the picture (e 0.22 at f71, 0.30 at 3 s), s24-x under it at
// mip 4.6, the focus back on the target.
// Where the page fills the picture: the 1920 stills (still quality: f0 zh and en, f18 zh, f36 en, f52 zh, f56 en,
// f71 zh) have a mean of 199.1–204.1, 99.9 % at most 233, the brightest 243 (f0, the lime fore-edge), nothing
// at 255; s22's last frame 201.2 → s23's first 200.7. The 960 previews swept frame by frame: mean at most 204.5
// (f68), 99.9 % at most 232, the brightest 246 (f11/f16: yuv420p's overshoot on the lime fore-edge; 239 in
// the still). Off the paper the gallery stays dark.
// Camera: the book's frame; keys as in s20–s22 (target, distance, azimuth from the tail towards the
// fore-edge, elevation), s22's monotone cubic (glideFrom), leaving s22's last key at s22's velocity; at most
// 0.31 m/s, coming in (1.3 s). 85 mm; f/4 on the list, f/5.6 on the chart. Focus on the target, pulled to
// the chart (its middle, 1.4 cm up) as the bars come up (0.95–1.45 s), back to the target as the paper lifts
// (2.55–2.9 s). From f37, while we look at the chart, the frame's foot stays on the paper: the tail's lime
// edge and the leaf's lime rim are kept out of the picture (the rim clips where it is sharp); before that,
// over the list, the tail's edge shows soft in the bottom-left corner (f10–f36). The camera is beyond the
// tail throughout, and 0.56 m or more from the gutter's axis while a leaf turns.
// Light: as s22 (the gallery's lamps at LOOK20.lamp, the page's own light, the lime edges). The bars are lit
// as the paper is (the lamps a little, the page's light, the print's glow); their lime is lime ink on them.
// Interface: assets/ui/<lang>/s23-paper (the paper as a guest reads it), s24-x under it (held at the
// develop's blur, mip 4.6, for s24; its tweet card as s24 opens on it, c_ink's card at 0: the English in this
// language's card, the board's date field unfocused; in zh the card shows under the lifting paper from f69,
// in en it is the capture there to a level), the projects page landing on the left above the picture (s22-projects,
// s22-results, s22-type, as s22 left it), all captured 10-07 18:46–18:55Z as a guest (the site's 'today',
// Beijing time, is 10-08). Held unreadable at mip 4.6 in the print itself, whatever the framing: the masthead
// (its date), 「未登录」, the dock, and the log-in prompt over the same-day list (登录后即可与 AI 讨论本论文 and
// its lime 登录 button: discussing the paper with the AI is for signed-in readers, and not shown). The list,
// its counts and the chart are the same in zh and en; only the prints' chrome differs.
// Cuts: s22 → s23 continuous (the camera, C1; the projects page's turn). s23 → s24: the paper's turn spans
// the cut (e 0.30 at 3 s); s24 opens on s24-x at mip 4.6, the camera moving on (camAt past 3 s). s24 draws
// this paper as it leaves it: sharp but its held boxes (held23), the figure printed whole (drawFigure with
// the axis and every count at 1, on FIG.inset), the bars down, their slits shut.
// Sound: see CUES (s into the shot).

import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, clamp, smoothstep, smootherstep, track } from 'film/lib/ease.js';
import { makeCanvas, canvasTexture } from 'film/lib/text.js';
import { Library } from 'world/library.js';
import { BOOK, BOOK_LOOK, Book, slab } from 'world/c_book.js';
import { INK, loadInkCard } from 'world/c_ink.js';
import { LOOK20 } from './s20.js';
import { SIZE, orbit } from './s21.js';
import { T22, camAt as camAt22 } from './s22.js';

export const meta = { frames: 72, quality: { final: { samples: 8 } } };
const T0 = 4.0; // s22's time at this shot's start
// one page more under the paper than in s22 (s24's), so the leaves sink one step more: the piles lie as
// s22 left them
export const SINK = 6;

export const T23 = {
  develop: [0.12, 0.62, 4.6, 0], // the paper comes sharp (but its held boxes)
  axis: [1.0, 1.55], // the figure's axis draws itself under the list, left to right
  // the bars, rank 1 to 10 left to right: each starts up at t0 + lag·i out of its slit in the axis, up over
  // 'dur' (a little past and back); its edges born 'hot' lime and cooling (s) to 'rim'; its count printed
  // under it as it starts ('label' s to come in)
  rise: { t0: 1.05, lag: 0.055, dur: 0.36, hot: 1.2, cool: 0.22, rim: 0.45, label: 0.12 },
  // the bars go back into the page as it starts up, the last (rank 10) first, each over 'dur'
  sink: { t0: 2.5, lag: 0.012, dur: 0.24 },
  turn: [2.65, 3.55, 0.75], // the paper lifts … lands (0.55 s into s24); its curl
  hMax: 0.036, // the tallest bar (93), m
};

// The figure: under the same-day list, in the paper's blank band above the dock (texels of the capture,
// y down; the band runs y 3293–3975 there). An axis across the list's width, the ten counts under it (the
// list's own digits, moved), and a bar standing over each: rank order, its height ∝ its HF upvotes.
const LIST = { x: 4960, w: 1720 }; // the same-day list's column (manifest: sameDay boxes)
export const FIG = {
  inset: [4960, 3740, 1720, 160], // the printed part (the axis and the counts), as an inset in the print
  axisY: 3790, // its centre line (it is 6 texels thick)
  axisX: [4984, 6656],
  barW: 104, // a bar's width (texels): 0.63 cm
  barD: 0.003, // its depth (m), head to tail
  labelY: 3812, // the counts' tops (the digits' crops, 61 texels tall)
  ink: [20, 35, 69], // the page's ink (its titles and borders), sRGB: the axis
  bg: [255, 254, 249], // the site's page (#FFFEF9), sRGB
  fill: 0.6, // the bars: the ink at 60 % on the page (a chart's fill under its full-ink labels)
};
// The same-day list, rank 1–10 (manifest.json: regions.sameDay; the same in zh and en), and where each
// count's digits are on the capture (texels: x, y, w, h; measured, right-aligned at x 6645, 37 tall)
const SAME_DAY = [
  [93, [6587, 995, 58, 37]],
  [71, [6601, 1227, 43, 37]], // FrameMorrow (this page's paper), its row lime on the page
  [70, [6585, 1535, 60, 37]],
  [68, [6585, 1771, 60, 37]],
  [50, [6583, 2003, 62, 37]],
  [42, [6586, 2235, 60, 37]],
  [40, [6580, 2467, 65, 37]],
  [24, [6587, 2699, 59, 37]],
  [21, [6601, 2935, 43, 37]],
  [21, [6601, 3167, 43, 37]],
];
const MINE = 1; // FrameMorrow's index

// Boxes of each print held unreadable ([x, y, w, h], texels, a few wider than manifest.json's regions)
const ACCT = [7260, 16, 410, 180]; // 「未登录」 (s22's)
const DOCK = [2100, 4012, 3480, 288];
const MAST23 = { zh: [1016, 38, 957, 124], en: [1077, 38, 952, 124] }; // s22's MAST.s23
// the log-in prompt over the same-day list (「登录后即可与 AI 讨论本论文」 and its lime 登录 button), its
// text and button only (zh content x 5032–5786, y 316–579; en 5032–6171, 324–579)
const CTA = { zh: [5010, 296, 800, 304], en: [5010, 300, 1185, 300] };
// the paper's held boxes in a language (s24 holds them the same while the paper turns on over the cut)
export const held23 = (lang) => [MAST23[lang], ACCT, DOCK, CTA[lang]];
const MAST22 = { zh: [1216, 38, 957, 124], en: [1438, 38, 952, 124] }; // the projects page's (s22's MAST.s22)
// s22's, for the 10-05 page (the 5th's masthead, account, dock, 01 rea, 09 AnyPS5)
const D05 = [[830, 118, 1384, 206], [7120, 92, 480, 256], DOCK, [80, 1086, 1868, 708], [80, 3341, 5627, 305]];

// The camera: [t, [x, y, z, distance, azimuth, elevation], lens, f-stop] (book frame, m and degrees). The
// first key is s22's last, where the camera is at s22's end.
export const CAM23 = {
  keys: [
    [0, null, 85, 4], // s22's camera at its end, drifting back
    // the paper's right half: the same-day list as it comes sharp (the camera 3 cm on along x from s22's last,
    // room for s22's velocity there: the join is C1)
    [0.75, [0.383, 0.0293, 0.022, 0.678, 29.2, 38.4], 85, 4],
    [1.6, [0.372, 0.03, 0.043, 0.55, 13, 36.5], 85, 5.6], // in over the list as the bars come up under it
    [2.2, [0.368, 0.03, 0.052, 0.48, 4, 34.5], 85, 5.6], // round to face the chart as it stands
    [3.0, [0.37, 0.03, 0.03, 0.64, 14, 40], 85, 5.6], // up and back as the bars go down and the paper lifts
  ],
};

// s22's monotone cubic leaving its first key at a given speed (s22's glideFrom): no faster than 3× the
// first segment's and never against it, Fritsch–Butland tangents inside (no overshoot), carried on at the
// last segment's slope after the last key.
export function glideFrom(keys, m0) {
  const n = keys.length;
  const T = keys.map((k) => k[0]);
  const V = keys.map((k) => k[1]);
  const M = V.map((v) => v.map(() => 0));
  for (let j = 0; j < V[0].length; j++) {
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((V[i + 1][j] - V[i][j]) / (T[i + 1] - T[i]));
    M[0][j] = d[0] * m0[j] > 0 ? Math.sign(d[0]) * Math.min(Math.abs(m0[j]), 3 * Math.abs(d[0])) : 0;
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = T[i] - T[i - 1];
      const h1 = T[i + 1] - T[i];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      M[i][j] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    M[n - 1][j] = d[n - 2];
  }
  return (t) => {
    if (t <= T[0]) return V[0].slice();
    if (t >= T[n - 1]) return V[n - 1].map((v, j) => v + M[n - 1][j] * (t - T[n - 1]));
    let i = 0;
    while (t > T[i + 1]) i++;
    const h = T[i + 1] - T[i];
    const u = (t - T[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    const a0 = 2 * u3 - 3 * u2 + 1;
    const b0 = u3 - 2 * u2 + u;
    const a1 = -2 * u3 + 3 * u2;
    const b1 = u3 - u2;
    return V[i].map((v, j) => a0 * v + b0 * h * M[i][j] + a1 * V[i + 1][j] + b1 * h * M[i + 1][j]);
  };
}

const c0 = camAt22(T0);
const c1 = camAt22(T0 + 1);
export const camAt = glideFrom(
  CAM23.keys.map(([t, k]) => [t, k ? orbit(k) : c0]),
  c1.map((v, j) => v - c0[j]), // s22's camera carries on at its last segment's speed
);
const LENS = CAM23.keys.map(([t, , l]) => [t, l]);
const FSTOP = CAM23.keys.map(([t, , , f]) => [t, f]);

// a little past full, and back (s18's leaves, s22's cards)
const back = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2);
// a turn's e and curl at t
const turnAt = ([a, b, B], t) => {
  const e = smootherstep(a, b, t);
  return { e, bend: B * Math.sin(2 * Math.PI * e) };
};

// where bar i stands (texels: the centre of its tenth of the list's column)
export const barX = (i) => LIST.x + (LIST.w * (i + 0.5)) / SAME_DAY.length;
const TEX_M = (BOOK.W - BOOK.BOX.gutter - BOOK.BOX.fore) / SIZE[0]; // a texel across the print (m)
const TEX_MY = (BOOK.H - BOOK.BOX.head - BOOK.BOX.tail) / SIZE[1]; // down it

// The printed part of the figure on a canvas the size of FIG.inset: the page's own paper (#FFFEF9, as on
// the capture), the axis drawn up to 'axisTo' (0…1 of its length), each count at its alpha (alphas[i],
// 0…1): the capture's own digits (img), a 96 × 61 crop round them, moved under the bar.
export function drawFigure(cv, img, axisTo, alphas) {
  const g = cv.getContext('2d');
  const [ix, iy, iw, ih] = FIG.inset;
  g.globalAlpha = 1;
  g.fillStyle = `rgb(${FIG.bg.join(',')})`; // the page under the list, as captured
  g.fillRect(0, 0, iw, ih);
  const [a0, a1] = FIG.axisX;
  const xe = a0 + (a1 - a0) * clamp(axisTo);
  if (xe > a0) {
    g.fillStyle = `rgb(${FIG.ink.join(',')})`;
    g.fillRect(a0 - ix, FIG.axisY - 3 - iy, xe - a0, 6);
  }
  SAME_DAY.forEach(([, [x, y, w]], i) => {
    const a = clamp(alphas[i]);
    if (a <= 0) return;
    g.globalAlpha = a;
    g.drawImage(img, Math.round(x + w / 2 - 48), y - 12, 96, 61, Math.round(barX(i) - 48) - ix, FIG.labelY - iy, 96, 61);
  });
  g.globalAlpha = 1;
}
export const newFigureCanvas = () => makeCanvas(FIG.inset[2], FIG.inset[3]);

// A bar: a block of the page's ink (FrameMorrow's lime ink on the paper) standing out of its slit in the
// axis, lit like the paper round it (the gallery's lamps a little, the page's own light) and glowing like
// the print; its edges a hair of lime, born hot.
const BAR_FRAG = /* glsl */ `
uniform vec3 uInk;          // the bar's ink, as the print's albedo (the site's colour × uUIk)
uniform float uLimeInk;     // 1: lime ink on the paper instead (FrameMorrow's)
uniform float uGlowK, uEdgeK;
uniform vec3 uPaper;
uniform vec3 uBar;          // its width, height now, depth (m)
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vFace;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  vec3 tint = uLitCol/max(max(uLitCol.r, uLitCol.g), max(uLitCol.b, 1e-4));
  vec3 alb = mix(uInk, uPaper*tint, uLimeInk);
  Surf s = Surf(vW, N, V, alb, vec3(0.03), 0.6, 1.0, 0.0);
  vec3 c = lampLight(s, uK, floorState(uK))*uBkPaperLamp + alb*(1.0/PI)*bookLight(vW, N, 0.3) + alb*uGlowK;
  // how far into its face from the face's edges (m): front and back (x, y), top (x, z), ends (z, y); not the foot
  vec2 e;
  if (vFace < 0.5) e = vec2(0.5*uBar.x - abs(vUv.x), (1.0 - vUv.y)*uBar.y);
  else if (vFace < 1.5) e = vec2(0.5*uBar.x - abs(vUv.x), 0.5*uBar.z - abs(vUv.y));
  else e = vec2(0.5*uBar.z - abs(vUv.x), (1.0 - vUv.y)*uBar.y);
  float dE = min(e.x, e.y);
  float aa = fwidth(dE) + 1e-6;
  float rw = 0.00035;
  float kr = uEdgeK*smoothstep(rw + aa, max(rw - aa, 0.0), dE)*clamp(rw/aa, 0.25, 1.0);
  c = mix(c, c*tint, 0.85*min(kr, 1.0)) + uLitCol*(0.3*kr);   // lime ink, and a little light
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// a leaf's surface at a point of its print (texels), its normal and its tangent along it (book frame),
// from its grid (as Card.at)
function leafAt(leaf, px, py, P, N, T) {
  const B = leaf.u.uBox.value;
  const u = B.x + (px / SIZE[0]) * (B.z - B.x);
  const v = B.y + (1 - py / SIZE[1]) * (B.w - B.y);
  const NS = BOOK.NS;
  const NW = BOOK.NW;
  const pos = leaf.pos;
  const fi = Math.min(Math.max(u * NS, 0), NS - 1e-6);
  const fj = Math.min(Math.max((1 - v) * NW, 0), NW - 1e-6);
  const i = Math.floor(fi);
  const j = Math.floor(fj);
  const a = fi - i;
  const b = fj - j;
  const g = (ii, jj, k) => pos[(jj * (NS + 1) + ii) * 3 + k];
  for (let k = 0; k < 3; k++) {
    const p0 = g(i, j, k) + (g(i + 1, j, k) - g(i, j, k)) * a;
    const p1 = g(i, j + 1, k) + (g(i + 1, j + 1, k) - g(i, j + 1, k)) * a;
    P.setComponent(k, p0 + (p1 - p0) * b);
  }
  T.set(g(i + 1, j, 0) - g(i, j, 0), g(i + 1, j, 1) - g(i, j, 1), g(i + 1, j, 2) - g(i, j, 2)).normalize();
  const c = new THREE.Vector3(g(i, j + 1, 0) - g(i, j, 0), g(i, j + 1, 1) - g(i, j, 1), g(i, j + 1, 2) - g(i, j, 2));
  N.crossVectors(c, T).normalize();
  return P;
}

// bar i's height at t (m): up out of its slit, a little past and back; down again as the paper lifts
export function barH(i, t) {
  const R = T23.rise;
  const S = T23.sink;
  const up = back((t - R.t0 - R.lag * i) / R.dur);
  const ts = S.t0 + S.lag * (SAME_DAY.length - 1 - i);
  const down = 1 - smootherstep(ts, ts + S.dur, t);
  return (T23.hMax * SAME_DAY[i][0]) / SAME_DAY[0][0] * up * down;
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  const K = BOOK.FLOOR;
  const lib = new Library({ floors: [K - 2, K + 2], near: 1, mid: 2, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK20.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);

  // the captures, and what manifest.json says of them (in this language)
  const lang = ctx.lang;
  const entries = (await ctx.load.json('/assets/ui/manifest.json')).entries;
  const entry = (name) => entries.find((e) => e.name === name && e.lang === lang);
  const eProj = entry('s22-projects');
  const eType = entry('s22-type');
  const load = (file) => ctx.load.texture(`/${file}`, { srgb: true, anisotropy: 8 });
  const [x24, paper, proj, res, t05, typed] = await Promise.all([
    ...['s24-x', 's23-paper', 's22-projects', 's22-results', 's21-day-05'].map((n) => load(`assets/ui/${lang}/${n}.png`)),
    load(eType.frames[T22.keys.length].file), // the search box as s22 left it: 'mcp server'
  ]);
  // the leaves as s22 left them, s24's page under the paper; the ones under 10-05 on the left are never seen
  // here (their prints are left out)
  const book = new Book({
    U,
    pages: [{ tex: x24 }, { tex: paper }, { tex: proj }, { tex: t05 }, { tex: null }, { tex: null }, { tex: null }, { tex: null }],
  });
  for (const l of book.leaves) l.hR -= SINK * BOOK.STEP;
  scene.add(book.group, book.world);
  book.setCover(Math.PI);
  const [p24, p23, pProj, p05, ...under] = book.leaves;
  const mip = T23.develop[2];
  p24.u.uSharp.value = mip; // s24 brings it sharp
  // its tweet card as s24 opens on it (c_ink at 0: the English, the date field unfocused), so the page that
  // shows as the paper lifts is the one s24 goes on with
  const ink = await loadInkCard(lang);
  p24.inset(ink.render(ctx.renderer, 0), INK.box, SIZE, 1, ink.sub);
  p23.mask(held23(lang), SIZE, mip);
  p23.u.uSharp.value = mip;
  // the projects page as s22 left it: the results down the whole page, the search box typed
  pProj.mask([MAST22[lang], ACCT, DOCK, ...eProj.keepUnreadable.map((k) => k.box)], SIZE, mip);
  pProj.print2(res, 3);
  pProj.wipe(1 + T22.wipe[2], T22.wipe[2], T22.wipe[3]);
  pProj.inset(typed, eType.clipCss.map((v) => 4 * v), SIZE, 1);
  p05.mask(D05, SIZE, mip);
  for (const l of [p05, ...under]) {
    l.pose({ e: 1 });
    l.u.uSpillK.value = 1;
  }

  // the figure: its printed part (an inset in the paper's print), its bars (blocks on the leaf) and their
  // slits (the leaf's cut boxes: blank paper where a bar stands, and its shadow)
  const cv = newFigureCanvas();
  const figTex = canvasTexture(cv, { srgb: true, mipmaps: true, anisotropy: 8 });
  let drawn = '';
  const figure = (axisTo, alphas) => {
    const key = [axisTo, ...alphas].map((v) => clamp(v).toFixed(4)).join();
    if (key === drawn) return;
    drawn = key;
    drawFigure(cv, paper.image, axisTo, alphas);
    figTex.needsUpdate = true;
  };
  figure(0, SAME_DAY.map(() => 0));
  p23.inset(figTex, FIG.inset, SIZE, 1);
  const W = FIG.barW * TEX_M;
  const Dp = FIG.barD / TEX_MY; // a bar's depth in texels
  const geo = slab(-W / 2, W / 2, 0, 1, -FIG.barD / 2, FIG.barD / 2, { '+z': 0, '-z': 0, '+y': 1, '-y': 1, '+x': 2, '-x': 2 });
  const uUIk = p23.u.uUIk.value;
  const inkOf = (c) => new THREE.Color().setRGB(...c.map((v) => v / 255), THREE.SRGBColorSpace);
  const bars = SAME_DAY.map((_, i) => {
    const ink = inkOf(FIG.ink.map((v, k) => v * FIG.fill + FIG.bg[k] * (1 - FIG.fill)));
    const u = {
      uInk: { value: new THREE.Vector3(ink.r * uUIk.x, ink.g * uUIk.y, ink.b * uUIk.z) },
      uLimeInk: { value: i === MINE ? 1 : 0 },
      uGlowK: p23.u.uGlow, // the page's own glow, shared
      uEdgeK: { value: 0 },
      uBar: { value: new THREE.Vector3(W, 0, FIG.barD) },
    };
    const mesh = new THREE.Mesh(geo, book.material(BAR_FRAG, u));
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.visible = false;
    book.group.add(mesh);
    const x = barX(i);
    p23.u.uCut.value[i].set((x - FIG.barW / 2 - 2) / SIZE[0], 1 - (FIG.axisY + Dp / 2 + 2) / SIZE[1], (x + FIG.barW / 2 + 2) / SIZE[0], 1 - (FIG.axisY - Dp / 2 - 2) / SIZE[1]);
    return { mesh, u, x };
  });
  p23.u.uCutN.value = bars.length;

  const F = book.F;
  const tgt = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const P = new THREE.Vector3();
  const Nn = new THREE.Vector3();
  const Tt = new THREE.Vector3();
  const Zz = new THREE.Vector3();
  const S1 = new THREE.Vector3();
  const fW = new THREE.Vector3();
  const k = LOOK20.page * BOOK_LOOK.glow;
  const pageL = BOOK_LOOK.paper.map((p) => p * k);
  const R = T23.rise;
  // where the focus is: the target (the list), then the figure (its bars half up), riding the paper
  const focusAt = (t) => {
    leafAt(p23, LIST.x + LIST.w / 2, FIG.axisY, P, Nn, Tt);
    P.addScaledVector(Nn, 0.4 * T23.hMax);
    F.toWorld(P.x, P.y, P.z, fW);
    const w = smoothstep(0.95, 1.45, t) * (1 - smoothstep(2.55, 2.9, t)); // back to the target as the paper lifts
    return lerp(focusDistance(camera, tgt), focusDistance(camera, fW), w);
  };

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      // the projects page lands (s22's turn); the paper lifts at the end
      const pp = turnAt(T22.turn, T0 + t);
      pProj.pose(pp);
      pProj.u.uSpillK.value = smoothstep(0.02, 0.15, pp.e);
      const p3 = turnAt(T23.turn, t);
      p23.pose(p3);
      p23.u.uSpillK.value = smoothstep(0.02, 0.15, p3.e);
      p24.pose({ e: 0 });
      p24.u.uSpillK.value = 0;

      // the paper comes sharp; the figure prints, its bars stand up and go back down
      const [d0, d1, s0, s1] = T23.develop;
      p23.u.uSharp.value = lerp(s0, s1, smoothstep(d0, d1, t));
      const [a0, a1] = T23.axis;
      figure(
        (t - a0) / (a1 - a0),
        bars.map((_, i) => (t - (R.t0 + R.lag * i) + 0.5 * R.label) / R.label),
      );
      bars.forEach((b, i) => {
        const h = barH(i, t);
        const on = h > 1e-4;
        b.mesh.visible = on;
        p23.u.uCutH.value[i] = on ? Math.min(0.2 * h, 0.006) : 0;
        if (!on) return;
        leafAt(p23, b.x, FIG.axisY, P, Nn, Tt);
        Zz.crossVectors(Tt, Nn).normalize();
        P.addScaledVector(Nn, -0.0002); // its foot a little under the paper
        b.mesh.matrix.makeBasis(Tt, Nn, Zz).scale(S1.set(1, h + 0.0002, 1)).setPosition(P);
        b.mesh.matrixWorldNeedsUpdate = true;
        b.u.uBar.value.y = h + 0.0002;
        const tr = R.t0 + R.lag * i;
        b.u.uEdgeK.value = R.rim + R.hot * (t > tr ? Math.exp(-(t - tr) / R.cool) : 0);
      });

      book.setLight({ page: pageL, edge: LOOK20.edge[1], logo: LOOK20.logo });

      // the camera
      const c = camAt(t);
      F.toWorld(c[3], c[4], c[5], tgt);
      F.toWorld(c[0], c[1], c[2], pos);
      setLens(camera, track(LENS, t));
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 86 + T0 + t;
    },
    post: (t) => ({ dof: { focus: focusAt(t), fstop: track(FSTOP, t) } }),
  };
}

// Sound cues, s into the shot.
export const CUES = {
  land: +(T22.turn[1] - T0).toFixed(3), // the projects page lands (s22's turn)
  develop: T23.develop.slice(0, 2), // the paper comes sharp
  axis: T23.axis, // the figure's axis draws itself, left to right
  // the bars, rank 1–10 of the same-day list, left to right: each starts up out of the axis (settling
  // T23.rise.dur later), its height its HF upvotes (the same in zh and en), and goes back down (over T23.sink.dur)
  bars: [
    'Does Learning Protein Folding Generalize to Broader Reasoning?',
    'FrameMorrow: Future-guided Frame Selection with Prospective Tokens for Long-Horizon Video Generation',
    'Scaling Trajectories for Complex Tasks through Recursive Self-Rewrite',
    'MotorMind: Scaffolding General Vision Language Models for Zero-Shot Robot Manipulation',
    'World Action Modeling with Progressive Visual Planning',
    'On-Policy Parameter Update Direction Underlies Generalization in LLM Post-Training',
    'Native Action-Prior Learning from Videos for World Action Models',
    'Pivot-SD: Efficient Self-Distillation for Masked Diffusion Language Models',
    'SimuVerity: Benchmarking Agents for Engineering-Grade Simulink Model Generation',
    'PDE-JEPA: Predictive Representation Learning of Latent Dynamics Modeling for Parametric PDEs',
  ].map((title, i) => ({
    rank: i + 1,
    title,
    upvotes: SAME_DAY[i][0],
    mine: i === MINE, // this page's paper: its bar lime
    rise: +(T23.rise.t0 + T23.rise.lag * i).toFixed(3),
    sink: +(T23.sink.t0 + T23.sink.lag * (SAME_DAY.length - 1 - i)).toFixed(3),
  })),
  // the paper lifts; it lands 0.55 s into s24 (on s24's page)
  turn: { lift: T23.turn[0], land: T23.turn[1] },
};
