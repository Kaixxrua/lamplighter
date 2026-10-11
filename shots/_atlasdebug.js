// Page atlas look-dev: second 0 shows the whole atlas, seconds 1–8 two designs side by side.
import * as THREE from 'three';
import { pageAtlas, ATLAS } from 'world/pageatlas.js';

export const meta = { frames: 24 * 9 };

export async function setup() {
  const tex = await pageAtlas();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-16 / 9, 16 / 9, 1, -1, 0.1, 10);
  camera.position.z = 5;
  const uRect = { value: new THREE.Vector4(0, 0, 1, 1) };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: tex }, uRect },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uT; uniform vec4 uRect; varying vec2 vUv;
      void main(){
        vec3 m = texture2D(uT, uRect.xy + vUv*uRect.zw).rgb;
        vec3 c = vec3(0.62, 0.58, 0.5)*(1.0 - 0.94*m.r);
        c = mix(c, vec3(0.42, 0.03, 0.02), m.g*0.9);
        c *= 1.0 - 0.5*m.b;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  scene.add(plane);
  const cellA = ATLAS.W / ATLAS.H;
  return {
    scene,
    camera,
    clearColor: new THREE.Color(0.02, 0.02, 0.02),
    update(t) {
      const v = Math.max(0, Math.round(t));
      if (v === 0) {
        plane.scale.set(2 * cellA * 0.98, 2 * 0.98, 1);
        uRect.value.set(0, 0, 1, 1);
      } else {
        const d = 2 * (v - 1);
        const col = d % ATLAS.COLS;
        const row = Math.floor(d / ATLAS.COLS);
        plane.scale.set(2 * 2 * cellA, 2, 1);
        uRect.value.set(col / ATLAS.COLS, (ATLAS.ROWS - 1 - row) / ATLAS.ROWS, 2 / ATLAS.COLS, 1 / ATLAS.ROWS);
      }
    },
    post: () => ({
      bloom: { strength: 0 },
      halation: { strength: 0 },
      vignette: { strength: 0 },
      lens: { ca: 0, distortion: 0 },
      grain: { strength: 0 },
      letterbox: 0,
    }),
  };
}
