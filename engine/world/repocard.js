// The site's project card for a GitHub repository (AIGCNEWS frontend: ProjectResultCard.vue and
// ProjectHeat.vue): the name, owner/repo; the description; a row of tags (the sub-category, the
// category, then the repository's own tags, three shown and the rest as "+N"); and the stats: ★ stars,
// today's growth and the heat, 0–100 to one decimal. The labels as the site's locales write them:
// zh "2,431 stars · 今日 +312 · 热度 87.4", en "2,431 stars · +312 today · Heat 87.4". No GitHub mark
// and no avatar: the ★ and the words carry it.
//
// The film prints the card on parchment card stock in its own type (BIBLE §5): the name in mono, as on
// s08's spines; the English description in Garamond; the Chinese in Noto Serif SC; the stats in mono.
// layoutCard sets the face in millimetres from the card's top-left corner; drawStatic and drawRefined
// draw it as masks, a channel per ink as in the page atlas (not colours), for a shot's own shader. The
// tags are not drawn on the face: a shot builds each as a leaf of its own (chipCanvas), so they can
// sprout off the card.
import { FONTS, loadFonts, makeCanvas } from '../runtime/lib/text.js';

export const CARD = { W: 320, H: 160, R: 11 }; // mm; the corner radius as on the site's cards

// ottervale/mcp-server: the first repository the machine prints in s08. Fictional, in the site's own
// fields: description as collected from GitHub, description_zh and the bilingual tags written by the
// site's AI enrichment, the category and sub-category from its taxonomy (agents_automation,
// mcp_tool_use), stars, today's growth and heat.
export const OTTERVALE = {
  owner: 'ottervale',
  repo: 'mcp-server',
  description: 'A small MCP server that lets agents search what already exists before they build it again.',
  descriptionZh: '轻量 MCP 服务器：让智能体在重复造轮子之前，先检索已有的实现。',
  tags: [
    { zh: 'MCP / 工具调用', en: 'MCP / Tool Use' },
    { zh: 'AI Agent / 自动化', en: 'AI Agents / Automation' },
    { zh: '代码检索', en: 'code search' },
  ],
  more: 2,
  stars: 2431,
  today: 312,
  heat: 87.4,
};

export function statsLabels(spec, lang) {
  const n = (v) => v.toLocaleString('en-US');
  return lang === 'en'
    ? { stars: `${n(spec.stars)} stars`, today: `+${n(spec.today)} today`, heat: `Heat ${spec.heat.toFixed(1)}` }
    : { stars: `${n(spec.stars)} stars`, today: `今日 +${n(spec.today)}`, heat: `热度 ${spec.heat.toFixed(1)}` };
}

// Sizes in mm: px = the font size, base = a baseline from the card's top edge.
export const TYPE = {
  margin: 16,
  name: { px: 12.5, base: 28, owner: { weight: 420, ink: 0.58 }, repo: { weight: 640, ink: 1 } },
  en: { px: 9.8, weight: 440, lead: 13.2, gap: 20, ink: 0.9 }, // gap: from the name's baseline
  zh: { px: 9.0, weight: 400, lead: 13.4, gap: 15.4 }, // gap: from the last English baseline
  chips: { gap: 9.5, h: 14.5, hinge: 2.8, px: 6.0, pad: 5, col: 7, r: 4.2, weight: 470 },
  stats: { gap: 26, px: 8.0, weight: 470, space: 9.5, icon: 7.2, ink: 0.85 }, // gap: from the chips' bottom to the baseline
};

const fam = (k) => `"${FONTS[k].family}"`;
const MONO = (w, px) => `${w} ${px}px ${fam('mono')}, ${fam('serif')}`;
const GARA = (w, px) => `${w} ${px}px ${fam('garamond')}`;
const SERIF = (w, px) => `${w} ${px}px ${fam('serif')}`;
const HANG = /^[，。：；、！？）」』]$/u;
const K = 10; // measuring scale, px per mm

// The face, laid out (mm from the card's top-left corner). Everything a shot animates is listed with
// its box: the name's parts, the English words, the Chinese characters (one by one, Latin included),
// the tag pairs (column centre, the hinge between the Chinese and the English chip), the "+N", and the
// three stats with their icons.
export async function layoutCard(spec, lang, T = TYPE) {
  await loadFonts();
  const m = makeCanvas(8, 8).getContext('2d');
  const wide = (f, px, s) => {
    m.font = f(px * K);
    return m.measureText(s).width / K;
  };
  const metrics = (f, px, s) => {
    m.font = f(px * K);
    const r = m.measureText(s);
    return { asc: r.fontBoundingBoxAscent / K, desc: r.fontBoundingBoxDescent / K };
  };
  const maxW = CARD.W - 2 * T.margin;
  const L = { spec, lang, T };

  // owner/repo
  const fo = (px) => MONO(T.name.owner.weight, px);
  const fr = (px) => MONO(T.name.repo.weight, px);
  const owner = `${spec.owner}/`;
  const wo = wide(fo, T.name.px, owner);
  L.name = {
    base: T.name.base,
    px: T.name.px,
    parts: [
      { text: owner, x: T.margin, w: wo, font: fo, ink: T.name.owner.ink },
      { text: spec.repo, x: T.margin + wo, w: wide(fr, T.name.px, spec.repo), font: fr, ink: T.name.repo.ink },
    ],
  };

  // the English description, word by word
  const fe = (px) => GARA(T.en.weight, px);
  const space = wide(fe, T.en.px, ' ');
  const lines = [[]];
  let x = 0;
  for (const text of spec.description.split(' ')) {
    const w = wide(fe, T.en.px, text);
    if (lines.at(-1).length && x + space + w > maxW) {
      lines.push([]);
      x = 0;
    }
    if (lines.at(-1).length) x += space;
    lines.at(-1).push({ text, x: T.margin + x, w });
    x += w;
  }
  const en0 = T.name.base + T.en.gap;
  L.en = { px: T.en.px, font: fe, ink: T.en.ink, ...metrics(fe, T.en.px, 'Ag'), lines: lines.map((words, i) => ({ base: en0 + i * T.en.lead, words })) };
  let words = 0;
  for (const ln of L.en.lines) for (const w of ln.words) w.i = words++;

  // the Chinese description, character by character; a Latin word does not break, closing
  // punctuation hangs at the end of the line rather than start the next
  const fz = (px) => SERIF(T.zh.weight, px);
  const zsp = wide(fz, T.zh.px, ' ');
  const zl = [[]];
  x = 0;
  for (const [tok] of spec.descriptionZh.matchAll(/[A-Za-z0-9]+|\s+|[^A-Za-z0-9\s]/gu)) {
    if (/^\s+$/u.test(tok)) {
      if (zl.at(-1).length) x += zsp;
      continue;
    }
    const chars = [...tok].map((ch) => ({ ch, w: wide(fz, T.zh.px, ch) }));
    const tw = chars.reduce((a, c) => a + c.w, 0);
    if (x + tw > maxW && zl.at(-1).length && !HANG.test(tok)) {
      zl.push([]);
      x = 0;
    }
    for (const c of chars) {
      zl.at(-1).push({ ...c, x: T.margin + x });
      x += c.w;
    }
  }
  const zh0 = L.en.lines.at(-1).base + T.zh.gap;
  const zm = metrics(fz, T.zh.px, '永');
  L.zh = { px: T.zh.px, font: fz, ...zm, chars: [] };
  zl.forEach((ln, i) => ln.forEach((c) => L.zh.chars.push({ ...c, base: zh0 + i * T.zh.lead, i: L.zh.chars.length })));
  L.zh.band = [zh0 - zm.asc, zh0 + (zl.length - 1) * T.zh.lead + zm.desc];

  // the tags in pairs: the Chinese chip above a hinge, the English below it, centred on a column
  const C = T.chips;
  const fc = (px) => MONO(C.weight, px);
  const top = L.zh.band[1] + C.gap;
  const hinge = top + C.h + C.hinge / 2;
  x = T.margin;
  L.chips = spec.tags.map((tag, k) => {
    const zw = wide(fc, C.px, tag.zh) + 2 * C.pad;
    const ew = wide(fc, C.px, tag.en) + 2 * C.pad;
    const col = Math.max(zw, ew);
    const pair = { k, x: x + col / 2, hinge, zh: { text: tag.zh, w: zw, h: C.h }, en: { text: tag.en, w: ew, h: C.h }, gap: C.hinge / 2 };
    x += col + C.col;
    return pair;
  });
  L.more = spec.more ? { text: `+${spec.more}`, x: x + C.h / 2, hinge, d: C.h, gap: C.hinge / 2 } : null;
  L.chipFont = fc;
  L.chipStyle = C;
  const chipsBottom = hinge + C.hinge / 2 + C.h;

  // the stats: ★ and the stars, the growth arrow and today's growth, the flame and the heat (right)
  const S = T.stats;
  const fs = (px) => MONO(S.weight, px);
  const labels = statsLabels(spec, lang);
  const base = chipsBottom + S.gap;
  const sm = metrics(fs, S.px, '0');
  const iconY = base - 0.36 * S.px; // icons centred on the figures' middle
  const stars = { icon: { x: T.margin, y: iconY, d: S.icon }, text: labels.stars, x: T.margin + S.icon + 1.6 };
  stars.w = wide(fs, S.px, stars.text);
  const tx = stars.x + stars.w + S.space;
  const today = { icon: { x: tx, y: iconY, d: S.icon }, text: labels.today, x: tx + S.icon + 1.8 };
  today.glyphs = glyphRun(today.text, today.x, (s) => wide(fs, S.px, s));
  today.w = today.glyphs.at(-1).x + today.glyphs.at(-1).w - today.x;
  const heatText = labels.heat;
  const hw = wide(fs, S.px, heatText);
  const heat = { text: heatText, w: hw, x: CARD.W - T.margin - hw };
  heat.icon = { x: heat.x - S.icon - 1.6, y: iconY, d: S.icon };
  heat.glyphs = glyphRun(heatText, heat.x, (s) => wide(fs, S.px, s));
  heat.x0 = heat.icon.x;
  heat.x1 = heat.x + hw;
  L.stats = { base, px: S.px, font: fs, ink: S.ink, ...sm, stars, today, heat };
  return L;
}

// the advance of each character of a run set in one font, measured as prefixes so kerning holds
function glyphRun(text, x0, width) {
  const chars = [...text];
  const out = [];
  let prev = 0;
  for (let i = 0; i < chars.length; i++) {
    const w = width(chars.slice(0, i + 1).join(''));
    out.push({ ch: chars[i], x: x0 + prev, w: w - prev });
    prev = w;
  }
  return out;
}

// ------------------------------------------------------------------------------------------ icons

// a five-pointed star in a box of side d at (x, y) its top-left
function star(c, x, y, d) {
  const cx = x + d / 2;
  const cy = y + d * 0.53;
  const R = d * 0.5;
  const r = R * 0.43;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    c[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  c.closePath();
  c.fill();
}
// the growth arrow, drawn up to share u of its length (a line climbing in three strokes, then its head)
export function arrow(c, x, y, d, u = 1, lw = 0.75) {
  const P = [[0.06, 0.78], [0.38, 0.46], [0.56, 0.64], [0.94, 0.26]].map(([a, b]) => [x + a * d, y + b * d]);
  const H = [[0.62, 0.26], [0.94, 0.26], [0.94, 0.58]].map(([a, b]) => [x + a * d, y + b * d]);
  const segs = [[P[0], P[1]], [P[1], P[2]], [P[2], P[3]], [H[0], H[1]], [H[1], H[2]]];
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  let left = u * lens.reduce((a, b) => a + b, 0);
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  segs.forEach(([a, b], i) => {
    if (left <= 0) return;
    const f = Math.min(1, left / lens[i]);
    c.moveTo(a[0], a[1]);
    c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    left -= lens[i];
  });
  c.stroke();
}
// a flame: a teardrop leaning a little, with a lick cut into its side
function flame(c, x, y, d) {
  const X = (a) => x + a * d;
  const Y = (b) => y + b * d;
  c.beginPath();
  c.moveTo(X(0.52), Y(0.02));
  c.bezierCurveTo(X(0.66), Y(0.24), X(0.9), Y(0.4), X(0.86), Y(0.66));
  c.bezierCurveTo(X(0.83), Y(0.88), X(0.66), Y(0.98), X(0.5), Y(0.98));
  c.bezierCurveTo(X(0.3), Y(0.98), X(0.14), Y(0.85), X(0.14), Y(0.64));
  c.bezierCurveTo(X(0.14), Y(0.46), X(0.27), Y(0.36), X(0.33), Y(0.24));
  c.bezierCurveTo(X(0.38), Y(0.36), X(0.4), Y(0.44), X(0.47), Y(0.48));
  c.bezierCurveTo(X(0.53), Y(0.34), X(0.55), Y(0.18), X(0.52), Y(0.02));
  c.closePath();
  c.fill('evenodd');
}

// ---------------------------------------------------------------------------------------- drawing

const CH = { r: (a) => `rgba(255,0,0,${a})`, g: (a) => `rgba(0,255,0,${a})`, b: (a) => `rgba(0,0,255,${a})` };
function begin(cv, ppm) {
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
  c.letterSpacing = '0px';
  return c;
}
export const faceCanvas = (ppm) => makeCanvas(CARD.W * ppm, CARD.H * ppm);

// What the card carries as it is collected: the name, the English description, ★ and the stars (red:
// ink); and the heat, to be engraved (green: its glyphs and the flame; blue: the same blurred, for the
// lip of the cut).
export function drawStatic(cv, L, ppm) {
  const c = begin(cv, ppm);
  for (const p of L.name.parts) {
    c.font = p.font(L.name.px);
    c.fillStyle = CH.r(p.ink);
    c.fillText(p.text, p.x, L.name.base);
  }
  c.font = L.en.font(L.en.px);
  c.fillStyle = CH.r(L.en.ink);
  for (const ln of L.en.lines) for (const w of ln.words) c.fillText(w.text, w.x, ln.base);
  const S = L.stats;
  c.fillStyle = CH.r(S.ink);
  star(c, S.stars.icon.x, S.stars.icon.y - S.stars.icon.d / 2, S.stars.icon.d);
  c.font = S.font(S.px);
  c.fillText(S.stars.text, S.stars.x, S.base);
  const heat = (fill) => {
    c.fillStyle = fill;
    flame(c, S.heat.icon.x, S.heat.icon.y - S.heat.icon.d / 2, S.heat.icon.d);
    c.font = S.font(S.px);
    c.fillText(S.heat.text, S.heat.x, S.base);
  };
  heat(CH.g(1));
  c.filter = `blur(${(0.45 * ppm).toFixed(2)}px)`;
  heat(CH.b(1));
  c.filter = 'none';
}

// What the light writes, as masks for the shot to reveal: red the Chinese description (amber ink);
// green, over each Chinese character's whole box, the character's centre as a share of the card's
// width, so a shader can time each character by when the seam reaches it; blue today's growth and its
// arrow (ink), revealed where the seam has passed.
export function drawRefined(cv, L, ppm) {
  const c = begin(cv, ppm);
  const Z = L.zh;
  c.font = Z.font(Z.px);
  for (const ch of Z.chars) {
    c.fillStyle = CH.r(1);
    c.fillText(ch.ch, ch.x, ch.base);
    c.fillStyle = CH.g((ch.x + ch.w / 2) / CARD.W);
    c.fillRect(ch.x, ch.base - Z.asc, ch.w, Z.asc + Z.desc);
  }
  const S = L.stats;
  c.strokeStyle = CH.b(S.ink);
  arrow(c, S.today.icon.x, S.today.icon.y - S.today.icon.d / 2, S.today.icon.d);
  c.font = S.font(S.px);
  c.fillStyle = CH.b(S.ink);
  c.fillText(S.today.text, S.today.x, S.base);
}

// One chip of a tag, its own leaf: red the label, green the chip (a rounded rectangle), blue its edge.
// w, h in mm; ppm pixels per mm.
export function chipCanvas(L, text, w, h, ppm) {
  const C = L.chipStyle;
  const cv = makeCanvas(w * ppm, h * ppm);
  const c = begin(cv, ppm);
  const r = Math.min(C.r, h / 2);
  const rr = (inset) => {
    c.beginPath();
    c.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, Math.max(0, r - inset));
  };
  rr(0);
  c.fillStyle = CH.g(1);
  c.fill();
  rr(0.35);
  c.strokeStyle = CH.b(1);
  c.lineWidth = 0.45;
  c.stroke();
  c.font = L.chipFont(C.px);
  c.fillStyle = CH.r(1);
  const tw = c.measureText(text).width;
  c.fillText(text, (w - tw) / 2, h / 2 + 0.36 * C.px);
  return cv;
}
