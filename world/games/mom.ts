// Mother and baby: a mother calls for her little one. Three babies float in bubbles.
// Tap hers: the bubble pops and the baby swims to snuggle with mom.

import * as THREE from 'three';
import type { Creature, Kind } from '../characters';
import { bubbleShell, face, pick, rayTo, removeCreature, shuffle, sized, swimTo, type Ctx, type Game } from './kit';

const PAIRS: Kind[] = ['whale', 'fish', 'crab', 'octopus', 'turtle', 'seahorse', 'starfish', 'jelly'];
const FRONT = new Set<Kind>(['crab', 'octopus', 'starfish', 'jelly']);

interface Baby { c: Creature; kind: Kind; bubble: THREE.Mesh; home: THREE.Vector3; right: boolean; free: boolean; ph: number }

export function momGame(ctx: Ctx): Game {
  const rounds = ctx.count;
  const hw = Math.min(7.5, ctx.halfWidth(0) * 0.95);
  const order = shuffle(PAIRS);
  let round = 0, solved = 0;
  let mom: Creature | null = null;
  let momKind: Kind = 'whale';
  let babies: Baby[] = [];
  let phase: 'enter' | 'ask' | 'hug' | 'leave' = 'enter';
  let wait = 0;
  let finished = false;
  let leaving: Creature[] = [];
  const momHome = new THREE.Vector3(-hw * 0.5, 2.3, 0);

  const newRound = () => {
    momKind = order[round % order.length];
    const low = FRONT.has(momKind) ? -0.9 : 0;
    mom = sized(momKind, momKind === 'whale' ? 4.4 : 3.1, { mama: true });
    mom.root.position.set(-hw - 5, momHome.y + low, momHome.z);
    ctx.group.add(mom.root);
    const wrong = shuffle(PAIRS.filter(k => k !== momKind)).slice(0, 2);
    const kinds = shuffle([momKind, ...wrong]);
    const x0 = hw * 0.12, x1 = hw - 1.1;
    babies = kinds.map((k, i) => {
      const c = sized(k, k === 'whale' ? 1.6 : 1.2, { baby: true });
      const home = new THREE.Vector3(x0 + (x1 - x0) * (kinds.length === 1 ? 0.5 : i / (kinds.length - 1)), 1.4 + ((i + round) % 2) * 1.7, 0.8 + (i % 2) * 0.6);
      const bubble = bubbleShell(1.05);
      bubble.position.y = FRONT.has(k) ? 0.9 : 0;
      c.root.add(bubble);
      bubble.scale.divideScalar(c.root.scale.x);
      c.root.position.set(home.x + hw + 5, home.y - (FRONT.has(k) ? 0.9 : 0), home.z);
      home.y -= FRONT.has(k) ? 0.9 : 0;
      ctx.group.add(c.root);
      return { c, kind: k, bubble, home, right: k === momKind, free: false, ph: Math.random() * 6 };
    });
    phase = 'enter';
    wait = 0;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 4, 13), look: new THREE.Vector3(0, 2.4, 0) },
    kaspionSpot: new THREE.Vector3(-hw * 0.15, 5.3, -2),
    update(dt, t) {
      if (mom) { mom.update(dt, t); }
      for (const b of babies) {
        b.c.update(dt, t);
        if (!b.free) b.bubble.scale.setScalar((1 + Math.sin(t * 2.2 + b.ph) * 0.04) / b.c.root.scale.x);
      }
      for (const l of leaving) l.update(dt, t);
      if (!mom) return;
      if (phase === 'enter') {
        const low = FRONT.has(momKind) ? -0.9 : 0;
        let all = swimTo(mom, momHome.clone().setY(momHome.y + low), dt, 6);
        for (const b of babies) if (!swimTo(b.c, b.home, dt, 6)) all = false;
        if (all) {
          phase = 'ask';
          face(mom, 1);
          for (const b of babies) face(b.c, -1);
          mom.cheer();
          ctx.sfx(momKind === 'whale' ? 'whale' : 'call');
          void ctx.say(round === 0 ? 'world.mom.intro' : 'world.mom.ask');
        }
      } else if (phase === 'ask') {
        mom.lookAt = babies[Math.floor(t / 1.5) % babies.length]?.c.root.getWorldPosition(new THREE.Vector3()) ?? null;
        for (const b of babies) {
          b.c.root.position.y = b.home.y + Math.sin(t * 1.4 + b.ph) * 0.18;
          b.c.lookAt = mom.root.getWorldPosition(new THREE.Vector3());
        }
      } else if (phase === 'hug') {
        const b = babies.find(x => x.right)!;
        const spot = mom.root.position.clone().add(new THREE.Vector3(momKind === 'whale' ? 2.6 : 1.8, FRONT.has(momKind) ? 0.3 : -0.4, 0.8));
        if (swimTo(b.c, spot, dt, 5)) {
          wait -= dt;
          if (wait < 1.6 && wait + dt >= 1.6) {
            b.c.cheer(); mom.cheer();
            ctx.fx.celebrate(spot.clone().add(ctx.group.position), 1.1);
            ctx.sfx(momKind === 'whale' ? 'whaleHappy' : 'join');
            ctx.praise();
            solved++;
          }
          if (wait <= 0) {
            phase = 'leave';
            leaving = [mom, b.c];
            for (const o of babies) if (!o.right) o.home.x += hw + 6;
          }
        }
      } else if (phase === 'leave') {
        const [m, b] = leaving;
        const gone = swimTo(m, new THREE.Vector3(-hw - 7, m.root.position.y + 0.02, -1), dt, 6);
        swimTo(b, new THREE.Vector3(-hw - 5.5, b.root.position.y + 0.02, -0.6), dt, 6);
        for (const o of babies) if (!o.right) swimTo(o.c, o.home, dt, 7);
        if (gone || m.root.position.x < -hw - 6) {
          for (const c of leaving) removeCreature(c);
          for (const o of babies) if (!o.right) removeCreature(o.c);
          leaving = [];
          mom = null;
          babies = [];
          round++;
          if (round >= rounds) finished = true;
          else newRound();
        }
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'ask') return;
      const hit = pick(e.ray, babies.map(b => ({ root: b.c.root })));
      if (!hit) return;
      const b = babies.find(x => x.c.root === hit.root)!;
      if (b.right) {
        b.free = true;
        b.c.root.remove(b.bubble);
        ctx.fx.bubbles(b.c.root.getWorldPosition(new THREE.Vector3()), 12, 1);
        ctx.sfx('pop');
        phase = 'hug';
        wait = 2.4;
      } else {
        b.c.shake();
        ctx.sfx('bonk');
        void ctx.say('world.try');
      }
    },
    progress: () => ({ got: solved, goal: rounds }),
    debug: () => ({ phase, round, wait: +wait.toFixed(2), mom: mom?.root.position.toArray().map(v => +v.toFixed(1)), babies: babies.map(b => [b.kind, b.right, b.free, ...b.c.root.position.toArray().map(v => +v.toFixed(1))]) }),
    done: () => finished,
    hint: () => {
      const b = babies.find(x => x.right);
      return phase === 'ask' && b ? b.c.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.5, 0)) : null;
    },
    auto() {
      if (phase !== 'ask') return;
      const b = babies.find(x => x.right);
      if (!b) return;
      const p = b.c.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, FRONT.has(b.kind) ? 0.7 : 0, 0));
      game.tap({ kind: 'down', ray: rayTo(ctx, p), ndc: new THREE.Vector2() });
    },
    dispose() {
      if (mom) removeCreature(mom);
      for (const b of babies) removeCreature(b.c);
      for (const l of leaving) removeCreature(l);
    },
  };
  newRound();
  return game;
}
