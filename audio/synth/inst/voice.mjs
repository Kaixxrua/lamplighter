// Voices: a formant choir and a whisper that can turn into a sung line.
//
// Source–filter synthesis with a parallel formant bank (the FOF arrangement): a band-limited pulse
// train (plus aspiration noise) drives five band-pass resonators whose centre, bandwidth and peak
// level come from the classic per-voice-type vowel tables (bass, tenor, alto, soprano × a e i o u).
// Formant signs alternate to avoid notches between peaks, and a low-passed copy of the source keeps
// the fundamental's warmth. Dynamics tilt the source (soft singing is darker). Each singer has its
// own tuning offset, drift, vibrato (rate, depth, delayed onset), vocal-tract scale and onset time;
// six such singers make a choir part.
import { SR, midiHz, centsRatio, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { specTable, osc, Biquad, TAU, clamp, smooth, wobble } from '../lib/dsp.mjs';

/** [frequencies Hz], [levels dB re F1], [bandwidths Hz] per vowel and voice type */
export const FORMANTS = {
  a: {
    S: [[800, 1150, 2900, 3900, 4950], [0, -6, -32, -20, -50], [80, 90, 120, 130, 140]],
    A: [[800, 1150, 2800, 3500, 4950], [0, -4, -20, -36, -60], [80, 90, 120, 130, 140]],
    T: [[650, 1080, 2650, 2900, 3250], [0, -6, -7, -8, -22], [80, 90, 120, 130, 140]],
    B: [[600, 1040, 2250, 2450, 2750], [0, -7, -9, -9, -20], [60, 70, 110, 120, 130]],
  },
  e: {
    S: [[350, 2000, 2800, 3600, 4950], [0, -20, -15, -40, -56], [60, 100, 120, 150, 200]],
    A: [[400, 1600, 2700, 3300, 4950], [0, -24, -30, -35, -60], [60, 80, 120, 150, 200]],
    T: [[400, 1700, 2600, 3200, 3580], [0, -14, -12, -14, -20], [70, 80, 100, 120, 120]],
    B: [[400, 1620, 2400, 2800, 3100], [0, -12, -9, -12, -18], [40, 80, 100, 120, 120]],
  },
  i: {
    S: [[270, 2140, 2950, 3900, 4950], [0, -12, -26, -26, -44], [60, 90, 100, 120, 120]],
    A: [[350, 1700, 2700, 3700, 4950], [0, -20, -30, -36, -60], [50, 100, 120, 150, 200]],
    T: [[290, 1870, 2800, 3250, 3540], [0, -15, -18, -20, -30], [40, 90, 100, 120, 120]],
    B: [[250, 1750, 2600, 3050, 3340], [0, -30, -16, -22, -28], [60, 90, 100, 120, 120]],
  },
  o: {
    S: [[450, 800, 2830, 3800, 4950], [0, -11, -22, -22, -50], [70, 80, 100, 130, 135]],
    A: [[450, 800, 2830, 3500, 4950], [0, -9, -16, -28, -55], [70, 80, 100, 130, 135]],
    T: [[400, 800, 2600, 2800, 3000], [0, -10, -12, -12, -26], [40, 80, 100, 120, 120]],
    B: [[400, 750, 2400, 2600, 2900], [0, -11, -21, -20, -40], [40, 80, 100, 120, 120]],
  },
  u: {
    S: [[325, 700, 2700, 3800, 4950], [0, -16, -35, -40, -60], [50, 60, 170, 180, 200]],
    A: [[325, 700, 2530, 3500, 4950], [0, -12, -30, -40, -64], [50, 60, 170, 180, 200]],
    T: [[350, 600, 2700, 2900, 3300], [0, -20, -17, -14, -26], [40, 60, 100, 120, 120]],
    B: [[350, 600, 2400, 2675, 2950], [0, -20, -32, -28, -36], [40, 80, 100, 120, 120]],
  },
};

/** formant set at time t for a vowel spec: key, or function t → [vowelA, vowelB, mix] */
function formantsAt(vowel, part, t) {
  if (typeof vowel === 'string') return FORMANTS[vowel][part];
  const [a, b, m] = vowel(t);
  const A = FORMANTS[a][part], B = FORMANTS[b][part];
  return A.map((row, r) => row.map((v, k) => v + (B[r][k] - v) * m));
}

/** parallel formant bank with coefficient updates every 32 samples */
class FormantBank {
  constructor() { this.bp = [0, 1, 2, 3, 4].map(() => new Biquad()); this.g = [0, 0, 0, 0, 0]; }
  set([F, Ldb, BW], scale = 1, f1min = 0) {
    for (let k = 0; k < 5; k++) {
      let f = F[k] * scale;
      if (k === 0) f = Math.max(f, f1min);
      this.bp[k].design('bp', Math.min(f, SR * 0.45), f / BW[k]);
      this.g[k] = (k % 2 ? -1 : 1) * dB(Ldb[k]);
    }
  }
  tick(x) { let y = 0; for (let k = 0; k < 5; k++) y += this.g[k] * this.bp[k].tick(x); return y; }
}

/** band-limited pulse train with a spectral tilt k^−tilt */
const pulse = (f0, tilt) => { const s = Math.round(tilt * 20) / 20; return specTable(`pulse:${s}`, (k) => Math.pow(k, -s), f0, { fmax: 12000, seed: 'pulse', phases: 'zero' }); };

/**
 * One singer. midi: number or function of seconds (glides); vowel: key or t → [a, b, mix].
 * dyn 0..1 (pp..ff). Returns a mono Float32Array (unnormalised).
 */
export function singer({ part, midi, dur, vowel = 'a', dyn = 0.6, seed, attack = 0.18, release = 0.35, breath = 1, vib = null, onset = 0 }) {
  const r = new Rng(`singer:${seed}`);
  const pre = Math.round(onset * SR);
  const n = pre + Math.round((dur + release * 1.2) * SR);
  const f0base = (t) => midiHz(typeof midi === 'function' ? midi(t) : midi);
  const det = r.gauss() * 7; // cents
  const vr = vib?.rate ?? 5.3 + r.next() * 0.7, vd = vib?.depth ?? 25 + r.next() * 15, vdel = vib?.delay ?? 0.25 + r.next() * 0.3;
  const vph = r.next() * TAU;
  const drift = wobble(n, `drift:${seed}`, 0.9);
  const shimmer = wobble(n, `shim:${seed}`, 0.23);
  const freq = new Float32Array(n), amp = new Float32Array(n);
  const nOn = pre + Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const t = (i - pre) / SR;
    const vibAmt = clamp((t - vdel) / 0.45, 0, 1);
    freq[i] = f0base(Math.max(0, t)) * centsRatio(det + drift[i] * 4 + vibAmt * vd * Math.sin(TAU * vr * t + vph));
    amp[i] = i < pre || i >= nOn ? 0 : smooth(clamp(t / attack)) * (1 + 0.035 * shimmer[i]);
  }
  const last = nOn > pre ? amp[nOn - 1] : 0, nr = release * SR;
  for (let i = nOn; i < n; i++) { const u = (i - nOn) / nr; amp[i] = u < 1 ? last * (0.5 + 0.5 * Math.cos(Math.PI * u)) : 0; }
  // source: pulse train, darker when soft, plus aspiration riding the glottal cycle
  const src = new Float32Array(n);
  osc(pulse(f0base(0), 0.25 + 0.45 * (1 - dyn)), src, 0, n, freq, amp, r.next());
  const asp = new Biquad('hp', 1200, 0.7);
  const ab = dB(-30) * breath;
  for (let i = 0; i < n; i++) src[i] += ab * amp[i] * asp.tick(r.gauss()) * (0.5 + 0.5 * clamp(src[i] / 4 + 0.5));
  // filter: parallel formants + body
  const out = new Float32Array(n);
  const bank = new FormantBank(), body = new Biquad('lp', Math.max(260, 1.6 * f0base(0)), 0.7);
  const scale = 1 + r.gauss() * 0.03;
  for (let i = 0; i < n; i += 32) {
    const t = Math.max(0, (i - pre) / SR);
    bank.set(formantsAt(vowel, part, t), scale, part === 'S' || part === 'A' ? freq[i] * 1.08 : 0);
    const m = Math.min(32, n - i);
    for (let j = 0; j < m; j++) { const v = src[i + j]; out[i + j] = bank.tick(v) + 0.3 * body.tick(v); }
  }
  new Biquad('hp', 70, 0.7).run(out);
  new Biquad('lp', 9000, 0.6).run(out);
  return out;
}

/** a choir part: `singers` voices spread across a pan range. Returns { L, R, at }. */
export function choirPart({ part, midi, t0, dur, vowel = 'a', dyn = 0.6, singers = 6, pan = [-0.3, 0.3], seed = '', level = 0, attack = 0.25, release = 0.5, scatter = 0.05, vib }) {
  const r = new Rng(`part:${seed}:${part}`);
  const voices = [];
  let n = 0;
  for (let s = 0; s < singers; s++) {
    const onset = r.next() * scatter;
    const x = singer({ part, midi, dur: dur - onset * 0.5, vowel, dyn, seed: `${seed}:${part}:${s}`, attack: attack * (0.8 + 0.4 * r.next()), release: release * (0.8 + 0.4 * r.next()), onset, vib });
    voices.push({ x, p: pan[0] + ((pan[1] - pan[0]) * (s + 0.5)) / singers + r.bi() * 0.05 });
    n = Math.max(n, x.length);
  }
  const L = new Float32Array(n), R = new Float32Array(n);
  // the section's RMS (over its held part) tracks dynamics, ≈ 9 dB from pp to ff
  let pw = 0, cnt = 0;
  for (const v of voices) for (let i = 0; i < v.x.length; i += 7) { pw += v.x[i] * v.x[i]; cnt++; }
  const g = dB(level - 20 + 9 * dyn) / Math.sqrt((pw / Math.max(1, cnt)) * singers + 1e-20);
  for (const v of voices) {
    const a = (clamp(v.p, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * g, gr = Math.sin(a) * g;
    for (let i = 0; i < v.x.length; i++) { L[i] += v.x[i] * gl; R[i] += v.x[i] * gr; }
  }
  return { L, R, at: Math.round(t0 * SR) };
}

// ---------------------------------------------------------------------------------------------
// whisper → voice. Syllables are consonant + vowel; `clarity(t)` (0..1, seconds from the line's start)
// crossfades the vowels from breath noise to a sung tone through the same formants.
const CONS = {
  s: { f: 6500, q: 2.5, d: 0.09, a: 0.5 }, sh: { f: 3200, q: 2, d: 0.1, a: 0.5 }, f: { f: 5000, q: 0.7, d: 0.07, a: 0.25 },
  h: { f: 1500, q: 0.6, d: 0.06, a: 0.2 }, t: { f: 4200, q: 1.5, d: 0.025, a: 0.6 }, k: { f: 2400, q: 2, d: 0.03, a: 0.55 },
  p: { f: 900, q: 1, d: 0.02, a: 0.4 }, m: { f: 300, q: 2, d: 0.05, a: 0.15 }, n: { f: 400, q: 2, d: 0.05, a: 0.15 }, l: { f: 500, q: 2, d: 0.04, a: 0.1 },
};
const rmsOf = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)) + 1e-12; };

/** syllables: [{ t, c, v, d, midi }] (seconds from start). Returns mono, RMS-normalised per syllable. */
export function whisperLine({ syllables, part = 'A', clarity = () => 0, seed = 'w', dyn = 0.5 }) {
  const end = Math.max(...syllables.map((s) => s.t + s.d)) + 0.6;
  const n = Math.round(end * SR);
  const out = new Float32Array(n);
  const r = new Rng(`whisper:${seed}`);
  syllables.forEach((sy, idx) => {
    if (sy.c && CONS[sy.c]) {
      const c = CONS[sy.c];
      const i0 = Math.round(sy.t * SR), m = Math.round(c.d * SR * 1.6);
      const bp = new Biquad('bp', c.f * (0.95 + 0.1 * r.next()), c.q);
      for (let i = 0; i < m && i0 + i < n; i++) {
        const u = i / (c.d * SR);
        const e = u < 0.25 ? smooth(u / 0.25) : Math.exp(-(u - 0.25) * 3);
        out[i0 + i] += c.a * 0.5 * e * bp.tick(r.gauss());
      }
    }
    const v0 = sy.t + (sy.c ? CONS[sy.c].d * 0.8 : 0);
    const cl = clamp(clarity(v0));
    const nz = whisperedVowel({ part, dur: sy.d, vowel: sy.v, seed: `${seed}:n${idx}` });
    const voiced = cl > 0.01 ? singer({ part, midi: sy.midi ?? 69, dur: sy.d, vowel: sy.v, dyn, seed: `${seed}:v${idx}`, attack: 0.04, release: 0.12, breath: 2, vib: { rate: 5.5, depth: 12, delay: 0.25 } }) : null;
    const i0 = Math.round(v0 * SR);
    const gn = 0.18 / rmsOf(nz), gv = voiced ? 0.18 / rmsOf(voiced) : 0;
    for (let i = 0; i < nz.length && i0 + i < n; i++) out[i0 + i] += nz[i] * gn * Math.sqrt(1 - cl);
    if (voiced) for (let i = 0; i < voiced.length && i0 + i < n; i++) out[i0 + i] += voiced[i] * gv * Math.sqrt(cl);
  });
  return out;
}

/** a whispered vowel: noise through the vowel's formants (widened), soft envelope */
function whisperedVowel({ part, dur, vowel, seed }) {
  const r = new Rng(`wv:${seed}`);
  const n = Math.round((dur + 0.15) * SR);
  const out = new Float32Array(n);
  const [F, Ldb, BW] = FORMANTS[vowel][part];
  const bank = new FormantBank();
  bank.set([F, Ldb.map((d) => d * 0.6), BW.map((b) => b * 1.8)], 1 + r.gauss() * 0.03);
  const hp = new Biquad('hp', 350, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = t < 0.05 ? smooth(t / 0.05) : t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.15);
    out[i] = bank.tick(hp.tick(r.gauss()) * e);
  }
  return out;
}
