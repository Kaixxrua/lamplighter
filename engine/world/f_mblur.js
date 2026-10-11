// Camera motion blur from depth, for a shot that draws its own frame (render()). The scene is drawn
// once into a HDR target with a depth texture; every pixel is then averaged along the screen path its
// own world point takes while the camera moves from pose a to pose b. For a still world under a moving
// camera that path is exact at the pixel's depth (a long ascent smears the near walls and leaves the
// far end of the shaft sharp), and it costs one scene render instead of many temporal samples.
//
// The two poses are the shot's to choose: the physical shutter, or a longer travel where a regular
// structure rushing past would otherwise strobe (s44: a whole floor's travel nulls the floors' flicker
// at every pixel, since each pixel then sees exactly one period of the same pattern). Past a period, the
// taps can be weighted as a trapezoid (a box a period long convolved with a box of the rest), which still
// nulls the period exactly, where a longer plain box leaves up to a fifth of it.
//
// Matrices are built relative to the current camera position in double precision on the CPU, so the
// shader works in small camera-relative coordinates however far from the origin the camera is.
// Pixels at the far plane (sky) are points `far` away (10,000 km by default; s45 pushes them to 1e15 m so
// the stars turn only with the camera), or, given a sphere, points on it where their ray meets it: a
// planet drawn on the far plane by its own shader (s45) is blurred along its true path as the eye flies.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = position.xy*0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform mat4 uInvVP; uniform mat4 uVPa; uniform mat4 uVPb;
uniform vec2 uRes; uniform float uMaxN; uniform float uSeed; uniform float uStep;
uniform float uRamp; // the share of the path over which the taps' weight ramps up at each end (0: a box)
uniform float uFar; // how far a far-plane pixel's point is taken to be (m)
uniform vec3 uSphC; uniform float uSphR, uSphCc; // a sphere drawn on the far plane (uSphR 0: none)
varying vec2 vUv;
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d = texture(tDepth, vUv).r;
  vec2 ndc = vUv*2.0 - 1.0;
  vec4 P;
  if (d >= 0.999999){
    vec4 q = uInvVP*vec4(ndc, 1.0, 1.0);
    vec3 dir = normalize(q.xyz/q.w);
    float far = uFar;
    // a planet drawn by a far-plane shader (s45) has no depth: its point is where the ray meets it
    if (uSphR > 0.0){
      float B = -dot(uSphC, dir);
      float disc = B*B - uSphCc;
      if (disc > 0.0 && B < 0.0) far = uSphCc/(-B + sqrt(disc));
    }
    P = vec4(dir*far, 1.0);
  } else {
    vec4 q = uInvVP*vec4(ndc, d*2.0 - 1.0, 1.0);
    P = vec4(q.xyz/q.w, 1.0);
  }
  vec4 ca = uVPa*P, cb = uVPb*P;
  vec3 base = texture(tColor, vUv).rgb;
  // only the part of the path in front of the eye: a point it passes within the blur (a slab overhead in
  // a fast climb) leaves the view through the frame's edge, where a whole path would be thrown away
  const float NEAR = 0.1;
  if (ca.w < NEAR && cb.w < NEAR){ gl_FragColor = vec4(base, 1.0); return; }
  float x0 = ca.w < NEAR ? (NEAR - ca.w)/(cb.w - ca.w) : 0.0;
  float x1 = cb.w < NEAR ? (ca.w - NEAR)/(ca.w - cb.w) : 1.0;
  vec4 pa = mix(ca, cb, x0), pb = mix(ca, cb, x1);
  vec2 ua = pa.xy/pa.w*0.5 + 0.5, ub = pb.xy/pb.w*0.5 + 0.5;
  float len = length((ub - ua)*uRes);
  float n = clamp(ceil(len/uStep), 1.0, uMaxN);
  if (n < 1.5){ gl_FragColor = vec4(base, 1.0); return; }
  float j = ign(gl_FragCoord.xy + uSeed);
  vec3 acc = vec3(0.0); float w = 0.0;
  for (int i = 0; i < 96; i++){
    if (float(i) >= n) break;
    float x = mix(x0, x1, (float(i) + j)/n);
    vec4 c = mix(ca, cb, x);
    vec2 u = c.xy/c.w*0.5 + 0.5;
    if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) continue;
    float k = uRamp > 0.0 ? clamp(min(x, 1.0 - x)/uRamp, 0.0, 1.0) : 1.0;
    acc += texture(tColor, u).rgb*k; w += k;
  }
  gl_FragColor = vec4(w > 0.0 ? acc/w : base, 1.0);
}`;

const _v = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _r = new THREE.Matrix4();

export class CameraBlur {
  // maxSamples: taps along the longest path; step: one tap every `step` pixels of path below that
  constructor(width, height, { maxSamples = 48, step = 1.5 } = {}) {
    this.rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      colorSpace: THREE.NoColorSpace,
    });
    this.rt.depthTexture = new THREE.DepthTexture(width, height);
    this.rt.depthTexture.type = THREE.FloatType;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: this.rt.depthTexture },
        uInvVP: { value: new THREE.Matrix4() },
        uVPa: { value: new THREE.Matrix4() },
        uVPb: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2(width, height) },
        uMaxN: { value: maxSamples },
        uSeed: { value: 0 },
        uStep: { value: step },
        uRamp: { value: 0 },
        uFar: { value: 1.0e7 },
        uSphC: { value: new THREE.Vector3() },
        uSphR: { value: 0 },
        uSphCc: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geo, this.material);
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene();
    this.qscene.add(this.quad);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // view-projection of a pose {position, quaternion}, relative to the world point `origin`
  _vp(out, camera, pose, origin) {
    _r.makeRotationFromQuaternion(pose.quaternion).transpose();
    _m.makeTranslation(origin.x - pose.position.x, origin.y - pose.position.y, origin.z - pose.position.z);
    return out.multiplyMatrices(camera.projectionMatrix, _r.multiply(_m));
  }

  // Draw scene with camera into the blur target, then the blurred frame into target.
  // a, b: the camera's poses at the two ends of the blur, { position, quaternion }; seed varies the taps;
  // ramp: the share of the path each end's weight ramps over (a trapezoid; 0, the default, is a box).
  // far: the distance given to far-plane pixels (1e7 m, the default: s44's sky). sphere: { center, radius }
  // in world coordinates, a body drawn on the far plane whose surface those pixels then lie on (s45).
  render(renderer, scene, camera, target, a, b, { clearColor = 0x000000, seed = 0, ramp = 0, far = 1.0e7, sphere = null } = {}) {
    camera.updateMatrixWorld(true);
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(clearColor, 1);
    renderer.clear(true, true, false);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);

    const U = this.material.uniforms;
    const here = { position: camera.position, quaternion: camera.quaternion };
    this._vp(_v, camera, here, camera.position);
    U.uInvVP.value.copy(_v).invert();
    this._vp(U.uVPa.value, camera, a, camera.position);
    this._vp(U.uVPb.value, camera, b, camera.position);
    U.uSeed.value = (seed * 7.31) % 64;
    U.uRamp.value = ramp;
    U.uFar.value = far;
    if (sphere) {
      // relative to the eye, in double: |c|² − r² keeps its digits at any distance
      const cx = sphere.center.x - camera.position.x;
      const cy = sphere.center.y - camera.position.y;
      const cz = sphere.center.z - camera.position.z;
      U.uSphC.value.set(cx, cy, cz);
      U.uSphR.value = sphere.radius;
      U.uSphCc.value = cx * cx + cy * cy + cz * cz - sphere.radius * sphere.radius;
    } else U.uSphR.value = 0;
    renderer.setRenderTarget(target);
    renderer.render(this.qscene, this.qcam);
    renderer.autoClear = autoClear;
  }
}
