// Pages look-dev: one fixed view per second (stills at frames 0, 24, 48 …).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { hash } from 'film/lib/rng.js';
import { Library } from 'world/library.js';
import { Lighthouse } from 'world/lighthouse.js';
import { pageAtlas } from 'world/pageatlas.js';
import { Pages, fall, rise, leafState } from 'world/pages.js';
import { Dust } from 'world/dust.js';

export const meta = { frames: 24 * 8 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;
const FLOOD = { seed: 7, y0: -40, y1: 70, r0: 0.3, r1: 11.4, speed: [0.55, 1.05] };
const STORM = { seed: 7, y0: -40, y1: 70, r0: 4.2, r1: 11.4, speed: [0.55, 1.05], swirl: 0.25 };
const LANTERNS = { seed: 9, y0: -40, y1: 70, r0: 0.5, r1: 11.0, speed: [0.35, 0.8] };

const VIEWS = [
  // 0: s07 — looking up the shaft from the balustrade of floor 0, the flood falling toward us
  { pos: V(0.4, 1.5, -12.4), target: V(0, 12, -3), focal: 24, mode: 'flood', time: 30 },
  // 1: close: a few leaves between the camera and the lamps (text, translucency, show-through)
  { pos: V(-1.2, 3.2, -9.0), target: V(0.6, 3.9, -5.0), focal: 40, mode: 'close', time: 30 },
  // 2: s14 — the lighthouse lit, the storm frozen, a few leaves lime
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, mode: 'storm', time: 30, lh: true },
  // 3: s44 — lime library, leaves rising like sky lanterns
  { pos: V(0.4, -3, -11.6), target: V(0, 8, -2), focal: 22, mode: 'lanterns', time: 30 },
  // 4: burning leaves (close)
  { pos: V(-1.2, 3.2, -9.0), target: V(0.6, 3.9, -5.0), focal: 40, mode: 'burn', time: 30 },
  // 5: the flood from a gallery, looking across the shaft (pages against the far galleries)
  { pos: V(0.0, 2.0, -15.5), target: V(0, 4.0, 0), focal: 32, mode: 'flood', time: 30 },
  // 6: dust only, against the lamps, focus at 6 m (near motes as bokeh)
  { pos: V(-1.2, 3.2, -9.0), target: V(0.6, 3.9, -5.0), focal: 40, mode: 'none', time: 30, focus: 6 },
  // 7: dust in the sheet: the lighthouse lit, camera inside the sweep's path
  { pos: V(0, 1.9, -18.5), target: V(0, 3.4, 0), focal: 20, mode: 'none', time: 30, lh: true, angle: -62, focus: 18 },
];

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 1600);
  const lib = new Library({ floors: [-40, 40], near: 2, mid: 9, height: ctx.height });
  scene.add(lib.group);
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0.03, 0.021, 0.013);
  const amber = () => lib.setAll((k) => ({ lit: 0, lime: 0, lamp: hash(k, 61) < 0.04 ? 0.15 : 0.72 + 0.28 * hash(k, 62) }));
  const limeLib = () => lib.setAll(() => ({ lit: 1, lime: 1, lamp: 1 }));
  const lh = new Lighthouse({ uniforms: U, y0: 0 });
  scene.add(lh.group);
  const atlas = await pageAtlas({ anisotropy: ctx.renderer.capabilities.getMaxAnisotropy() });
  const pages = new Pages({ uniforms: U, atlas, count: 3000 });
  scene.add(pages.mesh);
  const dust = new Dust({ uniforms: U, count: 30000 });
  scene.add(dust.points);

  // hand-placed leaves for the close views
  const close = (t, burn) => {
    const st = leafState();
    const spots = [
      [0.1, 3.7, -5.6, 20, -10, 0.8], [0.9, 4.3, -5.2, -35, 15, -1.6], [-0.4, 4.6, -4.4, 60, 30, 2.4],
      [1.4, 3.3, -4.6, 5, -25, 0.3], [0.5, 3.0, -6.3, -70, 5, -0.6],
    ];
    spots.forEach(([x, y, z, yaw, pitch, bend], i) => {
      st.x = x; st.y = y; st.z = z;
      st.q.setFromEuler(new THREE.Euler(pitch * D, yaw * D, 8 * D * (i - 2), 'YXZ'));
      st.scale = 1; st.bend = bend; st.twist = (i - 2) * 0.8; st.curl = 0.4; st.ripple = 0.012; st.phase = i;
      st.design = [0, 3, 14, 7, 2][i]; st.seed = 0.17 + 0.2 * i; st.lime = 0; st.glow = 0;
      st.burn = burn ? 0.25 + 0.15 * i : 0; st.visible = true;
      pages.set(i, st);
    });
    pages.mesh.count = spots.length;
    pages.commit();
  };

  return {
    scene,
    camera,
    clearColor: U.uFogCol.value,
    update(t) {
      const v = VIEWS[Math.min(VIEWS.length - 1, Math.max(0, Math.round(t)))];
      setLens(camera, v.focal);
      aim(camera, v.pos, v.target);
      if (v.mode === 'lanterns') limeLib();
      else amber();
      lh.group.visible = !!v.lh;
      lh.set(v.lh ? { lamp: 1, glow: 1, beam: 1, dot: 1, windows: 0.3, trail: 0, angle: (v.angle ?? -35) * D } : { lamp: 0, glow: 0, beam: 0, dot: 0, windows: 0, trail: 0 });
      if (v.mode === 'flood') pages.fill(2400, v.time, fall, FLOOD);
      else if (v.mode === 'storm')
        pages.fill(3000, v.time, fall, STORM, (i, st) => {
          st.lime = hash(i, 7, 99) < 0.12 ? 1 : 0;
        });
      else if (v.mode === 'lanterns') pages.fill(2400, v.time, rise, LANTERNS);
      else if (v.mode === 'none') pages.mesh.count = 0;
      else close(v.time, v.mode === 'burn');
      dust.update(camera, v.time, { focus: v.focus ?? 8, fstop: 2.8, width: ctx.width });
      lib.update(camera);
      if (v.lh) lh.update(camera);
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
