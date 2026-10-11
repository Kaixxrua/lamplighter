// s06 · 0:24–0:32 · 越过栏杆俯视，希区柯克变焦
// The camera cranes over the balustrade of floor 0 and tips down into the shaft; then it sinks while
// the lens widens so that the galleries two floors down hold their size and everything nearer
// slides away — the vertigo of a library with no bottom. Amber lamps, no lighthouse yet.
import * as THREE from 'three';
import { setLens, aim, handheld, path } from 'film/lib/camera.js';
import { ease, clamp, invLerp, lerp } from 'film/lib/ease.js';
import { hash } from 'film/lib/rng.js';
import { Library } from 'world/library.js';

export const meta = { frames: 192 };

const A_END = 2.6; // crane over the rail
const B_END = 8.0; // dolly zoom
const F0 = 40;
const D_REF = 18; // depth held constant by the dolly zoom (m)
const SINK = 8; // metres the camera sinks during the zoom

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.25, 1600);
  const lib = new Library({ floors: [-90, 3], near: 2, mid: 9, height: ctx.height });
  scene.add(lib.group);
  // lamps: amber everywhere, a few floors dimmer, a rare floor almost dark
  lib.setAll((k) => {
    const h = hash(k, 61);
    return { lit: 0, lime: 0, lamp: h < 0.04 ? 0.15 : 0.72 + 0.28 * hash(k, 62) };
  });
  const U = lib.uniforms;
  // the abyss does not go black: a thousand floors of lamps glow in the haze
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0.03, 0.021, 0.013); // smoky: the lamps stay the only saturated warmth

  const crane = path([
    [0.8, 1.72, -14.1],
    [0.76, 2.05, -12.0],
    [0.66, 2.42, -9.2],
    [0.6, 2.5, -7.0],
  ]);
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();

  function pose(t) {
    if (t < A_END) {
      const u = ease.inOutCubic(clamp(t / A_END));
      crane.at(u, pos);
      const pitch = THREE.MathUtils.degToRad(lerp(-22, -84, ease.inOutSine(clamp((t - 0.35) / (A_END - 0.35)))));
      return { pitch, focal: F0, amp: 1.8, focus: 17 };
    }
    crane.at(1, pos);
    const u = clamp((t - A_END) / (B_END - A_END));
    const sink = SINK * ease.inQuad(u) * 0.65 + SINK * u * 0.35;
    pos.y -= sink;
    return { pitch: THREE.MathUtils.degToRad(-84), focal: (F0 * (D_REF - sink)) / D_REF, amp: 1.1, focus: D_REF - sink };
  }

  return {
    scene,
    camera,
    clearColor: U.uFogCol.value, // the void past the last floor is haze, not black
    update(t) {
      const p = pose(t);
      setLens(camera, p.focal);
      const dir = new THREE.Vector3(0, Math.sin(p.pitch), Math.cos(p.pitch));
      // a slow yaw drift keeps the vanishing point from sitting dead centre
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-4 + 2.5 * invLerp(0, B_END, t)));
      target.copy(pos).add(dir);
      aim(camera, pos, target, { roll: THREE.MathUtils.degToRad(1.2), shake: handheld(t, { amp: p.amp, seed: 6 }) });
      lib.update(camera);
      U.uTime.value = t;
    },
    post: (t) => ({
      exposure: 1.3,
      whiteBalance: { temperature: 0.05, tint: 0.01 },
      bloom: { strength: 0.06 },
      halation: { strength: 0.32, threshold: 0.8 },
      vignette: { strength: 0.62, power: 2.0 },
      dof: { focus: pose(t).focus, fstop: 2.8, maxBlur: 0.01 },
      grade: {
        contrast: 1.15,
        saturation: 1.0,
        shadowTint: [-0.011, -0.003, 0.015],
        highlightTint: [0.03, 0.012, -0.02],
        blackPoint: 0.003,
      },
    }),
  };
}
