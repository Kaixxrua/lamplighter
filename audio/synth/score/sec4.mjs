// The end of section 3 (s27–s29: D major, eight o'clock, the cranes) and section 4, 新的读者 (s30–s43), timed
// from the shots' CUES: every sync point is a cue, a cue plus a stated offset, or a beat of a Span whose two
// ends are cues (tempo.mjs spanOn), and the log carries the ref, so the QA derives each one again from the raw
// cue rows. Where a Span's beat is also a cue of the picture, the cue is used and checked against the beat.
//
// Tempo (screenplay §七): s27 has no beat until the sheet stops on eight (2.0 s: D major, the bells every half
// second); s28 → s30 accelerates from 60 to 72 BPM over its first three quarters and holds (18 beats, 3/4: the
// cranes take off on beat 2, the words in the air on the half-beats 5½–7½, the readers' lamps on 9–11, the
// reader's own on 12, the landing on 14, the books from 14½); s30 is free (the beat disappears); s31 → s35 is
// 90 BPM (33 beats, 3/4, every cut on a bar line; the glyphs land on beats 12–20, 22, 28 and 32); s35–s37 free
// (the spark, the doors on the eighths of beats 38–41 and the open on 42, the stretched 160 ms); s38 → s42
// 90 BPM (30 beats); s43 speeds up from 90 to 180 BPM exponentially, thirteen beats, the thirteenth s44's tutti.
import { SR, nn, midiHz, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { curve, clamp } from '../lib/dsp.mjs';
import { ping, celesta, glassTink, glassHarmonica, taiko, bell, knock } from '../inst/perc.mjs';
import { air, whoosh, ignite, sparkle, shimmer, flash, pageTurn, ash, key, tick, pop, subWhoomp, wings, ink } from '../inst/fx.mjs';
import { padNote } from '../inst/pad.mjs';
import { spanOn } from './tempo.mjs';
import { organBlock, choirBlock, tonesAt, chordAt, shotPlan } from './orch.mjs';
import { REG } from './sec2.mjs';

const T = (sec) => Math.round(sec * SR);

export function sec4(S, H) {
  const C = S.cues;
  const st = (id) => C.start(id), en = (id) => C.end(id);
  const live = (a, b) => S.live(a - T(1), b + T(12));
  const Q = (id) => C.cues(id);
  // a beat of a Span that the picture marks too: the cue, checked against the beat (≤ 6 ms: the CUES round to 2–3 decimals)
  const on = (sp, k, id, p) => {
    const c = S.cue(id, p), d = (c.sample - sp.beat(k)) / SR;
    if (Math.abs(d) > 0.006) console.error(`sec4: ${id}.${p} is ${(1000 * d).toFixed(1)} ms off beat ${k}: the bar plan needs the new picture`);
    return c;
  };
  const L = (c, name) => ({ name, ref: c.ref }); // a logged sync point

  // ------------------------------------------------------------------------------------ tempo and chords
  const sp28 = spanOn(S.cue('s28', 'cut.t'), S.cue('s30', 'cut'), 18, { bpm0: 60, ramp: 0.75 });
  const sp31 = spanOn(S.cue('s31', 'cut'), S.cue('s35', 'cut'), 33);
  const sp38 = spanOn(S.cue('s38', 'cut'), S.cue('s42', 'cut'), 30);
  const sp43 = spanOn(S.cue('s43', 'cut.t'), S.cue('s44', 'cut.t'), 13, { ratio: 2 });
  const b28 = (k) => sp28.beat(k), b31 = (k) => sp31.beat(k), b38 = (k) => sp38.beat(k), b43 = (k) => sp43.beat(k);

  const P27 = shotPlan(S, [
    { at: S.cue('s27', 'stop'), q: 'D', B: 'D2', note: 's27 stop: 08:00, the watch is over (§七 1:56)' },
    { at: S.beat(sp28, 3), q: 'Em7', B: 'E2', note: 's28 beat 3' },
    { at: S.beat(sp28, 6), q: 'D', B: 'F#2', note: 's28 beat 6' },
    { at: on(sp28, 9, 's29', 'lamps.beats[0]'), q: 'G', B: 'G2', note: 's29 beat 9: the readers’ lamps' },
    { at: on(sp28, 12, 's29', 'lamps.own'), q: 'D', B: 'A2', note: 's29 beat 12: the reader’s own lamp' },
    { at: on(sp28, 15, 's29', 'books[1]'), q: 'A7sus4', B: 'A2', note: 's29 beat 15: a book' },
    { at: on(sp28, 17, 's29', 'books[7]'), q: 'A7', B: 'A2', note: 's29 beat 17: a book' },
  ], { from: H, end: S.cue('s30', 'cut').sample, name: 'P27 (s27–s29)' });

  const ret = S.cue('s37', 'return');
  const P30 = shotPlan(S, [
    { at: S.cue('s30', 'cut'), q: 'Bsus4', B: 'B1', note: 's30 cut: Act III' },
    { at: S.cue('s31', 'cut'), q: 'Bsus4(7)', B: 'B1', note: 's31 cut, beat 0' },
    { at: on(sp31, 6, 's31', 'turns[2]'), q: 'Gsus2', B: 'G1', note: 's31 beat 6: the dive' },
    { at: on(sp31, 9, 's32', 'cut'), q: 'Esus4(7)', B: 'E2', note: 's32 cut, beat 9' },
    { at: S.beat(sp31, 15), q: 'Asus4', B: 'A1', note: 's32 beat 15' },
    { at: on(sp31, 21, 's33', 'cut'), q: 'Bsus4', B: 'B1', note: 's33 cut, beat 21' },
    { at: on(sp31, 27, 's34', 'cut'), q: 'F#sus4(7)', B: 'F#2', note: 's34 cut, beat 27' },
    { at: ret, q: 'D', B: 'D2', note: 's37 return: the impact' },
    { at: S.cue('s38', 'cut'), q: 'Gmaj7', B: 'G2', note: 's38 cut, beat 0' },
    { at: S.beat(sp38, 6), q: 'F#m7', B: 'F#2', note: 's38 beat 6' },
    { at: on(sp38, 9, 's39', 'cut'), q: 'Em7', B: 'E2', note: 's39 cut, beat 9' },
    { at: S.beat(sp38, 12), q: 'A7sus4', B: 'A2', note: 's39 beat 12' },
    // s40: the motif again, new harmony under it (D A G A F♯ E D); the old book opens on its E (beat 21)
    { at: on(sp38, 15, 's40', 'cut'), q: 'Bm7', B: 'B1', S: 'D5', note: 's40 motif D' },
    { at: S.beat(sp38, 17), q: 'F#m7', B: 'F#2', S: 'A5', note: 's40 motif A' },
    { at: S.beat(sp38, 18), q: 'Em7', B: 'E2', S: 'G5', note: 's40 motif G' },
    { at: S.beat(sp38, 19), q: 'D', B: 'F#2', S: 'A5', note: 's40 motif A' },
    { at: S.beat(sp38, 20), q: 'Gmaj7', B: 'G2', S: 'F#5', note: 's40 motif F♯' },
    { at: on(sp38, 21, 's40', 'open'), q: 'A', B: 'A2', S: 'E5', note: 's40 open: motif E' },
    { at: S.beat(sp38, 22), q: 'G', B: 'B1', S: 'D5', note: 's40 motif D' },
    { at: on(sp38, 26, 's41', 'ribbon'), q: 'D', B: 'D2', note: 's41 the ribbon: adopted' },
    { at: S.cue('s43', 'cut.t'), q: 'A7sus4', B: 'A1', note: 's43 cut' },
    { at: S.beat(sp43, 8), q: 'A7', B: 'A1', note: 's43 beat 8' },
  ], { from: P27, end: S.cue('s44', 'cut.t').sample, name: 'P30 (s30–s43)' });
  const k30 = (s) => chordAt(P30, s);
  on(sp38, 24, 's41', 'cut'); // the cuts inside the spans stay on their bar lines (the others are chords' cues above)

  // ------------------------------------------------------------------------------------ s27: eight o'clock
  // the radar's last two pings (its beat, a second apart since s16), then the sheet stops on eight: D major,
  // and the clock strikes eight, a bell (a major third, every partial in the new key) for each row of the
  // letter as it is written, the row's print a run of soft ticks
  if (live(st('s27'), en('s27'))) {
    Q('s27').pings.forEach((_, k) => {
      const c = S.cue('s27', `pings[${k}]`);
      S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-19), hall: 0.75, group: 'ping', ...L(c, `s27 ping ${k}`), probe: k === 0 ? { band: [700, 1400] } : undefined });
    });
    organBlock(S, P27, 0, 0, { manual: { stops: REG.chorale, level: -27 }, pedal: { stops: REG.pedalMid, level: -24 }, hall: 0.6, attack: 1.4 });
    choirBlock(S, P27, 0, 0, { vowel: 'a', dyn: 0.5, level: -15, attack: 0.6, release: 0.8, parts: 'SAT', hall: 0.65, seed: 's27' });
    const r = new Rng('s27print');
    Q('s27').bells.forEach((_, k) => {
      const c = S.cue('s27', `bells[${k}]`);
      S.place(bell({ f: midiHz(nn('D4')), vel: 0.72 + 0.04 * ((k * 5) % 3), seed: `eight${k}`, tierce: 'major' }), c.sample, { stem: 'music', gain: dB(-19), pan: 0.15, hall: 0.6, group: 'bell', ...L(c, `s27 the bell, stroke ${k + 1}`) });
      const l0 = S.cue('s27', `lines[${k}][0]`), l1 = S.cue('s27', `lines[${k}][1]`), nt = 10;
      for (let j = 0; j < nt; j++) {
        const s = l0.sample + Math.round(((l1.sample - l0.sample) * j) / nt) + (j ? T(0.004 * r.bi()) : 0);
        S.place(tick({ f: 2300 + 200 * r.next(), seed: `l${k}t${j}`, amp: 0.6 }), s, { stem: 'sfx', gain: dB(-33), pan: -0.3 + 0.06 * j, room: 0.3, group: 'ticks', ...(j === 0 ? L(l0, `s27 row ${k + 1} written`) : {}) });
      }
    });
  }

  // ------------------------------------------------------------------------------------ s28–s29: the cranes
  if (live(st('s28'), en('s29'))) {
    const a = st('s28'), z = st('s30');
    organBlock(S, P27, 1, 6, { manual: { stops: REG.strings, level: -30 }, pedal: { stops: REG.pedalMid, level: -25 }, skip: [0], hall: 0.6 });
    choirBlock(S, P27, 1, 6, { vowel: 'a', dyn: (t) => 0.35 + 0.25 * clamp((t - a / SR) / ((z - a) / SR)), level: -16, attack: 0.4, parts: 'ATB', hall: 0.65, seed: 's28' });
    // the folds: each step's creases scored by the light (a fine scratch of ink), then folded (a short turn)
    Q('s28').fold.forEach((f, i) => {
      const sc = S.cue('s28', `fold[${i}].score`), f0 = S.cue('s28', `fold[${i}].fold[0]`), f1 = S.cue('s28', `fold[${i}].fold[1]`);
      S.place(ink({ dur: 0.14, seed: `score${i}`, vel: 0.45 }), sc.sample, { stem: 'sfx', gain: dB(-31), pan: -0.2, room: 0.3, group: 'ink', ...L(sc, `s28 the ${f.step} scored`) });
      const p = pageTurn({ kind: 'far', seed: `fold${i}`, vel: 0.5, lift: (f1.sample - f0.sample) / SR });
      S.place(p.x, f1.sample, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-23), pan: -0.2, room: 0.3, group: 'pages', ...L(f1, `s28 the ${f.step} folded`) });
    });
    // the takeoff on beat 2: the crane's first downstroke; then the flock lifts, a ripple round the shaft,
    // thickest once all are up and thinning upward as the letters land on the readers' cases (s29)
    const to = on(sp28, 2, 's28', 'takeoff');
    S.place(whoosh({ dur: 0.36, f0: 500, f1: 1700, q: 0.9, peak: 0.4, seed: 'stroke' }), to.sample, { sync: T(0.144), stem: 'sfx', gain: dB(-25), pan: -0.15, room: 0.3, group: 'wings', ...L(to, 's28 the crane takes off (its first downstroke)') });
    const f0 = S.cue('s28', 'flock[0]'), f1 = S.cue('s28', 'flock[1]'), w1 = S.cue('s29', 'letters.span[1]').sample;
    const up = (f1.sample - f0.sample) / (w1 - f0.sample);
    S.place(wings({ dur: (w1 - f0.sample) / SR, voices: 48, density: (u) => (u < up ? u / up : 1 - (0.7 * (u - up)) / (1 - up)), band: (u) => 1800 + 1400 * u, seed: 'cranes', amp: 0.2 }), f0.sample, { stem: 'sfx', gain: dB(-11), hall: 0.3, room: 0.2, group: 'wings', ...L(f0, 's28 the flock takes off') });
    // the five streams form (each over 2 s), a word written in the air in each on the half-beats: a glass note a word
    Q('s28').streams.forEach((_, j) => {
      const c = S.cue('s28', `streams[${j}]`);
      S.place(shimmer({ dur: 2.0, rate: (u) => 10 + 30 * u, fLo: 3000 + 500 * j, fHi: 8000 + 600 * j, pan: () => -0.6 + 0.3 * j, spread: 0.2, seed: `stream${j}`, amp: 0.1 }), c.sample, { stem: 'sfx', gain: dB(-31), hall: 0.35, group: 'glints', ...L(c, `s28 stream ${j + 1} forms`) });
    });
    Q('s28').labels.forEach((l, j) => {
      const c = on(sp28, 5.5 + 0.5 * j, 's28', `labels[${j}].t`), lad = tonesAt(P27, c.sample, nn('D6'), nn('D7'));
      S.place(glassTink({ f: midiHz(lad[Math.min(lad.length - 1, j)]), vel: 0.5, seed: `label${j}`, decay: 1.0 }), c.sample, { stem: 'sfx', gain: dB(-28), pan: -0.6 + 0.3 * j, hall: 0.4, group: 'glass', ...L(c, `s28 '${l.channel}' written`) });
    });
    // the rising pad: each chord's tones in a window that climbs an octave over the two shots
    for (let k = 1; k <= 6; k++) {
      const s0 = P27.starts[k], s1 = k < 6 ? P27.starts[k + 1] : z;
      const lo = nn('D4') + Math.round((12 * (s0 - a)) / (z - a));
      for (const m of tonesAt(P27, s0, lo, lo + 11)) {
        const pd = padNote({ midi: m, t0: s0 / SR, dur: (s1 - s0) / SR, attack: 0.35, release: 0.5, cutoff: (t) => 800 + 2200 * clamp((s0 / SR + t - a / SR) / ((z - a) / SR)), res: 0.8, level: 0.014, width: 0.7, seed: `rise${k}:${m}` });
        S.place(pd, s0, { stem: 'music', hall: 0.35, group: 'pad' });
      }
    }
    // the organ's ostinato runs on in eighths (the montage's flutes), until the flute takes the tune
    const contour = [0, 2, 1, 3, 2, 4];
    for (let e = 0; e < 18; e++) {
      const s = b28(e / 2), s1 = b28((e + 1) / 2);
      const lad = tonesAt(P27, s, nn('G4'), nn('D6'));
      const m = lad[Math.min(lad.length - 1, Math.max(0, Math.floor(lad.length / 2) - 2) + contour[e % 6])];
      S.organ({ midi: m, s0: s, s1: s + Math.round(0.85 * (s1 - s)), stops: ['RF8', 'FL4', 'NZ'], level: e % 6 === 0 ? -27 : -29.5, hall: 0.45, release: 0.7 });
    }
    // s29: the flute stop takes the tune on the readers' lamps (beats 9–12); from the crane's landing (beat 14) a
    // note for each book that lights, quickening to the quarters, the 4–3 over the dominant on beat 17 and the
    // last note held into the cut
    const LAMPS = [[9, 'lamps.beats[0]', 'B4'], [10, 'lamps.beats[2]', 'D5'], [11, 'lamps.beats[4]', 'G5'], [12, 'lamps.own', 'F#5']];
    const BOOKS = ['F#5', 'E5', 'D5', 'G5', 'A5', 'G5', 'D5', 'C#5', 'E5', 'A5']; // books[0..9]: beats 14½ … 17½
    const land = on(sp28, 14, 's29', 'land');
    const tune = [...LAMPS.map(([k, p, n]) => ({ c: on(sp28, k, 's29', p), n })), { c: land, n: 'E5' }, ...BOOKS.map((n, i) => ({ c: S.cue('s29', `books[${i}]`), n }))];
    tune.forEach(({ c, n }, i) => {
      const s1 = i < tune.length - 1 ? tune[i + 1].c.sample - T(0.03) : z;
      const name = i === 0 ? 's29 the flute takes the tune (the readers’ lamps)' : i === LAMPS.length ? 's29 the crane lands' : i > LAMPS.length ? `s29 book ${i - LAMPS.length} lights` : `s29 lamp beat ${LAMPS[i][0]}`;
      S.organ({ midi: nn(n), s0: c.sample, s1, stops: ['RF8', 'FL4'], level: i > LAMPS.length ? -24 : -23, hall: 0.5, panScale: 0.3, name, ref: c.ref });
    });
    // the readers' lamps: the five widest a glass note each, climbing; the many more a shimmer, a few then many
    const ls0 = S.cue('s29', 'lamps.span[0]'), ls1 = S.cue('s29', 'lamps.span[1]');
    S.place(shimmer({ dur: (ls1.sample - ls0.sample) / SR + 0.3, rate: (u) => 8 + 90 * u * u, fLo: 4000, fHi: 9000, spread: 0.8, seed: 'lamps', amp: 0.12 }), ls0.sample, { stem: 'sfx', gain: dB(-29), hall: 0.4, group: 'glints' });
    Q('s29').lamps.beats.forEach((_, k) => {
      const c = S.cue('s29', `lamps.beats[${k}]`), lad = tonesAt(P27, c.sample, nn('D6'), nn('D7'));
      S.place(glassTink({ f: midiHz(lad[Math.min(lad.length - 1, k)]), vel: 0.5, seed: `lamp${k}`, decay: 1.2 }), c.sample, { stem: 'sfx', gain: dB(-29), pan: -0.5 + 0.25 * k, hall: 0.4, group: 'glass', ...L(c, `s29 the readers’ lamps ${k + 1}`) });
    });
    // the letters land on the readers' cases (a tap each, spread over their span), the crane on the reader's own
    const lt0 = S.cue('s29', 'letters.span[0]'), lt1 = S.cue('s29', 'letters.span[1]'), nl = Q('s29').letters.n;
    for (let k = 0; k < nl; k++) {
      const s = lt0.sample + Math.round(((lt1.sample - lt0.sample) * k) / (nl - 1));
      const p = pageTurn({ kind: 'far', seed: `letter${k}`, vel: 0.35, lift: 0.18 });
      S.place(p.x, s, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-29), pan: -0.6 + (1.2 * k) / (nl - 1), room: 0.3, group: 'pages', ...(k === 0 ? L(lt0, 's29 the first letter lands') : k === nl - 1 ? L(lt1, 's29 the last letter lands') : {}) });
    }
    const pl = pageTurn({ kind: 'far', seed: 'own', vel: 0.5, lift: 0.22 });
    S.place(pl.x, land.sample, { sync: Math.round(pl.land * SR), stem: 'sfx', gain: dB(-25), room: 0.3, group: 'pages' });
  }

  // ------------------------------------------------------------------------------------ s30: Act III
  // the beat disappears: cold pulses where it was, unevenly spaced (the first on the cut, the dust's flash;
  // one as the reader's scan starts, one as it ends), the scan itself a thin high glitter along the rows
  if (live(st('s30'), en('s30'))) {
    const c = S.cue('s30', 'cut'), a = c.sample, sc0 = S.cue('s30', 'scan[0]'), sc1 = S.cue('s30', 'scan[1]');
    S.place(whoosh({ dur: 0.5, f0: 6000, f1: 800, q: 1.5, peak: 0.3, seed: 's30' }), a, { stem: 'sfx', gain: dB(-30), hall: 0.3, group: 'fx', ...L(c, 's30 the cut into Act III') });
    organBlock(S, P30, 0, 0, { manual: { stops: ['SAL'], level: -40 }, skip: [0, 1, 2], pedal: { stops: REG.pedalSoft, level: -30 }, hall: 0.6 });
    const x = air({ dur: (en('s30') - a) / SR + 1, seed: 's30', howl: 0.3, hiss: 0.6 });
    S.place(x, a, { stem: 'amb', gain: dB(-40), hall: 0.1, group: 'air' });
    const pulses = [[c, 's30 a cold pulse on the cut'], [sc0, 's30 the scan starts'], [S.cue('s30', 'scan[0]', 1.25, 'a pulse between the scan’s ends, off any beat')], [S.cue('s30', 'scan[0]', 2.55, 'a pulse between the scan’s ends, off any beat')], [sc1, 's30 the scan ends']];
    pulses.forEach(([p, name], i) => {
      const s = p.sample;
      for (const m of tonesAt(P30, s, nn('B3'), nn('B4'))) S.place(padNote({ midi: m, t0: s / SR, dur: 0.35, attack: 0.008, release: 0.4, cutoff: (u) => 600 + 2400 * Math.exp(-u / 0.12), res: 1.2, level: 0.02, width: 0.5, seed: `pulse${i}:${m}` }), s, { stem: 'music', hall: 0.45, group: 'synth' });
      S.note(name || `s30 a cold pulse (${i + 1})`, s, { ref: p.ref });
      if (i % 2 === 0) S.place(sparkle({ f: 9000 + 700 * i, tau: 0.05, seed: `cold${i}`, amp: 0.3 }), s, { stem: 'sfx', gain: dB(-30), pan: 0.4 - 0.2 * i, hall: 0.4, group: 'glints' });
    });
    S.place(shimmer({ dur: (sc1.sample - sc0.sample) / SR, rate: () => 22, fLo: 6500, fHi: 10500, pan: (u) => -0.5 + u, spread: 0.15, seed: 'scan', amp: 0.07 }), sc0.sample, { stem: 'sfx', gain: dB(-31), hall: 0.3, group: 'glints' });
  }

  // ------------------------------------------------------------------------------------ s31–s34: 90 BPM
  if (live(st('s31'), en('s34'))) {
    const z = st('s35');
    const r = new Rng('arps');
    // three layers of cold plucks: eighths from beat 0, sixteenths from beat 3, offset sixteenths from 6;
    // s33 thins to the first layer; s34 brings them back; everything stops dead on the s35 cut
    const pluck = (m, s, lvl, seed) => {
      const pd = padNote({ midi: m, t0: s / SR, dur: 0.12, attack: 0.004, release: 0.18, cutoff: (u) => 300 + 2600 * Math.exp(-u / 0.07), res: 1.1, level: lvl, width: 0.6, seed });
      S.place(pd, s, { stem: 'music', hall: 0.25, room: 0.15, group: 'synth' });
    };
    const thin = (k) => k >= 21 && k < 27; // s33
    const L1 = [0, 2, 1, 3, 2, 1], L2 = [0, 1, 2, 3, 4, 3, 2, 1], L3 = [4, 2, 3, 1];
    for (let e = 0; e < 66; e++) { // eighths over the 33 beats
      const s = b31(e / 2), lad = tonesAt(P30, s, nn('B3'), nn('B5'));
      pluck(lad[Math.min(lad.length - 1, L1[e % 6])], s, 0.045, `l1:${e}`);
    }
    for (let q = 12; q < 132; q++) { // sixteenths from beat 3
      const k = q / 4;
      if (thin(k)) continue;
      const s = b31(k), lad = tonesAt(P30, s, nn('E4'), nn('E6'));
      pluck(lad[Math.min(lad.length - 1, 2 + L2[q % 8])], s, 0.032, `l2:${q}`);
    }
    for (let q = 24; q < 132; q++) { // the off-sixteenths from beat 6, an octave up
      const k = q / 4;
      if (thin(Math.floor(k)) || q % 2 === 0) continue;
      const s = b31(k), lad = tonesAt(P30, s, nn('B5'), nn('B6'));
      pluck(lad[Math.min(lad.length - 1, L3[(q >> 1) % 4])], s, 0.022, `l3:${q}`);
    }
    // the bass on every bar line
    for (let b = 0; b < 33; b += 3) {
      const c = b === 0 ? S.cue('s31', 'cut') : null, s = b31(b), m = P30.V[k30(s)].v[3];
      S.place(padNote({ midi: m, t0: s / SR, dur: 0.5, attack: 0.005, release: 0.3, cutoff: (u) => 200 + 700 * Math.exp(-u / 0.1), res: 0.9, level: 0.05, width: 0.2, seed: `bass${b}` }), s, { stem: 'music', hall: 0.2, group: 'synth', ...(c ? L(c, 's31 the arpeggios begin') : {}) });
    }
    // the fish school: a shoal of glints over s31, a flare on the corner and on the merge, a fall on the dive
    S.place(shimmer({ dur: 5.5, rate: (u) => 20 + 40 * Math.sin(Math.PI * u), fLo: 5000, fHi: 11000, pan: (u) => -0.6 + 1.2 * u, spread: 0.2, seed: 'shoal', amp: 0.12 }), S.cue('s31', 'cut', 0.2, 'the shoal comes out of the doorway').sample, { stem: 'sfx', gain: dB(-26), hall: 0.3, group: 'glints' });
    ['the corner', 'the merge'].forEach((what, j) => {
      const c = on(sp31, [3, 5][j], 's31', `turns[${j}]`);
      S.place(shimmer({ dur: 0.6, rate: (u) => 90 * (1 - u), fLo: 6000, fHi: 11000, pan: () => (j ? 0.3 : -0.3), spread: 0.5, seed: `turn${j}`, amp: 0.15 }), c.sample, { stem: 'sfx', gain: dB(-28), hall: 0.3, group: 'glints', ...L(c, `s31 ${what}`) });
    });
    const dv = S.cue('s31', 'turns[2]');
    S.place(whoosh({ dur: 1.0, f0: 3000, f1: 400, q: 0.9, peak: 0.25, seed: 'dive31' }), dv.sample, { sync: T(0.25), stem: 'sfx', gain: dB(-29), hall: 0.35, group: 'fx', ...L(dv, 's31 the dive') });
    // a glyph lands, printed into the book: a heavy knock with a dull body under it
    const glyph = (c, name, vel = 0.9) => {
      S.place(knock({ f: 520, vel, seed: `g:${name}`, metal: 0.2 }), c.sample, { stem: 'sfx', gain: dB(-21), room: 0.35, hall: 0.15, group: 'knock', ...L(c, name) });
      S.place(subWhoomp({ f0: 90, f1: 55, dur: 0.25, seed: `g:${name}` }), c.sample, { stem: 'sfx', gain: dB(-28), group: 'sub' });
    };
    // s32: the machinery knocks in a mechanical figure; the chords hang; five lines land, a bar then every two beats
    if (live(st('s32'), en('s32'))) {
      const fig = [1, 0, 0.6, 1, 0, 0.6];
      const c32 = on(sp31, 9, 's32', 'cut');
      for (let e = 18; e < 42; e++) {
        const v = fig[e % 6];
        if (!v) continue;
        S.place(knock({ f: e % 6 === 0 ? 700 : 950, vel: 0.5 + 0.4 * v, seed: `kn${e}`, metal: 0.35 }), b31(e / 2), { stem: 'sfx', gain: dB(-22 - 4 * (1 - v)), pan: e % 2 ? 0.35 : -0.25, room: 0.35, group: 'knock', ...(e === 18 ? L(c32, 's32 the machinery') : {}) });
      }
      for (let k = 3; k <= 4; k++) {
        const s0 = P30.starts[k], s1 = P30.starts[k + 1];
        for (const m of tonesAt(P30, s0, nn('E3'), nn('E5'))) S.place(padNote({ midi: m, t0: s0 / SR, dur: (s1 - s0) / SR, attack: 0.3, release: 0.4, cutoff: () => 1500, res: 0.8, level: 0.009, width: 0.7, seed: `hang${k}:${m}` }), s0, { stem: 'music', hall: 0.4, group: 'pad' });
      }
      Q('s32').glyphs.forEach((_, k) => glyph(on(sp31, 12 + 2 * k, 's32', `glyphs[${k}]`), `s32 line ${k + 1} lands`));
      for (let j = 0; j < 9; j++) S.place(key({ seed: `s32k${j}`, vel: 0.5 }), S.cue('s32', 'cut', 1.1 + 0.6 * j + 0.11 * r.bi(), 'keys under the print').sample, { stem: 'sfx', gain: dB(-30), pan: 0.4, room: 0.3, group: 'keys' });
    }
    // s33: the sixth line lands; the cut on the bar to three floors down; far off, once, a ping; and dust
    if (live(st('s33'), en('s33'))) {
      glyph(on(sp31, 22, 's33', 'glyphs[0]'), 's33 line 6 lands');
      const x = S.cue('s33', 'cross');
      S.place(whoosh({ dur: 0.7, f0: 1200, f1: 250, q: 0.8, peak: 0.3, seed: 'cross' }), x.sample, { sync: T(0.21), stem: 'sfx', gain: dB(-33), hall: 0.4, group: 'fx', ...L(x, 's33 the cut, three floors down') });
      const pg = on(sp31, 25, 's33', 'ping');
      S.place(ping({ tau: 0.35 }), pg.sample, { stem: 'sfx', gain: dB(-27), hall: 1.0, pan: -0.3, group: 'ping', ...L(pg, 's33 a distant ping'), probe: { band: [700, 1400] } });
      S.place(ash({ dur: 2.2, seed: 's33', vel: 0.4, bright: 0.3 }), S.cue('s33', 'cut', 0.8, 'dust in the light').sample, { stem: 'sfx', gain: dB(-32), pan: 0.3, room: 0.3, group: 'ash' });
    }
    // s34: the seventh line lands; the eighth comes a tap at a time, the taps further apart and heavier, pressed
    // home in two heaves (the second its landing); the suspension swells into the cut
    if (live(st('s34'), en('s34'))) {
      glyph(on(sp31, 28, 's34', 'glyphs[0]'), 's34 line 7 lands');
      const g8 = on(sp31, 32, 's34', 'glyphs[1]');
      [-2.03, -1.83, -1.58, -1.28, -0.93].forEach((d, j) => S.place(knock({ f: 760 - 40 * j, vel: 0.45 + 0.1 * j, seed: `tap${j}`, metal: 0.3 }), S.cue('s34', 'glyphs[1]', d, 'the eighth line’s taps, further apart, heavier').sample, { stem: 'sfx', gain: dB(-28 + 1.5 * j), pan: 0.15, room: 0.3, group: 'knock' }));
      const hv = S.cue('s34', 'glyphs[1]', -0.53, 'the first heave');
      S.place(subWhoomp({ f0: 80, f1: 45, dur: 0.35, seed: 'heave' }), hv.sample, { stem: 'sfx', gain: dB(-26), group: 'sub', ...L(hv, 's34 the first heave') });
      glyph(g8, 's34 line 8 pressed home', 1);
      const a = st('s34');
      const env = curve([[a / SR, 0.3], [z / SR - 0.05, 1, 'cos'], [z / SR, 0]]);
      organBlock(S, P30, 6, 6, { manual: { stops: REG.strings, level: -24 }, pedal: { stops: REG.pedalMid, level: -26 }, env, until: z, release: 0.05, hall: 0.3 });
    }
  }

  // ------------------------------------------------------------------------------------ s35: the spark
  // on the cut the 'ding': a lime spark on the reader's crown; its clock brakes to a standstill in a sixth of a second
  if (live(st('s35'), en('s35'))) {
    const c = S.cue('s35', 'spark'), s = c.sample, sp = S.cue('s35', 'stop');
    S.place(ping({ f: midiHz(nn('B6')), tau: 0.9 }), s, { stem: 'sfx', gain: dB(-17), hall: 0.7, group: 'ping', ...L(c, 's35 the spark (the ding)'), probe: { band: [1500, 3000] } });
    S.place(glassTink({ f: midiHz(nn('B6')), vel: 0.6, seed: 'spark', decay: 1.4 }), s, { stem: 'sfx', gain: dB(-24), hall: 0.5, group: 'glass' });
    S.place(sparkle({ f: 9500, tau: 0.06, seed: 'spark', amp: 0.4 }), s, { stem: 'sfx', gain: dB(-26), hall: 0.3, group: 'glints' });
    const br = whoosh({ dur: (sp.sample - s) / SR + 0.04, f0: 2600, f1: 300, q: 1.4, peak: 0.85, seed: 'brake' });
    S.place(br, sp.sample, { sync: br.length - T(0.04), stem: 'sfx', gain: dB(-31), hall: 0.2, group: 'fx', ...L(sp, 's35 its clock stops') });
  }

  // ------------------------------------------------------------------------------------ s36: seven doors
  // (s36 is a draft on disk: its cues are read like every other shot's, so its final cut re-times this)
  // the doors' names light on the eighths, left to right, a note each (a glass harmonica held under it);
  // on the bar the sixth swings down into the well
  if (live(st('s36'), en('s37'))) {
    const doors = ['D4', 'F#4', 'A4', 'C#5', 'E5', 'G5', 'B5'];
    Q('s36').doors.forEach((_, k) => {
      const c = S.cue('s36', `doors[${k}]`), s = c.sample, f = midiHz(nn(doors[k % doors.length]));
      S.place(glassHarmonica({ f, dur: (st('s37') - s) / SR + 0.8, seed: `door${k}`, attack: 0.25, release: 1.6 }), s, { stem: 'music', gain: dB(-28), pan: -0.6 + 0.2 * k, hall: 0.6, group: 'glass' });
      S.place(celesta({ midi: nn(doors[k % doors.length]) + 12, vel: 0.6, seed: `door${k}` }), s, { stem: 'music', gain: dB(-22), pan: -0.6 + 0.2 * k, hall: 0.4, group: 'celesta', ...L(c, `s36 door ${k + 1}`) });
    });
    const o = S.cue('s36', 'open');
    S.place(whoosh({ dur: 1.2, f0: 300, f1: 2400, q: 0.9, peak: 0.6, seed: 'door' }), o.sample, { stem: 'sfx', gain: dB(-28), pan: 0.4, hall: 0.4, group: 'fx', ...L(o, 's36 the sixth door swings open') });
    S.place(shimmer({ dur: 1.0, rate: () => 30, fLo: 5000, fHi: 10000, pan: () => 0.4, spread: 0.2, seed: 'door', amp: 0.15 }), o.sample, { stem: 'sfx', gain: dB(-28), hall: 0.4, group: 'glints' });
    for (const n of ['D3', 'A3', 'F#4']) S.organ({ midi: nn(n), s0: o.sample, s1: st('s37'), stops: ['RF8', 'SAL'], level: -32, hall: 0.6, attack: 1.5, release: 1.2 });
  }

  // ------------------------------------------------------------------------------------ s37: 160 ms, stretched
  // 160 ms of story over 2.67 s. The query leaves on 'beam' (tool_use): a ping whose hall is stretched, its ring
  // held and swelling (a glass harmonica on its pitch) while the left half beats about in its storm of pages;
  // the return strikes the eye on 'return' (the timer stops at 160 ms): the impact, D major; then the stamp
  if (live(st('s37'), en('s37'))) {
    const bm = S.cue('s37', 'beam'), rt = ret, sm = S.cue('s37', 'labels[2]');
    S.place(ping({ tau: 2.2, length: 7 }), bm.sample, { stem: 'sfx', gain: dB(-21), hall: 1.0, group: 'ping', ...L(bm, 's37 the query leaves (tool_use): the stretched ping'), probe: { band: [700, 1400] } });
    S.place(glassHarmonica({ f: 1000, dur: (rt.sample - bm.sample) / SR, seed: 's37ring', attack: 1.4, release: 0.04 }), bm.sample, { stem: 'sfx', gain: dB(-31), hall: 1.0, group: 'glass' });
    S.place(wings({ dur: (rt.sample - bm.sample) / SR + 0.4, voices: 60, rate: [6, 12], density: (u) => Math.sin(Math.PI * Math.min(1, u * 1.1)), band: () => 2600, centre: -0.6, spread: 0.3, seed: 's37storm', amp: 0.18 }), bm.sample, { stem: 'sfx', gain: dB(-17), hall: 0.3, group: 'storm' });
    const sw = whoosh({ dur: 1.4, f0: 200, f1: 5000, q: 0.8, peak: 0.97, seed: 'swell' });
    S.place(sw, rt.sample - sw.length, { stem: 'sfx', gain: dB(-26), hall: 0.3, group: 'fx' });
    S.place(taiko({ size: 'o', vel: 0.85, seed: 's37' }), rt.sample, { stem: 'sfx', gain: dB(-11), hall: 0.35, group: 'taiko', ...L(rt, 's37 the return strikes (160 ms)'), probe: { band: [40, 200] } });
    S.place(subWhoomp({ f0: 64, f1: 33, dur: 0.9, seed: 's37' }), rt.sample, { stem: 'sfx', gain: dB(-17), group: 'sub' });
    S.place(shimmer({ dur: 1.2, rate: (u) => 120 * (1 - u), fLo: 4000, fHi: 11000, spread: 0.9, seed: 's37burst', amp: 0.2 }), rt.sample, { stem: 'sfx', gain: dB(-24), hall: 0.4, group: 'glints' });
    S.place(pop({ seed: 'stamp', amp: 0.8 }), sm.sample, { stem: 'sfx', gain: dB(-27), pan: 0.3, room: 0.3, group: 'ticks', ...L(sm, 's37 the third label stamps') });
    organBlock(S, P30, 7, 7, { manual: { stops: REG.chorale, level: -26 }, pedal: { stops: REG.pedalChorale, level: -24 }, hall: 0.6, attack: 0.6 });
  }

  // ------------------------------------------------------------------------------------ s38–s39: the card
  // what came back types itself in the air on the score's beats (a key a field), the card's rows on the
  // sixteenths (a tick each), the card unfolds; s39 dissolves to the real page, its nine clients light on the
  // sixteenths, and the dsh page comes to rest
  if (live(st('s38'), en('s39'))) {
    organBlock(S, P30, 8, 11, { manual: { stops: ['RF8', 'FL4'], level: -27 }, pedal: { stops: REG.pedalSoft, level: -26 }, hall: 0.55 });
    const pat = [0, 1, 2, 3, 2, 1], c38 = S.cue('s38', 'cut');
    for (let e = 0; e < 30; e++) {
      const s = b38(e / 2), lad = tonesAt(P30, s, nn('A5'), nn('A6'));
      S.place(celesta({ midi: lad[Math.min(lad.length - 1, pat[e % 6])], vel: e % 6 === 0 ? 0.65 : 0.5, seed: `s38c${e}` }), s, { stem: 'music', gain: dB(e % 6 === 0 ? -23 : -25), pan: 0.25, hall: 0.4, group: 'celesta', ...(e === 0 ? L(c38, 's38 celesta and organ') : {}) });
    }
    Q('s38').fields.forEach((_, k) => {
      const c = S.cue('s38', `fields[${k}]`);
      if (k < 4) S.place(key({ seed: `field${k}`, vel: 0.7 }), c.sample, { stem: 'sfx', gain: dB(-24), pan: -0.2, room: 0.35, group: 'keys', ...L(c, `s38 field ${k + 1} typed`) });
      else S.place(tick({ f: 2400 + 90 * k, seed: `row${k}`, amp: 0.7 }), c.sample, { stem: 'sfx', gain: dB(-30), pan: -0.3 + 0.1 * k, room: 0.3, group: 'ticks', ...L(c, `s38 card row ${k - 3}`) });
    });
    const u0 = S.cue('s38', 'unfold[0]'), u1 = S.cue('s38', 'unfold[1]'), cd = S.cue('s38', 'card');
    S.place(whoosh({ dur: (u1.sample - u0.sample) / SR, f0: 500, f1: 3500, q: 1, peak: 0.9, seed: 'card' }), u0.sample, { stem: 'sfx', gain: dB(-31), hall: 0.3, group: 'fx', ...L(u0, 's38 the card unfolds') });
    S.place(shimmer({ dur: 0.8, rate: () => 35, fLo: 5000, fHi: 10000, spread: 0.5, seed: 'card', amp: 0.12 }), cd.sample, { stem: 'sfx', gain: dB(-29), hall: 0.3, group: 'glints', ...L(cd, 's38 the card is whole') });
    const d0 = S.cue('s39', 'dissolve[0]'), d1 = S.cue('s39', 'dissolve[1]');
    S.place(shimmer({ dur: (d1.sample - d0.sample) / SR, rate: (u) => 15 + 25 * Math.sin(Math.PI * u), fLo: 4500, fHi: 9500, spread: 0.6, seed: 'dissolve', amp: 0.1 }), d0.sample, { stem: 'sfx', gain: dB(-31), hall: 0.35, group: 'glints', ...L(d0, 's39 the card dissolves into the page') });
    Q('s39').clients.forEach((_, k) => {
      const c = S.cue('s39', `clients[${k}]`), lad = tonesAt(P30, c.sample, nn('E6'), nn('E7'));
      S.place(glassTink({ f: midiHz(lad[k % lad.length]), vel: 0.5, seed: `client${k}`, decay: 0.9 }), c.sample, { stem: 'sfx', gain: dB(-27), pan: -0.7 + 0.175 * k, hall: 0.35, group: 'glass', ...L(c, `s39 client ${k + 1} lights`) });
    });
    const ds = S.cue('s39', 'dsh');
    S.place(pop({ seed: 'dsh', amp: 0.9 }), ds.sample, { stem: 'sfx', gain: dB(-25), pan: 0.3, room: 0.3, group: 'ticks', ...L(ds, 's39 dsh') });
  }

  // ------------------------------------------------------------------------------------ s40: the motif returns
  // the half-written book loosens into dust; the dive off the rail, three floors down; the old book opens on
  // the motif's E (the new harmony comes in on it); its storeys rise on the sixteenths, the ninth upright
  if (live(st('s40'), en('s40'))) {
    const end = P30.starts[19]; // the ribbon (s41)
    organBlock(S, P30, 12, 18, { manual: { stops: REG.strings, level: -28 }, solo: { stops: ['P8', 'O4', 'FL4'], level: -22 }, pedal: { stops: REG.pedalMid, level: -25 }, until: end, hall: 0.6 });
    choirBlock(S, P30, 12, 18, { vowel: 'u', dyn: 0.45, level: -15, parts: 'ATB', until: end, hall: 0.65, seed: 's40' });
    const cp = [[15, 'F#4'], [15.5, 'G4'], [16, 'A4'], [16.5, 'B4'], [17, 'C#5'], [17.5, 'A4'], [18, 'B4'], [18.5, 'G4'], [19, 'F#4'], [19.5, 'A4'], [20, 'B4'], [20.5, 'D5'], [21, 'C#5'], [21.5, 'A4'], [22, 'B4'], [22.5, 'G4'], [23, 'A4'], [23.5, 'B4'], [24, 'A4']];
    const c40 = S.cue('s40', 'cut');
    cp.forEach(([b, n], i) => S.organ({ midi: nn(n), s0: b38(b), s1: i === cp.length - 1 ? end : b38(b + 0.5) - T(0.02), stops: ['RF8', 'NZ'], level: -25, hall: 0.5, panScale: 0.6, ...(i === 0 ? L(c40, 's40 the counter-voice') : {}) }));
    const du = S.cue('s40', 'dust'), dv0 = S.cue('s40', 'dive[0]'), dv1 = S.cue('s40', 'dive[1]'), op = S.cue('s40', 'open');
    S.place(ash({ dur: 1.4, seed: 's40', vel: 0.6, bright: 0.4 }), du.sample, { stem: 'sfx', gain: dB(-27), pan: -0.2, room: 0.3, group: 'ash', ...L(du, 's40 the half-written book to dust') });
    S.place(whoosh({ dur: (dv1.sample - dv0.sample) / SR, f0: 2500, f1: 250, q: 0.8, peak: 0.3, seed: 'dive' }), dv0.sample, { stem: 'sfx', gain: dB(-28), hall: 0.4, group: 'fx', ...L(dv0, 's40 the dive, three floors down') });
    const p = pageTurn({ kind: 'near', seed: 's40', vel: 0.7 });
    S.place(p.x, op.sample, { sync: T(p.land), stem: 'sfx', gain: dB(-19), pan: 0.1, room: 0.3, hall: 0.15, group: 'pages', ...L(op, 's40 the old book opens (landing)') });
    const g0 = S.cue('s40', 'grow[0]'), g1 = S.cue('s40', 'grow[1]');
    S.place(shimmer({ dur: (g1.sample - g0.sample) / SR + 0.5, rate: (u) => 15 + 60 * u, fLo: 3500, fHi: 9000, pan: () => 0, spread: 0.3, seed: 'tower', amp: 0.13 }), g0.sample, { stem: 'sfx', gain: dB(-28), hall: 0.35, group: 'glints' });
    for (let k = 0; k < 9; k++) {
      const c = k ? S.cue('s40', 'grow[0]', k / 6, 'the storeys rise a sixteenth apart') : g0, lad = tonesAt(P30, c.sample, nn('A5'), nn('A7'));
      S.place(glassTink({ f: midiHz(lad[Math.min(lad.length - 1, k)]), vel: 0.45, seed: `storey${k}`, decay: 0.8 }), c.sample, { stem: 'sfx', gain: dB(-30), pan: -0.2 + 0.05 * k, hall: 0.4, group: 'glass', ...(k === 0 ? L(c, 's40 the first storey rises') : {}) });
    }
    S.note('s40 the ninth storey upright', g1.sample, { stem: 'sfx', ref: g1.ref });
  }

  // ------------------------------------------------------------------------------------ s41–s42: adopted
  // the lime ribbon laid in the book (a cloth swish with its glint; D major lands on it), and on the bar line
  // the lamp over the bay turns lime: the warm bell. s42 is the empty shot: the chord dies away, quiet
  if (live(st('s41'), en('s42'))) {
    organBlock(S, P30, 19, 19, { manual: { stops: REG.chorale, level: -27 }, pedal: { stops: REG.pedalMid, level: -25 }, until: st('s42') + T(1.5), hall: 0.6, release: 1.6 });
    const rb = S.cue('s41', 'ribbon'), lp = S.cue('s41', 'lamp');
    S.place(whoosh({ dur: 0.7, f0: 700, f1: 3200, q: 0.7, peak: 0.6, seed: 'ribbon' }), rb.sample, { sync: T(0.42), stem: 'sfx', gain: dB(-29), pan: 0.2, hall: 0.2, group: 'fx', ...L(rb, 's41 the ribbon laid in') });
    S.place(shimmer({ dur: 0.6, rate: (u) => 50 * (1 - u), fLo: 6000, fHi: 11000, pan: () => 0.2, spread: 0.3, seed: 'ribbon', amp: 0.14 }), rb.sample, { stem: 'sfx', gain: dB(-29), hall: 0.3, group: 'glints' });
    S.place(bell({ f: midiHz(nn('D3')), vel: 0.6, seed: 'adopted', tierce: 'major' }), lp.sample, { stem: 'music', gain: dB(-18), pan: 0.1, hall: 0.6, group: 'bell', ...L(lp, 's41 the first lime lamp: the warm bell') });
    S.place(ignite({ seed: 'adopted', vel: 0.6 }), lp.sample, { stem: 'sfx', gain: dB(-27), pan: 0.3, hall: 0.25, group: 'fire' });
  }

  // ------------------------------------------------------------------------------------ s43: a red lamp, repaired
  // the beat speeds up from 90 to 180 (the great drum on every one, louder); floor after floor lights, faster
  // every beat; a dead lamp comes on red, pulsing twice a second, until the repair light flies in, its beam hums
  // and the red gives way to lime; two cards of the site flash in; the lighthouse's lamp comes up below
  if (live(st('s43'), en('s43'))) {
    const a = st('s43'), z = st('s44');
    const cres = curve([[a / SR, 0.35], [z / SR, 1, 'cos']]);
    organBlock(S, P30, 20, 21, { manual: { stops: REG.chorale, level: -26 }, pedal: { stops: REG.pedalChorale, level: -23 }, env: cres, hall: 0.6, attack: 0.8 });
    choirBlock(S, P30, 20, 21, { vowel: 'a', dyn: (t) => 0.4 + 0.45 * clamp((t - a / SR) / ((z - a) / SR)), level: -14, attack: 0.3, hall: 0.65, seed: 's43' });
    // the montage's own cuts fall on the frame nearest beats 3, 5, 6 and 7 (up to 20 ms off them): the drum
    // takes the cut there, so the picture and the hit are one
    const CUTB = [3, 5, 6, 7];
    for (let b = 0; b < 13; b++) {
      const j = CUTB.indexOf(b), c = b === 0 ? S.cue('s43', 'cut.t') : j >= 0 ? S.cue('s43', `cuts[${j}]`) : null;
      S.place(taiko({ size: 'n', vel: 0.55 + 0.032 * b, seed: `s43t${b}` }), c ? c.sample : b43(b), { stem: 'sfx', gain: dB(-24 + 0.75 * b), pan: b % 2 ? 0.25 : -0.25, hall: 0.3, group: 'taiko', ...(c ? L(c, b ? `s43 cut on beat ${b}` : 's43 the beat quickens') : {}) });
    }
    const l0 = S.cue('s43', 'lamps[0]'), l1 = S.cue('s43', 'lamps[1]');
    S.place(shimmer({ dur: (l1.sample - l0.sample) / SR + 0.3, rate: (u) => 10 + 110 * u, fLo: 4000, fHi: 10000, spread: 0.9, seed: 'thousand', amp: 0.12 }), l0.sample, { stem: 'sfx', gain: dB(-28), hall: 0.4, group: 'glints', ...L(l0, 's43 the floors light') });
    const al = S.cue('s43', 'alarm.t'), rp = S.cue('s43', 'repair.t'), hz = Q('s43').alarm.hz;
    for (let k = 0; al.t + k / hz < rp.t; k++) {
      const c = k ? S.cue('s43', 'alarm.t', k / hz, 'the red pulses twice a second') : al;
      S.place(padNote({ midi: nn('A3'), t0: c.sample / SR, dur: 0.22, attack: 0.01, release: 0.2, cutoff: (u) => 400 + 900 * Math.exp(-u / 0.08), res: 1.4, level: 0.03, width: 0.3, seed: `red${k}` }), c.sample, { stem: 'sfx', hall: 0.25, group: 'alarm', ...(k === 0 ? L(c, 's43 a dead lamp comes on red') : {}) });
    }
    const fy0 = S.cue('s43', 'repair.fly[0]'), fy1 = S.cue('s43', 'repair.fly[1]'), bm0 = S.cue('s43', 'repair.beam[0]'), bm1 = S.cue('s43', 'repair.beam[1]');
    S.place(whoosh({ dur: (fy1.sample - fy0.sample) / SR, f0: 600, f1: 3000, q: 1, peak: 0.85, seed: 'fly' }), fy0.sample, { stem: 'sfx', gain: dB(-29), pan: -0.3, hall: 0.3, group: 'fx', ...L(fy0, 's43 the repair light flies in') });
    const hum = padNote({ midi: nn('A2'), t0: bm0.sample / SR, dur: (bm1.sample - bm0.sample) / SR, attack: 0.05, release: 0.15, cutoff: (u) => 500 + 300 * Math.sin(2 * Math.PI * 7 * u), res: 1.3, level: 0.016, width: 0.3, seed: 'hum' });
    S.place(hum, bm0.sample, { stem: 'sfx', hall: 0.2, group: 'hum', ...L(bm0, 's43 the repair beam hums') });
    S.place(glassTink({ f: midiHz(nn('E6')), vel: 0.6, seed: 'fixed', decay: 1.2 }), rp.sample, { stem: 'sfx', gain: dB(-25), hall: 0.4, group: 'glass', ...L(rp, 's43 the red gives way to lime') });
    S.place(sparkle({ f: 8000, tau: 0.05, seed: 'fixed', amp: 0.35 }), rp.sample, { stem: 'sfx', gain: dB(-27), group: 'glints' });
    Q('s43').ui.forEach((u, i) => {
      const c = S.cue('s43', `ui[${i}].t`);
      S.place(flash({ seed: `s43f${i}`, vel: 0.6 }), c.sample, { stem: 'sfx', gain: dB(-24), hall: 0.3, group: 'flash', ...L(c, `s43 the site's ${u.region} card`) });
    });
    const ln = S.cue('s43', 'lantern');
    S.place(glassTink({ f: midiHz(nn('A6')), vel: 0.5, seed: 'lighthouse', decay: 1.5 }), ln.sample, { stem: 'sfx', gain: dB(-29), hall: 0.6, group: 'glass', ...L(ln, 's43 the lighthouse’s lamp comes up below') });
  }
  return [P27, P30];
}
