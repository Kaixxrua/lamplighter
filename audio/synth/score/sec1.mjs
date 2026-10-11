// Section 1, 灯果 (from the first frame to the cut into s12): free time over a D pedal. Screenplay §七: the
// 32′ pedal D, paper grains, synthetic whispers and typing piling up until everything is cut at once.
// The opening as cut on 10-07: s01, s02, s03, s06, s08, s10 (s04, s05, s07, s09 and s11 are gone). What the
// lost shots carried moves into the ones that stay: the first notification and the first keys (s07) arrive
// with the first printed volume in s08, the whispers of Babel (s09) and the noise peak (s11) in s10.
//
// Every position is shot-relative: C.start(id) + seconds, a cue of the shot (s08, s10), or a card of the
// timeline (c1, c3). Nothing here sounds at or after s12's first sample: S.until cuts every placement there,
// and render.mjs cuts the reverb of what was sent before it, so the storm stops dead with the picture.
import { SR, SIL0, nn, midiHz, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { Biquad, curve, clamp, wobble, TAU } from '../lib/dsp.mjs';
import { whisperLine } from '../inst/voice.mjs';
import { notify } from '../inst/perc.mjs';
import { air, whoosh, sparkle, shimmer, pageTurn, key, subWhoomp, subBed, wings } from '../inst/fx.mjs';
import { applyEnv } from './kit.mjs';

const T = (sec) => Math.round(sec * SR);

/** two harmonic tones a widening beat apart (an unda maris): f and f + beat(t) Hz (t: seconds from the
 *  start), partials 1–4, one tone left of centre and one right, so both channels beat. Stereo. */
function undaMaris({ f, dur, beat, attack = 2, release = 0.4, seed = 'um' }) {
  const n = T(dur), L = new Float32Array(n), R = new Float32Array(n), r = new Rng(`unda:${seed}`);
  const amps = [1, 0.5, 0.25, 0.12];
  for (const [side, df] of [[-1, 0], [1, 1]]) {
    const ph = amps.map(() => r.next() * TAU), a = (0.5 + 0.22 * side) * (Math.PI / 2);
    const gl = Math.cos(a), gr = Math.sin(a);
    let phase = r.next() * TAU;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      phase += (TAU * (f + df * beat(t))) / SR;
      const e = Math.min(1, t / attack) ** 2 * clamp((dur - t) / release);
      let y = 0;
      for (let k = 0; k < 4; k++) y += amps[k] * Math.sin((k + 1) * phase + ph[k]);
      L[i] += 0.25 * e * y * gl; R[i] += 0.25 * e * y * gr;
    }
  }
  return { L, R };
}

/** paper fibre under the lens: band-passed noise breathing slowly, a little different on each side. Stereo. */
function friction({ dur, seed, centre = 3600 }) {
  const n = T(dur), L = new Float32Array(n), R = new Float32Array(n), r = new Rng(`fric:${seed}`);
  const bl = new Biquad('bp', centre, 0.9), br = new Biquad('bp', centre * 1.12, 0.9);
  const w = wobble(n, `fw:${seed}`, 0.35), g = wobble(n, `fg:${seed}`, 0.07);
  for (let i = 0; i < n; i++) {
    const e = Math.max(0, 0.55 + 0.45 * w[i]) * (0.85 + 0.15 * g[i]);
    L[i] = e * bl.tick(r.gauss()); R[i] = e * br.tick(r.gauss());
  }
  return { L, R };
}

export function sec1(S) {
  if (!S.live(0, SIL0)) return;
  const C = S.cues;
  const st = (id) => C.start(id);
  const at = (id, t) => C.start(id) + T(t);
  const cue = (id, p) => S.cue(id, p);
  S.until = SIL0;

  // s01: black, then the film's first sound, a page turned close to the ear
  {
    const p = pageTurn({ kind: 'near', seed: 's01', vel: 0.8 });
    const c = S.cut('s01', 1.25, 'BIBLE §9: the near-ear page turn lands 1.25 s into the black (s01 is black: no picture to meet)');
    S.place(p.x, c.sample, { sync: T(p.land), stem: 'sfx', gain: dB(-17), pan: 0.3, room: 0.12, group: 'pages', name: 's01 page turn by the ear (landing)', ref: c.ref });
  }

  // s02: under the epigraph the low rises (≈ 30 Hz, unpitched: it never beats against the pedal to come),
  // and a second page turn takes the card away as it starts to fade
  const c1 = C.card('c1');
  {
    const a = st('s02');
    const x = subBed({ dur: (SIL0 - a) / SR + 0.1, seed: 's02' });
    applyEnv(x, a, curve([[a / SR, 0], [st('s03') / SR, 0.55, 'cos'], [st('s06') / SR + 4, 1, 'cos'], [SIL0 / SR, 1]]));
    S.place(x, a, { stem: 'amb', gain: dB(-26), group: 'sub', name: 's02 the low begins', ref: S.cut('s02').ref });
    const p = pageTurn({ kind: 'near', seed: 's02', vel: 0.6 });
    const c1f = S.card('c1', 'fadeOut');
    S.place(p.x, c1f.sample, { sync: T(p.land), stem: 'sfx', gain: dB(-20), pan: -0.25, room: 0.2, hall: 0.05, group: 'pages', name: 's02 second page turn (landing)', ref: c1f.ref });
  }

  // the library's air from s03 to the cut: a still room, the shaft, the fall through the storm
  {
    const a = st('s03');
    const x = air({ dur: (SIL0 - a) / SR + 0.1, seed: 's01-10', howl: 0.6, hiss: 0.5 });
    const t = (id, d = 0) => st(id) / SR + d;
    const env = curve([[t('s03'), 0], [t('s03', 1.5), 0.32, 'cos'], [t('s06'), 0.4], [t('s06', 3), 1, 'cos'], [t('s08'), 0.7], [t('s10'), 0.85], [SIL0 / SR, 2.2, 'cos']]);
    applyEnv(x.L, a, env); applyEnv(x.R, a, env);
    S.place(x, a, { stem: 'amb', gain: dB(-35), hall: 0.15, group: 'air' });
  }

  // s03: the macro glide along the spines: paper fibre, dust in the beam, the gilt catching the light
  {
    const a = st('s03'), d = (st('s06') - a) / SR + 0.8;
    const fr = friction({ dur: d, seed: 's03' });
    const env = curve([[a / SR, 0], [a / SR + 0.6, 1, 'cos'], [st('s06') / SR - 0.2, 1], [a / SR + d, 0, 'cos']]);
    applyEnv(fr.L, a, env); applyEnv(fr.R, a, env);
    S.place(fr, a, { stem: 'sfx', gain: dB(-37), room: 0.15, group: 'paper' });
    S.place(shimmer({ dur: d, rate: () => 7, fLo: 5000, fHi: 12000, spread: 0.8, seed: 's03dust', amp: 0.05, tau: [0.004, 0.012] }), a, { stem: 'amb', gain: dB(-30), room: 0.2, group: 'dust' });
    [1.0, 2.1, 3.2].forEach((t, k) => S.place(sparkle({ f: 5200 + 900 * k, tau: 0.09, seed: `gilt${k}`, amp: 0.35 }), at('s03', t), { stem: 'sfx', gain: dB(-31), pan: -0.4 + 0.4 * k, room: 0.25, group: 'glints' }));
  }

  // s06: over the rail and down the shaft: the 32′ D speaks and holds to the cut; an unda maris on D2 beats
  // ever faster as the shaft slides away (the dolly zoom) and faster still in the storm
  const s06 = S.cut('s06').sample;
  S.organ({ midi: nn('D2'), s0: s06, s1: SIL0 + T(1), stops: ['CB32', 'SB16'], level: -22, pedal: true, attack: 3, hall: 0.6, name: 's06 the 32′ D speaks', ref: S.cut('s06').ref });
  {
    const u0 = s06 + T(1), dur = (SIL0 - u0) / SR + 0.5;
    const t8 = (st('s08') - u0) / SR;
    const beat = (t) => (t < t8 ? 0.3 + 2.2 * (0.5 - 0.5 * Math.cos(Math.PI * clamp(t / t8))) : 2.5 + 3 * clamp((t - t8) / (dur - t8)));
    S.place(undaMaris({ f: midiHz(nn('D2')), dur, beat, attack: 3, seed: 's06' }), u0, { stem: 'music', gain: dB(-27), hall: 0.5, group: 'organ' });
    S.place(whoosh({ dur: 6.5, f0: 1200, f1: 150, q: 0.6, peak: 0.55, seed: 'zoom' }), at('s06', 0.8), { stem: 'sfx', gain: dB(-34), hall: 0.6, group: 'fx' });
  }

  // s08: the light prints new volumes, ever faster: each print a cold line climbing the board, then its
  // spine typed. The first one is typed key by key on the cue (ottervale/mcp-server, 20 keys), and the
  // first notification sounds as it stands. The keys thicken into rain.
  const r = new Rng('sec1');
  const pent = ['D', 'F', 'G', 'A', 'C'];
  const tone = (rr) => midiHz(nn(`${rr.pick(pent)}${rr.chance(0.55) ? 5 : 6}`));
  const P = C.cues('s08');
  {
    const f = P.first, c0 = cue('s08', 'first.t0');
    S.place(whoosh({ dur: f.dur, f0: 2200, f1: 7000, q: 2.2, peak: 0.85, seed: 'print0' }), c0.sample, { stem: 'sfx', gain: dB(-31), pan: -0.6, room: 0.2, group: 'print', name: 's08 the first print ignites', ref: c0.ref });
    f.keys.forEach((_, i) => {
      const c = cue('s08', `first.keys[${i}]`);
      S.place(key({ seed: `first${i}`, vel: 0.75 }), c.sample, { stem: 'sfx', gain: dB(-20), pan: -0.6 + 0.02 * i, room: 0.25, group: 'keys', name: `s08 first title, key ${i}`, ref: c.ref, probe: i === 0 ? { band: [1500, 9000] } : undefined });
    });
    S.place(notify({ f1: midiHz(nn('A5')), f2: midiHz(nn('D6')), seed: 'first', vel: 0.55 }), S.cue('s08', 'first.t0', f.dur, 'the first volume stands: first.t0 + first.dur').sample, { stem: 'sfx', gain: dB(-27), pan: 0.35, room: 0.3, group: 'notify', name: 's08 the first notification', ref: S.cue('s08', 'first.t0', f.dur, 'the first volume stands: first.t0 + first.dur').ref });
  }
  P.prints.forEach((p, i) => {
    if (i === 0) return; // the first print is the cue's `first`
    const c = cue('s08', `prints[${i}].t`), u = i / P.prints.length, far = p.y < 0 ? 3 : 0, pan = -0.7 + 1.4 * p.x;
    const rr = new Rng(`print${i}`);
    S.place(whoosh({ dur: p.dur, f0: 2400, f1: 7500, q: 2.2, peak: 0.85, seed: `print${i}` }), c.sample, { stem: 'sfx', gain: dB(-33 - far - 4 * u), pan, room: 0.25, group: 'print', name: `s08 print ${i}`, ref: c.ref });
    const m = 8 + rr.int(9);
    const ts = Array.from({ length: m }, () => p.t + p.dur * (0.3 + 0.65 * rr.next())).sort((a, b) => a - b);
    ts.forEach((t, j) => S.place(key({ seed: `p${i}k${j}`, vel: 0.5 + 0.3 * rr.next() }), at('s08', t), { stem: 'sfx', gain: dB(-27 - far - 3 * u), pan: clamp(pan + 0.1 * rr.bi(), -1, 1), room: 0.3, group: 'keys' }));
    if (i >= 4 && r.chance(0.1 + 0.3 * u)) S.place(notify({ f1: tone(rr), f2: tone(rr), seed: `n8${i}`, vel: 0.5 }), at('s08', p.t + p.dur), { stem: 'sfx', gain: dB(-30), pan: rr.bi() * 0.8, room: 0.3, group: 'notify' });
  });

  // Babel: whispered syllables in many made-up tongues, from late in s08 to the cut, thicker toward it
  {
    const CONS = ['s', 'sh', 'f', 'h', 't', 'k', 'p', 'm', 'n', 'l'], VOW = ['a', 'e', 'i', 'o', 'u'];
    const w0 = at('s08', 2.5), K = 22;
    for (let i = 0; i < K; i++) {
      const rr = new Rng(`babel${i}`);
      const cons = Array.from({ length: 3 + rr.int(3) }, () => rr.pick(CONS)), vows = Array.from({ length: 2 + rr.int(2) }, () => rr.pick(VOW));
      const rate = 4 + 3 * rr.next(), dur = 1.4 + 1.6 * rr.next();
      const syl = [];
      for (let t = 0; t < dur; t += (0.7 + 0.6 * rr.next()) / rate) syl.push({ t, c: rr.pick(cons), v: rr.pick(vows), d: 0.08 + 0.1 * rr.next() });
      const s = w0 + Math.round((SIL0 - w0 - T(1)) * Math.pow(i / K, 0.6)) + T(0.3 * rr.next());
      S.place(whisperLine({ syllables: syl, part: rr.pick(['S', 'A', 'T', 'B']), seed: `babel${i}`, dyn: 0.5 }), s, { stem: 'sfx', gain: dB(-28 + 5 * (i / K)), pan: rr.bi() * 0.85, room: 0.35, hall: 0.2, group: 'whispers' });
    }
  }

  // s10: the storm at its height. The pages wheel and flap (faster with the fall), some brush the lens; the
  // keys are rain; the notifications multiply; on the card's second beat the lamps below go out floor by
  // floor, each closer than the last, and the organ builds a wall over the pedal. All of it ends on the cut.
  const s10 = st('s10'), d10 = (SIL0 - s10) / SR;
  const Q = C.cues('s10');
  {
    const x = wings({ dur: d10 + 0.1, voices: 140, rate: [5, 11], density: (u) => 0.45 + 0.55 * u, band: (u) => 1900 + 1600 * u, spread: 0.95, seed: 's10', amp: 0.16 });
    const env = curve([[s10 / SR, 0.55], [SIL0 / SR, 1.25, 'cos']]);
    applyEnv(x.L, s10, env); applyEnv(x.R, s10, env);
    S.place(x, s10, { stem: 'sfx', gain: dB(-22), hall: 0.2, room: 0.1, group: 'storm', name: 's10 the storm', ref: S.cut('s10').ref });
  }
  Q.brushes.forEach((b, i) => {
    const c = cue('s10', `brushes[${i}].t`), v = b.v / Math.max(...Q.brushes.map((x) => x.v));
    S.place(whoosh({ dur: b.d, f0: 350, f1: 2800, q: 0.8, peak: 0.45, seed: `brush${i}` }), c.sample, { stem: 'sfx', gain: dB(-27 + 6 * v), pan: b.pan, room: 0.1, group: 'storm', name: `s10 brush ${i}`, ref: c.ref });
    S.place(wings({ dur: b.d, voices: 4, rate: [12, 18], band: () => 2600, centre: b.pan, spread: 0.1, seed: `bf${i}`, amp: 0.2 }), c.sample, { stem: 'sfx', gain: dB(-25 + 6 * v), group: 'storm' });
  });
  {
    const ds = Q.outs.map((o) => o.depth), dMax = Math.max(...ds), dMin = Math.min(...ds);
    Q.outs.forEach((o, i) => {
      const c = cue('s10', `outs[${i}].t`), near = (dMax - o.depth) / Math.max(1e-9, dMax - dMin);
      S.place(whoosh({ dur: o.t - o.t0 + 0.1, f0: 2400, f1: 250, q: 0.7, peak: 0.9, seed: `out${i}` }), at('s10', o.t0), { stem: 'sfx', gain: dB(-34 + 8 * near), hall: 0.6 - 0.35 * near, group: 'lamps' });
      S.place(subWhoomp({ f0: 75, f1: 32, dur: 0.7, seed: `out${i}` }), c.sample, { stem: 'sfx', gain: dB(-24 + 7 * near), hall: 0.5 - 0.3 * near, group: 'lamps', name: `s10 floor ${o.floor} goes dark`, ref: c.ref, probe: i === 0 ? { band: [25, 200] } : undefined });
    });
  }
  {
    const rr = new Rng('rain');
    for (let t = rr.exp(120); t < d10; t += rr.exp(120 + 300 * (t / d10))) S.place(key({ seed: `rain${t.toFixed(5)}`, vel: 0.35 + 0.4 * rr.next() }), s10 + T(t), { stem: 'sfx', gain: dB(-31), pan: rr.bi() * 0.9, room: 0.3, group: 'keys' });
    for (let t = rr.exp(2); t < d10; t += rr.exp(2 + 5 * (t / d10))) S.place(notify({ f1: tone(rr), f2: tone(rr), seed: `n10${t.toFixed(4)}`, vel: 0.45 }), s10 + T(t), { stem: 'sfx', gain: dB(-31), pan: rr.bi() * 0.9, room: 0.3, group: 'notify' });
  }
  {
    const c3b = S.card('c3', 'beat', 1), b2 = c3b.sample; // the card's second layer
    const wall = curve([[b2 / SR, 0.12], [(b2 + SIL0) / 2 / SR, 0.45, 'cos'], [SIL0 / SR, 1, 'cos']]);
    for (const m of ['D3', 'A3', 'D4', 'E4', 'A4', 'D5', 'E5']) S.organ({ midi: nn(m), s0: b2, s1: SIL0 + T(1), stops: ['P8', 'O4', 'MIX', 'TR8'], level: -28, env: wall, hall: 0.55 });
    S.organ({ midi: nn('D2'), s0: b2, s1: SIL0 + T(1), stops: ['PO16', 'OB8'], level: -24, pedal: true, env: wall, hall: 0.55, name: 's10 the wall begins (c3, second beat)', ref: c3b.ref });
  }
  S.until = null;
}
