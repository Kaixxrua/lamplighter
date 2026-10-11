// s39 MCP 接入页 (the MCP page): global 3864–3959, 96 frames (4 s), 2:41–2:45, act 3 (its grade), lang.
//
// It opens on s38's last frame, square on the card, and goes over to the real MCP page inside itself (the
// engine has no dissolve across a cut): the page, printed light on a sheet of paper a hair in front of the
// card (c_sheet.js), comes up over the scene as the scene goes down under it, soft at first and sharp on
// the second beat (the card goes out sharp, the page comes in soft). The nine clients' boxes in its picker
// light one by one in reading order, a sixteenth apart (a lime outline and a light on the face), as the
// camera backs off to twice its distance, drifting right. Over the fifth beat the dsh page's sheet comes up
// into place over the page's lower half, bare; the dsh page develops on it, and its plugin card lights as
// it lands. Every word and number is the pages' own as captured 2026-10-08 (assets/ui/{zh,en}/s39-mcp.png
// and s39-dsh.png, tools/capture/, a guest's view): MCP 总调用次数 4,857, 支持客户端 9, 执行终端 3, 接入步骤
// 3; dsh 插件调用 839, 安装方式 2, VIP 24 小时额度 400, VIP 30 天额度 8,000. Nothing is added.
// Not printed (bare paper, in the texture too: trimPrint): the site's masthead with its date, and the
// footer and the dock (in en still Chinese, 未登录 among them). Held unreadable at HOLD whatever the framing
// (HELD; checked at 3840): the selected client's name on its chip and in the scope label, the MCP command
// and the side panel's heading; on the dsh page the GitHub mark in the second install method's chip. No
// logo is drawn.
//
// lang: the captures only (each page in its language, the boxes from each capture's own regions in
// assets/ui/manifest.json); the framing, the times and the light are the same in both.
//
// The first frame is s38's last (f143), for the cut: the camera square on the card, 1 m off it, at world
// (9.0067, 217.5500, 5.2000) looking at (8.1406, 217.5450, 4.7000) (in the card frame (0, 0, 1) to
// (0, -0.005, 0)), 40 mm, f/2, focused on the card's centre; the frame 0.898 m wide, 2156 of the MCP
// page's texels. Nothing of this shot's own is in it yet (the page comes in from 0.333 s). Mean luma (Rec.
// 709 of the sRGB values, of 255): 94.2 (zh) and 94.1 (en) in the 1920 keyframes (median 67; thirds 72.3 /
// 138.4 / 71.8 and 72.4 / 138.2 / 71.8; mean RGB (99, 93, 88)), as s38 f143's; 93.2 at 960 (preview; s38's
// preview there 93.3).
// Against s38 f143 at 1920 still quality it differs by the per-frame grain and jitter only (mean |diff|
// 3.5 of 255, the same histogram as s38's own f142 against f143).
// The last frame, for s40 (another place: nothing ties them in space): the camera square on the pages,
// 2.013 m off the card, at world (10.0456, 217.4925, 5.4266) looking at (8.3023, 217.4924, 4.4201) (in the
// card frame (0.3232, -0.0575, 2.0130) straight down its z), 40 mm, f/2, focused on the card's centre; the
// frame 1.81 m wide, 4344 texels. In it: the MCP page's top (its title, the intro, the picker with its nine
// clients lit, the stats 4,857 / 9 / 3 / 3); the dsh page over the rest (its title, the stats 839 / 2 /
// 400 / 8,000, the plugin card lit, the install methods, the command, the quota line, the side panel);
// bare paper under them in the bottom fifth; above the pages' top edge a band of the dark library, a lamp's
// bokeh on the right. The light: act III's library, the printed light (the paper warm after the grade:
// (221, 214, 203) at the frame's centre, (208, 200, 189) low down), the act's grade. Mean luma 140.1 (zh)
// and 139.7 (en) in the 1920 keyframes (median 185; thirds 98.9 / 176.2 / 145.1 and 99.0 / 176.1 / 143.9;
// mean RGB (145, 140, 128) and (145, 139, 128)); 139.3 and 139.0 at 960 (preview; median 182; thirds 98.6 /
// 175.4 / 144.2 and 98.8 / 175.4 / 143.2).
//
// Cues (CUES, s into the shot), on the 90 BPM grid counted from the cut (a beat 2/3 s, a sixteenth 1/6 s):
// cut 0; dissolve [0.333, 1.333] (f8–f32); clients[9] 1.333 … 2.667, a sixteenth apart (f32, f36 … f64);
// dsh 3.333 (f80: the dsh page at rest, its plugin card lit). setup recomputes them from the shot's own
// motion (checkCues) and warns if any is off.
import * as THREE from 'three';
import { aim, focusDistance } from 'film/lib/camera.js';
import { clamp, lerp, smoothstep } from 'film/lib/ease.js';
import { buildSheet, trimPrint, SHEET_LOOK } from 'world/c_sheet.js';
import { meta as meta38, setup as setup38, camAt, CAM38, FRAME38, W, LOOK38, KEY38 } from './s38.js';

// final: at least 8 samples, as s38; the engine adds more where the camera's backing off carries the
// picture further (one per 1.25 px at 1920, read off the sheets once they are whole)
export const meta = { frames: 96, quality: { final: { samples: 8 } } };
const DUR = meta.frames / 24;
const T0 = (meta38.frames - 1) / 24; // s38's clock at this shot's cut: its last frame

// The sheets (c_sheet.js), in s38's card frame (m), square to the card and a hair in front of it. Each is
// its capture's own rectangle, 3840 × 2160 texels at PAGE.S metres a texel (1.6 × 0.9 m), with the page's
// body printed on it (PAGE.print: under the masthead's rule, rows 95–102, and above the footer, from row
// 1988) and bare paper where the site's header and its footer and dock were, in the texture too
// (trimPrint): the date, the account and the dock's labels are not in the film. The MCP page: its texel
// PAGE.pin at the card's centre, so that s38's last frame, 2160 texels wide, has the page's left two thirds
// from the title to under the steps. The dsh page lies on it, its top edge DSH.gap texels under the client
// picker's box (the manifest's regions.clientPicker, with its shadow) and DSH.dx to the left: it covers the
// page from the command down.
export const PAGE = { S: 1.6 / 3840, size: [3840, 2160], pin: [1110, 701.5], print: [0, 110, 3840, 1984], z: 0.002 };
export const DSH = { dx: -64, gap: 12, shadow: 4, z: 0.004, rise: 140 };
// the MCP page's texel (x, y) in the card frame
export const pageAt = (x, y, z = PAGE.z, out = new THREE.Vector3()) => out.set((x - PAGE.pin[0]) * PAGE.S, (PAGE.pin[1] - y) * PAGE.S, z);

// Held unreadable whatever the framing ([x, y, w, h], texels; BIBLE §10 and the third parties' marks), at
// HOLD: the mip level s24–s26 hold their prints at (4.6 for a capture 7680 wide: a texel 6 CSS px). On the
// MCP page: the selected client's name on its chip, the same name in the scope label, the command (it names
// the client's executables) and the side panel's heading. On the dsh page: the mark in the second install
// method's chip.
const SIZE = PAGE.size;
export const HOLD = 4.6 - Math.log2(7680 / SIZE[0]);
export const HELD = {
  mcp: {
    zh: [[344, 413, 186, 32], [2748, 517, 180, 35], [84, 611, 2932, 148], [3116, 528, 572, 90]],
    en: [[427, 423, 186, 32], [2577, 527, 180, 35], [84, 622, 2932, 148], [3116, 542, 554, 132]],
  },
  dsh: { zh: [[749, 667, 41, 44]], en: [[1115, 715, 41, 44]] },
};

// Times (s), on the score's grid counted from the cut (90 BPM: a beat 2/3 s, a sixteenth 1/6 s). The scene
// goes over to the page (dissolve), the page coming into focus in its second half (develop: mip HOLD → 0,
// sharp as the first client lights: the card goes out sharp, the page comes in soft); the nine clients
// light a sixteenth apart from the second beat (clients); over the fifth beat the dsh sheet comes up into
// place (dsh: it comes in DSH.rise texels low and rises; fade: how long it takes to be whole, bare: it
// covers the MCP page's lower half before anything is printed on it) and its page develops on it (dshInk:
// the print from none to all, mip HOLD → 0), and the plugin's card lights as it lands.
export const T39 = {
  dissolve: [1 / 3, 4 / 3],
  develop: [0.6, 4 / 3],
  clients: { t0: 4 / 3, step: 1 / 6, n: 9 },
  dsh: [8 / 3, 10 / 3],
  fade: 0.25,
  dshInk: [2.75, 3.2],
};
export const clientT = (i) => T39.clients.t0 + i * T39.clients.step;

// Light (linear). The sheets: c_sheet's SHEET_LOOK but for the printed light (glow) and how much of the
// reader's light they take (reader, × s38's: the reader hangs by the page's left edge, and its steel on
// the whole of it would grey the paper). A box that lights (ring): it comes on over `attack` about its
// cue, at `hot`, and settles to `steady` (tau, s). The plugin's card, many times a client's box, takes
// less light on its face (plugin: over SHEET_LOOK.ring).
export const LOOK39 = {
  glow: 0.45,
  reader: 0.35,
  ring: { hot: 3, steady: 1, tau: 0.22, attack: 1 / 24 },
  plugin: { face: 0.07 },
};
// a box's light, dt after its cue
export const ringAt = (dt) => {
  const R = LOOK39.ring;
  return smoothstep(-R.attack / 2, R.attack / 2, dt) * (R.steady + (R.hot - R.steady) * Math.exp(-Math.max(dt, 0) / R.tau));
};

// The camera (card frame, m): s38's, still, square on the card 1 m off it (40 mm, f/2). From the dissolve's
// first frame it backs straight off, drifting right and a little down, square on all the way, to where the
// MCP page is whole in the frame with the dsh page on it (end: how many of the page's texels the last
// frame is wide, and the texel at its centre). It has not stopped at the cut (drift: its speed there, of
// the whole move a second).
export const CAM39 = { pull: [1 / 3, DUR], drift: 0.06, end: { w: 4350, at: [1888, 840] } };
const SENSOR = 36; // mm (setLens's)
const END = (() => {
  const { w, at } = CAM39.end;
  const look = pageAt(at[0], at[1], 0);
  const pos = look.clone().setZ(PAGE.z + (w * PAGE.S * CAM38.mm) / SENSOR);
  return { pos: pos.applyMatrix4(FRAME38), look: look.applyMatrix4(FRAME38) };
})();
// how far along its way the camera is at t, 0..1
export function pullAt(t) {
  const [a, b] = CAM39.pull;
  const s = clamp((t - a) / (b - a));
  return s * s * (3 - 2 * s) + (s * s * s - s * s) * (b - a) * CAM39.drift;
}
// where the camera is and looks at t (world)
export function camAt39(t, out = { pos: new THREE.Vector3(), look: new THREE.Vector3() }) {
  camAt(T0 + t, out);
  const u = pullAt(t);
  out.pos.lerp(END.pos, u);
  out.look.lerp(END.look, u);
  return out;
}

// how much of the MCP page is there at t (the dissolve); of the dsh page; how far under its place the dsh
// page is (texels: it rises as it comes and lands softly)
export const pageK = (t) => smoothstep(...T39.dissolve, t);
export const dshK = (t) => smoothstep(T39.dsh[0], T39.dsh[0] + T39.fade, t);
export const dshDrop = (t) => DSH.rise * (1 - clamp((t - T39.dsh[0]) / (T39.dsh[1] - T39.dsh[0]))) ** 3;

// Cue sheet (s into the shot; global frame = 3864 + 24 t). dissolve: from the scene to the page; clients:
// each of the nine as it lights, in the page's order (the manifest's regions.clients); dsh: the dsh page in
// its place, the plugin's card lighting.
const r3 = (x) => +x.toFixed(3);
export const CUES = {
  cut: 0,
  dissolve: T39.dissolve.map(r3),
  clients: Array.from({ length: T39.clients.n }, (_, i) => r3(clientT(i))),
  dsh: r3(T39.dsh[1]),
};

// The cues recomputed from the shot's own motion (got) against CUES (want): the page's first and its
// whole, each box at half its peak light, the dsh page come to rest.
export function checkCues() {
  const first = (f, a = 0, b = DUR) => {
    for (let t = a; t <= b + 1e-9; t += 1 / 480) if (f(t)) return r3(t);
    return null;
  };
  const peak = Math.max(...Array.from({ length: 97 }, (_, i) => ringAt((i - 48) / 960)));
  const got = {
    dissolve: [first((t) => pageK(t) > 0), first((t) => pageK(t) >= 1)],
    clients: CUES.clients.map((_, i) => first((t) => ringAt(t - clientT(i)) >= 0.5 * peak)),
    dsh: first((t) => dshDrop(t) === 0 && dshK(t) >= 1, T39.dsh[0]),
  };
  const bad = [];
  const near = (a, b) => a !== null && Math.abs(a - b) <= 1 / 240 + 1e-9;
  got.dissolve.forEach((g, i) => !near(g, CUES.dissolve[i]) && bad.push(`dissolve[${i}] ${g} vs ${CUES.dissolve[i]}`));
  got.clients.forEach((g, i) => !near(g, CUES.clients[i]) && bad.push(`clients[${i}] ${g} vs ${CUES.clients[i]}`));
  if (!near(got.dsh, CUES.dsh)) bad.push(`dsh ${got.dsh} vs ${CUES.dsh}`);
  return { got, want: CUES, bad };
}

// ---------------------------------------------------------------------------------------------- setup

// a capture not made yet (status planned in the manifest): the site's bare page, so the shot still runs
function blank(e) {
  console.warn(`[s39] ${e.name} (${e.lang}) is ${e.status} in manifest.json: a bare page stands in for it`);
  const t = new THREE.DataTexture(new Uint8Array([255, 254, 249, 255]), 1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export async function setup(ctx) {
  // s38 as it ends: its library, reader, dust, card and the light typed in the air, and its camera
  const s38 = await setup38(ctx);
  const { camera } = s38;
  const { frame, oframe, card, fields, rows, reader, lib, dust } = s38.parts;
  const U = lib.uniforms;
  const lang = ctx.lang;

  // the captures, by their names in manifest.json (in this language), and what it says of them
  const entries = (await ctx.load.json('/assets/ui/manifest.json')).entries;
  const entry = (name) => {
    const e = entries.find((x) => x.name === name && x.lang === lang);
    if (!e) throw new Error(`s39: no ${name} (${lang}) in assets/ui/manifest.json`);
    return e;
  };
  const load = async (e) => (e.status === 'ready' ? trimPrint(await ctx.load.texture(`/${e.file}`, { srgb: true, anisotropy: 8 }), PAGE.print) : blank(e));
  const eM = entry('s39-mcp');
  const eD = entry('s39-dsh');
  const [texM, texD] = await Promise.all([load(eM), load(eD)]);
  const clients = (eM.regions?.clients ?? []).map((c) => c.box);
  const picker = eM.regions?.clientPicker ?? [316, 391, 1724, 78];
  const plugin = eD.regions?.card;
  if (clients.length !== T39.clients.n) console.warn(`[s39] ${clients.length} clients in the manifest, ${T39.clients.n} cued`);

  // the sheets: the prints in s38's overlay, under its typed light (the MCP page, then the dsh page over
  // it); the veils and the proxies in its scene
  const look = { ...SHEET_LOOK, glow: LOOK39.glow };
  const sheet = (tex, held, ring = {}) => {
    const s = buildSheet({ U, tex, size: SIZE, rect: [0, 0, ...SIZE], print: PAGE.print, scale: PAGE.S, look: { ...look, ring: { ...look.ring, ...ring } } });
    s.hold(held, HOLD);
    s.u.uKeyPos.value.set(...KEY38.pos).applyMatrix4(FRAME38);
    s.u.uKeyCol.value.set(...KEY38.col).multiplyScalar(KEY38.I * LOOK38.key);
    oframe.add(s.mesh);
    frame.add(s.veil, s.proxy);
    return s;
  };
  const mcp = sheet(texM, HELD.mcp[lang]);
  const dsh = sheet(texD, HELD.dsh[lang], LOOK39.plugin);
  mcp.mesh.renderOrder = 10;
  dsh.mesh.renderOrder = 11;
  dsh.veil.renderOrder = 31;
  mcp.rings(clients);
  dsh.rings(plugin ? [plugin] : []);
  const cM = pageAt(SIZE[0] / 2, SIZE[1] / 2);
  const cD = pageAt(DSH.dx + SIZE[0] / 2, picker[1] + picker[3] + DSH.shadow + DSH.gap + SIZE[1] / 2);
  mcp.place(cM.x, cM.y, PAGE.z);

  const cu = card.u;
  const rowW = rows.u.uLn.value.map((v) => v.w);
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const mid = W(0, 0, 0);
  const cc = checkCues();
  if (cc.bad.length) console.warn(`[s39] CUES off: ${cc.bad.join('; ')}`);
  let focus = 1;

  return {
    scene: s38.scene,
    camera,
    clearColor: s38.clearColor,
    overlay: s38.overlay,
    update(t) {
      // the card, the reader and the dust as s38 leaves them, on its clock; then this shot's camera
      s38.update(T0 + t);
      camAt39(t, cam);
      aim(camera, cam.pos, cam.look);
      lib.update(camera);
      reader.update(camera);
      focus = focusDistance(camera, mid);
      dust.update(camera, T0 + t, { focus, fstop: CAM38.fstop, width: ctx.width, intensity: LOOK38.dust.I });

      // the page over the scene, coming into focus; s38's light in the air goes with the scene
      const k = pageK(t);
      mcp.show(k);
      mcp.u.uSharp.value = lerp(HOLD, 0, smoothstep(...T39.develop, t));
      for (let j = 0; j < 4; j++) fields.u.uLn.value[j].w *= 1 - k;
      rowW.forEach((w, j) => (rows.u.uLn.value[j].w = w * (1 - k)));
      for (let i = 0; i < clients.length; i++) mcp.light(i, ringAt(t - clientT(i)));

      // the dsh page, rising into its place; the plugin's card lit as it lands
      dsh.place(cD.x, cD.y - dshDrop(t) * PAGE.S, DSH.z);
      dsh.show(dshK(t));
      const ink = smoothstep(...T39.dshInk, t);
      dsh.ink(ink);
      dsh.u.uSharp.value = lerp(HOLD, 0, ink);
      dsh.light(0, ringAt(t - T39.dsh[1]));

      // the reader's light on them (a little of it)
      for (const s of [mcp, dsh]) {
        s.u.uAgPos.value.copy(cu.uAgPos.value);
        s.u.uAgCol.value.copy(cu.uAgCol.value).multiplyScalar(LOOK39.reader);
      }
    },
    post() {
      return { dof: { focus, fstop: CAM38.fstop } };
    },
  };
}
