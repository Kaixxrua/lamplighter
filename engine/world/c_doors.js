// Agent C: the seven doors of s36–s37.
// Seven doors side by side, the site's public MCP tools cut through their lintels in the order the site
// lists them (frontend features/mcp/publicToolsModel.ts: seven of its nine; the sixth, search_github_ai_projects,
// is the one the reader pushes open, and the one s38's result was really fetched through). They rhyme with
// s19's gate: the galleries' wood, brass bands, the name cut through a plate in the lintel's face and lit
// through from behind.
// The row's frame (m): x to the right as the names read, y up the doors (lintels at +y), z out of their
// faces toward whoever reads them; the origin is the middle of the right door's doorway, in the plane of the
// frames' faces. A shot stands the row where it likes with a matrix. In s36–s37 it lies flat over the shaft,
// faces up, lintels toward the axis: looking down the well is looking at the doors square on, and the
// lighthouse is the vanishing point behind the right one.
// Light: the library's lamps (the floor the doors are on), a travelling key (uDKeyPos, uDKeyCol: radiant
// intensity, as the leaves' key) and the reader's own glow (uDGlowPos, uDGlowCol). The letters glow by
// uDLit[i]·uDLitCol (a door lit), and by the key whenever it is behind the plate (uDThru). uDGone (0 … 1)
// takes the whole row away (set uDSeed to something that differs from sample to sample, e.g. fract(t·977)).
import * as THREE from 'three';
import { loadFonts, font, makeCanvas, canvasTexture } from 'film/lib/text.js';
import { LIB_COMMON } from 'world/libshader.js';
import { Builder, MAT } from 'world/geo.js';

export const DOOR = {
  names: ['search_papers', 'search_documents', 'get_paper_detail', 'get_top_items', 'search_github_projects', 'search_github_ai_projects', 'search_ui_templates'],
  right: 5, // search_github_ai_projects
  pitch: 1.2, // door to door
  clear: [0.8, 1.75], // the doorway, wide × high
  post: [0.14, 0.16], // a post, across × deep
  lintel: 0.26, // high; its face stands 0.02 behind the posts'
  cornice: [0.05, 0.22], // high, deep
  sill: 0.03,
  leaf: { thick: 0.045, inset: 0.05, gap: 0.004, open: 1.4 }, // the leaf stands inset behind the frame's face; open: rad, pushed home
  letters: { em: 0.062, weight: 500, thick: 0.02, ppm: 1800, blur: 0.006 }, // the names: em and the plate's thickness (m), the mask's px per m
  lit: [1.0, 0.72, 0.42], // the letters' own light (colour; a shot scales it by uDLit)
};
// door i's middle along the row (0 … 6, left to right), from the right door's
export const doorX = (i, d = DOOR) => (i - d.right) * d.pitch;
// the lintels' faces, one row a door (top to bottom): red the cut, green the cut blurred (its edge, darkened)
export async function lintelAtlas(d = DOOR) {
  await loadFonts();
  const ppm = d.letters.ppm;
  const w = Math.round((d.clear[0] + 2 * d.post[0]) * ppm);
  const h = Math.round(d.lintel * ppm);
  const cv = makeCanvas(w, h * d.names.length);
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  c.textBaseline = 'alphabetic';
  c.textAlign = 'center';
  const fs = d.letters.em * ppm;
  c.font = font('mono', fs, d.letters.weight);
  const mt = c.measureText('search_github');
  const mid = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2; // the ink's middle above the baseline
  d.names.forEach((name, i) => {
    c.save();
    c.beginPath();
    c.rect(0, i * h, w, h);
    c.clip();
    const y = i * h + h / 2 + mid;
    c.fillStyle = 'rgb(255,0,0)';
    c.fillText(name, w / 2, y);
    c.filter = `blur(${(d.letters.blur * ppm).toFixed(1)}px)`;
    c.fillStyle = 'rgb(0,255,0)';
    c.fillText(name, w / 2, y);
    c.filter = 'none';
    c.restore();
  });
  return cv;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// one door's frame into a Builder, its doorway's middle at x0 (aux 1: the grain runs along x)
function buildFrame(b, x0, d) {
  const [w, h] = d.clear;
  const [pw, pd] = d.post;
  const px = w / 2 + pw / 2;
  const zc = -pd / 2;
  for (const s of [-1, 1]) {
    b.box(V(x0 + s * px, 0, zc), V(pw, h, pd), MAT.WOOD); // post
    b.box(V(x0 + s * px, -h / 2 + 0.08, zc), V(pw + 0.03, 0.16, pd + 0.03), MAT.WOOD); // plinth
    b.box(V(x0 + s * px, -h / 2 + 0.172, zc), V(pw + 0.014, 0.024, pd + 0.014), MAT.BRASS); // band over the plinth
    b.box(V(x0 + s * px, h / 2 - 0.03, zc), V(pw + 0.02, 0.03, pd + 0.02), MAT.BRASS); // capital
  }
  const lw = w + 2 * pw;
  b.box(V(x0, h / 2 + d.lintel / 2, zc - 0.01), V(lw, d.lintel, pd - 0.02), MAT.WOOD, 1, ['+x', '-x', '+y', '-y', '-z']); // its face is the plate
  b.box(V(x0, h / 2 + d.lintel + d.cornice[0] / 2, zc), V(lw + 0.06, d.cornice[0], d.cornice[1]), MAT.WOOD, 1);
  b.box(V(x0, -h / 2 - d.sill / 2, zc), V(lw, d.sill, pd), MAT.WOOD, 1);
}
// a leaf: the hinge's axis is its y axis, the leaf runs to +x, its face at z = 0 (stiles and rails proud of
// two panels; a brass plate and knob on the lock stile, two hinges)
function buildLeaf(b, d) {
  const [w, h] = d.clear;
  const g = d.leaf.gap;
  const T = d.leaf.thick;
  const lw = w - 2 * g;
  const lh = h - 2 * g;
  const st = 0.085;
  const proud = 0.014;
  const zf = -proud / 2;
  b.box(V(g + lw / 2, 0, -(T + proud) / 2), V(lw, lh, T - proud), MAT.WOOD); // the slab behind the panels
  b.box(V(g + st / 2, 0, zf), V(st, lh, proud), MAT.WOOD); // hinge stile
  b.box(V(g + lw - st / 2, 0, zf), V(st, lh, proud), MAT.WOOD); // lock stile
  const rx = g + lw / 2;
  const rw = lw - 2 * st;
  b.box(V(rx, lh / 2 - 0.05, zf), V(rw, 0.1, proud), MAT.WOOD, 1); // top rail
  b.box(V(rx, -0.12, zf), V(rw, 0.1, proud), MAT.WOOD, 1); // lock rail
  b.box(V(rx, -lh / 2 + 0.075, zf), V(rw, 0.15, proud), MAT.WOOD, 1); // bottom rail
  b.box(V(g + lw - st / 2, -0.12, 0.003), V(0.05, 0.15, 0.006), MAT.BRASS); // the lock's plate
  b.box(V(g + lw - st / 2, -0.09, 0.023), V(0.036, 0.036, 0.034), MAT.BRASS); // the knob
  for (const y of [-0.6, 0.6]) b.box(V(g + 0.006, y, 0.002), V(0.012, 0.1, 0.004), MAT.BRASS); // hinges
}
// the lintels' plates: a quad a door, uv into its row of the atlas, door: its index
function plateGeometry(d) {
  const n = d.names.length;
  const lw = d.clear[0] + 2 * d.post[0];
  const y0 = d.clear[1] / 2;
  const z = -0.02 + 0.0005;
  const pos = [];
  const uv = [];
  const door = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const x = doorX(i, d);
    pos.push(x - lw / 2, y0, z, x + lw / 2, y0, z, x + lw / 2, y0 + d.lintel, z, x - lw / 2, y0 + d.lintel, z);
    const v1 = 1 - i / n;
    const v0 = 1 - (i + 1) / n;
    uv.push(0, v0, 1, v0, 1, v1, 0, v1);
    door.push(i, i, i, i);
    idx.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(4 * n).fill([0, 0, 1]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('door', new THREE.Float32BufferAttribute(door, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const DOOR_GLSL = /* glsl */ `
uniform vec3 uDKeyPos, uDKeyCol, uDGlowPos, uDGlowCol; uniform float uDKeyR, uDGlowR, uDGone, uDSeed;
// the doors going (uDGone 0 … 1): a stipple that the frame's samples (uDSeed differs in each) even out to a fade
void doorGone(){
  if (uDGone <= 0.0) return;
  float n = fract(sin(dot(gl_FragCoord.xy + uDSeed*vec2(37.0, 17.0), vec2(12.9898, 78.233)))*43758.5453);
  if (n < uDGone) discard;
}
// the galleries' wood (libshader.js woodAlbedo), the grain along q.x; in the door's own frame, so that a
// leaf carries its grain as it swings
vec3 doorWood(vec2 q, float px){
  float g = vnoise2(vec2(q.x*0.6, q.y*28.0));
  float fine = mix(vnoise2(vec2(q.x*3.0, q.y*140.0)), 0.5, smoothstep(0.002, 0.01, px));
  return vec3(0.085, 0.048, 0.026)*(0.65 + 0.55*g + 0.25*fine);
}
vec3 pointLight(Surf s, vec3 Lp, vec3 Lc, float r){
  if (Lc.r + Lc.g + Lc.b <= 0.0) return vec3(0.0);
  vec3 dl = Lp - s.P;
  float d2 = dot(dl, dl);
  vec3 l = dl*inversesqrt(max(d2, 1e-8));
  float diff = max(dot(s.N, l), 0.0);
  return Lc*((diff*s.albedo + PI*ggx(s.N, s.V, l, s.rough, s.f0))/(d2 + r*r));
}
vec3 doorLight(Surf s){
  float k = floor((s.P.y + 1e-3)/uH);
  return lampLight(s, k, floorState(k)) + pointLight(s, uDKeyPos, uDKeyCol, uDKeyR) + pointLight(s, uDGlowPos, uDGlowCol, uDGlowR);
}
`;
const WOOD_VERT = /* glsl */ `
attribute float mat; attribute float aux;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vNl; varying float vMat; varying float vAux;
void main(){
  vMat = mat; vAux = aux; vL = position; vNl = normal;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const WOOD_FRAG = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vNl; varying float vMat; varying float vAux;
void main(){
  doorGone();
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float px = max(length(dFdx(vW)), length(dFdy(vW)));
  vec3 an = abs(vNl);
  Surf s; s.P = vW; s.N = N; s.V = V; s.f0 = vec3(0.04); s.rough = 0.45; s.ao = 1.0; s.wrap = 0.0;
  if (vMat > 5.5){
    s.albedo = vec3(0.0);
    s.f0 = vec3(0.78, 0.55, 0.26)*(0.75 + 0.35*vnoise2(vL.xy*7.0 + vL.zz*3.0));
    s.rough = 0.32;
  } else {
    vec2 q = vAux > 0.5 ? (an.y > 0.7 ? vL.xz : vL.xy) : (an.x > 0.7 ? vL.yz : vL.yx);
    s.albedo = doorWood(q, px);
  }
  gl_FragColor = vec4(fog(doorLight(s), vW), 1.0);
}`;
const PLATE_VERT = /* glsl */ `
attribute float door;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec2 vUv; varying float vDoor;
void main(){
  vUv = uv; vDoor = door; vL = position;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
// The lintel's face: wood, the name cut through it; at the back of the cut the light from behind (the
// door's own, and the key when it is behind the plate); looking into the cut aslant you see its walls.
const PLATE_FRAG = /* glsl */ `
uniform sampler2D uDMask; uniform vec2 uDPanel; uniform float uDThick, uDThru, uDRows;
uniform float uDLit[7]; uniform vec3 uDLitCol; uniform vec3 uDEX, uDEY;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec2 vUv; varying float vDoor;
void main(){
  doorGone();
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float px = max(length(dFdx(vW)), length(dFdy(vW)));
  vec2 off = -vec2(dot(V, uDEX), dot(V, uDEY))*(uDThick/max(dot(V, N), 0.05));
  vec2 m = texture2D(uDMask, vUv).rg;
  float back = texture2D(uDMask, vUv + off/vec2(uDPanel.x, uDPanel.y*uDRows)).r;
  Surf s; s.P = vW; s.N = N; s.V = V; s.f0 = vec3(0.04); s.rough = 0.45; s.ao = 1.0; s.wrap = 0.0;
  s.albedo = doorWood(vL.xy, px)*(1.0 - 0.4*clamp(m.g - m.r, 0.0, 1.0));
  vec3 face = doorLight(s);
  vec3 dl = uDKeyPos - (vW - N*0.1);
  float d2 = dot(dl, dl);
  vec3 thru = uDKeyCol*(uDThru*max(-dot(dl, N), 0.0)*inversesqrt(max(d2, 1e-8))/(d2 + uDKeyR*uDKeyR));
  vec3 glow = uDLitCol*uDLit[int(vDoor + 0.5)] + thru;
  vec3 hole = mix(0.18*glow + 0.3*face, glow, back);
  gl_FragColor = vec4(fog(mix(face, hole, m.r), vW), 1.0);
}`;

// The row. uniforms: the library's (its lamps, its fog); atlas: lintelAtlas()'s canvas; matrix: the row's
// frame in the world. set({ open, lit }): each door's leaf (rad, 0 shut … DOOR.leaf.open pushed home, away
// from the reader) and its letters' own light (uDLit).
export class Doors {
  constructor({ uniforms, atlas, matrix, d = DOOR }) {
    this.d = d;
    const n = d.names.length;
    const ex = new THREE.Vector3().setFromMatrixColumn(matrix, 0).normalize();
    const ey = new THREE.Vector3().setFromMatrixColumn(matrix, 1).normalize();
    this.uniforms = {
      ...uniforms,
      uDKeyPos: { value: new THREE.Vector3() },
      uDKeyCol: { value: new THREE.Color(0, 0, 0) },
      uDKeyR: { value: 0.15 },
      uDGlowPos: { value: new THREE.Vector3() },
      uDGlowCol: { value: new THREE.Color(0, 0, 0) },
      uDGlowR: { value: 0.25 },
      uDGone: { value: 0 },
      uDSeed: { value: 0 },
      uDMask: { value: canvasTexture(atlas, { srgb: false, mipmaps: true, anisotropy: 8 }) },
      uDPanel: { value: new THREE.Vector2(d.clear[0] + 2 * d.post[0], d.lintel) },
      uDRows: { value: n },
      uDThick: { value: d.letters.thick },
      uDThru: { value: 1 },
      uDLit: { value: new Array(n).fill(0) },
      uDLitCol: { value: new THREE.Color(...d.lit) },
      uDEX: { value: ex },
      uDEY: { value: ey },
    };
    const wood = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WOOD_VERT, fragmentShader: LIB_COMMON + DOOR_GLSL + WOOD_FRAG });
    const plate = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: PLATE_VERT, fragmentShader: LIB_COMMON + DOOR_GLSL + PLATE_FRAG });
    this.group = new THREE.Group();
    matrix.decompose(this.group.position, this.group.quaternion, this.group.scale);
    const fb = new Builder();
    for (let i = 0; i < n; i++) buildFrame(fb, doorX(i, d), d);
    this.frames = new THREE.Mesh(fb.geometry(), wood);
    this.plates = new THREE.Mesh(plateGeometry(d), plate);
    this.group.add(this.frames, this.plates);
    // a leaf a door, each built where it hangs (so no two have the same grain) and hung from a pivot on its hinge
    this.leaves = [];
    for (let i = 0; i < n; i++) {
      const hx = doorX(i, d) - d.clear[0] / 2;
      const lb = new Builder().setTransform(new THREE.Matrix4().makeTranslation(hx, 0, 0));
      buildLeaf(lb, d);
      const leaf = new THREE.Mesh(lb.geometry(), wood);
      leaf.position.x = -hx;
      const pivot = new THREE.Group();
      pivot.position.set(hx, 0, -d.leaf.inset);
      pivot.add(leaf);
      this.leaves.push(pivot);
      this.group.add(pivot);
    }
  }
  set({ open, lit } = {}) {
    if (open) this.leaves.forEach((leaf, i) => (leaf.rotation.y = open[i] || 0));
    if (lit) lit.forEach((v, i) => (this.uniforms.uDLit.value[i] = v));
    return this;
  }
}
