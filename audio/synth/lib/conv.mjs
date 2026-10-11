// FFT block convolution (overlap-add) for the reverbs. Direct convolution of minutes of audio with a
// 7 s impulse response is ~10^13 multiply-adds; this does it in a few large FFTs per channel pair.
//
// True stereo: an impulse response has four paths LL, LR, RL, RR (input side → output side).
// Per block, one complex FFT carries both inputs (L + iR) and one inverse FFT carries both outputs,
// using the conjugate symmetry of real signals to pull the two spectra apart and put them back.
import { fft, nextPow2 } from './fft.mjs';

/** half spectra (bins 0..N/2) of two real signals a, b from one complex FFT */
function halfSpectra(a, b, N) {
  const re = new Float64Array(N), im = new Float64Array(N);
  if (a) for (let i = 0; i < a.length; i++) re[i] = a[i];
  if (b) for (let i = 0; i < b.length; i++) im[i] = b[i];
  fft(re, im);
  const H = N >> 1;
  const Ar = new Float64Array(H + 1), Ai = new Float64Array(H + 1);
  const Br = new Float64Array(H + 1), Bi = new Float64Array(H + 1);
  for (let k = 0; k <= H; k++) {
    const j = (N - k) & (N - 1);
    const zr = re[k], zi = im[k], cr = re[j], ci = -im[j]; // conj(Z[N−k])
    Ar[k] = 0.5 * (zr + cr); Ai[k] = 0.5 * (zi + ci);
    Br[k] = 0.5 * (zi - ci); Bi[k] = -0.5 * (zr - cr);
  }
  return [[Ar, Ai], [Br, Bi]];
}

export class Convolver {
  /** ir: { LL, LR, RL, RR } (Float32Array; a missing path is silent) */
  constructor(ir) {
    const M = Math.max(...['LL', 'LR', 'RL', 'RR'].map((k) => (ir[k] ? ir[k].length : 0)));
    this.M = M;
    this.N = Math.max(1 << 16, nextPow2(2 * M));
    this.B = this.N - M + 1; // input block length
    const [LL, LR] = halfSpectra(ir.LL, ir.LR, this.N);
    const [RL, RR] = halfSpectra(ir.RL, ir.RR, this.N);
    this.H = { LL, LR, RL, RR };
  }
  /** convolve stereo input; returns { L, R } of length n + M − 1 */
  run(xL, xR) {
    const { N, B, M, H } = this;
    const n = xL.length, outN = n + M - 1;
    const yL = new Float64Array(outN), yR = new Float64Array(outN);
    const re = new Float64Array(N), im = new Float64Array(N);
    const half = N >> 1;
    const [hLLr, hLLi] = H.LL, [hLRr, hLRi] = H.LR, [hRLr, hRLi] = H.RL, [hRRr, hRRi] = H.RR;
    for (let s = 0; s < n; s += B) {
      const e = Math.min(n, s + B);
      let any = false;
      for (let i = s; i < e; i++) if (xL[i] !== 0 || xR[i] !== 0) { any = true; break; }
      if (!any) continue;
      re.fill(0); im.fill(0);
      for (let i = s; i < e; i++) { re[i - s] = xL[i]; im[i - s] = xR[i]; }
      fft(re, im);
      // separate X_L, X_R; Y_L = X_L·H_LL + X_R·H_RL, Y_R = X_L·H_LR + X_R·H_RR; repack Z = Y_L + i·Y_R
      for (let k = 0; k <= half; k++) {
        const j = (N - k) & (N - 1);
        const zr = re[k], zi = im[k], cr = re[j], ci = -im[j];
        const xlr = 0.5 * (zr + cr), xli = 0.5 * (zi + ci);
        const xrr = 0.5 * (zi - ci), xri = -0.5 * (zr - cr);
        const ylr = xlr * hLLr[k] - xli * hLLi[k] + xrr * hRLr[k] - xri * hRLi[k];
        const yli = xlr * hLLi[k] + xli * hLLr[k] + xrr * hRLi[k] + xri * hRLr[k];
        const yrr = xlr * hLRr[k] - xli * hLRi[k] + xrr * hRRr[k] - xri * hRRi[k];
        const yri = xlr * hLRi[k] + xli * hLRr[k] + xrr * hRRi[k] + xri * hRRr[k];
        // Z[k] = Y_L + i Y_R ; Z[N−k] = conj(Y_L) + i conj(Y_R)
        re[k] = ylr - yri; im[k] = yli + yrr;
        if (k !== 0 && k !== half) { re[j] = ylr + yri; im[j] = -yli + yrr; }
      }
      fft(re, im, true);
      const m = Math.min(N, outN - s);
      const g = 1 / N;
      for (let i = 0; i < m; i++) { yL[s + i] += re[i] * g; yR[s + i] += im[i] * g; }
    }
    return { L: Float32Array.from(yL), R: Float32Array.from(yR) };
  }
}

/** reference direct convolution of one channel (tests only) */
export function directConv(x, h) {
  const y = new Float64Array(x.length + h.length - 1);
  for (let i = 0; i < x.length; i++) { const v = x[i]; if (v) for (let j = 0; j < h.length; j++) y[i + j] += v * h[j]; }
  return y;
}
