// Deterministic randomness for the film.
// Rule: update(t) must be a pure function of t. Never call Math.random in update();
// derive every per-object value from hash(index, salt) or from an rng seeded in setup().

const M1 = 0x7feb352d;
const M2 = 0x846ca68b;

function mix32(x) {
  x = Math.imul(x ^ (x >>> 16), M1);
  x = Math.imul(x ^ (x >>> 15), M2);
  return (x ^ (x >>> 16)) >>> 0;
}

// Integer hash of up to four integers, returns a float in [0, 1).
export function hash(a, b = 0, c = 0, d = 0) {
  let h = mix32((a | 0) + 0x9e3779b9);
  h = mix32(h ^ ((b | 0) + 0x85ebca6b));
  h = mix32(h ^ ((c | 0) + 0xc2b2ae35));
  h = mix32(h ^ ((d | 0) + 0x27d4eb2f));
  return h / 4294967296;
}

// Signed variant in [-1, 1).
export const shash = (a, b, c, d) => hash(a, b, c, d) * 2 - 1;

// Seeded sequential generator (use only in setup()).
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.gauss = () => {
    const u = Math.max(next(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  next.sign = () => (next() < 0.5 ? -1 : 1);
  return next;
}

// Smooth 1D value noise in [-1, 1].
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}

// Fractal 1D noise, roughly in [-1, 1].
export function fbm1(x, seed = 0, octaves = 4, lacunarity = 2.03, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise1(x * f, seed + o * 131);
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

// Halton low-discrepancy sequence (index >= 1).
export function halton(index, base) {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}
