// WAV I/O. Deliverables are 48 kHz / 24-bit PCM stereo, quantised with TPDF dither (±1 LSB, triangular)
// drawn from a seeded generator, so every file comes out the same bit for bit. Exact zeros stay exact zeros:
// no dither goes into digital silence (s12 must be all zeros, and so must a stem where it has nothing to play).
import fs from 'node:fs';
import { SR } from './const.mjs';
import { Rng } from './rng.mjs';

function header(n, channels, bits, float) {
  const bytes = bits / 8;
  const data = n * channels * bytes;
  const b = Buffer.alloc(44);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(float ? 3 : 1, 20);
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * channels * bytes, 28);
  b.writeUInt16LE(channels * bytes, 32);
  b.writeUInt16LE(bits, 34);
  b.write('data', 36);
  b.writeUInt32LE(data, 40);
  return b;
}

/** 24-bit quantisation of one channel: k = round(x · 2²³ + d), d = u₁ − u₂ (TPDF, ±1 LSB) from Rng(seed), clamped
 *  to the 24-bit range; x = 0 gives 0 exactly. Without a seed: plain rounding. Returns { q: Int32Array, clips }. */
export function quantize24(x, seed = null) {
  const n = x.length, q = new Int32Array(n), rng = seed == null ? null : new Rng(seed);
  let clips = 0;
  for (let i = 0; i < n; i++) {
    const v = x[i];
    if (v === 0) continue;
    let k = Math.round(v * 8388608 + (rng ? rng.next() - rng.next() : 0));
    if (k > 8388607) { k = 8388607; clips++; } else if (k < -8388608) { k = -8388608; clips++; }
    q[i] = k;
  }
  return { q, clips };
}

/** Write stereo 24-bit PCM from integer samples (−2²³ … 2²³ − 1; anything outside throws). */
export function writeWav24i(file, Lq, Rq) {
  const n = Lq.length;
  if (Rq.length !== n) throw new Error('channel length mismatch');
  const fd = fs.openSync(file + '.part', 'w');
  fs.writeSync(fd, header(n, 2, 24, false));
  const CH = 1 << 16;
  const buf = Buffer.alloc(CH * 6);
  for (let s = 0; s < n; s += CH) {
    const e = Math.min(n, s + CH);
    let o = 0;
    for (let i = s; i < e; i++) {
      const a = Lq[i], b = Rq[i];
      if (a > 8388607 || a < -8388608 || b > 8388607 || b < -8388608) { fs.closeSync(fd); fs.rmSync(file + '.part'); throw new Error(`${file}: sample ${i} outside 24 bits`); }
      buf[o] = a & 255; buf[o + 1] = (a >> 8) & 255; buf[o + 2] = (a >> 16) & 255;
      buf[o + 3] = b & 255; buf[o + 4] = (b >> 8) & 255; buf[o + 5] = (b >> 16) & 255;
      o += 6;
    }
    fs.writeSync(fd, buf, 0, o);
  }
  fs.closeSync(fd);
  fs.renameSync(file + '.part', file);
}

/** Write stereo 24-bit PCM from float channels of equal length. With `dither` (a seed), TPDF from Rng(`${dither}:L`)
 *  and Rng(`${dither}:R`); without, plain rounding. Returns the clip count. */
export function writeWav24(file, L, R, { dither = null } = {}) {
  if (R.length !== L.length) throw new Error('channel length mismatch');
  const a = quantize24(L, dither == null ? null : `${dither}:L`), b = quantize24(R, dither == null ? null : `${dither}:R`);
  writeWav24i(file, a.q, b.q);
  return a.clips + b.clips;
}

/** Write stereo 32-bit float (stems before the limiter: they may pass 0 dBFS, float keeps them whole). */
export function writeWavF32(file, L, R) {
  const n = L.length;
  if (R.length !== n) throw new Error('channel length mismatch');
  const fd = fs.openSync(file + '.part', 'w');
  fs.writeSync(fd, header(n, 2, 32, true));
  const CH = 1 << 16;
  const buf = Buffer.alloc(CH * 8);
  for (let s = 0; s < n; s += CH) {
    const e = Math.min(n, s + CH);
    let o = 0;
    for (let i = s; i < e; i++) { buf.writeFloatLE(L[i], o); buf.writeFloatLE(R[i], o + 4); o += 8; }
    fs.writeSync(fd, buf, 0, o);
  }
  fs.closeSync(fd);
  fs.renameSync(file + '.part', file);
}

/** Read a PCM16/24/float32 WAV into Float32Array channels (used by QA on the delivered files). */
export function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a wav');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { data = { off: p + 8, size }; break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('bad wav');
  const bytes = fmt.bits / 8;
  const n = Math.floor(data.size / (bytes * fmt.ch));
  const ch = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  let o = data.off;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < fmt.ch; c++) {
      let v;
      if (fmt.format === 3) v = b.readFloatLE(o);
      else if (bytes === 3) v = (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) << 8 >> 8, v /= 8388608;
      else if (bytes === 2) v = b.readInt16LE(o) / 32768;
      else throw new Error('unsupported wav');
      ch[c][i] = v;
      o += bytes;
    }
  }
  return { sr: fmt.sr, bits: fmt.bits, channels: ch, n };
}
