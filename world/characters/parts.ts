// Shared character parts: big glossy cartoon eyes, smiles, blush, and the Creature shape.

import * as THREE from 'three';
import { flat, gloss } from '../core/shade';
import { mesh, sweep, V } from '../core/geo';

export type Kind = 'kaspion' | 'fish' | 'whale' | 'crab' | 'octopus' | 'seahorse' | 'turtle' | 'starfish' | 'jelly';

export interface Creature {
  kind: Kind;
  /** move / turn this */
  root: THREE.Group;
  /** inner group for bobbing and happy flips */
  body: THREE.Group;
  /** paintable parts for the coloring game: name -> materials */
  parts: Record<string, THREE.MeshStandardMaterial[]>;
  /** how big it is in world units (roughly its length) */
  size: number;
  update(dt: number, t: number): void;
  /** 0 = resting, 1 = swimming hard */
  swim: number;
  /** a happy jump-spin */
  cheer(): void;
  /** a "no no" wiggle */
  shake(): void;
  /** eyes follow this point (world space), or look ahead when null */
  lookAt: THREE.Vector3 | null;
  /** a gentle side-to-side sway of the body, set by the creature's own swimming */
  yaw: number;
}

const WHITE = gloss('#ffffff', 0.08);
const PUPIL = gloss('#0d1426', 0.05);
const SHINE = flat('#ffffff');

export interface Eye { group: THREE.Group; iris: THREE.Group; lid: number }

/** A Pixar-style eye looking down its local +z. */
export function eye(r: number, irisColor: THREE.ColorRepresentation = '#3a7bd5'): Eye {
  const group = new THREE.Group();
  const ball = mesh(new THREE.SphereGeometry(r, 28, 20), WHITE, false);
  group.add(ball);
  const iris = new THREE.Group();
  const irisMesh = mesh(new THREE.SphereGeometry(r * 0.62, 24, 16), gloss(irisColor, 0.2), false);
  irisMesh.scale.set(1, 1, 0.42);
  irisMesh.position.z = r * 0.74;
  const pupil = mesh(new THREE.SphereGeometry(r * 0.4, 20, 14), PUPIL, false);
  pupil.scale.set(1, 1, 0.4);
  pupil.position.z = r * 0.86;
  const shine = mesh(new THREE.SphereGeometry(r * 0.15, 10, 8), SHINE, false);
  shine.position.set(r * 0.24, r * 0.26, r * 0.95);
  const shine2 = mesh(new THREE.SphereGeometry(r * 0.07, 8, 6), SHINE, false);
  shine2.position.set(-r * 0.2, -r * 0.2, r * 0.97);
  iris.add(irisMesh, pupil, shine, shine2);
  group.add(iris);
  return { group, iris, lid: 1 };
}

/** A curved smile line on a surface, mouth corners up. `w` wide, facing +z. */
export function smile(w: number, thick: number, color: THREE.ColorRepresentation = '#1b2440', curve = 0.35): THREE.Mesh {
  const pts = [V(-w / 2, w * curve * 0.6, 0), V(-w / 4, 0, 0), V(0, -w * curve * 0.25, 0), V(w / 4, 0, 0), V(w / 2, w * curve * 0.6, 0)];
  return mesh(sweep(pts, u => thick * (0.55 + Math.sin(u * Math.PI) * 0.45), 24, 8), flat(color), false);
}

export function blush(r: number): THREE.Mesh {
  const m = mesh(new THREE.SphereGeometry(r, 16, 10), flat('#ff8fb1', 0.45), false);
  m.scale.set(1, 0.6, 0.25);
  return m;
}

/**
 * Common behavior: blinking, eye tracking, bobbing, cheer and shake.
 * `extra` is the creature's own animation (fins, legs, tentacles).
 */
export function lifecycle(c: Omit<Creature, 'update' | 'cheer' | 'shake' | 'swim' | 'lookAt' | 'yaw'>, eyes: Eye[], extra: (dt: number, t: number, self: Creature) => void, bob = 0.08): Creature {
  let blinkAt = 1 + Math.random() * 3;
  let cheerT = 0, shakeT = 0;
  const seed = Math.random() * 10;
  const tmp = new THREE.Vector3();
  const self: Creature = {
    ...c,
    swim: 0,
    lookAt: null,
    yaw: 0,
    cheer() { cheerT = 1; },
    shake() { shakeT = 1; },
    update(dt, t) {
      // blink
      blinkAt -= dt;
      let lid = 1;
      if (blinkAt < 0.14) lid = Math.abs(blinkAt - 0.07) / 0.07;
      if (blinkAt < 0) blinkAt = 2 + Math.random() * 3.5;
      for (const e of eyes) {
        e.group.scale.y = 0.08 + 0.92 * lid;
        // look at the target (only a little, so the eyes stay cute)
        if (self.lookAt) {
          e.iris.parent!.worldToLocal(tmp.copy(self.lookAt));
          tmp.normalize();
          e.iris.rotation.y += (Math.atan2(tmp.x, tmp.z) * 0.45 - e.iris.rotation.y) * Math.min(1, dt * 6);
          e.iris.rotation.x += (-Math.asin(THREE.MathUtils.clamp(tmp.y, -1, 1)) * 0.45 - e.iris.rotation.x) * Math.min(1, dt * 6);
        } else {
          e.iris.rotation.y *= 1 - Math.min(1, dt * 4);
          e.iris.rotation.x *= 1 - Math.min(1, dt * 4);
        }
        e.iris.rotation.y = THREE.MathUtils.clamp(e.iris.rotation.y, -0.5, 0.5);
        e.iris.rotation.x = THREE.MathUtils.clamp(e.iris.rotation.x, -0.4, 0.4);
      }
      // bob, cheer, shake
      const b = self.body;
      b.position.y = Math.sin(t * 1.6 + seed) * bob * c.size;
      if (cheerT > 0) {
        cheerT = Math.max(0, cheerT - dt * 1.1);
        const k = 1 - cheerT;
        b.position.y += Math.sin(k * Math.PI) * c.size * 0.45;
        b.rotation.z = k < 1 ? k * Math.PI * 2 : 0;
        b.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12);
      } else {
        b.rotation.z *= 0.8;
        b.scale.setScalar(1);
      }
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt * 1.6);
        b.rotation.y = Math.sin(shakeT * 22) * 0.35 * shakeT;
      } else b.rotation.y += (self.yaw - b.rotation.y) * Math.min(1, dt * 12);
      extra(dt, t, self);
    },
  };
  return self;
}
