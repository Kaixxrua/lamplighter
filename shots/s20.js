// s20 · 发光的书翻开 · 48 frames (global frames: this row's start in film/timeline.json + 24 t)
// Scene 8 opens. The cards that passed s19's gate fly into the library; two floors above the lighthouse,
// in a gallery with its back to the shaft, a book lies closed on a walnut lectern, its page edges inlaid
// with lime like those cards, the site's mark inlaid in lime on its brown calf board. We push in. The
// board lifts and falls open onto the lectern; under it a blank flyleaf glows with the light of what is
// printed beneath it; the flyleaf lifts and turns, its underside lit by the page it uncovers (the turn
// carries over the cut: it lands 0.15 s into s21), and the first page is the site's home page, printed in
// light on the paper, still coming into focus.
// First frame: the closed book in the middle of the picture, seen from the reader's side (the tail edge
// toward us, the spine on the left), 2.1 m from its middle, 30° off the board (14° below the horizontal),
// 9° toward the fore-edge, 50 mm, f/2.8; the lime edges and the mark glow; the gallery's lamps light the
// bookcase behind and the brown board. Mean luma 27 (s19's last frame: 48.6).
// Last frame: the book open, 1.62 m from a point on the page 4 cm right of the gutter, 40° off the page
// (24° below the horizontal), 3° toward the fore-edge, 50 mm, f/2.8; the home page glowing on the right
// (its white near 214 of 255), the flyleaf all but down on the left, the endpaper dark under it; the
// lectern lit lime round the block and warm by the page. Mean luma 75.
// Camera: on the reader's line, a push in with a rise (inOutSine over the whole shot); focus on the target.
// Light: the gallery's lamps at LOOK20.lamp (none of the lighthouse: this floor lies outside the lantern's
// fan); the paper (leaves, block edges, endpaper) takes only BOOK_LOOK.paperLamp of them, its light being
// the print's own, which keeps the site's colours as shot; the book's own light (c_book.js bookLight):
// the page as a soft area light, the lime edges as strip lamps. Nothing but lime clips.
// Interface: assets/ui/<lang>/s20-home.png, the home page as a guest sees it (captured 10-07 evening,
// so the site shows 10-08). The print is held at the develop's blur, mip 7 → 4.6: at the end the layout
// reads (header, stats strip, ranking cards, calendar) but no line of text does, at any resolution, so
// the masthead's date, the dock, 「未登录」 and the ranking's flagged entries stay unreadable; s21 brings it
// sharp where it frames. Only the print differs between zh and en.
// Cuts: s19 → s20, lime edges near the middle of the picture on both sides of the cut (s19's last cards,
// this book). s20 → s21: the flyleaf's turn spans the cut; s21 opens on the same home page.
// Sound: see CUES (s into the shot).

import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, smoothstep, smootherstep, track } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { DEG } from 'world/geo.js';
import { BOOK, BOOK_LOOK, Book } from 'world/c_book.js';

export const meta = { frames: 48, quality: { final: { samples: 8 } } };
const END = 47 / 24;

export const T20 = {
  cover: [0.2, 1.05], // the front board lifts … lies open on the lectern
  flyleaf: [0.95, 2.15], // the flyleaf lifts … lands (in s21)
  bend: 0.75, // the flyleaf's curl at the height of the lift (rad at its free edge)
  develop: [1.15, 2.0, 7.0, 4.6], // the home page's print, mip 7 → 4.6 (at 3.6 a 4K frame still half-reads a ranking title)
  swell: [1.0, 1.55], // the page's light comes out from under the flyleaf
};

export const LOOK20 = {
  lamp: 2.4, // the gallery's lamps (s19 has 0.25 at +0.8 EV, with the lantern's light; this floor has only its lamps)
  edge: [0.9, 1.15], // the lime edges, closed → open
  logo: 1.5,
  page: 0.85, // the uncovered page's mean print (of white), for its light on the surroundings
};

// The camera in the book's frame: where it looks (x, y, z) and from where (distance, azimuth from the
// reader's line toward the fore-edge, elevation off the page; degrees).
export const CAM = {
  lens: 50,
  fstop: 2.8,
  keys: [
    [0, [0.25, 0.02, 0.0, 2.1, 8.7, 29.8]],
    [END, [0.04, 0.03, 0.0, 1.62, 3.0, 40.0], 'inOutSine'],
  ],
};

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 400);
  const K = BOOK.FLOOR;
  const lib = new Library({ floors: [K - 2, K + 2], near: 1, mid: 2, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK20.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);

  const home = await ctx.load.texture(`/assets/ui/${ctx.lang}/s20-home.png`, { srgb: true, anisotropy: 8 });
  const book = new Book({ U, pages: [{ tex: home }, { tex: null, under: home }] });
  scene.add(book.group, book.world);
  const [page, fly] = book.leaves;
  page.u.uSpillK.value = 0; // it is the light

  const F = book.F;
  const tgt = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const paper = BOOK_LOOK.paper;
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      // the board, then the flyleaf
      const open = book.setCover(Math.PI * smootherstep(T20.cover[0], T20.cover[1], t));
      const e = smootherstep(T20.flyleaf[0], T20.flyleaf[1], t);
      page.pose({ e: 0, open });
      fly.pose({ e, open, bend: T20.bend * Math.sin(2 * Math.PI * e) });

      // the print develops; its light comes out from under the flyleaf
      const out = smoothstep(T20.swell[0], T20.swell[1], t);
      const [d0, d1, s0, s1] = T20.develop;
      page.u.uSharp.value = lerp(s0, s1, smoothstep(d0, d1, t));
      fly.u.uShow.value = BOOK_LOOK.show * (1 - smoothstep(0.0, 0.06, e));
      fly.u.uSpillK.value = smoothstep(0.02, 0.15, e);
      const k = open * LOOK20.page * BOOK_LOOK.glow * lerp(BOOK_LOOK.show, 1, out);
      book.setLight({ page: paper.map((p) => p * k), edge: lerp(LOOK20.edge[0], LOOK20.edge[1], open), logo: LOOK20.logo });

      // the camera
      const [x, y, z, d, az, el] = track(CAM.keys, t);
      const a = az * DEG;
      const b = el * DEG;
      F.toWorld(x, y, z, tgt);
      F.toWorld(x + d * Math.sin(a) * Math.cos(b), y + d * Math.sin(b), z + d * Math.cos(a) * Math.cos(b), pos);
      setLens(camera, CAM.lens);
      aim(camera, pos, tgt);
      lib.update(camera);
      U.uTime.value = 80 + t;
    },
    post: () => ({ dof: { focus: focusDistance(camera, tgt), fstop: CAM.fstop } }),
  };
}

// Sound cues, s into the shot.
export const CUES = {
  cut: { t: 0 }, // on the beat
  pings: [0, 1],
  // the front board: lifts off the flyleaf, lands open on the lectern (a soft leather thud)
  cover: { lift: T20.cover[0], land: T20.cover[1] },
  // the flyleaf: lifts (the page-turn, swelled: storyboard row 20) and lands 0.15 s into s21
  flyleaf: { lift: T20.flyleaf[0], land: T20.flyleaf[1] },
  // the home page's light comes out from under it
  swell: [T20.swell[0], T20.swell[1]],
};
