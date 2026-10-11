// The Library of Babel, as one hexagonal shaft with galleries stacked without end.
// One floor = slab (floor tiles on top, ceiling below, carved inscription band facing the shaft),
// balustrade, six pillars and an architrave around the shaft, four shelf walls, two doorways to
// vestibules (sides 1 and 4, facing ±z), twelve hanging lamps. Floors are instances of the same
// geometry in three levels of detail; every procedural texture varies with the world position.
import * as THREE from 'three';
import { Builder, MAT, COS30, TAN30, sideNormal, sideTangent, sidePoint } from './geo.js';
import { LIB, libraryUniforms, createLibraryMaterial, createLampMaterial, createGlowMaterial } from './libshader.js';
import { font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';

const UP = new THREE.Vector3(0, 1, 0);

// box whose local x runs radially at angle a (radians), from radius r0 to r1
export function radialBox(b, a, r0, r1, y0, height, width, mat, faces = 'all') {
  const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const tang = new THREE.Vector3().crossVectors(radial, UP); // (radial, up, tang) is right-handed
  const m = new THREE.Matrix4().makeBasis(radial, UP, tang);
  m.setPosition(radial.clone().multiplyScalar((r0 + r1) / 2).setY(y0 + height / 2));
  const prev = b.matrix;
  b.setTransform(prev ? prev.clone().multiply(m) : m);
  b.box(new THREE.Vector3(), new THREE.Vector3(r1 - r0, height, width), mat, 0, faces);
  b.setTransform(prev);
}

const BALUSTER = [
  [0.05, 0.0], [0.062, 0.025], [0.045, 0.07], [0.036, 0.11], [0.05, 0.2], [0.068, 0.32], [0.064, 0.4],
  [0.045, 0.5], [0.03, 0.6], [0.032, 0.66], [0.048, 0.7], [0.05, 0.76],
];

function balustrade(b, detail) {
  const AS = LIB.AS;
  // plinth and top rail (cross-sections walked counter-clockwise, so faces point out of the solid)
  b.hexExtrude(AS, [[0.4, 0.0], [0.4, 0.16], [0.02, 0.16], [0.02, 0.0]], MAT.STONE);
  b.hexExtrude(AS, [[0.42, 0.92], [0.42, 1.03], [0.38, 1.09], [0.04, 1.09], [0.0, 1.03], [0.0, 0.92], [0.42, 0.92]], MAT.STONE);
  if (detail === 'far') {
    b.hexExtrude(AS, [[0.27, 0.16], [0.27, 0.92], [0.15, 0.92], [0.15, 0.16]], MAT.STONE);
    return;
  }
  const a = AS + 0.21;
  const L = 2 * a * TAN30;
  const usable = L - 1.4; // the pillars take the corners
  const n = Math.floor(usable / 0.3);
  for (let i = 0; i < 6; i++) {
    const nn = sideNormal(i);
    const tt = sideTangent(i);
    for (let j = 0; j < n; j++) {
      const s = -usable / 2 + (j + 0.5) * (usable / n);
      const c = nn.clone().multiplyScalar(a).addScaledVector(tt, s).setY(0.16);
      if (detail === 'near') b.lathe(c, BALUSTER, 8, MAT.STONE);
      else b.box(c.clone().setY(0.16 + 0.38), new THREE.Vector3(0.085, 0.76, 0.085), MAT.STONE, 0, ['+x', '-x', '+z', '-z']);
    }
  }
}

// a wall of shelves on side i between s0 and s1 (along the side tangent)
function shelfRun(b, i, s0, s1, detail) {
  const { AW, PLINTH, CORNICE, HC, ROWS, ROW_H, BOARD, SHELF_D } = LIB;
  const Ls = s1 - s0;
  const sc = (s0 + s1) / 2;
  const P = (s, y) => sidePoint(i, AW - 0.4, s, y);
  // the plane the books are drawn on (faces the shaft: +s then +y winds toward -n)
  b.quad(P(s0, PLINTH), P(s1, PLINTH), P(s1, HC - CORNICE), P(s0, HC - CORNICE), MAT.BOOKS);
  b.sideBox(i, AW - (SHELF_D + 0.04) / 2, sc, 0, [Ls, PLINTH, SHELF_D + 0.04], MAT.WOOD, 0, ['-z', '+y']);
  b.sideBox(i, AW - (SHELF_D + 0.1) / 2, sc, HC - CORNICE, [Ls, CORNICE, SHELF_D + 0.1], MAT.WOOD, 0, ['-z', '-y']);
  if (detail === 'far') return;
  const ac = AW - 0.02 - SHELF_D / 2;
  for (let r = 1; r < ROWS; r++) {
    b.sideBox(i, ac, sc, PLINTH + r * ROW_H, [Ls, BOARD, SHELF_D], MAT.WOOD, 0, ['-z', '+y', '-y']);
  }
  const bay = 2.38;
  for (let m = Math.ceil(s0 / bay); m * bay <= s1; m++) {
    const s = m * bay;
    if (s - s0 < 0.1 || s1 - s < 0.1) continue;
    b.sideBox(i, ac, s, PLINTH, [0.05, HC - PLINTH - CORNICE, SHELF_D], MAT.WOOD, 0, ['-z', '+x', '-x']);
  }
}

// Arched doorway on side i into a barrel-vaulted vestibule, with a smaller dark arch beyond.
// In the side frame (t along the side, up, n outward) a quad walked +t then +up faces -n.
function doorway(b, i, detail) {
  const { AW, HC } = LIB;
  const DW = 3.4;
  const spring = 3.4;
  const r = DW / 2;
  const half = DW / 2 + 0.9;
  const af = AW - 0.46; // wall face, flush with the shelf plinths
  const n = sideNormal(i);
  const t = sideTangent(i);
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-r, 0);
  shape.lineTo(-r, spring);
  shape.absarc(0, spring, r, Math.PI, 0, true);
  shape.lineTo(r, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, HC);
  shape.lineTo(-half, HC);
  shape.lineTo(-half, 0);
  b.shape(shape, sidePoint(i, af, 0, 0), t, UP, MAT.STONE, 0, 24);
  const depth = 4.2;
  const a0 = af;
  const a1 = af + depth;
  const Q = (a, s, y) => sidePoint(i, a, s, y);
  b.quad(Q(a0, -r, 0), Q(a1, -r, 0), Q(a1, -r, spring), Q(a0, -r, spring), MAT.PLASTER); // faces +t
  b.quad(Q(a1, r, 0), Q(a0, r, 0), Q(a0, r, spring), Q(a1, r, spring), MAT.PLASTER); // faces -t
  const seg = detail === 'near' ? 16 : 8;
  for (let k = 0; k < seg; k++) {
    const th0 = Math.PI * (k / seg);
    const th1 = Math.PI * ((k + 1) / seg);
    const s0 = r * Math.cos(th0);
    const s1 = r * Math.cos(th1);
    const y0 = spring + r * Math.sin(th0);
    const y1 = spring + r * Math.sin(th1);
    const thm = (th0 + th1) / 2;
    const nrm = t.clone().multiplyScalar(-Math.cos(thm)).setY(-Math.sin(thm)); // into the vault
    b.quad(Q(a1, s0, y0), Q(a0, s0, y0), Q(a0, s1, y1), Q(a1, s1, y1), MAT.PLASTER, 0, nrm);
  }
  b.quad(Q(a0, -r, 0), Q(a0, r, 0), Q(a1, r, 0), Q(a1, -r, 0), MAT.FLOOR, 0, UP.clone());
  const back = new THREE.Shape();
  back.moveTo(-r, 0);
  back.lineTo(-0.7, 0);
  back.lineTo(-0.7, 2.3);
  back.absarc(0, 2.3, 0.7, Math.PI, 0, true);
  back.lineTo(0.7, 0);
  back.lineTo(r, 0);
  back.lineTo(r, spring);
  back.absarc(0, spring, r, 0, Math.PI, false);
  back.lineTo(-r, 0);
  b.shape(back, Q(a1, 0, 0), t, UP, MAT.PLASTER, 0, 16);
  b.quad(Q(a1 + 0.6, -0.7, 0), Q(a1 + 0.6, 0.7, 0), Q(a1 + 0.6, 0.7, 3.0), Q(a1 + 0.6, -0.7, 3.0), MAT.DARK, 0, n.clone().negate());
  // keystone and flanking pilasters
  b.sideBox(i, af - 0.06, 0, spring + r - 0.1, [0.42, 0.62, 0.14], MAT.STONE);
  b.sideBox(i, af - 0.05, -(r + 0.35), 0, [0.5, spring + 0.1, 0.12], MAT.STONE);
  b.sideBox(i, af - 0.05, r + 0.35, 0, [0.5, spring + 0.1, 0.12], MAT.STONE);
  const end = (AW - 0.4) * TAN30 - 0.75;
  shelfRun(b, i, -end, -half, detail);
  shelfRun(b, i, half, end, detail);
}

export function buildFloor(detail = 'near') {
  const b = new Builder();
  const { T, AS, AW, HC } = LIB;
  // slab: floor, ceiling of the floor below, the moulded edge facing the shaft
  b.hexRing(AS - 0.16, AW, 0, MAT.FLOOR, true);
  b.hexRing(AS - 0.03, AW, -T, MAT.CEILING, false);
  b.hexExtrude(AS, [[-0.16, 0.0], [-0.16, -0.05], [-0.12, -0.09], [-0.05, -0.13], [-0.05, -0.17], [0.0, -0.19]], MAT.STONE);
  b.hexExtrude(AS, [[0.0, -0.19], [0.0, -T + 0.16]], MAT.FASCIA);
  b.hexExtrude(AS, [[0.0, -T + 0.16], [-0.06, -T + 0.13], [-0.06, -T + 0.05], [-0.03, -T + 0.02], [-0.03, -T]], MAT.STONE);
  balustrade(b, detail);
  // pillars at the shaft corners and the architrave they carry
  const rc = (AS + 0.21) / COS30;
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * (Math.PI / 180);
    if (detail !== 'far') {
      radialBox(b, a, rc - 0.58, rc + 0.58, 0, 0.3, 1.16, MAT.STONE, ['+x', '-x', '+y', '+z', '-z']);
      radialBox(b, a, rc - 0.58, rc + 0.58, HC - 0.62 - 0.3, 0.3, 1.16, MAT.STONE, ['+x', '-x', '-y', '+z', '-z']);
    }
    radialBox(b, a, rc - 0.43, rc + 0.43, 0, HC - 0.62, 0.86, MAT.STONE, ['+x', '-x', '+z', '-z']);
  }
  b.hexExtrude(AS, [[-0.05, HC], [-0.05, HC - 0.62], [0.5, HC - 0.62], [0.5, HC]], MAT.STONE);
  // outer corners: pilasters
  const ro = AW / COS30;
  for (let i = 0; i < 6; i++) radialBox(b, i * 60 * (Math.PI / 180), ro - 1.0, ro, 0, HC, 1.3, MAT.STONE, ['-x', '+z', '-z']);
  // walls: shelves, and doorways on sides 1 and 4
  const end = (AW - 0.4) * TAN30 - 0.75;
  for (let i = 0; i < 6; i++) {
    if (i === 1 || i === 4) doorway(b, i, detail);
    else shelfRun(b, i, -end, end, detail);
  }
  if (detail !== 'far') {
    // radial ceiling beams
    for (let i = 0; i < 6; i++) {
      radialBox(b, i * 60 * (Math.PI / 180), (AS + 0.5) / COS30, (AW - 0.9) / COS30, HC - 0.48, 0.48, 0.44, MAT.WOOD, ['+z', '-z', '-y']);
    }
    const collar = (c) => {
      const top = c.y + LIB.LAMP_R * 0.82;
      b.lathe(c.clone().setY(top - 0.02), [[0.07, 0.0], [0.135, 0.035], [0.15, 0.075], [0.09, 0.11], [0.035, 0.15]], detail === 'near' ? 16 : 8, MAT.BRASS);
      return top + 0.13;
    };
    // gallery lamps: rod from a ceiling rose
    for (const c of galleryLamps()) {
      const top = collar(c);
      b.lathe(c.clone().setY(top), [[0.018, 0], [0.018, HC - top]], 6, MAT.BRASS);
      b.lathe(c.clone().setY(HC - 0.06), [[0.02, 0.0], [0.16, 0.0], [0.17, 0.03], [0.12, 0.06]], detail === 'near' ? 12 : 6, MAT.BRASS);
    }
    // shaft lamps: a brass arm out of each pillar, a short drop, a brace back to the pillar
    const armY = LIB.SHAFT_Y + 0.75;
    const face = rc - 0.43;
    shaftLamps().forEach((c, i) => {
      const a = i * 60 * (Math.PI / 180);
      const top = collar(c);
      b.lathe(c.clone().setY(top), [[0.016, 0], [0.016, armY - top]], 6, MAT.BRASS);
      radialBox(b, a, LIB.SHAFT_R - 0.05, face, armY - 0.03, 0.06, 0.05, MAT.BRASS);
      radialBox(b, a, face - 0.04, face, armY - 0.75, 0.75, 0.16, MAT.BRASS, ['-x', '+z', '-z', '-y']);
      const n = 6;
      for (let j = 0; j < n; j++) {
        // a quarter-circle brace under the arm, as a chain of short boxes
        const th0 = (j / n) * (Math.PI / 2);
        const th1 = ((j + 1) / n) * (Math.PI / 2);
        const R = 0.55;
        const r0 = face - R + R * Math.cos(th0);
        const r1 = face - R + R * Math.cos(th1);
        const y0 = armY - R * Math.sin(th0);
        const y1 = armY - R * Math.sin(th1);
        radialBox(b, a, Math.min(r0, r1) - 0.012, Math.max(r0, r1) + 0.012, Math.min(y0, y1) - 0.012, Math.abs(y1 - y0) + 0.024, 0.03, MAT.BRASS);
      }
    });
  }
  return b.geometry();
}

export function galleryLamps() {
  const out = [];
  for (let i = 0; i < 6; i++) for (const e of [-1, 1]) out.push(sidePoint(i, LIB.LAMP_A, e * LIB.LAMP_OFF, LIB.LAMP_Y));
  return out;
}
export function shaftLamps() {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * (Math.PI / 180);
    out.push(new THREE.Vector3(Math.cos(a) * LIB.SHAFT_R, LIB.SHAFT_Y, Math.sin(a) * LIB.SHAFT_R));
  }
  return out;
}
export const lampPositions = () => [...galleryLamps(), ...shaftLamps()];

// The inscription band runs once around the shaft as INSCRIPTION_PERIODS repeats of one strip, so
// the carving is continuous across the hexagon corners (the shader walks the perimeter).
export const INSCRIPTION_PERIODS = 5;
export const BAND_H = LIB.T - 0.19 - 0.16;
const PERIMETER = 12 * LIB.AS * TAN30;

// Carved inscriptions: Ecclesiastes 1:9 in Latin, Greek and Chinese, and Borges, with diamond
// interpuncts like a Roman frieze. White on black; the phrases are spaced to fill the strip exactly.
export function inscriptionTexture() {
  const Hh = 256;
  const aspect = PERIMETER / INSCRIPTION_PERIODS / BAND_H;
  const W = Math.round(Hh * aspect);
  const cv = makeCanvas(W, Hh);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, Hh);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const phrases = [
    ['garamond', 'NIHIL SVB SOLE NOVVM'],
    ['serif', '日光之下并无新事'],
    ['garamond', 'ΟΥΚ ΕΣΤΙΝ ΠΑΝ ΠΡΟΣΦΑΤΟΝ ΥΠΟ ΤΟΝ ΗΛΙΟΝ'],
    ['garamond', 'EL VNIVERSO QVE OTROS LLAMAN LA BIBLIOTECA'],
    ['serif', '宇宙 别人称之为图书馆'],
    ['garamond', 'OMNIA IAM SCRIPTA SVNT'],
  ];
  const style = (fam) => {
    if (fam === 'serif') {
      ctx.font = font('serif', 132, 400);
      ctx.letterSpacing = '34px';
    } else {
      ctx.font = font('garamond', 178, 500);
      ctx.letterSpacing = '20px';
    }
  };
  const minGap = 150;
  const items = [];
  let used = 0;
  for (let k = 0; ; k++) {
    const [fam, text] = phrases[k % phrases.length];
    style(fam);
    const m = ctx.measureText(text);
    const w = m.width - parseFloat(ctx.letterSpacing);
    if (used + w + minGap > W && items.length) break;
    items.push({ fam, text, w, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent });
    used += w + minGap;
  }
  const gap = minGap + (W - used) / items.length;
  let x = gap / 2;
  for (const it of items) {
    style(it.fam);
    ctx.fillText(it.text, x, Hh / 2 + (it.asc - it.desc) / 2);
    x += it.w + gap;
    // diamond interpunct centred in the gap (the last one wraps to the strip's start)
    const cx = (x - gap / 2) % W;
    ctx.beginPath();
    ctx.moveTo(cx, Hh / 2 - 15);
    ctx.lineTo(cx + 11, Hh / 2);
    ctx.lineTo(cx, Hh / 2 + 15);
    ctx.lineTo(cx - 11, Hh / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.letterSpacing = '0px';
  const tex = canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 });
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return { texture: tex, aspect };
}

// Where a carved credit once sat, in the top of the balustrade rail of floor 0 on side 4: a box in world
// metres, y the top of the rail. The film carries no credits (10-07): nothing carves it, the shader's
// plaque stays off (uPlaqueK 0; s43 and s44 check it every frame) and the rail is plain.
export const PLAQUE = { x0: 0.37, x1: 1.03, z0: -(LIB.AS + 0.36), z1: -(LIB.AS + 0.06), y: 1.09 };

const LOD_NAMES = ['near', 'mid', 'far'];

export class Library {
  // floors: inclusive range of floor indices that exist; near/mid: LOD radii in floors from the camera
  // height: render height in pixels (for the minimum on-screen size of far lamps)
  constructor({ floors = [-60, 60], near = 2, mid = 10, uniforms = null, height = 1080 } = {}) {
    this.height = height;
    this.uniforms = uniforms || libraryUniforms();
    const ins = inscriptionTexture();
    this.uniforms.uText.value = ins.texture;
    this.uniforms.uTextAspect.value = ins.aspect;
    this.material = createLibraryMaterial(this.uniforms);
    this.lampMaterial = createLampMaterial(this.uniforms);
    this.glowMaterial = createGlowMaterial(this.uniforms);
    this.k0 = floors[0];
    this.k1 = floors[1];
    this.near = near;
    this.mid = mid;
    const count = this.k1 - this.k0 + 1;
    this.group = new THREE.Group();
    this.lampPos = lampPositions();
    const globes = [new THREE.SphereGeometry(LIB.LAMP_R, 32, 20), new THREE.SphereGeometry(LIB.LAMP_R, 14, 10), new THREE.SphereGeometry(LIB.LAMP_R, 8, 6)];
    this.lods = LOD_NAMES.map((d, j) => {
      const floor = new THREE.InstancedMesh(buildFloor(d), this.material, count);
      const lamps = new THREE.InstancedMesh(globes[j], this.lampMaterial, count * this.lampPos.length);
      for (const m of [floor, lamps]) {
        m.frustumCulled = false; // culled per floor in update()
        m.count = 0;
        this.group.add(m);
      }
      return { floor, lamps };
    });
    this.glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), this.glowMaterial, count * this.lampPos.length);
    this.glows.frustumCulled = false;
    this.glows.count = 0;
    this.glows.renderOrder = 10;
    this.group.add(this.glows);
    this.state = this.uniforms.uFloorState.value;
    this._frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._box = new THREE.Box3();
    this._m4 = new THREE.Matrix4();
    this.visible = [];
  }

  // per-floor state: lit (lime books and inscriptions), lamp level, lamp colour amber→lime
  setFloor(k, { lit, lamp, lime } = {}) {
    const i = (k - LIB.FLOOR_BASE) * 4;
    const d = this.state.image.data;
    if (i < 0 || i >= d.length) return;
    if (lit !== undefined) d[i] = lit;
    if (lamp !== undefined) d[i + 1] = lamp;
    if (lime !== undefined) d[i + 2] = lime;
    this.state.needsUpdate = true;
  }

  setAll(fn) {
    for (let k = LIB.FLOOR_BASE; k < LIB.FLOOR_BASE + LIB.FLOOR_COUNT; k++) this.setFloor(k, fn(k));
  }

  // Cull floors against the camera frustum, give each a level of detail, nearest first (early-z).
  update(camera) {
    camera.updateMatrixWorld(true);
    this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pv);
    const R = 24.5;
    const kc = Math.floor(camera.position.y / LIB.H);
    const order = [];
    for (let k = this.k0; k <= this.k1; k++) {
      this._box.min.set(-R, k * LIB.H - LIB.T - 0.2, -R);
      this._box.max.set(R, k * LIB.H + LIB.HC + 0.2, R);
      if (this._frustum.intersectsBox(this._box)) order.push(k);
    }
    order.sort((a, b) => Math.abs(a - kc) - Math.abs(b - kc));
    for (const L of this.lods) L.floor.count = L.lamps.count = 0;
    this.glows.count = 0;
    this.uniforms.uPxAng.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / (camera.zoom * this.height);
    const m4 = this._m4;
    for (const k of order) {
      const d = Math.abs(k - kc);
      const L = this.lods[d <= this.near ? 0 : d <= this.mid ? 1 : 2];
      m4.makeTranslation(0, k * LIB.H, 0);
      L.floor.setMatrixAt(L.floor.count++, m4);
      for (const p of this.lampPos) {
        m4.makeTranslation(p.x, p.y + k * LIB.H, p.z);
        L.lamps.setMatrixAt(L.lamps.count++, m4);
        this.glows.setMatrixAt(this.glows.count++, m4);
      }
    }
    for (const L of this.lods) {
      L.floor.instanceMatrix.needsUpdate = true;
      L.lamps.instanceMatrix.needsUpdate = true;
    }
    this.glows.instanceMatrix.needsUpdate = true;
    this.visible = order;
  }
}
