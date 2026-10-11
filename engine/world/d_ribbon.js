// Agent D2 · the ribbon (s41, s42): a bookmark ribbon of lime satin, the receipt the reader leaves in the book it
// used. One line on it in small monospaced type, `adopted`, nothing else; its end cut in a swallowtail. A strip
// along a centre line the shot lays out each frame (in the gutter as it is laid, hanging over the tail, draped over
// the shelf's edge), lit as the books round it are lit: the library's lamps (lampVar, so d_bay.js's withOneLamp
// reaches it), the shot's lights (d_bay.js's dLight: share the wall's uniforms) and the bay's key, the pool a
// bookshelf.js shelf gets (share the shelf's uKey* uniforms). Satin: a sheen along its length that slides as it
// moves. Lime, the film's signal, so it may glow a little of its own (uGlow).
//   const rib = await Ribbon.create({ uniforms: lib.uniforms, wall, shelf: bay.shelf, length });
//   scene.add(rib.mesh); in update(t): rib.lay(points, normals) (world; points from the end fixed in the book to
//   the free tip, about evenly spaced; normals: the side the type is on), then rib.update().
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { loadFonts, font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';
import { DLIGHT_GLSL } from './d_bay.js';

export const WORD = 'adopted';

// the type: the word across the middle of a strip of canvas (white on black: a mask)
async function wordTexture() {
  await loadFonts();
  const cv = makeCanvas(1024, 160);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff';
  g.font = font('mono', 112, 600);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(WORD, cv.width / 2, cv.height / 2 + 6);
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 });
}

const VERT = /* glsl */ `
attribute vec2 aUv; attribute vec3 aTan;
varying vec2 vUv; varying vec3 vW, vN, vT;
void main(){
  vUv = aUv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vT = normalize(mat3(modelMatrix)*aTan);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uWord; uniform float uLen, uWidth, uGlow, uFlipV, uSheen; uniform vec2 uText;
uniform vec3 uCol, uInk;
uniform vec3 uKeyPos, uKeyCol, uKeyDir; uniform float uKeyR; uniform vec2 uKeyCone;
varying vec2 vUv; varying vec3 vW, vN, vT;
${DLIGHT_GLSL}
// the bay's key as bookshelf.js has it (a beam when uKeyCone is set): what reaches P, and from where
vec3 keyAt(vec3 P, out vec3 l){
  vec3 dl = uKeyPos - P; float d2 = dot(dl, dl); l = dl*inversesqrt(d2);
  vec3 E = uKeyCol/(d2 + uKeyR*uKeyR);
  if (uKeyCone.x > -1.0) E *= smoothstep(uKeyCone.x, uKeyCone.y, dot(-l, uKeyDir));
  return E;
}
// satin's sheen: bright where the half-vector is square to the threads (Kajiya-Kay)
float sheenOf(vec3 T, vec3 l, vec3 V){ vec3 H = normalize(l + V); float th = dot(T, H); return pow(max(1.0 - th*th, 0.0), 30.0); }
void main(){
  float s = vUv.x*uLen;   // m from the end fixed in the book
  float v = vUv.y;        // across, 0..1
  // the swallowtail: a V cut 1.2 cm into the free end
  if (uLen - s < 0.012*(1.0 - abs(2.0*v - 1.0))) discard;
  vec3 N = normalize(gl_FrontFacing ? vN : -vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 T = normalize(vT);
  // the weave: warp threads along it, weft across, faded out where they are finer than a pixel
  float fu = fwidth(s), fv = fwidth(v)*uWidth;
  float warp = (0.5 + 0.5*sin(v*uWidth*6.2832/0.0005))*(1.0 - smoothstep(0.2, 0.6, fv/0.0005));
  float weft = (0.5 + 0.5*sin(s*6.2832/0.0012))*(1.0 - smoothstep(0.2, 0.6, fu/0.0012));
  float weave = 0.86 + 0.14*mix(1.0, warp*weft, 0.7);
  // the word, on the side it is printed on
  float ink = 0.0;
  if (gl_FrontFacing && s > uText.x && s < uText.y){
    vec2 tc = vec2((s - uText.x)/(uText.y - uText.x), mix(v, 1.0 - v, uFlipV));
    ink = texture2D(uWord, tc).r;
  }
  vec3 alb = mix(uCol*weave, uInk, 0.985*ink);
  Surf sf; sf.P = vW; sf.N = N; sf.V = V; sf.albedo = alb; sf.f0 = vec3(0.04); sf.rough = 0.6; sf.ao = 1.0; sf.wrap = 0.3;
  float k = floor((vW.y + 1e-3)/uH);
  vec4 st = floorState(k);
  vec3 l;
  vec3 E = keyAt(vW, l);
  float diff = max((dot(N, l) + sf.wrap)/(1.0 + sf.wrap), 0.0);
  vec3 c = lampLight(sf, k, st) + dLight(sf) + E*diff*alb + uAmb*alb*20.0;
  // the sheen, from the key and the shot's lights, the lime of the satin in it
  vec3 tint = mix(vec3(1.0), uCol, 0.6)*(1.0 - ink)*uSheen;
  c += E*max(dot(N, l), 0.0)*sheenOf(T, l, V)*tint;
  for (int i = 0; i < 4; i++){
    if (uDLCol[i].r + uDLCol[i].g + uDLCol[i].b <= 0.0) continue;
    vec3 dl = uDLPos[i] - vW; float d2 = dot(dl, dl); vec3 li = dl*inversesqrt(d2);
    c += uDLCol[i]/(d2 + uDLR[i]*uDLR[i])*max(dot(N, li), 0.0)*sheenOf(T, li, V)*tint;
  }
  c += uCol*uGlow*(1.0 - ink);
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

export class Ribbon {
  static async create(o) {
    return new Ribbon({ ...o, word: await wordTexture() });
  }

  // length (m), from the end fixed in the book to the tip; points: how many along it; text: where the word is
  // (m from the fixed end, start and end); flip: turn the word over across the ribbon
  constructor({ uniforms, wall, shelf, word, length = 0.6, width = 0.014, points = 121, text = null, flip = false }) {
    this.L = length;
    this.W = width;
    this.M = points;
    const n = points;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    this.nrm = new Float32Array(n * 2 * 3);
    this.tan = new Float32Array(n * 2 * 3);
    const uv = [];
    const idx = [];
    for (let i = 0; i < n; i++) {
      uv.push(i / (n - 1), 0, i / (n - 1), 1);
      if (i < n - 1) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); // facing N (the printed side)
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTan', new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const t = text ?? [length - 0.085, length - 0.035];
    const K = shelf.uniforms;
    this.uniforms = {
      uWord: { value: word },
      uLen: { value: length },
      uWidth: { value: width },
      uText: { value: new THREE.Vector2(t[0], t[1]) },
      uFlipV: { value: flip ? 1 : 0 },
      // a dye a little greener than the film's lime, so the satin still reads lime in the amber lamps
      uCol: { value: new THREE.Color(0.45, 0.95, 0.1).multiplyScalar(0.6) },
      uInk: { value: new THREE.Color(0.006, 0.008, 0.002) },
      uGlow: { value: 0.05 },
      uSheen: { value: 0.8 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uDLPos: wall.uniforms.uDLPos,
        uDLCol: wall.uniforms.uDLCol,
        uDLR: wall.uniforms.uDLR,
        uKeyPos: K.uKeyPos,
        uKeyCol: K.uKeyCol,
        uKeyR: K.uKeyR,
        uKeyDir: K.uKeyDir,
        uKeyCone: K.uKeyCone,
        ...this.uniforms,
      },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + FRAG,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this._t = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  // the centre line (world, from the fixed end to the tip, `points` of them) and the printed side's normal at each
  lay(P, N) {
    const n = this.M;
    const hw = this.W / 2;
    const T = this._t;
    const B = this._b;
    const Nn = this._n;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(i - 1, 0)];
      const b = P[Math.min(i + 1, n - 1)];
      T.subVectors(b, a);
      if (T.lengthSq() < 1e-12) T.set(0, -1, 0);
      T.normalize();
      B.crossVectors(T, N[i]);
      if (B.lengthSq() < 1e-12) B.set(1, 0, 0);
      B.normalize();
      Nn.crossVectors(B, T).normalize();
      for (let j = 0; j < 2; j++) {
        const o = (2 * i + j) * 3;
        const sgn = j === 0 ? -1 : 1;
        this.pos[o] = P[i].x + sgn * hw * B.x;
        this.pos[o + 1] = P[i].y + sgn * hw * B.y;
        this.pos[o + 2] = P[i].z + sgn * hw * B.z;
        this.nrm[o] = Nn.x;
        this.nrm[o + 1] = Nn.y;
        this.nrm[o + 2] = Nn.z;
        this.tan[o] = T.x;
        this.tan[o + 1] = T.y;
        this.tan[o + 2] = T.z;
      }
    }
    const A = this.mesh.geometry.attributes;
    A.position.needsUpdate = true;
    A.normal.needsUpdate = true;
    A.aTan.needsUpdate = true;
    return this;
  }
}
