// Geometry builders for the library. Everything is generated: hexagon rings, extruded mouldings,
// lathed balusters, boxes. Vertices carry a material id (`mat`) that the library shader switches on.
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const COS30 = Math.cos(30 * DEG);
export const TAN30 = Math.tan(30 * DEG);

// Hexagon convention (xz-plane, angle from +x toward +z): vertices at i*60°, side i runs from
// vertex i to vertex i+1 and is centred at 30° + i*60°. Side 1 faces +z, side 4 faces -z.
export const sideAngle = (i) => (30 + 60 * i) * DEG;
export const sideNormal = (i) => new THREE.Vector3(Math.cos(sideAngle(i)), 0, Math.sin(sideAngle(i)));
export const sideTangent = (i) => new THREE.Vector3(-Math.sin(sideAngle(i)), 0, Math.cos(sideAngle(i)));
export const hexVertex = (apothem, i) => {
  const R = apothem / COS30;
  return new THREE.Vector3(R * Math.cos(i * 60 * DEG), 0, R * Math.sin(i * 60 * DEG));
};
// point on side i at apothem a, offset s along the side tangent, height y
export const sidePoint = (i, a, s, y = 0) =>
  sideNormal(i).multiplyScalar(a).add(sideTangent(i).multiplyScalar(s)).setY(y);

export const MAT = {
  STONE: 0,
  FLOOR: 1,
  WOOD: 2,
  BOOKS: 3,
  CEILING: 4,
  PLASTER: 5,
  BRASS: 6,
  FASCIA: 7, // inscription band on the slab edge (carved text, glows when the floor is lit)
  DARK: 8,
  IRON: 9,
  GLASS: 10,
};

export class Builder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.mat = [];
    this.aux = [];
    this.idx = [];
    this.matrix = null;
    this.nmatrix = null;
    this._v = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  get count() {
    return this.pos.length / 3;
  }

  setTransform(m) {
    this.matrix = m;
    this.nmatrix = m ? new THREE.Matrix3().getNormalMatrix(m) : null;
    return this;
  }

  vertex(p, n, mat, aux = 0) {
    const v = this._v.copy(p);
    const nn = this._n.copy(n);
    if (this.matrix) {
      v.applyMatrix4(this.matrix);
      nn.applyMatrix3(this.nmatrix).normalize();
    }
    this.pos.push(v.x, v.y, v.z);
    this.nrm.push(nn.x, nn.y, nn.z);
    this.mat.push(mat);
    this.aux.push(aux);
    return this.count - 1;
  }

  // planar quad, corners counter-clockwise when seen from the side the normal points to
  quad(a, b, c, d, mat, aux = 0, n = null) {
    if (!n) {
      const e1 = new THREE.Vector3().subVectors(b, a);
      const e2 = new THREE.Vector3().subVectors(d, a);
      n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    }
    const i0 = this.vertex(a, n, mat, aux);
    const i1 = this.vertex(b, n, mat, aux);
    const i2 = this.vertex(c, n, mat, aux);
    const i3 = this.vertex(d, n, mat, aux);
    this.idx.push(i0, i1, i2, i0, i2, i3);
  }

  // axis-aligned box in local space centred at c with size s, then the current transform
  box(c, s, mat, aux = 0, faces = 'all') {
    const hx = s.x / 2;
    const hy = s.y / 2;
    const hz = s.z / 2;
    const P = (x, y, z) => new THREE.Vector3(c.x + x * hx, c.y + y * hy, c.z + z * hz);
    const want = (f) => faces === 'all' || faces.includes(f);
    if (want('+x')) this.quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), mat, aux);
    if (want('-x')) this.quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), mat, aux);
    if (want('+y')) this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1), mat, aux);
    if (want('-y')) this.quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), mat, aux);
    if (want('+z')) this.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), mat, aux);
    if (want('-z')) this.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), mat, aux);
  }

  // Box oriented on hexagon side i: centre at apothem a, offset s along the side, base height y0.
  // size: [along side, height, depth along the side normal]
  sideBox(i, a, s, y0, size, mat, aux = 0, faces = 'all') {
    const n = sideNormal(i);
    const t = sideTangent(i);
    // (-t, up, n) is right-handed, so face winding survives the transform
    const m = new THREE.Matrix4().makeBasis(t.clone().negate(), new THREE.Vector3(0, 1, 0), n);
    m.setPosition(n.clone().multiplyScalar(a).add(t.clone().multiplyScalar(s)).setY(y0 + size[1] / 2));
    const prev = this.matrix;
    this.setTransform(prev ? prev.clone().multiply(m) : m);
    this.box(new THREE.Vector3(), new THREE.Vector3(size[0], size[1], size[2]), mat, aux, faces);
    this.setTransform(prev);
  }

  // Extrude a profile around a closed hexagon. profile: [[d, y], ...] where d is the offset from the
  // base apothem toward the outside (+) or the axis (-). Faces are flat-shaded per side. Walk a solid's
  // cross-section counter-clockwise in the (d right, y up) plane and every face points out of it;
  // `flip` reverses the facing of an open profile.
  hexExtrude(apothem, profile, mat, { sides = [0, 1, 2, 3, 4, 5], aux = 0, flip = false } = {}) {
    for (const i of sides) {
      for (let j = 0; j < profile.length - 1; j++) {
        const [d0, y0] = profile[j];
        const [d1, y1] = profile[j + 1];
        const a0 = apothem + d0;
        const a1 = apothem + d1;
        const p00 = hexVertex(a0, i).setY(y0);
        const p01 = hexVertex(a0, i + 1).setY(y0);
        const p10 = hexVertex(a1, i).setY(y1);
        const p11 = hexVertex(a1, i + 1).setY(y1);
        // profile normal in (radial, y): perpendicular to the segment
        const dr = d1 - d0;
        const dy = y1 - y0;
        let nr = dy;
        let ny = -dr;
        const len = Math.hypot(nr, ny) || 1;
        nr /= len;
        ny /= len;
        if (flip) {
          nr = -nr;
          ny = -ny;
        }
        const n = sideNormal(i).multiplyScalar(nr).setY(ny).normalize();
        if (!flip) this.quad(p00, p10, p11, p01, mat, aux, n);
        else this.quad(p00, p01, p11, p10, mat, aux, n);
      }
    }
  }

  // flat hexagonal ring (annulus between two hexagons) at height y, facing up or down
  hexRing(aIn, aOut, y, mat, up = true, aux = 0) {
    const n = new THREE.Vector3(0, up ? 1 : -1, 0);
    for (let i = 0; i < 6; i++) {
      const a = hexVertex(aIn, i).setY(y);
      const b = hexVertex(aIn, i + 1).setY(y);
      const c = hexVertex(aOut, i + 1).setY(y);
      const d = hexVertex(aOut, i).setY(y);
      if (up) this.quad(a, b, c, d, mat, aux, n);
      else this.quad(a, d, c, b, mat, aux, n);
    }
  }

  // lathe around the local Y axis; profile [[r, y], ...] bottom to top
  lathe(center, profile, segments, mat, aux = 0, { phase = 0 } = {}) {
    const rings = [];
    for (let j = 0; j < profile.length; j++) {
      const ring = [];
      const [r, y] = profile[j];
      // smooth normal from neighbours
      const [rp, yp] = profile[Math.max(0, j - 1)];
      const [rn, yn] = profile[Math.min(profile.length - 1, j + 1)];
      let tr = rn - rp;
      let ty = yn - yp;
      const tl = Math.hypot(tr, ty) || 1;
      tr /= tl;
      ty /= tl;
      const nr = ty;
      const ny = -tr;
      for (let k = 0; k <= segments; k++) {
        const a = phase + (k / segments) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const p = new THREE.Vector3(center.x + r * ca, center.y + y, center.z + r * sa);
        const n = new THREE.Vector3(nr * ca, ny, nr * sa).normalize();
        ring.push(this.vertex(p, n, mat, aux));
      }
      rings.push(ring);
    }
    for (let j = 0; j < rings.length - 1; j++) {
      for (let k = 0; k < segments; k++) {
        const a = rings[j][k];
        const b = rings[j][k + 1];
        const c = rings[j + 1][k + 1];
        const d = rings[j + 1][k];
        this.idx.push(a, d, c, a, c, b);
      }
    }
  }

  // planar shape (THREE.Shape, may have holes) placed by a basis: origin o, x axis ex, y axis ey
  shape(shape, o, ex, ey, mat, aux = 0, curveSegments = 24) {
    const g = new THREE.ShapeGeometry(shape, curveSegments);
    const p = g.getAttribute('position');
    const n = new THREE.Vector3().crossVectors(ex, ey).normalize();
    const base = this.count;
    for (let k = 0; k < p.count; k++) {
      const v = o.clone().addScaledVector(ex, p.getX(k)).addScaledVector(ey, p.getY(k));
      this.vertex(v, n, mat, aux);
    }
    const idx = g.getIndex();
    for (let k = 0; k < idx.count; k += 3) this.idx.push(base + idx.getX(k), base + idx.getX(k + 1), base + idx.getX(k + 2));
    g.dispose();
  }

  // Quad with per-corner normals; the winding is chosen to face the normals, so callers never have
  // to reason about corner order. Corners go around the quad (either direction).
  quadN(a, b, c, d, na, nb, nc, nd, mat, aux = 0) {
    const face = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(c, a), new THREE.Vector3().subVectors(d, b));
    const want = new THREE.Vector3().add(na).add(nb).add(nc).add(nd);
    const i0 = this.vertex(a, na, mat, aux);
    const i1 = this.vertex(b, nb, mat, aux);
    const i2 = this.vertex(c, nc, mat, aux);
    const i3 = this.vertex(d, nd, mat, aux);
    if (face.dot(want) >= 0) this.idx.push(i0, i1, i2, i0, i2, i3);
    else this.idx.push(i0, i2, i1, i0, i3, i2);
  }

  // Lathe with a crease at every profile point (flat in the profile direction, smooth around).
  latheFaces(center, profile, segments, mat, aux = 0, opts = {}) {
    for (let j = 0; j < profile.length - 1; j++) this.lathe(center, [profile[j], profile[j + 1]], segments, mat, aux, opts);
  }

  // Box whose long axis runs from a to b; its depth axis is `outward` made perpendicular to that.
  orientedBox(a, b, width, depth, outward, mat, aux = 0, faces = 'all') {
    const ax = new THREE.Vector3().subVectors(b, a);
    const len = ax.length();
    ax.divideScalar(len);
    const dz = outward.clone().addScaledVector(ax, -outward.dot(ax)).normalize();
    const dx = new THREE.Vector3().crossVectors(ax, dz); // (dx, ax, dz) is right-handed
    const m = new THREE.Matrix4().makeBasis(dx, ax, dz).setPosition(a.clone().add(b).multiplyScalar(0.5));
    const prev = this.matrix;
    this.setTransform(prev ? prev.clone().multiply(m) : m);
    this.box(new THREE.Vector3(), new THREE.Vector3(width, len, depth), mat, aux, faces);
    this.setTransform(prev);
  }

  // Sweep a cross-section [[rho, h], ...] about an axis between angles phi0 and phi1.
  // map(rho, phi, h) → Vector3 and mapN(nRho, phi, nH) → Vector3 place it in space; walk a solid's
  // cross-section counter-clockwise in (rho right, h up) for outward faces. smooth: average the
  // normals at profile points (curved sections) instead of creasing them.
  arcSweep(profile, phi0, phi1, segs, map, mapN, mat, aux = 0, { smooth = false } = {}) {
    const segN = [];
    for (let j = 0; j < profile.length - 1; j++) {
      const tr = profile[j + 1][0] - profile[j][0];
      const th = profile[j + 1][1] - profile[j][1];
      const l = Math.hypot(tr, th) || 1;
      segN.push([th / l, -tr / l]);
    }
    // averaged normal at profile point j
    const nAt = (j) => {
      const a = segN[Math.max(0, j - 1)];
      const b = segN[Math.min(segN.length - 1, j)];
      const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
      return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
    };
    for (let j = 0; j < profile.length - 1; j++) {
      const [r0, h0] = profile[j];
      const [r1, h1] = profile[j + 1];
      const n0 = smooth ? nAt(j) : segN[j];
      const n1 = smooth ? nAt(j + 1) : segN[j];
      for (let k = 0; k < segs; k++) {
        const pa = phi0 + ((phi1 - phi0) * k) / segs;
        const pb = phi0 + ((phi1 - phi0) * (k + 1)) / segs;
        this.quadN(
          map(r0, pa, h0), map(r1, pa, h1), map(r1, pb, h1), map(r0, pb, h0),
          mapN(n0[0], pa, n0[1]), mapN(n1[0], pa, n1[1]), mapN(n1[0], pb, n1[1]), mapN(n0[0], pb, n0[1]),
          mat, aux,
        );
      }
    }
  }

  append(other) {
    const base = this.count;
    this.pos.push(...other.pos);
    this.nrm.push(...other.nrm);
    this.mat.push(...other.mat);
    this.aux.push(...other.aux);
    for (const i of other.idx) this.idx.push(i + base);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('mat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.setAttribute('aux', new THREE.Float32BufferAttribute(this.aux, 1));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}
