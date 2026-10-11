// The delivered audio, from one render: the cinema mix, the web mix and the three stems.
//
//   nice -n 15 node --no-warnings audio/synth/deliver.mjs [--render] [--final] [--in audio/out/temp_mix]
//        [--dip -1.5] [--dip-max -2] [--lift 3] [--limit-max 3] [--web -14] [--cinema -24]
//
// --render first runs the render and its QA with the default (temp mix) command, one after the other, as child
// processes: one command from the score to every delivered file.
// --final says the picture is locked: the report and the pictures are marked final, but only when the QA is
// current with no failed and no provisional cue and every check below passes; otherwise it is refused (exit 1).
//
// In: the render's stems (<in>/stems/{music,sfx,ambience}.wav, 32-bit float; their sum is what went into the temp
// mix's limiter), <in>/render.json (the timeline it was rendered on) and <in>/cuelog.json (the logged events that
// anchor the web mix's gain curve). Out, in audio/out:
//   stems/{music,sfx,ambience}.wav  each stem × g_c, the cinema master gain; 24-bit, TPDF dither from a fixed seed;
//   mix_cinema.wav                  the sum of the three stems' 24-bit samples, so the stems add up to it exactly:
//                                   −24 LUFS by that one gain, nothing else (full dynamics);
//   mix_web.wav                     the same mix through a clip-gain curve (the s15 and s44–s45 climaxes down by
//                                   --dip, s30–s34 up by --lift), then the gain to --web LUFS with at most
//                                   --limit-max dB from the true-peak limiter (ceiling −1 dBTP); 24-bit TPDF.
//                                   Short of the target at --dip, the dips deepen 0.1 dB at a time down to --dip-max;
//                                   still short, the limiter stays at its maximum and the shortfall is reported;
//   deliver/deliver.json, deliver/levels_web.png, deliver/levels_cinema.png.
// Every file is read back: format, clips, the s12 zeros, loudness and true peak by the own meter (BS.1770-4) and
// again by ffmpeg ebur128 (measurement only), and the stems against the cinema mix, sample by sample.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SR, SPF, SIL0, AIR0, FRAMES, todB } from './lib/const.mjs';
import { measure, limit } from './lib/loud.mjs';
import { quantize24, writeWav24i, readWav } from './lib/wav.mjs';
import { Canvas } from './lib/png.mjs';
import { ROOT } from './score/cuesheet.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FINAL = process.argv.includes('--final');
const P = { dip: +arg('dip', -1.5), dipMax: +arg('dip-max', -2), lift: +arg('lift', 3), limitMax: +arg('limit-max', 3), web: +arg('web', -14), cinema: +arg('cinema', -24), ceiling: -1 };
const OUT = path.join(ROOT, 'audio/out');
const REP = path.join(OUT, 'deliver');
const STEMS = ['music', 'sfx', 'ambience'];
const rel = (f) => path.relative(ROOT, f);
const t0 = Date.now();
const lap = (what) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${what}`);

// The web mix's clip gain. A ramp runs [from, to]; an end is a shot's start (timeline) or a logged event of the
// render (cuelog.json, by its exact name), plus seconds, so the ramps move with the picture and the music. Linear in
// dB, at least 0.5 s, on phrase boundaries. The one exception is the lift's way in: a step (10 ms, against a click)
// on the s29→s30 hard cut, warm to cold, where the change hides in the cut.
const CURVE = [
  { name: 's15 climax', gain: 'dip',
    in: [{ shot: 's15', s: -2 }, { shot: 's15' }], // over s14's last 2 s (its last chord, Am/C) into the cut on the motif
    out: [{ shot: 's16', s: -1.5 }, { shot: 's16' }] }, // over the title chord's decay, done on the s16 cut (the ping)
  { name: 's44–s45 climax', gain: 'dip',
    in: [{ event: 's44 taiko, beat 8' }, { event: 's44 taiko, beat 10' }], // over the Bm chord, done as the build starts (beat 10, A)
    out: [{ event: 's45 the tutti stops' }, { event: 's45 the tutti stops', s: 1 }] }, // into the hall tail as the tutti stops
  { name: 's30–s34 lift', gain: 'lift', step: true,
    in: [{ shot: 's30' }, { shot: 's30', s: 0.01 }], // on the hard cut
    out: [{ shot: 's35', s: -1 }, { shot: 's35' }] }, // over s34's last second (the held F♯sus4(7)), done on the s35 cut
];

// ------------------------------------------------------------------------------------------ render (optional)
if (process.argv.includes('--render')) {
  if (arg('in', null)) throw new Error('--render renders the temp mix and delivers from it; it takes no --in');
  const run = (script, a) => {
    lap(`running ${script} ${a.join(' ')}`);
    const r = spawnSync(process.execPath, ['--no-warnings', script, ...a], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${script} failed (${r.status ?? r.signal})`);
  };
  run('audio/synth/render.mjs', ['--out', 'audio/out', '--name', 'temp_mix.wav', '--stems', 'audio/out/temp_mix/stems', '--reports', 'audio/out/temp_mix']);
  run('audio/synth/qa.mjs', ['--dir', 'audio/out/temp_mix']);
}
const IN = path.resolve(ROOT, arg('in', 'audio/out/temp_mix'));

// ------------------------------------------------------------------------------------------ in
const rep = JSON.parse(fs.readFileSync(path.join(IN, 'render.json'), 'utf8'));
const log = JSON.parse(fs.readFileSync(path.join(IN, 'cuelog.json'), 'utf8'));
if (rep.window.fromSample !== 0 || rep.window.toFrame !== FRAMES) throw new Error(`${rel(IN)} renders frames ${rep.window.fromFrame}–${rep.window.toFrame}; the deliverables need the whole film, 0–${FRAMES}`);
if (rep.sources?.rows) throw new Error(`${rel(IN)} was rendered on rehearsal rows (${rep.sources.rows}), not on the film's cue sheet`);
const n = rep.window.toSample;
const TL = JSON.parse(fs.readFileSync(path.resolve(ROOT, rep.sources?.timeline ?? 'film/timeline.json'), 'utf8'));
const shotAt = new Map(TL.shots.map((r) => [r.id, r.start * SPF]));
const qaFile = path.join(IN, 'qa/qa.json');
const qa = fs.existsSync(qaFile) ? JSON.parse(fs.readFileSync(qaFile, 'utf8')) : null;
const qaCurrent = !!qa && fs.statSync(qaFile).mtimeMs >= fs.statSync(path.join(IN, 'render.json')).mtimeMs;
const x = {};
for (const k of STEMS) {
  const w = readWav(path.resolve(ROOT, rep.files.stems, `${k}.wav`));
  if (w.n !== n || w.sr !== SR || w.channels.length !== 2) throw new Error(`${k}.wav: ${w.n} samples, ${w.sr} Hz, ${w.channels.length} ch; expected ${n}, ${SR}, 2`);
  x[k] = w.channels;
}
const xL = new Float32Array(n), xR = new Float32Array(n);
for (const k of STEMS) { const [a, b] = x[k]; for (let i = 0; i < n; i++) { xL[i] += a[i]; xR[i] += b[i]; } }
lap(`the render's stems read (${rel(IN)})`);

// ------------------------------------------------------------------------------------------ cinema and stems
const m0 = measure(xL, xR);
const gC = P.cinema - m0.integrated, kC = Math.pow(10, gC / 20);
fs.mkdirSync(path.join(OUT, 'stems'), { recursive: true });
fs.mkdirSync(REP, { recursive: true });
const cL = new Int32Array(n), cR = new Int32Array(n);
const stemClips = {};
for (const k of STEMS) {
  const q = x[k].map((src, c) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = src[i] * kC;
    return quantize24(y, `stem:${k}:${'LR'[c]}`);
  });
  writeWav24i(path.join(OUT, 'stems', `${k}.wav`), q[0].q, q[1].q);
  stemClips[k] = q[0].clips + q[1].clips;
  for (let i = 0; i < n; i++) { cL[i] += q[0].q[i]; cR[i] += q[1].q[i]; }
  x[k] = null;
}
writeWav24i(path.join(OUT, 'mix_cinema.wav'), cL, cR); // throws if the sum ever leaves 24 bits
lap(`cinema: gain ${gC.toFixed(2)} dB; stems/ and mix_cinema.wav written`);

// ------------------------------------------------------------------------------------------ web: the curve
const at = (a) => {
  if (a.shot) {
    if (!shotAt.has(a.shot)) throw new Error(`no shot ${a.shot} in the timeline`);
    return shotAt.get(a.shot) + Math.round((a.s || 0) * SR);
  }
  const hits = log.filter((e) => e.name === a.event);
  if (hits.length !== 1) throw new Error(`event "${a.event}": ${hits.length} in cuelog.json, need exactly one`);
  return hits[0].sched + Math.round((a.s || 0) * SR);
};
const regions = CURVE.map((c) => {
  const r = { name: c.name, gain: c.gain, step: !!c.step, in: c.in.map(at), out: c.out.map(at) };
  const [a, b] = r.in, [d, e] = r.out;
  if (!(a < b && b <= d && d < e)) throw new Error(`${c.name}: ramps out of order`);
  if ((!c.step && b - a < SR / 2) || e - d < SR / 2) throw new Error(`${c.name}: a ramp shorter than 0.5 s`);
  return r;
});
[...regions].sort((p, q) => p.in[0] - q.in[0]).forEach((r, k, s) => { if (k && s[k - 1].out[1] > r.in[0]) throw new Error(`${s[k - 1].name} overlaps ${r.name}`); });
/** the curve in dB, 0 outside the regions */
function curveDb(dip) {
  const g = new Float32Array(n);
  for (const r of regions) {
    const G = r.gain === 'dip' ? dip : P.lift, [a, b] = r.in, [d, e] = r.out;
    for (let i = a; i < b; i++) g[i] = (G * (i - a)) / (b - a);
    for (let i = b; i < d; i++) g[i] = G;
    for (let i = d; i < e; i++) g[i] = (G * (e - i)) / (e - d);
  }
  return g;
}

// ------------------------------------------------------------------------------------------ web: gain and limiter
const tried = [];
function webAt(dip, last) {
  const cdb = curveDb(dip);
  const yL = new Float32Array(n), yR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const g = cdb[i] === 0 ? 1 : Math.pow(10, cdb[i] / 20); yL[i] = xL[i] * g; yR[i] = xR[i] * g; }
  const my = measure(yL, yR);
  // the limiter's largest reduction is the true peak going in minus the ceiling: cap the gain so it is ≤ limitMax
  const gPeak = P.ceiling + P.limitMax - my.truePeak - 0.005;
  let g = P.web - my.integrated;
  if (g > gPeak && !last) { tried.push({ dipDb: dip, gainNeededDb: +g.toFixed(2), gainAllowedDb: +gPeak.toFixed(2), reachesTarget: false }); return null; } // the limiter only takes loudness away: short already
  let ok = false, zL, zR, lim, mz;
  for (let it = 0; it < 8; it++) {
    const cap = g >= gPeak;
    if (cap) g = gPeak;
    const k = Math.pow(10, g / 20);
    zL = new Float32Array(n); zR = new Float32Array(n);
    for (let i = 0; i < n; i++) { zL[i] = yL[i] * k; zR[i] = yR[i] * k; }
    lim = limit(zL, zR, { ceilingDb: P.ceiling, trace: true });
    mz = measure(zL, zR);
    const err = P.web - mz.integrated;
    if (Math.abs(err) < 0.005) { ok = true; break; }
    if (cap && err > 0) break; // the limiter at its maximum and still short
    g += err;
  }
  tried.push({ dipDb: dip, gainDb: +g.toFixed(3), integrated: +mz.integrated.toFixed(3), limiterMaxDb: +(-lim.minGainDb).toFixed(2), reachesTarget: ok });
  return { dip, cdb, g, ok, zL, zR, lim, mz };
}
let web = null;
for (let dip = P.dip; ; dip = Math.round((dip - 0.1) * 10) / 10) {
  const last = dip <= P.dipMax + 1e-9;
  web = webAt(dip, last);
  if ((web && web.ok) || last) break;
  lap(`web: dip ${dip} dB is short of ${P.web} LUFS within ${P.limitMax} dB of limiting`);
}
const { lim } = web;
const BLK = SR / 100, gr = [];
let grMax = 0, grAt = 0;
const over = { 1: 0, 2: 0, 3: 0 };
for (let b = 0; b * BLK < n; b++) {
  let m = 1;
  for (let i = b * BLK; i < Math.min(n, (b + 1) * BLK); i++) if (lim.gain[i] < m) m = lim.gain[i];
  const d = -todB(m);
  gr.push(d === 0 ? 0 : +d.toPrecision(3));
  if (d > grMax) { grMax = d; grAt = (b * BLK) / SR; }
  for (const k of Object.keys(over)) if (d > +k) over[k] += 0.01;
}
// where the limiter works hardest, and whether that is inside a dip
const inDip = (s) => regions.find((r) => r.gain === 'dip' && s >= r.in[0] && s < r.out[1])?.name ?? null;
const hardest = [];
let outside = { db: 0, sec: null }; // the hardest limiting outside the dips (the dips only help where the peaks are)
gr.forEach((v, k) => { if (v > outside.db && !inDip(k * BLK)) outside = { db: v, sec: k / 100 }; });
for (const k of gr.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).map(([, k]) => k)) {
  if (hardest.length >= 6 || gr[k] < 0.5) break;
  if (hardest.some((h) => Math.abs(h.k - k) < 50)) continue;
  hardest.push({ k, sec: k / 100, db: gr[k], inDip: inDip(k * BLK) });
}
{
  const a = quantize24(web.zL, 'mix_web:L'), b = quantize24(web.zR, 'mix_web:R');
  writeWav24i(path.join(OUT, 'mix_web.wav'), a.q, b.q);
}
lap(`web: dip ${web.dip} dB, lift +${P.lift} dB, gain ${web.g.toFixed(2)} dB, limiter max ${grMax.toFixed(2)} dB at ${grAt.toFixed(2)} s; mix_web.wav written`);

// ------------------------------------------------------------------------------------------ read back
function ebur128(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const v = s.match(re); return v ? +v[1] : null; };
  return { integrated: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}
const FS = 8388607 / 8388608;
function readBack(file) {
  const w = readWav(file), [L, R] = w.channels;
  let clips = 0, nz = 0;
  for (let i = 0; i < w.n; i++) { if (Math.abs(L[i]) >= FS) clips++; if (Math.abs(R[i]) >= FS) clips++; }
  for (let i = SIL0; i < Math.min(w.n, AIR0); i++) if (L[i] !== 0 || R[i] !== 0) nz++;
  const m = measure(L, R), ff = ebur128(file);
  const own = { integrated: +m.integrated.toFixed(2), lra: +m.lra.toFixed(2), momentaryMax: +m.momentaryMax.toFixed(2), shortTermMax: +m.shortTermMax.toFixed(2), truePeak: +m.truePeak.toFixed(2), truePeakAt: +m.truePeakAt.toFixed(3), samplePeak: +m.samplePeak.toFixed(2) };
  return {
    report: {
      file: rel(file), format: { sr: w.sr, bits: w.bits, channels: w.channels.length, samples: w.n, ok: w.sr === SR && w.bits === 24 && w.channels.length === 2 && w.n === n },
      clips, s12NonZeroSamples: nz, own, ffmpeg: { ...ff, diffI: +(own.integrated - ff.integrated).toFixed(2), diffTP: +(own.truePeak - ff.truePeak).toFixed(2) },
    },
    L, R, m,
  };
}
const files = {};
const sumL = new Float64Array(n), sumR = new Float64Array(n);
for (const k of STEMS) {
  const r = readBack(path.join(OUT, 'stems', `${k}.wav`));
  files[`stems/${k}`] = r.report;
  for (let i = 0; i < n; i++) { sumL[i] += Math.round(r.L[i] * 8388608); sumR[i] += Math.round(r.R[i] * 8388608); }
}
const cin = readBack(path.join(OUT, 'mix_cinema.wav'));
files.mix_cinema = cin.report;
let sumDiff = 0, sumDiffAt = -1;
for (let i = 0; i < n; i++) {
  const d = Math.max(Math.abs(sumL[i] - Math.round(cin.L[i] * 8388608)), Math.abs(sumR[i] - Math.round(cin.R[i] * 8388608)));
  if (d > sumDiff) { sumDiff = d; sumDiffAt = i; }
}
lap('stems and mix_cinema.wav read back');
const wb = readBack(path.join(OUT, 'mix_web.wav'));
files.mix_web = wb.report;
lap('mix_web.wav read back');

// ------------------------------------------------------------------------------------------ pictures
const PW = 2400, ML = 74, MR = 24;
function levelsPng(file, { L, R, m, title, target, cdb = null, grs = null }) {
  const xOf = (s) => ML + (s / n) * PW;
  const hW = 180, hL = 260, hC = 110, hG = 110, gap = 28, top = 46;
  const H = top + hW + gap + hL + (cdb ? gap + hC : 0) + (grs ? gap + hG : 0) + 34;
  const cv = new Canvas(ML + PW + MR, H);
  cv.text(title, ML, 8, { size: 13 });
  for (const r of TL.shots) cv.text(r.id, Math.round(xOf(r.start * SPF)) + 3, 26, { size: 12, color: '#ffffff' });
  let y = top;
  const y0 = y + hW / 2;
  for (const [ch, col] of [[L, '#5ec8e8'], [R, '#e8b04a']]) for (let c = 0; c < PW; c++) {
    const a = Math.floor((c / PW) * n), b = Math.floor(((c + 1) / PW) * n);
    let lo = 0, hi = 0;
    for (let i = a; i < b; i++) { if (ch[i] < lo) lo = ch[i]; if (ch[i] > hi) hi = ch[i]; }
    cv.fill(ML + c, y0 - (hi * hW) / 2, ML + c + 1, y0 - (lo * hW) / 2 + 1, col, 0.55);
  }
  for (const v of [-1, -0.5, 0, 0.5, 1]) cv.hline(ML, ML + PW, Math.round(y0 - (v * hW) / 2), '#ffffff', v === 0 ? 0.25 : 0.1);
  cv.text('waveform L (cyan) R (gold)', ML + 8, y + 4, { size: 12 });
  y += hW + gap;
  const lo = -50, hi = -5, yL = (v) => y + hL * (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo));
  for (let v = lo; v <= hi; v += 5) {
    cv.hline(ML, ML + PW, Math.round(yL(v)), '#ffffff', v % 10 === 0 ? 0.14 : 0.06);
    if (v % 10 === 0) cv.text(`${v}`, ML - 9, Math.round(yL(v)) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' });
  }
  const pts = (ser) => ser.filter((p) => p.l > -70).map((p) => [ML + ((p.t * SR) / n) * PW, yL(p.l)]);
  cv.polyline(pts(m.momentary), '#7f8a99', 0.8);
  cv.polyline(pts(m.shortTerm), '#e8b04a', 1);
  cv.hline(ML, ML + PW, Math.round(yL(m.integrated)), '#7fd67a', 0.9);
  cv.hline(ML, ML + PW, Math.round(yL(target)), '#ff6b6b', 0.5);
  cv.text(`LUFS: momentary (grey), short-term (gold), integrated ${m.integrated.toFixed(2)} (green), target ${target} (red)`, ML + 8, y + 4, { size: 12 });
  const yEnd = y + hL;
  if (cdb) {
    y += hL + gap;
    const dlo = -3, dhi = 4, yC = (v) => y + hC * (1 - (v - dlo) / (dhi - dlo));
    for (let v = dlo; v <= dhi; v++) { cv.hline(ML, ML + PW, Math.round(yC(v)), '#ffffff', v === 0 ? 0.3 : 0.08); if (v % 2 === 0) cv.text(`${v > 0 ? '+' : ''}${v}`, ML - 9, Math.round(yC(v)) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' }); }
    const cp = [];
    for (let c = 0; c < PW; c++) cp.push([ML + c, yC(cdb[Math.min(n - 1, Math.floor(((c + 0.5) / PW) * n))])]);
    cv.polyline(cp, '#a8ff3e', 1);
    cv.text('clip gain, dB (web only): the climaxes down, s30-s34 up', ML + 8, y + 4, { size: 12 });
  }
  if (grs) {
    y += (cdb ? hC : hL) + gap;
    const yG = (d) => y + (Math.min(4, d) / 4) * hG;
    for (const d of [0, 1, 2, 3, 4]) { cv.hline(ML, ML + PW, Math.round(yG(d)), '#ffffff', d === P.limitMax ? 0.35 : 0.1); cv.text(d ? `-${d}` : '0', ML - 9, Math.round(yG(d)) - 7, { size: 12, anchor: 'r', color: '#9aa0aa' }); }
    for (let c = 0; c < PW; c++) {
      const a = Math.floor((c / PW) * grs.length), b = Math.max(a + 1, Math.floor(((c + 1) / PW) * grs.length));
      let d = 0; for (let k = a; k < b; k++) d = Math.max(d, grs[k]);
      if (d > 0) cv.fill(ML + c, yG(0), ML + c + 1, yG(d) + 1, '#ff6b6b', 0.85);
    }
    cv.text(`limiter gain reduction, dB (ceiling ${P.ceiling} dBTP, at most ${P.limitMax})`, ML + 8, y + hG - 18, { size: 12 });
  }
  const yB = grs ? y + hG : cdb ? y + hC : yEnd;
  for (const r of TL.shots) if (r.start > 0) cv.vdash(Math.round(xOf(r.start * SPF)), top, yB, '#ffffff', 0.3, 6, 6);
  for (let t = 0; t * SR <= n; t += 10) {
    const xx = Math.round(xOf(t * SR));
    cv.vline(xx, yB + 2, yB + (t % 30 === 0 ? 10 : 6), '#ffffff', 0.6);
    if (t % 30 === 0) cv.text(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, xx, yB + 12, { size: 11, anchor: 'c', color: '#9aa0aa' });
  }
  cv.save(file);
}
const W = files.mix_web.own, Cn = files.mix_cinema.own;
// ------------------------------------------------------------------------------------------ checks and status
const count = (v) => (Array.isArray(v) ? v.length : v ?? null);
const tpOk = Object.values(files).every((f) => f.own.truePeak <= P.ceiling);
const checks = {
  formats: Object.values(files).every((f) => f.format.ok),
  noClips: Object.values(files).every((f) => f.clips === 0) && Object.values(stemClips).every((c) => c === 0),
  s12Zeros: Object.values(files).every((f) => f.s12NonZeroSamples === 0),
  stemsSumToCinema: sumDiff === 0,
  truePeaksAtMostCeiling: tpOk,
  cinemaAtTarget: Math.abs(Cn.integrated - P.cinema) <= 0.05,
  webLimiterWithinCap: grMax <= P.limitMax + 0.01,
  ffmpegAgrees: Object.values(files).every((f) => Math.abs(f.ffmpeg.diffI) <= 0.2 && Math.abs(f.ffmpeg.diffTP) <= 0.2),
};
// final only on request (the picture locked) and only when everything holds
const qaOk = !!qa && qaCurrent && count(qa.cues?.failed) === 0 && count(qa.cues?.provisional) === 0;
const refused = FINAL ? [...(qaOk ? [] : ['the QA is not current, or has failed or provisional cues']), ...Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k)] : [];
const isFinal = FINAL && refused.length === 0;
const STATUS = isFinal ? 'final: the picture is locked; these are the delivered files'
  : FINAL ? `temporary: --final refused (${refused.join('; ')})` : 'temporary: the picture is not locked; deliver again (deliver.mjs --render --final) when it is';
const STAMP = isFinal ? 'FINAL: picture locked' : 'TEMPORARY: picture not locked';
levelsPng(path.join(REP, 'levels_web.png'), { L: wb.L, R: wb.R, m: wb.m, target: P.web, cdb: web.cdb, grs: gr,
  title: `mix_web.wav: I ${W.integrated} LUFS, LRA ${W.lra} LU, S max ${W.shortTermMax}, TP ${W.truePeak} dBTP. Climaxes ${web.dip} dB, s30-s34 +${P.lift} dB, gain ${web.g.toFixed(2)} dB, limiter max ${grMax.toFixed(2)} dB (cap ${P.limitMax}). ${STAMP}` });
levelsPng(path.join(REP, 'levels_cinema.png'), { L: cin.L, R: cin.R, m: cin.m, target: P.cinema,
  title: `mix_cinema.wav = the three stems summed: I ${Cn.integrated} LUFS, LRA ${Cn.lra} LU, S max ${Cn.shortTermMax}, TP ${Cn.truePeak} dBTP. Gain ${gC.toFixed(2)} dB, no limiter. ${STAMP}` });
lap('levels pictures');

const report = {
  status: STATUS,
  source: { render: rel(path.join(IN, 'render.json')), timeline: rep.sources?.timeline ?? 'film/timeline.json', renderedOn: fs.statSync(path.join(IN, 'render.json')).mtime.toISOString(),
    premaster: { integrated: +m0.integrated.toFixed(2), truePeak: +m0.truePeak.toFixed(2), lra: +m0.lra.toFixed(2) },
    qa: qa ? { current: qaCurrent, cuesExact: count(qa.cues?.exact), cuesFailed: count(qa.cues?.failed), cuesProvisional: count(qa.cues?.provisional) } : null },
  params: { ...P, dither: 'TPDF ±1 LSB, Rng seeds "stem:<name>:L|R" and "mix_web:L|R"; exact zeros stay zero' },
  cinema: { gainDb: +gC.toFixed(3), note: 'mix_cinema = the three stems (each × this gain, 24-bit) summed sample by sample; no limiter' },
  stems: { files: STEMS.map((k) => `audio/out/stems/${k}.wav`), sumMaxDiffLsb: sumDiff, sumMaxDiffAt: sumDiffAt < 0 ? null : +(sumDiffAt / SR).toFixed(4) },
  web: {
    dipDb: web.dip, liftDb: P.lift, gainDb: +web.g.toFixed(3), reachesTarget: web.ok, shortfallLU: web.ok ? 0 : +(P.web - W.integrated).toFixed(2),
    limiter: { maxReductionDb: +grMax.toFixed(2), at: +grAt.toFixed(2), secondsOver: Object.fromEntries(Object.entries(over).map(([k, v]) => [`${k} dB`, +v.toFixed(2)])), hardest: hardest.map(({ sec, db, inDip: d }) => ({ sec, db, inDip: d })), maxOutsideDips: outside },
    curve: regions.map((r) => ({ name: r.name, gainDb: r.gain === 'dip' ? web.dip : P.lift, in: r.in.map((s) => +(s / SR).toFixed(3)), out: r.out.map((s) => +(s / SR).toFixed(3)), step: r.step })),
    tried,
  },
  files, checks,
  pictures: ['audio/out/deliver/levels_web.png', 'audio/out/deliver/levels_cinema.png'],
  seconds: +((Date.now() - t0) / 1000).toFixed(1),
};
fs.writeFileSync(path.join(REP, 'deliver.json'), JSON.stringify(report, null, 1));
const bad = [...Object.entries(checks).filter(([, v]) => !v).map(([k]) => k), ...(FINAL && !isFinal ? ['--final refused'] : [])];
if (bad.length) process.exitCode = 1;
console.log(JSON.stringify({ web: { I: W.integrated, LRA: W.lra, TP: W.truePeak, ffmpeg: files.mix_web.ffmpeg, dip: web.dip, lift: P.lift, limiterMax: +grMax.toFixed(2), outsideDips: outside, shortfallLU: report.web.shortfallLU },
  cinema: { I: Cn.integrated, LRA: Cn.lra, TP: Cn.truePeak, ffmpeg: files.mix_cinema.ffmpeg, gainDb: report.cinema.gainDb },
  stems: Object.fromEntries(STEMS.map((k) => [k, { I: files[`stems/${k}`].own.integrated, TP: files[`stems/${k}`].own.truePeak }])), sumMaxDiffLsb: sumDiff, failed: bad }));
lap(`written ${rel(REP)}/deliver.json${bad.length ? `; FAILED: ${bad.join(', ')}` : '; every check passed'} (${STATUS.split(':')[0]})`);
