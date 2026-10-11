// Stereo buses over a window of the film's sample clock. A bus covers absolute samples [w0, w1);
// anything added outside is cropped, so the same score renders the whole film or any excerpt.
import { panGains } from './dsp.mjs';

export class Bus {
  constructor(w0, w1, name = '') {
    this.w0 = w0; this.w1 = w1; this.n = w1 - w0; this.name = name;
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
  }
  /** add mono x (x[0] at absolute sample `at`) with gain and constant-power pan */
  mono(x, at, gain = 1, pan = 0) {
    const [gl, gr] = panGains(pan);
    this.stereo(x, x, at, gain * gl, gain * gr);
  }
  /** add a stereo pair; gl/gr scale each side */
  stereo(xl, xr, at, gl = 1, gr = gl) {
    const i0 = Math.max(0, this.w0 - at), i1 = Math.min(xl.length, this.w1 - at);
    if (i1 <= i0) return;
    const L = this.L, R = this.R, o = at - this.w0;
    for (let i = i0; i < i1; i++) { L[o + i] += xl[i] * gl; R[o + i] += xr[i] * gr; }
  }
  /** add mono x with a per-sample pan curve (Float32Array, same length as x) */
  panned(x, at, gain, pan) {
    const i0 = Math.max(0, this.w0 - at), i1 = Math.min(x.length, this.w1 - at);
    const o = at - this.w0;
    for (let i = i0; i < i1; i++) {
      const a = (Math.max(-1, Math.min(1, pan[i])) + 1) * Math.PI / 4;
      this.L[o + i] += x[i] * gain * Math.cos(a);
      this.R[o + i] += x[i] * gain * Math.sin(a);
    }
  }
  addBus(b, g = 1) {
    if (b.w0 !== this.w0 || b.n !== this.n) throw new Error('bus window mismatch');
    for (let i = 0; i < this.n; i++) { this.L[i] += b.L[i] * g; this.R[i] += b.R[i] * g; }
  }
  /** multiply by a gain function of absolute sample (evaluated every 32 samples, linear between) */
  gainCurve(fn) {
    let prev = fn(this.w0);
    for (let i = 0; i < this.n; i += 32) {
      const next = fn(this.w0 + Math.min(i + 32, this.n));
      const m = Math.min(32, this.n - i);
      for (let j = 0; j < m; j++) { const g = prev + (next - prev) * (j / 32); this.L[i + j] *= g; this.R[i + j] *= g; }
      prev = next;
    }
  }
  /** mid/side width (1 = unchanged, 0 = mono) as a function of absolute sample */
  widthCurve(fn) {
    for (let i = 0; i < this.n; i++) {
      const w = fn(this.w0 + i);
      if (w === 1) continue;
      const m = 0.5 * (this.L[i] + this.R[i]), s = 0.5 * (this.L[i] - this.R[i]) * w;
      this.L[i] = m + s; this.R[i] = m - s;
    }
  }
}

/** A stem: a dry bus plus reverb sends. Instruments add through stem.add(). */
export class Stem {
  constructor(w0, w1, name, sends = ['hall', 'room']) {
    this.name = name;
    this.dry = new Bus(w0, w1, `${name}.dry`);
    this.send = Object.fromEntries(sends.map((s) => [s, new Bus(w0, w1, `${name}.${s}`)]));
  }
  /** mono signal: gain, pan, and reverb send levels (linear, post-gain) */
  add(x, at, { gain = 1, pan = 0, hall = 0, room = 0, dry = 1 } = {}) {
    if (dry) this.dry.mono(x, at, gain * dry, pan);
    if (hall && this.send.hall) this.send.hall.mono(x, at, gain * hall, pan);
    if (room && this.send.room) this.send.room.mono(x, at, gain * room, pan);
  }
  addStereo(xl, xr, at, { gain = 1, hall = 0, room = 0, dry = 1 } = {}) {
    if (dry) this.dry.stereo(xl, xr, at, gain * dry);
    if (hall && this.send.hall) this.send.hall.stereo(xl, xr, at, gain * hall);
    if (room && this.send.room) this.send.room.stereo(xl, xr, at, gain * room);
  }
  addPanned(x, at, pan, { gain = 1, hall = 0, room = 0, dry = 1 } = {}) {
    if (dry) this.dry.panned(x, at, gain * dry, pan);
    if (hall && this.send.hall) this.send.hall.panned(x, at, gain * hall, pan);
    if (room && this.send.room) this.send.room.panned(x, at, gain * room, pan);
  }
}
