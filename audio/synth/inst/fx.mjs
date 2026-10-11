// Sound effects from filtered noise and small oscillators: shaft air, whooshes, sparks and sparkles,
// glass flashes, page turns (near, far, amplified), ash crumbling, key clicks, ticks, pops,
// a sub "whoomp", and the flowing bed under the rivers of light. Every generator is seeded.
import { SR } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { Biquad, SVF, TAU, clamp, smooth, wobble, pink, brown } from '../lib/dsp.mjs';

const N = (s) => Math.round(s * SR);
const fadeTail = (x, ms = 4) => { const nf = Math.min(x.length, N(ms / 1000)); for (let i = 0; i < nf; i++) x[x.length - 1 - i] *= i / nf; return x; };
const norm = (x, rmsTarget) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; const r = Math.sqrt(s / Math.max(1, x.length)); if (r > 0) for (let i = 0; i < x.length; i++) x[i] *= rmsTarget / r; return x; };
const pan2 = (p) => { const a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };

/** Shaft air: rumble, a wandering low howl, and a faint hiss, moved by slow gusts. Stereo, RMS ≈ 1. */
export function air({ dur, seed = 'air', howl = 0.5, hiss = 0.5 }) {
  const n = N(dur);
  const r = new Rng(`air:${seed}`);
  const common = brown(n, r, 25), gust = wobble(n, `gust:${seed}`, 2.6), wander = wobble(n, `wander:${seed}`, 4.1);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const [ch, side] of [[L, 'L'], [R, 'R']]) {
    const rr = new Rng(`air:${seed}:${side}`);
    const own = brown(n, rr, 25);
    const lp = new Biquad('lp', 140, 0.6), hp = new Biquad('hp', 28, 0.7);
    const pk = pink(n, rr), sv = new SVF();
    const hs1 = new Biquad('hp', 2800, 0.7), hs2 = new Biquad('lp', 9000, 0.7);
    for (let i = 0; i < n; i++) {
      const g = 0.75 + 0.25 * gust[i];
      const rum = hp.tick(lp.tick(0.6 * common[i] + 0.8 * own[i])) * 1.6;
      if ((i & 31) === 0) sv.set(230 * Math.pow(1.6, wander[i] + (side === 'L' ? 0.05 : -0.05)), 3.5);
      const how = sv.tick(pk[i]) * howl * 0.7;
      const his = hs2.tick(hs1.tick(rr.gauss())) * hiss * 0.05;
      ch[i] = g * (rum + how * (0.6 + 0.4 * gust[i])) + his * (0.4 + 0.6 * g);
    }
  }
  const k = 1 / Math.sqrt((rmsOf(L) ** 2 + rmsOf(R) ** 2) / 2);
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return { L, R };
}
function rmsOf(x) { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); }

/** whoosh: noise through a band-pass sweeping f0 → f1, peak at `peak` of the duration. Mono, peak-ish 1. */
export function whoosh({ dur, f0 = 300, f1 = 3000, q = 1.2, peak = 0.6, seed = 'wh' }) {
  const n = N(dur), x = new Float32Array(n), r = new Rng(`whoosh:${seed}`), sv = new SVF();
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if ((i & 15) === 0) sv.set(f0 * Math.pow(f1 / f0, u), q);
    const e = u < peak ? smooth(u / peak) : Math.pow(1 - (u - peak) / (1 - peak), 2);
    x[i] = e * sv.tick(r.gauss());
  }
  return fadeTail(norm(x, 0.25));
}

/** a spark catching: a hiss of fine grains and a soft breath. Mono. */
export function ignite({ seed = 'ig', vel = 0.7 }) {
  const n = N(0.22), x = new Float32Array(n), r = new Rng(`ignite:${seed}`);
  const hp = new Biquad('hp', 4200, 0.7), lp = new Biquad('lp', 700, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const tss = (t < 0.004 ? t / 0.004 : Math.exp(-(t - 0.004) / 0.035)) * hp.tick(r.gauss()) * (r.next() < 0.3 ? 1.6 : 0.6);
    const pff = (t < 0.02 ? smooth(t / 0.02) : Math.exp(-(t - 0.02) / 0.05)) * lp.tick(r.gauss());
    x[i] = vel * (0.35 * tss + 0.5 * pff);
  }
  return fadeTail(x);
}

/** one sparkle: a short high sine grain */
export function sparkle({ f = 7000, tau = 0.04, seed = 'sp', amp = 1 }) {
  const n = N(tau * 8), x = new Float32Array(n), r = new Rng(`sparkle:${seed}`);
  const ph = r.next() * TAU, w = TAU * f / SR, na = N(0.0008);
  for (let i = 0; i < n; i++) x[i] = amp * (i < na ? i / na : 1) * Math.exp(-i / (tau * SR)) * Math.sin(ph + w * i);
  return fadeTail(x, 2);
}

/** a cloud of sparkles over `dur`: rate(u) grains per second, frequencies in [fLo, fHi], pans in [p0, p1]
 *  (pan can sweep: pan(u) function). Stereo. */
export function shimmer({ dur, rate = () => 40, fLo = 4500, fHi = 11000, pan = () => 0, spread = 0.6, seed = 'sh', amp = 0.25, tau = [0.02, 0.07] }) {
  const n = N(dur + 0.6), L = new Float32Array(n), R = new Float32Array(n), r = new Rng(`shimmer:${seed}`);
  let t = 0;
  while (t < dur) {
    const u = t / dur, rt = Math.max(0.5, rate(u));
    t += r.exp(rt);
    if (t >= dur) break;
    const f = fLo * Math.pow(fHi / fLo, r.next());
    const g = sparkle({ f, tau: tau[0] + (tau[1] - tau[0]) * r.next(), seed: `${seed}:${t.toFixed(5)}`, amp: amp * (0.4 + 0.6 * r.next()) });
    const [gl, gr] = pan2(pan(u) + r.bi() * spread);
    const o = N(t);
    for (let i = 0; i < g.length && o + i < n; i++) { L[o + i] += g[i] * gl; R[o + i] += g[i] * gr; }
  }
  return { L, R };
}

/** the glass flash: a bright burst of high noise and a few glints, stereo, ~0.6 s */
export function flash({ seed = 'fl', vel = 0.8 }) {
  const n = N(0.7), L = new Float32Array(n), R = new Float32Array(n), r = new Rng(`flash:${seed}`);
  const hl = new Biquad('hp', 6500, 0.7), hr = new Biquad('hp', 6500, 0.7), sl = new Biquad('highshelf', 11000, 0.7, -6), sr = new Biquad('highshelf', 11000, 0.7, -6);
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) / 0.11)) * vel * 0.3;
    L[i] = e * sl.tick(hl.tick(r.gauss())); R[i] = e * sr.tick(hr.tick(r.gauss()));
  }
  const g = shimmer({ dur: 0.25, rate: (u) => 90 * (1 - u), fLo: 6000, fHi: 12500, spread: 1, seed: `flash:${seed}`, amp: 0.3 * vel, tau: [0.03, 0.09] });
  for (let i = 0; i < n && i < g.L.length; i++) { L[i] += g.L[i]; R[i] += g.R[i]; }
  fadeTail(L); fadeTail(R);
  return { L, R };
}

/**
 * Page turn. kind: 'near' | 'far' | 'big'. The landing (the page settling) is at `land` seconds into
 * the returned buffer, so the score can put the landing on a cut. `lift`: seconds from the page leaving
 * to its landing, to match a turn in the picture (default 0.42, 'big' 0.75). Returns { x (mono), land }.
 */
export function pageTurn({ kind = 'near', seed = 'pg', vel = 0.8, lift: liftS = null }) {
  const big = kind === 'big', far = kind === 'far';
  const lift = liftS ?? (big ? 0.75 : 0.42), settle = big ? 0.5 : 0.25;
  const n = N(lift + settle + (big ? 0.9 : 0.15)), x = new Float32Array(n), r = new Rng(`page:${seed}`);
  // 1. lift: a soft rising rustle (the page bending off the stack)
  const bp = new Biquad('bp', big ? 1400 : 2200, 0.8);
  for (let i = 0; i < N(lift); i++) {
    const u = i / N(lift);
    x[i] += 0.3 * smooth(u) * (0.6 + 0.4 * Math.sin(Math.PI * u)) * bp.tick(r.gauss());
  }
  // 2. crackle: fibres flexing — a train of tiny resonant clicks, densest mid-turn
  const rate = big ? 110 : 70;
  let t = 0.05;
  while (t < lift + 0.08) {
    t += r.exp(rate * (0.3 + Math.sin(Math.PI * clamp(t / lift))));
    const o = N(t), f = 1800 + 3800 * r.next(), q = new Biquad('bp', f, 3), a = (0.25 + 0.5 * r.next()) * 0.7;
    for (let i = 0; i < N(0.006) && o + i < n; i++) x[o + i] += a * Math.exp(-i / N(0.0012)) * q.tick(i < 3 ? r.gauss() * 3 : 0);
  }
  // 3. landing: air pushed out under the page (low whup) and the paper's slap
  const L0 = N(lift), lp = new Biquad('lp', big ? 260 : 420, 0.9), sl = new Biquad('bp', big ? 700 : 950, 1.2);
  for (let i = 0; i < N(settle + 0.1) && L0 + i < n; i++) {
    const tt = i / SR;
    const e1 = (tt < 0.012 ? smooth(tt / 0.012) : Math.exp(-(tt - 0.012) / (big ? 0.11 : 0.06)));
    const e2 = Math.exp(-tt / 0.012);
    x[L0 + i] += 1.4 * e1 * lp.tick(r.gauss()) + 0.4 * e2 * sl.tick(r.gauss());
  }
  if (big) {
    // the amplified version: a sub whoomp under the landing
    const w = subWhoomp({ f0: 72, f1: 34, dur: 0.9, seed });
    for (let i = 0; i < w.length && L0 - N(0.03) + i < n; i++) x[L0 - N(0.03) + i] += 0.9 * w[i];
  }
  if (far) { const l1 = new Biquad('lp', 2600, 0.7), l2 = new Biquad('lp', 2600, 0.7); l1.run(x); l2.run(x); }
  for (let i = 0; i < n; i++) x[i] *= vel;
  return { x: fadeTail(x), land: lift };
}

/** ash: a brittle crumble — dense fine crackle thinning out, and a soft exhale at the start. Mono. */
export function ash({ dur = 1.0, seed = 'ash', vel = 0.7, bright = 0.5 }) {
  const n = N(dur + 0.1), x = new Float32Array(n), r = new Rng(`ash:${seed}`);
  const lp = new Biquad('lp', 500, 0.7);
  for (let i = 0; i < N(0.25); i++) { const t = i / SR; x[i] += 0.25 * (t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) / 0.07)) * lp.tick(r.gauss()); }
  let t = 0;
  while (t < dur) {
    const u = t / dur;
    t += r.exp(260 * Math.pow(1 - u, 1.6) + 12);
    const o = N(t), f = (1200 + 4200 * bright) * (0.6 + 0.8 * r.next()), q = new Biquad('bp', f, 1.4), a = (1 - 0.7 * u) * (0.2 + 0.8 * r.next() ** 2) * 0.5;
    const len = N(0.0006 + 0.0018 * r.next());
    for (let i = 0; i < N(0.008) && o + i < n; i++) x[o + i] += a * q.tick(i < len ? r.gauss() : 0);
  }
  for (let i = 0; i < n; i++) x[i] *= vel;
  return fadeTail(x);
}

/** a key on a keyboard: click, thock, bottom-out. Mono, ~80 ms. */
export function key({ seed = 'k', vel = 0.7 }) {
  const n = N(0.09), x = new Float32Array(n), r = new Rng(`key:${seed}`);
  const bp = new Biquad('bp', 3200 + 1200 * r.next(), 1.1);
  const f1 = 260 + 80 * r.next(), f2 = 1050 + 300 * r.next(), ph1 = r.next() * TAU, ph2 = r.next() * TAU;
  const bo = N(0.004 + 0.002 * r.next());
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const click = (t < 0.0015 ? 1 : Math.exp(-(t - 0.0015) / 0.0012)) * bp.tick(r.gauss());
    const thock = (t < 0.001 ? t / 0.001 : 1) * (0.5 * Math.exp(-t / 0.018) * Math.sin(ph1 + TAU * f1 * t) + 0.25 * Math.exp(-t / 0.006) * Math.sin(ph2 + TAU * f2 * t));
    const b = i >= bo ? 0.35 * Math.exp(-(i - bo) / N(0.0015)) * r.gauss() : 0;
    x[i] = vel * (0.45 * click + thock + 0.4 * b);
  }
  return fadeTail(x);
}

/** small pitched tick (numbers counting) */
export function tick({ f = 1900, seed = 't', amp = 1 }) {
  const n = N(0.05), x = new Float32Array(n), r = new Rng(`tick:${seed}`), ph = r.next() * TAU;
  const hp = new Biquad('hp', 2500, 0.7);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = amp * (Math.exp(-t / 0.007) * Math.sin(ph + TAU * f * t) * (t < 0.0005 ? t / 0.0005 : 1) + 0.3 * Math.exp(-t / 0.0007) * hp.tick(r.gauss())); }
  return fadeTail(x, 2);
}

/** a soft "pop" with a rising pitch (a number appearing) */
export function pop({ f0 = 420, f1 = 980, seed = 'p', amp = 1 }) {
  const n = N(0.16), x = new Float32Array(n), r = new Rng(`pop:${seed}`);
  let ph = r.next() * TAU;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = f0 + (f1 - f0) * (1 - Math.exp(-t / 0.018));
    ph += TAU * f / SR;
    x[i] = amp * (t < 0.002 ? t / 0.002 : 1) * Math.exp(-t / 0.035) * Math.sin(ph);
  }
  return fadeTail(x, 2);
}

/** sub whoomp: a sine gliding down with a smooth bump of an envelope */
export function subWhoomp({ f0 = 70, f1 = 36, dur = 0.7, seed = 'sw' }) {
  const n = N(dur), x = new Float32Array(n), r = new Rng(`whoomp:${seed}`);
  let ph = r.next() * TAU;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = f1 + (f0 - f1) * Math.exp(-u * 4);
    ph += TAU * f / SR;
    const e = (u < 0.06 ? smooth(u / 0.06) : 1) * Math.pow(1 - u, 2.2);
    x[i] = e * Math.sin(ph);
  }
  return fadeTail(x);
}

/** the rivers' flowing bed: pink noise through drifting band-passes, stereo, RMS ≈ 1 */
export function flowBed({ dur, seed = 'flow', centre = 1400 }) {
  const n = N(dur), L = new Float32Array(n), R = new Float32Array(n);
  for (const [ch, side] of [[L, 'L'], [R, 'R']]) {
    const r = new Rng(`flow:${seed}:${side}`), src = pink(n, r);
    const bands = [0.5, 0.8, 1.25, 2.0].map((m, k) => ({ sv: new SVF(), m, w: wobble(n, `flow:${seed}:${side}:${k}`, 0.7 + 0.4 * k), a: wobble(n, `flowa:${seed}:${side}:${k}`, 0.35 + 0.2 * k) }));
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (const b of bands) {
        if ((i & 31) === 0) b.sv.set(centre * b.m * Math.pow(1.25, b.w[i]), 5);
        v += b.sv.tick(src[i]) * (0.55 + 0.45 * b.a[i]);
      }
      ch[i] = v;
    }
  }
  const k = 1 / Math.sqrt((rmsOf(L) ** 2 + rmsOf(R) ** 2) / 2);
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return { L, R };
}


/** the lens turning: a low grinding rumble (brown noise under 140 Hz, moved by a slow grind) and sparse
 *  low creaks. Unpitched, so it never beats against the pedal. Mono, RMS ≈ 1. */
export function rumble({ dur, seed = 'rumble' }) {
  const n = N(dur), x = new Float32Array(n), r = new Rng(`rumble:${seed}`);
  const b = brown(n, r, 18), lp = new Biquad('lp', 140, 0.7), hp = new Biquad('hp', 24, 0.7);
  const grind = wobble(n, `grind:${seed}`, 0.45), slow = wobble(n, `slow:${seed}`, 2.2);
  for (let i = 0; i < n; i++) x[i] = hp.tick(lp.tick(b[i])) * (0.75 + 0.15 * grind[i] + 0.1 * slow[i]);
  let t = 0.2;
  while (t < dur) {
    t += r.exp(2.2);
    const o = N(t), q = new Biquad('bp', 180 + 260 * r.next(), 6), a = 0.15 + 0.25 * r.next();
    for (let i = 0; i < N(0.08) && o + i < n; i++) x[o + i] += a * Math.exp(-i / N(0.02)) * q.tick(i < 24 ? r.gauss() : 0);
  }
  return fadeTail(norm(x, 1));
}

/** ink spreading on the page: a breathy fizz that swells and thins, with fine wet grains. Mono. */
export function ink({ dur, seed = 'ink', vel = 0.6 }) {
  const n = N(dur + 0.2), x = new Float32Array(n), r = new Rng(`ink:${seed}`);
  const bp = new Biquad('bp', 2600, 0.8), lp = new Biquad('lp', 900, 0.7);
  const w = wobble(n, `ink:${seed}`, 0.25);
  for (let i = 0; i < n; i++) {
    const u = i / n, e = smooth(clamp(u / 0.12)) * (u > 0.8 ? Math.max(0, (1 - u) / 0.2) : 1);
    x[i] = e * (0.25 * bp.tick(r.gauss()) * (0.6 + 0.4 * w[i]) + 0.12 * lp.tick(r.gauss()));
  }
  let t = 0;
  while (t < dur) {
    t += r.exp(80);
    const o = N(t), q = new Biquad('bp', 2500 + 5000 * r.next(), 4), a = 0.18 * r.next();
    for (let i = 0; i < N(0.004) && o + i < n; i++) x[o + i] += a * q.tick(i < 2 ? r.gauss() * 3 : 0);
  }
  for (let i = 0; i < n; i++) x[i] *= vel;
  return fadeTail(x);
}

/** paper wings: a flock (or a storm of pages), each voice a train of flaps at its own rate (rate[0..1]
 *  Hz), a flap a down-stroke grain and a softer, higher up-stroke, 35–60 ms of band-passed noise.
 *  density(u) (0..1, u = time / dur) sets how many voices flap; band(u) the centre frequency. Stereo. */
export function wings({ dur, voices = 48, rate = [4, 7.5], density = () => 1, band = () => 2400, centre = 0, spread = 0.8, seed = 'wings', amp = 0.2 }) {
  const n = N(dur + 0.2), L = new Float32Array(n), R = new Float32Array(n), r = new Rng(`wings:${seed}`);
  for (let v = 0; v < voices; v++) {
    const f = rate[0] + (rate[1] - rate[0]) * r.next(), th = (v + 0.5) / voices;
    const [gl, gr] = pan2(centre + r.bi() * spread);
    let t = r.next() / f;
    while (t < dur) {
      const u = t / dur;
      if (density(u) >= th) {
        for (const [dt, a0, fm] of [[0, 1, 1], [0.45 / f, 0.45, 1.35]]) {
          const len = N(0.035 + 0.025 * r.next()), o = N(t + dt);
          const bp = new Biquad('bp', Math.min(16000, band(u) * fm * (0.85 + 0.3 * r.next())), 1.4);
          const a = amp * a0 * (0.6 + 0.4 * r.next());
          for (let i = 0; i < len && o + i < n; i++) {
            const e = Math.sin((Math.PI * i) / len) ** 2, y = a * e * bp.tick(r.gauss());
            L[o + i] += y * gl; R[o + i] += y * gr;
          }
        }
      }
      t += (1 + 0.08 * r.bi()) / f;
    }
  }
  return { L, R };
}

/** a sub bed: brown noise between hp and lp Hz (unpitched, so it never beats against the pedal), moved by
 *  a slow wobble. Mono, RMS ≈ 1. The low that rises under the epigraph (30 Hz, screenplay s02). */
export function subBed({ dur, seed = 'sub', hp = 22, lp = 48 }) {
  const n = N(dur), x = new Float32Array(n), r = new Rng(`subbed:${seed}`);
  const b = brown(n, r, 12), l1 = new Biquad('lp', lp, 0.7), l2 = new Biquad('lp', lp, 0.7), h = new Biquad('hp', hp, 0.7);
  const w = wobble(n, `subw:${seed}`, 1.7);
  for (let i = 0; i < n; i++) x[i] = h.tick(l2.tick(l1.tick(b[i]))) * (0.85 + 0.15 * w[i]);
  return fadeTail(norm(x, 1));
}
