// Lighthouse look-dev: one fixed view per second of local time (stills at frames 0, 24, 48 …).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { hash } from 'film/lib/rng.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';

export const meta = { frames: 24 * 14 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;
const LIT = { lamp: 1, glow: 1, beam: 1, dot: 1, windows: 0.3, trail: 0 };
const DARK = { lamp: 0, glow: 0, beam: 0, dot: 0, windows: 0, trail: 0 };
const VIEWS = [
  // 0: the s14 proscenium — gallery of the lighthouse's floor, side 4, looking across the shaft
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...LIT, angle: -35 * D } },
  // 1: the same, lamp out
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...DARK, angle: -35 * D } },
  // 2: the lens, 25° off its axis
  { pos: V(0.0, 2.6, -6.0), target: V(0, 2.6, 0), focal: 45, lh: { ...LIT, angle: -84 * D } },
  // 3: from above
  { pos: V(6, 22, -8), target: V(0, 3.5, 0), focal: 28, lh: { ...LIT, angle: 20 * D } },
  // 4: from below: corbels and tower
  { pos: V(2, -16, -11), target: V(0, -2, 0), focal: 24, lh: { ...LIT, angle: 120 * D } },
  // 5: tower plates, rivets, a window
  { pos: V(0.5, -7.4, -6.6), target: V(0, -8.4, 0), focal: 50, lh: { ...LIT, angle: 160 * D, windows: 1 } },
  // 6: three-quarter view of the lantern
  { pos: V(7, 4.5, -7), target: V(0, 3.0, 0), focal: 35, lh: { ...LIT, angle: 150 * D } },
  // 7: high, looking down across the sweep
  { pos: V(0.3, 17.0, -10.0), target: V(0, 2, 0), focal: 24, lh: { ...LIT, angle: 20 * D } },
  // 8: the lens head-on without glazing and halo (diagnostic)
  { pos: V(0.0, 2.6, -6.0), target: V(0, 2.6, 0), focal: 45, lh: { ...LIT, angle: -84 * D }, hide: ['glass', 'halo'] },
  // 10–13: cost probes of view 0
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...LIT, angle: -35 * D }, hide: ['glows'] },
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...LIT, angle: -35 * D }, hide: ['lighthouse'] },
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...LIT, angle: -35 * D }, hide: ['beam'] },
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, lh: { ...DARK, angle: -35 * D }, hide: ['lighthouse', 'glows'] },
  // 9: the lens head-on, lamp out
  { pos: V(0.0, 2.6, -6.0), target: V(0, 2.6, 0), focal: 45, lh: { ...DARK, angle: -84 * D } },
];

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const lib = new Library({ floors: [-60, 30], near: 2, mid: 9, height: ctx.height });
  scene.add(lib.group);
  lib.setAll((k) => ({ lit: 0, lime: 0, lamp: hash(k, 61) < 0.04 ? 0.15 : 0.72 + 0.28 * hash(k, 62) }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0.03, 0.021, 0.013);
  const lh = new Lighthouse({ uniforms: U, y0: 0 });
  scene.add(lh.group);
  return {
    scene,
    camera,
    clearColor: U.uFogCol.value,
    update(t) {
      const v = VIEWS[Math.min(VIEWS.length - 1, Math.max(0, Math.round(t)))]; // round: shutter samples straddle the second
      setLens(camera, v.focal);
      aim(camera, v.pos, v.target);
      lh.set(v.lh);
      lib.update(camera);
      lh.update(camera);
      const hide = v.hide ?? [];
      for (const part of ['halo', 'beam']) if (hide.includes(part)) lh[part].visible = false;
      lh.glass.visible = !hide.includes('glass');
      lh.group.visible = !hide.includes('lighthouse');
      lib.glows.visible = !hide.includes('glows');
      U.uTime.value = t;
    },
    post: () => ({
      exposure: 1.3,
      whiteBalance: { temperature: 0.05, tint: 0.01 },
      bloom: { strength: 0.06 },
      halation: { strength: 0.32, threshold: 0.8 },
      vignette: { strength: 0.62, power: 2.0 },
      grade: { contrast: 1.15, shadowTint: [-0.011, -0.003, 0.015], highlightTint: [0.03, 0.012, -0.02], blackPoint: 0.003 },
    }),
  };
}
