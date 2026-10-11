// s47 — Echo (act IV, 6 s, global 5160–5303; card 9 over local 0.5–5.83 s).
//
// Black. Card 9 comes in two beats, set and laid over the frame by the engine (日光之下，并无新事。/ There
// is nothing new under the sun.; then 1.5 s later 但总有人，为后来者点灯。/ But someone always leaves a light
// on for those who come after.). Under it nothing at all: the engine's grain on the black. One ping in
// the silence, on the second beat (CUES.ping).
// First frame: black (s46 cuts away from the star rings round the Earth's point). Last frame: black, the
// card gone (it is out by 5.83 s); s48 opens on the last ping.
// The shot draws nothing: an empty scene, no text (the card is the engine's), the act's grade.
import * as THREE from 'three';

export const meta = { frames: 144 };

// Local seconds. ping: card 9's second beat.
export const CUES = { ping: 2.0 };

// The cue recomputed from the timeline (got: card 9's second beat in this shot's seconds) against CUES
// (want). Pure: setup runs it on the fetched timeline, and so can Node on the file.
export function checkCues(tl) {
  const row = tl.shots.find((r) => r.id === 's47');
  const c9 = tl.cards.find((c) => c.id === 'c9');
  const got = { ping: row && c9 ? (c9.start + (c9.layers[1]?.delay || 0) - row.start) / tl.fps : NaN };
  const want = { ping: CUES.ping };
  const bad = Math.abs(got.ping - want.ping) < 1e-6 ? [] : [`ping want ${want.ping} got ${got.ping}`];
  return { got, want, bad };
}

export async function setup(ctx) {
  // keep the plan honest: the ping is card 9's second beat
  const tl = await (await fetch('/film/timeline.json', { cache: 'no-store' })).json();
  const cc = checkCues(tl);
  if (cc.bad.length) console.warn(`[s47] CUES off: ${cc.bad.join('; ')}`);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 10);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update() {},
  };
}
