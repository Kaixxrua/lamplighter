// Shared GLSL chunks (GLSL ES 3.00). Concatenate into shader sources.

export const HASH = /* glsl */ `
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hash11(float p){ return float(pcg(floatBitsToUint(p))) * (1.0/4294967295.0); }
float hash12(vec2 p){ return float(pcg(pcg(floatBitsToUint(p.x)) ^ floatBitsToUint(p.y))) * (1.0/4294967295.0); }
float hash13(vec3 p){ return float(pcg(pcg(pcg(floatBitsToUint(p.x)) ^ floatBitsToUint(p.y)) ^ floatBitsToUint(p.z))) * (1.0/4294967295.0); }
float ihash(int a, int b){ return float(pcg(pcg(uint(a)) ^ uint(b))) * (1.0/4294967295.0); }
float ihash3(int a, int b, int c){ return float(pcg(pcg(pcg(uint(a)) ^ uint(b)) ^ uint(c))) * (1.0/4294967295.0); }
`;

// Value noise + fbm (cheap, good enough for stone, paper fibre, fog).
export const NOISE = /* glsl */ `
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); vec3 u = f*f*(3.0-2.0*f);
  float n000 = hash13(i), n100 = hash13(i+vec3(1,0,0)), n010 = hash13(i+vec3(0,1,0)), n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1)), n101 = hash13(i+vec3(1,0,1)), n011 = hash13(i+vec3(0,1,1)), n111 = hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y), mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}
float vnoise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
float fbm3(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a*=0.5; } return s/0.9375; }
float fbm2(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s += a*vnoise2(p); p = p*2.03 + vec2(1.7,9.2); a*=0.5; } return s/0.9375; }
`;

export const COLOR = /* glsl */ `
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 srgbEncode(vec3 c){
  c = max(c, 0.0);
  return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
vec3 srgbDecode(vec3 c){
  return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c));
}
// ACES filmic (Stephen Hill fit of RRT+ODT, as used in three.js), linear in, display-linear out.
vec3 RRTAndODTFit(vec3 v){
  vec3 a = v*(v + 0.0245786) - 0.000090537;
  vec3 b = v*(0.983729*v + 0.4329510) + 0.238081;
  return a/b;
}
vec3 acesFitted(vec3 color){
  const mat3 ACESInputMat = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(
    vec3( 1.60475, -0.10208, -0.00327),
    vec3(-0.53108,  1.10813, -0.07276),
    vec3(-0.07367, -0.00605,  1.07602));
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
`;

// Analytic fog for the infinite library. Distances in metres.
export const FOG = /* glsl */ `
vec3 applyFog(vec3 col, vec3 fogCol, float dist, float density){
  float f = 1.0 - exp(-dist*density);
  return mix(col, fogCol, f);
}
`;

export const ALL = HASH + NOISE + COLOR + FOG;
