// Loudness and peaks: ITU-R BS.1770-4 (K-weighting, gated integrated loudness), EBU Tech 3341
// (momentary 400 ms, short-term 3 s) and Tech 3342 (loudness range), true peak by 4× polyphase
// oversampling, and the lookahead true-peak limiter that sits last on the mix bus.
import { SR } from './const.mjs';

// K-weighting at 48 kHz (BS.1770-4 table 1 and 2): high shelf, then RLB high-pass
const K1 = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
const K2 = [1, -2, 1, -1.99004745483398, 0.99007225036621];

function biquadInto(x, [b0, b1, b2, a1, a2], y) {
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], o = b0 * v + z1;
    z1 = b1 * v - a1 * o + z2;
    z2 = b2 * v - a2 * o;
    y[i] = o;
  }
  return y;
}

/** channel-summed mean-square input to the meters: z[n] = kL[n]² + kR[n]² (G = 1 for L and R) */
export function kPower(L, R) {
  const n = L.length, t = new Float64Array(n), z = new Float64Array(n);
  for (const x of [L, R]) {
    biquadInto(x, K1, t);
    biquadInto(t, K2, t);
    for (let i = 0; i < n; i++) z[i] += t[i] * t[i];
  }
  return z;
}

const lufs = (p) => (p > 0 ? -0.691 + 10 * Math.log10(p) : -Infinity);

/** Full measurement of a stereo programme. Series are sampled every 100 ms at window centres. */
export function measure(L, R) {
  const n = L.length;
  const z = kPower(L, R);
  const C = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) C[i + 1] = C[i] + z[i];
  const pw = (a, b) => Math.max(0, (C[b] - C[a]) / (b - a));
  const hop = SR / 10, wM = (SR * 4) / 10, wS = SR * 3;
  // gating blocks: 400 ms, 75 % overlap
  const blocks = [];
  for (let a = 0; a + wM <= n; a += hop) blocks.push(pw(a, a + wM));
  const abs = blocks.filter((p) => lufs(p) > -70);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const gammaR = lufs(mean(abs)) - 10;
  const gated = abs.filter((p) => lufs(p) > gammaR);
  const integrated = lufs(mean(gated));
  // series
  const momentary = [], shortTerm = [];
  for (let a = 0; a + wM <= n; a += hop) momentary.push({ t: (a + wM / 2) / SR, l: lufs(pw(a, a + wM)) });
  for (let a = 0; a + wS <= n; a += hop) shortTerm.push({ t: (a + wS / 2) / SR, l: lufs(pw(a, a + wS)) });
  // loudness range (Tech 3342)
  const st = shortTerm.map((s) => s.l).filter((l) => l > -70);
  const stPow = st.map((l) => Math.pow(10, (l + 0.691) / 10));
  const relS = lufs(mean(stPow)) - 20;
  const sv = st.filter((l) => l > relS).sort((a, b) => a - b);
  const pct = (q) => sv[Math.round((sv.length - 1) * q)];
  const lra = sv.length ? pct(0.95) - pct(0.1) : 0;
  const tpL = truePeak(L), tpR = truePeak(R);
  let sp = 0, dcL = 0, dcR = 0;
  for (let i = 0; i < n; i++) { sp = Math.max(sp, Math.abs(L[i]), Math.abs(R[i])); dcL += L[i]; dcR += R[i]; }
  return {
    integrated, lra,
    momentaryMax: Math.max(...momentary.map((m) => m.l)),
    shortTermMax: Math.max(...shortTerm.map((s) => s.l)),
    truePeak: 20 * Math.log10(Math.max(tpL.peak, tpR.peak, 1e-30)),
    truePeakAt: (tpL.peak >= tpR.peak ? tpL.at : tpR.at) / SR,
    samplePeak: 20 * Math.log10(Math.max(sp, 1e-30)),
    dc: [dcL / n, dcR / n],
    momentary, shortTerm,
  };
}

// ---------------------------------------------------------------------------------------------
// True peak: 4× oversampling. The interpolator is a Kaiser-windowed sinc (β = 8) cut exactly at the
// original Nyquist, which makes it a Nyquist filter: phase 0 is the input itself, so only phases 1–3
// are computed, each a 32-tap fractional-delay filter normalised to unity DC gain. 32 taps per phase
// keep the passband flat past 20 kHz.
const OS = 4, TP = 32;
const GK = (() => {
  const half = TP / 2, beta = 8;
  const bessel0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) ** 2; s += t; } return s; };
  const g = [];
  for (let k = 1; k < OS; k++) {
    const taps = new Float64Array(TP);
    let s = 0;
    for (let j = -half + 1; j <= half; j++) {
      // x[n + j] contributes to the value at time n + k/4 with weight sinc(k/4 − j) · window
      const d = k / OS - j;
      const r = d / (half + 0.5);
      const w = Math.abs(r) < 1 ? bessel0(beta * Math.sqrt(1 - r * r)) / bessel0(beta) : 0;
      const v = (Math.sin(Math.PI * d) / (Math.PI * d)) * w;
      taps[j + half - 1] = v; s += v;
    }
    for (let j = 0; j < TP; j++) taps[j] /= s;
    g.push(taps);
  }
  return g;
})();

/** largest |x| among the four samples around the interval [i, i+1) (cheap pre-check) */
const near = (x, i, n) => Math.max(Math.abs(x[i]), i > 0 ? Math.abs(x[i - 1]) : 0, i + 1 < n ? Math.abs(x[i + 1]) : 0, i + 2 < n ? Math.abs(x[i + 2]) : 0);

/** inter-sample peak estimate for the interval [i, i+1) of x */
function ispAt(x, i, n) {
  let m = Math.abs(x[i]);
  const half = TP / 2;
  if (i - half + 1 < 0 || i + half >= n) return m;
  for (let k = 0; k < OS - 1; k++) {
    const g = GK[k];
    let s = 0;
    for (let j = 0; j < TP; j++) s += x[i + j - half + 1] * g[j];
    const a = Math.abs(s);
    if (a > m) m = a;
  }
  return m;
}

/** true peak of one channel (linear) and where it is */
export function truePeak(x) {
  const n = x.length;
  let peak = 0, at = 0;
  for (let i = 0; i < n; i++) {
    if (near(x, i, n) * 1.6 < peak) continue; // band-limited overshoot between samples stays well below 4 dB
    const v = ispAt(x, i, n);
    if (v > peak) { peak = v; at = i; }
  }
  return { peak, at };
}

// ---------------------------------------------------------------------------------------------
/** Lookahead true-peak limiter, in place. The required gain at each sample comes from the
 *  oversampled peak; a sliding minimum holds it for the lookahead, an exponential release lets
 *  it recover, and a box average of the lookahead length turns the steps into ramps that finish
 *  exactly at the peak. Offline, so the gain is advanced instead of the audio delayed.
 *  Returns statistics (minimum gain, samples reduced). */
export function limit(L, R, { ceilingDb = -1, lookahead = 0.0025, release = 0.12, trace = false } = {}) {
  const n = L.length, ceil = Math.pow(10, ceilingDb / 20);
  const La = Math.max(2, Math.round(lookahead * SR));
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (Math.max(near(L, i, n), near(R, i, n)) * 1.6 < ceil) { req[i] = 1; continue; }
    const p = Math.max(ispAt(L, i, n), ispAt(R, i, n));
    req[i] = p > ceil ? ceil / p : 1;
  }
  // sliding minimum over the last La samples (monotone deque)
  const hold = new Float32Array(n);
  const dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = 0; i < n; i++) {
    while (t > h && req[dq[t - 1]] >= req[i]) t--;
    dq[t++] = i;
    if (dq[h] <= i - La) h++;
    hold[i] = req[dq[h]];
  }
  // release: never above the hold, recovers towards 1 with time constant `release`
  const a = 1 - Math.exp(-1 / (release * SR));
  let r = 1;
  for (let i = 0; i < n; i++) { r = Math.min(hold[i], r + (1 - r) * a); hold[i] = r; }
  // box average over the last La values → the gain for input sample i − (La − 1); history and future count as 1
  let acc = La, minG = 1, reduced = 0;
  const gain = trace ? new Float32Array(n) : null; // the applied gain per sample, when asked for
  for (let i = 0; i < n + La - 1; i++) {
    acc += (i < n ? hold[i] : 1) - (i - La >= 0 && i - La < n ? hold[i - La] : 1);
    const k = i - (La - 1);
    if (k < 0) continue;
    const g = acc / La;
    L[k] *= g; R[k] *= g;
    if (gain) gain[k] = g;
    if (g < minG) minG = g;
    if (g < 0.9999) reduced++;
  }
  return { minGainDb: 20 * Math.log10(minG), reduced, lookahead: La, gain };
}

/** pearson correlation of L and R over [i0, i1) */
export function correlation(L, R, i0 = 0, i1 = L.length) {
  let lr = 0, ll = 0, rr = 0;
  for (let i = i0; i < i1; i++) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i]; }
  return ll > 0 && rr > 0 ? lr / Math.sqrt(ll * rr) : 1;
}
