// The lighthouse in the shaft: a riveted brass tower rising out of the depths, a gallery deck level
// with one floor of the library, and a lantern whose rotating optic is the AIGCNEWS mark — the C ring
// and the bar are glass, the dot a lime jewel, all set in a dark bronze disc. The light leaves the
// lantern as a thin vertical sheet that sweeps the library (the radar line of the logo).
// Lighthouse space: origin at the centre of the deck top, Y up; the group sits at (0, y0, 0).
import * as THREE from 'three';
import { Builder } from './geo.js';
import { radialBox } from './library.js';
import {
  LH, LOGO, BEAM_HULL, lighthouseUniforms,
  createLighthouseMaterial, createGlazingMaterial, createBeamMaterial, createHaloMaterial,
} from './lhshader.js';

export { LH, LOGO };

export const LHM = {
  BRASS: 0, POLISHED: 1, COPPER: 2, IRON: 3, WINDOW: 4, BRONZE: 5, LENS: 6, BAR: 7, LAMP: 8, JEWEL: 9, MIRROR: 10, PLATE: 11,
};
const M = LHM;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const O = V3(0, 0, 0);
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// --------------------------------------------------------------------------------------- helpers

function tri(b, p0, p1, p2, n, mat, aux = 0) {
  const face = new THREE.Vector3().crossVectors(p1.clone().sub(p0), p2.clone().sub(p0));
  const i0 = b.vertex(p0, n, mat, aux);
  const i1 = b.vertex(p1, n, mat, aux);
  const i2 = b.vertex(p2, n, mat, aux);
  if (face.dot(n) >= 0) b.idx.push(i0, i1, i2);
  else b.idx.push(i0, i2, i1);
}
// convex polygon, one normal
function poly(b, pts, n, mat, aux = 0) {
  for (let i = 1; i < pts.length - 1; i++) tri(b, pts[0], pts[i], pts[i + 1], n, mat, aux);
}
// torus about the Y axis
function torus(b, R, y, tube, mat, seg = 128, tseg = 8) {
  const P = (a, t) => V3((R + tube * Math.cos(t)) * Math.cos(a), y + tube * Math.sin(t), (R + tube * Math.cos(t)) * Math.sin(a));
  const N = (a, t) => V3(Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a));
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * TAU;
    const a1 = ((k + 1) / seg) * TAU;
    for (let j = 0; j < tseg; j++) {
      const t0 = (j / tseg) * TAU;
      const t1 = ((j + 1) / tseg) * TAU;
      b.quadN(P(a0, t0), P(a1, t0), P(a1, t1), P(a0, t1), N(a0, t0), N(a1, t0), N(a1, t1), N(a0, t1), mat);
    }
  }
}
// a faceted solid from a THREE geometry (flat normals), placed by a matrix
function facets(b, geo, matrix, mat, aux = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position');
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i).applyMatrix4(matrix);
    c.fromBufferAttribute(p, i + 1).applyMatrix4(matrix);
    d.fromBufferAttribute(p, i + 2).applyMatrix4(matrix);
    const n = new THREE.Vector3().crossVectors(c.clone().sub(a), d.clone().sub(a)).normalize();
    tri(b, a.clone(), c.clone(), d.clone(), n, mat, aux);
  }
}
function archShape(w, h) {
  const s = new THREE.Shape();
  const yc = h / 2 - w;
  s.moveTo(-w, -h / 2);
  s.lineTo(w, -h / 2);
  s.lineTo(w, yc);
  s.absarc(0, yc, w, 0, Math.PI, false);
  s.lineTo(-w, -h / 2);
  return s;
}
function circleShape(r, hole = 0) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  if (hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}
// a flat shape standing on a vertical surface at azimuth a, radius r, height y, facing outward
function onWall(b, shape, a, r, y, mat, aux = 0) {
  const out = V3(Math.cos(a), 0, Math.sin(a));
  const ex = V3(Math.sin(a), 0, -Math.cos(a)); // ex × up = outward
  b.shape(shape, out.clone().multiplyScalar(r).setY(y), ex, V3(0, 1, 0), mat, aux, 32);
}
const bezier = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return [w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0], w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1]];
};

// ----------------------------------------------------------------------------------------- tower

export const towerRadius = (y, depth) => LH.TOWER_R + (LH.TOWER_FOOT - LH.TOWER_R) * Math.min(1, Math.max(0, -y / depth));

function buildTower(b, depth) {
  const r = (y) => towerRadius(y, depth);
  b.lathe(O, [[r(-depth), -depth], [r(-depth / 2), -depth / 2], [r(-0.25), -0.25]], 96, M.BRASS);
  // a moulded brass band at every floor level
  for (let n = 1; n * 7.2 < depth; n++) {
    const y = -n * 7.2;
    const rr = r(y);
    const prof = [];
    for (let i = 0; i <= 8; i++) {
      const t = -Math.PI / 2 + (i / 8) * Math.PI;
      prof.push([rr - 0.01 + 0.08 * Math.cos(t), y + 0.16 * Math.sin(t)]);
    }
    b.lathe(O, prof, 96, M.POLISHED);
  }
  // arched windows climbing the tower in a slow spiral
  const frame = archShape(0.36, 0.95);
  frame.holes.push(archShape(0.26, 0.82));
  const glass = archShape(0.27, 0.83);
  for (let n = 0; 2.6 + 3.6 * n + 0.6 < depth; n++) {
    const y = -2.6 - 3.6 * n;
    const a = (77 * n + 20) * DEG;
    onWall(b, frame, a, r(y) + 0.026, y, M.POLISHED);
    onWall(b, glass, a, r(y) + 0.012, y, M.WINDOW, n);
  }
  // corbels under the deck, a ring band below them
  for (let i = 0; i < 24; i++) {
    const a = (i + 0.5) * 15 * DEG;
    radialBox(b, a, 2.55, 3.4, -0.47, 0.22, 0.24, M.BRASS, ['+x', '-y', '+z', '-z']);
    radialBox(b, a, 2.55, 3.15, -0.77, 0.3, 0.22, M.BRASS, ['+x', '-y', '+z', '-z']);
    radialBox(b, a, 2.55, 2.9, -1.22, 0.45, 0.2, M.BRASS, ['+x', '-y', '+z', '-z']);
  }
  b.latheFaces(O, [[2.56, -1.32], [2.7, -1.32], [2.7, -1.2], [2.56, -1.2], [2.56, -1.32]], 96, M.POLISHED);
  // the deck: underside and edge in brass
  b.latheFaces(O, [[2.55, -0.25], [3.35, -0.25], [3.45, -0.18], [3.47, -0.06], [3.45, 0]], 128, M.BRASS);
}

// ----------------------------------------------------------------------------------- the lantern

function buildLantern(b) {
  // deck plate
  b.latheFaces(O, [[3.45, 0], [2.25, 0]], 128, M.PLATE);
  // railing: posts, two iron rails, a brass handrail
  for (let i = 0; i < 30; i++) {
    const a = i * 12 * DEG;
    b.lathe(V3(LH.RAIL_R * Math.cos(a), 0, LH.RAIL_R * Math.sin(a)),
      [[0.022, 0], [0.03, 0.02], [0.018, 0.05], [0.016, 1.0], [0.001, 1.0]], 6, M.IRON);
  }
  torus(b, LH.RAIL_R, 0.12, 0.012, M.IRON, 160, 6);
  torus(b, LH.RAIL_R, 0.55, 0.012, M.IRON, 160, 6);
  torus(b, LH.RAIL_R, 1.04, 0.032, M.POLISHED, 160, 8);
  // pedestal wall with portholes (glass and rim numbered 1000 + i and 1100 + i: see uLHPortsAway)
  b.latheFaces(O, [[2.25, 0], [2.25, 0.78], [2.3, 0.82], [2.3, 0.9], [2.16, 0.9], [2.16, 0]], 128, M.BRASS);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * 45 * DEG;
    onWall(b, circleShape(0.13), a, 2.262, 0.45, M.WINDOW, 1000 + i);
    onWall(b, circleShape(0.17, 0.13), a, 2.268, 0.45, M.POLISHED, 1100 + i);
  }
  // sill and head astragals, and the helical astragals between them
  b.latheFaces(O, [[2.17, 0.88], [2.27, 0.88], [2.27, 0.96], [2.17, 0.96], [2.17, 0.88]], 128, M.POLISHED);
  b.latheFaces(O, [[2.17, 4.24], [2.27, 4.24], [2.27, 4.32], [2.17, 4.32], [2.17, 4.24]], 128, M.POLISHED);
  const Y0 = 0.96;
  const Y1 = 4.24;
  for (let fam = 0; fam < 2; fam++) {
    for (let i = 0; i < 14; i++) {
      const phi0 = (i * TAU) / 14 + (fam ? Math.PI / 14 : 0);
      const tw = (fam ? -60 : 60) * DEG;
      const at = (t) => {
        const a = phi0 + tw * t;
        return V3(2.215 * Math.cos(a), Y0 + (Y1 - Y0) * t, 2.215 * Math.sin(a));
      };
      for (let s = 0; s < 10; s++) {
        const pa = at(s / 10);
        const pb = at((s + 1) / 10);
        const am = phi0 + tw * ((s + 0.5) / 10);
        b.orientedBox(pa, pb, 0.045, 0.07, V3(Math.cos(am), 0, Math.sin(am)), M.POLISHED);
      }
    }
  }
  // roof: cornice, ogee dome, ribs, ventilator ball, finial
  b.latheFaces(O, [[2.17, 4.32], [2.5, 4.32], [2.58, 4.38], [2.58, 4.5], [2.5, 4.58], [2.4, 4.6]], 128, M.BRASS);
  const P0 = [2.42, 4.6];
  const P1 = [2.5, 5.6];
  const P2 = [0.3, 5.5];
  const P3 = [0.35, 6.35];
  const curve = [];
  for (let i = 0; i <= 23; i++) curve.push(bezier(P0, P1, P2, P3, i / 23));
  b.lathe(O, [...curve, [0.24, 6.42], [0.2, 6.5], [0.2, 6.62]], 128, M.COPPER);
  for (let k = 0; k < 16; k++) {
    const phi = (k / 16) * TAU;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    for (let j = 0; j < curve.length - 1; j++) {
      const [r0, y0] = curve[j];
      const [r1, y1] = curve[j + 1];
      const l = Math.hypot(r1 - r0, y1 - y0);
      const nr = (y1 - y0) / l;
      const ny = -(r1 - r0) / l;
      const pa = V3((r0 + 0.02 * nr) * c, y0 + 0.02 * ny, (r0 + 0.02 * nr) * s);
      const pb = V3((r1 + 0.02 * nr) * c, y1 + 0.02 * ny, (r1 + 0.02 * nr) * s);
      b.orientedBox(pa, pb, 0.06, 0.05, V3(nr * c, ny, nr * s), M.POLISHED);
    }
  }
  const ball = [];
  for (let i = 0; i <= 16; i++) {
    const t = -Math.PI / 2 + (i / 16) * Math.PI;
    ball.push([Math.max(0.001, 0.42 * Math.cos(t)), 6.95 + 0.42 * Math.sin(t)]);
  }
  b.lathe(O, ball, 48, M.COPPER);
  b.lathe(O, [[0.08, 7.35], [0.05, 7.5], [0.035, 7.9], [0.06, 7.95], [0.06, 8.0], [0.03, 8.05], [0.012, 8.4], [0.001, 8.42]], 16, M.POLISHED);
  // inside: chequer-plate floor, the lamp pedestal, the lamp, the fixed roller track
  b.latheFaces(O, [[2.16, 0.002], [0.001, 0.002]], 96, M.PLATE);
  b.latheFaces(O, [[0.55, 0], [0.55, 0.3], [0.45, 0.4], [0.16, 0.45], [0.12, 0.55]], 48, M.POLISHED);
  b.lathe(O, [[0.12, 0.55], [0.12, 2.15], [0.18, 2.25], [0.2, 2.32], [0.001, 2.32]], 32, M.POLISHED);
  const bulb = [];
  for (let i = 0; i <= 16; i++) {
    const t = -Math.PI / 2 + (i / 16) * Math.PI;
    bulb.push([Math.max(0.001, LH.LAMP_R * Math.cos(t)), LH.LAMP_Y + LH.LAMP_R * Math.sin(t)]);
  }
  b.lathe(O, bulb, 48, M.LAMP);
  b.latheFaces(O, [[1.3, 0.75], [1.5, 0.75], [1.5, 0.88], [1.3, 0.88], [1.3, 0.75]], 96, M.IRON);
}

// ------------------------------------------------------------------------------ the lens (logo)

// Panel space: u right, v up (logo coordinates, metres, centred on the lamp axis), h out of the
// lens toward whoever it faces. The default map puts the panel in carriage space, facing +x.
export const CARRIAGE_MAP = {
  P: (u, v, h) => V3(LH.PANEL_X + h, LH.LAMP_Y + v, -u),
  N: (nu, nv, nh) => V3(nh, nv, -nu),
};

export function buildLensPanel(b, map = CARRIAGE_MAP) {
  const mapP = (rho, phi, h) => map.P(rho * Math.cos(phi), rho * Math.sin(phi), h);
  const mapN = (nr, phi, nh) => map.N(nr * Math.cos(phi), nr * Math.sin(phi), nh).normalize();
  const { R0, R1 } = LOGO;
  // the C ring: five Fresnel prisms, cross-section walked counter-clockwise in (rho, h)
  const w = (R1 - R0) / 5;
  const thick = (i) => 0.05 + 0.025 * i;
  const THIN = 0.012;
  const prof = [[R0, 0], [R1, 0], [R1, THIN]];
  for (let i = 4; i >= 0; i--) {
    prof.push([R0 + i * w, thick(i)]);
    if (i > 0) prof.push([R0 + i * w, THIN]);
  }
  prof.push([R0, 0]);
  const A0 = 90 * DEG;
  const A1 = 360 * DEG;
  b.arcSweep(prof, A0, A1, 144, mapP, mapN, M.LENS);
  for (const [phi, sgn] of [[A0, -1], [A1, 1]]) {
    const n = map.N(-Math.sin(phi) * sgn, Math.cos(phi) * sgn, 0).normalize();
    for (let i = 0; i < 5; i++) {
      const a = R0 + i * w;
      poly(b, [mapP(a, phi, 0), mapP(a + w, phi, 0), mapP(a + w, phi, THIN), mapP(a, phi, thick(i))], n, M.LENS);
    }
  }
  // bronze: the boss inside the ring, the plate across the gap; a polished rim around it all
  b.arcSweep([[0.001, 0], [R0 - 0.004, 0], [R0 - 0.004, 0.035], [0.001, 0.05]], 0, TAU, 96, mapP, mapN, M.BRONZE);
  b.arcSweep([[R0, 0], [R1, 0], [R1, 0.01], [R0, 0.01], [R0, 0]], 0, A0, 36, mapP, mapN, M.BRONZE);
  b.arcSweep([[R1, -0.02], [R1 + 0.06, -0.02], [R1 + 0.06, 0.07], [R1, 0.07], [R1, -0.02]], 0, TAU, 192, mapP, mapN, M.POLISHED);
  // the bar: a glass prism along 45°
  const ax = [Math.SQRT1_2, Math.SQRT1_2];
  const ac = [-Math.SQRT1_2, Math.SQRT1_2];
  const hw = LOGO.BAR_W / 2;
  const sec = [[-hw, 0.03], [hw, 0.03], [hw, 0.075], [0, 0.12], [-hw, 0.075]];
  const at = (s, x, h) => map.P(s * ax[0] + x * ac[0], s * ax[1] + x * ac[1], h);
  const nrm = (nx, nh) => map.N(nx * ac[0], nx * ac[1], nh).normalize();
  for (let j = 0; j < sec.length; j++) {
    const [x0, h0] = sec[j];
    const [x1, h1] = sec[(j + 1) % sec.length];
    const l = Math.hypot(x1 - x0, h1 - h0);
    const n = nrm((h1 - h0) / l, -(x1 - x0) / l);
    b.quadN(at(LOGO.BAR_A, x0, h0), at(LOGO.BAR_A, x1, h1), at(LOGO.BAR_B, x1, h1), at(LOGO.BAR_B, x0, h0), n, n, n, n, M.BAR);
  }
  for (const [s, sgn] of [[LOGO.BAR_A, -1], [LOGO.BAR_B, 1]]) {
    const n = map.N(ax[0] * sgn, ax[1] * sgn, 0).normalize();
    poly(b, sec.map(([x, h]) => at(s, x, h)), n, M.BAR);
  }
  // the dot: a faceted jewel beyond the rim, on a short bronze rod
  const dc = map.P(LOGO.DOT_RHO * ax[0], LOGO.DOT_RHO * ax[1], 0.1);
  const ex = map.N(1, 0, 0).normalize();
  const ey = map.N(0, 1, 0).normalize();
  const ez = map.N(0, 0, 1).normalize();
  const m = new THREE.Matrix4().makeBasis(ex, ey, ez).scale(V3(LOGO.DOT_R, LOGO.DOT_R, LOGO.DOT_R)).setPosition(dc);
  facets(b, new THREE.IcosahedronGeometry(1, 1), m, M.JEWEL);
  b.orientedBox(at(R1 + 0.03, 0, 0.0), at(LOGO.DOT_RHO, 0, 0.06), 0.035, 0.035, ez, M.BRONZE);
}

// --------------------------------------------------------------------------------- the carriage

function buildCarriage(b) {
  // turntable ring with its rack of teeth
  b.latheFaces(O, [[1.25, 0.9], [1.45, 0.9], [1.45, 1.1], [1.25, 1.1], [1.25, 0.9]], 96, M.POLISHED);
  for (let i = 0; i < 72; i++) radialBox(b, (i * 5 + 2.5) * DEG, 1.45, 1.5, 0.92, 0.16, 0.04, M.POLISHED, ['+x', '+y', '-y', '+z', '-z']);
  // two posts carry the lens
  const zp = 1.12;
  const yTop = LH.LAMP_Y - Math.sqrt((LOGO.R1 + 0.04) ** 2 - zp * zp) + 0.03;
  for (const sz of [-1, 1]) b.orientedBox(V3(0.66, 1.1, sz * zp), V3(0.66, yTop, sz * zp), 0.06, 0.06, V3(1, 0, 0), M.POLISHED);
  buildLensPanel(b);
  // the reflector behind the lamp: a spherical cap, mirror inside, bronze outside
  const cap = (R, inner) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const al = (i / 14) * 55 * DEG;
      pts.push([Math.max(0.001, R * Math.sin(al)), R * Math.cos(al)]);
    }
    return inner ? pts : pts.reverse();
  };
  const toBack = new THREE.Matrix4().makeBasis(V3(0, 1, 0), V3(-1, 0, 0), V3(0, 0, 1)).setPosition(0, LH.LAMP_Y, 0);
  b.setTransform(toBack);
  b.lathe(O, cap(0.9, true), 64, M.MIRROR);
  b.lathe(O, cap(0.925, false), 64, M.BRONZE);
  b.setTransform(null);
  // a strap over the lamp from the lens to the reflector, a strut from the reflector to the ring
  const strap = (t) => {
    const u = 1 - t;
    const p0 = V3(0.72, LH.LAMP_Y + LOGO.R1 + 0.05, 0);
    const p1 = V3(0.1, LH.LAMP_Y + 1.62, 0);
    const p2 = V3(-0.56, LH.LAMP_Y + 0.76, 0);
    return p0.multiplyScalar(u * u).add(p1.multiplyScalar(2 * u * t)).add(p2.multiplyScalar(t * t));
  };
  for (let i = 0; i < 12; i++) {
    const pa = strap(i / 12);
    const pb = strap((i + 1) / 12);
    const mid = strap((i + 0.5) / 12).sub(V3(0, LH.LAMP_Y, 0)).normalize();
    b.orientedBox(pa, pb, 0.09, 0.025, mid, M.POLISHED);
  }
  b.orientedBox(V3(-0.58, LH.LAMP_Y - 0.72, 0), V3(-1.33, 1.1, 0), 0.07, 0.05, V3(-1, 0, 0), M.POLISHED);
}

// ------------------------------------------------------------------------------------ the class

const LAMP_COL = new THREE.Color(0.86, 1.0, 0.62);
const K = {
  LAMP: 26, // lantern lamp → light on the lighthouse
  CORE: 40, // radiance of the bulb
  FILL: 8, // lantern → library
  SURF: 6, // the sheet on library surfaces
  VOL: 0.12, // the sheet in the haze
  HALO: 0.35,
  FLASH: 4,
};

export class Lighthouse {
  constructor({ uniforms, y0 = 0, depth = 360 } = {}) {
    this.y0 = y0;
    this.depth = depth;
    this.lib = uniforms;
    this.own = lighthouseUniforms();
    this.uniforms = { ...uniforms, ...this.own };
    this.group = new THREE.Group();
    this.group.position.set(0, y0, 0);
    this.group.updateMatrixWorld(true);
    this.own.uLHO.value.set(0, y0, 0);
    this.own.uLHLampPos.value.set(0, y0 + LH.LAMP_Y, 0);

    const front = createLighthouseMaterial(this.uniforms);
    const both = createLighthouseMaterial(this.uniforms, { side: THREE.DoubleSide });
    const mesh = (build, mat, parent) => {
      const b = new Builder();
      build(b);
      const m = new THREE.Mesh(b.geometry(), mat);
      parent.add(m);
      return m;
    };
    this.tower = mesh((b) => buildTower(b, depth), front, this.group);
    this.lantern = mesh(buildLantern, both, this.group);
    this.carriage = new THREE.Group();
    this.group.add(this.carriage);
    this.optic = mesh(buildCarriage, both, this.carriage);

    const glassGeo = new THREE.CylinderGeometry(LH.GLASS_R, LH.GLASS_R, 3.4, 160, 1, true);
    glassGeo.translate(0, 0.9 + 1.7, 0);
    this.glass = new THREE.Mesh(glassGeo, createGlazingMaterial(this.uniforms));
    this.glass.renderOrder = 11;
    this.group.add(this.glass);

    this.beamFront = createBeamMaterial(this.uniforms);
    this.beamInside = createBeamMaterial(this.beamFront.uniforms, { inside: true });
    this.beamGeo = new THREE.BoxGeometry(1, 1, 1);
    this.beamBox = this.beamGeo.getAttribute('position').array.slice();
    this.beam = new THREE.Mesh(this.beamGeo, this.beamFront);
    this.beam.renderOrder = 12;
    this.beam.frustumCulled = false;
    this.carriage.add(this.beam);
    this.hull = { up: -1, dn: -1 };

    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), createHaloMaterial(this.uniforms));
    this.halo.renderOrder = 13;
    this.halo.frustumCulled = false;
    this.group.add(this.halo);

    this.state = { angle: 0, lamp: 0, glow: 0, beam: 0, vol: null, trail: 0, trailLen: 0.9, trailArc: 1e3, dot: 0, windows: 0, portsAway: [0, 0], etch: [0, 0, 0.03], ping: [0, 0.05, 0, 0], fanUp: 0.66, fanDn: 0.75, halo: 1, bounce: 0 };
    this.set({});
  }

  // the sheet's hull follows the fan
  _hull(up, dn) {
    if (up === this.hull.up && dn === this.hull.dn) return;
    this.hull = { up, dn };
    const { X0, X1, W0, WK } = BEAM_HULL;
    const pos = this.beamGeo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const bx = this.beamBox[i * 3];
      const by = this.beamBox[i * 3 + 1];
      const bz = this.beamBox[i * 3 + 2];
      const x = bx < 0 ? X0 : X1;
      const y = LH.LAMP_Y + (by < 0 ? -dn * x : up * x);
      const z = Math.sign(bz) * 0.5 * (W0 + WK * x);
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    this.beamGeo.computeBoundingSphere();
  }

  set(p) {
    const s = Object.assign(this.state, p);
    const U = this.uniforms;
    const th = s.angle;
    this.carriage.rotation.y = -th;
    this.carriage.updateMatrixWorld(true);
    U.uBeamAng.value = th;
    U.uBeamO.value.set(0, this.y0 + LH.LAMP_Y, 0);
    U.uLHPanelN.value.set(Math.cos(th), 0, Math.sin(th));
    U.uBeamI.value = s.beam * K.SURF;
    U.uTrailI.value = s.trail;
    U.uTrail.value = s.trailLen;
    U.uTrailArc.value = s.trailArc;
    U.uFanUp.value = s.fanUp;
    U.uFanDn.value = s.fanDn;
    U.uLHFill.value.copy(LAMP_COL).multiplyScalar(s.lamp * K.FILL);
    U.uLHLamp.value.copy(LAMP_COL).multiplyScalar(s.lamp * K.LAMP);
    U.uLHCore.value.copy(LAMP_COL).multiplyScalar(s.lamp * K.CORE);
    U.uLHGlow.value = s.glow;
    U.uLHDot.value = s.dot;
    U.uLHWin.value = s.windows;
    U.uLHBounce.value = s.bounce;
    U.uLHPortsAway.value.fromArray(s.portsAway);
    U.uLHEtch.value.fromArray(s.etch);
    U.uLHPing.value.fromArray(s.ping);
    this.beamFront.uniforms.uVolI.value = s.vol ?? s.beam * K.VOL;
    this.beam.visible = this.beamFront.uniforms.uVolI.value > 0;
    this._hull(s.fanUp, s.fanDn);
    return this;
  }

  // camera-dependent state: the lens flash, whether the camera stands inside the sheet
  update(camera) {
    const s = this.state;
    const c = camera.position;
    const th = s.angle;
    const dx = c.x;
    const dz = c.z;
    const lx = Math.cos(th) * dx + Math.sin(th) * dz;
    const lz = -Math.sin(th) * dx + Math.cos(th) * dz;
    const ly = c.y - this.y0 - LH.LAMP_Y;
    const { X0, X1, W0, WK } = BEAM_HULL;
    const m = 0.05;
    const inside = lx > X0 - m && lx < X1 + m && Math.abs(lz) < 0.5 * (W0 + WK * lx) + m
      && ly < s.fanUp * lx + m && ly > -s.fanDn * lx - m;
    this.beam.material = inside ? this.beamInside : this.beamFront;
    // the flash: the sheet crossing the camera's bearing, if the camera is within the fan
    let da = Math.atan2(c.z, c.x) - th;
    da = ((da % TAU) + TAU * 1.5) % TAU - Math.PI;
    const r = Math.max(Math.hypot(c.x, c.z), 0.5);
    const e = ly / r;
    const inFan = e > -s.fanDn - 0.05 && e < s.fanUp + 0.05 ? 1 : 0;
    const flash = Math.exp(-((da / 0.035) ** 2)) * inFan * s.glow;
    this.halo.material.uniforms.uHaloCol.value.copy(LAMP_COL).multiplyScalar(s.halo * (s.lamp * K.HALO + flash * K.FLASH));
    this.halo.visible = s.halo * (s.lamp + flash) > 0;
    this.flash = flash;
  }

  // lettering to etch in the bar of the lens: a texture whose x runs along the bar from its inner end
  // (LOGO.BAR_A) to its outer end (BAR_B) and whose y runs across it (BAR_W), coverage in red. With
  // the state's etch light up it shows as the ping crosses it and stays lit within etch[1] of the lens
  // centre (see uLHEtch, uLHPing)
  engrave(texture) {
    this.uniforms.uLHEtchMap.value = texture;
    return this;
  }

  // world frame of the lens: centre, normal (out of the lens), right and up as the logo reads
  lensFrame() {
    const th = this.state.angle;
    const n = V3(Math.cos(th), 0, Math.sin(th));
    return {
      center: V3(0, this.y0 + LH.LAMP_Y, 0).addScaledVector(n, LH.PANEL_X + 0.1),
      normal: n,
      right: V3(Math.sin(th), 0, -Math.cos(th)),
      up: V3(0, 1, 0),
    };
  }
}
