// Agent D · the readers (s29): a reader is a lamp on the gallery's rail. Each keeps a small glass-fronted
// case of walnut standing on the balustrade's top rail, its glass toward the shaft, a desk lamp inside;
// lit, it reads from across the shaft as a lit window. Nobody is seen: the lamp is the reader.
//
// A case's frame (caseMatrix): x along the rail (the side's tangent), y up from the top of the bottom
// board (where the books stand), z out toward the shaft (the side's inward normal). For side 4 these are
// the world's axes. The interior: x in ±CASE.half, y 0..CASE.clear, z CASE.back..CASE.front; the glass
// at z = CASE.glass. The cornice's top (CASE.top) is where a crane perches.
import * as THREE from 'three';
import { LIB, LIB_COMMON } from './libshader.js';
import { Builder, MAT, sideNormal, sideTangent } from './geo.js';

export const CASE = {
  apo: LIB.AS + 0.02, // the frame's origin from the axis: the boards' front stands on the rail's inner face
  rise: 1.137, // the origin above its floor: the rail's top (1.09), a plinth (0.012), the bottom board (0.035)
  half: 0.365,
  clear: 0.675,
  back: -0.4,
  front: 0.02,
  glass: 0.03,
  wall: 0.052, // the side panels (the hero's shelf's dividers, 0.05 thick, stand just inside them)
  top: 0.74,
};

// the case at a m along side `side`'s rail of the floor at height y (world): its frame
export function caseMatrix(side, a, y, out = new THREE.Matrix4()) {
  const n = sideNormal(side);
  const t = sideTangent(side);
  out.makeBasis(t, new THREE.Vector3(0, 1, 0), n.clone().negate());
  out.setPosition(n.x * CASE.apo + t.x * a, y + CASE.rise, n.z * CASE.apo + t.z * a);
  return out;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// a box from lo to hi (case frame)
const span = (b, lo, hi, mat, faces = 'all') =>
  b.box(V((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2), V(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), mat, 0, faces);

// The case's walnut and its brass glass frame, into a Builder already set to the case's frame (the
// library's material). `boards`: the bottom and top boards and the back's inner face too (a far case;
// the hero's come from its BookShelf).
export function buildCaseShell(b, { boards = true } = {}) {
  const { half: h, clear: c, back: k, front: f, wall: w } = CASE;
  span(b, [-h - w, -0.047, k - 0.02], [h + w, -0.035, f + 0.01], MAT.WOOD); // the plinth
  // the sides (the hero's inner faces come from its shelf's dividers, which its lamp lights)
  span(b, [-h - w, -0.035, k - 0.02], [-h, c + 0.035, f + 0.015], MAT.WOOD, boards ? 'all' : ['-x', '+y', '-y', '+z', '-z']);
  span(b, [h, -0.035, k - 0.02], [h + w, c + 0.035, f + 0.015], MAT.WOOD, boards ? 'all' : ['+x', '+y', '-y', '+z', '-z']);
  span(b, [-h - w - 0.015, c + 0.035, k - 0.035], [h + w + 0.015, CASE.top, f + 0.03], MAT.WOOD); // the cornice
  span(b, [-h, -0.035, k - 0.02], [h, c + 0.035, k], MAT.WOOD, boards ? 'all' : ['-z', '+x', '-x', '+y', '-y']); // the back
  if (boards) {
    span(b, [-h, -0.035, k], [h, 0, f], MAT.WOOD, ['+y', '+z']);
    span(b, [-h, c, k], [h, c + 0.035, f], MAT.WOOD, ['-y', '+z']);
  }
  // the glass's frame: rails over the boards' fronts, two stiles
  const g = CASE.glass;
  span(b, [-h, -0.035, f], [h, 0.012, g + 0.01], MAT.BRASS, ['+z', '+y', '-y', '+x', '-x']);
  span(b, [-h, c - 0.012, f], [h, c + 0.035, g + 0.01], MAT.BRASS, ['+z', '+y', '-y', '+x', '-x']);
  span(b, [-h, 0.012, f], [-h + 0.015, c - 0.012, g + 0.01], MAT.BRASS, ['+z', '+x']);
  span(b, [h - 0.015, 0.012, f], [h, c - 0.012, g + 0.01], MAT.BRASS, ['+z', '-x']);
}

// ------------------------------------------------------------------------------------- the desk lamp

// The hero's desk lamp (case frame, m): a stepped brass base on the bottom board in the left bay, a
// stem, a knuckle, and a brass cone shade tipped down toward the books (its inside white enamel), the
// bulb within. It is lit by its own bulb only.
export const LAMP = {
  base: [-0.27, -0.07], // the base's centre on the board (x, z)
  knuckle: 0.26,
  axis: new THREE.Vector3(0.55, -0.83, 0.06).normalize(), // out of the shade's mouth
  neck: 0.014,
  mouth: 0.056,
  depth: 0.07,
  bulb: 0.036, // the bulb's centre from the knuckle, along the axis
};
export const lampPoint = (s, out = new THREE.Vector3()) => out.set(LAMP.base[0], LAMP.knuckle, LAMP.base[1]).addScaledVector(LAMP.axis, s);

// into a Builder: M is the case's world matrix; aux 0 brass, 1 the shade, 2 the bulb
export function buildDeskLamp(b, M) {
  const [x, z] = LAMP.base;
  const k = LAMP.knuckle;
  b.setTransform(M);
  b.lathe(V(x, 0, z), [[0.052, 0], [0.052, 0.006], [0.046, 0.011], [0.03, 0.015], [0.012, 0.019], [0.006, 0.024], [0.0001, 0.025]], 48, MAT.BRASS, 0);
  b.lathe(V(x, 0, z), [[0.0045, 0.02], [0.0045, k - 0.008]], 16, MAT.BRASS, 0);
  b.lathe(V(x, 0, z), [[0.0001, k - 0.012], [0.007, k - 0.009], [0.009, k], [0.007, k + 0.009], [0.0001, k + 0.012]], 16, MAT.BRASS, 0);
  // the shade's frame: its -y along the axis, the knuckle at the origin
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), LAMP.axis);
  b.setTransform(M.clone().multiply(new THREE.Matrix4().compose(V(x, k, z), q, V(1, 1, 1))));
  const D = LAMP.depth;
  const R = LAMP.mouth;
  b.lathe(V(0, 0, 0), [[R, -D], [R * 0.965, -D + 0.004], [R * 0.64, -D * 0.56], [LAMP.neck * 1.45, -0.013], [LAMP.neck, -0.005], [0.0001, 0.0]], 48, MAT.BRASS, 1);
  const r = 0.013;
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 8;
    prof.push([Math.max(1e-4, r * Math.cos(a)), -LAMP.bulb + r * Math.sin(a)]);
  }
  b.lathe(V(0, 0, 0), prof, 20, MAT.BRASS, 2);
  b.setTransform(M);
}

const LAMP_VERT = /* glsl */ `
attribute float aux;
varying vec3 vW; varying vec3 vN; varying float vAux;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vAux = aux;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const LAMP_FRAG = /* glsl */ `
uniform vec3 uBulb, uBulbCol, uAxis, uRoom, uLit;
uniform vec2 uCone;
uniform float uBulbR, uHot;
varying vec3 vW; varying vec3 vN; varying float vAux;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 dl = uBulb - vW; float d2 = dot(dl, dl); vec3 L = dl*inversesqrt(d2);
  vec3 E = uBulbCol/(d2 + uBulbR*uBulbR);
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0);
  vec3 c;
  if (vAux > 1.5){
    c = uLit*1.15;                                                       // the bulb
  } else if (vAux > 0.5 && !gl_FrontFacing){
    // the shade's enamel inside: as bright as the bulb lets it and no brighter (uLit: amber, never white)
    vec3 e = vec3(0.72, 0.68, 0.6)*E*nl;
    c = uLit*(1.0 - exp(-e/max(uLit, vec3(1e-5)))) + uRoom*0.05;
  } else {
    float cone = smoothstep(uCone.x, uCone.y, dot(-L, uAxis));
    if (vAux > 0.5) cone = 0.0;                                           // the shade's outside: in its own shadow
    float sp = pow(max(dot(N, H), 0.0), 60.0)*7.0;
    vec3 brass = vec3(0.3, 0.2, 0.085);
    // in the bulb's light no brighter than the bulb (uLit: amber; the foot's pool never white), then the room's
    c = E*cone*(nl*brass + sp*nl*vec3(0.8, 0.6, 0.33));
    c = uLit*(1.0 - exp(-c/max(uLit, vec3(1e-5)))) + uRoom*brass*(0.5 + 0.5*N.y);
    c += uRoom*vec3(0.8, 0.6, 0.33)*0.6*pow(1.0 - max(dot(N, V), 0.0), 3.0);   // the brass's rim
  }
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// The lamp's material: U the library's uniforms (for the fog); set uBulb/uAxis (world), uBulbCol,
// uCone (cos outer, cos inner), uRoom (the books' light about the case, linear).
export function deskLampMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uBulb: { value: new THREE.Vector3() },
      uBulbCol: { value: new THREE.Color(0, 0, 0) },
      uBulbR: { value: 0.012 },
      uAxis: { value: new THREE.Vector3(0, -1, 0) },
      uCone: { value: new THREE.Vector2(0.45, 0.7) },
      uRoom: { value: new THREE.Color(0, 0, 0) },
      uLit: { value: new THREE.Color(0, 0, 0) }, // the bulb and the brightest of the enamel (linear)
      uHot: { value: 40 },
    },
    vertexShader: LAMP_VERT,
    fragmentShader: LIB_COMMON + LAMP_FRAG,
    side: THREE.DoubleSide,
  });
}

// ------------------------------------------------------------------------------- the books' own light

// Over each spine (shelf space; add the mesh to the shelf's group): its title glowing in the book's own
// warm light (the strip texture of the shelf's labels, mapped as bookshelf.js's stripTitle maps it), and
// the lime edge (s19's pass), running round the spine from the middle of its foot both ways to meet at
// the middle of its head, then staying, fainter. Per volume: set(i, run, edge, title).
const SPINE_VERT = /* glsl */ `
attribute float aBk;
varying vec3 vL; varying vec3 vW; varying float vBk;
void main(){
  vL = position; vBk = aBk;
  vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const spineFrag = (n, rows) => /* glsl */ `
uniform vec4 uB0[${n}];   // the spine: x (its middle), y (its foot), w, h
uniform vec4 uB1[${n}];   // half arc, strip row, sagitta, -
uniform vec4 uB2[${n}];   // the edge's run (0..1), the edge's light, the title's light, the cloth's light
uniform vec3 uB3[${n}];   // the colour of the cloth's own light
uniform sampler2D uStrips;
uniform vec3 uWarm;
uniform float uEdgeI;
varying vec3 vL; varying vec3 vW; varying float vBk;
// arc length from the crest of a spine profile (x = hw sin p, z = -s(1 - cos p)) to across-position x
float arcAt(float x, float hw, float s){
  float ph = asin(clamp(x/hw, -1.0, 1.0)), a = 0.0;
  for (int j = 0; j < 6; j++){ float p = ph*(float(j) + 0.5)/6.0; a += sqrt(hw*hw*cos(p)*cos(p) + s*s*sin(p)*sin(p)); }
  return a*ph/6.0;
}
void main(){
  int i = int(vBk + 0.5);
  vec4 b0 = uB0[i], b1 = uB1[i], b2 = uB2[i];
  float hw = 0.5*b0.z, hh = 0.5*b0.w;
  vec2 q = vec2(vL.x - b0.x, vL.y - b0.y - hh);
  float px = max(max(fwidth(q.x), fwidth(q.y)), 1e-5);
  vec3 c = vec3(0.0);
  // the title, in the book's own light
  float y = q.y + hh, h = b0.w;
  float yA = 0.17*h, yB = h - 0.028;
  float len = yB - yA, wid = len/16.0, hwS = 0.82*b1.x;
  if (wid > 2.0*hwS){ wid = 2.0*hwS; len = wid*16.0; }
  float lu = 0.5 + (0.5*(yA + yB) - y)/len, lv = 0.5 + arcAt(q.x, hw, b1.z)/wid;
  if (b2.z > 0.0 && lu > 0.0 && lu < 1.0 && lv > 0.0 && lv < 1.0 && abs(q.x) < hw){
    float m = texture2D(uStrips, vec2(lu, 1.0 - (b1.y + 1.0 - lv)/${rows}.0)).r;
    c += uWarm*(b2.z*m);
  }
  // the lime edge: 1.6 mm inside the spine's outline; how far round, by length along it
  vec2 bq = abs(q) - vec2(hw, hh) + 0.002;
  float sd = length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0) - 0.002;
  // the cloth's own light, fuller at the crest of its round
  if (b2.w > 0.0){
    float cr = sqrt(max(1.0 - (q.x*q.x)/(hw*hw), 0.0));
    c += uB3[i]*(b2.w*(0.6 + 0.4*cr)*smoothstep(0.0, -0.0012, sd));
  }
  if (b2.x > 0.0){
    float ew = clamp(1.1*px, 0.0011, 0.006);
    float eb = (sd + max(0.0016, ew))/ew;
    float band = exp(-eb*eb)*sqrt(0.0011/ew);
    float dS = hw - abs(q.x), dB = q.y + hh, dT = hh - q.y;
    float s = dB < min(dS, dT) ? abs(q.x) : (dT < dS ? hw + h + (hw - abs(q.x)) : hw + dB);
    float ang = s/(2.0*hw + h);
    float run = b2.x;
    float lit = smoothstep(run + 0.012, run - 0.012, ang);
    float hx = (ang - run)/0.035;
    float head = exp(-hx*hx)*(1.0 - smoothstep(0.97, 1.0, run));
    c += uLitCol*(uEdgeI*(band*(lit*b2.y + 1.5*head) + 0.05*lit*b2.y*exp(-max(-sd, 0.0)/0.006)));
  }
  gl_FragColor = vec4(c*exp(-uFogD*distance(vW, cameraPosition)), 1.0);
}`;

export class SpineLight {
  // books: the shelf's volumes (shelf space); strips/rows: the shelf's labels (bookLabels); U: library uniforms
  constructor({ U, books, strips, rows, z = 0.0007, pad = 0.004 }) {
    const n = books.length;
    const pos = [];
    const bk = [];
    const idx = [];
    books.forEach((b, i) => {
      const x0 = b.x - b.w / 2 - pad;
      const x1 = b.x + b.w / 2 + pad;
      const y0 = b.y - pad;
      const y1 = b.y + b.h + pad;
      const zz = b.z + z;
      pos.push(x0, y0, zz, x1, y0, zz, x1, y1, zz, x0, y1, zz);
      bk.push(i, i, i, i);
      idx.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aBk', new THREE.Float32BufferAttribute(bk, 1));
    g.setIndex(idx);
    const v4 = (f) => books.map((b, i) => f(b, i));
    this.uniforms = {
      ...U,
      uB0: { value: v4((b) => new THREE.Vector4(b.x, b.y, b.w, b.h)) },
      uB1: { value: v4((b) => new THREE.Vector4(b.halfArc, b.strip, b.s, 0)) },
      uB2: { value: v4(() => new THREE.Vector4()) },
      // the cloth's colour, at the luminance of 1, half and half with a warm white
      uB3: {
        value: v4((b) => {
          const l = Math.max(0.2126 * b.col[0] + 0.7152 * b.col[1] + 0.0722 * b.col[2], 1e-3);
          return new THREE.Color(0.5 * (b.col[0] / l) + 0.5, 0.5 * (b.col[1] / l) + 0.5 * 0.72, 0.5 * (b.col[2] / l) + 0.5 * 0.45);
        }),
      },
      uStrips: { value: strips },
      uWarm: { value: new THREE.Color(1.0, 0.78, 0.5) },
      uEdgeI: { value: 2.4 },
    };
    this.mesh = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: SPINE_VERT,
        fragmentShader: LIB_COMMON + spineFrag(n, rows),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
  }

  set(i, run, edge, title, glow = 0) {
    this.uniforms.uB2.value[i].set(run, edge, title, glow);
  }
}

// ----------------------------------------------------------------------------------------- the glass

// The case's glass, after s18's lantern glass: what is behind it is seen a little darker and greener
// (a multiplying layer), and over it (an adding layer) the faint reflection of the shaft, with the
// gallery lamps across it as soft discs, and the seeds of the old glass, bubbles a fraction of a
// millimetre across, catching the desk lamp's light. Case frame; the meshes take the case's matrix.
const GLASS_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec2 vQ;
void main(){
  vQ = position.xy;
  vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const TINT_FRAG = /* glsl */ `
uniform vec3 uTint;
void main(){ gl_FragColor = vec4(uTint, 1.0); }`;
const SHEEN_FRAG = /* glsl */ `
uniform vec3 uBulb, uBulbCol, uHaze;
uniform vec4 uSeeds;   // light, the books' light on them, re-rolls a second, -
uniform float uRefl, uShot;
varying vec3 vW; varying vec3 vN; varying vec2 vQ;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  float F = 0.04 + 0.96*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  // the reflected ray to the plane of the lamps on the side it reaches
  float tm = 1e9; int sm = 0;
  for (int s = 0; s < 6; s++){
    float b = radians(30.0 + 60.0*float(s));
    vec2 n = vec2(cos(b), sin(b));
    float dn = dot(R.xz, n);
    if (dn > 1e-4){ float t = (uLampA - dot(vW.xz, n))/dn; if (t > 0.0 && t < tm){ tm = t; sm = s; } }
  }
  vec3 env = uHaze*(0.55 + 0.45*clamp(R.y, -1.0, 1.0));
  if (tm < 1e8){
    vec3 P = vW + R*tm;
    float b = radians(30.0 + 60.0*float(sm));
    float a = dot(P.xz, vec2(-sin(b), cos(b)));
    float da = min(abs(a - uLampOff), abs(a + uLampOff));
    float k = floor((P.y - uLampY)/uH + 0.5);
    float dy = P.y - (k*uH + uLampY);
    vec4 st = floorState(k);
    vec3 col = mix(uLampCol, uLampLime, st.b)*st.g;
    float d2 = da*da + dy*dy;
    env += col*(0.9*exp(-d2/0.05) + 0.05*exp(-d2/2.0))*exp(-uFogD*tm);
  }
  vec3 c = F*uRefl*env;
  // the seeds
  vec2 g = vQ/0.006;
  vec2 id = floor(g);
  if (hash12(id + 31.7) < 0.45){
    vec2 o = vec2(hash12(id + 7.1), hash12(id + 3.3))*0.7 + 0.15;
    float r = mix(0.035, 0.085, hash12(id + 1.9));
    float disc = smoothstep(r, 0.35*r, length(fract(g) - o));
    vec3 dl = uBulb - vW;
    float flick = 0.35 + 0.65*hash12(id + floor(uShot*uSeeds.z)*vec2(1.37, 2.91));
    c += disc*flick*(uBulbCol*(uSeeds.x/(dot(dl, dl) + 0.01)) + uSeeds.y*vec3(1.0, 0.72, 0.42));
  }
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

export class GlassFront {
  constructor({ U, x0 = -CASE.half + 0.015, x1 = CASE.half - 0.015, y0 = 0.012, y1 = CASE.clear - 0.012, z = CASE.glass }) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.tint = { uTint: { value: new THREE.Color(0.6, 0.64, 0.61) } };
    this.uniforms = {
      ...U,
      uBulb: { value: new THREE.Vector3() },
      uBulbCol: { value: new THREE.Color(0, 0, 0) },
      uHaze: { value: new THREE.Color(0, 0, 0) },
      uSeeds: { value: new THREE.Vector4(1, 0, 3, 0) },
      uRefl: { value: 1 },
      uShot: { value: 0 },
    };
    const tint = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.tint,
        vertexShader: GLASS_VERT,
        fragmentShader: TINT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.ZeroFactor,
        blendDst: THREE.SrcColorFactor,
      }),
    );
    tint.renderOrder = 11;
    const sheen = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: GLASS_VERT,
        fragmentShader: LIB_COMMON + SHEEN_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sheen.renderOrder = 12;
    for (const m of [tint, sheen]) m.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(tint, sheen);
  }
}

// ----------------------------------------------------------------------------------------- the lining

// The inside of the case's back, just in front of the shelf's back board (which is black but for a band):
// dark walnut in what the lamp spills about its shade and its pool on the board throws back (uSpill,
// falling off from the bulb; the books' shadow on it right of uBooks and below their tops) and the light
// about the case (uRoom, × uAo). Case frame in position: give the case's world matrix.
const LINING_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vLoc;
void main(){
  vLoc = position;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const LINING_FRAG = /* glsl */ `
uniform vec3 uBulb, uBulbCol, uRoom, uNorm;
uniform float uSpill, uBooks, uAo;
varying vec3 vW; varying vec3 vLoc;
void main(){
  vec3 dl = uBulb - vW; float d2 = dot(dl, dl);
  float nl = max(dot(uNorm, dl*inversesqrt(d2)), 0.0);
  vec3 alb = vec3(0.085, 0.052, 0.029)*(0.7 + 0.6*vnoise2(vLoc.xy*vec2(2.0, 70.0)));
  float sh = 1.0 - 0.85*smoothstep(uBooks - 0.02, uBooks + 0.02, vLoc.x)*(1.0 - smoothstep(0.36, 0.46, vLoc.y));
  vec3 c = alb*(uBulbCol*(uSpill*nl*sh/(d2 + 0.02)) + uRoom*uAo);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;
export class Lining {
  constructor({ U, matrix }) {
    const [x0, x1, y0, y1, z] = [-CASE.half, CASE.half, 0, CASE.clear, CASE.back + 0.006];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.uniforms = {
      ...U,
      uBulb: { value: new THREE.Vector3() },
      uBulbCol: { value: new THREE.Color(0, 0, 0) },
      uRoom: { value: new THREE.Color(0, 0, 0) },
      uNorm: { value: new THREE.Vector3(0, 0, 1).transformDirection(matrix) },
      uSpill: { value: 0.3 },
      uBooks: { value: -0.14 },
      uAo: { value: 0.35 },
    };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: LINING_VERT, fragmentShader: LIB_COMMON + LINING_FRAG }));
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrix.copy(matrix);
    this.mesh.frustumCulled = false;
  }
}

// ----------------------------------------------------------------------------------- the far readers

// Many readers at once (the far shot). Each case's walnut and brass go into the library's material; its
// window is one opaque quad at the glass, through which the inside is found by casting the eye's ray into
// a box (the back, the sides, the boards, a row of books in the bay away from the lamp, the lamp's mouth),
// lit by the lamp once it is on and seen through the glass; and the lamp's glow is a camera-facing quad
// that adds, as the gallery globes' glows are drawn. A lamp comes on over 0.25 s, its filament reddish
// at first. cases: [{ m (the case's world matrix), seed (0..1), on (s), bay (-1: the lamp in the left
// bay, 1: the right) }]; uRdT: the shot's clock.
export const READER_LAMP = (bay, out = new THREE.Vector3()) => out.set(bay * 0.27, 0.235, -0.07);
const WIN_VERT = /* glsl */ `
attribute vec3 aLoc, aO, aTx, aTz;
attribute vec4 aK;
varying vec3 vL; varying vec3 vC; varying vec4 vK; varying vec3 vW;
void main(){
  vL = aLoc; vK = aK; vW = position;
  vec3 c = cameraPosition - aO;
  vC = vec3(dot(c, aTx), c.y, dot(c, aTz));
  gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
}`;
const WIN_FRAG = /* glsl */ `
uniform float uRdT, uRdI, uRdFill, uRdMouth, uRdIn;
uniform vec3 uRdCol, uTint, uHaze;
varying vec3 vL; varying vec3 vC; varying vec4 vK; varying vec3 vW;
void main(){
  vec3 o = vL;
  vec3 d = normalize(vL - vC);
  float on = smoothstep(vK.y, vK.y + 0.25, uRdT);
  vec3 lc = uRdCol*on*mix(vec3(1.0, 0.45, 0.25), vec3(1.0), smoothstep(vK.y, vK.y + 0.6, uRdT));
  float bay = vK.z;
  vec3 Lp = vec3(bay*0.27, 0.235, -0.07);
  // the box: the back, a side, the bottom or top board
  float t = 1e3; vec3 N = vec3(0.0, 0.0, 1.0); vec3 alb = vec3(0.085, 0.052, 0.029);
  if (d.z < -1e-4) t = (-0.40 - o.z)/d.z;
  if (abs(d.x) > 1e-4){ float ts = (sign(d.x)*0.365 - o.x)/d.x; if (ts > 0.0 && ts < t){ t = ts; N = vec3(-sign(d.x), 0.0, 0.0); alb = vec3(0.1, 0.058, 0.03); } }
  if (abs(d.y) > 1e-4){ float ty = ((d.y > 0.0 ? 0.675 : 0.0) - o.y)/d.y; if (ty > 0.0 && ty < t){ t = ty; N = vec3(0.0, -sign(d.y), 0.0); alb = vec3(0.1, 0.058, 0.03); } }
  // the books, their spines 0.12 m in, in the bay away from the lamp
  if (d.z < -1e-4){
    float tk = (-0.12 - o.z)/d.z;
    vec3 P = o + d*tk;
    float x0 = bay < 0.0 ? -0.14 : -0.345, x1 = bay < 0.0 ? 0.345 : 0.14;
    // (the seed rounded: an interpolated varying need not be bit-exact across the quad, and hash11 hashes bits)
    float s = floor(vK.x*1000.0 + 0.5)*0.0917 + floor((P.x - x0)/0.037)*7.13;
    if (tk < t && P.x > x0 && P.x < x1 && P.y > 0.0 && P.y < 0.3 + 0.12*hash11(s) && hash11(s + 3.1) > 0.1){
      float u = fract((P.x - x0)/0.037);
      vec3 cl[6] = vec3[6](vec3(0.11, 0.028, 0.022), vec3(0.06, 0.035, 0.02), vec3(0.025, 0.045, 0.03), vec3(0.13, 0.1, 0.06), vec3(0.075, 0.024, 0.03), vec3(0.12, 0.075, 0.03));
      alb = cl[int(hash11(s + 5.3)*5.99)]*(0.45 + 0.55*smoothstep(0.0, 0.1, u)*smoothstep(1.0, 0.9, u));
      alb = mix(alb, vec3(0.5, 0.48, 0.42), 0.35*step(abs(u - 0.5), 0.07)*step(0.08, P.y)*step(P.y, 0.27));   // a title
      t = tk; N = vec3(0.0, 0.0, 1.0);
    }
  }
  vec3 P = o + d*t;
  vec3 Ld = Lp - P; float dd = dot(Ld, Ld); vec3 Ln = Ld*inversesqrt(dd);
  float cone = smoothstep(-0.25, 0.55, dot(-Ln, normalize(vec3(-bay*0.55, -0.83, 0.06))));
  // (and what the shade spills and the boards and books throw back, more of it near the lamp)
  vec3 c = alb*(lc*(uRdI*cone*max(dot(N, Ln), 0.0)/(dd + 0.01) + uRdFill*(0.3 + 0.7/(1.0 + 10.0*dd))));
  // the lamp's mouth, where the ray passes it
  vec3 w = Lp - o; float tl = dot(w, d);
  if (tl > 0.0 && tl < t + 0.05) c += lc*(uRdMouth*smoothstep(0.04, 0.012, length(w - d*tl)));
  c *= uTint;
  c += (0.04 + 0.96*pow(1.0 - abs(d.z), 5.0))*uHaze*0.5;
  gl_FragColor = vec4(fog(c, vW), uRdIn);
}`;
const RGLOW_VERT = /* glsl */ `
attribute vec3 aC; attribute vec3 aN; attribute vec2 aQ; attribute vec2 aK;
uniform float uRdT, uGR, uRes;
uniform vec3 uRdCol;
varying vec2 vQ; varying float vE; varying vec3 vCol; varying vec3 vCW; varying vec2 vPx;
void main(){
  float d = distance(aC, cameraPosition);
  // (in pixels of a 1080-line picture, uRes the render's lines over 1080, so that a far lamp is the same
  // point in the preview as in the final)
  float px = uPxAng*uRes*d;
  float R = max(uGR, px*6.0);
  vE = (uGR*uGR)/(R*R);
  vPx = vec2(R/px, max(1.5, 0.07*R/px)); // the quad's radius, the core's sigma
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // pulled toward the camera till it is in front of the glass (aN: its normal), so that the case's
  // bottom does not cut it when it is seen from far below; as wide in the picture as it was
  vec3 toCam = normalize(cameraPosition - aC);
  float s = min(clamp(0.2/max(dot(toCam, aN), 0.08), 0.2, 2.5), 0.5*d);
  vec3 w = aC + toCam*s + (right*aQ.x + up*aQ.y)*(R*(d - s)/d);
  float on = smoothstep(aK.y, aK.y + 0.25, uRdT);
  vCol = uRdCol*on*mix(vec3(1.0, 0.45, 0.25), vec3(1.0), smoothstep(aK.y, aK.y + 0.6, uRdT))*(0.85 + 0.3*aK.x);
  vQ = aQ; vCW = aC;
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;
const RGLOW_FRAG = /* glsl */ `
uniform float uGI;
varying vec2 vQ; varying float vE; varying vec3 vCol; varying vec3 vCW; varying vec2 vPx;
void main(){
  float q = length(vQ);
  if (q >= 1.0) discard;
  float edge = 1.0 - q*q; edge *= edge;
  // a core of at least a pixel or so at its peak however far (a lamp, not a spark), and a halo that keeps
  // its energy
  float r = q*vPx.x/vPx.y;
  float g = exp(-0.5*r*r)*edge + 0.4*exp(-q*4.5)*edge*vE;
  // (the haze takes half of what it takes from the walls: a lamp is seen through more of it than it is lost in)
  gl_FragColor = vec4(vCol*(uGI*g*exp(-0.5*uFogD*distance(vCW, cameraPosition))), 1.0);
}`;

// The library's material with its alpha × uRdIn (uIn: a { value } shared with the windows), for the cases'
// fade in. Its output line is looked for; if it has changed, the library's own material (no fade).
function fadingMaterial(material, uIn) {
  const out = 'gl_FragColor = vec4(fog(c, P), 1.0);';
  const fs = material.fragmentShader;
  const at = fs.lastIndexOf('void main(');
  if (fs.split(out).length !== 2 || at < 0) {
    console.warn('[d_reader] the library material has changed: the readers\' cases will not fade in');
    return material;
  }
  return new THREE.ShaderMaterial({
    uniforms: { ...material.uniforms, uRdIn: uIn },
    vertexShader: material.vertexShader,
    fragmentShader: (fs.slice(0, at) + 'uniform float uRdIn;\n' + fs.slice(at)).replace(out, 'gl_FragColor = vec4(fog(c, P), uRdIn);'),
    side: material.side,
  });
}

export class Readers {
  // U: the library's uniforms; material: the library's (the cases' walnut and brass); cases: as above
  constructor({ U, material, cases }) {
    const b = new Builder();
    for (const c of cases) {
      b.setTransform(c.m);
      buildCaseShell(b, { boards: false });
    }
    const uIn = { value: 1 }; // the cases' fade in (fadeIn())
    this.shells = new THREE.Mesh(b.geometry(), fadingMaterial(material, uIn));
    this.fades = this.shells.material !== material;
    // the windows (case frame in aLoc, the case's origin and axes for the eye's ray), the glows
    const A = { position: [], aLoc: [], aO: [], aTx: [], aTz: [], aK: [] };
    const G = { aC: [], aN: [], aQ: [], aK: [] };
    const wi = [];
    const gi = [];
    const [x0, x1, y0, y1] = [-CASE.half + 0.015, CASE.half - 0.015, 0.012, CASE.clear - 0.012];
    const p = new THREE.Vector3();
    const o = new THREE.Vector3();
    const tx = new THREE.Vector3();
    const ty = new THREE.Vector3();
    const tz = new THREE.Vector3();
    cases.forEach((c, i) => {
      c.m.extractBasis(tx, ty, tz);
      o.setFromMatrixPosition(c.m);
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
        p.set(x, y, CASE.glass).applyMatrix4(c.m);
        A.position.push(p.x, p.y, p.z);
        A.aLoc.push(x, y, CASE.glass);
        A.aO.push(o.x, o.y, o.z);
        A.aTx.push(tx.x, tx.y, tx.z);
        A.aTz.push(tz.x, tz.y, tz.z);
        A.aK.push(c.seed, c.on, c.bay, 0);
      }
      wi.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
      READER_LAMP(c.bay, p).applyMatrix4(c.m);
      for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        G.aC.push(p.x, p.y, p.z);
        G.aN.push(tz.x, tz.y, tz.z);
        G.aQ.push(qx, qy);
        G.aK.push(c.seed, c.on);
      }
      gi.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
    });
    const wg = new THREE.BufferGeometry();
    for (const [k, v] of Object.entries(A)) wg.setAttribute(k, new THREE.Float32BufferAttribute(v, k === 'aK' ? 4 : 3));
    wg.setIndex(wi);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(G.aC, 3));
    gg.setAttribute('aC', new THREE.Float32BufferAttribute(G.aC, 3));
    gg.setAttribute('aN', new THREE.Float32BufferAttribute(G.aN, 3));
    gg.setAttribute('aQ', new THREE.Float32BufferAttribute(G.aQ, 2));
    gg.setAttribute('aK', new THREE.Float32BufferAttribute(G.aK, 2));
    gg.setIndex(gi);
    this.uniforms = {
      ...U,
      uRdIn: uIn,
      uRdT: { value: 0 },
      uRdI: { value: 0.02 }, // the lamp's light on the inside (radiant intensity, × uRdCol)
      uRdFill: { value: 0.01 }, // and about it
      uRdMouth: { value: 0.6 }, // the shade's mouth seen through the glass
      uRdCol: { value: new THREE.Color(0.807, 0.366, 0.047) }, // amber #E8A33D, linear
      uTint: { value: new THREE.Color(0.6, 0.64, 0.61) },
      uHaze: { value: new THREE.Color(0, 0, 0) },
      uGR: { value: 0.3 },
      uRes: { value: 1 }, // the render's lines over 1080
      uGI: { value: 1 },
    };
    this.windows = new THREE.Mesh(wg, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WIN_VERT, fragmentShader: LIB_COMMON + WIN_FRAG }));
    this.glows = new THREE.Mesh(
      gg,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: LIB_COMMON + RGLOW_VERT,
        fragmentShader: LIB_COMMON + RGLOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.glows.renderOrder = 10;
    for (const m of [this.shells, this.windows, this.glows]) m.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.shells, this.windows, this.glows);
  }

  // the cases (walnut, brass and windows) faded in to k (0–1): below 1 drawn transparent, before the glows,
  // and leaving the depth alone (or a case not yet there would hide the glows and the dust behind it)
  fadeIn(k) {
    if (!this.fades) k = 1;
    this.uniforms.uRdIn.value = k;
    for (const [m, order] of [[this.shells, 1], [this.windows, 2]]) {
      m.material.transparent = k < 1;
      m.material.depthWrite = k >= 1;
      m.renderOrder = k < 1 ? order : 0;
    }
  }
}

// Glows alone, for a lamp whose case is drawn otherwise (the reader the camera comes to): points [{ p, n
// (world: the lamp, its glass's normal), seed, on }], with a Readers' uniforms but a brightness (uGI) of
// their own.
export class LampGlows {
  constructor({ uniforms, points }) {
    const G = { aC: [], aN: [], aQ: [], aK: [] };
    const gi = [];
    points.forEach((c, i) => {
      for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        G.aC.push(c.p.x, c.p.y, c.p.z);
        G.aN.push(c.n.x, c.n.y, c.n.z);
        G.aQ.push(qx, qy);
        G.aK.push(c.seed, c.on);
      }
      gi.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
    });
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(G.aC, 3));
    for (const [k, n] of [['aC', 3], ['aN', 3], ['aQ', 2], ['aK', 2]]) gg.setAttribute(k, new THREE.Float32BufferAttribute(G[k], n));
    gg.setIndex(gi);
    this.uniforms = { ...uniforms, uGI: { value: 1 } };
    this.mesh = new THREE.Mesh(
      gg,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: LIB_COMMON + RGLOW_VERT,
        fragmentShader: LIB_COMMON + RGLOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
  }
}
