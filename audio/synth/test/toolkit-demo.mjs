// Toolkit demo: every instrument and effect once, dry and through the cathedral, with timing marks.
// Writes <out>/toolkit_demo.wav and <out>/toolkit_demo.json (what plays when). Run with nice -n 15.
import fs from 'node:fs';
import path from 'node:path';
import { SR, nn } from '../lib/const.mjs';
import { Stem } from '../lib/bus.mjs';
import { Convolver } from '../lib/conv.mjs';
import { makeIR, CATHEDRAL, CHAMBER } from '../lib/ir.mjs';
import { measure, limit } from '../lib/loud.mjs';
import { writeWav24 } from '../lib/wav.mjs';
import { organNote, windSystem } from '../inst/organ.mjs';
import { choirPart, whisperLine } from '../inst/voice.mjs';
import { celesta, glassTink, glassHarmonica, bell, taiko, ping } from '../inst/perc.mjs';
import { air, whoosh, ignite, shimmer, flash, pageTurn, ash, key, tick, pop, subWhoomp, flowBed } from '../inst/fx.mjs';
import { padNote } from '../inst/pad.mjs';

const out = process.argv[2] || 'audio/out/toolkit';
fs.mkdirSync(out, { recursive: true });
const T = 64, n = T * SR;
const st = new Stem(0, n, 'demo');
const log = [];
const put = (name, t, x, o = {}) => { st.add(x, Math.round(t * SR), o); log.push({ t, name }); };
const putS = (name, t, s, o = {}) => { st.addStereo(s.L, s.R, Math.round(t * SR), o); log.push({ t, name }); };
const t0 = Date.now();

// organ: principal chorus chord, flutes, strings with tremulant, reeds, pedal
const wind = windSystem({ sags: [{ t: 0.5, cents: 4 }] });
for (const m of ['D3', 'A3', 'D4', 'F4', 'A4', 'D5']) { const r = organNote({ midi: nn(m), t0: 0.5, dur: 2.5, stops: ['P8', 'O4', 'F2', 'MIX', 'TR8', 'B16'], wind, level: -14 }); st.add(r.x, r.at, { pan: r.pan, hall: 0.35 }); }
for (const m of ['D2']) { const r = organNote({ midi: nn(m), t0: 0.5, dur: 2.5, stops: ['CB32', 'SB16', 'OB8', 'PO16'], wind, pedal: true, level: -10 }); st.add(r.x, r.at, { pan: r.pan, hall: 0.35 }); }
log.push({ t: 0.5, name: 'organ tutti Dm (pedal 32-16-8 + Posaune; plenum + mixture + trumpet)' });
const trem = windSystem({ trem: { rate: 5.6 } });
for (const m of ['B3', 'D4', 'G4']) { const r = organNote({ midi: nn(m), t0: 4.5, dur: 2.5, stops: ['SAL', 'VC', 'RF8'], wind: trem, level: -10 }); st.add(r.x, r.at, { pan: r.pan, hall: 0.4 }); }
log.push({ t: 4.5, name: 'organ strings + celeste + flute, tremulant (G/B)' });
['D5', 'F5', 'A5', 'C6', 'E6', 'D6', 'A5', 'F5'].forEach((m, k) => { const r = organNote({ midi: nn(m) - 12, t0: 8 + k * 0.25, dur: 0.22, stops: ['RF8', 'FL4', 'NZ', 'FL2'], level: -12 }); st.add(r.x, r.at, { pan: r.pan, hall: 0.3 }); });
log.push({ t: 8, name: 'organ flutes 8-4-2 2/3-2, 16ths' });
// choir
for (const [part, m, pn] of [['B', 'D3', -0.25], ['T', 'A3', 0.25], ['A', 'F4', -0.15], ['S', 'A4', 0.15]]) putS(`choir ${part}`, 10.5, choirPart({ part, midi: nn(m), t0: 10.5, dur: 3.2, vowel: 'a', dyn: 0.7, seed: 'demo', pan: [pn - 0.2, pn + 0.2] }), { hall: 0.4 });
for (const [part, m, pn] of [['B', 'D3', -0.25], ['T', 'A3', 0.25], ['A', 'D4', -0.15], ['S', 'F4', 0.15]]) putS(`choir oo ${part}`, 14.5, choirPart({ part, midi: nn(m), t0: 14.5, dur: 2.5, vowel: 'u', dyn: 0.35, seed: 'demo2', pan: [pn - 0.2, pn + 0.2] }), { hall: 0.4 });
// whisper → voice
put('whisper → voiced line', 18, whisperLine({ seed: 'demo', part: 'A', clarity: (t) => Math.min(1, Math.max(0, (t - 0.6) / 1.2)), syllables: [
  { t: 0, c: 's', v: 'e', d: 0.25, midi: nn('D5') }, { t: 0.35, c: 'h', v: 'a', d: 0.25, midi: nn('B4') }, { t: 0.7, c: 'l', v: 'o', d: 0.3, midi: nn('A4') },
  { t: 1.15, c: 'm', v: 'a', d: 0.35, midi: nn('B4') }, { t: 1.65, c: 'n', v: 'a', d: 0.6, midi: nn('A4') }] }), { hall: 0.3 });
// pitched percussion
['D5', 'A5', 'G5', 'A5', 'F5', 'E5', 'D5'].forEach((m, k) => put(`celesta ${m}`, 21.5 + k * 0.3, celesta({ midi: nn(m) + 12, vel: 0.7, seed: 'demo' }), { gain: 0.25, hall: 0.3 }));
[2400, 3100, 2800].forEach((f, k) => put(`glass tink ${f}`, 24.5 + k * 0.35, glassTink({ f, vel: 0.6, seed: `d${k}` }), { gain: 0.2, pan: k - 1, hall: 0.3 }));
put('glass harmonica G5+D6', 26, glassHarmonica({ f: 1000 * Math.pow(2, -4 / 12), dur: 2.5, seed: 'g' }), { gain: 0.12, pan: -0.2, hall: 0.3 });
put('glass harmonica D6', 26, glassHarmonica({ f: 1000 * Math.pow(2, 3 / 12), dur: 2.5, seed: 'd' }), { gain: 0.09, pan: 0.2, hall: 0.3 });
put('bell D4', 29.5, bell({ f: 297, seed: 'b' }), { gain: 0.25, hall: 0.4 });
put('taiko odaiko', 32, taiko({ size: 'o', vel: 1, seed: 'a' }), { gain: 0.6, hall: 0.25 });
put('taiko nagado', 33, taiko({ size: 'n', vel: 0.8, seed: 'b' }), { gain: 0.5, pan: 0.3, hall: 0.25 });
put('taiko nagado soft', 33.5, taiko({ size: 'n', vel: 0.4, seed: 'c' }), { gain: 0.5, pan: -0.3, hall: 0.25 });
put('ping 1 kHz', 35, ping({ tau: 0.35, amp: 0.4 }), { hall: 0.6 });
// effects
putS('shaft air', 38, air({ dur: 3, seed: 'demo' }), { gain: 0.05, hall: 0.1 });
put('whoosh', 41, whoosh({ dur: 1.0, f0: 250, f1: 4000 }), { gain: 0.5, hall: 0.2 });
for (let k = 0; k < 5; k++) put('ignite', 42.3 + k * 0.15, ignite({ seed: `i${k}` }), { gain: 0.5, pan: -0.8 + 0.4 * k, hall: 0.2 });
putS('shimmer cloud', 43.5, shimmer({ dur: 1.2, rate: () => 50, pan: (u) => -1 + 2 * u }), { hall: 0.3 });
putS('glass flash', 45, flash({ seed: 'f' }), { hall: 0.3 });
for (const [k, kind] of ['near', 'far', 'big'].entries()) { const p = pageTurn({ kind, seed: `d${k}` }); put(`page turn ${kind} (land at +${p.land})`, 46.5 + k * 1.6 - p.land, p.x, { gain: 0.6, hall: 0.2, room: 0.3 }); }
put('ash crumble', 51.5, ash({ dur: 1.2, seed: 'd' }), { gain: 0.6, room: 0.3, hall: 0.1 });
for (let k = 0; k < 10; k++) put(`key ${k}`, 53 + k * 0.11 + (k % 3) * 0.02, key({ seed: `k${k}` }), { gain: 0.5, pan: -0.1 + 0.02 * k, room: 0.3 });
for (let k = 0; k < 6; k++) put('tick', 54.6 + k * 0.08, tick({ seed: `t${k}`, f: 1900 + 80 * k }), { gain: 0.15, room: 0.2 });
put('pop', 55.4, pop({}), { gain: 0.25, room: 0.2 });
put('sub whoomp', 56, subWhoomp({}), { gain: 0.7 });
putS('flow bed', 57, flowBed({ dur: 3 }), { gain: 0.04, hall: 0.2 });
for (const [m, w] of [['D3', -0.6], ['A3', 0], ['F4', 0.6]]) { const p = padNote({ midi: nn(m), t0: 60, dur: 2.5, cutoff: (t) => 400 + 2000 * Math.min(1, t / 1.5), level: 0.05, seed: 'd' }); st.addStereo(p.L, p.R, p.at, { hall: 0.3 }); void w; }
log.push({ t: 60, name: 'pad Dm' });
const tSynth = Date.now() - t0;

// reverb returns
const t1 = Date.now();
const hall = new Convolver(makeIR(CATHEDRAL)), room = new Convolver(makeIR(CHAMBER));
const h = hall.run(st.send.hall.L, st.send.hall.R), r = room.run(st.send.room.L, st.send.room.R);
const L = new Float32Array(n), R = new Float32Array(n);
for (let i = 0; i < n; i++) { L[i] = st.dry.L[i] + 0.7 * h.L[i] + 0.6 * r.L[i]; R[i] = st.dry.R[i] + 0.7 * h.R[i] + 0.6 * r.R[i]; }
const tConv = Date.now() - t1;
const pre = measure(L, R);
const lim = limit(L, R, { ceilingDb: -1 });
const m = measure(L, R);
const clips = writeWav24(path.join(out, 'toolkit_demo.wav'), L, R);
fs.writeFileSync(path.join(out, 'toolkit_demo.json'), JSON.stringify({ log, synthMs: tSynth, convMs: tConv, prePeak: pre.truePeak, limiter: lim, integrated: m.integrated, truePeak: m.truePeak, lra: m.lra, clips }, null, 1));
console.log(`synth ${tSynth} ms, reverb ${tConv} ms; before limiter TP ${pre.truePeak.toFixed(2)} dBTP; after: I ${m.integrated.toFixed(1)} LUFS, TP ${m.truePeak.toFixed(2)} dBTP, LRA ${m.lra.toFixed(1)}, limiter min gain ${lim.minGainDb.toFixed(1)} dB, clips ${clips}`);
