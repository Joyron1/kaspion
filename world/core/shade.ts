// Material recipes for the 3D world: soft "animated film" plastic with a rim light,
// shimmering caustics on everything the sun reaches, and vertex motion (swimming,
// swaying). All effects are small injections into three's standard shaders.

import * as THREE from 'three';

/** One clock shared by every animated material. */
export const TIME = { value: 0 };

export interface Wave {
  /** axis the body bends along: 'z' for fish (side to side), 'y' for whales (up and down) */
  axis: 'y' | 'z';
  amp: number;
  freq: number;
  speed: number;
  /** body x where bending starts (tail side is -x) */
  from: number;
  /** body x where bending is full */
  to: number;
  phase?: number;
}

export interface Look {
  rim?: number;          // strength of the edge glow
  rimColor?: THREE.ColorRepresentation;
  caustics?: number;     // strength of the moving light pattern
  wave?: Wave;
  sway?: number;         // plants: bend the top of the mesh in the current
}

const CAUSTIC_GLSL = /* glsl */ `
float causticAt(vec2 p, float t) {
  p = mod(p * 0.22, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * 0.35 * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.6);
}
`;

/** Adds the world's looks to a standard/physical material. Returns the same material. */
export function dress<T extends THREE.MeshStandardMaterial>(mat: T, look: Look): T {
  const rim = look.rim ?? 0;
  const caustics = look.caustics ?? 0;
  const wave = look.wave;
  const sway = look.sway ?? 0;
  const u = {
    uTime: TIME,
    uRim: { value: rim },
    uRimColor: { value: new THREE.Color(look.rimColor ?? '#bff3ff') },
    uCaustic: { value: caustics },
    uWaveAmp: { value: wave?.amp ?? 0 },
    uWaveFreq: { value: wave?.freq ?? 0 },
    uWaveSpeed: { value: wave?.speed ?? 0 },
    uWaveFrom: { value: wave?.from ?? 0 },
    uWaveTo: { value: wave?.to ?? 1 },
    uWavePhase: { value: wave?.phase ?? 0 },
    uSway: { value: sway },
  };
  mat.userData.u = u;
  const key = `kw:${rim > 0 ? 'r' : ''}${caustics > 0 ? 'c' : ''}${wave ? 'w' + wave.axis : ''}${sway ? 's' : ''}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uWaveAmp, uWaveFreq, uWaveSpeed, uWaveFrom, uWaveTo, uWavePhase, uSway;
varying vec3 vWPos; varying vec3 vWNorm;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${wave ? `{
  float k = smoothstep(uWaveFrom, uWaveTo, -position.x) ;
  float w = sin(position.x * uWaveFreq + uTime * uWaveSpeed + uWavePhase) * uWaveAmp * k;
  transformed.${wave.axis} += w;
}` : ''}
${sway ? `{
  vec4 base = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
  base = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  #endif
  float h = max(position.y, 0.0);
  float s = h * h * uSway;
  transformed.x += sin(uTime * 0.9 + base.x * 0.35 + base.z * 0.2 + position.y * 0.4) * s;
  transformed.z += cos(uTime * 0.7 + base.z * 0.3 + position.y * 0.3) * s * 0.6;
}` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
{
  #ifdef USE_INSTANCING
  vec4 wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  vWNorm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  #else
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vWNorm = normalize(mat3(modelMatrix) * objectNormal);
  #endif
  vWPos = wp.xyz;
}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uRim; uniform vec3 uRimColor; uniform float uCaustic;
varying vec3 vWPos; varying vec3 vWNorm;
${caustics > 0 ? CAUSTIC_GLSL : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
${rim > 0 ? `{
  float r = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += uRimColor * pow(r, 2.6) * uRim;
}` : ''}`)
      .replace('#include <opaque_fragment>', `${caustics > 0 ? `{
  float up = clamp(vWNorm.y * 0.8 + 0.35, 0.0, 1.0);
  float depthFade = clamp(1.0 - (-vWPos.y) * 0.02, 0.35, 1.0);
  float c = causticAt(vWPos.xz, uTime) + 0.6 * causticAt(vWPos.xz * 1.7 + 3.0, uTime * 1.3);
  outgoingLight += diffuseColor.rgb * vec3(0.75, 0.95, 1.0) * c * up * depthFade * uCaustic;
}` : ''}
#include <opaque_fragment>`);
  };
  return mat;
}

/** Soft, slightly glossy "toy plastic" surface: the house style for every creature. */
export function clay(color: THREE.ColorRepresentation, opts: { rough?: number; rim?: number; rimColor?: THREE.ColorRepresentation; wave?: Wave; emissive?: THREE.ColorRepresentation; vertexColors?: boolean; caustics?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.48,
    metalness: 0.02,
    vertexColors: opts.vertexColors ?? false,
    emissive: opts.emissive ?? '#000000',
  });
  return dress(m, { rim: opts.rim ?? 0.55, rimColor: opts.rimColor, wave: opts.wave, caustics: opts.caustics ?? 0.35 });
}

/** Kaspion's silver: polished, a little rainbow at the edges. */
export function silver(opts: { wave?: Wave; vertexColors?: boolean } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#f2f7ff',
    metalness: 0.7,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    iridescence: 0.9,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [180, 520],
    vertexColors: opts.vertexColors ?? false,
    envMapIntensity: 2.2,
  });
  return dress(m, { rim: 0.7, rimColor: '#dff8ff', wave: opts.wave, caustics: 0.45 });
}

/** Glossy eye white / iris / pupil. */
export function gloss(color: THREE.ColorRepresentation, rough = 0.12) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
}

/** Unlit color (highlights, silhouettes). */
export function flat(color: THREE.ColorRepresentation, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
}

/** The wave uniforms of a dressed material, to change swim intensity at runtime. */
export function waveOf(mat: THREE.Material): { uWaveAmp: { value: number }; uWaveSpeed: { value: number } } | null {
  const u = (mat.userData as { u?: Record<string, { value: number }> }).u;
  return u ? { uWaveAmp: u.uWaveAmp, uWaveSpeed: u.uWaveSpeed } : null;
}
