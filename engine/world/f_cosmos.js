// The cosmos of s46: the pull-back goes on until the Earth is a point of light, and the stars, the very
// field s45 showed, gather into hexagonal rings round it: the galleries of the library seen from above
// (s06, s13). The universe, which others call the Library.
//
// The stars. f_sky's field (STARS: cube-face cells, two layers) rebuilt on the CPU cell for cell (the
// same pcg hash on the float's bits, the same places, fluxes and tints) and drawn as points, each with
// f_planet's starsE light (its energy what one pixel of the 4K frame gives it, spread over at least
// 0.75 pixels), so the first frame's sky is s45's last, star for star.
//
// The rings, by parallax alone. Every star is given a distance: from the first pose it lies where s45
// left it; from the last pose (E) it lies on a hexagonal ring about the Earth. The eye's whole travel Δ
// (a vector: it bends off the vertical at first, then runs straight) makes each star slide toward the
// travel's vanishing point, which is the rings' centre and within a pixel of the Earth's point, and no
// further than to the next ring in: the rings are hidden in the random field and come out only as the
// eye nears E (the slide follows the eye's share of the travel, most of it in the climb's last e-folds).
// For a star at angle α from the travel's backward direction at the start, β at E, its distance in units
// of |Δ| is ρ = sin β / sin(α − β) (the sine rule), and at any moment it is seen along ρ·s − w, w the
// eye's travel so far over |Δ|. A share of the stars is left where it is: dust between the galleries.
// While a card is up the stars in the frame's middle band are dimmed (uScrim over uBand), so the words
// sit on a quiet dark and the rings pass behind them as a shade.
//
// The Earth. s45's planet (f_planet, unchanged) drawn into a square target round its disc by a camera
// that is the shot's own pose and lens cut down to that square (no jitter: s45's planet takes none, its
// rays come from the camera as update() leaves it), then laid over the stars (premultiplied: the disc
// covers them, its airglow adds). Its detail is held at s45's last frame's, so as the Earth shrinks it
// is that same picture made smaller, its lit cells and readers dimming with its size as a real one's
// would. The square is N/2^k pixels of the frame, k the times the Earth has halved since the first
// frame, so a pixel is always exactly 2^k × 2^k texels and mip level k (their box average) is read at
// its own texel's centre: no resampling, no softening. At k = 0 (the first half-second) a texel is a
// pixel, so the cut is seamless whatever the shutter's samples; the step from there to 2 × 2 is faded
// over some seven frames (FADE: a second target drawn meanwhile), the later ones are too fine to see.
// Under about two pixels across it is gone.
//
// The lighthouses: s45's two lime points (its beacon(): a fixed size on screen, with the glow round
// them) drawn over the Earth in the frame itself, so they keep their size as it shrinks and merge into
// one point of light as Tokyo closes on Shanghai.
//
// Nothing here draws text, and no name or credit of any kind exists in this file's data.
import * as THREE from 'three';
import { HASH, NOISE } from '../runtime/lib/glsl.js';
import { HEX, lin } from '../runtime/lib/palette.js';

// ------------------------------------------------------------------------------ the stars, on the CPU

// GLSL's hash13 (runtime/lib/glsl.js: pcg on the floats' bits), bit for bit: the uint's conversion to a
// float rounds to the nearest (Math.fround), and the scale 1/4294967295 is 2^-32 in single precision
const _f = new Float32Array(1);
const _u = new Uint32Array(_f.buffer);
const bits = (x) => {
  _f[0] = x;
  return _u[0];
};
function pcg(v) {
  const s = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  const w = Math.imul((s >>> ((s >>> 28) + 4)) ^ s, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}
export const hash13 = (x, y, z) => Math.fround(pcg(pcg(pcg(bits(x)) ^ bits(y)) ^ bits(z))) / 4294967296;

// f_sky's two layers (its stars() calls): cells per face edge, the chance of a star in a cell, the seed,
// the faintest and the brightest flux
export const LAYERS = [
  { cells: 72, chance: 0.55, seed: 11, lo: 2, hi: 400 },
  { cells: 300, chance: 0.5, seed: 29, lo: 0.6, hi: 8 },
];
// f_sky's faceDir: a face's (u, v) → its direction
function faceDir(u, v, f, out) {
  if (f === 0) out.set(1, v, u);
  else if (f === 1) out.set(-1, v, u);
  else if (f === 2) out.set(u, 1, v);
  else if (f === 3) out.set(u, -1, v);
  else if (f === 4) out.set(u, v, 1);
  else out.set(u, v, -1);
  return out.normalize();
}

// Every star of the field within `cone` (rad) of `axis` (a world direction): its direction, flux and
// tint (f_sky's: blue-white to orange), and its layer.
export function starField(axis, cone) {
  const cmin = Math.cos(cone);
  const dir = [];
  const flux = [];
  const tint = [];
  const layer = [];
  const d = new THREE.Vector3();
  LAYERS.forEach(({ cells, chance, seed, lo, hi }, li) => {
    const ch = Math.fround(chance);
    for (let f = 0; f < 6; f++) {
      // a face reaches 54.7° from its centre at its corners
      if (faceDir(0, 0, f, d).dot(axis) < Math.cos(Math.min(Math.PI, cone + 0.9553))) continue;
      const z = f * 17 + seed;
      for (let cy = 0; cy < cells; cy++) {
        for (let cx = 0; cx < cells; cx++) {
          if (hash13(cx, cy, z) > ch) continue;
          const u = ((cx + hash13(cx, cy, z + 1)) / cells) * 2 - 1;
          const v = ((cy + hash13(cx, cy, z + 2)) / cells) * 2 - 1;
          faceDir(u, v, f, d);
          if (d.dot(axis) < cmin) continue;
          const k = hash13(cx, cy, z + 3);
          const m = hash13(cx, cy, z + 4) ** 2;
          dir.push(d.x, d.y, d.z);
          flux.push(lo * Math.pow(hi / lo, Math.pow(k, 6)));
          tint.push(0.72 + 0.28 * m, 0.84 - 0.02 * m, 1.0 - 0.38 * m);
          layer.push(li);
        }
      }
    }
  });
  return { n: flux.length, dir: new Float32Array(dir), flux: new Float32Array(flux), tint: new Float32Array(tint), layer: new Uint8Array(layer) };
}

// ------------------------------------------------------------------------------ the rings

// Flat-topped hexagons (top and bottom sides level, as the shaft is seen from above in s06) about the
// Earth's point in the last frame, each q times as wide as the one inside it: a shaft's galleries seen
// down it, wide apart near the eye and crowding toward the far end. Lengths in frame heights. keep: the
// share of the stars that join a ring; spread: how far off its ring's line a star may sit (rings of
// stars, not drawn lines).
export const RINGS = { r0: 0.03, q: 1.2, keep: 0.88, spread: 0.0024, seed: 46 };

// the circumradius of the flat-topped hexagon about the origin through (x, y)
export const hexNorm = (x, y) => Math.max(Math.abs(y), Math.abs(0.8660254 * x + 0.5 * y), Math.abs(0.8660254 * x - 0.5 * y)) / 0.8660254;
const angleOf = (a, b) => Math.atan2(_c.copy(a).cross(b).length(), a.dot(b));
const _c = new THREE.Vector3();

// Each star's distance from the first pose over the eye's travel to E (rho; 0: it stays put, as far off
// as s45's sky) and its ring (−1: none). view: the last frame, as functions of frame-height coordinates
// (x right, y down, 0 at the frame's centre): toScreen(dir) → [x, y] or null behind the eye, toDir(x, y)
// → a world direction; centre: the Earth's point [x, y]; half: the frame's half size [w, h]; away: the
// direction the eye travels (straight away from the Earth's centre).
export function hexLayout(stars, view, rings = RINGS) {
  const { r0, q, keep, spread, seed } = rings;
  const lq = Math.log(q);
  const rho = new Float32Array(stars.n);
  const ring = new Int16Array(stars.n).fill(-1);
  const s = new THREE.Vector3();
  const down = view.away.clone().negate();
  const [cx, cy] = view.centre;
  const [hw, hh] = view.half;
  const margin = 0.05;
  for (let i = 0; i < stars.n; i++) {
    if (hash13(i, seed, 1) >= keep) continue;
    s.fromArray(stars.dir, 3 * i);
    const p = view.toScreen(s);
    if (!p) continue;
    const vx = p[0] - cx;
    const vy = p[1] - cy;
    const h = hexNorm(vx, vy);
    if (h < r0) continue;
    const k = Math.floor(Math.log(h / r0) / lq);
    const r = Math.min(h, r0 * q ** k + spread * (2 * hash13(i, seed, 2) - 1));
    const tx = cx + (vx * r) / h;
    const ty = cy + (vy * r) / h;
    if (Math.abs(tx) > hw + margin || Math.abs(ty) > hh + margin) continue;
    const a = angleOf(s, down);
    const b = angleOf(view.toDir(tx, ty), down);
    if (!(a - b > 1e-9)) continue;
    rho[i] = Math.sin(b) / Math.sin(a - b);
    ring[i] = k;
  }
  return { rho, ring };
}

// ------------------------------------------------------------------------------ shaders

const FULL = /* glsl */ `
varying vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;

// the eye's direction through a point of the frame (NDC), the shot's camera with its jitter
const VIEW = /* glsl */ `
uniform mat4 uInvProj; uniform mat3 uCamRot; uniform vec2 uRes;
vec3 viewDir(vec2 ndc){
  vec4 v = uInvProj*vec4(ndc, 1.0, 1.0);
  return normalize(uCamRot*normalize(v.xyz/v.w));
}`;

// the night behind the stars: f_planet's night() without its stars (f_sky's colour and Milky Way)
const SKY_FRAG = /* glsl */ `
${HASH}
${NOISE}
${VIEW}
uniform float uMilky; uniform vec3 uSkyCol, uGalN;
varying vec2 vNdc;
void main(){
  vec3 d = viewDir(vNdc);
  vec3 c = uSkyCol;
  float b = dot(d, uGalN);
  float band = exp(-b*b/0.03);
  float mott = 0.55 + 0.9*fbm3(d*5.0) - 0.35*smoothstep(0.55, 0.8, vnoise(d*11.0 + 4.0));
  float lane = 1.0 - 0.6*exp(-pow((b - 0.02)/0.035, 2.0))*smoothstep(0.35, 0.65, vnoise(d*3.0 + 9.0));
  c += vec3(0.62, 0.66, 0.78)*(uMilky*band*max(mott, 0.0)*lane);
  gl_FragColor = vec4(c, 1.0);
}`;

// A star: its direction from the eye now, the point it is (position: its direction from the first
// pose; aRho: its distance from there over the eye's whole travel, 0 as far as the sky) less the eye's
// travel so far (uMove, over the whole travel). Its light is starsE's: a gaussian in angle (σ uSig, uSigPx
// in this render's pixels) whose energy is what one pixel of the 4K frame gives it (uE = pxE²/(2πσ²);
// uPk = uE·uStarI, the peak of a unit of flux), drawn out to where it falls under 1e-5.
const STAR_VERT = /* glsl */ `
uniform vec3 uMove; uniform float uSigPx, uPk;
attribute float aRho, aFlux; attribute vec3 aTint;
varying vec3 vDir, vCol;
void main(){
  vec3 d = aRho > 0.0 ? normalize(aRho*position - uMove) : position;
  vDir = d;
  vCol = aTint*aFlux;
  gl_Position = projectionMatrix*vec4(mat3(viewMatrix)*d, 1.0);
  gl_PointSize = 2.0*ceil(uSigPx*sqrt(2.0*log(max(aFlux*uPk, 1.0e-5)/1.0e-5))) + 3.0;
}`;
// A scrim (uScrim) dims them across a band of the frame's height (uBand: its soft edges, as shares of the
// height): where a card's words sit.
const STAR_FRAG = /* glsl */ `
${VIEW}
uniform float uSig, uE, uStarI, uScrim; uniform vec4 uBand;
varying vec3 vDir, vCol;
void main(){
  vec3 x = cross(vDir, viewDir(gl_FragCoord.xy/uRes*2.0 - 1.0));
  float y = gl_FragCoord.y/uRes.y;
  float band = smoothstep(uBand.x, uBand.y, y)*(1.0 - smoothstep(uBand.z, uBand.w, y));
  gl_FragColor = vec4(vCol*(exp(-dot(x, x)/(2.0*uSig*uSig))*uE*uStarI*(1.0 - uScrim*band)), 1.0);
}`;

// The Earth from its target: the square's left and bottom edges and side (pixels of the frame) and the
// mip level to read it at; its cover of the pixel from the disc's rim (the angular radius uRad about the
// centre's direction uEc, a pixel being uPx), so it hides the stars behind it; premultiplied.
const EARTH_FRAG = /* glsl */ `
${VIEW}
uniform sampler2D uImp, uImp2; uniform vec4 uBox, uBox2; uniform float uMix;
uniform vec3 uEc; uniform float uRad, uPx, uFade;
varying vec2 vNdc;
void main(){
  vec2 uv = (gl_FragCoord.xy - uBox.xy)/uBox.z;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  vec3 c = textureLod(uImp, uv, uBox.w).rgb;
  if (uMix > 0.0) {
    // the half-size target (its square inside the first), faded in over FADE
    vec2 v = (gl_FragCoord.xy - uBox2.xy)/uBox2.z;
    bool inside = v.x >= 0.0 && v.y >= 0.0 && v.x <= 1.0 && v.y <= 1.0;
    c = mix(c, inside ? textureLod(uImp2, v, uBox2.w).rgb : vec3(0.0), uMix);
  }
  vec3 d = viewDir(vNdc);
  float a = clamp((uRad - atan(length(cross(d, uEc)), dot(d, uEc)))/uPx + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(c, a)*uFade;
}`;

// the lighthouses: f_planet's beacon(), the same point and glow (b.z: how visible, times the low haze's
// transmittance down to it, which s45 put on them)
const BEACON_FRAG = /* glsl */ `
uniform vec3 uLime, uB0, uB1; uniform float uRef, uFlare;
vec3 beacon(vec3 b){
  if (b.z <= 0.0) return vec3(0.0);
  vec2 r = (gl_FragCoord.xy - b.xy)/uRef;
  float r2 = dot(r, r);
  float v = max(4.84, 0.5625/(uRef*uRef));
  return uLime*(b.z*(6.0*(4.84/v)*exp(-0.5*r2/v) + uFlare*(0.3*exp(-r2/128.0) + 0.04*exp(-r2/1800.0))));
}
void main(){ gl_FragColor = vec4(beacon(uB0) + beacon(uB1), 1.0); }`;

// ------------------------------------------------------------------------------ the cosmos

const DEG = Math.PI / 180;
const tri = () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  return g;
};
// light added (the frame's alpha left as it is), and premultiplied over
const ADD = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};
const OVER = { ...ADD, blendDst: THREE.OneMinusSrcAlphaFactor };
const smooth = (a, b, x) => {
  const u = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return u * u * (3 - 2 * u);
};
// f_planet's low haze (scale height 8 km): its transmittance down to a point of the ground seen at cos
// zenith mu there, from far above (hazeUp(RK, mu); the eye's own end of the column is nil out here)
const chap = (x, mu) => {
  const s = Math.sqrt(0.5 * x);
  const y = mu * s;
  return (2 * s) / (y + Math.sqrt(y * y + 1.2732395));
};
export const hazeDown = (k, mu) => Math.exp(-k * 8 * chap(6371 / 8, mu));
// the Earth's size (of its first) over which its 2 × 2 target is faded in over the 1:1 one
const FADE = [0.5, 0.85];

const _p = new THREE.Vector3();
const _e = new THREE.Vector3();
const _n = new THREE.Vector3();

// The frame: the night, the stars, the Earth, the lighthouses (in that order, each over the last), all
// on the far plane (no depth written: f_mblur takes the stars as infinitely far, the Earth's pixels on
// its sphere).
export class Cosmos {
  // planet: s45's Planet, built with a sky that has no stars or Milky Way (its target holds the Earth
  // alone); sky: f_sky's uniforms (the night's colour, the Milky Way, the stars' intensity); stars:
  // starField()'s; size: the Earth's target (texels a side, a power of two); ref: { theta, altitude },
  // the Earth's angular radius and the eye's height at the first frame, where a texel of the target is a
  // pixel of the frame
  constructor({ planet, sky, stars, size, ref }) {
    this.planet = planet;
    this.N = size;
    this.levels = Math.log2(size);
    if (!Number.isInteger(this.levels)) throw new Error(`[f_cosmos] the Earth's target is ${size} a side, not a power of two`);
    this.ref = ref;
    this.drawn = false;
    const view = {
      uInvProj: { value: new THREE.Matrix4() },
      uCamRot: { value: new THREE.Matrix3() },
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    this.view = view;
    this.scene = new THREE.Scene();
    const full = (frag, uniforms, blend, order) => {
      const m = new THREE.Mesh(
        tri(),
        new THREE.ShaderMaterial({ uniforms: { ...view, ...uniforms }, vertexShader: FULL, fragmentShader: frag, depthTest: false, depthWrite: false, ...blend }),
      );
      m.frustumCulled = false;
      m.renderOrder = order;
      this.scene.add(m);
      return m;
    };
    this.night = full(SKY_FRAG, { uMilky: sky.uMilky, uSkyCol: sky.uSkyCol, uGalN: sky.uGalN }, { blending: THREE.NoBlending }, 0);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(stars.dir, 3));
    g.setAttribute('aFlux', new THREE.BufferAttribute(stars.flux, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(stars.tint, 3));
    this.rho = new THREE.BufferAttribute(new Float32Array(stars.n), 1);
    g.setAttribute('aRho', this.rho);
    this.starU = {
      ...view,
      uMove: { value: new THREE.Vector3() },
      uSig: { value: 1e-4 },
      uSigPx: { value: 0.75 },
      uE: { value: 1 },
      uPk: { value: 1 },
      uStarI: sky.uStarI,
      uScrim: { value: 0 },
      uBand: { value: new THREE.Vector4(0.34, 0.42, 0.58, 0.66) },
    };
    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({ uniforms: this.starU, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, depthTest: false, depthWrite: false, ...ADD }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.scene.add(this.points);

    // the Earth's targets, mip-mapped (its picture made smaller as it shrinks), and the cameras that fill
    // them: the second only while the first half-size is faded in (FADE)
    const target = () =>
      new THREE.WebGLRenderTarget(size, size, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: true,
        colorSpace: THREE.NoColorSpace,
      });
    this.rt = target();
    this.rt2 = target();
    this.icam = new THREE.PerspectiveCamera();
    this.icam2 = new THREE.PerspectiveCamera();
    this.passes = [];
    this.iscene = new THREE.Scene();
    planet.mesh.visible = true;
    this.iscene.add(planet.mesh);
    this.earthU = {
      uImp: { value: this.rt.texture },
      uImp2: { value: this.rt2.texture },
      uBox: { value: new THREE.Vector4() },
      uBox2: { value: new THREE.Vector4() },
      uMix: { value: 0 },
      uEc: { value: new THREE.Vector3() },
      uRad: { value: 0 },
      uPx: { value: 1 },
      uFade: { value: 0 },
    };
    this.earth = full(EARTH_FRAG, this.earthU, OVER, 2);
    this.beamU = {
      uLime: planet.uniforms.uLime,
      uB0: { value: new THREE.Vector3() },
      uB1: { value: new THREE.Vector3() },
      uRef: { value: 1 },
      uFlare: { value: 1 },
    };
    this.beams = full(BEACON_FRAG, this.beamU, ADD, 3);
  }

  // each star's distance (hexLayout's rho)
  setLayout(rho) {
    this.rho.array.set(rho);
    this.rho.needsUpdate = true;
  }

  // camera: the shot's (no jitter: s45's planet took none); width, height: the render's pixels; T: s45's
  // clock (the planet's); shutter: this sample's; move: the eye's travel so far over the whole (a vector);
  // scrim: how far the stars are dimmed across the band (STAR_FRAG)
  update(camera, { width, height, T, shutter, move, scrim = 0 }) {
    const P = this.planet;
    camera.updateMatrixWorld(true);
    const V = this.view;
    V.uInvProj.value.copy(camera.projectionMatrixInverse);
    V.uCamRot.value.setFromMatrix4(camera.matrixWorld);
    V.uRes.value.set(width, height);
    const pxAng = (2 * Math.tan((camera.fov * DEG) / 2)) / (camera.zoom * height);
    const pxE = (pxAng * width) / 3840;
    // the stars: starsE's light
    const S = this.starU;
    const sig = Math.max(pxAng * 0.75, 2e-5);
    S.uMove.value.copy(move);
    S.uSig.value = sig;
    S.uSigPx.value = sig / pxAng;
    S.uE.value = (pxE * pxE) / (6.2832 * sig * sig);
    S.uPk.value = S.uE.value * S.uStarI.value;
    S.uScrim.value = scrim;

    // the Earth: its centre's direction and its angular radius from the eye, in double
    const { center, radius } = P.sphere;
    const c = camera.position;
    const ex = center.x - c.x;
    const ey = center.y - c.y;
    const ez = center.z - c.z;
    const D = Math.hypot(ex, ey, ez);
    const rad = Math.asin(radius / D);
    const E = this.earthU;
    E.uEc.value.set(ex / D, ey / D, ez / D);
    E.uRad.value = rad;
    E.uPx.value = pxAng;
    E.uFade.value = smooth(1, 2, rad / pxE); // gone under two pixels of the 4K frame across
    this.earth.visible = this.drawn = E.uFade.value > 0;
    this.centre = null;
    this.passes.length = 0;
    E.uMix.value = 0;
    if (this.drawn) {
      // its square on screen (s pixels a side), the target the frame's own pixels there through the same
      // lens, its detail held at the first frame's (uRef: the footprint's scale). The square is N/2^k
      // pixels, k the times the Earth has halved since the first frame: a pixel of the frame is then
      // exactly 2^k × 2^k texels, and mip level k (their box average) is read at its texel's centre,
      // with no resampling. At k = 0 a texel is a pixel, so the cut's frame is s45's whatever the
      // shutter's samples.
      // The one step that would show is the first, a texel a pixel giving way to 2 × 2 (the 1:1 picture
      // grows aliased as its held detail shrinks): over FADE that half-size target is drawn as well and
      // faded in, so the change is spread over some seven frames.
      const N = this.N;
      const x = rad / this.ref.theta;
      const k = Math.min(this.levels, Math.max(0, Math.floor(-Math.log2(x))));
      _p.set(c.x + ex / D, c.y + ey / D, c.z + ez / D).project(camera);
      const cx = ((_p.x + 1) / 2) * width;
      const cy = ((1 - _p.y) / 2) * height;
      this.centre = [cx, cy, rad / pxAng];
      const detail = (width / 1920) * (this.ref.altitude / (D - radius)); // uRef for a pixel of the frame
      const pass = (ic, rt, k) => {
        const s = N / 2 ** k;
        const x0 = Math.round(cx - s / 2);
        const y0 = Math.round(cy - s / 2);
        ic.fov = camera.fov;
        ic.zoom = camera.zoom;
        ic.near = camera.near;
        ic.far = camera.far;
        ic.filmGauge = camera.filmGauge;
        ic.filmOffset = camera.filmOffset;
        ic.position.copy(c);
        ic.quaternion.copy(camera.quaternion);
        ic.setViewOffset(width, height, x0, y0, s, s);
        ic.updateMatrixWorld(true);
        this.passes.push({ ic, rt, args: { width: width * 2 ** k, height: height * 2 ** k, t: T, shutter }, ref: detail * 2 ** k });
        return [x0, height - y0 - s, s, k];
      };
      E.uBox.value.set(...pass(this.icam, this.rt, k));
      if (k === 0 && x < FADE[1]) {
        E.uBox2.value.set(...pass(this.icam2, this.rt2, 1));
        E.uMix.value = 1 - smooth(FADE[0], FADE[1], x);
      }
      this.setPass(this.passes[0]); // the second's uniforms are set as it is drawn (renderEarth)
    }

    // the lighthouses, as f_planet places them: on screen, faded in over their horizon, under the haze
    const B = this.beamU;
    B.uRef.value = width / 1920;
    B.uFlare.value = 1;
    const k = P.uniforms.uHazeK.value;
    [B.uB0, B.uB1].forEach((u, i) => {
      const p = P.beacons[i];
      _e.copy(c).sub(p);
      const sinEl = _n.copy(p).sub(center).dot(_e) / (radius * _e.length());
      const front = _n.copy(p).applyMatrix4(camera.matrixWorldInverse).z < 0;
      _n.copy(p).project(camera);
      const vis = front ? smooth(-0.002, 0.012, sinEl) * hazeDown(k, Math.max(sinEl, 0)) : 0;
      u.value.set(((_n.x + 1) / 2) * width, ((_n.y + 1) / 2) * height, vis);
    });
  }

  // the Earth into its target (before the frame is drawn)
  // a pass's camera and detail into the planet's uniforms (the lighthouses are the frame's own: below)
  setPass({ ic, args, ref }) {
    const U = this.planet.uniforms;
    this.planet.update(ic, args);
    U.uRef.value = ref;
    U.uB0.value.z = 0;
    U.uB1.value.z = 0;
  }

  renderEarth(renderer) {
    if (!this.drawn) return;
    const target = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    renderer.autoClear = true;
    this.passes.forEach((p, i) => {
      if (i > 0) this.setPass(p);
      renderer.setRenderTarget(p.rt);
      renderer.render(this.iscene, p.ic);
    });
    if (this.passes.length > 1) this.setPass(this.passes[0]);
    renderer.setRenderTarget(target);
    renderer.autoClear = autoClear;
  }
}
