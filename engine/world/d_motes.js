// Agent D2 · motes the shot places itself (s40, s41): the light of the half book let go, the dust the old one gives
// up when it falls open. The shot writes every mote's place, colour and size each frame (pure in t) into the
// arrays and calls update(); they are drawn as dust.js draws its motes: a soft point at least uMinPx wide, a bokeh
// disc when out of focus (thin-lens circle of confusion), the energy spread over what is drawn, dimmed by the
// library's fog and a little with distance.
//   const m = new Motes({ count, uniforms: lib.uniforms }); scene.add(m.points);
//   in update(t): m.pos[3i..], m.col[3i..] (linear RGB, what it gives off; 0 = not there), m.size[i] (m);
//   m.update(camera, { focus, fstop, width })
import * as THREE from 'three';

const VERT = /* glsl */ `
attribute vec3 aCol; attribute float aSize;
uniform float uMinPx, uMaxPx, uFocusD, uLensK, uPxPerM, uFogD, uRefD;
uniform vec2 uNear;
varying vec3 vCol; varying float vE; varying float vBokeh;
void main(){
  vec4 mv = modelViewMatrix*vec4(position, 1.0);
  float d = max(-mv.z, 1e-3);
  float own = max(uMinPx, aSize*uPxPerM/d);
  float coc = uLensK*abs(d - uFocusD)/(d*uFocusD);
  float size = clamp(max(own, coc), uMinPx, uMaxPx);
  float r = uRefD/d;
  vE = (own*own)/(size*size)*min(r*r, 1.5)*smoothstep(uNear.x, uNear.y, d)*exp(-uFogD*d);
  vBokeh = smoothstep(own*1.5, own*4.0, size);
  vCol = aCol;
  gl_PointSize = (aCol.r + aCol.g + aCol.b) > 0.0 ? size : 0.0;
  gl_Position = projectionMatrix*mv;
}`;

const FRAG = /* glsl */ `
varying vec3 vCol; varying float vE; varying float vBokeh;
void main(){
  vec2 q = gl_PointCoord*2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float soft = exp(-r2*3.0);
  float disc = smoothstep(1.0, 0.86, sqrt(r2))*(0.75 + 0.35*r2);
  float a = mix(soft*2.6, disc*1.15, vBokeh);
  gl_FragColor = vec4(vCol*(a*vE), 1.0);
}`;

export class Motes {
  constructor({ count, uniforms = {}, minPx = 1.5, maxPx = 120, refD = 2, near = [0.15, 0.4], order = 21 }) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aCol', this.aCol);
    geo.setAttribute('aSize', this.aSize);
    this.uniforms = {
      uMinPx: { value: minPx },
      uMaxPx: { value: maxPx },
      uFocusD: { value: 3 },
      uLensK: { value: 0 },
      uPxPerM: { value: 1000 },
      uRefD: { value: refD },
      uNear: { value: new THREE.Vector2(near[0], near[1]) },
      uFogD: uniforms.uFogD ?? { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = order;
  }

  // after the arrays are written: focus (m), fstop and the render width (px), as the shot's dof
  update(camera, { focus = 3, fstop = 4, width = 1920 } = {}) {
    const U = this.uniforms;
    const f = (camera.userData.focalMm ?? 35) / 1000;
    const sensor = (camera.userData.sensorWidth ?? 36) / 1000;
    U.uFocusD.value = focus;
    U.uLensK.value = ((f / fstop) * f * width) / sensor;
    U.uPxPerM.value = (f * width) / sensor;
    this.aPos.needsUpdate = true;
    this.aCol.needsUpdate = true;
    this.aSize.needsUpdate = true;
  }
}
