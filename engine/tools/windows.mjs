// The whole film on a Windows PC with an NVIDIA GPU, from a fresh clone to the masters. Started by
// render-windows.cmd, which installs Git, Node.js and FFmpeg and clones (or updates) the film first.
// Run it again at any point: every step skips what is already done.
//
//   node engine/tools/windows.mjs            all of it: about 20 minutes of checks, then the render
//   node engine/tools/windows.mjs --test     only the checks and the timing; the summary goes to
//                                            renders/windows-test.txt (a version with shots still
//                                            to make stops there too)
//   options: --angle d3d11|gl|vulkan (no choosing)   --jobs N (no measuring)   --recheck
//            --no-master (no ProRes masters)   --gpu NVIDIA (the word WebGL's renderer must contain)
//            --only s06,s21 and --bench-w 3840 (to try the checks on part of the film)
//
// 1. tools: Node ≥ 20; ffmpeg and ffprobe with prores_ks, libx264, libx265 and x2rgb10le; Playwright
//    1.63.0 into .node/ and its Chromium 153 (revision 1243)
// 2. the GPU: Windows is told to run that Chromium on the high-performance GPU; each ANGLE backend
//    renders one frame, those whose WebGL is on the NVIDIA GPU are timed at 3840 and the fastest is kept
// 3. the check: every reference frame in renders/gpu-ref (rendered on SwiftShader where the film was
//    made) against the same frame on the GPU (gpu-check.mjs); one or two renders at once, measured
// 4. the picture: render-queue.mjs at 3840, final quality → renders/final/{zh,en}
// 5. the sound: audio/synth/deliver.mjs --render --final → audio/out, compared with renders/gpu-ref/audio.json
// 6. the masters: master.mjs --hd for zh and en → renders/master/{zh,en}
// The PC is kept awake while it works. Everything is also written to renders/windows.log.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { estimate, timedSamples } from './estimate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLAYWRIGHT_VERSION = '1.63.0';
const PW = path.join(ROOT, '.node/node_modules/playwright');
const LOG = path.join(ROOT, 'renders/windows.log');
const STATE = path.join(ROOT, 'renders/windows-state.json');
const REF = path.join(ROOT, 'renders/gpu-ref');
const WIN = process.platform === 'win32';
const GB = 1024 ** 3;

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
const need = String(args.gpu || 'NVIDIA');
const only = args.only ? ['--only', String(args.only)] : [];
fs.mkdirSync(path.dirname(LOG), { recursive: true });

const say = (s = '') => {
  console.log(s);
  fs.appendFileSync(LOG, s + '\n');
};
const stamp = () => new Date().toLocaleString('zh-CN', { hour12: false });
const step = (s) => say(`\n== ${stamp()} · ${s}`);
const hm = (s) => `${Math.floor(s / 3600)} 小时 ${Math.round(s / 60) % 60} 分`;
// the end of this run: code 0 is a planned stop, anything else a problem
function stop(msg, code = 1) {
  say(`\n${code ? '✗' : '·'} ${msg}`);
  if (code) say(`  完整记录在 ${path.relative(ROOT, LOG)}，有问题把它发过来。`);
  process.exit(code);
}

// a child process, its output shown (or not) and logged; resolves { code, tail }
function run(cmd, a, { env = {}, quiet = false } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, a, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let tail = '';
    const on = (s) => {
      tail = (tail + s).slice(-20000);
      fs.appendFileSync(LOG, s);
      if (!quiet) process.stdout.write(s);
    };
    p.stdout.setEncoding('utf8').on('data', on);
    p.stderr.setEncoding('utf8').on('data', on);
    p.on('error', (e) => resolve({ code: -1, tail: String(e) }));
    p.on('exit', (code) => resolve({ code, tail }));
  });
}
const node = (a, o) => run(process.execPath, a, o);

const readJson = (f, d = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return d;
  }
};
const state = readJson(STATE, {});
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
const freeBytes = () => {
  const s = fs.statfsSync(ROOT);
  return s.bavail * s.bsize;
};

// keep Windows from sleeping while this process lives (the screen may still turn off)
function keepAwake() {
  if (!WIN || keepAwake.p) return;
  const ps = `$k = Add-Type -Name P -Namespace W -PassThru -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[void]$k::SetThreadExecutionState([uint32]2147483649)
while ($true) { Start-Sleep -Seconds 60 }`;
  keepAwake.p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')],
    { stdio: 'ignore', windowsHide: true });
  keepAwake.p.on('error', () => {});
  process.on('exit', () => keepAwake.p.kill());
}

const timeline = readJson(path.join(ROOT, 'film/timeline.json'));
const hasModule = (r) => fs.existsSync(path.join(ROOT, 'shots', `${r.module}.js`));
const jobs = [...timeline.shots.map((r) => ({ r, lang: 'zh' })), ...timeline.shots.filter((r) => r.lang).map((r) => ({ r, lang: 'en' }))];
const filmFrames = jobs.reduce((n, j) => n + j.r.frames, 0);
const masterFrames = 2 * timeline.shots.reduce((n, r) => n + r.frames, 0);
const plan = readJson(path.join(ROOT, 'film/plan.json')); // every frame's samples (estimate.mjs)
// a timed row's samples a frame: its timed frames' mean in the plan, else the shot's floor
const timedOf = (x, n) => {
  const m = timedSamples(plan, timeline, x.id, n);
  return m === null ? x.samples : Math.round(m);
};

say(`\n《燃灯者 LAMPLIGHTER》4K 渲染 · ${stamp()} · ${ROOT}`);
say('请插上电源，别合上屏幕。渲染期间电脑会保持唤醒（屏幕可以关）。');
say('别在这个黑色窗口里点鼠标：Windows 会因此暂停输出，渲染也跟着停住。不小心点了，按一下 Esc 就能继续。');

// ---------------------------------------------------------------------------------------- 1. tools
step('1/6 检查工具');
{
  const major = +process.versions.node.split('.')[0];
  if (major < 20) stop(`Node.js 版本是 ${process.versions.node}，需要 20 或更高。请运行 winget upgrade OpenJS.NodeJS.LTS 后重试。`);
  const enc = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  const pix = spawnSync('ffmpeg', ['-hide_banner', '-pix_fmts'], { encoding: 'utf8' });
  const probe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  if (enc.status !== 0 || probe.status !== 0) stop('找不到 ffmpeg 或 ffprobe。请关掉这个窗口，重新运行 render-windows.cmd。');
  const miss = ['prores_ks', 'libx264', 'libx265'].filter((e) => !new RegExp(`\\s${e}\\s`).test(enc.stdout));
  if (!/x2rgb10le/.test(pix.stdout)) miss.push('x2rgb10le');
  if (miss.length) stop(`这个 ffmpeg 缺少 ${miss.join('、')}。请运行 winget install Gyan.FFmpeg 换成完整版。`);
  say(`Node ${process.versions.node} · ${spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0]}`);

  // from the official sources; when those cannot be reached, once more from the npmmirror mirror
  const pwVersion = readJson(path.join(PW, 'package.json'), {}).version;
  if (pwVersion !== PLAYWRIGHT_VERSION) {
    say(`安装 Playwright ${PLAYWRIGHT_VERSION} 到 .node\\ …`);
    const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!fs.existsSync(npmCli)) stop(`找不到 npm（${npmCli}）。请重装 Node.js：winget install OpenJS.NodeJS.LTS。`);
    const npm = (extra) => node([npmCli, 'install', '--prefix', '.node', '--no-audit', '--no-fund', ...extra, `playwright@${PLAYWRIGHT_VERSION}`]);
    let r = await npm([]);
    if (r.code !== 0) {
      say('连不上 npm 官方源，改从国内镜像 registry.npmmirror.com 再装一次…');
      r = await npm(['--registry=https://registry.npmmirror.com']);
    }
    if (r.code !== 0) stop('Playwright 安装失败（见上面的输出）。检查网络或打开代理后重试。');
  }
  say('下载或确认 Chromium 153（约 170 MB，已下载过就跳过）…');
  const cli = [path.join(PW, 'cli.js'), 'install', '--no-shell', 'chromium'];
  // without this the install deletes every browser it cannot tie to a Playwright it knows of, other tools' too
  const keep = { PLAYWRIGHT_SKIP_BROWSER_GC: '1' };
  let r = await node(cli, { env: keep });
  if (r.code !== 0) {
    say('连不上 Playwright 官方下载地址，改从国内镜像 cdn.npmmirror.com 再下一次…');
    r = await node(cli, { env: { ...keep, PLAYWRIGHT_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/playwright' } });
  }
  if (r.code !== 0) stop('Chromium 下载失败（见上面的输出）。检查网络或打开代理后重试。');
}
const { chromium } = await import(pathToFileURL(path.join(PW, 'index.mjs')).href);
const chrome = chromium.executablePath();
if (!fs.existsSync(chrome)) stop(`找不到 Chromium：${chrome}`);
say(`Chromium：${chrome}`);
if (!fs.existsSync(path.join(REF, 'manifest.json'))) stop('缺少 renders/gpu-ref（参考帧）。仓库不完整，请重新克隆。');
const refs = readJson(path.join(REF, 'manifest.json'));
keepAwake();

// ---------------------------------------------------------------------------------- 2. the GPU
step('2/6 选显卡和 WebGL 后端');
if (WIN) {
  // Settings → Display → Graphics: this Chromium on the high-performance GPU
  spawnSync('reg', ['add', 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences', '/v', chrome, '/t', 'REG_SZ',
    '/d', 'GpuPreference=2;', '/f'], { stdio: 'ignore' });
}
const fresh = args.recheck || state.reference !== refs.commit || !state.angle || (args.angle && args.angle !== state.angle);
if (fresh) {
  for (const k of ['angle', 'headed', 'gpu', 'bench', 'check', 'jobs', 'reference']) delete state[k];
  const probeShot = ['s21', 's14', 's06'].find((id) => timeline.shots.some((r) => r.id === id && hasModule(r)));
  const tried = [];
  for (const headed of [false, true]) {
    for (const angle of args.angle ? [String(args.angle)] : ['d3d11', 'gl', 'vulkan']) {
      const env = { LL_ANGLE: angle, LL_REQUIRE_GPU: need, LL_HEADED: headed ? '1' : '0' };
      const out = path.join(ROOT, 'renders/gpu-check', `probe-${angle}.png`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const r = await node(['engine/tools/render.mjs', '--shot', probeShot, '--still', '24', '--quality', 'final', '--w', '960', '--out', out], { env, quiet: true });
      const gpu = /"gpu":"([^"]*)"/.exec(r.tail)?.[1] || /WebGL is on "([^"]*)"/.exec(r.tail)?.[1] || '（没有拿到）';
      const t = { angle, headed, code: r.code, gpu };
      say(`  ${angle}${headed ? '（窗口模式）' : ''}：${r.code === 0 ? '可用' : r.code === 3 ? '没在 ' + need + ' 上' : '出错 exit ' + r.code} · ${gpu}`);
      if (r.code !== 0 && r.code !== 3) fs.appendFileSync(LOG, r.tail.split('\n').slice(-12).join('\n') + '\n');
      tried.push(t);
    }
    if (tried.some((t) => t.code === 0)) break;
  }
  const usable = tried.filter((t) => t.code === 0);
  if (!usable.length) {
    stop(`WebGL 没能跑在 ${need} 显卡上。请依次试：\n` +
      '  1) 插上电源，在 NVIDIA 官网或 GeForce Experience 里把显卡驱动更新到最新；\n' +
      '  2) 设置 → 系统 → 屏幕 → 显示卡（图形）：添加下面这个程序，选「高性能」：\n' +
      `     ${chrome}\n` +
      '  3) NVIDIA 控制面板 → 管理 3D 设置 → 程序设置：添加同一个 chrome.exe，选「高性能 NVIDIA 处理器」；\n' +
      '  然后重新运行 render-windows.cmd。', 3);
  }
  // the fastest at full size (the setup counts once per shot, so against about 100 frames)
  let best = null;
  for (const t of usable) {
    process.env.LL_HEADED = t.headed ? '1' : '0';
    const r = await node(['engine/tools/gpu-check.mjs', '--bench', '--angle', t.angle, '--only', probeShot, '--frames', '3',
      '--require', need, '--w', String(args['bench-w'] || 3840)], { quiet: true });
    const b = readJson(path.join(ROOT, 'renders/gpu-check', t.angle, 'bench.json'));
    if (r.code !== 0 || !b) {
      say(`  ${t.angle}：计时失败（exit ${r.code}），不用它`);
      continue;
    }
    const x = b.results[0];
    t.score = x.setup + 100 * x.perFrame;
    say(`  ${t.angle}：${probeShot} 准备 ${x.setup} s，每帧 ${x.perFrame} s`);
    if (!best || t.score < best.score) best = t;
  }
  if (!best) stop('所有可用的后端都没能完成计时渲染。');
  Object.assign(state, { angle: best.angle, headed: best.headed, gpu: best.gpu });
  save();
}
process.env.LL_ANGLE = state.angle;
process.env.LL_HEADED = state.headed ? '1' : '0';
process.env.LL_REQUIRE_GPU = need;
say(`用 ${state.angle}${state.headed ? '（窗口模式）' : ''} · ${state.gpu}`);

// ---------------------------------------------------------------------------------- 3. the check
step('3/6 一致性检查：GPU 画面对服务器参考帧');
if (!state.check) {
  const r = await node(['engine/tools/gpu-check.mjs', '--check', '--angle', state.angle, '--require', need, ...only]);
  const rep = readJson(path.join(ROOT, 'renders/gpu-check', state.angle, 'report.json'));
  if (r.code === 3) stop(`WebGL 不在 ${need} 上了（见上面的输出）。重新运行一次；还不行就按第 2 步的提示设置显卡。`, 3);
  if (!rep) stop(`一致性检查没有跑完（exit ${r.code}）。`);
  const bad = rep.frames.filter((f) => f.verdict !== 'ok').map((f) => `${f.id}-${f.lang} ${f.verdict}`);
  if (rep.fail) {
    stop(`有 ${rep.fail} 帧和参考差得太多：${bad.join('，')}。\n` +
      `  先别渲。把 renders\\gpu-check\\${state.angle}\\ 里的 report.json 和 *-compare.png 发过来。\n` +
      '  也可以加 --angle gl（或 vulkan）换个后端再试：render-windows.cmd --angle gl --recheck');
  }
  say(`通过：ok ${rep.ok}，warn ${rep.warn}${bad.length ? `（${bad.join('，')}）` : ''}`);
  // a timing of a few shots, for the estimate
  const r2 = await node(['engine/tools/gpu-check.mjs', '--bench', '--angle', state.angle, '--require', need, '--w', String(args['bench-w'] || 3840), ...only], { quiet: true });
  const bench = readJson(path.join(ROOT, 'renders/gpu-check', state.angle, 'bench.json'));
  if (r2.code !== 0 || !bench) stop(`计时渲染失败（exit ${r2.code}）。`);
  for (const x of bench.results) say(`  ${x.id}（${timedOf(x, bench.frames)} 样本）：准备 ${x.setup} s，每帧 ${x.perFrame} s`);
  state.check = { ok: rep.ok, warn: rep.warn, fail: rep.fail, notes: bad };
  state.bench = bench.results;
  state.benchFrames = bench.frames;
  state.reference = refs.commit;
  save();
}

// one render at a time, or two: the faster over a few short shots, measured once
if (args.jobs) state.jobs = +args.jobs;
if (!state.jobs) {
  const short = timeline.shots.filter((r) => hasModule(r) && r.id !== 's12' && r.frames <= 96).slice(0, 3).map((r) => r.id);
  const wall = {};
  for (const n of [1, 2]) {
    const dir = path.join(ROOT, 'renders/gpu-check/jobs');
    fs.rmSync(dir, { recursive: true, force: true });
    const t0 = Date.now();
    const r = await node(['engine/tools/render-queue.mjs', '--quality', 'final', '--w', String(args['bench-w'] || 3840), '--only', short.join(','),
      '--dir', dir, '--force', '--jobs', String(n)], { quiet: true });
    wall[n] = (Date.now() - t0) / 1000;
    fs.rmSync(dir, { recursive: true, force: true });
    if (r.code !== 0) {
      wall[n] = Infinity;
      fs.appendFileSync(LOG, r.tail.split('\n').slice(-12).join('\n') + '\n');
    }
  }
  if (!Number.isFinite(wall[1])) stop('试渲几个短镜头时失败了（见 renders/windows.log）。');
  state.jobs = wall[2] < 0.85 * wall[1] ? 2 : 1;
  say(`同时渲 1 个用 ${wall[1].toFixed(0)} s，2 个用 ${Number.isFinite(wall[2]) ? wall[2].toFixed(0) + ' s' : '失败'} → 同时渲 ${state.jobs} 个`);
  save();
}

// the estimate (estimate.mjs): between the timed frames' seconds × the film's frames and their seconds
// per sample × the film's samples, with the setups and the renders at once
const est = estimate({ timeline, jobs, bench: state.bench, n: state.benchFrames || 4, plan, together: state.jobs });
const about = est.hi - est.lo < 0.15 * est.hi ? `约 ${hm(est.hi)}` : `约 ${hm(est.lo)} 到 ${hm(est.hi)}`;
const renderBytes = filmFrames * 3.8e6;
say(`全片 ${jobs.length} 个渲染任务、${filmFrames} 帧，估计${about}；镜头文件约 ${(renderBytes / GB).toFixed(0)} GB，这块盘还剩 ${(freeBytes() / GB).toFixed(0)} GB。`);

// a version with shots still to make only checks: its renders would be thrown away with the next one
const unmade = timeline.shots.filter((r) => !hasModule(r)).map((r) => r.id);
if (args.test || unmade.length) {
  const lines = [
    `《燃灯者》Windows 测试 · ${stamp()}`,
    `GPU：${state.gpu}`,
    `后端：${state.angle}${state.headed ? '（窗口模式）' : ''} · 同时渲 ${state.jobs} 个`,
    `一致性检查：ok ${state.check.ok}，warn ${state.check.warn}，fail ${state.check.fail}${state.check.notes.length ? '（' + state.check.notes.join('，') + '）' : ''}`,
    ...state.bench.map((x) => `计时 ${x.id}（${timedOf(x, state.benchFrames || 4)} 样本）：准备 ${x.setup} s，每帧 ${x.perFrame} s`),
    `全片估计：${about}（${filmFrames} 帧${est.samples ? `，${est.samples} 样本` : ''}）`,
    `磁盘：剩 ${(freeBytes() / GB).toFixed(0)} GB；镜头文件约 ${(renderBytes / GB).toFixed(0)} GB，两版 ProRes 母版再要约 ${(masterFrames * 3.8e6 / GB).toFixed(0)} GB`,
    `参考帧：${refs.commit.slice(0, 7)}，${refs.frames.length} 帧`,
  ];
  if (unmade.length) lines.push(`这一版还有 ${unmade.length} 个镜头没做完（${unmade.join(',')}），只做检查和测速`);
  fs.writeFileSync(path.join(ROOT, 'renders/windows-test.txt'), lines.join('\r\n') + '\r\n');
  step('测试完成');
  for (const l of lines) say('  ' + l);
  say('\n把上面这几行（也在 renders\\windows-test.txt）发过来即可。');
  say(unmade.length ? '等终版推上来后再运行一次 render-windows.cmd，就会开始正式渲染。'
    : '正式渲染时直接再运行 render-windows.cmd（不带 --test）。');
  process.exit(0);
}

// ---------------------------------------------------------------------------------- 4. the picture
step('4/6 渲染画面（4K，可随时关掉窗口，下次从断点继续）');
{
  const left = await node(['engine/tools/render-queue.mjs', '--dry'], { quiet: true });
  const n = +(/· (\d+) frames/.exec(left.tail)?.[1] ?? filmFrames);
  if (n && freeBytes() < n * 3.8e6 + 5 * GB) stop(`磁盘空间不够：还要渲 ${n} 帧，约 ${(n * 3.8e6 / GB).toFixed(0)} GB，这块盘只剩 ${(freeBytes() / GB).toFixed(0)} GB。腾出空间后重试。`);
  const r = await node(['engine/tools/render-queue.mjs', '--w', '3840', '--quality', 'final', '--retry', '2', '--jobs', String(state.jobs)]);
  if (r.code === 3) stop(`WebGL 不在 ${need} 上了，渲染已停。重新运行一次；还不行就按第 2 步的提示设置显卡。`, 3);
  if (r.code !== 0) stop('有镜头渲染失败（见上面的 [fail] 行）。重新运行会只补渲没完成的镜头。');
}

// ---------------------------------------------------------------------------------- 5. the sound
step('5/6 声音：从乐谱代码渲染混音和分轨');
{
  const r = await node(['--no-warnings', 'audio/synth/deliver.mjs', '--render', '--final']);
  if (r.code !== 0) stop('声音渲染失败（见上面的输出）。');
  const want = readJson(path.join(REF, 'audio.json'));
  if (want) {
    const diff = Object.entries(want.sha256).filter(([f, h]) => {
      const p = path.join(ROOT, f);
      return !fs.existsSync(p) || crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== h;
    });
    say(diff.length ? `注意：${diff.map(([f]) => f).join('、')} 和服务器上渲的不是逐位相同（响度报告见 audio/out/deliver/deliver.json），继续。`
      : `混音和分轨与服务器上渲的逐位相同（${Object.keys(want.sha256).length} 个文件）。`);
  }
}

// ---------------------------------------------------------------------------------- 6. the masters
step('6/6 母版和发布版');
{
  const finals = jobs.map((j) => path.join(ROOT, 'renders/final', j.lang, `${j.r.id}.mov`)).filter((f) => fs.existsSync(f));
  const size = (lang, id) => {
    const f = path.join(ROOT, 'renders/final', lang, `${id}.mov`);
    return fs.existsSync(f) ? fs.statSync(f).size : 0;
  };
  // a master is as big as the shots it joins (the en one takes the zh shots for rows without text)
  const masterBytes = timeline.shots.reduce((s, r) => s + size('zh', r.id) + size(r.lang ? 'en' : 'zh', r.id), 0);
  const noMaster = args['no-master'] || freeBytes() < masterBytes + 10 * GB;
  if (noMaster && !args['no-master']) say(`磁盘只剩 ${(freeBytes() / GB).toFixed(0)} GB，不做两版 ProRes 母版（约 ${(masterBytes / GB).toFixed(0)} GB），只出 HEVC / H.264 发布版。`);
  const newest = Math.max(...finals.map((f) => fs.statSync(f).mtimeMs), fs.statSync(path.join(ROOT, 'audio/out/mix_web.wav')).mtimeMs);
  for (const lang of ['zh', 'en']) {
    const h264 = path.join(ROOT, 'renders/master', lang, `LAMPLIGHTER_${lang}_4K_H264.mp4`);
    if (fs.existsSync(h264) && fs.statSync(h264).mtimeMs > newest) {
      say(`${lang}：已经是最新的，跳过`);
      continue;
    }
    const r = await node(['engine/tools/master.mjs', '--lang', lang, '--hd', ...(noMaster ? ['--no-master'] : [])]);
    if (r.code !== 0) stop(`${lang} 母版失败（见上面的输出）。`);
  }
}

step('全部完成');
for (const lang of ['zh', 'en']) {
  const dir = path.join(ROOT, 'renders/master', lang);
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mov|mp4)$/.test(f)) : []) {
    say(`  ${path.join('renders/master', lang, f)} · ${(fs.statSync(path.join(dir, f)).size / GB).toFixed(2)} GB`);
  }
}
if (WIN) spawn('explorer.exe', [path.join(ROOT, 'renders', 'master')], { stdio: 'ignore', detached: true }).unref();
process.exit(0);
