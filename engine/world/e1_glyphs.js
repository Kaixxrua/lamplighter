// Code glyphs for s32 and s34: lines of the film's own engine code, typed out in steel light one glyph at a time
// where the reader's nib is, then pressed down into the book it writes. The lines are drawn once into an atlas
// (JetBrains Mono, a row per line); each line is a quad facing the lens, additive and dimmed by the library's fog
// as the body's light is, with a depth twin so the post's DOF sees it where it is. The newest glyphs flare as they
// appear. Pressed (squash → 1) a line folds into a bar of light no thinner than a pixel and a half, brightening as
// it narrows (up to twice); the shot fades it (glow) as the book's print line takes it in.
//
//   const g = await CodeGlyphs.create({ lines: CODE, uniforms: lib.uniforms, height: ctx.height }); scene.add(g.group)
//     (col: their colour, STEEL unless set; s35 writes MCP-first in LIME)
//   in update(t), after the camera moves, for every line on screen:
//     g.set(k, { tail: Vector3 (where the newest glyph ends), shown (glyphs typed, fractional), em (glyph size, m),
//                squash (0..1), glow }); lines not set in a frame are hidden. Then g.update(camera).
import * as THREE from 'three';
import { loadFonts, font, makeCanvas, canvasTexture } from '../runtime/lib/text.js';
import { STEEL } from './agentbody.js';

// engine/tools/render.mjs as it is written (lines 201, 325, 327, 328, 344–347 at b87a4a0), indentation dropped:
// the tool that renders this film, frame by frame and the same every time, into an MP4
export const CODE = [
  'const out = path.resolve(args.out || defaultOut());',
  'for (let f = from; f <= to; f++) {',
  'const r = await page.evaluate(async ([n, prof]) => {',
  'const r = await window.film.renderAndSend(n, { profile: prof });',
  'await page.evaluate(() => window.film.flush());',
  'ff.stdin.end();',
  'await ffDone;',
  'await browser.close();',
];

const FS = 64; // atlas font size (px)
const RH = 96; // atlas row height (px)
const PAD = 16;

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){
  vUv = uv;
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const MASK = /* glsl */ `
uniform sampler2D uTex; uniform vec4 uBox; uniform float uN, uShown, uSquash;
varying vec2 vUv; varying vec3 vW;
float glyphs(out float age){
  float idx = vUv.x*uN;
  float g = floor(idx);
  age = uShown - g;
  float vis = clamp(age*3.0, 0.0, 1.0);
  float m = texture2D(uTex, vec2(mix(uBox.x, uBox.y, vUv.x), mix(uBox.z, uBox.w, vUv.y))).r;
  // folded flat the row of glyphs becomes an even bar
  return mix(m, 0.32, uSquash)*vis;
}`;

const FRAG = MASK + /* glsl */ `
uniform vec3 uCol; uniform float uFogD, uGain;
void main(){
  float age;
  float m = glyphs(age);
  float flare = 1.0 + 0.6*exp(-max(age - 1.0, 0.0)/1.5)*(1.0 - uSquash);
  gl_FragColor = vec4(uCol*(m*flare*uGain*exp(-uFogD*distance(vW, cameraPosition))), 1.0);
}`;

const DEPTH = MASK + /* glsl */ `
void main(){
  float age;
  if (glyphs(age) < 0.3) discard;
  gl_FragColor = vec4(0.0);
}`;

const _R = new THREE.Vector3();
const _U = new THREE.Vector3();
const _C = new THREE.Vector3();
const _P = new THREE.Vector3();

export class CodeGlyphs {
  static async create(o) {
    await loadFonts();
    return new CodeGlyphs(o);
  }

  constructor({ lines = CODE, uniforms, height = 1080, col = STEEL }) {
    this.lines = lines;
    this.height = height;
    const cv = makeCanvas(4096, RH * lines.length);
    const g = cv.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff';
    g.font = font('mono', FS, 500);
    g.textBaseline = 'alphabetic';
    this.adv = g.measureText('M').width / FS; // advance per glyph, in em
    lines.forEach((s, k) => g.fillText(s, PAD, k * RH + RH * 0.5 + FS * 0.36));
    const tex = canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 16 });
    this.group = new THREE.Group();
    this.items = lines.map((s, k) => {
      const N = s.length;
      const box = new THREE.Vector4(PAD / cv.width, (PAD + N * this.adv * FS) / cv.width, 1 - ((k + 1) * RH) / cv.height, 1 - (k * RH) / cv.height);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const U = {
        uTex: { value: tex },
        uBox: { value: box },
        uN: { value: N },
        uShown: { value: 0 },
        uSquash: { value: 0 },
        uCol: { value: col.clone() },
        uGain: { value: 1 },
        uFogD: uniforms ? uniforms.uFogD : { value: 0 },
      };
      const glow = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      }));
      const twin = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: U, vertexShader: VERT, fragmentShader: DEPTH,
        transparent: true, depthWrite: true, depthTest: true, colorWrite: false, side: THREE.DoubleSide,
      }));
      glow.renderOrder = 25;
      twin.renderOrder = 45;
      for (const m of [glow, twin]) {
        m.frustumCulled = false;
        m.visible = false;
        this.group.add(m);
      }
      return { N, U, geo, glow, twin, state: null };
    });
  }

  set(k, state) {
    this.items[k].state = state;
  }

  // lay each line set this frame out facing the lens; hide the rest (and forget them for the next frame)
  update(camera) {
    camera.updateMatrixWorld();
    _R.setFromMatrixColumn(camera.matrixWorld, 0);
    _U.setFromMatrixColumn(camera.matrixWorld, 1);
    camera.getWorldPosition(_C);
    const pxAt = (d) => (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / (camera.zoom * this.height);
    for (const it of this.items) {
      const s = it.state;
      it.glow.visible = it.twin.visible = !!s;
      it.state = null;
      if (!s) continue;
      const em = s.em ?? 0.016;
      const len = it.N * this.adv * em;
      const shown = Math.min(s.shown ?? it.N, it.N);
      const x0 = -shown * this.adv * em; // the line's start, left of the tail
      // the row is RH/FS em tall; folded, no thinner than 1.5 px (its light kept)
      const full = (em * RH) / FS;
      const floor = 1.5 * pxAt(_P.copy(s.tail).distanceTo(_C));
      const h = Math.max(full * (1 - (s.squash ?? 0)), floor);
      const a = it.geo.attributes.position;
      const corner = (i, x, y) => {
        _P.copy(s.tail).addScaledVector(_R, x).addScaledVector(_U, y);
        a.setXYZ(i, _P.x, _P.y, _P.z);
      };
      corner(0, x0, -h / 2);
      corner(1, x0 + len, -h / 2);
      corner(2, x0 + len, h / 2);
      corner(3, x0, h / 2);
      a.needsUpdate = true;
      it.U.uShown.value = shown;
      it.U.uSquash.value = s.squash ?? 0;
      // folding gathers the light into the bar, brighter as it narrows, up to twice
      it.U.uGain.value = (s.glow ?? 1) * Math.min(full / h, 2);
    }
  }
}
