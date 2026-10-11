// Lighthouse shading. The lighthouse stands in the middle of the shaft, 10–16 m from every lamp of
// the library, so it is lit by the lamps of several floors at once; its own lantern lights the
// inside of the glazing and, through the glass, the railing. Materials: aged brass plate with
// rivets and verdigris, polished brass, copper patina, painted iron, glass and the logo lens.
// Also here: the glazing (additive glass), the volume of the scan sheet, and the lantern's halo.
import * as THREE from 'three';
import { LIB_COMMON } from './libshader.js';

export const LH = {
  LAMP_Y: 2.6, // lamp centre above the deck
  LAMP_R: 0.26,
  GLASS_R: 2.2, // glazing radius
  SILL: 0.98, // glass from the sill astragal…
  HEAD: 4.22, // …to the head astragal
  BASE_R: 2.25, // pedestal wall, outer face
  DECK_R: 3.45,
  RAIL_R: 3.3,
  TOWER_R: 2.6, // tower radius under the deck…
  TOWER_FOOT: 3.5, // …and at its foot
  PANEL_X: 0.75, // the lens panel stands this far in front of the lamp
  LOGO: 1.3 / 54, // metres per unit of the favicon's 128-unit box: the C ring is 2.6 m across
};

// The logo (favicon.svg), in panel coordinates (u right, v up, metres from the lamp axis):
// an open ring between radii 36 and 54 covering 90°→360°, a bar along 45°, a detached dot.
export const LOGO = {
  R0: 36 * LH.LOGO,
  R1: 54 * LH.LOGO,
  BAR_A: -5.657 * LH.LOGO, // bar extent along 45°
  BAR_B: 38.184 * LH.LOGO,
  BAR_W: 16.971 * LH.LOGO,
  DOT_RHO: 66.5 * LH.LOGO, // 63.6 in the favicon; moved out 3 units to clear the panel's rim
  DOT_R: 9 * LH.LOGO,
};

export function lighthouseUniforms() {
  return {
    uLHO: { value: new THREE.Vector3() }, // deck centre (world)
    uLHLampPos: { value: new THREE.Vector3(0, LH.LAMP_Y, 0) }, // lamp centre (world)
    uLHPanelN: { value: new THREE.Vector3(1, 0, 0) }, // lens normal (world)
    uLHLamp: { value: new THREE.Color(0, 0, 0) }, // light the lantern lamp casts (colour × intensity)
    uLHCore: { value: new THREE.Color(0, 0, 0) }, // radiance of the lamp itself
    uLHLens: { value: new THREE.Color(0.78, 1.0, 0.1) }, // colour of the light in the lens
    uLHGlow: { value: 0 }, // lens glow
    uLHDot: { value: 0 }, // the lime jewel
    uLHWin: { value: 0 }, // tower windows
    uLHEnv: { value: 1 }, // the blurred library reflected in metal and glass
    uLHVerd: { value: 1 }, // verdigris
    uLHBounce: { value: 0 }, // the sheet's light given back by the galleries it sweeps (1 = as lit; 0 = off)
    uLHPortsAway: { value: new THREE.Vector2(0, 0) }, // the deck's portholes within .y (rad) of bearing .x are not there
    uLHEtchMap: { value: null }, // lettering etched in the bar (coverage in R; x along the bar from its inner end, y across)
    uLHEtch: { value: new THREE.Vector3(0, 0, 0.03) }, // the etched letters' light once lit, how far from the lens centre they are lit (m), that edge's width (m)
    uLHPing: { value: new THREE.Vector4(0, 0.05, 0, 0) }, // a pulse running out from the lens centre: its radius (m), width (m), light, the glass's share of it
  };
}

const LH_COMMON = /* glsl */ `
#define LH_LAMP_Y ${LH.LAMP_Y.toFixed(4)}
#define LH_GLASS_R ${LH.GLASS_R.toFixed(4)}
#define LH_SILL ${LH.SILL.toFixed(4)}
#define LH_HEAD ${LH.HEAD.toFixed(4)}
#define LH_R0 ${LOGO.R0.toFixed(5)}
#define LH_R1 ${LOGO.R1.toFixed(5)}
#define LH_BAR_W ${LOGO.BAR_W.toFixed(5)}
#define LH_BAR_A ${LOGO.BAR_A.toFixed(5)}
#define LH_BAR_B ${LOGO.BAR_B.toFixed(5)}
uniform vec3 uLHO, uLHLampPos, uLHPanelN;
uniform vec3 uLHLamp, uLHCore, uLHLens;
uniform float uLHGlow, uLHDot, uLHWin, uLHEnv, uLHVerd, uLHBounce;
uniform vec2 uLHPortsAway;
uniform vec3 uLHEtch;
uniform vec4 uLHPing;
uniform sampler2D uLHEtchMap;

// The library's lamps: diffuse from the shaft lamps of three floors and the gallery lamps of the
// surface's own floor; specular from the floors the mirror direction actually heads for.
vec3 libLamps(Surf s, bool diffuse){
  vec3 dif = vec3(0.0), spc = vec3(0.0);
  if (diffuse){
    float k = floor((s.P.y + 1e-3)/uH);
    for (int dk = -1; dk <= 1; dk++){
      float kk = k + float(dk);
      vec3 cs = lampRGB(floorState(kk))*uShaftK;
      for (int i = 0; i < 6; i++){
        vec3 dl = shaftLampPos(kk, i) - s.P;
        float d2 = dot(dl, dl);
        float ndl = dot(s.N, dl)*inversesqrt(d2);
        dif += cs*(max((ndl + s.wrap)/(1.0 + s.wrap), 0.0)*lampVar(kk, 12 + i)/(d2 + 0.3));
      }
    }
    vec3 cg = lampRGB(floorState(k));
    for (int j = 0; j < 12; j++){
      vec3 dl = galleryLampPos(k, j) - s.P;
      float d2 = dot(dl, dl);
      float ndl = dot(s.N, dl)*inversesqrt(d2);
      dif += cg*(max((ndl + s.wrap)/(1.0 + s.wrap), 0.0)*lampVar(k, j)/(d2 + 0.3));
    }
  }
  vec3 R = reflect(-s.V, s.N);
  float h = max(length(R.xz), 0.1);
  float rough = max(s.rough, 0.17);         // a lamp 10 m away is a small sphere, not a point
  float ks = floor((s.P.y + R.y*10.5/h - uShaftY)/uH);
  for (int dk = 0; dk <= 1; dk++){
    float kk = ks + float(dk);
    vec3 cs = lampRGB(floorState(kk))*uShaftK;
    for (int i = 0; i < 6; i++){
      vec3 dl = shaftLampPos(kk, i) - s.P;
      float d2 = dot(dl, dl);
      spc += cs*(ggx(s.N, s.V, dl*inversesqrt(d2), rough, s.f0)*lampVar(kk, 12 + i)/(d2 + 0.3));
    }
  }
  float kg = floor((s.P.y + R.y*13.5/h - uLampY)/uH + 0.5);
  vec3 cg2 = lampRGB(floorState(kg));
  for (int j = 0; j < 12; j++){
    vec3 dl = galleryLampPos(kg, j) - s.P;
    float d2 = dot(dl, dl);
    spc += cg2*(ggx(s.N, s.V, dl*inversesqrt(d2), rough, s.f0)*lampVar(kg, j)/(d2 + 0.3));
  }
  return dif*s.albedo + spc*PI;
}

// What a mirror on the lighthouse sees besides the lamps themselves: the galleries (lit openings
// between dark slabs) and, up or down the shaft, haze. Rough metal blurs the bands away.
vec3 libEnv(vec3 P, vec3 R, float rough){
  float h = length(R.xz);
  float t = 14.0/max(h, 0.03);
  float yh = P.y + R.y*t;
  float f = fract(yh/uH);
  vec4 st = floorState(floor(yh/uH));
  float band = mix(0.3, 1.0, smoothstep(0.0, 0.04, f)*smoothstep(0.80, 0.76, f));
  band = mix(band, 0.75, clamp(t*rough*rough*1.5/uH, 0.0, 1.0));
  float vis = exp(-uFogD*t);
  vec3 gal = mix(uLampCol, uLampLime, st.b)*(st.g*0.015*band) + uLitCol*(st.r*0.015*band);
  return uLHEnv*(gal*vis + uFogCol*(1.0 - vis));
}

// What the sheet gives back: the band of gallery it lights and the afterglow it leaves behind, as
// seen from the lighthouse in direction R (radiance). The galleries are stone under the sheet at
// about 15 m (as beamLight lights them), half of what is seen between the slabs is void, and only
// the galleries within the fan are lit. Rough metal blurs the band, keeping its energy.
vec3 sheetEnv(vec3 R, float rough){
  float h = max(length(R.xz), 1e-3);
  float da = mod(atan(R.z, R.x) - uBeamAng + PI, TAU) - PI;
  float w = max(uBeamW, 0.7*rough);
  float core = exp(-da*da/(w*w))*(uBeamW/w);
  // the afterglow starts at the sheet: an edge a rough reflection blurs as it blurs the sheet
  float lead = smoothstep(-w, w, da);
  float behind = -min(da, 0.0), ahead = TAU - max(da, 0.0);
  float trail = (1.0 - lead)*exp(-behind/uTrail)*smoothstep(uTrailArc + 0.03, uTrailArc - 0.03, behind)
              + lead*exp(-ahead/uTrail)*smoothstep(uTrailArc + 0.03, uTrailArc - 0.03, ahead);
  float e = R.y/h;
  float fan = smoothstep(-uFanDn - 0.15, -uFanDn + 0.15, e)*smoothstep(uFanUp + 0.15, uFanUp - 0.15, e);
  return uBeamCol*(uLHBounce*uBeamI*(0.35*0.7*0.5/1.3)*(core + uTrailI*trail)*fan);
}
// The same light on a matte surface: the band (uBeamW wide) and the afterglow (about uTrail wide,
// centred behind the sheet), each spanning the fan's 1.2 rad of elevation.
vec3 sheetBounce(Surf s){
  float L = uLHBounce*uBeamI*(0.35*0.7*0.5/1.3);
  float arc = min(uTrail, uTrailArc);
  float a1 = uBeamAng - 0.7*arc;
  float c0 = max(dot(s.N, vec3(cos(uBeamAng), 0.0, sin(uBeamAng))) + 0.3, 0.0)/1.3;
  float c1 = max(dot(s.N, vec3(cos(a1), 0.0, sin(a1))) + 0.3, 0.0)/1.3;
  return uBeamCol*s.albedo*(L*1.2/PI*(uBeamW*c0 + uTrailI*arc*c1));
}

// The moment the sheet sweeps across the camera: a flash in the lens.
float sweepFlash(){
  float da = sweepDelta(cameraPosition)/0.035;
  return exp(-da*da)*lanternFan(cameraPosition, 0.05);
}

// The carriage shades its own lamp: the reflector behind it (±55° about the back axis) and the dark
// brass of the lens disc in front (±61° about the lens axis); light leaves the lantern sideways.
float lanternShade(vec3 P){
  float c = dot(normalize(P - uLHLampPos), uLHPanelN);
  return smoothstep(0.53, 0.43, c)*smoothstep(-0.63, -0.53, c);
}

// Outside the glazing the lamp is seen only through the glass: the pedestal wall shades the deck
// and the tower, the roof shades the dome.
float lanternVis(vec3 P){
  vec3 q = P - uLHO;
  float r = length(q.xz);
  if (r <= LH_GLASS_R) return q.y > -0.05 ? 1.0 : 0.0;
  float yg = LH_LAMP_Y + (q.y - LH_LAMP_Y)*(LH_GLASS_R/r);
  return smoothstep(LH_SILL - 0.04, LH_SILL + 0.04, yg)*smoothstep(LH_HEAD + 0.04, LH_HEAD - 0.04, yg);
}
vec3 lanternLight(Surf s){
  if (uLHLamp.r + uLHLamp.g + uLHLamp.b <= 0.0) return vec3(0.0);
  vec3 dl = uLHLampPos - s.P;
  float d2 = dot(dl, dl);
  vec3 l = dl*inversesqrt(d2);
  float r = length((s.P - uLHO).xz);
  float vis = lanternVis(s.P)*(r > 1.0 ? lanternShade(s.P) : 1.0);
  float diff = max((dot(s.N, l) + s.wrap)/(1.0 + s.wrap), 0.0);
  return uLHLamp*(vis/(d2 + 0.02))*(diff*s.albedo + PI*ggx(s.N, s.V, l, max(s.rough, 0.1), s.f0));
}
`;

const LH_MATERIALS = /* glsl */ `
struct LMat { vec3 albedo; vec3 f0; float rough; float ao; vec3 emit; vec3 nOff; };
LMat lmat(){ LMat o; o.albedo = vec3(0.0); o.f0 = vec3(0.04); o.rough = 0.5; o.ao = 1.0; o.emit = vec3(0.0); o.nOff = vec3(0.0); return o; }
float lhFootprint(vec3 P){ return max(length(dFdx(P)), length(dFdy(P))); }

// Brass plates riveted to the tower: 14 around, 1.2 m tall, rows staggered; flat surfaces get a
// square grid. Seams, rivet heads rubbed bright, tarnish that differs plate to plate, and verdigris
// that collects at the seams and runs down from them.
LMat agedBrass(vec3 P, vec3 N, float px){
  LMat o = lmat();
  vec3 q = P - uLHO;
  float r = max(length(q.xz), 1e-3);
  float a = atan(q.z, q.x);
  bool horiz = abs(N.y) > 0.75;
  vec2 pc = horiz ? q.xz/vec2(1.3, 1.2) : vec2(a*(14.0/TAU), q.y/1.2);
  vec2 sc = horiz ? vec2(1.3, 1.2) : vec2(TAU*r/14.0, 1.2);
  vec3 Tu = horiz ? vec3(1.0, 0.0, 0.0) : vec3(-sin(a), 0.0, cos(a));
  vec3 Tv = horiz ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  float row = floor(pc.y);
  pc.x += 0.5*mod(row, 2.0);
  vec2 cell = floor(pc);
  vec2 f = fract(pc);
  vec2 dm = min(f, 1.0 - f)*sc;               // metres to the nearest vertical / horizontal seam
  float seam = min(dm.x, dm.y);
  float hP = hash12(cell + vec2(0.37, 0.71));
  float detail = 1.0 - smoothstep(0.003, 0.012, px);
  float groove = (1.0 - smoothstep(0.002, 0.002 + px, seam))*(1.0 - smoothstep(0.006, 0.02, px));
  // rivets 4 cm in from every seam, 9 cm apart
  bool hz = dm.y < dm.x;
  float along = hz ? pc.x*sc.x : pc.y*sc.y;
  float sAl = (fract(along/0.09) - 0.5)*0.09;
  float across = (hz ? dm.y : dm.x) - 0.04;
  float rr = length(vec2(sAl, across));
  float rivet = (1.0 - smoothstep(0.008, 0.008 + px, rr))*detail;
  vec3 away = hz ? Tv*sign(0.5 - f.y) : Tu*sign(0.5 - f.x);
  o.nOff = ((hz ? Tu : Tv)*sAl + away*across)*(rivet*70.0);
  // verdigris
  float hx = pc.x*sc.x;
  float drip = vnoise2(vec2(hx*6.0, q.y*0.6 + hP*17.0));
  float below = (1.0 - f.y)*sc.y;             // distance under the seam above
  float vg = horiz ? 0.0 : smoothstep(0.55, 0.9, drip)*exp(-below/0.4);
  vg += 0.6*exp(-seam/0.018) + 0.4*detail*exp(-abs(rr - 0.011)/0.005);
  vg *= (0.25 + 1.2*vnoise2(vec2(hx, q.y)*0.8 + hP*5.0))*(0.5 + hP);
  vg = clamp(vg*uLHVerd, 0.0, 1.0);
  // tarnish
  float tar = clamp(0.62 + 0.6*(hP - 0.5) + 0.5*(vnoise2(vec2(hx*1.3, q.y*1.9) + hP*3.0) - 0.5), 0.0, 1.0);
  vec3 brass = mix(vec3(0.64, 0.48, 0.26), vec3(0.08, 0.052, 0.028), tar);
  // water has run down every plate and dried along its lower edge
  float stain = horiz ? 0.0 : smoothstep(0.35, 0.0, f.y)*(0.5 + 0.5*vnoise2(vec2(hx*9.0, q.y*2.0)));
  brass *= (1.0 - 0.7*groove)*(1.0 - 0.5*stain);
  brass = mix(brass, vec3(0.93, 0.78, 0.46), rivet*0.8);
  o.f0 = mix(brass, vec3(0.04), vg);
  o.albedo = vec3(0.12, 0.29, 0.24)*(0.6 + 0.6*drip)*vg;
  o.rough = mix(mix(0.16 + 0.22*tar, 0.14, rivet), 0.85, vg);
  o.ao = 1.0 - 0.6*groove;
  return o;
}

LMat polishedBrass(vec3 P){
  LMat o = lmat();
  float n = vnoise(P*2.7);
  float sm = vnoise(P*13.0 + 4.0);
  o.f0 = vec3(0.95, 0.79, 0.47)*(0.85 + 0.15*n);
  o.rough = 0.13 + 0.12*sm*sm;
  return o;
}

LMat copperPatina(vec3 P, vec3 N){
  LMat o = lmat();
  vec3 q = P - uLHO;
  float a = atan(q.z, q.x);
  float streak = vnoise2(vec2(a*34.0, q.y*1.4));
  float broad = vnoise(q*1.1);
  float pat = clamp(0.62 + 0.7*(broad - 0.5) + 0.4*(streak - 0.5) + 0.25*N.y, 0.0, 1.0);
  vec3 patina = mix(vec3(0.07, 0.19, 0.16), vec3(0.2, 0.40, 0.34), streak*0.7 + broad*0.3);
  o.albedo = patina*pat;
  o.f0 = mix(vec3(0.62, 0.36, 0.25), vec3(0.04), pat);
  o.rough = mix(0.35, 0.85, pat);
  return o;
}

LMat paintedIron(vec3 P){
  LMat o = lmat();
  float rust = smoothstep(0.6, 0.82, vnoise(P*6.0)*0.7 + vnoise(P*23.0)*0.3);
  o.albedo = mix(vec3(0.016, 0.015, 0.014), vec3(0.10, 0.04, 0.018), rust);
  o.f0 = vec3(mix(0.05, 0.03, rust));
  o.rough = mix(0.35, 0.9, rust);
  return o;
}

// window and porthole glass; aux numbers the window, some light up when the tower wakes
LMat darkGlass(float aux){
  LMat o = lmat();
  o.albedo = vec3(0.004); o.f0 = vec3(0.045); o.rough = 0.08;
  float lit = step(hash11(aux + 0.5), 0.6);
  o.emit = uLHLens*(uLHWin*lit*(0.35 + 0.65*hash11(aux + 7.7)));
  return o;
}

// The logo lens: the C ring's Fresnel prisms (bands of light, one per prism, each ring catching the
// eye at a slightly different height) and the bar prism. Brightest seen down the lens axis. A pulse
// (uLHPing) can run out from the centre through the bar and the rings. Lettering etched in the bar
// (uLHEtchMap) shows where light runs inside the glass: the frosted strokes scatter it out, the clear
// glass around them does not. It shows as the pulse crosses it, and stays lit within uLHEtch.y.
LMat lensGlass(vec3 L, vec3 V, bool bar, float px){
  LMat o = lmat();
  o.albedo = vec3(0.003, 0.005, 0.004); o.f0 = vec3(0.05); o.rough = 0.04;
  vec2 uv = vec2(-L.z, L.y - LH_LAMP_Y);
  float rho = length(uv);
  float pulse = 0.0;
  if (uLHPing.z > 0.0){
    float q = (rho - uLHPing.x)/uLHPing.y;   // a sharp front, a softer wake behind it
    pulse = uLHPing.z*(q > 0.0 ? exp(-4.0*q*q) : exp(q));
  }
  float etch = 0.0;
  float face = max(dot(V, uLHPanelN), 0.0);
  float band;
  if (bar){
    float s = dot(uv, vec2(-0.70710678, 0.70710678))/(0.5*LH_BAR_W);   // -1..1 across the bar
    band = 0.25 + 0.75*exp(-s*s*3.0);                                  // the ridge carries the light
    if (uLHEtch.x > 0.0){
      float a = dot(uv, vec2(0.70710678)) - LH_BAR_A;                    // along the bar from its inner end
      vec2 tsz = vec2(textureSize(uLHEtchMap, 0));
      float lod = log2(max(px*tsz.x/(LH_BAR_B - LH_BAR_A), 1e-6));
      float cov = textureLod(uLHEtchMap, vec2(a/(LH_BAR_B - LH_BAR_A), 0.5 + 0.5*s), lod).r;
      // the frosting's grain, where a pixel resolves it
      float frost = mix(1.0, 0.7 + 0.6*vnoise(vec3(uv*900.0, 1.3)), smoothstep(0.0012, 0.0005, px));
      etch = cov*frost*(uLHEtch.x*smoothstep(0.5, -0.5, (rho - uLHEtch.y)/uLHEtch.z) + pulse);
    }
  } else {
    float rp = (rho - LH_R0)/((LH_R1 - LH_R0)/5.0);
    float fp = fract(rp);
    // each prism is brightest just outside its riser and dark at its thin outer edge…
    band = smoothstep(0.0, 0.18, fp)*smoothstep(1.0, 0.55, fp);
    band = 0.06 + 0.94*band*band;
    // …and each ring sends its light at a slightly different elevation
    float el = V.y - (floor(rp) - 2.0)*0.05;
    band *= 0.3 + 0.7*exp(-el*el/0.012);
  }
  o.emit = uLHLens*(uLHGlow*band*(0.15 + 1.1*face*face + 30.0*sweepFlash()) + etch + uLHPing.w*pulse*band);
  return o;
}

LMat lampBulb(vec3 N, vec3 V){
  LMat o = lmat();
  float nv = max(dot(N, V), 0.0);
  o.albedo = vec3(0.02); o.rough = 0.15;
  o.emit = uLHCore*(0.3 + 0.7*pow(nv, 0.7) + 1.5*pow(nv, 12.0));
  return o;
}

LMat jewel(vec3 N, vec3 V){
  LMat o = lmat();
  float nv = max(dot(N, V), 0.0);
  o.albedo = vec3(0.03, 0.045, 0.004); o.f0 = vec3(0.06); o.rough = 0.04;
  o.emit = uLHLens*(uLHDot*(0.5 + 0.8*nv*nv));
  return o;
}

// Close up (a pixel under 3 mm) the lens's bronze shows how it was made: the boss inside the ring was
// turned on a lathe, rings round the lens axis that pull its sheen into a streak, and the plate across
// the gap was cast, a soft orange peel. Further off it is the plain dark bronze it always was.
LMat darkBronze(vec3 P, vec3 L, vec3 N, float px){
  LMat o = lmat();
  float n = vnoise(P*9.0);
  o.f0 = vec3(0.30, 0.21, 0.11)*(0.8 + 0.4*n);
  o.rough = 0.3 + 0.15*vnoise(P*31.0);
  float close = smoothstep(0.003, 0.0012, px)*smoothstep(0.85, 0.95, dot(N, uLHPanelN));
  if (close > 0.0){
    vec2 uv = vec2(-L.z, L.y - LH_LAMP_Y);
    float rho = length(uv);
    vec3 radial = normalize(vec3(uLHPanelN.z, 0.0, -uLHPanelN.x)*uv.x + vec3(0.0, uv.y, 0.0));
    if (rho < LH_R0){
      float ph = rho/0.0035 + 0.8*vnoise(vec3(rho*30.0, 1.7, 0.0));
      o.nOff = radial*(0.03*sin(TAU*ph)*close*smoothstep(0.0018, 0.0009, px));   // only where a pixel resolves the turning
      o.rough = mix(o.rough, 0.1 + 0.06*vnoise(P*47.0), close);
    } else {
      o.nOff = (vec3(vnoise(P*130.0), vnoise(P*130.0 + 3.1), vnoise(P*130.0 + 7.7)) - 0.5)*(0.045*close);
    }
  }
  return o;
}

LMat mirrorMat(){ LMat o = lmat(); o.f0 = vec3(0.9, 0.86, 0.76); o.rough = 0.09; return o; }

LMat ironPlate(vec3 P){
  LMat o = lmat();
  vec3 q = P - uLHO;
  vec2 g = fract(mat2(0.7071, 0.7071, -0.7071, 0.7071)*q.xz*9.0) - 0.5;
  float lug = 1.0 - smoothstep(0.08, 0.14, abs(g.x)*0.35 + abs(g.y));
  o.albedo = vec3(0.018); o.f0 = vec3(0.2)*(0.75 + 0.25*lug); o.rough = mix(0.6, 0.32, lug);
  return o;
}
`;

const VERT = /* glsl */ `
attribute float mat;
attribute float aux;
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vMat; varying float vAux;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vL = position; vMat = mat; vAux = aux;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const FRAG = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vMat; varying float vAux;
void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  float px = lhFootprint(P);
  int m = int(vMat + 0.5);
  // a porthole taken away (glass and rim, numbered by azimuth; see buildLantern)
  if (uLHPortsAway.y > 0.0 && vAux > 999.5 && vAux < 1107.5) {
    float i = mod(floor(vAux + 0.5) - 1000.0, 100.0);
    if (abs(mod((i + 0.5)*PI/4.0 - uLHPortsAway.x + PI, TAU) - PI) < uLHPortsAway.y) discard;
  }
  LMat o;
  if (m == 0) o = agedBrass(P, N, px);
  else if (m == 1) o = polishedBrass(P);
  else if (m == 2) o = copperPatina(P, N);
  else if (m == 3) o = paintedIron(P);
  else if (m == 4) o = darkGlass(vAux);
  else if (m == 5) o = darkBronze(P, vL, N, px);
  else if (m == 6 || m == 7) o = lensGlass(vL, V, m == 7, px);
  else if (m == 8) o = lampBulb(N, V);
  else if (m == 9) o = jewel(N, V);
  else if (m == 10) o = mirrorMat();
  else o = ironPlate(P);   // 11: chequer plate
  Surf s;
  s.P = P; s.N = normalize(N + o.nOff); s.V = V;
  s.albedo = o.albedo; s.f0 = o.f0; s.rough = o.rough; s.ao = o.ao; s.wrap = 0.0;
  float nv = max(dot(s.N, V), 0.0);
  vec3 F = s.f0 + (1.0 - s.f0)*pow(1.0 - nv, 5.0)*(1.0 - s.rough);
  vec3 c = libLamps(s, true)*s.ao + lanternLight(s) + uAmb*s.albedo*20.0*s.ao
         + libEnv(P, reflect(-V, s.N), s.rough)*F*s.ao + o.emit;
  if (uLHBounce > 0.0) c += (sheetEnv(reflect(-V, s.N), s.rough)*F + sheetBounce(s))*s.ao;
  if (length((P - uLHO).xz) > LH_GLASS_R + 0.04) c += beamLight(s);
  gl_FragColor = vec4(fog(c, P), 1.0);
}`;

export function createLighthouseMaterial(uniforms, { side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: LIB_COMMON + LH_COMMON + LH_MATERIALS + FRAG,
    side,
  });
}

// The glazing: old glass, drawn additively over whatever is behind it — reflections of the lamps
// and the galleries, grime lit from inside by the lamp, a glow where the sheet passes through.
const GLASS_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const GLASS_FRAG = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 P = vW;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - P);
  float nv = max(dot(N, V), 0.0);
  float F = 0.04 + 0.96*pow(1.0 - nv, 5.0);
  vec3 q = P - uLHO;
  float a = atan(q.z, q.x);
  float grime = 0.3 + 0.7*vnoise2(vec2(a*26.0, q.y*1.1))*(0.5 + 0.5*vnoise2(vec2(a*6.0, q.y*0.35) + 3.0));
  Surf s;
  s.P = P; s.N = N; s.V = V; s.albedo = vec3(0.0); s.f0 = vec3(0.04); s.rough = 0.04; s.ao = 1.0; s.wrap = 0.0;
  vec3 c = libLamps(s, false) + libEnv(P, reflect(-V, N), 0.05)*F;
  if (uLHBounce > 0.0) c += sheetEnv(reflect(-V, N), 0.05)*F;
  vec3 dl = uLHLampPos - P;
  float d2 = dot(dl, dl);
  vec3 L = dl*inversesqrt(d2);
  float fwd = 0.12 + 1.5*pow(max(dot(V, -L), 0.0), 6.0);
  c += uLHLamp*(grime*fwd*lanternShade(P)*0.01/(d2 + 0.1));
  float da = sweepDelta(P);
  float inLens = smoothstep(LH_LAMP_Y - 1.5, LH_LAMP_Y - 1.0, q.y)*smoothstep(LH_LAMP_Y + 1.5, LH_LAMP_Y + 1.0, q.y);
  c += uLHLens*(uLHGlow*0.05*(0.4 + grime)*exp(-da*da/0.004)*inLens);
  gl_FragColor = vec4(c*exp(-uFogD*distance(P, cameraPosition)), 1.0);
}`;

export function createGlazingMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: GLASS_VERT,
    fragmentShader: LIB_COMMON + LH_COMMON + GLASS_FRAG,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// The scan sheet in the haze. The proxy mesh is the sheet's convex hull in carriage space (a fan
// between the roof and the deck slopes, thin across, from the glass out to the balustrade line);
// each fragment clips its view ray against the six planes and integrates the light along it.
const BEAM_VERT = /* glsl */ `
varying vec3 vW;
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const BEAM_FRAG = /* glsl */ `
uniform float uVolI, uW0, uWk, uX0, uX1;
varying vec3 vW;
vec3 toLocal(vec3 p){ vec3 d = p - uLHO; float c = cos(uBeamAng), s = sin(uBeamAng); return vec3(c*d.x + s*d.z, d.y, -s*d.x + c*d.z); }
vec3 toWorld(vec3 l){ float c = cos(uBeamAng), s = sin(uBeamAng); return uLHO + vec3(c*l.x - s*l.z, l.y, s*l.x + c*l.z); }
// keep the part of the ray where n·p <= d
void clipPlane(vec3 n, float d, vec3 o, vec3 dir, inout float t0, inout float t1){
  float dn = dot(n, dir), on = dot(n, o) - d;
  if (abs(dn) < 1e-7){ if (on > 0.0) t1 = -1.0; return; }
  float t = -on/dn;
  if (dn > 0.0) t1 = min(t1, t); else t0 = max(t0, t);
}
float smoke(vec3 p){ return 0.6*vnoise(p) + 0.4*vnoise(p*2.3 + 7.1); }
void main(){
  vec3 o = toLocal(cameraPosition);
  vec3 dir = normalize(toLocal(vW) - o);
  float t0 = 0.0, t1 = 1e5;
  clipPlane(vec3(-1.0, 0.0, 0.0), -uX0, o, dir, t0, t1);
  clipPlane(vec3(1.0, 0.0, 0.0), uX1, o, dir, t0, t1);
  clipPlane(vec3(-0.5*uWk, 0.0, 1.0), 0.5*uW0, o, dir, t0, t1);
  clipPlane(vec3(-0.5*uWk, 0.0, -1.0), 0.5*uW0, o, dir, t0, t1);
  clipPlane(vec3(-uFanUp, 1.0, 0.0), LH_LAMP_Y, o, dir, t0, t1);
  clipPlane(vec3(-uFanDn, -1.0, 0.0), -LH_LAMP_Y, o, dir, t0, t1);
  if (t1 <= t0) discard;
  float L = t1 - t0;
  float j = hash12(gl_FragCoord.xy + vec2(uTime*61.0, uTime*17.0));
  float acc = 0.0;
  for (int i = 0; i < 6; i++){
    vec3 p = o + dir*(t0 + (float(i) + j)*(L/6.0));
    float x = max(p.x, 0.1);
    float w = uW0 + uWk*x;
    float zc = 2.0*p.z/w;
    float e = (p.y - LH_LAMP_Y)/x;
    float fan = smoothstep(-uFanDn, -uFanDn + 0.12, e)*smoothstep(uFanUp, uFanUp - 0.12, e);
    float radial = smoothstep(uX0, uX0 + 0.5, x)*smoothstep(uX1, uX1 - 2.0, x)/(1.0 + 0.12*x);
    float dust = smoke(toWorld(p)*0.45 + vec3(0.0, uTime*0.04, uTime*0.09));
    float rays = 0.7 + 0.6*vnoise2(vec2(e*30.0, 0.5));     // streaks fanning out of the glazing
    acc += exp(-3.0*zc*zc)*fan*radial*(0.35 + 1.3*dust)*rays/w;
  }
  float I = uVolI*acc*(L/6.0)*2.0;
  I = I/(1.0 + I/30.0);
  gl_FragColor = vec4(uBeamCol*(I*exp(-uFogD*(t0 + 0.5*L))), 1.0);
}`;

// the sheet's hull in carriage space: x from the glazing to the balustrade line, |z| <= (W0 + WK x)/2
export const BEAM_HULL = { X0: LH.GLASS_R + 0.04, X1: 12.4, W0: 0.16, WK: 0.018 };

export function createBeamMaterial(uniforms, { inside = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uVolI: { value: 0 },
      uW0: { value: BEAM_HULL.W0 },
      uWk: { value: BEAM_HULL.WK },
      uX0: { value: BEAM_HULL.X0 },
      uX1: { value: BEAM_HULL.X1 },
      ...uniforms,
    },
    vertexShader: BEAM_VERT,
    fragmentShader: LIB_COMMON + LH_COMMON + BEAM_FRAG,
    side: inside ? THREE.BackSide : THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    depthTest: !inside,
    blending: THREE.AdditiveBlending,
  });
}

// Haze around the lantern: a camera-facing disc at the lamp, pulled toward the camera so the
// lantern does not cut it; it swells when the lens turns toward the camera.
const HALO_HEAD = /* glsl */ `
uniform vec3 uLHLampPos; uniform float uFogD;
`;
const HALO_VERT = /* glsl */ `
uniform float uHaloR;
varying vec2 vQ; varying float vD;
void main(){
  vec3 c = uLHLampPos;
  float d = distance(c, cameraPosition);
  vec3 toCam = (cameraPosition - c)/d;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 w = c + toCam*min(2.6, 0.5*d) + (right*position.x + up*position.y)*uHaloR;
  vQ = position.xy; vD = d;
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
}`;
const HALO_FRAG = /* glsl */ `
uniform vec3 uHaloCol;
varying vec2 vQ; varying float vD;
void main(){
  float q = length(vQ);
  if (q >= 1.0) discard;
  float edge = 1.0 - q*q; edge *= edge;
  float g = (0.5/(1.0 + q*q*400.0) + 0.5*exp(-q*7.0))*edge;
  gl_FragColor = vec4(uHaloCol*(g*exp(-uFogD*vD)), 1.0);
}`;

export function createHaloMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { uHaloR: { value: 5.0 }, uHaloCol: { value: new THREE.Color(0, 0, 0) }, ...uniforms },
    vertexShader: HALO_HEAD + HALO_VERT,
    fragmentShader: HALO_HEAD + HALO_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}
