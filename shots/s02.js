// s02 · 0:03–0:09 · 黑场·题词 (global 72–215)
// Black, and only black: the epigraph (card c1, local frames 12–132) is the picture. The engine draws the
// card and the letterbox; this shot only has to stay out of its way. No fade here — fade is applied after
// the cards and would black them out. Grain still runs over the black, so the frame breathes like film.
// Sound carries the shot (30 Hz rising, the second page turn), not the image.
// First frame: black (s01 ends in black). Last frame: black; cut to s03, which brings the first light.
import * as THREE from 'three';
import { setLens } from 'film/lib/camera.js';

export const meta = { frames: 144 };

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
