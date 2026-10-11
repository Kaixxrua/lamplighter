// s21 · 掠拍首页，按日历翻回那一天 · 96 frames (global frames: this row's start in film/timeline.json + 24 t)
// The book lies open on the home page. The flyleaf lands (s20's turn, 0.15 s in) and the page comes sharp
// where we look, as we come down onto it: the stats strip and the six sources under it. We glide right to
// the calendar; a press on the 5th rings out in lime, and the pages riffle back, a day a leaf: the
// calendar's lit day steps 8 → 7 → 6 → 5 (the site's own 'today' is the 8th; picking a day shows its
// ranking, which is the feature). The 5th's page comes sharp and we move onto its ranking: 02
// omlahore/RemoveMacAI and 03 Niko1221/Strata. Then that page lifts (the turn lands 0.55 s into s22).
// First frame: s20's last (the book open, 1.62 m from a point 4 cm right of the gutter, 40° off the page,
// 3° toward the fore-edge, 50 mm, f/2.8), the flyleaf all but down on the left. Mean luma 73 (s20’s last 74).
// Last frame: 0.49 m from between the 10-05 cards 02 and 03 (their middle), 45° off the page, 1° toward
// the fore-edge, 85 mm, f/2.8; the page lifting from the right (e 0.32), the projects page under it. Mean luma 202
// (the page fills the picture by f44: 136 at f17, 200 at f48 and f71).
// Camera: the book's frame; keys as in s20 (target, distance, azimuth, elevation), a monotone cubic through
// the camera's and the target's positions (no overshoot: the camera settles where a beat reads), at rest
// on the first key (s20 ends at rest) and still moving at the last (s22 picks it up). Focus on the target.
// It keeps clear of the turning leaves (they sweep 0.5 m round the gutter, between head and tail): from the
// riffle on it stands 0.18 m or more beyond the tail.
// Light: as s20's end (the gallery's lamps at LOOK20.lamp; the paper takes BOOK_LOOK.paperLamp of them;
// the page's own light, the lime edges). Nothing but lime clips: the press is lime.
// Interface: assets/ui/<lang>/s20-home (10-08), s21-day-07, -06, -05, s22-projects (all captured 10-07
// evening as a guest; the site's 'today' is 10-08). Held unreadable, at the develop's blur (mip 4.6) in
// the print itself, whatever the framing: the masthead (its date), 「未登录」, the dock, and on each day the
// entries manifest.json keeps unreadable (rea, AnyPS5, dsh-our-free-model); on the home page the whole
// card row (so it reads as one soft band, not a censored card). The news and X tabs are never opened.
// Only the print differs between zh and en.
// Cuts: s20 → s21 continuous (the camera, the flyleaf's turn, the develop). s21 → s22: the 10-05 leaf's
// turn spans the cut; s22 opens on the projects page as it lies here (mip 4.6), the camera moving on.
// Sound: see CUES (s into the shot).

import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, smoothstep, smootherstep, track, ease } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { DEG } from 'world/geo.js';
import { BOOK, BOOK_LOOK, Book } from 'world/c_book.js';
import { T20, LOOK20, CAM as CAM20 } from './s20.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const T0 = 2.0; // s20's time at this shot's start

export const SIZE = [7680, 4320]; // the captures (texels; 4 to a CSS px)
// the leaves sink 4 steps, so the home page and the flyleaf lie where s20 had them
export const SINK = 4;

export const T21 = {
  develop: [0.1, 0.65, 4.6, 0], // the home page comes sharp (but its held boxes)
  press: [1.36, 0.42], // the press on the 5th: when, how long its ring takes to spread and fade
  riffle: [
    [1.55, 2.1], // 10-08 (the home page) lifts … lands on the left
    [1.72, 2.27], // 10-07
    [1.89, 2.44], // 10-06
  ],
  bend: 0.5, // the riffle's curl (s20's flyleaf: 0.75); with these overlaps no leaf catches the next
  dayMip: 2.0, // 10-07 and 10-06 as they flash past: the layout and the calendar read, small text barely
  develop05: [2.15, 2.8], // 10-05: dayMip → 0
  turn: [3.65, 4.55, 0.75], // 10-05 lifts … lands (0.55 s into s22); its curl
};

// Boxes of each print held unreadable ([x, y, w, h], texels; from manifest.json regions and keepUnreadable,
// a few texels wider). The same in zh and en for these pages.
const MAST = [830, 118, 1384, 206];
const ACCT = [7120, 92, 480, 256];
const DOCK = [2100, 4012, 3480, 288];
const HOLD = {
  home: [MAST, ACCT, DOCK, [80, 1086, 5627, 708] /* the card row: 02 rea, 03 AnyPS5 */, [80, 2415, 5627, 305] /* 06 dsh */],
  d07: [MAST, ACCT, DOCK, [1960, 1086, 1866, 708] /* 02 rea */, [3839, 1086, 1866, 708] /* 03 AnyPS5 */, [80, 2107, 5627, 305] /* dsh */],
  d06: [MAST, ACCT, DOCK, [80, 1086, 1868, 708] /* 01 rea */, [80, 3649, 5627, 305] /* AnyPS5 */],
  d05: [MAST, ACCT, DOCK, [80, 1086, 1868, 708] /* 01 rea */, [80, 3341, 5627, 305] /* 09 AnyPS5 */],
};
const PRESS_AT = [6204, 937]; // the 5th on the calendar (the same on every day's page)

// The camera: [t, [x, y, z, distance, azimuth, elevation], lens, f-stop] (book frame, m and degrees).
export const CAM21 = {
  keys: [
    [0, CAM20.keys[CAM20.keys.length - 1][1], CAM20.lens, CAM20.fstop], // s20's last frame
    [0.72, [0.15, 0.03, -0.082, 0.5, -4, 21], 60, 2.2], // down onto the stats and the six sources
    [1.32, [0.397, 0.03, -0.0744, 0.5, 6, 30], 85, 2.0], // the calendar, the 5th
    [2.2, [0.392, 0.03, -0.072, 0.47, 4, 31], 85, 2.0], // holding while the days riffle back
    [2.95, [0.2535, 0.03, -0.044, 0.52, 2, 44], 85, 2.8], // 10-05: cards 02 and 03
    [4.0, [0.2535, 0.03, -0.046, 0.49, 1, 45], 85, 2.8], // drifting in as the page lifts
  ],
};

// camera and target from a key (book frame)
export function orbit([x, y, z, d, az, el]) {
  const a = az * DEG;
  const b = el * DEG;
  return [x + d * Math.sin(a) * Math.cos(b), y + d * Math.sin(b), z + d * Math.cos(a) * Math.cos(b), x, y, z];
}

// A monotone cubic through [[t, [v…]], …] (Fritsch–Butland tangents: no overshoot, it settles where a
// component turns back), at rest at the first key and carried on at the last segment's slope after it.
export function glide(keys) {
  const n = keys.length;
  const T = keys.map((k) => k[0]);
  const V = keys.map((k) => k[1]);
  const M = V.map((v) => v.map(() => 0));
  for (let j = 0; j < V[0].length; j++) {
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((V[i + 1][j] - V[i][j]) / (T[i + 1] - T[i]));
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

export const camAt = glide(CAM21.keys.map(([t, k]) => [t, orbit(k)]));
const LENS = CAM21.keys.map(([t, , l]) => [t, l]);
// The near plane: far out while the left page is in the picture (the scene's depth resolves about 16 bits:
// at 0.05 the flyleaf, lying a fraction of a millimetre over the board, fights it); in from the calendar
// on, where the turning leaves pass 0.15 m or more from the lens.
const NEAR = [0.2, 0.1, 1.2, 1.4];
const FSTOP = CAM21.keys.map(([t, , , f]) => [t, f]);

// The riffle's fan: each day's leaf rides up on the one turning over it (a share k of that leaf's turn, no
// more than cap: about 3.6° at the calendar), so between two leaves the page lies a little raised rather
// than flat. Between leaves it keeps about two thirds of the dark beyond the head covered (the picture's
// dark 17% → 6%), and the leaves' sweeps short: each leaf baring the dark and the next one covering it
// again was a flash a frame (10-10: six frames in a second at 200 cd/m², the limit; with the fan three).
// The 5th settles over 'settle' (s), slowly. Every lift, switch and landing keeps its time (T21, CUES); the
// camera and its focus are as they were. cap 0.025 hid the dark altogether but tilted the calendar out of
// reading; 0.01 left two frames at 24% (one more would be over the line); 0.008 made five.
const FAN = { cap: 0.012, k: 0.5, settle: [2.05, 2.6] };
// the days' turns: e and curl at t
const turnAt = ([a, b], t, B) => {
  const e = smootherstep(a, b, t);
  return { e, bend: B * Math.sin(2 * Math.PI * e) };
};

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, NEAR[0], 400);
  const K = BOOK.FLOOR;
  const lib = new Library({ floors: [K - 2, K + 2], near: 1, mid: 2, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK20.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);

  const load = (name) => ctx.load.texture(`/assets/ui/${ctx.lang}/${name}.png`, { srgb: true, anisotropy: 8 });
  const [proj, t05, t06, t07, tHome] = await Promise.all(['s22-projects', 's21-day-05', 's21-day-06', 's21-day-07', 's20-home'].map(load));
  const book = new Book({
    U,
    pages: [{ tex: proj }, { tex: t05 }, { tex: t06 }, { tex: t07 }, { tex: tHome }, { tex: null, under: tHome }],
  });
  for (const l of book.leaves) l.hR -= SINK * BOOK.STEP;
  scene.add(book.group, book.world);
  book.setCover(Math.PI);
  const [pProj, p05, p06, p07, home, fly] = book.leaves;
  const mip = T20.develop[3];
  home.mask(HOLD.home, SIZE, mip);
  p07.mask(HOLD.d07, SIZE, mip);
  p06.mask(HOLD.d06, SIZE, mip);
  p05.mask(HOLD.d05, SIZE, mip);
  pProj.u.uSharp.value = mip; // s22 brings it sharp
  p07.u.uSharp.value = T21.dayMip;
  p06.u.uSharp.value = T21.dayMip;

  const F = book.F;
  const tgt = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const k = LOOK20.page * BOOK_LOOK.glow;
  const pageL = BOOK_LOOK.paper.map((p) => p * k);
  const riffle = [home, p07, p06];
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      // the flyleaf lands; the days riffle back; the 5th's page lifts at the end
      const ef = smootherstep(T20.flyleaf[0], T20.flyleaf[1], T0 + t);
      fly.pose({ e: ef, bend: T20.bend * Math.sin(2 * Math.PI * ef) });
      fly.u.uShow.value = BOOK_LOOK.show * (1 - smoothstep(0.0, 0.06, ef));
      fly.u.uSpillK.value = smoothstep(0.02, 0.15, ef);
      let over = 0; // the turn of the leaf above
      const fan = (p, f) => (f > p.e ? { e: f, bend: T21.bend * Math.sin(2 * Math.PI * f) } : p);
      riffle.forEach((leaf, i) => {
        const p = fan(turnAt(T21.riffle[i], t, T21.bend), Math.min(FAN.cap, FAN.k * over));
        leaf.pose(p);
        leaf.u.uSpillK.value = smoothstep(0.02, 0.15, p.e);
        over = p.e;
      });
      const p5 = fan(turnAt(T21.turn, t, T21.turn[2]), Math.min(FAN.cap, FAN.k * over) * (1 - smoothstep(FAN.settle[0], FAN.settle[1], t)));
      p05.pose(p5);
      p05.u.uSpillK.value = smoothstep(0.02, 0.15, p5.e);
      pProj.pose({ e: 0 });
      pProj.u.uSpillK.value = 0;

      // the prints come sharp
      const [d0, d1, s0, s1] = T21.develop;
      home.u.uSharp.value = lerp(s0, s1, smoothstep(d0, d1, t));
      p05.u.uSharp.value = lerp(T21.dayMip, 0, smoothstep(T21.develop05[0], T21.develop05[1], t));

      // the press: a ring of lime spreads from the 5th and fades (it lifts away with the home page)
      const u = (t - T21.press[0]) / T21.press[1];
      const on = u > 0 && u < 1;
      home.press(PRESS_AT[0], PRESS_AT[1], SIZE, lerp(0.002, 0.011, ease.outCubic(Math.min(Math.max(u, 0), 1))), on ? 1.1 * smoothstep(0, 0.1, u) * (1 - u) * (1 - u) : 0);

      book.setLight({ page: pageL, edge: LOOK20.edge[1], logo: LOOK20.logo });

      // the camera
      const c = camAt(t);
      F.toWorld(c[3], c[4], c[5], tgt);
      F.toWorld(c[0], c[1], c[2], pos);
      camera.near = lerp(NEAR[0], NEAR[1], smoothstep(NEAR[2], NEAR[3], t));
      setLens(camera, track(LENS, t));
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 80 + T0 + t;
    },
    post: (t) => ({ dof: { focus: focusDistance(camera, tgt), fstop: track(FSTOP, t) } }),
  };
}

// Sound cues, s into the shot.
export const CUES = {
  flyleaf: { land: T20.flyleaf[1] - T0 }, // s20's turn lands
  glide: [0, 0.72, 1.32], // down onto the stats and the sources, then along to the calendar
  click: T21.press[0], // the press on the 5th (the ring spreads for T21.press[1])
  // each day's leaf: lifts … lands; 'switch' is when the calendar's lit day changes under it (8 → 7 → 6 → 5):
  // one note each
  days: [
    { lift: 1.55, switch: 1.661, land: 2.1, shows: '10-07' },
    { lift: 1.72, switch: 1.831, land: 2.27, shows: '10-06' },
    { lift: 1.89, switch: 2.001, land: 2.44, shows: '10-05' },
  ],
  develop05: T21.develop05, // the 5th's ranking comes sharp
  // 10-05 lifts; it lands 0.55 s into s22 (on s22's projects page)
  turn: { lift: T21.turn[0], land: T21.turn[1] },
};
