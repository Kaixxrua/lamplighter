// Film palette. Hex values are display (sRGB) colors; use lin() for scene-linear values.
import * as THREE from 'three';

export const HEX = {
  ink: '#151512', // site --ink: shadows, ink
  void: '#050505', // deepest black of the library
  paper: '#F7F5EE', // site --paper: pages, interface, title cards
  paperWarm: '#EFE6D2', // aged page stock
  lime: '#D8F14B', // site --acid: the signal. The only color allowed to over-expose and glow.
  limeDeep: '#BFD830', // site --acid-strong
  amber: '#E8A33D', // human readers' lamps
  steel: '#6F8FB3', // machine readers (agents)
  lamp: '#E9C27A', // Borges' spherical lamp fruit: dim, sallow, incessant
  brass: '#B08A4A', // lighthouse metal
  stone: '#5A554C', // gallery stone
  walnut: '#2A1C12', // shelves
  alarm: '#E5533D', // a single failing light in the ops montage
};

export function lin(hex, intensity = 1) {
  const c = new THREE.Color(hex); // ColorManagement converts sRGB hex to linear working space
  return c.multiplyScalar(intensity);
}

export function vec3(hex, intensity = 1) {
  const c = lin(hex, intensity);
  return new THREE.Vector3(c.r, c.g, c.b);
}

// Display-referred RGB in 0..1 (for title cards and UI overlays that bypass tone mapping).
export function display(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
