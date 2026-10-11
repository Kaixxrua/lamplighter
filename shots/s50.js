// s50 — The easter egg (act IV, 4 s, global 5640–5735): the film's last shot.
//
// Black, after the statement. Close by, in the dark, a page is turned (the film began this way, s01:
// black, a page turned close to the ear). A book lies open on the rail of the Library's well, the lens
// just above its gutter, looking across the well. The leaf is lifted in the dark; as the picture comes up
// it stands between us and the only light there is, far off, and glows with it: paper, the lines of its
// other side showing through. It hesitates at the top, tips over and falls away from us, its free edge
// trailing, the last of it to leave the light; and where it stood is what the light was: across the well,
// thirty metres off, a vestibule with one lamp left burning in it (card 7: it leaves a light on for the
// next reader). Every other lamp of the Library is out. The focus leaves the paper for the lamp.
// Then, in the dark of the little arch at the back of that vestibule, a point of steel blue kindles and
// comes in under the lamp: the next reader (the machine readers' colour, act III). It pings once, very far
// away: the point flares, and a ring of its cold light runs out over the walls, reading the room. The
// film ends on it, with no fade: the lamp that was left, and the one it was left for.
//
// The vestibule, its lamp and the point are world/f_vest.js's (the Library's own geometry under a material
// that draws no lettering: the Library class and its inscription band are never built). The leaves are
// world/pages.js's, lit by a key where the lamp hangs; the only faces that show are the atlas's `babel`
// (the standing leaf) and `zh-classical` (its other side, and the leaf under it).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, smoothstep, smootherstep } from 'film/lib/ease.js';
import { libraryUniforms } from 'world/libshader.js';
import { Pages, leafState, PAGE } from 'world/pages.js';
import { pageAtlas, DESIGNS } from 'world/pageatlas.js';
import { Vestibule, VEST, LAMP } from 'world/f_vest.js';
import { NEUTRAL } from './s48.js';
import { LOOK } from './s44.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };

const DEG = Math.PI / 180;
const W = PAGE.W;

// The lens: on side 4's gallery, just behind its rail and a hand above the book, level and locked off,
// looking across the well into side 1's doorway.
export const CAM = { pos: [0, 1.18, -12.62], at: [0, 2.76, VEST.af], lens: 24 };

// The book on the rail: its gutter along x. A leaf's shape is the angle of its tangent at the gutter and
// at its free edge (degrees about the gutter: 0 flat toward the lens, 90 upright, 180 flat away); at
// rest it arches up out of the gutter and down to its edge, on either side.
export const BOOK = { spine: [0, 1.1, -12.21], near: [12, -6], far: [168, 186] };

// The turn. The leaf is lifted off the near side (a hand's work, in the dark: lift, s) and let go at
// `top` degrees still rising at `w1` degrees/s, just enough to carry it over; from there it is a leaf
// hinged at the gutter under gravity (A = 3g/2W), the air's drag (D) and the cushion of air it lands on
// (K, g0), and it stops on the far side. Its free edge follows the gutter's angle through the paper's
// droop under its own weight (B degrees when it lies flat), held back by the air (c·w², at most lagMax),
// with a lag of tau s.
export const TURN = { lift: [0, 0.36], top: 86, w1: 38, A: 49, D: 2.4, K: 1.2, g0: 0.12, B: 18.4, c: 0.05, lagMax: 35, tau: 0.08, twist: 0.55, ripple: 0.004 };

const STEP = 1 / 1920;
const TRAJ = (() => {
  const n = Math.ceil(4.25 / STEP) + 2;
  const A = new Float64Array(n);
  const F = new Float64Array(n);
  const [T0, T1] = TURN.lift;
  const d = T1 - T0;
  const rest = BOOK.near[0];
  const stop = BOOK.far[0] * DEG;
  let a = rest * DEG;
  let w = 0;
  let f = BOOK.near[1] * DEG;
  let lift = null;
  let land = null;
  for (let i = 0; i < n; i++) {
    A[i] = a;
    F[i] = f;
    const t1 = (i + 1) * STEP;
    if (t1 > T0 && t1 <= T1) {
      const u = (t1 - T0) / d;
      a = (rest + (TURN.top - rest) * (3 * u * u - 2 * u * u * u) + TURN.w1 * d * (u * u * u - u * u)) * DEG;
      w = (((TURN.top - rest) * (6 * u - 6 * u * u)) / d + TURN.w1 * (3 * u * u - 2 * u)) * DEG;
      if (lift === null) lift = i * STEP;
    } else if (t1 > T1 && a < stop) {
      w += STEP * (-TURN.A * Math.cos(a) - TURN.D * w * Math.abs(w) - (TURN.K * w) / (stop - a + TURN.g0) ** 2);
      a += STEP * w;
      if (a >= stop) {
        a = stop;
        w = 0;
        land = t1;
      }
    }
    const held = Math.min(TURN.c * w * w, TURN.lagMax * DEG) * Math.sign(w);
    f += (STEP * (a - TURN.B * DEG * Math.cos(a) - held - f)) / TURN.tau;
  }
  return { A, F, n, lift, land };
})();

// the leaf at t: the tangent's angle at the gutter and at the free edge (radians)
export function turnAt(t) {
  const x = clamp(t / STEP, 0, TRAJ.n - 1.001);
  const i = Math.floor(x);
  const k = x - i;
  return [TRAJ.A[i] + (TRAJ.A[i + 1] - TRAJ.A[i]) * k, TRAJ.F[i] + (TRAJ.F[i + 1] - TRAJ.F[i]) * k];
}

// Light, in the Library's law (radiance = albedo × I·cos/d²; its own lamps are 14). lamp: the one left
// burning, dim; globe, haze: what the lens sees of it; bounce: what the vestibule's walls hand on, as a
// share of the lamp. key: the same lamp on the paper, 33 m away, which no lamp this dim would reach: the
// film's licence, as s01's reader's lamp was; flag: the share of it the near leaf gets (the foreground is
// kept down, as a flag would keep it on a set). dot: the point's light on the room; core, halo: the point
// itself (the core is the palette's steel, a third of the way to white, and never clips).
export const LIGHT = { lamp: 2.5, col: [1.0, 0.62, 0.3], globe: 0.22, haze: 0.05, hazeR: 0.25, bounce: 0.02, key: 1000, flag: 0.4, dot: 2.0, dotBounce: 0.02, core: 1.65, white: 0.3, sig: 0.025, halo: 0.35, haloR: 0.12 };

// The point: it kindles at `at` in the passage behind the little arch (z[0]) and comes through into the
// vestibule, slowing (to z[1], over `drift` s), at head height, bobbing a centimetre.
export const DOT = { at: 2.2, rise: 0.45, y: 1.6, z: [VEST.a1 + 0.3, VEST.a1 - 1.1], drift: 2.4, bob: [0.012, 0.55] };
// The ping: the point flares (its core by `core`, its halo by `halo`, the light it casts by `light`, up in
// `attack` s and dying over T s), and from where it is a shell of its light runs out at `speed` m/s,
// `gain` times the point's own, each surface lit as the shell passes and dark again `decay` s later.
export const PING = { at: 2.8, attack: 0.04, T: 0.28, core: 0.38, halo: 2.2, light: 1.0, gain: 7, speed: 6, decay: 0.1 };

// The focus: just behind the standing leaf (it is soft, as s01's page was, its other side's lines blurred
// past reading), then pulled (in dioptres) to the lamp.
export const FOCUS = { near: 0.75, far: 33.3, pull: [1.15, 1.9], fstop: 2.8, maxBlur: 0.012 };
export const FADE = [0.1, 0.7]; // up from black; the film does not fade out

// Local seconds. page: the leaf leaves the near side, and lies down on the far side (its free edge
// settles some 0.25 s after); dot: the point kindles; ping: it pings.
export const CUES = { page: [0, 1.38], dot: 2.2, ping: 2.8 };

function dotPos(t, out) {
  const td = Math.max(t - DOT.at, 0);
  const u = clamp(td / DOT.drift);
  return out.set(0, DOT.y + DOT.bob[0] * Math.sin(2 * Math.PI * DOT.bob[1] * td), DOT.z[0] + (DOT.z[1] - DOT.z[0]) * (1 - (1 - u) ** 3));
}
const PING_AT = dotPos(PING.at, new THREE.Vector3());

// everything that moves, at t
export function stateAt(t) {
  const tp = t - PING.at;
  return {
    turn: turnAt(t),
    level: smoothstep(DOT.at, DOT.at + DOT.rise, t),
    flare: tp >= 0 ? smoothstep(0, PING.attack, tp) * Math.exp(-Math.max(tp - PING.attack, 0) / PING.T) : 0,
    wave: tp,
    focus: 1 / (1 / FOCUS.near + (1 / FOCUS.far - 1 / FOCUS.near) * smootherstep(FOCUS.pull[0], FOCUS.pull[1], t)),
    fade: 1 - smoothstep(FADE[0], FADE[1], t),
  };
}

// The cues recomputed from the motion itself (got) against CUES (want); bad lists what is off by more
// than 0.01 s. Pure: setup runs it, and so can Node.
export function checkCues() {
  const first = (on) => {
    let a = 0;
    let b = 4;
    while (b - a > 5e-4) {
      const m = (a + b) / 2;
      if (on(stateAt(m))) b = m;
      else a = m;
    }
    return +((a + b) / 2).toFixed(3);
  };
  const got = {
    page: [+TRAJ.lift.toFixed(3), +TRAJ.land.toFixed(3)],
    dot: first((s) => s.level > 0),
    ping: first((s) => s.wave >= 0),
  };
  const want = { page: CUES.page, dot: CUES.dot, ping: CUES.ping };
  const bad = [];
  for (const k of ['dot', 'ping']) if (Math.abs(got[k] - want[k]) > 0.01) bad.push(`${k} want ${want[k]} got ${got[k]}`);
  got.page.forEach((v, i) => {
    if (Math.abs(v - want.page[i]) > 0.01) bad.push(`page[${i}] want ${want.page[i]} got ${v}`);
  });
  return { got, want, bad };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.05, 90);
  setLens(camera, CAM.lens);
  aim(camera, new THREE.Vector3(...CAM.pos), new THREE.Vector3(...CAM.at));

  const lampCol = new THREE.Color(...LIGHT.col);
  const vest = new Vestibule({ lampCol });
  scene.add(vest.group);

  const U = libraryUniforms();
  U.uLampI.value = 0; // no lamp of the Library's is lit: the leaves take the key alone
  U.uFogD.value = 0;
  U.uAmb.value.setRGB(0, 0, 0);
  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  // two meshes for the key's sake: the turning leaf and the far side's, and the near leaf under our nose,
  // which takes less of it (flagged, as a lamp would be on a set: it is the foreground, not the subject)
  const pages = new Pages({ uniforms: U, atlas, count: 2, seg: [40, 48] });
  const under = new Pages({ uniforms: U, atlas, count: 1, seg: [40, 48] });
  for (const [P, k] of [[pages, 1], [under, LIGHT.flag]]) {
    scene.add(P.mesh);
    P.uniforms.uKeyPos.value.set(LAMP.x, LAMP.y, LAMP.z);
    P.uniforms.uKeyCol.value.copy(lampCol).multiplyScalar(LIGHT.key * k);
    P.uniforms.uKeyR.value = LAMP.r;
  }

  // A leaf by its two angles: bent evenly between them (pages.js bends a leaf about its middle), turned
  // about the gutter and hung from it by its hinge edge. Lying toward the lens (angle 0) its width runs
  // to −z, its height along x and its front face is down: upright, the front faces the lens.
  const st = leafState();
  const spine = new THREE.Vector3(...BOOK.spine);
  const X = new THREE.Vector3(1, 0, 0);
  const Q0 = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)),
  );
  const q = new THREE.Quaternion();
  const L = new THREE.Vector3();
  const babel = DESIGNS.indexOf('babel'); // its reverse is zh-classical
  function leaf(P, i, ah, af, lift, seed, twist = 0, ripple = 0) {
    const ac = (ah + af) / 2;
    const kb = (ah - af) / W;
    if (Math.abs(kb) > 1e-3) L.set(-Math.sin((kb * W) / 2) / kb, 0, (1 - Math.cos((kb * W) / 2)) / kb);
    else L.set(-W / 2, 0, 0);
    q.setFromAxisAngle(X, ac).multiply(Q0);
    L.applyQuaternion(q);
    st.visible = true;
    st.x = spine.x - L.x;
    st.y = spine.y + lift - L.y;
    st.z = spine.z - L.z;
    st.q.copy(q);
    st.scale = 1;
    st.bend = kb;
    st.twist = twist;
    st.curl = 0;
    st.ripple = ripple;
    st.phase = ac * 3;
    st.design = babel;
    st.seed = seed;
    st.lime = st.glow = st.burn = 0;
    P.set(i, st);
  }

  // keep the plan honest: the motion against the cues
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s50] CUES off: ${cc.bad.join('; ')}`);

  const dot = new THREE.Vector3();
  const s0 = Math.sin(BOOK.near[0] * DEG);
  // metres per pixel where the point is (the point is kept from going under a pixel)
  const pxM = (36 / CAM.lens) * dotPos(4, dot).distanceTo(camera.position) / ctx.width;

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    vest, // look-dev only
    pages,
    update(t) {
      const s = stateAt(t);
      leaf(pages, 0, BOOK.far[0] * DEG, BOOK.far[1] * DEG, -0.0015, 0.81); // the far side's top leaf, under the turned one
      leaf(under, 0, BOOK.near[0] * DEG, BOOK.near[1] * DEG, -0.0015, 0.52); // the leaf the turn uncovers
      const up = clamp((Math.sin(s.turn[0]) - s0) / (1 - s0)); // 0 lying on either side, 1 upright
      leaf(pages, 1, s.turn[0], s.turn[1], 0, 0.37, TURN.twist * up, TURN.ripple * up);
      pages.mesh.count = 2;
      pages.commit();
      under.mesh.count = 1;
      under.commit();
      dotPos(t, dot);
      vest.set({
        lamp: { i: LIGHT.lamp, globe: LIGHT.globe, haze: LIGHT.haze, hazeR: LIGHT.hazeR },
        bounce: { lamp: LIGHT.lamp * LIGHT.bounce, dot: LIGHT.dotBounce },
        dot: {
          p: dot,
          level: s.level,
          i: LIGHT.dot * (1 + PING.light * s.flare),
          core: LIGHT.core * (1 + PING.core * s.flare),
          white: LIGHT.white,
          sig: LIGHT.sig,
          halo: LIGHT.halo * (1 + PING.halo * s.flare),
          haloR: LIGHT.haloR,
          pxM,
        },
        wave: { p: PING_AT, t: s.wave, i: LIGHT.dot * PING.gain, speed: PING.speed, decay: PING.decay },
      });
    },
    post(t) {
      const s = stateAt(t);
      return {
        exposure: LOOK.exposure,
        grade: { shadowTint: NEUTRAL },
        bloom: { strength: 0.1 },
        halation: { strength: 0.14, threshold: 0.85 },
        dof: { focus: s.focus, fstop: FOCUS.fstop, maxBlur: FOCUS.maxBlur },
        fade: s.fade,
      };
    },
  };
}
