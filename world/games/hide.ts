// Hide and seek: a friend hides behind one of the rocks and corals. Now and then it peeks
// out (a fin, an eye...). Touch the hiding place, and the friend jumps out laughing.

import * as THREE from 'three';
import { clay } from '../core/shade';
import { rockGeo } from '../core/geo';
import type { Creature, Kind } from '../characters';
import { pick, removeCreature, shuffle, sized, type Ctx, type Game } from './kit';

const FRIENDS: Kind[] = ['octopus', 'crab', 'fish', 'turtle', 'seahorse', 'starfish', 'jelly', 'whale'];

interface Spot { root: THREE.Group; kind: 'rock' | 'coral' | 'kelp' | 'shell'; wobble: number; x: number }

function makeSpot(kind: Spot['kind']): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'rock') {
    const m = new THREE.Mesh(rockGeo(Math.random() * 9, 3), clay('#8793b5', { rough: 0.9, caustics: 0.8 }));
    m.scale.set(1.5, 1.35, 1.1);
    m.position.y = 1;
    g.add(m);
  } else if (kind === 'coral') {
    const cols = ['#ff7aa2', '#ffab6b', '#c58cff'];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.3, 20, 14), clay(cols[i % 3], { rough: 0.6 }));
      m.position.set((i % 3 - 1) * 0.65, 0.5 + Math.floor(i / 3) * 0.7, (Math.random() - 0.5) * 0.4);
      g.add(m);
    }
  } else if (kind === 'kelp') {
    // a clump of tube sponges
    const mat = clay('#ff9f43', { rough: 0.6 });
    mat.side = THREE.DoubleSide;
    const tubes: [number, number, number][] = [[-0.7, 1.6, 0.42], [0, 2.2, 0.5], [0.7, 1.8, 0.45], [-0.3, 1.2, 0.38], [0.35, 1.3, 0.36]];
    for (const [x, h, r] of tubes) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, h, 20, 1, true), mat);
      m.position.set(x, h / 2, (Math.random() - 0.5) * 0.3);
      m.rotation.z = -x * 0.15;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 20), mat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = h / 2;
      m.add(rim);
      g.add(m);
    }
  } else {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), clay('#ffc6d9', { rough: 0.4 }));
    m.scale.set(1.1, 1.3, 0.6);
    g.add(m);
  }
  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

export function hideGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.9);
  const friends = shuffle(FRIENDS);
  let round = 0, spots: Spot[] = [], hidden = 0, friend: Creature | null = null;
  let phase: 'hide' | 'seek' | 'found' | 'done' = 'hide', wait = 0, peekT = 0, intro = true, found = 0;

  const build = () => {
    for (const s of spots) ctx.group.remove(s.root);
    if (friend) removeCreature(friend);
    const n = Math.min(5, 3 + Math.floor(round / 2));
    const kinds = shuffle(['rock', 'coral', 'kelp', 'shell', 'rock'] as Spot['kind'][]).slice(0, n);
    const gap = Math.min(3.2, (hw * 2 - 1.5) / n);
    spots = kinds.map((kind, i) => {
      const root = makeSpot(kind);
      const x = (i - (n - 1) / 2) * gap;
      root.position.set(x, 0, 0.5 - Math.abs(x) * 0.12);
      ctx.group.add(root);
      return { root, kind, wobble: 0, x };
    });
    hidden = Math.floor(Math.random() * n);
    const k = friends[round % friends.length];
    friend = sized(k, k === 'whale' ? 2 : 1.4);
    const s = spots[hidden];
    friend.root.position.set(s.x, 0.3, s.root.position.z - 1.1);
    friend.root.rotation.y = ['crab', 'octopus', 'starfish', 'jelly'].includes(k) ? 0 : -0.3;
    ctx.group.add(friend.root);
    phase = 'seek';
    peekT = 1.5;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.6, 11.5), look: new THREE.Vector3(0, 1.6, 0) },
    kaspionSpot: new THREE.Vector3(-hw + 0.5, 5.2, -1.5),
    update(dt, t) {
      if (intro) { intro = false; build(); void ctx.say('world.hide.intro'); }
      for (const s of spots) {
        s.wobble = Math.max(0, s.wobble - dt * 2);
        s.root.rotation.z = Math.sin(t * 25) * 0.06 * s.wobble;
      }
      if (!friend) return;
      friend.update(dt, t);
      const s = spots[hidden];
      if (phase === 'seek') {
        // a peek every few seconds (less often later on)
        peekT -= dt;
        const every = 3 + round * 0.4;
        if (peekT < -1.2) peekT = every;
        const peek = peekT < 0 ? Math.sin((-peekT / 1.2) * Math.PI) : 0;
        const side = hidden % 2 ? 1 : -1;
        friend.root.position.x = s.x + side * peek * 1.1;
        friend.root.position.y = 0.3 + peek * 0.5;
        if (peek > 0.9 && Math.random() < dt * 3) ctx.fx.bubbles(friend.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 1, 0.2);
      } else if (phase === 'found') {
        // out it comes, over the top and in front
        friend.root.position.lerp(new THREE.Vector3(s.x, 2.6, s.root.position.z + 1.6), Math.min(1, dt * 4));
        friend.lookAt = ctx.stage.camera.position;
        wait -= dt;
        if (wait <= 0) {
          round++;
          if (round >= ctx.count) { phase = 'done'; }
          else { build(); void ctx.say('world.hide.again'); }
        }
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'seek') return;
      const hit = pick(e.ray, [...spots, ...(friend ? [{ root: friend.root }] : [])]);
      if (!hit) return;
      const s = spots.find(x => x.root === hit.root);
      if (!s || s === spots[hidden]) {
        phase = 'found';
        found++;
        wait = 2.4;
        spots[hidden].wobble = 1;
        friend!.cheer();
        ctx.sfx('giggle');
        ctx.fx.celebrate(spots[hidden].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.2, 0)), 1);
        ctx.praise();
      } else {
        s.wobble = 1;
        ctx.sfx('bonk');
        ctx.fx.bubbles(s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2, 0)), 5, 0.5);
        void ctx.say('world.hide.empty');
      }
    },
    progress: () => ({ got: found, goal: ctx.count }),
    done: () => phase === 'done',
    hint: () => (phase === 'seek' && spots[hidden] ? spots[hidden].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 3, 0)) : null),
    auto() {
      if (phase !== 'seek') return;
      const s = spots[hidden];
      const cam = ctx.stage.camera;
      const p = s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0));
      const ray = new THREE.Raycaster(cam.position.clone(), p.sub(cam.position).normalize());
      ray.camera = cam;
      game.tap({ kind: 'down', ray, ndc: new THREE.Vector2() });
    },
    dispose() {
      for (const s of spots) ctx.group.remove(s.root);
      if (friend) removeCreature(friend);
    },
  };
  return game;
}
