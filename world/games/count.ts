// More or fewer: two groups of friends swim over two big shells. The narrator asks where
// there are MORE (or FEWER), and the child touches that group. The difference is always
// easy to see (like 3 and 8).

import * as THREE from 'three';
import { clay } from '../core/shade';
import { makeFish, makeStarfish, makeJelly, type Creature } from '../characters';
import { pick, removeCreature, shuffle, type Ctx, type Game } from './kit';

type Maker = () => Creature;
const COLORS = ['#ff8a3d', '#ff5e7e', '#ffc93c', '#4cd97b', '#3fa9f5', '#b06cf0'];
const MAKERS: Maker[] = [
  () => makeFish({ color: COLORS[Math.floor(Math.random() * COLORS.length)], belly: '#fff1d6' }),
  () => makeFish({ silver: true }),
  () => makeStarfish({ color: COLORS[Math.floor(Math.random() * 3)] }),
  () => makeJelly(),
];
const PAIRS: [number, number][] = [[1, 5], [2, 7], [3, 8], [2, 6], [4, 9], [1, 4], [3, 10], [2, 8]];

interface Group { root: THREE.Group; pad: THREE.Mesh; members: { c: Creature; a: number; r: number; h: number }[]; n: number }

export function countGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.92);
  const pairs = shuffle(PAIRS);
  let round = 0, groups: Group[] = [], ask: 'more' | 'less' = 'more', phase: 'ask' | 'happy' | 'done' = 'ask', wait = 0, right = 0;

  const makeGroup = (n: number, x: number, make: Maker): Group => {
    const root = new THREE.Group();
    root.position.set(x, 0, 0.3);
    // a big flat shell as the group's home (also the easy place to touch)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.35, 40), clay('#ffd9e6', { rough: 0.45, caustics: 0.8 }));
    pad.position.y = 0.15;
    pad.receiveShadow = true;
    root.add(pad);
    const touch = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ visible: false }));
    touch.scale.set(2.6, 2.6, 2.2);
    touch.position.y = 2;
    root.add(touch);
    const members = Array.from({ length: n }, (_, i) => {
      const c = make();
      const s = 0.85 / Math.max(1, c.size / 1.6);
      c.root.scale.multiplyScalar(s * (n > 6 ? 0.8 : 1));
      root.add(c.root);
      return { c, a: (i / n) * Math.PI * 2, r: n === 1 ? 0 : 0.9 + (i % 2) * 0.7, h: 1.3 + (i % 3) * 0.75 };
    });
    ctx.group.add(root);
    return { root, pad, members, n };
  };

  const build = () => {
    for (const g of groups) { for (const m of g.members) removeCreature(m.c); ctx.group.remove(g.root); }
    const [a, b] = pairs[round % pairs.length];
    const swap = Math.random() < 0.5;
    const make = MAKERS[round % MAKERS.length];
    const x = Math.min(3.8, hw * 0.55);
    groups = [makeGroup(swap ? b : a, -x, make), makeGroup(swap ? a : b, x, make)];
    ask = Math.random() < 0.5 ? 'more' : 'less';
    phase = 'ask';
    void ctx.say(ask === 'more' ? 'world.count.more' : 'world.count.less');
  };
  const answer = () => {
    const [g0, g1] = groups;
    return ask === 'more' ? (g0.n > g1.n ? g0 : g1) : (g0.n < g1.n ? g0 : g1);
  };

  let started = false;
  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 5.6, 12), look: new THREE.Vector3(0, 1.8, 0) },
    kaspionSpot: new THREE.Vector3(0, 6.3, -3),
    update(dt, t) {
      if (!started) { started = true; void ctx.say('world.count.intro').then(build); }
      for (const g of groups) {
        const happy = phase === 'happy' && g === answer();
        for (const [i, m] of g.members.entries()) {
          const a = m.a + t * 0.35;
          m.c.root.position.set(Math.cos(a) * m.r, m.h + Math.sin(t * 1.8 + i) * 0.12 + (happy ? Math.abs(Math.sin(t * 6 + i)) * 0.5 : 0), Math.sin(a) * m.r * 0.7);
          if (m.c.kind === 'fish' || m.c.kind === 'kaspion') m.c.root.rotation.y = -a - Math.PI / 2;
          m.c.swim = 0.4;
          m.c.update(dt, t);
        }
      }
      if (phase === 'happy') {
        wait -= dt;
        if (wait <= 0) {
          round++;
          if (round >= ctx.count) phase = 'done';
          else build();
        }
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'ask' || !groups.length) return;
      const hit = pick(e.ray, groups);
      if (!hit) return;
      const g = hit as Group;
      if (g === answer()) {
        phase = 'happy';
        wait = 2.4;
        right++;
        for (const m of g.members) m.c.cheer();
        ctx.fx.celebrate(g.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.4, 0)), 1.1);
        ctx.sfx('sparkle');
        ctx.praise();
      } else {
        for (const m of g.members) m.c.shake();
        ctx.sfx('bonk');
        void ctx.say(ask === 'more' ? 'world.count.more' : 'world.count.less');
      }
    },
    progress: () => ({ got: right, goal: ctx.count }),
    done: () => phase === 'done',
    hint: () => (phase === 'ask' && groups.length ? answer().root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 4, 0)) : null),
    auto() {
      if (phase !== 'ask' || !groups.length) return;
      const cam = ctx.stage.camera;
      const p = answer().root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.5, 0));
      const ray = new THREE.Raycaster(cam.position.clone(), p.sub(cam.position).normalize());
      ray.camera = cam;
      game.tap({ kind: 'down', ray, ndc: new THREE.Vector2() });
    },
    dispose() {
      for (const g of groups) { for (const m of g.members) removeCreature(m.c); ctx.group.remove(g.root); }
    },
  };
  return game;
}
