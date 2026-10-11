// Overnight queue: renders every timeline row at final quality, one shot at a time (one Chromium
// already saturates the CPU; on a GPU --jobs 2 can keep it busier), and can be stopped and restarted
// at any point.
//
//   node engine/tools/render-queue.mjs                 → all rows in zh, then the lang:true rows in en
//   options: --only s14,s15   --from s20 --to s26   --w 3840   --quality final   --dry (list jobs only)
//            --force (re-render even if up to date)   --retry N (a failed job again, up to N times)
//            --jobs N (renders at once, default 1)   --dir PATH (instead of renders/<final|preview>)
//
// A row is up to date when renders/<final>/<lang>/<id>.mov has the row's frame count and is newer
// than its shot module, engine/runtime, engine/world, render.mjs and film/timeline.json. Each job writes to a
// temporary file that is renamed only once ffprobe confirms the frame count, so a killed job never
// leaves a file that looks finished. Progress and timings go to renders/<quality>/queue.log.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
const retries = Math.max(0, +(args.retry || 0));
const parallel = Math.max(1, +(args.jobs || 1));
const W = +(args.w || 3840);
const quality = args.quality || 'final';
const outDir = args.dir ? path.resolve(args.dir) : path.join(ROOT, 'renders', quality === 'final' ? 'final' : 'preview');
const ext = quality === 'final' ? 'mov' : 'mp4';
const logFile = path.join(outDir, 'queue.log');
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8'));

let rows = timeline.shots;
if (args.from) rows = rows.slice(Math.max(0, rows.findIndex((r) => r.id === args.from)));
if (args.to) rows = rows.slice(0, rows.findIndex((r) => r.id === args.to) + 1);
if (args.only) {
  const keep = new Set(String(args.only).split(','));
  rows = rows.filter((r) => keep.has(r.id));
}
const jobs = [
  ...rows.map((r) => ({ row: r, lang: 'zh' })),
  ...rows.filter((r) => r.lang).map((r) => ({ row: r, lang: 'en' })),
];

function newestMtime(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let m = 0;
  for (const e of fs.readdirSync(p)) {
    if (e === 'vendor' || e === 'fonts') continue;
    m = Math.max(m, newestMtime(path.join(p, e)));
  }
  return m;
}
// what a frame depends on besides its shot module (tools other than render.mjs do not count)
const engineTime = Math.max(
  newestMtime(path.join(ROOT, 'engine/runtime')),
  newestMtime(path.join(ROOT, 'engine/world')),
  newestMtime(path.join(ROOT, 'engine/tools/render.mjs')),
  newestMtime(path.join(ROOT, 'film/timeline.json')),
);

function probeFrames(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 ? parseInt(r.stdout.trim(), 10) : NaN;
}

const outPath = (j) => path.join(outDir, j.lang, `${j.row.id}.${ext}`);
function upToDate(j) {
  const out = outPath(j);
  if (!fs.existsSync(out)) return false;
  const mod = path.join(ROOT, 'shots', `${j.row.module}.js`);
  const src = Math.max(engineTime, fs.existsSync(mod) ? fs.statSync(mod).mtimeMs : Infinity);
  return fs.statSync(out).mtimeMs > src && probeFrames(out) === j.row.frames;
}

const log = (s) => {
  const line = `${new Date().toISOString()} ${s}`;
  console.log(line);
  fs.mkdirSync(outDir, { recursive: true });
  fs.appendFileSync(logFile, line + '\n');
};
const hms = (s) => `${Math.floor(s / 3600)}h${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`;

const todo = jobs.filter((j) => args.force || !upToDate(j));
const missingModule = todo.filter((j) => !fs.existsSync(path.join(ROOT, 'shots', `${j.row.module}.js`)));
const frames = todo.reduce((n, j) => n + j.row.frames, 0);
log(`[queue] ${quality} ${W}px · ${todo.length}/${jobs.length} jobs · ${frames} frames` +
  (missingModule.length ? ` · no module yet: ${missingModule.map((j) => j.row.id).join(',')}` : ''));
if (args.dry) {
  for (const j of todo) console.log(`  ${j.row.id} ${j.lang} ${j.row.frames}f`);
  process.exit(0);
}

// resolves { ok, code }; render.mjs exits 3 when WebGL is not on the GPU that LL_REQUIRE_GPU asks for
function run(j) {
  return new Promise((resolve) => {
    const out = outPath(j);
    const part = out.replace(/\.(\w+)$/, '.part.$1');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const a = ['engine/tools/render.mjs', '--shot', j.row.id, '--quality', quality, '--w', String(W),
      '--lang', j.lang, '--out', part];
    const p = spawn(process.execPath, a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const keep = (d) => { tail = (tail + d).slice(-4000); };
    p.stdout.on('data', keep);
    p.stderr.on('data', keep);
    p.on('exit', (code) => {
      const n = fs.existsSync(part) ? probeFrames(part) : NaN;
      if (code === 0 && n === j.row.frames) {
        fs.renameSync(part, out);
        resolve({ ok: true, code });
      } else {
        log(`[fail] ${j.row.id} ${j.lang} exit ${code}, ${n} of ${j.row.frames} frames\n${tail.trim().split('\n').slice(-8).join('\n')}`);
        resolve({ ok: false, code });
      }
    });
  });
}

let done = 0;
let wrongGpu = false;
const failed = [];
const tQueue = Date.now();
async function one(j) {
  if (!fs.existsSync(path.join(ROOT, 'shots', `${j.row.module}.js`))) {
    log(`[skip] ${j.row.id} ${j.lang}: shots/${j.row.module}.js does not exist`);
    failed.push(j.row.id);
    return;
  }
  const t0 = Date.now();
  log(`[start] ${j.row.id} ${j.lang} ${j.row.frames}f`);
  let r = await run(j);
  for (let k = 1; !r.ok && r.code !== 3 && k <= retries; k++) {
    log(`[retry] ${j.row.id} ${j.lang} (${k}/${retries})`);
    r = await run(j);
  }
  const s = (Date.now() - t0) / 1000;
  if (!r.ok) {
    if (r.code === 3) wrongGpu = true;
    failed.push(j.row.id);
    return;
  }
  done += j.row.frames;
  const left = frames - done;
  const wall = (Date.now() - tQueue) / 1000;
  log(`[done] ${j.row.id} ${j.lang} in ${hms(s)} (${(s / j.row.frames).toFixed(1)} s/frame) · eta ${hms((wall / done) * left)}`);
}
const waiting = [...todo];
await Promise.all(Array.from({ length: parallel }, async () => {
  while (waiting.length && !wrongGpu) await one(waiting.shift());
}));
if (wrongGpu) {
  log('[queue] stopped: WebGL is not on the GPU that LL_REQUIRE_GPU asks for');
  process.exit(3);
}
log(`[queue] finished · ${failed.length ? `failed or skipped: ${failed.join(',')}` : 'all jobs rendered'}`);
process.exit(failed.length ? 1 : 0);
