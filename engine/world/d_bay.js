// Agent D2 · the bay of the book already written (s40–s42), inside the library.
//
// The library paints its far books on a plane at the book face (a = 0, MAT.BOOKS); its boards and dividers are real.
// A shot that stands a few metres from the bay and takes the old book out of it needs the bay's books modelled
// where the rest of the wall stays painted. Two pieces:
//
//  wallMaterial(lib)  the library's own material with three things added by a text patch (the library's files are
//                     not touched; a missing line warns and leaves the library as it is):
//                       · a hole: the painted plane is not drawn inside a box (one bay of one side of one floor),
//                       · lights: up to four point lights of the shot's own (the reader, the tower of pages) that
//                         fall on the stone, the boards and the painted books as the lamps do,
//                       · one lamp of the library re-coloured (s41, s42): its amber taken out of every surface the
//                         library lights (lampVar of that lamp → uOneAmber) — the shot adds the new colour itself.
//                     Give it to the floors with attach().
//  Bay                the bay's books: E1's (e1_bay.js dustyBay: the old book in row 2 among volumes nobody has
//                     touched, the same layout as s33) drawn with bookshelf.js but standing on the library's own
//                     boards (E1's carcass is left out: its boards would stand 4.5 cm behind the library's), and a
//                     dark back behind them where the painted plane was.
//
// Side frame as e1_place.js: a out from the book plane toward the shaft, s along the side, y above floor k.
import * as THREE from 'three';
import { LIB } from './libshader.js';
import { Builder, MAT, sideNormal, sideTangent, sidePoint } from './geo.js';
import { BookShelf } from './bookshelf.js';
import { dustyBay } from './e1_bay.js';

const FACE = LIB.AW - 0.4; // the plane the books are painted on

function patched(src, swaps, what) {
  let out = src;
  for (const [a, b] of swaps) {
    if (out.split(a).length !== 2) {
      console.warn(`[d_bay] the library's ${what} shader has changed ('${a.slice(0, 40)}…'): left as it is`);
      return null;
    }
    out = out.replace(a, b);
  }
  return out;
}

// The shot's lights, for any shader on LIB_COMMON (Surf, ggx, PI): as bookshelf.js keyLight, radiant intensity over
// distance squared (softened by the source's radius). Uniforms: WallMaterial's uDLPos, uDLCol, uDLR (share them).
export const DLIGHT_GLSL = /* glsl */ `
uniform vec3 uDLPos[4]; uniform vec3 uDLCol[4]; uniform float uDLR[4];
vec3 dLight(Surf s){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++){
    if (uDLCol[i].r + uDLCol[i].g + uDLCol[i].b <= 0.0) continue;
    vec3 dl = uDLPos[i] - s.P; float d2 = dot(dl, dl); vec3 l = dl*inversesqrt(d2);
    float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
    acc += uDLCol[i]/(d2 + uDLR[i]*uDLR[i])*(diff*s.albedo + PI*ggx(s.N, s.V, l, max(s.rough, 0.25), s.f0));
  }
  return acc;
}
`;
// GLSL added before the library's fragment main: the hole and the shot's lights
const WALL = /* glsl */ `
uniform vec4 uHoleS, uHoleN; uniform vec2 uHoleY;
bool inHole(vec3 P){
  float s = dot(P.xz, uHoleS.xy), r = dot(P.xz, uHoleN.xy);
  return P.y > uHoleY.x && P.y < uHoleY.y && s > uHoleS.z && s < uHoleS.w && r > uHoleN.z && r < uHoleN.w;
}
` + DLIGHT_GLSL;
// the re-coloured lamp: lampVar of lamp j of floor k gives uOneAmber instead (any shader that includes LIB_COMMON)
const VAR0 = 'float lampVar(float k, int j){';
const VAR1 = /* glsl */ `uniform ivec2 uOneKJ; uniform float uOneAmber;
float lampVar0(float k, int j);
float lampVar(float k, int j){ return (int(k) == uOneKJ.x && j == uOneKJ.y) ? uOneAmber : lampVar0(k, j); }
float lampVar0(float k, int j){`;

export function oneLampUniforms() {
  return { uOneKJ: { value: new THREE.Vector2(-9999, -1) }, uOneAmber: { value: 1 } };
}
// a copy of any material built on LIB_COMMON (BookShelf, Dust, the library's lamps and glows) whose lampVar knows the
// re-coloured lamp; uniforms are shared (the same objects), so one set() reaches all of them
export function withOneLamp(material, one) {
  const vs = material.vertexShader.includes(VAR0) ? patched(material.vertexShader, [[VAR0, VAR1]], 'vertex') : material.vertexShader;
  const fs = material.fragmentShader.includes(VAR0) ? patched(material.fragmentShader, [[VAR0, VAR1]], 'fragment') : material.fragmentShader;
  if (!vs || !fs) return material;
  const m = material.clone();
  m.uniforms = { ...material.uniforms, ...one };
  m.vertexShader = vs;
  m.fragmentShader = fs;
  m.needsUpdate = true;
  return m;
}

export class WallMaterial {
  constructor(lib, { one = null } = {}) {
    this.uniforms = {
      uHoleS: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHoleN: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHoleY: { value: new THREE.Vector2(1, 0) }, // empty: no hole
      uDLPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
      uDLCol: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
      uDLR: { value: [0.1, 0.1, 0.1, 0.1] },
    };
    const src = lib.material.fragmentShader;
    const at = src.lastIndexOf('void main(');
    const fs =
      at < 0
        ? null
        : patched(
            src.slice(0, at) + WALL + src.slice(at),
            [
              ['int m = int(vMat + 0.5);', 'int m = int(vMat + 0.5);\n  if (m == 3 && inHole(P)) discard;'],
              ['vec3 c = lampLight(s, k, st)*s.ao + ', 'vec3 c = (lampLight(s, k, st) + dLight(s))*s.ao + '],
            ],
            'library',
          );
    this.ok = !!fs;
    const base = fs
      ? new THREE.ShaderMaterial({ uniforms: { ...lib.material.uniforms, ...this.uniforms }, vertexShader: lib.material.vertexShader, fragmentShader: fs, side: lib.material.side })
      : lib.material;
    this.material = one ? withOneLamp(base, one) : base;
  }

  // the library's floors drawn with it
  attach(lib) {
    for (const L of lib.lods) L.floor.material = this.material;
    return this;
  }

  // no painted books on side `side` of floor k for s in [s0, s1] and y (above the floor) in [y0, y1]
  hole(side, k, s0, s1, y0, y1) {
    const n = sideNormal(side);
    const t = sideTangent(side);
    this.uniforms.uHoleS.value.set(t.x, t.z, s0, s1);
    this.uniforms.uHoleN.value.set(n.x, n.z, FACE - 0.05, FACE + 0.05);
    this.uniforms.uHoleY.value.set(k * LIB.H + y0, k * LIB.H + y1);
    return this;
  }

  // light i: world position, colour × radiant intensity (THREE.Color or Vector3), source radius (m)
  light(i, pos, col, r = 0.1) {
    this.uniforms.uDLPos.value[i].copy(pos);
    this.uniforms.uDLCol.value[i].set(col.r ?? col.x, col.g ?? col.y, col.b ?? col.z);
    this.uniforms.uDLR.value[i] = r;
    return this;
  }
}

// The bay between two of the library's dividers, its rows 1–4 modelled (E1's layout).
//   const bay = await Bay.create({ uniforms: lib.uniforms, place: S32.DUSTY, side, book: S32.dustyBook(), labels })
//   scene.add(bay.group); wall.hole(...bay.holeArgs); bay.shelf.set(bay.index, {...}) moves the old book.
export class Bay {
  static async create({ uniforms, place, side, book, labels, seed = 33, material = null }) {
    const e1 = await dustyBay({ uniforms, place, book, labels, seed });
    const U1 = e1.shelf.uniforms;
    const lab = { labels: U1.uLabels.value, strips: U1.uStrips.value, heroA: U1.uHeroA.value, heroB: U1.uHeroB.value, stripRows: 16 };
    // the same volumes, without E1's boards (a board row far out of sight), on the library's
    const layout = { ...e1.layout, rows: [{ y: 3000 }] };
    const shelf = new BookShelf({ uniforms, layout, labels: lab });
    e1.shelf.mesh.geometry.dispose();
    e1.shelf.material.dispose();
    e1.shelf.tex.dispose();
    return new Bay({ shelf, index: e1.index, place, side, material });
  }

  constructor({ shelf, index, place, side, material }) {
    this.shelf = shelf;
    this.index = index;
    this.place = place;
    this.side = side;
    this.group = new THREE.Group();
    // shelf space at the old book (as s32's QBOOK): x along the side (+s), y up, z out toward the shaft
    this.q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(sideTangent(side), new THREE.Vector3(0, 1, 0), sideNormal(side).negate()),
    );
    shelf.group.position.copy(place.pos);
    shelf.group.quaternion.copy(this.q);
    this.group.add(shelf.group);
    // the dark back where the painted plane was, just behind the boards' and dividers' back edges
    const k = place.k;
    const [s0, s1] = place.bay;
    const y0 = LIB.PLINTH + LIB.ROW_H - 0.01; // under board 1
    const y1 = LIB.PLINTH + 5 * LIB.ROW_H + LIB.BOARD + 0.01; // over board 5
    const r = FACE + 0.39;
    const P = (s, y) => sidePoint(side, r, s, k * LIB.H + y);
    const b = new Builder();
    b.quad(P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1), MAT.DARK);
    this.back = material ? new THREE.Mesh(b.geometry(), material) : null;
    if (this.back) {
      this.back.frustumCulled = false;
      this.group.add(this.back);
    }
    // what the wall's hole must be: between the dividers' inner faces, from board 1's top to board 5's foot
    this.holeArgs = [side, k, s0 + 0.025, s1 - 0.025, LIB.PLINTH + LIB.ROW_H + LIB.BOARD, LIB.PLINTH + 5 * LIB.ROW_H];
  }
}

// A bookshelf.js shelf lit by the shot's lights as well as its own key (it shares the wall's uDL* uniforms, so one
// wall.light() call reaches the shelf too). Before the shelf is first drawn. false if the shelf's shader has changed.
export function shelfLights(shelf, wall) {
  const src = shelf.material.fragmentShader;
  const at = src.lastIndexOf('void main(');
  const fs = at < 0 ? null : patched(src.slice(0, at) + DLIGHT_GLSL + src.slice(at), [['c += beamLight(s) + ', 'c += dLight(s)*s.ao + beamLight(s) + ']], 'bookshelf');
  if (!fs) return false;
  shelf.material.fragmentShader = fs;
  for (const k of ['uDLPos', 'uDLCol', 'uDLR']) shelf.material.uniforms[k] = wall.uniforms[k];
  shelf.material.needsUpdate = true;
  return true;
}
