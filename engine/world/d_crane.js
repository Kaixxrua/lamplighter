// Agent D · the paper crane (s28): s27's letter folded into a crane that flies, and the flock of the
// morning's other letters rising round the shaft with it.
//
// The fold is the flapping bird's, cut down to one layer of paper that folds rigidly. The body's spine is
// the sheet's diagonal from the bottom-right corner C to the top-left corner A, the head at A, the tail at
// C. First the two points are narrowed: each edge running from A or C is folded under onto the spine
// along the line halving the corner (the kites, as a bird base narrows its points). Then the sheet folds in
// half along the spine (fold 1), which raises the neck and the tail out of the body as reverse folds and
// turns the head down out of the neck, all with the one angle. Then the wings fold out and down along two
// hinges 18 mm either side of the spine (fold 2). Between a wing and the neck or the tail runs a slit,
// which a real crane hides in its layers and this one hides in its folds. The seven colour chips lie
// along the left wing's leading edge (the page's left edge, A–D), the masthead along the right wing's
// (the top edge, A–B), the rows of print across both wings.
//
// The crane's frame, in mm: the sheet flat with its print up, the origin at the page's centre, X along
// the spine toward the head (A), Y out of the printed face, Z toward the top-right corner B (the right
// wing). Page space as in d_letter.js: mm from the top-left corner, u right, v down.
import * as THREE from 'three';
import { hash } from '../runtime/lib/rng.js';
import { font, makeCanvas, canvasTexture, loadFonts } from '../runtime/lib/text.js';
import { PAGE, VERT, SHEET_SIZE, PRINT_ROWS } from './d_letter.js';

const MM = 0.001;
const DEG = Math.PI / 180;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------- the crease pattern

export const HALF = (PAGE.size / 2) * Math.SQRT2; // the page's centre to a corner (212.13)
export const toFlat = (u, v) => [(PAGE.size - u - v) / Math.SQRT2, (u - v) / Math.SQRT2]; // → [X, Z]
export const toPage = (X, Z) => [PAGE.size / 2 + (Z - X) / Math.SQRT2, PAGE.size / 2 - (X + Z) / Math.SQRT2]; // → [u, v]

// The creases (mm, rad): each point's kite runs from its corner at kite to the spine; the neck's and the
// tail's reverse folds start on the spine a from the centre and run out at th from it (a point rises at
// about 2·th); the head's turns down out of the neck the same way; the wings' hinges run w either side of
// the spine; fold 1 closes the sheet to PHI (each half PHI from flat). The neck's crease passes inside the
// first chip, which stays on the wing.
export const CREASE = {
  neck: { a: 122, th: 35 * DEG },
  tail: { a: 128, th: 31 * DEG },
  head: { a: HALF - 26, th: 40 * DEG },
  kite: 22.5 * DEG,
  w: 18,
  phi: 85 * DEG,
};

// the pattern's points on the left half (Z < 0), [X, Z]; the right half is their mirror in Z
export const PTS = (() => {
  const { neck: n, tail: tl, head: h, kite, w } = CREASE;
  // out from the spine at a along a crease at th, s mm (sx −1: toward the tail)
  const along = (a, th, s, sx = 1) => [sx * (a + s * Math.cos(th)), -s * Math.sin(th)];
  // how far along such a crease the page's edge is (the edges are |X| + |Z| = HALF)
  const toEdge = (a, th) => (HALF - a) / (Math.cos(th) + Math.sin(th));
  // …and the kite's crease from the corner
  const toKite = (a, th) => ((HALF - a) / (Math.cos(kite) + Math.sin(kite) / Math.tan(th))) * (Math.sin(kite) / Math.sin(th));
  const d = HALF - h.a;
  return {
    A: [HALF, 0],
    C: [-HALF, 0],
    D: [0, -HALF],
    Nh: [n.a, 0], // the neck's crease leaves the spine
    H: [h.a, 0], // the head's
    Nt: [-tl.a, 0], // the tail's
    Jh: along(n.a, n.th, w / Math.sin(n.th)), // where the neck's crease crosses the wing's hinge (the slit starts)
    M: along(n.a, n.th, toKite(n.a, n.th)), // …meets the kite's
    Ph: along(n.a, n.th, toEdge(n.a, n.th)), // …and the edge
    Qh: along(h.a, h.th, toKite(h.a, h.th)), // the head's crease meets the kite's
    Hk: [HALF - d * Math.cos(2 * kite), -d * Math.sin(2 * kite)], // the head's crease on the kite (H's mirror in it)
    Jt: along(tl.a, tl.th, w / Math.sin(tl.th), -1),
    Mt: along(tl.a, tl.th, toKite(tl.a, tl.th), -1),
    Pt: along(tl.a, tl.th, toEdge(tl.a, tl.th), -1),
  };
})();

// The facets of the left half, convex, and the parts they belong to; the right half mirrors them. Every
// point where facets meet is a corner of each facet it touches (no T-junctions), and each list starts at
// a corner its fan of triangles can leave from without a sliver.
export const FACETS = [
  { part: 'body', pts: ['Nt', 'Nh', 'Jh', 'Jt'] },
  { part: 'wing', pts: ['D', 'Pt', 'Mt', 'Jt', 'Jh', 'M', 'Ph'] },
  { part: 'neck', pts: ['Qh', 'M', 'Jh', 'Nh', 'H'] },
  { part: 'head', pts: ['H', 'A', 'Qh'] },
  { part: 'neckKite', pts: ['M', 'Qh', 'Hk', 'Ph'] },
  { part: 'headKite', pts: ['Qh', 'A', 'Hk'] },
  { part: 'tail', pts: ['C', 'Nt', 'Jt', 'Mt'] },
  { part: 'tailKite', pts: ['Mt', 'Pt', 'C'] },
];
export const PARTS = ['body', 'wing', 'neck', 'head', 'neckKite', 'headKite', 'tail', 'tailKite'];

// The creases as page segments [[u0, v0], [u1, v1]] and the fold they belong to (0: the kites; 1: the
// sheet in half with the neck, the tail and the head, and the slits; 2: the wings): for the light that
// scores them before they fold.
export const SCORES = (() => {
  const s = [];
  const add = (fold, a, b, mirror = true) => {
    for (const m of mirror ? [1, -1] : [1]) {
      const p = PTS[a];
      const q = PTS[b];
      s.push({ fold, seg: [toPage(p[0], m * p[1]), toPage(q[0], m * q[1])] });
    }
  };
  add(0, 'A', 'M');
  add(0, 'C', 'Mt');
  add(1, 'C', 'A', false); // the spine
  add(1, 'Nh', 'Ph'); // the neck's crease, on through the slit
  add(1, 'Nt', 'Pt');
  add(1, 'H', 'Qh');
  add(2, 'Jt', 'Jh'); // the wings' hinges
  return s;
})();

// --------------------------------------------------------------------------------------- the folding

const _S = new THREE.Matrix4().makeScale(1, 1, -1);
const _Z = V3(0, 0, 1);

// an orthonormal right-handed basis from a crease's direction c and a direction k off it
function frame(c, k, m) {
  const n = k.clone().addScaledVector(c, -k.dot(c)).normalize();
  return m.makeBasis(c, n, V3().crossVectors(c, n));
}

// A reverse fold: a flap hinged to its parent (world matrix Mp) along the crease through V0 (flat, mm)
// in direction c0, its edge k0 lying on the spine when flat. Turned about the crease so that edge lies
// in the plane of symmetry Z = 0 (where its mirror meets it): of the two turns that do, the one that is
// not the flap lying in its parent's plane. The flap keeps its angle to the crease, so it stays rigid.
function reverseFold(Mp, V0, k0, c0) {
  const R = new THREE.Matrix4().extractRotation(Mp);
  const d = k0.clone().applyMatrix4(R).normalize();
  const c = c0.clone().applyMatrix4(R).normalize();
  const e = V3().crossVectors(_Z, d).normalize();
  const al = Math.atan2(c.dot(e), c.dot(d));
  const k = d.clone().multiplyScalar(Math.cos(2 * al)).addScaledVector(e, Math.sin(2 * al));
  const F0 = frame(c0.clone().normalize(), k0, new THREE.Matrix4());
  const Q = frame(c, k, new THREE.Matrix4()).multiply(F0.transpose());
  const V = V0.clone().applyMatrix4(Mp);
  return new THREE.Matrix4().makeTranslation(V.x, V.y, V.z).multiply(Q).multiply(new THREE.Matrix4().makeTranslation(-V0.x, -V0.y, -V0.z));
}

// A point's kite: its flap turned psi about the crease from the corner (toward the flap's edge on the
// spine, flapPt a point of the flap), under the sheet, away from the print; turned all the way (PI) it
// lies a hair under the layer it folded against, so the two never fight for the same depth.
const KITE_UNDER = 0.03; // mm
function kiteFold(corner, toward, flapPt, psi) {
  const c = V3(corner[0], 0, corner[1]);
  const u = V3(toward[0], 0, toward[1]).sub(c).normalize();
  const r = V3(flapPt[0], 0, flapPt[1]).sub(c);
  r.addScaledVector(u, -r.dot(u));
  const sgn = V3().crossVectors(u, r).y < 0 ? 1 : -1;
  return new THREE.Matrix4()
    .makeTranslation(c.x, -KITE_UNDER * 0.5 * (1 - Math.cos(psi)), c.z)
    .multiply(new THREE.Matrix4().makeRotationAxis(u, sgn * psi))
    .multiply(new THREE.Matrix4().makeTranslation(-c.x, 0, -c.z));
}

// The pose of every facet for the kites at psi (0 flat, PI folded under), fold 1 at phi (each half turned
// phi up from flat about the spine) and the wings at tau (their elevation from flat, both the same: 0
// flat, PHI closed against the body, up > 0): { left: {part: Matrix4}, right: {…} } in the crane's frame
// (mm). The head's kite is cut by the head's crease, so the head can only fold once the kites are down:
// keep phi at 0 until psi is PI.
export function foldPose(phi, tau, psi = Math.PI) {
  const { neck: n, tail: tl, head: h, w } = CREASE;
  const body = new THREE.Matrix4().makeRotationX(phi);
  const wing = body.clone()
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -w))
    .multiply(new THREE.Matrix4().makeRotationX(tau - phi))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, w));
  const neck = reverseFold(body, V3(n.a, 0, 0), V3(1, 0, 0), V3(Math.cos(n.th), 0, -Math.sin(n.th)));
  const head = reverseFold(neck, V3(h.a, 0, 0), V3(1, 0, 0), V3(Math.cos(h.th), 0, -Math.sin(h.th)));
  const tail = reverseFold(body, V3(-tl.a, 0, 0), V3(-1, 0, 0), V3(-Math.cos(tl.th), 0, -Math.sin(tl.th)));
  const kn = kiteFold(PTS.A, PTS.M, PTS.Ph, psi);
  const kt = kiteFold(PTS.C, PTS.Mt, PTS.Pt, psi);
  const left = {
    body,
    wing,
    neck,
    head,
    tail,
    neckKite: neck.clone().multiply(kn),
    headKite: head.clone().multiply(kn),
    tailKite: tail.clone().multiply(kt),
  };
  const right = {};
  for (const p of PARTS) right[p] = _S.clone().multiply(left[p]).multiply(_S);
  return { left, right };
}

// The facets as polygons, both halves: { part, side (−1 left, 1 right), pts: [[X, Z]…] } wound so that
// the printed face (Y up, flat) is the front face, each keeping its first corner.
export const POLYS = (() => {
  const out = [];
  for (const side of [-1, 1]) {
    for (const f of FACETS) {
      let pts = f.pts.map((k) => [PTS[k][0], -side * PTS[k][1]]);
      // the facing, looking down Y: the signed area in (Z, X), positive when wound counterclockwise seen from +Y
      let ar = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x0, z0] = pts[i];
        const [x1, z1] = pts[(i + 1) % pts.length];
        ar += z0 * x1 - z1 * x0;
      }
      if (ar < 0) pts = [pts[0], ...pts.slice(1).reverse()];
      out.push({ part: f.part, side, pts });
    }
  }
  return out;
})();

// ------------------------------------------------------------------------------------------- the light

// The light on both faces of thin paper at P (N: the printed face's normal), for the crane and the
// flock: the shaft's lamps and the galleries' lamps of P's floor and of the floors above and below it,
// each faded by its height above or below P to nothing at 10 m, nearer than any lamp of the floors beyond
// can come, so the light runs on without a step as P climbs past a floor; the sheet and the lantern (as
// pages.js); the morning's light from the top of the shaft (uSky: on a face looking straight up); the
// lime of the words written in the air (uLime: each a point, its light in w; uLitCol).
export const CRANE_LIGHT = /* glsl */ `
uniform vec3 uSky;
uniform vec4 uLime[5];
void craneLight(vec3 P, vec3 N, out vec3 eF, out vec3 eB){
  eF = vec3(0.0); eB = vec3(0.0);
  float k = floor((P.y + 1e-3)/uH);
  for (int dk = -1; dk <= 1; dk++){
    float kk = k + float(dk);
    vec3 col = lampRGB(floorState(kk));
    for (int i = 0; i < 18; i++){
      bool sh = i < 6;
      vec3 dl = (sh ? shaftLampPos(kk, i) : galleryLampPos(kk, i - 6)) - P;
      float h = 0.1*dl.y;
      float wv = max(1.0 - h*h, 0.0);
      float d2 = dot(dl, dl);
      float ndl = dot(N, dl)*inversesqrt(d2);
      vec3 e = col*(wv*wv*(sh ? uShaftK*lampVar(kk, 12 + i) : lampVar(kk, i - 6))/(d2 + 0.3));
      eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
    }
  }
  if (uBeamI > 0.0){
    vec3 dir = vec3(P.x - uBeamO.x, 0.0, P.z - uBeamO.z);
    dir /= max(length(dir), 1e-3);
    float ndl = dot(N, -dir);
    vec3 e = uBeamCol*(uBeamI*sweep(P));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  if (uLHFill.r + uLHFill.g + uLHFill.b > 0.0){
    vec3 dl = uBeamO - P;
    float d2 = dot(dl, dl);
    float ndl = dot(N, dl)*inversesqrt(d2);
    float c = dot(normalize(P.xz - uBeamO.xz), vec2(cos(uBeamAng), sin(uBeamAng)));
    float shade = smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
    vec3 e = uLHFill*(shade*lanternFan(P, 0.08)/(d2 + 1.0));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  for (int i = 0; i < 5; i++){
    if (uLime[i].w <= 0.0) continue;
    vec3 dl = uLime[i].xyz - P;
    float d2 = dot(dl, dl);
    float ndl = dot(N, dl)*inversesqrt(d2);
    vec3 e = uLitCol*(uLime[i].w/(d2 + 1.0));
    eF += e*max(ndl, 0.0); eB += e*max(-ndl, 0.0);
  }
  eF += uSky*(0.5 + 0.5*N.y); eB += uSky*(0.5 - 0.5*N.y);
}`;

// The crane (after LIB_COMMON and CRANE_LIGHT): s27's sheet (PAPER_FRAG: the print as the light wrote
// it, cooling) folded. The print is on one face; the other is blank, and light coming through the paper
// from the printed side carries the print with it, so a wing lit from above shows its rows from below.
// uMix crosses from the sheet's light in s27 (lampLight of its own floor, the sheet, the lantern, the air)
// to craneLight, which carries on smoothly up the shaft; the creases light up lime as they are scored.
export const CRANE_FRAG = /* glsl */ `
uniform sampler2D uPage;
uniform vec3 uPaper;
uniform float uShot;
uniform vec4 uRows[8];
uniform vec2 uSpan;
uniform vec2 uSize;
uniform vec3 uHot;
uniform float uTrans, uMix;
uniform vec4 uScore[${SCORES.length}];       // the creases: page segments (0..1, v down)
uniform float uScoreK[${SCORES.length}];     // their light
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab)/dot(ab, ab), 0.0, 1.0);
  return length(p - a - h*ab);
}
void main(){
  bool front = gl_FrontFacing;
  vec2 q = vec2(vUv.x, 1.0 - vUv.y);
  vec3 tex = texture(uPage, vUv).rgb;
  float t0 = -1e3; float dur = 1.0; float v0 = 0.0; float v1 = 0.0;
  for (int i = 0; i < 8; i++){
    vec4 r = uRows[i];
    if (q.y >= r.x && q.y < r.y){ t0 = r.z; dur = r.w; v0 = r.x; v1 = r.y; }
  }
  float s = clamp((q.x - uSpan.x)/(uSpan.y - uSpan.x), 0.0, 1.0);
  float tr = t0 + s*dur;
  float rev = smoothstep(tr - 0.006, tr + 0.006, uShot);
  float tpx = float(textureSize(uPage, 0).x);
  float lod = max(log2(max(max(fwidth(vUv.x), fwidth(vUv.y))*tpx, 1.0)) + 0.5, 3.5);
  float d = exp2(lod)/tpx;
  vec3 tb = 0.25*(textureLod(uPage, vUv + vec2(d, 0.4*d), lod).rgb + textureLod(uPage, vUv - vec2(d, 0.4*d), lod).rgb
                + textureLod(uPage, vUv + vec2(-0.4*d, d), lod).rgb + textureLod(uPage, vUv - vec2(-0.4*d, d), lod).rgb);
  float cov = clamp(1.0 - dot(tb, vec3(0.2126, 0.7152, 0.0722))/dot(uPaper, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);

  vec2 m = (q - 0.5)*uSize;
  float px = max(fwidth(m.x), fwidth(m.y));
  float fine = 1.0 - smoothstep(0.00015, 0.0005, px);
  float tooth = 0.05*(vnoise2(m*vec2(3100.0, 2700.0)) - 0.5)*fine + 0.035*(vnoise2(m*vec2(520.0, 610.0) + 7.0) - 0.5);
  vec2 e = 0.5*uSize - abs(m);
  float edge = mix(0.88, 1.0, smoothstep(0.0, 0.0012, min(e.x, e.y)));
  float grain = (1.0 + tooth)*edge;
  vec3 printed = mix(uPaper, tex, rev)*grain;
  vec3 blank = uPaper*grain;

  vec3 N = normalize(vN);
  vec3 Nf = front ? N : -N;                  // the face we see
  vec3 V = normalize(cameraPosition - vW);
  float k = floor((vW.y + 1e-3)/uH);
  vec4 st = floorState(k);

  // s27's light (the sheet as it lay on the tray), on the face we see and through the paper
  vec3 alb = front ? printed : blank;
  Surf sf; sf.P = vW; sf.N = Nf; sf.V = V; sf.albedo = alb; sf.f0 = vec3(0.035); sf.rough = 0.62; sf.ao = 1.0; sf.wrap = 0.3;
  Surf b = sf; b.N = -Nf; b.albedo = vec3(1.0); b.f0 = vec3(0.0);
  // (the light through the paper carries the print whichever face we see)
  vec3 c0 = lampLight(sf, k, st) + beamLight(sf) + lanternFill(sf) + uAmb*alb*20.0
          + printed*uTrans*(lampLight(b, k, st) + beamLight(b) + lanternFill(b));
  // the crane's light
  vec3 c1 = vec3(0.0);
  if (uMix > 0.0){
    vec3 eF, eB;
    craneLight(vW, N, eF, eB);                // eF on the printed face
    vec3 eNear = front ? eF : eB;
    vec3 eFar = front ? eB : eF;
    c1 = alb*eNear + printed*uTrans*eFar + uAmb*alb*20.0;
  }
  vec3 c = mix(c0, c1, uMix);

  // the light writing the rows (s27), cooling; seen through the paper from the back
  float age = uShot - tr;
  float hot = age > 0.0 ? exp(-age/uHot.y) : 0.0;
  float head = 0.0;
  float sf0 = (uShot - t0)/dur;
  if (sf0 > -0.02 && sf0 < 1.02){
    float uf = uSpan.x + clamp(sf0, 0.0, 1.0)*(uSpan.y - uSpan.x);
    float dx = (q.x - uf)*uSize.x/0.0016;
    float dv = min(q.y - v0, v1 - q.y)*uSize.y;
    head = exp(-dx*dx)*smoothstep(0.0, 0.004, dv)*smoothstep(-0.02, 0.03, sf0)*smoothstep(1.02, 0.97, sf0);
  }
  float lit = uHot.x*cov*hot*rev + uHot.z*head;
  // the creases as the light scores them: a fine line, about 0.4 mm
  float sc = 0.0;
  for (int i = 0; i < ${SCORES.length}; i++){
    if (uScoreK[i] <= 0.0) continue;
    float dd = segDist(q, uScore[i].xy, uScore[i].zw)*uSize.x/0.0004;
    sc += uScoreK[i]*exp(-dd*dd);
  }
  c += uLitCol*((lit + sc)*(front ? 1.0 : 0.5*uTrans));
  gl_FragColor = vec4(fog(c, vW), 1.0);
}`;

// ------------------------------------------------------------------------------------------- the crane

// The crane's frame in the world: its origin at pos; its spine along a heading given as a bearing (rad,
// as the shaft's: from +x toward +z), pitched nose up by pitch and banked by bank (the right wing down
// for bank > 0); scaled by scale (the hero's geometry is in mm, the flock's in m).
const _q = new THREE.Matrix4();
export function craneMatrix(pos, yaw, pitch, bank, out = new THREE.Matrix4(), scale = MM) {
  out.makeRotationY(-yaw).multiply(_q.makeRotationZ(pitch)).multiply(_q.makeRotationX(bank));
  out.multiply(_q.makeScale(scale, scale, scale));
  return out.setPosition(pos);
}
// the bearing of the sheet's spine as it lies on the tray (A toward −x, +z)
export const YAW_TRAY = 135 * DEG;

// the labels' lime lights, shared by the crane and the flock: { value: [Vector4 (place, light) × 5] }
export const limeLights = () => ({ value: Array.from({ length: 5 }, () => new THREE.Vector4()) });

// The crane: its facets' fans in one mesh, posed on the CPU (pose()); its matrix is the crane's frame.
// U: the library's uniforms; pageTex: s27's printed page; sky: the uniform of the morning's light,
// shared with the flock. Its own uniforms (uniforms) carry s27's print and cooling as PAPER_FRAG's.
export class HeroCrane {
  constructor({ U, pageTex, paper, sky, lime = limeLights(), LIB_COMMON }) {
    const pos = [];
    const uv = [];
    const idx = [];
    this.ranges = [];
    for (const P of POLYS) {
      const base = pos.length / 3;
      for (const [X, Z] of P.pts) {
        pos.push(X, 0, Z);
        const [u, v] = toPage(X, Z);
        uv.push(u / PAGE.size, 1 - v / PAGE.size);
      }
      for (let i = 1; i + 1 < P.pts.length; i++) idx.push(base, base + i, base + i + 1);
      this.ranges.push({ part: P.part, side: P.side, start: base, count: P.pts.length });
    }
    this.flat = Float32Array.from(pos);
    const geo = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(Float32Array.from(pos), 3).setUsage(THREE.DynamicDrawUsage);
    this.normal = new THREE.BufferAttribute(new Float32Array(pos.length), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.position);
    geo.setAttribute('normal', this.normal);
    geo.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(uv), 2));
    geo.setIndex(idx);
    this.uniforms = {
      uPage: { value: pageTex },
      uPaper: { value: new THREE.Color(...paper) },
      uShot: { value: 0 },
      uRows: { value: PRINT_ROWS.map(([v0, v1]) => new THREE.Vector4(v0 / PAGE.size, v1 / PAGE.size, 1e3, 0.32)) },
      uSpan: { value: new THREE.Vector2(PAGE.stream[0] / PAGE.size, PAGE.stream[1] / PAGE.size) },
      uSize: { value: new THREE.Vector2(SHEET_SIZE, SHEET_SIZE) },
      uHot: { value: new THREE.Vector3(3.0, 0.45, 2.5) },
      uTrans: { value: 0.2 },
      uMix: { value: 0 },
      uScore: { value: SCORES.map((s) => new THREE.Vector4(s.seg[0][0] / PAGE.size, s.seg[0][1] / PAGE.size, s.seg[1][0] / PAGE.size, s.seg[1][1] / PAGE.size)) },
      uScoreK: { value: SCORES.map(() => 0) },
      uSky: sky,
      uLime: lime,
    };
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: { ...this.uniforms, ...U },
        vertexShader: VERT,
        fragmentShader: LIB_COMMON + CRANE_LIGHT + CRANE_FRAG,
        side: THREE.DoubleSide,
        // as s27's sheet: pulled forward a few depth steps while it lies on the brass
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    );
    this.mesh.matrixAutoUpdate = false;
    this.mesh.frustumCulled = false;
    this._v = V3();
    this._n = V3();
  }

  // fold 1 at phi, the wings at tau, the kites at psi (foldPose), the crane's frame M (craneMatrix)
  pose(phi, tau, M, psi = Math.PI) {
    const P = foldPose(phi, tau, psi);
    const p = this.position.array;
    const n = this.normal.array;
    const f = this.flat;
    const v = this._v;
    const nn = this._n;
    for (const r of this.ranges) {
      const T = P[r.side < 0 ? 'left' : 'right'][r.part];
      nn.set(0, 1, 0).transformDirection(T);
      for (let i = r.start; i < r.start + r.count; i++) {
        v.set(f[3 * i], f[3 * i + 1], f[3 * i + 2]).applyMatrix4(T);
        p[3 * i] = v.x;
        p[3 * i + 1] = v.y;
        p[3 * i + 2] = v.z;
        n[3 * i] = nn.x;
        n[3 * i + 1] = nn.y;
        n[3 * i + 2] = nn.z;
      }
    }
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.mesh.matrix.copy(M);
    this.mesh.matrixWorldNeedsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------- the flock

// The flock: cranes in one InstancedMesh, folded (CREASE.phi) with their wings free. A wing's vertices
// carry their place on the flat wing (aWing: X and the distance out from the hinge, m, and the side) and
// the vertex shader raises them to the crane's wing angle (aPose.x, rad). Lit per vertex (craneLight);
// printed with the same page (every subscriber's letter is the same brief); a far crane is grown to a
// minimum size on the screen and made as much more transparent (its coverage kept, so far up the shaft
// it is a steady speck of its own colour on whatever is behind it, not a flicker or a dark dot).
const FLOCK_VERT = /* glsl */ `
attribute vec4 aWing;
attribute vec4 aPose;
uniform vec2 uHinge;             // the wings' hinge: its height and its distance from the plane of symmetry (m)
uniform float uMinPx;            // the smallest a crane's span is drawn (px)
varying vec2 vUv; varying vec3 vW; varying vec3 vEF; varying vec3 vEB; varying float vDim;
void main(){
  vec3 p = position; vec3 n = normal;
  if (aWing.w > 0.5){
    float s = aWing.z; float ta = aPose.x;
    p = vec3(aWing.x, uHinge.x + aWing.y*sin(ta), s*(uHinge.y + aWing.y*cos(ta)));
    n = vec3(0.0, cos(ta), -s*sin(ta));
  }
  mat4 im = instanceMatrix;
  vec3 o = (modelMatrix*im*vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float span = ${(2 * HALF * MM * 0.92).toFixed(3)}*length(im[0].xyz);
  float px = span/(max(distance(o, cameraPosition), 1e-3)*uPxAng);
  float grow = max(1.0, uMinPx/max(px, 1e-4));
  vec4 w = modelMatrix*im*vec4(p*grow, 1.0);
  vec3 N = normalize(mat3(modelMatrix)*mat3(im)*n);
  vW = w.xyz;
  vUv = uv;
  vDim = 1.0/(grow*grow);
  craneLight(vW, N, vEF, vEB);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FLOCK_FRAG = /* glsl */ `
uniform sampler2D uPage;
uniform vec3 uPaper;
uniform float uTrans;
varying vec2 vUv; varying vec3 vW; varying vec3 vEF; varying vec3 vEB; varying float vDim;
void main(){
  bool front = gl_FrontFacing;
  vec3 tex = texture(uPage, vUv).rgb;
  vec3 alb = front ? tex : uPaper;
  vec3 c = alb*(front ? vEF : vEB) + tex*uTrans*(front ? vEB : vEF) + uAmb*alb*20.0;
  gl_FragColor = vec4(fog(c, vW), vDim);
}`;

export class Flock {
  constructor({ U, pageTex, paper, sky, lime = limeLights(), count, LIB_COMMON, minPx = 2.5 }) {
    const pose = foldPose(CREASE.phi, 0);
    const pos = [];
    const nor = [];
    const uv = [];
    const wing = [];
    const idx = [];
    for (const P of POLYS) {
      const base = pos.length / 3;
      const T = pose[P.side < 0 ? 'left' : 'right'][P.part];
      const nn = V3(0, 1, 0).transformDirection(T);
      for (const [X, Z] of P.pts) {
        const v = V3(X, 0, Z).applyMatrix4(T).multiplyScalar(MM);
        pos.push(v.x, v.y, v.z);
        nor.push(nn.x, nn.y, nn.z);
        const [u, vv] = toPage(X, Z);
        uv.push(u / PAGE.size, 1 - vv / PAGE.size);
        wing.push(...(P.part === 'wing' ? [X * MM, (Math.abs(Z) - CREASE.w) * MM, P.side, 1] : [0, 0, 0, 0]));
      }
      for (let i = 1; i + 1 < P.pts.length; i++) idx.push(base, base + i, base + i + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 4));
    geo.setIndex(idx);
    this.pose = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPose', this.pose);
    const phi = CREASE.phi;
    this.uniforms = {
      uPage: { value: pageTex },
      uPaper: { value: new THREE.Color(...paper) },
      uTrans: { value: 0.2 },
      uHinge: { value: new THREE.Vector2(CREASE.w * Math.sin(phi) * MM, CREASE.w * Math.cos(phi) * MM) },
      uMinPx: { value: minPx },
      uSky: sky,
      uLime: lime,
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, ...U },
      vertexShader: LIB_COMMON + CRANE_LIGHT + FLOCK_VERT,
      fragmentShader: LIB_COMMON + FLOCK_FRAG,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.capacity = count;
  }

  // crane i: its frame M (craneMatrix; scale it to hide it), its wings' elevation tau (rad)
  set(i, M, tau) {
    this.mesh.setMatrixAt(i, M);
    this.pose.array[4 * i] = tau;
  }

  commit(n) {
    this.mesh.count = Math.min(n, this.capacity);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.pose.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------ the labels

// Where the letters go: the site's ways of sending the brief (frontend/src/i18n/locales: the
// subscriptions' channels and dashboard.digest.feature*), written in the air in lime as the light writes
// elsewhere in the film (s16's lens, s18's seam, s19's readouts): words only, nobody's logo; Chinese
// over English where the two differ. WeChat and Lark are not open on the site yet and are not here.
export const CHANNELS = [
  { id: 'email', zh: '邮件', en: 'Email' },
  { id: 'rss', en: 'RSS' },
  { id: 'telegram', en: 'Telegram' },
  { id: 'discord', en: 'Discord' },
  { id: 'webhook', en: 'Webhook' },
];
export const LABEL = { w: 1024, h: 320, cap: 104, zh: 118, capSmall: 60, glow: 12 };

// The labels' atlas: one row a channel (CHANNELS order, from the top), the glyphs in red, a soft halo
// of them in green.
export async function labelAtlas() {
  await loadFonts();
  const { w, h } = LABEL;
  const cv = makeCanvas(w, h * CHANNELS.length);
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'lighter';
  c.textBaseline = 'alphabetic';
  c.textAlign = 'center';
  // a font at the size that gives cap px for its capitals (or, for CJK, its ideographs' height)
  const sized = (fam, weight, probe, px) => {
    c.font = font(fam, 100, weight);
    const m = c.measureText(probe);
    const k = (m.actualBoundingBoxAscent + (fam === 'serif' ? m.actualBoundingBoxDescent : 0)) / 100;
    c.font = font(fam, px / k, weight);
    return c.measureText(probe);
  };
  CHANNELS.forEach((ch, i) => {
    const y0 = i * h;
    const lines = [];
    if (ch.zh) {
      const m = sized('serif', 400, ch.zh, LABEL.zh);
      lines.push({ fam: 'serif', weight: 400, text: ch.zh, px: LABEL.zh, probe: ch.zh, base: y0 + 0.4 * h + 0.5 * (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) }); // its ink centred 0.4 down
      lines.push({ fam: 'mono', weight: 560, text: ch.en, px: LABEL.capSmall, probe: 'H', base: y0 + 0.86 * h });
    } else {
      lines.push({ fam: 'mono', weight: 560, text: ch.en, px: LABEL.cap, probe: 'H', base: y0 + 0.5 * h + LABEL.cap / 2 });
    }
    for (const [fill, blur] of [['rgb(0,255,0)', LABEL.glow], ['rgb(255,0,0)', 0]]) {
      c.filter = blur ? `blur(${blur}px)` : 'none';
      c.fillStyle = fill;
      for (const L of lines) {
        sized(L.fam, L.weight, L.probe, L.px);
        c.fillText(L.text, w / 2, L.base);
      }
    }
  });
  c.filter = 'none';
  return cv;
}

const LABEL_VERT = /* glsl */ `
uniform vec3 uPos;               // the label's centre (world)
uniform vec2 uHalf;              // its half size (m)
varying vec2 vB; varying vec3 vW;
void main(){
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 w = uPos + right*(2.0*position.x*uHalf.x) + up*(2.0*position.y*uHalf.y);
  vB = uv;
  vW = w;
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;

// written left to right (uK.y: how far, 0..1) with a bar of light at the front, as s19's readouts
const LABEL_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uRow, uRows;
uniform vec4 uK;                 // light, the wipe
uniform vec3 uLitCol;
uniform float uFogD;
varying vec2 vB; varying vec3 vW;
void main(){
  vec3 t = texture(uAtlas, vec2(vB.x, (uRows - 1.0 - uRow + vB.y)/uRows)).rgb;
  float rv = uK.y;
  float shown = smoothstep(rv + 0.01, rv - 0.01, vB.x);
  float hx = (vB.x - rv)/0.012;
  float head = exp(-hx*hx)*step(rv, 1.0)*smoothstep(0.1, 0.3, vB.y)*smoothstep(0.9, 0.7, vB.y);
  vec3 c = uLitCol*(uK.x*((t.r + 0.35*t.g)*shown + 0.5*head));
  gl_FragColor = vec4(c*exp(-uFogD*distance(vW, cameraPosition)), 1.0);
}`;

// The five labels, drawn into the air (additive, behind whatever stands in front of them); set() places
// one and writes it.
export class Labels {
  constructor({ U, atlas }) {
    const tex = canvasTexture(atlas, { srgb: false, mipmaps: true, anisotropy: 8 });
    this.group = new THREE.Group();
    this.items = CHANNELS.map((ch, i) => {
      const u = {
        uAtlas: { value: tex },
        uRow: { value: i },
        uRows: { value: CHANNELS.length },
        uK: { value: new THREE.Vector4() },
        uPos: { value: V3() },
        uHalf: { value: new THREE.Vector2(1, LABEL.h / LABEL.w) },
        uLitCol: U.uLitCol,
        uFogD: U.uFogD,
      };
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ uniforms: u, vertexShader: LABEL_VERT, fragmentShader: LABEL_FRAG, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
      );
      mesh.frustumCulled = false;
      mesh.renderOrder = 20;
      mesh.visible = false;
      this.group.add(mesh);
      return { mesh, u };
    });
  }

  // label i at pos (world), width (m), its light and how far it is written (0..1; over 1 the bar is gone)
  set(i, pos, width, light, wipe) {
    const { mesh, u } = this.items[i];
    u.uPos.value.copy(pos);
    u.uHalf.value.set(width / 2, (width / 2) * (LABEL.h / LABEL.w));
    u.uK.value.set(light, wipe, 0, 0);
    mesh.visible = light > 0 && wipe > 0;
  }
}
