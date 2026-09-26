// Sprite particles: sparkle bursts, hearts, stars, and bubbles.

import * as THREE from 'three';
import { bubble, heart, sparkle, star } from './tex';

type Tex = 'sparkle' | 'star' | 'heart' | 'bubble';
const TEX: Record<Tex, () => THREE.Texture> = { sparkle, star, heart, bubble };

interface P {
  s: THREE.Sprite;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  spin: number;
  rise: number;
}

export class Fx {
  private live: P[] = [];
  private pool = new Map<Tex, THREE.Sprite[]>();
  constructor(private scene: THREE.Scene) {}

  private take(kind: Tex): THREE.Sprite {
    const list = this.pool.get(kind) ?? [];
    this.pool.set(kind, list);
    const s = list.pop() ?? new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX[kind](), transparent: true, depthWrite: false,
      blending: kind === 'sparkle' ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    s.userData.kind = kind;
    s.visible = true;
    this.scene.add(s);
    return s;
  }

  add(kind: Tex, at: THREE.Vector3, o: { v?: THREE.Vector3; life?: number; size?: number; spin?: number; rise?: number; color?: THREE.ColorRepresentation } = {}) {
    const s = this.take(kind);
    s.position.copy(at);
    (s.material as THREE.SpriteMaterial).color.set(o.color ?? '#ffffff');
    this.live.push({ s, v: o.v ?? new THREE.Vector3(), life: 0, max: o.life ?? 1, size: o.size ?? 0.5, spin: o.spin ?? 0, rise: o.rise ?? 0 });
  }

  burst(at: THREE.Vector3, kind: Tex = 'sparkle', n = 14, speed = 3, size = 0.45) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.add(kind, at, { v, life: 0.8 + Math.random() * 0.6, size: size * (0.6 + Math.random() * 0.8), spin: (Math.random() - 0.5) * 6 });
    }
  }

  /** a big happy moment: stars, sparkles and a few hearts */
  celebrate(at: THREE.Vector3, scale = 1) {
    this.burst(at, 'sparkle', 18, 4 * scale, 0.7 * scale);
    this.burst(at, 'star', 10, 3.2 * scale, 0.55 * scale);
    for (let i = 0; i < 4; i++) this.add('heart', at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5))), { v: new THREE.Vector3(0, 1.5, 0), life: 1.6, size: 0.5 * scale, rise: 0.5 });
  }

  bubbles(at: THREE.Vector3, n = 6, spread = 0.4) {
    for (let i = 0; i < n; i++) {
      this.add('bubble', at.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread, (Math.random() - 0.5) * spread)), {
        v: new THREE.Vector3((Math.random() - 0.5) * 0.3, 1.2 + Math.random() * 1.2, 0), life: 1.8 + Math.random(), size: 0.12 + Math.random() * 0.2, rise: 0.4,
      });
    }
  }

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.s.visible = false;
        this.scene.remove(p.s);
        this.pool.get(p.s.userData.kind as Tex)!.push(p.s);
        this.live.splice(i, 1);
        continue;
      }
      p.v.multiplyScalar(1 - Math.min(1, dt * 1.8));
      p.v.y += p.rise * dt * 4;
      p.s.position.addScaledVector(p.v, dt);
      const grow = Math.min(1, k * 6);
      p.s.scale.setScalar(p.size * grow * (1 - Math.max(0, k - 0.7) / 0.3 * 0.5));
      const m = p.s.material as THREE.SpriteMaterial;
      m.opacity = 1 - Math.max(0, k - 0.6) / 0.4;
      m.rotation += p.spin * dt;
    }
  }
}
