// Shadows: a dark shape is painted on a big pale rock. Which friend does it belong to?
// Tap the right creature and it swims onto its shadow.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clay, flat } from '../core/shade';
import type { Kind, Creature } from '../characters';
import { addHitArea, aimAt, pick, rayTo, removeCreature, shuffle, sized, swimTo, type Ctx, type Game } from './kit';

const POOL: Kind[] = ['fish', 'crab', 'octopus', 'seahorse', 'turtle', 'starfish', 'jelly', 'whale', 'kaspion'];
// shapes that look alike, for harder rounds
const LOOKALIKE: Partial<Record<Kind, Kind[]>> = {
  fish: ['kaspion', 'whale'], kaspion: ['fish', 'whale'], whale: ['fish', 'kaspion'],
  crab: ['starfish', 'octopus'], octopus: ['jelly', 'crab'], jelly: ['octopus', 'seahorse'],
  starfish: ['crab', 'turtle'], seahorse: ['jelly', 'fish'], turtle: ['crab', 'whale'],
};

interface Choice { c: Creature; kind: Kind; home: THREE.Vector3; right: boolean }

export function shadowGame(ctx: Ctx): Game {
  const rounds = ctx.count;
  const nChoices = ctx.level < 0.3 ? 3 : 4;
  const hw = Math.min(7, ctx.halfWidth(0) * 0.92);

  // the big pale rock the shadows are painted on
  // the rock sits high and alone; the choices float in a row below it, never in front of the shadow
  const wallW = Math.min(8, hw * 1.25), wallH = 4.2;
  const wall = new THREE.Mesh(new RoundedBoxGeometry(wallW, wallH, 0.9, 6, 0.45), clay('#e2d4b8', { rough: 0.95, rim: 0.15, caustics: 0.7 }));
  wall.position.set(0, wallH / 2 + 1.7, -3.2);
  wall.castShadow = true; wall.receiveShadow = true;
  ctx.group.add(wall);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(wallW * 0.4, wallW * 0.55, 1.8, 24), clay('#c9b793', { rough: 1, caustics: 0.8 }));
  base.scale.z = 0.4;
  base.position.set(0, 0.9, -3.3);
  ctx.group.add(base);

  let round = 0;
  let choices: Choice[] = [];
  let shadow: Creature | null = null;
  let shadowMat: THREE.MeshBasicMaterial | null = null;
  let answer: Choice | null = null;
  let solved = 0;
  let wait = 0;            // pause between rounds
  let phase: 'enter' | 'ask' | 'fly' | 'rest' = 'enter';
  let finished = false;
  const shadowAt = new THREE.Vector3(0, wall.position.y, -2.7);

  const newRound = () => {
    for (const ch of choices) removeCreature(ch.c);
    if (shadow) removeCreature(shadow);
    const recent = answer?.kind;
    const pool = POOL.filter(k => k !== recent);
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle(POOL.filter(k => k !== kind));
    const look = ctx.level > 0.3 ? (LOOKALIKE[kind] ?? []) : [];
    const wrong = [...look, ...others].filter((k, i, a) => a.indexOf(k) === i).slice(0, nChoices - 1);
    const kinds = shuffle([kind, ...wrong]);
    const gap = Math.min(3.4, (hw * 2 - 1.5) / kinds.length);
    choices = kinds.map((k, i) => {
      const c = sized(k, k === 'whale' ? 2.6 : 1.9);
      const front = ['crab', 'octopus', 'starfish', 'jelly', 'seahorse'].includes(k);
      const home = new THREE.Vector3((i - (kinds.length - 1) / 2) * gap, front ? 0.15 : 0.95, 2.6);
      c.root.position.set(home.x + (home.x < 0 ? -hw - 4 : hw + 4), home.y, home.z);
      ctx.group.add(c.root);
      addHitArea(c, 1.15);
      return { c, kind: k, home, right: k === kind };
    });
    answer = choices.find(c => c.right)!;
    // the shadow: same shape, flat and dark, on the rock
    shadow = sized(kind, kind === 'whale' ? 3.8 : 3);
    shadowMat = flat('#16284a');
    shadowMat.transparent = true;
    shadow.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = shadowMat!; m.castShadow = false; } });
    shadow.root.scale.z *= 0.06;
    shadow.root.position.copy(shadowAt).setY(shadowAt.y - (['crab', 'octopus', 'starfish', 'jelly', 'seahorse'].includes(kind) ? 1.4 : 0));
    ctx.group.add(shadow.root);
    phase = 'enter';
    wait = 1.3;
  };

  const flyTarget = new THREE.Vector3();
  let flyScale = 1;

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.8, 12.5), look: new THREE.Vector3(0, 2.9, 0) },
    // up in the corner, well away from the rock
    kaspionSpot: new THREE.Vector3(-hw - 0.2, 6.2, 0.5),
    update(dt, t) {
      for (const ch of choices) ch.c.update(dt, t);
      shadow?.update(0, 0);
      if (phase === 'enter') {
        let all = true;
        for (const ch of choices) if (!swimTo(ch.c, ch.home, dt, 7)) all = false;
        wait -= dt;
        if (all || wait < -1.5) {
          for (const ch of choices) { ch.c.root.rotation.y = 0; ch.c.swim = 0; }
          phase = 'ask';
          void ctx.say(round === 0 ? 'world.shadow.intro' : 'world.shadow.ask');
        }
      } else if (phase === 'ask') {
        for (const ch of choices) {
          ch.c.lookAt = ctx.stage.camera.position;
          if (swimTo(ch.c, ch.home, dt, 7)) ch.c.root.rotation.y *= 1 - Math.min(1, dt * 4);
        }
      } else if (phase === 'fly' && answer) {
        const c = answer.c;
        const there = swimTo(c, flyTarget, dt, 6, false);
        const s = c.root.scale.x;
        c.root.scale.setScalar(s + (flyScale - s) * Math.min(1, dt * 3));
        c.root.rotation.y *= 1 - Math.min(1, dt * 5);
        if (shadowMat) shadowMat.opacity = Math.max(0, shadowMat.opacity - dt * 0.9);
        if (there) {
          phase = 'rest';
          wait = 2.2;
          c.cheer();
          ctx.fx.celebrate(c.root.getWorldPosition(new THREE.Vector3()));
          ctx.sfx('sparkle');
          ctx.praise();
          solved++;
        }
      } else if (phase === 'rest') {
        wait -= dt;
        if (wait <= 0) {
          round++;
          if (round >= rounds) { finished = true; phase = 'ask'; }
          else newRound();
        }
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'ask' || finished) return;
      const hit = pick(e.ray, choices.map(c => ({ ...c, root: c.c.root })));
      if (!hit) return;
      const ch = choices.find(c => c.c.root === hit.root)!;
      if (ch.right) {
        ctx.sfx('pop');
        phase = 'fly';
        flyTarget.copy(shadow!.root.position).setZ(-2.2);
        flyScale = shadow!.root.scale.x;
        for (const o of choices) if (o !== ch) { o.home.x += o.home.x < 0 ? -hw - 5 : hw + 5; }
      } else {
        ch.c.shake();
        ctx.sfx('bonk');
        void ctx.say('world.try');
      }
    },
    progress: () => ({ got: solved, goal: rounds }),
    debug: () => ({ phase, round, wait: +wait.toFixed(2), op: shadowMat?.opacity, pos: answer?.c.root.position.toArray().map(v => +v.toFixed(2)), to: flyTarget.toArray().map(v => +v.toFixed(2)) }),
    done: () => finished,
    hint: () => (phase === 'ask' && answer ? answer.c.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)) : null),
    auto() {
      if (phase !== 'ask' || !answer) return;
      const p = aimAt(answer.c);
      game.tap({ kind: 'down', ray: rayTo(ctx, p), ndc: new THREE.Vector2() });
    },
    dispose() {
      for (const ch of choices) removeCreature(ch.c);
      if (shadow) removeCreature(shadow);
      ctx.group.remove(wall, base);
    },
  };
  // other choices leave the stage while the right one flies to the rock
  const baseUpdate = game.update;
  game.update = (dt, t) => {
    baseUpdate(dt, t);
    if (phase === 'fly' || phase === 'rest') for (const ch of choices) if (ch !== answer) swimTo(ch.c, ch.home, dt, 8);
  };
  newRound();
  return game;
}
