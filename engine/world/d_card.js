// Agent D · a card of printed light (s43): a sheet of paper carrying a crop of one of the site's pages
// (assets/ui/<lang>/*.png). The print is made as C's books make theirs (world/c_book.js: the capture times
// paper over the site's ground, glowing of its own, the site's lime lit a little more), but the sheet is
// on its own in the dark of act III: blank, it is a dim leaf of paper; the print comes up on it and sinks
// again with k. The print fades out toward the sheet's edges, so whatever the crop cuts through dissolves
// into the paper instead of ending at a line.
//
//   const card = new PrintCard({ tex, size: [3840, 2160], crop: [x, y, w, h], width: 1.2 });
//   scene.add(card.mesh);            // a plane in its own XY, the print facing +Z, card.height from the crop
//   card.set({ k: 0..1 });           // the print's light
//   card.mark([x, y, w, h], dim);    // (optional) only this box of the capture at full strength, the rest × dim
// Boxes are [x, y, w, h] in the capture's pixels, origin top left, as assets/ui/manifest.json gives them.
import * as THREE from 'three';
import { BOOK_LOOK } from './c_book.js';
import { HEX, lin } from '../runtime/lib/palette.js';

export const CARD_LOOK = {
  paper: BOOK_LOOK.paper,
  site: BOOK_LOOK.site,
  glow: 0.5, // the print's light × its albedo (act III is darker than act II: C's books use 0.62)
  blank: 0.012, // the unprinted sheet: just there
  lime: 0.6, // the site's own lime, lit a little more (the only colour that may burn)
  edge: 0.035, // the print fades over this much of the sheet's height at its edges
  corner: 0.012, // the sheet's corner radius, m
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec4 uCrop;  // the crop in the capture's uv, y down: x0, y0, x1, y1
uniform vec4 uMark;  // the box printed at full strength (same space)
uniform float uDim, uK, uGlow, uBlank, uLimeK, uEdge, uCorner;
uniform vec3 uPaper, uSite, uLime;
uniform vec2 uSize;  // the sheet, m
varying vec2 vUv;
float limeOf(vec3 c){
  return smoothstep(0.30, 0.45, min(c.r, c.g) - c.b)*smoothstep(0.5, 0.7, c.g)*smoothstep(0.25, 0.1, c.b);
}
void main(){
  vec2 q = vec2(mix(uCrop.x, uCrop.z, vUv.x), mix(uCrop.y, uCrop.w, 1.0 - vUv.y));
  vec3 ui = texture2D(uTex, vec2(q.x, 1.0 - q.y)).rgb;
  // the sheet: a rounded rectangle
  vec2 p = (vUv - 0.5)*uSize;
  vec2 d = abs(p) - 0.5*uSize + uCorner;
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uCorner;
  float aa = fwidth(sd);
  float alpha = 1.0 - smoothstep(-aa, aa, sd);
  if (alpha < 0.004) discard;
  // the print, fading into the paper at the sheet's edges
  float m = smoothstep(0.0, uEdge*uSize.y, -sd);
  vec2 a = smoothstep(uMark.xy - 0.002, uMark.xy + 0.002, q)*(1.0 - smoothstep(uMark.zw - 0.002, uMark.zw + 0.002, q));
  float s = mix(uDim, 1.0, a.x*a.y)*m*uK;
  vec3 print = ui*(uPaper/uSite);
  vec3 col = uPaper*uBlank*(1.0 - 0.6*s) + print*(uGlow*s) + uLime*(limeOf(ui)*uLimeK*s);
  gl_FragColor = vec4(col, alpha);
}
`;

export class PrintCard {
  constructor({ tex, size, crop, width = 1, look = {} }) {
    this.look = { ...CARD_LOOK, ...look };
    this.size = size;
    const [x, y, w, h] = crop;
    this.width = width;
    this.height = (width * h) / w;
    const box = (b) => new THREE.Vector4(b[0] / size[0], b[1] / size[1], (b[0] + b[2]) / size[0], (b[1] + b[3]) / size[1]);
    const L = this.look;
    this.uniforms = {
      uTex: { value: tex },
      uCrop: { value: box(crop) },
      uMark: { value: box(crop) },
      uDim: { value: 1 },
      uK: { value: 0 },
      uGlow: { value: L.glow },
      uBlank: { value: L.blank },
      uLimeK: { value: L.lime },
      uEdge: { value: L.edge },
      uCorner: { value: L.corner },
      uPaper: { value: new THREE.Vector3(...L.paper) },
      uSite: { value: new THREE.Vector3(...L.site) },
      uLime: { value: lin(HEX.lime) },
      uSize: { value: new THREE.Vector2(this.width, this.height) },
    };
    this._box = box;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: THREE.DoubleSide }),
    );
  }

  set({ k = this.uniforms.uK.value } = {}) {
    this.uniforms.uK.value = k;
    return this;
  }

  mark(boxPx, dim = 0.3) {
    this.uniforms.uMark.value.copy(this._box(boxPx));
    this.uniforms.uDim.value = dim;
    return this;
  }

  // where a point of the capture (px) lies on the sheet, in the mesh's local frame
  at(px, py, out = new THREE.Vector3()) {
    const c = this.uniforms.uCrop.value;
    const u = (px / this.size[0] - c.x) / (c.z - c.x);
    const v = (py / this.size[1] - c.y) / (c.w - c.y);
    return out.set((u - 0.5) * this.width, (0.5 - v) * this.height, 0);
  }
}
