// Struck and rung things, by modal synthesis: each mode is an exponentially decaying sinusoid
// (computed as a rotating phasor, so a thousand modes stay cheap). The striker's contact time
// rolls off the high modes. Celesta, glass, bell, taiko, and the radar ping.
import { SR, midiHz } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { Biquad, TAU, clamp, smooth } from '../lib/dsp.mjs';

/** add modes into out (mono). modes: [{ f, a, tau, ph?, glide?: { amt, tau } }]; returns out */
export function modes(out, modes, { o0 = 0, attack = 0.0006, seed = 'm' } = {}) {
  const r = new Rng(`modes:${seed}`);
  const n = out.length - o0;
  const ka = attack > 0 ? attack * SR : 0;
  for (const m of modes) {
    if (m.f >= SR * 0.45 || m.a === 0) continue;
    const len = Math.min(n, Math.round(m.tau * 9.5 * SR)); // to −82 dB
    let ph = m.ph ?? r.next() * TAU;
    const dec = Math.exp(-1 / (m.tau * SR));
    let e = m.a;
    const nf = Math.min(len, Math.round(0.003 * SR)), fs = len - nf; // the last 3 ms fade to exactly zero
    if (!m.glide) {
      const w = TAU * m.f / SR, c = Math.cos(w), s = Math.sin(w);
      let re = Math.cos(ph), im = Math.sin(ph);
      for (let i = 0; i < len; i++) {
        const a = (ka && i < ka ? smooth(i / ka) : 1) * (i >= fs ? (len - i) / nf : 1);
        out[o0 + i] += e * a * im;
        const nr = re * c - im * s; im = re * s + im * c; re = nr;
        e *= dec;
      }
    } else {
      const { amt, tau } = m.glide;
      for (let i = 0; i < len; i++) {
        const a = (ka && i < ka ? smooth(i / ka) : 1) * (i >= fs ? (len - i) / nf : 1);
        out[o0 + i] += e * a * Math.sin(ph);
        ph += TAU * m.f * (1 + amt * Math.exp(-i / (tau * SR))) / SR;
        e *= dec;
      }
    }
  }
  return out;
}

/** spectrum of a half-sine force pulse of length tc (the striker's contact): 1 at DC, first null at 1.5/tc */
const contact = (f, tc) => { const x = 2 * f * tc; return Math.abs(1 - x * x) < 1e-6 ? Math.PI / 4 : Math.abs(Math.cos((Math.PI * x) / 2) / (1 - x * x)); };

// ---------------------------------------------------------------------------------------------
/** Celesta: steel bar over a tuned wooden resonator, felt hammer. vel 0..1. */
export function celesta({ midi, vel = 0.7, seed = '', length }) {
  const f = midiHz(midi);
  const t1 = clamp(2.4 * Math.sqrt(523 / f), 0.7, 3.2);
  const tc = 0.00035 - 0.00015 * vel;
  const spec = [
    [1, 1, t1], [3.98, 0.3 + 0.25 * vel, t1 * 0.22], [2.76, 0.035, t1 * 0.28], [9.1, 0.1 * vel * vel, t1 * 0.07], [5.4, 0.03 * vel, t1 * 0.1],
  ];
  const n = Math.round((length ?? t1 * 6) * SR);
  const out = new Float32Array(n);
  modes(out, spec.map(([k, a, tau]) => ({ f: f * k, a: a * contact(f * k, tc), tau })), { seed: `cel:${seed}:${midi}`, attack: 0.0004 });
  // resonator bloom on the fundamental and the hammer's knock
  const r = new Rng(`celk:${seed}:${midi}`);
  const bp = new Biquad('bp', 1100, 1.2);
  for (let i = 0; i < Math.min(n, 0.03 * SR); i++) out[i] += 0.04 * vel * Math.exp(-i / (0.004 * SR)) * bp.tick(r.gauss());
  return scaleTo(out, 0.3 + 0.7 * vel);
}

/** glass: a struck glass ("tink"); f is the fundamental (Hz) */
export function glassTink({ f, vel = 0.6, seed = '', decay = 1 }) {
  const ratios = [[1, 1, 1.6], [2.32, 0.5, 0.9], [4.25, 0.32, 0.5], [6.63, 0.2, 0.3], [9.38, 0.1, 0.18]];
  const tau0 = decay * clamp(1.4 * Math.pow(1500 / f, 0.35), 0.25, 2.5);
  const n = Math.round(tau0 * 7 * SR);
  const out = new Float32Array(n);
  const r = new Rng(`glass:${seed}`);
  // each bending mode is a doublet (slightly broken symmetry → slow beating)
  const ms = [];
  for (const [k, a, t] of ratios) {
    const d = 1 + (0.4 + r.next()) * 0.0006;
    ms.push({ f: f * k, a: a * 0.6, tau: tau0 * t }, { f: f * k * d, a: a * 0.4, tau: tau0 * t * 0.9 });
  }
  modes(out, ms.map((m) => ({ ...m, a: m.a * contact(m.f, 0.00012 + 0.00015 * (1 - vel)) })), { seed: `gl:${seed}`, attack: 0.0002 });
  return scaleTo(out, 0.3 + 0.7 * vel);
}

/** sustained glass harmonica tone (rubbed rim): pure, slow swell, faint beating and breath */
export function glassHarmonica({ f, dur, seed = '', attack = 0.35, release = 1.2 }) {
  const n = Math.round((dur + release) * SR);
  const out = new Float32Array(n);
  const r = new Rng(`gh:${seed}`);
  const bp = new Biquad('bp', f, 9);
  const parts = [[1, 1], [1.0007, 0.45], [2.0, 0.08], [3.01, 0.025]];
  const ph = parts.map(() => r.next() * TAU);
  const trem = 3.1 + r.next();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = (t < attack ? smooth(t / attack) : 1) * (t > dur ? Math.max(0, 1 - (t - dur) / release) ** 2 : 1);
    const am = 1 + 0.06 * Math.sin(TAU * trem * t);
    let v = 0;
    for (let k = 0; k < parts.length; k++) v += parts[k][1] * Math.sin(ph[k] + TAU * f * parts[k][0] * t);
    out[i] = e * am * (0.62 * v + 0.05 * bp.tick(r.gauss()));
  }
  return out;
}

/** a church-style bell: hum, prime, tierce, quint, nominal, and upper partials. tierce 'minor' (the
 *  classic bell) or 'major' (the major-third bell: every partial of a D bell lies in D major) */
export function bell({ f, vel = 0.8, seed = '', tierce = 'minor' }) {
  const p = tierce === 'major'
    ? [[0.5, 0.6, 9], [1, 0.7, 5], [1.26, 0.45, 3.5], [1.5, 0.3, 2.5], [2, 0.6, 2.2], [2.52, 0.22, 1.4], [3.0, 0.18, 1.0], [4.0, 0.12, 0.6], [5.04, 0.07, 0.35]]
    : [[0.5, 0.6, 9], [1, 0.7, 5], [1.2, 0.5, 3.5], [1.5, 0.3, 2.5], [2, 0.6, 2.2], [2.5, 0.25, 1.4], [2.67, 0.2, 1.1], [3.01, 0.18, 0.9], [4.0, 0.12, 0.6], [5.03, 0.08, 0.35]];
  const n = Math.round(9 * 4 * SR);
  const out = new Float32Array(n);
  modes(out, p.map(([k, a, tau]) => ({ f: f * k, a: a * contact(f * k, 0.0005), tau })), { seed: `bell:${seed}` });
  return scaleTo(out, 0.3 + 0.7 * vel);
}

/** Taiko. size: 'o' (ōdaiko, deep) or 'n' (nagadō). Membrane modes with a downward pitch glide,
 *  the bachi's click and the shell's knock. */
export function taiko({ size = 'n', vel = 0.9, seed = '' }) {
  const f1 = size === 'o' ? 52 : 86;
  const T = size === 'o' ? 1.5 : 0.85;
  const r = new Rng(`taiko:${seed}`);
  const ratios = [[1, 1, 1], [1.594, 0.5, 0.5], [2.136, 0.32, 0.32], [2.296, 0.3, 0.3], [2.653, 0.18, 0.22], [2.918, 0.14, 0.2], [3.156, 0.1, 0.16], [3.501, 0.08, 0.13], [3.6, 0.07, 0.12], [4.06, 0.05, 0.1]];
  const n = Math.round(T * 7 * SR);
  const out = new Float32Array(n);
  const glide = { amt: 0.12 + 0.12 * vel, tau: 0.055 };
  modes(out, ratios.map(([k, a, t]) => ({ f: f1 * k * (1 + r.bi() * 0.004), a: a * contact(f1 * k, 0.003), tau: T * t, glide })), { seed: `tk:${seed}`, attack: 0.0015 });
  // air cavity thump: a low partial just under the fundamental, short
  modes(out, [{ f: f1 * 0.78, a: 0.6, tau: 0.09 }], { seed: `tkc:${seed}`, attack: 0.002 });
  // bachi click + shell
  const bp = new Biquad('bp', 2600, 0.9), sh = new Biquad('bp', size === 'o' ? 240 : 380, 3);
  for (let i = 0; i < Math.min(n, 0.06 * SR); i++) {
    const t = i / SR;
    out[i] += 0.25 * vel * Math.exp(-t / 0.0025) * bp.tick(r.gauss()) + 0.35 * vel * Math.exp(-t / 0.018) * sh.tick(r.gauss());
  }
  return scaleTo(out, 0.35 + 0.65 * vel);
}

/** the radar ping: a pure sine (the screenplay's 1 kHz), 4 ms attack, exponential decay */
export function ping({ f = 1000, tau = 0.35, amp = 1, attack = 0.004, length }) {
  const n = Math.round((length ?? tau * 10) * SR);
  const out = new Float32Array(n);
  const w = TAU * f / SR, na = attack * SR;
  for (let i = 0; i < n; i++) {
    const a = i < na ? 0.5 - 0.5 * Math.cos(Math.PI * i / na) : 1;
    out[i] = amp * a * Math.exp(-i / (tau * SR)) * Math.sin(w * i);
  }
  // end exactly at zero
  const nf = Math.round(0.01 * SR);
  for (let i = 0; i < nf; i++) out[n - 1 - i] *= i / nf;
  return out;
}

/** a mechanical knock (the new readers' machinery): a hard wooden block with a little metal in it, and a
 *  click. f: the block's first mode; metal 0..1 adds a ringing steel plate. */
export function knock({ f = 900, vel = 0.8, seed = '', metal = 0.3 }) {
  const n = Math.round(0.5 * SR), out = new Float32Array(n), r = new Rng(`knock:${seed}`);
  modes(out, [[1, 1, 0.045], [2.32, 0.55, 0.03], [4.25, 0.3, 0.018], [6.63, 0.15, 0.012]].map(([k, a, tau]) => ({ f: f * k * (1 + 0.01 * r.bi()), a: a * contact(f * k, 0.0004), tau })), { seed: `kw:${seed}`, attack: 0.0003 });
  if (metal > 0) modes(out, [[2.76, 0.5, 0.16], [5.40, 0.3, 0.1], [8.93, 0.2, 0.06]].map(([k, a, tau]) => ({ f: f * k, a: a * metal, tau })), { seed: `km:${seed}`, attack: 0.0003 });
  const hp = new Biquad('hp', 2500, 0.7);
  for (let i = 0; i < Math.round(0.004 * SR); i++) out[i] += 0.5 * Math.exp(-i / (0.0008 * SR)) * hp.tick(r.gauss());
  return scaleTo(out, 0.3 + 0.7 * vel);
}

/** a notification: two soft struck tones a short step apart (a marimba-like bar: fundamental, 4th mode),
 *  f1 then f2. The flood's phones and inboxes. */
export function notify({ f1, f2, gap = 0.075, vel = 0.6, seed = '' }) {
  const n = Math.round((gap + 0.9) * SR), out = new Float32Array(n);
  [[f1, 0], [f2, gap]].forEach(([f, t], k) => modes(out, [{ f, a: 1, tau: 0.22 }, { f: f * 3.93, a: 0.18, tau: 0.04 }, { f: f * 9.2, a: 0.04, tau: 0.012 }], { o0: Math.round(t * SR), attack: 0.001, seed: `nt:${seed}:${k}` }));
  return scaleTo(out, 0.3 + 0.7 * vel);
}

/** scale so the peak is `p` */
export function scaleTo(x, p) {
  let m = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; }
  if (m > 0) { const g = p / m; for (let i = 0; i < x.length; i++) x[i] *= g; }
  // trailing 3 ms fade: decays are cut at ≈ −80 dB, this makes the cut exact
  const nf = Math.min(x.length, Math.round(0.003 * SR));
  for (let i = 0; i < nf; i++) x[x.length - 1 - i] *= i / nf;
  return x;
}


