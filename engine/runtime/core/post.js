// Post-production stack. Order:
//   scene HDR (linear) → [depth of field] → bloom pyramid (+ halation, anamorphic streaks)
//   → exposure / white balance / vignette → ACES → sRGB → primary grade        (internal resolution)
//   → lens distortion + chromatic aberration + upscale → title cards → fade → letterbox → grain
//   → the shot's margin print (over the bars, grained like the picture)
//   → 10-bit pack (x2rgb10le)                                                  (output resolution)
import * as THREE from 'three';
import { COLOR, HASH } from '../lib/glsl.js';

const VERT = /* glsl */ `precision highp float;
in vec3 position;
out vec2 vUv;
void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const HEAD = /* glsl */ `precision highp float; precision highp int; precision highp sampler2D;
in vec2 vUv; out vec4 fragColor;
`;

function pass(frag, uniforms, extra = {}) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: HEAD + frag,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    ...extra,
  });
}

function target(w, h, { type = THREE.HalfFloatType, depth = false, filter = THREE.LinearFilter } = {}) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type,
    format: THREE.RGBAFormat,
    depthBuffer: depth,
    stencilBuffer: false,
    minFilter: filter,
    magFilter: filter,
    generateMipmaps: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    colorSpace: THREE.NoColorSpace,
  });
  return t;
}

// Film grain tile: 1024² RGBA, roughly gaussian, lightly clumped. R/G = luma layers, B/A = chroma.
function makeGrainTexture() {
  const N = 1024;
  const raw = new Float32Array(N * N * 4);
  let a = 0x2f6b1d3 >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < raw.length; i += 2) {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    const r = Math.sqrt(-2 * Math.log(u));
    raw[i] = r * Math.cos(2 * Math.PI * v);
    raw[i + 1] = r * Math.sin(2 * Math.PI * v);
  }
  // clump: 3x3 weighted blur with wraparound
  const out = new Uint8Array(N * N * 4);
  const w = [0.25, 0.5, 0.25];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      for (let c = 0; c < 4; c++) {
        let acc = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = (y + dy + N) % N;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = (x + dx + N) % N;
            acc += raw[(yy * N + xx) * 4 + c] * w[dx + 1] * w[dy + 1];
          }
        }
        // blurred gaussian has sigma ~0.375; renormalise to ~1 then map ±3 sigma into 0..255
        out[(y * N + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(128 + (acc / 0.375) * 40)));
      }
    }
  }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function hashf(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x27d4eb2f, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const BLANK = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

// ---------------------------------------------------------------- shaders

const FS_COPY = /* glsl */ `
uniform sampler2D src; uniform float weight;
void main(){ fragColor = vec4(texture(src, vUv).rgb * weight, 1.0); }`;

const FS_ADD = /* glsl */ `
uniform sampler2D src; uniform sampler2D add;
void main(){ fragColor = vec4(texture(src, vUv).rgb + texture(add, vUv).rgb, 1.0); }`;

// Window depth in 24 bits over three bytes, for a readback (depthProbe).
const FS_DEPTH24 = /* glsl */ `
uniform sampler2D depthTex;
void main(){
  float d = min(texture(depthTex, vUv).x, 0.99999994);
  vec3 e = fract(d * vec3(1.0, 255.0, 65025.0));
  e.xy -= e.yz / 255.0;
  fragColor = vec4(e, 1.0);
}`;

const FS_DOWN = COLOR + /* glsl */ `
uniform sampler2D src; uniform vec2 texel; uniform int karis;
vec3 s(vec2 o){ return texture(src, vUv + o*texel).rgb; }
void main(){
  vec3 a=s(vec2(-2, 2)), b=s(vec2(0, 2)), c=s(vec2(2, 2));
  vec3 d=s(vec2(-2, 0)), e=s(vec2(0, 0)), f=s(vec2(2, 0));
  vec3 g=s(vec2(-2,-2)), h=s(vec2(0,-2)), i=s(vec2(2,-2));
  vec3 j=s(vec2(-1, 1)), k=s(vec2(1, 1)), l=s(vec2(-1,-1)), m=s(vec2(1,-1));
  vec3 col;
  if (karis == 1) {
    vec3 g0=(a+b+d+e)*0.25, g1=(b+c+e+f)*0.25, g2=(d+e+g+h)*0.25, g3=(e+f+h+i)*0.25, g4=(j+k+l+m)*0.25;
    float w0=0.125/(1.0+luma(g0)), w1=0.125/(1.0+luma(g1)), w2=0.125/(1.0+luma(g2)), w3=0.125/(1.0+luma(g3)), w4=0.5/(1.0+luma(g4));
    col = (g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4);
  } else {
    col = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  }
  fragColor = vec4(max(col, 0.0), 1.0);
}`;

const FS_UP = /* glsl */ `
uniform sampler2D src; uniform sampler2D base; uniform vec2 texel; uniform float radius;
void main(){
  vec2 o = texel * radius;
  vec3 c = texture(src, vUv + vec2(-o.x,  o.y)).rgb
         + texture(src, vUv + vec2( 0.0,  o.y)).rgb * 2.0
         + texture(src, vUv + vec2( o.x,  o.y)).rgb
         + texture(src, vUv + vec2(-o.x,  0.0)).rgb * 2.0
         + texture(src, vUv).rgb * 4.0
         + texture(src, vUv + vec2( o.x,  0.0)).rgb * 2.0
         + texture(src, vUv + vec2(-o.x, -o.y)).rgb
         + texture(src, vUv + vec2( 0.0, -o.y)).rgb * 2.0
         + texture(src, vUv + vec2( o.x, -o.y)).rgb;
  fragColor = vec4(c/16.0 + texture(base, vUv).rgb, 1.0);
}`;

const FS_STREAK_PRE = COLOR + /* glsl */ `
uniform sampler2D src; uniform float threshold;
void main(){
  vec3 c = texture(src, vUv).rgb; float l = luma(c);
  float k = max(l - threshold, 0.0) / max(l, 1e-4);
  fragColor = vec4(c*k, 1.0);
}`;

const FS_STREAK = /* glsl */ `
uniform sampler2D src; uniform vec2 texel; uniform float stepPx; uniform float decay;
void main(){
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int k = -4; k <= 4; k++) {
    float w = pow(decay, abs(float(k)));
    acc += texture(src, vUv + vec2(float(k)*stepPx*texel.x, 0.0)).rgb * w;
    wsum += w;
  }
  fragColor = vec4(acc/wsum, 1.0);
}`;

// Depth of field: thin-lens circle of confusion, half-resolution gather (anamorphic oval bokeh).
const DOF_COMMON = /* glsl */ `
uniform sampler2D depthTex; uniform float near; uniform float far;
uniform float focus; uniform float lensK; uniform float maxR;
float linDepth(vec2 uv){
  float d = texture(depthTex, uv).r;
  float ndc = d*2.0 - 1.0;
  return (2.0*near*far)/(far + near - ndc*(far - near));
}
// signed CoC radius in output pixels: negative = in front of the focus plane
float cocAt(vec2 uv){
  float D = linDepth(uv);
  float c = lensK * (D - focus) / D;
  return clamp(c, -maxR, maxR);
}`;

const FS_DOF_PRE = DOF_COMMON + /* glsl */ `
uniform sampler2D src; uniform vec2 texel; uniform float scale;
void main(){
  vec3 c = (texture(src, vUv + texel*vec2(-0.5,-0.5)).rgb + texture(src, vUv + texel*vec2(0.5,-0.5)).rgb
          + texture(src, vUv + texel*vec2(-0.5,0.5)).rgb + texture(src, vUv + texel*vec2(0.5,0.5)).rgb) * 0.25;
  float coc = cocAt(vUv);
  // near field: take the most negative CoC of the 2x2 footprint so foreground blur can spill
  coc = min(coc, min(cocAt(vUv + texel*vec2(-0.5,-0.5)), cocAt(vUv + texel*vec2(0.5,0.5))));
  fragColor = vec4(c, coc*scale);
}`;

const FS_DOF_GATHER = /* glsl */ `
uniform sampler2D src; uniform vec2 texel; uniform float maxR; uniform float radScale; uniform vec2 aniso;
void main(){
  vec4 c0 = texture(src, vUv);
  float centerSize = abs(c0.a);
  vec3 col = c0.rgb; float tot = 1.0;
  float radius = radScale; float ang = 0.0;
  float nearMax = min(c0.a, 0.0);
  for (int i = 0; i < 400; i++) {
    if (radius >= maxR) break;
    vec2 off = vec2(cos(ang), sin(ang)) * radius * aniso;
    vec4 s = texture(src, vUv + off*texel);
    float sSize = abs(s.a);
    if (s.a > c0.a) sSize = min(sSize, centerSize*2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, sSize);
    col += mix(col/tot, s.rgb, m);
    tot += 1.0;
    if (s.a < 0.0 && -s.a > radius) nearMax = min(nearMax, s.a);
    ang += 2.39996323;
    radius += radScale / radius;
  }
  fragColor = vec4(col/tot, min(c0.a, nearMax) );
}`;

const FS_DOF_MIX = DOF_COMMON + /* glsl */ `
uniform sampler2D sharp; uniform sampler2D blurred; uniform float scale;
void main(){
  vec3 s = texture(sharp, vUv).rgb;
  vec4 b = texture(blurred, vUv);
  float coc = abs(cocAt(vUv));
  float spill = b.a < 0.0 ? -b.a/scale : 0.0;   // near-field blur bleeding over sharp background
  float t = smoothstep(0.6, 2.2, max(coc, spill));
  fragColor = vec4(mix(s, b.rgb, t), 1.0);
}`;

const FS_GRADE = COLOR + /* glsl */ `
uniform sampler2D hdr; uniform sampler2D bloom; uniform sampler2D halo; uniform sampler2D streak;
uniform float bloomStrength; uniform float bloomNorm;
uniform float haloStrength; uniform float haloThreshold; uniform vec3 haloTint;
uniform float streakStrength; uniform vec3 streakTint;
uniform float exposure; uniform vec3 wb;
uniform float vignette; uniform float vigPower; uniform float aspect;
uniform vec3 lift; uniform vec3 gammaV; uniform vec3 gain;
uniform float saturation; uniform float contrast;
uniform vec3 shadowTint; uniform vec3 highlightTint;
uniform float blackPoint;
void main(){
  vec3 c = texture(hdr, vUv).rgb;
  vec3 b = texture(bloom, vUv).rgb * bloomNorm;
  c = mix(c, b, bloomStrength);
  vec3 h = texture(halo, vUv).rgb; float hl = luma(h);
  c += haloTint * max(hl - haloThreshold, 0.0) * haloStrength;
  c += texture(streak, vUv).rgb * streakTint * streakStrength;
  c *= exp2(exposure) * wb;
  vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
  float r2 = dot(d, d);
  c *= mix(1.0, pow(1.0/(1.0 + r2*1.6), vigPower), vignette);
  c = acesFitted(c);
  c = srgbEncode(c);
  c = max(c * gain + lift * (1.0 - c), 0.0);
  c = pow(c, 1.0 / gammaV);
  c = (c - 0.5) * contrast + 0.5;
  float L = luma(clamp(c, 0.0, 1.0));
  c += shadowTint * (1.0 - smoothstep(0.0, 0.55, L)) + highlightTint * smoothstep(0.45, 1.0, L);
  c = mix(vec3(luma(c)), c, saturation);
  c = (c - blackPoint) / (1.0 - blackPoint);
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const FS_OUTPUT = HASH + /* glsl */ `
uniform sampler2D disp; uniform vec2 dispSize; uniform vec2 outSize; uniform int upscale;
uniform float ca; uniform float distortion; uniform vec2 weave;
uniform sampler2D card0; uniform float card0a; uniform sampler2D card1; uniform float card1a;
uniform float fade; uniform float letterbox; uniform float barMax;
uniform float grainAmt; uniform float grainSize; uniform float grainChroma; uniform float frame;
uniform sampler2D grainTex; uniform vec2 grainOffA; uniform vec2 grainOffB;
uniform sampler2D margin; uniform float marginA;
uniform int pack;

vec3 catmullRom(vec2 uv){
  vec2 samplePos = uv * dispSize;
  vec2 tp1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - tp1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 tp0 = (tp1 - 1.0) / dispSize;
  vec2 tp3 = (tp1 + 2.0) / dispSize;
  vec2 tp12 = (tp1 + w2 / w12) / dispSize;
  vec3 r = texture(disp, vec2(tp0.x, tp0.y)).rgb * w0.x * w0.y
         + texture(disp, vec2(tp12.x, tp0.y)).rgb * w12.x * w0.y
         + texture(disp, vec2(tp3.x, tp0.y)).rgb * w3.x * w0.y
         + texture(disp, vec2(tp0.x, tp12.y)).rgb * w0.x * w12.y
         + texture(disp, vec2(tp12.x, tp12.y)).rgb * w12.x * w12.y
         + texture(disp, vec2(tp3.x, tp12.y)).rgb * w3.x * w12.y
         + texture(disp, vec2(tp0.x, tp3.y)).rgb * w0.x * w3.y
         + texture(disp, vec2(tp12.x, tp3.y)).rgb * w12.x * w3.y
         + texture(disp, vec2(tp3.x, tp3.y)).rgb * w3.x * w3.y;
  return clamp(r, 0.0, 1.0);
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = (px + weave) / outSize;
  float aspect = outSize.x / outSize.y;
  vec2 cc = (uv - 0.5) * vec2(aspect, 1.0);
  float rc2 = 0.25*(aspect*aspect + 1.0);
  vec2 duv = 0.5 + (uv - 0.5) * (1.0 + distortion*dot(cc, cc)) / (1.0 + distortion*rc2);
  vec3 c;
  if (upscale == 1) c = catmullRom(duv); else c = texture(disp, duv).rgb;
  if (ca > 0.0) {
    c.r = texture(disp, 0.5 + (duv - 0.5)*(1.0 + ca)).r;
    c.b = texture(disp, 0.5 + (duv - 0.5)*(1.0 - ca)).b;
  }
  if (card0a > 0.0) { vec4 k = texture(card0, uv); c = c*(1.0 - k.a*card0a) + k.rgb*card0a; }
  if (card1a > 0.0) { vec4 k = texture(card1, uv); c = c*(1.0 - k.a*card1a) + k.rgb*card1a; }
  c *= 1.0 - fade;
  // film grain: luminance grain + a little chroma, strongest in the mid-tones
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec4 gA = texture(grainTex, (px / grainSize + grainOffA) / 1024.0);
  vec4 gB = texture(grainTex, (px / (grainSize*1.37) + grainOffB) / 1024.0);
  float g = (gA.r - 0.5) + 0.6*(gB.g - 0.5);
  vec3 gc = vec3(gA.g, gA.b, gA.a) - 0.5;
  float amp = grainAmt * (0.18 + 3.2*L*(1.0 - L));
  c += amp * 2.2 * (g + grainChroma * gc);
  float bar = floor(letterbox * barMax + 0.5);
  if (px.y < bar || px.y > outSize.y - bar) c = vec3(0.0);
  // a shot's print on the margins of the film (s11's edge print): over the bars, and on the film,
  // so it weaves and takes the grain like the picture
  if (marginA > 0.0) {
    vec4 k = texture(margin, uv);
    c = c*(1.0 - k.a*marginA) + k.rgb*marginA;
    float Lm = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += k.a * marginA * grainAmt * (0.18 + 3.2*Lm*(1.0 - Lm)) * 2.2 * (g + grainChroma * gc);
  }
  c = clamp(c, 0.0, 1.0);
  if (pack == 1) {
    uvec3 q = uvec3(c * 1023.0 + 0.5);
    uint b0 = q.b & 255u;
    uint b1 = (q.b >> 8u) | ((q.g & 63u) << 2u);
    uint b2 = (q.g >> 6u) | ((q.r & 15u) << 4u);
    uint b3 = (q.r >> 4u);
    fragColor = vec4(float(b0), float(b1), float(b2), float(b3)) / 255.0;
  } else {
    fragColor = vec4(c, 1.0);
  }
}`;

// ---------------------------------------------------------------- defaults

export const POST_DEFAULTS = {
  exposure: 0, // EV
  whiteBalance: { temperature: 0, tint: 0 }, // -1..1
  bloom: { strength: 0.045, radius: 1.0 },
  halation: { strength: 0.22, threshold: 0.85, tint: [1.0, 0.36, 0.14] },
  streak: { strength: 0.0, threshold: 2.0, tint: [0.75, 0.85, 1.0], length: 1.0, decay: 0.82 },
  dof: null, // { focus: m, fstop: 2.0, maxBlur: 0.012 (fraction of output width), scale: 0.5 }
  vignette: { strength: 0.55, power: 2.0 },
  grade: {
    lift: [0, 0, 0],
    gamma: [1, 1, 1],
    gain: [1, 1, 1],
    saturation: 1.0,
    contrast: 1.0,
    shadowTint: [0, 0, 0],
    highlightTint: [0, 0, 0],
    blackPoint: 0.0,
  },
  lens: { ca: 0.0006, distortion: 0.035, weave: 0 },
  grain: { strength: 0.055, size: 1.4, chroma: 0.22 },
  letterbox: null, // 0..1 (1 = 2.39:1); null → film timeline decides
  fade: 0, // 0..1 to black
};

export function mergePost(...layers) {
  const out = structuredClone(POST_DEFAULTS);
  for (const L of layers) {
    if (!L) continue;
    for (const [k, v] of Object.entries(L)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
        out[k] = { ...out[k], ...v };
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- pipeline

export class Post {
  constructor(renderer, { inW, inH, outW, outH, bloomLevels = 7, dofQuality = 1 }) {
    this.r = renderer;
    this.inW = inW;
    this.inH = inH;
    this.outW = outW;
    this.outH = outH;
    this.dofQuality = dofQuality;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geo);
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene();
    this.qscene.add(this.quad);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // scene target with depth texture (for DoF), accumulation target
    this.sceneRT = target(inW, inH, { depth: true });
    this.sceneRT.depthTexture = new THREE.DepthTexture(inW, inH);
    this.sceneRT.depthTexture.type = THREE.UnsignedIntType;
    this.accumRT = target(inW, inH);
    this.dofOut = target(inW, inH);

    // bloom pyramid
    this.down = [];
    this.up = [];
    let w = inW >> 1;
    let h = inH >> 1;
    for (let i = 0; i < bloomLevels && w >= 4 && h >= 4; i++) {
      this.down.push(target(w, h));
      this.up.push(target(w, h));
      w >>= 1;
      h >>= 1;
    }
    // streaks at quarter resolution
    const sw = Math.max(4, inW >> 2);
    const sh = Math.max(4, inH >> 2);
    this.streakA = target(sw, sh);
    this.streakB = target(sw, sh);

    this.dispRT = target(inW, inH);
    this.outRT = target(outW, outH, { type: THREE.UnsignedByteType, filter: THREE.NearestFilter });

    this.m = {
      copy: pass(FS_COPY, { src: { value: null }, weight: { value: 1 } }),
      add: pass(FS_ADD, { src: { value: null }, add: { value: null } }),
      accum: pass(FS_COPY, { src: { value: null }, weight: { value: 1 } }, {
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      }),
      depth24: pass(FS_DEPTH24, { depthTex: { value: null } }),
      down: pass(FS_DOWN, { src: { value: null }, texel: { value: new THREE.Vector2() }, karis: { value: 0 } }),
      up: pass(FS_UP, {
        src: { value: null },
        base: { value: null },
        texel: { value: new THREE.Vector2() },
        radius: { value: 1 },
      }),
      streakPre: pass(FS_STREAK_PRE, { src: { value: null }, threshold: { value: 2 } }),
      streak: pass(FS_STREAK, {
        src: { value: null },
        texel: { value: new THREE.Vector2() },
        stepPx: { value: 1 },
        decay: { value: 0.8 },
      }),
      dofPre: pass(FS_DOF_PRE, this._dofUniforms({ src: { value: null }, texel: { value: new THREE.Vector2() }, scale: { value: 0.5 } })),
      dofGather: pass(FS_DOF_GATHER, {
        src: { value: null },
        texel: { value: new THREE.Vector2() },
        maxR: { value: 8 },
        radScale: { value: 1 },
        aniso: { value: new THREE.Vector2(0.72, 1.0) },
      }),
      dofMix: pass(FS_DOF_MIX, this._dofUniforms({ sharp: { value: null }, blurred: { value: null }, scale: { value: 0.5 } })),
      grade: pass(FS_GRADE, {
        hdr: { value: null },
        bloom: { value: null },
        halo: { value: null },
        streak: { value: null },
        bloomStrength: { value: 0 },
        bloomNorm: { value: 1 },
        haloStrength: { value: 0 },
        haloThreshold: { value: 1 },
        haloTint: { value: new THREE.Vector3(1, 0.3, 0.1) },
        streakStrength: { value: 0 },
        streakTint: { value: new THREE.Vector3(1, 1, 1) },
        exposure: { value: 0 },
        wb: { value: new THREE.Vector3(1, 1, 1) },
        vignette: { value: 0 },
        vigPower: { value: 2 },
        aspect: { value: inW / inH },
        lift: { value: new THREE.Vector3() },
        gammaV: { value: new THREE.Vector3(1, 1, 1) },
        gain: { value: new THREE.Vector3(1, 1, 1) },
        saturation: { value: 1 },
        contrast: { value: 1 },
        shadowTint: { value: new THREE.Vector3() },
        highlightTint: { value: new THREE.Vector3() },
        blackPoint: { value: 0 },
      }),
      output: pass(FS_OUTPUT, {
        disp: { value: null },
        dispSize: { value: new THREE.Vector2(inW, inH) },
        outSize: { value: new THREE.Vector2(outW, outH) },
        upscale: { value: inW !== outW || inH !== outH ? 1 : 0 },
        ca: { value: 0 },
        distortion: { value: 0 },
        weave: { value: new THREE.Vector2() },
        card0: { value: BLANK },
        card0a: { value: 0 },
        card1: { value: BLANK },
        card1a: { value: 0 },
        fade: { value: 0 },
        letterbox: { value: 0 },
        barMax: { value: (outH - outW / 2.39) / 2 },
        grainAmt: { value: 0 },
        grainSize: { value: 1.4 },
        grainChroma: { value: 0.2 },
        frame: { value: 0 },
        grainTex: { value: makeGrainTexture() },
        grainOffA: { value: new THREE.Vector2() },
        grainOffB: { value: new THREE.Vector2() },
        margin: { value: BLANK },
        marginA: { value: 0 },
        pack: { value: 1 },
      }),
    };
  }

  nameMaterials() {
    for (const [k, m] of Object.entries(this.m)) m.name = k;
  }

  _dofUniforms(extra) {
    return {
      depthTex: { value: null },
      near: { value: 0.1 },
      far: { value: 1000 },
      focus: { value: 5 },
      lensK: { value: 0 },
      maxR: { value: 16 },
      ...extra,
    };
  }

  draw(material, rt) {
    this.quad.material = material;
    this.r.setRenderTarget(rt);
    this.r.render(this.qscene, this.qcam);
    if (this.prof) {
      const byte = rt.texture.type === THREE.UnsignedByteType;
      this.r.readRenderTargetPixels(rt, 0, 0, 1, 1, byte ? new Uint8Array(4) : new Uint16Array(4));
      const now = performance.now();
      const key = material.name || material.uuid.slice(0, 4);
      this.prof[key] = (this.prof[key] || 0) + (now - this.profT);
      this.profT = now;
    }
  }

  // Accumulate one HDR sample (sceneRT) into accumRT with weight w; first sample overwrites.
  // With overlay, the overlay sample (ovRT) is accumulated into ovAccumRT the same way.
  accumulate(first, w, overlay = false) {
    const m = first ? this.m.copy : this.m.accum;
    m.uniforms.weight.value = w;
    // the additive samples must land on what is already there: with autoClear on (the renderer's
    // default, which film.js restores after each scene render) the target is cleared to the clear
    // colour first, leaving clearColor + w * lastSample instead of the average
    const autoClear = this.r.autoClear;
    this.r.autoClear = first;
    m.uniforms.src.value = this.sceneRT.texture;
    this.draw(m, this.accumRT);
    if (overlay) {
      m.uniforms.src.value = this.ovRT.texture;
      this.draw(m, this.ovAccumRT);
    }
    this.r.autoClear = autoClear;
  }

  // The scene's depth, drawn small and read back: { data, width, height }, four bytes a pixel, rows from
  // the bottom, window depth = (r + g / 255 + b / 65025) / 255. Targets made on first use.
  depthProbe(scene, camera) {
    const W = 192;
    const H = Math.max(2, Math.round((W * this.inH) / this.inW));
    if (!this.probeRT) {
      this.probeRT = target(W, H, { depth: true });
      this.probeRT.depthTexture = new THREE.DepthTexture(W, H);
      this.probeRT.depthTexture.type = THREE.UnsignedIntType;
      this.probeOut = target(W, H, { type: THREE.UnsignedByteType, filter: THREE.NearestFilter });
      this.probeBuf = new Uint8Array(W * H * 4);
    }
    this.r.setRenderTarget(this.probeRT);
    this.r.setClearColor(0x000000, 1);
    this.r.clear(true, true, false);
    this.r.render(scene, camera);
    this.m.depth24.uniforms.depthTex.value = this.probeRT.depthTexture;
    this.draw(this.m.depth24, this.probeOut);
    this.r.readRenderTargetPixels(this.probeOut, 0, 0, W, H, this.probeBuf);
    return { data: this.probeBuf, width: W, height: H };
  }

  // The target a shot's overlay is drawn into, one sample at a time; made on first use, so shots
  // without an overlay allocate nothing.
  overlayTarget() {
    if (!this.ovRT) {
      this.ovRT = target(this.inW, this.inH);
      this.ovAccumRT = target(this.inW, this.inH);
      this.ovOut = target(this.inW, this.inH);
    }
    return this.ovRT;
  }

  // Run the full chain. src = HDR texture (scene or accumulated); overlay = the shot's overlay layer
  // (sample or accumulated), or null; margin = { tex, alpha } printed over the bars, or null.
  // Returns outRT.
  run(srcTex, p, { camera, frame, cards = [], letterbox = 0, pack = true, overlay = null, margin = null }) {
    const U = this.m;
    let hdr = srcTex;

    // ---- depth of field
    if (p.dof && camera && camera.isPerspectiveCamera) {
      hdr = this._dof(hdr, p.dof, camera);
    }

    // ---- the overlay: light added after depth of field, so it stays sharp over the blur
    if (overlay) {
      U.add.uniforms.src.value = hdr;
      U.add.uniforms.add.value = overlay;
      this.draw(U.add, this.ovOut);
      hdr = this.ovOut.texture;
    }

    // ---- bloom pyramid
    const n = this.down.length;
    for (let i = 0; i < n; i++) {
      const src = i === 0 ? hdr : this.down[i - 1].texture;
      const sw = i === 0 ? this.inW : this.down[i - 1].width;
      const sh = i === 0 ? this.inH : this.down[i - 1].height;
      U.down.uniforms.src.value = src;
      U.down.uniforms.texel.value.set(1 / sw, 1 / sh);
      U.down.uniforms.karis.value = i === 0 ? 1 : 0;
      this.draw(U.down, this.down[i]);
    }
    // up chain: up[n-1] = down[n-1]; up[i] = tent(up[i+1]) + down[i]
    U.copy.uniforms.src.value = this.down[n - 1].texture;
    U.copy.uniforms.weight.value = 1;
    this.draw(U.copy, this.up[n - 1]);
    for (let i = n - 2; i >= 0; i--) {
      const s = this.up[i + 1];
      U.up.uniforms.src.value = s.texture;
      U.up.uniforms.base.value = this.down[i].texture;
      U.up.uniforms.texel.value.set(1 / s.width, 1 / s.height);
      U.up.uniforms.radius.value = p.bloom.radius;
      this.draw(U.up, this.up[i]);
    }

    // ---- anamorphic streaks
    let streakTex = BLANK;
    if (p.streak && p.streak.strength > 0 && n > 1) {
      U.streakPre.uniforms.src.value = this.down[1].texture;
      U.streakPre.uniforms.threshold.value = p.streak.threshold;
      this.draw(U.streakPre, this.streakA);
      let a = this.streakA;
      let b = this.streakB;
      const steps = [1, 4, 16, 64];
      for (const st of steps) {
        U.streak.uniforms.src.value = a.texture;
        U.streak.uniforms.texel.value.set(1 / a.width, 1 / a.height);
        U.streak.uniforms.stepPx.value = st * p.streak.length * (this.streakA.width / 480); // the same reach at any width: calibrated at 1920
        U.streak.uniforms.decay.value = p.streak.decay;
        this.draw(U.streak, b);
        [a, b] = [b, a];
      }
      streakTex = a.texture;
    }

    // ---- grade
    const G = U.grade.uniforms;
    G.hdr.value = hdr;
    G.bloom.value = this.up[0].texture;
    G.bloomNorm.value = 1 / n;
    G.bloomStrength.value = p.bloom.strength;
    G.halo.value = (this.down[1] || this.down[0]).texture;
    G.haloStrength.value = p.halation.strength;
    G.haloThreshold.value = p.halation.threshold;
    G.haloTint.value.fromArray(p.halation.tint);
    G.streak.value = streakTex;
    G.streakStrength.value = streakTex === BLANK ? 0 : p.streak.strength;
    G.streakTint.value.fromArray(p.streak.tint);
    G.exposure.value = p.exposure;
    const T = p.whiteBalance.temperature || 0;
    const Ti = p.whiteBalance.tint || 0;
    G.wb.value.set(1 + 0.18 * T, 1 - 0.12 * Ti, 1 - 0.18 * T);
    G.vignette.value = p.vignette.strength;
    G.vigPower.value = p.vignette.power;
    G.lift.value.fromArray(p.grade.lift);
    G.gammaV.value.fromArray(p.grade.gamma);
    G.gain.value.fromArray(p.grade.gain);
    G.saturation.value = p.grade.saturation;
    G.contrast.value = p.grade.contrast;
    G.shadowTint.value.fromArray(p.grade.shadowTint);
    G.highlightTint.value.fromArray(p.grade.highlightTint);
    G.blackPoint.value = p.grade.blackPoint || 0;
    this.draw(U.grade, this.dispRT);

    // ---- output
    const O = U.output.uniforms;
    O.disp.value = this.dispRT.texture;
    O.ca.value = p.lens.ca;
    O.distortion.value = p.lens.distortion;
    const wv = p.lens.weave || 0;
    O.weave.value.set(wv * Math.sin(frame * 12.9898) * 0.7, wv * Math.sin(frame * 78.233 + 1.3) * 0.5);
    const [c0, c1] = cards;
    O.card0.value = c0 ? c0.tex : BLANK;
    O.card0a.value = c0 ? c0.alpha : 0;
    O.card1.value = c1 ? c1.tex : BLANK;
    O.card1a.value = c1 ? c1.alpha : 0;
    O.fade.value = p.fade;
    O.letterbox.value = letterbox;
    O.grainAmt.value = p.grain.strength;
    O.grainSize.value = p.grain.size * (this.outH / 2160);
    O.grainChroma.value = p.grain.chroma;
    O.frame.value = frame % 997;
    O.grainOffA.value.set(hashf(frame, 1) * 1024, hashf(frame, 2) * 1024);
    O.grainOffB.value.set(hashf(frame, 3) * 1024, hashf(frame, 4) * 1024);
    O.margin.value = margin ? margin.tex : BLANK;
    O.marginA.value = margin ? (margin.alpha ?? 1) : 0;
    O.pack.value = pack ? 1 : 0;
    this.draw(U.output, this.outRT);
    this.r.setRenderTarget(null);
    return this.outRT;
  }

  _dof(hdr, d, camera) {
    const U = this.m;
    const maxBlurPx = (d.maxBlur ?? 0.012) * this.inW;
    // keep the gather radius near 12 texels: big bokeh is gathered at lower resolution
    const scale = d.scale ?? Math.min(0.5, Math.max(0.25, 12 / Math.max(1, maxBlurPx)));
    const w = Math.max(4, Math.round(this.inW * scale));
    const h = Math.max(4, Math.round(this.inH * scale));
    if (!this.dofA || this.dofA.width !== w) {
      this.dofA?.dispose();
      this.dofB?.dispose();
      this.dofA = target(w, h);
      this.dofB = target(w, h);
    }
    const focalMm = camera.userData.focalMm || 35;
    const sensor = camera.userData.sensorWidth || 36;
    const f = focalMm / 1000;
    const N = d.fstop ?? 2.0;
    const S = d.focus;
    // CoC diameter on sensor: A f (D-S) / (D (S-f)), A = f/N. Radius in output-space pixels:
    const kSensor = ((f / N) * f) / Math.max(1e-4, S - f);
    const lensK = (0.5 * kSensor / (sensor / 1000)) * this.inW;
    const maxR = (d.maxBlur ?? 0.012) * this.inW;
    for (const m of [U.dofPre, U.dofMix]) {
      const u = m.uniforms;
      u.depthTex.value = this.sceneRT.depthTexture;
      u.near.value = camera.near;
      u.far.value = camera.far;
      u.focus.value = S;
      u.lensK.value = lensK;
      u.maxR.value = maxR;
      u.scale.value = scale;
    }
    U.dofPre.uniforms.src.value = hdr;
    U.dofPre.uniforms.texel.value.set(1 / this.inW, 1 / this.inH);
    this.draw(U.dofPre, this.dofA);
    const g = U.dofGather.uniforms;
    g.src.value = this.dofA.texture;
    g.texel.value.set(1 / w, 1 / h);
    g.maxR.value = maxR * scale;
    g.radScale.value = d.radScale ?? (this.dofQuality >= 1 ? 0.9 : 1.6);
    g.aniso.value.set(d.anamorphic === false ? 1 : 0.72, 1);
    this.draw(U.dofGather, this.dofB);
    U.dofMix.uniforms.sharp.value = hdr;
    U.dofMix.uniforms.blurred.value = this.dofB.texture;
    this.draw(U.dofMix, this.dofOut);
    return this.dofOut.texture;
  }
}
