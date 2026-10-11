// Camera language helpers: lenses, paths, handheld drift, dolly zoom, focus.
import * as THREE from 'three';
import { fbm1 } from './rng.js';

export const OUTPUT_ASPECT = 16 / 9;
export const SCOPE_ASPECT = 2.39;

// Physical lens on a full-frame (36 mm) gate. The canvas is always 16:9; Act I masks it to 2.39:1,
// so frame Act I compositions inside the central band (see scopeBand()).
export function setLens(camera, focalMm, sensorWidth = 36) {
  const hfov = 2 * Math.atan(sensorWidth / (2 * focalMm));
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / OUTPUT_ASPECT);
  camera.fov = THREE.MathUtils.radToDeg(vfov);
  camera.aspect = OUTPUT_ASPECT;
  camera.updateProjectionMatrix();
  camera.userData.focalMm = focalMm;
  camera.userData.sensorWidth = sensorWidth;
  return camera;
}

// Fraction of frame height visible inside the 2.39:1 band (0.7448).
export const scopeBand = () => OUTPUT_ASPECT / SCOPE_ASPECT;

// Horizontal width visible at distance d for the current lens.
export function widthAtDistance(camera, d) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  return 2 * d * Math.tan(vfov / 2) * camera.aspect;
}

// Dolly zoom (Hitchcock/vertigo): returns the focal length that keeps `width` metres
// framed at subject distance d.
export function dollyZoomFocal(width, d, sensorWidth = 36) {
  return (sensorWidth * d) / width;
}

// Smooth camera path through control points (centripetal Catmull-Rom).
export function path(points, closed = false) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))),
    closed,
    'centripetal',
  );
  curve.arcLengthDivisions = 2000;
  return {
    curve,
    at: (u, target = new THREE.Vector3()) => curve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), target),
    tangent: (u, target = new THREE.Vector3()) =>
      curve.getTangentAt(THREE.MathUtils.clamp(u, 0, 1), target),
    length: () => curve.getLength(),
  };
}

// Deterministic handheld drift. amp = 1 is a calm operator on a long lens.
// Returns position offset (m) and rotation offset (rad), both smooth in t.
export function handheld(t, { amp = 1, seed = 7, rate = 1 } = {}) {
  const s = t * rate;
  const pos = new THREE.Vector3(
    fbm1(s * 0.31, seed + 1, 3) * 0.012,
    fbm1(s * 0.27, seed + 2, 3) * 0.010 + Math.sin(s * 1.6) * 0.0015, // breathing
    fbm1(s * 0.23, seed + 3, 3) * 0.008,
  ).multiplyScalar(amp);
  const rot = new THREE.Euler(
    fbm1(s * 0.43, seed + 4, 4) * 0.0035 * amp,
    fbm1(s * 0.37, seed + 5, 4) * 0.0045 * amp,
    fbm1(s * 0.29, seed + 6, 3) * 0.0020 * amp,
  );
  return { pos, rot };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// Place a camera at pos looking at target, with optional roll (rad) and handheld offsets.
export function aim(camera, pos, target, { roll = 0, shake = null, up = _up } = {}) {
  camera.position.copy(pos);
  _m.lookAt(pos, target, up);
  camera.quaternion.setFromRotationMatrix(_m);
  if (roll) camera.quaternion.multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  if (shake) {
    camera.position.add(shake.pos.clone().applyQuaternion(camera.quaternion));
    camera.quaternion.multiply(_q.setFromEuler(shake.rot));
  }
  camera.updateMatrixWorld(true);
  return camera;
}

// Distance from camera to a world point along the view axis (for focus pulls).
export function focusDistance(camera, point) {
  const v = point.clone().sub(camera.position);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  return Math.max(0.01, v.dot(fwd));
}
