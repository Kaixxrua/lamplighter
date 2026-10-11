// world/f_vest.js — s50's far vestibule: the Library at night, one lamp left burning, and the next reader.
//
// Across the shaft from s50's camera, on floor 0, side 1 (it faces −z): library.js's doorway, an arch
// 3.4 m wide springing at 3.4 m (crown 5.1) in the wall at z = 18.54, a barrel-vaulted vestibule 4.2 m deep,
// and in its back wall a little arch 1.4 m wide (crown 3.0) onto the passage to the next hexagon.
// Every lamp of the Library is out but one, left burning in that vestibule, hung from the crown of its vault
// the way the gallery lamps hang from the ceiling (rod, brass collar, frosted globe; card 7: it leaves a light
// on for the next reader). The next reader comes through the little arch: a point of the palette's steel
// (the machine readers' colour; E1's agent body is not delivered), with the light it casts and its ping.
//
// Floors 0 and +1 are library.js's own geometry (buildFloor: positions, normals and material ids; it makes no
// texture), drawn with a material of this file's own and lit by the lamp and the point alone: inside the
// vestibule nothing stands in their way; out in the gallery their light passes the mouth's arch or nothing;
// in the passage, the little arch. The Library class is not built (its constructor draws the inscription
// band's texture) and nothing here draws text: the slab's inscription band (MAT.FASCIA) is plain stone.
// The albedos are libshader.js's (stone, floor tiles, wood, plaster, ceiling), copied, since it does not
// export them; the lamps' light follows its law too (albedo × I·cos/d², plus GGX).
import * as THREE from 'three';
import { HASH, NOISE } from '../runtime/lib/glsl.js';
import { Builder, MAT } from './geo.js';
import { LIB } from './libshader.js';
import { buildFloor } from './library.js';

// library.js's doorway on side 1, in world terms (on side 1 a point `a` out along the normal and `s` along
// the side is (−s, y, a))
export const VEST = {
  af: LIB.AW - 0.46, // the wall face, the mouth (18.54)
  depth: 4.2,
  mouth: { r: 1.7, spring: 3.4 }, // half-width (= the radius of its round head), springing height
  arch: { r: 0.7, spring: 2.3 }, // the little arch in the back wall
  passage: 0.6, // from the back wall to library.js's dark quad behind the little arch
};
VEST.a1 = VEST.af + VEST.depth; // the back wall (22.74)
VEST.crown = VEST.mouth.spring + VEST.mouth.r; // 5.1

// the lamp left burning: halfway in, under the crown; a gallery lamp's globe, a little smaller
export const LAMP = { x: 0, y: 3.8, z: VEST.af + VEST.depth / 2, r: 0.22 };

// The lamp's fitting (as library.js hangs the gallery lamps: a rose on the vault, a rod, a brass collar) and
// the passage behind the little arch (library.js stops at the back wall: floor, walls and vault 0.6 m deep,
// up to its dark quad). The Library's own lamps keep their rods and collars (buildFloor's) and get no
// globes: they are out, and nothing here would show them.
function fittings() {
  const b = new Builder();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const c = V(LAMP.x, LAMP.y, LAMP.z);
  const k = LAMP.r / LIB.LAMP_R;
  const top = c.y + LAMP.r * 0.82;
  const collar = [[0.07, 0.0], [0.135, 0.035], [0.15, 0.075], [0.09, 0.11], [0.035, 0.15]].map(([r, y]) => [r * k, y * k]);
  b.lathe(c.clone().setY(top - 0.02 * k), collar, 16, MAT.BRASS);
  const rod0 = top + 0.13 * k;
  const rod1 = VEST.crown - 0.06;
  b.lathe(c.clone().setY(rod0), [[0.016, 0], [0.016, rod1 - rod0]], 6, MAT.BRASS);
  b.lathe(c.clone().setY(VEST.crown - 0.07), [[0.02, 0.0], [0.13, 0.0], [0.14, 0.03], [0.1, 0.07]], 12, MAT.BRASS);
  // the passage
  const { r, spring } = VEST.arch;
  const a1 = VEST.a1;
  const a2 = VEST.a1 + VEST.passage;
  const up = V(0, 1, 0);
  b.quadN(V(-r, 0, a1), V(r, 0, a1), V(r, 0, a2), V(-r, 0, a2), up, up, up, up, MAT.FLOOR);
  for (const sx of [-1, 1]) {
    const n = V(-sx, 0, 0);
    b.quadN(V(sx * r, 0, a1), V(sx * r, 0, a2), V(sx * r, spring, a2), V(sx * r, spring, a1), n, n, n, n, MAT.PLASTER);
  }
  const seg = 12;
  for (let j = 0; j < seg; j++) {
    const t0 = (Math.PI * j) / seg;
    const t1 = (Math.PI * (j + 1)) / seg;
    const n0 = V(-Math.cos(t0), -Math.sin(t0), 0);
    const n1 = V(-Math.cos(t1), -Math.sin(t1), 0);
    const p0 = [r * Math.cos(t0), spring + r * Math.sin(t0)];
    const p1 = [r * Math.cos(t1), spring + r * Math.sin(t1)];
    b.quadN(V(p0[0], p0[1], a1), V(p0[0], p0[1], a2), V(p1[0], p1[1], a2), V(p1[0], p1[1], a1), n0, n0, n1, n1, MAT.PLASTER);
  }
  return b.geometry();
}

const GLSL = HASH + NOISE + /* glsl */ `
#define PI 3.14159265359
float footprint(vec3 P){ return max(length(dFdx(P)), length(dFdy(P))); }

// ---- libshader.js's albedos
vec3 stoneAlbedo(vec3 P, vec3 N, float px){
  vec3 an = abs(N);
  vec2 q = an.y > 0.7 ? P.xz : (an.x > an.z ? P.zy : P.xy);
  float big = vnoise2(q*0.6 + 3.1);
  float mid = vnoise2(q*3.7);
  float fine = mix(vnoise2(q*31.0), 0.5, smoothstep(0.004, 0.02, px));
  vec3 base = vec3(0.34, 0.30, 0.245);
  float v = 0.72 + 0.34*big + 0.16*mid + 0.10*fine;
  float vn = vnoise2(q*vec2(1.3, 5.0) + big*2.0);
  float vein = smoothstep(0.482, 0.5, vn)*(1.0 - smoothstep(0.5, 0.518, vn));
  vein *= smoothstep(0.35, 0.7, vnoise2(q*0.7 + 13.0));
  return base*v*(1.0 - 0.25*vein);
}
vec4 floorTiles(vec3 P, float px){
  vec2 p = P.xz/0.62;
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r*0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = p - g;
  vec2 ag = abs(g);
  float edge = 0.5 - max(dot(ag, normalize(vec2(1.0, 1.7320508))), ag.x);
  float tj = floor(id.y/0.8660254 + 0.5);
  float ti = floor(id.x - 0.5*tj + 0.5);
  float tone = mod(ti - tj, 3.0);
  float t = hash12(vec2(ti, tj));
  float wear = vnoise2(P.xz*0.35);
  vec3 c = (tone < 0.5 ? 0.18 : (tone < 1.5 ? 0.15 : 0.122))*vec3(1.0, 0.9, 0.76);
  c *= 0.9 + 0.2*t + 0.12*(vnoise2(P.xz*2.3 + t*17.0) - 0.5);
  float grout = 1.0 - smoothstep(0.012, 0.012 + max(px/0.62, 0.004), edge);
  grout *= 1.0 - smoothstep(0.02, 0.08, px);
  c = mix(c, vec3(0.03, 0.028, 0.025), grout*0.85);
  float rough = mix(0.28, 0.55, wear) + grout*0.4;
  return vec4(c*(0.8 + 0.4*wear), rough);
}
vec3 woodAlbedo(vec3 P, vec3 N, float px){
  vec3 an = abs(N);
  vec2 q = an.y > 0.7 ? P.xz : (an.x > an.z ? P.zy : P.xy);
  float g = vnoise2(vec2(q.x*0.6, q.y*28.0));
  float fine = mix(vnoise2(vec2(q.x*3.0, q.y*140.0)), 0.5, smoothstep(0.002, 0.01, px));
  return vec3(0.085, 0.048, 0.026)*(0.65 + 0.55*g + 0.25*fine);
}
// GGX specular (normalised), Schlick Fresnel; includes N·L (libshader.js's)
vec3 ggx(vec3 N, vec3 V, vec3 L, float rough, vec3 f0){
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0), nv = max(dot(N, V), 1e-3), nl = max(dot(N, L), 0.0), vh = max(dot(V, H), 0.0);
  float a = rough*rough; float a2 = a*a;
  float d = nh*nh*(a2 - 1.0) + 1.0; float D = a2/(PI*d*d);
  float k = a*0.5; float vis = 0.25/((nl*(1.0 - k) + k)*(nv*(1.0 - k) + k));
  vec3 F = f0 + (1.0 - f0)*pow(1.0 - vh, 5.0);
  return D*vis*F*nl;
}
`;

const VERT = /* glsl */ `
attribute float mat;
varying vec3 vW; varying vec3 vN; varying float vMat;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vMat = mat;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
uniform vec4 uVest;                                          // mouth z, back wall z, crown, the balustrade's plinth z
uniform vec3 uLampP; uniform vec3 uLampI; uniform float uLampR; // the lamp: centre, intensity (linear RGB), globe radius
uniform vec3 uDotP; uniform vec3 uDotI; uniform float uDotR;    // the point
uniform vec3 uWaveP; uniform vec3 uWaveI; uniform vec3 uWave;   // the ping: origin, peak intensity; (s since, m/s, decay s)
uniform vec3 uBounce;                                        // what the vestibule's walls hand on to each other
varying vec3 vW; varying vec3 vN; varying float vMat;

// signed distance (m) from an arch's outline in its own plane: half-width r, springing s, round head
float archSD(vec2 p, float r, float s){
  return p.y > s ? length(vec2(p.x, p.y - s)) - r : max(abs(p.x) - r, -p.y);
}
// where a point is: 0 out in the Library (this side of the mouth), 1 in the vestibule, 2 in the passage
// behind the little arch, -1 in none of them (behind the walls)
int zone(vec3 P){
  if (P.z < uVest.x + 1e-3) return 0;
  if (P.z < uVest.y + 1e-3) return abs(P.x) < 1.701 && P.y > -0.01 && P.y < uVest.z + 0.01 ? 1 : -1;
  return abs(P.x) < 0.701 && P.y > -0.01 && P.y < 3.01 ? 2 : -1;
}
// the share of a ball of light (centre C, radius R) that an arch in the plane z = zc lets through to P
float archShare(vec3 P, vec3 C, float R, float zc, float r, float s){
  float t = clamp((zc - P.z)/(C.z - P.z), 0.0, 1.0);
  vec2 X = mix(P.xy, C.xy, t);
  float w = max(R*t, 0.003);
  return smoothstep(w, -w, archSD(X, r, s));
}
// The share of a ball of light (in the vestibule, or still in the passage) that P sees: all of it from the
// same room; from the next room, what the little arch between them lets through; from out in the Library,
// what passes the mouth (and the little arch before it, for a light in the passage); from behind the
// walls (and the other floors' vestibules), none. Nothing else casts a shadow.
float seen(vec3 P, vec3 C, float R){
  int zp = zone(P);
  if (zp < 0) return 0.0;
  bool deep = C.z >= uVest.y;
  float v = 1.0;
  if (zp == 0){
    v *= archShare(P, C, R, uVest.x, 1.7, 3.4);
    // the plinth of the balustrade across the doorway (0.16 m high, its inner face at z = uVest.w) stops
    // what would pass under it to the edge of the floor
    if (P.z < uVest.w) v *= smoothstep(0.15, 0.17, mix(P.y, C.y, (uVest.w - P.z)/(C.z - P.z)));
  }
  if ((zp == 2) != deep) v *= archShare(P, C, R, uVest.y, 0.7, 2.3);
  return v;
}
// a ball light's diffuse factor (cos/d², its horizon softened over the ball's angular radius) and 1/d²
vec2 ball(vec3 P, vec3 N, vec3 C, float R, out vec3 L){
  vec3 d = C - P; float d2 = dot(d, d);
  L = d*inversesqrt(d2);
  float ndl = dot(N, L);
  float s = min(R*inversesqrt(d2), 0.99);
  float c = ndl >= s ? ndl : (ndl > -s ? (ndl + s)*(ndl + s)/(4.0*s) : 0.0);
  float att = 1.0/(d2 + R*R);
  return vec2(c*att, att);
}

void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  float px = footprint(P);
  int m = int(vMat + 0.5);
  vec3 alb; vec3 f0 = vec3(0.04); float rough = 0.7;
  if (m == 0){ alb = stoneAlbedo(P, N, px); rough = 0.72; }
  else if (m == 1){ vec4 f = floorTiles(P, px); alb = f.rgb; rough = f.a; }
  else if (m == 2){ alb = woodAlbedo(P, N, px); rough = 0.45; }
  else if (m == 3){ alb = vec3(0.06, 0.04, 0.03); rough = 0.62; }           // books: never lit here
  else if (m == 4){ alb = vec3(0.045, 0.036, 0.028)*(0.8 + 0.4*vnoise2(P.xz*0.8)); rough = 0.9; }
  else if (m == 5){ alb = vec3(0.16, 0.14, 0.115)*(0.85 + 0.3*vnoise2(P.xy*1.7 + P.zz)); rough = 0.85; }
  else if (m == 6){ alb = vec3(0.03, 0.022, 0.012); f0 = vec3(0.78, 0.55, 0.26)*(0.75 + 0.35*vnoise2(P.xz*7.0 + P.yy*3.0)); rough = 0.32; }
  else if (m == 7){ alb = stoneAlbedo(P, N, px)*0.9; rough = 0.72; }       // the inscription band: plain stone
  else if (m == 8){ alb = vec3(0.004); rough = 0.9; }
  else if (m == 9){ alb = vec3(0.012); f0 = vec3(0.25); rough = 0.45; }
  else { alb = vec3(0.02); f0 = vec3(0.06); rough = 0.1; }
  int zn = zone(P);
  // out in the Library the dead lamps' brass would catch the light as specks a pixel wide: it does not
  if (m == 6 && zn == 0) f0 = vec3(0.0);

  vec3 c = vec3(0.0);
  vec3 L;
  vec2 k = ball(P, N, uLampP, uLampR, L);
  if (k.x > 0.0) c += uLampI*seen(P, uLampP, uLampR)*(k.x*alb + PI*k.y*ggx(N, V, L, rough, f0));
  if (uDotI.r + uDotI.g + uDotI.b > 0.0){
    k = ball(P, N, uDotP, uDotR, L);
    if (k.x > 0.0) c += uDotI*seen(P, uDotP, uDotR)*(k.x*alb + PI*k.y*ggx(N, V, L, rough, f0));
  }
  if (uWave.x > 0.0){
    // the ping: a shell of the point's light running out at uWave.y m/s, each surface lit as it passes
    float tau = uWave.x - distance(P, uWaveP)/uWave.y;
    float g = smoothstep(-0.04, 0.0, tau)*exp(-max(tau, 0.0)/uWave.z);
    k = ball(P, N, uWaveP, uDotR, L);
    // (matte: the floor's gloss would flash white under it)
    if (g > 1e-4 && k.x > 0.0) c += uWaveI*(g*seen(P, uWaveP, uDotR)*k.x)*alb;
  }
  if (zn > 0) c += uBounce*alb*(zn == 1 ? 1.0 : 0.35);
  gl_FragColor = vec4(c, 1.0);
}`;

// the lamp's globe: frosted glass lit from inside, a hot core where the bulb shows through (libshader.js's)
const GLOBE_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const GLOBE_FRAG = /* glsl */ `
uniform vec3 uCol;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float nv = max(dot(N, V), 0.0);
  float glass = 0.22 + 0.78*pow(nv, 0.8);
  float bulb = 2.2*pow(nv, 24.0) + 0.7*pow(nv, 5.0);
  gl_FragColor = vec4(uCol*(glass + bulb), 1.0);
}`;

// A light seen as a camera-facing quad: a Gaussian core and an exponential halo, added (depth-tested, so the
// walls in front cut it, never written). Sizes in metres; the core is kept from going under a pixel.
const SPRITE_VERT = /* glsl */ `
uniform vec3 uC; uniform float uR; uniform float uPull;
varying vec2 vQ;
void main(){
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 toCam = normalize(cameraPosition - uC);
  vec3 w = uC + toCam*uPull + (right*position.x + up*position.y)*uR;
  vQ = position.xy*uR;
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;
const SPRITE_FRAG = /* glsl */ `
uniform vec3 uCore; uniform float uSig; uniform vec3 uHalo; uniform float uHaloR; uniform float uR;
varying vec2 vQ;
void main(){
  float r = length(vQ);
  vec3 c = uCore*exp(-0.5*r*r/(uSig*uSig)) + uHalo*exp(-r/uHaloR);
  c *= 1.0 - smoothstep(0.55*uR, uR, r);
  gl_FragColor = vec4(c, 1.0);
}`;

function sprite(R, pull = 0) {
  const u = {
    uC: { value: new THREE.Vector3() },
    uR: { value: R },
    uPull: { value: pull },
    uCore: { value: new THREE.Color(0, 0, 0) },
    uSig: { value: 0.02 },
    uHalo: { value: new THREE.Color(0, 0, 0) },
    uHaloR: { value: 0.1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: SPRITE_VERT,
    fragmentShader: SPRITE_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return { mesh, u };
}

export class Vestibule {
  constructor({ lampCol = new THREE.Color(1.0, 0.62, 0.3), dotCol = new THREE.Color(0.159, 0.275, 0.451) } = {}) {
    this.lampCol = lampCol.clone();
    this.dotCol = dotCol.clone();
    this.uniforms = {
      uVest: { value: new THREE.Vector4(VEST.af, VEST.a1, VEST.crown, LIB.AS + 0.4) },
      uLampP: { value: new THREE.Vector3(LAMP.x, LAMP.y, LAMP.z) },
      uLampI: { value: new THREE.Color(0, 0, 0) },
      uLampR: { value: LAMP.r },
      uDotP: { value: new THREE.Vector3(0, 1.6, VEST.a1 - 0.3) },
      uDotI: { value: new THREE.Color(0, 0, 0) },
      uDotR: { value: 0.04 },
      uWaveP: { value: new THREE.Vector3() },
      uWaveI: { value: new THREE.Color(0, 0, 0) },
      uWave: { value: new THREE.Vector3(-1, 9, 0.12) },
      uBounce: { value: new THREE.Color(0, 0, 0) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: GLSL + FRAG,
      side: THREE.FrontSide,
    });
    this.group = new THREE.Group();
    const floor0 = new THREE.Mesh(buildFloor('near'), this.material);
    const floor1 = new THREE.Mesh(buildFloor('mid'), this.material);
    floor1.position.y = LIB.H;
    const fit = new THREE.Mesh(fittings(), this.material);
    this.globeU = { uCol: { value: new THREE.Color(0, 0, 0) } };
    this.globe = new THREE.Mesh(
      new THREE.SphereGeometry(LAMP.r, 48, 32),
      new THREE.ShaderMaterial({ uniforms: this.globeU, vertexShader: GLOBE_VERT, fragmentShader: GLOBE_FRAG }),
    );
    this.globe.position.set(LAMP.x, LAMP.y, LAMP.z);
    this.haze = sprite(1.1, LAMP.r + 0.05);
    this.haze.u.uC.value.set(LAMP.x, LAMP.y, LAMP.z);
    this.dot = sprite(0.6, 0);
    for (const o of [floor0, floor1, fit, this.globe]) {
      o.matrixAutoUpdate = false;
      o.updateMatrix();
      this.group.add(o);
    }
    this.group.add(this.haze.mesh, this.dot.mesh);
  }

  // s: { lamp: { i, globe, haze, hazeR }, bounce, dot: { p, level, i, core, sig, halo, haloR, pxM },
  //      wave: { p, t, i, speed, decay } } — intensities in the lamps' law (radiance = albedo × I·cos/d²)
  set(s) {
    const U = this.uniforms;
    U.uLampI.value.copy(this.lampCol).multiplyScalar(s.lamp.i);
    this.globeU.uCol.value.copy(this.lampCol).multiplyScalar(s.lamp.globe);
    this.haze.u.uCore.value.setRGB(0, 0, 0);
    this.haze.u.uHalo.value.copy(this.lampCol).multiplyScalar(s.lamp.haze);
    this.haze.u.uHaloR.value = s.lamp.hazeR;
    const d = s.dot;
    U.uDotP.value.copy(d.p);
    U.uDotI.value.copy(this.dotCol).multiplyScalar(d.i * d.level);
    U.uBounce.value.copy(this.lampCol).multiplyScalar(s.bounce.lamp).add(this.dotCol.clone().multiplyScalar(s.bounce.dot * d.i * d.level));
    // the core never under ~a pixel (its peak scaled down to keep its light), white-ish at the middle
    const sig = Math.max(d.sig, 0.8 * d.pxM);
    const core = this.dotCol.clone().lerp(new THREE.Color(0.45, 0.45, 0.45), d.white);
    this.dot.u.uC.value.copy(d.p);
    this.dot.u.uCore.value.copy(core).multiplyScalar(d.core * d.level * (d.sig / sig) ** 2);
    this.dot.u.uSig.value = sig;
    this.dot.u.uHalo.value.copy(this.dotCol).multiplyScalar(d.halo * d.level);
    this.dot.u.uHaloR.value = Math.max(d.haloR, 1.5 * d.pxM);
    this.dot.mesh.visible = d.level > 0;
    const w = s.wave;
    U.uWave.value.set(w.t, w.speed, w.decay);
    U.uWaveP.value.copy(w.p);
    U.uWaveI.value.copy(this.dotCol).multiplyScalar(w.i);
  }
}
