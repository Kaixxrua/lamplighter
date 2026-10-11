// Agent C: s38's result card, and what s39 opens on. The return of the real search made while the film was
// being made (assets/ui/s38-result.json: search_github_ai_projects, 2026-10-05 22:17), drawn as the site's
// project card (repocard.js: the name in mono, the descriptions, the tags, ★ stars, today's growth,
// the heat) from items[0], heygen-com/hyperframes, in a spec written as repocard's OTTERVALE is: the
// description as collected from GitHub, description_zh, the sub-category and the category as the tags (the
// repository has none of its own), stars, daily_star_growth, hot_score to one decimal.
//
// Bilingual (the return carries both): the main language follows the film's (ctx.lang) and comes first at
// full ink; the other follows a size down and fainter, the second line. The English is dark ink and the
// Chinese amber, as on s18's card; the tags run in the main language with the other's row under it. The foot
// carries the return's own attribution line in small mono. Everything but the face is the same in the two
// films: the card's size and place, the rows and the fields over it (code, mono, both films alike).
//
// The face is laid out in millimetres from the card's top-left corner, the card 320 x 160 like repocard's,
// set in the air at twice that (CARD38.S metres per mm). It is drawn into two masks, a channel per ink (as
// repocard draws its own): A = dark ink, amber ink, steel ink (the chips' labels and edges); B = the chips'
// paper, the lime heat. The fields typed over the card and the rows under it are drawn into masks of their
// own (coverage; mono, so a shader finds the line and the glyph from where it is).
import * as THREE from 'three';
import { FONTS, loadFonts, makeCanvas } from '../runtime/lib/text.js';
import { TYPE, statsLabels, arrow } from './repocard.js';
import { LIB_COMMON } from './libshader.js';

export const CARD38 = { W: 320, H: 160, R: 11, S: 0.002 }; // mm; S: metres per mm (the card is 0.64 x 0.32 m)
// the tool the query went through (s36's door): the call, not a field of the return
export const TOOL = 'search_github_ai_projects';

// items[0] as a repocard spec (OTTERVALE's fields), straight from the return
export function specOf(item) {
  const [owner, repo] = item.full_name.split('/');
  return {
    owner,
    repo,
    description: item.description, // as collected from GitHub
    descriptionZh: item.description_zh,
    tags: [
      { zh: item.subcategory_name_zh, en: item.subcategory_name_en },
      { zh: item.category_name_zh, en: item.category_name_en },
    ],
    more: 0,
    stars: item.stars,
    today: item.daily_star_growth,
    heat: Math.round(item.hot_score * 10) / 10, // the site's ProjectResultCard: hot_score, one decimal
  };
}

// The fields typed over the card, copied from the return (the tool, q, min_stars, items[0]), and the
// rows under it, items[1..9] by their names.
export function fieldsOf(json) {
  return [TOOL, `q: "${json.q}"`, `min_stars: ${json.min_stars}`, 'items[0]'];
}
export const rowsOf = (json) => json.items.slice(1, 10).map((it, i) => `items[${i + 1}]  ${it.full_name}`);

// The face's type (mm): the name and the stats as repocard's TYPE; the descriptions by role and script;
// the chips' two rows; the footer. Bands: the rows of the face, top to bottom, with the nominal centre the
// seam is timed by (the same in both films: the times are the score's).
export const FACE = {
  margin: TYPE.margin,
  name: TYPE.name,
  main: { base: 47, zh: { px: 9.2, lead: 13.4 }, en: { px: 10.6, lead: 14 }, ink: 0.92, weight: { zh: 400, en: 440 } },
  second: { gap: { zh: 12.6, en: 13 }, zh: { px: 7.2, lead: 10.4 }, en: { px: 8.2, lead: 11 }, ink: { zh: 0.68, en: 0.55 } },
  chips: { ...TYPE.chips, top: 83, faint: 0.5 },
  stats: { ...TYPE.stats, base: 132 },
  rule: { y: 141, w: 0.25, ink: 0.3 },
  foot: { base: 151, px: 5.6, weight: 420, ink: 0.6 },
  bands: [
    { name: 'name', y: [10, 33], c: 22 },
    { name: 'main', y: [33, 58], c: 47 },
    { name: 'second', y: [58, 78], c: 68 },
    { name: 'tags', y: [78, 118], c: 99 },
    { name: 'stats', y: [118, 139], c: 129 },
    { name: 'footer', y: [139, 160], c: 149 },
  ],
};

const fam = (k) => `"${FONTS[k].family}"`;
const MONO = (w, px) => `${w} ${px}px ${fam('mono')}, ${fam('serif')}`;
const GARA = (w, px) => `${w} ${px}px ${fam('garamond')}`;
const SERIF = (w, px) => `${w} ${px}px ${fam('serif')}`;
const HANG = /^[，。：；、！？）」』]$/u;
const K = 10; // measuring scale, px per mm

// a text set in lines: English word by word, Chinese character by character (a Latin word does not break;
// closing punctuation hangs at the end of a line rather than start the next)
function setLines(text, script, font, px, maxW, wide) {
  const lines = [[]];
  let x = 0;
  if (script === 'en') {
    const sp = wide(font, px, ' ');
    for (const w of text.split(' ')) {
      const ww = wide(font, px, w);
      if (lines.at(-1).length && x + sp + ww > maxW) {
        lines.push([]);
        x = 0;
      }
      if (lines.at(-1).length) x += sp;
      lines.at(-1).push({ text: w, x });
      x += ww;
    }
    return lines;
  }
  const sp = wide(font, px, ' ');
  for (const [tok] of text.matchAll(/[A-Za-z0-9]+|\s+|[^A-Za-z0-9\s]/gu)) {
    if (/^\s+$/u.test(tok)) {
      if (lines.at(-1).length) x += sp;
      continue;
    }
    const tw = wide(font, px, tok);
    if (x + tw > maxW && lines.at(-1).length && !HANG.test(tok)) {
      lines.push([]);
      x = 0;
    }
    for (const ch of tok) {
      lines.at(-1).push({ text: ch, x });
      x += wide(font, px, ch);
    }
  }
  return lines;
}

// The face, laid out (mm from the card's top-left corner) for one film's language.
export async function layoutFace(spec, lang, attribution, F = FACE) {
  await loadFonts();
  const m = makeCanvas(8, 8).getContext('2d');
  const wide = (f, px, s) => {
    m.font = f(px * K);
    return m.measureText(s).width / K;
  };
  const maxW = CARD38.W - 2 * F.margin;
  const L = { spec, lang, F, bands: F.bands };

  // owner/repo
  const N = F.name;
  const fo = (px) => MONO(N.owner.weight, px);
  const fr = (px) => MONO(N.repo.weight, px);
  const owner = `${spec.owner}/`;
  const wo = wide(fo, N.px, owner);
  L.name = { base: N.base, px: N.px, parts: [
    { text: owner, x: F.margin, font: fo, ink: N.owner.ink },
    { text: spec.repo, x: F.margin + wo, font: fr, ink: N.repo.ink },
  ] };

  // the descriptions: the film's language first, the other a size down and fainter
  const other = lang === 'zh' ? 'en' : 'zh';
  const block = (script, role, base) => {
    const R = F[role];
    const px = R[script].px;
    const w = role === 'main' ? F.main.weight[script] : F.main.weight[script] - 20;
    const font = script === 'en' ? (p) => GARA(w, p) : (p) => SERIF(w, p);
    const text = script === 'en' ? spec.description : spec.descriptionZh;
    const lines = setLines(text, script, font, px, maxW, wide).map((items, i) => ({
      base: base + i * R[script].lead,
      items: items.map((it) => ({ ...it, x: F.margin + it.x })),
    }));
    return { script, role, px, font, ink: role === 'main' ? F.main.ink : F.second.ink[script], lines };
  };
  L.main = block(lang, 'main', F.main.base);
  L.second = block(other, 'second', L.main.lines.at(-1).base + F.second.gap[lang]);

  // the tags: a row in the film's language and under it, fainter, the same tags in the other (each row set
  // from the margin as the site sets its one)
  const C = F.chips;
  const fc = (px) => MONO(C.weight, px);
  let xu = F.margin;
  let xd = F.margin;
  L.chips = spec.tags.map((tag) => {
    const up = { text: tag[lang], w: wide(fc, C.px, tag[lang]) + 2 * C.pad, x: xu, y: C.top };
    const dn = { text: tag[other], w: wide(fc, C.px, tag[other]) + 2 * C.pad, x: xd, y: C.top + C.h + C.hinge };
    xu += up.w + C.col;
    xd += dn.w + C.col;
    return { up, dn };
  });
  L.chipFont = fc;

  // the stats: ★ and the stars, the growth arrow and today's growth, the flame and the heat (right)
  const S = F.stats;
  const fs = (px) => MONO(S.weight, px);
  const lab = statsLabels(spec, lang);
  const iconY = S.base - 0.36 * S.px; // icons centred on the figures' middle
  const stars = { icon: { x: F.margin, y: iconY, d: S.icon }, text: lab.stars, x: F.margin + S.icon + 1.6 };
  stars.w = wide(fs, S.px, stars.text);
  const tx = stars.x + stars.w + S.space;
  const today = { icon: { x: tx, y: iconY, d: S.icon }, text: lab.today, x: tx + S.icon + 1.8 };
  const hw = wide(fs, S.px, lab.heat);
  const heat = { text: lab.heat, x: CARD38.W - F.margin - hw, w: hw };
  heat.icon = { x: heat.x - S.icon - 1.6, y: iconY, d: S.icon };
  L.stats = { base: S.base, px: S.px, font: fs, ink: S.ink, stars, today, heat };

  // the foot: a hairline, and the return's attribution
  L.rule = { ...F.rule, x0: F.margin, x1: CARD38.W - F.margin };
  L.foot = { text: attribution, x: F.margin, base: F.foot.base, px: F.foot.px, font: (px) => MONO(F.foot.weight, px), ink: F.foot.ink };
  return L;
}

// ---------------------------------------------------------------------------------------------- drawing

// the star and the flame, drawn as repocard.js draws them (it exports only the arrow)
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

const CH = { r: (a) => `rgba(255,0,0,${a})`, g: (a) => `rgba(0,255,0,${a})`, b: (a) => `rgba(0,0,255,${a})` };
function begin(cv, ppm) {
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  c.setTransform(ppm, 0, 0, ppm, 0, 0);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  return c;
}
const chipPath = (c, x, y, w, h, r) => {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2)));
};
export const faceCanvas = (ppm) => makeCanvas(Math.round(CARD38.W * ppm), Math.round(CARD38.H * ppm));

// Mask A: dark ink (r: the name, the English, the stats, the foot), amber ink (g: the Chinese), steel ink
// (b: the chips' labels and edges). The second language and its chips at their fainter inks.
export function drawFaceA(cv, L, ppm) {
  const c = begin(cv, ppm);
  for (const p of L.name.parts) {
    c.font = p.font(L.name.px);
    c.fillStyle = CH.r(p.ink);
    c.fillText(p.text, p.x, L.name.base);
  }
  for (const B of [L.main, L.second]) {
    c.font = B.font(B.px);
    c.fillStyle = (B.script === 'en' ? CH.r : CH.g)(B.ink);
    for (const ln of B.lines) for (const it of ln.items) c.fillText(it.text, it.x, ln.base);
  }
  const C = L.F.chips;
  c.lineWidth = 0.45;
  for (const p of L.chips) {
    for (const [ch, k] of [[p.up, 1], [p.dn, C.faint]]) {
      chipPath(c, ch.x + 0.35, ch.y + 0.35, ch.w - 0.7, C.h - 0.7, C.r - 0.35);
      c.strokeStyle = CH.b(k);
      c.stroke();
      c.font = L.chipFont(C.px);
      c.fillStyle = CH.b(k);
      const tw = c.measureText(ch.text).width;
      c.fillText(ch.text, ch.x + (ch.w - tw) / 2, ch.y + C.h / 2 + 0.36 * C.px);
    }
  }
  const S = L.stats;
  c.fillStyle = CH.r(S.ink);
  c.strokeStyle = CH.r(S.ink);
  star(c, S.stars.icon.x, S.stars.icon.y - S.stars.icon.d / 2, S.stars.icon.d);
  arrow(c, S.today.icon.x, S.today.icon.y - S.today.icon.d / 2, S.today.icon.d);
  c.font = S.font(S.px);
  c.fillText(S.stars.text, S.stars.x, S.base);
  c.fillText(S.today.text, S.today.x, S.base);
  c.fillStyle = CH.r(L.rule.ink);
  c.fillRect(L.rule.x0, L.rule.y - L.rule.w / 2, L.rule.x1 - L.rule.x0, L.rule.w);
  c.font = L.foot.font(L.foot.px);
  c.fillStyle = CH.r(L.foot.ink);
  c.fillText(L.foot.text, L.foot.x, L.foot.base);
}

// Mask B: the chips' paper (r; the second language's fainter), the heat (g: the flame and the figure, lime)
export function drawFaceB(cv, L, ppm) {
  const c = begin(cv, ppm);
  const C = L.F.chips;
  for (const p of L.chips) {
    for (const [ch, k] of [[p.up, 1], [p.dn, C.faint]]) {
      chipPath(c, ch.x, ch.y, ch.w, C.h, C.r);
      c.fillStyle = CH.r(k);
      c.fill();
    }
  }
  const S = L.stats;
  c.fillStyle = CH.g(1);
  flame(c, S.heat.icon.x, S.heat.icon.y - S.heat.icon.d / 2, S.heat.icon.d);
  c.font = S.font(S.px);
  c.fillText(S.heat.text, S.heat.x, S.base);
}

// ------------------------------------------------------------------------------------------- the data

// The data in the air, lines of mono (mm in the card's frame; y down from its top edge, so the fields over
// the card are negative): the fields, the last (items[0]) just over the card's top edge and the others up
// from it; the rows under the card's foot. A plane each, box [x0, y0, x1, y1].
export const DATA = {
  fields: { px: 10.5, pitch: 18, x: 16, last: -10, weight: 470, box: [0, -80, 345, -1] },
  rows: { px: 10, pitch: 17, x: 16, first: 180, weight: 430, box: [0, 163, 430, 340] },
};

// The lines' coverage (r). Mono, so a shader finds a glyph's line and index from where it is (the lines'
// baselines, the advance) and can type a line out glyph by glyph.
export async function drawData(texts, D, ppm) {
  await loadFonts();
  const [x0, y0, x1, y1] = D.box;
  const cv = makeCanvas(Math.round((x1 - x0) * ppm), Math.round((y1 - y0) * ppm));
  const c = begin(cv, ppm);
  c.translate(-x0, -y0);
  c.font = MONO(D.weight, D.px);
  const adv = c.measureText('0').width;
  const bases = texts.map((_, j) => (D.last !== undefined ? D.last - (texts.length - 1 - j) * D.pitch : D.first + j * D.pitch));
  const lines = texts.map((text, j) => {
    const base = bases[j];
    const n = [...text].length;
    c.fillStyle = CH.r(1);
    c.fillText(text, D.x, base);
    return { text, base, n, x: D.x, adv, mid: base - 0.36 * D.px, end: D.x + n * adv };
  });
  return { canvas: cv, lines, adv };
}

// --------------------------------------------------------------------------------------------- shading

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// The card: parchment, its inks; printed where the seam has passed (above it), the ink it has just printed
// keeping the light a moment, the paper behind the seam lit by it. Its light: the printed light (the
// paper's own, × its albedo, as c_book's pages), a warm key, the reader's own light (a.light()).
const CARD_FRAG = /* glsl */ `
uniform sampler2D uFaceA, uFaceB;   // dark ink · amber ink · steel ink  |  chip paper · heat
uniform vec3 uDim;                  // W, H, corner radius (mm)
uniform vec3 uSeam;                 // the seam (mm from the top edge), its spill on the paper (light, mm)
uniform vec4 uHot;                  // just printed: the ink's light, over (mm); the paper's, over (mm)
uniform vec3 uPaper, uInkD, uInkA, uInkS, uChip;
uniform float uGlow, uHeat;
uniform vec3 uKeyPos, uKeyCol, uAgPos, uAgCol;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 q = vec2(vUv.x*uDim.x, (1.0 - vUv.y)*uDim.y);
  vec2 b = abs(q - 0.5*uDim.xy) - (0.5*uDim.xy - uDim.z);
  float sd = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - uDim.z;
  float dy = uSeam.x - q.y;
  if (sd > 0.0 || dy < 0.0) discard;
  vec3 A = texture(uFaceA, vUv).rgb;
  vec3 B = texture(uFaceB, vUv).rgb;
  float px = fwidth(q.x);
  float fine = 1.0 - smoothstep(0.08, 0.3, px);
  float tooth = 0.045*(vnoise2(q*vec2(6.2, 5.4)) - 0.5)*fine + 0.03*(vnoise2(q*vec2(1.04, 1.22) + 7.0) - 0.5);
  vec3 paper = uPaper*(1.0 + tooth);
  paper *= mix(0.86, 1.0, smoothstep(-0.05, -0.45, sd));
  vec3 alb = mix(paper, uChip, 0.85*B.r);
  alb = mix(alb, uInkD, 0.93*A.r);
  alb = mix(alb, uInkA, 0.9*A.g);
  alb = mix(alb, uInkS, 0.92*A.b);
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 E = vec3(uGlow);
  vec3 Lk = uKeyPos - vW;
  float dk = dot(Lk, Lk);
  E += uKeyCol*(max(dot(N, Lk*inversesqrt(dk)), 0.0)/(dk + 0.4));
  vec3 La = uAgPos - vW;
  float da = dot(La, La);
  E += uAgCol*(max(dot(N, La*inversesqrt(da)), 0.0)/(da + 0.04));
  vec3 c = alb*E;
  float ink = clamp(A.r + A.g + A.b, 0.0, 1.0);
  c += uLitCol*(uHot.x*ink*exp(-dy/uHot.y) + uHot.z*exp(-dy/uHot.w));
  c += uLitCol*(uSeam.y*exp(-dy/uSeam.z));
  c += uLitCol*(uHeat*B.g);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The data in the air: lime light, typed. A line runs from t0 to t1 (s), a glyph appearing hot as the
// typing passes its middle and cooling to the line's steady light.
const DATA_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec4 uBox;                  // x0, y0, x1, y1 (mm, y down)
uniform vec4 uType;                 // the lines' x, the advance, the first line's middle, the pitch (mm)
uniform vec4 uLn[10];               // per line: t0, t1, glyphs, steady light
uniform vec3 uKey;                  // the shot's time, a glyph's light when it appears, its cooling (s)
uniform float uCut;                 // coverage under which nothing is drawn
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 q = vec2(mix(uBox.x, uBox.z, vUv.x), mix(uBox.w, uBox.y, vUv.y));
  float cov = texture(uTex, vUv).r;
  if (cov < uCut) discard;
  int j = clamp(int(floor((q.y - uType.z)/uType.w + 0.5)), 0, 9);
  vec4 L = uLn[j];
  float i = floor((q.x - uType.x)/uType.y) + 0.5;
  float u = clamp((uKey.x - L.x)/max(L.y - L.x, 1e-4), 0.0, 1.0)*L.z;
  if (i > u) discard;
  float tr = L.x + i/L.z*(L.y - L.x);
  float hot = exp(-max(uKey.x - tr, 0.0)/uKey.z);
  gl_FragColor = vec4(fog(uLitCol*(cov*(L.w + uKey.y*hot)), vW), 1.0);
}`;

const mmTo = (x, y) => [(x - CARD38.W / 2) * CARD38.S, (CARD38.H / 2 - y) * CARD38.S]; // card frame (m, y up)

// The card's mesh, in the card's frame (its centre; +z its face). look: inks and light (see s38's LOOK38).
export function buildCard({ U, faceA, faceB, look }) {
  const v3 = (a) => new THREE.Vector3(...a);
  const u = {
    uFaceA: { value: faceA },
    uFaceB: { value: faceB },
    uDim: { value: v3([CARD38.W, CARD38.H, CARD38.R]) },
    uSeam: { value: v3([1e4, 0, 1]) },
    uHot: { value: new THREE.Vector4(0, 1, 0, 1) },
    uPaper: { value: v3(look.paper) },
    uInkD: { value: v3(look.inkDark) },
    uInkA: { value: v3(look.inkAmber) },
    uInkS: { value: v3(look.inkSteel) },
    uChip: { value: v3(look.chip) },
    uGlow: { value: 0 },
    uHeat: { value: 0 },
    uKeyPos: { value: new THREE.Vector3() },
    uKeyCol: { value: new THREE.Vector3() },
    uAgPos: { value: new THREE.Vector3() },
    uAgCol: { value: new THREE.Vector3() },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: { ...u, ...U }, vertexShader: VERT, fragmentShader: LIB_COMMON + CARD_FRAG });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD38.W * CARD38.S, CARD38.H * CARD38.S), mat);
  return { mesh, u };
}

// A plane of the data (DATA.fields or DATA.rows), in the card's frame, just in front of the card.
export function buildData({ U, tex, D, lines }) {
  const [x0, y0, x1, y1] = D.box;
  const u = {
    uTex: { value: tex },
    uBox: { value: new THREE.Vector4(x0, y0, x1, y1) },
    uType: { value: new THREE.Vector4(D.x, lines[0].adv, lines[0].mid, D.pitch) },
    uLn: { value: Array.from({ length: 10 }, () => new THREE.Vector4(1e3, 1e3 + 1, 1, 0)) },
    uKey: { value: new THREE.Vector3(0, 0, 0.2) },
  };
  lines.forEach((l, j) => (u.uLn.value[j].z = l.n));
  // The light. It goes in the shot's overlay, which the engine adds after the depth of field (as s09's
  // thread): the glyphs stay sharp and what is behind them is blurred as it should be. (A depth twin in the
  // scene, as agentbody's, kept the glyphs sharp too, but as windows: the sharp scene behind showed through
  // them, the far shelves' lit spines as bright dots in the strokes.)
  const geo = new THREE.PlaneGeometry((x1 - x0) * CARD38.S, (y1 - y0) * CARD38.S);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { ...u, uCut: { value: 0.002 }, ...U }, vertexShader: VERT, fragmentShader: LIB_COMMON + DATA_FRAG,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  mesh.renderOrder = 22;
  const [cx, cy] = mmTo((x0 + x1) / 2, (y0 + y1) / 2);
  mesh.position.set(cx, cy, 0.002);
  return { mesh, u };
}

// a point of the face (mm) in the card's frame (m)
export const cardPoint = (x, y, z = 0, out = new THREE.Vector3()) => out.set(...mmTo(x, y), z);
