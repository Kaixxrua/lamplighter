// s24 · X 翻译 · 72 frames (global frames: this row's start in film/timeline.json + 24 t)
// The paper lands on the left (s23's turn, 0.55 s in) and the page under it is the site's X board as a guest
// sees it for the film's day (/x, its date field set to 10-05: the accounts the site follows, text only, the
// last 24 hours), coming sharp as we come down to one tweet at the board's head, Tibo's, in English. Its
// words flow like ink and come together as the site's own Chinese for it (the translation the site stores
// and shows a Chinese reader): the English swirls, thins and gives way to the Chinese where both are most
// smeared, the text closing up from seven lines to four and the card's foot rising with it (c_ink.js). We
// hold on the Chinese, then back off and round to the right as the board lifts (the turn lands 0.55 s into
// s25, on s25's page: the UI library, its works not in yet).
// The tweet: Tibo (x.com/thsottiaux/status/2106610099720720811, 2026-10-04 12:59, ♡ 22864), on the board
// for 10-05: "All right, we're locking in. Only things being worked on are simplifications, more efficiency
// for more usage, groundbreaking features or new models. Sometimes you have to invest ahead of the curve, but
// feedback is clear that you all want things to get simpler. On it." → 好，我们就这么定了。接下来只做简化、
// … 我们已经着手了。 Chosen because it is text alone (nothing on it to blur but its avatar), a plain working
// note about making things simpler, naming no AI company or model, and nothing on
// the readable-line list. Both its states are shown whole, in both films (the zh film opens on the English
// in the zh card, the en film ends on the Chinese in the en card). Avatars and media on the board are blurred
// by code on the capture (Tibo's avatar; the Kling AI cards' avatars and the right one's two images).
// Held unreadable at mip 4.6 in the print itself, whatever the framing (held24): the board's masthead (its
// date, Thu, Oct 8, 2026 / 2026年10月8日周四, and the day's count, New today 55 / 今日更新 55: soft in the
// top-left corner, left of the filter row), 「未登录」 and the dock. Readable about f24–f64: the filter row
// (Followed accounts 29/29 / 关注账号 29/29, Text only / 纯文字, Last 24 hours / 最近 24 小时, the date field
// 10/05/2026; the next chip, Saved / 收藏, cut by the picture's edge before its count), Tibo's card, and the
// edges of the cards beside it: on the left a Kling AI card's corner (♡ 194, the tail of its article link),
// on the right the start of another (Kling AI at Advertising Week New York 2026 | Agenda Revealed … /
// Kling AI 亮相 Advertising Week New York 2026 | 议程揭晓 …, cut by the picture's edge). The board's other
// cards (Codex Updates, far left, among them) are out of the picture while it can be read; as the board
// lifts (f64–f68) everything on it is smeared past reading.
// Flashing: the board's turn at the end, as it sweeps up through the picture (f66–f67, 30–31 % of the
// picture in transition) and goes over, uncovering the walnut beyond the page's head (f70, 32.5 %); the
// come-down to the tweet as the board comes sharp stays about a quarter (24.8 % at f25 in zh; 25.5 %, 25.9 %
// at f25–f26 in en); the ink under a ninth (10.3 % at most); the cut 4.2 %. s23+s24 pass, zh and en: zh four
// frames reach a quarter (s23's f67; s24's f66, f67, f70), en six (and s24's f25, f26), at most three in
// one second (f66, f67, f70); red: none.
// First frame: s23's last, moving on: cam (0.489, 0.441, 0.506), target (0.370, 0.030, 0.030), 0.64 m, az 14°,
// el 40°, 85 mm f/5.6, at s23's velocity (0.22 m/s, up and back). The join is C1: the 0.2 s key leaves room
// for s23's velocity in every coordinate, so glideFrom's clamp never bites.
// Last frame (f71, 2.958 s): cam (0.456, 0.484, 0.311), target (0.254, 0.029, −0.085), 0.64 m, az 26.9°,
// el 45.7°, 90 mm f/8, backing off and rounding at 0.45 m/s (0.39 m/s at 3 s, and on at that after: camAt
// carries on past 3 s); the board gone over (e 0.22 at f71, 0.30 at 3 s), s25's page under it at mip 3.92,
// the focus on the target.
// Where the page fills the picture: the 1920 stills (still quality: zh f0, f11, f20, f32, f44, f56, f62, f66,
// f68–f71; en f11, f32, f44, f56, f69, f71) have a mean of 174.2–204.8 (204.8 at f11, the board filling the
// picture as it comes sharp; 203.8 and 203.5 at f68–f69, its blank front as it goes over; from f20 on the
// walnut beyond the head is at the top of the picture), 99.9 % at most 234, the brightest 246, nothing at
// 255. s23's last frame 202.3 → s24's first 201.7 (the 960 previews). The 960 previews swept frame by frame:
// mean at most 203.0 (f11), 99.9 % at most 236 (235–236 over f31–f66: the lime head edge, sharp in the
// preview, which has no depth of field; 233–234 in the stills there), the brightest 250 (yuv420p's overshoot
// on the lime edges). Off the paper the gallery stays dark.
// Camera: the book's frame; keys as in s20–s23 (target, distance, azimuth from the tail towards the
// fore-edge, elevation), s22's monotone cubic (glideFrom), leaving s23's last key at s23's velocity: on up as
// the paper lands (0.2 s), down to the tweet (1.15 s, 100 mm f/11; at most 0.52 m/s, at 0.69 s), in a little
// more as its words flow and held (2.45 s: from f53 nothing in the picture moves 3 px a frame at 1920), then
// back and round to the right as the board lifts (3.0 s: 0.505 → 0.65 m, az 8° → 28°, el 54° → 45°, 90 mm
// f/8), the tweet kept mid-picture (its card moving at most about 32 px a frame, the picture's far corners up
// to 88, at f65). Focus on the target throughout; on the tweet the text's spread about it is at most 4.2 px
// (CoC at 4K, f28–f71). The camera is beyond the tail throughout, and 0.536 m or more from the gutter's axis
// while the board turns (a leaf reaches 0.5 m), 0.615 m or more from f69, as the board goes over its line
// (f69–f70).
// Light: as s23 (the gallery's lamps at LOOK20.lamp, the page's own light, the lime edges). The board takes
// the page's light only once it is up past the camera (uSpillK 0 → 1 over e 0.2–0.4): lit as it peels off,
// its blank front filling the picture went over 205.
// Interface: assets/ui/<lang>/s24-x (the X board as a guest, captured 10-07 18:54:04Z zh, 18:55:18Z en) with
// Tibo's card printed over it by c_ink.js (INK.box: the card's chrome this language's capture texel for
// texel; its text the English as the en capture sets it → the Chinese as the zh capture sets it; the board's
// date field as it is once the guest clicks away: the capture left its month segment selected, re-inked in
// the field's own ink, INK.focus); s25's page under it (s25-ui as UI25, loadPage25: the capture's top
// 1920 × 1080 CSS px, every work's preview a flat slot with its framework badge on it; captured 18:42:12Z zh,
// 18:55:47Z en; held at mip 3.92, s25 brings it sharp); the paper (s23-paper, as s23 left it) and the
// projects page (s22-projects, s22-results, s22-type, as s22 left it) on the left pile, out of the picture.
// All captured as a guest (the site's 'today', Beijing time, is 10-08). The filter row, the cards' chrome
// and the masthead differ between zh and en; the tweet's two texts are the same in both.
// Cuts: s23 → s24 continuous (the camera, C1; the paper's turn), the cut 4.2 % in transition. s24 → s25: the
// board's turn spans the cut (e 0.30 at 3 s); s25 opens on s25's page (UI25 at mip 3.92, its slots empty),
// the camera moving on (camAt past 3 s: 0.39 m/s, backing off and rounding).
// Sound: see CUES (s into the shot).

import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, clamp, smoothstep, smootherstep, track } from 'film/lib/ease.js';
import { makeCanvas, canvasTexture } from 'film/lib/text.js';
import { Library } from 'world/library.js';
import { BOOK, BOOK_LOOK, Book } from 'world/c_book.js';
import { INK, FLOW, loadInkCard } from 'world/c_ink.js';
import { LOOK20 } from './s20.js';
import { SIZE, orbit } from './s21.js';
import { T22 } from './s22.js';
import { T23, FIG, held23, drawFigure, newFigureCanvas, glideFrom, camAt as camAt23 } from './s23.js';

export const meta = { frames: 72, quality: { final: { samples: 8 } } };
const T0 = 3.0; // s23's time at this shot's start
// one page more under the X page than in s23 (s25's), so the leaves sink one step more: the piles lie as
// s23 left them
export const SINK = 7;

export const T24 = {
  develop: [0.15, 0.95, 4.6, 0], // the X page comes sharp (but its held boxes) as we come to the tweet
  flow: [1.4, 2.25], // the tweet's words flow, the English into the Chinese (the ink's s, 0 → 1, over this)
  turn: [2.65, 3.55, 0.75], // the X page lifts … lands (0.55 s into s25); its curl
};

// Boxes of each print held unreadable ([x, y, w, h], texels, a few wider than manifest.json's regions)
const ACCT = [7260, 16, 410, 180]; // 「未登录」
const DOCK = [2100, 4012, 3480, 288];
const MAST22 = { zh: [1216, 38, 957, 124], en: [1438, 38, 952, 124] }; // the projects page's (s22's)
// the X page's masthead: its date (Thu, Oct 8 / 2026年10月8日周四) and 'new today 55'
const MAST24 = { zh: [1205, 38, 957, 124], en: [1414, 38, 952, 124] };
export const held24 = (lang) => [MAST24[lang], ACCT, DOCK];

// s25's page as s25 opens on it (s25 pours its works in): the head of the UI library's tall capture, its
// first 1920 × 1080 CSS px (4800 × 2700, a 16:9 print like the others), every work's preview not in yet:
// its box a flat slot (the card's ground a shade darker, the site's 5 px corners), its framework badge on
// it as on the site; titles, meta, counts as captured. That capture is 2.5 px a CSS px where the others
// are 4, so its mips are 1.6× coarser on the page: it is held at 4.6 − log2 1.6 for the others' blur.
export const UI25 = {
  win: [0, 0, 4800, 2700],
  ground: '#fcfbf4', // the card's ground (252, 251, 244), as captured
  slot: '#f0efe8', // a preview not in yet (240, 239, 232)
  radius: 12.5, // the preview's corners
  hold: 4.6 - Math.log2(7680 / 4800),
};
export async function loadPage25(lang, cards) {
  const [x, y, w, h] = UI25.win;
  const img = await createImageBitmap(await (await fetch(`/assets/ui/${lang}/s25-ui.png`)).blob(), x, y, w, h);
  const cv = makeCanvas(w, h);
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  for (const { parts } of cards) {
    const [px, py, pw, ph] = parts.preview;
    if (py >= y + h) continue;
    g.fillStyle = UI25.ground;
    g.fillRect(px - x - 2, py - y - 2, pw + 4, ph + 4);
    g.fillStyle = UI25.slot;
    g.beginPath();
    g.roundRect(px - x, py - y, pw, ph, UI25.radius);
    g.fill();
    const [bx, by, bw, bh] = parts.badge; // the badge back on it, its outline's soft pixels and all
    g.drawImage(img, bx - x - 1, by - y - 1, bw + 1, bh + 1, bx - x - 1, by - y - 1, bw + 1, bh + 1);
  }
  img.close();
  return canvasTexture(cv, { srgb: true, mipmaps: true, anisotropy: 8 });
}

// The camera: [t, [x, y, z, distance, azimuth, elevation], lens, f-stop] (book frame, m and degrees). The
// first key is s23's last, where the camera is at s23's end.
export const CAM24 = {
  keys: [
    [0, null, 85, 5.6], // s23's camera at its end, rising and drawing back
    [0.2, [0.3711, 0.03, 0.022, 0.693, 15, 41.4], 85, 5.6], // on up as the paper lands (room for s23's velocity)
    [1.15, [0.257, 0.0285, -0.084, 0.54, 10, 52], 100, 11], // down to the tweet (Tibo's card, at the page's head)
    [2.45, [0.254, 0.0285, -0.089, 0.505, 8, 54], 100, 11], // in a little more as its words flow, and held
    [3.0, [0.254, 0.0285, -0.085, 0.65, 28, 45], 90, 8], // back off and round to the right as the page lifts
  ],
};

const c0 = camAt23(T0);
const c1 = camAt23(T0 + 1);
export const camAt = glideFrom(
  CAM24.keys.map(([t, k]) => [t, k ? orbit(k) : c0]),
  c1.map((v, j) => v - c0[j]), // s23's camera carries on at its last segment's speed
);
const LENS = CAM24.keys.map(([t, , l]) => [t, l]);
const FSTOP = CAM24.keys.map(([t, , , f]) => [t, f]);

// a turn's e and curl at t
const turnAt = ([a, b, B], t) => {
  const e = smootherstep(a, b, t);
  return { e, bend: B * Math.sin(2 * Math.PI * e) };
};
// the ink's progress at t
export const inkAt = (t) => clamp((t - T24.flow[0]) / (T24.flow[1] - T24.flow[0]));

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
  const [x24, paper, proj, res, typed, ink, ui25] = await Promise.all([
    ...['s24-x', 's23-paper', 's22-projects', 's22-results'].map((n) => load(`assets/ui/${lang}/${n}.png`)),
    load(eType.frames[T22.keys.length].file), // the search box as s22 left it: 'mcp server'
    loadInkCard(lang), // the tweet (c_ink.js)
    loadPage25(lang, entry('s25-ui').regions.cards), // s25's page, its works not in yet
  ]);
  // the leaves as s23 left them, s25's page under the X page; the ones under the projects page on the left
  // are never seen here (their prints are left out)
  const book = new Book({
    U,
    pages: [{ tex: ui25 }, { tex: x24 }, { tex: paper }, { tex: proj }, ...Array.from({ length: 5 }, () => ({ tex: null }))],
  });
  for (const l of book.leaves) l.hR -= SINK * BOOK.STEP;
  scene.add(book.group, book.world);
  book.setCover(Math.PI);
  const [p25, p24, p23, pProj, ...under] = book.leaves;
  const mip = T24.develop[2];
  p25.u.uSharp.value = UI25.hold; // s25 brings it sharp
  p24.mask(held24(lang), SIZE, mip);
  p24.u.uSharp.value = mip;
  // the paper as s23 left it: sharp but its held boxes, the figure printed whole, the bars down
  p23.mask(held23(lang), SIZE, mip);
  const cv = newFigureCanvas();
  drawFigure(cv, paper.image, 1, Array(10).fill(1));
  p23.inset(canvasTexture(cv, { srgb: true, mipmaps: true, anisotropy: 8 }), FIG.inset, SIZE, 1);
  // the projects page as s22 left it: the results down the whole page, the search box typed
  pProj.mask([MAST22[lang], ACCT, DOCK, ...eProj.keepUnreadable.map((k) => k.box)], SIZE, mip);
  pProj.print2(res, 3);
  pProj.wipe(1 + T22.wipe[2], T22.wipe[2], T22.wipe[3]);
  pProj.inset(typed, eType.clipCss.map((v) => 4 * v), SIZE, 1);
  pProj.pose({ e: 1 });
  for (const l of under) {
    l.pose({ e: 1 });
    l.u.uSpillK.value = 1;
  }

  const F = book.F;
  const tgt = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const k = LOOK20.page * BOOK_LOOK.glow;
  const pageL = BOOK_LOOK.paper.map((p) => p * k);

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t, c) {
      // the paper lands (s23's turn); the X page lifts at the end
      const pp = turnAt(T23.turn, T0 + t);
      p23.pose(pp);
      p23.u.uSpillK.value = smoothstep(0.02, 0.15, pp.e);
      const p4 = turnAt(T24.turn, t);
      p24.pose(p4);
      // it takes the page's light only once it is up past the camera (lit as it peels off, its blank foot
      // fills the frame brighter than the paper may be)
      p24.u.uSpillK.value = smoothstep(0.2, 0.4, p4.e);
      p25.pose({ e: 0 });
      p25.u.uSpillK.value = 0;

      // the X page comes sharp; the tweet's words flow
      const [d0, d1, s0, s1] = T24.develop;
      p24.u.uSharp.value = lerp(s0, s1, smoothstep(d0, d1, t));
      p24.inset(ink.render(c.renderer, inkAt(t)), INK.box, SIZE, 1, ink.sub);

      book.setLight({ page: pageL, edge: LOOK20.edge[1], logo: LOOK20.logo });

      // the camera
      const cm = camAt(t);
      F.toWorld(cm[3], cm[4], cm[5], tgt);
      F.toWorld(cm[0], cm[1], cm[2], pos);
      setLens(camera, track(LENS, t));
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 86 + 4.0 + T0 + t;
    },
    post: (t) => ({ dof: { focus: focusDistance(camera, tgt), fstop: track(FSTOP, t) } }),
  };
}

// Sound cues, s into the shot.
const flowT = (s) => +(T24.flow[0] + s * (T24.flow[1] - T24.flow[0])).toFixed(3); // the ink's s → the shot's t
export const CUES = {
  land: +(T23.turn[1] - T0).toFixed(3), // the paper lands (s23's turn)
  develop: T24.develop.slice(0, 2), // the X page comes sharp
  flow: T24.flow, // the tweet's English starts to flow … the Chinese has settled
  closeUp: FLOW.squash.map(flowT), // the text closes up from seven lines to four, the card's foot rising
  handOver: FLOW.cross.map(flowT), // the English gives way to the Chinese, where both are most smeared
  recombine: [flowT(FLOW.cross[0]), T24.flow[1]], // the translation comes together: from the hand-over …
  done: T24.flow[1], // … to the Chinese whole, as the site has it (the whisper made clear)
  pullBack: CAM24.keys[3][0], // the camera starts to back off
  turn: { lift: T24.turn[0], land: T24.turn[1] }, // the X page lifts; it lands 0.55 s into s25
};
