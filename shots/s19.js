// s19 · 1:30–1:35 · 光门 ★500 (global 2160–2279)
// The site's threshold, GitHub stars > 500, as a gate. The cards refined in s18 fly out of the lantern
// and back across the shaft, and at the gallery's edge on the lighthouse's floor (FLOOR, side 0, bearing
// 30°) the ones coming this way meet a gate: two posts and a lintel in the galleries' wood and brass,
// ★ 500 cut through the lintel and lit through from the shaft behind, and in the doorway a faint
// vertical membrane of lime, the sheet's next of kin, that lights only where a card touches it. Under
// 500 a card stops at it and goes to ash from the line it touched, the flakes cooling from a dark amber
// edge to grey and falling over the balustrade into the shaft; over 500 it passes, a lime edge runs once
// round it and stays, and it flies on past the camera into the gallery behind. The first verdicts show
// the rule; at 2.33 s the sheet comes round behind the gate, the letters are lit through and the
// membrane flashes (a taiko hit); at 2.8 a card with ★ 491 meets the membrane head on in the middle of
// the doorway, the membrane reads its stars out large, in grey, and the card goes to ash; at 3.6 the
// hero, ottervale/mcp-server from s18 (★ 2,431), crosses, the membrane reads it in lime, its edge runs,
// and it comes to the camera, holds a moment where it can be read, and whips past on the right.
// First frame: the gate in the middle, square on, the lantern bright and out of focus framed in the
// doorway (its lamp a little above the centre of the picture), the lintel dark, the first cards in
// flight between the lantern and the gate.
// Last frame: the doorway close, ★ 500 near the top of the picture glowing faintly (the lantern's side
// light through the cut); ash still falling in the shaft; the last passes coming through and flying at
// the camera with their lime edges (one just crossed, left of centre, one a metre short of the camera,
// right of centre); the hero gone past the camera's right.
// Camera: in the gallery, on the gate's axis (bearing 30°), level, square on, one-point perspective;
// 24 mm; 5.30 → 4.40 m from the membrane (17.96 → 17.06 m from the shaft's axis), 1.85 → 1.95 m above
// the floor, a glide over the whole shot; f/2.8, focus on the membrane, pulled to the hero 3.85–4.3 s
// and back to the membrane 4.6–4.9 s.
// Light: the library's lamps low, as in s17–s18 (LOOK17.lamp): side 0's two lamps, out of the picture
// between the camera and the gate, light the gate's face and the cards' faces; the lantern and the sheet
// (T = 32 + t: the sheet points at 180° at the cut and turns 450°, behind the gate at 2.33 s) from
// behind: the doorway, the cut letters, the rims of the ash; the lens's flash as the sheet crosses the
// camera held down to a glint (the camera stands on the sheet's path, see notes/progress/B.md). Act II
// grade +0.8 EV (the gallery is darker than the close-ups either side: first frame mean 42, last 49), the
// sheet's flash on it as in s14 at half strength.
// Interface: the cards' stats follow the site's locales (statsLabels), the only thing that differs
// between the two languages. The membrane's readouts are figures only (★ 491, ★ 2,431).
// Sound: see CUES (s into the shot; global frame = 2160 + 24 t).
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, smoothstep, track } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { canvasTexture, makeCanvas, loadFonts, font } from 'film/lib/text.js';
import { LIB_COMMON } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';
import { Dust } from 'world/dust.js';
import { Builder, MAT } from 'world/geo.js';
import { CARD, OTTERVALE, layoutCard, faceCanvas, drawStatic, arrow } from 'world/repocard.js';
import { sweepAngle, Y0, FLOOR } from './s13.js';
import { LOOK, FLASH, sheetAt, flashAt } from './s14.js';
import { LOOK17 } from './s17.js';
import { LOOK18 } from './s18.js';

export const meta = {
  frames: 120,
  quality: { final: { samples: 8 } },
  // the lamp core in the doorway, as in s14 and s17
  post: { streak: { strength: 0.4, threshold: 20, tint: [0.85, 1.0, 0.55], length: 0.2, decay: 0.8 } },
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const MM = 0.001;
const T0 = 32; // the sweep's clock at the first frame (s18 ended at T = 32): the sheet points at 180°
const END = meta.frames / 24;
const CW = CARD.W * MM;
const CH = CARD.H * MM;

// ------------------------------------------------------------------------------------------ the gate

// The gate's frame: a (m out from the shaft's axis along the side's normal, toward the camera), u (m
// along the side, the picture's right as the camera sees it), y (m above the floor, Y0).
export const BEARING = 30 * DEG; // side 0: the sheet comes round behind it at 2.33 s
const N0 = new THREE.Vector3(Math.cos(BEARING), 0, Math.sin(BEARING));
const EX = new THREE.Vector3(Math.sin(BEARING), 0, -Math.cos(BEARING));
const EY = new THREE.Vector3(0, 1, 0);
const QB = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(EX, EY, N0));
const G = (a, u, y, out = new THREE.Vector3()) => out.set(N0.x * a + EX.x * u, Y0 + y, N0.z * a + EX.z * u);

// Two posts and a lintel in the galleries' wood, brass bands at the posts' feet and capitals, standing
// just inside the balustrade (its rail runs 12.0–12.42 m out) on the floor's centre line. Smaller than
// a monumental gate so the whole of it and the lantern behind it fit a level 24 mm picture from inside
// a gallery 7 m deep: a 2.2 × 3.3 m doorway, the lintel's top at 3.78 m, the cornice's at 3.9 m (the
// gallery is 6.3 m high). ★ 500 is cut through a plate in the lintel's face, frosted glass behind it.
export const GATE = {
  bearing: BEARING,
  a: 12.66, // the membrane: the gate's middle plane, m from the axis
  clear: [2.2, 3.3], // the doorway, wide × high (m)
  post: [0.38, 0.42], // a post, across × deep
  lintel: 0.48, // high
  cornice: [0.12, 0.5], // high, deep
  letters: { text: '500', cap: 0.26, thick: 0.035, weight: 600, ppm: 1024 }, // cap height and the plate's thickness (m); the mask's px per m
};
// the gate's local frame (x right as the gallery sees it, y up, z out of the shaft; origin on the floor
// in the membrane) as a world matrix
export const gateMatrix = (bearing = GATE.bearing, a = GATE.a, y0 = Y0) => {
  const n = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing));
  const x = new THREE.Vector3(Math.sin(bearing), 0, -Math.cos(bearing));
  return new THREE.Matrix4().makeBasis(x, new THREE.Vector3(0, 1, 0), n).setPosition(n.x * a, y0, n.z * a);
};
// the gate's woodwork into a Builder (in the frame its transform sets); the lintel's face is left open
// for the lettered plate (see lintelMask)
export function buildGate(b, g = GATE) {
  const [w, h] = g.clear;
  const [pw, pd] = g.post;
  const px = w / 2 + pw / 2;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    b.box(V(s * px, 0.15, 0), V(pw + 0.1, 0.3, pd + 0.08), MAT.WOOD); // plinth
    b.box(V(s * px, (0.3 + h) / 2, 0), V(pw, h - 0.3, pd), MAT.WOOD); // post
    b.box(V(s * px, 0.33, 0), V(pw + 0.02, 0.05, pd + 0.02), MAT.BRASS); // band above the plinth
    b.box(V(s * px, h - 0.04, 0), V(pw + 0.04, 0.06, pd + 0.04), MAT.BRASS); // capital
  }
  const lw = w + 2 * pw;
  b.box(V(0, h + g.lintel / 2, 0), V(lw, g.lintel, pd - 0.04), MAT.WOOD, 0, ['+x', '-x', '+y', '-y', '-z']);
  b.box(V(0, h + g.lintel + g.cornice[0] / 2, 0), V(lw + 0.12, g.cornice[0], g.cornice[1]), MAT.WOOD);
  b.box(V(0, 0.02, 0), V(w, 0.04, pd), MAT.WOOD); // sill
}

// a five-pointed star centred (its box) on (cx, cy), outer radius R, as the site's icon (inner 0.43 R)
function starPath(c, cx, cy, R) {
  const y = cy + 0.0955 * R;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.43 * R : R;
    c[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), y + r * Math.sin(a));
  }
  c.closePath();
}
// "★ <figures>" in the film's mono, centred in a box (px): red the glyphs; with blur, green the same blurred
function starLine(c, text, x, y, w, h, cap, weight, blur = 0) {
  const ref = 400;
  c.font = font('mono', ref, weight);
  const capR = c.measureText('0123456789').actualBoundingBoxAscent / ref;
  c.font = font('mono', cap / capR, weight);
  const tw = c.measureText(text).width;
  const R = 0.62 * cap;
  const sw = 1.902 * R;
  const gap = 0.36 * cap;
  const x0 = x + (w - (sw + gap + tw)) / 2;
  const base = y + h / 2 + cap / 2;
  const draw = (fill) => {
    c.fillStyle = fill;
    starPath(c, x0 + sw / 2, base - cap / 2, R);
    c.fill();
    c.fillText(text, x0 + sw + gap, base);
  };
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  draw('rgb(255,0,0)');
  if (blur > 0) {
    c.filter = `blur(${blur.toFixed(1)}px)`;
    draw('rgb(0,255,0)');
    c.filter = 'none';
  }
}
// the lintel's plate: red the cut, green the cut blurred (its edge, darkened)
export async function lintelMask(g = GATE) {
  await loadFonts();
  const ppm = g.letters.ppm;
  const lw = g.clear[0] + 2 * g.post[0];
  const cv = makeCanvas(Math.round(lw * ppm), Math.round(g.lintel * ppm));
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  starLine(c, g.letters.text, 0, 0, cv.width, cv.height, g.letters.cap * ppm, g.letters.weight, 0.012 * ppm);
  return cv;
}

// --------------------------------------------------------------------------------------- the cards

// The repositories (fictional; lowercase, hyphenated, as on GitHub). Pass: GitHub stars > 500, as the
// site's public library (PUBLIC_PROJECT_MIN_STARS). Stars spread roughly log-evenly, half each side.
const R_ = (owner, repo, stars, today, heat, description, descriptionZh, tags, more = 0) => ({
  owner, repo, description, descriptionZh, tags: tags.map(([zh, en]) => ({ zh, en })), more, stars, today, heat,
});
export const PASS_MIN = 500;
export const passes = (spec) => spec.stars > PASS_MIN;
export const REPOS = [
  OTTERVALE,
  R_('quillmoth', 'prompt-ledger', 1284, 46, 61.2, 'Version your prompts like code and see what changed between runs.', '像管理代码一样给提示词做版本管理，对比每次运行的变化。', [['提示词工程', 'Prompt Engineering'], ['开发工具', 'Dev Tools']], 1),
  R_('harrowfield', 'eval-harness', 3906, 129, 78.5, 'Run the same evals on every model and keep the scores side by side.', '在每个模型上跑同一套评测，把分数并排对照。', [['评测 / 基准', 'Evaluation / Benchmarks'], ['大语言模型', 'LLMs']], 2),
  R_('fieldmouse', 'rag-pantry', 812, 23, 52.7, 'A small retrieval stack you can read in an afternoon.', '一套小巧的检索增强栈，一个下午就能读完。', [['RAG / 检索', 'RAG / Retrieval'], ['向量数据库', 'Vector DB']]),
  R_('brindle-ai', 'agent-trellis', 5377, 201, 83.1, 'Plan, act, retry: a minimal loop for agents that use tools.', '规划、执行、重试：给会用工具的智能体的一个最小循环。', [['AI Agent / 自动化', 'AI Agents / Automation'], ['工具调用', 'Tool Use']], 3),
  R_('seastack', 'token-counter', 667, 12, 44.9, 'Count tokens for any model before you send the request.', '发请求之前，先替任意模型数清 token。', [['开发工具', 'Dev Tools'], ['大语言模型', 'LLMs']]),
  R_('kelpforge', 'vision-notes', 1950, 74, 66.0, 'Turn screenshots into structured notes with a local vision model.', '用本地视觉模型把截图整理成结构化笔记。', [['多模态', 'Multimodal'], ['本地部署', 'Local Inference']], 1),
  R_('marrowlight', 'sft-recipes', 9412, 388, 91.3, 'Reproducible fine-tuning recipes for small open models.', '面向小型开源模型、可复现的微调配方。', [['微调 / 训练', 'Fine-tuning / Training'], ['开源模型', 'Open Models']], 2),
  R_('pellucid', 'doc-shepherd', 734, 19, 47.6, 'Keeps docs in step with code by opening the pull requests itself.', '自己开拉取请求，让文档跟上代码。', [['AI Agent / 自动化', 'AI Agents / Automation'], ['文档', 'Docs']]),
  R_('tinderbox-labs', 'voice-loop', 1123, 38, 58.8, 'Speech in, speech out: a low-latency loop for voice agents.', '语音进、语音出：为语音智能体做的低延迟循环。', [['语音', 'Speech'], ['实时', 'Real-time']], 1),
  R_('fernhollow', 'chat-scaffold', 491, 7, 39.8, 'A clean starting point for chat apps with streaming and history.', '带流式输出和会话历史的聊天应用起步模板。', [['聊天应用', 'Chat Apps'], ['模板', 'Templates']], 1),
  R_('mosswick', 'agent-sketch', 37, 2, 12.4, 'Notes and experiments toward a tiny agent framework.', '通往一个迷你智能体框架的笔记与实验。', [['AI Agent / 自动化', 'AI Agents / Automation']]),
  R_('driftwood-dev', 'llm-cli', 212, 5, 24.0, 'Ask a model a question from your terminal.', '在终端里直接向模型提问。', [['命令行', 'CLI'], ['开发工具', 'Dev Tools']]),
  R_('parcelbird', 'rag-starter', 86, 1, 15.3, 'A starter template for retrieval-augmented chat.', '检索增强对话的入门模板。', [['RAG / 检索', 'RAG / Retrieval'], ['模板', 'Templates']]),
  R_('glimmerjar', 'prompt-box', 149, 3, 19.7, 'Save and share prompts in a single file.', '把提示词存进一个文件，随手分享。', [['提示词工程', 'Prompt Engineering']]),
  R_('nettlecode', 'eval-lite', 318, 6, 28.1, 'Lightweight checks for prompt changes before they ship.', '提示词改动上线前的轻量检查。', [['评测 / 基准', 'Evaluation / Benchmarks']]),
  R_('cobbleway', 'agent-tools', 23, 1, 9.6, 'Small helpers for calling tools from an agent.', '让智能体调用工具的几个小助手函数。', [['工具调用', 'Tool Use']]),
  R_('hushfold', 'vector-notes', 401, 9, 33.5, 'Store notes as embeddings and search them by meaning.', '把笔记存成向量，按语义检索。', [['向量数据库', 'Vector DB'], ['笔记', 'Notes']]),
  R_('wrenmill', 'ai-digest', 58, 1, 14.2, 'A daily digest of new AI papers, summarised.', '每日 AI 新论文摘要。', [['论文', 'Papers'], ['资讯', 'News']]),
];
const SPEC = Object.fromEntries(REPOS.map((s) => [`${s.owner}/${s.repo}`, s]));
// what got in, the hero first, then by stars (s29 shelves them)
export const PASSED = [OTTERVALE, ...REPOS.filter((s) => s !== OTTERVALE && passes(s)).sort((a, b) => b.stars - a.stars)];

// The camera: on the axis, level, pushing in a metre: [a (m from the axis), height (m above the floor)].
export const CAM = {
  lens: 24,
  fstop: 2.8,
  keys: [
    [0, [GATE.a + 5.3, 1.85]],
    [END, [GATE.a + 4.4, 1.95], 'glide'],
  ],
};
const camAt = (t) => track(CAM.keys, t);
const TANH = 18 / CAM.lens; // tan of half the picture's width
// where gate-frame point (a, u) is across the picture at t, -1 left … 1 right
const pan = (a, u, t) => u / ((camAt(t)[0] - a) * TANH);

// The cards that come to the gate: [repository, when it meets the membrane (s), where (u, y: the card's
// centre, m), role]. Two are read out: the 491 head on in the middle, and the hero. No other card
// crosses the readouts' band (2.5–2.95 m, |u| < 0.85) while they show.
const PLAN = [
  ['quillmoth/prompt-ledger', 0.42, -0.5, 2.3],
  ['parcelbird/rag-starter', 0.7, 0.45, 1.7],
  ['harrowfield/eval-harness', 0.98, 0.3, 2.55],
  ['driftwood-dev/llm-cli', 1.22, -0.55, 1.6],
  ['fieldmouse/rag-pantry', 1.47, -0.1, 2.05],
  ['mosswick/agent-sketch', 1.72, 0.6, 2.45],
  ['brindle-ai/agent-trellis', 2.08, 0.45, 1.85],
  ['nettlecode/eval-lite', 2.45, -0.62, 2.35],
  ['seastack/token-counter', 2.62, -0.3, 1.5],
  ['fernhollow/chat-scaffold', 2.8, 0, 2.12, 'read'],
  ['kelpforge/vision-notes', 3.3, 0.7, 1.6],
  ['ottervale/mcp-server', 3.6, 0.04, 1.85, 'hero'],
  ['glimmerjar/prompt-box', 3.98, 0.6, 1.55],
  ['marrowlight/sft-recipes', 4.22, -0.7, 1.55],
  ['cobbleway/agent-tools', 4.4, 0.62, 3.02],
  ['pellucid/doc-shepherd', 4.55, -0.45, 2.15],
  ['wrenmill/ai-digest', 4.7, -0.2, 1.45],
  ['tinderbox-labs/voice-loop', 4.78, 0.2, 2.55],
  ['hushfold/vector-notes', 4.92, 0.65, 1.95],
];

// The hero's flight (gate frame [a, u, y], velocities in m/s): out of the lantern, through the
// membrane at 3.6, slowing to hold 0.8 m in front of the camera (4.3–4.55, where it can be read), then
// away past the camera's right.
const HERO_KEYS = [
  { t: 1.9, p: [2.0, 0.1, 2.3], v: [7.0, 0, 0] },
  { t: 3.6, p: [GATE.a, 0.04, 1.85], v: [4.5, 0, -0.03] },
  { t: 4.05, p: [15.25, 0.03, 1.9], v: [4.0, 0, 0.08] },
  { t: 4.45, p: [16.25, 0.06, 1.93], v: [1.0, 0.1, 0.02] },
  { t: 4.62, p: [16.55, 0.28, 1.98], v: [2.6, 3.2, 0.5] },
  { t: 4.8, p: [17.35, 1.15, 2.15], v: [5.0, 6.0, 1.2] },
];

// Ash (m, s): the paper greys from the contact line in (front speed vg, after dg), then breaks away into
// flakes (front speed vb, after db). The 491 burns slower, to be watched.
const ASH = { card: { dg: 0.03, vg: 0.5, db: 0.15, vb: 0.4 }, read: { dg: 0.05, vg: 0.32, db: 0.3, vb: 0.22 }, flakes: { card: 100, read: 240 } };

// Cubic Hermite through keys {t, p, v}; straight lines beyond the ends.
function pathAt(keys, t, p, v) {
  const n = keys.length;
  if (t <= keys[0].t || t >= keys[n - 1].t) {
    const k = t <= keys[0].t ? keys[0] : keys[n - 1];
    for (let j = 0; j < 3; j++) {
      v[j] = k.v[j];
      p[j] = k.p[j] + k.v[j] * (t - k.t);
    }
    return;
  }
  let i = 1;
  while (keys[i].t < t) i++;
  const k0 = keys[i - 1];
  const k1 = keys[i];
  const d = k1.t - k0.t;
  const s = (t - k0.t) / d;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const g00 = 6 * s2 - 6 * s;
  const g10 = 3 * s2 - 4 * s + 1;
  const g01 = 6 * s - 6 * s2;
  const g11 = 3 * s2 - 2 * s;
  for (let j = 0; j < 3; j++) {
    p[j] = h00 * k0.p[j] + h10 * d * k0.v[j] + h01 * k1.p[j] + h11 * d * k1.v[j];
    v[j] = (g00 * k0.p[j] + g01 * k1.p[j]) / d + g10 * k0.v[j] + g11 * k1.v[j];
  }
}

const GATECARDS = PLAN.map(([name, tc, u, y, role], i) => {
  const spec = SPEC[name];
  const pass = passes(spec);
  const r = (j) => hash(1900 + i, j);
  const c = { name, spec, pass, tc, u, y, role, i, kind: 'gate' };
  // face up a little, so the bottom edge leads; the 491 and the hero nearly square on
  c.pitch0 = role === 'read' ? -0.08 : role === 'hero' ? -0.06 : -(0.15 + 0.15 * r(0));
  c.yaw0 = role ? 0 : 0.12 * (2 * r(1) - 1);
  c.roll0 = role ? 0 : 0.1 * (2 * r(2) - 1);
  c.ph = [TAU * r(3), TAU * r(4), TAU * r(5)];
  c.flutter = role === 'read' ? 0.25 : role === 'hero' ? 0.3 : 1;
  if (role === 'hero') c.keys = HERO_KEYS;
  else {
    // out of the lantern on a bearing a little off the gate's, toward the side where it will meet the
    // membrane (so the cards spread out from the lamp in the picture), slowing as it comes
    const dur = 1.45 + 0.4 * r(6);
    const d = (-0.35 * u) / 0.9 + 0.15 * (2 * r(7) - 1);
    const aStop = pass ? GATE.a : GATE.a - (CH / 2) * Math.sin(Math.abs(c.pitch0)) - 0.003;
    c.keys = [
      { t: tc - dur, p: [2.0 * Math.cos(d), -2.0 * Math.sin(d), 1.4 + 1.8 * r(8)], v: [7.5 * Math.cos(d), -7.5 * Math.sin(d), 0] },
      { t: tc, p: [aStop, u, y], v: [pass ? 3.5 : 3.2, 0, 0] },
    ];
    if (pass) {
      // on past the camera, out of the picture on its own side
      const side = u < 0 ? -1 : 1;
      const t2 = tc + 0.95 + 0.35 * r(9);
      c.keys.push({ t: t2, p: [camAt(t2)[0] + 0.6, side * (0.6 + 0.8 * r(10)), y - 0.3 + 1.1 * r(11)], v: [4.0, side * 1.2, 0.3] });
    }
  }
  c.t0 = c.keys[0].t;
  if (pass) c.t1 = c.keys.at(-1).t + 0.25;
  else {
    c.ash = role === 'read' ? ASH.read : ASH.card;
    c.t1 = tc + c.ash.db + (CH + 0.03) / c.ash.vb;
  }
  return c;
});
const HERO = GATECARDS.find((c) => c.role === 'hero');
const READ = GATECARDS.find((c) => c.role === 'read');

// Cards bound for the other galleries: out of the lantern on bearings well away from the gate's, across
// the shaft and into the shelves of a gallery (each ends behind the books' face, so it goes out of
// sight into a shelf; no verdict here).
const AWAY = Array.from({ length: 16 }, (_, i) => {
  const r = (j) => hash(1950 + i, j);
  const side = i % 2 ? 1 : -1;
  const d = side * (55 + 105 * r(0)) * DEG;
  const t0 = -2.6 + (7.4 * (i + r(1))) / 16;
  const dur = 2.4 + 0.8 * r(2);
  const y0 = 1.5 + 1.9 * r(3);
  const dir = [Math.cos(d), -Math.sin(d)];
  const dz = ((((BEARING + d - 30 * DEG) % (60 * DEG)) + 90 * DEG) % (60 * DEG)) - 30 * DEG; // off the side's centre
  const rEnd = 18.95 / Math.cos(dz);
  return {
    kind: 'away',
    i,
    d,
    t0,
    t1: t0 + dur,
    ph: [TAU * r(5), TAU * r(6), TAU * r(7)],
    pitch0: 0.2 * (2 * r(8) - 1),
    roll0: 0.3 * (2 * r(9) - 1),
    keys: [
      { t: t0, p: [2.0 * dir[0], 2.0 * dir[1], y0], v: [7 * dir[0], 7 * dir[1], 0] },
      { t: t0 + dur, p: [rEnd * dir[0], rEnd * dir[1], y0 - 0.5 + 3 * r(4)], v: [5 * dir[0], 5 * dir[1], 0] },
    ],
  };
});

// A card's state at t: where (gate frame), its attitude, and what the gate has done to it.
const _p = [0, 0, 0];
const _v = [0, 0, 0];
function cardState(c, t, out = {}) {
  out.vis = t >= c.t0 && t <= c.t1;
  const stopped = c.ash && t > c.tc;
  pathAt(c.keys, stopped ? c.tc : t, _p, _v);
  const tt = stopped ? c.tc : t;
  const f = c.flutter ?? 1;
  let yaw;
  if (c.kind === 'away') yaw = -c.d + 0.25 * Math.sin(TAU * 0.6 * tt + c.ph[0]);
  else yaw = c.yaw0 + clamp(Math.atan2(_v[1], Math.max(_v[0], 0.3)), -0.7, 0.7) * (c.role === 'hero' ? 0.35 : 0.6);
  yaw += f * 0.06 * Math.sin(TAU * 0.9 * tt + c.ph[1]);
  const pitch = c.pitch0 + f * 0.07 * Math.sin(TAU * 1.1 * tt + c.ph[0]);
  let roll = c.roll0 + f * 0.05 * Math.sin(TAU * 0.7 * tt + c.ph[2]);
  if (c.pass && t > c.tc) {
    const sp = Math.hypot(_v[0], _v[1], _v[2]);
    roll += ((-0.5 * _v[1]) / Math.max(sp, 1e-3)) * smoothstep(c.tc, c.tc + 0.3, t);
  }
  out.a = _p[0];
  out.u = _p[1];
  out.y = _p[2];
  out.yaw = yaw;
  out.pitch = pitch;
  out.roll = roll;
  // the membrane: the lime edge runs round a pass; the line it touched glows; a fail greys and breaks
  const tau = t - (c.tc ?? Infinity);
  out.run = c.pass && tau > -0.02 ? 1 - (1 - clamp((tau + 0.02) / 0.3)) ** 3 : 0;
  out.scan = c.kind !== 'gate' ? 0 : c.pass ? 1.6 * Math.exp(-((tau / 0.035) ** 2)) : tau > -0.02 ? 0.7 * smoothstep(-0.02, 0, tau) * Math.exp(-Math.max(tau, 0) / 0.25) : 0;
  if (c.ash && tau > 0) {
    const A = c.ash;
    out.grey = tau > A.dg ? A.vg * (tau - A.dg) : -10;
    out.brk = tau > A.db ? A.vb * (tau - A.db) : -10;
    out.ember = tau > A.db ? Math.exp(-(tau - A.db) / 0.25) : 0;
    // a small recoil as it stops
    out.a += -0.025 * (1 - Math.exp(-tau / 0.03)) * Math.exp(-tau / 0.12);
  } else {
    out.grey = -10;
    out.brk = -10;
    out.ember = 0;
  }
  return out;
}

// when the sheet crosses bearing b (s into the shot, after t0)
function sheetCross(b, t0 = 0) {
  for (let t = t0; t < END + 4; t += 0.0005) {
    const d = (((sweepAngle(T0 + t) - b) % TAU) + TAU) % TAU;
    if (d < 0.001 || d > TAU - 0.001) return t;
  }
  return Infinity;
}
const BEAM_T = sheetCross(BEARING);

// the hero leaves the picture: the first moment its nearest edge is past the picture's right
const HERO_PAST = (() => {
  const st = {};
  for (let t = HERO.tc; t < END; t += 0.005) {
    cardState(HERO, t, st);
    const depth = camAt(t)[0] - st.a;
    if (depth < 0.05 || (st.u - CW / 2) / (depth * TANH) > 1) return t;
  }
  return END;
})();

// The membrane's readouts: the two close cards' stars, written large above where they touch (box in
// the membrane's u, y, m), wiped on left to right, held, faded.
const READOUT = { box: [-1.68, 2.51, 3.36, 0.42], wipe: 0.16, read: { at: 2.81, off: 3.48, fade: 0.12 }, hero: { at: 3.62, off: 4.3, fade: 0.18 } };

// Light and colour (linear)
export const LOOK19 = {
  lamp: LOOK17.lamp,
  paper: LOOK18.paper,
  chip: LOOK18.chipPaper,
  steel: LOOK18.steelInk,
  amberInk: LOOK18.amberInk,
  ash: [0.2, 0.195, 0.188], // grey paper ash
  ember: LOOK18.amberHot.map((v) => v * 0.18), // a dark amber edge where it breaks, cooling at once
  trans: 0.3, // light through the paper from behind
  bounce: 0.045, // the gallery's lamps given back by its floor and shelves (share of a lamp)
  edge: 2.4, // the lime edge
  heat: 1.7, // the heat's lime, steady, as at the end of s18
  glass: { t: 0.35, tint: [1.0, 0.95, 0.85] }, // the frosted glass in the cut letters: how much of the light behind comes through
  membrane: { base: 0.0025, beam: 0.35, flash: 0.12, ring: 1.2, halo: 0.35, grey: [0.55, 0.58, 0.6] }, // beam: the sheet's core as it crosses; flash: all of it, after
  read: { pass: 1.4, fail: 0.45 },
  flash: 0.5, // s14's flash, at half strength
  exposure: 0.8, // EV over the act II grade: the gallery is darker than the lantern's close-ups around it
};

// ---------------------------------------------------------------------------------------------- GLSL

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// Paper in the galleries: the lamps, the sheet and the lantern on its face; the same through it from
// behind (it is thin); and the gallery's own light given back by its floor and shelves, which is what
// lights a card's face once it is past the lamps.
const LIGHT = /* glsl */ `
uniform float uBounce;
vec3 paperLight(vec3 P, vec3 N, vec3 V, vec3 alb, float trans){
  float k = floor((P.y + 1e-3)/uH);
  vec4 st = floorState(k);
  Surf s; s.P = P; s.N = N; s.V = V; s.albedo = alb; s.f0 = vec3(0.035); s.rough = 0.62; s.ao = 1.0; s.wrap = 0.3;
  vec3 c = lampLight(s, k, st) + beamLight(s) + lanternFill(s);
  Surf b = s; b.N = -N; b.albedo = vec3(1.0); b.f0 = vec3(0.0);
  c += alb*trans*(lampLight(b, k, st) + beamLight(b) + lanternFill(b));
  float gal = smoothstep(11.9, 13.4, length(P.xz));
  c += alb*lampRGB(st)*(uBounce*gal*(0.5 + 0.5*max(dot(N.xz, normalize(P.xz)), 0.0)));
  return c;
}`;

// A card: the site's project card as at the end of s18 (clean paper, the ink, the Chinese in amber
// ink, the tags in steel on chip paper, the heat's lime in its groove), from an atlas tile; the back
// is plain paper. A pass: the lime edge running round from the middle of the bottom edge, both ways,
// and staying. A fail: grey from the line it touched, then breaking away there, a dark amber edge on
// the break for a moment.
const CARD_FRAG = /* glsl */ `
uniform sampler2D uA, uB;        // ink · heat glyphs · heat blurred  |  Chinese · chips · chip ink
uniform vec4 uTile;              // the tile in the atlas: u0, v0, du, dv
uniform vec2 uSize; uniform float uRad;
uniform vec4 uEdge;              // the lime edge's run (share of the half perimeter), the touch line's light, pass, -
uniform vec4 uAshF;              // into the card from the contact line (x, y), the line's offset (m), -
uniform vec4 uAshT;              // the grey front, the break front (m in from the contact line), the ember, -
uniform vec3 uPaper, uChip, uSteel, uAmberInk, uAsh, uEmberCol, uGrey;
uniform float uTrans, uEdgeI, uHeatI, uGateA;
uniform vec3 uGateN;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 q = (vUv - 0.5)*uSize;
  vec2 b = abs(q) - (0.5*uSize - uRad);
  float sd = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - uRad;
  if (sd > 0.0) discard;
  float s = dot(q, uAshF.xy) + uAshF.z;
  float tear = 0.012*(vnoise2(q*vec2(90.0, 70.0)) - 0.5) + 0.006*(vnoise2(q*vec2(400.0, 330.0)) - 0.5);
  float br = s - uAshT.y + tear;
  if (br < 0.0) discard;
  float gf = s - uAshT.x + tear;
  float grey = 1.0 - smoothstep(-0.012, 0.004, gf);

  bool front = gl_FrontFacing;
  vec2 tuv = uTile.xy + vUv*uTile.zw;
  vec3 A = front ? texture(uA, tuv).rgb : vec3(0.0);
  vec3 B = front ? texture(uB, tuv).rgb : vec3(0.0);
  float px = max(fwidth(q.x), fwidth(q.y));
  float fine = 1.0 - smoothstep(0.00015, 0.0005, px);
  float tooth = 0.05*(vnoise2(q*vec2(3100.0, 2700.0)) - 0.5)*fine + 0.035*(vnoise2(q*vec2(520.0, 610.0) + 7.0) - 0.5);
  vec3 paper = uPaper*(1.0 + tooth);
  paper *= mix(0.86, 1.0, smoothstep(-0.0001, -0.0009, sd));
  float glyph = A.g;
  float lip = clamp(A.b - A.g, 0.0, 1.0);
  vec3 alb = paper*(1.0 - 0.93*A.r);
  alb = mix(alb, uAmberInk, 0.9*B.r);
  alb = mix(alb, mix(uChip, uSteel, 0.92*B.b), B.g);
  alb *= (1.0 - 0.45*lip)*(1.0 - 0.7*glyph);
  // ash: the print a shade darker in it; a scorched line where the grey front runs
  vec3 ash = uAsh*(1.0 - 0.45*clamp(A.r + B.r + B.b + glyph, 0.0, 1.0))*(0.85 + 0.3*vnoise2(q*vec2(160.0, 140.0)));
  alb = mix(alb, ash, grey);
  alb *= 1.0 - 0.45*exp(-abs(gf)/0.004);

  vec3 N = normalize(vN);
  if (!front) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 c = paperLight(vW, N, V, alb, uTrans);

  // the heat, lime in its groove
  c += uLitCol*(uHeatI*glyph*(1.0 - grey));
  // the lime edge
  float ew = clamp(1.1*px, 0.0011, 0.006);
  float eb = (sd + max(0.0016, ew))/ew;
  float band = exp(-eb*eb)*sqrt(0.0011/ew);
  float ang = abs(atan(q.x/(0.5*uSize.x), -q.y/(0.5*uSize.y)))/PI;
  float run = uEdge.x;
  float on = step(0.001, run);
  float lit = smoothstep(run + 0.012, run - 0.012, ang)*on;
  float hx = (ang - run)/0.035;
  float head = exp(-hx*hx)*on*(1.0 - smoothstep(0.97, 1.0, run));
  c += uLitCol*(uEdgeI*(band*(lit + 1.5*head) + 0.05*lit*exp(-max(-sd, 0.0)/0.006)));
  // the line where it meets the membrane
  float dm = dot(vW.xz, uGateN.xz) - uGateA;
  c += mix(uGrey, uLitCol, uEdge.z)*(uEdge.y*exp(-dm*dm/0.000016));
  // the break's last warmth
  c += uEmberCol*(uAshT.z*exp(-br/0.0025));
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// A flake of ash: a ragged scrap of the card it came from, grey, its edge darker and, for a moment, warm.
const FLAKE_VERT = /* glsl */ `
attribute vec4 aT; attribute vec4 aF; attribute vec4 aG;
varying vec2 vP; varying vec3 vW; varying vec3 vN; varying vec4 vT; varying vec4 vF; varying vec4 vG;
void main(){
  vP = position.xy; vT = aT; vF = aF; vG = aG;
  vec4 w = modelMatrix*instanceMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const FLAKE_FRAG = /* glsl */ `
uniform sampler2D uA, uB; uniform vec2 uSize; uniform float uShot, uTrans;
uniform vec3 uAsh, uEmberCol;
varying vec2 vP; varying vec3 vW; varying vec3 vN; varying vec4 vT; varying vec4 vF; varying vec4 vG;
void main(){
  float n = vnoise2(vP*4.5 + vG.y*41.0);
  float r = length(vP);
  float edge = 0.3 + 0.2*n;
  if (r > edge) discard;
  float rim = smoothstep(edge - 0.12, edge, r);
  vec2 q = vF.xy + vP*vec2(vF.z, vF.z*vF.w);
  vec2 tuv = vT.xy + (q/uSize + 0.5)*vT.zw;
  float ink = clamp(texture(uA, tuv).r + texture(uB, tuv).r + texture(uB, tuv).b, 0.0, 1.0);
  vec3 alb = uAsh*(1.0 - 0.45*ink)*(0.8 + 0.4*fract(vG.y*91.7))*(1.0 - 0.5*rim);
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 c = paperLight(vW, N, V, alb, uTrans*(0.5 + 1.5*rim));
  float age = max(uShot - vG.z, 0.0);
  c += uEmberCol*(vG.x*exp(-age/0.15)*rim);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The membrane: lime, all but invisible; the sheet lights all of it as it passes; a card's touch lights
// a ring where it meets it (lime for a pass, grey for a fail); the readouts.
const MEMBRANE_FRAG = /* glsl */ `
uniform vec2 uMSize;
uniform vec4 uMemK;              // base, the sheet's core, a touch's ring, its halo
uniform float uMemF;             // the whole membrane, as the sheet goes through it
uniform vec4 uCon[6]; uniform vec4 uConK[6];   // touches: u, y, half width, half height | light, pass
uniform sampler2D uRead; uniform vec4 uRdBox; uniform vec4 uRdK[2];   // light, the wipe (0..1), pass, row (v0)
uniform vec3 uGrey;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 p = vec2((vUv.x - 0.5)*uMSize.x, vUv.y*uMSize.y);
  float e = min(min(p.x + 0.5*uMSize.x, 0.5*uMSize.x - p.x), min(p.y, uMSize.y - p.y));
  float border = smoothstep(0.0, 0.08, e);
  float sh = vnoise2(vec2(p.x*3.0, p.y*1.2 - uTime*0.35));
  float dc = sweepDelta(vW)/uBeamW;
  float core = exp(-dc*dc)*lanternFan(vW, 0.04);
  vec3 c = uLitCol*((uMemK.x*(0.6 + 0.8*sh) + uMemK.y*core + uMemF*(0.7 + 0.3*sh))*border);
  for (int i = 0; i < 6; i++){
    if (uConK[i].x <= 0.0) continue;
    vec2 d = abs(p - uCon[i].xy) - (uCon[i].zw - 0.011);
    float sdb = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.011;
    float g = uMemK.z*exp(-sdb*sdb/0.000036) + uMemK.w*exp(-abs(sdb)/0.06);
    c += mix(uGrey, uLitCol, uConK[i].y)*(uConK[i].x*g*border);
  }
  vec2 b0 = (p - uRdBox.xy)/uRdBox.zw;
  vec2 b = clamp(b0, 0.0, 1.0);
  float inBox = step(abs(b0.x - b.x) + abs(b0.y - b.y), 0.0);
  for (int i = 0; i < 2; i++){
    if (uRdK[i].x <= 0.0) continue;
    float m = inBox*textureGrad(uRead, vec2(b.x, uRdK[i].w + 0.5*b.y), dFdx(b0)*vec2(1.0, 0.5), dFdy(b0)*vec2(1.0, 0.5)).r;
    float rv = uRdK[i].y;
    float shown = smoothstep(rv + 0.01, rv - 0.01, b.x);
    float hx = (b.x - rv)/0.012;
    float head = inBox*exp(-hx*hx)*step(rv, 1.0)*smoothstep(0.12, 0.3, b.y)*smoothstep(0.88, 0.7, b.y);
    c += mix(uGrey, uLitCol, uRdK[i].z)*(uRdK[i].x*(m*shown + 0.5*head));
  }
  gl_FragColor = vec4(c*exp(-uFogD*distance(vW, cameraPosition)), 1.0);
}`;

// The lintel's face: the galleries' wood, ★ 500 cut through it, frosted glass at the back of the cut lit
// through from the shaft (the lantern's light as it turns past, the sheet and its afterglow); looking up
// into the cut you see its walls.
const LINTEL_FRAG = /* glsl */ `
uniform sampler2D uMask; uniform vec2 uPanel; uniform float uThick, uGlassT;
uniform vec3 uN0, uEX, uTint;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
vec3 woodAlb(vec3 P, vec3 N, float px){
  vec3 an = abs(N);
  vec2 q = an.y > 0.7 ? P.xz : (an.x > an.z ? P.zy : P.xy);
  float g = vnoise2(vec2(q.x*0.6, q.y*28.0));
  float fine = mix(vnoise2(vec2(q.x*3.0, q.y*140.0)), 0.5, smoothstep(0.002, 0.01, px));
  return vec3(0.085, 0.048, 0.026)*(0.65 + 0.55*g + 0.25*fine);
}
vec3 through(vec3 Pb){
  vec2 r = Pb.xz - uBeamO.xz;
  float d = max(length(r), 1e-3);
  vec3 E = vec3(0.0);
  if (uBeamI > 0.0) E += uBeamCol*(uBeamI*sweep(Pb));
  float c = dot(r/d, vec2(cos(uBeamAng), sin(uBeamAng)));
  float shade = smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
  vec3 l = uBeamO - Pb;
  E += uLHFill*(shade*lanternFan(Pb, 0.08)/(dot(l, l) + 1.0));
  return E;
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float px = max(length(dFdx(vW)), length(dFdy(vW)));
  vec2 off = -vec2(dot(V, uEX), V.y)*(uThick/max(dot(V, uN0), 0.05));
  vec2 m = texture(uMask, vUv).rg;
  float back = texture(uMask, vUv + off/uPanel).r;
  float k = floor((vW.y + 1e-3)/uH);
  Surf s; s.P = vW; s.N = N; s.V = V; s.albedo = woodAlb(vW, N, px)*(1.0 - 0.4*clamp(m.g - m.r, 0.0, 1.0));
  s.f0 = vec3(0.04); s.rough = 0.45; s.ao = 1.0; s.wrap = 0.0;
  vec3 face = lampLight(s, k, floorState(k)) + beamLight(s) + lanternFill(s);
  vec3 glow = uGlassT*uTint*through(vW - uN0*0.33);
  vec3 hole = mix(0.18*glow + 0.3*face, glow, back);
  gl_FragColor = vec4(fog(mix(face, hole, m.r), vW), 1.0);
}`;

// ------------------------------------------------------------------------------------------- textures

// a card's two masks, drawn at ppm px per mm: A as collected (drawStatic) with today's growth in its ink;
// B what the light wrote (the Chinese, the tag chips, their labels and edges)
function drawA(cv, L, ppm) {
  drawStatic(cv, L, ppm); // leaves the context adding, in mm
  const c = cv.getContext('2d');
  const S = L.stats;
  const ink = `rgba(255,0,0,${S.ink})`;
  c.strokeStyle = ink;
  arrow(c, S.today.icon.x, S.today.icon.y - S.today.icon.d / 2, S.today.icon.d);
  c.font = S.font(S.px);
  c.fillStyle = ink;
  c.fillText(S.today.text, S.today.x, S.base);
}
function drawB(cv, L, ppm) {
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.filter = 'none';
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  c.setTransform(ppm, 0, 0, ppm, 0, 0);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  const Z = L.zh;
  c.font = Z.font(Z.px);
  c.fillStyle = 'rgb(255,0,0)';
  for (const ch of Z.chars) c.fillText(ch.ch, ch.x, ch.base);
  const C = L.chipStyle;
  const chip = (text, x, y, w, h) => {
    const r = Math.min(C.r, h / 2);
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = 'rgb(0,255,0)';
    c.fill();
    c.beginPath();
    c.roundRect(x + 0.35, y + 0.35, w - 0.7, h - 0.7, Math.max(0, r - 0.35));
    c.strokeStyle = 'rgb(0,0,255)';
    c.lineWidth = 0.45;
    c.stroke();
    c.font = L.chipFont(C.px);
    c.fillStyle = 'rgb(0,0,255)';
    c.fillText(text, x + (w - c.measureText(text).width) / 2, y + h / 2 + 0.36 * C.px);
  };
  for (const pr of L.chips) {
    chip(pr.zh.text, pr.x - pr.zh.w / 2, pr.hinge - pr.gap - pr.zh.h, pr.zh.w, pr.zh.h);
    chip(pr.en.text, pr.x - pr.en.w / 2, pr.hinge + pr.gap, pr.en.w, pr.en.h);
  }
  if (L.more) chip(L.more.text, L.more.x - L.more.d / 2, L.more.hinge - L.more.d / 2, L.more.d, L.more.d);
}

// ---------------------------------------------------------------------------------------------- setup

export async function setup(ctx) {
  await loadFonts();
  const grade = (await ctx.load.json('/film/timeline.json')).grades.act2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 600);
  const lib = new Library({ floors: [FLOOR - 8, FLOOR + 8], near: 2, mid: 8, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK19.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);
  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 19 });
  scene.add(dust.points);

  // the gate
  const gb = new Builder();
  gb.setTransform(gateMatrix());
  buildGate(gb);
  scene.add(new THREE.Mesh(gb.geometry(), lib.material));
  const lw = GATE.clear[0] + 2 * GATE.post[0];
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(lw, GATE.lintel),
    new THREE.ShaderMaterial({
      uniforms: {
        uMask: { value: canvasTexture(await lintelMask(), { srgb: false, mipmaps: true, anisotropy: 8 }) },
        uPanel: { value: new THREE.Vector2(lw, GATE.lintel) },
        uThick: { value: GATE.letters.thick },
        uGlassT: { value: LOOK19.glass.t },
        uTint: { value: new THREE.Color(...LOOK19.glass.tint) },
        uN0: { value: N0.clone() },
        uEX: { value: EX.clone() },
        ...U,
      },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + LINTEL_FRAG,
    }),
  );
  G(GATE.a + (GATE.post[1] - 0.04) / 2 + 0.0005, 0, GATE.clear[1] + GATE.lintel / 2, plate.position);
  plate.quaternion.copy(QB);
  scene.add(plate);

  // the membrane and its readouts
  const rd = makeCanvas(2048, 512);
  {
    const c = rd.getContext('2d');
    c.fillStyle = '#000';
    c.fillRect(0, 0, rd.width, rd.height);
    c.globalCompositeOperation = 'lighter';
    const n = (v) => v.toLocaleString('en-US');
    starLine(c, n(READ.spec.stars), 0, 0, 2048, 256, 0.6 * 256, 500);
    starLine(c, n(HERO.spec.stars), 0, 256, 2048, 256, 0.6 * 256, 500);
  }
  const memU = {
    uMSize: { value: new THREE.Vector2(...GATE.clear) },
    uMemK: { value: new THREE.Vector4(LOOK19.membrane.base, LOOK19.membrane.beam, LOOK19.membrane.ring, LOOK19.membrane.halo) },
    uMemF: { value: 0 },
    uCon: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uConK: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uRead: { value: canvasTexture(rd, { srgb: false, mipmaps: true, anisotropy: 8 }) },
    uRdBox: { value: new THREE.Vector4(...READOUT.box) },
    uRdK: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uGrey: { value: new THREE.Color(...LOOK19.membrane.grey) },
  };
  const membrane = new THREE.Mesh(
    new THREE.PlaneGeometry(...GATE.clear),
    new THREE.ShaderMaterial({
      uniforms: { ...memU, ...U },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + MEMBRANE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  G(GATE.a, 0, GATE.clear[1] / 2, membrane.position);
  membrane.quaternion.copy(QB);
  membrane.renderOrder = 14;
  scene.add(membrane);

  // the cards' faces: the hero at its own size, the rest in one atlas (4 × 5 tiles, an 8 px gutter)
  const shared = {
    uSize: { value: new THREE.Vector2(CW, CH) },
    uRad: { value: CARD.R * MM },
    uPaper: { value: new THREE.Color(...LOOK19.paper) },
    uChip: { value: new THREE.Color(...LOOK19.chip) },
    uSteel: { value: new THREE.Color(...LOOK19.steel) },
    uAmberInk: { value: new THREE.Color(...LOOK19.amberInk) },
    uAsh: { value: new THREE.Color(...LOOK19.ash) },
    uEmberCol: { value: new THREE.Color(...LOOK19.ember) },
    uGrey: { value: new THREE.Color(...LOOK19.membrane.grey) },
    uTrans: { value: LOOK19.trans },
    uBounce: { value: LOOK19.bounce },
    uEdgeI: { value: LOOK19.edge },
    uHeatI: { value: LOOK19.heat },
    uGateA: { value: GATE.a },
    uGateN: { value: N0.clone() },
    uShot: { value: 0 },
  };
  const maxTex = ctx.renderer.capabilities.maxTextureSize;
  const others = REPOS.filter((s) => s !== OTTERVALE);
  const cols = 4;
  const rows = Math.ceil(others.length / cols);
  const ppmA = clamp((2 * ctx.width) / 1920, 1.2, Math.min(3.6, (maxTex / cols - 16) / CARD.W));
  const gut = 8;
  const tw = Math.round(CARD.W * ppmA);
  const th = Math.round(CARD.H * ppmA);
  const atlas = [makeCanvas(cols * (tw + 2 * gut), rows * (th + 2 * gut)), makeCanvas(cols * (tw + 2 * gut), rows * (th + 2 * gut))];
  for (const cv of atlas) {
    const c = cv.getContext('2d');
    c.fillStyle = '#000';
    c.fillRect(0, 0, cv.width, cv.height);
  }
  const TILE = new Map();
  const layouts = new Map();
  for (const [k, spec] of others.entries()) {
    const L = await layoutCard(spec, ctx.lang);
    layouts.set(spec, L);
    const col = k % cols;
    const row = Math.floor(k / cols);
    const x = col * (tw + 2 * gut) + gut;
    const y = row * (th + 2 * gut) + gut;
    for (const [j, draw] of [drawA, drawB].entries()) {
      const cv = faceCanvas(ppmA);
      draw(cv, L, ppmA);
      atlas[j].getContext('2d').drawImage(cv, x, y, tw, th);
    }
    const W = atlas[0].width;
    const H = atlas[0].height;
    TILE.set(spec, new THREE.Vector4(x / W, 1 - (y + th) / H, tw / W, th / H));
  }
  const atlasTex = atlas.map((cv) => canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 }));
  const ppmH = Math.min(maxTex / CARD.W, (2.7 * ctx.width) / 1920);
  const heroL = await layoutCard(OTTERVALE, ctx.lang);
  const heroTex = [drawA, drawB].map((draw) => {
    const cv = faceCanvas(ppmH);
    draw(cv, heroL, ppmH);
    return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 });
  });

  const cardGeo = new THREE.PlaneGeometry(CW, CH, 1, 1);
  const cardMesh = (tex, tile) => {
    const m = new THREE.Mesh(
      cardGeo,
      new THREE.ShaderMaterial({
        uniforms: {
          ...shared,
          uA: { value: tex[0] },
          uB: { value: tex[1] },
          uTile: { value: tile },
          uEdge: { value: new THREE.Vector4() },
          uAshF: { value: new THREE.Vector4(0, 1, CH / 2, 0) },
          uAshT: { value: new THREE.Vector4(-10, -10, 0, 0) },
          ...U,
        },
        vertexShader: VERT,
        fragmentShader: LIB_COMMON + LIGHT + CARD_FRAG,
        side: THREE.DoubleSide,
      }),
    );
    scene.add(m);
    return m;
  };
  const tiles = others.map((s) => TILE.get(s));
  for (const c of GATECARDS) c.mesh = c.role === 'hero' ? cardMesh(heroTex, new THREE.Vector4(0, 0, 1, 1)) : cardMesh(atlasTex, TILE.get(c.spec));
  for (const c of AWAY) c.mesh = cardMesh(atlasTex, tiles[(c.i * 7) % tiles.length]);
  const CARDS = [...GATECARDS, ...AWAY];

  // the flakes: cut from each failed card where it stopped, born as the break front reaches them
  const fails = GATECARDS.filter((c) => c.ash);
  const flakeDefs = [];
  const st = {};
  const qc = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const P = new THREE.Vector3();
  for (const c of fails) {
    cardState(c, c.tc + 1e-4, st);
    G(st.a, st.u, st.y, P);
    qc.copy(QB).multiply(new THREE.Quaternion().setFromEuler(eul.set(st.pitch, st.yaw, st.roll, 'YXZ')));
    const n = c.role === 'read' ? ASH.flakes.read : ASH.flakes.card;
    for (let k = 0; k < n; k++) {
      const r = (j) => hash(2000 + c.i, k, j);
      let qx = 0;
      let qy = 0;
      for (let m = 0; m < 8; m++) {
        qx = (r(2 * m) - 0.5) * (CW - 0.004);
        qy = (r(2 * m + 1) - 0.5) * (CH - 0.004);
        const bx = Math.abs(qx) - (CW / 2 - CARD.R * MM);
        const by = Math.abs(qy) - (CH / 2 - CARD.R * MM);
        if (Math.hypot(Math.max(bx, 0), Math.max(by, 0)) < CARD.R * MM) break;
      }
      const W = new THREE.Vector3(qx, qy, 0).applyQuaternion(qc).add(P);
      const axis = new THREE.Vector3(r(30) - 0.5, r(31) - 0.5, r(32) - 0.5).normalize();
      flakeDefs.push({
        tile: TILE.get(c.spec),
        q: [qx, qy],
        size: 0.008 * 3.2 ** r(20),
        aspect: 0.6 + 0.8 * r(21),
        birth: c.tc + c.ash.db + (qy + CH / 2) / c.ash.vb + 0.03 * (2 * r(22) - 1),
        a0: W.x * N0.x + W.z * N0.z,
        u0: W.x * EX.x + W.z * EX.z,
        y0: W.y - Y0,
        w: 0.7 + 0.4 * r(23),
        vt: 0.35 + 0.4 * r(24),
        ud: 0.15 * (2 * r(25) - 1),
        A: 0.03 + 0.06 * r(26),
        om: 3 + 5 * r(27),
        ph: TAU * r(28),
        axis,
        spin: (2 + 5 * r(29)) * (r(33) < 0.5 ? -1 : 1),
        q0: qc.clone(),
        heat: 0.6 + 0.4 * r(34),
        seed: r(35),
      });
    }
  }
  const NF = flakeDefs.length;
  const fgeo = new THREE.PlaneGeometry(1, 1);
  const aT = new Float32Array(NF * 4);
  const aF = new Float32Array(NF * 4);
  const aG = new Float32Array(NF * 4);
  flakeDefs.forEach((f, k) => {
    aT.set([f.tile.x, f.tile.y, f.tile.z, f.tile.w], k * 4);
    aF.set([f.q[0], f.q[1], f.size, f.aspect], k * 4);
    aG.set([f.heat, f.seed, f.birth, 0], k * 4);
  });
  fgeo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 4));
  fgeo.setAttribute('aF', new THREE.InstancedBufferAttribute(aF, 4));
  fgeo.setAttribute('aG', new THREE.InstancedBufferAttribute(aG, 4));
  const flakes = new THREE.InstancedMesh(
    fgeo,
    new THREE.ShaderMaterial({
      uniforms: { ...shared, uA: { value: atlasTex[0] }, uB: { value: atlasTex[1] }, ...U },
      vertexShader: FLAKE_VERT,
      fragmentShader: LIB_COMMON + LIGHT + FLAKE_FRAG,
      side: THREE.DoubleSide,
    }),
    NF,
  );
  flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flakes.frustumCulled = false;
  scene.add(flakes);

  // keep the plan honest: the cues below are computed from the plan with a pinhole model of the camera;
  // check them against the real camera (in both languages)
  {
    const cam = camera.clone();
    const v = new THREE.Vector3();
    const r2 = (x) => +x.toFixed(2);
    const got = {
      beam: r2(sheetCross(BEARING)),
      verdicts: GATECARDS.map((c) => {
        const [a, h] = camAt(c.tc);
        setLens(cam, CAM.lens);
        aim(cam, G(a, 0, h), G(a - 10, 0, h));
        G(c.pass ? GATE.a : c.keys[1].p[0], c.u, c.y, v).project(cam);
        return { t: c.tc, pass: c.pass, stars: c.spec.stars, x: r2(v.x) };
      }),
      hero: { cross: HERO.tc, past: r2(HERO_PAST) },
    };
    const off = (a, b) => (typeof a === 'number' ? !(Math.abs(a - b) <= 0.03) : typeof a === 'boolean' ? a !== b : Object.keys(a ?? {}).some((k) => off(a[k], b?.[k])));
    for (const k of Object.keys(got)) {
      if (off(got[k], CUES[k])) console.warn(`[s19] CUES.${k} (${ctx.lang}) is ${JSON.stringify(CUES[k])}, the camera gives ${JSON.stringify(got[k])}`);
    }
  }

  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const focusP = new THREE.Vector3();
  const heroP = new THREE.Vector3();
  const qe = new THREE.Quaternion();
  const qs = new THREE.Quaternion();
  const M = new THREE.Matrix4();
  const SC = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const cs = {};
  const touch = GATECARDS.map(() => ({ k: 0 }));
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      const [ca, chgt] = camAt(t);
      G(ca, 0, chgt, pos);
      G(ca - 10, 0, chgt, target);
      setLens(camera, CAM.lens);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = 70 + t;
      shared.uShot.value = t;

      // the lighthouse: the sheet as in s14; the camera stands on its path, so the lens's flash as it
      // crosses is held down to a glint (the sheet itself, its afterglow and the lantern's light are not)
      const sh = sheetAt(T, T - 4);
      let da = (((BEARING - sh.angle) % TAU) + TAU) % TAU;
      if (da > Math.PI) da -= TAU;
      const sf = Math.exp(-((da / 0.035) ** 2));
      sh.glow = (1.25 * (1 + 2 * sf)) / (1.25 + 30 * sf);
      lh.set(sh);
      lh.update(camera);

      // the cards
      for (const c of CARDS) {
        cardState(c, t, cs);
        c.mesh.visible = cs.vis;
        if (!cs.vis) continue;
        G(cs.a, cs.u, cs.y, c.mesh.position);
        c.mesh.quaternion.copy(QB).multiply(qe.setFromEuler(eul.set(cs.pitch, cs.yaw, cs.roll, 'YXZ')));
        const u = c.mesh.material.uniforms;
        u.uEdge.value.set(cs.run, cs.scan, c.pass ? 1 : 0, 0);
        u.uAshT.value.set(cs.grey, cs.brk, cs.ember, 0);
        if (c === HERO) heroP.copy(c.mesh.position);
      }

      // the flakes
      for (let k = 0; k < NF; k++) {
        const f = flakeDefs[k];
        const tau = t - f.birth;
        if (tau < 0 || tau > 5) {
          flakes.setMatrixAt(k, ZERO);
          continue;
        }
        const tw2 = 0.25;
        const tg = f.vt / 9.81;
        const a = f.a0 - f.w * (tau - tw2 * (1 - Math.exp(-tau / tw2)));
        const y = f.y0 - f.vt * (tau - tg * (1 - Math.exp(-tau / tg)));
        const u = f.u0 + f.ud * tau + f.A * (Math.sin(f.om * tau + f.ph) - Math.sin(f.ph));
        if (y < -6) {
          flakes.setMatrixAt(k, ZERO);
          continue;
        }
        qs.setFromAxisAngle(f.axis, f.spin * tau).premultiply(f.q0);
        M.compose(G(a, u, y, P), qs, SC.set(f.size, f.size * f.aspect, 1));
        flakes.setMatrixAt(k, M);
      }
      flakes.instanceMatrix.needsUpdate = true;

      // the membrane: lit through as the sheet crosses it; the six brightest touches; the readouts
      const fl = t < BEAM_T - 0.03 ? 0 : smoothstep(BEAM_T - 0.03, BEAM_T + 0.01, t) * Math.exp(-Math.max(t - BEAM_T - 0.01, 0) / 0.2);
      memU.uMemF.value = LOOK19.membrane.flash * fl;
      for (const [i, c] of GATECARDS.entries()) {
        const tau = t - c.tc;
        const life = c.role === 'read' ? 0.7 : c.pass ? 0.35 : 0.5;
        touch[i].k = tau < -0.03 ? 0 : smoothstep(-0.03, 0.01, tau) * Math.exp(-Math.max(tau, 0) / life) * (c.pass ? 1 : 0.6);
        touch[i].c = c;
      }
      const lit = touch.filter((x) => x.k > 0.002).sort((x, y) => y.k - x.k).slice(0, 6);
      for (let i = 0; i < 6; i++) {
        const x = lit[i];
        if (!x) {
          memU.uConK.value[i].set(0, 0, 0, 0);
          continue;
        }
        memU.uCon.value[i].set(x.c.u, x.c.y, CW / 2, (CH / 2) * Math.cos(x.c.pitch0));
        memU.uConK.value[i].set(x.k, x.c.pass ? 1 : 0, 0, 0);
      }
      const readK = (r, I, pass, v0, out) => {
        const k = t < r.at ? 0 : 1 - smoothstep(r.off, r.off + r.fade, t);
        out.set(k * I, clamp((t - r.at) / READOUT.wipe, 0, 1.05), pass, v0);
      };
      readK(READOUT.read, LOOK19.read.fail, 0, 0.5, memU.uRdK.value[0]);
      readK(READOUT.hero, LOOK19.read.pass, 1, 0.0, memU.uRdK.value[1]);

      // focus: the membrane, the hero as it comes to the camera, the membrane again
      const kf = smoothstep(3.85, 4.3, t) * (1 - smoothstep(4.6, 4.9, t));
      G(GATE.a, 0, 1.9, focusP).lerp(heroP, kf);
      dust.update(camera, 70 + t, { focus: focusDistance(camera, focusP), fstop: CAM.fstop, width: ctx.width, intensity: LOOK.dust });
    },
    post(t) {
      const f = flashAt(T0 + t, BEARING) * LOOK19.flash;
      return {
        exposure: grade.exposure + LOOK19.exposure + FLASH.exposure * f,
        bloom: { strength: grade.bloom.strength + FLASH.bloom * f },
        halation: { strength: grade.halation.strength + FLASH.halation * f },
        dof: { focus: focusDistance(camera, focusP), fstop: CAM.fstop },
      };
    },
  };
}

// ----------------------------------------------------------------------------------------------- cues

// Sound cues, s into the shot (global frame = 2160 + 24 t). Computed from the plan; setup checks them
// against the camera.
export const CUES = {
  cut: { t: 0 }, // on the beat: the radar's ping, a beat a second
  pings: [0, 1, 2, 3, 4],
  beam: +BEAM_T.toFixed(2), // the sheet behind the gate: the letters lit through, the membrane flashes (the taiko)
  // every verdict at the membrane: when, pass or fail, the stars, where across the picture (-1 left … 1 right)
  verdicts: GATECARDS.map((c) => ({ t: c.tc, pass: c.pass, stars: c.spec.stars, x: +pan(c.pass ? GATE.a : c.keys[1].p[0], c.u, c.tc).toFixed(2) })),
  // the two readouts written on the membrane (the wipe starts at t)
  readings: [
    { t: READOUT.read.at, stars: READ.spec.stars, pass: false },
    { t: READOUT.hero.at, stars: HERO.spec.stars, pass: true },
  ],
  hero: { cross: HERO.tc, past: +HERO_PAST.toFixed(2) }, // through the membrane; gone past the camera's right
};
