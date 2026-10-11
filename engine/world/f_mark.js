// The AIGCNEWS mark as light, for the end of Act IV (s48, s49; Agent F). Drawn flat over the whole
// frame by one shader, from the lens's own LOGO constants (world/lighthouse.js, BIBLE §10): no image,
// no other drawing of the mark.
//
// Units are the favicon's (its 128-unit box; LOGO is in metres for the lens, LOGO / LH.LOGO gives these).
// The mark: an open ring R0–R1 over 90°…360° (the top right quadrant open, the ring's ends cut square
// on the two axes), a bar along 45° from BAR_A to BAR_B and BAR_W wide, and the dot, the lime gem, at
// 63.6 along 45° with radius 9. That is the favicon's place for the dot: LOGO.DOT_RHO (66.5) is the
// lens's, moved out there to clear the panel's rim. The mark's box is ±54 units both ways.
//
// The echo (s48): s16's ping, whose rings ran out across the lens, comes back. NA arcs, each a C like
// the ring (the same open quadrant, the same square ends), run in from beyond the frame: a sharp lime
// front with a wake behind it (outside it, as they run inward), the wake as long as the stretch the
// front covers in PERSIST s, so it draws in to a thin line as the arc slows; the light of an arc in
// flight rises as it closes in (a converging wave: (RM / r)^p). Arc k (k = 0 the innermost) comes to
// rest with its front on R0 + k·BAND at land[k], braking over its last stretch:
//   r(t) = a + V·τ·(√(1 + x²) − 1),  x = (land − t)/τ  (speed V far out, 0 on landing),
// so the train closes up against the ring, the first arc on its inner edge and each next one on the
// band outside it; at rest an arc's pulse dies away and its band, BAND wide, fills with the ring's own
// light. The NA bands (the lens's five Fresnel prisms) tile the ring: with the last one down, it is shut.
//
// The gem is a light: around it a faint lime halo, exp(−d/w) past its rim (uGlow). For s49's afterglow
// the mark's edges can be softened by uSoft units (the ring's, the bands', the bar's, the gem's and the
// C's square ends; the arcs' pulses keep the pixel's own filter).
//
// The shutter is integrated in the shader: each of the engine's samples covers its own share of the
// shutter (the shot passes it), NS stratified sub-times a pixel, jittered per pixel; edges are filtered
// over the pixel analytically (the engine's jitter is off: the frame is flat and its pixels exact).
import * as THREE from 'three';
import { LOGO, LH } from 'world/lighthouse.js';

const U = 1 / LH.LOGO; // metres (the lens) → favicon units
export const MARK = {
  R0: LOGO.R0 * U, // 36
  R1: LOGO.R1 * U, // 54
  BAR_A: LOGO.BAR_A * U, // −5.657
  BAR_B: LOGO.BAR_B * U, // 38.184
  BAR_W: LOGO.BAR_W * U, // 16.971
  DOT_R: LOGO.DOT_R * U, // 9
  DOT_RHO: 63.6, // the favicon's (see above)
  HALF: 54, // the box: ±54 units
};
export const NA = 5; // the arcs: one for each of the lens's Fresnel prisms
export const BAND = (MARK.R1 - MARK.R0) / NA;
const RM = 0.5 * (MARK.R0 + MARK.R1); // where an arc's light is uArc
const NS = 12; // sub-times per sample
const f = (v) => v.toFixed(5);

// The front of arc k at time t (units), and its speed (units/s): law = { V, tau }.
export function frontOf(k, t, land, law) {
  const a = MARK.R0 + k * BAND;
  const x = Math.max(land[k] - t, 0) / law.tau;
  const q = Math.sqrt(1 + x * x);
  return [a + law.V * law.tau * (q - 1), (law.V * x) / q];
}

const VERT = /* glsl */ `
void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }`;

const FRAG = /* glsl */ `
#define NA ${NA}
#define NS ${NS}
#define R0 ${f(MARK.R0)}
#define R1 ${f(MARK.R1)}
#define BAND ${f(BAND)}
#define RM ${f(RM)}
#define BA ${f(MARK.BAR_A)}
#define BB ${f(MARK.BAR_B)}
#define BW ${f(MARK.BAR_W)}
#define DR ${f(MARK.DOT_R)}
#define DRHO ${f(MARK.DOT_RHO)}
#define SQ 0.70710678
uniform vec2 uC;           // the mark's centre (px from the target's bottom left)
uniform float uK;          // px per unit
uniform float uT, uSh;     // this sample's time and its share of the shutter (s)
uniform float uSeed;
uniform float uLand[NA];   // when each arc comes to rest (s)
uniform vec4 uLaw;         // V (units/s), τ (s), PERSIST (s), the converging exponent p
uniform vec4 uPulse;       // the front's core width and the wake's floor (units), the wake's share, the pulse's decay at rest (s)
uniform vec3 uArc;         // an arc's light at RM
uniform float uFillT;      // how long a band takes to fill (s)
uniform vec3 uRing;        // the ring's own light (a full band)
uniform vec3 uBar;         // the bar's own light
uniform vec3 uBarF;        // the bar's light front along 45° at the shutter's two ends (units); the pulse's width
uniform vec3 uBarP;        // the pulse riding the bar's front
uniform vec3 uGem;         // the gem's light
uniform vec4 uGlow;        // the gem's halo: its light at the rim (rgb) and its fall-off width w (units)
uniform float uSoft;       // extra edge softness (units; 0 = the pixel's own)

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx)*0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y)*p3.z);
}
// the mean of exp(−u/w) (u ≥ 0; nothing ahead of u = 0) over a pixel centred on s
float boxExp(float s, float w, float px){
  float u0 = max(s - 0.5*px, 0.0), u1 = max(s + 0.5*px, 0.0);
  return w*(exp(-u0/w) - exp(-u1/w))/px;
}
// the share of a pixel centred on s that lies past an edge at 0
float edge(float s, float px){ return clamp(0.5 + s/px, 0.0, 1.0); }

// arc k at radius r and time t: its pulse (in units of uArc) and its band (in units of uRing)
vec2 arc(int k, float a, float r, float t, float px){
  float x = max(uLand[k] - t, 0.0)/uLaw.y;
  float q = sqrt(1.0 + x*x);
  float fr = a + uLaw.x*uLaw.y*(q - 1.0);
  float v = uLaw.x*x/q;
  float s = r - fr;
  float amp = pow(RM/fr, uLaw.w)*exp(-max(t - uLand[k], 0.0)/uPulse.w);
  float l = boxExp(s, uPulse.x, px) + uPulse.z*boxExp(s, uPulse.y + v*uLaw.z, px);
  float pe = px + uSoft;
  float band = (edge(r - a, pe) - edge(r - a - BAND, pe))*smoothstep(0.0, uFillT, t - uLand[k]);
  return vec2(amp*l, band);
}

void main(){
  float px = 1.0/uK;
  float pe = px + uSoft;
  vec2 p = (gl_FragCoord.xy - uC)*px;
  float r = length(p);
  vec3 c = vec3(0.0);

  // the C: everything but the open quadrant (its signed distance is > 0 outside it)
  float quad = (p.x >= 0.0 && p.y >= 0.0) ? -min(p.x, p.y) : length(min(p, vec2(0.0)));
  float cm = edge(quad, pe);
  if (cm > 0.0 && r > R0 - 2.0*pe) {
    float h = hash12(gl_FragCoord.xy + uSeed);
    float t0 = uT - 0.5*uSh, t1 = uT + 0.5*uSh;
    vec2 acc = vec2(0.0);
    for (int k = 0; k < NA; k++) {
      float a = R0 + float(k)*BAND;
      if (r < a - 2.0*pe) continue; // an arc never runs inside its own band
      // the front is at its farthest at the shutter's opening, and so is its wake at its longest
      float xa = max(uLand[k] - t0, 0.0)/uLaw.y;
      float qa = sqrt(1.0 + xa*xa);
      float far = a + uLaw.x*uLaw.y*(qa - 1.0);
      float reach = 10.0*max(uPulse.x, uPulse.y + uLaw.x*xa/qa*uLaw.z) + BAND + 2.0*pe;
      if (r > far + reach) continue;
      vec2 sum = vec2(0.0);
      for (int j = 0; j < NS; j++) {
        float t = uT + uSh*((float(j) + h)/float(NS) - 0.5);
        sum += arc(k, a, r, t, px);
      }
      acc += sum/float(NS);
    }
    c += cm*(uArc*acc.x + uRing*acc.y);
  }

  // the bar: lit behind its light front (the time it spends past each point, over the shutter)
  float ba = dot(p, vec2(SQ, SQ)), bb = dot(p, vec2(-SQ, SQ));
  float bsd = max(max(BA - ba, ba - BB), abs(bb) - 0.5*BW);
  float bcov = edge(-bsd, pe);
  if (bcov > 0.0) {
    float lit = clamp((uBarF.y - ba)/max(uBarF.y - uBarF.x, px), 0.0, 1.0);
    c += bcov*(uBar*lit + uBarP*boxExp(uBarF.y - ba, uBarF.z, px));
  }

  // the gem, hottest in its middle
  vec2 g = p - DRHO*vec2(SQ, SQ);
  float gd = length(g);
  float gcov = edge(DR - gd, pe);
  if (gcov > 0.0) c += uGem*(gcov*(1.0 - 0.3*min(gd*gd/(DR*DR), 1.0)));
  // its halo
  c += uGlow.rgb*exp(-max(gd - DR, 0.0)/max(uGlow.w, 1e-3));

  gl_FragColor = vec4(c, 1.0);
}`;

// The mark in a frame of its own: one triangle over the whole target and an orthographic camera (the
// shader works in the target's pixels). at: the mark's centre as shares of the frame (x from the left,
// y from the top); r1: the ring's outer radius as a share of the frame's height.
export class Mark {
  constructor({ width, height, at = [0.5, 0.5], r1 = 0.15 }) {
    this.width = width;
    this.height = height;
    this.unit = (r1 * height) / MARK.R1; // px per unit
    this.centre = [at[0] * width, (1 - at[1]) * height]; // px from the bottom left, as gl_FragCoord
    const v3 = () => ({ value: new THREE.Vector3() });
    this.u = {
      uC: { value: new THREE.Vector2(this.centre[0], this.centre[1]) },
      uK: { value: this.unit },
      uT: { value: 0 },
      uSh: { value: 0 },
      uSeed: { value: 0 },
      uLand: { value: new Array(NA).fill(1e6) },
      uLaw: { value: new THREE.Vector4(1, 1, 0, 0) },
      uPulse: { value: new THREE.Vector4(0.4, 0.4, 0, 1) },
      uArc: v3(),
      uFillT: { value: 0.1 },
      uRing: v3(),
      uBar: v3(),
      uBarF: { value: new THREE.Vector3(-1e3, -1e3, 1) },
      uBarP: v3(),
      uGem: v3(),
      uGlow: { value: new THREE.Vector4(0, 0, 0, 1) },
      uSoft: { value: 0 },
    };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false }),
    );
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  }

  // a point of the mark (units, y up) in the frame: px from the top left
  toFrame(x, y) {
    return [this.centre[0] + x * this.unit, this.height - (this.centre[1] + y * this.unit)];
  }

  // s: { t, sh, seed, land[NA], law: { V, tau, persist, p }, pulse: { core, floor, wake, decay }, fill,
  // arc, ring, bar, barP, gem: linear RGB arrays, barF: [front at the shutter's opening, at its close,
  // the pulse's width] (units), glow: [r, g, b, w] (the gem's halo), soft (units) }; anything left out
  // keeps its value
  set(s) {
    const u = this.u;
    if (s.t !== undefined) u.uT.value = s.t;
    if (s.sh !== undefined) u.uSh.value = s.sh;
    if (s.seed !== undefined) u.uSeed.value = s.seed;
    if (s.land) for (let k = 0; k < NA; k++) u.uLand.value[k] = s.land[k];
    if (s.law) u.uLaw.value.set(s.law.V, s.law.tau, s.law.persist, s.law.p);
    if (s.pulse) u.uPulse.value.set(s.pulse.core, s.pulse.floor, s.pulse.wake, s.pulse.decay);
    if (s.fill !== undefined) u.uFillT.value = s.fill;
    for (const [k, name] of [['arc', 'uArc'], ['ring', 'uRing'], ['bar', 'uBar'], ['barP', 'uBarP'], ['gem', 'uGem']]) {
      if (s[k]) u[name].value.fromArray(s[k]);
    }
    if (s.barF) u.uBarF.value.fromArray(s.barF);
    if (s.glow) u.uGlow.value.fromArray(s.glow);
    if (s.soft !== undefined) u.uSoft.value = s.soft;
  }
}
