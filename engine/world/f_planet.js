// The planet of s45: the library over the whole Earth, drawn by one full-screen shader at the far plane
// (like f_sky's night sky, which it replaces once the eye is out of the shaft).
//
// Geometry. The planet is a sphere of radius R whose top touches the roof at the library's origin O,
// the mouth of the beacon well (s44's axis). Every pixel's ray is met with it in the library's axes,
// relative to O, with the eye's |c|² − R² computed in double on the CPU, so the hit is good to a
// centimetre at 700 m and to metres at 40,000 km. The hit is mapped to the plane about O by the
// azimuthal equidistant projection (q, metres, library x/z axes): near O, q is just the roof's own
// coordinates, so the lattice there is the library's.
//
// The hexagons. The roof's lattice (pitch 43 m, cells' sides facing 30° + 60°·k as in geo.js) is drawn
// at 13 scales, pitch 43·2^n m (n = 0…12, 43 m to 176 km). Every coarser lattice is a subset of the
// finer ones, and a cell's hash is keyed on its centre's level-0 coordinates, so a cell keeps its
// colour as the view widens past it. Each pixel picks its level from its footprint, a fixed number of
// reference pixels (1920 wide) per cell, and cross-fades the two levels around it: the same picture at
// 960, 1920 and 3840.
//
// Land and sea. A cell is land when its centre is: a signed distance (km, + on land) to the hand-written
// coastlines of f_coast.js, rasterised on an equirectangular grid at setup (canvas fill, then a
// two-pass exact distance transform with each row's own scale), plus fractal detail finer than the grid
// for the cells too small for it. Near O the coast is pinned to a straight shore through O, so the
// beacon well stands on the coast at every scale.
//
// What is drawn: land cells lit in the lamps' colour from their wells, the coast as a chain of finer
// lime cells (the light that outlines the continents; never coarser than 44 km, so the straits stay
// open), the land and sea along it set right by those finer cells (so an island smaller than a land
// cell is filled, not a ring round a dark hole), the sea dark with its grid faint, readers on
// land as small amber (human) and steel (machine) points, the two lighthouses as lime points, and at
// the peak each lighthouse's beam: a vertical sheet turning about its axis whose trace sweeps the globe
// once, each cell it crosses flashing once (shutter-integrated, gone in about a fifth of a second) and
// each reader it reaches lit for good (brighter, in its own colour). Then airglow and the lit haze of
// the low air, and the stars (f_sky's, the same field, each star's light what it has in the 4K frame)
// wherever the planet is not.
//
// Nothing here draws text, and no name or credit of any kind exists in this file's data.
import * as THREE from 'three';
import { HASH, NOISE } from '../runtime/lib/glsl.js';
import { makeCanvas } from '../runtime/lib/text.js';
import { HEX, lin } from '../runtime/lib/palette.js';
import { STARS } from './f_sky.js';
import { LAND, SEAS, BEACONS } from './f_coast.js';

export const R_EARTH = 6371000; // m
const RK0 = R_EARTH / 1000; // km
export const CELL = 43; // m: the roof's lattice pitch (twice its apothem, 21.5)
export const N_LEVELS = 13; // pitch 43·2^n m, n = 0…12

const DEG = Math.PI / 180;

// ------------------------------------------------------------------- coastlines → signed distance

const SDF_W = 4096;
const SDF_H = 2048;
const BIG = 1e20;

// Felzenszwalb–Huttenlocher: d[q] = min_p (q − p)² + f[p] over 0…n−1 (f: 0 at features, BIG elsewhere)
function edt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -1e30;
  z[1] = 1e30;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e30;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

// squared distance (km²) from every pixel to the nearest pixel with mask === want; columns are sy km
// apart, pixels within row y sx[y] km apart
function edt2(mask, W, H, want, sy, sx) {
  const out = new Float32Array(W * H);
  const n = Math.max(W, H);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = mask[y * W + x] === want ? 0 : BIG;
    edt1(f, H, d, v, z);
    for (let y = 0; y < H; y++) out[y * W + x] = d[y] * sy * sy;
  }
  for (let y = 0; y < H; y++) {
    const s2 = sx[y] * sx[y];
    const o = y * W;
    for (let x = 0; x < W; x++) f[x] = out[o + x] / s2;
    edt1(f, W, d, v, z);
    for (let x = 0; x < W; x++) out[o + x] = d[x] * s2;
  }
  return out;
}

const _f32 = new Float32Array(1);
const _u32 = new Uint32Array(_f32.buffer);
function toHalf(val) {
  _f32[0] = val;
  const x = _u32[0];
  const sign = (x >>> 16) & 0x8000;
  const e = ((x >>> 23) & 0xff) - 112;
  if (e <= 0) return sign; // below 6e-5 km: zero
  if (e >= 31) return sign | 0x7bff;
  return sign | ((e << 10) + (((x & 0x7fffff) + 0x1000) >> 13));
}

// The coastlines as a signed distance in km (+ on land), equirectangular, W × H, half floats, row 0 at
// the north pole. The rings are filled at −360°, 0 and +360° on a canvas padded by W/16 each side, so
// the distance transform runs across the date line; edge pixels take their distance from the fill's
// own antialiased coverage.
export function coastSDF(W = SDF_W, H = SDF_H) {
  const PAD = W / 16;
  const CW = W + 2 * PAD;
  const cv = makeCanvas(CW, H);
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.fillRect(0, 0, CW, H);
  const X = (lon) => PAD + ((lon + 180) / 360) * W;
  const Y = (lat) => ((90 - lat) / 180) * H;
  const fill = (rings, style) => {
    g.fillStyle = style;
    for (const r of Object.values(rings)) {
      for (const off of [-360, 0, 360]) {
        g.beginPath();
        for (let i = 0; i < r.length; i++) {
          const px = X(r[i][0] + off);
          const py = Y(r[i][1]);
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        }
        g.closePath();
        g.fill();
      }
    }
  };
  fill(LAND, '#fff');
  fill(SEAS, '#000');
  const px = g.getImageData(0, 0, CW, H).data;
  const N = CW * H;
  const cov = new Float32Array(N);
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    cov[i] = px[i * 4] / 255;
    mask[i] = cov[i] >= 0.5 ? 1 : 0;
  }
  const RK = R_EARTH / 1000;
  const sy = (Math.PI * RK) / H;
  const sx = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    const lat = (90 - ((y + 0.5) * 180) / H) * DEG;
    sx[y] = Math.max(((2 * Math.PI * RK) / W) * Math.cos(lat), sy * 0.02);
  }
  const toSea = edt2(mask, CW, H, 0, sy, sx); // for land pixels
  const toLand = edt2(mask, CW, H, 1, sy, sx); // for sea pixels
  const data = new Uint16Array(W * H);
  let land = 0;
  for (let y = 0; y < H; y++) {
    const half = 0.5 * Math.min(sx[y], sy);
    for (let x = 0; x < W; x++) {
      const i = y * CW + x + PAD;
      const a = cov[i];
      let s;
      if (a > 0.004 && a < 0.996) s = (a - 0.5) * 2 * half;
      else if (mask[i]) s = Math.sqrt(toSea[i]) - half;
      else s = half - Math.sqrt(toLand[i]);
      if (mask[i]) land++;
      data[y * W + x] = toHalf(s);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.HalfFloatType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return { texture: tex, landShare: land / (W * H), sample: (lon, lat) => sampleHalf(data, W, H, lon, lat) };
}

function fromHalf(h) {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const m = h & 0x3ff;
  if (e === 0) return s * m * 2 ** -24;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}
// the distance at a point, bilinear like the texture (km); setup uses it to orient the pinned shore
function sampleHalf(data, W, H, lon, lat) {
  const u = (((lon + 180) / 360) * W - 0.5 + W * 4) % W;
  const v = Math.min(Math.max(((90 - lat) / 180) * H - 0.5, 0), H - 1);
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const at = (x, y) => fromHalf(data[Math.min(y, H - 1) * W + (x % W)]);
  return (
    (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) +
    (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
  );
}

// -------------------------------------------------------------------------------------------- shader

const VERT = /* glsl */ `
varying vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;

// The eye, the projection about O, the lattice and the coasts. Lengths in m unless named in km.
const GEO = /* glsl */ `
uniform mat4 uInvProj; uniform mat3 uCamRot;
uniform float uPxAng, uRef;      // a pixel's angle (rad); the render's width over 1920
uniform vec3 uCam, uW;           // the eye from O, and from the planet's centre (library axes)
uniform float uCc, uRe;          // |eye − centre|² − R² (from double); |eye − centre| (km)
uniform vec3 uAxX, uAxY, uAxZ;   // the library's x, y (up at O) and z axes in ECEF
uniform sampler2D uSdf;          // the coasts' signed distance (km, + on land), equirectangular
uniform vec2 uPinN;              // the land side's normal at O (q axes)
uniform float uPinR;             // the reach of the straight shore through O
varying vec2 vNdc;
const float R = 6371000.0, RK = 6371.0, CELL = 43.0;

// a point on the planet (from O) → the azimuthal equidistant plane about O (library x and z)
vec2 aeq(vec3 h){
  float s = length(h.xz)/R, cc = 1.0 + h.y/R;
  float f = s > 1e-4 ? atan(s, cc)/s : (1.0 - s*s/(3.0*cc*cc))/cc;
  return h.xz*f;
}
// a point of the plane → its direction from the centre (ECEF)
vec3 ecefOf(vec2 c){
  float r = length(c), th = r/R;
  vec2 u = r > 1e-3 ? c/r : vec2(0.0);
  return cos(th)*uAxY + sin(th)*(u.x*uAxX + u.y*uAxZ);
}
// the cell of q at pitch P (axes P(√3/2, 1/2) and P(0, 1), cube rounding): its centre and index
void hexCell(vec2 q, float P, out vec2 ctr, out ivec2 id){
  float x = q.x/(0.8660254*P), z = q.y/P - 0.5*x, y = -x - z;
  float rx = floor(x + 0.5), ry = floor(y + 0.5), rz = floor(z + 0.5);
  float dx = abs(rx - x), dy = abs(ry - y), dz = abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  ctr = vec2(rx*0.8660254*P, (rz + 0.5*rx)*P);
  id = ivec2(int(rx), int(rz));
}
// from l (relative to a cell's centre) in to the cell's edge: P/2 at the centre, 0 on the edge
float hexEdge(vec2 l, float P){
  return 0.5*P - max(max(abs(dot(l, vec2(0.8660254, 0.5))), abs(l.y)), abs(dot(l, vec2(-0.8660254, 0.5))));
}
// the coasts' distance (km) at a direction
float sdfTex(vec3 e){
  float lat = asin(clamp(e.z, -1.0, 1.0)), lon = atan(e.y, e.x);
  return textureLod(uSdf, vec2(lon*0.15915494 + 0.5, 0.5 - lat*0.31830989), 0.0).r;
}
// The signed distance (+ on land) at a cell's centre c: the coasts, held to the straight shore through
// O near O, plus fractal detail from the texture's scale (20 km) down to the shore's finer level's pitch
// P, the last octave (P ≤ λ < 2P) weighted 1 − w (that level pair's blend), so every level's cells read
// one coastline and it loses its finest wiggle smoothly as the levels climb. Each octave is cancelled at
// O, where value noise sits on a lattice point and is flat, so the shore through O holds at every scale.
float sdfAt(vec2 c, float P, float w){
  float s = sdfTex(ecefOf(c))*1000.0;
  float r2 = dot(c, c);
  s = mix(s, dot(c, uPinN), exp(-r2/(uPinR*uPinR)));
  float lk = 20000.0;
  for (int k = 0; k < 10; k++){
    if (lk < P) break;
    vec2 o = vec2(float(37*k + 11), float(53*k + 5));
    float a = 2.39996*float(k);
    vec2 p = mat2(cos(a), sin(a), -sin(a), cos(a))*c/lk + o;
    s += (lk < 2.0*P ? 1.0 - w : 1.0)*0.44*lk*((vnoise2(p) - 0.5) - exp(-0.25*r2/(lk*lk))*(hash12(o) - 0.5));
    lk *= 0.5;
  }
  return s;
}`;

// The airglow's shell: its height and width (km; a gaussian, exp(−((r − r0)/w)²))
const GLOW = { h0: 95, w: 6 };

// The beams, the air and the night sky.
const AIR = /* glsl */ `
uniform float uT, uSh;           // the shot's time and its shutter (s)
uniform vec3 uL0, uE0, uN0, uL1, uE1, uN1; // the beacons (ECEF) with their local east and north
uniform vec2 uPhi0;              // the beams' azimuths at the start (rad, east of north)
uniform float uGlowG[49];        // the airglow shell's half-pass column, tabulated: see glowG
uniform float uHazeL, uHazeK, uGlowA; // the lit haze's full radiance and extinction (1/km); the airglow's (1/km)
uniform float uAhead;            // the airglow seen from under its shell (1) or from over it (0): see columns
uniform vec2 uGlowR;             // the shell's radius (km) as seen from over it and from under it
uniform float uPxE;              // a pixel's angle (rad) at 3840 wide: the stars' light (see starsE)
uniform float uStarI, uMilky; uniform vec3 uSkyCol, uGalN;
const float T0 = 17.0, TURN = 1.4, OMEGA = 4.48799, TAU = 0.05;
const float HZ_H = 8.0, GL_W = ${GLOW.w.toFixed(1)};

// when the beam of a beacon (local east E, north N, start azimuth p0) sweeps over X: in T0…T0 + TURN
float tPass(vec3 X, vec3 E, vec3 N, float p0){
  return T0 + mod(atan(dot(X, E), dot(X, N)) - p0, 6.2831853)/OMEGA;
}
// the shutter's mean of a flash at tp that decays with TAU
float echo(float tp){
  float a = uT - 0.5*uSh, b = uT + 0.5*uSh;
  if (b <= tp) return 0.0;
  return TAU/uSh*(exp(-(max(a, tp) - tp)/TAU) - exp(-(b - tp)/TAU));
}
// the share of the shutter after tp
float after(float tp){ return clamp((uT + 0.5*uSh - tp)/uSh, 0.0, 1.0); }
float overlap(float a, float b, float c, float e){ return max(0.0, min(b, e) - max(a, c)); }
// the beam's trace at X, a line hw wide each side: the share of the shutter it covers X, the beam on
// from T0 to T0 + TURN (at T0 it also lights the line's other side, the end of the turn)
float sheet(vec3 X, vec3 L, vec3 E, vec3 N, float p0, float hw){
  float a = max(uT - 0.5*uSh, T0), b = min(uT + 0.5*uSh, T0 + TURN);
  if (b <= a) return 0.0;
  float tp = tPass(X, E, N, p0);
  float dt = hw/(R*max(length(cross(X, L)), 1e-6))/OMEGA;
  return (overlap(a, b, tp - dt, tp + dt) + overlap(a, b, tp - TURN - dt, tp - TURN + dt))/uSh;
}

// G(z) = 2∫exp(−(u² − z)²)du over u ≥ 0: tabulated for z = −4…8 by 1/4, then its asymptote
float glowG(float z){
  if (z >= 8.0) return 1.7724539*inversesqrt(z)*(1.0 + 0.09375/(z*z));
  float x = clamp(4.0*(z + 4.0), 0.0, 47.999);
  int i = int(x);
  return mix(uGlowG[i], uGlowG[i + 1], x - float(i));
}
// Chapman's grazing-incidence function (x = r/H ≫ 1, mu = cos zenith ≥ 0), through exp(y²)erfc(y)
float chap(float x, float mu){ float s = sqrt(0.5*x), y = mu*s; return 2.0*s/(y + sqrt(y*y + 1.2732395)); }
// the lit haze's column (km at its ground density; exponential) ahead of a point at radius r (km) on a
// ray going up at cos zenith mu
float hazeUp(float r, float mu){ return HZ_H*exp(-(r - RK)/HZ_H)*chap(r/HZ_H, mu); }
// the airglow's column (km at its peak) from the tangent point of a ray (impact parameter squared b2,
// km²) on out, the shell at radius r0: sqrt(r0 w/2) G(z)
float glowT(float b2, float r0){ return sqrt(0.5*r0*GL_W)*glowG((r0*r0 - b2)/(2.0*r0*GL_W)); }
// The columns along the ray from the eye (Bk: the ray's B in km), to the ground (cos zenith there muG)
// or on past the planet: x, the haze; y, the airglow. The airglow is seen from under its shell (all of
// it ahead: the sky's rays cross it once, the ground's not at all) and from over it (none of it ahead
// going up, all of it twice on the way down past the planet, once down to the ground), mixed by uAhead:
// the eye crosses the thin shell inside a frame, which would pop, and from inside it the horizon's rays
// run along it. So each view keeps its shell 3 widths off the eye (uGlowR) and the mix takes about ten
// frames.
vec2 columns(bool hit, float Bk, float muG){
  float muE = -Bk/uRe, b2 = uRe*uRe - Bk*Bk;
  float over = glowT(b2, uGlowR.x), under = glowT(b2, uGlowR.y);
  if (hit) return vec2(max(hazeUp(RK, muG) - hazeUp(uRe, muE), 0.0), (1.0 - uAhead)*over);
  if (Bk >= 0.0) return vec2(hazeUp(uRe, -muE), uAhead*under);
  float rt = sqrt(max(b2, 0.0));
  return vec2(max(2.0*hazeUp(rt, 0.0) - hazeUp(uRe, muE), 0.0), uAhead*under + 2.0*(1.0 - uAhead)*over);
}

// f_sky's stars (the same cells, places, fluxes and tints) with each star's light fixed at what one
// pixel of the 4K frame gives it (uPxE) instead of one pixel of this render: at 3840 wide the field is
// f_sky's own, star for star; at 1920 or 960 each star keeps that light, spread over at least f_sky's
// 0.75 pixels, so the preview is the final box-filtered rather than a denser, brighter sky
vec3 starsE(vec3 d, float cells, float chance, float seed, float lo, float hi){
  vec3 fu = faceUv(d);
  vec2 g = (fu.xy*0.5 + 0.5)*cells;
  vec2 c0 = floor(g);
  float sig = max(uPxAng*0.75, 2.0e-5);
  vec3 acc = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 c = c0 + vec2(float(i), float(j));
    if (c.x < 0.0 || c.y < 0.0 || c.x >= cells || c.y >= cells) continue;
    float h0 = hash13(vec3(c, fu.z*17.0 + seed));
    if (h0 > chance) continue;
    vec2 p = (c + vec2(hash13(vec3(c, fu.z*17.0 + seed + 1.0)), hash13(vec3(c, fu.z*17.0 + seed + 2.0))))/cells*2.0 - 1.0;
    vec3 s = faceDir(p, fu.z);
    vec3 x = cross(s, d);
    float r2 = dot(x, x);
    float u = hash13(vec3(c, fu.z*17.0 + seed + 3.0));
    float flux = lo*pow(hi/lo, pow(u, 6.0));
    float tk = hash13(vec3(c, fu.z*17.0 + seed + 4.0));
    vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.82, 0.62), tk*tk);
    acc += tint*(flux*exp(-r2/(2.0*sig*sig))*(uPxE*uPxE)/(6.2832*sig*sig));
  }
  return acc;
}
// the night sky: f_sky's, the same stars (their light as at 4K) and Milky Way
vec3 night(vec3 d){
  vec3 c = uSkyCol;
  float b = dot(d, uGalN);
  float band = exp(-b*b/0.03);
  float mott = 0.55 + 0.9*fbm3(d*5.0) - 0.35*smoothstep(0.55, 0.8, vnoise(d*11.0 + 4.0));
  float lane = 1.0 - 0.6*exp(-pow((b - 0.02)/0.035, 2.0))*smoothstep(0.35, 0.65, vnoise(d*3.0 + 9.0));
  c += vec3(0.62, 0.66, 0.78)*(uMilky*band*max(mott, 0.0)*lane);
  c += starsE(d, 72.0, 0.55, 11.0, 2.0, 400.0)*uStarI;
  c += starsE(d, 300.0, 0.5, 29.0, 0.6, 8.0)*uStarI;
  return c;
}`;

// The look: the cells, the shore, the readers.
const LOOK = /* glsl */ `
uniform vec3 uLamp, uLime, uAmber, uSteel, uVoid;
uniform float uLand, uMouth, uSea, uCoast, uDot, uFlash, uLine;
const float AS = 12.0, FLOOR_H = 7.2, RM0 = 0.5581395; // the shaft's apothem over the cell's: 12/21.5

// level 0: how deep the ray meets the wall of the shaft under the mouth it entered at l (from the
// cell's centre)
float wellDepth(vec2 l, vec3 d){
  float hl = length(d.xz);
  if (hl < 1e-5) return 1e5;
  vec2 u = d.xz/hl;
  vec3 a = vec3(dot(u, vec2(0.8660254, 0.5)), u.y, dot(u, vec2(-0.8660254, 0.5)));
  vec3 p = vec3(dot(l, vec2(0.8660254, 0.5)), l.y, dot(l, vec2(-0.8660254, 0.5)));
  vec3 s = (AS - sign(a)*p)/max(abs(a), 1e-5);
  return max(min(min(s.x, s.y), s.z), 0.0)*max(-d.y, 0.0)/hl;
}
// the shaft's wall at that depth: a lit gallery every floor, the slabs between dark, fading with depth
vec3 wellLook(vec3 lit, float dep, float flw){
  float f = fract(dep/FLOOR_H);
  float band = mix(0.3, 1.0, smoothstep(0.1, 0.2, f)*(1.0 - smoothstep(0.84, 0.94, f)));
  band = mix(band, 0.75, smoothstep(0.12, 0.45, flw));
  return lit*(band*exp(-dep/90.0));
}
// One level's cell under q (pitch CELL·2^n), with the beams' echo; .a: 1 on land; s: the coast's
// distance at its centre. Land: the roof in the lamps' light, the mouth brighter (level 0: the shaft
// itself; coarser: a glow whose mean over the cell matches level 0's); sea: dark, the lattice faint.
// sw: m per pixel the worst way, every edge's filter; oct: the coastline's octaves (sdfAt's P, w).
vec4 cellLook(vec2 q, int n, float sw, vec3 d, float dep, float flw, vec2 oct, out float s){
  float P = CELL*float(1 << n), ap = 0.5*P;
  vec2 ctr; ivec2 id; hexCell(q, P, ctr, id);
  ivec2 key = id*(1 << n);
  s = sdfAt(ctr, oct.x, oct.y);
  float e = hexEdge(q - ctr, P);
  float cl = smoothstep(-sw, sw, e - 0.035*P);
  // a cell only a few pixels across goes to its mean, which the edge filters would darken by about a
  // pixel's width all round (the lit share inside the gap at its edge: 0.93², 0.865)
  float k = n == 0 ? 1.0 : smoothstep(1.5, 4.0, P/sw);
  float cell = mix(0.865, cl, k);
  float land = s > 0.0 ? 1.0 : 0.0;
  vec3 c;
  if (land > 0.5){
    float lum = (0.85 + 0.3*ihash3(key.x, key.y, 11))*(ihash3(key.x, key.y, 12) < 0.05 ? 0.35 : 1.0);
    vec3 roof = uLamp*(uLand*lum);
    if (n == 0){
      c = mix(roof, wellLook(uLamp*(uMouth*lum), dep, flw), smoothstep(-sw, sw, e - (ap - AS)))*cell;
    } else {
      float rm = mix(0.62, 0.74, ihash3(key.x, key.y, 13));
      float x = (1.0 - e/ap)/rm;
      float g = uMouth*0.75*lum*(RM0*RM0)/(rm*rm)*(1.25 - 0.5*x*x);
      c = mix(roof, uLamp*g, smoothstep(-sw, sw, e - (1.0 - rm)*ap))*cl;
      c = mix(uLamp*(lum*(uLand*(0.865 - rm*rm) + 0.75*uMouth*RM0*RM0)), c, k);
    }
  } else c = mix(uLamp*uSea, uVoid, cell);
  if (uT + 0.5*uSh > T0){
    vec3 X = ecefOf(ctr);
    float f = echo(tPass(X, uE0, uN0, uPhi0.x)) + echo(tPass(X, uE1, uN1, uPhi0.y));
    c += uLime*(uFlash*f*mix(0.33, 1.0, land)*cell);
  }
  return vec4(c, land);
}
// the shore: a finer level's cells whose centres lie within half a pitch of the coast, lit lime (level
// 0: their shafts lit lime); .a: 1 on them
vec4 shoreLook(vec2 q, int n, float sw, float dep, float flw, vec2 oct){
  float P = CELL*float(1 << n);
  vec2 ctr; ivec2 id; hexCell(q, P, ctr, id);
  if (abs(sdfAt(ctr, oct.x, oct.y)) >= 0.5*P) return vec4(0.0);
  ivec2 key = id*(1 << n);
  float e = hexEdge(q - ctr, P);
  vec3 c = uLime*(uCoast*(0.8 + 0.4*ihash3(key.x, key.y, 17)));
  if (n == 0) c = mix(c*0.25, wellLook(uLime*uMouth, dep, flw), smoothstep(-sw, sw, e - (0.5*P - AS)));
  float cl = smoothstep(-sw, sw, e - 0.035*P);
  return vec4(c*(n == 0 ? cl : mix(0.865, cl, smoothstep(1.5, 4.0, P/sw))), 1.0); // as cellLook's edge
}
// Readers: a point of light on a tenth of a level's cells, amber (people) or steel (machines), dim
// until the first beam reaches it, then lit for good in its own colour. A coarser level's centres are
// among a finer one's, with the same key, so a reader stays put as the levels change. fp: m per
// reference pixel; sw: m per pixel the worst way. The point is 1.2 reference pixels (σ), widened to at
// least 0.6 pixels with its energy kept, so it never falls between pixels.
vec3 readers(vec2 q, int n, float fp, float sw){
  float P = CELL*float(1 << n);
  vec2 ctr; ivec2 id; hexCell(q, P, ctr, id);
  ivec2 key = id*(1 << n);
  float h = ihash3(key.x, key.y, 29);
  if (h >= 0.1) return vec3(0.0);
  float k = 0.4;
  if (uT + 0.5*uSh > T0){
    vec3 X = ecefOf(ctr);
    k = mix(0.4, 1.0, after(min(tPass(X, uE0, uN0, uPhi0.x), tPass(X, uE1, uN1, uPhi0.y))));
  }
  vec2 l = q - ctr;
  float v0 = 1.44*fp*fp, v = v0 + 0.36*sw*sw;
  return (h < 0.06 ? uAmber : uSteel)*(uDot*k*(v0/v)*exp(-0.5*dot(l, l)/v));
}`;

const MAIN = /* glsl */ `
uniform vec3 uB0, uB1;           // the beacons on screen: x, y (px), how visible
uniform float uFlare;            // their glow, raised while the beams turn
const float K_BASE = 12.0, K_SHORE = 7.0, K_DOT = 4.0; // reference pixels a cell spans (finer level)
// the two levels shown for cells about k reference pixels wide: n and n + 1, and n + 1's weight; top:
// the coarsest level to use. The shore stops at level 10 (44 km), two short of the base's: its chain
// then reaches under 50 km off a coast, so a strait of 130 km or more (Taiwan's) keeps dark water down
// its middle at every scale, where chains of 88 or 176 km cells would close it.
float levelOf(float k, float fp, float top, out int n){
  float l = log2(k*fp/CELL), f = floor(l);
  n = int(clamp(f, 0.0, top));
  return (l < 0.0 || f >= top) ? 0.0 : smoothstep(0.0, 1.0, l - f);
}
// a lighthouse seen from far off: a lime point (over-exposed, so its heart clips pale; σ 2.2 reference
// pixels, widened to at least 0.75 pixels with its energy kept) and its glow (σ 8 and 30)
vec3 beacon(vec3 b){
  if (b.z <= 0.0) return vec3(0.0);
  vec2 r = (gl_FragCoord.xy - b.xy)/uRef;
  float r2 = dot(r, r);
  float v = max(4.84, 0.5625/(uRef*uRef));
  return uLime*(b.z*(6.0*(4.84/v)*exp(-0.5*r2/v) + uFlare*(0.3*exp(-r2/128.0) + 0.04*exp(-r2/1800.0))));
}
// A base cell the coast may cross (its centre R_MIX pitches from it or less), C, set right by the
// shore's finer cells F0, F1 (its two levels, F1's weight ws): where a finer cell is land and C sea, or
// the other way, the finer cell is drawn; where they agree, C. So the land and sea are the ones the shore
// outlines: an island smaller than a base cell is filled, not a ring round a dark hole; a strait is
// open water; and the base cells keep their size everywhere else.
const float R_MIX = 0.75;
vec4 setRight(vec4 C, vec4 F0, vec4 F1, float ws){
  return mix(C.a == F0.a ? C : F0, C.a == F1.a ? C : F1, ws);
}
void main(){
  vec4 v = uInvProj*vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(uCamRot*normalize(v.xyz/v.w));
  // the planet: |uW + s d| = R, the near root in the form that keeps its digits
  float B = dot(uW, d), disc = B*B - uCc;
  bool hit = disc > 0.0 && B < 0.0;
  float th = hit ? uCc/(-B + sqrt(disc)) : -B;
  vec2 q = aeq(uCam + th*d);
  // the footprint from the Jacobian of q on screen: sw, m per pixel the worst way (every edge's
  // filter); fp, m per reference pixel allowing 2:1 anisotropy (the levels: cells foreshortened more
  // than that grow, so they never crowd under a few pixels)
  vec2 qx = dFdx(q), qy = dFdy(q);
  float ja = dot(qx, qx), jb = dot(qx, qy), jc = dot(qy, qy);
  float jh = 0.5*(ja + jc), jd = sqrt(max(jh*jh - ja*jc + jb*jb, 0.0));
  float sw = sqrt(jh + jd);
  float fp = max(0.5*sw, sqrt(max(jh - jd, 0.0)))*uRef;
  // level 0's shafts: how deep the ray meets the wall of the one it looks into, and that on screen
  vec2 c0; ivec2 i0; hexCell(q, CELL, c0, i0);
  float dep = wellDepth(q - c0, d);
  float flw = fwidth(dep/FLOOR_H);

  vec3 col;
  float muG = 0.0;
  if (hit){
    muG = -dot(d, normalize(uW + th*d));
    // one coastline for every level here: the shore's finer level's octaves (see sdfAt)
    int ns; float ws = levelOf(K_SHORE, fp, 10.0, ns);
    vec2 oct = vec2(CELL*float(1 << ns), ws);
    int nb; float wb = levelOf(K_BASE, fp, 12.0, nb);
    // the base's cells, land or sea by their centres, set right near the coast by the shore's (setRight)
    float sa, sb, sf;
    bool fk = false;
    vec4 F0 = vec4(0.0), F1 = vec4(0.0);
    vec4 A = cellLook(q, nb, sw, d, dep, flw, oct, sa);
    if (nb > ns && abs(sa) < R_MIX*CELL*float(1 << nb)){
      F0 = cellLook(q, ns, sw, d, dep, flw, oct, sf);
      F1 = ws > 0.0 ? cellLook(q, ns + 1, sw, d, dep, flw, oct, sf) : F0;
      fk = true;
      A = setRight(A, F0, F1, ws);
    }
    if (wb > 0.0){
      vec4 Bc = cellLook(q, nb + 1, sw, d, dep, flw, oct, sb);
      if (abs(sb) < R_MIX*CELL*float(1 << (nb + 1))){
        if (!fk){
          F0 = cellLook(q, ns, sw, d, dep, flw, oct, sf);
          F1 = ws > 0.0 ? cellLook(q, ns + 1, sw, d, dep, flw, oct, sf) : F0;
        }
        Bc = setRight(Bc, F0, F1, ws);
      }
      A = mix(A, Bc, wb);
    }
    col = A.rgb;
    // readers, on land, fading in as they shrink to points
    float ld = log2(K_DOT*fp/CELL);
    if (A.a > 0.0 && ld > -1.0){
      int nd; float wd = levelOf(K_DOT, fp, 12.0, nd);
      vec3 r = readers(q, nd, fp, sw);
      if (wd > 0.0) r = mix(r, readers(q, nd + 1, fp, sw), wd);
      col += r*(A.a*smoothstep(-1.0, 0.0, ld));
    }
    // the shore over it all, looked for only near the coast
    if (abs(sa) < 3.0*CELL*float(1 << nb)){
      vec4 S = shoreLook(q, ns, sw, dep, flw, oct);
      if (ws > 0.0) S = mix(S, shoreLook(q, ns + 1, sw, dep, flw, oct), ws);
      col = mix(col, S.rgb, S.a);
    }
    // the beams' traces
    if (uT + 0.5*uSh > T0 && uT - 0.5*uSh < T0 + TURN){
      vec3 X = ecefOf(q);
      col += uLime*(uLine*(sheet(X, uL0, uE0, uN0, uPhi0.x, 10000.0) + sheet(X, uL1, uE1, uN1, uPhi0.y, 10000.0)));
    }
  } else col = night(d);
  col += beacon(uB0) + beacon(uB1);
  // the air: the lit haze dims what lies behind it and glows; the airglow, thin, only glows
  vec2 cl = columns(hit, 0.001*B, muG);
  float tr = exp(-uHazeK*cl.x);
  col = col*tr + uLamp*(uHazeL*(1.0 - tr)) + uLime*(uGlowA*cl.y);
  gl_FragColor = vec4(col, 1.0);
}`;

const FRAG = [HASH, NOISE, GEO, STARS, AIR, LOOK, MAIN].join('\n');

// ---------------------------------------------------------------------------------------------- Planet

// a direction from the centre (ECEF) and the local east and north, at lon, lat (degrees)
const ecef = (lon, lat) =>
  new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG));
const eastAt = (lon) => new THREE.Vector3(-Math.sin(lon * DEG), Math.cos(lon * DEG), 0);
const northAt = (lon, lat) =>
  new THREE.Vector3(-Math.sin(lat * DEG) * Math.cos(lon * DEG), -Math.sin(lat * DEG) * Math.sin(lon * DEG), Math.cos(lat * DEG));
const smooth = (a, b, x) => {
  const u = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return u * u * (3 - 2 * u);
};

// G(z) = 2∫exp(−(u² − z)²)du over u ≥ 0, at z = −4…8 by 1/4: the airglow shell's column from a ray's
// tangent point, in units of sqrt(r0 w/2)
function glowTable() {
  const out = [];
  for (let i = 0; i < 49; i++) {
    const z = -4 + i / 4;
    const top = Math.sqrt(Math.max(z, 0)) + 4;
    const n = 4000;
    let s = 0;
    for (let k = 0; k < n; k++) {
      const u = ((k + 0.5) * top) / n;
      s += Math.exp(-((u * u - z) ** 2));
    }
    out.push((2 * s * top) / n);
  }
  return out;
}

// The look, linear light before the grade, in the palette's colours: the land's roofs and mouths (lamp),
// the sea's lattice (lamp, faint), the shore (lime), readers, a beam's flash on a land cell and its
// trace (lime), the lit haze (its full radiance, lamp, and its extinction per km at the ground) and the
// airglow (lime, per km of its shell).
export const PLANET_LOOK = {
  land: 0.06,
  mouth: 0.5,
  sea: 0.004,
  coast: 0.7,
  dot: 1.2,
  flash: 1.5,
  line: 3.0,
  hazeL: 0.08,
  hazeK: 0.006,
  glowA: 0.0008,
};

// The beams (the shader's T0, TURN): on at 17 for one clockwise turn (seen from above), each beacon's
// starting toward the other, so their first frame draws the line between them; off at 18.4.
export const BEAMS = { t0: 17, turn: 1.4 };

export class Planet {
  // origin: the world position of O (the roof on the beacon well's axis); yaw: the camera's yaw (rad)
  // with which, looking straight down, north is up; sky: f_sky's uniforms, whose stars are shared
  constructor({ origin, yaw, sky, look = {} }) {
    this.origin = origin.clone();
    const coast = coastSDF();
    this.coast = coast;
    // the library's axes on the Earth at O
    const [lon0, lat0] = BEACONS.ours;
    const up = ecef(lon0, lat0);
    const E = eastAt(lon0);
    const N = northAt(lon0, lat0);
    const ax = E.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(N, -Math.sin(yaw));
    const az = E.clone().multiplyScalar(-Math.sin(yaw)).addScaledVector(N, -Math.cos(yaw));
    this.axes = [ax, up, az];
    // east and north at O on the plane q (library x, z)
    const eq = new THREE.Vector2(Math.cos(yaw), -Math.sin(yaw));
    const nq = new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw));
    // The straight shore through O: along the coastline's own segment there (the vertices either side of
    // O on its ring), its land side read off the distance field 30 km out each way.
    const ring = LAND.eurasia;
    const i = ring.findIndex((p) => Math.abs(p[0] - lon0) < 1e-9 && Math.abs(p[1] - lat0) < 1e-9);
    if (i < 1) throw new Error('[f_planet] O is not a vertex of the coast');
    const [a, b] = [ring[i - 1], ring[i + 1]];
    const kx = Math.cos(lat0 * DEG);
    const tE = (b[0] - a[0]) * kx;
    const tN = b[1] - a[1];
    const tl = Math.hypot(tE, tN);
    let nE = -tN / tl;
    let nN = tE / tl;
    const off = (s) => coast.sample(lon0 + (s * 30 * nE) / (111.2 * kx), lat0 + (s * 30 * nN) / 111.2);
    const sp = off(1);
    const sm = off(-1);
    if (!(sp * sm < 0)) throw new Error(`[f_planet] no shore at O: ${sp.toFixed(1)} / ${sm.toFixed(1)} km`);
    if (sp < 0) {
      nE = -nE;
      nN = -nN;
    }
    this.shore = { east: nE, north: nN, land: Math.max(sp, sm), sea: Math.min(sp, sm) };
    const pinN = eq.clone().multiplyScalar(nE).addScaledVector(nq, nN);
    // the beacons, and the beams' first azimuths: each toward the other
    const L = [ecef(...BEACONS.ours), ecef(...BEACONS.theirs)];
    const LE = [eastAt(BEACONS.ours[0]), eastAt(BEACONS.theirs[0])];
    const LN = [northAt(...BEACONS.ours), northAt(...BEACONS.theirs)];
    const phi0 = [Math.atan2(L[1].dot(LE[0]), L[1].dot(LN[0])), Math.atan2(L[0].dot(LE[1]), L[0].dot(LN[1]))];
    this.phi0 = phi0;
    this.beacons = L.map((X) => this.world(X));

    const lk = { ...PLANET_LOOK, ...look };
    this.uniforms = {
      uInvProj: { value: new THREE.Matrix4() },
      uCamRot: { value: new THREE.Matrix3() },
      uPxAng: { value: 0.001 },
      uRef: { value: 1 },
      uCam: { value: new THREE.Vector3() },
      uW: { value: new THREE.Vector3() },
      uCc: { value: 1 },
      uRe: { value: R_EARTH / 1000 },
      uAxX: { value: ax },
      uAxY: { value: up },
      uAxZ: { value: az },
      uSdf: { value: coast.texture },
      uPinN: { value: pinN },
      uPinR: { value: 25000 },
      uT: { value: 0 },
      uSh: { value: 0.5 / 24 },
      uL0: { value: L[0] },
      uE0: { value: LE[0] },
      uN0: { value: LN[0] },
      uL1: { value: L[1] },
      uE1: { value: LE[1] },
      uN1: { value: LN[1] },
      uPhi0: { value: new THREE.Vector2(phi0[0], phi0[1]) },
      uGlowG: { value: glowTable() },
      uHazeL: { value: lk.hazeL },
      uHazeK: { value: lk.hazeK },
      uGlowA: { value: lk.glowA },
      uAhead: { value: 1 },
      uGlowR: { value: new THREE.Vector2(RK0 + GLOW.h0, RK0 + GLOW.h0) },
      uPxE: { value: 0.001 },
      uStarI: sky.uStarI,
      uMilky: sky.uMilky,
      uSkyCol: sky.uSkyCol,
      uGalN: sky.uGalN,
      uLamp: { value: lin(HEX.lamp) },
      uLime: { value: lin(HEX.lime) },
      uAmber: { value: lin(HEX.amber) },
      uSteel: { value: lin(HEX.steel) },
      uVoid: { value: lin(HEX.void) },
      uLand: { value: lk.land },
      uMouth: { value: lk.mouth },
      uSea: { value: lk.sea },
      uCoast: { value: lk.coast },
      uDot: { value: lk.dot },
      uFlash: { value: lk.flash },
      uLine: { value: lk.line },
      uB0: { value: new THREE.Vector3() },
      uB1: { value: new THREE.Vector3() },
      uFlare: { value: 1 },
    };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: true,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9; // like f_sky's night sky, which it replaces
  }

  // the world position of a point on the surface (an ECEF direction)
  world(X) {
    const [ax, ay, az] = this.axes;
    return new THREE.Vector3(X.dot(ax), X.dot(ay) - 1, X.dot(az)).multiplyScalar(R_EARTH).add(this.origin);
  }

  // the centre and radius, world (for f_mblur's sphere)
  get sphere() {
    return { center: new THREE.Vector3(this.origin.x, this.origin.y - R_EARTH, this.origin.z), radius: R_EARTH };
  }

  // width, height: the render's pixels; t: the shot's time; shutter (s)
  update(camera, { width, height, t, shutter }) {
    const U = this.uniforms;
    camera.updateMatrixWorld(true);
    U.uInvProj.value.copy(camera.projectionMatrixInverse);
    U.uCamRot.value.setFromMatrix4(camera.matrixWorld);
    U.uPxAng.value = (2 * Math.tan((camera.fov * DEG) / 2)) / (camera.zoom * height);
    U.uPxE.value = (U.uPxAng.value * width) / 3840;
    U.uRef.value = width / 1920;
    // the eye from O and from the centre, in double: |c|² − R² without cancellation
    const c = camera.position;
    const x = c.x - this.origin.x;
    const y = c.y - this.origin.y;
    const z = c.z - this.origin.z;
    U.uCam.value.set(x, y, z);
    U.uW.value.set(x, y + R_EARTH, z);
    U.uCc.value = x * x + y * y + z * z + 2 * R_EARTH * y;
    U.uRe.value = Math.hypot(x, y + R_EARTH, z) / 1000;
    // the airglow's shell (95 km) seen from under it, then from over it: the eye crosses it in a frame,
    // so the change is spread over 40–400 km (about ten frames), where it would otherwise pop; each view
    // keeps its shell 3 widths off the eye (see columns)
    const hk = Math.max(U.uRe.value - RK0, 1e-3);
    U.uAhead.value = 1 - smooth(Math.log(40), Math.log(400), Math.log(hk));
    const r0 = RK0 + GLOW.h0;
    const off = 3 * GLOW.w;
    U.uGlowR.value.set(Math.max(Math.min(r0, U.uRe.value - off), RK0 + off), Math.max(r0, U.uRe.value + off));
    U.uT.value = t;
    U.uSh.value = shutter;
    // the beacons flare while the beams turn (the share of the shutter they are on)
    const on = Math.max(0, Math.min(t + shutter / 2, BEAMS.t0 + BEAMS.turn) - Math.max(t - shutter / 2, BEAMS.t0)) / shutter;
    U.uFlare.value = 1 + 3 * on;
    // the beacons on screen, faded in over their horizon
    const centre = this.sphere.center;
    [U.uB0, U.uB1].forEach((u, i) => {
      const p = this.beacons[i];
      const e = c.clone().sub(p);
      const sinEl = p.clone().sub(centre).dot(e) / (R_EARTH * e.length());
      const front = p.clone().applyMatrix4(camera.matrixWorldInverse).z < 0;
      const v = p.clone().project(camera);
      u.value.set(((v.x + 1) / 2) * width, ((v.y + 1) / 2) * height, front ? smooth(-0.002, 0.012, sinEl) : 0);
    });
  }
}
