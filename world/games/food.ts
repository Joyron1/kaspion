// Food for the way: snacks drift down through the water. Touch the screen and Kaspion
// swims there to catch them. Every snack goes into his basket for the long journey,
// and later, at the stations further on, he eats them.

import * as THREE from 'three';
import { clay } from '../core/shade';
import { sweep, V } from '../core/geo';
import { Steer, type Ctx, type Game } from './kit';

type Snack = 'shrimp' | 'leaf' | 'plankton';
interface Item { root: THREE.Group; kind: Snack; speed: number; ph: number; caught: number }

function snackMesh(kind: Snack): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'shrimp') {
    const pts = [V(-0.35, 0.1, 0), V(-0.15, 0.25, 0), V(0.15, 0.22, 0), V(0.32, 0, 0), V(0.22, -0.18, 0)];
    g.add(new THREE.Mesh(sweep(pts, u => 0.13 * (1 - u * 0.6), 24, 10), clay('#ff8aa8', { rough: 0.35 })));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), clay('#1b2440', { rim: 0 }));
    eye.position.set(-0.3, 0.18, 0.09);
    g.add(eye);
  } else if (kind === 'leaf') {
    const s = new THREE.Shape();
    s.moveTo(0, -0.4); s.quadraticCurveTo(0.3, 0, 0, 0.45); s.quadraticCurveTo(-0.3, 0, 0, -0.4);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), clay('#5fcf6a', { rough: 0.5 }));
    m.rotation.z = 0.6;
    g.add(m);
  } else {
    const mat = clay('#ffe066', { rough: 0.3, emissive: '#6b5200' });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.05, 12, 8), mat);
      b.position.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.2);
      g.add(b);
    }
  }
  g.traverse(o => { (o as THREE.Mesh).castShadow = true; });
  g.scale.setScalar(2);
  return g;
}

export function foodGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.9);
  const lo = new THREE.Vector3(-hw + 0.8, 0.8, 0), hi = new THREE.Vector3(hw - 0.8, 6.4, 0);
  const steer = new Steer(ctx, lo, hi, 6.5);
  const k = ctx.kaspion;
  const kinds: Snack[] = ['shrimp', 'leaf', 'plankton'];
  const items: Item[] = [];
  let got = 0, intro = true, n = 0, finished = false, endT = 0;

  // the basket: a big open shell on the sand where the snacks pile up
  const basket = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay('#ffb4c8', { rough: 0.4 }));
  bowl.material.side = THREE.DoubleSide;
  bowl.scale.set(1.1, 0.55, 0.8);
  basket.add(bowl);
  basket.position.set(hw - 1.6, 0.6, 1.2);
  ctx.group.add(basket);
  const pile: THREE.Group[] = [];

  const spawn = () => {
    const kind = kinds[n++ % kinds.length];
    const root = snackMesh(kind);
    // spread across the width so Kaspion has to swim to them
    const x = lo.x + 0.8 + ((n * 0.37) % 1) * (hi.x - lo.x - 1.6);
    root.position.set(x, hi.y + 1, 0);
    ctx.group.add(root);
    items.push({ root, kind, speed: 0.55 + Math.random() * 0.2, ph: Math.random() * 6, caught: 0 });
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.8, 13), look: new THREE.Vector3(0, 3.4, 0) },
    kaspionSpot: null,
    update(dt, t) {
      if (intro) {
        intro = false;
        k.root.position.set(lo.x + 1.5, 3.4, 0);
        steer.target.copy(k.root.position);
        void ctx.say('world.food.intro');
      }
      const live = items.filter(i => !i.caught).length;
      if (!finished && live < 2 && got + live < ctx.count) spawn();
      steer.update(dt);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.caught) {
          // fly into the basket and stay there
          it.caught += dt;
          const to = basket.position.clone().add(new THREE.Vector3((pile.length % 3 - 1) * 0.45, 0.35 + Math.floor(pile.length / 3) * 0.25, 0));
          it.root.position.lerp(to, Math.min(1, dt * 4));
          it.root.scale.setScalar(Math.max(1, it.root.scale.x - dt));
          if (it.caught > 0.9) { pile.push(it.root); items.splice(i, 1); }
          continue;
        }
        it.root.position.y -= it.speed * dt;
        it.root.position.x += Math.sin(t * 1.4 + it.ph) * dt * 0.6;
        it.root.rotation.z = Math.sin(t * 2 + it.ph) * 0.4;
        if (it.root.position.y < 0.4) it.root.position.y = hi.y + 1; // missed: it drifts down again
        if (k.root.position.distanceTo(it.root.position) < 0.9) {
          it.caught = 0.001;
          got++;
          ctx.addFood(1);
          k.cheer();
          ctx.sfx('munch');
          ctx.fx.burst(it.root.getWorldPosition(new THREE.Vector3()), 'sparkle', 8, 2, 0.35);
          if (got % 2 === 1 || got === ctx.count) ctx.praise();
          if (got >= ctx.count) { finished = true; endT = 1.6; }
        }
      }
      if (finished) endT -= dt;
    },
    tap(e) { if (!finished) steer.tap(e); },
    progress: () => ({ got, goal: ctx.count }),
    done: () => finished && endT <= 0,
    hint: () => {
      const it = items.find(i => !i.caught);
      return it ? it.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)) : null;
    },
    auto() { const it = items.find(i => !i.caught); if (it) steer.goTo(it.root.position); },
    dispose() {
      for (const it of items) ctx.group.remove(it.root);
      for (const p of pile) ctx.group.remove(p);
      ctx.group.remove(basket);
      k.root.rotation.z = 0;
    },
  };
  return game;
}
