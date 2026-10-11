// Checks for the reverb chain: FFT overlap-add against direct convolution, and the generated IRs
// against their RT60 targets. Run: nice -n 15 node audio/synth/test/conv-ir.test.mjs
import { Convolver, directConv } from '../lib/conv.mjs';
import { makeIR, measureRT, CATHEDRAL, CHAMBER } from '../lib/ir.mjs';
import { Rng } from '../lib/rng.mjs';
import { SR } from '../lib/const.mjs';

let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

// 1. true-stereo convolution vs direct, random signals, IR longer than one block boundary
{
  const r = new Rng('convtest');
  const M = 3000, n = 150000;
  const ir = {};
  for (const k of ['LL', 'LR', 'RL', 'RR']) { ir[k] = new Float32Array(M); for (let i = 0; i < M; i++) ir[k][i] = r.gauss() * Math.exp(-i / 700); }
  const xL = new Float32Array(n), xR = new Float32Array(n);
  for (let i = 0; i < n; i++) { xL[i] = r.gauss(); xR[i] = i > 70000 && i < 90000 ? 0 : r.gauss(); }
  for (let i = 20000; i < 90000; i++) { xL[i] = 0; xR[i] = 0; } // a silent stretch exercises the block skip
  const c = new Convolver(ir);
  const y = c.run(xL, xR);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const wantL = add(directConv(xL, ir.LL), directConv(xR, ir.RL));
  const wantR = add(directConv(xL, ir.LR), directConv(xR, ir.RR));
  let e = 0, p = 0;
  for (let i = 0; i < wantL.length; i++) { e = Math.max(e, Math.abs(y.L[i] - wantL[i]), Math.abs(y.R[i] - wantR[i])); p = Math.max(p, Math.abs(wantL[i])); }
  ok(y.L.length === n + M - 1, `output length ${y.L.length}`);
  ok(e / p < 1e-6, `max error ${(e / p).toExponential(2)} of peak (block ${c.B}, N ${c.N})`);
}

// 2. generated IRs: measured RT60 per octave vs target, energy, inter-path correlation
for (const spec of [CATHEDRAL, CHAMBER]) {
  const t0 = Date.now();
  const ir = makeIR(spec);
  const ms = Date.now() - t0;
  const rt = measureRT(ir.LL);
  const target = Object.fromEntries(Object.keys(rt).map((f) => {
    const P = spec.rt60; const x = Math.log2(+f);
    for (let k = 1; k < P.length; k++) if (x <= Math.log2(P[k][0])) {
      const u = (x - Math.log2(P[k - 1][0])) / (Math.log2(P[k][0]) - Math.log2(P[k - 1][0]));
      return [f, +(P[k - 1][1] + u * (P[k][1] - P[k - 1][1])).toFixed(2)];
    }
    return [f, P[P.length - 1][1]];
  }));
  console.log(`${spec.name}: ${ir.n} samples, built in ${ms} ms`);
  console.log('  RT60 measured', JSON.stringify(rt));
  console.log('  RT60 target  ', JSON.stringify(target));
  let worst = 0;
  for (const f of Object.keys(rt)) if (rt[f] != null) worst = Math.max(worst, Math.abs(rt[f] / target[f] - 1));
  ok(worst < 0.12, `${spec.name} RT60 within 12 % in every octave (worst ${(worst * 100).toFixed(1)} %)`);
  const en = (x) => x.reduce((s, v) => s + v * v, 0);
  ok(Math.abs(en(ir.LL) + en(ir.LR) - 1) < 1e-3 && Math.abs(en(ir.RL) + en(ir.RR) - 1) < 1e-3, `${spec.name} unity energy per input side`);
  let pre = 0; for (let i = 0; i < Math.round(spec.early.t0 * SR) - 1; i++) pre = Math.max(pre, Math.abs(ir.LL[i]), Math.abs(ir.RR[i]));
  ok(pre === 0, `${spec.name} silent before the first reflection`);
  const corr = (a, b, i0, i1) => { let ab = 0, aa = 0, bb = 0; for (let i = i0; i < i1; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb); };
  const i0 = Math.round(0.2 * SR), i1 = Math.round(Math.min(spec.length, 1.2) * SR);
  console.log(`  corr LL·LR ${corr(ir.LL, ir.LR, i0, i1).toFixed(3)}  LL·RR ${corr(ir.LL, ir.RR, i0, i1).toFixed(3)}  (late, broadband)`);
  const tail = ir.LL.slice(ir.n - 200);
  ok(Math.abs(tail[tail.length - 1]) < 1e-9, `${spec.name} ends at zero`);
}
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
