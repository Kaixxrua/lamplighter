// Pages: thousands of loose leaves. The flood of Act I, the storm the sweep freezes at the ignition,
// the sky lanterns of Act IV. One InstancedMesh of a subdivided leaf, bent per instance in the
// vertex shader (a cylindrical bend that keeps arc length, plus twist, curl and a travelling ripple).
//
// Light is computed per vertex for both faces of the leaf: the library's lamps (shaft lamps of three
// floors, gallery lamps of the leaf's own floor), the scan sheet and the lantern. Paper is thin, so a
// face also receives a share of the light falling on the other face, darkened where the other face
// carries ink: a leaf between the camera and a lamp glows and shows its reverse side's text.
//
// Motion is CPU-side and pure in t (see fall() and rise()): each leaf's path is a function of its
// index, a seed and time, so any frame renders identically and a shot can freeze time per leaf.
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { ATLAS } from './pageatlas.js';
import { hash } from '../runtime/lib/rng.js';

export const PAGE = { W: 0.3, H: 0.42 };

const VERT = /* glsl */ `
attribute vec4 aShape;   // bend (1/m, about the leaf's vertical axis), twist (1/m²), curl (1/m), ripple amplitude
attribute vec4 aLook;    // design, seed, lime, glow
attribute vec4 aFx;      // burn, ripple phase, -, -
uniform vec2 uPageSize;
uniform vec3 uKeyPos, uKeyCol; uniform float uKeyR;
varying vec2 vUv; varying vec3 vW; varying vec3 vEF; varying vec3 vEB; varying vec4 vLook; varying vec2 vFx;

// Irradiance on both faces of a thin leaf at P with front normal N.
void leafLight(vec3 P, vec3 N, out vec3 eF, out vec3 eB){
  eF = vec3(0.0); eB = vec3(0.0);
  float k = floor((P.y + 1e-3)/uH);
  for (int dk = -1; dk <= 1; dk++){
    float kk = k + float(dk);
    vec3 cs = lampRGB(floorState(kk))*uShaftK;
    for (int i = 0; i < 6; i++){
      vec3 dl = shaftLampPos(kk, i) - P;
      float d2 = dot(dl, dl);
      float ndl = dot(N, dl)*inversesqrt(d2);
      vec3 e = cs*(lampVar(kk, 12 + i)/(d2 + 0.3));
      eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
    }
  }
  vec3 cg = lampRGB(floorState(k));
  for (int j = 0; j < 12; j++){
    vec3 dl = galleryLampPos(k, j) - P;
    float d2 = dot(dl, dl);
    float ndl = dot(N, dl)*inversesqrt(d2);
    vec3 e = cg*(lampVar(k, j)/(d2 + 0.3));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  if (uBeamI > 0.0){
    vec3 dir = vec3(P.x - uBeamO.x, 0.0, P.z - uBeamO.z);
    dir /= max(length(dir), 1e-3);
    float ndl = dot(N, -dir);
    vec3 e = uBeamCol*(uBeamI*sweep(P));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  if (uLHFill.r + uLHFill.g + uLHFill.b > 0.0){
    vec3 dl = uBeamO - P;
    float d2 = dot(dl, dl);
    float ndl = dot(N, dl)*inversesqrt(d2);
    float c = dot(normalize(P.xz - uBeamO.xz), vec2(cos(uBeamAng), sin(uBeamAng)));
    float shade = smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
    vec3 e = uLHFill*(shade*lanternFan(P, 0.08)/(d2 + 1.0));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  // an optional key light of the shot's own (a reader's lamp, a printing light), off by default
  if (uKeyCol.r + uKeyCol.g + uKeyCol.b > 0.0){
    vec3 dl = uKeyPos - P;
    float d2 = dot(dl, dl);
    float ndl = dot(N, dl)*inversesqrt(d2);
    vec3 e = uKeyCol/(d2 + uKeyR*uKeyR);
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
}

void main(){
  vec2 q = position.xy*uPageSize;                 // leaf coordinates (m), centre at the origin
  float kb = aShape.x;
  float th = kb*q.x;
  vec3 p = abs(kb) > 1e-3 ? vec3(sin(th)/kb, q.y, (1.0 - cos(th))/kb) : vec3(q.x, q.y, 0.5*kb*q.x*q.x);
  vec3 n = vec3(-sin(th), 0.0, cos(th));
  vec3 tx = vec3(cos(th), 0.0, sin(th));
  float ph = 6.2831853*(0.7*q.x/uPageSize.x + q.y/uPageSize.y) + aFx.y;
  float rip = aShape.w*uPageSize.x;
  float h = aShape.y*q.x*q.y + 0.5*aShape.z*q.y*q.y + rip*sin(ph);
  float hx = aShape.y*q.y + rip*cos(ph)*6.2831853*0.7/uPageSize.x;
  float hy = aShape.y*q.x + aShape.z*q.y + rip*cos(ph)*6.2831853/uPageSize.y;
  p += n*h;
  n = normalize(n - hx*tx - hy*vec3(0.0, 1.0, 0.0));
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec4 w = modelMatrix*im*vec4(p, 1.0);
  vec3 N = normalize(mat3(modelMatrix)*mat3(im)*n);
  vW = w.xyz;
  vUv = uv;
  vLook = aLook;
  vFx = aFx.xy;
  leafLight(vW, N, vEF, vEB);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
#ifdef HERO
uniform sampler2D uHero;   // a shot's own front face (same channels as the atlas), e.g. redrawn every frame
#endif
uniform vec3 uPaper, uPaperOld, uRubric, uGlowCol;
uniform float uTrans, uLimeI, uGlowI, uBurnI;
varying vec2 vUv; varying vec3 vW; varying vec3 vEF; varying vec3 vEB; varying vec4 vLook; varying vec2 vFx;

vec3 atlasMask(float d, vec2 uv){
  float col = mod(d, ${ATLAS.COLS}.0), row = floor(d/${ATLAS.COLS}.0);
  vec2 inset = vec2(${(2 / ATLAS.W).toFixed(5)}, ${(2 / ATLAS.H).toFixed(5)});
  uv = clamp(uv, inset, 1.0 - inset);
  return texture(uAtlas, vec2((col + uv.x)/${ATLAS.COLS}.0, (${ATLAS.ROWS - 1}.0 - row + uv.y)/${ATLAS.ROWS}.0)).rgb;
}

void main(){
  bool front = gl_FrontFacing;
  float seed = vLook.y;
  float dF = vLook.x, dB = mod(vLook.x + 7.0, 16.0);   // the reverse of a leaf carries another design
  vec2 uvF = vUv, uvB = vec2(1.0 - vUv.x, vUv.y);
  vec3 m  = front ? atlasMask(dF, uvF) : atlasMask(dB, uvB);
  vec3 mo = front ? atlasMask(dB, uvB) : atlasMask(dF, uvF);   // the other side, seen through the paper
#ifdef HERO
  vec3 hm = texture(uHero, uvF).rgb;
  if (front) m = hm; else mo = hm;
#endif

  // paper: fresh machine-white to old and foxed, darker toward the edges
  float age = fract(seed*7.13);
  vec3 paper = mix(uPaper, uPaperOld, age*age);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  paper *= mix(0.72, 1.0, smoothstep(0.0, 0.045, e)*(0.7 + 0.3*(1.0 - age)) + 0.3*(1.0 - age));
  float fox = smoothstep(0.74, 0.86, vnoise2(vUv*vec2(9.0, 12.6) + seed*31.0))*age;
  paper *= 1.0 - fox*vec3(0.22, 0.32, 0.45);
  float px = length(fwidth(vUv));
  paper *= 1.0 + 0.08*(vnoise2(vUv*vec2(260.0, 364.0) + seed*13.0) - 0.5)*(1.0 - smoothstep(0.002, 0.008, px));

  vec3 albedo = paper*(1.0 - 0.93*m.r);
  albedo = mix(albedo, uRubric, m.g*0.88);
  albedo *= 1.0 - 0.42*m.b;
  vec3 eNear = front ? vEF : vEB;
  vec3 eFar  = front ? vEB : vEF;
  float through = uTrans*(1.0 - 0.85*mo.r)*(1.0 - 0.3*mo.b)*(1.0 - 0.4*m.r);
  vec3 c = albedo*(eNear + eFar*through) + uAmb*albedo*20.0;

  // a lit leaf: the paper glows lime, the ink stays dark and readable
  float lime = vLook.z;
  c += uLitCol*(lime*uLimeI*(1.0 - 0.92*m.r)*(1.0 - 0.3*m.b)*(0.7 + 0.3*smoothstep(0.0, 0.06, e)));
  // a sky lantern: lit from within, brightest low in its curve
  float glow = vLook.w;
  c += uGlowCol*(glow*uGlowI*(0.45 + 0.55*(1.0 - vUv.y))*(1.0 - 0.7*m.r)*(0.6 + 0.4*smoothstep(0.0, 0.1, e)));
  // burning into light: holes open from the edges inward, rimmed with lime
  float burn = vFx.x;
  if (burn > 0.0){
    float n = 0.6*vnoise2(vUv*vec2(5.0, 7.0) + seed*17.0) + 0.25*vnoise2(vUv*vec2(19.0, 26.6) + seed*5.0) + 0.15*smoothstep(0.0, 0.25, e);
    if (n < burn*1.05) discard;
    float rim = 1.0 - smoothstep(0.0, 0.05, n - burn*1.05);
    c += uLitCol*(rim*uBurnI*smoothstep(0.0, 0.05, burn));
  }
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

export function pageUniforms(atlas) {
  return {
    uAtlas: { value: atlas },
    uPageSize: { value: new THREE.Vector2(PAGE.W, PAGE.H) },
    uPaper: { value: new THREE.Color(0.64, 0.62, 0.56) }, // new paper (linear albedo; the lamps are calibrated for books and stone)
    uPaperOld: { value: new THREE.Color(0.44, 0.35, 0.22) },
    uRubric: { value: new THREE.Color(0.32, 0.03, 0.02) },
    uTrans: { value: 0.32 },
    uLimeI: { value: 1.2 },
    uGlowCol: { value: new THREE.Color(0.78, 1.0, 0.25) },
    uGlowI: { value: 2.0 },
    uBurnI: { value: 12.0 },
    uKeyPos: { value: new THREE.Vector3() }, // the shot's own key light (radiant intensity, linear RGB); 0 = off
    uKeyCol: { value: new THREE.Color(0, 0, 0) },
    uKeyR: { value: 0.1 }, // softening radius (m)
  };
}

// State of one leaf, filled by a motion function and written by Pages.set().
export function leafState() {
  return {
    x: 0, y: 0, z: 0,
    q: new THREE.Quaternion(),
    scale: 1,
    bend: 0, twist: 0, curl: 0, ripple: 0, phase: 0,
    design: 0, seed: 0, lime: 0, glow: 0, burn: 0,
    visible: true,
  };
}

// hero: an optional texture for the front face of every leaf in this mesh (a page a shot draws itself);
// the reverse still comes from the atlas, design (d + 7) % 16.
export class Pages {
  constructor({ uniforms, atlas, count = 1000, seg = [6, 8], size = [PAGE.W, PAGE.H], hero = null }) {
    const geo = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
    this.shape = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.fx = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for (const a of [this.shape, this.look, this.fx]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aShape', this.shape);
    geo.setAttribute('aLook', this.look);
    geo.setAttribute('aFx', this.fx);
    const own = pageUniforms(atlas);
    own.uPageSize.value.set(size[0], size[1]);
    if (hero) own.uHero = { value: hero };
    this.uniforms = { ...own, ...uniforms };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: LIB_COMMON + VERT,
      fragmentShader: LIB_COMMON + FRAG,
      side: THREE.DoubleSide,
      defines: hero ? { HERO: '' } : {},
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.capacity = count;
    this.st = leafState();
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  set(i, s) {
    const m = this._m;
    if (!s.visible) {
      m.makeScale(0, 0, 0);
    } else {
      this._p.set(s.x, s.y, s.z);
      this._s.setScalar(s.scale);
      m.compose(this._p, s.q, this._s);
    }
    this.mesh.setMatrixAt(i, m);
    const i4 = i * 4;
    const sh = this.shape.array;
    const lk = this.look.array;
    const fx = this.fx.array;
    sh[i4] = s.bend;
    sh[i4 + 1] = s.twist;
    sh[i4 + 2] = s.curl;
    sh[i4 + 3] = s.ripple;
    lk[i4] = s.design;
    lk[i4 + 1] = s.seed;
    lk[i4 + 2] = s.lime;
    lk[i4 + 3] = s.glow;
    fx[i4] = s.burn;
    fx[i4 + 1] = s.phase;
  }

  // Run a motion function over the first n leaves; each(i, st) may adjust a leaf before it is written.
  fill(n, t, motion, opts, each = null) {
    const st = this.st;
    n = Math.min(n, this.capacity);
    for (let i = 0; i < n; i++) {
      st.visible = true;
      st.lime = st.glow = st.burn = 0;
      motion(i, t, opts, st);
      if (each) each(i, st);
      this.set(i, st);
    }
    this.mesh.count = n;
    this.commit();
  }

  commit() {
    this.mesh.instanceMatrix.needsUpdate = true;
    this.shape.needsUpdate = true;
    this.look.needsUpdate = true;
    this.fx.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------ motion

const TAU = Math.PI * 2;
const lerp = (a, b, u) => a + (b - a) * u;
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Q_FLAT = new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2); // leaf lying face up

// Base position of leaf i in an annulus around (cx, cz), turning with an optional swirl.
function annulus(i, t, o, h, st) {
  const r = Math.sqrt(lerp(o.r0 * o.r0, o.r1 * o.r1, h(3)));
  const a = h(4) * TAU + (o.swirl ? (o.swirl * t * 4) / (4 + r) : 0);
  st.x = (o.cx ?? 0) + r * Math.cos(a);
  st.z = (o.cz ?? 0) + r * Math.sin(a);
}

// A leaf falling through a column: the pendulum flutter of paper (it swings, rocking, along a
// slowly turning plane; lowest and fastest mid-swing), or for a share of leaves, tumbling about the
// long axis. Leaves wrap from the bottom of [y0, y1] to its top, so keep both ends out of frame.
//   o = { seed, y0, y1, r0, r1, cx?, cz?, speed: [lo, hi] m/s, swirl? rad/s, flutter? (1),
//         tumble? share (0.18), designs? [..], scale? [lo, hi] }
export function fall(i, t, o, st) {
  const h = (k) => hash(i, o.seed, k);
  const span = o.y1 - o.y0;
  const v = lerp(o.speed?.[0] ?? 0.55, o.speed?.[1] ?? 1.05, h(1));
  annulus(i, t, o, h, st);
  st.y = o.y1 - ((((h(2) * span + v * t) % span) + span) % span);
  const T = lerp(1.7, 3.4, h(5));
  const w = TAU / T;
  const ph = h(6) * TAU + w * t;
  const A = lerp(0.18, 0.6, h(7)) * (o.flutter ?? 1);
  const psi = h(8) * TAU + 0.25 * (h(9) - 0.5) * t;
  const s = Math.sin(ph);
  st.x += A * s * Math.cos(psi);
  st.z += A * s * Math.sin(psi);
  st.y += 0.16 * A * s * s;
  const yaw = h(10) * TAU + 0.5 * (h(11) - 0.5) * t;
  if (h(12) < (o.tumble ?? 0.18)) {
    // autorotation about the long axis
    const spin = (h(13) < 0.5 ? -1 : 1) * lerp(3.5, 8, h(14)) * t + h(15) * TAU;
    _q.setFromAxisAngle(Y, yaw);
    _q2.setFromAxisAngle(X, -Math.PI / 2);
    st.q.copy(_q).multiply(_q2);
    _q2.setFromAxisAngle(Y, spin);
    st.q.multiply(_q2);
  } else {
    // rocking about the axis across the swing, plus a resting tilt
    _q.setFromAxisAngle(Y, yaw);
    st.q.copy(_q).multiply(Q_FLAT);
    _ax.set(-Math.sin(psi), 0, Math.cos(psi));
    _q2.setFromAxisAngle(_ax, lerp(0.35, 0.95, h(16)) * s + (h(17) - 0.5) * 0.7);
    st.q.premultiply(_q2);
  }
  st.scale = lerp(o.scale?.[0] ?? 0.9, o.scale?.[1] ?? 1.1, h(18));
  st.bend = (h(19) - 0.5) * 3.0 + 1.1 * Math.sin(ph + 1.3);
  st.twist = (h(20) - 0.5) * 6.0;
  st.curl = (h(21) - 0.5) * 2.4;
  st.ripple = lerp(0.01, 0.035, h(22));
  st.phase = h(23) * TAU + 9 * t;
  st.design = o.designs ? o.designs[Math.floor(h(24) * o.designs.length)] : Math.floor(h(24) * 16);
  st.seed = h(25);
}

// A leaf rising like a sky lantern: upright, curled into a half tube, swaying, lit from within.
//   o = { seed, y0, y1, r0, r1, cx?, cz?, speed: [lo, hi], glow: [lo, hi], swirl? }
export function rise(i, t, o, st) {
  const h = (k) => hash(i, o.seed, k);
  const span = o.y1 - o.y0;
  const v = lerp(o.speed?.[0] ?? 0.35, o.speed?.[1] ?? 0.8, h(1));
  annulus(i, t, o, h, st);
  st.y = o.y0 + ((((h(2) * span + v * t) % span) + span) % span);
  const w = TAU / lerp(4, 7.5, h(5));
  const ph = h(6) * TAU + w * t;
  st.x += 0.12 * Math.sin(ph);
  st.z += 0.12 * Math.cos(ph * 0.8);
  _q.setFromAxisAngle(Y, h(10) * TAU + (h(11) - 0.5) * 0.6 * t);
  _ax.set(1, 0, 0);
  _q2.setFromAxisAngle(_ax, 0.12 * Math.sin(ph));
  st.q.copy(_q).multiply(_q2);
  st.scale = lerp(0.9, 1.1, h(18));
  st.bend = lerp(7, 10, h(19));
  st.twist = 0;
  st.curl = (h(21) - 0.5) * 0.6;
  st.ripple = 0.006;
  st.phase = h(23) * TAU + 2 * t;
  st.design = o.designs ? o.designs[Math.floor(h(24) * o.designs.length)] : Math.floor(h(24) * 16);
  st.seed = h(25);
  st.glow = lerp(o.glow?.[0] ?? 0.6, o.glow?.[1] ?? 1.0, h(26));
}
