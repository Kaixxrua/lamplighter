// s22 · 项目库：搜索 mcp server，结果层层浮起 · 96 frames (global frames: this row's start in film/timeline.json + 24 t)
// The 10-05 leaf lands on the left (s21's turn, 0.55 s in) and the page under it is the project library as
// a guest lands on it, today's trending, coming sharp. We come down onto its search box and 'mcp server' is
// typed in, a key at a time (the site's own frames, one a key: the celesta). The search runs: the results
// come down the page behind a line of lime (the scope goes from 今日热榜 to 全部, the sort to 相关度) as we
// come back off the box, and once they are down they rise off it, card after card, a row of the list each
// (punkpeye/awesome-mcp-servers, modelcontextprotocol/servers, headroomlabs-ai/headroom …): they stand a
// millimetre or two off the paper, hinged at the head, their near edges flicking up toward us and settling
// a little raised, their edges born lime and cooling to a hair; the paper where each lay is blank, in its
// shadow. The focus runs down the first names as they rise; we glide along the rows to their numbers, and
// each card's 24-hour stars (today's +N) ring out in lime, the card hopping. The cards lie down again and
// the page lifts (the turn lands 0.55 s into s23, on s23's paper).
// Flashing: the cards keep still while the camera comes back off the search box (the rows and the slots
// under raised cards sweeping the picture together put a third of it in transition, frame after frame:
// flashcheck fails); they rise as it slows, and lie down while it drifts. s21+s22 pass, zh and en: no
// frame of s22 with a quarter of the picture in transition (the most 24 %, zh f13, the develop), the cut 1–2 %.
// First frame: s21's last, moving on (mean luma 204.8 at 1920, s21's f95 204.8). Last frame: 0.58 m from the
// rows' numbers, 37° off the page, 27° toward the fore-edge, 85 mm, f/4; the projects page lifted out of
// the picture (e 0.22), s23's paper under it at mip 4.6, the fore-edge and the dark beyond it on the right
// (mean luma 201). Where the page fills the picture: mean 188–205, 99.9th percentile 227–235 (the most at
// the rings), nothing at 255 (the brightest 245, a ring).
// Camera: the book's frame; keys as in s20 and s21 (target, distance, azimuth, elevation), the same
// monotone cubic, leaving s21's last key at s21's speed. It stops on the first names (2.2–2.45 s) so they
// are sharp under the final's motion blur, then glides along the rows. Focus on the target, but on the
// first five cards' names while they rise (a pull down the rows), and back on the target as we leave them
// for the numbers.
// It is beyond the tail and 0.6 m or more from the gutter's axis while the leaves turn.
// Light: as s21 (the gallery's lamps at LOOK20.lamp, the page's own light, the lime edges). Nothing clips:
// the lime here (the wipe's front, the cards' edges, the rings) is lime ink on the paper, as s21's press.
// Interface: assets/ui/<lang>/s22-projects (the library as a guest lands on it), s22-type (the search box,
// a frame a key), s22-results ('mcp server' searched), s23-paper under it (held at the develop's blur, mip
// 4.6, for s23), all captured 10-07 evening as a guest (the site's 'today' is 10-08). Held unreadable at
// mip 4.6 in the print itself, whatever the framing: the masthead (its date), 「未登录」, the dock; on the
// projects page the rows manifest.json keeps unreadable (rea, AnyPS5, dsh-our-free-model). The results have
// none. The search box shows the typing frames throughout (the first is the page's own empty box; the
// results page's own box has the browser's spelling squiggle under 'mcp'). Only the prints differ between
// zh and en.
// Cuts: s21 → s22 continuous (the camera, the 10-05 leaf's turn). s22 → s23: the projects page's turn spans
// the cut; s23 opens on s23's paper (mip 4.6), the camera moving on.
// Sound: see CUES (s into the shot).

import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, clamp, smoothstep, smootherstep, track, ease } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { DEG } from 'world/geo.js';
import { BOOK, BOOK_LOOK, Book, Card } from 'world/c_book.js';
import { LOOK20 } from './s20.js';
import { T21, SIZE, orbit, camAt as camAt21 } from './s21.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const T0 = 4.0; // s21's time at this shot's start
// one page more under the projects page than in s21 (s23's), so the leaves sink one step more: the piles lie
// as s21 left them
export const SINK = 5;

export const T22 = {
  develop: [0.12, 0.62, 4.6, 0], // the projects page comes sharp (but its held boxes)
  keys: [0.66, 0.745, 0.825, 0.95, 1.035, 1.11, 1.185, 1.26, 1.335, 1.41], // 'mcp server', a key each
  enter: 1.56, // the search runs
  wipe: [1.6, 1.95, 0.06, 1.0], // the results come down the page: start, end, the front's width (of the page), its lime
  // the cards: the first starts up at t0, each the next 'lag' later, up over 'dur' (a little past and back)
  // to 'lift' (m) at the head edge, the near edge flicking up by 'kick' and settling at 'rest'; their sides
  // lime, born 'hot' and cooling (s) to 'rim', their tops' edges a hair ('rimTop')
  rise: { t0: 2.0, lag: 0.065, dur: 0.42, lift: 0.0015, rest: 4 * DEG, kick: 9 * DEG, hot: 1.0, cool: 0.25, rim: 0.5, rimTop: 0.6 },
  // each card's +N rings, top to bottom: a lime ring r[0] → r[1] (m) at k; the card hops (m) and its sides flash
  tick: { t0: 2.95, lag: 0.035, dur: 0.36, r: [0.0015, 0.0055], k: 1.0, hop: 0.0008, flash: 0.8 },
  down: { t0: 3.2, lag: 0.025, dur: 0.25 }, // the cards lie down, the last flat at 3.73 s, as the page starts up
  turn: [3.65, 4.55, 0.75], // the projects page lifts … lands (0.55 s into s23); its curl
  cards: 12, // the results' rows 01–12 (13 runs under the dock)
};

// Boxes of each print held unreadable ([x, y, w, h], texels, a few wider than manifest.json's regions). The
// projects page's keepUnreadable rows come from manifest.json; the results page has none.
const ACCT = [7260, 16, 410, 180]; // 「未登录」 on the s22 and s23 pages (x 7299–7607, y 37–162 on the captures)
const DOCK = [2100, 4012, 3480, 288];
const MAST = {
  s22: { zh: [1216, 38, 957, 124], en: [1438, 38, 952, 124] }, // the masthead (its date)
  s23: { zh: [1016, 38, 957, 124], en: [1077, 38, 952, 124] },
};
// s21's, for the 10-05 page (the 5th's masthead, account, dock, 01 rea, 09 AnyPS5)
const D05 = [[830, 118, 1384, 206], [7120, 92, 480, 256], DOCK, [80, 1086, 1868, 708], [80, 3341, 5627, 305]];
const D06 = [[830, 118, 1384, 206], [7120, 92, 480, 256], DOCK, [80, 1086, 1868, 708], [80, 3649, 5627, 305]];
const CARD_INSET = [8, 10]; // a card is its row less this (texels, each side): paper shows between the cards

// The camera: [t, [x, y, z, distance, azimuth, elevation], lens, f-stop] (book frame, m and degrees). The
// first key is s21's last, where the camera is at s21's end.
export const CAM22 = {
  keys: [
    [0, null, 85, 2.8], // s21's camera at its end, moving as it was
    [0.72, [0.1012, 0.0278, -0.1114, 0.22, -4, 42], 85, 4], // down onto the search box as it takes the focus
    [1.5, [0.1012, 0.0278, -0.1114, 0.2, -3, 43], 85, 4], // in a little while 'mcp server' is typed
    [2.2, [0.15, 0.0284, -0.035, 0.42, 8, 33], 85, 4], // back as the results rise: their names
    [2.45, [0.15, 0.0284, -0.035, 0.41, 8, 33], 85, 4], // holding on them (the first five rise)
    [3.0, [0.3985, 0.0291, -0.04, 0.38, 22, 32], 85, 4], // along the rows to their numbers
    [3.55, [0.41, 0.0291, -0.02, 0.46, 25, 34], 85, 4], // down the numbers; the cards lie down
    [4.0, [0.4, 0.0291, 0.0, 0.58, 27, 37], 85, 4], // drifting back as the page lifts: the fore-edge comes in
  ],
};

// s21's monotone cubic, but leaving its first key at a given speed (s21's at its end) instead of from rest:
// no faster than 3× the first segment's and never against it (so no overshoot there either).
function glideFrom(keys, m0) {
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

const c0 = camAt21(T0);
const c1 = camAt21(T0 + 1);
export const camAt = glideFrom(
  CAM22.keys.map(([t, k]) => [t, k ? orbit(k) : c0]),
  c1.map((v, j) => v - c0[j]), // s21's camera carries on at its last segment's speed
);
const LENS = CAM22.keys.map(([t, , l]) => [t, l]);
const FSTOP = CAM22.keys.map(([t, , , f]) => [t, f]);

// a little past full, and back (s18's leaves)
const back = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2);
// the turn's e and curl at t
const turnAt = ([a, b, B], t) => {
  const e = smootherstep(a, b, t);
  return { e, bend: B * Math.sin(2 * Math.PI * e) };
};

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
  const eRes = entry('s22-results');
  const eType = entry('s22-type');
  const load = (file) => ctx.load.texture(`/${file}`, { srgb: true, anisotropy: 8 });
  const [paper, proj, res, t05, t06, ...typed] = await Promise.all([
    ...['s23-paper', 's22-projects', 's22-results', 's21-day-05', 's21-day-06'].map((n) => load(`assets/ui/${lang}/${n}.png`)),
    ...eType.frames.map((f) => load(f.file)),
  ]);
  // the leaves as s21 left them, s23's page under the projects page; the three under 10-06 on the left are
  // never seen here (their prints are left out)
  const book = new Book({
    U,
    pages: [{ tex: paper }, { tex: proj }, { tex: t05 }, { tex: t06 }, { tex: null }, { tex: null }, { tex: null }],
  });
  for (const l of book.leaves) l.hR -= SINK * BOOK.STEP;
  scene.add(book.group, book.world);
  book.setCover(Math.PI);
  const [p23, pProj, p05, p06, ...under] = book.leaves;
  const mip = T22.develop[2];
  p23.mask([MAST.s23[lang], ACCT, DOCK], SIZE, mip);
  p23.u.uSharp.value = mip; // s23 brings it sharp
  // the projects page: held boxes first (the results print takes the first three), then its rows
  pProj.mask([MAST.s22[lang], ACCT, DOCK, ...eProj.keepUnreadable.map((k) => k.box)], SIZE, mip);
  pProj.print2(res, 3);
  pProj.u.uHasTex2.value = 0; // till the search runs
  p05.mask(D05, SIZE, mip);
  p06.mask(D06, SIZE, mip);
  p06.u.uSharp.value = T21.dayMip;
  for (const l of [p06, ...under]) {
    l.pose({ e: 1 });
    l.u.uSpillK.value = 1;
  }
  under[under.length - 1].u.uShow.value = 0; // the flyleaf (s20's)
  const box = eType.clipCss.map((v) => 4 * v); // the typing frames' box on the page

  // the cards: the results' rows 01–12, less a margin
  const rows = eRes.regions.rows.slice(0, T22.cards);
  const cards = rows.map(({ box: [x, y, w, h] }, i) => new Card(book, pProj, [x + CARD_INSET[0], y + CARD_INSET[1], w - 2 * CARD_INSET[0], h - 2 * CARD_INSET[1]], SIZE, { tex: res, slot: i }));
  // each card's 24-hour cell (CSS px on the page → texels): where its +N rings
  const plusAt = rows.map((r) => {
    const [x, y, w, h] = r.cells[1].box;
    return [4 * (x + w / 2), 4 * (y + h / 2)];
  });
  // where its name is (texels): the focus runs down them as they rise
  const nameAt = rows.map((r) => {
    const [x, y, w, h] = r.parts.name;
    return [x + w / 2, y + h / 2];
  });

  const F = book.F;
  const tgt = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const fP = new THREE.Vector3();
  const fN = new THREE.Vector3();
  const fW = new THREE.Vector3();
  const k = LOOK20.page * BOOK_LOOK.glow;
  const pageL = BOOK_LOOK.paper.map((p) => p * k);
  // a point of the projects page's print (texels) in the book's frame, 'up' off it along its normal
  const B = pProj.u.uBox.value;
  const onPage = (px, py, up, out) => {
    cards[0].at(B.x + (px / SIZE[0]) * (B.z - B.x), B.y + (1 - py / SIZE[1]) * (B.w - B.y), out, fN);
    return out.addScaledVector(fN, up);
  };
  const R = T22.rise;
  const D = T22.down;
  const Tk = T22.tick;
  // where the focus is: the target, but on the cards' names as they rise (the one halfway up)
  const focusAt = (t) => {
    const fi = clamp((t - R.t0 - 0.5 * R.dur) / R.lag, 0, 4);
    const i0 = Math.floor(fi);
    const i1 = Math.min(i0 + 1, T22.cards - 1);
    const a = fi - i0;
    onPage(lerp(nameAt[i0][0], nameAt[i1][0], a), lerp(nameAt[i0][1], nameAt[i1][1], a), R.lift, fP);
    F.toWorld(fP.x, fP.y, fP.z, fW);
    const w = smoothstep(T22.enter, R.t0 + 0.2, t) * (1 - smoothstep(2.4, 2.7, t));
    return lerp(focusDistance(camera, tgt), focusDistance(camera, fW), w);
  };

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      // 10-05 lands (s21's turn); the projects page lifts at the end
      const p5 = turnAt(T21.turn, T0 + t);
      p05.pose(p5);
      p05.u.uSpillK.value = smoothstep(0.02, 0.15, p5.e);
      const pp = turnAt(T22.turn, t);
      pProj.pose(pp);
      pProj.u.uSpillK.value = smoothstep(0.02, 0.15, pp.e);
      p23.pose({ e: 0 });
      p23.u.uSpillK.value = 0;

      // the projects page comes sharp; 'mcp server' is typed, a frame a key; the results come down the page
      const [d0, d1, s0, s1] = T22.develop;
      pProj.u.uSharp.value = lerp(s0, s1, smoothstep(d0, d1, t));
      pProj.inset(typed[T22.keys.filter((tk) => t >= tk).length], box, SIZE, 1);
      const [w0, w1, ww, wl] = T22.wipe;
      pProj.u.uHasTex2.value = t >= w0 ? 1 : 0;
      pProj.wipe(lerp(0, 1 + ww, ease.inOutSine(clamp((t - w0) / (w1 - w0)))), ww, wl);

      // the cards rise, a row after another, their +N ring, and they lie down
      cards.forEach((card, i) => {
        const tr = R.t0 + R.lag * i;
        const u = (t - tr) / R.dur;
        const down = 1 - smootherstep(D.t0 + D.lag * i, D.t0 + D.lag * i + D.dur, t);
        const v = (t - (Tk.t0 + Tk.lag * i)) / Tk.dur;
        const ring = v > 0 && v < 1 ? smoothstep(0, 0.1, v) * (1 - v) * (1 - v) : 0;
        const hop = v > 0 && v < 0.5 ? Math.sin(2 * Math.PI * v) : 0; // the +N's jump
        const up = back(u) * down;
        const heat = u > 0 ? Math.exp(-(t - tr) / R.cool) : 0;
        const on = Math.min(up, 1);
        card.pose({
          lift: R.lift * up + Tk.hop * hop * down,
          tilt: (R.rest * on + R.kick * (u > 0 && u < 1 ? Math.sin(Math.PI * ease.outCubic(u)) : 0)) * down,
          edge: (R.rim + R.hot * heat + Tk.flash * ring) * on,
          rim: (R.rimTop + R.hot * 0.5 * heat) * on,
        });
        card.press(plusAt[i][0], plusAt[i][1], SIZE, lerp(Tk.r[0], Tk.r[1], ease.outCubic(clamp(v))), Tk.k * ring);
      });

      book.setLight({ page: pageL, edge: LOOK20.edge[1], logo: LOOK20.logo });

      // the camera
      const c = camAt(t);
      F.toWorld(c[3], c[4], c[5], tgt);
      F.toWorld(c[0], c[1], c[2], pos);
      setLens(camera, track(LENS, t));
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 86 + t;
    },
    post: (t) => ({ dof: { focus: focusAt(t), fstop: track(FSTOP, t) } }),
  };
}

// Sound cues, s into the shot.
export const CUES = {
  land: +(T21.turn[1] - T0).toFixed(3), // 10-05 lands (s21's turn)
  // 'mcp server' typed, a key at a time (the celesta): when, and the key (' ' the space)
  keys: T22.keys.map((t, i) => ({ t, key: 'mcp server'[i] })),
  enter: T22.enter, // the search runs
  wipe: T22.wipe.slice(0, 2), // the results come down the page behind a line of lime
  // the cards, rows 01–12 of the results: each rises (settling T22.rise.dur later), its 24-hour stars ring
  // (+N as on the page, the same in zh and en), and it lies down (over T22.down.dur)
  cards: [
    ['punkpeye/awesome-mcp-servers', '+29'],
    ['modelcontextprotocol/servers', '+12'],
    ['headroomlabs-ai/headroom', '+59'],
    ['upstash/context7', '+22'],
    ['ChromeDevTools/chrome-devtools-mcp', '+41'],
    ['DeusData/codebase-memory-mcp', '+82'],
    ['microsoft/playwright-mcp', '+24'],
    ['github/github-mcp-server', '+23'],
    ['czlonkowski/n8n-mcp', '+2'],
    ['googleapis/mcp-toolbox', '+12'],
    ['xpzouying/xiaohongshu-mcp', '+8'],
    ['GLips/Figma-Context-MCP', '+1'],
  ].map(([name, n], i) => ({
    name,
    n,
    rise: +(T22.rise.t0 + T22.rise.lag * i).toFixed(3),
    tick: +(T22.tick.t0 + T22.tick.lag * i).toFixed(3),
    down: +(T22.down.t0 + T22.down.lag * i).toFixed(3),
  })),
  // the projects page lifts; it lands 0.55 s into s23 (on s23's paper)
  turn: { lift: T22.turn[0], land: T22.turn[1] },
};
