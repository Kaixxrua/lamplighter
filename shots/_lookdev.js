// Pipeline test: lit stone, emissive lime + amber, fog, falling pages, handheld push-in.
import * as THREE from 'three';
import { setLens, aim, handheld } from 'film/lib/camera.js';
import { lin } from 'film/lib/palette.js';
import { hash } from 'film/lib/rng.js';

export const meta = { frames: 240, post: { streak: { strength: 0.6, threshold: 3.0, tint: [0.85, 0.95, 0.6] } } };

export async function setup(ctx) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(lin('#0a0c10'), 0.06);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  setLens(camera, 40);

  const stone = new THREE.MeshStandardMaterial({ color: lin('#5A554C'), roughness: 0.85 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), stone);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const shelfGeo = new THREE.BoxGeometry(0.6, 5, 3);
  const shelves = new THREE.InstancedMesh(shelfGeo, new THREE.MeshStandardMaterial({ color: lin('#2A1C12'), roughness: 0.7 }), 40);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? 1 : -1;
    m.makeTranslation(side * 3, 2.5, -i * 3.5);
    shelves.setMatrixAt(i, m);
  }
  scene.add(shelves);

  const lime = new THREE.Mesh(new THREE.SphereGeometry(0.25, 48, 24), new THREE.MeshBasicMaterial({ color: lin('#D8F14B', 40) }));
  lime.position.set(0, 2.2, -14);
  scene.add(lime);
  const limeLight = new THREE.PointLight(lin('#D8F14B'), 60, 0, 2);
  limeLight.position.copy(lime.position);
  scene.add(limeLight);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Vector3(i % 2 ? 2.2 : -2.2, 3.2, -4 - i * 7);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12), new THREE.MeshBasicMaterial({ color: lin('#E9C27A', 6) }));
    bulb.position.copy(p);
    scene.add(bulb);
    const l = new THREE.PointLight(lin('#E9C27A'), 6, 0, 2);
    l.position.copy(p);
    scene.add(l);
  }
  scene.add(new THREE.AmbientLight(lin('#20283a'), 0.6));

  // falling pages, closed-form motion
  const N = 600;
  const pageGeo = new THREE.PlaneGeometry(0.21, 0.297);
  const pages = new THREE.InstancedMesh(pageGeo, new THREE.MeshStandardMaterial({ color: lin('#EFE6D2'), side: THREE.DoubleSide, roughness: 0.9 }), N);
  scene.add(pages);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();

  return {
    scene,
    camera,
    update(t) {
      const z = 6 - t * 0.35;
      const shake = handheld(t, { amp: 1.2 });
      aim(camera, new THREE.Vector3(0, 1.7, z), new THREE.Vector3(0, 2.0, z - 10), { shake });
      for (let i = 0; i < N; i++) {
        const h = (k) => hash(i, k);
        const fall = 0.5 + h(1) * 0.6;
        const y = 9 - ((h(2) * 9 + t * fall) % 9);
        pos.set((h(3) - 0.5) * 6 + Math.sin(t * (0.6 + h(4)) + h(5) * 6.28) * 0.3, y, -h(6) * 40);
        e.set(t * (0.5 + h(7)) + h(8) * 6, t * (0.3 + h(9)) + h(10) * 6, Math.sin(t + h(11) * 6) * 0.6);
        q.setFromEuler(e);
        m.compose(pos, q, s);
        pages.setMatrixAt(i, m);
      }
      pages.instanceMatrix.needsUpdate = true;
    },
    post: () => ({ exposure: 0.3 }),
  };
}
