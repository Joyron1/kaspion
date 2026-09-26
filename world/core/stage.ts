// The renderer, camera, lights and frame loop for the 3D world.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TIME } from './shade';

export interface Tap {
  kind: 'down' | 'move' | 'up';
  ray: THREE.Raycaster;
  /** normalized device coords, -1..1 */
  ndc: THREE.Vector2;
}

export type Tick = (dt: number, t: number) => void;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fog: THREE.FogExp2;
  /** where the camera aims; the sun's shadow box follows it */
  readonly focus = new THREE.Vector3();
  t = 0;
  private ticks = new Set<Tick>();
  private taps = new Set<(e: Tap) => void>();
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private disposed = false;
  lowPower: boolean;
  /** longest frame step; tests on slow software GL raise it so time still flows */
  maxDt = 0.05;
  /** logic steps per drawn frame (tests only) */
  substeps = 1;

  constructor(readonly canvas: HTMLCanvasElement, opts: { lite?: boolean } = {}) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.lowPower = coarse && Math.min(screen.width, screen.height) < 500;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(opts.lite ? 0.4 : Math.min(devicePixelRatio, this.lowPower ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps bright toy colors saturated (ACES pushed them toward yellow-white)
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = !opts.lite;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // reflections for glossy eyes and silver scales
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    room.dispose?.();
    pmrem.dispose();

    this.fog = new THREE.FogExp2('#1b6fa8', 0.02);
    this.scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight('#bff2ff', '#16345e', 1.35);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#fff4d6', 2.4);
    this.sun.castShadow = true;
    const sz = this.lowPower ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sz, sz);
    const cam = this.sun.shadow.camera;
    cam.left = -22; cam.right = 22; cam.top = 22; cam.bottom = -22; cam.near = 1; cam.far = 90;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 5;
    this.scene.add(this.sun, this.sun.target);

    // a cool fill from below-front so faces never go dark
    const fill = new THREE.DirectionalLight('#7fd6ff', 0.55);
    fill.position.set(-4, -2, 8);
    this.camera.add(fill);
    this.scene.add(this.camera);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    canvas.style.touchAction = 'none';
  }

  get aspect() { return this.camera.aspect; }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the play area in view on tall phones: widen the lens a little
    this.camera.fov = w / h < 1.2 ? 55 : 42;
    this.camera.updateProjectionMatrix();
  }

  onTick(fn: Tick) { this.ticks.add(fn); return () => this.ticks.delete(fn); }
  onTap(fn: (e: Tap) => void) { this.taps.add(fn); return () => this.taps.delete(fn); }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min(this.maxDt, (now - this.last) / 1000);
      this.last = now;
      this.step(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Advance and draw one frame (also used by tests with a fixed dt). */
  step(dt: number) {
    for (let i = 0; i < this.substeps; i++) {
      this.t += dt;
      TIME.value = this.t;
      for (const fn of this.ticks) fn(dt, this.t);
    }
    // sun shadows follow the action
    this.sun.position.set(this.focus.x + 12, this.focus.y + 40, this.focus.z + 10);
    this.sun.target.position.copy(this.focus);
    this.renderer.render(this.scene, this.camera);
  }

  private emit(kind: Tap['kind'], e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    for (const fn of this.taps) fn({ kind, ray: this.ray, ndc: this.ndc });
  }
  private down = false;
  private onDown = (e: PointerEvent) => { this.down = true; this.emit('down', e); };
  private onMove = (e: PointerEvent) => { if (this.down || e.pointerType === 'mouse') this.emit('move', e); };
  private onUp = (e: PointerEvent) => { if (!this.down) return; this.down = false; this.emit('up', e); };

  /** Project a world point to CSS pixels (for HTML labels over the scene). */
  toScreen(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * this.canvas.clientWidth, y: (1 - v.y) / 2 * this.canvas.clientHeight };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose?.();
    });
    this.renderer.dispose();
  }
}
