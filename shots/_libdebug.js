// Library look-dev: one fixed view per second of local time (render stills at frames 0, 24, 48 …).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { Library } from 'world/library.js';
import { sidePoint } from 'world/geo.js';

export const meta = { frames: 24 * 8 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const VIEWS = [
  // 0: in the gallery of floor 0, along side 0 toward the doorway of side 1
  () => ({ pos: sidePoint(0, 16.2, -5.5, 1.65), target: sidePoint(1, 16.0, 2.0, 1.9), focal: 24 }),
  // 1: at the balustrade, looking across the shaft
  () => ({ pos: sidePoint(4, 13.0, 0.8, 1.65), target: sidePoint(1, 13.0, -1.5, -2.0), focal: 28 }),
  // 2: from the shaft axis looking up
  () => ({ pos: V(0.3, -1.0, 0.2), target: V(0.1, 40, 3.0), focal: 18 }),
  // 3: shelves close-up
  () => ({ pos: sidePoint(0, 17.2, 0.4, 1.55), target: sidePoint(0, 19.0, -0.6, 1.3), focal: 35 }),
  // 4: the inscription band of floor 0 on side 1, from across the shaft
  () => ({ pos: V(0.0, -0.3, -2.0), target: V(0.0, -0.45, 12.0), focal: 85 }),
  // 5: s06-like view, straight down from the axis
  () => ({ pos: V(0.6, 2.5, -5.0), target: V(0.6, -40, -1.0), focal: 24 }),
  // 6: lamp close-up
  () => ({ pos: sidePoint(0, 13.4, -2.0, 3.6), target: sidePoint(0, 14.6, -4.6, 4.3), focal: 50 }),
  // 7: the doorway and vestibule
  () => ({ pos: sidePoint(1, 13.2, 1.2, 1.7), target: sidePoint(1, 20.0, 0.0, 2.2), focal: 24 }),
];

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const lib = new Library({ floors: [-60, 30], near: 2, mid: 9, height: ctx.height });
  scene.add(lib.group);
  return {
    scene,
    camera,
    update(t) {
      const v = VIEWS[Math.min(VIEWS.length - 1, Math.max(0, Math.round(t)))]();
      setLens(camera, v.focal);
      aim(camera, v.pos, v.target);
      lib.update(camera);
    },
    post: () => ({ exposure: 1.0 }),
  };
}
