// Score, section 2 (global 56–78 s; s12–s16): the silence, the radar's ping, the organ's tutti, the
// lamplighter's motif under the title, the credit. Every time below is read from the cue sheet; the
// few that are not (a bar line, a musical lead-in) say so in the log.
import { SR, AIR0, nn, midiHz, dB } from '../lib/const.mjs';
import { Rng } from '../lib/rng.mjs';
import { curve, clamp } from '../lib/dsp.mjs';
import { windSystem } from '../inst/organ.mjs';
import { ping, glassTink, glassHarmonica } from '../inst/perc.mjs';
import { air, whoosh, ignite, sparkle, shimmer, flash, rumble } from '../inst/fx.mjs';
import { applyEnv } from './kit.mjs';
import { organBlock, choirBlock, tonesAt } from './orch.mjs';

export const REG = {
  tutti: ['P16', 'P8', 'O4', 'F2', 'MIX', 'TR8'],
  pedalTutti: ['CB32', 'SB16', 'OB8', 'PO16'],
  chorale: ['P8', 'B16', 'RF8', 'FL4'],
  solo: ['TR8', 'P8', 'O4'],
  pedalChorale: ['SB16', 'OB8', 'PO16'],
  strings: ['SAL', 'VC', 'RF8'],
  flutes: ['RF8', 'FL4', 'NZ', 'FL2'],
  pedalSoft: ['SB16'],
  pedalMid: ['SB16', 'OB8'],
};

const T = (sec) => Math.round(sec * SR);

/** a radar return: a short sine pip; a catch (lime) adds its octave and a glint */
export function blip(f, { lime = false, near = true, seed = 'b' } = {}) {
  const x = sparkle({ f, tau: near ? 0.05 : 0.035, seed, amp: 1 });
  if (lime) {
    const o = sparkle({ f: 2 * f, tau: 0.04, seed: `${seed}:o`, amp: 0.45 });
    const g = sparkle({ f: Math.min(11000, 4.98 * f), tau: 0.025, seed: `${seed}:g`, amp: 0.2 });
    for (let i = 0; i < x.length; i++) x[i] += (o[i] || 0) + (g[i] || 0);
  }
  return x;
}

export function sec2(S, H) {
  const C = S.cues;
  // ------------------------------------------------------------------------------------- s12
  // [SIL0, AIR0) (frames 792–828) stays exact digital zero (nothing is placed there; the master zeroes it again);
  // the shaft's air rises from exactly zero at AIR0 and is there when the ping lands.
  const air0 = S.cue('s12', 'air.t0'), airT1 = S.cue('s12', 'air.t1');
  if (air0.sample !== AIR0) throw new Error(`s12 air starts at ${air0.sample}, const AIR0 is ${AIR0}`);
  const ping0 = S.cue('s13', 'ping.t');
  if (airT1.sample !== ping0.sample) throw new Error('s12 air should meet the ping');
  const tut = S.cue('s14', 'tutti.t');
  {
    const a = air({ dur: 9, seed: 's12', howl: 0.55, hiss: 0.45 });
    const tA = AIR0 / SR, tP = ping0.sample / SR, tT = tut.sample / SR;
    const env = curve([[tA, 0], [tP, 1, 'cos'], [tT - 0.5, 1], [tT - 0.15, 0.5, 'cos'], [tT, 0.5], [tT + 3.5, 0, 'cos']]);
    applyEnv(a.L, AIR0, env); applyEnv(a.R, AIR0, env);
    S.place(a, AIR0, { stem: 'amb', gain: dB(-31), hall: 0.12, group: 'air', name: 's12 shaft air rises from zero', ref: air0.ref });
  }
  // ------------------------------------------------------------------------------------- s13
  // the ping: a pure 1 kHz sine (B5 at this pitch), and the cathedral's six seconds
  S.place(ping({ tau: 0.4 }), ping0.sample, { stem: 'sfx', gain: dB(-14), hall: 1.0, group: 'ping', name: 's13 the ping', ref: ping0.ref, probe: { band: [700, 1400] } });
  // the light comes back as a flame (line.t0) and opens into the sheet (line.t1)
  const l0 = S.cue('s13', 'line.t0'), l1 = S.cue('s13', 'line.t1');
  S.place(ignite({ seed: 's13line', vel: 0.8 }), l0.sample, { stem: 'sfx', gain: dB(-22), hall: 0.3, group: 'fx', name: 's13 the flame', ref: l0.ref, probe: { band: [3000, 12000] } });
  {
    const d = (l1.sample - l0.sample) / SR;
    S.place(whoosh({ dur: d + 0.3, f0: 450, f1: 5200, q: 1.1, peak: d / (d + 0.3), seed: 's13open' }), l0.sample, { stem: 'sfx', gain: dB(-27), hall: 0.35, group: 'fx' });
    S.note('s13 the sheet opens (whoosh peak)', l1.sample, { stem: 'sfx', ref: l1.ref });
  }
  // the lens starts to turn (turn.t0) and is at full speed by turn.full: the mechanism under everything
  const tu0 = S.cue('s13', 'turn.t0'), tuF = S.cue('s13', 'turn.full');
  {
    const x = rumble({ dur: 12, seed: 'lens' });
    const a = tu0.sample / SR, b = tuF.sample / SR;
    applyEnv(x, tu0.sample, curve([[a, 0], [b, 1, 'cos'], [a + 7, 1], [a + 11.5, 0, 'cos']]));
    S.place(x, tu0.sample, { stem: 'amb', gain: dB(-33), hall: 0.15, group: 'rumble', name: 's13 the lens starts to turn', ref: tu0.ref });
  }
  // the leaves the sheet finds: radar returns climbing the D minor pentatonic with the sweep's bearing
  {
    const B13 = C.cues('s13').blips;
    const ladder = ['A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'D7'].map(nn);
    const b0 = Math.min(...B13.map((b) => b.bearing)), b1 = Math.max(...B13.map((b) => b.bearing));
    B13.forEach((b, i) => {
      const m = ladder[Math.min(ladder.length - 1, Math.floor(((b.bearing - b0) / (b1 - b0 + 1e-9)) * ladder.length))];
      const s = C.sample('s13', b.t);
      S.place(blip(midiHz(m), { lime: b.lime, seed: `s13:${i}` }), s, { stem: 'sfx', gain: dB(b.lime ? -29 : -33), pan: b.pan, hall: 0.5, group: 'blips', name: `s13 blip ${i}`, ref: { id: 's13', path: `blips[${i}].t`, t: b.t } });
    });
  }
  // the organ draws breath: the blower from turn.t0, the pedal's 32' and 16' swelling from nothing
  // half a second later, cut 0.15 s before the tutti so the tutti lands out of a held breath
  {
    const sw = S.cue('s13', 'turn.t0', 0.5, 'the swell starts half a second into the turn (cut 0.15 s before the tutti: the breath)');
    const w0 = tu0.sample, p0 = sw.sample, p1 = tut.sample - T(0.15);
    S.place(whoosh({ dur: (p1 - w0) / SR, f0: 160, f1: 900, q: 0.7, peak: 0.97, seed: 'blower' }), w0, { stem: 'music', gain: dB(-36), hall: 0.3, group: 'organ wind' });
    S.organ({ midi: nn('D2'), s0: p0, s1: p1, stops: ['CB32', 'SB16'], level: -21, pedal: true, hall: 0.5, env: curve([[p0 / SR, dB(-30)], [p1 / SR, 1, 'exp']]), name: 's13 pedal swell', ref: sw.ref });
  }
  // ------------------------------------------------------------------------------------- s14
  // the tutti: D minor on the full organ and the choir, out of the breath; then Am/C on the bar line
  {
    const wind = windSystem({ sags: [{ t: tut.sample / SR, cents: 6 }, { t: H.starts[1] / SR, cents: 3 }] });
    organBlock(S, H, 0, 1, { manual: { stops: REG.tutti, level: -27 }, pedal: { stops: REG.pedalTutti, level: -21 }, fill: true, wind, attack: 0.7, hall: 0.6 });
    choirBlock(S, H, 0, 1, { vowel: 'a', dyn: 0.85, level: -11, attack: 0.05, release: 0.5, hall: 0.65, seed: 'tutti' });
    S.note('s14 tutti (onset probe)', tut.sample, { ref: tut.ref, probe: { band: [200, 5000] } });
    // the frame opens from 2.39:1 to 16:9: the music's image opens with it
    const b0 = S.cue('s14', 'bars.t0'), b1 = S.cue('s14', 'bars.t1');
    S.width = [{ stem: 'music', a0: tu0.sample, a: b0.sample, b: b1.sample, from: 0.6 }]; // narrow from the breath on, open with the frame
    S.note('s14 image opens (width 0.6 → 1)', b1.sample, { ref: b1.ref });
  }
  // the sheet crosses the lens: glass flashes
  C.cues('s14').flashes.forEach((t, i) => {
    const c = S.cue('s14', `flashes[${i}]`);
    S.place(flash({ seed: `s14f${i}`, vel: 0.85 }), c.sample, { stem: 'sfx', gain: dB(-15), hall: 0.3, group: 'flash', name: `s14 flash ${i}`, ref: c.ref, probe: { band: [6000, 16000] } });
  });
  // the portholes come on, one by one, on the chord's tones
  {
    const wa = S.cue('s14', 'windows.t0'), wb = S.cue('s14', 'windows.t1');
    const n = 9, r = new Rng('portholes');
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), s = wa.sample + Math.round((wb.sample - wa.sample) * Math.pow(u, 1.25));
      const tones = tonesAt(H, s, nn('D6'), nn('D7'));
      const m = tones[Math.floor(r.next() * tones.length)];
      const ends = k === 0 ? { name: 's14 first porthole', ref: wa.ref } : k === n - 1 ? { name: 's14 last porthole', ref: wb.ref } : {};
      S.place(glassTink({ f: midiHz(m), vel: 0.35, seed: `port${k}`, decay: 0.8 }), s, { stem: 'sfx', gain: dB(-31), pan: (k % 2 ? 1 : -1) * (0.2 + 0.5 * u), hall: 0.55, group: 'glass', ...ends });
    }
  }
  // the leaves found in this shot: near ones present, far ones small and wet
  {
    const r = new Rng('s14blips');
    C.cues('s14').blips.forEach((b, i) => {
      const s = C.sample('s14', b.t);
      const tones = tonesAt(H, s, nn('A5'), nn('D7'));
      const m = tones[Math.floor(r.next() * tones.length)];
      S.place(blip(midiHz(m), { lime: b.lime, near: b.near, seed: `s14:${i}` }), s, { stem: 'sfx', gain: dB(b.near ? -34 : -42), pan: b.pan, hall: b.near ? 0.35 : 0.7, group: 'blips', name: `s14 blip ${i}`, ref: { id: 's14', path: `blips[${i}].t`, t: b.t } });
    });
  }
  // ------------------------------------------------------------------------------------- s15
  // the motif on trumpet and principal over the chorale, the choir with it; at the title the full
  // organ (32' and mixture) and the deceptive cadence, then a long diminuendo into the credit
  const title = S.cue('s15', 'title.t');
  {
    const cut = S.cue('s15', 'cut.t');
    const tT = title.sample / SR;
    const windC = windSystem({ sags: [{ t: cut.sample / SR, cents: 2 }, { t: tT, cents: 5 }] });
    organBlock(S, H, 2, 7, { manual: { stops: REG.chorale, level: -25 }, solo: { stops: REG.solo, level: -20 }, pedal: { stops: REG.pedalChorale, level: -22 }, fill: true, wind: windC, hall: 0.6 });
    const dim = curve([[tT + 0.6, 1], [H.starts[9] / SR - 0.05, 0.3, 'cos']]);
    organBlock(S, H, 8, 8, { manual: { stops: REG.tutti, level: -27 }, solo: { stops: [...REG.solo, 'MIX'], level: -21 }, pedal: { stops: REG.pedalTutti, level: -22 }, fill: true, wind: windC, env: dim, hall: 0.65 });
    choirBlock(S, H, 2, 8, { vowel: 'a', dyn: (t) => 0.6 + 0.35 * clamp((t - cut.sample / SR) / (tT - cut.sample / SR)), level: -12, attack: 0.08, release: 0.4, until: H.starts[9] - T(0.5), hall: 0.65, seed: 'motif', env: dim });
    S.note('s15 cut: motif D (onset probe)', cut.sample, { ref: cut.ref, probe: { band: [400, 3000] } });
    S.note('s15 title complete: D over B♭ (onset probe)', title.sample, { ref: title.ref, probe: { band: [400, 3000] } });
  }
  // the pages the sheet sets alight; the first page (found in s13) answers with its blip
  C.cues('s15').ignite.forEach((g, i) => {
    const s = C.sample('s15', g.t);
    const ref = { id: 's15', path: `ignite[${i}].t`, t: g.t };
    S.place(ignite({ seed: `s15i${i}`, vel: g.first ? 0.95 : 0.55 + 0.1 * ((i * 7) % 4) / 3 }), s, { stem: 'sfx', gain: dB(g.first ? -21 : -27), pan: g.pan, hall: 0.25, group: 'fire', name: `s15 ignite ${i}${g.first ? ' (first page)' : ''}`, ref, probe: g.first ? { band: [3000, 12000] } : undefined });
    if (g.first) S.place(blip(midiHz(nn('B6')), { lime: true, seed: 's15first' }), s, { stem: 'sfx', gain: dB(-28), pan: g.pan, hall: 0.5, group: 'blips' });
  });
  // the strokes of the title: each character's points land as a cloud of glints across its place
  {
    const pans = { 燃: [-0.5, -0.25], 灯: [-0.1, 0.1], 者: [0.25, 0.5], LAMPLIGHTER: [-0.45, 0.45] };
    for (const [ch, [p0, p1]] of Object.entries(pans)) {
      const a = S.cue('s15', `strokes.${ch}[0]`), b = S.cue('s15', `strokes.${ch}[1]`);
      const d = (b.sample - a.sample) / SR;
      const sh = shimmer({ dur: d, rate: (u) => 25 + 70 * Math.sin(Math.PI * u), fLo: 4200, fHi: 10500, pan: (u) => p0 + (p1 - p0) * u, spread: 0.15, seed: `stroke:${ch}`, amp: 0.22 });
      S.place(sh, a.sample, { stem: 'sfx', gain: dB(-17), hall: 0.35, group: 'glints', name: `s15 strokes ${ch}`, ref: a.ref });
    }
  }
  C.cues('s15').flashes.forEach((t, i) => {
    const c = S.cue('s15', `flashes[${i}]`);
    S.place(flash({ seed: `s15f${i}`, vel: 0.8 }), c.sample, { stem: 'sfx', gain: dB(-16), hall: 0.3, group: 'flash', name: `s15 flash ${i}`, ref: c.ref, probe: { band: [6000, 16000] } });
  });
  // the title complete: a bloom of glints spreading from the centre
  S.place(shimmer({ dur: 1.6, rate: (u) => 140 * Math.pow(1 - u, 2) + 6, fLo: 3800, fHi: 11500, pan: () => 0, spread: 0.9, seed: 'titlebloom', amp: 0.25, tau: [0.04, 0.12] }), title.sample, { stem: 'sfx', gain: dB(-18), hall: 0.45, group: 'glints', name: 's15 title bloom', ref: title.ref });
  // ------------------------------------------------------------------------------------- s16
  // the credit: strings and celeste under a tremulant, pianissimo; the ping becomes the beat (and the
  // B♮ of the mode); the pulses cross the credit; the second writes it and the glass harmonica holds
  {
    const trem = windSystem({ trem: { rate: 5.4, depth: () => 0.8 } });
    organBlock(S, H, 9, 10, { manual: { stops: REG.strings, level: -27 }, pedal: { stops: REG.pedalSoft, level: -25 }, wind: trem, hall: 0.55, release: 1.2 });
    C.cues('s16').pings.forEach((t, k) => {
      const c = S.cue('s16', `pings[${k}]`);
      S.place(ping({ tau: 0.35 }), c.sample, { stem: 'sfx', gain: dB(-17), hall: 0.8, group: 'ping', name: `s16 ping ${k}`, ref: c.ref, probe: { band: [700, 1400] } });
    });
    C.cues('s16').crosses.forEach((pair, k) => pair.forEach((t, j) => {
      const c = S.cue('s16', `crosses[${k}][${j}]`);
      const writes = k === 1;
      S.place(glassTink({ f: midiHz(nn(j ? 'D7' : 'G6')), vel: writes ? 0.55 : 0.3, seed: `cross${k}${j}`, decay: 0.7 }), c.sample, { stem: 'sfx', gain: dB(writes ? -27 : -34), pan: j ? 0.25 : -0.25, hall: 0.6, group: 'glass', name: `s16 cross ${k}.${j}`, ref: c.ref });
    }));
    const w0 = S.cue('s16', 'crosses[1][0]'), w1 = S.cue('s16', 'crosses[1][1]');
    S.place(shimmer({ dur: (w1.sample - w0.sample) / SR, rate: () => 45, fLo: 5000, fHi: 10000, pan: (u) => -0.5 + u, spread: 0.1, seed: 'credit', amp: 0.2 }), w0.sample, { stem: 'sfx', gain: dB(-20), hall: 0.4, group: 'glints', name: 's16 the credit is written', ref: w0.ref });
    const gEnd = (H.starts[11] + T(0.35) - w0.sample) / SR;
    for (const [m, p, g] of [['G5', -0.2, -27], ['D6', 0.2, -29]]) S.place(glassHarmonica({ f: midiHz(nn(m)), dur: gEnd, seed: `gh${m}`, attack: 0.5, release: 1.4 }), w0.sample, { stem: 'music', gain: dB(g), pan: p, hall: 0.5, group: 'glass harmonica', name: `s16 glass harmonica ${m}`, ref: w0.ref });
    const r0 = S.cue('s16', 'roll.t0'), r1 = S.cue('s16', 'roll.t1');
    const d = (r1.sample - r0.sample) / SR;
    const wx = whoosh({ dur: d, f0: 140, f1: 700, q: 0.8, peak: 0.55, seed: 'roll' });
    const pan = new Float32Array(wx.length); for (let i = 0; i < pan.length; i++) pan[i] = -0.4 + 0.8 * (i / pan.length);
    S.placePanned(wx, r0.sample, pan, { stem: 'amb', gain: dB(-31), hall: 0.3, group: 'fx', name: 's16 the camera rolls (whoosh)', ref: r0.ref });
  }
}
