// QA of a rendered stretch: reads the delivered files back and checks them against the cue sheet.
//
//   nice -n 15 node --no-warnings audio/synth/qa.mjs [--dir audio/out/draft]   (the render's --reports directory)
//
// 1. format: 48 kHz, 24-bit, stereo, exactly (to − from) × 2000 samples;
// 2. loudness by the own meter (BS.1770-4 / R128: I, LRA, M/S max, true peak, sample peak, DC, clips),
//    cross-checked with ffmpeg ebur128 (measurement only);
// 3. mono: L/R correlation (whole, worst second) and the loudness lost in the mono fold-down;
// 4. [SIL0, AIR0) exact zero in the file; the first sample after it;
// 5. the stems sum to the mix wherever the limiter is idle (to the 24-bit step and its dither: ≤ 3 LSB);
// 6. every logged sync point that names a cue: its target derived again from the raw cue rows
//    ((start − offset) × 2000 + round(48000 t)) must equal the scheduled sample exactly. A ref may also be
//    a cue plus a stated offset (t + add), the cut onto a row (its first frame), a card of the timeline,
//    or beat k of a Span rebuilt from its two end refs; each is derived again the same way (cueTable lists
//    them all, by kind). Provisional points are listed apart; onsets measured in the stems are graded
//    (≤ 10 ms, ≤ 1 frame, more);
// 7. pictures from the own STFT: the mix's spectrogram with every cue, the three stems' spectrograms,
//    levels (waveform, momentary and short-term loudness, limiter reduction), zooms on cue onsets.
// Writes <dir>/qa/qa.json, the sync-point table cuetable.tsv and the PNGs next to it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { SR, SPF, SIL0, AIR0, todB } from './lib/const.mjs';
import { fft } from './lib/fft.mjs';
import { Biquad } from './lib/dsp.mjs';
import { measure, correlation } from './lib/loud.mjs';
import { readWav } from './lib/wav.mjs';
import { Canvas } from './lib/png.mjs';
import { loadRows, resolve, ROOT } from './score/cuesheet.mjs';
import { Span } from './score/tempo.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
// --dir is where the render's reports are (render.json names the mix and the stems it wrote)
const DIR = path.resolve(ROOT, arg('dir', 'audio/out/draft'));
const QA = path.join(DIR, 'qa');
fs.mkdirSync(QA, { recursive: true });
const rep = JSON.parse(fs.readFileSync(path.join(DIR, 'render.json'), 'utf8'));
const log = JSON.parse(fs.readFileSync(path.join(DIR, 'cuelog.json'), 'utf8'));
const MIXF = path.resolve(ROOT, rep.files?.mix ?? path.join(DIR, 'mix.wav'));
const STEMD = path.resolve(ROOT, rep.files?.stems ?? path.join(DIR, 'stems'));
const { fromSample: w0, toSample: w1 } = rep.window;
const n = w1 - w0;
const out = { dir: path.relative(ROOT, DIR) };
const t0 = Date.now();
const lap = (what) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${what}`);

// ------------------------------------------------------------------------------------------ 1–2
const mix = readWav(MIXF);
const [L, R] = mix.channels;
out.format = { sr: mix.sr, bits: mix.bits, channels: mix.channels.length, samples: mix.n, expected: n, ok: mix.sr === SR && mix.bits === 24 && mix.channels.length === 2 && mix.n === n };
const m = measure(L, R);
let clips = 0; const FS = 8388607 / 8388608;
for (let i = 0; i < n; i++) { if (Math.abs(L[i]) >= FS) clips++; if (Math.abs(R[i]) >= FS) clips++; }
out.loudness = { integrated: +m.integrated.toFixed(2), lra: +m.lra.toFixed(2), momentaryMax: +m.momentaryMax.toFixed(2), shortTermMax: +m.shortTermMax.toFixed(2), truePeak: +m.truePeak.toFixed(2), truePeakAt: +(m.truePeakAt + w0 / SR).toFixed(3), samplePeak: +m.samplePeak.toFixed(2), dc: m.dc.map((v) => +v.toExponential(2)), clips };
{
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', MIXF, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const x = s.match(re); return x ? +x[1] : null; };
  out.ffmpegEbur128 = { integrated: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
  out.ffmpegEbur128.diffI = +(out.loudness.integrated - out.ffmpegEbur128.integrated).toFixed(2);
  out.ffmpegEbur128.diffTP = +(out.loudness.truePeak - out.ffmpegEbur128.truePeak).toFixed(2);
}
lap('loudness');

// ------------------------------------------------------------------------------------------ 3–5
{
  const M = new Float32Array(n); for (let i = 0; i < n; i++) M[i] = 0.5 * (L[i] + R[i]);
  const mm = measure(M, M);
  let worst = 1, worstAt = 0;
  for (let s = 0; s + SR <= n; s += SR) {
    let e = 0; for (let i = s; i < s + SR; i++) e += L[i] * L[i] + R[i] * R[i];
    if (e / SR < 1e-8) continue; // silent second
    const c = correlation(L, R, s, s + SR);
    if (c < worst) { worst = c; worstAt = (w0 + s) / SR; }
  }
  out.mono = { correlation: +correlation(L, R).toFixed(3), worstSecond: { correlation: +worst.toFixed(3), at: worstAt }, monoFoldLossLU: +(mm.integrated - m.integrated).toFixed(2) };
}
{
  const a = Math.max(0, SIL0 - w0), b = Math.min(n, AIR0 - w0);
  let nz = 0; for (let i = a; i < b; i++) if (L[i] !== 0 || R[i] !== 0) nz++;
  let first = -1; for (let i = b; i < n; i++) if (L[i] !== 0 || R[i] !== 0) { first = i; break; }
  out.silence = { from: SIL0, to: AIR0, nonZeroSamples: nz, ok: nz === 0, firstSoundAfter: first < 0 ? null : { sample: w0 + first, afterAir0Ms: +(((w0 + first - AIR0) / SR) * 1000).toFixed(2) } };
}
const stems = {};
for (const f of fs.readdirSync(STEMD).filter((f) => f.endsWith('.wav'))) stems[f.replace('.wav', '')] = readWav(path.join(STEMD, f)).channels;
{
  const sumL = new Float32Array(n), sumR = new Float32Array(n);
  for (const [a, b] of Object.values(stems)) for (let i = 0; i < n; i++) { sumL[i] += a[i]; sumR[i] += b[i]; }
  let worst = 0, idle = 0;
  const gr = rep.grDbPer10ms, BLK = SR / 100;
  for (let k = 0; k < gr.length; k++) {
    if (gr[k] > 0 || (k > 0 && gr[k - 1] > 0) || (k + 1 < gr.length && gr[k + 1] > 0)) continue;
    for (let i = k * BLK; i < Math.min(n, (k + 1) * BLK); i++) { worst = Math.max(worst, Math.abs(sumL[i] - L[i]), Math.abs(sumR[i] - R[i])); idle++; }
  }
  out.stemsSum = { stems: Object.keys(stems), idleSamples: idle, maxDiff: worst, maxDiffLsb24: +(worst * 8388608).toFixed(2), ok: worst * 8388608 <= 3 }; // float32 stems summed (in another order) against the 24-bit mix: TPDF dither ±1 LSB, rounding ½, float32 sums ≲ 1
}
lap('mono, silence, stems');

// ------------------------------------------------------------------------------------------ 6
const ROWS = rep.sources && rep.sources.rows; // a rehearsal render: check against the rows it was rendered with
const rows = new Map((ROWS ? JSON.parse(fs.readFileSync(path.resolve(ROOT, ROWS), 'utf8')) : loadRows({ refresh: true })).filter((r) => r.id).map((r) => [r.id, r]));
const CARDS = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8')).cards.map((c) => [c.id, c]));
const sec3 = (x) => +x.toFixed(3);
// the target of a logged ref, derived again from the raw rows: a cue (t → (start − offset)·2000 + round(48000·(t + add)),
// add the ref's offset in seconds, if any), the cut onto a row ('@start': local t = offset / 24), a card of the timeline,
// or beat k of a Span rebuilt from its two end refs → { target, t, kind, label, why }
function derive(ref) {
  if (ref.span) {
    const { a, b, n, ...opts } = ref.span;
    const A = derive(a), B = derive(b);
    const label = `beat ${sec3(ref.k)} of ${A.label} → ${B.label} (${n} beats${opts.ratio ? `, ×${opts.ratio}` : opts.bpm0 ? `, from ${opts.bpm0} BPM` : ''})`;
    if (A.target == null || B.target == null) return { target: null, kind: 'span', label, why: `span end: ${A.why || B.why}` };
    return { target: new Span(A.target, B.target, n, opts).beat(ref.k), kind: 'span', label };
  }
  if (ref.card) {
    const c = CARDS.get(ref.card), label = `${ref.card}.${ref.what}${ref.what === 'beat' ? `[${ref.k}]` : ''}`;
    if (!c) return { target: null, kind: 'card', label, why: `no card ${ref.card}` };
    const f = ref.what === 'start' ? c.start : ref.what === 'end' ? c.end : ref.what === 'fadeOut' ? c.end - c.fadeOut : ref.what === 'beat' && c.layers[ref.k] ? c.start + (c.layers[ref.k].delay || 0) : NaN;
    return Number.isFinite(f) ? { target: f * SPF, kind: 'card', label } : { target: null, kind: 'card', label, why: `card ${label}?` };
  }
  const r = rows.get(ref.id), add = ref.add || 0;
  const label = `${ref.id}.${ref.path}${add ? ` ${add > 0 ? '+' : '−'} ${Math.abs(add)} s` : ''}`;
  const kind = ref.path === '@start' ? 'cut' : add ? 'cue+offset' : 'cue';
  if (!r) return { target: null, kind, label, why: `no shot ${ref.id}` };
  let raw = null, why = '';
  if (ref.path === '@start') raw = r.offset / 24;
  else try { raw = resolve(r.cues, ref.path); } catch (err) { why = String(err.message); }
  if (raw == null) return { target: null, kind, label, why };
  if (raw !== ref.t) return { target: null, t: raw, kind, label, why: `the cue moved: ${raw} (rendered at ${ref.t})` };
  return { target: (r.start - r.offset) * SPF + Math.round((raw + add) * SR), t: raw, kind, label };
}
const refLabel = (ref) => derive(ref).label;
const exact = [], failed = [], prov = [], loose = [], kinds = {};
for (const e of log) {
  if (e.cue) {
    const d = derive(e.cue), ok = d.target != null && d.target === e.sched;
    if (ok) kinds[d.kind] = (kinds[d.kind] || 0) + 1;
    (ok ? exact : failed).push({ name: e.name, cue: d.label, kind: d.kind, why: e.cue.why || d.why || '', t: d.t, target: d.target, sched: e.sched });
  } else if (e.prov) prov.push({ name: e.name, sec: e.sec, frame: e.frame, basis: e.prov });
  else loose.push(e.name);
}
const onsets = log.filter((e) => e.probe && e.probe.ms != null).map((e) => {
  const own = e.probe.own ?? 0, d = e.probe.ms - own;
  const status = e.probe.snrDb < 10 ? 'masked' : Math.abs(d) <= 10 ? 'ok' : Math.abs(d) <= 1000 / 24 ? 'within a frame' : 'late/early';
  return { name: e.name, stem: e.stem, cue: e.cue ? refLabel(e.cue) : e.prov ? 'provisional' : '', measuredMs: e.probe.ms, ownMs: own, offsetMs: +d.toFixed(2), snrDb: e.probe.snrDb, status };
});
const mf = log.filter((e) => e.matched);
// the matched filter only means something where the sound dominates its stem in its first 50 ms
// (r ≥ 0.95: it is ≥ 90 % of the energy there); elsewhere other sounds of the stem decide the peak
const dom = mf.filter((e) => e.matched.rMax >= 0.95);
const onTime = (e) => Math.abs(e.matched.lag) <= 1;
// a tonal sound matches itself a period away, and a louder neighbour near its pitch can pull the broad peak a few samples:
// for those the lag is not decided by this check, so they are listed apart (neither passed nor failed)
const tonal = (e) => (e.matched.self ?? 0) >= 0.8;
const row = (e) => ({ name: e.name, lag: e.matched.lag, r0: e.matched.r0, rMax: e.matched.rMax, self: e.matched.self });
out.matched = { checked: mf.length, dominant: dom.length, atZero: dom.filter((e) => e.matched.lag === 0).length, atOne: dom.filter((e) => Math.abs(e.matched.lag) === 1).length, tonalAmbiguous: dom.filter((e) => !onTime(e) && tonal(e)).map(row), off: dom.filter((e) => !onTime(e) && !tonal(e)).map(row), inconclusive: mf.length - dom.length };
out.cues = { logged: log.length, exact: exact.length, kinds, failed, provisional: prov.length, untargeted: loose };
out.cueTable = exact;
out.onsets = { summary: onsets.reduce((a, o) => ((a[o.status] = (a[o.status] || 0) + 1), a), {}), list: onsets };
out.provisional = prov;
lap(`cues: ${exact.length} exact (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}), ${failed.length} failed, ${prov.length} provisional`);

// ------------------------------------------------------------------------------------------ 7
const SHOTS = [...rows.values()].filter((r) => r.start * SPF < w1 && (r.start + r.frames) * SPF > w0).map((r) => ({ id: r.id, s: r.start * SPF }));
const STEMC = { music: '#e8b04a', sfx: '#5ec8e8', amb: '#7fd67a' };
const W = 2400, ML = 74, MR = 24;
const xOf = (s) => ML + ((s - w0) / n) * W;
const CMAP = [[0, [0, 0, 4]], [0.15, [27, 12, 65]], [0.3, [74, 12, 107]], [0.45, [120, 28, 109]], [0.6, [165, 44, 96]], [0.72, [207, 68, 70]], [0.82, [237, 105, 37]], [0.9, [251, 155, 6]], [0.96, [247, 209, 61]], [1, [252, 255, 164]]];
const cmap = (u) => { u = Math.max(0, Math.min(1, u)); let k = 1; while (k < CMAP.length - 1 && CMAP[k][0] < u) k++; const [a, ca] = CMAP[k - 1], [b, cb] = CMAP[k], f = (u - a) / (b - a); return ca.map((v, i) => v + (cb[i] - v) * f); };

/** log-frequency STFT image of mono x: NFFT 8192 Hann, one column per pixel; dB re a full-scale sine */
function stft(x, Hh, fLo = 20, fHi = 20000, dbLo = -110, dbHi = -10) {
  const N = 8192, half = N / 2, win = new Float64Array(N);
  let ws = 0; for (let i = 0; i < N; i++) { win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N); ws += win[i]; }
  const img = new Float32Array(W * Hh);
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(half + 1);
  const rowF = Array.from({ length: Hh }, (_, y) => fLo * Math.pow(fHi / fLo, 1 - (y + 0.5) / Hh));
  const rowB = rowF.map((f, y) => { const fa = fLo * Math.pow(fHi / fLo, 1 - (y + 1) / Hh), fb = fLo * Math.pow(fHi / fLo, 1 - y / Hh); return [fa * N / SR, fb * N / SR, f * N / SR]; });
  for (let c = 0; c < W; c++) {
    const centre = Math.round(((c + 0.5) / W) * n);
    re.fill(0); im.fill(0);
    for (let i = 0; i < N; i++) { const j = centre - half + i; re[i] = j >= 0 && j < n ? x[j] * win[i] : 0; }
    fft(re, im);
    for (let k = 0; k <= half; k++) mag[k] = (2 * Math.hypot(re[k], im[k])) / ws;
    for (let y = 0; y < Hh; y++) {
      const [ba, bb, bc] = rowB[y];
      let v;
      if (bb - ba < 1) { const k = Math.floor(bc), f = bc - k; v = mag[k] * (1 - f) + mag[Math.min(half, k + 1)] * f; }
      else { v = 0; for (let k = Math.ceil(ba); k <= Math.min(half, Math.floor(bb)); k++) v = Math.max(v, mag[k]); }
      img[y * W + c] = (todB(v) - dbLo) / (dbHi - dbLo);
    }
  }
  return { img, rowF };
}
function drawSpec(cv, x, top, Hh, label) {
  const { img } = stft(x, Hh);
  for (let y = 0; y < Hh; y++) for (let c = 0; c < W; c++) { const [r, g, b] = cmap(img[y * W + c]), o = ((top + y) * cv.w + ML + c) * 3; cv.rgb[o] = r; cv.rgb[o + 1] = g; cv.rgb[o + 2] = b; }
  for (const f of [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    const y = top + Hh * (1 - Math.log(f / 20) / Math.log(1000));
    cv.hline(ML - 6, ML, Math.round(y), '#9aa0aa');
    cv.hline(ML, ML + W, Math.round(y), '#ffffff', 0.08);
    cv.text(f >= 1000 ? `${f / 1000}k` : `${f}`, ML - 9, Math.round(y) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' });
  }
  for (const sh of SHOTS) if (sh.s > w0) cv.vdash(Math.round(xOf(sh.s)), top, top + Hh, '#ffffff', 0.45, 6, 6);
  if (label) cv.text(label, ML + 8, top + 6, { size: 14, color: '#ffffff' });
}
function timeAxis(cv, y) {
  for (let s = Math.ceil(w0 / SR); s * SR <= w1; s++) {
    const x = Math.round(xOf(s * SR));
    cv.vline(x, y, y + (s % 2 ? 4 : 8), '#9aa0aa');
    if (s % 2 === 0) cv.text(`${s}`, x, y + 11, { size: 12, anchor: 'c', color: '#9aa0aa' });
  }
}
function shotLabels(cv, y) { for (const sh of SHOTS) cv.text(sh.id, Math.round(xOf(Math.max(w0, sh.s))) + 4, y, { size: 13, color: '#ffffff' }); }

const mono = (a, b) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.5 * (a[i] + b[i]); return x; };
{
  // the mix, with every logged sync point above it
  const top = 96, Hh = 720, cv = new Canvas(ML + W + MR, top + Hh + 46);
  cv.text(`mix ${rep.window.fromFrame}-${rep.window.toFrame} (global ${w0 / SR}-${w1 / SR} s). STFT 8192 Hann, log frequency, dB re full-scale sine (-110 to -10). Ticks: cue-exact sync points (music gold, sfx cyan, ambience green); dim: provisional`, ML, 8, { size: 13 });
  shotLabels(cv, 32);
  for (const e of log) {
    const x = Math.round(xOf(e.sched)), c = STEMC[e.stem] || '#ffffff';
    if (e.cue) cv.vline(x, 56, 92, c, 0.95); else cv.vline(x, 74, 92, c, 0.4);
  }
  drawSpec(cv, mono(L, R), top, Hh, '');
  timeAxis(cv, top + Hh + 2);
  cv.save(path.join(QA, 'spectrogram_mix.png'));
  lap('mix spectrogram');
}
{
  // the stems, stacked, to see where each lives in frequency (and what masks what)
  const Hh = 300, gap = 22, top0 = 40, keys = ['music', 'sfx', 'ambience'].filter((k) => stems[k]);
  const cv = new Canvas(ML + W + MR, top0 + keys.length * (Hh + gap) + 30);
  cv.text('stems before the limiter (after the master gain), same scale as the mix', ML, 8, { size: 13 });
  shotLabels(cv, 24);
  keys.forEach((k, i) => drawSpec(cv, mono(...stems[k]), top0 + i * (Hh + gap), Hh, k));
  timeAxis(cv, top0 + keys.length * (Hh + gap) - gap + 2);
  cv.save(path.join(QA, 'spectrogram_stems.png'));
  lap('stem spectrograms');
}
{
  // levels: waveform, loudness, limiter
  const hW = 200, hL = 280, hG = 110, gap = 26, top = 40;
  const cv = new Canvas(ML + W + MR, top + hW + hL + hG + 3 * gap + 20);
  cv.text(`levels. I ${out.loudness.integrated} LUFS, LRA ${out.loudness.lra} LU, M max ${out.loudness.momentaryMax}, S max ${out.loudness.shortTermMax}, TP ${out.loudness.truePeak} dBTP; master gain ${rep.gain.masterDb} dB (${rep.gain.binds}); limiter max ${rep.limiter.maxReductionDb} dB`, ML, 8, { size: 13 });
  shotLabels(cv, 22);
  // waveform min/max per column
  const y0 = top + hW / 2;
  for (const [x, col] of [[L, '#5ec8e8'], [R, '#e8b04a']]) for (let c = 0; c < W; c++) {
    const a = Math.floor((c / W) * n), b = Math.floor(((c + 1) / W) * n);
    let lo = 0, hi = 0; for (let i = a; i < b; i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; }
    cv.fill(ML + c, y0 - (hi * hW) / 2, ML + c + 1, y0 - (lo * hW) / 2 + 1, col, 0.55);
  }
  for (const v of [-1, -0.5, 0, 0.5, 1]) cv.hline(ML, ML + W, Math.round(y0 - (v * hW) / 2), '#ffffff', v === 0 ? 0.25 : 0.1);
  cv.text('waveform L (cyan) R (gold)', ML + 8, top + 4, { size: 12 });
  // loudness
  const tl = top + hW + gap, lo = -50, hi = -5, yL = (v) => tl + hL * (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo));
  for (let v = lo; v <= hi; v += 5) { cv.hline(ML, ML + W, Math.round(yL(v)), '#ffffff', v % 10 === 0 ? 0.14 : 0.06); if (v % 10 === 0) cv.text(`${v}`, ML - 9, Math.round(yL(v)) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' }); }
  const pts = (ser) => ser.filter((p) => p.l > -70).map((p) => [ML + (p.t / (n / SR)) * W, yL(p.l)]);
  cv.polyline(pts(m.momentary), '#7f8a99', 0.8);
  cv.polyline(pts(m.shortTerm), '#e8b04a', 1);
  cv.hline(ML, ML + W, Math.round(yL(m.integrated)), '#7fd67a', 0.9);
  cv.hline(ML, ML + W, Math.round(yL(-14)), '#ff6b6b', 0.5);
  cv.text(`LUFS: momentary (grey), short-term (gold), integrated (green), -14 web target (red)`, ML + 8, tl + 4, { size: 12 });
  // limiter gain reduction
  const tg = tl + hL + gap, yG = (d) => tg + (Math.min(4, d) / 4) * hG;
  for (const d of [0, 1, 2, 3, 4]) { cv.hline(ML, ML + W, Math.round(yG(d)), '#ffffff', 0.1); cv.text(`-${d}`, ML - 9, Math.round(yG(d)) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' }); }
  const gr = rep.grDbPer10ms;
  for (let c = 0; c < W; c++) { const a = Math.floor((c / W) * gr.length), b = Math.max(a + 1, Math.floor(((c + 1) / W) * gr.length)); let d = 0; for (let k = a; k < b; k++) d = Math.max(d, gr[k]); if (d > 0) cv.fill(ML + c, yG(0), ML + c + 1, yG(d) + 1, '#ff6b6b', 0.9); }
  cv.text('limiter gain reduction, dB (ceiling -1 dBTP)', ML + 8, tg + hG - 18, { size: 12 });
  for (const sh of SHOTS) if (sh.s > w0) cv.vdash(Math.round(xOf(sh.s)), top, tg + hG, '#ffffff', 0.3, 6, 6);
  timeAxis(cv, tg + hG + 2);
  cv.save(path.join(QA, 'levels.png'));
  lap('levels');
}
{
  // zooms: ±200 ms around probed sync points, band envelope of the stem (dB) and the waveform
  const pick = log.filter((e) => e.probe && e.probe.ms != null);
  const chosen = [];
  for (const want of ['s13 the ping', 's14 tutti', 's14 flash 0', 's15 cut', 's15 title complete', 's16 ping 0', 's17 river github', 's18 the sheet', 's18 tag pair 0', 's19 the beam', 's20 the book opens', 's22 cut']) {
    const e = pick.find((x) => x.name.startsWith(want) && !chosen.includes(x)); if (e) chosen.push(e);
  }
  const cols = 4, pw = 600, ph = 230, gx = 24, gy = 46;
  const rowsN = Math.ceil(chosen.length / cols);
  const cv = new Canvas(cols * (pw + gx) + gx, rowsN * (ph + gy) + 40);
  cv.text('sync zooms: 400 ms around each probed point. White: scheduled sample (the cue). Lime: onset measured in the stem (background + 25 % of the rise). Gold: band envelope, dB', gx, 8, { size: 13 });
  const SK = { music: 'music', sfx: 'sfx', amb: 'ambience' };
  chosen.forEach((e, i) => {
    const px = gx + (i % cols) * (pw + gx), py = 40 + Math.floor(i / cols) * (ph + gy);
    const [a, b] = stems[SK[e.stem]];
    const s = e.sched - w0, A = Math.max(0, s - 0.2 * SR), B = Math.min(n, s + 0.2 * SR), M = B - A;
    const x = new Float64Array(M); for (let k = 0; k < M; k++) x[k] = 0.5 * (a[A + k] + b[A + k]);
    let pk = 1e-9; for (let k = 0; k < M; k++) pk = Math.max(pk, Math.abs(x[k]));
    for (let c = 0; c < pw; c++) { const k0 = Math.floor((c / pw) * M), k1 = Math.max(k0 + 1, Math.floor(((c + 1) / pw) * M)); let lo = 0, hi = 0; for (let k = k0; k < k1; k++) { lo = Math.min(lo, x[k]); hi = Math.max(hi, x[k]); } cv.fill(px + c, py + ph / 2 - (hi / pk) * (ph / 2.2), px + c + 1, py + ph / 2 - (lo / pk) * (ph / 2.2) + 1, '#5ec8e8', 0.35); }
    const y = Float64Array.from(x);
    const [f1, f2] = e.probe.band;
    const pass = () => { new Biquad('hp', f1, Math.SQRT1_2).run(y); new Biquad('lp', f2, Math.SQRT1_2).run(y); };
    pass(); y.reverse(); pass(); y.reverse();
    const Wn = Math.round(0.001 * SR), env = [];
    for (let c = 0; c < pw; c++) { const k = Math.floor(((c + 0.5) / pw) * M); let e2 = 0, cnt = 0; for (let j = Math.max(0, k - Wn); j < Math.min(M, k + Wn + 1); j++) { e2 += y[j] * y[j]; cnt++; } env.push(Math.sqrt(e2 / cnt)); }
    const epk = Math.max(...env, 1e-12);
    cv.polyline(env.map((v, c) => [px + c, py + ph - 4 - ((Math.max(-60, todB(v / epk)) + 60) / 60) * (ph - 8)]), '#e8b04a', 1);
    cv.vline(Math.round(px + ((s - A) / M) * pw), py, py + ph, '#ffffff', 0.9);
    cv.vline(Math.round(px + ((s + (e.probe.ms / 1000) * SR - A) / M) * pw), py, py + ph, '#a8ff3e', 0.9);
    cv.fill(px, py, px + pw, py + 1, '#ffffff', 0.2); cv.fill(px, py + ph, px + pw, py + ph + 1, '#ffffff', 0.2);
    cv.text(`${e.name.replace(/[^\x20-\x7e]/g, '?')}`, px, py + ph + 5, { size: 12 });
    cv.text(`onset ${e.probe.ms} ms (own ${e.probe.own ?? 0}), band ${f1}-${f2} Hz, SNR ${e.probe.snrDb} dB`, px, py + ph + 22, { size: 11, color: '#9aa0aa' });
  });
  cv.save(path.join(QA, 'cue_zooms.png'));
  lap('zooms');
}
fs.writeFileSync(path.join(QA, 'qa.json'), JSON.stringify(out, null, 1));
// the sync-point table: every logged point with its ref, derived target and scheduled sample, by global frame
{
  const shotOf = (name) => (/^(s\d\d)/.exec(name) || [])[1] || '';
  const rows = [...exact.map((e) => ({ ...e, ok: 'exact' })), ...failed.map((e) => ({ ...e, ok: 'FAILED' }))].sort((x, y) => (x.sched ?? 0) - (y.sched ?? 0));
  const tsv = ['frame\tsec\tshot\tname\tkind\tcue\ttarget\tscheduled\tstatus\twhy', ...rows.map((e) => [(e.sched / SPF).toFixed(2), (e.sched / SR).toFixed(3), shotOf(e.name), e.name, e.kind, e.cue, e.target, e.sched, e.ok, e.why || ''].join('\t'))];
  for (const e of prov) tsv.push([e.frame, e.sec, shotOf(e.name), e.name, 'provisional', '', '', '', 'PROVISIONAL', e.basis].join('\t'));
  fs.writeFileSync(path.join(QA, 'cuetable.tsv'), tsv.join('\n') + '\n');
}
console.log(JSON.stringify({ format: out.format.ok, loudness: out.loudness, ffmpeg: out.ffmpegEbur128, mono: out.mono, silence: out.silence.ok, stemsSum: out.stemsSum.ok, cues: { exact: out.cues.exact, failed: out.cues.failed.length, provisional: out.cues.provisional }, matched: { dominant: out.matched.dominant, atZero: out.matched.atZero, atOne: out.matched.atOne, tonalAmbiguous: out.matched.tonalAmbiguous.length, off: out.matched.off.length, inconclusive: out.matched.inconclusive }, onsets: out.onsets.summary }, null, 1));
