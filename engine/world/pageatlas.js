// Page atlas: sixteen page designs drawn in code — the written matter of the Library of Babel.
// Papers, code, news, READMEs, timelines, tables, trending lists, Borges' random letters, classical
// Chinese, a rubricated manuscript, and three invented scripts standing for the languages the film
// does not set in type. Every glyph is real type (the film's OFL fonts) or a stroke drawn here.
//
// The channels are masks, not colours: R = black ink, G = rubric (red ink), B = tone (grey fills,
// figures, halftone). The page shader turns them into ink, paper and light.
import { rng } from '../runtime/lib/rng.js';
import { loadFonts, font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';

export const ATLAS = { COLS: 4, ROWS: 4, W: 640, H: 896 }; // logical cell size (aspect of a 0.3 × 0.42 m page)
export const DESIGNS = [
  'paper', 'paper-figure', 'code', 'zh-article', 'news', 'readme', 'thread', 'babel',
  'math', 'tables', 'trending', 'cursive', 'hanging', 'blocks', 'zh-classical', 'manuscript',
];

const INK = '#ff0000';
const RUB = '#00ff00';
const TONE = '#0000ff';

// --------------------------------------------------------------------------------------- word stock

const TITLE = [
  ['Towards', 'Rethinking', 'Scaling', 'On', 'Learning', 'Revisiting', 'Beyond', 'Understanding'],
  ['Sparse', 'Latent', 'Multimodal', 'Agentic', 'Retrieval-Augmented', 'Long-Context', 'Self-Supervised', 'Recurrent'],
  ['Reasoning', 'Diffusion', 'Memory', 'Attention', 'Search', 'Planning', 'Indexing', 'Alignment'],
  ['for', 'in', 'with', 'under', 'via'],
  ['Tool-Using', 'Open-World', 'Embodied', 'Lifelong', 'Multilingual', 'Low-Resource', 'Streaming', 'Infinite'],
  ['Agents', 'Libraries', 'Benchmarks', 'Language Models', 'Readers', 'Archives', 'Corpora', 'Systems'],
];
const NAMES = [
  'Lindqvist', 'Okafor', 'Chen', 'Haddad', 'Moreau', 'Tanaka', 'Ivanova', 'Kowalski', 'Mensah', 'Ruiz',
  'Novak', 'Achebe', 'Park', 'Sato', 'Bergström', 'Rao', 'Zhou', 'Varga', 'Costa', 'Weiss', 'Liang', 'Abiodun',
];
const HAN_SEAL = '燃燈藏書'; // read top to bottom, right column first
const BABEL = 'abcdefghijlmnopqrstuvxz'; // Borges: twenty-two letters, the comma, the period and the space

const pick = (r, a) => a[Math.floor(r() * a.length)];

// English that reads like prose at a glance: sentences from a small grammar, served word by word.
const G = {
  V: ['propose', 'study', 'introduce', 'revisit', 'evaluate', 'extend', 'present', 'analyse', 'measure', 'index'],
  V3: ['improves', 'reduces', 'enables', 'preserves', 'matches', 'outperforms', 'requires', 'retrieves'],
  A: ['sparse', 'latent', 'retrieval-augmented', 'multimodal', 'efficient', 'robust', 'long-context', 'agentic',
    'open', 'structured', 'scalable', 'self-supervised', 'lifelong', 'compositional', 'grounded'],
  N: ['model', 'agent', 'index', 'benchmark', 'method', 'retriever', 'representation', 'policy', 'corpus',
    'library', 'reader', 'query', 'signal', 'archive', 'tool', 'memory', 'decoder', 'baseline'],
  P: ['for', 'across', 'under', 'with', 'without', 'beyond', 'over'],
};
const SENT = [
  (r, g) => `We ${g('V')} a ${g('A')} ${g('N')} that ${g('V3')} ${g('A')} ${g('N')}s ${g('P')} ${g('A')} ${g('N')}s.`,
  (r, g) => `${cap(g('A'))} ${g('N')}s ${g('V')} ${g('N')}s ${g('P')} the ${g('N')} ${g('N')}.`,
  (r, g) => `Our results show that ${g('A')} ${g('N')}s ${g('V')} the ${g('A')} ${g('N')} by ${3 + Math.floor(r() * 38)}%.`,
  (r, g) => `However, ${g('A')} ${g('N')}s still ${g('V')} the ${g('N')} ${g('P')} a ${g('A')} ${g('N')}.`,
  (r, g) => `In this work, we ${g('V')} the ${g('N')} of ${g('A')} ${g('N')}s, and ${g('V')} it ${g('P')} ${g('A')} ${g('N')}s.`,
  (r, g) => `This ${g('V3')} the ${g('N')} ${g('P')} ${g('N')} and ${g('N')}.`,
  (r, g) => `Each ${g('N')} ${g('V3')} a ${g('A')} ${g('N')}, which ${g('V3')} the ${g('N')}.`,
  (r, g) => `As shown in Section ${2 + Math.floor(r() * 5)}, the ${g('A')} ${g('N')} ${g('V3')} every ${g('N')}.`,
];
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const IRREG = { corpus: 'corpora', index: 'indexes', memory: 'memories', library: 'libraries', query: 'queries' };
const phrase = (r) => `${pick(r, G.V)} the ${pick(r, G.A)} ${pick(r, G.N)}`;
function sentence(r) {
  const g = (k) => G[k][Math.floor(r() * G[k].length)];
  const fix = (t) => t.replace(/([a-z-]+)s\b/g, (m, w) => (G.N.includes(w) ? IRREG[w] ?? `${w}s` : m));
  let q = [];
  return () => {
    if (!q.length) q = fix(SENT[Math.floor(r() * SENT.length)](r, g)).split(' ');
    return q.shift();
  };
}
const title = (r) => `${pick(r, TITLE[0])} ${pick(r, TITLE[1])} ${pick(r, TITLE[2])} ${pick(r, TITLE[3])} ${pick(r, TITLE[4])} ${pick(r, TITLE[5])}`;
const authors = (r, n) =>
  Array.from({ length: n }, () => `${String.fromCharCode(65 + Math.floor(r() * 26))}. ${pick(r, NAMES)}`).join(', ');
// Chinese that reads as news at a glance (and, read closely, says the same thing every day).
const ZH = {
  S: ['研究团队', '开源社区', '这一框架', '新一代模型', '该项目', '多家实验室', '作者', '开发者', '评测结果', '这篇论文'],
  V: ['提出了', '发布了', '开源了', '复现了', '改进了', '重写了', '验证了', '整合了', '扩展了', '比较了'],
  A: ['一种', '全新的', '更高效的', '面向智能体的', '基于检索的', '多模态', '长上下文', '低成本的', '可复用的', '端到端的'],
  O: ['推理框架', '检索方案', '评测基准', '训练方法', '工具调用协议', '向量索引', '代码生成模型', '数据集', '对齐方法', '注意力机制'],
  C: ['在多个基准上取得领先', '但与此前的工作高度相似', '代码已在开源平台公开', '引发社区热议', '星标数一周内突破五千',
    '并给出了详细的消融实验', '效果仍有待验证', '同类项目已有数十个', '训练成本降低了一半', '首日下载量超过十万'],
};
function zhSentence(r) {
  const g = (k) => ZH[k][Math.floor(r() * ZH[k].length)];
  return `${r() < 0.2 ? '与此同时，' : ''}${g('S')}${g('V')}${g('A')}${g('O')}，${g('C')}。`;
}
const zhTitle = (r) => (r() < 0.5 ? `又一个${ZH.A[Math.floor(r() * 10)]}${ZH.O[Math.floor(r() * 10)]}问世` : `${ZH.S[Math.floor(r() * 10)]}${ZH.V[Math.floor(r() * 10)]}${ZH.O[Math.floor(r() * 10)]}`);
// Zhuangzi and Laozi, unpunctuated as in an old woodblock edition; | marks a pause (句读).
const CLASSIC =
  '吾生也有涯|而知也無涯|以有涯隨無涯|殆已|已而爲知者|殆而已矣|爲善無近名|爲惡無近刑|緣督以爲經|可以保身|可以全生|可以養親|可以盡年|' +
  '井蛙不可以語於海者|拘於虛也|夏蟲不可以語於冰者|篤於時也|曲士不可以語於道者|束於教也|' +
  '道可道|非常道|名可名|非常名|無名天地之始|有名萬物之母|故常無欲|以觀其妙|常有欲|以觀其徼|此兩者|同出而異名|同謂之玄|玄之又玄|衆妙之門|';
function ident(r) {
  const a = ['load', 'build', 'rank', 'fetch', 'index', 'merge', 'score', 'parse', 'embed', 'search', 'route', 'cache'];
  const b = ['pages', 'repo', 'query', 'tokens', 'batch', 'items', 'index', 'state', 'graph', 'result', 'stars', 'feed'];
  return r() < 0.5 ? `${pick(r, a)}_${pick(r, b)}` : pick(r, b);
}

// ------------------------------------------------------------------------------------------ setting

// Justified block of lines; the word that does not fit carries to the next line.
function textBlock(c, x, y, w, lh, n, next, { justify = true, indent = 0, last = 0.55 } = {}) {
  const sp = c.measureText(' ').width;
  let carry = null;
  for (let i = 0; i < n; i++) {
    const ind = i === 0 ? indent : 0;
    const avail = w - ind;
    const isLast = i === n - 1;
    const limit = isLast ? avail * last : avail;
    const line = [];
    let width = 0;
    for (;;) {
      const word = carry ?? next();
      carry = null;
      const ww = c.measureText(word).width;
      if (line.length && width + sp + ww > limit) {
        carry = word;
        break;
      }
      width += (line.length ? sp : 0) + ww;
      line.push([word, ww]);
      if (width > limit) break;
    }
    const ink = line.reduce((s, [, ww]) => s + ww, 0);
    const gap = justify && !isLast && line.length > 1 ? (avail - ink) / (line.length - 1) : sp;
    let cx = x + ind;
    for (const [word, ww] of line) {
      c.fillText(word, cx, y + i * lh);
      cx += ww + gap;
    }
  }
  return y + n * lh;
}

function centred(c, text, cx, y) {
  const w = c.measureText(text).width;
  c.fillText(text, cx - w / 2, y);
  return w;
}

// Wrap a title into centred lines of at most maxW.
function centredWrap(c, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (line && c.measureText(t).width > maxW) {
      centred(c, line, cx, yy);
      yy += lh;
      line = w;
    } else line = t;
  }
  if (line) centred(c, line, cx, yy);
  return yy + lh;
}

function rule(c, x0, x1, y, w = 1) {
  c.fillRect(x0, y - w / 2, x1 - x0, w);
}

function hanBlock(c, text, x, y, w, size, lh, maxLines, indent = 2) {
  const per = Math.floor(w / size);
  let i = 0;
  let j = indent;
  for (const ch of text) {
    if (j >= per) {
      if (ch === '，' || ch === '。') {
        c.fillText(ch, x + j * size, y + i * lh);
        j = per + 1;
        continue;
      }
      i++;
      j = 0;
      if (i >= maxLines) return y + i * lh;
    }
    c.fillText(ch, x + j * size, y + i * lh);
    j++;
  }
  return y + (i + 1) * lh;
}

function star(c, x, y, R) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.42 : R;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

// ------------------------------------------------------------------------------------------ designs
// Every design draws into a 640 × 896 cell, ink in INK, red in RUB, greys in TONE.

const L = 56; // side margin
const R_ = 640 - 56;

function dPaper(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 29, 600);
  let y = centredWrap(c, title(r), 320, 100, 500, 35);
  c.font = font('garamond', 15.5, 400);
  centred(c, authors(r, 4), 320, y + 12);
  c.font = font('garamond', 12.5, 400, 'italic');
  centred(c, 'Department of Computer Science · Institute for the Study of Libraries', 320, y + 32);
  c.font = font('garamond', 16, 700);
  centred(c, 'Abstract', 320, y + 70);
  c.font = font('garamond', 13.6, 400);
  y = textBlock(c, 100, y + 94, 440, 17, 9, sentence(r));
  c.font = font('garamond', 15.5, 700);
  c.fillText('1   Introduction', L, y + 26);
  c.font = font('garamond', 13.2, 400);
  const top = y + 50;
  const n = Math.floor((850 - top) / 16.4);
  textBlock(c, L, top, 252, 16.4, n, sentence(r), { indent: 14 });
  textBlock(c, 332, y + 26, 252, 16.4, n + 1, sentence(r), { indent: 0, last: 1 });
  c.font = font('garamond', 12, 400);
  centred(c, String(1 + Math.floor(r() * 30)), 320, 872);
}

function dPaperFigure(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 13.2, 400);
  const next = sentence(r);
  textBlock(c, L, 74, 252, 16.4, 20, next, { last: 1 });
  // equation
  c.font = font('garamond', 17, 400, 'italic');
  centred(c, 'p(x) = ∏ p(xᵢ | x₍<ᵢ₎ , θ)', 182, 420);
  c.font = font('garamond', 13.2, 400);
  c.fillText('(3)', 284, 420);
  textBlock(c, L, 452, 252, 16.4, 25, next, { indent: 0, last: 0.7 });
  // figure: axes, three curves, shaded interval, legend
  const fx = 352;
  const fy = 76;
  const fw = 220;
  const fh = 176;
  c.fillStyle = INK;
  rule(c, fx, fx + fw, fy + fh, 1.4);
  c.fillRect(fx - 0.7, fy, 1.4, fh);
  for (let i = 1; i <= 4; i++) {
    rule(c, fx - 4, fx, fy + fh - (i * fh) / 4.4, 1);
    c.fillRect(fx + (i * fw) / 4.4, fy + fh, 1, 4);
  }
  const curves = [0.9, 1.6, 2.6].map((k) => ({ k, a: 0.25 + 0.6 * r() }));
  c.fillStyle = TONE;
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    c.lineTo(fx + u * fw, fy + fh - fh * (0.9 * (1 - Math.exp(-curves[2].k * u * 2)) * 0.95 + 0.06));
  }
  for (let i = 60; i >= 0; i--) {
    const u = i / 60;
    c.lineTo(fx + u * fw, fy + fh - fh * (0.9 * (1 - Math.exp(-curves[2].k * u * 2)) * 0.82 + 0.02));
  }
  c.fill();
  c.strokeStyle = INK;
  curves.forEach(({ k }, j) => {
    c.lineWidth = 1.6;
    c.setLineDash(j === 0 ? [5, 4] : j === 1 ? [1.5, 3] : []);
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      c.lineTo(fx + u * fw, fy + fh - fh * 0.9 * (1 - Math.exp(-k * u * 2)) * 0.88);
    }
    c.stroke();
  });
  c.setLineDash([]);
  c.font = font('garamond', 11.5, 400, 'italic');
  c.fillText('tokens (B)', fx + fw / 2 - 24, fy + fh + 20);
  c.font = font('garamond', 12.4, 400);
  textBlock(c, 340, fy + fh + 48, 244, 15, 4, sentence(r), { last: 0.6 });
  c.font = font('garamond', 13.2, 400);
  textBlock(c, 332, fy + fh + 128, 252, 16.4, 33, next, { last: 0.8 });
  c.font = font('garamond', 12, 400);
  centred(c, String(2 + Math.floor(r() * 30)), 320, 872);
}

function dCode(c, r) {
  c.font = font('mono', 14.2, 400);
  const lh = 21.2;
  let indent = 0;
  const lines = [];
  const imports = ['import json', 'import asyncio', 'from pathlib import Path', 'import numpy as np', 'from .index import Radar'];
  for (let i = 0; i < 4; i++) lines.push([0, pick(r, imports), 'k']);
  lines.push([0, '', 'k']);
  while (lines.length < 38) {
    const p = r();
    if (indent === 0 || p < 0.08) {
      if (indent > 0) lines.push([0, '', 'k']);
      indent = 1;
      lines.push([0, r() < 0.3 ? `class ${pick(r, ['Shelf', 'Reader', 'Index', 'Sweep', 'Lamp'])}:` : `def ${ident(r)}(${ident(r)}, ${ident(r)}=None):`, 'k']);
      if (r() < 0.5) lines.push([1, `"""${cap(phrase(r))}."""`, 's']);
      continue;
    }
    if (p < 0.2) lines.push([indent, `# ${phrase(r)} ${pick(r, G.P)} each ${pick(r, G.N)}`, 'c']);
    else if (p < 0.32 && indent < 3) {
      lines.push([indent, r() < 0.5 ? `for ${pick(r, ['page', 'item', 'repo', 'row'])} in ${ident(r)}:` : `if ${ident(r)} is None:`, 'k']);
      indent++;
    } else if (p < 0.4 && indent > 1) {
      lines.push([indent, `return ${ident(r)}`, 'k']);
      indent--;
    } else lines.push([indent, `${ident(r)} = ${ident(r)}(${ident(r)}${r() < 0.4 ? `, ${Math.floor(r() * 500)}` : ''})`, 'k']);
  }
  lines.forEach(([ind, text, kind], i) => {
    const y = 64 + i * lh;
    c.fillStyle = TONE;
    const no = String(i + 1).padStart(3, ' ');
    c.fillText(no, 30, y);
    c.fillStyle = kind === 'c' || kind === 's' ? TONE : INK;
    c.fillText(text, 88 + ind * 34, y);
  });
}

function dZhArticle(c, r) {
  c.fillStyle = INK;
  c.font = font('serif', 31, 400);
  c.fillText(zhTitle(r), L + 4, 104);
  c.fillStyle = TONE;
  c.font = font('serif', 15, 300);
  c.fillText(`第 ${1 + Math.floor(r() * 400)} 期 · 编辑部 · 阅读 ${1 + Math.floor(r() * 90)} 万`, L + 4, 140);
  c.fillStyle = INK;
  rule(c, L, R_, 160, 1.2);
  c.font = font('serif', 19.5, 300);
  let y = 200;
  while (y < 800) {
    let para = '';
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) para += zhSentence(r);
    y = hanBlock(c, para, L + 2, y, 528, 22, 33.5, Math.floor((866 - y) / 33.5)) + 8;
  }
}

function dNews(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 46, 700);
  c.letterSpacing = '2px';
  centred(c, 'THE BABEL HERALD', 320, 82);
  c.letterSpacing = '0px';
  rule(c, L, R_, 98, 2.4);
  rule(c, L, R_, 104, 0.8);
  c.font = font('garamond', 12, 500);
  c.fillText('VOL. CDX  ·  NO. ' + (100 + Math.floor(r() * 899)), L, 122);
  const d = 'EVERY BOOK ALREADY WRITTEN';
  c.fillText(d, R_ - c.measureText(d).width, 122);
  rule(c, L, R_, 132, 0.8);
  c.font = font('garamond', 31, 600);
  const y = centredWrap(c, title(r), 320, 176, 520, 35);
  c.font = font('garamond', 15, 400, 'italic');
  centred(c, `${cap(phrase(r))}, and ${phrase(r)}`, 320, y + 4);
  // photo: halftone dots
  const px = L;
  const py = y + 26;
  const pw = 346;
  const ph = 214;
  c.fillStyle = TONE;
  for (let j = 0; j < ph / 5; j++)
    for (let i = 0; i < pw / 5; i++) {
      const u = i / (pw / 5);
      const v = j / (ph / 5);
      const lum = 0.5 + 0.35 * Math.sin(u * 7 + Math.sin(v * 5) * 2) * Math.cos(v * 4 - u * 2) + 0.15 * (r() - 0.5);
      const rad = 2.6 * Math.sqrt(Math.max(0, Math.min(1, lum)));
      c.beginPath();
      c.arc(px + i * 5 + 2.5, py + j * 5 + 2.5, rad, 0, Math.PI * 2);
      c.fill();
    }
  c.fillStyle = INK;
  c.font = font('garamond', 11.5, 400, 'italic');
  c.fillText('Photograph: the shaft at night.', px, py + ph + 16);
  c.font = font('garamond', 12.6, 400);
  const next = sentence(r);
  const colW = 162;
  const gap = (528 - 3 * colW) / 2;
  textBlock(c, L + 2 * (colW + gap), py, colW, 15.2, 16, next, { last: 1 });
  const top = py + ph + 36;
  const n = Math.floor((862 - top) / 15.2);
  for (let k = 0; k < 3; k++) textBlock(c, L + k * (colW + gap), k === 2 ? py + 16 * 15.2 + 6 : top, colW, 15.2, k === 2 ? Math.floor((862 - py - 16 * 15.2 - 6) / 15.2) : n, next, { indent: k === 0 ? 12 : 0, last: k === 2 ? 0.5 : 1 });
}

function dReadme(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 34, 700);
  const name = `${ident(r).replace('_', '-')}`;
  c.fillText(name, L, 92);
  rule(c, L, R_, 110, 1);
  // badges
  let x = L;
  for (const b of ['build passing', 'license AGPL', `stars ${(1 + r() * 40).toFixed(1)}k`, 'pypi v0.' + Math.floor(r() * 30)]) {
    c.font = font('mono', 10.5, 500);
    const w = c.measureText(b).width + 18;
    c.fillStyle = TONE;
    roundRect(c, x, 124, w, 20, 3);
    c.fillStyle = INK;
    c.fillText(b, x + 9, 138);
    x += w + 8;
  }
  c.font = font('garamond', 15, 400);
  let y = textBlock(c, L, 180, 528, 20, 4, sentence(r), { justify: false, last: 0.7 });
  c.font = font('garamond', 22, 700);
  c.fillText('Quick start', L, y + 26);
  rule(c, L, R_, y + 36, 0.8);
  c.fillStyle = TONE;
  roundRect(c, L, y + 50, 528, 98, 5);
  c.fillStyle = INK;
  c.font = font('mono', 13, 400);
  c.fillText(`pip install ${name}`, L + 16, y + 76);
  c.fillText(`${name} index ./papers --since 2023`, L + 16, y + 98);
  c.fillText(`${name} search "${pick(r, G.A)} ${pick(r, G.N)}"`, L + 16, y + 120);
  y += 180;
  c.font = font('garamond', 22, 700);
  c.fillText('Features', L, y);
  rule(c, L, R_, y + 10, 0.8);
  c.font = font('garamond', 15, 400);
  y += 40;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.arc(L + 6, y - 5, 2.6, 0, Math.PI * 2);
    c.fill();
    y = textBlock(c, L + 20, y, 508, 20, 1 + (r() < 0.4 ? 1 : 0), sentence(r), { justify: false, last: 0.8 }) + 8;
  }
  c.font = font('garamond', 22, 700);
  c.fillText('License', L, y + 18);
  c.font = font('garamond', 15, 400);
  textBlock(c, L, y + 48, 528, 20, 2, sentence(r), { justify: false, last: 0.5 });
}

function dThread(c, r) {
  let y = 54;
  for (let k = 0; k < 6 && y < 780; k++) {
    c.fillStyle = TONE;
    c.beginPath();
    c.arc(L + 22, y + 22, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = INK;
    c.font = font('garamond', 16, 700);
    const nm = pick(r, NAMES);
    c.fillText(nm, L + 58, y + 16);
    const w = c.measureText(nm).width;
    c.fillStyle = TONE;
    c.font = font('mono', 12, 400);
    c.fillText(`@${nm.toLowerCase()}_${Math.floor(r() * 90)} · ${1 + Math.floor(r() * 23)}h`, L + 66 + w, y + 16);
    c.fillStyle = INK;
    c.font = font('garamond', 15.5, 400);
    const n = 2 + Math.floor(r() * 3);
    y = textBlock(c, L + 58, y + 38, 470, 20, n, sentence(r), { justify: false, last: 0.6 });
    // actions
    c.fillStyle = TONE;
    for (let i = 0; i < 4; i++) {
      const ax = L + 58 + i * 110;
      c.fillRect(ax, y - 4, 13, 10);
      c.font = font('mono', 11, 400);
      c.fillText(String(Math.floor(r() ** 2 * 3000)), ax + 20, y + 5);
    }
    y += 22;
    c.fillStyle = TONE;
    rule(c, L, R_, y, 1);
    y += 20;
  }
}

function dBabel(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 14.2, 400);
  for (let i = 0; i < 40; i++) {
    let s = '';
    for (let j = 0; j < 80; j++) {
      const p = r();
      s += p < 0.16 ? ' ' : p < 0.175 ? ',' : p < 0.185 ? '.' : BABEL[Math.floor(r() * BABEL.length)];
    }
    c.fillText(s, 46, 72 + i * 19.6);
  }
  c.font = font('garamond', 12, 400);
  centred(c, String(1 + Math.floor(r() * 410)), 320, 878);
}

function dMath(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 16, 700);
  c.fillText(`Theorem ${1 + Math.floor(r() * 9)}.`, L, 80);
  c.font = font('garamond', 15, 400, 'italic');
  let y = textBlock(c, L + 96, 80, 432, 19.5, 3, sentence(r), { last: 0.8 });
  const eqs = [
    'ℒ(θ) = − Σᵢ log p_θ(xᵢ | x<ᵢ)',
    '∇θ ℒ = 𝔼[ (r − b) ∇θ log π(a|s) ]',
    'sim(q, d) = ⟨φ(q), φ(d)⟩ / ‖φ(q)‖ ‖φ(d)‖',
    'R(T) ≤ √(2 T log N)',
    'H(p) = − ∫ p(x) log p(x) dx',
    'α* = argmax_α  Σ_k w_k f_k(α)',
  ];
  for (let k = 0; k < 5; k++) {
    c.font = font('garamond', 20, 400, 'italic');
    centred(c, eqs[(k + Math.floor(r() * 6)) % 6], 320, y + 40);
    c.font = font('garamond', 14, 400);
    c.fillText(`(${k + 4})`, R_ - 24, y + 40);
    c.font = font('garamond', 14.6, 400);
    if (k === 1) {
      c.font = font('garamond', 15, 400, 'italic');
      c.fillText('Proof.', L, y + 84);
      c.font = font('garamond', 14.6, 400);
      y = textBlock(c, L + 50, y + 84, 478, 19, 4, sentence(r), { last: 0.9 });
    } else y = textBlock(c, L, y + 84, 528, 19, 3 + Math.floor(r() * 2), sentence(r), { last: 0.7 });
  }
  c.fillText('∎', R_ - 10, y - 6);
}

function dTables(c, r) {
  c.fillStyle = INK;
  let y = 70;
  for (let t = 0; t < 2; t++) {
    c.font = font('garamond', 14, 400);
    c.fillText(`Table ${2 + t}: `, L, y);
    c.font = font('garamond', 14, 400, 'italic');
    textBlock(c, L + 64, y, 464, 18, 2, sentence(r), { justify: false, last: 0.6 });
    y += 46;
    rule(c, L, R_, y, 1.6);
    c.font = font('garamond', 13.5, 700);
    const head = ['Method', 'Recall', 'nDCG', 'MRR', 'Latency', 'Cost'];
    const cx = [L + 4, 218, 296, 374, 448, 530];
    head.forEach((h, i) => c.fillText(h, cx[i], y + 22));
    rule(c, L, R_, y + 32, 0.8);
    y += 56;
    const rows = 9 + Math.floor(r() * 4);
    for (let i = 0; i < rows; i++) {
      c.font = font('garamond', 13.5, i === rows - 1 ? 700 : 400);
      c.fillText(`${pick(r, TITLE[1]).split('-')[0]}-${pick(r, ['RAG', 'BM25', 'ColBERT', 'Radar', 'DPR', 'HyDE'])}`, cx[0], y);
      c.font = font('mono', 12.5, i === rows - 1 ? 700 : 400);
      for (let j = 1; j < 6; j++) {
        const v = j === 4 ? `${Math.floor(60 + r() * 900)}ms` : j === 5 ? `$${(r() * 9).toFixed(2)}` : (40 + r() * 55).toFixed(1);
        c.fillText(v, cx[j], y);
      }
      y += 21;
    }
    rule(c, L, R_, y - 10, 1.6);
    y += 34;
    c.font = font('garamond', 14.4, 400);
    y = textBlock(c, L, y, 528, 18.5, 3, sentence(r), { last: 0.6 }) + 36;
  }
}

function dTrending(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 24, 700);
  c.fillText('Trending repositories', L, 78);
  c.fillStyle = TONE;
  c.font = font('mono', 12, 400);
  c.fillText('today · all languages · ★ ≥ 500', L, 102);
  rule(c, L, R_, 118, 1);
  let y = 152;
  for (let k = 0; k < 8; k++) {
    c.fillStyle = INK;
    c.font = font('mono', 15, 700);
    c.fillText(`${pick(r, NAMES).toLowerCase()} / ${ident(r).replace('_', '-')}`, L, y);
    c.font = font('garamond', 14, 400);
    textBlock(c, L, y + 23, 528, 18, 1 + (r() < 0.5 ? 1 : 0), sentence(r), { justify: false, last: 0.95 });
    const yy = y + 66;
    c.fillStyle = TONE;
    c.beginPath();
    c.arc(L + 6, yy - 4, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = INK;
    c.font = font('mono', 12, 400);
    c.fillText(pick(r, ['Python', 'TypeScript', 'Rust', 'Go', 'C++', 'Jupyter']), L + 18, yy);
    star(c, L + 128, yy - 4, 6);
    c.fillText(`${(0.5 + r() * 60).toFixed(1)}k`, L + 140, yy);
    c.fillStyle = RUB;
    star(c, R_ - 116, yy - 4, 6);
    c.fillText(`+${Math.floor(30 + r() ** 2 * 3000)} today`, R_ - 104, yy);
    c.fillStyle = TONE;
    rule(c, L, R_, yy + 18, 0.8);
    y += 92;
  }
}

// Invented scripts. s = x-height in pixels.
function cursiveWord(c, r, xr, y, s) {
  const n = 2 + Math.floor(r() * 6);
  const xs = [xr];
  for (let i = 0; i < n; i++) xs.push(xs[i] - s * (0.8 + r() * 1.1));
  const xl = xs[n];
  c.lineCap = 'round';
  c.lineWidth = s * 0.3;
  c.beginPath();
  c.moveTo(xr, y);
  c.lineTo(xl, y);
  c.stroke();
  c.lineWidth = s * 0.22;
  for (let i = 0; i < n; i++) {
    const x = (xs[i] + xs[i + 1]) / 2;
    const k = r();
    c.beginPath();
    if (k < 0.2) {
      c.moveTo(x, y);
      c.quadraticCurveTo(x + s * 0.1, y - s * 1.4, x - s * 0.05, y - s * 2.5);
    } else if (k < 0.45) {
      c.moveTo(x + s * 0.3, y);
      c.quadraticCurveTo(x, y - s * 0.9, x - s * 0.3, y);
    } else if (k < 0.6) {
      c.ellipse(x, y - s * 0.42, s * 0.36, s * 0.42, 0, 0, Math.PI * 2);
    } else if (k < 0.7) {
      c.moveTo(x + s * 0.4, y);
      c.bezierCurveTo(x + s * 0.2, y + s * 0.9, x - s * 0.7, y + s * 0.9, x - s * 0.6, y - s * 0.2);
    }
    c.stroke();
    const dots = r();
    if (dots < 0.35) {
      const nd = dots < 0.2 ? 1 : dots < 0.3 ? 2 : 3;
      const dy = r() < 0.6 ? -s * 1.2 : s * 0.7;
      for (let d = 0; d < nd; d++) {
        c.beginPath();
        c.arc(x + (d - (nd - 1) / 2) * s * 0.42, dy + y - (d === 2 ? s * 0.38 : 0), s * 0.16, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  if (r() < 0.45) {
    c.lineWidth = s * 0.3;
    c.beginPath();
    c.moveTo(xl, y);
    c.bezierCurveTo(xl - s * 0.6, y + s * 0.3, xl - s * 1.3, y + s * 1.5, xl - s * 2.1, y - s * 0.3);
    c.stroke();
    return xl - s * 2.6;
  }
  return xl - s * 1.1;
}

function dCursive(c, r) {
  c.fillStyle = INK;
  c.strokeStyle = INK;
  const s = 7.4;
  // a heading, centred, larger
  let x = 470;
  for (let w = 0; w < 3; w++) x = cursiveWord(c, r, x, 96, s * 1.9) - s * 2.2;
  for (let i = 0; i < 27; i++) {
    const y = 158 + i * 26;
    let xr = R_ - (i === 0 ? 30 : 0);
    while (xr > L + 50) xr = cursiveWord(c, r, xr, y, s) - s * 1.2;
  }
  c.fillStyle = TONE;
  rule(c, L + 140, R_ - 140, 124, 1);
}

function hangingWord(c, r, x, y, s) {
  const n = 2 + Math.floor(r() * 4);
  const w = s * 1.25;
  c.lineCap = 'butt';
  c.lineWidth = s * 0.24;
  c.beginPath();
  c.moveTo(x - s * 0.1, y - s * 1.1);
  c.lineTo(x + n * w + s * 0.1, y - s * 1.1);
  c.stroke();
  c.lineWidth = s * 0.2;
  for (let i = 0; i < n; i++) {
    const gx = x + i * w;
    const k = r();
    c.beginPath();
    // stem at the right of the glyph
    if (k < 0.8) {
      c.moveTo(gx + w * 0.82, y - s * 1.1);
      c.lineTo(gx + w * 0.82, y + s * 0.15);
    }
    // body
    if (k < 0.3) {
      c.moveTo(gx + w * 0.82, y - s * 0.55);
      c.bezierCurveTo(gx + w * 0.1, y - s * 0.9, gx, y, gx + w * 0.55, y + s * 0.05);
    } else if (k < 0.55) {
      c.moveTo(gx + w * 0.15, y - s * 1.1);
      c.bezierCurveTo(gx + w * 0.7, y - s * 0.8, gx + w * 0.6, y - s * 0.3, gx + w * 0.2, y - s * 0.35);
      c.bezierCurveTo(gx + w * 0.7, y - s * 0.2, gx + w * 0.6, y + s * 0.3, gx + w * 0.1, y + s * 0.1);
    } else if (k < 0.8) {
      c.ellipse(gx + w * 0.45, y - s * 0.4, w * 0.3, s * 0.38, 0, 0, Math.PI * 2);
    } else {
      c.moveTo(gx + w * 0.2, y - s * 1.1);
      c.quadraticCurveTo(gx + w * 0.9, y - s * 0.5, gx + w * 0.3, y + s * 0.1);
    }
    c.stroke();
    const m = r();
    if (m < 0.18) {
      c.beginPath();
      c.moveTo(gx + w * 0.8, y - s * 1.1);
      c.quadraticCurveTo(gx + w * 0.5, y - s * 2.1, gx + w * 0.05, y - s * 1.6);
      c.stroke();
    } else if (m < 0.26) {
      c.beginPath();
      c.arc(gx + w * 0.55, y - s * 1.6, s * 0.15, 0, Math.PI * 2);
      c.fill();
    }
  }
  return x + n * w;
}

function dHanging(c, r) {
  c.fillStyle = INK;
  c.strokeStyle = INK;
  const s = 7.8;
  let x = 170;
  for (let w = 0; w < 3; w++) x = hangingWord(c, r, x, 100, s * 1.9) + s * 2;
  for (let i = 0; i < 25; i++) {
    const y = 168 + i * 28;
    let xl = L + (i % 6 === 0 ? 28 : 0);
    while (xl < R_ - 60) {
      xl = hangingWord(c, r, xl, y, s) + s * 0.9;
      if (r() < 0.07) {
        c.lineWidth = s * 0.22;
        c.beginPath();
        c.moveTo(xl + s * 0.3, y - s * 1.2);
        c.lineTo(xl + s * 0.3, y + s * 0.2);
        c.stroke();
        xl += s * 1.4;
      }
    }
  }
}

function jamo(c, r, x, y, w, h) {
  const k = Math.floor(r() * 7);
  c.beginPath();
  if (k === 0) {
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h);
  } else if (k === 1) {
    c.moveTo(x, y);
    c.lineTo(x, y + h);
    c.lineTo(x + w, y + h);
  } else if (k === 2) c.rect(x, y, w, h);
  else if (k === 3) c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (k === 4) {
    c.moveTo(x + w / 2, y);
    c.lineTo(x, y + h);
    c.moveTo(x + w / 2, y + h * 0.4);
    c.lineTo(x + w, y + h);
  } else if (k === 5) {
    c.moveTo(x, y);
    c.lineTo(x, y + h);
    c.lineTo(x + w, y + h);
    c.lineTo(x + w, y);
    c.moveTo(x, y + h / 2);
    c.lineTo(x + w, y + h / 2);
  } else {
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.moveTo(x + w / 2, y);
    c.lineTo(x, y + h);
    c.moveTo(x + w / 2, y + h * 0.35);
    c.lineTo(x + w, y + h);
  }
  c.stroke();
}

function block(c, r, x, y, s) {
  // one syllable block s × s: initial + vowel (+ final)
  const vert = r() < 0.6;
  const fin = r() < 0.35;
  const hb = fin ? s * 0.55 : s;
  c.beginPath();
  if (vert) {
    jamo(c, r, x, y + hb * 0.12, s * 0.5, hb * 0.76);
    c.beginPath();
    c.moveTo(x + s * 0.78, y);
    c.lineTo(x + s * 0.78, y + hb);
    c.moveTo(x + s * 0.78, y + hb * 0.45);
    c.lineTo(x + s * (r() < 0.5 ? 1.0 : 0.62), y + hb * 0.45);
    c.stroke();
  } else {
    jamo(c, r, x + s * 0.2, y, s * 0.6, hb * 0.45);
    c.beginPath();
    c.moveTo(x, y + hb * 0.75);
    c.lineTo(x + s, y + hb * 0.75);
    c.moveTo(x + s * 0.5, y + hb * 0.75);
    c.lineTo(x + s * 0.5, y + hb * (r() < 0.5 ? 0.55 : 0.95));
    c.stroke();
  }
  if (fin) jamo(c, r, x + s * 0.15, y + s * 0.66, s * 0.7, s * 0.32);
}

function dBlocks(c, r) {
  c.strokeStyle = INK;
  c.fillStyle = INK;
  c.lineWidth = 1.5;
  const s = 15;
  c.lineWidth = 3;
  let x = 140;
  for (let i = 0; i < 6; i++) {
    block(c, r, x, 72, s * 2);
    x += s * 2.5 + (i === 2 ? s * 1.5 : 0);
  }
  c.lineWidth = 1.5;
  for (let i = 0; i < 25; i++) {
    const y = 150 + i * 28.5;
    let xl = L + (i % 7 === 0 ? s * 2 : 0);
    while (xl < R_ - s * 3) {
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n && xl < R_ - s; j++) {
        block(c, r, xl, y, s);
        xl += s * 1.2;
      }
      if (r() < 0.12) {
        c.beginPath();
        c.arc(xl + 1, y + s - 1, 1.6, 0, Math.PI * 2);
        c.fill();
      }
      xl += s * 0.8;
    }
  }
}

function dZhClassical(c, r) {
  c.fillStyle = INK;
  c.strokeStyle = INK;
  // frame (四周双边) and column rules (界栏)
  const x0 = 64;
  const x1 = 576;
  const y0 = 76;
  const y1 = 836;
  c.lineWidth = 3.2;
  c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  c.lineWidth = 1.1;
  c.strokeRect(x0 + 7, y0 + 7, x1 - x0 - 14, y1 - y0 - 14);
  const cols = 9;
  const cw = (x1 - x0 - 14) / cols;
  for (let i = 1; i < cols; i++) rule(c, x0 + 7 + i * cw - 0.5, x0 + 7 + i * cw + 0.5, (y0 + y1) / 2, 0);
  for (let i = 1; i < cols; i++) c.fillRect(x0 + 7 + i * cw - 0.5, y0 + 7, 1, y1 - y0 - 14);
  c.font = font('serif', 31, 400);
  const per = 21;
  const ch = (y1 - y0 - 30) / per;
  const start = Math.floor(r() * 40);
  let k = start;
  for (let i = 0; i < cols; i++) {
    const cx = x1 - 7 - (i + 0.5) * cw;
    const n = i === cols - 1 ? 9 : per;
    for (let j = 0; j < n; j++) {
      let g = CLASSIC[k % CLASSIC.length];
      k++;
      if (g === '|') {
        // 句读: a small red circle at the lower right of the previous character
        c.fillStyle = RUB;
        c.beginPath();
        c.arc(cx + 15, y0 + 20 + (j - 1 + 0.98) * ch, 3.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = INK;
        g = CLASSIC[k % CLASSIC.length];
        k++;
      }
      const w = c.measureText(g).width;
      c.fillText(g, cx - w / 2, y0 + 20 + (j + 0.84) * ch);
    }
  }
  // a collector's seal (朱文印) in the last column's lower half
  c.fillStyle = RUB;
  c.strokeStyle = RUB;
  const sx = x0 + 7 + cw * 0.5 - 30;
  const sy = 660;
  c.lineWidth = 3;
  c.strokeRect(sx, sy, 60, 60);
  c.font = font('serif', 25, 400);
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([i, j], k) => {
    c.fillText(HAN_SEAL[k], sx + 31 - i * 28, sy + 27 + j * 28);
  });
}

function dManuscript(c, r) {
  c.fillStyle = INK;
  c.font = font('garamond', 19, 400);
  const lh = 25.5;
  // rubricated drop cap, four lines deep
  const src = sentence(r);
  const first = src();
  let started = false;
  const next = () => (started ? src() : ((started = true), first.slice(1)));
  c.fillStyle = RUB;
  c.font = font('garamond', 112, 600);
  c.fillText(first[0], L + 2, 96 + lh * 3 - 6);
  c.fillStyle = INK;
  c.font = font('garamond', 19, 400);
  let y = 96;
  y = textBlock(c, L + 92, y, 388, lh, 4, next, { last: 1 });
  y = textBlock(c, L, y, 480, lh, 9, next, { last: 0.45 });
  c.fillStyle = RUB;
  c.fillText('¶', L - 22, y + lh);
  c.fillStyle = INK;
  y = textBlock(c, L, y + lh, 480, lh, 15, next, { last: 0.6 });
  // marginalia in the outer margin, small italic, a different hand
  c.font = font('garamond', 12.5, 400, 'italic');
  for (let k = 0; k < 3; k++) {
    const my = 180 + k * 220 + r() * 80;
    textBlock(c, 548, my, 70, 15, 4, sentence(r), { justify: false, last: 0.8 });
  }
  c.font = font('garamond', 14, 400);
  c.fillStyle = RUB;
  centred(c, `— ${['xii', 'xliv', 'cdx', 'lxxx', 'ix'][Math.floor(r() * 5)]} —`, 290, 872);
}

const DRAW = [
  dPaper, dPaperFigure, dCode, dZhArticle, dNews, dReadme, dThread, dBabel,
  dMath, dTables, dTrending, dCursive, dHanging, dBlocks, dZhClassical, dManuscript,
];

// ------------------------------------------------------------------------------------------- atlas

const cache = new Map();

// Draws (once) the sixteen designs into one canvas, cell size scale × (640 × 896).
export async function pageAtlasCanvas({ scale = 1, seed = 1 } = {}) {
  const key = `${scale}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  await loadFonts();
  const cv = makeCanvas(ATLAS.COLS * ATLAS.W * scale, ATLAS.ROWS * ATLAS.H * scale);
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter'; // masks add: ink, rubric and tone are separate channels
  c.textBaseline = 'alphabetic';
  DRAW.forEach((draw, d) => {
    c.save();
    c.translate((d % ATLAS.COLS) * ATLAS.W * scale, Math.floor(d / ATLAS.COLS) * ATLAS.H * scale);
    c.scale(scale, scale);
    c.beginPath();
    c.rect(0, 0, ATLAS.W, ATLAS.H);
    c.clip();
    draw(c, rng(seed * 101 + d * 7919));
    c.restore();
  });
  cache.set(key, cv);
  return cv;
}

export async function pageAtlas({ scale = 1, seed = 1, anisotropy = 8 } = {}) {
  const cv = await pageAtlasCanvas({ scale, seed });
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy });
}

// One design, drawn alone, for inspection (look-dev) or for a hero page.
export async function pageDesignCanvas(d, { scale = 1, seed = 1 } = {}) {
  await loadFonts();
  const cv = makeCanvas(ATLAS.W * scale, ATLAS.H * scale);
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  c.scale(scale, scale);
  DRAW[d](c, rng(seed * 101 + d * 7919));
  return cv;
}
