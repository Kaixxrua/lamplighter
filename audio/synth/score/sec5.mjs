// Section 5, 回响 (s44–s50), timed from the shots' CUES: D major, the organ's full tutti with the choir and the
// taiko, the motif in long notes and a climb to the highest point, then a single note; the choir's tail, the
// last pings, the echo coming home and the final chord on the mark, and the coda's page turn, the next reader
// and a very distant ping. Every sync point is a cue, a cue plus a stated offset, or a beat of a Span between
// two cues (tempo.mjs spanOn); the log carries the ref.
//
// Tempo: s44 holds 13 beats from its cut (the tutti) to 'out' (12 s: 65 BPM; §七 asks 66, the shot's length
// decides); s45 slows from 65 to 55 over 5 beats (allargando) into the highest point, beat 18 ('peak', five
// seconds into s45, §七 3:45); 'hush', 1.4 s on, stops it all but one note.
import { SR, nn, midiHz, dB } from '../lib/const.mjs';
import { curve, clamp } from '../lib/dsp.mjs';
import { windSystem } from '../inst/organ.mjs';
import { ping, glassTink, taiko } from '../inst/perc.mjs';
import { whoosh, shimmer, sparkle, pageTurn, subWhoomp } from '../inst/fx.mjs';
import { spanOn } from './tempo.mjs';
import { organBlock, choirBlock, shotPlan } from './orch.mjs';
import { REG } from './sec2.mjs';

const T = (sec) => Math.round(sec * SR);

export function sec5(S, prev) {
  const C = S.cues;
  const st = (id) => C.start(id), en = (id) => C.end(id);
  const live = (a, b) => S.live(a - T(1), b + T(12));
  const Q = (id) => C.cues(id);
  const L = (c, name) => ({ name, ref: c.ref }); // a logged sync point

  const cut44 = S.cue('s44', 'cut.t'), out = S.cue('s45', 'out'), peak = S.cue('s45', 'peak'), hush = S.cue('s45', 'hush');
  const sp44 = spanOn(cut44, out, 13);
  const sp45 = spanOn(out, peak, 5, { bpm0: sp44.bpm1 });
  const B = (k) => (k === 0 ? cut44 : k === 13 ? out : k === 18 ? peak : k < 13 ? S.beat(sp44, k) : S.beat(sp45, k - 13));
  const top = peak.sample, cut = hush.sample;
  const R = { A: ['G3', 'G5'], T: ['C3', 'B4'] }; // the climb: the inner parts may follow the soprano up
  const P44 = shotPlan(S, [
    { at: B(0), q: 'D', B: 'D2', S: 'D5', note: 's44 cut: the tutti, the motif in long notes (D)' },
    { at: B(3), q: 'F#m', B: 'F#2', S: 'A5', note: 'beat 3 (A)' },
    { at: B(5), q: 'G', B: 'G2', S: 'G5', note: 'beat 5 (G)' },
    { at: B(6), q: 'D', B: 'F#2', S: 'A5', note: 'beat 6 (A)' },
    { at: B(8), q: 'Bm', B: 'B2', S: 'F#5', note: 'beat 8 (F♯): the full organ' },
    { at: B(10), q: 'A', B: 'C#3', S: 'E5', note: 'beat 10 (E)' },
    { at: B(12), q: 'D', B: 'D3', S: 'D5', note: 'beat 12 (D)' },
    { at: B(13), q: 'Bm', B: 'B2', S: 'F#5', note: 's45: out of the shaft, beat 13 (§七 3:40)' },
    { at: B(14), q: 'Em7', B: 'E2', S: 'G5', note: 'beat 14' },
    { at: B(15), q: 'D', B: 'F#2', S: 'A5', note: 'beat 15' },
    { at: B(16), q: 'G', B: 'G2', S: 'B5', range: R, note: 'beat 16' },
    { at: B(17), q: 'A', B: 'A2', S: 'C#6', range: R, note: 'beat 17' },
    { at: B(18), q: 'D', B: 'D2', S: 'D6', range: R, note: 'beat 18: the highest point (§七 3:45)' },
  ], { from: prev, end: cut, name: 'P44 (s44–s45)' });

  // ------------------------------------------------------------------------------------ s44–s45: the tutti
  if (live(st('s44'), en('s45'))) {
    const a = st('s44');
    const wind = windSystem({ sags: [{ t: B(8).sample / SR, cents: 5 }, { t: out.sample / SR, cents: 4 }, { t: top / SR, cents: 7 }] });
    organBlock(S, P44, 0, 3, { manual: { stops: REG.chorale, level: -26 }, solo: { stops: REG.solo, level: -22 }, pedal: { stops: REG.pedalChorale, level: -23 }, wind, hall: 0.6 });
    organBlock(S, P44, 4, 11, { manual: { stops: REG.tutti, level: -27 }, solo: { stops: REG.solo, level: -21 }, pedal: { stops: REG.pedalTutti, level: -21 }, fill: true, wind, hall: 0.6 });
    organBlock(S, P44, 12, 12, { manual: { stops: REG.tutti, level: -27 }, solo: { stops: [...REG.solo, 'MIX'], level: -21 }, pedal: { stops: REG.pedalTutti, level: -21 }, fill: true, wind, hall: 0.6, release: 0.3 });
    choirBlock(S, P44, 0, 12, { vowel: 'a', dyn: (t) => 0.55 + 0.4 * clamp((t - a / SR) / ((top - a) / SR)), level: -11, attack: 0.15, release: 0.3, hall: 0.65, seed: 's44' });
    // the taiko: the great drum on the motif's long notes, the small one between, all of it rising
    for (let k = 0; k <= 17; k++) {
      const big = [0, 3, 6, 8, 10, 12, 13].includes(k), u = k / 18, c = B(k);
      S.place(taiko({ size: big ? 'o' : 'n', vel: 0.6 + 0.3 * u, seed: `s44t${k}` }), c.sample, { stem: 'sfx', gain: dB(big ? -13 + 3 * u : -20 + 4 * u), pan: big ? 0 : k % 2 ? 0.3 : -0.3, hall: 0.35, group: 'taiko', ...(big ? L(c, `s44 taiko, beat ${k}`) : {}) });
    }
    S.place(shimmer({ dur: 11.5, rate: (u) => 8 + 40 * u, fLo: 4000, fHi: 10000, spread: 0.9, seed: 'lanterns', amp: 0.1 }), S.cue('s44', 'cut.t', 0.3, 'the lanterns, as the crane rises').sample, { stem: 'sfx', gain: dB(-29), hall: 0.4, group: 'glints' });
    // the eye passes the floors' decks (counted while under three a second): a pass-by each; then every tenth
    // floor flicks past and the streaks pull it all up and out of the shaft: a riser to 'out'
    Q('s44').floors.pass.forEach((f, k) => {
      const c = S.cue('s44', `floors.pass[${k}].t`);
      S.place(whoosh({ dur: 0.7, f0: 350, f1: 1400, q: 0.8, peak: 0.5, seed: `deck${k}` }), c.sample, { sync: T(0.35), stem: 'sfx', gain: dB(-32 + 0.4 * k), pan: k % 2 ? 0.35 : -0.35, hall: 0.25, group: 'fx', ...L(c, `s44 the eye passes floor ${f.k}`) });
    });
    const sk = S.cue('s44', 'streaks[0]');
    S.place(whoosh({ dur: (out.sample - sk.sample) / SR, f0: 150, f1: 4500, q: 0.7, peak: 0.95, seed: 'burst' }), sk.sample, { stem: 'sfx', gain: dB(-25), hall: 0.3, group: 'fx', ...L(sk, 's44 the streaks: up and out of the shaft') });
    S.place(subWhoomp({ f0: 60, f1: 30, dur: 1.1, seed: 's45' }), out.sample, { stem: 'sfx', gain: dB(-16), group: 'sub', ...L(out, 's45 out of the shaft') });
    // the highest point: the great drum twice, the sub, a burst of glass (the beams); at 'hush' all of it stops
    S.place(taiko({ size: 'o', vel: 0.95, seed: 'top1' }), top, { stem: 'sfx', gain: dB(-7), hall: 0.4, group: 'taiko', ...L(peak, 's45 the highest point'), probe: { band: [40, 200] } });
    S.place(taiko({ size: 'o', vel: 0.8, seed: 'top2' }), top + T(0.33), { stem: 'sfx', gain: dB(-10), hall: 0.4, group: 'taiko' });
    S.place(subWhoomp({ f0: 58, f1: 29, dur: 1.4, seed: 'top' }), top, { stem: 'sfx', gain: dB(-15), group: 'sub' });
    S.place(shimmer({ dur: 1.6, rate: (u) => 160 * (1 - u), fLo: 4000, fHi: 12000, spread: 0.9, seed: 'top', amp: 0.2 }), top, { stem: 'sfx', gain: dB(-23), hall: 0.45, group: 'glints' });
    ['D6', 'F#6', 'A6', 'D7'].forEach((n, k) => S.place(glassTink({ f: midiHz(nn(n)), vel: 0.6, seed: `top${k}`, decay: 1.4 }), top + T(0.04 * k), { stem: 'sfx', gain: dB(-26), pan: -0.45 + 0.3 * k, hall: 0.5, group: 'glass' }));
    // and one note is left: the 4′ flute on D5, sounding D6, fading into s46
    const fade = curve([[cut / SR, 1], [st('s46') / SR + 1, 0, 'cos']]);
    S.organ({ midi: nn('D5'), s0: top, s1: st('s46') + T(1), stops: ['FL4'], level: -23, env: fade, hall: 0.6, release: 1.5, ...L(peak, 's45 the single note (from the highest point)') });
    S.note('s45 the tutti stops', cut, { ref: hush.ref });
  }

  // ------------------------------------------------------------------------------------ s46–s47: the tail
  // the choir's tail under the stars gathering into rings (a glitter as they close), and in s47's black one
  // ping, on card 9's second beat
  if (live(st('s46'), en('s47'))) {
    const c0 = S.cue('s46', 'cut.t', 0.4, 'the choir breathes in after the cut'), z = st('s47') + T(1.5);
    [['S', 'A4'], ['A', 'F#4'], ['T', 'D4'], ['B', 'D3']].forEach(([part, n], k) => S.choir({ part, midi: nn(n), s0: c0.sample, s1: z, vowel: 'u', dyn: 0.3, level: -16, attack: 1.2, release: 1.8, seed: 's46', hall: 0.7, ...(k === 0 ? L(c0, 's46 the choir’s tail') : {}) }));
    const h0 = S.cue('s46', 'hexReveal[0]'), h1 = S.cue('s46', 'hexReveal[1]');
    S.place(shimmer({ dur: (h1.sample - h0.sample) / SR + 0.5, rate: (u) => 6 + 30 * Math.sin(Math.PI * Math.min(1, u * 1.1)), fLo: 3500, fHi: 8000, spread: 0.7, seed: 'hex', amp: 0.08 }), h0.sample, { stem: 'sfx', gain: dB(-31), hall: 0.6, group: 'glints', ...L(h0, 's46 the stars gather into rings') });
    const p = S.cue('s47', 'ping');
    S.place(ping({ tau: 0.35 }), p.sample, { stem: 'sfx', gain: dB(-17), hall: 0.8, group: 'ping', ...L(p, 's47 a single ping'), probe: { band: [700, 1400] } });
  }

  // ------------------------------------------------------------------------------------ s48–s49: the end
  // the last ping on the cut; its echo comes home, five arcs closing in on the ring (each a nearer, drier ping),
  // the last one shutting it; the mark is whole on the final chord, held through the afterglow and let go as
  // the last of it is gone (s49 dark)
  if (live(st('s48'), en('s49'))) {
    const pg = S.cue('s48', 'ping'), ch = S.cue('s48', 'chord'), dk = S.cue('s49', 'dark');
    S.place(ping({ tau: 0.5 }), pg.sample, { stem: 'sfx', gain: dB(-15), hall: 1.0, group: 'ping', ...L(pg, 's48 the last ping'), probe: { band: [700, 1400] } });
    Q('s48').land.forEach((_, k) => {
      const c = S.cue('s48', `land[${k}]`);
      S.place(ping({ tau: 0.08 + 0.02 * k, attack: 0.002 }), c.sample, { stem: 'sfx', gain: dB(-33 + 2 * k), hall: 0.9 - 0.15 * k, group: 'ping', ...L(c, `s48 echo arc ${k + 1} comes home`) });
    });
    const cl = S.cue('s48', 'close');
    S.place(glassTink({ f: midiHz(nn('D6')), vel: 0.5, seed: 'ring', decay: 1.0 }), cl.sample, { stem: 'sfx', gain: dB(-28), hall: 0.5, group: 'glass', ...L(cl, 's48 the ring shuts') });
    const s0 = ch.sample, s1 = dk.sample;
    for (const n of ['A3', 'D4', 'F#4', 'A4', 'D5']) S.organ({ midi: nn(n), s0, s1, stops: REG.chorale, level: -28.5, hall: 0.65, attack: 1, release: 1.8 });
    S.organ({ midi: nn('D2'), s0, s1, stops: REG.pedalMid, level: -24.5, pedal: true, hall: 0.65, attack: 1, release: 1.8, ...L(ch, 's48 the final chord (the mark whole)') });
    [['S', 'D5'], ['A', 'A4'], ['T', 'F#4'], ['B', 'D3']].forEach(([part, n]) => S.choir({ part, midi: nn(n), s0, s1, vowel: 'a', dyn: 0.55, level: -15.5, attack: 0.5, release: 1.6, seed: 's48', hall: 0.7 }));
    S.note('s49 the afterglow gone: the chord lets go', s1, { ref: dk.ref });
  }

  // ------------------------------------------------------------------------------------ s50: the coda
  // in the dark a page is turned close by (s01 again), lifted and landing; a point of steel blue kindles (the
  // next reader) and pings once, very far; the film's last second fades it out (render.mjs)
  if (live(st('s50'), en('s50'))) {
    const p0 = S.cue('s50', 'page[0]'), p1 = S.cue('s50', 'page[1]'), dt = S.cue('s50', 'dot'), pg = S.cue('s50', 'ping');
    const p = pageTurn({ kind: 'near', seed: 's50', vel: 0.75, lift: (p1.sample - p0.sample) / SR });
    S.place(p.x, p1.sample, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-18), pan: 0.3, room: 0.12, group: 'pages', ...L(p1, 's50 the page turn (landing): s01 again') });
    S.place(sparkle({ f: 6500, tau: 0.08, seed: 'next', amp: 0.25 }), dt.sample, { stem: 'sfx', gain: dB(-34), pan: -0.2, hall: 0.6, group: 'glints', ...L(dt, 's50 the next reader kindles') });
    S.place(ping({ tau: 0.3 }), pg.sample, { stem: 'sfx', gain: dB(-34), hall: 1.0, pan: -0.2, group: 'ping', ...L(pg, 's50 a very distant ping') });
  }
  return [P44];
}
