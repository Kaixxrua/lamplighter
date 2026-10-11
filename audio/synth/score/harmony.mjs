// Harmony: the chord plan of the score's sections 2–3 (global seconds: hard-coded anchors, shifted by
// −23 s when the opening was cut on 10-07; orch.mjs checks each against the cue sheet) and its four real
// parts. The plans of sections 4–5 are built from shot starts (orch.mjs shotPlan) with the same voicer.
//
// Each chord gives its bass (the pedal's 8' line) and, where the melody fixes it, its soprano; the
// alto and tenor (and a free soprano) are chosen by a small Viterbi search over every voicing in
// range, minimising motion and penalising the faults of four-part writing: parallel and contrary
// fifths and octaves, direct fifths and octaves in the outer parts on a leap, a missing third or
// seventh, a doubled leading tone, spacing wider than an octave between neighbours above the bass,
// crossing. check() reports whatever faults remain, so the render's log can show the plan is clean.
import { nn } from '../lib/const.mjs';

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const p = (...names) => names.map((n) => PC[n]);

/** chord qualities: pitch classes, which must sound, the leading tone (never doubled) */
export const QUAL = {
  'Dm': { pcs: p('D', 'F', 'A'), need: p('F') },
  'Am/C': { pcs: p('A', 'C', 'E'), need: p('A', 'C') },
  'Bb': { pcs: p('Bb', 'D', 'F'), need: p('D') },
  'Bb(VI)': { pcs: p('Bb', 'D', 'F'), need: p('D'), double3: true }, // after V: the third doubled, as a deceptive cadence wants
  'F': { pcs: p('F', 'A', 'C'), need: p('A') },
  'C/E': { pcs: p('C', 'E', 'G'), need: p('C') },
  'Gm7': { pcs: p('G', 'Bb', 'D', 'F'), need: p('Bb', 'F') },
  'A7': { pcs: p('A', 'C#', 'E', 'G'), need: p('C#', 'G'), lead: PC['C#'] },
  'G/B': { pcs: p('G', 'B', 'D'), need: p('G') },
  'C': { pcs: p('C', 'E', 'G'), need: p('E') },
  'Dm9': { pcs: p('D', 'F', 'A', 'C', 'E'), need: p('F', 'C', 'E') },
  'G/D': { pcs: p('G', 'B', 'D'), need: p('G', 'B') },
  'Fmaj7#11': { pcs: p('F', 'A', 'C', 'E'), need: p('A', 'E') }, // the ♯11 (B) is the ping's and the glass's
  'Gm': { pcs: p('G', 'Bb', 'D'), need: p('Bb') },
  'G': { pcs: p('G', 'B', 'D'), need: p('B') },
  'Em7': { pcs: p('E', 'G', 'B', 'D'), need: p('G', 'D') },
  'Asus4': { pcs: p('A', 'D', 'E'), need: p('D') },
  'A': { pcs: p('A', 'C#', 'E'), need: p('C#'), lead: PC['C#'] },
  // sections 4–5 (D major and the suspended chords of the new readers)
  'D': { pcs: p('D', 'F#', 'A'), need: p('F#') },
  'Bm': { pcs: p('B', 'D', 'F#'), need: p('D') },
  'F#m': { pcs: p('F#', 'A', 'C#'), need: p('A') },
  'Em': { pcs: p('E', 'G', 'B'), need: p('G') },
  'Gmaj7': { pcs: p('G', 'B', 'D', 'F#'), need: p('B', 'F#') },
  'Bm7': { pcs: p('B', 'D', 'F#', 'A'), need: p('D', 'A') },
  'F#m7': { pcs: p('F#', 'A', 'C#', 'E'), need: p('A', 'E') },
  'A7sus4': { pcs: p('A', 'D', 'E', 'G'), need: p('D', 'G') },
  'Bsus4': { pcs: p('B', 'E', 'F#'), need: p('E') },
  'Bsus4(7)': { pcs: p('B', 'E', 'F#', 'A'), need: p('E', 'A') },
  'Gsus2': { pcs: p('G', 'A', 'D'), need: p('A') },
  'Esus4(7)': { pcs: p('E', 'A', 'B', 'D'), need: p('A', 'D') },
  'F#sus4(7)': { pcs: p('F#', 'B', 'C#', 'E'), need: p('B', 'E') },
  'D6': { pcs: p('D', 'F#', 'A', 'B'), need: p('F#', 'B') },
};

/**
 * The plan. t: global seconds (the cue it lands on, where there is one: the score places it from the
 * cue sheet, these numbers are only the plan's reading of it). B: bass. S: fixed soprano (the motif).
 * mode: the scale in force from here (screenplay §七 and the progress notes' decision 2).
 */
export const PLAN = [
  { t: 39, q: 'Dm', B: 'D2', S: 'D5', mode: 'D aeolian', at: 's14 tutti' },
  { t: 43, q: 'Am/C', B: 'C2', S: 'E5' },
  { t: 45, q: 'Bb', B: 'Bb1', S: 'D5', at: 's15 cut — motif D' },
  { t: 46.27, q: 'F', B: 'F2', S: 'A5', at: '燃 — motif A' },
  { t: 47.12, q: 'C/E', B: 'E2', S: 'G5', at: '灯 — motif G' },
  { t: 47.53, q: 'Dm', B: 'D2', S: 'A5', at: '者 — motif A' },
  { t: 48.06, q: 'Gm7', B: 'G2', S: 'F5', at: 'LAMPLIGHTER — answer F' },
  { t: 48.42, q: 'A7', B: 'A2', S: 'E5', at: 'LAMPLIGHTER lit — E' },
  { t: 48.67, q: 'Bb(VI)', B: 'Bb2', S: 'D5', at: 'title — D, deceptive' },
  { t: 51, q: 'G/B', B: 'B2', mode: 'D dorian', at: 's16 ping: B♮ lights the mode' },
  { t: 54, q: 'C', B: 'C3' },
  { t: 55, q: 'Dm9', B: 'D3', at: 's17 rivers' },
  { t: 59, q: 'G/D', B: 'D3' },
  { t: 63, q: 'Fmaj7#11', B: 'F2', at: 's18' },
  { t: 67, q: 'Dm', B: 'D2', at: 's19 cut (CUES)' },
  { t: 69.33, q: 'Bb', B: 'Bb1', at: 's19 beam (CUES 2.33 s)' },
  { t: 69.81, q: 'Gm', B: 'G1', at: '★491 read out, to ash (CUES readings[0] 2.81 s)' },
  { t: 70.6, q: 'G', B: 'G1', at: 'the hero card crosses (CUES hero.cross 3.6 s): B♭ → B♮' },
  { t: 72, q: 'C', B: 'C2', at: 's20 cut (CUES): the book opens' },
  { t: 74, q: 'Dm', B: 'D2', at: 's21' },
  { t: 78, q: 'Em7', B: 'E2', at: 's22' },
  { t: 82, q: 'F', B: 'F2', at: 's23' },
  { t: 85, q: 'G', B: 'G2', at: 's24' },
  { t: 88, q: 'Asus4', B: 'A2', at: 's25' },
  { t: 91, q: 'A', B: 'A2', at: 's26 → D major at s27 (93)' },
];

const RANGE = { S: [nn('C4'), nn('A5')], A: [nn('G3'), nn('D5')], T: [nn('C3'), nn('G4')] };
const PERFECT = (iv) => iv === 7 || iv === 0;
const VOICE = ['S', 'A', 'T', 'B'];

/** the ranges in force for a chord: RANGE, or its own override { S: ['C4', 'D6'], … } */
const rangeOf = (ch) => {
  const r = { ...RANGE };
  for (const [k, v] of Object.entries(ch.range || {})) r[k] = v.map((x) => (typeof x === 'string' ? nn(x) : x));
  return r;
};

function candidates(ch) {
  if (ch.fix) return [ch.fix]; // a chord held over from the previous plan: its voicing is given
  const Q = QUAL[ch.q];
  if (!Q) throw new Error(`no chord quality ${ch.q}`);
  const RANGE = rangeOf(ch);
  const set = new Set(Q.pcs);
  const notes = ([lo, hi]) => { const a = []; for (let m = lo; m <= hi; m++) if (set.has(m % 12)) a.push(m); return a; };
  const B = nn(ch.B);
  const Ss = ch.S ? [nn(ch.S)] : notes(RANGE.S);
  const out = [];
  for (const s of Ss) for (const a of notes(RANGE.A)) for (const t of notes(RANGE.T)) {
    if (!(s > a && a > t && t > B)) continue;
    if (s - a > 12 || a - t > 12) continue;
    const v = [s, a, t, B];
    const present = new Set(v.map((m) => m % 12));
    if (Q.need.some((pc) => !present.has(pc))) continue;
    out.push(v);
  }
  if (!out.length) throw new Error(`no voicing for ${ch.q} at ${ch.t}`);
  return out;
}

function staticCost(v, ch) {
  const Q = QUAL[ch.q];
  let c = 0;
  const count = (pc) => v.filter((m) => m % 12 === pc).length;
  if (Q.lead != null && count(Q.lead) > 1) c += 80;
  const third = Q.pcs[1];
  if (Q.pcs.length === 3 && count(third) > 1 && !Q.double3) c += 8;
  if (Q.double3 && count(third) < 2) c += 6;
  if (!v.some((m) => m % 12 === Q.pcs[2])) c += 3; // fifth omitted
  if (Q.pcs.length === 4 && count(Q.pcs[3]) > 1) c += 20; // a doubled seventh
  c += 0.15 * Math.abs(v[1] - 67) + 0.15 * Math.abs(v[2] - 58); // inner parts near the middle of their range
  return c;
}

/** faults between two successive voicings p → q (each [S, A, T, B]) */
export function faults(p, q) {
  const out = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a0 = (((p[i] - p[j]) % 12) + 12) % 12, a1 = (((q[i] - q[j]) % 12) + 12) % 12;
    const di = q[i] - p[i], dj = q[j] - p[j];
    if (!di || !dj || !PERFECT(a1)) continue;
    const name = a1 === 7 ? 'fifths' : 'octaves';
    if (a0 === a1 && Math.sign(di) === Math.sign(dj)) out.push({ kind: `parallel ${name}`, parts: `${VOICE[i]}–${VOICE[j]}`, w: 200 });
    else if (a0 === a1) out.push({ kind: `contrary ${name}`, parts: `${VOICE[i]}–${VOICE[j]}`, w: 40 });
    else if (i === 0 && j === 3 && Math.sign(di) === Math.sign(dj) && Math.abs(di) > 2) out.push({ kind: `direct ${name}`, parts: 'S–B', w: 30 });
  }
  return out;
}

function moveCost(p, q, ch) {
  let c = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(q[i] - p[i]);
    c += d * (i === 0 && !ch.S ? 1.4 : 1);
    if (i > 0 && d > 5) c += 4; // inner leaps
  }
  for (const f of faults(p, q)) c += f.w;
  return c;
}

/** Viterbi over the plan → [{ ...chord, v: [S, A, T, B] (midi) }] */
export function voice(plan = PLAN) {
  const cand = plan.map(candidates);
  let cost = cand[0].map((v) => staticCost(v, plan[0]));
  const back = [cand[0].map(() => -1)];
  for (let k = 1; k < plan.length; k++) {
    const nc = [], nb = [];
    for (const q of cand[k]) {
      let best = Infinity, bi = -1;
      for (let j = 0; j < cand[k - 1].length; j++) {
        const c = cost[j] + moveCost(cand[k - 1][j], q, plan[k]);
        if (c < best) { best = c; bi = j; }
      }
      nc.push(best + staticCost(q, plan[k])); nb.push(bi);
    }
    cost = nc; back.push(nb);
  }
  let j = cost.indexOf(Math.min(...cost));
  const out = new Array(plan.length);
  for (let k = plan.length - 1; k >= 0; k--) { out[k] = { ...plan[k], v: cand[k][j] }; j = back[k][j]; }
  return out;
}

/** every remaining fault of a voiced plan, with ranges and spacing */
export function check(voiced) {
  const issues = [];
  voiced.forEach((ch, k) => {
    const [s, a, t, b] = ch.v;
    const RANGE = rangeOf(ch);
    if (!(s > a && a > t && t > b)) issues.push({ t: ch.t, kind: 'crossing' });
    if (s - a > 12 || a - t > 12) issues.push({ t: ch.t, kind: 'spacing' });
    for (const [i, nm] of [[0, 'S'], [1, 'A'], [2, 'T']]) if (!ch.fix && (i > 0 || !ch.S) && (ch.v[i] < RANGE[nm][0] || ch.v[i] > RANGE[nm][1])) issues.push({ t: ch.t, kind: `${nm} out of range` });
    const Q = QUAL[ch.q];
    if (Q.lead != null && ch.v.filter((m) => m % 12 === Q.lead).length > 1) issues.push({ t: ch.t, kind: 'doubled leading tone' });
    if (k > 0) for (const f of faults(voiced[k - 1].v, ch.v)) if (f.w >= 30) issues.push({ t: ch.t, kind: f.kind, parts: f.parts });
  });
  return issues;
}

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteName = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
