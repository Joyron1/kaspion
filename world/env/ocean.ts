// The deep sea: gradient water, sandy floor with caustics, light shafts from the
// surface, drifting "marine snow", and gardens of coral, kelp, rocks and anemones.

import * as THREE from 'three';
import { clay, dress, TIME } from '../core/shade';
import { rng, rockGeo, sweep, V } from '../core/geo';
import { shaft, softDot } from '../core/tex';
import type { Stage } from '../core/stage';

export interface Mood {
  top: THREE.Color;      // water color toward the surface
  deep: THREE.Color;     // water color in the depths / fog
  sun: number;           // sun strength
  shafts: number;        // light shaft strength
}

export const MOODS = {
  shallow: { top: '#8ee7ff', deep: '#1c86c2', sun: 2.0, shafts: 0.5 },
  blue: { top: '#5fc9f2', deep: '#135f9e', sun: 1.8, shafts: 0.42 },
  deep: { top: '#3f8fd0', deep: '#0b3c75', sun: 1.5, shafts: 0.32 },
  dusk: { top: '#f0a6c8', deep: '#2b3c86', sun: 1.4, shafts: 0.3 },
  night: { top: '#3a4fa8', deep: '#0b1a4a', sun: 0.8, shafts: 0.12 },
} satisfies Record<string, { top: string; deep: string; sun: number; shafts: number }>;
export type MoodName = keyof typeof MOODS;

export function mood(name: MoodName): Mood {
  const m = MOODS[name];
  return { top: new THREE.Color(m.top), deep: new THREE.Color(m.deep), sun: m.sun, shafts: m.shafts };
}

export class Ocean {
  readonly group = new THREE.Group();
  private sky: THREE.Mesh;
  private skyU: { uTop: { value: THREE.Color }; uDeep: { value: THREE.Color } };
  private shafts: THREE.Mesh[] = [];
  private shaftMat: THREE.MeshBasicMaterial;
  private snow: THREE.Points;
  readonly now: Mood = mood('blue');
  /** games seen from above dim the sun a little so colors don't wash out */
  sunScale = 1;
  private floorMat: THREE.MeshStandardMaterial;
  /** flat spots on the sea floor (mission areas) */
  private flats: { x: number; z: number; r: number }[] = [];

  constructor(private stage: Stage, opts: { length: number; width: number; flats: { x: number; z: number; r: number }[] }) {
    this.flats = opts.flats;
    const scene = stage.scene;
    scene.add(this.group);

    // gradient water all around
    this.skyU = { uTop: { value: this.now.top.clone() }, uDeep: { value: this.now.deep.clone() } };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: this.skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uDeep; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = mix(uDeep, uTop, smoothstep(-0.15, 0.85, h));
        c = mix(c, uDeep * 0.55, smoothstep(0.0, -0.6, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // sea floor
    const { length, width } = opts;
    const seg = stage.lowPower ? [70, 220] : [100, 320];
    const fg = new THREE.PlaneGeometry(width, length, seg[0], seg[1]);
    fg.rotateX(-Math.PI / 2);
    fg.translate(0, 0, -length / 2 + 90);
    const p = fg.getAttribute('position');
    const col = new Float32Array(p.count * 3);
    const sandA = new THREE.Color('#dcbd84'), sandB = new THREE.Color('#b48f5a'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = this.height(x, z);
      p.setY(i, h);
      c.copy(sandA).lerp(sandB, THREE.MathUtils.clamp(0.5 + h * 0.12 + Math.sin(x * 0.7 + z * 0.3) * 0.15, 0, 1));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    fg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    fg.computeVertexNormals();
    this.floorMat = dress(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1 }), { caustics: 0.6 });
    const floor = new THREE.Mesh(fg, this.floorMat);
    floor.receiveShadow = true;
    this.group.add(floor);

    // light shafts (billboards that follow the camera)
    this.shaftMat = new THREE.MeshBasicMaterial({ map: shaft(), color: '#dff9ff', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const n = stage.lowPower ? 7 : 11;
    const r = rng(7);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5 + r() * 4, 45), this.shaftMat);
      m.userData = { ox: (r() - 0.5) * 60, oz: -r() * 50 - 5, ph: r() * 10, tilt: 0.25 + r() * 0.15 };
      m.renderOrder = 5;
      this.shafts.push(m);
      scene.add(m);
    }

    // marine snow: tiny drifting specks in a box around the camera
    const N = stage.lowPower ? 900 : 1800;
    const sp = new Float32Array(N * 3), ss = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      sp[i * 3] = r() * 60; sp[i * 3 + 1] = r() * 30; sp[i * 3 + 2] = r() * 60; ss[i] = 0.5 + r() * 1.5;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('size', new THREE.BufferAttribute(ss, 1));
    const snowMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: TIME, uCam: { value: new THREE.Vector3() }, uMap: { value: softDot() }, uScale: { value: 300 } },
      vertexShader: `uniform float uTime; uniform vec3 uCam; uniform float uScale; attribute float size; varying float vA;
        void main(){
          vec3 box = vec3(60.0, 30.0, 60.0);
          vec3 p = position + vec3(sin(uTime*0.2+position.y)*0.8, -uTime*0.35*size, cos(uTime*0.15+position.x)*0.8);
          p = mod(p - uCam + box*0.5, box) + uCam - box*0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          vA = smoothstep(30.0, 6.0, d) * smoothstep(0.5, 3.0, d);
          gl_PointSize = size * uScale * 0.02 / max(d, 0.5) * 4.0;
        }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(0.85,0.97,1.0), t.a * vA * 0.55); }`,
    });
    this.snow = new THREE.Points(sg, snowMat);
    this.snow.frustumCulled = false;
    scene.add(this.snow);

    stage.onTick((dt, t) => this.tick(dt, t));
  }

  /** sea-floor height: soft dunes, flattened around the mission areas */
  height(x: number, z: number): number {
    let h = Math.sin(x * 0.08 + z * 0.05) * 1.3 + Math.sin(x * 0.21 - z * 0.13) * 0.55 + Math.cos(z * 0.09) * 0.9;
    h += Math.abs(x) > 26 ? (Math.abs(x) - 26) * 0.35 : 0; // walls of the valley
    for (const f of this.flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      const k = THREE.MathUtils.smoothstep(d, f.r, f.r * 1.8);
      h = h * k;
    }
    return h;
  }

  /** blend toward a mood (called every frame with the station's mood) */
  follow(target: Mood, dt: number) {
    const k = Math.min(1, dt * 0.8);
    this.now.top.lerp(target.top, k);
    this.now.deep.lerp(target.deep, k);
    this.now.sun += (target.sun - this.now.sun) * k;
    this.now.shafts += (target.shafts - this.now.shafts) * k;
  }

  private tick(dt: number, t: number) {
    const cam = this.stage.camera.position;
    this.sky.position.copy(cam);
    this.skyU.uTop.value.copy(this.now.top);
    this.skyU.uDeep.value.copy(this.now.deep);
    this.stage.fog.color.copy(this.now.deep).lerp(this.now.top, 0.25);
    this.stage.sun.intensity = this.now.sun * this.sunScale;
    this.stage.hemi.color.copy(this.now.top).lerp(new THREE.Color('#ffffff'), 0.4);
    this.shaftMat.opacity = this.now.shafts;
    const camYaw = Math.atan2(this.stage.camera.position.x - this.stage.focus.x, this.stage.camera.position.z - this.stage.focus.z);
    for (const m of this.shafts) {
      const u = m.userData as { ox: number; oz: number; ph: number; tilt: number };
      // stay in a band in front of the camera, snapping so they don't slide with it
      m.position.set(this.stage.focus.x + u.ox, 14, this.stage.focus.z + u.oz * 0.6 + 8);
      m.rotation.set(0, camYaw, u.tilt + Math.sin(t * 0.2 + u.ph) * 0.05);
      m.scale.x = 1 + Math.sin(t * 0.5 + u.ph) * 0.25;
    }
    const sm = this.snow.material as THREE.ShaderMaterial;
    (sm.uniforms.uCam.value as THREE.Vector3).copy(cam);
    sm.uniforms.uScale.value = this.stage.renderer.domElement.height;
    void dt;
  }
}

// ---------------------------------------------------------------- gardens

export type Theme = 'coral' | 'kelp' | 'rocks' | 'sparse' | 'glow';

// shapes and materials shared by every garden
let shared: Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material }> | null = null;
function props() {
  if (shared) return shared;
  const brain = rockGeo(9, 2);
  brain.scale(1, 0.7, 1);
  const tubes = new THREE.CylinderGeometry(0.28, 0.22, 1.6, 12, 1, true);
  tubes.translate(0, 0.8, 0);
  const tubeMat = clay('#ffffff', { rough: 0.6, rim: 0.5, caustics: 0.4 });
  tubeMat.side = THREE.DoubleSide;
  const shell = new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  shell.scale(1, 0.45, 1.2);
  shared = {
    rock: { geo: rockGeo(3, 2), mat: clay('#ffffff', { rough: 0.9, rim: 0.15, caustics: 0.8 }) },
    brain: { geo: brain, mat: clay('#ffffff', { rough: 0.7, rim: 0.4, caustics: 0.5 }) },
    branch: { geo: branchGeo(), mat: clay('#ffffff', { rough: 0.55, rim: 0.5, caustics: 0.4 }) },
    tube: { geo: tubes, mat: tubeMat },
    kelp: { geo: kelpGeo(), mat: dress(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide }), { sway: 0.012, rim: 0.3, caustics: 0.4 }) },
    anem: { geo: anemoneGeo(), mat: dress(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), { sway: 0.25, rim: 0.6, rimColor: '#ffd6f0', caustics: 0.3 }) },
    shell: { geo: shell, mat: clay('#ffffff', { rough: 0.35, rim: 0.4 }) },
  };
  return shared;
}

/** One patch of sea garden (a station and the way to it), drawn with instancing. */
export class Garden {
  readonly group = new THREE.Group();
  private kinds: { mesh: THREE.InstancedMesh; n: number }[] = [];
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  readonly center = new THREE.Vector3();
  /** keep the swim lane clear: true when a prop of radius r at (x, z) would be in the way */
  blocked: ((x: number, z: number, r: number) => boolean) | null = null;

  constructor(parent: THREE.Object3D, lowPower: boolean) {
    parent.add(this.group);
    const cap = lowPower ? 0.6 : 1;
    const P = props();
    const make = (name: string, max: number, shadow = true) => {
      const m = new THREE.InstancedMesh(P[name].geo, P[name].mat, Math.round(max * cap));
      m.count = 0;
      m.castShadow = shadow; m.receiveShadow = true;
      this.group.add(m);
      const k = { mesh: m, n: 0 };
      this.kinds.push(k);
      return k;
    };
    this.rock = make('rock', 70);
    this.brain = make('brain', 80);
    this.branch = make('branch', 60);
    this.tube = make('tube', 110);
    this.kelp = make('kelp', 190, false);
    this.anem = make('anem', 60, false);
    this.shell = make('shell', 50, false);
  }

  /** after planting: fix bounds so far gardens can be skipped */
  finish() {
    for (const k of this.kinds) { k.mesh.computeBoundingSphere(); k.mesh.computeBoundingBox(); }
    const box = new THREE.Box3().setFromObject(this.group);
    box.getCenter(this.center);
  }
  rock!: { mesh: THREE.InstancedMesh; n: number };
  brain!: { mesh: THREE.InstancedMesh; n: number };
  branch!: { mesh: THREE.InstancedMesh; n: number };
  tube!: { mesh: THREE.InstancedMesh; n: number };
  kelp!: { mesh: THREE.InstancedMesh; n: number };
  anem!: { mesh: THREE.InstancedMesh; n: number };
  shell!: { mesh: THREE.InstancedMesh; n: number };

  private put(k: { mesh: THREE.InstancedMesh; n: number }, x: number, y: number, z: number, s: THREE.Vector3 | number, rotY: number, color: THREE.ColorRepresentation, tilt = 0) {
    if (k.n >= k.mesh.instanceMatrix.count) return;
    // tall kelp needs a wider berth from the lane than low coral
    const clearance = k === this.kelp ? 8 : k === this.shell ? 0 : 5;
    if (clearance && this.blocked?.(x, z, clearance)) return;
    const d = this.dummy;
    d.position.set(x, y, z);
    d.rotation.set(tilt, rotY, tilt * 0.5);
    if (typeof s === 'number') d.scale.setScalar(s); else d.scale.copy(s);
    d.updateMatrix();
    k.mesh.setMatrixAt(k.n, d.matrix);
    k.mesh.setColorAt(k.n, this.color.set(color));
    k.n++;
    k.mesh.count = k.n;
    k.mesh.instanceMatrix.needsUpdate = true;
    if (k.mesh.instanceColor) k.mesh.instanceColor.needsUpdate = true;
    k.mesh.boundingSphere = null;
  }

  /**
   * Plant a garden in a ring around (cx, cz): nothing inside `keep`, thinning out by `reach`.
   */
  plant(cx: number, cz: number, keep: number, reach: number, theme: Theme, seed: number, height: (x: number, z: number) => number) {
    const r = rng(seed);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const CORALS = ['#ff6f91', '#ff9671', '#ffc75f', '#f9f871', '#c56cf0', '#ff5e78', '#7ee8c6', '#ffa3d7'];
    const GLOWS = ['#8ef6ff', '#b69cff', '#ff9ff3', '#7dffb3'];
    const ROCKS = ['#8a97b8', '#7c8aad', '#9aa6c2', '#6f7fa6'];
    const dens = theme === 'sparse' ? 0.35 : 1;
    const spot = (minR = keep) => {
      const a = r() * Math.PI * 2;
      const d = minR + Math.pow(r(), 0.8) * (reach - minR);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      return { x, z, y: height(x, z) };
    };
    // rock clusters with coral on top
    for (let i = 0; i < 26 * dens; i++) {
      const p = spot(keep + 2);
      const s = 0.8 + r() * 2.6;
      this.put(this.rock, p.x, p.y - s * 0.25, p.z, V(s * (1 + r() * 0.6), s * (0.6 + r() * 0.5), s), r() * 6, pick(ROCKS));
      if (theme !== 'rocks' && r() < 0.7) this.put(this.brain, p.x + (r() - 0.5), p.y + s * 0.45, p.z + (r() - 0.5), 0.5 + r() * 0.6, r() * 6, theme === 'glow' ? pick(GLOWS) : pick(CORALS));
    }
    const coralN = theme === 'coral' ? 60 : theme === 'glow' ? 40 : theme === 'kelp' ? 16 : theme === 'rocks' ? 14 : 12;
    for (let i = 0; i < coralN; i++) {
      const p = spot();
      const colr = theme === 'glow' ? pick(GLOWS) : pick(CORALS);
      const kind = r();
      if (kind < 0.35) this.put(this.branch, p.x, p.y - 0.1, p.z, 0.8 + r() * 1.4, r() * 6, colr);
      else if (kind < 0.6) {
        for (let k = 0; k < 3; k++) this.put(this.tube, p.x + (r() - 0.5) * 0.9, p.y - 0.1, p.z + (r() - 0.5) * 0.9, V(0.8 + r() * 0.5, 0.6 + r() * 1.1, 0.8 + r() * 0.5), 0, colr, (r() - 0.5) * 0.3);
      } else if (kind < 0.85) this.put(this.brain, p.x, p.y - 0.1, p.z, 0.6 + r() * 1.1, r() * 6, colr);
      else this.put(this.anem, p.x, p.y, p.z, 0.8 + r() * 0.8, r() * 6, pick(['#ff7eb6', '#ffb86b', '#b58cff', '#6ff7d0']));
    }
    const kelpN = theme === 'kelp' ? 110 : theme === 'sparse' ? 8 : 26;
    for (let i = 0; i < kelpN; i++) {
      const p = spot(keep + 1);
      this.put(this.kelp, p.x, p.y - 0.2, p.z, V(1 + r() * 0.6, 0.7 + r() * (theme === 'kelp' ? 1.4 : 0.7), 1), r() * 6, pick(['#5fbf4d', '#7fcf55', '#3fa55a', '#a3d45a']));
    }
    for (let i = 0; i < 14 * dens; i++) {
      const p = spot(keep * 0.6);
      this.put(this.shell, p.x, p.y + 0.02, p.z, 0.6 + r() * 0.8, r() * 6, pick(['#ffd9e6', '#fff1c9', '#ffc9a8', '#e8f0ff']));
    }
    for (let i = 0; i < 10 * dens; i++) {
      const p = spot(keep + 1);
      this.put(this.anem, p.x, p.y, p.z, 0.7 + r() * 0.7, r() * 6, pick(['#ff7eb6', '#ffb86b', '#b58cff', '#6ff7d0']));
    }
  }
}

function branchGeo(): THREE.BufferGeometry {
  const gs: THREE.BufferGeometry[] = [];
  const add = (from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, len);
    gs.push(sweep([from, from.clone().lerp(to, 0.5).add(V(0.02, 0, 0.02)), to], u => rad * (1 - u * 0.35), 6, 8));
    const tip = new THREE.SphereGeometry(rad * 0.75, 8, 6);
    tip.translate(to.x, to.y, to.z);
    gs.push(tip);
    if (depth > 0) {
      for (const a of [-0.6, 0.6]) {
        const d = dir.clone().applyAxisAngle(V(0, 0, 1), a).applyAxisAngle(V(0, 1, 0), depth * 1.3 + a);
        add(to, d.normalize(), len * 0.75, rad * 0.75, depth - 1);
      }
    }
  };
  add(V(0, 0, 0), V(0, 1, 0), 0.7, 0.13, 2);
  return mergeAll(gs);
}

function kelpGeo(): THREE.BufferGeometry {
  // a tall wavy ribbon with leaf bulges, bent a little
  const g = new THREE.PlaneGeometry(0.55, 7, 1, 28);
  g.translate(0, 3.5, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), x = p.getX(i);
    const w = 0.7 + Math.sin(y * 2.2) * 0.35;
    p.setX(i, x * w + Math.sin(y * 0.8) * 0.25);
    p.setZ(i, Math.sin(y * 1.3) * 0.12);
  }
  const g2 = g.clone();
  g2.rotateY(Math.PI / 2);
  const m = mergeAll([g, g2]);
  m.computeVertexNormals();
  return m;
}

function anemoneGeo(): THREE.BufferGeometry {
  const gs: THREE.BufferGeometry[] = [];
  const base = new THREE.CylinderGeometry(0.3, 0.38, 0.35, 12);
  base.translate(0, 0.17, 0);
  gs.push(base);
  const r = rng(4);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.25;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = 0.5 + r() * 0.35;
    gs.push(sweep([V(x, 0.3, z), V(x * 1.8, 0.3 + h * 0.5, z * 1.8), V(x * 2.6, 0.3 + h, z * 2.6)], u => 0.045 * (1 - u * 0.4) + (u > 0.9 ? 0.02 : 0), 6, 6));
  }
  return mergeAll(gs);
}

function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // minimal merge (position, normal, uv, index) without pulling in BufferGeometryUtils
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  let off = 0;
  for (let g of gs) {
    if (!g.index) g = g.toNonIndexed();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
    else for (let i = 0; i < p.count; i++) idx.push(i + off);
    off += p.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}
