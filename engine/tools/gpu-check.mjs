// GPU check: the frames a GPU renders against the same frames rendered here on SwiftShader.
//
//   node engine/tools/gpu-check.mjs --make-ref             → renders/gpu-ref/ (on the server, SwiftShader)
//   node engine/tools/gpu-check.mjs --check --angle d3d11  → renders/gpu-check/<angle>/ + report.json
//   node engine/tools/gpu-check.mjs --bench --angle d3d11  → seconds per frame at 3840, final quality
//   options: --only s14,s21   --w 960 (--make-ref) or 3840 (--bench)   --frames 4 (--bench)   --require NVIDIA
//
// One reference per timeline row whose module exists: its middle frame at final quality (the shot's
// own samples and depth of field), rendered 960 wide, and the en copy too for rows marked lang:true.
// Both sides are brought down the same way to a lossless 480×270 (area average, so grain and sampling
// noise mostly cancel) and compared in luma: the mean, the worst of a 16×9 grid of block means, the
// share of pixels more than 48 levels apart, and ffmpeg's SSIM (only where the reference has contrast
// enough for it to mean anything). A frame fails when the GPU has visibly drawn something else (a
// missing or black element, a broken shader, NaNs); small differences in noise, filtering and text
// rasterisation only warn.
// A render that asks for a file the film does not have ([404]) fails too, on both sides: a reference
// or a check of an incomplete copy of the film would otherwise pass for a picture with holes in it.
// --check exits 0 when no frame fails, 1 when one does, 3 when WebGL is not on the --require GPU.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REF = path.join(ROOT, 'renders/gpu-ref');
const LIMITS = { fail: { mean: 6, block: 24, far: 0.02, ssim: 0.8 }, warn: { mean: 3, block: 12, far: 0.005, ssim: 0.92 } };
const CW = 480;
const CH = 270;

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) o[k.slice(2)] = true;
    else (o[k.slice(2)] = v), i++;
  }
  return o;
}

const args = parseArgs(process.argv.slice(2));
const angle = args.angle || process.env.LL_ANGLE || 'swiftshader';
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8'));
const keep = args.only ? new Set(String(args.only).split(',')) : null;
const rows = timeline.shots.filter((r) => (!keep || keep.has(r.id)) && fs.existsSync(path.join(ROOT, 'shots', `${r.module}.js`)));

// one render.mjs run; resolves { code, out: its stdout and stderr }
function render(a, env = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['engine/tools/render.mjs', ...a], {
      cwd: ROOT,
      env: { ...process.env, LL_ANGLE: angle, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('exit', (code) => resolve({ code, out }));
  });
}

function ff(a) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg ${a.join(' ')}\n${r.stderr}`);
  return r;
}

// a still brought down to the lossless CW×CH picture both sides are compared at
// the files a render asked for and did not get
const missing = (out) => [...new Set([...out.matchAll(/^\[404\] (.+)$/gm)].map((m) => m[1]))];

const shrink = (src, dst) => ff(['-i', src, '-vf', `scale=${CW}:${CH}:flags=area`, '-pix_fmt', 'rgb24', dst]);

// a CW×CH picture as 8-bit luma
function luma(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  if (r.status !== 0 || r.stdout.length !== CW * CH) throw new Error(`cannot read ${file}`);
  return r.stdout;
}

function compare(test, ref) {
  const a = luma(test);
  const b = luma(ref);
  let sum = 0;
  let far = 0;
  let m = 0;
  let m2 = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] - b[i];
    if (Math.abs(a[i] - b[i]) > 48) far++;
    m += b[i];
    m2 += b[i] * b[i];
  }
  const contrast = Math.sqrt(Math.max(0, m2 / a.length - (m / a.length) ** 2));
  const bw = CW / 16;
  const bh = CH / 9;
  let block = 0;
  for (let by = 0; by < 9; by++) {
    for (let bx = 0; bx < 16; bx++) {
      let d = 0;
      for (let y = by * bh; y < (by + 1) * bh; y++) for (let x = bx * bw; x < (bx + 1) * bw; x++) d += a[y * CW + x] - b[y * CW + x];
      block = Math.max(block, Math.abs(d / (bw * bh)));
    }
  }
  const s = spawnSync('ffmpeg', ['-hide_banner', '-i', test, '-i', ref, '-lavfi', '[0:v]format=gray[a];[1:v]format=gray[b];[a][b]ssim',
    '-f', 'null', '-'], { encoding: 'utf8' });
  const ssim = +(/All:([\d.]+)/.exec(s.stderr)?.[1] ?? NaN);
  const r = { mean: +(sum / a.length).toFixed(2), block: +block.toFixed(1), far: +(far / a.length).toFixed(4), ssim: +ssim.toFixed(4), contrast: +contrast.toFixed(1) };
  const over = (L) => Math.abs(r.mean) > L.mean || r.block > L.block || r.far > L.far || (r.contrast > 8 && !(r.ssim >= L.ssim));
  r.verdict = over(LIMITS.fail) ? 'fail' : over(LIMITS.warn) ? 'warn' : 'ok';
  return r;
}

const jobsOf = (rs) => rs.flatMap((r) => (r.lang ? ['zh', 'en'] : ['zh']).map((lang) => ({ id: r.id, lang, frame: Math.floor(r.frames / 2) })));
const refName = (j) => `${j.id}-${j.lang}-f${j.frame}.png`;

async function makeRef() {
  const w = +(args.w || 960);
  const tmp = path.join(REF, '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const list = [];
  for (const j of jobsOf(rows)) {
    const png = path.join(tmp, `${j.id}-${j.lang}.png`);
    const t0 = Date.now();
    const r = await render(['--shot', j.id, '--still', String(j.frame), '--quality', 'final', '--w', String(w), '--lang', j.lang, '--out', png]);
    if (r.code !== 0 || missing(r.out).length) {
      console.error(`[ref] ${j.id} ${j.lang} failed (exit ${r.code}, missing ${missing(r.out).join(' ') || 'nothing'})\n` +
        r.out.trim().split('\n').slice(-6).join('\n'));
      process.exit(1);
    }
    shrink(png, path.join(REF, refName(j)));
    list.push({ ...j, file: refName(j) });
    console.log(`[ref] ${j.id} ${j.lang} f${j.frame} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  fs.writeFileSync(path.join(REF, 'manifest.json'), JSON.stringify({ made: new Date().toISOString(), commit: head, w, renderer: 'swiftshader', frames: list }, null, 1) + '\n');
  console.log(`[ref] ${list.length} frames → ${path.relative(ROOT, REF)}`);
}

async function check() {
  const man = JSON.parse(fs.readFileSync(path.join(REF, 'manifest.json'), 'utf8'));
  const out = path.join(ROOT, 'renders/gpu-check', angle);
  fs.mkdirSync(out, { recursive: true });
  const ids = new Set(rows.map((r) => r.id));
  const env = args.require ? { LL_REQUIRE_GPU: String(args.require) } : {};
  const results = [];
  let gpu = '';
  for (const j of man.frames.filter((f) => ids.has(f.id))) {
    const png = path.join(out, `${j.id}-${j.lang}-f${j.frame}.png`);
    const t0 = Date.now();
    const r = await render(['--shot', j.id, '--still', String(j.frame), '--quality', 'final', '--w', String(man.w), '--lang', j.lang, '--out', png], env);
    const seconds = +((Date.now() - t0) / 1000).toFixed(1);
    gpu = /"gpu":"([^"]*)"/.exec(r.out)?.[1] || gpu;
    if (r.code === 3) {
      console.error(r.out.trim().split('\n').slice(-2).join('\n'));
      process.exit(3);
    }
    const small = png.replace(/\.png$/, `-${CW}.png`);
    let res;
    if (r.code !== 0) res = { verdict: 'fail', error: r.out.trim().split('\n').slice(-6).join('\n') };
    else if (missing(r.out).length) res = { verdict: 'fail', error: `missing files: ${missing(r.out).join(' ')}` };
    else {
      shrink(png, small);
      res = compare(small, path.join(REF, j.file));
    }
    if (res.verdict !== 'ok' && !res.error) {
      // reference | GPU | difference ×4, for a person to look at
      ff(['-i', path.join(REF, j.file), '-i', small, '-lavfi',
        'split[a0][a1];[1:v]split[b0][b1];[a1][b1]blend=all_mode=difference,lutrgb=r=val*4:g=val*4:b=val*4[d];[a0][b0][d]hstack=3',
        path.join(out, `${j.id}-${j.lang}-f${j.frame}-compare.png`)]);
    }
    results.push({ ...j, seconds, ...res });
    const m = res.error ? res.error.split('\n').pop() : `Δmean ${res.mean} · block ${res.block} · far ${res.far} · SSIM ${res.ssim} (contrast ${res.contrast})`;
    console.log(`[check] ${res.verdict.padEnd(4)} ${j.id} ${j.lang} f${j.frame} · ${m} · ${seconds} s`);
  }
  const count = (v) => results.filter((r) => r.verdict === v).length;
  const report = { angle, gpu, made: new Date().toISOString(), reference: man.commit, limits: LIMITS,
    ok: count('ok'), warn: count('warn'), fail: count('fail'), frames: results };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  console.log(`[check] ${angle} · ${gpu} · ok ${report.ok} · warn ${report.warn} · fail ${report.fail} → ${path.relative(ROOT, out)}`);
  process.exit(report.fail ? 1 : 0);
}

// a few frames of a few shots at full size: the setup and the seconds per frame on this machine. s16's
// middle frames take about 40 samples each, so the timed frames average about the film's 12.6 a frame
// (film/plan.json) and the estimate's two bounds (estimate.mjs) come close together.
async function bench() {
  const n = +(args.frames || 4);
  const picks = args.only ? rows : rows.filter((r) => ['s06', 's14', 's16', 's21', 's44'].includes(r.id));
  const env = args.require ? { LL_REQUIRE_GPU: String(args.require) } : {};
  const out = path.join(ROOT, 'renders/gpu-check', angle);
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  for (const r of picks) {
    const f0 = Math.floor(r.frames / 2);
    const mov = path.join(out, `bench-${r.id}.mov`);
    const t0 = Date.now();
    const res = await render(['--shot', r.id, '--quality', 'final', '--w', String(args.w || 3840), '--from', String(f0), '--to', String(f0 + n - 1), '--out', mov], env);
    if (res.code === 3) {
      console.error(res.out.trim().split('\n').slice(-2).join('\n'));
      process.exit(3);
    }
    if (res.code !== 0) {
      console.error(`[bench] ${r.id} failed (exit ${res.code})\n${res.out.trim().split('\n').slice(-6).join('\n')}`);
      process.exit(1);
    }
    const setup = +(/\[setup\] ([\d.]+)s/.exec(res.out)?.[1] ?? NaN);
    const total = (Date.now() - t0) / 1000;
    const perFrame = +/([\d.]+)s\/frame/.exec(res.out.trim().split('\n').filter((l) => l.includes('s/frame')).pop() || '')?.[1];
    const samples = +(/"samples":(\d+)/.exec(res.out)?.[1] ?? NaN);
    results.push({ id: r.id, samples, setup, perFrame, total: +total.toFixed(1) });
    console.log(`[bench] ${r.id} · ${samples} samples · setup ${setup} s · ${perFrame} s/frame`);
    fs.rmSync(mov, { force: true });
  }
  fs.writeFileSync(path.join(out, 'bench.json'), JSON.stringify({ angle, made: new Date().toISOString(), frames: n, results }, null, 1) + '\n');
}

if (args['make-ref']) await makeRef();
else if (args.check) await check();
else if (args.bench) await bench();
else {
  console.error('usage: gpu-check.mjs --make-ref | --check | --bench  [--angle d3d11] [--only s14,s21]');
  process.exit(2);
}
