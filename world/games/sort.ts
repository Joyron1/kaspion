// Colorful homes: three (later four) anemone homes, each a different color. A fish arrives;
// drag it into the home of its own color (or just touch that home).

import * as THREE from 'three';
import { clay } from '../core/shade';
import { softDot } from '../core/tex';
import { makeFish, type Creature } from '../characters';
import { Drag, pick, removeCreature, type Ctx, type Game } from './kit';

const HOMES = [
  { color: '#ff4d6d', belly: '#ffd6de' },
  { color: '#ffc93c', belly: '#fff3c4' },
  { color: '#3fa9f5', belly: '#d9efff' },
  { color: '#4cd97b', belly: '#dcf8e6' },
];

interface Home { root: THREE.Group; idx: number; arms: THREE.Mesh[]; happy: number }
interface Fish { root: THREE.Group; c: Creature; idx: number }

function makeHome(color: string): { root: THREE.Group; arms: THREE.Mesh[] } {
  const root = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.9, 28), clay(color, { rough: 0.5 }));
  base.position.y = 0.45;
  root.add(base);
  const armMat = clay(color, { rough: 0.45, emissive: new THREE.Color(color).multiplyScalar(0.15) });
  const arms: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 0.75 : 0.45;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.9 + (i % 3) * 0.2, 4, 8), armMat);
    arm.geometry.translate(0, 0.5, 0);
    arm.position.set(Math.cos(a) * r, 0.85, Math.sin(a) * r);
    arm.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    root.add(arm);
    arms.push(arm);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(3.4);
  glow.position.y = 1.3;
  root.add(glow);
  root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; } });
  return { root, arms };
}

export function sortGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.92);
  let homes: Home[] = [];
  let fish: Fish | null = null, going: { f: Fish; to: Home; t: number } | null = null;
  let sorted = 0, intro = true, finished = false, nextT = 0.5, last = -1;
  const drag = new Drag<Fish>(ctx, 1.5);
  const start = new THREE.Vector3(0, 4.3, 1.5);

  const layout = (n: number) => {
    for (const h of homes) ctx.group.remove(h.root);
    const gap = Math.min(3.6, (hw * 2 - 1.2) / n);
    homes = Array.from({ length: n }, (_, i) => {
      const { root, arms } = makeHome(HOMES[i].color);
      root.position.set((i - (n - 1) / 2) * gap, 0, 0.2);
      ctx.group.add(root);
      return { root, idx: i, arms, happy: 0 };
    });
  };
  layout(3);

  const spawn = () => {
    // later on a fourth home (green) joins
    if (sorted === Math.ceil(ctx.count / 2) && homes.length === 3 && ctx.count > 3) layout(4);
    let idx = Math.floor(Math.random() * homes.length);
    if (idx === last) idx = (idx + 1) % homes.length;
    last = idx;
    const c = makeFish({ color: HOMES[idx].color, belly: HOMES[idx].belly });
    c.root.scale.setScalar(1.3);
    c.root.position.set(hw + 3, start.y, start.z);
    ctx.group.add(c.root);
    fish = { root: c.root, c, idx };
  };

  const send = (f: Fish, h: Home) => {
    if (f.idx === h.idx) {
      going = { f, to: h, t: 0 };
      fish = null;
      ctx.sfx('join');
    } else {
      f.c.shake();
      h.happy = -1;
      ctx.sfx('bonk');
      void ctx.say('world.sort.try');
    }
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 4.4, 12), look: new THREE.Vector3(0, 2.2, 0) },
    kaspionSpot: new THREE.Vector3(-hw + 0.3, 6.2, -1.5),
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.sort.intro'); }
      if (!fish && !going && !finished) {
        nextT -= dt;
        if (nextT <= 0) spawn();
      }
      if (fish) {
        fish.c.update(dt, t);
        if (drag.held !== fish) {
          // swim in and wait in the middle
          const d = start.clone().sub(fish.root.position);
          fish.root.position.addScaledVector(d, Math.min(1, dt * 2.5));
          fish.root.position.y += Math.sin(t * 2) * dt * 0.2;
          fish.c.swim = Math.min(1, d.length() / 3);
          fish.root.rotation.y = d.x < -0.1 ? -Math.PI : 0;
        } else fish.c.swim = 0.8;
      }
      if (going) {
        const g = going;
        g.t += dt;
        g.f.c.update(dt, t);
        const into = g.to.root.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        g.f.root.position.lerp(into, Math.min(1, dt * 3));
        g.f.root.scale.setScalar(Math.max(0.01, 1.3 * (1 - Math.max(0, g.t - 0.6) / 0.6)));
        if (g.t > 1.2) {
          removeCreature(g.f.c);
          g.to.happy = 1;
          ctx.fx.celebrate(g.to.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.8, 0)), 0.9);
          ctx.sfx('sparkle');
          ctx.praise();
          sorted++;
          going = null;
          nextT = 1.2;
          if (sorted >= ctx.count) { finished = true; nextT = 1.6; }
        }
      }
      if (finished) nextT -= dt;
      for (const h of homes) {
        h.happy += (0 - h.happy) * Math.min(1, dt * 1.5);
        for (const [i, a] of h.arms.entries()) {
          const s = 1 + Math.max(0, h.happy) * 0.3 * Math.abs(Math.sin(t * 8 + i));
          a.scale.set(1, s, 1);
          a.rotation.y = Math.sin(t * 1.4 + i) * 0.15 + (h.happy < 0 ? Math.sin(t * 30) * 0.2 * -h.happy : 0);
        }
      }
    },
    tap(e) {
      if (finished || going) return;
      if (e.kind === 'down') {
        if (fish && drag.down(e, [fish])) { ctx.sfx('tap'); return; }
        const h = pick(e.ray, homes);
        if (h && fish) send(fish, h as Home);
      } else if (e.kind === 'move') drag.move(e);
      else {
        const f = drag.up();
        if (!f) return;
        // dropped near a home?
        let best: Home | null = null, bd = 2.2;
        for (const h of homes) {
          const d = Math.hypot(h.root.position.x - f.root.position.x, (h.root.position.y + 1.2) - f.root.position.y);
          if (d < bd) { bd = d; best = h; }
        }
        if (best) send(f, best);
      }
    },
    progress: () => ({ got: sorted, goal: ctx.count }),
    done: () => finished && nextT <= 0,
    hint: () => (fish ? homes[fish.idx].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 3, 0)) : null),
    auto() { if (fish && !going) send(fish, homes[fish.idx]); },
    dispose() {
      for (const h of homes) ctx.group.remove(h.root);
      if (fish) removeCreature(fish.c);
      if (going) removeCreature(going.f.c);
    },
  };
  return game;
}
