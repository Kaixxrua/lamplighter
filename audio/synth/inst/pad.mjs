// Analog-style pad: three detuned band-limited saws per note through a resonant low-pass whose
// cutoff follows an envelope. Used sparingly under the organ (the montage's bed, the river's glow).
import { SR, midiHz, centsRatio } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { specTable, osc, SVF, clamp, smooth, wobble } from '../lib/dsp.mjs';

const saw = (f0) => specTable('saw', (k) => 1 / k, f0, { fmax: 14000, seed: 'saw' });

/** one note: returns { L, R, at }. cutoff(t) in Hz (t from note start), level linear. */
export function padNote({ midi, t0, dur, attack = 0.6, release = 1.2, cutoff = () => 1800, res = 0.9, level = 0.2, width = 0.6, seed = '' }) {
  const n = Math.round((dur + release) * SR), r = new Rng(`pad:${seed}:${midi}:${t0}`);
  const f = midiHz(midi);
  const L = new Float32Array(n), R = new Float32Array(n);
  const drift = wobble(n, `paddrift:${seed}:${midi}`, 1.7);
  const nOn = Math.round(dur * SR);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    env[i] = i < nOn ? smooth(clamp(t / attack)) : smooth(clamp(t / attack)) * Math.pow(1 - clamp((i - nOn) / (release * SR)), 2);
  }
  const voices = [[-7, -width], [0, 0], [7, width]];
  for (const [c, p] of voices) {
    const x = new Float32Array(n), fr = new Float32Array(n);
    for (let i = 0; i < n; i++) fr[i] = f * centsRatio(c + 3 * drift[i]);
    osc(saw(f), x, 0, n, fr, env, r.next());
    const sv = new SVF();
    for (let i = 0; i < n; i++) {
      if ((i & 15) === 0) sv.set(clamp(cutoff(i / SR), 40, 16000), res);
      sv.tick(x[i]);
      x[i] = sv.lp;
    }
    const a = (clamp(p, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * level, gr = Math.sin(a) * level;
    for (let i = 0; i < n; i++) { L[i] += x[i] * gl; R[i] += x[i] * gr; }
  }
  return { L, R, at: Math.round(t0 * SR) };
}
