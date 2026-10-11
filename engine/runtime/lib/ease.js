// Easing, remapping and keyframe tracks. All pure functions.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smoothstep = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const ease = {
  linear: (t) => t,
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuint: (t) => t ** 5,
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  // Camera-operator style: slow start, long glide, soft landing.
  glide: (t) => {
    const s = t * t * t * (t * (t * 6 - 15) + 10);
    return 0.65 * s + 0.35 * (1 - Math.pow(1 - t, 3));
  },
};

// Keyframe track: keys = [[time, value, easeName?], ...] sorted by time.
// The ease on a key shapes the segment that ends at that key. Values may be numbers or arrays.
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t <= k1[0]) {
      const k0 = keys[i - 1];
      const fn = ease[k1[2] || 'inOutSine'] || ease.inOutSine;
      const u = fn((t - k0[0]) / (k1[0] - k0[0]));
      if (Array.isArray(k0[1])) return k0[1].map((v, j) => lerp(v, k1[1][j], u));
      return lerp(k0[1], k1[1], u);
    }
  }
  return last[1];
}

// Fade envelope: 0 → 1 over [a, a+inLen], 1 → 0 over [b-outLen, b].
export function envelope(t, a, b, inLen, outLen) {
  if (t <= a || t >= b) return 0;
  const i = inLen > 0 ? clamp((t - a) / inLen) : 1;
  const o = outLen > 0 ? clamp((b - t) / outLen) : 1;
  return ease.inOutSine(Math.min(i, o));
}
