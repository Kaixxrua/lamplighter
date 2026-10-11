// s18 · 1:03–1:07 · 炼字 (global 1512–1607)
// The site's AI enrichment, close up: a repository becomes a card of the project library. We cut inside
// the lantern, close on one of the GitHub pages the sheet took in s17 — ottervale/mcp-server, the first
// repository the machine printed in s08 — as it passes through the glazing, set as the site's project
// card. It slides in through the glass at a scanner's even pace, and where glass and card cross runs a
// line of lime light, the scan line, reading it from left to right. Ahead of it, outside, behind the
// glass, the card is as it was collected: the name, the English description, ★ 2,431 stars, on paper
// gone a little brown. Behind it, inside, the paper is clean, the ink it has read keeps the light a
// moment, and the AI's work grows: the Chinese description, character by character out of its foot,
// written hot and cooling to amber ink; the tags in pairs, Chinese above and English below, each pair
// a bud of lime on its hinge out of which two leaves grow, tilted off the card, and lie down, born lit
// and cooling to steel, their labels coming up as they settle; today's growth printed in ink; and last,
// in the bottom right corner, the heat engraved in lime, the one thing here that may burn out. Then the
// sheet comes round (it turns once in the shot, from 180° at the cut): its light runs over the
// galleries behind the card, crosses the card, and the card and the glass flash.
// First frame: close on the card's top left, the name and the English as collected, behind the glass,
// the seam at the card's left edge. Last frame: the whole card inside the glass, refined, the heat
// glowing, in the sheet's afterglow.
// Camera: rides with the card, which holds still in the picture while the glass crosses it; square on
// to the card but a few degrees off, 50 mm, f/8; close on the name at first, it pulls back to the whole
// card as the seam crosses, a glide.
// Light: the lantern's lamp, from above and behind the camera; the seam; the sheet once; the library's
// lamps, low, through the glass.
// Interface: the stats follow the site's locales (zh 今日 +312 · 热度 87.4, en +312 today · Heat 87.4),
// the only thing that differs between the two languages.
// Sound: see CUES (s into the shot; global frame = 1512 + 24 t).
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { clamp, smoothstep, track } from 'film/lib/ease.js';
import { canvasTexture } from 'film/lib/text.js';
import { LIB_COMMON } from 'world/libshader.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH } from 'world/lighthouse.js';
import { CARD, OTTERVALE, layoutCard, faceCanvas, drawStatic, drawRefined, chipCanvas } from 'world/repocard.js';
import { sweepAngle, Y0, FLOOR } from './s13.js';
import { LOOK, sheetAt } from './s14.js';
import { LOOK17 } from './s17.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const MM = 0.001;
const T0 = 28; // the sweep's clock at the first frame: the sheet points at 180°
const END = meta.frames / 24;

// The lantern's panes (lighthouse.js, buildLantern): two families of 14 helical astragals, turning ±60°
// from the sill (0.96 m above the deck) to the head (4.24 m), cross in diamonds, widest on the rows
// where the families meet. The card passes through the middle of one, on the row 2.01 m up.
const PANE = (() => {
  const tw = 60 * DEG;
  const n = 14;
  const u = (TAU / n + Math.PI / n) / (2 * tw); // the second row of crossings
  return { h: 0.96 + (4.24 - 0.96) * u, bearing: (i) => (i * TAU) / n + tw * u + Math.PI / n };
})();

// The slot: the vertical line where card and glazing cross, in the middle of pane 2 (bearing 83.6°). The
// card stands at `angle` to the glazing, so the camera, square on to the card, looks out through the
// glass at that angle (and the sheet comes round to the card at 2.9 s).
export const SLOT = { pane: 2, angle: 28 * DEG };
const SB = PANE.bearing(SLOT.pane);
const ER = new THREE.Vector3(Math.cos(SB), 0, Math.sin(SB)); // out of the lantern
const ET = new THREE.Vector3(-Math.sin(SB), 0, Math.cos(SB)); // along the glazing, bearing increasing
const EY = new THREE.Vector3(0, 1, 0);
const EU = ET.clone().multiplyScalar(Math.cos(SLOT.angle)).addScaledVector(ER, Math.sin(SLOT.angle)); // the card's x: right, and out
const EN = ER.clone().multiplyScalar(-Math.cos(SLOT.angle)).addScaledVector(ET, Math.sin(SLOT.angle)); // its face: in, to the camera
const SLOT0 = new THREE.Vector3(ER.x * LH.GLASS_R, Y0 + PANE.h, ER.z * LH.GLASS_R); // the slot at the card's middle height
const QCARD = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(EU, EY, EN));

// The card slides in along −x at a scanner's even pace, then settles inside: its centre is −seamX(t)
// out along x from the slot, and the seam (the glass across the card) is at card x = seamX(t).
export const SCAN = { c0: (CARD.W / 2) * MM + 0.012, v: 0.136, settle: 2.5, tau: 0.25 };
const slid = (t) => (t <= SCAN.settle ? SCAN.v * t : SCAN.v * (SCAN.settle + SCAN.tau * (1 - Math.exp(-(t - SCAN.settle) / SCAN.tau))));
export const seamX = (t) => slid(t) - SCAN.c0;
export const seamAt = (x) => (x + SCAN.c0) / SCAN.v; // when the seam reaches card x (m from the centre)
const cardPos = (t, out) => out.copy(SLOT0).addScaledVector(EU, -seamX(t));
const cx = (mm) => (mm - CARD.W / 2) * MM; // card x (m) of a layout x (mm from the left edge)
const cy = (mm) => (CARD.H / 2 - mm) * MM; // card y (m, up) of a layout y (mm from the top edge)

// What the light writes, once the seam has passed:
export const GROW = {
  read: { light: 1.4, len: 0.018 }, // the ink it has read keeps the light, fading over len (m) behind the seam
  zh: { lag: 0.06, dur: 0.3, hot: 0.9, at: 0.008, len: 0.035 }, // a character grows from its foot; hot from `at` behind the seam, cooling over len (m)
  today: { lag: 0.012, edge: 0.004 }, // printed this far behind the seam (m), soft over edge
  bud: { light: 2.4, r: 0.0011, halo: 0.0045, fade: 0.35 }, // a pair's bud on its hinge: lit as the seam passes, fading as the leaves grow
  chip: { lag: 0.1, grow: 0.6, tilt: 50 * DEG, hot: 1.1, cool: 0.3, ink: [0.45, 0.9] }, // the two leaves grow out of it, tilted off the card, and lie down; born lime, cooling to steel; their labels come up as they settle (share of grow)
  more: { lag: 0.12, pop: 0.32 },
  heat: { lag: 0.05, glow: 1.7, front: 6, flare: 1.8, fade: 0.45 }, // engraved behind the seam: steady glow, the cutting front, the sheet's flare
};

// Light (linear): the lamp, a little lime; a faint fill from the glass and the brass around; how hard
// the sheet hits the card; the seam's core and spill (m across, along the card).
export const LOOK18 = {
  key: [1.0, 0.93, 0.78],
  keyI: 1.5,
  fill: 0.012,
  sheet: 0.08,
  seam: { core: 2.2, w: 0.0011, spill: 0.12, ws: 0.012 },
  glass: { core: 1.6, w: 0.0016, halo: 0.25, wh: 0.007, along: 0.03 },
  seeds: { light: 2.2, reach: 0.025, rate: 48, burst: 1.1 },
  paper: [0.8, 0.755, 0.68], // parchment, the site's #F7F5EE, as albedo (warmer: act II's grade tints highlights lime)
  raw: [0.6, 0.5, 0.36], // the collected page, browned
  amberInk: [0.42, 0.14, 0.012],
  amberHot: [0.807, 0.366, 0.047], // amber #E8A33D
  chipPaper: [0.74, 0.75, 0.76],
  steelInk: [0.11, 0.2, 0.34], // steel #6F8FB3, as ink
  lamp: LOOK17.lamp, // the library's lamps, low, as in s17
  vol: 0.5, // the sheet in the air: we look along it from inside the lantern, so less of it
};

// The camera rides with the card: in card space where it looks (x, y) and from how far (m); it sits a
// few degrees right of and above square.
export const CAM = {
  lens: 50,
  fstop: 8,
  yaw: 3.2 * DEG,
  pitch: 2.4 * DEG,
  keys: [
    [0, [-0.05, 0.03, 0.27]],
    [0.35, [-0.049, 0.0295, 0.275]],
    [2.6, [0.0, 0.0, 0.5], 'glide'],
    [END, [0.0, -0.001, 0.56], 'outSine'],
  ],
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

// the lamp, a faint fill and the sheet with its afterglow (radial from the axis)
const LIGHT = /* glsl */ `
uniform vec3 uKey, uKeyPos, uFill; uniform float uSheetK;
vec3 light18(vec3 P, vec3 N){
  vec3 Ld = uKeyPos - P;
  float d2 = dot(Ld, Ld);
  vec3 E = uKey*(max(dot(N, Ld*inversesqrt(d2)), 0.0)/(d2 + 0.4)) + uFill;
  if (uBeamI > 0.0){
    vec2 r = P.xz - uBeamO.xz;
    vec3 dir = vec3(r.x, 0.0, r.y)/max(length(r), 1e-3);
    E += uBeamCol*(uBeamI*uSheetK*sweep(P))*max(dot(N, -dir), 0.0);
  }
  return E;
}`;

const CARD_FRAG = /* glsl */ `
uniform sampler2D uFace, uRef;   // raw ink · heat glyphs · heat blurred  |  Chinese · its characters' centres · today's growth
uniform vec2 uSize; uniform float uRad, uShot, uSeam;
uniform vec4 uScan;              // c0, v, the characters' lag (s), their growing time (s)
uniform vec4 uZh;                // the feet of the two Chinese lines (card y), their height, the y between them
uniform vec4 uSeamL;             // core, core width, spill share, spill width
uniform vec2 uRead;              // light, length
uniform vec3 uHot;               // light, from (m behind the seam), length
uniform vec2 uToday;             // lag (m), edge
uniform vec4 uHeat;              // the cutting front (card x), steady glow, front glow, -
uniform vec4 uBud[4];            // the tags' buds: card x, y, -, light
uniform vec2 uBudR;              // their core and halo radii (m)
uniform vec3 uPaper, uRaw, uAmberInk, uAmberHot;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec2 q = (vUv - 0.5)*uSize;                 // card space (m), y up
  vec2 b = abs(q) - (0.5*uSize - uRad);
  float sd = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - uRad;
  if (sd > 0.0) discard;
  vec3 F = texture(uFace, vUv).rgb;
  vec3 R = texture(uRef, vUv).rgb;
  float dx = uSeam - q.x;                      // how far behind the seam (m); negative ahead of it
  float inside = smoothstep(-0.0004, 0.0004, dx);

  // paper: clean parchment inside; outside, browned and foxed as it was collected
  float px = fwidth(q.x);
  float fine = 1.0 - smoothstep(0.00015, 0.0005, px);
  float tooth = 0.05*(vnoise2(q*vec2(3100.0, 2700.0)) - 0.5)*fine + 0.035*(vnoise2(q*vec2(520.0, 610.0) + 7.0) - 0.5);
  float tone = 0.3*smoothstep(-0.014, 0.0, sd) + 0.2*vnoise2(q*vec2(11.0, 13.0));                   // browner at the edges, unevenly
  float spot = smoothstep(0.84, 0.92, vnoise2(q*vec2(260.0, 290.0) + 3.0));                          // foxing
  vec3 raw = uRaw*(1.0 - tone*vec3(0.12, 0.24, 0.42) - spot*vec3(0.06, 0.14, 0.22));
  vec3 paper = mix(raw, uPaper, inside)*(1.0 + tooth);
  paper *= mix(0.86, 1.0, smoothstep(-0.0001, -0.0009, sd));   // the cut edge

  // the Chinese: a character grows out of its foot once the seam is past its centre
  float ccx = R.g*uSize.x - 0.5*uSize.x;
  float p = clamp((uShot - (ccx + uScan.x)/uScan.y - uScan.z)/uScan.w, 0.0, 1.0);
  float foot = q.y > uZh.w ? uZh.x : uZh.y;
  float zh = R.r*smoothstep(-0.0003, 0.0003, foot + (1.0 - pow(1.0 - p, 3.0))*uZh.z - q.y)*smoothstep(0.0, 0.35, p);
  // today's growth, printed just behind the seam
  float today = R.b*smoothstep(-uToday.y, uToday.y, dx - uToday.x);
  // the heat, engraved where the cutting front has passed: lime light in the groove, its lip in shadow
  float fx = uHeat.x - q.x;
  float cut = smoothstep(-0.0003, 0.0003, fx);
  float glyph = F.g*cut;
  float lip = clamp(F.b - F.g, 0.0, 1.0)*cut;

  vec3 alb = paper*(1.0 - 0.93*clamp(F.r + today, 0.0, 1.0));
  alb = mix(alb, uAmberInk, 0.9*zh);
  alb *= (1.0 - 0.45*lip)*(1.0 - 0.7*glyph);

  vec3 N = normalize(vN);
  vec3 c = alb*light18(vW, N);

  // the seam: the glass's light where it crosses the card
  float s2 = q.x - uSeam; s2 *= s2;
  c += uLitCol*(uSeamL.x*(exp(-s2/(uSeamL.y*uSeamL.y)) + uSeamL.z*exp(-s2/(uSeamL.w*uSeamL.w))));
  // the ink it has read keeps the light a moment
  c += uLitCol*(uRead.x*F.r*step(0.0, dx)*exp(-max(dx, 0.0)/uRead.y));
  // the Chinese, written hot and cooling to amber ink
  c += uAmberHot*(uHot.x*zh*exp(-max(dx - uHot.y, 0.0)/uHot.z));
  // the buds the tags grow from
  for (int i = 0; i < 4; i++){
    vec2 e = q - uBud[i].xy;
    float d2 = dot(e, e);
    c += uLitCol*(uBud[i].w*(exp(-d2/(uBudR.x*uBudR.x)) + 0.25*exp(-d2/(uBudR.y*uBudR.y))));
  }
  // the heat: the groove full of lime, hottest at the cutting front
  c += uLitCol*(glyph*(uHeat.y*smoothstep(0.0, 0.012, fx) + uHeat.z*exp(-fx*fx/0.00001)));

  // outside, seen through the old glass: dimmer, a touch green, under the faint reflection of the lantern
  c = mix(c*vec3(0.6, 0.64, 0.61) + vec3(0.011, 0.012, 0.009), c, inside);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// a tag's leaf: chip paper, its label and edge in steel ink; the back is plain
const CHIP_FRAG = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uChip, uSteel; uniform float uLeafHot, uInk;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  vec3 m = texture(uTex, vUv).rgb;
  if (m.g < 0.5) discard;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float ink = gl_FrontFacing ? clamp(m.r + m.b, 0.0, 1.0)*uInk : 0.0;
  vec3 alb = mix(uChip, uSteel, 0.92*ink);
  vec3 c = alb*light18(vW, N) + uLitCol*(uLeafHot*(1.0 - 0.9*ink));   // born a lit panel, its label dark on it
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The glazing at the slot (added over the lantern's own glass): the seam's light carried a little way
// into the glass beyond the card's top and bottom edges, and the seeds of the old glass, bubbles a
// fraction of a millimetre across, catching it near the seam and twinkling, all of them at once as the
// sheet crosses the pane.
const GLASS_FRAG = /* glsl */ `
uniform vec4 uSlot;    // bearing, the card's bottom and top (world y), its presence in the slot
uniform vec4 uGlass;   // core, core width, halo, halo width
uniform vec4 uSeeds;   // light, reach (m), re-rolls a second, the sheet's burst
uniform float uAlong, uShot;
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){
  float a = atan(vW.z, vW.x);
  float s = (mod(a - uSlot.x + PI, TAU) - PI)*length(vW.xz);   // along the glazing from the slot (m)
  float dy = max(max(uSlot.y - vW.y, vW.y - uSlot.z), 0.0);
  float along = exp(-dy/uAlong);
  vec3 c = uLitCol*(uSlot.w*along*(uGlass.x*exp(-s*s/(uGlass.y*uGlass.y)) + uGlass.z*exp(-s*s/(uGlass.w*uGlass.w))));
  vec2 g = vec2(s, vW.y)/0.006;
  vec2 id = floor(g);
  float h = hash12(id + 31.7);
  if (h < 0.45){
    vec2 o = vec2(hash12(id + 7.1), hash12(id + 3.3))*0.7 + 0.15;
    float r = mix(0.035, 0.085, hash12(id + 1.9));
    float disc = smoothstep(r, 0.35*r, length(fract(g) - o));
    float near = exp(-abs(s)/uSeeds.y)*along*uSlot.w;
    float flick = hash12(id + floor(uShot*uSeeds.z)*vec2(1.37, 2.91));
    c += uLitCol*(disc*(uSeeds.x*near*flick*flick*flick + uSeeds.w*(0.25 + 0.75*hash12(id + 5.5))));
  }
  gl_FragColor = vec4(c*exp(-uFogD*distance(vW, cameraPosition)), 1.0);
}`;

// ------------------------------------------------------------------------------------------- timing

// when the sheet crosses bearing b, after t0 (s into the shot)
function sheetAt18(b, t0 = 0) {
  for (let t = t0; t < END + 4; t += 0.002) {
    const d = (((sweepAngle(T0 + t) - b) % TAU) + TAU) % TAU;
    if (d < 0.004 || d > TAU - 0.004) return t;
  }
  return Infinity;
}
const _p = new THREE.Vector3();
// the sheet crosses the card's centre (which moves a little as the card slides in)
export const SHEET_T = (() => {
  let t = 2.9;
  for (let i = 0; i < 4; i++) {
    cardPos(t, _p);
    t = sheetAt18(Math.atan2(_p.z, _p.x), 1);
  }
  return t;
})();

// The tag pairs, timed by the seam (needs the layout): where, when the seam passes the bud, and when
// the leaves start to grow (once it has read the whole of the wider one, so that none grows through the glass).
function pairTimes(L) {
  return L.chips.map((pr) => {
    const x = cx(pr.x);
    return { x, y: cy(pr.hinge), seam: seamAt(x), t: seamAt(x + (Math.max(pr.zh.w, pr.en.w) / 2) * MM) + GROW.chip.lag };
  });
}
// a bud's light, dt after its leaves start to grow: lit from when the seam passed it, fading as they grow
const budAt = (dt, lead) => GROW.bud.light * (dt < 0 ? smoothstep(-lead, 0, dt) : Math.exp(-dt / GROW.bud.fade));

// ------------------------------------------------------------------------------------------- setup

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 600);
  const lib = new Library({ floors: [FLOOR - 8, FLOOR + 8], near: 2, mid: 8, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: LOOK18.lamp }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);

  // the card's face: what it was collected with, and what the light will write
  const L = await layoutCard(OTTERVALE, ctx.lang);
  const near = 2 * CAM.keys[0][1][2] * Math.tan(Math.atan(18 / CAM.lens)); // the picture's width at the card, first frame
  const ppm = Math.min(ctx.renderer.capabilities.maxTextureSize / CARD.W, Math.max(2, (1.08 * ctx.width) / (near / MM)));
  const tex = (draw) => {
    const cv = faceCanvas(ppm);
    draw(cv, L, ppm);
    return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 });
  };
  const own = {
    uKey: { value: new THREE.Color(...LOOK18.key).multiplyScalar(LOOK18.keyI) },
    uKeyPos: { value: new THREE.Vector3(0, Y0 + LH.LAMP_Y, 0) },
    uFill: { value: new THREE.Color(LOOK18.fill, LOOK18.fill, LOOK18.fill) },
    uSheetK: { value: LOOK18.sheet },
    uShot: { value: 0 },
  };
  const zh = L.zh;
  const lines = [...new Set(zh.chars.map((c) => c.base))];
  const foot = (base) => cy(base + zh.desc);
  const cardU = {
    ...own,
    uFace: { value: tex(drawStatic) },
    uRef: { value: tex(drawRefined) },
    uSize: { value: new THREE.Vector2(CARD.W * MM, CARD.H * MM) },
    uRad: { value: CARD.R * MM },
    uSeam: { value: 0 },
    uScan: { value: new THREE.Vector4(SCAN.c0, SCAN.v, GROW.zh.lag, GROW.zh.dur) },
    uZh: { value: new THREE.Vector4(foot(lines[0]), foot(lines[1] ?? lines[0]), (zh.asc + zh.desc) * MM, cy((lines[0] + (lines[1] ?? lines[0] + 20) - zh.asc + zh.desc) / 2)) },
    uSeamL: { value: new THREE.Vector4(LOOK18.seam.core, LOOK18.seam.w, LOOK18.seam.spill, LOOK18.seam.ws) },
    uRead: { value: new THREE.Vector2(GROW.read.light, GROW.read.len) },
    uHot: { value: new THREE.Vector3(GROW.zh.hot, GROW.zh.at, GROW.zh.len) },
    uToday: { value: new THREE.Vector2(GROW.today.lag, GROW.today.edge) },
    uHeat: { value: new THREE.Vector4(-1, 0, 0, 0) },
    uBud: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
    uBudR: { value: new THREE.Vector2(GROW.bud.r, GROW.bud.halo) },
    uPaper: { value: new THREE.Color(...LOOK18.paper) },
    uRaw: { value: new THREE.Color(...LOOK18.raw) },
    uAmberInk: { value: new THREE.Color(...LOOK18.amberInk) },
    uAmberHot: { value: new THREE.Color(...LOOK18.amberHot) },
  };
  const card = new THREE.Group();
  scene.add(card);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD.W * MM, CARD.H * MM, 8, 6),
    new THREE.ShaderMaterial({
      uniforms: { ...cardU, ...U },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + LIGHT + CARD_FRAG,
    }),
  );
  card.add(face);

  // the tags: a pair of leaves each, hinged on a line between the Chinese chip (above) and the English
  const chipMat = (cv) =>
    new THREE.ShaderMaterial({
      uniforms: {
        ...own,
        uTex: { value: canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 }) },
        uChip: { value: new THREE.Color(...LOOK18.chipPaper) },
        uSteel: { value: new THREE.Color(...LOOK18.steelInk) },
        uLeafHot: { value: 0 },
        uInk: { value: 1 },
        ...U,
      },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + LIGHT + CHIP_FRAG,
      side: THREE.DoubleSide,
    });
  const leaf = (text, w, h, up, gap) => {
    const g = new THREE.PlaneGeometry(w * MM, h * MM, 2, 1);
    g.translate(0, (up ? 1 : -1) * (gap + h / 2) * MM, 0);
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(g, chipMat(chipCanvas(L, text, w, h, ppm))));
    return pivot;
  };
  const LIFT = 0.0004; // the leaves lie this far above the card
  const pairs = L.chips.map((pr) => {
    const node = new THREE.Group();
    node.position.set(cx(pr.x), cy(pr.hinge), LIFT);
    const zhLeaf = leaf(pr.zh.text, pr.zh.w, pr.zh.h, true, pr.gap);
    const enLeaf = leaf(pr.en.text, pr.en.w, pr.en.h, false, pr.gap);
    node.add(zhLeaf, enLeaf);
    card.add(node);
    const u = [zhLeaf, enLeaf].map((l) => l.children[0].material.uniforms);
    return { node, zhLeaf, enLeaf, hot: u.map((v) => v.uLeafHot), ink: u.map((v) => v.uInk) };
  });
  const times = pairTimes(L);
  let more = null;
  if (L.more) {
    const g = new THREE.PlaneGeometry(L.more.d * MM, L.more.d * MM, 1, 1);
    const m = new THREE.Mesh(g, chipMat(chipCanvas(L, L.more.text, L.more.d, L.more.d, ppm)));
    m.position.set(cx(L.more.x), cy(L.more.hinge), LIFT);
    card.add(m);
    more = { mesh: m, t: seamAt(cx(L.more.x)) + GROW.more.lag, x: cx(L.more.x), y: cy(L.more.hinge), hot: m.material.uniforms.uLeafHot, ink: m.material.uniforms.uInk };
  }

  // the glazing at the slot
  const glassU = {
    uSlot: { value: new THREE.Vector4(SB, SLOT0.y - (CARD.H / 2) * MM, SLOT0.y + (CARD.H / 2) * MM, 0) },
    uGlass: { value: new THREE.Vector4(LOOK18.glass.core, LOOK18.glass.w, LOOK18.glass.halo, LOOK18.glass.wh) },
    uSeeds: { value: new THREE.Vector4(LOOK18.seeds.light, LOOK18.seeds.reach, LOOK18.seeds.rate, 0) },
    uAlong: { value: LOOK18.glass.along },
    uShot: own.uShot,
  };
  const patch = (() => {
    const half = 26 * DEG;
    const nb = 160;
    const ny = 40;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nb; i++) {
        const a = SB - half + (2 * half * i) / nb;
        pos.push(Math.cos(a) * LH.GLASS_R, SLOT0.y - 0.5 + j / ny, Math.sin(a) * LH.GLASS_R);
        if (i < nb && j < ny) {
          const k = j * (nb + 1) + i;
          idx.push(k, k + 1, k + nb + 1, k + 1, k + nb + 2, k + nb + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, k) => (k % 3 === 1 ? 0 : v / LH.GLASS_R)), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: { ...glassU, ...U },
        vertexShader: VERT,
        fragmentShader: LIB_COMMON + GLASS_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    m.renderOrder = 12;
    m.frustumCulled = false;
    return m;
  })();
  scene.add(patch);

  // keep the plan honest: the cues below were measured from this layout (in both languages)
  const S = L.stats;
  const zt = zh.chars.map((c) => seamAt(cx(c.x + c.w / 2)) + GROW.zh.lag);
  const pan = (x, t) => {
    const [ax, , d] = track(CAM.keys, t);
    return clamp((x - ax) / (d * (18 / CAM.lens)), -1, 1); // where it is across the picture, -1 left … 1 right
  };
  const r2 = (v) => +v.toFixed(2);
  const got = {
    chars: [Math.min(...zt), Math.max(...zt)].map(r2),
    pairs: times.map((pt) => ({ t: r2(pt.t), pan: r2(pan(pt.x, pt.t)) })),
    more: more ? r2(more.t) : null,
    today: [cx(S.today.icon.x), cx(S.today.x + S.today.w)].map((x) => r2(seamAt(x + GROW.today.lag))),
    heat: [cx(S.heat.x0), cx(S.heat.x1)].map((x) => r2(seamAt(x) + GROW.heat.lag)),
  };
  const off = (a, b) => (typeof a === 'number' ? !(Math.abs(a - b) <= 0.03) : Object.keys(a ?? {}).some((k) => off(a[k], b?.[k])));
  for (const k of Object.keys(got)) {
    const want = CUES[k]?.[ctx.lang] ?? CUES[k];
    if (off(got[k], want)) console.warn(`[s18] CUES.${k} (${ctx.lang}) is ${JSON.stringify(want)}, the layout gives ${JSON.stringify(got[k])}`);
  }

  const P = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const QX = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      // the card, sliding in
      cardPos(t, P);
      card.position.copy(P);
      card.quaternion.copy(QCARD);
      card.updateMatrixWorld(true);
      // the camera, riding with it
      const [x, y, d] = track(CAM.keys, t);
      target.copy(P).addScaledVector(EU, x).addScaledVector(EY, y);
      pos.copy(target).addScaledVector(EU, d * Math.tan(CAM.yaw)).addScaledVector(EY, d * Math.tan(CAM.pitch)).addScaledVector(EN, d);
      setLens(camera, CAM.lens);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = 66 + t;
      own.uShot.value = t;

      // the lighthouse turns on: no haze in the lantern, the tower's windows unseen
      const sh = sheetAt(T, T - 4);
      sh.halo = 0;
      sh.windows = 0;
      sh.vol *= LOOK18.vol;
      lh.set(sh);
      lh.update(camera);

      // the seam and what the light writes behind it
      const xs = seamX(t);
      cardU.uSeam.value = xs;
      const since = t - SHEET_T;
      const flare = since < 0 ? Math.exp(-((since / 0.04) ** 2)) : Math.exp(-since / GROW.heat.fade);
      cardU.uHeat.value.set(seamX(t - GROW.heat.lag), GROW.heat.glow * (1 + GROW.heat.flare * flare), GROW.heat.front, 0);
      const back = (u) => (u <= 0 ? 0 : 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2); // a little past full, and back
      const leafHot = (dt) => (dt < 0 ? 0 : GROW.chip.hot * Math.exp(-dt / GROW.chip.cool));
      times.forEach((pt, k) => {
        const { node, zhLeaf, enLeaf, hot, ink } = pairs[k];
        const u = clamp((t - pt.t) / GROW.chip.grow);
        const g = 1 - (1 - u) ** 3;
        const tilt = GROW.chip.tilt * (1 - g) ** 1.5;
        node.visible = u > 0;
        for (const [l, sgn] of [[zhLeaf, 1], [enLeaf, -1]]) {
          l.scale.set(0.3 + 0.7 * g, Math.max(back(u), 1e-3), 1);
          l.quaternion.copy(QX.setFromAxisAngle(AX, sgn * tilt));
        }
        hot.forEach((h) => (h.value = leafHot(t - pt.t)));
        ink.forEach((v) => (v.value = smoothstep(GROW.chip.ink[0], GROW.chip.ink[1], u)));
        cardU.uBud.value[k].set(pt.x, pt.y, 0, budAt(t - pt.t, pt.t - pt.seam));
      });
      if (more) {
        const um = clamp((t - more.t) / GROW.more.pop);
        const s = back(um);
        more.ink.value = smoothstep(0.5, 1, um);
        more.mesh.visible = s > 0;
        more.mesh.scale.setScalar(Math.max(s, 1e-3));
        more.hot.value = leafHot(t - more.t);
        cardU.uBud.value[3].set(more.x, more.y, 0, budAt(t - more.t, GROW.more.lag));
      }
      card.updateMatrixWorld(true);

      // the glass: the seam in it while the card fills the slot; every seed as the sheet crosses the pane
      const inSlot = smoothstep(seamAt(-CARD.W / 2 * MM) - 0.04, seamAt(-CARD.W / 2 * MM) + 0.04, t) * (1 - smoothstep(seamAt(CARD.W / 2 * MM) - 0.04, seamAt(CARD.W / 2 * MM) + 0.04, t));
      glassU.uSlot.value.w = inSlot;
      let da = (((sh.angle - SB) % TAU) + TAU) % TAU;
      if (da > Math.PI) da -= TAU;
      glassU.uSeeds.value.w = LOOK18.seeds.burst * Math.exp(-((da / 0.05) ** 2));
    },
    post: () => ({ dof: { focus: focusDistance(camera, target), fstop: CAM.fstop } }),
  };
}

// ------------------------------------------------------------------------------------------- cues

// Sound cues, s into the shot (global frame = 1512 + 24 t). The layout-dependent times are measured
// from the layout; setup warns if it drifts from them.
export const CUES = {
  cut: { t: 0 }, // on the beat: the radar's ping goes on, a beat a second (global 1512, 1536, 1560, 1584)
  pings: [0, 1, 2, 3],
  // the scan line: the seam enters the card at its left edge and leaves it at its right (the glass
  // rings while the card is in the slot)
  seam: { in: +seamAt((-CARD.W / 2) * MM).toFixed(2), out: +seamAt((CARD.W / 2) * MM).toFixed(2) },
  // the Chinese, written behind it: the first and the last character start to grow
  chars: [0.3, 2.27],
  // the tag pairs, left to right: each bud lights as the seam passes it, and at t its two leaves start to
  // grow out of it (pan: where it is across the picture, -1 left … 1 right)
  pairs: [
    { t: 0.75, pan: -0.65 },
    { t: 1.46, pan: -0.09 },
    { t: 1.87, pan: 0.3 },
  ],
  more: 2.0, // "+2" pops up
  today: { zh: [0.82, 1.18], en: [0.82, 1.24] }, // today's growth printed, from its arrow to its last figure (the mix is shared, BIBLE §9: it follows zh)
  heat: [2.0, 2.37], // the heat engraved, its flame to its last figure
  sheet: +SHEET_T.toFixed(2), // the sheet crosses the card: the card and the glass flash, the heat flares
};
