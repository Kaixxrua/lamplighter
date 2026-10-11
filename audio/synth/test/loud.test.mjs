// Checks for the meters and the limiter: EBU Tech 3341 reference cases, a cross-check against
// ffmpeg's ebur128 (measurement only), and the limiter's true-peak ceiling.
// Run: nice -n 15 node audio/synth/test/loud.test.mjs <scratch dir>
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { measure, limit, truePeak } from '../lib/loud.mjs';
import { writeWav24 } from '../lib/wav.mjs';
import { Rng } from '../lib/rng.mjs';
import { SR } from '../lib/const.mjs';

const dir = process.argv[2] || '.';
fs.mkdirSync(dir, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const sine = (sec, f, db, ph = 0) => { const n = Math.round(sec * SR), a = Math.pow(10, db / 20), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / SR + ph); return x; };
const cat = (...xs) => { const o = new Float32Array(xs.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of xs) { o.set(x, p); p += x.length; } return o; };

// Tech 3341 case 1: stereo 1 kHz at −23 dBFS → −23.0 LUFS (M, S, I)
{
  const x = sine(20, 1000, -23);
  const m = measure(x, x);
  ok(Math.abs(m.integrated + 23) < 0.05, `3341 #1 integrated ${m.integrated.toFixed(2)} (want −23.0)`);
  ok(Math.abs(m.momentaryMax + 23) < 0.05 && Math.abs(m.shortTermMax + 23) < 0.05, `3341 #1 M ${m.momentaryMax.toFixed(2)} S ${m.shortTermMax.toFixed(2)}`);
}
// Tech 3341 case 3: −36 / −23 / −36 dBFS for 10 / 60 / 10 s → I = −23.0 (relative gate)
{
  const x = cat(sine(10, 1000, -36), sine(60, 1000, -23), sine(10, 1000, -36));
  ok(Math.abs(measure(x, x).integrated + 23) < 0.1, `3341 #3 relative gate ${measure(x, x).integrated.toFixed(2)}`);
}
// Tech 3342 case 1: −20 then −30 dBFS, 20 s each → LRA 10 LU
{
  const x = cat(sine(20, 1000, -20), sine(20, 1000, -30));
  const m = measure(x, x);
  ok(Math.abs(m.lra - 10) < 0.2, `3342 #1 LRA ${m.lra.toFixed(2)} (want 10)`);
}
// true peak: a sine at fs/4 phase-shifted 45° has samples at 0.707 of its peak
{
  const x = sine(1, 12000, -6, Math.PI / 4);
  const sp = 20 * Math.log10(Math.max(...x.map(Math.abs)));
  const tp = 20 * Math.log10(truePeak(x).peak);
  ok(Math.abs(tp + 6) < 0.3, `true peak of the 12 kHz sine ${tp.toFixed(2)} dBTP (sample peak ${sp.toFixed(2)}; want −6.0)`);
}
// cross-check against ffmpeg ebur128 on a programme with gaps, bursts and a pink-ish bed
{
  const r = new Rng('loudtest');
  const n = 40 * SR, L = new Float32Array(n), R = new Float32Array(n);
  let b = 0;
  for (let i = 0; i < n; i++) {
    b = 0.995 * b + 0.1 * r.gauss();
    const t = i / SR;
    const env = t < 5 ? 0.02 : t < 15 ? 0.15 : t < 18 ? 0 : t < 30 ? 0.3 * (0.5 + 0.5 * Math.sin(t)) : 0.05;
    L[i] = 0.5 * env * (b + 0.3 * Math.sin(2 * Math.PI * 220 * t));
    R[i] = 0.5 * env * (0.7 * b + 0.4 * r.gauss() * 0.3 + 0.3 * Math.sin(2 * Math.PI * 330 * t));
  }
  const m = measure(L, R);
  const f = path.join(dir, 'loudtest.wav');
  writeWav24(f, L, R);
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i '${f}' -af ebur128=peak=true -f null - 2>&1`], { encoding: 'utf8' });
  const I = +/I:\s+(-?[\d.]+) LUFS/.exec(log.slice(log.lastIndexOf('Summary')))[1];
  const LRA = +/LRA:\s+(-?[\d.]+) LU/.exec(log.slice(log.lastIndexOf('Summary')))[1];
  const TP = +/Peak:\s+(-?[\d.]+) dBFS/.exec(log.slice(log.lastIndexOf('Summary')))[1];
  console.log(`  ours   I ${m.integrated.toFixed(2)}  LRA ${m.lra.toFixed(2)}  TP ${m.truePeak.toFixed(2)}`);
  console.log(`  ffmpeg I ${I.toFixed(1)}  LRA ${LRA.toFixed(1)}  TP ${TP.toFixed(1)}`);
  ok(Math.abs(m.integrated - I) < 0.15, 'integrated agrees with ffmpeg ebur128 (±0.15)');
  ok(Math.abs(m.lra - LRA) < 0.6, 'LRA agrees with ffmpeg ebur128 (±0.6)');
  ok(Math.abs(m.truePeak - TP) < 0.3, 'true peak agrees with ffmpeg ebur128 (±0.3)');
}
// limiter: pushes a hot programme under −1 dBTP, leaves quiet parts untouched
{
  const r = new Rng('limtest');
  const n = 10 * SR, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, hot = t > 3 && t < 6 ? 1.8 : 0.3;
    L[i] = hot * (0.6 * Math.sin(2 * Math.PI * 110 * t) + 0.25 * r.gauss() * 0.3 + 0.2 * Math.sin(2 * Math.PI * 7000 * t));
    R[i] = hot * (0.6 * Math.sin(2 * Math.PI * 110 * t + 0.4) + 0.25 * r.gauss() * 0.3);
  }
  const before = L.slice(0, SR);
  const st = limit(L, R, { ceilingDb: -1 });
  const tp = 20 * Math.log10(Math.max(truePeak(L).peak, truePeak(R).peak));
  let same = true; for (let i = 0; i < SR; i++) if (L[i] !== before[i]) { same = false; break; }
  ok(tp <= -0.9, `limited true peak ${tp.toFixed(2)} dBTP (ceiling −1.0), min gain ${st.minGainDb.toFixed(1)} dB`);
  ok(same, 'quiet first second untouched');
}
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
