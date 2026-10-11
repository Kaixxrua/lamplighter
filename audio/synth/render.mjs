// Render a stretch of the score (by default the whole film) from the cue sheet.
//
//   nice -n 15 node --no-warnings audio/synth/render.mjs [--from 0] [--to <film end>] [--out audio/out/draft]
//        [--name mix.wav] [--stems <out>/stems] [--reports <out>]
//        [--target -14] [--tp-pre 1.5] [--gain <dB>] [--hall 0.7] [--room 0.5] [--cached] [--solo groups] [--timeline <json> --rows <json>]
//   e.g. the temp mix: --out audio/out --name temp_mix.wav --stems audio/out/temp_mix/stems --reports audio/out/temp_mix
//   (deliver.mjs then makes the delivered mixes and stems from that render; deliver.mjs --render runs both)
//
// The chain: the sections place every sound on its sample (score/sec*.mjs) → per stem, the hall and
// room sends go through the cathedral and chamber impulse responses (FFT overlap-add) and come back
// at fixed return levels → the music's image width follows the frame (s14) → 20 Hz high-pass → master
// gain → the cut into s12: a 3 ms fade ending on SIL0, [SIL0, AIR0) exact zero → the film's last second
// faded out (s50's ping tail; per stem) → true-peak limiter at −1 dBTP → 3 ms fade at the window's end.
//
// The master gain is the smaller of two: the gain that brings the integrated loudness to --target, and
// the gain that lets the highest true peak into the limiter at no more than --tp-pre dBTP (so the
// limiter takes at most tp-pre + 1 dB anywhere). Which one binds is reported: when it is the peak, the
// balance has peaks that stand out of the programme, and the levels (not the limiter) are what to fix.
//
// Writes <out>/<name> (24-bit with seeded TPDF dither, after the limiter), <stems>/{music,sfx,ambience}.wav (32-bit float, after
// the master gain, before the limiter: they sum to what goes into it), and in <reports>: render.json
// (levels, limiter trace, the loudest peaks and what plays there, every chord plan, timing, the files
// written), cuelog.json (each logged sync point, its cue reference and the onset measured in its stem's
// dry bus), balance.json. Before anything is placed, the film's length and the s12 silence (const.mjs)
// are checked against film/timeline.json and the cue sheet.
import fs from 'node:fs';
import path from 'node:path';
import { SR, SPF, SIL0, AIR0, SIL1, FRAMES, CUT_FADE, todB } from './lib/const.mjs';
import { Biquad, cosRamp } from './lib/dsp.mjs';
import { Convolver } from './lib/conv.mjs';
import { makeIR, CATHEDRAL, CHAMBER } from './lib/ir.mjs';
import { measure, limit } from './lib/loud.mjs';
import { writeWav24, writeWavF32 } from './lib/wav.mjs';
import { loadRows, CueSheet, ROOT } from './score/cuesheet.mjs';
import { Score } from './score/kit.mjs';
import { chordPlan } from './score/orch.mjs';
import { noteName } from './score/harmony.mjs';
import { sec1 } from './score/sec1.mjs';
import { sec2 } from './score/sec2.mjs';
import { sec3 } from './score/sec3.mjs';
import { sec4 } from './score/sec4.mjs';
import { sec5 } from './score/sec5.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
// --timeline and --rows rehearse a cut that is not in film/timeline.json yet (a shifted copy of the timeline and of the
// cue rows); render.json records them and qa.mjs then checks against the same rows. Without them: the film as it is.
const TLF = arg('timeline', 'film/timeline.json'), ROWS = arg('rows', null);
const TL = JSON.parse(fs.readFileSync(path.resolve(ROOT, TLF), 'utf8'));
if (TL.frames !== FRAMES) throw new Error(`film/timeline.json has ${TL.frames} frames, const.mjs ${FRAMES}`);
const F0 = +arg('from', 0), F1 = +arg('to', TL.frames);
const OUT = path.resolve(ROOT, arg('out', 'audio/out/draft'));
const MIX = path.join(OUT, arg('name', 'mix.wav'));
const STEMS = path.resolve(ROOT, arg('stems', path.join(OUT, 'stems')));
const REPORTS = path.resolve(ROOT, arg('reports', OUT));
const TARGET = +arg('target', -14);
const TP_PRE = +arg('tp-pre', 1.5);
const CEIL = -1;
const RET = { hall: +arg('hall', 0.7), room: +arg('room', 0.5) };
const FIXED = arg('gain', null);

const t0 = Date.now();
const lap = (what) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${what}`);

// ------------------------------------------------------------------------------------------ score
const rows = ROWS ? JSON.parse(fs.readFileSync(path.resolve(ROOT, ROWS), 'utf8')) : loadRows({ refresh: !process.argv.includes('--cached') });
const C = new CueSheet(rows);
C.cards = new Map(TL.cards.map((c) => [c.id, c]));
const w0 = F0 * SPF, w1 = F1 * SPF, n = w1 - w0;
const S = new Score({ w0, w1, cues: C });
if (arg('solo')) S.solo = new Set(arg('solo').split(','));
// the hard-coded silence of s12 (const.mjs) must sit where the cue sheet puts the shot and its air
{
  const chk = [['SIL0', SIL0, C.start('s12')], ['AIR0', AIR0, C.at('s12', 'air.t0').sample], ['SIL1', SIL1, C.end('s12')]];
  for (const [k, v, want] of chk) if (v !== want) throw new Error(`${k} = ${v} but the cue sheet puts it at ${want} (frame ${want / SPF})`);
}
const H = chordPlan(S);
const plans = [{ name: 'sections 2–3', ...H }];
sec1(S); lap('section 1 placed (s01–s10)');
sec2(S, H); lap('section 2 placed (s12–s16)');
sec3(S, H); lap('section 3 placed (s17–s26)');
plans.push(...sec4(S, H)); lap('section 3 end and section 4 placed (s27–s43)');
plans.push(...sec5(S, plans[plans.length - 1])); lap('section 5 placed (s44–s50)');
for (const P of plans) if (P.issues.length) console.error(`voice-leading issues (${P.name}):`, JSON.stringify(P.issues));

// ------------------------------------------------------------------------------------------ reverbs
const conv = { hall: new Convolver(makeIR(CATHEDRAL)), room: new Convolver(makeIR(CHAMBER)) };
lap('impulse responses built');
// the cut into s12 cuts the reverb too: what is sent before SIL0 is convolved alone and its tail dropped at
// SIL0 (convolution is linear, so this is the hall stopping dead with the picture); the rest is convolved apart
const CUT = SIL0 - w0;
function reverb(bus, cv) {
  if (CUT <= 0 || CUT >= n) { const y = cv.run(bus.L, bus.R); return { L: y.L.subarray(0, n), R: y.R.subarray(0, n) }; }
  const L = new Float32Array(n), R = new Float32Array(n);
  const a = cv.run(bus.L.subarray(0, CUT), bus.R.subarray(0, CUT));
  L.set(a.L.subarray(0, CUT)); R.set(a.R.subarray(0, CUT));
  const b = cv.run(bus.L.subarray(CUT), bus.R.subarray(CUT));
  L.set(b.L.subarray(0, n - CUT), CUT); R.set(b.R.subarray(0, n - CUT), CUT);
  return { L, R };
}
const stems = {};
for (const [key, st] of Object.entries(S.stems)) {
  const L = Float32Array.from(st.dry.L), R = Float32Array.from(st.dry.R);
  for (const [send, bus] of Object.entries(st.send)) {
    let any = false;
    for (let i = 0; i < n; i += 64) if (bus.L[i] !== 0 || bus.R[i] !== 0) { any = true; break; }
    if (!any) continue;
    const y = reverb(bus, conv[send]), g = RET[send];
    for (let i = 0; i < n; i++) { L[i] += g * y.L[i]; R[i] += g * y.R[i]; }
  }
  stems[key] = { name: st.name, L, R };
  lap(`${st.name}: reverb returns in`);
}

// the music's width with the frame (s14: 2.39:1 → 16:9)
for (const w of S.width || []) {
  const { L, R } = stems[w.stem];
  const fn = (s) => (w.a0 != null && s < w.a0 ? 1 : s <= w.a ? w.from : s >= w.b ? 1 : w.from + (1 - w.from) * cosRamp((s - w.a) / (w.b - w.a)));
  for (let i = 0; i < n; i++) {
    const v = fn(w0 + i);
    if (v === 1) continue;
    const m = 0.5 * (L[i] + R[i]), sd = 0.5 * (L[i] - R[i]) * v;
    L[i] = m + sd; R[i] = m - sd;
  }
}

// 20 Hz high-pass (12 dB/oct) per stem: linear, so the stems still sum to the mix
for (const s of Object.values(stems)) for (const x of [s.L, s.R]) new Biquad('hp', 20, Math.SQRT1_2).run(x);

/** [SIL0, AIR0) exact zero, the 3 ms cut fade before SIL0 when the window has it */
function silence(L, R, fade = true) {
  const a = SIL0 - w0, b = AIR0 - w0;
  if (fade) for (let i = Math.max(0, a - CUT_FADE); i < Math.min(n, a); i++) { const g = (a - i) / CUT_FADE; L[i] *= g; R[i] *= g; }
  for (let i = Math.max(0, a); i < Math.min(n, b); i++) { L[i] = 0; R[i] = 0; }
}
for (const s of Object.values(stems)) silence(s.L, s.R);

// the film's end: s50's ping (frame 5707) is 1.2 s from the last frame, and its hall (6 s) would be cut off
// there with a click; so over the film's last second every stem (so the mix) fades out, a raised cosine that
// reaches zero on the last sample. Only when this window ends where the film does.
const TAIL = Math.round(1.0 * SR);
if (w1 === FRAMES * SPF) {
  for (const s of Object.values(stems)) for (const x of [s.L, s.R]) {
    for (let i = Math.max(0, n - TAIL); i < n; i++) x[i] *= 0.5 + 0.5 * Math.cos((Math.PI * (i - (n - TAIL) + 1)) / TAIL);
  }
}

const mixL = new Float32Array(n), mixR = new Float32Array(n);
for (const s of Object.values(stems)) for (let i = 0; i < n; i++) { mixL[i] += s.L[i]; mixR[i] += s.R[i]; }

// ------------------------------------------------------------------------------------------ gain
const pre = measure(mixL, mixR);
const gI = TARGET - pre.integrated, gTP = TP_PRE - pre.truePeak;
const G = FIXED != null ? +FIXED : Math.min(gI, gTP);
const binds = FIXED != null ? 'fixed' : gI <= gTP ? 'loudness target' : 'true peak into the limiter';
const g = Math.pow(10, G / 20);
for (const x of [mixL, mixR, ...Object.values(stems).flatMap((s) => [s.L, s.R])]) for (let i = 0; i < n; i++) x[i] *= g;
lap(`master gain ${G.toFixed(2)} dB (${binds}); before it: I ${pre.integrated.toFixed(2)} LUFS, TP ${pre.truePeak.toFixed(2)} dBTP`);

// the loudest moments going into the limiter, and what plays there
const BLK = SR / 100;
const blk = [];
for (let b = 0; b * BLK < n; b++) {
  let m = 0; const e = Math.min(n, (b + 1) * BLK);
  for (let i = b * BLK; i < e; i++) m = Math.max(m, Math.abs(mixL[i]), Math.abs(mixR[i]));
  blk.push(m);
}
const order = blk.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
const peaks = [];
for (const [v, b] of order) {
  if (peaks.length >= 12) break;
  if (peaks.some((p) => Math.abs(p.block - b) < 50)) continue;
  const s = w0 + b * BLK, sec = s / SR;
  const stemPk = {};
  for (const [k, st] of Object.entries(stems)) { let m = 0; for (let i = b * BLK; i < Math.min(n, (b + 1) * BLK); i++) m = Math.max(m, Math.abs(st.L[i]), Math.abs(st.R[i])); stemPk[k] = +todB(m).toFixed(1); }
  const near = S.log.filter((e) => e.sched >= s - 0.3 * SR && e.sched <= s + 0.02 * SR).map((e) => e.name);
  const secIdx = Math.floor((s - w0) / SR);
  const groups = [...S.energy.entries()].map(([k, E]) => [k, E[secIdx]]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, e]) => `${k} ${(10 * Math.log10(e / SR + 1e-12) + G).toFixed(1)}`);
  peaks.push({ block: b, sec: +sec.toFixed(2), samplePeakDb: +todB(v).toFixed(2), stems: stemPk, events: near, loudestGroupsThatSecond: groups });
}

// ------------------------------------------------------------------------------------------ limiter
const lim = limit(mixL, mixR, { ceilingDb: CEIL, trace: true });
const gr = [];
let grMax = 0, grAt = 0, over = { 0.5: 0, 1: 0, 2: 0, 3: 0 };
for (let b = 0; b * BLK < n; b++) {
  let m = 1; const e = Math.min(n, (b + 1) * BLK);
  for (let i = b * BLK; i < e; i++) if (lim.gain[i] < m) m = lim.gain[i];
  const d = -todB(m);
  gr.push(d === 0 ? 0 : +d.toPrecision(3)); // exactly 0 only where the limiter left every sample alone
  if (d > grMax) { grMax = d; grAt = (w0 + b * BLK) / SR; }
  for (const k of Object.keys(over)) if (d > +k) over[k] += 0.01;
}
silence(mixL, mixR, false); // the stems (so the mix) already carry the cut fade: only the exact zeros again, after the limiter
// the window's end (a cut, or the film's last sample): 3 ms fade so it does not end on a step
const FADE = Math.round(0.003 * SR);
for (const x of [mixL, mixR, ...Object.values(stems).flatMap((s) => [s.L, s.R])]) for (let i = 0; i < FADE; i++) x[n - 1 - i] *= i / FADE;
lap(`limiter: max reduction ${grMax.toFixed(2)} dB at ${grAt.toFixed(2)} s`);

// ------------------------------------------------------------------------------------------ onsets
/** onset of the event at absolute sample s in a dry bus: zero-phase band-pass, 2 ms RMS envelope,
 *  crossing of background + 25 % of the rise, walked back from the peak. Returns ms relative to s. */
function onset(bus, s, [f1, f2]) {
  const a = Math.max(w0, s - Math.round(0.3 * SR)), b = Math.min(w1, s + Math.round(0.3 * SR));
  const m = b - a, x = new Float64Array(m);
  for (let i = 0; i < m; i++) x[i] = 0.5 * (bus.L[a - w0 + i] + bus.R[a - w0 + i]);
  const pass = () => { new Biquad('hp', f1, Math.SQRT1_2).run(x); new Biquad('lp', f2, Math.SQRT1_2).run(x); };
  pass(); x.reverse(); pass(); x.reverse();
  const W = Math.round(0.001 * SR), env = new Float64Array(m);
  const P = new Float64Array(m + 1); for (let i = 0; i < m; i++) P[i + 1] = P[i] + x[i] * x[i];
  for (let i = 0; i < m; i++) { const lo = Math.max(0, i - W), hi = Math.min(m, i + W + 1); env[i] = Math.sqrt((P[hi] - P[lo]) / (hi - lo)); }
  const at = (t) => Math.max(0, Math.min(m - 1, s - a + Math.round(t * SR)));
  let bg = 0; for (let i = at(-0.25); i < at(-0.03); i++) bg += env[i]; bg /= Math.max(1, at(-0.03) - at(-0.25));
  let pk = 0, k = at(0); for (let i = at(-0.01); i < at(0.2); i++) if (env[i] > pk) { pk = env[i]; k = i; }
  const th = bg + 0.25 * (pk - bg);
  let j = k; while (j > 0 && env[j - 1] > th) j--;
  return { ms: +(((a + j - s) / SR) * 1000).toFixed(2), snrDb: +todB(pk / Math.max(bg, 1e-12)).toFixed(1) };
}
/** matched filter: where in the stem's dry bus does the logged sound's first 50 ms match best (±2 ms)?
 *  0 means the sound sits on its scheduled sample exactly. Returns { lag (samples), r0, rMax }. */
function matched(bus, sl) {
  const D = 96, x = sl.x, len = x.length, a = sl.from - w0;
  if (a - D < 0 || a + len + D > n) return null;
  let xx = 0; for (let i = 0; i < len; i++) xx += x[i] * x[i];
  if (xx === 0) return null;
  let best = -2, lag = 0, r0 = 0;
  for (let d = -D; d <= D; d++) {
    let xy = 0, yy = 0;
    for (let i = 0; i < len; i++) { const y = bus.L[a + d + i] + bus.R[a + d + i]; xy += x[i] * y; yy += y * y; }
    const r = yy > 0 ? xy / Math.sqrt(xx * yy) : 0;
    if (d === 0) r0 = r;
    if (r > best) { best = r; lag = d; }
  }
  // the sound's own side peak (2 ≤ |lag| ≤ 96): a periodic sound (a sine pip) matches itself a period away,
  // so its lag is only known modulo that period and the check cannot decide it
  let self = 0;
  for (let d = 2; d <= D; d++) {
    let xy = 0, aa = 0, bb = 0;
    for (let i = 0; i + d < len; i++) { xy += x[i] * x[i + d]; aa += x[i] * x[i]; bb += x[i + d] * x[i + d]; }
    if (aa > 0 && bb > 0) self = Math.max(self, xy / Math.sqrt(aa * bb));
  }
  return { lag, r0: +r0.toFixed(4), rMax: +best.toFixed(4), self: +self.toFixed(3) };
}
const cuelog = S.log.map((e, k) => {
  const o = { ...e, sec: +(e.sched / SR).toFixed(6), frame: +(e.sched / SPF).toFixed(4) };
  if (e.probe?.band && e.sched - 0.3 * SR >= w0 && e.sched + 0.3 * SR <= w1) o.probe = { ...e.probe, ...onset(S.stems[e.stem].dry, e.sched, e.probe.band) };
  if (!S.solo && S.slices.has(k)) { const mf = matched(S.stems[e.stem].dry, S.slices.get(k)); if (mf) o.matched = mf; }
  return o;
});
lap('onsets measured');

// ------------------------------------------------------------------------------------------ write
for (const d of [path.dirname(MIX), STEMS, REPORTS]) fs.mkdirSync(d, { recursive: true });
const post = measure(mixL, mixR);
const clips = writeWav24(MIX, mixL, mixR, { dither: path.basename(MIX) }); // TPDF, seeded by the file's name
const stemLoud = {};
for (const [k, st] of Object.entries(stems)) {
  writeWavF32(path.join(STEMS, `${st.name}.wav`), st.L, st.R);
  const m = measure(st.L, st.R);
  stemLoud[st.name] = { integrated: +m.integrated.toFixed(2), shortTermMax: +m.shortTermMax.toFixed(2), truePeak: +m.truePeak.toFixed(2) };
}
const pick = (m) => ({ integrated: +m.integrated.toFixed(2), lra: +m.lra.toFixed(2), momentaryMax: +m.momentaryMax.toFixed(2), shortTermMax: +m.shortTermMax.toFixed(2), truePeak: +m.truePeak.toFixed(2), truePeakAt: +(m.truePeakAt + w0 / SR).toFixed(3), samplePeak: +m.samplePeak.toFixed(2), dc: m.dc.map((v) => +v.toExponential(2)) });
const report = {
  window: { fromFrame: F0, toFrame: F1, fromSample: w0, toSample: w1, seconds: n / SR },
  files: { mix: path.relative(ROOT, MIX), stems: path.relative(ROOT, STEMS), reports: path.relative(ROOT, REPORTS) },
  sources: { timeline: TLF, rows: ROWS },
  returns: RET, ceilingDbTP: CEIL,
  gain: { masterDb: +G.toFixed(2), binds, forTargetDb: +gI.toFixed(2), forTpPreDb: +gTP.toFixed(2), target: TARGET, tpPre: TP_PRE },
  beforeGain: pick(pre),
  intoLimiter: { truePeak: +(pre.truePeak + G).toFixed(2), integrated: +(pre.integrated + G).toFixed(2) },
  limiter: { maxReductionDb: +grMax.toFixed(2), at: +grAt.toFixed(2), secondsOver: Object.fromEntries(Object.entries(over).map(([k, v]) => [`${k} dB`, +v.toFixed(2)])), samplesReduced: lim.reduced },
  mix: { ...pick(post), clips },
  stems: stemLoud,
  peaksIntoLimiter: peaks,
  grDbPer10ms: gr,
  chords: plans.flatMap((P) => P.V.map((c, k) => ({ plan: P.name, sec: +(P.starts[k] / SR).toFixed(4), q: c.q, notes: c.v.map(noteName) }))),
  voiceLeadingIssues: plans.flatMap((P) => P.issues.map((i) => ({ plan: P.name, ...i }))),
  seconds: +((Date.now() - t0) / 1000).toFixed(1),
  node: process.version,
};
fs.writeFileSync(path.join(REPORTS, 'render.json'), JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(REPORTS, 'cuelog.json'), JSON.stringify(cuelog, null, 1));
fs.writeFileSync(path.join(REPORTS, 'balance.json'), JSON.stringify({ note: 'dB per second of each group, dry, after the master gain', masterGainDb: G, groups: Object.fromEntries(Object.entries(S.balance()).map(([k, v]) => [k, v.map((d) => +(d + G).toFixed(1))])) }, null, 0));
lap(`written ${path.relative(ROOT, MIX)} (reports in ${path.relative(ROOT, REPORTS)}): I ${post.integrated.toFixed(2)} LUFS, TP ${post.truePeak.toFixed(2)} dBTP, clips ${clips}`);
