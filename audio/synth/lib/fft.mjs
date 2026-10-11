// In-place iterative radix-2 complex FFT on Float64Array pairs. Tables are cached per size.
const tables = new Map();

function plan(n) {
  let t = tables.get(n);
  if (t) return t;
  if (n & (n - 1)) throw new Error(`fft size ${n} is not a power of two`);
  const bits = Math.log2(n);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0, x = i; b < bits; b++, x >>= 1) r = (r << 1) | (x & 1);
    rev[i] = r;
  }
  const half = n >> 1;
  const cos = new Float64Array(half);
  const sin = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    cos[k] = Math.cos((2 * Math.PI * k) / n);
    sin[k] = Math.sin((2 * Math.PI * k) / n);
  }
  t = { rev, cos, sin };
  tables.set(n, t);
  return t;
}

/** forward (inverse=false: e^{-i}) or inverse (unscaled, e^{+i}) transform, in place */
export function fft(re, im, inverse = false) {
  const n = re.length;
  const { rev, cos, sin } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  const sgn = inverse ? 1 : -1;
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let j = 0, k = 0; j < half; j++, k += step) {
      const wr = cos[k];
      const wi = sgn * sin[k];
      for (let i = j; i < n; i += size) {
        const b = i + half;
        const xr = re[b], xi = im[b];
        const tr = xr * wr - xi * wi;
        const ti = xr * wi + xi * wr;
        re[b] = re[i] - tr; im[b] = im[i] - ti;
        re[i] += tr; im[i] += ti;
      }
    }
  }
}

export const nextPow2 = (x) => 1 << Math.ceil(Math.log2(Math.max(1, x)));

/** magnitude spectrum (dB) of a real signal segment with a Hann window — for QA */
export function spectrumDb(x, start, n) {
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    re[i] = (x[start + i] || 0) * w;
  }
  fft(re, im);
  const out = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) out[k] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-30);
  return out;
}
