#!/usr/bin/env node
// Lamplighter render tool. Serves the film directory, drives headless Chromium, receives 10-bit
// packed frames (x2rgb10le) over HTTP and pipes them into ffmpeg. WebGL runs on SwiftShader (the CPU)
// unless LL_ANGLE names a GPU backend (engine/tools/windows.mjs renders the film that way on a GPU).
//
//   node engine/tools/render.mjs --shot s06 --quality preview --w 960            → renders/preview/zh/s06.mp4
//   node engine/tools/render.mjs --shot s06 --still 96 --w 3840                   → renders/stills/s06-f96-zh.png (+ .jpg)
//   node engine/tools/render.mjs --shot s06 --quality final --w 3840 --codec prores
//   options: --from N --to N (local frames, inclusive), --lang zh|en, --samples N (exactly N a frame),
//            --scale R, --out PATH, --bench (per-phase timings), --crf N, --verbose,
//            --plan (each frame's camera travel and sample count, nothing rendered)
//   environment: LL_ANGLE   swiftshader (default) or an ANGLE backend on the GPU: d3d11, gl, vulkan
//                LL_REQUIRE_GPU  a word the WebGL renderer string must contain (e.g. NVIDIA), or exit 3
//                LL_HEADED=1     a window off screen instead of headless
//                LL_PLAYWRIGHT, LL_CHROME (paths), LL_SLOTS, LL_NICE
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Playwright 1.63.0 (Chromium 153, revision 1243): installed next to the film by windows.mjs, or
// wherever LL_PLAYWRIGHT points
const LOCAL_PLAYWRIGHT = path.join(ROOT, '.node/node_modules/playwright/index.mjs');
const PLAYWRIGHT = process.env.LL_PLAYWRIGHT || LOCAL_PLAYWRIGHT;
const SERVER_CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`;
const ANGLE = process.env.LL_ANGLE || 'swiftshader';
const HEADED = process.env.LL_HEADED === '1';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) a[key] = true;
    else {
      a[key] = v;
      i++;
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const shot = args.shot || '_lookdev';
const still = args.still !== undefined ? +args.still : null;
const quality = args.quality || (still !== null ? 'still' : 'preview');
const W = +(args.w || (quality === 'final' || quality === 'still' ? 3840 : 960));
const H = +(args.h || Math.round((W * 9) / 16));
const lang = args.lang || 'zh';
const codec = args.codec || (still !== null ? 'png' : quality === 'final' ? 'prores' : 'h264');
const verbose = !!args.verbose;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
};

let frameSink = null; // (n, buf) => Promise

// Renders share the machine with other work: they run at low CPU priority and at
// most LL_SLOTS of them at once (a slot is a lock directory holding the owner's pid).
const SLOT_DIR = path.join(ROOT, '.render-slots');
const SLOTS = Math.max(1, +(process.env.LL_SLOTS || 3));
let slotHeld = null;

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

async function acquireSlot() {
  fs.mkdirSync(SLOT_DIR, { recursive: true });
  for (let round = 0; ; round++) {
    for (let i = 0; i < SLOTS; i++) {
      const d = path.join(SLOT_DIR, `slot-${i}`);
      try {
        fs.mkdirSync(d);
        fs.writeFileSync(path.join(d, 'pid'), String(process.pid));
        slotHeld = d;
        return d;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        let pid = 0;
        try {
          pid = +fs.readFileSync(path.join(d, 'pid'), 'utf8');
        } catch {}
        const age = Date.now() - fs.statSync(d, { throwIfNoEntry: false })?.mtimeMs;
        // the owner died, or never wrote its pid
        if ((pid && !alive(pid)) || (!pid && age > 60000)) fs.rmSync(d, { recursive: true, force: true });
      }
    }
    if (round % 30 === 0) console.log(`[slot] all ${SLOTS} render slots busy, waiting…`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function releaseSlot() {
  if (slotHeld) fs.rmSync(slotHeld, { recursive: true, force: true });
  slotHeld = null;
}
process.on('exit', releaseSlot);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(130));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST' && url.pathname.startsWith('/__frame/')) {
    const n = +url.pathname.slice(9);
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        await frameSink(n, Buffer.concat(chunks));
        res.writeHead(204);
        res.end();
      } catch (e) {
        console.error('[sink]', e.message);
        res.writeHead(500);
        res.end(String(e.message));
      }
    });
    return;
  }
  let p;
  try {
    p = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      console.log('[404]', p); // never expected: a file the film needs is missing (gpu-check fails on it)
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(fp).pipe(res);
  });
});

function ffmpegArgs(out) {
  const input = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'x2rgb10le', '-s', `${W}x${H}`, '-r', '24', '-i', 'pipe:0'];
  const tags = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
  const toYuv = 'vflip,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int';
  if (codec === 'png') {
    const jpg = out.replace(/\.png$/, '.jpg');
    return [
      ...input,
      '-filter_complex', '[0:v]vflip,split=2[a][b];[b]scale=1600:-2:flags=lanczos[c]',
      '-map', '[a]', '-frames:v', '1', '-pix_fmt', 'rgb48be', out,
      '-map', '[c]', '-frames:v', '1', '-q:v', '2', jpg,
    ];
  }
  if (codec === 'prores') {
    return [...input, '-vf', toYuv, '-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-pix_fmt', 'yuv422p10le', ...tags, '-color_range', 'tv', out];
  }
  if (codec === 'h265') {
    return [...input, '-vf', toYuv, '-c:v', 'libx265', '-preset', 'slow', '-crf', String(args.crf || 14), '-pix_fmt', 'yuv420p10le', '-tag:v', 'hvc1', ...tags, '-color_range', 'tv', out];
  }
  return [...input, '-vf', toYuv, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 15), '-pix_fmt', 'yuv420p', ...tags, '-color_range', 'tv', '-movflags', '+faststart', out];
}

function defaultOut() {
  if (still !== null) return path.join(ROOT, 'renders/stills', `${shot.replace(/\//g, '_')}-f${still}-${lang}-${W}.png`);
  const ext = codec === 'prores' ? 'mov' : 'mp4';
  return path.join(ROOT, 'renders', quality === 'final' ? 'final' : 'preview', lang, `${shot.replace(/\//g, '_')}.${ext}`);
}

async function main() {
  const out = path.resolve(args.out || defaultOut());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    os.setPriority(0, +(process.env.LL_NICE ?? 15)); // Chromium and ffmpeg inherit it
  } catch {}
  await acquireSlot();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);
  const env = { ...process.env };
  if (process.platform === 'linux') {
    const runtimeLibs = `${process.env.HOME}/.cache/ms-playwright/runtime-libs/root/usr/lib/x86_64-linux-gnu`;
    env.LD_LIBRARY_PATH = [runtimeLibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  }
  const browser = await chromium.launch({
    executablePath: process.env.LL_CHROME || (fs.existsSync(SERVER_CHROME) ? SERVER_CHROME : chromium.executablePath()),
    headless: !HEADED,
    env,
    args: [
      '--no-sandbox',
      ...(ANGLE === 'swiftshader'
        ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        : [`--use-angle=${ANGLE}`, '--force_high_performance_gpu']),
      '--ignore-gpu-blocklist',
      '--disable-gpu-watchdog',
      '--disable-gpu-process-crash-limit',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--js-flags=--max-old-space-size=8192 --expose-gc',
      ...(HEADED ? ['--window-position=-32000,-32000', '--window-size=320,240'] : []),
    ],
  });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  page.on('console', (m) => {
    if (verbose || m.type() === 'error' || m.type() === 'warning') console.log(`[page:${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  const qs = new URLSearchParams({ shot, w: W, h: H, quality, lang });
  if (args.samples) qs.set('samples', args.samples);
  if (args.scale) qs.set('scale', args.scale);
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/engine/runtime/index.html?${qs}`);
  await page.waitForFunction(() => window.filmReady || window.filmError, null, { timeout: 0, polling: 200 });
  const err = await page.evaluate(() => window.filmError);
  if (err) {
    console.error(err);
    await browser.close();
    process.exit(2);
  }
  const info = await page.evaluate(() => window.filmInfo);
  console.log(`[setup] ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(info));
  // a GPU that is not the one asked for stops here; a lost context (a GPU reset) fails the render
  // instead of sending black frames
  const need = process.env.LL_REQUIRE_GPU;
  if (need && !String(info.gpu).toLowerCase().includes(need.toLowerCase())) {
    console.error(`[gpu] WebGL is on "${info.gpu}" (LL_ANGLE ${ANGLE}), not on ${need}`);
    await browser.close();
    process.exit(3);
  }
  await page.evaluate(() => window.film.gl.canvas.addEventListener('webglcontextlost', () => (window.filmLost = true)));

  let from;
  let to;
  if (still !== null) from = to = still;
  else {
    from = args.from !== undefined ? +args.from : 0;
    to = args.to !== undefined ? +args.to : info.frames - 1;
  }

  if (args.plan) {
    let sum = 0;
    for (let f = from; f <= to; f++) {
      const p = await page.evaluate((n) => window.film.planAt(n), f);
      sum += p.samples;
      console.log(`[plan ${f}] ${p.travel === null ? '-' : p.travel.toFixed(1)} px · ${p.samples}`);
    }
    const n = to - from + 1;
    console.log(`[plan] ${shot}: ${sum} samples over ${n} frames, ${(sum / n).toFixed(1)} a frame (at least ${info.samples}, at most ${info.maxSamples})`);
    await browser.close();
    server.close();
    return;
  }

  // --discard: drop frames in the sink (measures the browser side alone)
  const ff = args.discard
    ? { stdin: { write: (b, cb) => cb(), end: () => {} } }
    : spawn('ffmpeg', ffmpegArgs(out), { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = args.discard
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
        ff.on('error', reject);
      });
  const expect = W * H * 4;
  let nextFrame = from;
  const pending = new Map();
  let pumping = false;
  const pump = async () => {
    if (pumping) return;
    pumping = true;
    while (pending.has(nextFrame)) {
      const item = pending.get(nextFrame);
      pending.delete(nextFrame);
      try {
        await new Promise((res, rej) => ff.stdin.write(item.buf, (e) => (e ? rej(e) : res())));
        item.resolve();
      } catch (e) {
        item.reject(e);
      }
      nextFrame++;
    }
    pumping = false;
  };
  frameSink = (n, buf) =>
    new Promise((resolve, reject) => {
      if (buf.length !== expect) return reject(new Error(`frame ${n}: ${buf.length} bytes, expected ${expect}`));
      pending.set(n, { buf, resolve, reject });
      pump();
    });

  const tStart = Date.now();
  const total = to - from + 1;
  for (let f = from; f <= to; f++) {
    const tE = Date.now();
    const r = await page.evaluate(async ([n, prof]) => {
      const r = await window.film.renderAndSend(n, { profile: prof });
      if (window.filmLost || window.film.gl.isContextLost()) throw new Error(`WebGL context lost at frame ${n}`);
      return r;
    }, [f, !!args.bench]);
    const wall = Date.now() - tE;
    const done = f - from + 1;
    const el = (Date.now() - tStart) / 1000;
    if (args.bench) {
      console.log(
        `[frame ${f}] wall ${wall}ms · in-page ${r.total.toFixed(0)}ms · ${r.samples} samples · scene ${r.scene.toFixed(0)} post ${r.post.toFixed(0)} read ${r.read.toFixed(0)} wait-upload ${r.wait.toFixed(0)} fetchCall ${r.fetchCall.toFixed(0)} ${JSON.stringify(r.passes)}`,
      );
    } else if (done === total || done % 12 === 0 || verbose) {
      const per = el / done;
      console.log(`[${shot}] ${done}/${total} frames · ${per.toFixed(2)}s/frame · eta ${((total - done) * per / 60).toFixed(1)} min`);
    }
  }
  await page.evaluate(() => window.film.flush());
  ff.stdin.end();
  await ffDone;
  await browser.close();
  server.close();
  console.log(`[done] ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
