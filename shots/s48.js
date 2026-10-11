// s48 — The mark (act IV, 6 s, global 5304–5447).
//
// Act II opened on a radar screen (s13): out of the black one lime point and the ping, then a line from
// the centre out through the point, the bar of the mark. Here the screen closes. t = 0 is the last ping
// (s47 is black and the cut lands on it), and its echo comes home: five arcs, each a C like the mark's
// ring (s16's ping rings, which ran out across the lens, running in this time), come in from beyond the
// frame and close up into the ring (world/f_mark.js). The innermost comes to rest on the ring's inner
// edge, each next one on the band outside it, and as the last lands the ring is shut (CUES.close). A
// line of light runs out from the centre along 45°, the bar, and where it points the lime gem catches:
// the mark is whole on the final chord (CUES.logo = CUES.chord). The ring and the bar then settle from
// the pings' lime to the mark's own paper white; the gem stays lime, the brightest point in the frame.
// Under the mark one line comes up (CUES.text): AIGC Radar MCP · aigcnews.cn, in the film's type (s15's
// title line: EB Garamond 500, small caps).
// First frame: black (the arcs are still beyond the frame's corners; the first is in at about 0.14 s).
// Last frame: the mark and its line, centred and still: the poster.
// The mark is light: in the frame, graded with it. The line is print: set like the title cards (paper,
// their faint halo) and laid over the picture in display space, as the engine lays the cards (the shot's
// margin print, grained like the picture). That line is the only text this shot draws (twice: its halo,
// then the line); the mark is the shader's, from LOGO; no library or lighthouse is built.
import * as THREE from 'three';
import { clamp, smoothstep } from 'film/lib/ease.js';
import { HEX, lin } from 'film/lib/palette.js';
import { loadFonts, font, makeCanvas, drawTracked, canvasTexture, CARD_STYLE } from 'film/lib/text.js';
import { Mark, MARK, NA, frontOf } from 'world/f_mark.js';
import { LOOK } from './s44.js';

export const meta = { frames: 144, jitter: false };
const SHUTTER = 0.5 / 24;
// The grade is s46's but for the shadows' tint: the mark stands on a true black, and what dims (the
// arcs' tails, the edges, s49's afterglow) dims to grey, not to the night's blue.
export const NEUTRAL = [0, 0, 0];

// the frame: the mark's centre (shares of the frame, y from the top) and its ring's outer radius (a share
// of the height); the line under it: its type, size (a share of the height), tracking (em), the gap from
// the mark's box to its baseline (a share of the height), and its opacity (the cards' English lines')
export const LAYOUT = { at: [0.5, 0.43], r1: 0.16 };
export const LINE = { text: 'AIGC Radar MCP · aigcnews.cn', fam: 'garamond', weight: 500, caps: 'all-small-caps', size: 0.036, tracking: 0.24, gap: 0.08, alpha: 0.8 };

// The echo: the last arc lands at `close`, the others `step` s apart before it; the arcs' law (f_mark.js:
// far speed V in units/s, braking time tau, the wake's persistence, the converging exponent), their
// pulse (core width and wake floor in units, the wake's share, its decay at rest), a band's fill time.
// The wake is kept short and faint: the arcs sweep the whole frame, and a wider wake puts more of the
// picture into transition at once (flashcheck at 500 cd/m²: 23% of the picture with share 0.15 and
// persistence 0.035 s, 17% as here; 25% would count as a flash frame).
export const ECHO = {
  close: 2.25,
  step: 0.14,
  law: { V: 275, tau: 0.45, persist: 0.03, p: 0 },
  pulse: { core: 0.6, floor: 0.5, wake: 0.1, decay: 0.35 },
  fill: 0.12,
};
export const LAND = Array.from({ length: NA }, (_, k) => ECHO.close - (NA - 1 - k) * ECHO.step);
// The bar: its light leaves the centre `delay` s after the ring shuts and runs out along 45° at an even
// speed, reaching the gem's near edge on the chord; the pulse it carries (units wide) dies `fade` s after.
export const BAR = { delay: 0.06, logo: 2.625, pulse: 3, fade: 0.2 };
const GEM_IN = MARK.DOT_RHO - MARK.DOT_R;
const barFront = (t) => MARK.BAR_A + (GEM_IN - MARK.BAR_A) * clamp((t - ECHO.close - BAR.delay) / (BAR.logo - ECHO.close - BAR.delay));
// The line fades in over `fade` s from `at`.
export const TEXT = { at: 3.375, fade: 0.7 };

// Local seconds. ping: the cut, on the last ping. land: each arc comes to rest. close: the ring is shut.
// logo = chord: the gem catches, the mark is whole. text: the line begins to come up.
export const CUES = {
  ping: 0,
  land: LAND.map((v) => +v.toFixed(3)),
  close: ECHO.close,
  logo: BAR.logo,
  chord: BAR.logo,
  text: TEXT.at,
};

// The light (scene-linear; the grade is s46's, its shadows neutral). The arcs are the pings' lime
// (uArc), as bright far out as near (p = 0): an arc in flight still brightens as it closes in, because
// it slows and the shutter spreads it over less of the frame (graded peaks at 960: about 90 at 0.5 s,
// 100–170 at 1.5 s, 215 landing). The ring and the bar glow at `form` while the mark forms, tinted
// `tint` toward the lime, and on the chord come up to `whole` and settle to the paper white over
// `settle` s. The gem: `gem` × lime, with a flash on catching (`flash` × more, dying over `flashT` s),
// and its halo (`glow` × the gem's light at its rim, falling off over `glowW` units). The gem is hottest
// in its middle (lime 1.0, graded ≈ 239 242 131) and lime to its rim (0.7 ≈ 222 228 99): the brightest
// point in the frame, above the paper ring (0.42 ≈ 204 201 192) and the line's strokes (≈ 221 at their
// peak), and still the brand's lime rather than burnt to white.
const LIME = lin(HEX.lime).toArray();
const PAPER = lin(HEX.paper).toArray();
export const LIGHT = { arc: 1.25, form: 0.45, tint: 1, whole: 0.42, rise: 0.3, settle: 0.6, barP: 1.2, gem: 1.0, flash: 2.0, flashT: 0.3, glow: 0.06, glowW: 5 };

const mix3 = (a, b, s) => a.map((v, i) => v + (b[i] - v) * s);
const scale3 = (a, k) => a.map((v) => v * k);

// the ring's and the bar's own light at t
export function markLight(t) {
  const L = LIGHT;
  const level = L.form + (L.whole - L.form) * smoothstep(BAR.logo - 0.05, BAR.logo + L.rise, t);
  const tint = L.tint * (1 - smoothstep(BAR.logo, BAR.logo + L.settle, t));
  return scale3(mix3(PAPER, LIME, tint), level);
}
// the gem's light at t (a share of LIGHT.gem × lime), and its mean over [t − sh/2, t + sh/2]
const gemAt = (t) => (t < BAR.logo ? 0 : 1 + LIGHT.flash * Math.exp(-(t - BAR.logo) / LIGHT.flashT));
function gemMean(t, sh) {
  if (sh <= 0) return gemAt(t);
  let s = 0;
  for (let j = 0; j < 16; j++) s += gemAt(t + sh * ((j + 0.5) / 16 - 0.5));
  return s / 16;
}
export const textAlpha = (t) => smoothstep(TEXT.at, TEXT.at + TEXT.fade, t);

// Everything the mark's shader needs at t, this sample covering sh s of the shutter.
export function stateAt(t, sh = 0) {
  const own = markLight(t);
  const gm = gemMean(t, sh);
  const pulseLeft = t < ECHO.close + BAR.delay ? 0 : t < BAR.logo ? 1 : Math.exp(-(t - BAR.logo) / BAR.fade);
  return {
    t,
    sh,
    seed: (Math.round(t * 24 * 16) % 1009) * 1.618,
    land: LAND,
    law: ECHO.law,
    pulse: ECHO.pulse,
    fill: ECHO.fill,
    arc: scale3(LIME, LIGHT.arc),
    ring: own,
    bar: own,
    barF: [barFront(t - sh / 2), barFront(t + sh / 2), BAR.pulse],
    barP: scale3(LIME, LIGHT.barP * pulseLeft),
    gem: scale3(LIME, LIGHT.gem * gm),
    glow: [...scale3(LIME, LIGHT.gem * LIGHT.glow * gm), LIGHT.glowW],
    soft: 0,
  };
}

// The line, set into a canvas the size of the output frame as typesetCard sets a card's line: its halo
// (paper, blurred) and then the line itself, centred under the mark. → { canvas, width (px), baseline (px) }
export function typesetLine(W, H) {
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.textBaseline = 'alphabetic';
  const size = LINE.size * H;
  g.font = font(LINE.fam, size, LINE.weight);
  g.fontVariantCaps = LINE.caps;
  const tr = LINE.tracking * size;
  const y = (LAYOUT.at[1] + LAYOUT.r1 + LINE.gap) * H;
  const [r, gr, b] = CARD_STYLE.color;
  const a = LINE.alpha;
  g.save();
  g.shadowColor = `rgba(${r},${gr},${b},${0.32 * a})`;
  g.shadowBlur = 0.01 * H;
  g.fillStyle = `rgba(${r},${gr},${b},${0.35 * a})`;
  drawTracked(g, LINE.text, W / 2, y, { tracking: tr });
  g.restore();
  g.fillStyle = `rgba(${r},${gr},${b},${a})`;
  const width = drawTracked(g, LINE.text, W / 2, y, { tracking: tr });
  g.letterSpacing = '0px';
  return { canvas: cv, width, baseline: y };
}

// the first time in [a, b] that f(t) holds (f false at a, true at b), to a millisecond
function when(f, a, b) {
  if (f(a) || !f(b)) return NaN;
  while (b - a > 5e-4) {
    const m = (a + b) / 2;
    if (f(m)) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

// The cues recomputed from the motion itself (got) against CUES (want); bad lists what is off by more
// than 0.01 s. Pure: setup runs it, and so can Node.
export function checkCues() {
  const got = {
    land: LAND.map((_, k) => +when((t) => frontOf(k, t, LAND, ECHO.law)[0] - (MARK.R0 + k * (MARK.R1 - MARK.R0) / NA) < 1e-3, 0, 6).toFixed(3)),
    logo: +when((t) => gemAt(t) > 0, 0, 6).toFixed(3),
    text: +when((t) => textAlpha(t) > 0, 0, 6).toFixed(3),
  };
  got.close = Math.max(...got.land);
  got.chord = got.logo; // the score's final chord is the gem catching
  got.ping = 0; // the cut
  const want = { ping: CUES.ping, land: CUES.land, close: CUES.close, logo: CUES.logo, chord: CUES.chord, text: CUES.text };
  const bad = [];
  for (const k of Object.keys(want)) {
    const g = [].concat(got[k]);
    const w = [].concat(want[k]);
    if (g.length !== w.length || g.some((v, i) => !(Math.abs(v - w[i]) <= 0.01))) bad.push(`${k} want ${JSON.stringify(want[k])} got ${JSON.stringify(got[k])}`);
  }
  // the bar's light reaches the gem on the chord
  if (Math.abs(barFront(BAR.logo) - GEM_IN) > 1e-6) bad.push('the bar does not reach the gem on the chord');
  return { got, want, bad };
}

export async function setup(ctx) {
  const mark = new Mark({ width: ctx.width, height: ctx.height, at: LAYOUT.at, r1: LAYOUT.r1 });
  const { scene, camera } = mark;
  if (scene.children.length !== 1 || scene.children[0] !== mark.mesh) throw new Error('[s48] the frame holds something besides the mark');

  // keep the plan honest: the cues from the motion
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s48] CUES off: ${cc.bad.join('; ')}`);

  // the line, at the output's size (it is laid over the frame at that size)
  await loadFonts();
  const W = ctx.outWidth || ctx.width;
  const H = ctx.outHeight || ctx.height;
  const line = typesetLine(W, H);
  const tex = canvasTexture(line.canvas, { srgb: false, mipmaps: false, anisotropy: 1, premultiply: true });

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    mark, // look-dev only
    line, // look-dev only
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
    margin(t) {
      const a = textAlpha(t);
      return a > 0 ? { tex, alpha: a } : null;
    },
  };
}
