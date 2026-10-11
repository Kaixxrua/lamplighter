// The beat and the bars of section 2–3. 60 BPM from the tutti (global 39 s, frame 936; frame 1488 before the
// opening was cut by 552 frames = 23 s): a beat a second, so from s16 on the radar's ping is the beat
// (global 1224 + 24k). The metre follows the cuts: 4/4 from the tutti to s18; s19 5/4; s20 2/4; s21, s22
// 4/4; s23–s25 3/4; s26 2/4; s27 at 93 s. T0 and METRE are global seconds: the hard-coded anchors listed
// in notes/progress/G.md. From s27 on the beat is given by Span (below), anchored on the shots' samples.
export const BPM = 60;
export const BEAT = 60 / BPM;
export const T0 = 39;
export const METRE = (() => {
  const m = [];
  let t = T0;
  for (const beats of [4, 4, 4, 4, 4, 4, 4, 5, 2, 4, 4, 3, 3, 3, 2]) { m.push({ t, beats }); t += beats * BEAT; }
  m.push({ t, beats: 4, note: 's27' });
  return m;
})();
/** the bar in force at global second t */
export const barAt = (t) => { let b = METRE[0]; for (const x of METRE) if (x.t <= t + 1e-9) b = x; return b; };
/** subdivision grid: times from t0 to t1 every BEAT/div (div 4 = 16ths, 6 = sextuplets) */
export function grid(t0, t1, div) { const o = []; const step = BEAT / div; for (let k = 0; t0 + k * step < t1 - 1e-9; k++) o.push(t0 + k * step); return o; }

/**
 * A stretch of beats between two samples a and b, anchored on the cue sheet (two cues: spanOn below), so it
 * moves with the shots. `beats` beats fit exactly; with bpm0 the tempo (beats per second) rises or falls
 * linearly from bpm0 over the first fraction `ramp` of the span and then holds the tempo that makes the count
 * fit: r1 = (N − Tr·r0/2) / (D − Tr/2). With `ratio` the tempo grows exponentially, by that ratio over the
 * span (s43: 90 → 180 BPM, ratio 2): beat k at D·log_R(1 + k(R − 1)/N). Otherwise the tempo is constant, N / D.
 */
export class Span {
  constructor(a, b, beats, { bpm0 = null, ramp = 1, ratio = null } = {}) {
    this.a = a; this.b = b; this.N = beats;
    const D = (b - a) / 48000;
    this.D = D;
    if (ratio != null) {
      this.R = ratio; this.lnR = Math.log(ratio);
      this.r0 = (beats * this.lnR) / (D * (ratio - 1)); this.r1 = this.r0 * ratio; this.Tr = D;
    } else if (bpm0 == null) { this.r0 = this.r1 = beats / D; this.Tr = 0; }
    else {
      this.r0 = bpm0 / 60; this.Tr = ramp * D;
      this.r1 = (beats - (this.Tr * this.r0) / 2) / (D - this.Tr / 2);
      if (!(this.r1 > 0)) throw new Error(`span of ${beats} beats in ${D} s cannot start at ${bpm0} BPM`);
    }
    this.kr = (this.Tr * (this.r0 + this.r1)) / 2;
  }
  get bpm1() { return this.r1 * 60; }
  /** seconds from a of beat k (fractional k allowed; k may run past N at the held tempo) */
  time(k) {
    if (this.R != null) return (this.D * Math.log(1 + (k * (this.R - 1)) / this.N)) / this.lnR;
    const { r0, r1, Tr, kr } = this;
    if (k <= kr && Tr > 0) {
      const g = (r1 - r0) / Tr;
      return Math.abs(g) < 1e-12 ? k / r0 : (-r0 + Math.sqrt(r0 * r0 + 2 * g * k)) / g;
    }
    return Tr + (k - kr) / r1;
  }
  /** the sample of beat k */
  beat(k) { return this.a + Math.round(this.time(k) * 48000); }
  /** tempo (BPM) at beat k */
  bpm(k) {
    const t = this.time(k);
    if (this.R != null) return 60 * this.r0 * Math.exp((this.lnR * t) / this.D);
    return 60 * (t < this.Tr ? this.r0 + ((this.r1 - this.r0) * t) / this.Tr : this.r1);
  }
}

/**
 * A Span between two cues of the sheet (each { sample, ref } from Score.cue / Score.cut): its beats are sync
 * points the QA can derive again from the raw cue rows (the log keeps { span: this.ref, k }).
 */
export function spanOn(A, B, beats, opts = {}) {
  const sp = new Span(A.sample, B.sample, beats, opts);
  sp.ref = { a: A.ref, b: B.ref, n: beats, ...opts };
  return sp;
}
