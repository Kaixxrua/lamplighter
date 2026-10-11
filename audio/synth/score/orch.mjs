// Orchestration helpers shared by the sections: where each chord of the plan lands (on a cue where
// there is one), and the organ and the choir playing a run of chords with their ties.
import { SR } from '../lib/const.mjs';
import { voice, check, PLAN, noteName } from './harmony.mjs';
import { partNotes } from './kit.mjs';

/**
 * what each chord of PLAN lands on: [shot, cue path], [shot, cue path, seconds after it, why] or
 * [shot, '@start'] (the cut onto the shot: s21–s26 export no cue at their first frame, and the montage's
 * bar lines are its cuts, each the page's turn at its height)
 */
const LANDS = [
  ['s14', 'tutti.t'], ['s14', 'tutti.t', 4, 'the bar line four beats (60 BPM) after the tutti'],
  ['s15', 'cut.t'], ['s15', 'strokes.燃[0]'], ['s15', 'strokes.灯[0]'], ['s15', 'strokes.者[0]'],
  ['s15', 'strokes.LAMPLIGHTER[0]'], ['s15', 'strokes.LAMPLIGHTER[1]'], ['s15', 'title.t'],
  ['s16', 'cut.t'], ['s16', 'pings[3]'], ['s17', 'cut.t'], ['s17', 'pings[4]'], ['s18', 'cut.t'],
  ['s19', 'cut.t'], ['s19', 'beam'], ['s19', 'readings[0].t'], ['s19', 'hero.cross'],
  ['s20', 'cut.t'], ['s21', '@start'], ['s22', '@start'], ['s23', '@start'], ['s24', '@start'], ['s25', '@start'], ['s26', '@start'],
];

/** the voiced plan placed on the cue sheet: { V, starts (samples), end, issues } (chord changes logged) */
export function chordPlan(S) {
  if (LANDS.length !== PLAN.length) throw new Error('LANDS and PLAN differ in length');
  const V = voice(PLAN);
  const starts = LANDS.map(([id, p, add, why], k) => {
    const c = p === '@start' ? S.cut(id) : S.cue(id, p, add || 0, why);
    const s = c.sample;
    if (Math.abs(s / SR - V[k].t) > 0.006) throw new Error(`chord ${V[k].q} planned at ${V[k].t} lands at ${s / SR}`);
    S.note(`chord ${V[k].q}`, s, { stem: 'music', ref: c.ref });
    return s;
  });
  // the montage's last chord holds into s27 until the sheet comes to rest on eight (s27 stop): D major there
  return { V, starts, end: S.cue('s27', 'stop').sample, issues: check(V) };
}

/**
 * A chord plan built on the cue sheet (sections 4–5): entries [{ at, q, B, S?, range?, note }], `at` a cue
 * point { sample, ref } (S.cue, S.cut or a cue-anchored Span's beat, S.beat), never a global literal. `from`
 * is the plan whose last voicing leads into this one (held fixed, so the voice leading runs on across the two
 * plans). Every change is logged with its ref. → { V, starts, end, issues } as chordPlan.
 */
export function shotPlan(S, entries, { from = null, end, name = 'plan' } = {}) {
  entries = entries.map((e) => { if (!e.at?.ref) throw new Error(`${name}: chord ${e.q} has no cue`); return { ...e, s: e.at.sample }; });
  for (let k = 1; k < entries.length; k++) if (!(entries[k].s > entries[k - 1].s)) throw new Error(`${name}: chord ${k} (${entries[k].q}) does not follow ${entries[k - 1].q}`);
  const plan = entries.map((e) => ({ ...e, t: +(e.s / SR).toFixed(4) }));
  if (from) { const L = from.V[from.V.length - 1]; plan.unshift({ q: L.q, B: noteName(L.v[3]), fix: L.v, t: -1 }); }
  const all = voice(plan);
  const issues = check(all).filter((i) => i.t !== -1);
  const V = from ? all.slice(1) : all;
  for (const e of entries) S.note(`chord ${e.q}`, e.s, { stem: 'music', ref: e.at.ref });
  if (end <= entries[entries.length - 1].s) throw new Error(`${name}: ends before its last chord`);
  return { V, starts: entries.map((e) => e.s), end, issues, name };
}

/**
 * The organ on chords k0..k1. o: { manual: { stops, level }, solo?: { stops, level } (the soprano),
 * pedal?: { stops, level }, fill (bass an octave up in the left hand), wind, env, hall, until (sample),
 * skip: [part indices not to play], attack (speech scale), release }
 */
export function organBlock(S, H, k0, k1, o) {
  const V = H.V.slice(k0, k1 + 1), st = H.starts.slice(k0, k1 + 1);
  const end = o.until ?? (H.starts[k1 + 1] ?? H.end);
  const skip = new Set(o.skip || []);
  const hall = o.hall ?? 0.55;
  for (const p of [0, 1, 2]) {
    if (skip.has(p)) continue;
    const reg = p === 0 && o.solo ? o.solo : o.manual;
    for (const nt of partNotes(V, st, end, p)) S.organ({ midi: nt.midi, s0: nt.s0, s1: nt.s1, stops: reg.stops, level: reg.level, wind: o.wind, env: o.env, hall, attack: o.attack ?? 1, release: o.release ?? 1, panScale: p === 0 && o.solo ? 0.3 : 1 });
  }
  const bass = partNotes(V, st, end, 3);
  if (o.fill) for (const nt of bass) S.organ({ midi: nt.midi + 12, s0: nt.s0, s1: nt.s1, stops: o.manual.stops, level: o.manual.level - 3, wind: o.wind, env: o.env, hall, attack: o.attack ?? 1, release: o.release ?? 1 });
  if (o.pedal) for (const nt of bass) S.organ({ midi: nt.midi, s0: nt.s0, s1: nt.s1, stops: o.pedal.stops, level: o.pedal.level, wind: o.wind, env: o.env, hall, pedal: true, attack: o.attack ?? 1, release: o.release ?? 1 });
}

/** the choir on chords k0..k1, SATB; the basses sing the bass an octave up when it is below E2.
 *  o: { vowel, dyn (number or t → 0..1), level, attack, release, until, env, parts (subset 'SATB'), hall, seed } */
export function choirBlock(S, H, k0, k1, o) {
  const V = H.V.slice(k0, k1 + 1), st = H.starts.slice(k0, k1 + 1);
  const end = o.until ?? (H.starts[k1 + 1] ?? H.end);
  const parts = o.parts || 'SATB';
  ['S', 'A', 'T', 'B'].forEach((name, p) => {
    if (!parts.includes(name)) return;
    for (const nt of partNotes(V, st, end, p)) {
      const midi = p === 3 && nt.midi < 40 ? nt.midi + 12 : nt.midi;
      const dyn = typeof o.dyn === 'function' ? o.dyn(nt.s0 / SR) : o.dyn ?? 0.6;
      S.choir({ part: name, midi, s0: nt.s0, s1: nt.s1, vowel: o.vowel || 'a', dyn, level: o.level ?? -10, attack: o.attack ?? 0.2, release: o.release ?? 0.45, scatter: o.scatter ?? 0.03, env: o.env, hall: o.hall ?? 0.6, seed: o.seed || 'ch' });
    }
  });
}

import { QUAL } from './harmony.mjs';
/** the chord in force at sample s: its index in the plan */
export function chordAt(H, s) { let k = 0; for (let i = 0; i < H.starts.length; i++) if (H.starts[i] <= s) k = i; return k; }
/** midi notes in [lo, hi] that belong to the chord at sample s (plus extra pitch classes, e.g. a ninth) */
export function tonesAt(H, s, lo, hi, extra = []) {
  const pcs = new Set([...QUAL[H.V[chordAt(H, s)].q].pcs, ...extra]);
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.has(m % 12)) out.push(m);
  return out;
}
