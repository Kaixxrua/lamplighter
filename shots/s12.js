// s12 · 0:33–0:35 · 寂静 (global 792–839)
// The noise is cut at its peak, and the picture with it: black, and a second and a half of absolute
// silence. Nothing on screen but the grain, which keeps running over the black (as in s02), so the frame
// still breathes like film and the silence reads as held, not as the film breaking off. The letterbox
// stays 2.39:1; it opens in s14.
// First frame: black, a hard cut from s11's last flash (s10's last frame); the edge print in the bars
// goes with it. Last frame: black; s13 brings Act II's first light, a single lime point.
// Sound: see CUES: digital silence for the first 1.5 s, then the well's air comes back out of nothing
// in the last half second, so that s13's radar ping lands in a room rather than a void.
import * as THREE from 'three';
import { setLens } from 'film/lib/camera.js';

export const meta = { frames: 48 };

export async function setup() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 10);
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0, 0, 0),
    update() {
      setLens(camera, 32);
    },
  };
}

// s into the shot (global frame = 792 + 24 t)
export const CUES = {
  silence: { t0: 0, t1: 1.5 }, // nothing at all: every track cut at s11's last frame, no tails
  air: { t0: 1.5, t1: 2 }, // the well's wind, faded in from silence, under s13's ping
};
