// Agent D · one lamp of the library on its own (s43). The library lights its lamps a floor at a time
// (Library.setFloor: level, amber → lime), each with a small variation, and about one in thirty is dead
// (libshader's lampVar). OneLamp takes one of those dead lamps and lights it in a colour of its own: s43's
// alarm (#E5533D, the only one in the film), flickering, until the repair light mends it and it burns lime
// like the rest of its floor. It is drawn as the library draws a lamp: the frosted globe and the haze glow
// (the library's own shaders, the colour read from uOneCol instead of the floor), and it lights the stone
// and the books round it (the library's material with this one lamp added: OneLamp.material).
//
// Lamp j of floor k, as libshader numbers them: gallery lamps 0..11 (side*2, +1 for the one along the
// side's tangent), shaft lamps 12 + corner (corner c at c*60°, on its bracket over the void).
import * as THREE from 'three';
import { LIB } from './libshader.js';
import { lampPositions } from './library.js';

// libshader's integer hash (glsl.js: pcg, ihash3), in JS, so a shot can find the dead lamps
const pcg = (v) => {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
};
const ihash3 = (a, b, c) => pcg((pcg((pcg(a >>> 0) ^ (b >>> 0)) >>> 0) ^ (c >>> 0)) >>> 0) / 4294967295;

// libshader's lampVar(k, j): 0.02 for a dead lamp, else 0.8 … 1.08
export function lampVar(k, j) {
  return ihash3(k, j, 77) < 0.033 ? 0.02 : 0.8 + 0.28 * ihash3(k, j, 78);
}
export const isDead = (k, j) => lampVar(k, j) < 0.05;

// the centre of lamp j of floor k (world)
const LAMPS = lampPositions();
export const lampPos = (k, j, out = new THREE.Vector3()) => out.copy(LAMPS[j]).setY(LAMPS[j].y + k * LIB.H);

// A library shader with lines swapped, each found exactly once; null (and a warning) if one is not there.
function patched(src, swaps, what) {
  let out = src;
  for (const [a, b] of swaps) {
    if (out.split(a).length !== 2) {
      console.warn(`[d_lamps] the library's ${what} shader has changed ('${a.slice(0, 32)}…'): the lamp is not drawn`);
      return null;
    }
    out = out.replace(a, b);
  }
  return out;
}
const VAR = 'vVar = lampVar(floor((c.y + 1e-3)/uH), lampIdAt(c));';
const COL = 'vec3 col = mix(uLampCol, uLampLime, st.b)*st.g;';
const MAIN = 'void main(){';
const LIT = 'vec3 c = lampLight(s, k, st)*s.ao + ';

// its light on the library's surfaces, as lampLight lights them from each of the floor's lamps
const ONE_LIGHT = /* glsl */ `
uniform vec3 uOnePos, uOneLight;
vec3 oneLight(Surf s){
  vec3 dl = uOnePos - s.P;
  float d2 = dot(dl, dl);
  vec3 l = dl*inversesqrt(d2);
  float w = clamp(1.0 - d2*d2*(1.0/65536.0), 0.0, 1.0); w *= w;
  float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
  return (w/(d2 + 0.3))*(diff*s.albedo*(1.0/PI) + ggx(s.N, s.V, l, s.rough, s.f0))*uOneLight*PI;
}
`;

export class OneLamp {
  // lib: the Library; k, j: the lamp (best a dead one, so the library draws nothing of its own there)
  constructor(lib, { k, j }) {
    this.k = k;
    this.j = j;
    this.U = lib.uniforms;
    this.pos = lampPos(k, j);
    this.shaft = j >= 12;
    this.uniforms = {
      uOneCol: { value: new THREE.Color(0, 0, 0) },
      uOnePos: { value: this.pos.clone() },
      uOneLight: { value: new THREE.Color(0, 0, 0) },
    };
    const lm = lib.lampMaterial;
    const gm = lib.glowMaterial;
    const own = (m, what) => {
      const vs = patched(m.vertexShader, [[VAR, 'vVar = 1.0;']], what);
      const fs = patched(m.fragmentShader, [[COL, 'vec3 col = uOneCol;'], [MAIN, `uniform vec3 uOneCol;\n${MAIN}`]], what);
      return vs && fs ? { uniforms: { ...m.uniforms, ...this.uniforms }, vertexShader: vs, fragmentShader: fs } : null;
    };
    const ls = own(lm, 'lamp');
    const gs = own(gm, 'glow');
    this.group = new THREE.Group();
    if (ls && gs) {
      // the globe a hair larger than the library's, so it covers whatever the library draws there
      this.globe = new THREE.Mesh(new THREE.SphereGeometry(LIB.LAMP_R * 1.03, 32, 20), new THREE.ShaderMaterial(ls));
      this.glow = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({ ...gs, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending }),
      );
      this.glow.renderOrder = 11; // after the library's glows (10)
      this.glow.frustumCulled = false; // its vertex shader turns it to the camera
      for (const m of [this.globe, this.glow]) {
        m.position.copy(this.pos);
        this.group.add(m);
      }
    }
    // the library's material with this lamp's light added: give it to the floors with attach()
    const fs = lib.material.fragmentShader;
    const at = fs.lastIndexOf('void main(');
    const lit = at < 0 ? null : patched(fs.slice(0, at) + ONE_LIGHT + fs.slice(at), [[LIT, 'vec3 c = (lampLight(s, k, st) + oneLight(s))*s.ao + ']], 'library');
    this.material = lit
      ? new THREE.ShaderMaterial({ uniforms: { ...lib.material.uniforms, ...this.uniforms }, vertexShader: lib.material.vertexShader, fragmentShader: lit, side: lib.material.side })
      : lib.material;
  }

  // the library's floors drawn with this lamp's light on them
  attach(lib) {
    for (const L of lib.lods) L.floor.material = this.material;
    return this;
  }

  // its colour (linear RGB, a THREE.Color) at a level (as a floor's lamp level: the library's lime lamps of s44
  // are 0.6); its light on the stone follows the library's uLampI (× uShaftK for a shaft lamp), so call this
  // after the shot sets those. cast: the share of that light it is let to throw (1: as the library's lamps)
  set(col, level, cast = 1) {
    this.uniforms.uOneCol.value.copy(col).multiplyScalar(level);
    this.uniforms.uOneLight.value.copy(col).multiplyScalar(cast * level * this.U.uLampI.value * (this.shaft ? this.U.uShaftK.value : 1));
    this.group.visible = level > 0;
    return this;
  }
}

// The haze round a lamp seen from far off: a soft disc of light, added to the picture, that turns to the
// camera (s43: the lighthouse's lantern from the top of the well, whose roof hides the lamp itself).
const GLOW_VERT = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
}
`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uCol;
uniform float uCore;
varying vec2 vP;
void main(){
  float r2 = dot(vP, vP);
  float g = (exp(-r2*14.0) + uCore*exp(-r2*220.0))*smoothstep(1.0, 0.4, r2);
  gl_FragColor = vec4(uCol*g, 1.0);
}
`;
export class HazeGlow {
  // radius (m): where the disc ends; core: the bright middle's share; depth: false lets it spill over
  // whatever stands before it, as glare does
  constructor({ radius = 10, core = 2, depth = true } = {}) {
    this.uniforms = { uCol: { value: new THREE.Color(0, 0, 0) }, uCore: { value: core } };
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true, depthWrite: false, depthTest: depth, blending: THREE.AdditiveBlending }),
    );
    this.mesh.scale.setScalar(radius);
    this.mesh.renderOrder = 14; // after the lighthouse's own halo (13)
  }

  set(col, level) {
    this.uniforms.uCol.value.copy(col).multiplyScalar(level);
    this.mesh.visible = level > 0;
    return this;
  }

  update(camera) {
    this.mesh.quaternion.copy(camera.quaternion);
    return this;
  }
}
