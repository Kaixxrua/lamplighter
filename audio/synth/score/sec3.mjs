// Score, section 3 (global 55–95 s; s17–s26 and s27's first two seconds): the seven rivers, the card, the
// light gate, the book and the montage of the site, up to s27's stop (the sheet resting on eight), every
// sync point timed from the shots' CUES (the montage's bar lines from its cuts).
import { SR, nn, midiHz, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { curve, clamp } from '../lib/dsp.mjs';
import { windSystem } from '../inst/organ.mjs';
import { whisperLine } from '../inst/voice.mjs';
import { ping, celesta, glassTink, glassHarmonica, taiko, knock } from '../inst/perc.mjs';
import { air, whoosh, ignite, shimmer, flash, pageTurn, ash, key, tick, pop, subWhoomp, flowBed, ink } from '../inst/fx.mjs';
import { padNote } from '../inst/pad.mjs';
import { applyEnv } from './kit.mjs';
import { organBlock, choirBlock, tonesAt, chordAt } from './orch.mjs';
import { REG, blip } from './sec2.mjs';

const T = (sec) => Math.round(sec * SR);
const M = (n) => (typeof n === 'number' ? n : nn(n));

export function sec3(S, H) {
  s17(S, H); s18(S, H); s19(S, H); s20(S, H); montage(S, H);
}

// --------------------------------------------------------------------------------------------- s17
// The rivers open one after another on the first beat, GitHub first: the organ's arpeggio, a pitch a
// river (the seven notes of D Dorian stacked in thirds). Then a flute ostinato in sixteenths, the ping
// on every beat, a celesta note for the pages the sheet takes (pitch follows where they are across the
// picture: left low, right high), the glitter of the rest, and the flowing bed of the rivers.
const RIVER = { github: ['D4', 0], launches: ['F4', -0.55], threads: ['A4', 0.55], papers: ['C5', -0.7], news: ['E5', 0.7], posts: ['G5', -0.6], hot: ['B5', 0.6] };

function s17(S, H) {
  const C = S.cues;
  const trem = windSystem({ trem: { rate: 5.4, depth: () => 0.6 } });
  organBlock(S, H, 11, 12, { manual: { stops: REG.strings, level: -27 }, pedal: { stops: REG.pedalMid, level: -25 }, wind: trem, hall: 0.55 });
  choirBlock(S, H, 11, 12, { vowel: 'u', dyn: 0.3, level: -14, attack: 0.7, release: 0.9, parts: 'ATB', seed: 'rivers', hall: 0.6 });
  for (const [src, [note, pan]] of Object.entries(RIVER)) {
    const c = S.cue('s17', `opens.${src}`);
    S.organ({ midi: nn(note), s0: c.sample, s1: c.sample + T(1.1), stops: ['RF8', 'FL4'], level: -25, hall: 0.55, name: `s17 river ${src} opens: ${note}`, ref: c.ref, probe: src === 'github' ? { band: [200, 3000] } : undefined });
    S.place(celesta({ midi: nn(note) + 12, vel: 0.7, seed: `open:${src}` }), c.sample, { stem: 'music', gain: dB(-21), pan, hall: 0.45, group: 'celesta' });
  }
  // the ostinato: sixteenths from the second beat, a cell per chord
  const cell = { 11: ['D5', 'A4', 'E5', 'F5', 'C5', 'A4', 'E5', 'D5'], 12: ['D5', 'B4', 'G5', 'B4', 'D5', 'G4', 'B4', 'A4'] };
  const pings = C.cues('s17').pings;
  for (let k = 1; k < pings.length; k++) {
    const b = S.cue('s17', `pings[${k}]`);
    for (let j = 0; j < 4; j++) {
      const s = b.sample + T(0.25 * j);
      const ch = chordAt(H, s);
      const m = nn(cell[ch][(4 * (k - 1) + j) % 8]);
      S.organ({ midi: m, s0: s, s1: s + T(0.235), stops: ['RF8', 'FL4', 'NZ'], level: j === 0 ? -27.5 : -30, hall: 0.5, release: 0.8, name: j === 0 ? `s17 ostinato beat ${k}` : undefined, ref: j === 0 ? b.ref : undefined });
    }
  }
  pings.forEach((t, k) => {
    const c = S.cue('s17', `pings[${k}]`);
    S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-19), hall: 0.75, group: 'ping', name: `s17 ping ${k}`, ref: c.ref, probe: k === 0 ? { band: [700, 1400] } : undefined });
  });
  C.cues('s17').flashes.forEach((t, i) => {
    const c = S.cue('s17', `flashes[${i}]`);
    S.place(flash({ seed: `s17f${i}`, vel: 0.75 }), c.sample, { stem: 'sfx', gain: dB(-17), hall: 0.3, group: 'flash', name: `s17 flash ${i}`, ref: c.ref, probe: { band: [6000, 16000] } });
  });
  // the takes
  C.cues('s17').takes.forEach((b, i) => {
    const a = C.sample('s17', b.t[0]), z = C.sample('s17', b.t[1]);
    const dur = (z - a) / SR;
    const m = Math.max(1, Math.min(b.n, Math.round(7 * dur) + 1));
    const r = new Rng(`take${i}`);
    for (let k = 0; k < m; k++) {
      const u = m > 1 ? k / (m - 1) : 0;
      const s = a + Math.round((z - a) * u);
      const x = b.x[0] + (b.x[1] - b.x[0]) * u;
      let note;
      if (RIVER[b.src] && b.src !== 'github') note = nn(RIVER[b.src][0]) + 12 * (k % 2 ? 2 : 1);
      else { const lad = tonesAt(H, s, nn('D5'), nn('D7'), [4]); note = lad[Math.round(clamp((x + 1) / 2) * (lad.length - 1))]; }
      const first = k === 0;
      S.place(celesta({ midi: note, vel: 0.35 + 0.25 * r.next(), seed: `take${i}:${k}` }), s, { stem: 'music', gain: dB(-26), pan: x, hall: 0.45, group: 'celesta', name: first ? `s17 takes ${i} (${b.src}, ${b.n} pages)` : undefined, ref: first ? { id: 's17', path: `takes[${i}].t[0]`, t: b.t[0] } : undefined });
    }
    if (b.n > m) {
      const d = Math.max(0.12, dur);
      S.place(shimmer({ dur: d, rate: () => Math.min(90, (b.n - m) / d), fLo: 3500, fHi: 9000, pan: (u) => b.x[0] + (b.x[1] - b.x[0]) * u, spread: 0.12, seed: `takeg${i}`, amp: 0.1, tau: [0.015, 0.04] }), a, { stem: 'sfx', gain: dB(-25), hall: 0.35, group: 'glints' });
    }
  });
  // the rivers' bed: rising with the openings, gone under the card
  {
    const c0 = S.cue('s17', 'cut.t');
    const f = flowBed({ dur: 11, seed: 'rivers' });
    const t0 = c0.sample / SR, t1 = C.end('s17') / SR;
    const env = curve([[t0, 0], [t0 + 0.9, 0.6, 'cos'], [t0 + 2.5, 1, 'cos'], [t1, 1], [t1 + 2.5, 0, 'cos']]);
    applyEnv(f.L, c0.sample, env); applyEnv(f.R, c0.sample, env);
    S.place(f, c0.sample, { stem: 'amb', gain: dB(-34), hall: 0.25, group: 'flow', name: 's17 the rivers flow', ref: c0.ref });
  }
}

// --------------------------------------------------------------------------------------------- s18
// The card: F Lydian (the ping's B is its ♯11). The glass rings while the card is in the slot (the
// seam crossing it left to right); ink as the characters grow; a celesta dyad for each tag pair; ticks
// as today's growth prints (the mix follows zh); "+2" pops; the heat engraved with a flame and three
// glass notes; the sheet crosses the card: flash, glints, the heat flares.
function s18(S, H) {
  const C = S.cues;
  const trem = windSystem({ trem: { rate: 5.4, depth: () => 0.6 } });
  organBlock(S, H, 13, 13, { manual: { stops: [...REG.strings, 'FL4'], level: -28.5 }, pedal: { stops: REG.pedalSoft, level: -25 }, wind: trem, hall: 0.55 });
  choirBlock(S, H, 13, 13, { vowel: 'u', dyn: 0.3, level: -16, attack: 0.6, release: 0.9, parts: 'SAT', seed: 'card', hall: 0.6 });
  C.cues('s18').pings.forEach((t, k) => {
    const c = S.cue('s18', `pings[${k}]`);
    S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-19), hall: 0.75, group: 'ping', name: `s18 ping ${k}`, ref: c.ref, probe: k === 0 ? { band: [700, 1400] } : undefined });
  });
  {
    const a = S.cue('s18', 'seam.in'), b = S.cue('s18', 'seam.out');
    const d = (b.sample - a.sample) / SR;
    const x = glassHarmonica({ f: midiHz(nn('E6')), dur: d, seed: 'seam', attack: 0.12, release: 0.6 });
    const pan = new Float32Array(x.length); for (let i = 0; i < x.length; i++) pan[i] = -0.7 + 1.4 * clamp(i / (d * SR));
    S.placePanned(x, a.sample, pan, { stem: 'music', gain: dB(-26), hall: 0.5, group: 'glass harmonica', name: 's18 the glass rings: seam in', ref: a.ref });
    S.note('s18 seam out (glass releases)', b.sample, { ref: b.ref });
  }
  {
    const a = S.cue('s18', 'chars[0]'), b = S.cue('s18', 'chars[1]');
    S.place(ink({ dur: (b.sample - a.sample) / SR + 0.6, seed: 'chars', vel: 0.5 }), a.sample, { stem: 'sfx', gain: dB(-18), pan: 0.15, hall: 0.25, group: 'ink', name: 's18 ink: the characters grow', ref: a.ref });
    S.note('s18 the last character starts', b.sample, { stem: 'sfx', ref: b.ref });
  }
  const dyads = [['A5', 'C6'], ['C6', 'E6'], ['E6', 'B6']];
  C.cues('s18').pairs.forEach((p, i) => {
    const c = S.cue('s18', `pairs[${i}].t`);
    dyads[i % 3].forEach((n, j) => S.place(celesta({ midi: nn(n), vel: 0.55, seed: `pair${i}${j}` }), c.sample + T(0.03 * j), { stem: 'music', gain: dB(-21), pan: p.pan + (j ? 0.08 : -0.08), hall: 0.45, group: 'celesta', name: j === 0 ? `s18 tag pair ${i}` : undefined, ref: j === 0 ? c.ref : undefined, probe: j === 0 && i === 0 ? { band: [700, 5000] } : undefined }));
  });
  {
    const a = S.cue('s18', 'today.zh[0]'), b = S.cue('s18', 'today.zh[1]');
    const n = 4;
    for (let k = 0; k < n; k++) {
      const s = a.sample + Math.round(((b.sample - a.sample) * k) / (n - 1));
      S.place(tick({ f: 1900 + 140 * k, seed: `today${k}`, amp: 0.8 }), s, { stem: 'sfx', gain: dB(-24), pan: -0.2, room: 0.3, group: 'ticks', name: k === 0 ? 's18 today prints (zh)' : k === n - 1 ? 's18 today last figure (zh)' : undefined, ref: k === 0 ? a.ref : k === n - 1 ? b.ref : undefined });
    }
  }
  {
    const c = S.cue('s18', 'more');
    S.place(pop({ seed: 'more', amp: 0.9 }), c.sample, { stem: 'sfx', gain: dB(-24), pan: 0.35, room: 0.3, group: 'ticks', name: 's18 "+2" pops', ref: c.ref, probe: { band: [300, 2000] } });
  }
  {
    const a = S.cue('s18', 'heat[0]'), b = S.cue('s18', 'heat[1]');
    S.place(ignite({ seed: 'heat', vel: 0.7 }), a.sample, { stem: 'sfx', gain: dB(-25), pan: 0.3, hall: 0.2, group: 'fire', name: 's18 the heat: flame', ref: a.ref });
    ['F6', 'A6', 'C7'].forEach((n, k) => {
      const s = a.sample + Math.round(((b.sample - a.sample) * k) / 2);
      S.place(glassTink({ f: midiHz(nn(n)), vel: 0.45, seed: `heat${k}`, decay: 0.7 }), s, { stem: 'sfx', gain: dB(-29), pan: 0.3, hall: 0.45, group: 'glass', name: k === 2 ? 's18 the heat: last figure' : undefined, ref: k === 2 ? b.ref : undefined });
    });
  }
  {
    const c = S.cue('s18', 'sheet');
    S.place(flash({ seed: 's18sheet', vel: 0.95 }), c.sample, { stem: 'sfx', gain: dB(-14), hall: 0.35, group: 'flash', name: 's18 the sheet crosses the card', ref: c.ref, probe: { band: [6000, 16000] } });
    S.place(shimmer({ dur: 1.1, rate: (u) => 160 * Math.pow(1 - u, 2) + 5, fLo: 4500, fHi: 12000, spread: 0.9, seed: 'cardburst', amp: 0.22 }), c.sample, { stem: 'sfx', gain: dB(-20), hall: 0.4, group: 'glints' });
    S.place(ignite({ seed: 'flare', vel: 0.9 }), c.sample + T(0.02), { stem: 'sfx', gain: dB(-24), pan: 0.3, hall: 0.25, group: 'fire' });
  }
}

// --------------------------------------------------------------------------------------------- s19
// The light gate, on B's CUES (shots/s19.js): cut on the ping, a ping a beat; every verdict at the membrane
// (nineteen cards) — a pass rings in glass on the chord, a fail crumbles to ash — panned where it crosses, a
// pass a little brighter the more stars it has; the beam (the sheet behind the gate) is the taiko and the
// full organ on B♭; the 491 misses by nine stars, is read out and goes to ash on G minor; the hero card
// crosses and the chord turns major (B♭ → B♮, the ping's note), then whips past the camera's right.
function s19(S, H) {
  const Q = S.cues.cues('s19');
  const cue = (p) => S.cue('s19', p);
  organBlock(S, H, 14, 14, { manual: { stops: REG.chorale, level: -27 }, pedal: { stops: REG.pedalMid, level: -24 }, fill: true, hall: 0.55 });
  const beam = cue('beam'), b = beam.sample;
  const wind = windSystem({ sags: [{ t: b / SR, cents: 6 }] });
  const fall = curve([[b / SR + 0.4, 1], [b / SR + 1.0, 0.62, 'cos']]);
  organBlock(S, H, 15, 17, { manual: { stops: REG.tutti, level: -29 }, pedal: { stops: REG.pedalTutti, level: -23 }, fill: true, wind, env: fall, hall: 0.6 });
  choirBlock(S, H, 15, 17, { vowel: 'a', dyn: 0.8, level: -13, attack: 0.1, release: 0.5, hall: 0.65, seed: 'gate', env: fall });
  Q.pings.forEach((_, k) => {
    const c = cue(`pings[${k}]`);
    S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-19), hall: 0.75, group: 'ping', name: `s19 ping ${k}`, ref: c.ref, probe: k === 0 ? { band: [700, 1400] } : undefined });
  });
  const miss = Q.verdicts.findIndex((v) => !v.pass && v.stars === Q.readings[0].stars);
  const hero = Q.verdicts.findIndex((v) => v.pass && v.stars === Q.readings[1].stars);
  if (miss < 0 || hero < 0) throw new Error('s19: the read-out cards are not among the verdicts');
  const panOf = (v) => clamp(2 * v.x, -0.6, 0.6);
  Q.verdicts.forEach((v, i) => {
    if (i === miss || i === hero) return; // their own sounds below
    const c = cue(`verdicts[${i}].t`), lift = clamp(Math.log10(v.stars) / 4, 0, 1); // ★10 … ★10,000
    if (v.pass) {
      const lad = tonesAt(H, c.sample, nn('F6'), nn('F7'));
      S.place(glassTink({ f: midiHz(lad[i % lad.length]), vel: 0.45 + 0.25 * lift, seed: `pass${i}`, decay: 0.7 }), c.sample, { stem: 'sfx', gain: dB(-30 + 3 * lift), pan: panOf(v), hall: 0.45, group: 'glass', name: `s19 verdict ${i}: pass ★${v.stars}`, ref: c.ref });
    } else S.place(ash({ dur: 0.45, seed: `fail${i}`, vel: 0.5, bright: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-27), pan: panOf(v), room: 0.3, hall: 0.1, group: 'ash', name: `s19 verdict ${i}: fail ★${v.stars}`, ref: c.ref });
  });
  S.place(taiko({ size: 'o', vel: 1, seed: 'beam' }), b, { stem: 'sfx', gain: dB(-7), hall: 0.3, group: 'taiko', name: 's19 the beam: taiko', ref: beam.ref, probe: { band: [30, 250] } });
  S.place(taiko({ size: 'n', vel: 0.75, seed: 'beam2' }), b + T(0.5), { stem: 'sfx', gain: dB(-13), pan: 0.3, hall: 0.3, group: 'taiko' });
  S.place(subWhoomp({ f0: 64, f1: 33, dur: 0.9, seed: 'beam' }), b, { stem: 'sfx', gain: dB(-15), group: 'sub' });
  // the 491, nine stars short: to ash at its verdict (its read-out wipes in 10 ms later, with G minor)
  const m = cue(`verdicts[${miss}].t`);
  S.place(ash({ dur: 1.3, seed: 'nearmiss', vel: 0.8, bright: 0.5 }), m.sample, { stem: 'sfx', gain: dB(-22), pan: panOf(Q.verdicts[miss]), room: 0.3, hall: 0.15, group: 'ash', name: 's19 ★491 to ash', ref: m.ref });
  // the hero crosses: G major in glass; then it whips past the camera's right
  const h = cue('hero.cross');
  ['G6', 'B6', 'D7'].forEach((n, k) => S.place(glassTink({ f: midiHz(nn(n)), vel: 0.65, seed: `hero${k}`, decay: 1.1 }), h.sample + T(0.06 * k), { stem: 'sfx', gain: dB(-25), pan: -0.2 + 0.2 * k, hall: 0.5, group: 'glass', name: k === 0 ? 's19 the hero card crosses' : undefined, ref: k === 0 ? h.ref : undefined }));
  S.place(shimmer({ dur: 1.0, rate: () => 50, fLo: 5000, fHi: 11000, pan: (u) => -0.5 + u, spread: 0.2, seed: 'hero', amp: 0.2 }), h.sample, { stem: 'sfx', gain: dB(-21), hall: 0.4, group: 'glints' });
  S.place(celesta({ midi: nn('B5'), vel: 0.7, seed: 'hero' }), h.sample, { stem: 'music', gain: dB(-22), hall: 0.45, group: 'celesta' });
  const past = cue('hero.past'), wp = whoosh({ dur: 0.55, f0: 700, f1: 3800, q: 1.1, peak: 0.7, seed: 'heropast' });
  S.place(wp, past.sample, { sync: Math.round(0.7 * wp.length), stem: 'sfx', gain: dB(-27), pan: 0.7, hall: 0.2, group: 'fx', name: 's19 the hero whips past (peak)', ref: past.ref });
}

// --------------------------------------------------------------------------------------------- s20
// The book opens, on C's CUES (shots/s20.js): a ping on each beat; the front board lifts and lands open on
// the lectern (a soft leather thud); the flyleaf lifts and turns — the page turn, swelled, with its sub —
// and lands 0.15 s into s21, as the shot has it; the home page's light comes out from under it (the swell:
// the choir and the organ on C open up, lime glints run along the edges).
function s20(S, H) {
  const Q = S.cues.cues('s20');
  const cue = (p) => S.cue('s20', p);
  const s0 = cue('cut.t').sample, w0 = cue('swell[0]'), w1 = cue('swell[1]');
  const swell = curve([[s0 / SR, 0.45], [w0.sample / SR, 0.6, 'cos'], [w1.sample / SR, 1, 'cos']]);
  organBlock(S, H, 18, 18, { manual: { stops: REG.chorale, level: -26 }, pedal: { stops: REG.pedalMid, level: -23 }, fill: true, env: swell, hall: 0.6 });
  choirBlock(S, H, 18, 18, { vowel: 'a', dyn: 0.75, level: -10, attack: 0.45, release: 0.5, env: swell, hall: 0.65, seed: 'book' });
  S.note('s20 the light comes out (the swell)', w0.sample, { stem: 'music', ref: w0.ref });
  Q.pings.forEach((_, k) => {
    const c = cue(`pings[${k}]`);
    S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-19), hall: 0.75, group: 'ping', name: `s20 ping ${k}`, ref: c.ref, probe: k === 0 ? { band: [700, 1400] } : undefined });
  });
  const cl = cue('cover.lift'), cd = cue('cover.land');
  S.place(whoosh({ dur: (cd.sample - cl.sample) / SR, f0: 250, f1: 900, q: 0.8, peak: 0.55, seed: 'board' }), cl.sample, { stem: 'sfx', gain: dB(-33), pan: -0.15, hall: 0.2, group: 'pages', name: 's20 the board lifts', ref: cl.ref });
  S.place(knock({ f: 150, vel: 0.6, seed: 'board', metal: 0 }), cd.sample, { stem: 'sfx', gain: dB(-21), pan: -0.15, room: 0.3, hall: 0.2, group: 'pages', name: 's20 the board lands open', ref: cd.ref });
  S.place(subWhoomp({ f0: 95, f1: 50, dur: 0.3, seed: 'board' }), cd.sample, { stem: 'sfx', gain: dB(-25), group: 'sub' });
  const fl = cue('flyleaf.lift'), fd = cue('flyleaf.land');
  S.place(whoosh({ dur: (fd.sample - fl.sample) / SR, f0: 300, f1: 2200, q: 0.8, peak: 0.85, seed: 'flyleaf' }), fl.sample, { stem: 'sfx', gain: dB(-29), pan: 0.1, hall: 0.3, group: 'pages', name: 's20 the flyleaf lifts', ref: fl.ref });
  const p = pageTurn({ kind: 'big', seed: 'book', vel: 0.9 });
  S.place(p.x, fd.sample, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-12), hall: 0.3, room: 0.2, group: 'pages', name: 's20 the flyleaf lands (0.15 s into s21)', ref: fd.ref, probe: { band: [40, 1200] } });
  S.place(shimmer({ dur: 1.2, rate: (u) => 40 + 40 * u, fLo: 5000, fHi: 10500, pan: (u) => -0.6 + 1.2 * u, spread: 0.2, seed: 'edges', amp: 0.18 }), w0.sample, { stem: 'sfx', gain: dB(-22), hall: 0.4, group: 'glints' });
}

// ---------------------------------------------------------------------------------------- montage
// s21–s26, timed from the shots' CUES: the site, page by page. D Dorian rising in the bass (D E F G A A → D
// at s27's stop); flutes in sextuplets, the synth pad and the choir's "oo" under them, running on into s27
// until the sheet stops on eight (H.end). A page turn crosses every cut: it lifts in the shot before
// (turn.lift) and lands in the next (its land, 0.55 s in; s25's 0.38 s into s26), the cut at the turn's
// height; the bar lines are the cuts (the chords land on them: orch.mjs), and the celesta on each spells the
// motif — D, A, G, A, E — that s27's D major completes. Inside the shots: s21 the press on the calendar and
// a note as each day's leaf falls back; s22 'mcp server' typed (the letters turning into celesta), the
// search, the twelve results rising and their +N ringing; s23 the axis drawn and ten bars rising as tall as
// their upvotes; s24 a whisper translated into a clear line; s25 the works pouring in, a waterfall; s26 off
// the page, over the rail into the shaft, the lantern below.
function montage(S, H) {
  const C = S.cues;
  const cut = (id) => C.sample(id, 0);
  const end = H.end;
  organBlock(S, H, 19, 24, { manual: { stops: ['RF8', 'SAL', 'VC'], level: -27 }, pedal: { stops: REG.pedalMid, level: -24 }, hall: 0.55, until: end });
  choirBlock(S, H, 19, 24, { vowel: 'u', dyn: 0.35, level: -14, attack: 0.6, release: 0.6, parts: 'SAT', until: end, seed: 'montage', hall: 0.6 });
  // the synth pad: the upper three parts, the filter breathing with each bar
  for (let k = 19; k <= 24; k++) {
    const s0 = H.starts[k], s1 = k < 24 ? H.starts[k + 1] : end;
    for (const m of H.V[k].v.slice(0, 3)) {
      const pd = padNote({ midi: m - 12, t0: s0 / SR, dur: (s1 - s0) / SR, attack: 0.4, release: 0.5, cutoff: (t) => 700 + 900 * Math.sin(Math.PI * clamp(t / ((s1 - s0) / SR))), res: 0.8, level: 0.016, width: 0.7, seed: `m${k}` });
      S.place(pd, s0, { stem: 'music', hall: 0.3, group: 'pad' });
    }
  }
  // sextuplet flutes: a contour over the chord's tones, accented on the bar (the cuts, s27's included)
  const contour = [0, 1, 2, 3, 2, 1];
  const DOWN = ['s21', 's22', 's23', 's24', 's25', 's26', 's27'].map(cut);
  for (let b = Math.round(cut('s21') / SR); b < Math.round(end / SR); b++) {
    for (let j = 0; j < 6; j++) {
      const s = T(b) + Math.round((SR * j) / 6);
      const lad = tonesAt(H, s, nn('A4'), nn('A6'));
      const base = Math.max(0, Math.floor(lad.length / 2) - 2 + ((b % 2) ? 1 : 0));
      const m = lad[Math.min(lad.length - 1, base + contour[j])];
      const down = H.starts.includes(T(b)) || DOWN.includes(T(b));
      S.organ({ midi: m, s0: s, s1: s + T(0.155), stops: ['FL4', 'FL2'], level: j === 0 && down ? -26 : -29.5, hall: 0.45, release: 0.7 });
    }
  }
  // the page turns across the cuts (lift → land from the CUES), the motif on the cuts
  const TURNS = [['s21', 's22', 'D6'], ['s22', 's23', 'A6'], ['s23', 's24', 'G6'], ['s24', 's25', 'A6'], ['s25', 's26', 'E6']];
  TURNS.forEach(([a, b, n], i) => {
    const up = S.cue(a, 'turn.lift'), dn = b === 's26' ? S.cue('s26', 'turn.land') : S.cue(b, 'land');
    const p = pageTurn({ kind: 'near', seed: `cut${b}`, vel: 0.7, lift: (dn.sample - up.sample) / SR });
    S.place(p.x, dn.sample, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-16), pan: i % 2 ? 0.2 : -0.2, room: 0.3, hall: 0.15, group: 'pages', name: `${b} the page lands`, ref: dn.ref });
    const c = S.cut(b);
    S.place(celesta({ midi: nn(n), vel: 0.8, seed: `motif${i}` }), c.sample, { stem: 'music', gain: dB(-17), hall: 0.5, group: 'celesta', name: `${b} cut: motif ${n}`, ref: c.ref, probe: { band: [700, 5000] } });
    S.place(glassTink({ f: midiHz(nn(n)) * 2, vel: 0.4, seed: `motifg${i}` }), c.sample, { stem: 'sfx', gain: dB(-31), hall: 0.5, group: 'glass' });
  });
  // s21: the press on the 5th (the lime ring); the leaves fall back a day each, 8 → 7 → 6 → 5, a note as the
  // calendar's lit day moves under each (falling, back in time), the leaf landing after it
  {
    const k = S.cue('s21', 'click');
    S.place(key({ seed: 'cal', vel: 0.85 }), k.sample, { stem: 'sfx', gain: dB(-21), pan: 0.25, room: 0.4, group: 'keys', name: 's21 the press on the 5th', ref: k.ref });
    S.place(glassTink({ f: midiHz(nn('A6')), vel: 0.45, seed: 'press', decay: 0.8 }), k.sample, { stem: 'sfx', gain: dB(-31), pan: 0.25, hall: 0.4, group: 'glass' });
    C.cues('s21').days.forEach((d, i) => {
      const sw = S.cue('s21', `days[${i}].switch`), up = S.cue('s21', `days[${i}].lift`), dn = S.cue('s21', `days[${i}].land`);
      S.place(celesta({ midi: nn(['A6', 'F6', 'D6'][i % 3]), vel: 0.6, seed: `switch${i}` }), sw.sample, { stem: 'music', gain: dB(-20), pan: 0.3 - 0.3 * i, hall: 0.45, group: 'celesta', name: `s21 the calendar turns to ${d.shows}`, ref: sw.ref });
      const p = pageTurn({ kind: 'far', seed: `flut${i}`, vel: 0.55, lift: (dn.sample - up.sample) / SR });
      S.place(p.x, dn.sample, { sync: Math.round(p.land * SR), stem: 'sfx', gain: dB(-21), pan: 0.3 - 0.12 * i, room: 0.35, group: 'pages', name: `s21 the ${d.shows} leaf lands`, ref: dn.ref });
    });
  }
  // s22: 'mcp server' typed a key at a time (the letters turn into celesta; the space is a key alone), the
  // search runs and the results come down behind the lime line; the twelve cards rise off the page, a glass
  // note each, and each one's 24-hour stars (+N) ring, a tick each
  {
    const Q = C.cues('s22');
    const notes = ['E5', 'G5', 'B5', null, 'D6', 'E6', 'D6', 'B5', 'G5', 'B5']; // m c p ␣ s e r v e r
    Q.keys.forEach(({ key: ch }, i) => {
      const c = S.cue('s22', `keys[${i}].t`), u = i / (Q.keys.length - 1), n = ch === ' ' ? null : notes[i];
      S.place(key({ seed: `type${i}`, vel: ch === ' ' ? 0.6 : 0.75 }), c.sample, { stem: 'sfx', gain: dB(-22 - 8 * u), pan: 0.1, room: 0.4, group: 'keys', name: `s22 key '${ch}'`, ref: c.ref });
      if (n) S.place(celesta({ midi: nn(n), vel: 0.4 + 0.3 * u, seed: `typec${i}` }), c.sample, { stem: 'music', gain: dB(-31 + 9 * u), pan: 0.1, hall: 0.45, group: 'celesta' });
    });
    const en = S.cue('s22', 'enter');
    S.place(key({ seed: 'enter', vel: 0.95 }), en.sample, { stem: 'sfx', gain: dB(-21), pan: 0.1, room: 0.4, group: 'keys', name: 's22 enter: the search runs', ref: en.ref });
    const w0 = S.cue('s22', 'wipe[0]'), w1 = S.cue('s22', 'wipe[1]');
    S.place(whoosh({ dur: (w1.sample - w0.sample) / SR + 0.15, f0: 3200, f1: 700, q: 1.2, peak: 0.5, seed: 'wipe' }), w0.sample, { stem: 'sfx', gain: dB(-31), hall: 0.25, group: 'fx', name: 's22 the results come down', ref: w0.ref });
    const r0 = S.cue('s22', 'cards[0].rise');
    S.place(whoosh({ dur: 0.9, f0: 900, f1: 3500, q: 1.3, peak: 0.6, seed: 'rise' }), r0.sample - T(0.1), { stem: 'sfx', gain: dB(-33), hall: 0.25, group: 'fx' });
    Q.cards.forEach((cd, k) => {
      const r = S.cue('s22', `cards[${k}].rise`), t = S.cue('s22', `cards[${k}].tick`);
      const lad = tonesAt(H, r.sample, nn('A5'), nn('A7'));
      S.place(glassTink({ f: midiHz(lad[k % lad.length]), vel: 0.45, seed: `res${k}` }), r.sample, { stem: 'sfx', gain: dB(-30 - 0.25 * k), pan: -0.4 + 0.07 * k, hall: 0.45, group: 'glass', name: `s22 ${cd.name} rises`, ref: r.ref });
      S.place(tick({ f: 2000 + 60 * k, seed: `plus${k}`, amp: 0.8 }), t.sample, { stem: 'sfx', gain: dB(-30), pan: -0.4 + 0.07 * k, room: 0.3, group: 'ticks', name: `s22 ${cd.name} ${cd.n}`, ref: t.ref });
    });
  }
  // s23: the figure's axis draws itself, left to right; ten bars stand up out of it, rank 1 to 10, as tall as
  // their HF upvotes (a celesta note each, higher the taller; FrameMorrow's, the lime one, louder, with glass);
  // they go back into the page, the last first
  {
    const Q = C.cues('s23');
    const a0 = S.cue('s23', 'axis[0]'), a1 = S.cue('s23', 'axis[1]');
    S.place(ink({ dur: (a1.sample - a0.sample) / SR, seed: 'axis', vel: 0.5 }), a0.sample, { stem: 'sfx', gain: dB(-30), pan: -0.3, room: 0.3, group: 'ink', name: 's23 the axis draws itself', ref: a0.ref });
    const ups = Q.bars.map((b) => b.upvotes), hi = Math.max(...ups), lo = Math.min(...ups);
    Q.bars.forEach((b, k) => {
      const c = S.cue('s23', `bars[${k}].rise`);
      const lad = tonesAt(H, c.sample, nn('C5'), nn('C7'));
      const m = lad[Math.round(((b.upvotes - lo) / (hi - lo || 1)) * (lad.length - 1))];
      S.place(celesta({ midi: m, vel: b.mine ? 0.75 : 0.5, seed: `bar${k}` }), c.sample, { stem: 'music', gain: dB(b.mine ? -20 : -25), pan: -0.4 + 0.09 * k, hall: 0.45, group: 'celesta', name: `s23 bar ${b.rank} rises (${b.upvotes})`, ref: c.ref });
      if (b.mine) S.place(glassTink({ f: midiHz(m + 12), vel: 0.5, seed: 'mine', decay: 1.2 }), c.sample, { stem: 'sfx', gain: dB(-28), pan: -0.4 + 0.09 * k, hall: 0.45, group: 'glass' });
    });
    const sk = S.cue('s23', `bars[${Q.bars.length - 1}].sink`);
    S.place(whoosh({ dur: 0.45, f0: 2600, f1: 500, q: 1, peak: 0.4, seed: 'sink' }), sk.sample, { stem: 'sfx', gain: dB(-33), hall: 0.3, group: 'fx', name: 's23 the bars go back into the page', ref: sk.ref });
  }
  // s24: a whisper, translated into a clear line (D–B–A–G over G): it clears as the English flows into the
  // Chinese (flow[0] → done), the hand-over on its third syllable, the last one clear as the Chinese is whole
  {
    const fl = S.cue('s24', 'flow[0]'), dn = S.cue('s24', 'done');
    const syl = [{ t: 0, c: 's', v: 'e', d: 0.3, midi: nn('D5') }, { t: 0.42, c: 'h', v: 'a', d: 0.3, midi: nn('B4') }, { t: 0.85, c: 'l', v: 'o', d: 0.35, midi: nn('A4') }, { t: 1.35, c: 'n', v: 'a', d: 0.9, midi: nn('G4') }];
    const last = syl[syl.length - 1].t, s0 = dn.sample - T(last);
    const c0 = (fl.sample - s0) / SR, c1 = (dn.sample - s0) / SR;
    S.place(whisperLine({ syllables: syl, part: 'A', clarity: (t) => clamp((t - c0) / (c1 - c0)), seed: 's24', dyn: 0.5 }), dn.sample, { sync: T(last), stem: 'music', gain: dB(-19), pan: -0.1, hall: 0.5, group: 'voice', name: 's24 the line comes clear (the Chinese whole)', ref: dn.ref });
  }
  // s25: the works pour in, row by row, faster down the page: a falling cascade on Asus4, celesta and glass in
  // turn, each row's first note on its first slot, the last note on 'done' (every work in)
  {
    const rows = C.cues('s25').rows.map((_, r) => S.cue('s25', `rows[${r}]`)), dn = S.cue('s25', 'done');
    const lad = tonesAt(H, rows[0].sample, nn('D4'), nn('E7')).reverse(); // E7 down to D4 on A, D, E
    const R = rows.length, L = lad.length, counts = rows.map((_, r) => Math.floor(L / R) + (r >= R - (L % R) ? 1 : 0));
    let k = 0;
    rows.forEach((c, r) => {
      const a = c.sample, b = r < R - 1 ? rows[r + 1].sample : dn.sample, cnt = counts[r];
      for (let j = 0; j < cnt; j++, k++) {
        const s = r < R - 1 ? a + Math.round(((b - a) * j) / cnt) : a + Math.round(((b - a) * j) / Math.max(1, cnt - 1));
        const m = lad[k], lastNote = r === R - 1 && j === cnt - 1;
        const o = j === 0 ? { name: `s25 row ${r + 1} pours in`, ref: c.ref } : lastNote ? { name: 's25 every work in', ref: dn.ref } : {};
        if (k % 2 && m >= nn('A5')) S.place(glassTink({ f: midiHz(m), vel: 0.4, seed: `fall${k}`, decay: 0.6 }), s, { stem: 'sfx', gain: dB(-31), pan: 0.4 - 0.06 * k, hall: 0.45, group: 'glass', ...o });
        else S.place(celesta({ midi: m, vel: 0.5, seed: `fall${k}` }), s, { stem: 'music', gain: dB(-25), pan: -0.4 + 0.06 * k, hall: 0.45, group: 'celesta', ...o });
      }
    });
    const p0 = S.cue('s25', 'pour[0]').sample, d = (dn.sample - p0) / SR + 0.6;
    const f = flowBed({ dur: d, seed: 'fall', centre: 2200 });
    const env = curve([[p0 / SR, 0], [p0 / SR + 0.3, 1, 'cos'], [dn.sample / SR, 1], [p0 / SR + d, 0, 'cos']]);
    applyEnv(f.L, p0, env); applyEnv(f.R, p0, env);
    S.place(f, p0, { stem: 'amb', gain: dB(-36), hall: 0.2, group: 'flow' });
  }
  // s26: the page has landed (the turn above); we back off it, the floors' lamps going down to the night's,
  // over the rail and out into the shaft (the air opens), and the lantern comes up from below as s27 begins
  {
    const lv = S.cue('s26', 'leave'), rl = S.cue('s26', 'rail'), ln = S.cue('s26', 'lantern'), rs = S.cue('s26', 'rest');
    const x = air({ dur: (rs.sample - lv.sample) / SR + 2.5, seed: 's26', howl: 0.35, hiss: 0.5 });
    const env = curve([[lv.sample / SR, 0], [rl.sample / SR, 1, 'cos'], [rs.sample / SR + 0.5, 1], [rs.sample / SR + 2.5, 0, 'cos']]);
    applyEnv(x.L ?? x, lv.sample, env); if (x.R) applyEnv(x.R, lv.sample, env);
    S.place(x, lv.sample, { stem: 'amb', gain: dB(-40), hall: 0.3, group: 'air' });
    S.place(whoosh({ dur: 0.8, f0: 1800, f1: 300, q: 0.8, peak: 0.5, seed: 'rail' }), rl.sample, { sync: T(0.4), stem: 'sfx', gain: dB(-31), hall: 0.4, group: 'fx', name: 's26 over the rail, into the shaft', ref: rl.ref });
    S.place(glassTink({ f: midiHz(nn('A6')), vel: 0.4, seed: 'lantern', decay: 1.6 }), ln.sample, { stem: 'sfx', gain: dB(-31), hall: 0.6, pan: 0.1, group: 'glass', name: 's26 the lantern comes up', ref: ln.ref });
  }
}
