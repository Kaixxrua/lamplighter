// Code-generated impulse responses for the reverbs (true stereo: paths LL, LR, RL, RR).
//
// Late tail: built in the short-time Fourier domain. Every frame and bin gets a complex Gaussian value,
// scaled by exp(−6.9078·t / RT60(f)) (−60 dB at RT60) and an initial spectral weight, then
// overlap-added. That is a stationary Gaussian process with a frequency-dependent exponential decay,
// which is what a diffuse late field is. Inter-channel coherence is high in the bass (so the
// low end stays solid in mono) and falls to a small residue above ~600 Hz.
// Early reflections: a sparse train whose density grows with t² (image sources), each tap
// distance-attenuated, panned towards the source side with a sub-millisecond interaural delay,
// then darkened. The late tail fades in after the predelay with a build-up time constant.
import { SR } from './const.mjs';
import { Rng } from './rng.mjs';
import { fft } from './fft.mjs';
import { Biquad, OnePole, clamp, cosRamp } from './dsp.mjs';

/** RT60 table [[Hz, s], …] → function of Hz (linear in log frequency) */
function rtFn(points) {
  const P = points.map(([f, t]) => [Math.log2(f), t]);
  return (f) => {
    const x = Math.log2(Math.max(f, 1));
    if (x <= P[0][0]) return P[0][1];
    for (let k = 1; k < P.length; k++) if (x <= P[k][0]) {
      const u = (x - P[k - 1][0]) / (P[k][0] - P[k - 1][0]);
      return P[k - 1][1] + u * (P[k][1] - P[k - 1][1]);
    }
    return P[P.length - 1][1];
  };
}

export const CATHEDRAL = {
  name: 'cathedral', length: 7.5, predelay: 0.026, build: 0.06,
  rt60: [[50, 6.4], [125, 6.8], [250, 6.6], [500, 6.3], [1000, 6.0], [2000, 5.1], [4000, 3.7], [8000, 2.3], [16000, 1.1], [24000, 0.8]],
  early: { n: 26, t0: 0.012, t1: 0.11, energy: 0.18 }, // fraction of each input's output energy
  lowCut: 32, tilt: { f: 7000, db: -4 }, cohF: [90, 650], cohFloor: 0.12, cross: 0.92,
};
export const CHAMBER = {
  name: 'chamber', length: 1.8, predelay: 0.012, build: 0.014,
  rt60: [[50, 1.3], [125, 1.25], [250, 1.15], [500, 1.1], [1000, 1.05], [2000, 0.95], [4000, 0.8], [8000, 0.6], [16000, 0.4], [24000, 0.3]],
  early: { n: 18, t0: 0.004, t1: 0.045, energy: 0.3 },
  lowCut: 45, tilt: { f: 9000, db: -3 }, cohF: [120, 900], cohFloor: 0.15, cross: 0.85,
};

/** build an impulse response: returns { LL, LR, RL, RR, n, spec } (Float32Array paths, unity energy per input side) */
export function makeIR(spec, seed = spec.name) {
  const n = Math.round(spec.length * SR);
  const rt = rtFn(spec.rt60);
  const rng = new Rng(`ir:${seed}`);
  const NF = 2048, H = NF / 4, half = NF / 2;
  const win = new Float64Array(NF);
  for (let i = 0; i < NF; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / NF);
  // per-bin constants: initial weight, decay rate per second, coherence split
  const w0 = new Float64Array(half + 1), dec = new Float64Array(half + 1), cc = new Float64Array(half + 1), ci = new Float64Array(half + 1);
  for (let k = 1; k < half; k++) {
    const f = (k * SR) / NF;
    const lc = (f / spec.lowCut) ** 2;
    const tl = Math.pow(10, (spec.tilt.db / 20) * ((f / spec.tilt.f) ** 2 / (1 + (f / spec.tilt.f) ** 2)));
    w0[k] = Math.sqrt(lc * lc / (1 + lc * lc)) * tl;
    dec[k] = 6.9078 / rt(f);
    const [fa, fb] = spec.cohF;
    const c = f <= fa ? 1 : f >= fb ? spec.cohFloor : spec.cohFloor + (1 - spec.cohFloor) * (1 - cosRamp(Math.log(f / fa) / Math.log(fb / fa)));
    cc[k] = Math.sqrt(c); ci[k] = Math.sqrt(1 - c);
  }
  const out = { LL: new Float64Array(n + NF), LR: new Float64Array(n + NF), RL: new Float64Array(n + NF), RR: new Float64Array(n + NF) };
  const re = new Float64Array(NF), im = new Float64Array(NF);
  const g = () => rng.gauss() * Math.SQRT1_2;
  const frames = Math.ceil(n / H) + 1;
  for (let m = 0; m < frames; m++) {
    const t = Math.max(0, (m * H + NF / 2) / SR); // frame centre
    for (const side of ['L', 'R']) {
      re.fill(0); im.fill(0);
      // Z = A + iB, A → path side→L, B → path side→R; both Hermitian
      for (let k = 1; k < half; k++) {
        const a = w0[k] * Math.exp(-dec[k] * t);
        const cr = g(), cI = g();
        const ar = a * (cc[k] * cr + ci[k] * g()), ai = a * (cc[k] * cI + ci[k] * g());
        const br = a * (cc[k] * cr + ci[k] * g()), bi = a * (cc[k] * cI + ci[k] * g());
        re[k] = ar - bi; im[k] = ai + br;
        re[NF - k] = ar + bi; im[NF - k] = -ai + br;
      }
      fft(re, im, true);
      const pa = out[`${side}L`], pb = out[`${side}R`];
      const o = m * H;
      for (let i = 0; i < NF; i++) { pa[o + i] += re[i] * win[i]; pb[o + i] += im[i] * win[i]; }
    }
  }
  // time-domain envelope: silence before the predelay, build-up, and a fade over the last 8 %
  const pd = spec.predelay, nb = spec.build, tf = spec.length * 0.92;
  const paths = {};
  for (const [key, x] of Object.entries(out)) {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if (t < pd) continue;
      let e = 1 - Math.exp(-(t - pd) / nb);
      if (t > tf) e *= 1 - cosRamp((t - tf) / (spec.length - tf));
      y[i] = x[i] * e;
    }
    paths[key] = y;
  }
  // late energy per input side → (1 − early) ; cross paths scaled by `cross`
  const er = spec.early.energy;
  for (const side of ['L', 'R']) {
    const same = paths[`${side}${side}`], other = paths[`${side}${side === 'L' ? 'R' : 'L'}`];
    let es = 0, eo = 0;
    for (let i = 0; i < n; i++) { es += same[i] * same[i]; eo += other[i] * other[i]; }
    const c2 = spec.cross * spec.cross;
    const k = Math.sqrt((1 - er) / (es + c2 * eo));
    for (let i = 0; i < n; i++) { same[i] *= k; other[i] *= k * spec.cross; }
  }
  // early reflections
  const ev = new Rng(`early:${seed}`);
  for (const side of ['L', 'R']) {
    const sgn = side === 'L' ? -1 : 1;
    const eL = new Float64Array(n), eR = new Float64Array(n);
    const { n: count, t0, t1 } = spec.early;
    for (let r = 0; r < count; r++) {
      const t = Math.cbrt(t0 ** 3 + ev.next() * (t1 ** 3 - t0 ** 3));
      const amp = (t0 / t) * (0.55 + 0.45 * ev.next());
      const az = clamp(sgn * 0.35 + ev.bi() * 0.75, -1, 1); // −1 left … +1 right
      const a = (az + 1) * Math.PI / 4;
      const itd = 0.00055 * az; // s; positive → arrives later on the left
      const iL = Math.round((t + Math.max(0, itd)) * SR), iR = Math.round((t + Math.max(0, -itd)) * SR);
      if (iL < n) eL[iL] += amp * Math.cos(a);
      if (iR < n) eR[iR] += amp * Math.sin(a);
    }
    // darken: later reflections have bounced off more stone → one-pole low-pass + gentle shelf
    for (const x of [eL, eR]) {
      new OnePole(9000).run(x);
      new Biquad('highshelf', 3500, 0.7, -3).run(x);
    }
    let e = 0;
    for (let i = 0; i < n; i++) e += eL[i] * eL[i] + eR[i] * eR[i];
    const k = Math.sqrt(er / e);
    const same = paths[`${side}${side}`], other = paths[`${side}${side === 'L' ? 'R' : 'L'}`];
    const sx = side === 'L' ? eL : eR, ox = side === 'L' ? eR : eL;
    for (let i = 0; i < n; i++) { same[i] += sx[i] * k; other[i] += ox[i] * k; }
    // early and late are independent, so this is a small correction: exact unity energy per input side
    let et = 0;
    for (let i = 0; i < n; i++) et += same[i] * same[i] + other[i] * other[i];
    const kt = 1 / Math.sqrt(et);
    for (let i = 0; i < n; i++) { same[i] *= kt; other[i] *= kt; }
  }
  const res = { n, spec };
  for (const key of ['LL', 'LR', 'RL', 'RR']) res[key] = Float32Array.from(paths[key]);
  return res;
}

/** energy decay curve (Schroeder backward integral, dB) of one path, for the IR report */
export function edc(x) {
  const n = x.length, o = new Float64Array(n);
  let s = 0;
  for (let i = n - 1; i >= 0; i--) { s += x[i] * x[i]; o[i] = s; }
  const total = o[0] || 1;
  for (let i = 0; i < n; i++) o[i] = 10 * Math.log10(o[i] / total + 1e-30);
  return o;
}

/** measured RT60 per octave band: fit the EDC between −5 and −25 dB (T20 ×3) after an octave band-pass */
export function measureRT(x, bands = [125, 250, 500, 1000, 2000, 4000, 8000]) {
  const res = {};
  for (const fc of bands) {
    const y = Float64Array.from(x);
    for (let s = 0; s < 3; s++) new Biquad('bp', fc, 1.41).run(y);
    const d = edc(y);
    let i5 = -1, i25 = -1;
    for (let i = 0; i < d.length; i++) { if (i5 < 0 && d[i] <= -5) i5 = i; if (d[i] <= -25) { i25 = i; break; } }
    res[fc] = i5 > 0 && i25 > i5 ? +((3 * (i25 - i5)) / SR).toFixed(2) : null;
  }
  return res;
}
