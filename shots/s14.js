// s14 · 0:39–0:45 · 灯塔现身·黑边打开 (global 936–1079)
// The lighthouse appears. On the tutti we cut from the radar to the lighthouse itself, seen level from
// the gallery of its floor: the lantern in the middle of the frame, a brass dome over diamond-leaded
// glass, and in it the lens, whose concentric rings are the radar arcs of the AIGCNEWS mark. The sheet
// turns on as it did on the radar, a turn a bar. The frame opens from 2.39 to 16:9 in the first 1.75 s
// while the camera rises and pushes in over the balustrade, which sinks out of the frame: we leave the
// gallery for the shaft. Where the sheet passes, the falling pages stop in the air; most of them stay
// grey, lit as it crosses them and fading after, and a few, all GitHub pages, catch lime and stay lit.
// The light wheels round the shaft: the galleries on the right, then across the camera (the lens
// flashes and the air glitters, at 1 s and again at 5 s), the left, the far side behind the lantern
// (which stands black against it), the right again. The lighthouse's portholes slowly come on as it
// wakes.
// First frame: in 2.39, the lantern in the middle of the frame behind the balustrade, the sheet pointing
// right, the galleries on the right lit and fading towards the far side, s13's pages in the air.
// Last frame: 16:9, the lantern and the top of its tower large in the middle of the frame, the sheet
// pointing left through a field of frozen pages, grey and lime. s15 cuts closer.
// Camera: on the bearing of the middle of a side of the shaft (270°), 18.5 → 14 m from the axis and
// 1.9 → 3.2 m above floor −100's deck in one smoothstep over the shot, 20 mm, aimed at the lantern
// (3 m above the lighthouse's deck), so the sheet crosses the camera at 1 s and 5 s.
// Light: the lighthouse only, as in s13: every lamp of the library out, the air black. The sheet is a
// paler lime than on the radar so the books keep their colours, and the lighthouse is seen by the
// light the galleries give back (bounce). The lamp carries a faint lime streak; on each flash the
// exposure, bloom and halation rise for a few frames (flashcheck: the largest change is a sixth of the
// picture). Dust only glitters in the sheet and its afterglow.
// Sound: see CUES (s into the shot; global frame = 936 + 24 t).
import * as THREE from 'three';
import { setLens, aim } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { Library } from 'world/library.js';
import { Lighthouse, LH } from 'world/lighthouse.js';
import { Pages, fall } from 'world/pages.js';
import { Dust } from 'world/dust.js';
import { pageAtlas } from 'world/pageatlas.js';
import { SWEEP, sweepAngle, sweepSpeed, FIELD, T_OFF, LEAVES, freezePlan, limeAt, heroState, Y0, FLOOR } from './s13.js';

export const meta = {
  frames: 144,
  quality: { final: { samples: 8 } },
  // the lamp core, the film's first point-light hero: a faint streak (a lower threshold catches its
  // whole halo and draws a bar)
  post: { streak: { strength: 0.4, threshold: 20, tint: [0.85, 1.0, 0.55], length: 0.2, decay: 0.8 } },
};

const DEG = Math.PI / 180;
const T0 = 4; // the sweep's clock (s since global 840) at this shot's first frame
const END = T0 + meta.frames / 24;
const LAMP = Y0 + LH.LAMP_Y;

export const CAM = { bearing: 270 * DEG, r0: 18.5, r1: 14.0, h0: 1.9, h1: 3.2, lens: 20, look: 3.0 };

const BEAM = 1.0; // the sheet, brighter than on the radar: here it lights the galleries we see
const VOL = 0.06; // the sheet in the air
const TRAIL = 0.6; // afterglow at full speed…
const PERSIST = 0.35; // …and its time to 1/e (s), as in s13
// the sheet's colour on the galleries (paler than s13's lime, which painted the books olive), the
// galleries' light given back to the lighthouse, the dust's glitter (BIBLE §4.4: 30000 motes at 13
// made a starfield of the afterglow; 12000 at 9 glitter only where the sheet is)
export const LOOK = { beamCol: [0.86, 1.0, 0.5], bounce: 2.5, dust: 9, motes: 12000 };
// the flash as the sheet crosses the camera: a fast attack, a slower fall (s), and how far the
// exposure (EV), bloom and halation rise at its peak
export const FLASH = { attack: 0.04, decay: 0.15, exposure: 0.35, bloom: 0.5, halation: 0.4 };

// the flash at T: 1 as the sheet crosses the camera's bearing
export function flashAt(T, bearing = CAM.bearing) {
  let da = (sweepAngle(T) - bearing) % (2 * Math.PI);
  if (da > Math.PI) da -= 2 * Math.PI;
  if (da < -Math.PI) da += 2 * Math.PI;
  const dt = da / Math.max(sweepSpeed(T), 1e-3);
  return dt < 0 ? Math.exp(-((dt / FLASH.attack) ** 2)) : Math.exp(-dt / FLASH.decay);
}

export function sheetAt(T, t) {
  const w = sweepSpeed(T);
  return {
    angle: sweepAngle(T),
    lamp: 1,
    glow: 1,
    beam: BEAM,
    vol: VOL,
    trail: TRAIL * (w / SWEEP.omega),
    trailLen: Math.max(0.05, w * PERSIST),
    trailArc: sweepAngle(T) - SWEEP.theta0,
    dot: 1,
    windows: smoothstep(0.5, 5, t),
    fanUp: SWEEP.fan.up,
    fanDn: SWEEP.fan.dn,
    halo: 1,
    bounce: LOOK.bounce,
  };
}

export async function setup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 600);
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

  const atlas = await pageAtlas({ scale: 2, seed: 1, anisotropy: 8 });
  const leaves = new Pages({ uniforms: U, atlas, count: LEAVES + 1 });
  scene.add(leaves.mesh);
  const dust = new Dust({ uniforms: U, count: LOOK.motes, box: 18, seed: 14 });
  scene.add(dust.points);
  const P = freezePlan(END + 0.05);
  const motion = (i, T, sh, st) => {
    if (i === LEAVES) return heroState(T, st);
    if (P.drop[i]) {
      st.visible = false;
      return;
    }
    const frozen = T >= P.tc[i];
    fall(i, (frozen ? P.tc[i] : T) + T_OFF, FIELD, st);
    if (frozen && P.lime[i]) st.lime = limeAt(T - P.tc[i]);
    const e = (st.y - LAMP) / Math.hypot(st.x, st.z);
    if (!frozen && (e > sh.fanUp + 0.05 || e < -sh.fanDn - 0.05)) st.visible = false;
  };

  const grade = (await ctx.load.json('/film/timeline.json')).grades.act2; // the flash rises from the act's grade
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update(t) {
      const T = T0 + t;
      const u = smoothstep(0, meta.frames / 24, t);
      const r = lerp(CAM.r0, CAM.r1, u);
      pos.set(Math.cos(CAM.bearing) * r, Y0 + lerp(CAM.h0, CAM.h1, u), Math.sin(CAM.bearing) * r);
      target.set(0, Y0 + CAM.look, 0);
      setLens(camera, CAM.lens);
      aim(camera, pos, target);
      lib.update(camera);
      U.uTime.value = 44 + t;
      const sh = sheetAt(T, t);
      lh.set(sh);
      lh.update(camera);
      leaves.fill(LEAVES + 1, T, motion, sh);
      dust.update(camera, 44 + t, { focus: r, fstop: 4, width: ctx.width, intensity: LOOK.dust });
    },
    post(t) {
      const f = flashAt(T0 + t);
      if (f < 1e-4) return null;
      return {
        exposure: grade.exposure + FLASH.exposure * f,
        bloom: { strength: grade.bloom.strength + FLASH.bloom * f },
        halation: { strength: grade.halation.strength + FLASH.halation * f },
      };
    },
  };
}

// Sound cues, s into the shot (global frame = 936 + 24 t).
export const CUES = {
  tutti: { t: 0 }, // the organ's D minor tutti and the choir land on the cut
  bars: { t0: 0, t1: 1.75 }, // the frame opens from 2.39 to 16:9 (global 936 → 978)
  // the sheet crossing the camera: the lens flashes
  get flashes() {
    const out = [];
    for (let f = 0; f < meta.frames; f++) {
      const a = flashAt(T0 + f / 24);
      if (a > 0.5 && a >= flashAt(T0 + (f - 1) / 24) && a > flashAt(T0 + (f + 1) / 24)) out.push(+(f / 24).toFixed(3));
    }
    return out;
  },
  windows: { t0: 0.5, t1: 5 }, // the portholes come on
  // each leaf the sheet finds in this shot: when, where across the frame (pan: −1 left, +1 right; the
  // frame's right is the world's −x), whether it is in front of the lighthouse, and whether it catches
  get blips() {
    const P = freezePlan(END + 0.05);
    const st = { q: new THREE.Quaternion() };
    const out = [];
    for (let i = 0; i < LEAVES; i++) {
      if (!(P.tc[i] >= T0 && P.tc[i] < END)) continue;
      fall(i, P.tc[i] + T_OFF, FIELD, st);
      out.push({ t: +(P.tc[i] - T0).toFixed(3), pan: +clamp(-st.x / 12, -1, 1).toFixed(2), near: st.z < 0, lime: !!P.lime[i] });
    }
    return out.sort((a, b) => a.t - b.t);
  },
};
