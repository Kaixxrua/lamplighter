// s49 — Under the closing statement (act IV, 8 s, global 5448–5639).
//
// Card 10, the statement, is the engine's (local 0.5–7.58 s, in over 0.5–1.25 s); this shot is only
// what lies under it, and that is black. The cut from s48's poster lands on the mark's afterglow: the
// light the mark held lingers a moment, as a screen's does when it goes off, softened (uSoft) and
// dying away. The paper ring and bar go first (under 1/255 in about half a second); the lime gem, which
// held the most light, goes last; all of it is under 1/255 by CUES.dark, before the statement has fully
// come up, and from there the frame is black, grained by the engine. The line under the mark does not
// linger: it was print, not light. This shot draws no text; the mark is world/f_mark.js's, from LOGO.
import * as THREE from 'three';
import { Mark } from 'world/f_mark.js';
import { LAYOUT, NEUTRAL, stateAt as s48State } from './s48.js';
import { LOOK } from './s44.js';

export const meta = { frames: 192, jitter: false };
const SHUTTER = 0.5 / 24;

// The afterglow: at the cut the ring and the bar keep `ring` of their light, dying over `ringT` s; the
// gem (and its halo) keeps `gem`, dying over `gemT` s; every edge softened by `soft` units.
export const GLOW = { ring: 0.12, ringT: 0.3, gem: 0.2, gemT: 0.55, soft: 1.5 };
// Scene-linear luminance under which this shot's grade (s48's: s46's with neutral shadows) gives black,
// within 0.5/255 of its black on every channel: found through the grade (white balance, the tone curve's
// toe, contrast, black point), for the gem's lime and the ring's paper.
export const DARK = { lime: 0.0099, paper: 0.0108 };

// Local seconds. dark: the last of the afterglow (the gem's middle, its halo included) is under 1/255.
export const CUES = { dark: 1.55 };

// s48's last frame: the light the afterglow starts from
const END = s48State(143 / 24, 0);
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const scale3 = (a, k) => a.map((v) => v * k);
// a decay from the cut, averaged over [t − sh/2, t + sh/2]
function decay(a0, tau, t, sh) {
  const n = sh > 0 ? 8 : 1;
  let s = 0;
  for (let j = 0; j < n; j++) s += Math.exp(-Math.max(t + sh * ((j + 0.5) / n - 0.5), 0) / tau);
  return (a0 * s) / n;
}

export function stateAt(t, sh = 0) {
  const r = decay(GLOW.ring, GLOW.ringT, t, sh);
  const g = decay(GLOW.gem, GLOW.gemT, t, sh);
  return {
    t,
    sh,
    seed: 0,
    land: END.land.map(() => -100), // every band full, every pulse long dead
    arc: [0, 0, 0],
    ring: scale3(END.ring, r),
    bar: scale3(END.bar, r),
    barF: [1e3, 1e3, 1], // lit all along
    barP: [0, 0, 0],
    gem: scale3(END.gem, g),
    glow: [...scale3(END.glow.slice(0, 3), g), END.glow[3]],
    soft: GLOW.soft,
  };
}

// dark at t: the gem's middle (its own light and its halo there) and the ring both under black
const isDark = (t) => {
  const s = stateAt(t, 0);
  return lum(s.gem) + lum(s.glow) < DARK.lime && lum(s.ring) < DARK.paper;
};

// The cue recomputed from the light itself (got) against CUES (want); bad lists what is off by more than
// 0.01 s. Pure: setup runs it, and so can Node.
export function checkCues() {
  let a = 0;
  let b = 8;
  while (b - a > 5e-4) {
    const m = (a + b) / 2;
    if (isDark(m)) b = m;
    else a = m;
  }
  const got = { dark: +((a + b) / 2).toFixed(3) };
  const want = { dark: CUES.dark };
  const bad = Math.abs(got.dark - want.dark) <= 0.01 ? [] : [`dark want ${want.dark} got ${got.dark}`];
  return { got, want, bad };
}

export async function setup(ctx) {
  const mark = new Mark({ width: ctx.width, height: ctx.height, at: LAYOUT.at, r1: LAYOUT.r1 });
  const { scene, camera } = mark;
  if (scene.children.length !== 1 || scene.children[0] !== mark.mesh) throw new Error('[s49] the frame holds something besides the mark');

  // keep the plan honest: when the afterglow is gone, against the cue
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s49] CUES off: ${cc.bad.join('; ')}`);

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    mark, // look-dev only
    update(t) {
      mark.set(stateAt(t, SHUTTER / Math.max(1, ctx.samples || 1)));
    },
    post() {
      return {
        exposure: LOOK.exposure,
        grade: { shadowTint: NEUTRAL },
        bloom: { strength: 0.1 },
        halation: { strength: 0.14, threshold: 0.85 },
      };
    },
  };
}
