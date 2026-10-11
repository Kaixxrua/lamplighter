// Library shading: one material for the whole architecture (stone, floor tiles, walnut, procedural
// books, inscription bands, brass), lit analytically:
//   - lamps: two "spherical fruits" per hexagon side, 12 per floor; a fragment sums the 6 lamps of its
//     own side and the two neighbouring sides on its floor (windowed so the set can switch seamlessly);
//   - the lighthouse scan line: a vertical sheet of light rotating about the shaft axis, with a
//     phosphor afterglow behind it (the radar sweep of the AIGCNEWS logo, made architectural);
//   - per-floor state from a data texture (lamp level, lamp colour amber→lime, lime-lit amount);
//   - exponential fog toward a dark warm haze.
import * as THREE from 'three';
import { HASH, NOISE } from '../runtime/lib/glsl.js';

export const LIB = {
  H: 7.2, // floor pitch (m)
  T: 0.9, // slab thickness
  AS: 12.0, // shaft apothem (balustrade line)
  AW: 19.0, // outer wall apothem
  LAMP_A: 14.6, // lamp apothem
  LAMP_OFF: 4.6, // lamp offset along its side (±)
  LAMP_Y: 4.3, // lamp centre above the floor
  LAMP_R: 0.3, // globe radius
  SHAFT_R: 12.55, // shaft lamps: on brackets at the six pillars, hanging over the void (radius from the axis)
  SHAFT_Y: 3.9,
  ROWS: 8, // shelf rows
  PLINTH: 0.32,
  CORNICE: 0.3,
  BOARD: 0.035,
  SHELF_D: 0.42, // shelf depth
  FLOOR_BASE: -512, // floor index stored in texel 0 of the state texture
  FLOOR_COUNT: 1024,
};
LIB.HC = LIB.H - LIB.T; // clear height
LIB.ROW_H = (LIB.HC - LIB.PLINTH - LIB.CORNICE) / LIB.ROWS;

export function libraryUniforms() {
  const state = new Float32Array(LIB.FLOOR_COUNT * 4);
  for (let i = 0; i < LIB.FLOOR_COUNT; i++) {
    state[i * 4 + 0] = 0; // lime-lit amount (books, inscriptions)
    state[i * 4 + 1] = 1; // lamp level
    state[i * 4 + 2] = 0; // lamp colour: 0 amber → 1 lime
    state[i * 4 + 3] = 0; // reserved
  }
  const tex = new THREE.DataTexture(state, LIB.FLOOR_COUNT, 1, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return {
    uH: { value: LIB.H },
    uT: { value: LIB.T },
    uAs: { value: LIB.AS },
    uAw: { value: LIB.AW },
    uLampA: { value: LIB.LAMP_A },
    uLampOff: { value: LIB.LAMP_OFF },
    uLampY: { value: LIB.LAMP_Y },
    uLampI: { value: 14.0 },
    uShaftR: { value: LIB.SHAFT_R },
    uShaftY: { value: LIB.SHAFT_Y },
    uShaftK: { value: 0.8 }, // shaft lamp intensity relative to gallery lamps
    uPxAng: { value: 0.001 }, // radians per pixel of the render (set by Library.update)
    uLampCol: { value: new THREE.Color(1.0, 0.62, 0.3) },
    uLampLime: { value: new THREE.Color(0.62, 0.95, 0.12) },
    uFloorState: { value: tex },
    uFloorBase: { value: LIB.FLOOR_BASE },
    uBeamO: { value: new THREE.Vector3(0, 3.0, 0) },
    uBeamAng: { value: 0 },
    uBeamW: { value: 0.02 },
    uBeamV: { value: 40 }, // vertical falloff length of the sheet (m)
    uBeamI: { value: 0 },
    uBeamCol: { value: new THREE.Color(0.78, 1.0, 0.1) },
    uTrail: { value: 0.9 }, // afterglow length (rad)
    uTrailI: { value: 0.0 },
    uTrailArc: { value: 1e3 }, // the arc the sheet has swept so far (rad): no afterglow beyond it
    uFanUp: { value: 0.66 }, // the sheet is a fan from the lantern: the roof bounds it above (slope)…
    uFanDn: { value: 0.75 }, // …and the deck below
    uLHFill: { value: new THREE.Color(0, 0, 0) }, // light escaping the lantern glazing (colour × intensity)
    uFogCol: { value: new THREE.Color(0.006, 0.0045, 0.003) },
    uFogD: { value: 0.012 },
    uAmb: { value: new THREE.Color(0.0008, 0.001, 0.0014) },
    uLitGlow: { value: 1.0 },
    uLitCol: { value: new THREE.Color(0.62, 0.95, 0.12) },
    uTime: { value: 0 },
    uText: { value: null },
    uTextAspect: { value: 32 },
    // a carved plaque on one balustrade (library.js: PLAQUE); off while uPlaqueK.x is 0, and nothing turns it on
    uPlaque: { value: null },
    uPlaqueBox: { value: new THREE.Vector4(0, 0, 0, 0) }, // x0, z0, x1, z1
    uPlaqueK: { value: new THREE.Vector3(0, 0, 0) }, // metres spanned by the texture's 0..1, texel u, v
    uPlaqueY: { value: 0 },
  };
}

// --------------------------------------------------------------------------------------------- GLSL

export const LIB_COMMON = HASH + NOISE + /* glsl */ `
#define PI 3.14159265359
#define TAU 6.28318530718
uniform float uH, uT, uAs, uAw;
uniform float uLampA, uLampOff, uLampY, uLampI, uShaftR, uShaftY, uShaftK, uPxAng;
uniform vec3 uLampCol, uLampLime;
uniform sampler2D uFloorState; uniform float uFloorBase;
uniform vec3 uBeamO; uniform float uBeamAng, uBeamW, uBeamV, uBeamI, uTrail, uTrailI, uTrailArc; uniform vec3 uBeamCol;
uniform float uFanUp, uFanDn; uniform vec3 uLHFill;
uniform vec3 uFogCol; uniform float uFogD;
uniform vec3 uAmb;
uniform float uLitGlow; uniform vec3 uLitCol;
uniform float uTime;

float sideOf(vec2 xz){ float a = atan(xz.y, xz.x); if (a < 0.0) a += TAU; return min(floor(a/(PI/3.0)), 5.0); }
vec2 sideN(float i){ float a = (30.0 + 60.0*i)*(PI/180.0); return vec2(cos(a), sin(a)); }
vec2 sideT(float i){ float a = (30.0 + 60.0*i)*(PI/180.0); return vec2(-sin(a), cos(a)); }
vec4 floorState(float k){
  int i = clamp(int(k - uFloorBase), 0, ${LIB.FLOOR_COUNT - 1});
  return texelFetch(uFloorState, ivec2(i, 0), 0);
}

// Old lamps: each varies a little in brightness and about one in thirty is dead. Lamp j of a floor:
// gallery lamps 0..11 (side*2 + 0 for the -tangent one, +1 for the other), shaft lamps 12 + corner.
float lampVar(float k, int j){
  float h = ihash3(int(k), j, 77);
  return h < 0.033 ? 0.02 : 0.8 + 0.28*ihash3(int(k), j, 78);
}
int lampIdAt(vec3 c){
  float a = atan(c.z, c.x); if (a < 0.0) a += TAU;
  if (length(c.xz) < 14.0) return 12 + int(mod(floor(a/(PI/3.0) + 0.5), 6.0));
  float i = min(floor(a/(PI/3.0)), 5.0);
  return int(i)*2 + (dot(c.xz, sideT(i)) > 0.0 ? 1 : 0);
}

// Lamp positions and colours, for things that stand in the shaft (lighthouse, pages, dust).
vec3 lampRGB(vec4 st){ return mix(uLampCol, uLampLime, st.b)*(uLampI*st.g); }
vec3 shaftLampPos(float k, int i){ float a = float(i)*(PI/3.0); return vec3(cos(a)*uShaftR, k*uH + uShaftY, sin(a)*uShaftR); }
vec3 galleryLampPos(float k, int j){
  float i = float(j/2);
  vec2 xz = sideN(i)*uLampA + sideT(i)*(uLampOff*((j & 1) == 0 ? -1.0 : 1.0));
  return vec3(xz.x, k*uH + uLampY, xz.y);
}

// GGX specular (normalised), Schlick Fresnel
vec3 ggx(vec3 N, vec3 V, vec3 L, float rough, vec3 f0){
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0), nv = max(dot(N, V), 1e-3), nl = max(dot(N, L), 0.0), vh = max(dot(V, H), 0.0);
  float a = rough*rough; float a2 = a*a;
  float d = nh*nh*(a2 - 1.0) + 1.0; float D = a2/(PI*d*d);
  float k = a*0.5; float vis = 0.25/((nl*(1.0-k)+k)*(nv*(1.0-k)+k));
  vec3 F = f0 + (1.0 - f0)*pow(1.0 - vh, 5.0);
  return D*vis*F*nl;
}

struct Surf { vec3 P; vec3 N; vec3 V; vec3 albedo; vec3 f0; float rough; float ao; float wrap; };

// Sum of the lamps near P on floor k (six lamps: own side and both neighbours).
vec3 lampLight(Surf s, float k, vec4 st){
  vec3 col = mix(uLampCol, uLampLime, st.b) * (uLampI * st.g);
  float si = sideOf(s.P.xz);
  float ly = k*uH + uLampY;
  vec3 acc = vec3(0.0);
  for (int d = -1; d <= 1; d++){
    float i = mod(si + float(d) + 6.0, 6.0);
    vec2 n = sideN(i), t = sideT(i);
    for (int e = 0; e < 2; e++){
      vec2 lxz = n*uLampA + t*(uLampOff*(e == 0 ? -1.0 : 1.0));
      vec3 dl = vec3(lxz.x, ly, lxz.y) - s.P;
      float d2 = dot(dl, dl);
      vec3 l = dl*inversesqrt(d2);
      float w = clamp(1.0 - d2*d2*(1.0/65536.0), 0.0, 1.0); w *= w;   // window at 16 m
      float att = w/(d2 + 0.3)*lampVar(k, int(i)*2 + e);
      float ndl = dot(s.N, l);
      float diff = max((ndl + s.wrap)/(1.0 + s.wrap), 0.0);
      acc += att*(diff*s.albedo*(1.0/PI) + ggx(s.N, s.V, l, s.rough, s.f0));
    }
  }
  // shaft lamps at the two corners of this side (any other corner is >= 11.08 m from this sector)
  for (int e = 0; e < 2; e++){
    float a = (si + float(e))*(PI/3.0);
    vec3 dl = vec3(cos(a)*uShaftR, k*uH + uShaftY, sin(a)*uShaftR) - s.P;
    float d2 = dot(dl, dl);
    vec3 l = dl*inversesqrt(d2);
    float w = clamp(1.0 - d2*d2*(1.0/14641.0), 0.0, 1.0); w *= w;     // window at 11 m
    float att = uShaftK*w/(d2 + 0.3)*lampVar(k, 12 + int(mod(si + float(e), 6.0)));
    float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
    acc += att*(diff*s.albedo*(1.0/PI) + ggx(s.N, s.V, l, s.rough, s.f0));
  }
  return acc*col*PI;
}

// The lantern sends light out between its roof and its deck: a fan of slopes uFanUp / uFanDn.
float lanternFan(vec3 P, float soft){
  float e = (P.y - uBeamO.y)/max(length(P.xz - uBeamO.xz), 0.5);
  return smoothstep(-uFanDn - soft, -uFanDn + soft, e)*smoothstep(uFanUp + soft, uFanUp - soft, e);
}

// The scan line: angular distance of P from the rotating sheet, signed (negative = already swept).
float sweepDelta(vec3 P){
  vec2 d = P.xz - uBeamO.xz;
  float a = atan(d.y, d.x);
  return mod(a - uBeamAng + PI, TAU) - PI;
}
// Irradiance factor of the sheet at P (0..), including its afterglow trail: what the sheet has passed
// fades with the angle since (uTrail rad to 1/e, a revolution at most), and only within the arc it
// has swept so far (uTrailArc), so a sheet that has just begun to turn leaves no glow where it never was.
float sweep(vec3 P){
  float da = sweepDelta(P);
  float r = length(P.xz - uBeamO.xz);
  float core = exp(-da*da/(uBeamW*uBeamW));
  float back = da < 0.0 ? -da : TAU - da;
  float trail = exp(-back/uTrail)*smoothstep(uTrailArc + 0.03, uTrailArc - 0.03, back);
  float dy = (P.y - uBeamO.y)/uBeamV;
  float vert = 1.0/(1.0 + dy*dy);
  return (core + uTrailI*trail)*vert*lanternFan(P, 0.04)/(1.0 + 0.02*r);
}
vec3 beamLight(Surf s){
  if (uBeamI <= 0.0) return vec3(0.0);
  vec3 dir = vec3(s.P.x - uBeamO.x, 0.0, s.P.z - uBeamO.z);
  float r = length(dir); dir /= max(r, 1e-3);
  float ndl = max((dot(s.N, -dir) + 0.25)/1.25, 0.0);
  return uBeamCol*(uBeamI*sweep(s.P))*(ndl*s.albedo + 0.25*s.f0);
}

// Light escaping the lantern in every direction (not only through the lens).
vec3 lanternFill(Surf s){
  if (uLHFill.r + uLHFill.g + uLHFill.b <= 0.0) return vec3(0.0);
  vec3 dl = uBeamO - s.P;
  float d2 = dot(dl, dl);
  vec3 l = dl*inversesqrt(d2);
  float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
  // the optic shades its lamp front and back, so this light leaves sideways and turns with the beam
  float c = dot(normalize(s.P.xz - uBeamO.xz), vec2(cos(uBeamAng), sin(uBeamAng)));
  float shade = smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
  return uLHFill*(shade*lanternFan(s.P, 0.08)/(d2 + 1.0))*(diff*s.albedo + PI*ggx(s.N, s.V, l, max(s.rough, 0.2), s.f0));
}

vec3 fog(vec3 c, vec3 P){
  float f = exp(-uFogD*distance(P, cameraPosition));
  return c*f + uFogCol*(1.0 - f);
}
`;

// Procedural materials ------------------------------------------------------------------------------

const MATERIALS = /* glsl */ `
uniform sampler2D uText; uniform float uTextAspect;
uniform sampler2D uPlaque; uniform vec4 uPlaqueBox; uniform vec3 uPlaqueK; uniform float uPlaqueY;

// pixel footprint helpers (metres per pixel at P)
float footprint(vec3 P){ return max(length(dFdx(P)), length(dFdy(P))); }

vec3 stoneAlbedo(vec3 P, vec3 N, float px){
  vec3 an = abs(N);
  vec2 q = an.y > 0.7 ? P.xz : (an.x > an.z ? P.zy : P.xy);
  float big = vnoise2(q*0.6 + 3.1);
  float mid = vnoise2(q*3.7);
  float fine = mix(vnoise2(q*31.0), 0.5, smoothstep(0.004, 0.02, px));
  vec3 base = vec3(0.34, 0.30, 0.245);
  float v = 0.72 + 0.34*big + 0.16*mid + 0.10*fine;
  // a little blue-grey veining, thin, coming and going
  float vn = vnoise2(q*vec2(1.3, 5.0) + big*2.0);
  float vein = smoothstep(0.482, 0.5, vn)*(1.0 - smoothstep(0.5, 0.518, vn));
  vein *= smoothstep(0.35, 0.7, vnoise2(q*0.7 + 13.0));
  return base*v*(1.0 - 0.25*vein);
}

// value noise and its gradient
vec3 vnoise2d(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f); vec2 du = 6.0*f*(1.0 - f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(a + k1*u.x + k2*u.y + k4*u.x*u.y, du*(vec2(k1, k2) + k4*u.yx));
}

// Stone seen from close by (a pixel under a few millimetres): grain, pores and the slight undulation
// of a dressed face, in the albedo (returned as a factor) and as a tilt of the normal, so the lamps
// rake it. Fades out before it could alias, so far views are untouched.
float stoneClose(vec3 P, vec3 N, float px, inout vec3 Nb){
  float on = 1.0 - smoothstep(0.0015, 0.006, px);
  if (on <= 0.0) return 1.0;
  vec3 an = abs(N);
  vec2 q; vec3 ta, tb;
  if (an.y > 0.7){ q = P.xz; ta = vec3(1.0, 0.0, 0.0); tb = vec3(0.0, 0.0, 1.0); }
  else if (an.x > an.z){ q = P.zy; ta = vec3(0.0, 0.0, 1.0); tb = vec3(0.0, 1.0, 0.0); }
  else { q = P.xy; ta = vec3(1.0, 0.0, 0.0); tb = vec3(0.0, 1.0, 0.0); }
  vec3 g1 = vnoise2d(q*260.0 + 11.0);                     // grain, ~4 mm
  vec3 g2 = vnoise2d(q*48.0 + 5.0);                       // undulation, ~2 cm
  float f1 = 1.0 - smoothstep(0.0008, 0.003, px);
  vec2 slope = g1.yz*(0.00018*260.0*f1) + g2.yz*(0.0006*48.0);
  Nb = normalize(Nb - (ta*slope.x + tb*slope.y)*on);
  // pores: a scatter of small dark specks
  vec2 qc = q*330.0; vec2 c = floor(qc);
  vec2 o = qc - c - (0.2 + 0.6*vec2(hash12(c), hash12(c + 17.0)));
  float r = 0.06 + 0.16*hash12(c + 29.0);
  float pore = step(hash12(c + 41.0), 0.035)*(1.0 - smoothstep(r, r + px*330.0, length(o)));
  float fp = 1.0 - smoothstep(0.0005, 0.0018, px);
  return mix(1.0, (0.93 + 0.14*g1.x)*(1.0 - 0.35*pore*fp), on);
}

// hexagonal floor tiles: returns albedo, roughness (in w)
vec4 floorTiles(vec3 P, float px){
  vec2 p = P.xz/0.62;
  // axial hex grid
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r*0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = p - g;
  // distance to the hexagon edge
  vec2 ag = abs(g);
  float edge = 0.5 - max(dot(ag, normalize(vec2(1.0, 1.7320508))), ag.x);
  float tj = floor(id.y/0.8660254 + 0.5);
  float ti = floor(id.x - 0.5*tj + 0.5);
  float tone = mod(ti - tj, 3.0);                       // proper 3-colouring of the hex grid
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
  // grain runs horizontally along boards
  vec2 q = an.y > 0.7 ? P.xz : (an.x > an.z ? P.zy : P.xy);
  float along = q.x;
  float g = vnoise2(vec2(along*0.6, q.y*28.0));
  float fine = mix(vnoise2(vec2(along*3.0, q.y*140.0)), 0.5, smoothstep(0.002, 0.01, px));
  return vec3(0.085, 0.048, 0.026)*(0.65 + 0.55*g + 0.25*fine);
}

// Books on the shelf walls. Returns albedo, f0 (gilt), roughness, ao, emission.
struct BookOut { vec3 albedo; vec3 f0; float rough; float ao; vec3 emit; vec3 nOff; };

vec3 bookColour(float h){
  // old leather and cloth, mostly browns
  if (h < 0.16) return vec3(0.095, 0.050, 0.026);
  if (h < 0.28) return vec3(0.110, 0.030, 0.022);
  if (h < 0.38) return vec3(0.070, 0.022, 0.028);
  if (h < 0.47) return vec3(0.026, 0.050, 0.032);
  if (h < 0.56) return vec3(0.020, 0.030, 0.062);
  if (h < 0.66) return vec3(0.175, 0.105, 0.050);
  if (h < 0.73) return vec3(0.014, 0.013, 0.012);
  if (h < 0.80) return vec3(0.330, 0.285, 0.205);
  if (h < 0.88) return vec3(0.068, 0.076, 0.058);
  if (h < 0.94) return vec3(0.150, 0.048, 0.036);
  return vec3(0.120, 0.090, 0.060);
}

// book boundary b(i) on a row (jittered grid)
float bookEdge(float i, float key, float w0){ return w0*(i + 0.36*(2.0*hash12(vec2(i, key)) - 1.0)); }

BookOut books(vec3 P, vec3 V, float side, float k, vec4 st, float px){
  BookOut o;
  o.f0 = vec3(0.04); o.rough = 0.62; o.ao = 1.0; o.emit = vec3(0.0); o.nOff = vec3(0.0);
  vec2 n = sideN(side), t = sideT(side);
  float u = dot(P.xz, t);
  float v = P.y - k*uH;
  float rowH = ${LIB.ROW_H.toFixed(5)};
  float base = ${LIB.PLINTH.toFixed(3)};
  float rf = (v - base)/rowH;
  float row = floor(rf);
  float vr = (rf - row)*rowH;            // height inside the row (board at the bottom)
  float board = ${LIB.BOARD.toFixed(3)};
  float clear = rowH - board;
  // view ray into the shelf (shelf space: x along t, y up, z into the wall)
  vec3 R = -V;
  float rz = max(dot(R.xz, n), 1e-3), ry = R.y;
  float key = hash13(vec3(k, side, row))*1000.0;
  // board front strip (painted for far floors; geometry covers it near the camera)
  if (vr < board || row < 0.0 || row >= ${LIB.ROWS.toFixed(1)}){
    o.albedo = woodAlbedo(P, vec3(n.x, 0.0, n.y), px)*0.9;
    o.rough = 0.5;
    return o;
  }
  float y = vr - board;                  // height above the board top
  // vertical dividers every 2.38 m
  float bay = 2.38;
  float bx = fract(u/bay + 0.5) - 0.5;
  if (abs(bx*bay) < 0.025){
    o.albedo = woodAlbedo(P + vec3(0.0, 0.0, 3.0), vec3(n.x, 0.0, n.y), px);
    o.rough = 0.5;
    return o;
  }
  float w0 = 0.043;
  float i = floor(u/w0);
  float e0 = bookEdge(i, key, w0), e1 = bookEdge(i + 1.0, key, w0);
  float bi = i, lo = e0, hi = e1;
  if (u < e0){ bi = i - 1.0; lo = bookEdge(i - 1.0, key, w0); hi = e0; }
  else if (u >= e1){ bi = i + 1.0; lo = e1; hi = bookEdge(i + 2.0, key, w0); }
  // runs of matching volumes (sets)
  float run = floor(bi/9.0);
  float isSet = step(0.72, hash12(vec2(run, key + 7.0)));
  float hb = hash12(vec2(bi, key + 1.0));
  float hc = mix(hash12(vec2(bi, key + 2.0)), hash12(vec2(run, key + 2.0)), isSet);
  float hh = mix(hb, hash12(vec2(run, key + 3.0)), isSet);
  float bookH = clear*mix(0.56, 0.93, hh*hh*(3.0 - 2.0*hh));
  float missing = step(hash12(vec2(bi, key + 4.0)), 0.035);
  float x = (u - lo)/max(hi - lo, 1e-4);   // 0..1 across the spine
  float wpx = (hi - lo)/max(px, 1e-5);    // spine width in pixels
  // detail fade with distance
  float far = 1.0 - smoothstep(0.6, 2.0, wpx);  // 1 when a spine is under ~1 px
  vec3 col = bookColour(hc)*(0.8 + 0.4*hash12(vec2(bi, key + 5.0)));

  bool inBook = y < bookH && missing < 0.5;
  if (!inBook){
    // recess: either the top of a book seen from above, or the dark back of the shelf
    float topZ = (ry < 0.0 && missing < 0.5) ? (y - bookH)*rz/(-ry) : 1e3;
    float depth = 0.26 + 0.12*hash12(vec2(bi, key + 6.0));
    if (topZ < depth){
      o.albedo = vec3(0.22, 0.19, 0.14)*(0.75 + 0.25*sin(x*40.0));
      o.ao = 0.55;
    } else {
      float zb = ry > 0.0 ? (clear - y)*rz/ry : 1e3;   // looking up: underside of the board above
      o.albedo = zb < ${LIB.SHELF_D.toFixed(2)} ? vec3(0.05, 0.03, 0.018) : vec3(0.012, 0.009, 0.007);
      o.ao = 0.25;
    }
    o.albedo = mix(o.albedo, col*0.35, far*0.5);
    return o;
  }
  float yy = y/bookH;
  // rounded spine
  float sx = 2.0*x - 1.0;
  float spineR = 1.0 - 0.55*sx*sx;
  o.nOff = vec3(t.x, 0.0, t.y)*(sx*0.55);
  // gaps between spines
  float gapPx = 0.9;
  float gap = smoothstep(0.0, gapPx/wpx, x)*smoothstep(0.0, gapPx/wpx, 1.0 - x);
  gap = mix(gap, 0.8, far);
  // leather grain and wear
  float grain = mix(vnoise2(vec2(u*240.0, y*240.0)), 0.5, smoothstep(0.0012, 0.004, px));
  float wear = smoothstep(0.65, 1.0, vnoise2(vec2(bi*3.1, y*9.0)))*0.5;
  col *= (0.82 + 0.3*grain)*(1.0 + wear*0.6);
  // raised bands and gilt rules (leather books)
  float leather = step(hash12(vec2(bi + run*isSet, key + 8.0)), 0.7);
  float detail = (1.0 - far)*smoothstep(1.5, 4.0, wpx);
  float gilt = 0.0;
  if (leather > 0.5){
    for (int j = 0; j < 4; j++){
      float yb = 0.16 + 0.2*float(j);
      float dB = abs(yy - yb)*bookH;
      gilt = max(gilt, 1.0 - smoothstep(0.0025, 0.0025 + px, abs(dB - 0.009)));
      float ridge = 1.0 - smoothstep(0.0, 0.007, dB);
      o.nOff.y += ridge*sign(yy - yb)*0.6*detail;
    }
    // title label
    float lab = step(0.37, yy)*step(yy, 0.53)*step(0.14, x)*step(x, 0.86);
    vec3 labC = hash12(vec2(bi, key + 9.0)) < 0.5 ? vec3(0.09, 0.02, 0.015) : vec3(0.01, 0.012, 0.01);
    col = mix(col, labC, lab*detail);
    // glyph marks on the label
    float gy = fract((yy - 0.37)/0.16*3.0);
    float gm = step(0.3, gy)*step(gy, 0.6)*step(0.5, hash12(vec2(floor(x*9.0), floor((yy - 0.37)/0.16*3.0) + bi)));
    gilt = max(gilt, lab*gm*detail);
  }
  gilt *= detail;
  o.albedo = col*spineR*gap;
  o.f0 = mix(vec3(0.04), vec3(0.85, 0.62, 0.26), gilt);
  o.albedo = mix(o.albedo, vec3(0.0), gilt*0.9);
  o.rough = mix(0.55, 0.28, gilt);
  o.ao = mix(0.7, 1.0, smoothstep(0.0, 0.3, yy));
  // lime-lit books (the lamp-lit index): a share of spines glow when the floor is lit
  float litShare = step(hash12(vec2(bi, key + 11.0)), st.r*0.22);
  o.emit = uLitCol*(litShare*st.r*uLitGlow*(0.6 + 0.4*spineR)*gap*1.6);
  return o;
}

// The credit cut in the top of one balustrade rail. The texture holds a signed distance to the edges
// of the cuts (0.5 at an edge, more inside): the cut is a V with walls at 58°, so under the lamps one
// wall of a stroke is lit and the other in shade, with a crisp line where they meet. Sampled with
// explicit gradients (dPx, dPy: screen derivatives of P) since this runs in a branch. Returns how much
// of the pixel lies in a cut, tilts N, and gives the depth (0..1) for soot and occlusion.
float plaque(vec3 P, vec3 dPx, vec3 dPy, float px, inout vec3 N, out float depth){
  depth = 0.0;
  vec2 size = uPlaqueBox.zw - uPlaqueBox.xy;
  vec2 uv = vec2((uPlaqueBox.z - P.x)/size.x, (P.z - uPlaqueBox.y)/size.y);   // read from the gallery
  if (abs(P.y - uPlaqueY) > 0.004 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  vec2 gx = vec2(-dPx.x/size.x, dPx.z/size.y), gy = vec2(-dPy.x/size.x, dPy.z/size.y);
  vec2 e = max(uPlaqueK.yz, vec2(px)/size);           // finite differences over a texel or the footprint
  float sd = (textureGrad(uPlaque, uv, gx, gy).r - 0.5)*uPlaqueK.x;
  float du = textureGrad(uPlaque, uv + vec2(e.x, 0.0), gx, gy).r - textureGrad(uPlaque, uv - vec2(e.x, 0.0), gx, gy).r;
  float dv = textureGrad(uPlaque, uv + vec2(0.0, e.y), gx, gy).r - textureGrad(uPlaque, uv - vec2(0.0, e.y), gx, gy).r;
  vec2 g = vec2(-du/(2.0*e.x*size.x), dv/(2.0*e.y*size.y))*uPlaqueK.x;  // d(sd)/dx, d(sd)/dz
  float cut = smoothstep(-0.5*px, 0.5*px, sd);
  N = normalize(N + vec3(g.x, 0.0, g.y)*(1.6*cut));
  depth = clamp(sd/0.0025, 0.0, 1.0);
  return cut;
}

// inscription band on the slab edge: carved letters (darker), glowing lime when the floor is lit
vec3 inscription(vec3 P, float k, vec4 st, float px, out float carve){
  float side = sideOf(P.xz);
  vec2 t = sideT(side);
  float u = dot(P.xz, t) + side*${(2 * LIB.AS * Math.tan(Math.PI / 6)).toFixed(5)} + floor(hash11(k)*64.0)*1.7;
  float bandTop = (k + 1.0)*uH - 0.19, bandBot = (k + 1.0)*uH - uT + 0.16;
  float v = (P.y - bandBot)/(bandTop - bandBot);
  vec2 uv = vec2(u/((bandTop - bandBot)*uTextAspect), v);
  float m = texture(uText, uv).r;
  carve = m;
  return uLitCol*(m*st.r*uLitGlow*2.2);
}
`;

const VERT = /* glsl */ `
attribute float mat;
attribute float aux;
varying vec3 vW; varying vec3 vN; varying float vMat; varying float vAux;
void main(){
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
  p = instanceMatrix*p; n = mat3(instanceMatrix)*n;
  #endif
  vec4 w = modelMatrix*p;
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*n); vMat = mat; vAux = aux;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying float vMat; varying float vAux;
void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  float px = footprint(P);
  vec3 dPx = dFdx(P), dPy = dFdy(P);
  int m = int(vMat + 0.5);
  float k = floor((P.y + 1e-3)/uH);
  vec4 st = floorState(k);
  Surf s; s.P = P; s.N = N; s.V = V; s.f0 = vec3(0.04); s.rough = 0.7; s.ao = 1.0; s.wrap = 0.0;
  vec3 emit = vec3(0.0);
  if (m == 0){
    s.albedo = stoneAlbedo(P, N, px); s.rough = 0.72;
    s.albedo *= stoneClose(P, N, px, s.N);
    if (N.y > 0.9 && abs(P.y - k*uH - 1.09) < 0.004){
      // the rail tops, worn smooth by hands along the middle
      float side = sideOf(P.xz);
      float r = dot(P.xz, sideN(side)) - uAs - 0.21;
      float worn = (1.0 - smoothstep(0.06, 0.16, abs(r)))*(0.6 + 0.4*vnoise2(P.xz*vec2(2.0, 2.0) + 3.0));
      s.rough = mix(0.72, 0.4, worn);
    }
    if (N.y > 0.9 && uPlaqueK.x > 0.0){
      float depth; vec3 Nc = N;
      float cut = plaque(P, dPx, dPy, px, Nc, depth);
      if (cut > 0.0){
        s.N = normalize(Nc + s.N - N);                    // the cut's walls, with the stone's grain
        s.albedo *= 1.0 - cut*(0.06 + 0.5*depth*depth);   // lamp soot settled in the bottom of the cuts
        s.ao = 1.0 - 0.45*cut*depth;
        s.rough = mix(s.rough, 0.86, cut);
        emit = uLitCol*(cut*st.r*uLitGlow*2.2);          // and, like the inscription bands, lit with the floor
      }
    }
  }
  else if (m == 1){ vec4 f = floorTiles(P, px); s.albedo = f.rgb; s.rough = f.a; }
  else if (m == 2){ s.albedo = woodAlbedo(P, N, px); s.rough = 0.45; }
  else if (m == 3){
    float side = sideOf(P.xz);
    BookOut b = books(P, V, side, k, st, px);
    s.albedo = b.albedo; s.f0 = b.f0; s.rough = b.rough; s.ao = b.ao; emit = b.emit;
    s.N = normalize(N + b.nOff);
  }
  else if (m == 4){ s.albedo = vec3(0.045, 0.036, 0.028)*(0.8 + 0.4*vnoise2(P.xz*0.8)); s.rough = 0.9; }
  else if (m == 5){ s.albedo = vec3(0.16, 0.14, 0.115)*(0.85 + 0.3*vnoise2(P.xy*1.7 + P.zz)); s.rough = 0.85; }
  else if (m == 6){ s.albedo = vec3(0.0); s.f0 = vec3(0.78, 0.55, 0.26)*(0.75 + 0.35*vnoise2(P.xz*7.0 + P.yy*3.0)); s.rough = 0.32; }
  else if (m == 7){
    float carve;
    float kk = floor((P.y + uT)/uH) - 1.0;    // the band belongs to the slab above floor kk
    vec4 st2 = floorState(kk + 1.0);
    emit = inscription(P, kk, st2, px, carve);
    s.albedo = stoneAlbedo(P, N, px)*(1.0 - 0.6*carve);
  }
  else if (m == 8){ s.albedo = vec3(0.004); s.rough = 0.9; }
  else if (m == 9){ s.albedo = vec3(0.012); s.f0 = vec3(0.25); s.rough = 0.45; }
  else { s.albedo = vec3(0.02); s.f0 = vec3(0.06); s.rough = 0.1; }

  vec3 c = lampLight(s, k, st)*s.ao + beamLight(s) + lanternFill(s)*s.ao + uAmb*s.albedo*20.0*s.ao + emit;
  gl_FragColor = vec4(fog(c, P), 1.0);
}`;

export function createLibraryMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: LIB_COMMON + MATERIALS + FRAG,
    side: THREE.FrontSide,
  });
}

// Lamp globes: frosted glass lit from inside, a hot core where the bulb shows through, colour from
// the floor state. Far globes are inflated to a minimum on-screen size with their radiance scaled
// down to keep the same energy, so a lamp 60 floors away is a steady point, not a flickering pixel.
const LAMP_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying float vE; varying float vVar;
void main(){
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec3 c = (modelMatrix*im*vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float R = length(position);
  float minR = uPxAng*distance(c, cameraPosition)*1.1;
  float sc = max(1.0, minR/max(R, 1e-4));
  vec3 w = c + mat3(modelMatrix)*mat3(im)*position*sc;
  vW = w; vN = normalize(mat3(modelMatrix)*mat3(im)*normal); vE = 1.0/(sc*sc);
  vVar = lampVar(floor((c.y + 1e-3)/uH), lampIdAt(c));
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;
const LAMP_FRAG = /* glsl */ `
uniform float uGlobe;
varying vec3 vW; varying vec3 vN; varying float vE; varying float vVar;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float k = floor((vW.y + 1e-3)/uH);
  vec4 st = floorState(k);
  vec3 col = mix(uLampCol, uLampLime, st.b)*st.g;
  float nv = max(dot(N, V), 0.0);
  float glass = 0.22 + 0.78*pow(nv, 0.8);           // frosted: darker toward the rim
  float bulb = 2.2*pow(nv, 24.0) + 0.7*pow(nv, 5.0);   // the bulb showing through the frost
  vec3 c = col*uGlobe*(glass + bulb)*vE*vVar;
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

export function createLampMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uGlobe: { value: 2.0 } },
    vertexShader: LIB_COMMON + LAMP_VERT,
    fragmentShader: LIB_COMMON + LAMP_FRAG,
  });
}

// Haze glow around each lamp: a camera-facing quad at the lamp, additive, depth-tested (so walls
// in front cut it) but not written. Same minimum-size/energy rule as the globes.
const GLOW_VERT = /* glsl */ `
uniform float uGlowR;
varying vec2 vQ; varying float vE; varying vec3 vC; varying float vVar;
void main(){
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec3 c = (modelMatrix*im*vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float d = distance(c, cameraPosition);
  float R = max(uGlowR, uPxAng*d*7.0);
  vE = (uGlowR*uGlowR)/(R*R);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // pull the quad toward the camera by the globe radius so the globe does not cut it
  vec3 toCam = normalize(cameraPosition - c);
  vec3 w = c + toCam*min(0.35, d*0.5) + (right*position.x + up*position.y)*R;
  vQ = position.xy; vC = c;
  vVar = lampVar(floor((c.y + 1e-3)/uH), lampIdAt(c));
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;
const GLOW_FRAG = /* glsl */ `
uniform float uGlowI;
varying vec2 vQ; varying float vE; varying vec3 vC; varying float vVar;
void main(){
  float q = length(vQ);
  if (q >= 1.0) discard;
  float k = floor((vC.y + 1e-3)/uH);
  vec4 st = floorState(k);
  vec3 col = mix(uLampCol, uLampLime, st.b)*st.g;
  float edge = (1.0 - q*q); edge *= edge;
  float g = (0.55/(1.0 + q*q*120.0) + 0.45*exp(-q*4.5))*edge;
  float f = exp(-uFogD*distance(vC, cameraPosition));
  gl_FragColor = vec4(col*(uGlowI*g*vE*f*vVar), 1.0);
}`;

export function createGlowMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uGlowR: { value: 2.2 }, uGlowI: { value: 1.6 } },
    vertexShader: LIB_COMMON + GLOW_VERT,
    fragmentShader: LIB_COMMON + GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}
