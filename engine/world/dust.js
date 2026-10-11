// Dust: motes hanging in the library air, invisible until light catches them. Without shadows,
// a sum over every lamp would light all motes alike (a starfield), so a lamp only shows the motes
// within a couple of metres of it — the glitter around a bulb — while the scan sheet shows all it cuts. A box of motes is
// wrapped around the camera (each mote's position is taken modulo the box), so the air is always
// full wherever the camera goes. Motes scatter light forward (Henyey-Greenstein), so they glitter
// most between the camera and a lamp, and they flare lime as the scan sheet passes through them.
// Out-of-focus motes are drawn as bokeh discs sized by the thin-lens circle of confusion, with their
// energy spread over the disc; in-focus motes keep a minimum size of about a pixel.
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { hash } from '../runtime/lib/rng.js';

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uBoxC; uniform float uBox; uniform float uDustT; uniform vec3 uWind; uniform float uSettle;
uniform float uMinPx, uFocusD, uLensK, uMaxPx, uMoteI, uG;
uniform vec3 uKeyPos, uKeyCol, uKeyDir; uniform float uKeyR; uniform vec2 uKeyCone, uNear;
varying vec3 vCol; varying float vE; varying float vBokeh;

float hg(float c, float g){ float g2 = g*g; return (1.0 - g2)/(4.0*PI*pow(1.0 + g2 - 2.0*g*c, 1.5)); }

void main(){
  // drift: a slow wander plus wind and settling, then wrap into the box around the camera
  vec3 ph = aSeed.xyz*TAU*7.0;
  vec3 p = aSeed.xyz*uBox + uWind*uDustT + vec3(0.0, -uSettle*uDustT, 0.0)
         + 0.35*vec3(sin(uDustT*0.21 + ph.x), sin(uDustT*0.17 + ph.y), sin(uDustT*0.19 + ph.z))
         + 0.08*vec3(sin(uDustT*1.3 + ph.y), sin(uDustT*1.1 + ph.z), sin(uDustT*1.7 + ph.x));
  p = uBoxC + mod(p - uBoxC + 0.5*uBox, uBox) - 0.5*uBox;
  vec3 V = cameraPosition - p;
  float d = length(V); V /= d;

  // light: lamps of this floor and the shaft lamps of three floors, the sheet, the lantern
  vec3 L = vec3(0.0);
  float k = floor((p.y + 1e-3)/uH);
  vec3 cg = lampRGB(floorState(k));
  for (int j = 0; j < 12; j++){
    vec3 dl = galleryLampPos(k, j) - p; float d2 = dot(dl, dl);
    L += cg*(lampVar(k, j)*exp(-d2*0.3)/(d2 + 0.3))*hg(dot(normalize(dl), -V), uG);
  }
  for (int dk = -1; dk <= 1; dk++){
    float kk = k + float(dk);
    vec3 cs = lampRGB(floorState(kk))*uShaftK;
    for (int i = 0; i < 6; i++){
      vec3 dl = shaftLampPos(kk, i) - p; float d2 = dot(dl, dl);
      L += cs*(lampVar(kk, 12 + i)*exp(-d2*0.3)/(d2 + 0.3))*hg(dot(normalize(dl), -V), uG);
    }
  }
  if (uBeamI > 0.0){
    vec3 dl = uBeamO - p;
    L += uBeamCol*(uBeamI*sweep(p))*hg(dot(normalize(dl), -V), uG)*4.0;
  }
  if (uLHFill.r + uLHFill.g + uLHFill.b > 0.0){
    vec3 dl = uBeamO - p; float d2 = dot(dl, dl);
    float c = dot(normalize(p.xz - uBeamO.xz), vec2(cos(uBeamAng), sin(uBeamAng)));
    float shade = smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
    L += uLHFill*(shade*lanternFan(p, 0.08)/(d2 + 1.0))*hg(dot(normalize(dl), -V), uG);
  }
  // the shot's own key light (a candle, a reader's lamp), if it has one
  if (uKeyCol.r + uKeyCol.g + uKeyCol.b > 0.0){
    vec3 dl = uKeyPos - p; float d2 = dot(dl, dl);
    float cone = uKeyCone.x > -1.0 ? smoothstep(uKeyCone.x, uKeyCone.y, dot(-normalize(dl), uKeyDir)) : 1.0;
    L += uKeyCol*(cone/(d2 + uKeyR*uKeyR))*hg(dot(normalize(dl), -V), uG);
  }
  float f = exp(-uFogD*d);
  vCol = L*uMoteI*(0.4 + 1.2*aSeed.w)*f;

  // size: circle of confusion (thin lens) or the minimum, energy spread over the disc
  float coc = uLensK*abs(d - uFocusD)/(d*uFocusD);
  float size = clamp(max(uMinPx, coc), uMinPx, uMaxPx);
  vE = (uMinPx*uMinPx)/(size*size)*smoothstep(uNear.x, uNear.y, d);
  vBokeh = smoothstep(uMinPx*1.5, uMinPx*4.0, size);
  gl_PointSize = size;
  gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vCol; varying float vE; varying float vBokeh;
void main(){
  vec2 q = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float soft = exp(-r2*3.0);                                    // an in-focus mote: a soft point
  float disc = smoothstep(1.0, 0.86, sqrt(r2))*(0.75 + 0.35*r2); // bokeh: a flat disc, a brighter rim
  float a = mix(soft*2.6, disc*1.15, vBokeh);
  gl_FragColor = vec4(vCol*(a*vE), 1.0);
}`;

export class Dust {
  constructor({ uniforms, count = 30000, box = 18, seed = 3 }) {
    const pos = new Float32Array(count * 3);
    const seedA = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < 4; c++) seedA[i * 4 + c] = hash(i, seed, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 4));
    const own = {
      uBoxC: { value: new THREE.Vector3() },
      uBox: { value: box },
      uDustT: { value: 0 },
      uWind: { value: new THREE.Vector3(0.02, 0.0, 0.01) },
      uSettle: { value: 0.006 },
      uMinPx: { value: 1.6 },
      uMaxPx: { value: 160 },
      uFocusD: { value: 5 },
      uLensK: { value: 0 },
      uMoteI: { value: 10.0 },
      uG: { value: 0.55 },
      uKeyPos: { value: new THREE.Vector3() }, // the shot's own key light (radiant intensity, linear RGB); 0 = off
      uKeyCol: { value: new THREE.Color(0, 0, 0) },
      uKeyR: { value: 0.05 },
      uKeyDir: { value: new THREE.Vector3(0, 0, -1) },
      uKeyCone: { value: new THREE.Vector2(-2, -1) }, // as BookShelf.beam(): cos(outer), cos(inner); x <= -1: all round
      uNear: { value: new THREE.Vector2(0.15, 0.45) }, // motes fade in between these distances from the lens
    };
    this.uniforms = { ...own, ...uniforms };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: LIB_COMMON + VERT,
      fragmentShader: LIB_COMMON + FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  // focus (m) and fstop as in the shot's dof; width = render width in pixels.
  update(camera, t, { focus = 5, fstop = 2.8, width = 1920, intensity } = {}) {
    const U = this.uniforms;
    U.uBoxC.value.copy(camera.position);
    U.uDustT.value = t;
    const f = (camera.userData.focalMm ?? 35) / 1000;
    const sensor = (camera.userData.sensorWidth ?? 36) / 1000;
    U.uFocusD.value = focus;
    U.uLensK.value = ((f / fstop) * f * width) / sensor;
    U.uMinPx.value = Math.max(1.2, (1.6 * width) / 1920);
    U.uMaxPx.value = (160 * width) / 1920;
    if (intensity !== undefined) U.uMoteI.value = intensity;
  }
}
