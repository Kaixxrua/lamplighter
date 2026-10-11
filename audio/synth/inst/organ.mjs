// The pipe organ: additive synthesis, one band-limited wavetable per pipe.
//
// Every stop is a rank of pipes with its own harmonic recipe (principal, stopped, flute, chimney flute,
// string, reed with a resonator formant, mixture with breaks). A pipe keeps its own small tuning error
// (seeded by stop and key, so the same pipe is always the same), speaks with a pitch-dependent attack
// (bass pipes are slow), a brief chiff on an upper partial, and breathes a little wind noise.
// Divisions share a wind system: the tremulant is a function of absolute time, so every pipe that
// draws on it moves together, and a big chord can make the wind sag for a moment.
// Pipes are placed on the case: C side left, C♯ side right, bass pipes in the outer towers.
import { SR, midiHz, centsRatio, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { specTable, osc, Biquad, TAU, clamp, smooth } from '../lib/dsp.mjs';

const HF = (f, from, slope = 12) => (f > from ? slope * Math.log2(f / from) : 0);
const jit = new Map();
function jitter(name, amt = 1.5) {
  if (!jit.has(name)) { const r = new Rng(`jit:${name}`); const j = new Float64Array(1025); for (let k = 0; k <= 1024; k++) j[k] = r.bi() * amt; jit.set(name, j); }
  return jit.get(name);
}

/** harmonic recipes: (stop key) → (k, f) → linear amplitude */
const RECIPES = {
  principal: (j) => (k, f) => dB(-7.5 * Math.log2(k) - 0.25 * (k - 1) + j[Math.min(k, 1024)] - HF(f, 5000)),
  contra: (j) => (k, f) => dB((k === 1 ? -14 : k === 2 ? 0 : k === 3 ? -3 : -8 - 7.5 * Math.log2(k / 4) - 0.3 * (k - 4)) + j[Math.min(k, 1024)] - HF(f, 3000)),
  stopped: (j) => (k, f) => dB((k % 2 ? -11 * Math.log2(k) - 0.4 * (k - 1) : -30 - 8 * Math.log2(k)) + j[Math.min(k, 1024)] - HF(f, 4000)),
  flute: (j) => (k, f) => dB(-14 * Math.log2(k) + j[Math.min(k, 1024)] - HF(f, 4000)),
  chimney: (j) => (k, f) => dB((k % 2 ? -12 * Math.log2(k) : -16 - 12 * Math.log2(k)) + (k === 5 ? 6 : 0) + j[Math.min(k, 1024)] - HF(f, 4000)),
  string: (j) => (k, f) => dB((k === 1 ? -2 : 0) - 4 * Math.log2(k) - 0.35 * (k - 1) + j[Math.min(k, 1024)] - HF(f, 7000)),
  reed: (j, F) => (k, f) => dB((k === 1 ? -6 : 0) - 3 * Math.log2(k) + 12 * Math.exp(-(Math.log2(f / F) ** 2) / (2 * 0.8 * 0.8)) + j[Math.min(k, 1024)] - HF(f, 6000, 18)),
};

/** The specification. mul: pitch relative to the key's 8' pitch. db: rank level. chiff: upper-partial
 *  transient. wind: breath level (dB re pipe). atk: attack scale (strings speak slowly, reeds fast). */
export const STOPS = {
  // Great
  P16: { name: 'Principal 16', mul: 0.5, recipe: 'principal', db: -5, wind: -42 },
  P8: { name: 'Principal 8', mul: 1, recipe: 'principal', db: 0, chiff: { h: 3, db: -14 }, wind: -40 },
  O4: { name: 'Octave 4', mul: 2, recipe: 'principal', db: -3, chiff: { h: 2, db: -14 }, wind: -40 },
  F2: { name: 'Fifteenth 2', mul: 4, recipe: 'principal', db: -6, wind: -40 },
  MIX: { name: 'Mixture IV', ranks: [6, 8, 12, 16], recipe: 'principal', db: -12, breakHz: 4200 },
  TR8: { name: 'Trumpet 8', mul: 1, recipe: 'reed', formant: 2000, db: -2, atk: 0.55 },
  // Swell
  B16: { name: 'Bourdon 16', mul: 0.5, recipe: 'stopped', db: -3, wind: -40 },
  RF8: { name: 'Rohrflöte 8', mul: 1, recipe: 'chimney', db: -4, chiff: { h: 2, db: -9 }, wind: -34 },
  FL4: { name: 'Flute 4', mul: 2, recipe: 'flute', db: -7, chiff: { h: 2, db: -9 }, wind: -34 },
  NZ: { name: 'Nazard 2 2/3', mul: 3, recipe: 'flute', db: -13, wind: -36 },
  FL2: { name: 'Flute 2', mul: 4, recipe: 'flute', db: -11, chiff: { h: 2, db: -10 }, wind: -34 },
  SAL: { name: 'Salicional 8', mul: 1, recipe: 'string', db: -9, atk: 1.8, wind: -44 },
  VC: { name: 'Voix céleste 8', mul: 1, recipe: 'string', db: -9, cents: 6, atk: 1.8, wind: -44 },
  // Pedal
  CB32: { name: 'Contrabass 32', mul: 0.25, recipe: 'contra', db: -6 },
  SB16: { name: 'Subbass 16', mul: 0.5, recipe: 'stopped', db: 0 },
  OB8: { name: 'Octavbass 8', mul: 1, recipe: 'principal', db: -4 },
  CH4: { name: 'Choralbass 4', mul: 2, recipe: 'principal', db: -9 },
  PO16: { name: 'Posaune 16', mul: 0.5, recipe: 'reed', formant: 900, db: -3, atk: 0.55 },
};

function rankTable(stopKey, st, f0) {
  const j = jitter(stopKey);
  const spec = st.recipe === 'reed' ? RECIPES.reed(j, st.formant) : RECIPES[st.recipe](j);
  return specTable(`organ:${stopKey}`, spec, f0, { fmax: 16000, seed: `organ:${stopKey}` });
}

/** pan of a pipe on the case: C side left, C♯ side right; bass pipes in the outer towers */
export function pipePan(midi, pedal = false) {
  const side = [0, 2, 4, 6, 8, 10].includes(((midi % 12) + 12) % 12) ? -1 : 1;
  if (pedal) return side * 0.55;
  const w = 0.12 + 0.4 * clamp(1 - (midi - 36) / 60, 0, 1);
  return side * w;
}

/** time-varying context shared by a division: tremulant and wind sag as functions of absolute seconds */
export function windSystem({ trem = null, sags = [] } = {}) {
  return {
    /** pitch ratio and amplitude factor at absolute time t */
    at(t) {
      let cents = 0, amp = 1;
      if (trem) {
        const d = trem.depth ? trem.depth(t) : 1;
        if (d > 0) {
          const ph = TAU * (trem.rate || 5.6) * t;
          amp *= 1 + 0.08 * d * Math.sin(ph);
          cents += 4 * d * Math.sin(ph - 0.6);
        }
      }
      for (const s of sags) {
        const u = t - s.t;
        if (u > 0 && u < 1.2) {
          const e = Math.exp(-u / 0.16) - Math.exp(-u / 0.015);
          cents -= s.cents * e; amp *= 1 - 0.06 * e;
        }
      }
      return [centsRatio(cents), amp];
    },
  };
}

/** One key held on a set of stops. Returns { x: Float32Array mono, at: start sample, pan }.
 *  t0, dur in absolute seconds. level: dB for the whole note. */
export function organNote({ midi, t0, dur, stops, level = 0, wind = null, pedal = false, release = 1, attack = 1 }) {
  const f8 = midiHz(midi);
  const at = Math.round(t0 * SR);
  // longest release among the pipes decides the length
  const tauR = (f) => clamp(0.015 + 1.5 / f, 0.015, 0.08) * release;
  const tauA = (f) => clamp(0.012 + 3.2 / f, 0.012, 0.12) * attack;
  const pipes = [];
  for (const key of stops) {
    const st = STOPS[key];
    if (!st) throw new Error(`no stop ${key}`);
    const muls = st.ranks ? st.ranks.map((m) => { let mm = m; while (f8 * mm > st.breakHz) mm /= 2; return mm; }) : [st.mul];
    for (const m of muls) {
      const f = f8 * m;
      if (f > 9000 || f < 15) continue;
      const pr = new Rng(`pipe:${key}:${midi}:${m}`);
      const cents = (st.cents || 0) + pr.gauss() * 1.2;
      pipes.push({ key, st, f: f * centsRatio(cents), amp: dB(st.db + level), ta: tauA(f) * (st.atk || 1), tr: tauR(f), seed: `${key}:${midi}:${m}` });
    }
  }
  const tr = Math.max(...pipes.map((p) => p.tr));
  const n = Math.round((dur + 10 * tr) * SR) + 1;
  const x = new Float32Array(n);
  const nOn = Math.round(dur * SR);
  // shared per-note modulation buffers (wind system)
  const ratio = new Float32Array(n), wamp = new Float32Array(n);
  for (let i = 0; i < n; i += 32) {
    const [r, a] = wind ? wind.at(t0 + i / SR) : [1, 1];
    const m = Math.min(32, n - i);
    for (let j = 0; j < m; j++) { ratio[i + j] = r; wamp[i + j] = a; }
  }
  const fr = new Float32Array(n), env = new Float32Array(n);
  for (const p of pipes) {
    const table = rankTable(p.key, p.st, p.f);
    for (let i = 0; i < n; i++) fr[i] = p.f * ratio[i];
    // envelope: exponential speech with a smoothed start, exponential release, wind amplitude
    const ka = 1 / (p.ta * SR), kr = 1 / (p.tr * SR), s0 = 0.004 * SR;
    let eOff = 0;
    for (let i = 0; i < n; i++) {
      let e;
      if (i < nOn) { e = (1 - Math.exp(-i * ka)) * (i < s0 ? smooth(i / s0) : 1); eOff = e; }
      else e = eOff * Math.exp(-(i - nOn) * kr);
      env[i] = e * wamp[i] * p.amp;
    }
    const r0 = new Rng(`ph:${p.seed}:${t0}`);
    osc(table, x, 0, n, fr, env, r0.next());
    // chiff: the pipe briefly sounds an upper partial before it settles
    if (p.st.chiff) {
      const fc = p.f * p.st.chiff.h;
      if (fc < 12000) {
        const a = dB(p.st.chiff.db) * p.amp * 2.2, tc = Math.max(0.012, 0.5 * p.ta);
        const m = Math.min(n, Math.round(6 * tc * SR));
        const rn = new Rng(`chiff:${p.seed}:${t0}`);
        const bp = new Biquad('bp', fc, 6);
        let ph = rn.next() * TAU;
        for (let i = 0; i < m; i++) {
          const t = i / SR, e = (1 - Math.exp(-t / 0.002)) * Math.exp(-t / tc);
          ph += TAU * fc / SR;
          x[i] += a * e * (0.7 * Math.sin(ph) + 0.9 * bp.tick(rn.gauss()));
        }
      }
    }
    // wind: a little breath around the mouth, band-passed, following the pipe's envelope
    if (p.st.wind) {
      const fc = clamp(5 * p.f, 1200, 7000);
      const bp = new Biquad('bp', fc, 0.9);
      const a = dB(p.st.wind) * 3;
      const rn = new Rng(`wind:${p.seed}:${t0}`);
      for (let i = 0; i < n; i += 1) x[i] += a * env[i] * bp.tick(rn.gauss());
    }
  }
  return { x, at, pan: pipePan(midi, pedal) };
}

/** convenience: a chord (array of midi) on the same stops; returns array of notes */
export function organChord(midis, opts) {
  return midis.map((m) => organNote({ ...opts, midi: m }));
}
