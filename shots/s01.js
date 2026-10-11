// s01 · 0:00–0:03 · 黑场·翻页 (global 0–71)
// Black. A book lies open in the dark, close to the lens; the only light is a reader's lamp beyond it,
// out of frame, low enough to graze the paper. One page lifts and turns over, and while it stands
// between the lamp and us it glows: warm paper, the lines of its reverse side showing through.
// Then it lies down and the dark closes again. Picture and sound share the turn (≈1.0–2.3 s).
// First frame: black (fade 1). Last frame: black. Cut to s02 (black under the epigraph card).
// Camera: fixed, (0.36, 0.17, 0.12) → (-0.12, 0.02, -0.08), 32 mm, focus on the page at mid-turn.
import * as THREE from 'three';
import { setLens, aim, handheld } from 'film/lib/camera.js';
import { ease, clamp, invLerp, lerp, smoothstep } from 'film/lib/ease.js';
import { libraryUniforms } from 'world/libshader.js';
import { Pages, leafState, PAGE } from 'world/pages.js';
import { pageAtlas, DESIGNS } from 'world/pageatlas.js';

export const meta = { frames: 72 };

const TURN0 = 0.95; // the page leaves the spread (s)
const TURN1 = 2.3; // it lies down on the left
const W = PAGE.W;
const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);
const Q_FLAT = new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2); // face up, top toward -z

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 50);
  const U = libraryUniforms();
  U.uLampI.value = 0; // no library: the only light is the reader's lamp
  U.uFogD.value = 0.0;
  U.uAmb.value.setRGB(0, 0, 0);
  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const pages = new Pages({ uniforms: U, atlas, count: 8, seg: [40, 48] });
  scene.add(pages.mesh);
  const P = pages.uniforms;
  P.uKeyPos.value.set(-1.0, 0.018, -0.32); // at the paper's own height: the spread stays dark, a lifted page catches it
  P.uKeyCol.value.setRGB(1.0, 0.62, 0.3).multiplyScalar(3.6);
  P.uKeyR.value = 0.15;

  const st = leafState();
  const zc = -0.06; // page centre along the spine
  const design = (name) => DESIGNS.indexOf(name);
  const spine = new THREE.Vector3(0, 0.004, zc);
  const qa = new THREE.Quaternion();
  const L = new THREE.Vector3();

  // a flat leaf of the spread: x centre, a slight sag toward the gutter
  function flat(i, x, d, seed, y = 0) {
    st.visible = true;
    st.x = x;
    st.y = y;
    st.z = zc;
    st.q.copy(Q_FLAT);
    st.scale = 1;
    st.bend = x > 0 ? 1.1 : -1.1;
    st.twist = 0;
    st.curl = 0;
    st.ripple = 0;
    st.phase = 0;
    st.design = d;
    st.seed = seed;
    st.lime = st.glow = st.burn = 0;
    pages.set(i, st);
  }

  // the turning leaf: angle a (0 lying right, π lying left) about the spine, curling as it goes
  function turning(i, a, curl) {
    st.visible = true;
    const kb = curl;
    // left edge (the hinge) of the bent leaf in its own coordinates
    if (Math.abs(kb) > 1e-3) L.set(Math.sin((-kb * W) / 2) / kb, 0, (1 - Math.cos((kb * W) / 2)) / kb);
    else L.set(-W / 2, 0, 0);
    qa.setFromAxisAngle(Z, a).multiply(Q_FLAT);
    st.q.copy(qa);
    L.applyQuaternion(qa);
    st.x = spine.x - L.x;
    st.y = spine.y + 0.003 - L.y;
    st.z = spine.z - L.z;
    st.scale = 1;
    st.bend = kb;
    st.twist = 0.6 * Math.sin(a);
    st.curl = 0;
    st.ripple = 0.004 * Math.sin(a);
    st.phase = a * 3;
    st.design = design('manuscript');
    st.seed = 0.37;
    st.lime = st.glow = st.burn = 0;
    pages.set(i, st);
  }

  const pos = new THREE.Vector3(0.36, 0.17, 0.12);
  const target = new THREE.Vector3(-0.12, 0.02, -0.08);

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      setLens(camera, 32);
      aim(camera, pos, target, { shake: handheld(t, { amp: 0.25, seed: 1 }) });
      const u = clamp((t - TURN0) / (TURN1 - TURN0));
      const a = Math.PI * ease.inOutSine(u);
      // the free edge lags behind the hinge on the way up and overtakes it on the way down
      const curl = -9 * Math.sin(Math.PI * u) * (1 - 0.35 * u);
      flat(0, -W / 2, design('zh-classical'), 0.81, -0.001); // left page
      flat(1, W / 2, design('babel'), 0.52, -0.002); // the page the turning leaf uncovers
      turning(2, a, curl);
      pages.mesh.count = 3;
      pages.commit();
    },
    post: (t) => ({
      dof: { focus: 0.36, fstop: 2.0, maxBlur: 0.012 },
      // black in, black out; the turn itself rises out of the dark
      fade: 1 - smoothstep(0.2, 0.6, t) * (1 - smoothstep(2.6, 2.98, t)),
    }),
  };
}
