// Signal-processing primitives shared by the instruments: filters, noise, envelopes, panning and the
// band-limited wavetable oscillator every pitched voice is built on. All state is double precision;
// buffers are Float32Array unless a function says otherwise.
import { SR } from './const.mjs';
import { Rng } from './rng.mjs';
import { fft } from './fft.mjs';

export const TAU = 2 * Math.PI;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, x) => a + (b - a) * x;
/** 0→1 over [t0, t1], clamped */
export const ramp = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
export const smooth = (x) => x * x * (3 - 2 * x);
export const cosRamp = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
export const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const dbGain = (db) => Math.pow(10, db / 20);

// ---------------------------------------------------------------------------------------------
// Biquad (RBJ Audio EQ Cookbook), transposed direct form II.
export class Biquad {
  constructor(kind, f, q = Math.SQRT1_2, db = 0) {
    this.z1 = 0; this.z2 = 0;
    if (kind) this.design(kind, f, q, db);
  }
  design(kind, f, q = Math.SQRT1_2, db = 0) {
    const w = TAU * Math.min(f, SR * 0.4999) / SR;
    const c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    const A = Math.pow(10, db / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (kind) {
      case 'lp': b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'hp': b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break; // 0 dB peak
      case 'notch': b0 = 1; b1 = -2 * c; b2 = 1; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'ap': b0 = 1 - al; b1 = -2 * c; b2 = 1 + al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'peak': b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; break;
      case 'lowshelf': {
        const r = 2 * Math.sqrt(A) * al;
        b0 = A * ((A + 1) - (A - 1) * c + r); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - r);
        a0 = (A + 1) + (A - 1) * c + r; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - r; break;
      }
      case 'highshelf': {
        const r = 2 * Math.sqrt(A) * al;
        b0 = A * ((A + 1) + (A - 1) * c + r); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - r);
        a0 = (A + 1) - (A - 1) * c + r; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - r; break;
      }
      default: throw new Error(`biquad kind ${kind}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  tick(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
  /** filter x[i0..i1) into y (may be x) */
  run(x, y = x, i0 = 0, i1 = x.length) {
    const { b0, b1, b2, a1, a2 } = this;
    let z1 = this.z1, z2 = this.z2;
    for (let i = i0; i < i1; i++) {
      const v = x[i];
      const o = b0 * v + z1;
      z1 = b1 * v - a1 * o + z2;
      z2 = b2 * v - a2 * o;
      y[i] = o;
    }
    this.z1 = z1; this.z2 = z2;
    return y;
  }
  /** complex response magnitude at frequency f (for tests and plots) */
  mag(f) {
    const w = TAU * f / SR;
    const cr = (c0, c1, c2) => [c0 + c1 * Math.cos(-w) + c2 * Math.cos(-2 * w), c1 * Math.sin(-w) + c2 * Math.sin(-2 * w)];
    const [nr, ni] = cr(this.b0, this.b1, this.b2);
    const [dr, di] = cr(1, this.a1, this.a2);
    return Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
}
/** cascade of n identical biquads (steeper slopes); returns a run(x, y) function */
export function chain(...fs) {
  return (x, y = x) => { fs[0].run(x, y); for (let k = 1; k < fs.length; k++) fs[k].run(y, y); return y; };
}

// ---------------------------------------------------------------------------------------------
// State-variable filter (Simper's trapezoidal SVF): stable under per-sample cutoff modulation.
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; this.set(1000, 0.707); }
  set(f, q) {
    const g = Math.tan(Math.PI * Math.min(f, SR * 0.49) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  /** one sample; returns band-pass, leaves low/high in this.lp / this.hp */
  tick(v0) {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.hp = v0 - this.k * v1 - v2;
    return v1;
  }
}

// one-pole low-pass, y += a (x − y)
export class OnePole {
  constructor(f) { this.y = 0; this.set(f); }
  set(f) { this.a = 1 - Math.exp(-TAU * f / SR); }
  tick(x) { return (this.y += this.a * (x - this.y)); }
  run(x, y = x, i0 = 0, i1 = x.length) {
    let s = this.y; const a = this.a;
    for (let i = i0; i < i1; i++) y[i] = s += a * (x[i] - s);
    this.y = s; return y;
  }
}

/** DC blocker in place: y[n] = x[n] − x[n−1] + R y[n−1]; corner ≈ fc */
export function dcBlock(x, fc = 5) {
  const R = Math.exp(-TAU * fc / SR);
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; py = v - px + R * py; px = v; x[i] = py; }
  return x;
}

// ---------------------------------------------------------------------------------------------
// noise
export function white(n, rng) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rng.bi(); return o; }
export function gauss(n, rng) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rng.gauss(); return o; }
/** pink noise, ≈ −3 dB/oct, RMS ≈ 1 (Kellet's filter on Gaussian white) */
export function pink(n, rng) {
  const o = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rng.gauss();
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.2;
    b6 = w * 0.115926;
  }
  return o;
}
/** brown (red) noise, −6 dB/oct above ~fc, RMS ≈ 1 */
export function brown(n, rng, fc = 20) {
  const o = new Float32Array(n);
  const a = Math.exp(-TAU * fc / SR), g = Math.sqrt(1 - a * a);
  let y = 0;
  for (let i = 0; i < n; i++) o[i] = y = a * y + g * rng.gauss();
  return o;
}

// ---------------------------------------------------------------------------------------------
// envelopes and automation
/** piecewise curve through [t, v, shape?] points (shape of the segment that ends at that point:
 *  'lin' | 'cos' | 'exp' (geometric between positive values) | 'hold'). Constant outside. */
export function curve(points) {
  const P = points.map((p) => ({ t: p[0], v: p[1], s: p[2] || 'lin' }));
  return (t) => {
    if (t <= P[0].t) return P[0].v;
    for (let k = 1; k < P.length; k++) {
      if (t <= P[k].t) {
        const a = P[k - 1], b = P[k];
        const x = (t - a.t) / (b.t - a.t || 1);
        switch (b.s) {
          case 'cos': return a.v + (b.v - a.v) * cosRamp(x);
          case 'exp': return a.v > 0 && b.v > 0 ? a.v * Math.pow(b.v / a.v, x) : a.v + (b.v - a.v) * x;
          case 'hold': return a.v;
          case 'smooth': return a.v + (b.v - a.v) * smooth(x);
          default: return a.v + (b.v - a.v) * x;
        }
      }
    }
    return P[P.length - 1].v;
  };
}
/** sample a curve into a Float32Array covering n samples from time t0 (seconds) */
export function sampleCurve(fn, n, t0 = 0, step = 16) {
  const o = new Float32Array(n);
  let prev = fn(t0);
  for (let i = 0; i < n; i += step) {
    const next = fn(t0 + Math.min(i + step, n) / SR);
    const m = Math.min(step, n - i);
    for (let j = 0; j < m; j++) o[i + j] = prev + (next - prev) * (j / step);
    prev = next;
  }
  return o;
}

// ---------------------------------------------------------------------------------------------
// panning: constant power, pan ∈ [−1, 1]
export function panGains(p) {
  const a = (clamp(p, -1, 1) + 1) * Math.PI / 4;
  return [Math.cos(a), Math.sin(a)];
}

// ---------------------------------------------------------------------------------------------
// band-limited wavetables
const tableCache = new Map();
/** One period of Σ amps[k−1]·sin(2πk·x + phases[k−1]), k = 1..K, as size+1 samples (guard point),
 *  normalised to RMS 1. Built with an inverse FFT, so it holds exactly the given harmonics. */
export function harmonicTable(amps, phases, size) {
  const re = new Float64Array(size), im = new Float64Array(size);
  let pow = 0;
  for (let k = 1; k <= amps.length && k < size / 2; k++) {
    const a = amps[k - 1];
    if (!a) continue;
    const ph = (phases ? phases[k - 1] : 0) - Math.PI / 2;
    re[k] = 0.5 * a * Math.cos(ph); im[k] = 0.5 * a * Math.sin(ph);
    re[size - k] = re[k]; im[size - k] = -im[k];
    pow += a * a / 2;
  }
  fft(re, im, true);
  const g = pow > 0 ? 1 / Math.sqrt(pow) : 0;
  const t = new Float32Array(size + 1);
  for (let i = 0; i < size; i++) t[i] = re[i] * g;
  t[size] = t[0];
  return t;
}
/** table size for K harmonics: ≥ 16× oversampled so linear interpolation error stays below −70 dB */
export const tableSize = (K) => Math.min(1 << 15, Math.max(256, 1 << Math.ceil(Math.log2(16 * Math.max(1, K)))));

/** Cached table for a spectrum function spec(k) → linear amplitude, band-limited for fundamental f0
 *  (harmonics up to fmax, cosine taper over the top 20%). key identifies spec. */
export function specTable(key, spec, f0, { fmax = 16000, seed = key, phases = 'random' } = {}) {
  const K = Math.max(1, Math.floor(fmax / f0));
  // spectra may depend on absolute frequency (formants, roll-off), so the key carries the pitch to 1/4 semitone
  const ck = `${key}|${K}|${Math.round(48 * Math.log2(f0))}`;
  let t = tableCache.get(ck);
  if (t) return t;
  const amps = new Float64Array(K), ph = new Float64Array(K);
  const r = new Rng(`phase:${seed}`);
  for (let k = 1; k <= K; k++) {
    const f = k * f0;
    const taper = f > 0.8 * fmax ? cosRamp((fmax - f) / (0.2 * fmax)) : 1;
    amps[k - 1] = spec(k, f) * taper;
    ph[k - 1] = phases === 'random' ? r.next() * TAU : phases === 'zero' ? 0 : phases(k);
  }
  t = harmonicTable(amps, ph, tableSize(K));
  tableCache.set(ck, t);
  return t;
}

/** Wavetable oscillator. Adds amp[i]·table(phase) into out[o0 + i] for i < n. freq: number or
 *  per-sample Float32Array (Hz); amp: number or Float32Array. Returns the end phase. */
export function osc(table, out, o0, n, freq, amp, phase = 0) {
  const M = table.length - 1;
  const fArr = typeof freq !== 'number', aArr = typeof amp !== 'number';
  const inc0 = fArr ? 0 : freq / SR;
  let p = phase;
  for (let i = 0; i < n; i++) {
    const x = p * M;
    const j = x | 0;
    const v = table[j] + (x - j) * (table[j + 1] - table[j]);
    out[o0 + i] += v * (aArr ? amp[i] : amp);
    p += fArr ? freq[i] / SR : inc0;
    if (p >= 1) p -= 1;
  }
  return p;
}

// ---------------------------------------------------------------------------------------------
// misc
export function peakAbs(x, i0 = 0, i1 = x.length) { let m = 0; for (let i = i0; i < i1; i++) { const v = Math.abs(x[i]); if (v > m) m = v; } return m; }
export function rms(x, i0 = 0, i1 = x.length) { let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); }
export function scale(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
/** smooth random curve in [−1, 1] sampled every `step` samples (cheap modulation source) */
export function wobble(n, seed, period = 1, step = 32) {
  const r = new Rng(`wobble:${seed}`);
  const knots = [];
  const get = (i) => { while (knots.length <= i) knots.push(r.bi()); return knots[i]; };
  const o = new Float32Array(n);
  const per = period * SR;
  for (let i = 0; i < n; i++) {
    const x = i / per, k = Math.floor(x), f = x - k;
    const p0 = get(Math.max(0, k - 1)), p1 = get(k), p2 = get(k + 1), p3 = get(k + 2);
    o[i] = 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }
  return o;
}
