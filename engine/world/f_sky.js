// The night sky of Act IV: stars on the celestial sphere, a faint Milky Way, and the glow the lit
// library gives the air above the horizon. A full-screen triangle at the far plane, added to the scene
// as an opaque mesh drawn after everything else that is opaque (depth test on, nothing written), so
// only the pixels nothing covered pay for it, and the lamps' additive glows still land on top.
//
// Stars sit on a cube-face grid (one candidate per cell, two layers: few bright, many faint), each a
// gaussian whose integrated flux does not depend on the render size: at 960 or 3840 the same star
// carries the same light, a point at least about a pixel wide. Directions are world directions, so the
// sky turns with the camera and stays put while it translates.
import * as THREE from 'three';
import { HASH, NOISE } from '../runtime/lib/glsl.js';

const VERT = /* glsl */ `
varying vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;

// The stars alone (faceUv, faceDir, stars), shared with the planet of s45 (world/f_planet.js). The
// including shader declares HASH and a uniform float uPxAng (the angle of a pixel) before it.
export const STARS = /* glsl */ `vec3 faceUv(vec3 d){
  vec3 a = abs(d);
  if (a.x >= a.y && a.x >= a.z) return vec3(d.z/a.x, d.y/a.x, d.x > 0.0 ? 0.0 : 1.0);
  if (a.y >= a.z) return vec3(d.x/a.y, d.z/a.y, d.y > 0.0 ? 2.0 : 3.0);
  return vec3(d.x/a.z, d.y/a.z, d.z > 0.0 ? 4.0 : 5.0);
}
vec3 faceDir(vec2 uv, float f){
  if (f < 0.5) return normalize(vec3(1.0, uv.y, uv.x));
  if (f < 1.5) return normalize(vec3(-1.0, uv.y, uv.x));
  if (f < 2.5) return normalize(vec3(uv.x, 1.0, uv.y));
  if (f < 3.5) return normalize(vec3(uv.x, -1.0, uv.y));
  if (f < 4.5) return normalize(vec3(uv.x, uv.y, 1.0));
  return normalize(vec3(uv.x, uv.y, -1.0));
}
// one layer of stars: cells per face edge, chance of a star per cell, faintest..brightest flux
vec3 stars(vec3 d, float cells, float chance, float seed, float lo, float hi){
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
    float flux = lo*pow(hi/lo, pow(u, 6.0));                         // many faint, a few bright
    float tk = hash13(vec3(c, fu.z*17.0 + seed + 4.0));
    vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.82, 0.62), tk*tk) ;  // blue-white to orange
    acc += tint*(flux*exp(-r2/(2.0*sig*sig))*(uPxAng*uPxAng)/(6.2832*sig*sig));
  }
  return acc;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform mat4 uInvProj; uniform mat3 uCamRot;
uniform float uPxAng, uStarI, uMilky, uGlowI, uHazeD, uHazeTop;
uniform vec3 uUp, uGlowCol, uSkyCol, uGalN, uHazeCol;
varying vec2 vNdc;
${HASH}
${NOISE}
${STARS}
void main(){
  vec4 v = uInvProj*vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(uCamRot*normalize(v.xyz/v.w));
  vec3 c = uSkyCol;
  // the Milky Way: a soft band about the great circle of normal uGalN, mottled, with a darker lane
  float b = dot(d, uGalN);
  float band = exp(-b*b/0.03);
  float mott = 0.55 + 0.9*fbm3(d*5.0) - 0.35*smoothstep(0.55, 0.8, vnoise(d*11.0 + 4.0));
  float lane = 1.0 - 0.6*exp(-pow((b - 0.02)/0.035, 2.0))*smoothstep(0.35, 0.65, vnoise(d*3.0 + 9.0));
  c += vec3(0.62, 0.66, 0.78)*(uMilky*band*max(mott, 0.0)*lane);
  c += stars(d, 72.0, 0.55, 11.0, 2.0, 400.0)*uStarI;
  c += stars(d, 300.0, 0.5, 29.0, 0.6, 8.0)*uStarI;
  // the library's light in the air, low over the horizon
  float e = dot(d, uUp);
  c += uGlowCol*(uGlowI*exp(-max(e, 0.0)/0.10)*smoothstep(-0.25, 0.0, e));
  // seen from inside a lit shaft: the haze between the camera and the mouth (uHazeTop m above)
  if (uHazeTop > 0.0) c = mix(c, uHazeCol, 1.0 - exp(-uHazeD*uHazeTop/max(e, 0.02)));
  gl_FragColor = vec4(c, 1.0);
}`;

export class Sky {
  constructor() {
    this.uniforms = {
      uInvProj: { value: new THREE.Matrix4() },
      uCamRot: { value: new THREE.Matrix3() },
      uPxAng: { value: 0.001 },
      uStarI: { value: 1.0 },
      uMilky: { value: 0.004 },
      uGlowI: { value: 0.0 },
      uUp: { value: new THREE.Vector3(0, 1, 0) },
      uGlowCol: { value: new THREE.Color(0.05, 0.08, 0.02) },
      uSkyCol: { value: new THREE.Color(0.0006, 0.0008, 0.0016) },
      uGalN: { value: new THREE.Vector3(0.38, 0.52, 0.76).normalize() },
      uHazeCol: { value: new THREE.Color(0, 0, 0) }, // a shaft's haze over the sky seen up its mouth…
      uHazeD: { value: 0 }, // …its density (1/m)…
      uHazeTop: { value: 0 }, // …and the height of the mouth above the camera (m; 0 = out in the open)
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
    this.mesh.renderOrder = 9; // after the opaque world, before the lamps' glows (10)
  }

  // height: render height in pixels
  update(camera, height) {
    const U = this.uniforms;
    camera.updateMatrixWorld(true);
    U.uInvProj.value.copy(camera.projectionMatrixInverse);
    U.uCamRot.value.setFromMatrix4(camera.matrixWorld);
    U.uPxAng.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / (camera.zoom * height);
  }
}
