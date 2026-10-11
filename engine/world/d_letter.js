// Agent D · the 8 o'clock letter (s27; s28 folds it into a crane): the site's daily brief on one square
// sheet, printed by the light a row at a time, and the brass tray on the balustrade at 8 o'clock that it
// lies on, with the dial's other eleven ticks.
//
// The page follows the site (frontend/src/i18n/locales, reportViewModel REPORT_TYPES): the masthead is the
// brief's own title, 每日 AI 简报 over Daily AI Brief (dashboard.editorial.digestTitle), with the date and
// 08:00; then the seven sources in the site's report order, each a chip in its river's colour (s17's
// RIVERS; GitHub lime), its name in Chinese over English as in the locales (one line where the two are
// the same), and under it the printed lines of its items: ink only, no made-up titles. GitHub's row
// lists repositories that passed s19's gate instead, in the site's form: owner/repo, ★ stars, today's
// growth.
//
// Page space: mm from the sheet's top-left corner as it lies on the tray seen from above (u right, v
// down). World: the sheet lies flat with its top edge toward the shaft's −x and its left edge toward +z
// (the picture's up and left in s27: s27 looks down with the picture's up along −x).
import * as THREE from 'three';
import { font, makeCanvas, canvasTexture, loadFonts } from '../runtime/lib/text.js';
import { hash } from '../runtime/lib/rng.js';
import { arrow } from './repocard.js';
import { MAT } from './geo.js';
import { radialBox } from './library.js';

const MM = 0.001;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------ the page

export const MASTHEAD = { zh: '每日 AI 简报', en: 'Daily AI Brief', date: '2026-10-05', time: '08:00' };
export const SOURCES = [
  { id: 'arxiv', zh: 'arXiv 论文', en: 'arXiv Papers', river: 'papers' },
  { id: 'github', zh: 'GitHub 项目', en: 'GitHub Projects', river: 'github' },
  { id: 'news', zh: '科技新闻', en: 'Tech News', river: 'news' },
  { id: 'producthunt', zh: 'Product Hunt', en: 'Product Hunt', river: 'launches' },
  { id: 'hackernews', zh: 'Hacker News', en: 'Hacker News', river: 'threads' },
  { id: 'x', zh: 'X 动态', en: 'X Board', river: 'posts' },
  { id: 'dailyhot', zh: '全网热榜', en: 'Daily Hot', river: 'hot' },
];

// Sizes in mm (px = a font's size, base = a baseline). The page is 300 mm square.
export const PAGE = {
  size: 300,
  left: 20,
  right: 280,
  head: { zh: { px: 13, base: 31 }, en: { px: 8, base: 42 }, date: { px: 5.6, base: 29 }, time: { px: 7.2, base: 41.5 }, rule: 48.5, band: [12, 51] },
  rows: { top: 54, h: 33, chip: 7, chipY: 3.4, text: 31, zh: { px: 7.6, base: 10 }, en: { px: 5.4, base: 17 }, ink: [22.5, 28], inkH: 1.5 },
  repo: { px: 4.4, base: [23.5, 29.5], star: 150, grow: 207 },
  stream: [18, 284], // the light writes each row from u0 to u1
};
// the eight printed rows, the masthead first: [v0, v1] in mm
export const PRINT_ROWS = [PAGE.head.band, ...SOURCES.map((_, k) => [PAGE.rows.top + k * PAGE.rows.h - 1.5, PAGE.rows.top + k * PAGE.rows.h + PAGE.rows.h - 1.5])];

const toSRGB = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const css = (lin) => `rgb(${lin.map((v) => Math.round(255 * toSRGB(Math.min(1, Math.max(0, v))))).join(',')})`;

// a five-pointed star in the box of its outer radius R, centred on (cx, cy), as the site's icon
function star(c, cx, cy, R) {
  const y = cy + 0.0955 * R;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.43 * R : R;
    c[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), y + r * Math.sin(a));
  }
  c.closePath();
  c.fill();
}

// one printed line: words of ink (rounded bars) from u0 up to about u0 + len, seeded (px; k px per mm)
function inkLine(c, u0, v, len, h, k, seed) {
  let u = u0;
  let j = 0;
  while (u < u0 + len - 3 * k) {
    const w = Math.min((4 + 13 * hash(seed, j) ** 1.4) * k, u0 + len - u);
    c.beginPath();
    c.roundRect(u, v - h / 2, w, h, h / 2);
    c.fill();
    u += w + (1.7 + 0.6 * hash(seed, j, 1)) * k;
    j++;
  }
}

// The page as it ends up printed, opaque (sRGB), ppm px per mm. paper, ink: linear albedos; colours:
// river name → linear RGB (a chip is drawn at half of it); repos: [{owner, repo, stars, today}] for the
// GitHub row (two are printed). Drawn in pixels (no canvas transform), so no font is ever set small.
export async function pageCanvas({ ppm = 2048 / 300, paper, ink, colours, repos }) {
  await loadFonts();
  const S = PAGE.size;
  const p = (mm) => mm * ppm;
  const cv = makeCanvas(Math.round(p(S)), Math.round(p(S)));
  const c = cv.getContext('2d');
  c.fillStyle = css(paper);
  c.fillRect(0, 0, cv.width, cv.height);
  c.textBaseline = 'alphabetic';
  const INK = css(ink);
  c.fillStyle = INK;
  c.strokeStyle = INK;

  // the masthead
  const H = PAGE.head;
  c.textAlign = 'left';
  c.font = font('serif', p(H.zh.px), 400);
  c.fillText(MASTHEAD.zh, p(PAGE.left), p(H.zh.base));
  c.font = font('garamond', p(H.en.px), 500);
  c.fillText(MASTHEAD.en, p(PAGE.left + 0.4), p(H.en.base));
  c.textAlign = 'right';
  c.font = font('mono', p(H.date.px), 500);
  c.fillText(MASTHEAD.date, p(PAGE.right), p(H.date.base));
  c.font = font('mono', p(H.time.px), 650);
  c.fillText(MASTHEAD.time, p(PAGE.right), p(H.time.base));
  c.textAlign = 'left';
  c.fillRect(p(PAGE.left), p(H.rule - 0.25), p(PAGE.right - PAGE.left), p(0.5));

  // the seven sources
  const R = PAGE.rows;
  SOURCES.forEach((src, k) => {
    const y0 = R.top + k * R.h;
    c.fillStyle = css(colours[src.river].map((v) => v * 0.5));
    c.beginPath();
    c.roundRect(p(PAGE.left), p(y0 + R.chipY), p(R.chip), p(R.chip), p(1.4));
    c.fill();
    c.fillStyle = INK;
    c.font = font('serif', p(R.zh.px), 400);
    c.fillText(src.zh, p(R.text), p(y0 + R.zh.base));
    if (src.en !== src.zh) {
      c.font = font('garamond', p(R.en.px), 500);
      c.fillText(src.en, p(R.text + 0.3), p(y0 + R.en.base));
    }
    if (src.id === 'github') {
      const P = PAGE.repo;
      repos.slice(0, 2).forEach((r, i) => {
        const b = y0 + P.base[i];
        c.font = font('mono', p(P.px), 500);
        c.fillText(`${r.owner}/${r.repo}`, p(R.text), p(b));
        const cap = 0.73 * P.px;
        star(c, p(P.star + 0.62 * cap), p(b - cap / 2), p(0.62 * cap));
        c.fillText(r.stars.toLocaleString('en-US'), p(P.star + 1.6 * cap), p(b));
        arrow(c, p(P.grow), p(b - 1.05 * cap), p(1.05 * cap), 1, p(0.42));
        c.fillText(`+${r.today.toLocaleString('en-US')}`, p(P.grow + 1.45 * cap), p(b));
      });
    } else {
      const len = 150 + 100 * hash(2700 + k);
      inkLine(c, p(R.text), p(y0 + R.ink[0]), p(len), p(R.inkH), ppm, 2710 + k);
      inkLine(c, p(R.text), p(y0 + R.ink[1]), p(len * (0.45 + 0.4 * hash(2720 + k))), p(R.inkH), ppm, 2730 + k);
    }
  });
  return cv;
}

// ------------------------------------------------------------------------------------------- shaders

export const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// The sheet (after LIB_COMMON): blank paper until the light writes it. A row is written from left to
// right in uRows[i].w s from uRows[i].z: the stream's head is a short bar of lime light across the row;
// what it has written glows lime and cools in uHot.y s. The ink is there, dark, from the moment it is
// written, and the glow is the words blurred (about 2 mm), so it lights the paper round the ink as much
// as the ink and the ink stays darker than the paper at every age. (Glowing on the ink alone, the ink
// crossed the paper's brightness as it cooled and the row was gone for a moment.) Lit like the cards
// (the lamps, the sheet and its afterglow, the lantern, the air).
export const PAPER_FRAG = /* glsl */ `
uniform sampler2D uPage;
uniform vec3 uPaper;
uniform float uShot;
uniform vec4 uRows[8];           // v0, v1 (page, 0 at the top), t0, duration (s)
uniform vec2 uSpan;              // the stream runs from u0 to u1 (page)
uniform vec2 uSize;              // the sheet (m)
uniform vec3 uHot;               // the written ink's glow, its time to 1/e (s), the head's light
uniform float uTrans;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 q = vec2(vUv.x, 1.0 - vUv.y);
  vec3 tex = texture(uPage, vUv).rgb;
  float t0 = -1e3; float dur = 1.0; float v0 = 0.0; float v1 = 0.0;
  for (int i = 0; i < 8; i++){
    vec4 r = uRows[i];
    if (q.y >= r.x && q.y < r.y){ t0 = r.z; dur = r.w; v0 = r.x; v1 = r.y; }
  }
  float s = clamp((q.x - uSpan.x)/(uSpan.y - uSpan.x), 0.0, 1.0);
  float tr = t0 + s*dur;                                   // when the stream reaches this column
  float rev = smoothstep(tr - 0.006, tr + 0.006, uShot);
  // the glow's ink: the page blurred over about 2 mm, or over the pixel when that is bigger
  float tpx = float(textureSize(uPage, 0).x);
  float lod = max(log2(max(max(fwidth(vUv.x), fwidth(vUv.y))*tpx, 1.0)) + 0.5, 3.5);
  float d = exp2(lod)/tpx;
  vec3 tb = 0.25*(textureLod(uPage, vUv + vec2(d, 0.4*d), lod).rgb + textureLod(uPage, vUv - vec2(d, 0.4*d), lod).rgb
                + textureLod(uPage, vUv + vec2(-0.4*d, d), lod).rgb + textureLod(uPage, vUv - vec2(-0.4*d, d), lod).rgb);
  float cov = clamp(1.0 - dot(tb, vec3(0.2126, 0.7152, 0.0722))/dot(uPaper, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);

  vec2 m = (q - 0.5)*uSize;                                // m from the centre
  float px = max(fwidth(m.x), fwidth(m.y));
  float fine = 1.0 - smoothstep(0.00015, 0.0005, px);
  float tooth = 0.05*(vnoise2(m*vec2(3100.0, 2700.0)) - 0.5)*fine + 0.035*(vnoise2(m*vec2(520.0, 610.0) + 7.0) - 0.5);
  vec2 e = 0.5*uSize - abs(m);
  float edge = mix(0.88, 1.0, smoothstep(0.0, 0.0012, min(e.x, e.y)));
  vec3 alb = mix(uPaper, tex, rev)*(1.0 + tooth)*edge;

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  float k = floor((vW.y + 1e-3)/uH);
  vec4 st = floorState(k);
  Surf sf; sf.P = vW; sf.N = N; sf.V = V; sf.albedo = alb; sf.f0 = vec3(0.035); sf.rough = 0.62; sf.ao = 1.0; sf.wrap = 0.3;
  vec3 c = lampLight(sf, k, st) + beamLight(sf) + lanternFill(sf) + uAmb*alb*20.0;
  Surf b = sf; b.N = -N; b.albedo = vec3(1.0); b.f0 = vec3(0.0);
  c += alb*uTrans*(lampLight(b, k, st) + beamLight(b) + lanternFill(b));

  // the light writing
  float age = uShot - tr;
  float hot = age > 0.0 ? exp(-age/uHot.y) : 0.0;
  float head = 0.0;
  float sf0 = (uShot - t0)/dur;
  if (sf0 > -0.02 && sf0 < 1.02){
    float uf = uSpan.x + clamp(sf0, 0.0, 1.0)*(uSpan.y - uSpan.x);
    float dx = (q.x - uf)*uSize.x/0.0016;
    float dv = min(q.y - v0, v1 - q.y)*uSize.y;
    head = exp(-dx*dx)*smoothstep(0.0, 0.004, dv)*smoothstep(-0.02, 0.03, sf0)*smoothstep(1.02, 0.97, sf0);
  }
  c += uLitCol*(uHot.x*cov*hot*rev + uHot.z*head);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The tray's top: brass, the hour line and 08:00 cut into it and filled with a lime phosphor that gives
// the sheet back where it falls (the lintel's ★ 500 in s19, lit through), the sheet of paper's shadow
// where it lies.
export const PLATE_FRAG = /* glsl */ `
uniform sampler2D uMark;
uniform vec4 uLet;               // the sheet on the tray: world x0, z0, x1, z1
uniform float uPhos, uEnv;
uniform vec2 uShade;             // the sheet's shadow: its depth, its reach (m); 0 once the sheet has risen
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float m = texture(uMark, vUv).r;
  float k = floor((vW.y + 1e-3)/uH);
  vec4 st = floorState(k);
  float px = max(length(dFdx(vW)), length(dFdy(vW)));
  float brush = mix(vnoise2(vec2(vW.z*9.0, vW.x*900.0)), 0.5, smoothstep(0.0004, 0.002, px));
  vec3 f0 = vec3(0.78, 0.55, 0.26)*(0.75 + 0.35*vnoise2(vW.xz*7.0 + vW.yy*3.0))*(0.92 + 0.16*brush);
  Surf s; s.P = vW; s.N = N; s.V = V; s.albedo = vec3(0.0); s.f0 = f0*(1.0 - 0.8*m); s.rough = mix(0.34, 0.8, m); s.ao = 1.0; s.wrap = 0.0;
  vec3 c = lampLight(s, k, st) + beamLight(s) + lanternFill(s) + s.f0*lampRGB(st)*uEnv;
  c += uLitCol*(uPhos*m*sweep(vW));
  vec2 cen = 0.5*(uLet.xy + uLet.zw);
  vec2 hs = 0.5*(uLet.zw - uLet.xy);
  vec2 d = abs(vW.xz - cen) - hs;
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  c *= 1.0 - uShade.x*exp(-max(sd, 0.0)/uShade.y);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// ------------------------------------------------------------------------------ the tray and the dial

// The tray at 8 o'clock (bearing 90°, the middle of side 1): the dial's face for this hour, a brass plate
// on the balustrade's rail (its top at 1.09 m, flat from 12.04 to 12.38 m out), reaching over the shaft
// on two webs; world box (m, heights above the floor). The hour line runs across it at x = 0; the sheet
// lies on the side the light has passed (x > 0) with 08:00 beside it; the side still to come (x < 0) is
// bare brass, dark from above (s27 keeps the card's band there).
export const TRAY = { x: [-0.3, 0.34], z: [11.72, 12.4], y: [1.09, 1.102], webs: [[-0.17, -0.13], [0.13, 0.17]], web: { z: [11.78, 12.0], y: [0.97, 1.09] } };
export const SHEET = { x0: 0.02, z1: 12.37, lift: 0.0012 }; // its top edge (x) and left edge (z); above the tray
export const SHEET_SIZE = PAGE.size * MM;
// world centre of the sheet (heights above the floor)
export const sheetCentre = (out = new THREE.Vector3()) => out.set(SHEET.x0 + SHEET_SIZE / 2, TRAY.y[1] + SHEET.lift, SHEET.z1 - SHEET_SIZE / 2);
// the tray's and the sheet's frame: local x → world −z (the picture's right in s27), y → −x (up), z → +y
export const FLAT = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));
// the engraving on the tray's top (canvas: the tray as seen from above, its top toward −x)
export const MARK = { ppm: 3, line: 2.5, cap: 24, timeX: [0.014, 0.038], timeZ: 12.0 };

export async function trayMark() {
  await loadFonts();
  const W = (TRAY.z[1] - TRAY.z[0]) * 1000 * MARK.ppm;
  const H = (TRAY.x[1] - TRAY.x[0]) * 1000 * MARK.ppm;
  const cv = makeCanvas(W, H);
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#fff';
  const X = (z) => ((TRAY.z[1] - z) / (TRAY.z[1] - TRAY.z[0])) * cv.width; // world z → canvas x
  const Y = (x) => ((x - TRAY.x[0]) / (TRAY.x[1] - TRAY.x[0])) * cv.height; // world x → canvas y
  const p = MARK.ppm;
  // the hour line, from the sheet's left edge to the tray's end over the shaft, on the sheet's bearing
  c.fillRect(X(12.385), Y(0) - (MARK.line * p) / 2, X(11.735) - X(12.385), MARK.line * p);
  // 08:00, its foot on the line's lower side
  c.font = font('mono', 100, 600);
  const capR = c.measureText('0123456789').actualBoundingBoxAscent / 100;
  c.font = font('mono', (MARK.cap * p) / capR, 600);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.fillText(MASTHEAD.time, X(MARK.timeZ), Y(MARK.timeX[1]));
  // a fine border, 8 mm in
  c.strokeStyle = '#fff';
  c.lineWidth = 1.2 * p;
  c.strokeRect(8 * p, 8 * p, cv.width - 16 * p, cv.height - 16 * p);
  return cv;
}

// The tray's body and web, and the dial's eleven other ticks (5 o'clock at bearing 0, a tick every
// 30°: brass inlays across the rail's top at the middles of the sides, brass strips on the pillars'
// faces at the corners), into a Builder in world metres above the floor (its transform sets the floor).
export function buildDial(b) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (x, y, z, mat, faces) => b.box(V((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2), V(x[1] - x[0], y[1] - y[0], z[1] - z[0]), mat, 0, faces);
  box(TRAY.x, TRAY.y, TRAY.z, MAT.BRASS, ['+x', '-x', '-y', '+z', '-z']);
  for (const x of TRAY.webs) box(x, TRAY.web.y, TRAY.web.z, MAT.BRASS);
  for (let h = 0; h < 12; h++) {
    const deg = h * 30;
    if (deg === 90) continue; // 8 o'clock: the tray
    const a = deg * DEG;
    if (h % 2) radialBox(b, a, 12.07, 12.35, 1.09, 0.003, 0.045, MAT.BRASS, ['+x', '-x', '+y', '+z', '-z']);
    else radialBox(b, a, 13.66, 13.672, 0.86, 0.28, 0.05, MAT.BRASS, ['-x', '+y', '-y', '+z', '-z']);
  }
}

// hours on the dial: the sheet's bearing (rad) for an hour (5 o'clock at 0, clockwise from above)
export const hourBearing = (h) => (((h - 5) * 30 + 360) % 360) * DEG;

// Placed meshes for the sheet and the tray's top (y0: the floor's world height). U: the library's
// uniforms; page: the printed page's canvas; mark: the tray's engraving.
export function letterMeshes({ U, y0, page, mark, LIB_COMMON, paper }) {
  const pageTex = canvasTexture(page, { srgb: true, mipmaps: true, anisotropy: 16 });
  const rows = PRINT_ROWS.map(([v0, v1]) => new THREE.Vector4(v0 / PAGE.size, v1 / PAGE.size, 1e3, 0.32));
  const own = {
    uPage: { value: pageTex },
    uPaper: { value: new THREE.Color(...paper) },
    uShot: { value: 0 },
    uRows: { value: rows },
    uSpan: { value: new THREE.Vector2(PAGE.stream[0] / PAGE.size, PAGE.stream[1] / PAGE.size) },
    uSize: { value: new THREE.Vector2(SHEET_SIZE, SHEET_SIZE) },
    uHot: { value: new THREE.Vector3(3.0, 0.45, 2.5) },
    uTrans: { value: 0.2 },
  };
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(SHEET_SIZE, SHEET_SIZE),
    // 1.2 mm over the brass is below the depth buffer's step at a few metres here: pulled forward a few
    // steps so the brass never shows through it
    new THREE.ShaderMaterial({
      uniforms: { ...own, ...U },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + PAPER_FRAG,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    }),
  );
  sheet.matrixAutoUpdate = false;
  sheet.matrix.copy(FLAT).setPosition(sheetCentre().add(new THREE.Vector3(0, y0, 0)));
  const tw = TRAY.z[1] - TRAY.z[0];
  const th = TRAY.x[1] - TRAY.x[0];
  const trayU = {
    uMark: { value: canvasTexture(mark, { srgb: false, mipmaps: true, anisotropy: 16 }) },
    uLet: { value: new THREE.Vector4(SHEET.x0, SHEET.z1 - SHEET_SIZE, SHEET.x0 + SHEET_SIZE, SHEET.z1) },
    uPhos: { value: 2.0 },
    uEnv: { value: 0.004 },
    uShade: { value: new THREE.Vector2(0.6, 0.0022) },
  };
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(tw, th),
    new THREE.ShaderMaterial({ uniforms: { ...trayU, ...U }, vertexShader: VERT, fragmentShader: LIB_COMMON + PLATE_FRAG }),
  );
  top.matrixAutoUpdate = false;
  top.matrix.copy(FLAT).setPosition((TRAY.x[0] + TRAY.x[1]) / 2, y0 + TRAY.y[1], (TRAY.z[0] + TRAY.z[1]) / 2);
  return { sheet, top, uniforms: own, trayUniforms: trayU };
}
