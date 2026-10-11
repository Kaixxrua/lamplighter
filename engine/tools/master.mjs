// Masters and release encodes from the final shot renders.
//
//   node engine/tools/master.mjs --lang zh        → renders/master/zh/
//   options: --cinema PATH (default audio/out/mix_cinema.wav, −24 LUFS)
//            --web PATH    (default audio/out/mix_web.wav, −14 LUFS)
//            --only master|hevc|h264   --hd (also a 1080p H.264 for sharing)
//            --no-master (no ProRes master, ~25 GB: the release encodes read the shot renders directly)
//
// The master joins the ProRes 422 HQ shot renders without re-encoding, with the cinema mix as
// 24-bit PCM. Release encodes are made from the master with the web mix (with --no-master, from the
// joined shot renders). Rows marked lang:true come from renders/final/<lang>, every other row from
// renders/final/zh (see assemble.mjs).
// Nothing is written unless every row is present with exactly its timeline frame count.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
const only = args.only || null;
const noMaster = !!args['no-master'];
const cinema = path.resolve(args.cinema || path.join(ROOT, 'audio/out/mix_cinema.wav'));
const web = path.resolve(args.web || path.join(ROOT, 'audio/out/mix_web.wav'));
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8'));
const total = timeline.shots.reduce((n, r) => n + r.frames, 0);
const seconds = (total / FPS).toFixed(4);
const outDir = path.join(ROOT, 'renders/master', lang);
const base = path.join(outDir, `LAMPLIGHTER_${lang}`);
const TAGS = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];

function probeFrames(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 ? parseInt(r.stdout.trim(), 10) : NaN;
}

function ffmpeg(a, what) {
  console.log(`[master] ${what}`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-stats', '-y', ...a], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${what}`);
}

// every row must be there, at exactly its length
const segs = [];
const problems = [];
for (const row of timeline.shots) {
  const dir = row.lang || lang === 'zh' ? lang : 'zh';
  const f = path.join(ROOT, 'renders/final', dir, `${row.id}.mov`);
  if (!fs.existsSync(f)) problems.push(`${row.id}: missing ${path.relative(ROOT, f)}`);
  else {
    const n = probeFrames(f);
    if (n !== row.frames) problems.push(`${row.id}: ${n} frames, timeline says ${row.frames}`);
    else segs.push(f);
  }
}
if (problems.length) {
  console.error(`[master] not ready:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
for (const [name, p] of [['cinema mix', cinema], ['web mix', web]]) {
  if (!fs.existsSync(p)) {
    console.error(`[master] ${name} not found: ${p}`);
    process.exit(1);
  }
}

try {
  os.setPriority(0, +(process.env.LL_NICE ?? 15)); // refused when `nice` already put it lower: keep that
} catch {}
fs.mkdirSync(outDir, { recursive: true });
const master = `${base}_4K_ProRes422HQ.mov`;
// forward slashes: the concat list must read the same on Windows
const list = path.join(outDir, 'segments.txt');
fs.writeFileSync(list, segs.map((f) => `file '${f.split(path.sep).join('/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');

if (!noMaster && (!only || only === 'master')) {
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-i', cinema,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'pcm_s24le', '-ar', '48000',
    '-t', seconds, ...TAGS, master], 'master: ProRes 422 HQ + cinema mix (PCM 24-bit)');
  const n = probeFrames(master);
  if (n !== total) throw new Error(`master has ${n} frames, expected ${total}`);
}

const picture = noMaster || !fs.existsSync(master) ? ['-f', 'concat', '-safe', '0', '-i', list] : ['-i', master];
const release = (out, video, what) =>
  ffmpeg([...picture, '-i', web, '-map', '0:v', '-map', '1:a', ...video,
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', seconds, ...TAGS, '-movflags', '+faststart', out], what);

if (!only || only === 'hevc') {
  release(`${base}_4K_HEVC10.mp4`, ['-c:v', 'libx265', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p10le',
    '-tag:v', 'hvc1', '-x265-params', 'log-level=error'], 'release: H.265 10-bit + web mix');
}
if (!only || only === 'h264') {
  release(`${base}_4K_H264.mp4`, ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p'],
    'release: H.264 + web mix');
}
if (args.hd) {
  release(`${base}_1080p_H264.mp4`, ['-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '18', '-pix_fmt', 'yuv420p'], 'share copy: 1080p H.264 + web mix');
}
console.log(`[done] ${path.relative(ROOT, outDir)}`);
