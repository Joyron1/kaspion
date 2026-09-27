// Bubbles: bubbles float up the water. Touch the screen and Kaspion swims there;
// when he reaches a bubble it pops. A big bubble has a little friend trapped inside:
// pop it to set the friend free.

import * as THREE from 'three';
import type { Creature, Kind } from '../characters';
import { Steer, bubbleShell, removeCreature, shuffle, sized, type Ctx, type Game } from './kit';

const FRIENDS: Kind[] = ['crab', 'octopus', 'seahorse', 'turtle', 'starfish', 'jelly', 'fish', 'whale'];
const FRONT = new Set<Kind>(['crab', 'octopus', 'starfish', 'jelly']);

interface Bub { mesh: THREE.Mesh; r: number; speed: number; ph: number; friend: Creature | null; kind: Kind | null }

export function bubblesGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.9);
  const lo = new THREE.Vector3(-hw + 0.8, 0.8, 0), hi = new THREE.Vector3(hw - 0.8, 6.4, 0);
  const steer = new Steer(ctx, lo, hi, 6.5);
  const k = ctx.kaspion;
  const order = shuffle(FRIENDS);
  let freed = 0, big: Bub | null = null, wait = 0.6, intro = true, finished = false;
  const bubs: Bub[] = [];
  const leaving: { c: Creature; v: THREE.Vector3; t: number }[] = [];

  const spawn = (withFriend: boolean) => {
    const r = withFriend ? 1.05 : 0.3 + Math.random() * 0.25;
    const mesh = bubbleShell(r);
    mesh.position.set(lo.x + 0.5 + Math.random() * (hi.x - lo.x - 1), -r, (Math.random() - 0.5) * 0.4);
    ctx.group.add(mesh);
    let friend: Creature | null = null, kind: Kind | null = null;
    if (withFriend) {
      kind = order[freed % order.length];
      friend = sized(kind, kind === 'whale' ? 1.4 : 1.1, { baby: true });
      ctx.group.add(friend.root);
      friend.root.rotation.y = FRONT.has(kind) ? 0 : -0.4;
    }
    const b: Bub = { mesh, r, speed: withFriend ? 0.42 : 0.6 + Math.random() * 0.4, ph: Math.random() * 6, friend, kind };
    bubs.push(b);
    return b;
  };
  for (let i = 0; i < 4; i++) { const b = spawn(false); b.mesh.position.y = 1 + i * 1.4; }

  const pop = (b: Bub) => {
    bubs.splice(bubs.indexOf(b), 1);
    ctx.group.remove(b.mesh);
    b.mesh.geometry.dispose();
    const at = b.mesh.getWorldPosition(new THREE.Vector3());
    ctx.fx.bubbles(at, b.friend ? 14 : 6, b.r);
    ctx.fx.burst(at, 'sparkle', b.friend ? 12 : 5, 2.5, 0.35);
    ctx.sfx('pop');
    if (b.friend) {
      b.friend.cheer();
      ctx.fx.celebrate(at, 0.9);
      ctx.praise();
      freed++;
      leaving.push({ c: b.friend, v: new THREE.Vector3(b.mesh.position.x < 0 ? -3 : 3, 1.5, 0), t: 0 });
      big = null;
      wait = 1.4;
    }
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.8, 13), look: new THREE.Vector3(0, 3.4, 0) },
    kaspionSpot: null,
    update(dt, t) {
      if (intro) {
        intro = false;
        k.root.position.set(lo.x + 1.5, 3.4, 0);
        steer.target.copy(k.root.position);
        void ctx.say('world.bubbles.intro');
      }
      if (!big && !finished) {
        wait -= dt;
        if (wait <= 0) {
          if (freed >= ctx.count) finished = true;
          else big = spawn(true);
        }
      }
      if (bubs.length < 5 && Math.random() < dt * 0.8) spawn(false);
      steer.update(dt);
      for (const b of [...bubs]) {
        b.mesh.position.y += b.speed * dt;
        b.mesh.position.x += Math.sin(t * 1.3 + b.ph) * dt * 0.35;
        const s = 1 + Math.sin(t * 3 + b.ph) * 0.04;
        b.mesh.scale.set(s, 1 / s, s);
        if (b.friend) {
          b.friend.root.position.copy(b.mesh.position).add(new THREE.Vector3(0, FRONT.has(b.kind!) ? -0.55 : 0, 0));
          b.friend.update(dt, t);
          b.friend.lookAt = k.root.getWorldPosition(new THREE.Vector3());
        }
        if (b.mesh.position.y > hi.y + 1.5) {
          // floated away at the top: comes back from below
          b.mesh.position.y = -b.r;
          b.mesh.position.x = lo.x + 0.5 + Math.random() * (hi.x - lo.x - 1);
        }
        if (k.root.position.distanceTo(b.mesh.position) < b.r + 0.55) pop(b);
      }
      for (let i = leaving.length - 1; i >= 0; i--) {
        const l = leaving[i];
        l.t += dt;
        l.c.root.position.addScaledVector(l.v, dt);
        l.c.swim = 1;
        l.c.update(dt, t);
        if (l.t > 3) { removeCreature(l.c); leaving.splice(i, 1); }
      }
    },
    tap(e) { if (!finished) steer.tap(e); },
    progress: () => ({ got: freed, goal: ctx.count }),
    done: () => finished && leaving.length === 0,
    hint: () => (big ? big.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)) : null),
    auto() { if (big) steer.goTo(big.mesh.position); },
    dispose() {
      for (const b of bubs) { ctx.group.remove(b.mesh); if (b.friend) removeCreature(b.friend); }
      for (const l of leaving) removeCreature(l.c);
      k.root.rotation.z = 0;
    },
  };
  return game;
}
