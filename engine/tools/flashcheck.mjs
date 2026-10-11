#!/usr/bin/env node
// Photosensitivity self-check for fast cutting, after ITU-R BT.1702 and WCAG 2.3.1 (general and red
// flash). Reads one or more videos in order, as one stream (so a cut between shots is checked too), and
// follows every pixel's luminance: a transition is a swing of 20 cd/m² or more against the pixel's last
// turn, the darker side under 160 cd/m² (WCAG's 10 % and 0.8 of a 200 cd/m² screen). A flash is a pair
// of opposite transitions; it counts when the pixels making their transition on the same frame cover a
// quarter of the picture or more. More than three flashes in any one second (seven such frames) fails.
// Red flashes: the same on PEAT's red scale, (R − G − B) × 320 for a saturated red (R/(R+G+B) ≥ 0.8).
//
//   node engine/tools/flashcheck.mjs renders/preview/zh/s10.mp4 renders/preview/zh/s11.mp4
//     --band 2.39   judge the picture only: the 2.39:1 band of a 16:9 frame (default: the whole frame)
//     --peak 200    screen white in cd/m²
//     --w 320       analysis width (the frame is box-filtered down to it)
//     --verbose     a line per frame: share of the picture in transition (up/down), red share
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const files = [];
const opt = { peak: 200, w: 320, band: 0, verbose: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--verbose') opt.verbose = true;
  else if (a.startsWith('--')) opt[a.slice(2)] = +argv[++i];
  else files.push(a);
}
if (!files.length) {
  console.error('usage: flashcheck.mjs VIDEO... [--band 2.39] [--peak 200] [--w 320] [--verbose]');
  process.exit(2);
}

const W = opt.w;
const H = Math.round((W * 9) / 16 / 2) * 2;
const y0 = opt.band ? Math.round((H - W / opt.band) / 2) : 0;
const y1 = H - y0;
const N = W * (y1 - y0);

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// per-pixel trackers: low and high since the last transition, and the last transition's direction
function tracker(step, dark) {
  return { lo: new Float32Array(N), hi: new Float32Array(N), last: new Int8Array(N), step, dark, init: false };
}
// feed one frame's values; returns [up, down] shares of the picture that made a transition
function feed(T, v) {
  let up = 0;
  let down = 0;
  if (!T.init) {
    T.lo.set(v);
    T.hi.set(v);
    T.init = true;
    return [0, 0];
  }
  const { lo, hi, last, step, dark } = T;
  for (let p = 0; p < N; p++) {
    const x = v[p];
    if (last[p] !== 1 && x - lo[p] >= step && lo[p] < dark) {
      last[p] = 1;
      lo[p] = hi[p] = x;
      up++;
    } else if (last[p] !== -1 && hi[p] - x >= step && x < dark) {
      last[p] = -1;
      lo[p] = hi[p] = x;
      down++;
    } else {
      if (x < lo[p]) lo[p] = x;
      if (x > hi[p]) hi[p] = x;
    }
  }
  return [up / N, down / N];
}

const gen = tracker(20, 160);
const red = tracker(20, Infinity);
const rows = []; // per frame: { file, f, up, down, red }

async function read(file) {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const size = W * H * 3;
  let buf = Buffer.alloc(0);
  let f = 0;
  const lum = new Float32Array(N);
  const rv = new Float32Array(N);
  for await (const chunk of ff.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= size) {
      let p = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < W; x++, p++) {
          const o = (y * W + x) * 3;
          const r = LIN[buf[o]];
          const g = LIN[buf[o + 1]];
          const b = LIN[buf[o + 2]];
          lum[p] = opt.peak * (0.2126 * r + 0.7152 * g + 0.0722 * b);
          const s = r + g + b;
          rv[p] = s > 0 && r / s >= 0.8 ? Math.max(0, (r - g - b) * 320) : 0;
        }
      }
      const [up, down] = feed(gen, lum);
      const [ru, rd] = feed(red, rv);
      rows.push({ file, f, up, down, red: ru + rd });
      buf = buf.subarray(size);
      f++;
    }
  }
  await new Promise((res) => ff.on('close', res));
}

for (const file of files) await read(file);

const QUARTER = 0.25;
function worst(key) {
  const hits = rows.map((r) => (key === 'red' ? r.red : r.up + r.down) >= QUARTER);
  let best = 0;
  let at = 0;
  for (let i = 0; i < rows.length; i++) {
    let n = 0;
    for (let j = i; j < Math.min(rows.length, i + 24); j++) n += hits[j];
    if (n > best) [best, at] = [n, i];
  }
  return { frames: hits.filter(Boolean).length, best, at };
}

if (opt.verbose) {
  for (const r of rows) {
    const a = r.up + r.down;
    console.log(
      `${r.file.split('/').pop()} f${String(r.f).padStart(3)}  ${(100 * a).toFixed(1).padStart(5)}%  (up ${(100 * r.up).toFixed(1)}, down ${(100 * r.down).toFixed(1)})` +
        `${r.red > 0 ? `  red ${(100 * r.red).toFixed(1)}%` : ''}${a >= QUARTER ? '  ◀' : ''}`,
    );
  }
}
const where = (i) => (rows[i] ? `${rows[i].file.split('/').pop()} f${rows[i].f}` : '-');
let peakA = 0;
let peakI = 0;
rows.forEach((r, i) => {
  if (r.up + r.down > peakA) [peakA, peakI] = [r.up + r.down, i];
});
const g = worst('gen');
const r = worst('red');
console.log(`frames ${rows.length} · picture ${W}×${y1 - y0} · screen white ${opt.peak} cd/m²`);
console.log(`largest transition: ${(100 * peakA).toFixed(1)}% of the picture at ${where(peakI)}`);
console.log(`general: ${g.frames} frames with a quarter or more in transition; most in one second ${g.best} (from ${where(g.at)}) → ${g.best > 6 ? 'FAIL' : 'pass'}`);
console.log(`red:     ${r.frames} frames with a quarter or more in transition; most in one second ${r.best} → ${r.best > 6 ? 'FAIL' : 'pass'}`);
process.exit(g.best > 6 || r.best > 6 ? 1 : 0);
