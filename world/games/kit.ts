// What every mini-game gets from the world, and small helpers they share.

import * as THREE from 'three';
import type { Stage, Tap } from '../core/stage';
import type { Fx } from '../core/fx';
import { makeCreature, type Creature, type Kind, type MakeOpts } from '../characters';

export interface Ctx {
  stage: Stage;
  fx: Fx;
  /** the game's own space, at the station (y = 0 is the sand) */
  group: THREE.Group;
  kaspion: Creature;
  /** 0 = easiest .. 1 = hardest */
  level: number;
  /** how many times the child does the task (parents set this; default 5) */
  count: number;
  say(key: string): Promise<void>;
  sfx(name: 'tap' | 'pop' | 'shell' | 'bonk' | 'sparkle' | 'join' | 'stage' | 'win' | 'whale' | 'whaleHappy' | 'splash' | 'whoosh' | 'giggle' | 'call' | 'munch'): void;
  /** play a musical note (Hz) */
  note(freq: number): void;
  /** food Kaspion carries for the way (the food station adds to it) */
  addFood(n: number): void;
  praise(): void;
  /** half the visible width at the play area's depth */
  halfWidth(depth?: number): number;
  /** fast bot play for tests */
  bot: boolean;
}

export interface Game {
  /** camera placement relative to the station */
  camera: { pos: THREE.Vector3; look: THREE.Vector3 };
  /** where Kaspion waits while the child plays (null: the game moves him) */
  kaspionSpot: THREE.Vector3 | null;
  update(dt: number, t: number): void;
  tap(e: Tap): void;
  /** items done / total, for the HUD */
  progress(): { got: number; goal: number };
  done(): boolean;
  /** world point to point at when the child seems stuck */
  hint(): THREE.Vector3 | null;
  /** perform one correct move (tests) */
  auto(): void;
  dispose(): void;
  /** test-only peek at internal state */
  debug?(): unknown;
  /** 0 = normal light .. 1 = dark sea (the pearls game lights it up) */
  darkness?(): number;
}

/** A creature scaled so its length is about `target` world units. */
export function sized(kind: Kind, target: number, o: MakeOpts = {}): Creature {
  const c = makeCreature(kind, o);
  const k = target / c.size;
  c.root.scale.multiplyScalar(k);
  c.size = target;
  return c;
}

/** Which of `roots` (or their children) the tap ray hits first. */
export function pick<T extends { root: THREE.Object3D }>(ray: THREE.Raycaster, items: T[]): T | null {
  const hits = ray.intersectObjects(items.map(i => i.root), true);
  for (const h of hits) {
    let o: THREE.Object3D | null = h.object;
    while (o) {
      const it = items.find(i => i.root === o);
      if (it) return it;
      o = o.parent;
    }
  }
  return null;
}

/** Profile creatures face +x; front-facing ones look at the camera by default. */
export const PROFILE: Record<Kind, boolean> = {
  kaspion: true, fish: true, whale: true, seahorse: true, turtle: true,
  crab: false, octopus: false, starfish: false, jelly: false,
};

/** Turn a creature toward a direction on the x-z plane (+x = right). */
export function face(c: Creature, dx: number, dz = 0) {
  if (!PROFILE[c.kind]) { c.root.rotation.y = THREE.MathUtils.clamp(dx * 0.3, -0.5, 0.5); return; }
  c.root.rotation.y = Math.atan2(-dz, dx);
}

/** Ease `c` toward `to`; returns true when there. Turns to face where it goes. */
export function swimTo(c: Creature, to: THREE.Vector3, dt: number, speed = 5, turn = true): boolean {
  const p = c.root.position;
  const d = to.clone().sub(p);
  const len = d.length();
  if (len < 0.05) { c.swim = Math.max(0, c.swim - dt * 2); return true; }
  const step = Math.min(len, Math.max(speed * dt * Math.min(1, len / 1.5), 0.02));
  p.addScaledVector(d.normalize(), step);
  c.swim = Math.min(1, c.swim + dt * 3);
  if (turn && Math.abs(d.x) > 0.02) {
    const want = PROFILE[c.kind] ? (d.x >= 0 ? 0 : -Math.PI) : 0; // turn via facing the camera
    c.root.rotation.y += (want - c.root.rotation.y) * Math.min(1, dt * 6);
  }
  return false;
}

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function removeCreature(c: Creature) {
  c.root.parent?.remove(c.root);
  c.root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}

/** a soft glossy bubble around a baby */
export function bubbleShell(r: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 20),
    new THREE.MeshPhysicalMaterial({ color: '#dff8ff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.4, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, depthWrite: false }),
  );
  m.renderOrder = 3;
  return m;
}

/** A tap ray from the camera through a world point (bot play). */
export function rayTo(ctx: Ctx, p: THREE.Vector3): THREE.Raycaster {
  const cam = ctx.stage.camera;
  const r = new THREE.Raycaster(cam.position.clone(), p.clone().sub(cam.position).normalize());
  r.camera = cam;
  return r;
}

const HIT = new THREE.MeshBasicMaterial({ visible: false });

/**
 * A generous invisible touch target around a creature, so small fingers
 * don't miss between tentacles and fins. Returns its world-space center.
 */
export function addHitArea(c: Creature, grow = 1.1): THREE.Mesh {
  c.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(c.root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), HIT);
  m.scale.set(size.x / 2 * grow, size.y / 2 * grow, Math.max(size.z / 2, Math.min(size.x, size.y) / 4));
  c.root.add(m);
  // place/scale in the root's local space
  m.position.copy(c.root.worldToLocal(center.clone()));
  m.scale.divideScalar(c.root.scale.x);
  c.root.userData.hit = m;
  return m;
}

/** where to aim at a creature (its touch target if it has one) */
export function aimAt(c: Creature): THREE.Vector3 {
  const hit = c.root.userData.hit as THREE.Mesh | undefined;
  return (hit ?? c.root).getWorldPosition(new THREE.Vector3());
}

/** Where a tap ray meets a flat plane in the game's space (e.g. z = 0 facing the camera). */
export function onPlane(ctx: Ctx, ray: THREE.Raycaster, normal: THREE.Vector3, point: THREE.Vector3): THREE.Vector3 | null {
  const wp = ctx.group.localToWorld(point.clone());
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, wp);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return ctx.group.worldToLocal(hit);
}

/**
 * Kaspion swims toward the finger (on a flat plane facing the camera), inside a box.
 * Used by the bubble and food games.
 */
export class Steer {
  target = new THREE.Vector3();
  active = false;
  constructor(private ctx: Ctx, private min: THREE.Vector3, private max: THREE.Vector3, public speed = 6) {}
  tap(e: Tap) {
    if (e.kind === 'up') { this.active = false; return; }
    if (e.kind === 'move' && !this.active) return;
    const p = onPlane(this.ctx, e.ray, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
    if (!p) return;
    this.target.copy(p).clamp(this.min, this.max);
    this.active = true;
  }
  goTo(p: THREE.Vector3) { this.target.copy(p).clamp(this.min, this.max); this.active = true; }
  update(dt: number) {
    const k = this.ctx.kaspion;
    const p = k.root.position;
    const d = this.target.clone().sub(p);
    const len = d.length();
    if (!this.active || len < 0.08) { k.swim = Math.max(0.15, k.swim - dt * 2); this.active = this.active && len >= 0.08; return; }
    p.addScaledVector(d.normalize(), Math.min(len, this.speed * dt * Math.min(1, 0.4 + len / 2)));
    k.swim = Math.min(1, k.swim + dt * 4);
    const want = d.x >= 0 ? 0 : -Math.PI;
    k.root.rotation.y += (want - k.root.rotation.y) * Math.min(1, dt * 8);
    k.root.rotation.z = THREE.MathUtils.clamp(d.y * 0.4, -0.35, 0.35);
  }
}

/** Drag objects with a finger on a plane facing the camera at depth z. */
export class Drag<T extends { root: THREE.Object3D }> {
  held: T | null = null;
  private offset = new THREE.Vector3();
  constructor(private ctx: Ctx, private z: number) {}
  down(e: Tap, items: T[]): T | null {
    const hit = pick(e.ray, items);
    if (!hit) return null;
    const p = onPlane(this.ctx, e.ray, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, this.z));
    this.held = hit;
    this.offset.copy(hit.root.position).sub(p ?? hit.root.position);
    return hit;
  }
  move(e: Tap) {
    if (!this.held) return;
    const p = onPlane(this.ctx, e.ray, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, this.z));
    if (p) this.held.root.position.copy(p.add(this.offset)).setZ(this.z + 0.6);
  }
  up(): T | null { const h = this.held; this.held = null; return h; }
}

/** Every item within reach of Kaspion's mouth. */
export function near(ctx: Ctx, p: THREE.Vector3, r: number) {
  return ctx.kaspion.root.position.distanceTo(p) < r;
}
