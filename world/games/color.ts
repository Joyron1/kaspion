// Coloring: a friend waits, all pale. Pick a paint bubble, then touch the friend to paint that part.
// When every part has color, the friend comes alive and dances.

import * as THREE from 'three';
import type { Creature, Kind } from '../characters';
import { removeCreature, sized, type Ctx, type Game } from './kit';

const PAINTS = ['#ff4d6d', '#ff9f1c', '#ffd93d', '#4cd97b', '#3fa9f5', '#9b6bff', '#ff7ac8'];
const SETS: Kind[][] = [
  ['fish', 'crab', 'turtle', 'starfish'],
  ['whale', 'octopus', 'starfish', 'fish'],
  ['turtle', 'seahorse', 'fish', 'jelly'],
  ['crab', 'jelly', 'whale', 'octopus'],
];

// paintable parts per friend (see the character builders)
const PART_COUNT: Record<Kind, number> = { fish: 3, kaspion: 3, whale: 2, crab: 3, octopus: 3, seahorse: 2, turtle: 4, starfish: 2, jelly: 3 };

interface Paint { mesh: THREE.Mesh; color: string; home: THREE.Vector3 }

export function colorGame(ctx: Ctx): Game {
  const base = SETS[Math.floor(ctx.level * 3.99) % SETS.length];
  // `count` friends to color, going round the set (and the other sets) as needed
  const pool = [...base, ...SETS.flat().filter(k => !base.includes(k))].filter((k, i, a) => a.indexOf(k) === i);
  const set = Array.from({ length: ctx.count }, (_, i) => pool[i % pool.length]);
  const hw = Math.min(7, ctx.halfWidth(0) * 0.95);
  let idx = 0;
  let friend: Creature | null = null;
  let parts: { name: string; mats: THREE.MeshStandardMaterial[]; to: THREE.Color | null; done: boolean }[] = [];
  let painted = 0;
  const totalParts = set.reduce((a, k) => a + PART_COUNT[k], 0);
  let alive = 0;      // countdown while the finished friend dances
  let finished = false;
  let intro = true;
  let chosen = 0;
  const center = new THREE.Vector3(0, 2.6, 0);

  // paint bubbles along the bottom
  const paints: Paint[] = PAINTS.map((color, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }));
    const span = Math.min(hw * 1.7, 9);
    const home = new THREE.Vector3(-span / 2 + (span / (PAINTS.length - 1)) * i, 0.55 + (i % 2) * 0.2, 2.6);
    m.position.copy(home);
    m.castShadow = true;
    ctx.group.add(m);
    return { mesh: m, color, home };
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 10, 40), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  ctx.group.add(ring);

  const next = () => {
    if (friend) removeCreature(friend);
    const kind = set[idx];
    friend = sized(kind, kind === 'whale' ? 5.8 : kind === 'fish' ? 4.2 : 3.6, { paint: true });
    const front = ['crab', 'octopus', 'starfish', 'jelly'].includes(kind);
    friend.root.position.copy(center).setY(front ? 0.6 : center.y);
    if (kind === 'seahorse') friend.root.position.y = 1.4;
    friend.root.rotation.y = front ? 0 : -0.25;
    ctx.group.add(friend.root);
    parts = Object.entries(friend.parts).map(([name, mats]) => ({ name, mats, to: null, done: false }));
    alive = 0;
  };

  const partOf = (m: THREE.Material) => parts.find(p => p.mats.includes(m as THREE.MeshStandardMaterial));

  const paintPart = (p: (typeof parts)[number], at: THREE.Vector3) => {
    p.to = new THREE.Color(PAINTS[chosen]);
    ctx.fx.burst(at, 'sparkle', 10, 2.5, 0.4);
    for (let i = 0; i < 5; i++) ctx.fx.add('bubble', at, { v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, 1), life: 1, size: 0.25 });
    ctx.sfx('pop');
    if (!p.done) {
      p.done = true;
      painted++;
      if (parts.every(x => x.done)) {
        alive = 3.2;
        ctx.sfx('win');
        if (friend) { friend.cheer(); ctx.fx.celebrate(friend.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 1.4); }
        void ctx.say('world.color.done');
      }
    }
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.6, 11), look: new THREE.Vector3(0, 2.1, 0) },
    kaspionSpot: new THREE.Vector3(-hw + 0.8, 5.2, -1),
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.color.intro'); }
      if (friend) {
        friend.update(dt, t);
        friend.swim = alive > 0 ? 1 : 0.15;
        friend.lookAt = ctx.stage.camera.position;
      }
      for (const p of parts) if (p.to) for (const m of p.mats) m.color.lerp(p.to, Math.min(1, dt * 5));
      for (const [i, p] of paints.entries()) {
        const sel = i === chosen;
        p.mesh.position.y = p.home.y + Math.sin(t * 2 + i) * 0.08 + (sel ? 0.35 : 0);
        const s = p.mesh.scale.x + ((sel ? 1.35 : 1) - p.mesh.scale.x) * Math.min(1, dt * 8);
        p.mesh.scale.setScalar(s);
      }
      ring.position.copy(paints[chosen].mesh.position);
      ring.lookAt(ctx.stage.camera.position.clone().sub(ctx.group.position));
      ring.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
      if (alive > 0) {
        alive -= dt;
        if (alive <= 0) {
          idx++;
          if (idx >= set.length) finished = true;
          else { next(); void ctx.say('world.color.next'); }
        }
      }
    },
    tap(e) {
      if (e.kind !== 'down' || alive > 0 || finished) return;
      const ph = e.ray.intersectObjects(paints.map(p => p.mesh), false)[0];
      if (ph) {
        chosen = paints.findIndex(p => p.mesh === ph.object);
        ctx.sfx('tap');
        ctx.fx.burst(ph.point, 'sparkle', 6, 1.5, 0.3);
        return;
      }
      if (!friend) return;
      const hits = e.ray.intersectObject(friend.root, true);
      for (const h of hits) {
        const p = partOf((h.object as THREE.Mesh).material as THREE.Material);
        if (p) { paintPart(p, h.point); return; }
      }
    },
    progress: () => ({ got: painted, goal: Math.max(totalParts, painted) }),
    done: () => finished,
    hint: () => {
      if (alive > 0 || !friend) return null;
      const p = parts.find(x => !x.done);
      if (!p) return null;
      let mesh: THREE.Object3D | null = null;
      friend.root.traverse(o => { if (!mesh && (o as THREE.Mesh).isMesh && p.mats.includes((o as THREE.Mesh).material as THREE.MeshStandardMaterial)) mesh = o; });
      return mesh ? (mesh as THREE.Object3D).getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0.5)) : null;
    },
    auto() {
      if (alive > 0 || !friend) return;
      const p = parts.find(x => !x.done);
      if (!p) return;
      chosen = Math.floor(Math.random() * PAINTS.length);
      paintPart(p, friend.root.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      if (friend) removeCreature(friend);
      for (const p of paints) { ctx.group.remove(p.mesh); p.mesh.geometry.dispose(); }
      ctx.group.remove(ring);
    },
  };
  next();
  return game;
}
