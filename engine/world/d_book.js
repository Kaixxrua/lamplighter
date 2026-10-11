// Agent D2 · the book already written, open (s40, s41). bookshelf.js draws volumes shut; this draws one that opens:
// two halves (a cloth board and its half of the page block) turning about the gutter, the spine under it, the pages
// paper and ink (an old printing: a running head with its name, rows of type), the page edges dusty at the head.
// It is lit as the library lights everything (the floor's lamps, fog) plus the shot's own lights (d_bay.js's
// WallMaterial: share its uniforms and one light() call reaches both).
//
// Its frame (OpenBook.group): the origin on the gutter at the middle of the height, x across the spread (+x the
// right-hand page), y up out of the pages, z along the height, the head at −z and the tail at +z. open = 0: shut,
// standing on its spine (the pages up, the fore-edge at y = d); open = 1: lying open, the pages at y ≈ 0.
// bookshelf.js's frame for the same volume (x across, y from the tail up, z out of the spine) is
// toShelf: x_B = −x, y_B = h/2 − z, z_B = −y − sag (sag: the spine's round), a proper rotation: a shot that hands
// a shut volume over from its BookShelf to this puts the group at the volume's matrix × OpenBook.fromShelf.
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';
import { loadFonts, font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';
import { rng } from '../runtime/lib/rng.js';
import { DLIGHT_GLSL } from './d_bay.js';

export const CB = 0.0028; // a board's thickness
export const SQ = 0.003; // squares: how far the boards stand beyond the page block

// ------------------------------------------------------------------------------------ the printing
// Two pages side by side (left | right), 1024 × 1654 each: ink (red channel), head at the top. The type is greeked
// (rows of word shapes in the rhythm of set code, no letters), only the running head is lettered: the book's name on
// the left page, a folio on the right.
export async function paperTexture({ name = '', folio = 0, seed = 7 } = {}) {
  await loadFonts();
  const PW = 1024;
  const PH = 1654;
  const cv = makeCanvas(PW * 2, PH);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff';
  const r = rng(seed);
  const top = 0.1 * PH;
  const bottom = 0.89 * PH;
  const lead = 30; // px between rows
  const em = 17; // px: the type's x-height band
  for (let page = 0; page < 2; page++) {
    const x0 = page === 0 ? 0.13 * PW : PW + 0.09 * PW; // outer margin wider than the inner
    const x1 = page === 0 ? 0.91 * PW : PW + 0.87 * PW;
    // the running head and a rule under it
    g.font = font('mono', 26, 500);
    g.textBaseline = 'alphabetic';
    if (page === 0 && name) {
      g.textAlign = 'left';
      g.fillText(name, x0, top - 28);
    } else if (page === 1 && folio) {
      g.textAlign = 'right';
      g.fillText(String(folio), x1, top - 28);
    }
    g.fillRect(x0, top - 14, x1 - x0, 2);
    // rows of type: blocks of indented rows, a blank row between blocks, now and then a short heading row
    let y = top + 26;
    let indent = 0;
    while (y < bottom) {
      const block = 3 + Math.floor(r() * 9);
      for (let i = 0; i < block && y < bottom; i++, y += lead) {
        if (i > 0) indent = Math.max(0, Math.min(4, indent + (r() < 0.35 ? 1 : r() < 0.5 ? -1 : 0)));
        let x = x0 + indent * 2 * 0.6 * em * 1.35;
        const end = x0 + (x1 - x0) * (0.35 + 0.65 * r());
        while (x < end) {
          const len = (2 + Math.floor(r() * 8)) * 0.6 * em * 1.35;
          const w = Math.min(len, x1 - x);
          if (w > 4) {
            const hgt = em * (r() < 0.15 ? 1.25 : 1);
            g.globalAlpha = 0.78 + 0.22 * r();
            g.fillRect(x, y - hgt, w, hgt);
          }
          x += len + 0.6 * em * 1.35 * (r() < 0.15 ? 2 : 1);
        }
        g.globalAlpha = 1;
      }
      y += lead;
      indent = r() < 0.5 ? 0 : 1;
    }
  }
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 });
}

// ------------------------------------------------------------------------------------ geometry
// One half, open, in the book's frame: the right-hand one (x ≥ 0), or its mirror. Attributes: position, normal,
// aUv (page: x across the spread 0..1, y head 0 → tail 1; leaves: x through the half block, y along it), aPart
// (0 page, 1 leaves, 2 cloth outside, 3 cloth inside, 4 the board's tail edge: cloth as 2), aHead (1 on the head's
// leaves: the dust).
const pageTop = (u, PW) => -0.009 * Math.exp(-u / 0.018) + 0.004 * Math.sin(Math.PI * Math.min(u / PW, 1));

function halfGeometry({ w, h, d }, mirror) {
  const T = w / 2 - CB;
  const PW = d - SQ;
  const PH = h - 2 * SQ;
  const pos = [];
  const nrm = [];
  const uv = [];
  const part = [];
  const head = [];
  const idx = [];
  const sx = mirror ? -1 : 1;
  const vert = (x, y, z, nx, ny, nz, u, v, p, hd = 0) => {
    pos.push(sx * x, y, z);
    nrm.push(sx * nx, ny, nz);
    uv.push(u, v);
    part.push(p);
    head.push(hd);
    return pos.length / 3 - 1;
  };
  // a quad a b c d, wound counter-clockwise seen from its normal (before mirroring)
  const quad = (a, b, c, e) => (mirror ? idx.push(a, e, c, a, c, b) : idx.push(a, b, c, a, c, e));
  const NU = 30;
  const us = Array.from({ length: NU + 1 }, (_, i) => PW * Math.pow(i / NU, 1.6));
  const pu = (u) => (mirror ? 0.5 - 0.5 * (u / PW) : 0.5 + 0.5 * (u / PW)); // across the spread
  // the page: rows along u, two columns along z
  const NZ = 2;
  const grid = [];
  for (let i = 0; i <= NU; i++) {
    const u = us[i];
    const y = pageTop(u, PW);
    const e = 1e-4;
    const dy = (pageTop(u + e, PW) - pageTop(Math.max(u - e, 0), PW)) / (u > e ? 2 * e : e);
    const n = new THREE.Vector3(-dy, 1, 0).normalize();
    grid.push([]);
    for (let j = 0; j <= NZ; j++) {
      const z = -PH / 2 + (PH * j) / NZ;
      grid[i].push(vert(u, y, z, n.x, n.y, n.z, pu(u), j / NZ, 0));
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NZ; j++) quad(grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j], grid[i][j]);
  // the leaves: the fore-edge, the head and the tail
  const yF = pageTop(PW, PW);
  quad(vert(PW, -T, PH / 2, 1, 0, 0, 0, 1, 1), vert(PW, -T, -PH / 2, 1, 0, 0, 0, 0, 1), vert(PW, yF, -PH / 2, 1, 0, 0, 1, 0, 1), vert(PW, yF, PH / 2, 1, 0, 0, 1, 1, 1));
  for (const [z, nz, hd] of [[-PH / 2, -1, 1], [PH / 2, 1, 0]]) {
    for (let i = 0; i < NU; i++) {
      const a0 = us[i];
      const a1 = us[i + 1];
      const v0 = vert(a0, -T, z, 0, 0, nz, 0, a0 / PW, 1, hd);
      const v1 = vert(a1, -T, z, 0, 0, nz, 0, a1 / PW, 1, hd);
      const v2 = vert(a1, pageTop(a1, PW), z, 0, 0, nz, 1, a1 / PW, 1, hd);
      const v3 = vert(a0, pageTop(a0, PW), z, 0, 0, nz, 1, a0 / PW, 1, hd);
      if (nz < 0) quad(v1, v0, v3, v2);
      else quad(v0, v1, v2, v3);
    }
  }
  // the board: inside (under the page block, seen in the squares), outside, and its three edges
  const X1 = PW + SQ;
  const yi = -T;
  const yo = -T - CB;
  const H2 = h / 2;
  quad(vert(0, yi, H2, 0, 1, 0, 0, 1, 3), vert(X1, yi, H2, 0, 1, 0, 1, 1, 3), vert(X1, yi, -H2, 0, 1, 0, 1, 0, 3), vert(0, yi, -H2, 0, 1, 0, 0, 0, 3));
  quad(vert(0, yo, -H2, 0, -1, 0, 0, 0, 2), vert(X1, yo, -H2, 0, -1, 0, 1, 0, 2), vert(X1, yo, H2, 0, -1, 0, 1, 1, 2), vert(0, yo, H2, 0, -1, 0, 0, 1, 2));
  quad(vert(X1, yo, H2, 1, 0, 0, 0, 1, 2), vert(X1, yo, -H2, 1, 0, 0, 0, 0, 2), vert(X1, yi, -H2, 1, 0, 0, 1, 0, 2), vert(X1, yi, H2, 1, 0, 0, 1, 1, 2));
  quad(vert(X1, yo, -H2, 0, 0, -1, 1, 0, 2), vert(0, yo, -H2, 0, 0, -1, 0, 0, 2), vert(0, yi, -H2, 0, 0, -1, 0, 0, 2), vert(X1, yi, -H2, 0, 0, -1, 1, 0, 2));
  quad(vert(0, yo, H2, 0, 0, 1, 0, 1, 4), vert(X1, yo, H2, 0, 0, 1, 1, 1, 4), vert(X1, yi, H2, 0, 0, 1, 1, 1, 4), vert(0, yi, H2, 0, 0, 1, 0, 1, 4));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aHead', new THREE.Float32BufferAttribute(head, 1));
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------------------------ shading
const VERT = /* glsl */ `
attribute vec2 aUv; attribute float aPart, aHead;
varying vec3 vW, vN; varying vec2 vUv; varying float vPart, vHead;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal);
  vUv = aUv; vPart = aPart; vHead = aHead;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = (DL) => /* glsl */ `
uniform sampler2D uPaper; uniform vec3 uCloth, uPaperCol, uInkCol; uniform float uDust, uLeaves;
${DL}
varying vec3 vW, vN; varying vec2 vUv; varying float vPart, vHead;
void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  int part = int(vPart + 0.5);
  if (uLeaves > 0.5 && (part == 2 || part == 3 || vHead > 0.5)) discard;
  vec3 alb; float rough = 0.85; vec3 f0 = vec3(0.035); float ao = 1.0;
  if (part == 0){
    // paper: aged, a little foxed, darker toward its edges; the ink of the old printing
    vec2 q = vUv;
    float ink = texture2D(uPaper, vec2(q.x, 1.0 - q.y)).r;
    float edge = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float fox = smoothstep(0.62, 0.8, vnoise2(q*vec2(9.0, 14.0) + 3.1))*0.18;
    alb = uPaperCol*(0.9 + 0.14*vnoise2(q*vec2(70.0, 110.0)))*(1.0 - fox)*mix(0.82, 1.0, smoothstep(0.0, 0.05, edge));
    alb *= mix(0.8, 1.0, smoothstep(0.0, 0.06, abs(q.x - 0.5)));      // the gutter's shadow
    alb = mix(alb, uInkCol, ink*0.92);
    rough = mix(0.88, 0.62, ink);
  } else if (part == 1){
    // the leaves, edge on: fine lines through the block; dust on the head
    float lines = 0.84 + 0.16*vnoise2(vec2(vUv.x*180.0, vUv.y*3.0));
    alb = uPaperCol*0.85*lines;
    if (vHead > 0.5){
      float cover = uDust*(0.55 + 0.45*vnoise2(vUv*vec2(30.0, 90.0)));
      alb = mix(alb, vec3(0.3, 0.27, 0.23), clamp(cover, 0.0, 1.0)*0.85);
      rough = 0.95;
    }
    ao = 0.85;
  } else {
    // cloth: a fine weave, worn paler at the edges of the board
    vec2 q = vUv*vec2(260.0, 420.0);
    float weave = 0.82 + 0.18*vnoise2(q) + 0.08*sin(q.x*3.1)*sin(q.y*3.1);
    float rim = 1.0 - smoothstep(0.0, 0.03, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    alb = uCloth*weave*(1.0 + 0.6*rim);
    rough = 0.78;
    if (part == 3) { alb *= 0.8; ao = 0.6; }
  }
  Surf s; s.P = P; s.N = N; s.V = V; s.albedo = alb; s.f0 = f0; s.rough = rough; s.ao = ao; s.wrap = 0.1;
  float k = floor((P.y + 1e-3)/uH);
  vec4 st = floorState(k);
  vec3 c = (lampLight(s, k, st) + dLight(s))*ao + uAmb*alb*20.0*ao;
  gl_FragColor = vec4(fog(c, P), 1.0);
}`;

// ------------------------------------------------------------------------------------ the book
// dims: the volume's { w (thickness), h (height), d (depth) } as bookshelf.js has them; sag: its spine's round.
//   const book = await OpenBook.create({ uniforms: lib.uniforms, wall, dims, cloth: [r, g, b], name, folio });
//   group.add(book.group); in update(t): book.set({ open }) (0 shut … 1 open; a little over 1 is the bounce)
export class OpenBook {
  static async create(o) {
    const paper = await paperTexture({ name: o.name, folio: o.folio, seed: o.seed ?? 7 });
    return new OpenBook({ ...o, paper });
  }

  // the shut volume's frame in bookshelf.js (its record's matrix) → this book's frame
  static fromShelf({ h }, sag) {
    return new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, -1, h / 2, 0, -1, 0, -sag, 0, 0, 0, 1);
  }

  constructor({ uniforms, wall, dims, cloth = [0.02, 0.045, 0.12], paper, dust = 0.9, sag = null }) {
    this.dims = dims;
    this.sag = sag ?? 0.12 * dims.w;
    const own = {
      uPaper: { value: paper },
      uCloth: { value: new THREE.Color(...cloth) },
      uPaperCol: { value: new THREE.Color(0.5, 0.42, 0.3) },
      uInkCol: { value: new THREE.Color(0.03, 0.024, 0.02) },
      uDust: { value: dust },
      // 1: only what a bookshelf.js volume lacks (a shelf never shows it): the leaves less the head's, and the
      // boards' tail edges. For the block inside such a volume in flight (hide the spine too)
      uLeaves: { value: 0 },
    };
    this.uniforms = own;
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, ...wall.uniforms, ...own },
      vertexShader: VERT,
      fragmentShader: LIB_COMMON + FRAG(DLIGHT_GLSL),
      side: THREE.DoubleSide,
    });
    this.group = new THREE.Group();
    this.right = new THREE.Mesh(halfGeometry(dims, false), this.material);
    this.left = new THREE.Mesh(halfGeometry(dims, true), this.material);
    // the spine: a strip along z whose round follows the boards' joints
    this.NS = 9;
    const n = this.NS;
    const g = new THREE.BufferGeometry();
    this.spinePos = new Float32Array(n * 2 * 3);
    this.spineNrm = new Float32Array(n * 2 * 3);
    const suv = [];
    const idx = [];
    for (let i = 0; i < n; i++) {
      suv.push(i / (n - 1), 0, i / (n - 1), 1);
      if (i < n - 1) idx.push(2 * i, 2 * i + 2, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 1);
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.spinePos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.spineNrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(suv, 2));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Array(n * 2).fill(2), 1));
    g.setAttribute('aHead', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0), 1));
    g.setIndex(idx);
    this.spine = new THREE.Mesh(g, this.material);
    for (const m of [this.right, this.left, this.spine]) {
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.set({ open: 0 });
  }

  set({ open = 0 } = {}) {
    const th = (Math.PI / 2) * (1 - open);
    this.right.rotation.z = th;
    this.left.rotation.z = -th;
    const { w, h } = this.dims;
    const n = this.NS;
    const hw = Math.max((w / 2) * Math.sin(Math.max(th, 0)), 0.006);
    const y0 = (-w / 2) * Math.cos(th);
    const bulge = this.sag * Math.sin(Math.max(th, 0)) + 0.004;
    const P = this.spinePos;
    const N = this.spineNrm;
    for (let i = 0; i < n; i++) {
      const f = -1 + (2 * i) / (n - 1);
      const x = f * hw;
      const y = y0 - bulge * (1 - f * f);
      // the outward normal of the round
      const dx = hw;
      const dy = 2 * bulge * f;
      const l = Math.hypot(dx, dy) || 1;
      for (let j = 0; j < 2; j++) {
        const o = (2 * i + j) * 3;
        P[o] = x;
        P[o + 1] = y;
        P[o + 2] = j === 0 ? -h / 2 : h / 2;
        N[o] = dy / l;
        N[o + 1] = -dx / l;
        N[o + 2] = 0;
      }
    }
    this.spine.geometry.attributes.position.needsUpdate = true;
    this.spine.geometry.attributes.normal.needsUpdate = true;
    this.open = open;
    return this;
  }
}
