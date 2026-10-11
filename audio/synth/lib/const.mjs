// Time base and pitch helpers shared by every module.
// Global frame f (24 fps) starts at sample f * 2000 (48 kHz). The film is 5736 frames = 11,472,000 samples
// (10-07: the opening lost s04, s05, s07, s09 and s11, 552 frames; render.mjs checks these against film/timeline.json).
export const SR = 48000;
export const FPS = 24;
export const SPF = SR / FPS; // 2000 samples per frame
export const FRAMES = 5736;
export const N = FRAMES * SPF; // 11,472,000

/** frame (may be fractional) → sample index */
export const fr = (f) => Math.round(f * SPF);
/** seconds → samples */
export const sec = (t) => Math.round(t * SR);
/** sample → frame (fractional) */
export const toFrame = (s) => s / SPF;

/** s12: the shot runs [SIL0, SIL1). Its CUES: silence 0–1.5 s, then 0.5 s of shaft air rising from nothing
 *  under s13's ping. So [SIL0, AIR0) is exact digital zero and [AIR0, SIL1) holds only that air. */
export const SIL0 = 792 * SPF; // 1,584,000 (was frame 1344 before the opening was cut by 552 frames)
export const AIR0 = 828 * SPF; // 1,656,000
export const SIL1 = 840 * SPF; // 1,680,000
/** the Act I wall is cut with a 3 ms raised-cosine ending exactly at SIL0 */
export const CUT_FADE = 144;

/** Concert pitch: B5 = 1000 Hz, so the radar's 1 kHz sine (screenplay §七) is the score's B, not 21.5 cents
 *  above it. A4 = 1000·2^(−14/12) ≈ 445.45 Hz, inside the range organs are tuned to. Equal temperament. */
export const A4 = 1000 * Math.pow(2, -14 / 12);
export const midiHz = (m) => A4 * Math.pow(2, (m - 69) / 12);
export const centsRatio = (c) => Math.pow(2, c / 1200);

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'D4' → 62, 'Bb2' → 46, 'F#5' → 78 (scientific pitch, C4 = 60) */
export function nn(name) {
  if (typeof name === 'number') return name;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const hz = (name) => midiHz(nn(name));
export const dB = (x) => Math.pow(10, x / 20);
export const todB = (x) => 20 * Math.log10(Math.max(1e-30, x));
