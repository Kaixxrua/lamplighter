// s16 · 0:51–0:55 · 透镜 (global 1224–1319)
// The lens. We cut inside the lantern, close on the face of the lens where the bar of the AIGCNEWS
// mark crosses its centre: a prism of dark glass on dark bronze. The radar's ping starts, a beat a
// second, and on each a pulse of lime light runs out from the centre of the lens through the glass, a
// sharp front and a softer wake. A range scale is etched along the bar's ridge, a rule graduated about
// every centimetre, and shows where light runs in the glass: the first pulse shows it in passing; the
// second writes it, the frosted graduations catching the light and keeping it (lit outward from 1.04 s
// to 1.46 s, and so to the cut); the last two run through it. No words: the film carries no credits.
// First frame: black, the bar on the diagonal, its inner end in the middle of the frame, the first
// pulse a point of light at the lens's centre. Last frame: the bar level across the middle of the
// frame, the scale lit on it, the bronze dark around it. s17 cuts out wide.
// Camera: rides the carriage, 0.5 → 0.85 m from the face of the lens and 10–15° off its axis (off the
// beam the lens is dark): it pulls back from the centre to the middle of the scale, rolling the bar
// from the diagonal to level, in one smoothstep over 3 s, drifting in all the while; 24 mm.
// Light: the lamp is behind the lens. We see the galleries' afterglow in the bronze, a faint glow in
// the glass and the pulses. No halo: the lamp's haze would veil the lens from in front of it. Close up
// the bronze shows how it was made, the boss turned on a lathe and the plate cast, and the graduations
// show the grain of their frosting.
// Sound: see CUES (s into the shot; global frame = 1224 + 24 t).
import * as THREE from 'three';
import { setLens, aim, focusDistance } from 'film/lib/camera.js';
import { lerp, smoothstep } from 'film/lib/ease.js';
import { makeCanvas, canvasTexture } from 'film/lib/text.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH, LOGO } from 'world/lighthouse.js';
import { Pages, fall } from 'world/pages.js';
import { Dust } from 'world/dust.js';
import { pageAtlas } from 'world/pageatlas.js';
import { FIELD, T_OFF, LEAVES, freezePlan, limeAt, heroState, Y0, FLOOR } from './s13.js';
import { LOOK, sheetAt } from './s14.js';
import { takenPages } from './s15.js';

export const meta = { frames: 96, quality: { final: { samples: 8 } } };

const T0 = 16; // the sweep's clock at this shot's first frame
const END = T0 + meta.frames / 24;
const LAMP = Y0 + LH.LAMP_Y;
const BAR_LEN = LOGO.BAR_B - LOGO.BAR_A;
// a point on the bar's ridge, s m along it from its inner end, in the lens frame (u, v, h)
const onBar = (s, h = 0.02) => {
  const a = (LOGO.BAR_A + s) * Math.SQRT1_2;
  return [a, a, h];
};

// The camera rides the carriage. Positions in the lens frame: u right and v up as the logo reads, h
// out of the lens (m from lh.lensFrame().center).
export const CAM = {
  from: { at: [0.18, -0.05, 0.5], look: onBar(0.2), lens: 24 },
  to: { at: [0.42, 0.3, 0.9], look: onBar(0.53), lens: 24 },
  roll: 1, // share of the roll that lays the bar level, at the end
  move: [0, 3],
  creep: 0.012, // and all the while it drifts in (m/s), so the hold is not dead
  fstop: 4,
};
export const LOOK16 = { glow: 0.035, bounce: 0.8, etch: 0.6 };
// One ping a second from the cut (global 1224, 1248, 1272, 1296): a pulse of light runs out from the
// lens centre through the bar and the rings (m/s, m wide), fading as it goes (s to 1/e). The second
// writes the scale: the graduations it crosses catch the light and keep it.
export const PING = { at: [0, 1, 2, 3], speed: 1.6, width: 0.08, light: [0.9, 1.4, 0.6, 0.6], fade: 1, glass: 0.25, writes: 1, edge: 0.03 };
function pingAt(t) {
  let k = -1;
  for (let i = 0; i < PING.at.length; i++) if (t >= PING.at[i]) k = i;
  if (k < 0) return [0, PING.width, 0, 0];
  const age = t - PING.at[k];
  return [PING.speed * age, PING.width, PING.light[k] * Math.exp(-age / PING.fade), PING.glass];
}
// how far from the lens centre the scale is lit
const litTo = (t) => (t < PING.at[PING.writes] ? -1 : PING.speed * (t - PING.at[PING.writes]));

// how far from the lens centre the scale reaches (m): the etching is laid out to fill exactly this
const SCALE_RHO = [0.06, 0.737];

// the range scale etched along the bar's ridge, as a texture along the bar (x from its inner end) and
// across it (y; the top of the canvas is up when the bar lies level): a rule with N graduations rising
// from it, longer every fifth and tenth, the whole centred on the ridge, where the bar carries its light
function etching() {
  const W = 4096;
  const ppm = W / BAR_LEN;
  const H = Math.round(LOGO.BAR_W * ppm);
  const m = (v) => v * ppm;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  const N = 70;
  const tick = [0.01, 0.016, 0.026]; // heights (m): a graduation, every fifth, every tenth
  const weight = [0.0018, 0.0018, 0.0024]; // and their widths; the rule is as heavy as a tenth
  const rule = weight[2];
  const half = (tick[2] + rule / 2) / 2; // half the scale's height
  const y0 = H / 2 + m(half - rule / 2); // the rule's centre line (canvas y runs down)
  // the outermost ink of the first and last tenths sits at SCALE_RHO from the lens centre
  const a0 = SCALE_RHO[0] + rule / 2 - LOGO.BAR_A;
  const a1 = Math.sqrt(SCALE_RHO[1] ** 2 - half ** 2) - rule / 2 - LOGO.BAR_A;
  const step = (a1 - a0) / N;
  ctx.fillRect(m(a0), y0 - m(rule / 2), m(a1 - a0), m(rule));
  for (let k = 0; k <= N; k++) {
    const i = k % 10 === 0 ? 2 : k % 5 === 0 ? 1 : 0;
    ctx.fillRect(m(a0 + k * step - weight[i] / 2), y0 - m(tick[i]), m(weight[i]), m(tick[i]));
  }
  return canvasTexture(cv, { srgb: false, mipmaps: true, anisotropy: 8 });
}

function lensPoint(F, [u, v, h], out) {
  return out.copy(F.center).addScaledVector(F.right, u).addScaledVector(F.up, v).addScaledVector(F.normal, h);
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 600);
  const lib = new Library({ floors: [FLOOR - 8, FLOOR + 8], near: 2, mid: 8, height: ctx.height });
  scene.add(lib.group);
  lib.setAll(() => ({ lit: 0, lime: 0, lamp: 0 }));
  const U = lib.uniforms;
  U.uFogD.value = 0.009;
  U.uFogCol.value.setRGB(0, 0, 0);
  U.uAmb.value.setRGB(0, 0, 0);
  U.uBeamCol.value.setRGB(...LOOK.beamCol);

  const lh = new Lighthouse({ uniforms: U, y0: Y0 });
  scene.add(lh.group);
  lh.engrave(etching());

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES + 1 });
  scene.add(leaves.mesh);
  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 14 });
  scene.add(dust.points);

  const P = freezePlan(END + 0.05);
  const taken = takenPages();
  const motion = (i, T, sh, st) => {
    if (taken.has(i) || (i < LEAVES && P.drop[i])) {
      st.visible = false;
      return;
    }
    if (i === LEAVES) return heroState(T, st);
    const frozen = T >= P.tc[i];
    fall(i, (frozen ? P.tc[i] : T) + T_OFF, FIELD, st);
    if (frozen && P.lime[i]) st.lime = limeAt(T - P.tc[i]);
    const e = (st.y - LAMP) / Math.hypot(st.x, st.z);
    if (!frozen && (e > sh.fanUp + 0.05 || e < -sh.fanDn - 0.05)) st.visible = false;
  };

  // the roll that lays the bar level, seen from where the move ends
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const levelRoll = (() => {
    lh.set({ angle: 0 });
    const F = lh.lensFrame();
    const [u, v, h] = CAM.to.at;
    setLens(camera, CAM.to.lens);
    aim(camera, lensPoint(F, [u, v, h - CAM.creep * CAM.move[1]], pos), lensPoint(F, CAM.to.look, target));
    const a = lensPoint(F, onBar(0), new THREE.Vector3()).project(camera);
    const b = lensPoint(F, onBar(BAR_LEN), new THREE.Vector3()).project(camera);
    return Math.atan2(b.y - a.y, (b.x - a.x) * camera.aspect);
  })();

  const at = [0, 0, 0];
  const look = [0, 0, 0];
  let roll = 0;
  const camAt = (t, F) => {
    const u = smoothstep(CAM.move[0], CAM.move[1], t);
    for (let k = 0; k < 3; k++) {
      at[k] = lerp(CAM.from.at[k], CAM.to.at[k], u);
      look[k] = lerp(CAM.from.look[k], CAM.to.look[k], u);
    }
    at[2] -= CAM.creep * t;
    roll = levelRoll * CAM.roll * u;
    setLens(camera, lerp(CAM.from.lens, CAM.to.lens, u));
    aim(camera, lensPoint(F, at, pos), lensPoint(F, look, target), { roll });
  };

  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      const sh = sheetAt(T, T - 4);
      sh.windows = 0;
      sh.glow = LOOK16.glow;
      sh.bounce = LOOK16.bounce;
      sh.halo = 0; // the lamp is behind the lens: no haze inside the lantern
      sh.etch = [LOOK16.etch, litTo(t), PING.edge];
      sh.ping = pingAt(t);
      lh.set(sh);
      camAt(t, lh.lensFrame());
      lib.update(camera);
      U.uTime.value = 54 + t;
      lh.update(camera);
      leaves.fill(LEAVES + 1, T, motion, sh);
      dust.update(camera, 54 + t, { focus: focusDistance(camera, target), fstop: CAM.fstop, width: ctx.width, intensity: LOOK.dust });
    },
    post: () => ({ dof: { focus: focusDistance(camera, target), fstop: CAM.fstop } }),
  };
}

// Sound cues, s into the shot (global frame = 1224 + 24 t).
export const CUES = {
  cut: { t: 0 }, // the first ping lands on the cut
  pings: PING.at, // the radar's ping, a beat a second (global 1224, 1248, 1272, 1296): each sends out a pulse
  // when each pulse's front crosses the scale: the first shows it in passing, the second writes it
  // (its graduations light and stay lit), the last two run through it
  get crosses() {
    return PING.at.map((a) => SCALE_RHO.map((r) => +(a + r / PING.speed).toFixed(2)));
  },
  roll: { t0: CAM.move[0], t1: CAM.move[1] }, // the camera pulls back and rolls the bar level
};
