// Assemble the cut from per-shot renders in timeline order, with the score underneath.
//
//   node engine/tools/assemble.mjs --lang zh --w 960        → renders/animatic/zh/animatic.mp4
//   options: --src preview|final   --audio PATH|none (default audio/out/temp_mix.wav if present)
//            --no-burn (no shot ids / frame counter)   --out PATH   --from ID --to ID
//            --srcdir PATH (read the shot renders from PATH/<lang>/ instead of renders/<src>/<lang>/, e.g. a
//            snapshot copied out first, so a render being rewritten meanwhile cannot end up in the cut)
//
// Shots are the timeline rows (s45 is its own render even though it shares module s44). A missing
// shot becomes a slate: ink background, shot id and title. Every segment is forced to its timeline
// length (trimmed, or padded by holding its last frame) so the picture always lines up with the
// score. Cards and letterbox are already in the shot renders (the engine composites them).
// The en cut takes its interface rows (lang:true) from renders/<src>/en and every other row from zh.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 24;

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
const lang = args.lang || 'zh';
const W = +(args.w || 960);
const H = Math.round((W * 9) / 16 / 2) * 2;
const src = args.src === 'final' ? 'final' : 'preview';
const srcDir = path.resolve(args.srcdir || path.join(ROOT, 'renders', src));
const burn = !args['no-burn'];
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8'));

let rows = timeline.shots;
if (args.from) rows = rows.slice(Math.max(0, rows.findIndex((r) => r.id === args.from)));
if (args.to) rows = rows.slice(0, rows.findIndex((r) => r.id === args.to) + 1);
if (!rows.length) throw new Error('no shots selected');
const total = rows.reduce((n, r) => n + r.frames, 0);

const SERIF = path.join(ROOT, 'engine/fonts/NotoSerifSC-Regular.otf');
const MONO = path.join(ROOT, 'engine/fonts/JetBrainsMono-VF.ttf');
const out = path.resolve(args.out || path.join(ROOT, 'renders/animatic', lang, src === 'final' ? 'cut.mp4' : 'animatic.mp4'));
const tmp = path.join(path.dirname(out), '.tmp');
fs.mkdirSync(tmp, { recursive: true });

// drawtext reads its text from files, so titles need no filtergraph escaping
const textFile = (name, text) => {
  const p = path.join(tmp, `${name}.txt`);
  fs.writeFileSync(p, text);
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
};
const font = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');

function probeFrames(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 ? parseInt(r.stdout.trim(), 10) : NaN;
}

// Only rows marked lang:true (interface captures) differ between languages; the others are
// rendered once, in zh, and shared by both cuts.
function shotFile(row) {
  const dir = row.lang || lang === 'zh' ? lang : 'zh';
  for (const ext of ['mp4', 'mov', 'mkv']) {
    const p = path.join(srcDir, dir, `${row.id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const tc = (f) => `${Math.floor(f / FPS / 60)}:${String(Math.floor(f / FPS) % 60).padStart(2, '0')}`;
const inputs = [];
const chains = [];
const report = [];
rows.forEach((row, k) => {
  const N = row.frames;
  const file = shotFile(row);
  const label = textFile(`id-${row.id}`, `${row.id}  ${row.title}   ${tc(row.start)}`);
  let chain;
  if (file) {
    const n = probeFrames(file);
    report.push(`${row.id.padEnd(4)} ${String(N).padStart(4)}f  ${n === N ? 'ok' : `has ${n}f → ${n > N ? 'trim' : 'hold last frame'}`}`);
    inputs.push('-i', file);
    chain = `[${k}:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,` +
      `tpad=stop_mode=clone:stop=${N},trim=end_frame=${N},setpts=PTS-STARTPTS`;
  } else {
    report.push(`${row.id.padEnd(4)} ${String(N).padStart(4)}f  MISSING → slate`);
    inputs.push('-f', 'lavfi', '-i', `color=c=0x151512:s=${W}x${H}:r=${FPS}:d=${(N / FPS).toFixed(4)}`);
    const title = textFile(`slate-${row.id}`, `${row.id}  ${row.title}`);
    chain = `[${k}:v]drawtext=fontfile=${font(SERIF)}:textfile=${title}:fontcolor=0xF7F5EE:` +
      `fontsize=${Math.round(H / 16)}:x=(w-tw)/2:y=(h-th)/2,` +
      `drawtext=fontfile=${font(MONO)}:text='not rendered yet':fontcolor=0xE8A33D:` +
      `fontsize=${Math.round(H / 34)}:x=(w-tw)/2:y=(h/2)+${Math.round(H / 10)},` +
      `setsar=1,trim=end_frame=${N},setpts=PTS-STARTPTS`;
  }
  if (burn) {
    chain += `,drawtext=fontfile=${font(SERIF)}:textfile=${label}:fontcolor=0xF7F5EE@0.85:` +
      `fontsize=${Math.round(H / 36)}:x=${Math.round(H / 40)}:y=h-th-${Math.round(H / 40)}:` +
      `box=1:boxcolor=0x000000@0.45:boxborderw=${Math.round(H / 120)}`;
  }
  chains.push(`${chain}[v${k}]`);
});

let graph = chains.join(';\n') + ';\n' + rows.map((_, k) => `[v${k}]`).join('') + `concat=n=${rows.length}:v=1:a=0`;
graph += burn
  ? `,drawtext=fontfile=${font(MONO)}:text='f %{frame_num}':start_number=${rows[0].start}:fontcolor=0xF7F5EE@0.85:` +
    `fontsize=${Math.round(H / 36)}:x=w-tw-${Math.round(H / 40)}:y=h-th-${Math.round(H / 40)}:` +
    `box=1:boxcolor=0x000000@0.45:boxborderw=${Math.round(H / 120)}[vout]`
  : '[vout]';

// the score, cut to the same span of the timeline
const seconds = total / FPS;
const offset = rows[0].start / FPS;
const audio = args.audio === 'none' ? null : args.audio || path.join(ROOT, 'audio/out/temp_mix.wav');
const audioArgs = [];
let amap;
if (audio && fs.existsSync(audio)) {
  audioArgs.push('-ss', offset.toFixed(4), '-i', audio);
  amap = `${rows.length}:a`;
} else {
  audioArgs.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
  amap = `${rows.length}:a`;
}

const ffArgs = ['-hide_banner', '-loglevel', 'error', '-stats', '-y', ...inputs, ...audioArgs,
  '-filter_complex', graph, '-map', '[vout]', '-map', amap,
  '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', seconds.toFixed(4), '-movflags', '+faststart', out];

console.log(`[assemble] ${lang} · ${src} · ${W}×${H} · ${rows.length} shots · ${total} frames (${seconds.toFixed(2)} s)`);
console.log(report.join('\n'));
console.log(`[assemble] audio: ${audio && fs.existsSync(audio) ? path.relative(ROOT, audio) : 'silence'}`);
try {
  os.setPriority(0, +(process.env.LL_NICE ?? 15)); // refused when `nice` already put it lower: keep that
} catch {}
const ff = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
ff.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[assemble] ffmpeg exited with ${code}`);
    process.exit(code || 1);
  }
  const n = probeFrames(out);
  console.log(`[done] ${path.relative(ROOT, out)} · ${n} frames${n === total ? '' : ` (expected ${total})`}`);
});
