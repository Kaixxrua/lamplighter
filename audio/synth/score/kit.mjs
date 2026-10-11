// The score's workbench: three stems over a window of the film's sample clock, a cue log, and the
// helpers every section uses to put a sound with its sync point on a sample.
//
// Every placement goes through place(): the sound's sync point (an index into its buffer: 0 for most,
// the landing for a page turn) is put on an absolute sample. When that sample comes from the cue sheet,
// the log keeps the cue's shot, path and local time next to the scheduled sample, so the QA can derive
// the target again from the raw cue rows and demand integer equality. A probe asks for the onset to be
// measured in the stem as well. Per-group energies (1 s bins) are kept for the balance table.
import { SR, dB } from '../lib/const.mjs';
import { Stem } from '../lib/bus.mjs';
import { organNote } from '../inst/organ.mjs';
import { choirPart } from '../inst/voice.mjs';

export const S2 = (sec) => Math.round(sec * SR); // global seconds → sample

export class Score {
  constructor({ w0, w1, cues }) {
    this.w0 = w0; this.w1 = w1; this.cues = cues;
    this.stems = { music: new Stem(w0, w1, 'music'), sfx: new Stem(w0, w1, 'sfx'), amb: new Stem(w0, w1, 'ambience') };
    this.log = [];
    this.energy = new Map(); // group → Float64Array per second of the window
    this.slices = new Map(); // log index → the first 50 ms of a logged sound from its sync point (matched-filter check)
    this.solo = null;        // a Set of groups: only these sound (a measuring aid; the log stays complete)
    this.until = null;       // a sample: placements are cut there (set by section 1 for the cut into s12)
  }
  live(a, b) { return b > this.w0 && a < this.w1; }

  /**
   * a cue of the sheet → { t, sample, ref } (ref goes into the log). With `add` (seconds) the point lies that
   * far after the cue (before it, if negative), still on the cue's clock: sample of local t + add; `why` says why.
   * Every ref here can be derived again by the QA from the raw cue rows (and film/timeline.json's cards).
   */
  cue(id, path, add = 0, why) {
    const c = this.cues.at(id, path);
    if (!add) return { ...c, ref: { id, path, t: c.t } };
    const t = c.t + add;
    return { t, sample: this.cues.sample(id, t), ref: { id, path, t: c.t, add, why } };
  }
  /** the cut onto shot id: its row's first frame in film/timeline.json (local t = offset / 24), plus `add` s */
  cut(id, add = 0, why) {
    const t0 = this.cues.row(id).offset / 24, t = t0 + add;
    const ref = { id, path: '@start', t: t0 };
    if (add) Object.assign(ref, { add, why });
    return { t, sample: this.cues.sample(id, t), ref };
  }
  /** a moment of a timeline card (film/timeline.json): what 'start', 'end', 'fadeOut' (the fade's start) or 'beat' k */
  card(id, what, k = 0) {
    const c = this.cues.card(id);
    const sample = what === 'start' ? c.start : what === 'end' ? c.end : what === 'fadeOut' ? c.end - c.fadeOut : what === 'beat' ? c.beats[k] : NaN;
    if (!Number.isInteger(sample)) throw new Error(`card ${id}: no ${what} ${k}`);
    return { sample, ref: what === 'beat' ? { card: id, what, k } : { card: id, what } };
  }
  /** beat k of a span between two cues (tempo.mjs spanOn) → { sample, ref } */
  beat(sp, k) {
    if (!sp.ref) throw new Error('beat(): the span is not anchored on cues (use spanOn)');
    return { sample: sp.beat(k), ref: { span: sp.ref, k } };
  }

  /**
   * Put mono x (or stereo {L, R}) so that x[sync] lands on absolute sample `s`.
   * o: { stem, gain, pan, hall, room, group, name, ref (cue ref) | prov (provisional note), probe: { band } }
   */
  place(x, s, o = {}) {
    const st = this.stems[o.stem || 'music'];
    const sync = o.sync || 0;
    const at = s - sync;
    const stereo = !(x instanceof Float32Array);
    // a hard cut ahead (s10 → s12's silence): while `until` is set, nothing placed may sound at or after it
    if (this.until != null) {
      const keep = this.until - at, len = stereo ? x.L.length : x.length;
      if (keep <= 0) return at;
      if (len > keep) x = stereo ? { L: x.L.subarray(0, keep), R: x.R.subarray(0, keep) } : x.subarray(0, keep);
    }
    const g = o.gain ?? 1;
    const group = o.group || o.stem || 'music';
    if (!this.solo || this.solo.has(group)) {
      if (o.panCurve) st.addPanned(x, at, o.panCurve, { gain: g, hall: o.hall || 0, room: o.room || 0, dry: o.dry ?? 1 });
      else if (stereo) st.addStereo(x.L, x.R, at, { gain: g, hall: o.hall || 0, room: o.room || 0, dry: o.dry ?? 1 });
      else st.add(x, at, { gain: g, pan: o.pan || 0, hall: o.hall || 0, room: o.room || 0, dry: o.dry ?? 1 });
      this.#acc(group, stereo ? [x.L, x.R] : [x], at, g * (stereo ? 1 : Math.SQRT1_2));
    }
    if (o.name && (o.ref || o.prov || o.probe)) {
      const e = { name: o.name, stem: o.stem || 'music', sched: s };
      if (o.ref) e.cue = o.ref;
      if (o.prov) e.prov = o.prov;
      const m = stereo ? x.L : x;
      if (o.probe) {
        // onset of the sound itself, from its sync point on: the first sample above −40 dB of its peak
        let pk = 0; for (let i = 0; i < m.length; i++) pk = Math.max(pk, Math.abs(m[i]));
        let i0 = sync; while (i0 < m.length && Math.abs(m[i0]) < pk * 0.01) i0++;
        e.probe = { ...o.probe, own: +(((i0 - sync) / SR) * 1000).toFixed(3) };
      }
      // 5 ms before the sync point to 50 ms after it, for the matched-filter check in the render
      const a = sync - Math.round(0.005 * SR), len = Math.round(0.055 * SR), sl = new Float32Array(len);
      for (let i = 0; i < len; i++) { const j = a + i; if (j >= 0 && j < m.length) sl[i] = stereo ? x.L[j] + x.R[j] : x[j]; }
      this.slices.set(this.log.length, { x: sl, from: s - Math.round(0.005 * SR) });
      this.log.push(e);
    }
    return at;
  }
  /** mono x with a pan curve (Float32Array over x), through place() */
  placePanned(x, s, pan, o = {}) { return this.place(x, s, { ...o, panCurve: pan }); }
  /** log a sync point carried by several sounds (a chord change) */
  note(name, s, o = {}) { const e = { name, stem: o.stem || 'music', sched: s }; if (o.ref) e.cue = o.ref; if (o.prov) e.prov = o.prov; if (o.probe) e.probe = o.probe; this.log.push(e); }

  #acc(group, chans, at, g) {
    if (!this.energy.has(group)) this.energy.set(group, new Float64Array(Math.ceil((this.w1 - this.w0) / SR) + 1));
    const E = this.energy.get(group);
    for (const x of chans) {
      const i0 = Math.max(0, this.w0 - at), i1 = Math.min(x.length, this.w1 - at);
      for (let i = i0; i < i1; i++) E[((at + i - this.w0) / SR) | 0] += x[i] * x[i] * g * g;
    }
  }

  /** an organ key held from sample s0 to s1 on `stops` */
  organ({ midi, s0, s1, stops, level = -16, wind = null, pedal = false, attack = 1, release = 1, stem = 'music', gain = 1, hall = 0.35, room = 0, panScale = 1, group = 'organ', env = null, name, ref, prov, probe }) {
    const r = organNote({ midi, t0: s0 / SR, dur: (s1 - s0) / SR, stops, level, wind, pedal, attack, release });
    if (r.at !== s0) throw new Error(`organ note placed at ${r.at}, wanted ${s0}`);
    if (env) applyEnv(r.x, s0, env);
    return this.place(r.x, s0, { stem, gain, pan: r.pan * panScale, hall, room, group, name, ref, prov, probe });
  }
  /** a choir part from sample s0 to s1 */
  choir({ part, midi, s0, s1, vowel = 'a', dyn = 0.6, level = 0, singers = 6, attack = 0.25, release = 0.5, scatter = 0.04, pan, seed = '', stem = 'music', gain = 1, hall = 0.45, room = 0, env = null, vib, group = 'choir', name, ref, prov }) {
    const PAN = { S: [-0.6, -0.15], A: [0.15, 0.6], T: [-0.4, 0.05], B: [-0.05, 0.4] };
    const c = choirPart({ part, midi, t0: s0 / SR, dur: (s1 - s0) / SR, vowel, dyn, singers, pan: pan || PAN[part], seed: `${seed}:${s0}`, level, attack, release, scatter, vib });
    if (env) { applyEnv(c.L, s0, env); applyEnv(c.R, s0, env); }
    return this.place(c, s0, { stem, gain, hall, room, group, name, ref, prov });
  }

  /** the balance table: dB of each group's energy per second (relative to full scale) */
  balance() {
    const out = {};
    for (const [g, E] of this.energy) out[g] = Array.from(E, (e) => +(10 * Math.log10(e / SR + 1e-12)).toFixed(1));
    return out;
  }
}

/** multiply x (starting at absolute sample s0) by env(global seconds), evaluated every 32 samples */
export function applyEnv(x, s0, env) {
  for (let i = 0; i < x.length; i += 32) {
    const g0 = env((s0 + i) / SR), g1 = env((s0 + Math.min(i + 32, x.length)) / SR);
    const m = Math.min(32, x.length - i);
    for (let j = 0; j < m; j++) x[i + j] *= g0 + (g1 - g0) * (j / 32);
  }
  return x;
}

/** the notes of one part (0 S, 1 A, 2 T, 3 B) of a voiced plan, ties merged: [{ midi, s0, s1, k }] */
export function partNotes(voiced, starts, end, part) {
  const out = [];
  voiced.forEach((ch, k) => {
    const m = ch.v[part], s0 = starts[k], s1 = k + 1 < voiced.length ? starts[k + 1] : end;
    const last = out[out.length - 1];
    if (last && last.midi === m && last.s1 === s0) last.s1 = s1;
    else out.push({ midi: m, s0, s1, k });
  });
  return out;
}

export { dB };
