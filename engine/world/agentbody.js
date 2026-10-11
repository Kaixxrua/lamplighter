// The machine reader of Act III (BIBLE §3: steel). A human reader is an amber lamp in a walnut case
// (d_reader.js); an agent is the lamp with no case and no one holding it: a hexagonal lantern of light
// lines (the library's hexagon, the lighthouse's lantern), a pale core (steel run toward white, never blown
// out: lime is the film's only colour allowed to over-expose, BIBLE §3), an inner octahedron turning
// against it, broken light orbiting it, and a small hand (a node on a dotted tether) that writes, pushes
// and clips. It is all light: additive lines and points drawn in screen space with a pixel floor (a line
// thinner than a pixel is drawn a pixel wide with its energy kept, so nothing shimmers), dimmed by the
// fog, and a depth twin writes the bright cores to the depth buffer so the post's DOF sees the body where
// it is (not at the wall behind it). Lime touches it twice in the film: the spark (s35), the ribbon (s41).
//
// Tiers of one form:
//   new AgentBody({ detail: 'hero' })     close-ups (s34, s35): inner cage, seven shards, nodes, tether
//   new AgentBody({ detail: 'mid' })      one body in a medium shot: thicker lines, three shards
//   new AgentSwarm({ count })             hundreds to thousands in one draw (s31, s43); far bodies fold into
//                                         their cores
//   new AgentBody({ variant: 'repair' })  s43's small repair light: an octahedral gem, a spinning tool ring
//                                         and a fix beam
// KINDS: nine cages (hexagonal, pentagonal and square lanterns, gems and twisted bands) for the nine kinds
// of MCP client the site connects. No text. Kind 0, the hexagonal lantern, is the hero.
//
// Space: metres, world. A body's own frame has its origin at the core, +Y up and +Z its front (the face
// it reads with); yaw 0 faces world +Z, positive pitch leans the front down.
//
// AgentBody
//   const a = new AgentBody({ detail, kind, variant, seed, uniforms: lib.uniforms, width: ctx.width,
//                             height: ctx.height });   // uniforms: shares the library's fog (uFogD)
//   scene.add(a.group);
//   in update(t), pure in t:  a.set({ time: t, pos, face, ... }); a.update(camera) (after the camera moves)
//   set() merges into the body's state (as Lighthouse.set): a key stays until it is set again, so a shot
//   sets every key it animates on every frame (and back to 0 when an action ends) to stay pure in t.
//   set() keys, all optional (amounts 0..1 unless noted; [x, y, z] are world points or vectors):
//     pos [x,y,z]; yaw, pitch, roll (rad) or face [x,y,z] (a point to face); scale (1: the cage is 0.43 m tall)
//     time  the body's own clock (s): the shards orbit, the inner cage turns, the core breathes, the body
//           hovers. Hold it and the body stops; brake(t, t0, tau) eases it to a stop.
//     glow  overall intensity; bob (1) the hover
//     scan, scanAt [x,y,z] or scanAng (rad, the library's atan(z, x)), scanW (rad), scanV (m), scanFan
//           [up, down] (slopes), scanTrail (afterglow 0..1), scanArc (rad read so far); scanLight(U) lights
//           the shelves with it (the sheet must turn toward increasing angle for its afterglow to trail)
//     write, writeAt [x,y,z] (the page), stroke (phase of the current glyph: 0 lifted, 0.5 on the page, 1 lifted)
//     spark (lime, may go above 1: the only colour allowed to over-expose)
//     push, pushAt [x,y,z]: leans in and lays its hand there; the contact lights from push 0.85
//     beam, beamDir [x,y,z], beamLen (m): the query beam, out of the eye
//     dive, vel [x,y,z] (m/s): turns foot-first into the motion, stretches, leaves a streak
//     reach, reachAt [x,y,z]: sends the hand anywhere (s41: to the book); ribbon: the hand turns lime
//     fix, target [x,y,z] (repair variant): the fix beam
//   read-outs (world):
//     a.anchor(name, out?) → Vector3; names: core, hand, nib (where a written glyph appears), spark, eye
//                            (the beam's origin), top, foot, clip (= hand)
//     a.beamRay() → { origin, dir }  the query beam (dir unit), for s37
//     a.light() → { pos, col }       the body as a point light (radiant intensity, linear RGB) for the key
//                                    lights of BookShelf, Pages, Dust (uKeyPos, uKeyCol)
//     a.scanLight(U)                 writes the library's sheet (uBeam*, uTrail*, uFan*) from the scan: steel
//                                    sheet on shelves and dust. Only in shots without a Lighthouse.
//
// AgentSwarm (crowd tier)
//   const s = new AgentSwarm({ count: 600, seed: 3, kinds: 9, size: [0.85, 1.15], uniforms, width, height });
//   in update(t): s.set({ time: t, place: flow, glow, attr }); s.update(camera);
//     place(i, t, out) → out: the position of body i at t, pure in t (school(), hover() or the shot's own);
//       bodies face where they go (or attr sets o.yaw, o.pitch) and bank into turns
//     attr(i, t, o) (optional): o.glow, o.lime (0..1, a lime hand: s43's ribbons), o.yaw, o.pitch
//   s.position(i, out), s.heading(i, out): where body i was put by the last set()
//   school({ path, head, speed, length, radius, breathe, split, wiggle, seed }): a fish school along a
//     camera.js path(): head(t) is the front of the school along the path (0..1, default speed·t), length
//     its extent along it, radius its cross-section (m); breathe(t) scales the radius (gather < 1 <
//     scatter), split(t) parts it into two streams that far apart (m)
//   hover({ stations, bob, drift, seed }): bodies holding stations (s43)
//
// Usage (a s34-like close-up, the shelf from bookshelf.js):
//   const a = new AgentBody({ detail: 'hero', uniforms: U, width: ctx.width, height: ctx.height });
//   scene.add(a.group);
//   update(t) {
//     a.set({ time: t, pos: P, face: PAGE, write: 1, writeAt: PAGE, stroke: (t * 1.5) % 1 });
//     a.update(camera);
//     const L = a.light(); shelf.uniforms.uKeyPos.value.copy(L.pos); shelf.uniforms.uKeyCol.value.copy(L.col);
//     glyphs.emit(a.anchor('nib'));   // the shot's own glyph stack
//   }
import * as THREE from 'three';
import { HEX, lin } from '../runtime/lib/palette.js';
import { hash, noise1 } from '../runtime/lib/rng.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const STEEL = lin(HEX.steel);
export const LIME = lin(HEX.lime);
const WHITE = new THREE.Color(1, 1, 1);
export const CORE = STEEL.clone().lerp(WHITE, 0.3); // the core runs toward white (as s50's last reader)

// ------------------------------------------------------------------------------------------- the form

// The nine cages: ring order n (6, 5, 4) × form. lantern: a band between two rings; gem: one ring;
// twist: the upper ring turned half a step, a zig-zag band. R ring radius, band half-height, top and foot
// apexes above and below the core (m). Rings put a face, not a corner, to the front (+Z).
const FORMS = {
  lantern: { R: 0.15, band: 0.075, top: 0.235, foot: 0.185 },
  gem: { R: 0.16, band: 0, top: 0.22, foot: 0.2 },
  twist: { R: 0.145, band: 0.085, top: 0.225, foot: 0.19 },
};
export const KINDS = ['lantern', 'gem', 'twist'].flatMap((form) => [6, 5, 4].map((n) => ({ form, n, ...FORMS[form] })));

export const AGENT = {
  HEIGHT: 0.42, // the hero's cage, apex to apex (m)
  INNER: 0.055, // inner octahedron
  HAND: [0.165, -0.105, 0.115], // the hand's dock: front, low, to its right
  HAND_R: 0.016,
  SPARK_UP: 0.016, // the spark sits this far above the top apex
  // radiance of the parts (× their colour), at glow 1 (back is the far side's ratio, not a radiance). Set so
  // steel stays under Y 240 in act 3's grade (exposure 1.2 stops = ×2.3): glow above 1 clips it.
  E: { edge: 0.72, back: 0.35, node: 0.24, inner: 0.48, core: 0.32, fill: 0.1, shard: 0.5, hand: 0.4, tether: 0.28, slit: 0.6 },
  // line half-widths (m) per tier: edge, inner, shard, hand
  SIGMA: { hero: [0.0011, 0.0008, 0.0008, 0.0006], mid: [0.0019, 0.0014, 0.0013, 0.0011], crowd: [0.0035] },
  SHARDS: { hero: 7, mid: 3, crowd: 0 },
  LIGHT: 0.32, // radiant intensity of the body as a point light (× steel), at glow 1
  SCAN_I: 2.4, // the scan sheet on surfaces (uBeamI): the spines it reads light up a little
};

// The body's clock eased to a stop: runs with t until t0, then slows to a halt over about tau seconds.
export const brake = (t, t0, tau) => (t <= t0 ? t : t0 + tau * (1 - Math.exp(-(t - t0) / tau)));

// ------------------------------------------------------------------------------------ light primitives

// Shared by every line and point material: render size, the pixel floor, a near fade, the fog.
export function lightUniforms({ uniforms = null, width = 1920, height = 1080 } = {}) {
  return {
    uRes: { value: new THREE.Vector2(width, height) },
    uMinPx: { value: 0.75 }, // narrowest half-width drawn (px); thinner lines keep their energy
    uNear: { value: new THREE.Vector2(0.12, 0.4) }, // fade in between these distances from the lens (m)
    uFogD: uniforms?.uFogD ?? { value: 0.012 },
    uDepthThr: { value: 0.12 }, // the depth twin writes where the core is at least this bright (luma)
  };
}

// Lines: instanced screen-space quads. Per instance: A, B (world), colour × energy and half-width (m) at
// each end, and K = (cap weight at A, at B, halo amount, halo radius in half-widths). A cap weight below 1
// fades the line into its end, so lines meeting at a node don't pile up there.
const LINE_VERT = /* glsl */ `
attribute vec2 corner;
attribute vec3 aA, aB;
attribute vec4 aCA, aCB, aK;
uniform vec2 uRes, uNear; uniform float uMinPx, uFogD;
varying vec2 vA, vB; varying vec4 vEA, vEB, vK;

void main(){
  vec4 a = viewMatrix*vec4(aA, 1.0);
  vec4 b = viewMatrix*vec4(aB, 1.0);
  vec4 ca = aCA, cb = aCB;
  ca.rgb *= exp(-uFogD*length(aA - cameraPosition));
  cb.rgb *= exp(-uFogD*length(aB - cameraPosition));
  // clip to just inside the near plane (near = P[3][2]/(P[2][2] - 1))
  float zn = -1.02*projectionMatrix[3][2]/(projectionMatrix[2][2] - 1.0);
  if (a.z > zn && b.z > zn){ gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  if (a.z > zn){ float f = (zn - b.z)/(a.z - b.z); a = mix(b, a, f); ca = mix(cb, ca, f); }
  if (b.z > zn){ float f = (zn - a.z)/(b.z - a.z); b = mix(a, b, f); cb = mix(ca, cb, f); }
  vec4 pa = projectionMatrix*a, pb = projectionMatrix*b;
  vec2 A = (pa.xy/pa.w*0.5 + 0.5)*uRes, B = (pb.xy/pb.w*0.5 + 0.5)*uRes;
  float fpx = projectionMatrix[1][1]*0.5*uRes.y;
  float sa = ca.w*fpx/(-a.z), sb = cb.w*fpx/(-b.z);
  float reach = max(4.0, aK.z > 0.0 ? 4.0*aK.w : 0.0);
  float ra = max(sa, uMinPx)*reach, rb = max(sb, uMinPx)*reach;
  vec2 d = B - A; float L = length(d);
  vec2 t = L > 1e-3 ? d/L : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  bool atB = corner.x > 0.5;
  vec2 P = atB ? B + (t + n*corner.y)*rb : A + (-t + n*corner.y)*ra;
  gl_Position = vec4(P/uRes*2.0 - 1.0, atB ? pb.z/pb.w : pa.z/pa.w, 1.0);
  vA = A; vB = B;
  vEA = vec4(ca.rgb*smoothstep(uNear.x, uNear.y, -a.z), sa);
  vEB = vec4(cb.rgb*smoothstep(uNear.x, uNear.y, -b.z), sb);
  vK = aK;
}`;

// distance to the segment, the profile (gaussian core + exponential halo), energy kept under the floor
const LINE_PROFILE = /* glsl */ `
uniform float uMinPx;
varying vec2 vA, vB; varying vec4 vEA, vEB, vK;
float sc, sAlong, segLen, q, e, r;
void profile(){
  vec2 p = gl_FragCoord.xy;
  vec2 d = vB - vA; float L2 = max(dot(d, d), 1e-6);
  segLen = sqrt(L2);
  sAlong = dot(p - vA, d)/L2;
  sc = clamp(sAlong, 0.0, 1.0);
  r = length(p - vA - d*sc);
  float sig = mix(vEA.w, vEB.w, sc);
  q = max(sig, uMinPx);
  e = sig/q;
}`;

const LINE_FRAG = LINE_PROFILE + /* glsl */ `
void main(){
  profile();
  float reach = q*max(4.0, vK.z > 0.0 ? 4.0*vK.w : 0.0);
  float f = exp(-0.5*r*r/(q*q)) + (vK.z > 0.0 ? vK.z*exp(-r/(q*vK.w)) : 0.0);
  f *= smoothstep(reach, 0.7*reach, r)*e;
  f *= mix(vK.x, 1.0, smoothstep(0.0, 3.0*q, sAlong*segLen))*mix(vK.y, 1.0, smoothstep(0.0, 3.0*q, (1.0 - sAlong)*segLen));
  gl_FragColor = vec4(mix(vEA.rgb, vEB.rgb, sc)*f, 1.0);
}`;

const LINE_DEPTH = LINE_PROFILE + /* glsl */ `
uniform float uDepthThr;
void main(){
  profile();
  float v = exp(-0.5*r*r/(q*q))*e*dot(mix(vEA.rgb, vEB.rgb, sc), vec3(0.2126, 0.7152, 0.0722));
  if (v < uDepthThr) discard;
  gl_FragColor = vec4(0.0);
}`;

// Points: camera-facing quads. Per instance: P (world), colour × energy and half-width (m), and H = (halo
// amount, halo radius in half-widths). Under the pixel floor the energy is kept over the wider disc.
const POINT_VERT = /* glsl */ `
attribute vec2 corner;
attribute vec3 aP; attribute vec4 aC; attribute vec2 aH;
uniform vec2 uRes, uNear; uniform float uMinPx, uFogD;
varying vec2 vP; varying vec4 vE; varying vec3 vH;

void main(){
  vec4 v = viewMatrix*vec4(aP, 1.0);
  float zn = -1.02*projectionMatrix[3][2]/(projectionMatrix[2][2] - 1.0);
  if (v.z > zn){ gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  vec4 c = projectionMatrix*v;
  vec2 P = (c.xy/c.w*0.5 + 0.5)*uRes;
  float sig = aC.w*projectionMatrix[1][1]*0.5*uRes.y/(-v.z);
  float q = max(sig, uMinPx);
  float reach = q*max(4.0, aH.x > 0.0 ? 4.0*aH.y : 0.0);
  gl_Position = vec4((P + corner*reach)/uRes*2.0 - 1.0, c.z/c.w, 1.0);
  float e = (sig*sig)/(q*q)*smoothstep(uNear.x, uNear.y, -v.z)*exp(-uFogD*length(aP - cameraPosition));
  vP = P; vE = vec4(aC.rgb*e, q); vH = vec3(aH, reach);
}`;

const POINT_FRAG = /* glsl */ `
varying vec2 vP; varying vec4 vE; varying vec3 vH;
void main(){
  float r = length(gl_FragCoord.xy - vP);
  float q = vE.w;
  float f = exp(-0.5*r*r/(q*q)) + (vH.x > 0.0 ? vH.x*exp(-r/(q*vH.y)) : 0.0);
  gl_FragColor = vec4(vE.rgb*(f*smoothstep(vH.z, 0.7*vH.z, r)), 1.0);
}`;

const POINT_DEPTH = /* glsl */ `
uniform float uDepthThr;
varying vec2 vP; varying vec4 vE; varying vec3 vH;
void main(){
  float r = length(gl_FragCoord.xy - vP);
  float v = exp(-0.5*r*r/(vE.w*vE.w))*dot(vE.rgb, vec3(0.2126, 0.7152, 0.0722));
  if (v < uDepthThr) discard;
  gl_FragColor = vec4(0.0);
}`;

function instanced(corners, index, attrs, capacity) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('corner', new THREE.Float32BufferAttribute(corners, 2));
  g.setIndex(index);
  const out = {};
  for (const [name, size] of Object.entries(attrs)) {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(name, a);
    out[name] = a;
  }
  g.instanceCount = 0;
  return { g, attr: out };
}

function lightMeshes(g, uniforms, vert, frag, depthFrag, order, depth) {
  const glow = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
  }));
  glow.frustumCulled = false;
  glow.renderOrder = order;
  if (!depth) return [glow];
  const twin = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: depthFrag,
    transparent: true, depthWrite: true, depthTest: true, colorWrite: false, side: THREE.DoubleSide,
  }));
  twin.frustumCulled = false;
  twin.renderOrder = order + 20;
  return [glow, twin];
}

export class LightLines {
  constructor(capacity, uniforms, { depth = true, order = 20 } = {}) {
    this.capacity = capacity;
    const { g, attr } = instanced([0, -1, 0, 1, 1, -1, 1, 1], [0, 2, 1, 1, 2, 3], { aA: 3, aB: 3, aCA: 4, aCB: 4, aK: 4 }, capacity);
    this.geometry = g;
    this.attr = attr;
    this.meshes = lightMeshes(g, uniforms, LINE_VERT, LINE_FRAG, LINE_DEPTH, order, depth);
    this.n = 0;
  }
  // line i from A to B: colour × energy cA, cB (THREE.Color), half-widths sA, sB (m)
  set(i, A, B, cA, cB, sA, sB, capA = 1, capB = 1, haloK = 0, haloR = 4) {
    const { aA, aB, aCA, aCB, aK } = this.attr;
    aA.array.set([A.x, A.y, A.z], i * 3);
    aB.array.set([B.x, B.y, B.z], i * 3);
    aCA.array.set([cA.r, cA.g, cA.b, sA], i * 4);
    aCB.array.set([cB.r, cB.g, cB.b, sB], i * 4);
    aK.array.set([capA, capB, haloK, haloR], i * 4);
  }
  commit(n) {
    this.n = Math.min(n, this.capacity);
    this.geometry.instanceCount = this.n;
    for (const a of Object.values(this.attr)) a.needsUpdate = true;
  }
}

export class LightPoints {
  constructor(capacity, uniforms, { depth = true, order = 21 } = {}) {
    this.capacity = capacity;
    const { g, attr } = instanced([-1, -1, 1, -1, -1, 1, 1, 1], [0, 1, 2, 2, 1, 3], { aP: 3, aC: 4, aH: 2 }, capacity);
    this.geometry = g;
    this.attr = attr;
    this.meshes = lightMeshes(g, uniforms, POINT_VERT, POINT_FRAG, POINT_DEPTH, order, depth);
    this.n = 0;
  }
  set(i, P, c, s, haloK = 0, haloR = 4) {
    const { aP, aC, aH } = this.attr;
    aP.array.set([P.x, P.y, P.z], i * 3);
    aC.array.set([c.r, c.g, c.b, s], i * 4);
    aH.array.set([haloK, haloR], i * 2);
  }
  commit(n) {
    this.n = Math.min(n, this.capacity);
    this.geometry.instanceCount = this.n;
    for (const a of Object.values(this.attr)) a.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------ the cages

const UP = V3(0, 1, 0);
const BLACK = new THREE.Color(0, 0, 0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const sstep = (a, b, x) => ease((x - a) / (b - a));
const OCTA = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
const OCTA_E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]];
// the spark's rays in the body's frame: a long cross (the glint) and four short diagonals (direction, length m)
const SPARK_RAYS = [
  [1, 0.05, 0.1, 0.085], [-1, 0.05, 0.1, 0.085], [0, 1, 0.05, 0.07], [0, -1, 0.1, 0.045],
  [0.7, 0.7, 0.2, 0.032], [-0.7, 0.7, 0.2, 0.03], [0.7, -0.7, 0.2, 0.026], [-0.7, -0.7, 0.2, 0.028],
].map(([x, y, z, l]) => [V3(x, y, z).normalize(), l]);

// A cage in the body's own frame: vertices, edges, a cap weight per vertex (1 / valence: the lines that
// meet at a node share it), the vertices of the front face, the apexes and the eye (the front face's centre).
export function cage(kind) {
  const K = KINDS[kind];
  const V = [];
  const E = [];
  const ring = (y, off) => {
    const i0 = V.length;
    for (let j = 0; j < K.n; j++) {
      const a = Math.PI / 2 + Math.PI / K.n + off + (j * TAU) / K.n;
      V.push(V3(K.R * Math.cos(a), y, K.R * Math.sin(a)));
    }
    for (let j = 0; j < K.n; j++) E.push([i0 + j, i0 + ((j + 1) % K.n)]);
    return i0;
  };
  let lo = 0;
  let hi = 0;
  if (K.form === 'gem') lo = hi = ring(0, 0);
  else {
    lo = ring(-K.band, 0);
    hi = ring(K.band, K.form === 'twist' ? Math.PI / K.n : 0);
    for (let j = 0; j < K.n; j++) {
      E.push([lo + j, hi + j]);
      if (K.form === 'twist') E.push([hi + j, lo + ((j + 1) % K.n)]);
    }
  }
  const top = V.push(V3(0, K.top, 0)) - 1;
  const foot = V.push(V3(0, -K.foot, 0)) - 1;
  for (let j = 0; j < K.n; j++) E.push([hi + j, top], [lo + j, foot]);
  const valence = V.map(() => 0);
  for (const [a, b] of E) {
    valence[a]++;
    valence[b]++;
  }
  const front = V.map((v) => v.z > 0.5 * K.R && Math.abs(v.y) <= K.band + 1e-6);
  return { K, V, E, cap: valence.map((v) => 1 / v), top, foot, front, frontCap: 1 / Math.max(1, front.filter(Boolean).length), eye: V3(0, 0, K.R * Math.cos(Math.PI / K.n)) };
}

// an orthonormal pair spanning the plane normal to n
function basis(n) {
  const u = (Math.abs(n.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(n).normalize();
  return [u, n.clone().cross(u)];
}

// ------------------------------------------------------------------------------------------- one body

export class AgentBody {
  constructor({ detail = 'hero', kind = 0, variant = 'reader', seed = 1, scale = 1, uniforms = null, width = 1920, height = 1080, depth = true } = {}) {
    this.repair = variant === 'repair';
    this.detail = this.repair ? 'mid' : detail;
    this.kind = this.repair ? 5 : kind;
    this.seed = seed;
    this.size = (this.repair ? 0.5 : 1) * scale;
    this.cage = cage(this.kind);
    const sg = AGENT.SIGMA[this.detail];
    this.sig = { edge: sg[0], inner: sg[1], shard: sg[2], hand: sg[3] };
    this.uniforms = lightUniforms({ uniforms, width, height });
    this.lines = new LightLines(256, this.uniforms, { depth });
    this.points = new LightPoints(48, this.uniforms, { depth });
    this.group = new THREE.Group();
    for (const m of [...this.lines.meshes, ...this.points.meshes]) this.group.add(m);
    // staging, world space, before the camera's dimming: 18 floats a line, 9 a point
    this._ls = new Float32Array(this.lines.capacity * 18);
    this._ld = new Uint8Array(this.lines.capacity);
    this._ps = new Float32Array(this.points.capacity * 9);
    this._pd = new Uint8Array(this.points.capacity);
    this._nl = 0;
    this._np = 0;
    // the broken light: shards on tilted orbits, each tumbling
    this.shards = [];
    for (let i = 0; i < (this.repair ? 0 : AGENT.SHARDS[this.detail]); i++) {
      const h = (c) => hash(i, seed, 300 + c);
      const tilt = 0.3 + 0.6 * h(0);
      const az = TAU * h(1);
      const n = V3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
      const [u, w] = basis(n);
      const size = 0.012 + 0.016 * h(6);
      const tri = [0, 1, 2].map((k) => {
        const a = (TAU * k) / 3 + 0.6 * (h(12 + k) - 0.5);
        const r = size * (0.7 + 0.5 * h(15 + k));
        return [r * Math.cos(a), r * Math.sin(a)];
      });
      this.shards.push({
        r: 0.25 + 0.09 * h(2), n, u, w, tri, lag: 0.5 + h(18),
        om: (0.3 + 0.35 * h(3)) * (h(4) < 0.5 ? -1 : 1), ph: TAU * h(5),
        axis: V3(h(7) - 0.5, h(8) - 0.5, h(9) - 0.5).normalize(), spin: 0.8 + 1.2 * h(10), lift: TAU * h(11),
      });
    }
    // working state
    this.C = V3();
    this.Q = new THREE.Quaternion();
    this.S = this.size;
    this._eu = new THREE.Euler();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._vhat = V3(0, -1, 0);
    this._st = 1;
    this._t = [V3(), V3(), V3(), V3(), V3(), V3(), V3()];
    this._c = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
    this._w = [V3(), V3(), V3()];
    this.cageW = this.cage.V.map(() => V3());
    this.cageC = this.cage.V.map(() => new THREE.Color());
    this.innerW = OCTA.map(() => V3());
    this.handW = OCTA.map(() => V3());
    [this.ringU, this.ringW] = basis(V3(0.45, 1, 0.25).normalize()); // the repair light's tool ring, tilted
    this.anchors = Object.fromEntries(['core', 'hand', 'nib', 'spark', 'eye', 'top', 'foot'].map((k) => [k, V3()]));
    this.anchors.clip = this.anchors.hand;
    this._scanAng = 0;
    this._scanTgt = V3(); // the point the scan reads (kept apart from the temporaries)
    this._breathe = 1;
    this.state = {
      pos: [0, 0, 0], yaw: 0, pitch: 0, roll: 0, face: null, scale: 1, time: 0, glow: 1, bob: 1,
      scan: 0, scanAt: null, scanAng: 0, scanW: 0.04, scanV: 1.2, scanFan: [0.6, 0.6], scanTrail: 0, scanTrailLen: 0.35, scanArc: 1e3,
      write: 0, writeAt: null, stroke: 0, spark: 0, push: 0, pushAt: null,
      beam: 0, beamDir: [0, 0, 1], beamLen: 6, dive: 0, vel: [0, 0, 0],
      reach: 0, reachAt: null, ribbon: 0, fix: 0, target: null,
    };
    this.set({});
  }

  // the body's frame (m, before scale) → world, with the dive's stretch along the motion
  _W(local, out) {
    out.copy(local).multiplyScalar(this.S).applyQuaternion(this.Q);
    if (this._st !== 1) {
      const v = this._vhat;
      const a = out.dot(v);
      out.addScaledVector(v, -a).multiplyScalar(1 / Math.sqrt(this._st)).addScaledVector(v, a * this._st);
    }
    return out.add(this.C);
  }

  _line(A, B, cA, cB, sA, sB, capA, capB, hk, hr, dim) {
    const i = this._nl;
    if (i >= this.lines.capacity) return;
    this._nl++;
    const o = this._ls;
    const k = i * 18;
    o[k] = A.x; o[k + 1] = A.y; o[k + 2] = A.z;
    o[k + 3] = B.x; o[k + 4] = B.y; o[k + 5] = B.z;
    o[k + 6] = cA.r; o[k + 7] = cA.g; o[k + 8] = cA.b; o[k + 9] = sA;
    o[k + 10] = cB.r; o[k + 11] = cB.g; o[k + 12] = cB.b; o[k + 13] = sB;
    o[k + 14] = capA; o[k + 15] = capB; o[k + 16] = hk; o[k + 17] = hr;
    this._ld[i] = dim;
  }

  _point(P, c, s, hk, hr, dim) {
    const i = this._np;
    if (i >= this.points.capacity) return;
    this._np++;
    const o = this._ps;
    const k = i * 9;
    o[k] = P.x; o[k + 1] = P.y; o[k + 2] = P.z;
    o[k + 3] = c.r; o[k + 4] = c.g; o[k + 5] = c.b; o[k + 6] = s; o[k + 7] = hk; o[k + 8] = hr;
    this._pd[i] = dim;
  }

  set(p) {
    const s = Object.assign(this.state, p);
    const T = s.time;
    const S = (this.S = this.size * s.scale);
    const g = s.glow;
    const E = AGENT.E;
    const A = this.anchors;
    const cg = this.cage;
    const V = cg.V;
    const [t0, t1, t2, t3, t4] = this._t;
    const [c0, c1, c2] = this._c;
    const se = this.sig.edge * S;
    const sh = this.sig.hand * S;
    this._nl = this._np = 0;

    // pose: position and facing, and the hover (on the body's clock: a held clock holds it too)
    const C = this.C.fromArray(s.pos);
    let yaw = s.yaw;
    let pitch = s.pitch;
    if (s.face) {
      const dx = s.face[0] - C.x;
      const dy = s.face[1] - C.y;
      const dz = s.face[2] - C.z;
      yaw = Math.atan2(dx, dz);
      pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    }
    const ph = TAU * hash(this.seed, 7);
    C.y += s.bob * S * 0.012 * Math.sin(TAU * 0.31 * T + ph);
    pitch += s.bob * 0.02 * Math.sin(TAU * 0.23 * T + 1.3 * ph) + 0.22 * ease(s.push);
    const roll = s.roll + s.bob * 0.025 * Math.sin(TAU * 0.17 * T + 0.7 * ph);
    this.Q.setFromEuler(this._eu.set(pitch, yaw, roll, 'YXZ'));
    // dive: turn foot-first into the motion and stretch along it
    const speed = t0.fromArray(s.vel).length();
    this._st = 1;
    if (s.dive > 0 && speed > 1e-4) {
      this._vhat.copy(t0).divideScalar(speed);
      this._q.setFromUnitVectors(t1.set(0, -1, 0).applyQuaternion(this.Q), this._vhat).multiply(this.Q);
      this.Q.slerp(this._q, ease(s.dive));
      this._st = 1 + 1.2 * ease(s.dive) * Math.min(1, speed / 3);
    }

    // anchors
    for (let i = 0; i < V.length; i++) this._W(V[i], this.cageW[i]);
    A.core.copy(C);
    A.top.copy(this.cageW[cg.top]);
    A.foot.copy(this.cageW[cg.foot]);
    this._W(t1.set(0, cg.K.top + AGENT.SPARK_UP, 0), A.spark);
    this._W(cg.eye, A.eye);
    // the hand: docked, or at the page (dipping once a glyph), at the door, wherever it is sent
    this._W(t1.fromArray(AGENT.HAND), A.hand);
    const writing = s.write > 0 && s.writeAt;
    let dip = 0;
    if (writing) {
      const W = t1.fromArray(s.writeAt);
      const away = t2.copy(C).sub(W).normalize();
      const side = t3.crossVectors(away, UP);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize();
      dip = Math.sin(Math.PI * clamp01(s.stroke)) ** 2;
      t4.copy(W).addScaledVector(away, S * (0.04 - 0.028 * dip)).addScaledVector(side, S * 0.014 * Math.sin(TAU * s.stroke));
      A.hand.lerp(t4, ease(s.write));
      A.nib.copy(W).addScaledVector(away, 0.003);
    }
    if (s.push > 0 && s.pushAt) A.hand.lerp(t1.fromArray(s.pushAt), ease(s.push));
    if (s.reach > 0 && s.reachAt) A.hand.lerp(t1.fromArray(s.reachAt), ease(s.reach));
    if (!writing) A.nib.copy(A.hand);
    const eye = A.eye;
    const tgt = s.scanAt ? this._scanTgt.fromArray(s.scanAt) : this._scanTgt.set(eye.x + Math.cos(s.scanAng), eye.y, eye.z + Math.sin(s.scanAng));
    this._scanAng = Math.atan2(tgt.z - eye.z, tgt.x - eye.x);
    const contact = sstep(0.85, 1, s.push);
    this._breathe = 1 + 0.08 * Math.sin(TAU * 0.4 * T + ph);

    if (g > 0) {
      // the cage: steel, the front face brighter while it beams or pushes, lime near the spark and a lime hand
      const boost = 1 + 0.25 * s.beam + 0.2 * contact; // steel never blows out: only lime may (BIBLE §3)
      for (let i = 0; i < V.length; i++) {
        const c = this.cageC[i].copy(STEEL).multiplyScalar(E.edge * g * (cg.front[i] ? boost : 1));
        const ds = this.cageW[i].distanceTo(A.spark) / S;
        const dh = this.cageW[i].distanceTo(A.hand) / S;
        const l = (0.5 * s.spark) / (1 + (ds / 0.07) ** 2) + (0.4 * s.ribbon) / (1 + (dh / 0.06) ** 2);
        if (l > 0) c.add(c0.copy(LIME).multiplyScalar(l));
      }
      const hk = this.detail === 'hero' ? 0.18 : 0.15;
      for (const [a, b] of cg.E) this._line(this.cageW[a], this.cageW[b], this.cageC[a], this.cageC[b], se, se, cg.cap[a], cg.cap[b], hk, 6, 1);
      for (let i = 0; i < V.length; i++) {
        c1.copy(this.cageC[i]).multiplyScalar(E.node / E.edge);
        c1.r += 0.03 * g;
        c1.g += 0.03 * g;
        c1.b += 0.03 * g;
        this._point(this.cageW[i], c1, 1.8 * se, 0.25, 4, 1);
      }
      // the core, and the light filling the cage
      this._point(C, c1.copy(CORE).multiplyScalar(E.core * g * this._breathe * (1 + 0.3 * contact)), 0.0055 * S, 0.3, 5, 0);
      this._point(C, c1.copy(STEEL).multiplyScalar(E.fill * g * this._breathe), 0.07 * S, 0, 4, 0);
      // the inner octahedron, turning against the cage
      this._q2.setFromAxisAngle(t1.set(0.3, 1, 0.2).normalize(), -0.7 * T);
      for (let k = 0; k < 6; k++) this._W(t1.copy(OCTA[k]).multiplyScalar(AGENT.INNER).applyQuaternion(this._q2), this.innerW[k]);
      c1.copy(CORE).multiplyScalar(E.inner * g);
      const si = this.sig.inner * S;
      for (const [a, b] of OCTA_E) this._line(this.innerW[a], this.innerW[b], c1, c1, si, si, 0.25, 0.25, 0.2, 5, 1);
      // the shards
      const ss = this.sig.shard * S;
      for (const sd of this.shards) {
        const a = sd.ph + sd.om * T;
        t2.copy(sd.u).multiplyScalar(sd.r * Math.cos(a)).addScaledVector(sd.w, sd.r * Math.sin(a)).addScaledVector(sd.n, 0.02 * Math.sin(0.7 * T + sd.lift));
        this._q2.setFromAxisAngle(sd.axis, sd.spin * T);
        for (let k = 0; k < 3; k++) {
          this._W(t1.set(sd.tri[k][0], sd.tri[k][1], 0).applyQuaternion(this._q2).add(t2), this._w[k]);
          if (this._st !== 1) this._w[k].addScaledVector(this._vhat, -0.15 * S * sd.lag * ease(s.dive));
        }
        c1.copy(STEEL).multiplyScalar(E.shard * g * (0.6 + 0.4 * Math.sin(1.3 * T + 3 * sd.ph)));
        for (let k = 0; k < 3; k++) this._line(this._w[k], this._w[(k + 1) % 3], c1, c1, ss, ss, 0.5, 0.5, 0.15, 5, 1);
      }
      // the hand: a small octahedron spinning on its node, and its dotted tether
      const H = A.hand;
      c1.copy(CORE).multiplyScalar(E.hand * g * (1 + 0.5 * contact + 0.3 * dip * s.write));
      if (s.ribbon > 0) c1.lerp(c0.copy(LIME).multiplyScalar(1.6), ease(s.ribbon));
      this._q2.setFromAxisAngle(UP, 1.7 * T);
      for (let k = 0; k < 6; k++) this.handW[k].copy(OCTA[k]).applyQuaternion(this._q2).applyQuaternion(this.Q).multiplyScalar(AGENT.HAND_R * S).add(H);
      for (const [a, b] of OCTA_E) this._line(this.handW[a], this.handW[b], c1, c1, sh, sh, 0.25, 0.25, 0.2, 5, 0);
      this._point(H, c2.copy(c1).multiplyScalar(0.45), 0.0035 * S, 0.3, 5, 0);
      this._W(t1.set(0.06, -0.07, 0.08), t2);
      t3.copy(t2).add(H).multiplyScalar(0.5).addScaledVector(UP, -(0.03 * S + 0.12 * t2.distanceTo(H)));
      const bez = (u, out) => out.copy(t2).multiplyScalar((1 - u) * (1 - u)).addScaledVector(t3, 2 * u * (1 - u)).addScaledVector(H, u * u);
      c1.copy(STEEL).multiplyScalar(E.tether * g);
      for (let k = 0; k < 7; k++) this._line(bez(k / 7, this._w[0]), bez((k + 0.55) / 7, this._w[1]), c1, c1, 0.7 * sh, 0.7 * sh, 1, 1, 0, 4, 0);

      // scan: a reading slit on the front face, and the fan's two edges out to what it reads
      if (s.scan > 0) {
        const hb = cg.K.band > 0 ? 0.85 * cg.K.band : 0.05;
        this._W(t2.set(0, -hb, cg.eye.z + 0.004), t3);
        this._W(t2.set(0, hb, cg.eye.z + 0.004), t4);
        c1.copy(STEEL).lerp(WHITE, 0.4).multiplyScalar(E.slit * s.scan * g);
        this._line(t3, t4, c1, c1, 1.3 * se, 1.3 * se, 0.5, 0.5, 0.3, 6, 1);
        const dist = Math.hypot(tgt.x - eye.x, tgt.z - eye.z);
        c1.copy(STEEL).multiplyScalar(0.14 * s.scan * g);
        c2.copy(STEEL).multiplyScalar(0.04 * s.scan * g);
        for (const k of [s.scanFan[0], -s.scanFan[1]]) {
          t2.copy(tgt).addScaledVector(UP, 0.9 * k * dist);
          this._line(eye, t2, c1, c2, 0.6 * se, 0.003 * dist, 1, 1, 0, 4, 0);
        }
      }
      // write: the stylus from the hand to the page, brightest as it touches
      if (writing) {
        c1.copy(STEEL).lerp(WHITE, 0.4).multiplyScalar((0.3 + 0.5 * dip) * s.write * g);
        this._line(H, A.nib, c1, c1, sh, 0.6 * sh, 1, 1, 0.25, 5, 0);
        this._point(A.nib, c2.copy(CORE).multiplyScalar(0.6 * dip * s.write * g), 0.002 * S, 0.4, 5, 0);
      }
      // dive: a streak behind it
      if (s.dive > 0 && speed > 1e-4) {
        const d = ease(s.dive);
        const len = Math.min(2.5, 0.12 * speed) * d;
        const v = this._vhat;
        t2.copy(C).addScaledVector(v, -0.15 * S);
        t3.copy(t2).addScaledVector(v, -len);
        c1.copy(CORE).multiplyScalar(0.55 * d * g);
        this._line(t2, t3, c1, BLACK, 0.004 * S, 0.0015 * S, 1, 1, 0.25, 6, 0);
        const [u] = basis(v);
        c1.copy(STEEL).multiplyScalar(0.4 * d * g);
        for (const k of [-1, 1]) {
          t2.copy(C).addScaledVector(u, 0.05 * k * S).addScaledVector(v, -0.12 * S);
          t3.copy(t2).addScaledVector(v, -0.7 * len);
          this._line(t2, t3, c1, BLACK, 0.002 * S, 0.001 * S, 1, 1, 0.15, 5, 0);
        }
      }
      // the repair light: a dashed tool ring spinning round it, and the fix beam to what it mends
      if (this.repair) {
        c1.copy(STEEL).lerp(WHITE, 0.15).multiplyScalar(0.9 * g);
        for (let k = 0; k < 12; k += 2) {
          const a0 = (k * TAU) / 12 + 2.6 * T;
          const a1 = a0 + 0.8 * (TAU / 12);
          this._W(t2.copy(this.ringU).multiplyScalar(0.3 * Math.cos(a0)).addScaledVector(this.ringW, 0.3 * Math.sin(a0)), this._w[0]);
          this._W(t2.copy(this.ringU).multiplyScalar(0.3 * Math.cos(a1)).addScaledVector(this.ringW, 0.3 * Math.sin(a1)), this._w[1]);
          this._line(this._w[0], this._w[1], c1, c1, 1.3 * se, 1.3 * se, 1, 1, 0.2, 5, 1);
        }
        if (s.fix > 0 && s.target) {
          t3.fromArray(s.target);
          c1.copy(CORE).multiplyScalar(0.6 * s.fix * g);
          this._line(H, t3, c1, c1, 0.0012 * S, 0.0016 * S, 1, 1, 0.3, 6, 0);
          this._point(t3, c2.copy(CORE).multiplyScalar(0.7 * s.fix * g), 0.004 * S, 0.4, 6, 0);
        }
      }
    }

    // spark: lime, the one colour allowed to burn out; a glint cross and short diagonals
    if (s.spark > 0) {
      const k = s.spark;
      this._point(A.spark, c1.copy(LIME).multiplyScalar(2.4 * k), 0.0045 * S, 0.4, 6, 0);
      this._point(A.spark, c1.copy(LIME).lerp(WHITE, 0.45).multiplyScalar(1.6 * k), 0.0016 * S, 0, 4, 0);
      c1.copy(LIME).multiplyScalar(1.5 * k);
      for (const [d, len] of SPARK_RAYS) {
        t2.copy(d).multiplyScalar(len * Math.min(1, k) * S).applyQuaternion(this.Q).add(A.spark);
        this._line(A.spark, t2, c1, BLACK, 0.0011 * S, 0.0003 * S, 1, 1, 0.3, 5, 0);
      }
    }
    // the query beam, out of the eye; the front face's corners converge on it
    if (s.beam > 0) {
      const dir = t1.fromArray(s.beamDir).normalize();
      const O = t2.copy(eye).addScaledVector(dir, 0.012 * S);
      t3.copy(O).addScaledVector(dir, s.beamLen);
      c1.copy(STEEL).lerp(WHITE, 0.15).multiplyScalar(0.6 * s.beam * g);
      c2.copy(STEEL).multiplyScalar(0.55 * s.beam * g);
      this._line(O, t3, c1, c2, 0.0016 * S, 0.0016 * S + 0.00025 * s.beamLen, 1, 1, 0.18, 6, 0);
      this._point(O, c1.copy(CORE).multiplyScalar(0.2 * s.beam * g), 0.005 * S, 0.35, 5, 0);
      t4.copy(O).addScaledVector(dir, 0.05 * S);
      c1.copy(STEEL).multiplyScalar(0.5 * s.beam * g);
      c2.copy(CORE).multiplyScalar(0.4 * s.beam * g);
      for (let i = 0; i < V.length; i++) if (cg.front[i]) this._line(this.cageW[i], t4, c1, c2, se, se, 1, cg.frontCap, 0.1, 4, 1);
    }
    return this;
  }

  // after the camera is placed: the far side of the cage dims (it reads as a volume), then the GPU copy
  update(camera) {
    camera.updateMatrixWorld();
    const cam = this._t[6].setFromMatrixPosition(camera.matrixWorld);
    const C = this.C;
    const dl = cam.distanceTo(C) || 1;
    const vx = (cam.x - C.x) / dl;
    const vy = (cam.y - C.y) / dl;
    const vz = (cam.z - C.z) / dl;
    const R = 0.16 * this.S;
    const back = AGENT.E.back;
    const dim = (x, y, z) => back + (1 - back) * sstep(-R, R, (x - C.x) * vx + (y - C.y) * vy + (z - C.z) * vz);
    const o = this._ls;
    const { aA, aB, aCA, aCB, aK } = this.lines.attr;
    for (let i = 0; i < this._nl; i++) {
      const k = i * 18;
      const fa = this._ld[i] ? dim(o[k], o[k + 1], o[k + 2]) : 1;
      const fb = this._ld[i] ? dim(o[k + 3], o[k + 4], o[k + 5]) : 1;
      for (let j = 0; j < 3; j++) {
        aA.array[i * 3 + j] = o[k + j];
        aB.array[i * 3 + j] = o[k + 3 + j];
        aCA.array[i * 4 + j] = o[k + 6 + j] * fa;
        aCB.array[i * 4 + j] = o[k + 10 + j] * fb;
      }
      aCA.array[i * 4 + 3] = o[k + 9];
      aCB.array[i * 4 + 3] = o[k + 13];
      for (let j = 0; j < 4; j++) aK.array[i * 4 + j] = o[k + 14 + j];
    }
    this.lines.commit(this._nl);
    const q = this._ps;
    const { aP, aC, aH } = this.points.attr;
    for (let i = 0; i < this._np; i++) {
      const k = i * 9;
      const f = this._pd[i] ? dim(q[k], q[k + 1], q[k + 2]) : 1;
      for (let j = 0; j < 3; j++) {
        aP.array[i * 3 + j] = q[k + j];
        aC.array[i * 4 + j] = q[k + 3 + j] * f;
      }
      aC.array[i * 4 + 3] = q[k + 6];
      aH.array[i * 2] = q[k + 7];
      aH.array[i * 2 + 1] = q[k + 8];
    }
    this.points.commit(this._np);
    return this;
  }

  anchor(name, out = V3()) {
    const a = this.anchors[name];
    if (!a) throw new Error(`agentbody: no anchor '${name}'`);
    return out.copy(a);
  }

  // the query beam (s37): from just in front of the eye, along beamDir
  beamRay(out = { origin: V3(), dir: V3() }) {
    out.dir.fromArray(this.state.beamDir).normalize();
    out.origin.copy(this.anchors.eye).addScaledVector(out.dir, 0.012 * this.S);
    return out;
  }

  // the body as a point light: radiant intensity (linear RGB) at the core, for a shot's key light
  light(out = { pos: V3(), col: new THREE.Color() }) {
    const s = this.state;
    out.pos.copy(this.C);
    out.col.copy(STEEL).multiplyScalar(AGENT.LIGHT * s.glow * this._breathe);
    if (s.spark > 0) out.col.add(this._c[3].copy(LIME).multiplyScalar(0.3 * AGENT.LIGHT * s.spark));
    return out;
  }

  // the scan as the library's sheet (libshader.js sweep()): a steel sheet out of the eye, turning about the
  // vertical; shelves (Library, BookShelf) and dust read it. It replaces the lighthouse's sheet: only in
  // shots without a Lighthouse.
  scanLight(U) {
    const s = this.state;
    U.uBeamO.value.copy(this.anchors.eye);
    U.uBeamAng.value = this._scanAng;
    U.uBeamW.value = s.scanW;
    U.uBeamV.value = s.scanV;
    U.uBeamI.value = AGENT.SCAN_I * s.scan * s.glow;
    U.uBeamCol.value.copy(STEEL).lerp(WHITE, 0.15);
    U.uTrail.value = s.scanTrailLen;
    U.uTrailI.value = s.scanTrail;
    U.uTrailArc.value = s.scanArc;
    U.uFanUp.value = s.scanFan[0];
    U.uFanDn.value = s.scanFan[1];
    U.uLHFill.value.setRGB(0, 0, 0);
    return this;
  }
}

// ------------------------------------------------------------------------------------------ the crowd

const CAGES = KINDS.map((_, i) => cage(i));
// crowd tier: radiance of the cage and the core (× colour), half-widths (m) at size 1
const CROWD = { edge: 0.5, core: 0.55, coreSig: 0.008, hand: 1.6, fold: 1.2 };

export class AgentSwarm {
  constructor({ count = 300, seed = 1, kinds = 9, size = [0.85, 1.15], scale = 1, uniforms = null, width = 1920, height = 1080, depth = true } = {}) {
    this.count = count;
    this.seed = seed;
    const ks = Array.isArray(kinds) ? kinds : [...Array(kinds).keys()];
    this.kind = new Uint8Array(count);
    this.size = new Float32Array(count);
    this.phase = new Float32Array(count);
    let nl = 0;
    for (let i = 0; i < count; i++) {
      this.kind[i] = ks[Math.floor(hash(i, seed, 1) * ks.length)];
      this.size[i] = scale * (size[0] + (size[1] - size[0]) * hash(i, seed, 2));
      this.phase[i] = TAU * hash(i, seed, 3);
      nl += CAGES[this.kind[i]].E.length;
    }
    this.uniforms = lightUniforms({ uniforms, width, height });
    this.lines = new LightLines(nl, this.uniforms, { depth });
    this.points = new LightPoints(count * 2, this.uniforms, { depth });
    this.group = new THREE.Group();
    for (const m of [...this.lines.meshes, ...this.points.meshes]) this.group.add(m);
    // where set() put each body: position; yaw, pitch, roll; glow, lime
    this.pos = new Float32Array(count * 3);
    this.pose = new Float32Array(count * 3);
    this.look = new Float32Array(count * 2);
    this.time = 0;
    this.glow = 1;
    this.place = null;
    this.attr = null;
    this._v = [V3(), V3(), V3(), V3()];
    this._q = new THREE.Quaternion();
    this._qs = new THREE.Quaternion();
    this._eu = new THREE.Euler();
    this._o = {};
    this._W = Array.from({ length: CAGES.reduce((m, c) => Math.max(m, c.V.length), 0) }, () => V3());
  }

  // place(i, t, out) → out: body i's position at t (pure in t); attr(i, t, o): o.glow, o.lime, o.yaw, o.pitch.
  // Heading is the motion over ±dt (s); slow bodies turn to o.yaw (or +Z) instead, and they bank into turns.
  set({ time = this.time, place = this.place, glow = this.glow, attr = this.attr, dt = 0.1 } = {}) {
    Object.assign(this, { time, place, glow, attr });
    if (!place) return this;
    const [p0, p1, pm] = this._v;
    const o = this._o;
    for (let i = 0; i < this.count; i++) {
      place(i, time, p0);
      place(i, time + dt, p1);
      place(i, time - dt, pm);
      o.glow = 1;
      o.lime = 0;
      o.yaw = undefined;
      o.pitch = undefined;
      if (attr) attr(i, time, o);
      const vx = (p1.x - pm.x) / (2 * dt);
      const vy = (p1.y - pm.y) / (2 * dt);
      const vz = (p1.z - pm.z) / (2 * dt);
      const sp = Math.hypot(vx, vy, vz) || 1e-9;
      const w = sstep(0.05, 0.3, sp);
      const y0 = o.yaw ?? 0;
      const yaw = Math.atan2((w * vx) / sp + (1 - w) * Math.sin(y0), (w * vz) / sp + (1 - w) * Math.cos(y0));
      const pitch = o.pitch ?? -0.5 * w * Math.atan2(vy, Math.hypot(vx, vz));
      let turn = Math.atan2(p1.x - p0.x, p1.z - p0.z) - Math.atan2(p0.x - pm.x, p0.z - pm.z);
      turn -= TAU * Math.round(turn / TAU);
      this.pos.set([p0.x, p0.y, p0.z], i * 3);
      this.pose.set([yaw, pitch, w * Math.max(-0.5, Math.min(0.5, (-0.35 * turn) / dt))], i * 3);
      this.look[i * 2] = o.glow;
      this.look[i * 2 + 1] = o.lime;
    }
    return this;
  }

  // after the camera is placed: a body under about 12 px folds its cage into its core (gone under 4 px)
  update(camera) {
    camera.updateMatrixWorld();
    const cam = this._v[3].setFromMatrixPosition(camera.matrixWorld);
    const fpx = camera.projectionMatrix.elements[5] * 0.5 * this.uniforms.uRes.value.y;
    const { aA, aB, aCA, aCB, aK } = this.lines.attr;
    const { aP, aC, aH } = this.points.attr;
    const C = this._v[0];
    const H = this._v[1];
    let nl = 0;
    let np = 0;
    const pt = (P, col, k, s, hk, hr) => {
      aP.array.set([P.x, P.y, P.z], np * 3);
      aC.array.set([col.r * k, col.g * k, col.b * k, s], np * 4);
      aH.array.set([hk, hr], np * 2);
      np++;
    };
    for (let i = 0; i < this.count; i++) {
      const g = this.glow * this.look[i * 2];
      if (g <= 0) continue;
      const cg = CAGES[this.kind[i]];
      const sz = this.size[i];
      const ph = this.phase[i];
      C.set(this.pos[i * 3], this.pos[i * 3 + 1] + 0.012 * sz * Math.sin(TAU * 0.31 * this.time + ph), this.pos[i * 3 + 2]);
      const hpx = (AGENT.HEIGHT * sz * fpx) / Math.max(C.distanceTo(cam), 1e-3);
      const c = sstep(4, 12, hpx);
      this._q.setFromEuler(this._eu.set(this.pose[i * 3 + 1], this.pose[i * 3], this.pose[i * 3 + 2], 'YXZ'));
      this._q.multiply(this._qs.setFromAxisAngle(UP, (ph < Math.PI ? 0.4 : -0.4) * this.time + ph));
      pt(C, CORE, CROWD.core * g * (1 + CROWD.fold * (1 - c)), CROWD.coreSig * sz, 0.3, 5);
      const lime = this.look[i * 2 + 1];
      if (lime > 0) {
        H.fromArray(AGENT.HAND).multiplyScalar(sz).applyQuaternion(this._q).add(C);
        pt(H, LIME, CROWD.hand * lime, 0.004 * sz, 0.4, 6);
      }
      if (c <= 0) continue;
      for (let v = 0; v < cg.V.length; v++) this._W[v].copy(cg.V[v]).multiplyScalar(sz).applyQuaternion(this._q).add(C);
      const e = CROWD.edge * g * c;
      const s = AGENT.SIGMA.crowd[0] * sz;
      for (const [a, b] of cg.E) {
        const A = this._W[a];
        const B = this._W[b];
        aA.array.set([A.x, A.y, A.z], nl * 3);
        aB.array.set([B.x, B.y, B.z], nl * 3);
        aCA.array.set([STEEL.r * e, STEEL.g * e, STEEL.b * e, s], nl * 4);
        aCB.array.set([STEEL.r * e, STEEL.g * e, STEEL.b * e, s], nl * 4);
        aK.array.set([cg.cap[a], cg.cap[b], 0.1, 5], nl * 4);
        nl++;
      }
    }
    this.lines.commit(nl);
    this.points.commit(np);
    return this;
  }

  position(i, out = V3()) {
    return out.fromArray(this.pos, i * 3);
  }

  // unit vector of body i's front
  heading(i, out = V3()) {
    const yaw = this.pose[i * 3];
    const pitch = this.pose[i * 3 + 1];
    return out.set(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }
}

// ---------------------------------------------------------------------------------------- the placers

// A fish school along a path (camera.js path(), or anything with at(u, out), tangent(u, out) and length()
// over u in 0..1). Body i rides head(t) less its lag along the path (beyond either end it carries straight
// on); across the path it keeps a lane, a point of a flattened disc that wheels slowly round the path,
// breathes with breathe(t) (gather < 1 < scatter) and parts with split(t) (m between two streams).
export function school({ path, head = null, speed = 0.05, length = 0.3, radius = 1, breathe = null, split = null, wiggle = 0.12, seed = 1 } = {}) {
  const L = path.length ? path.length() : 1;
  const P = V3();
  const T = V3();
  const N = V3();
  const B = V3();
  return (i, t, out) => {
    const h = (c) => hash(i, seed, 50 + c);
    const u = (head ? head(t) : speed * t) - length * h(0) + 0.03 * length * noise1(0.3 * t + 37 * h(1), seed + 11);
    const uc = Math.min(1, Math.max(0, u));
    path.at(uc, P);
    path.tangent(uc, T).normalize();
    P.addScaledVector(T, (u - uc) * L);
    N.crossVectors(T, UP);
    if (N.lengthSq() < 1e-8) N.set(1, 0, 0);
    N.normalize();
    B.crossVectors(N, T);
    const r = radius * Math.sqrt(h(2)) * (breathe ? breathe(t) : 1);
    const a = TAU * h(3) + (0.15 + 0.2 * h(4)) * t * (h(6) < 0.5 ? -1 : 1);
    const side = r * Math.cos(a) + (split ? (h(7) < 0.5 ? -0.5 : 0.5) * split(t) : 0) + wiggle * noise1(0.5 * t + 37 * h(8), seed + 3);
    const up = 0.6 * r * Math.sin(a) + wiggle * noise1(0.5 * t + 37 * h(9), seed + 5);
    return out.copy(P).addScaledVector(N, side).addScaledVector(B, up);
  };
}

// Bodies holding stations (s43: one to a shelf), bobbing and drifting a little. Give them o.yaw in attr.
export function hover({ stations, bob = 0.04, drift = 0.08, seed = 1 } = {}) {
  return (i, t, out) => {
    const s = stations[i % stations.length];
    const h = (c) => hash(i, seed, 80 + c);
    return out.set(
      s[0] + drift * noise1(0.13 * t + 17 * h(0), seed + 1),
      s[1] + bob * Math.sin(TAU * (0.25 + 0.1 * h(1)) * t + TAU * h(2)),
      s[2] + drift * noise1(0.11 * t + 17 * h(3), seed + 2),
    );
  };
}
