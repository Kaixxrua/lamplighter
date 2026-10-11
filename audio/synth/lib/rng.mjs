// Seeded randomness. Every random choice in the score goes through here, so a render is
// bit-for-bit reproducible. Generator: sfc32 seeded from a string/number hash (cyrb128).

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export class Rng {
  constructor(seed) {
    const [a, b, c, d] = cyrb128(String(seed));
    this.a = a; this.b = b; this.c = c; this.d = d;
    for (let i = 0; i < 15; i++) this.u32();
    this._g = null;
  }
  u32() {
    let { a, b, c, d } = this;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.a = a; this.b = b; this.c = c; this.d = d;
    return t >>> 0;
  }
  /** [0, 1) */
  next() { return this.u32() / 4294967296; }
  /** [-1, 1) */
  bi() { return this.next() * 2 - 1; }
  range(lo, hi) { return lo + (hi - lo) * this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  pick(arr) { return arr[this.int(arr.length)]; }
  chance(p) { return this.next() < p; }
  /** standard normal (Box–Muller, cached pair) */
  gauss() {
    if (this._g !== null) { const g = this._g; this._g = null; return g; }
    let u = 0, v = 0;
    while (u <= 1e-12) u = this.next();
    v = this.next();
    const r = Math.sqrt(-2 * Math.log(u));
    this._g = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }
  /** exponential with given rate (mean 1/rate) */
  exp(rate) { return -Math.log(1 - this.next()) / rate; }
  /** child generator with a derived seed */
  fork(tag) { return new Rng(`${this.u32()}:${tag}`); }
}

export const rng = (seed) => new Rng(seed);

/** fill a Float32Array with white noise in [-1, 1) */
export function whiteNoise(n, seed) {
  const r = new Rng(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r.bi();
  return out;
}

/** Gaussian white noise, unit variance */
export function gaussNoise(n, seed) {
  const r = new Rng(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r.gauss();
  return out;
}

/** 1-D value noise / smooth random curve, deterministic: returns f(t) in [-1, 1], with knots every `period` seconds */
export function smoothRandom(seed, period = 1) {
  const r = new Rng(seed);
  const knots = [];
  const get = (i) => {
    while (knots.length <= i) knots.push(r.bi());
    return knots[i];
  };
  return (t) => {
    const x = Math.max(0, t / period);
    const i = Math.floor(x);
    const f = x - i;
    // cubic Hermite (Catmull–Rom) through knots
    const p0 = get(Math.max(0, i - 1)), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
    const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
    const c = -0.5 * p0 + 0.5 * p2;
    return Math.max(-1, Math.min(1, ((a * f + b) * f + c) * f + p1));
  };
}
