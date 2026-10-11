// QA pictures: an RGB canvas with lines and rectangles, written as PNG (zlib from Node), with text
// labels burned in afterwards by ffmpeg drawtext in JetBrains Mono (engine/fonts). Only for
// looking at the sound; nothing here touches audio.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../engine/fonts/JetBrainsMono-VF.ttf');
// a path inside the filtergraph: forward slashes (Windows takes them too) and every colon escaped, so a
// drive letter (E:\movie\…) does not end the option; within the quotes the backslash reaches drawtext
const inGraph = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) : raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

const hex = (c) => (typeof c === 'string' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c);

export class Canvas {
  constructor(w, h, bg = '#0e1014') {
    this.w = w; this.h = h; this.rgb = Buffer.alloc(w * h * 3); this.labels = [];
    this.fill(0, 0, w, h, bg);
  }
  px(x, y, c, a = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), o = (y * this.w + x) * 3, d = this.rgb;
    d[o] += (r - d[o]) * a; d[o + 1] += (g - d[o + 1]) * a; d[o + 2] += (b - d[o + 2]) * a;
  }
  fill(x0, y0, x1, y1, c, a = 1) {
    const xa = Math.max(0, Math.min(x0, x1) | 0), xb = Math.min(this.w, Math.max(x0, x1) | 0);
    const ya = Math.max(0, Math.min(y0, y1) | 0), yb = Math.min(this.h, Math.max(y0, y1) | 0);
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) this.px(x, y, c, a);
  }
  hline(x0, x1, y, c, a = 1) { this.fill(x0, y, x1, y + 1, c, a); }
  vline(x, y0, y1, c, a = 1) { this.fill(x, y0, x + 1, y1, c, a); }
  /** dashed vertical line */
  vdash(x, y0, y1, c, a = 1, on = 4, off = 4) { for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y += on + off) this.vline(x, y, Math.min(y + on, Math.max(y0, y1)), c, a); }
  /** anti-aliased-ish line (Xiaolin Wu without endpoint care) */
  line(x0, y0, x1, y1, c, a = 1) {
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    if (steep) [x0, y0, x1, y1] = [y0, x0, y1, x1];
    if (x0 > x1) [x0, y0, x1, y1] = [x1, y1, x0, y0];
    const dx = x1 - x0, g = dx === 0 ? 1 : (y1 - y0) / dx;
    let y = y0;
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      const yi = Math.floor(y), f = y - yi;
      if (steep) { this.px(yi, x, c, a * (1 - f)); this.px(yi + 1, x, c, a * f); }
      else { this.px(x, yi, c, a * (1 - f)); this.px(x, yi + 1, c, a * f); }
      y += g;
    }
  }
  polyline(pts, c, a = 1) { for (let i = 1; i < pts.length; i++) if (pts[i - 1] && pts[i]) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a); }
  /** queue a label (drawn by ffmpeg on save). anchor: l/c/r horizontally */
  text(s, x, y, { size = 13, color = '#c8ccd4', anchor = 'l' } = {}) { this.labels.push({ s: String(s), x, y, size, color, anchor }); }
  save(file, tmpDir) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const png = encodePNG(this.w, this.h, this.rgb);
    if (!this.labels.length) { fs.writeFileSync(file, png); return file; }
    const td = fs.mkdtempSync(path.join(tmpDir || path.dirname(file), '.lbl-'));
    const base = path.join(td, 'base.png');
    fs.writeFileSync(base, png);
    const parts = this.labels.map((l, i) => {
      const tf = path.join(td, `t${i}.txt`);
      fs.writeFileSync(tf, l.s);
      const xe = l.anchor === 'c' ? `${l.x}-text_w/2` : l.anchor === 'r' ? `${l.x}-text_w` : `${l.x}`;
      return `drawtext=fontfile='${inGraph(FONT)}':textfile='${inGraph(tf)}':x=${xe}:y=${l.y}:fontsize=${l.size}:fontcolor=${l.color}:expansion=none`;
    });
    const script = path.join(td, 'filter.txt');
    fs.writeFileSync(script, `[0:v]${parts.join(',\n')}[out]`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', base, '-/filter_complex', script, '-map', '[out]', '-frames:v', '1', file]);
    fs.rmSync(td, { recursive: true, force: true });
    return file;
  }
}

/** linear axis mapping helper */
export const scaleLin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
