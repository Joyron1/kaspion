// Puzzle: a friend's shadow is on the rock, and the friend itself is cut into 4 pieces
// lying below. Drag each piece up onto the shadow; when all 4 are in place, the friend
// comes alive and swims away.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clay, flat } from '../core/shade';
import type { Creature, Kind } from '../characters';
import { Drag, removeCreature, shuffle, sized, type Ctx, type Game } from './kit';

const KINDS: Kind[] = ['fish', 'turtle', 'whale', 'crab', 'octopus', 'seahorse', 'starfish', 'jelly'];
const NO_HIT = () => {};

interface Piece {
  root: THREE.Group;       // the whole friend, clipped to one quarter
  planes: { local: THREE.Plane; world: THREE.Plane }[];
  offset: THREE.Vector3;   // from root to the middle of the visible quarter (local, scaled)
  home: THREE.Vector3;     // root position while waiting below
  placed: boolean;
}

export function puzzleGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.92);
  const renderer = ctx.stage.renderer;
  const hadClipping = renderer.localClippingEnabled;
  renderer.localClippingEnabled = true;
  const kinds = shuffle(KINDS);

  // the rock the shadow is on
  const wallW = Math.min(8, hw * 1.25), wallH = 4;
  const wall = new THREE.Mesh(new RoundedBoxGeometry(wallW, wallH, 0.9, 6, 0.45), clay('#e2d4b8', { rough: 0.95, rim: 0.15, caustics: 0.7 }));
  wall.position.set(0, wallH / 2 + 1.9, -3.2);
  wall.castShadow = wall.receiveShadow = true;
  ctx.group.add(wall);
  // where a finished piece sits: in front of the rock (the shadow is painted on the rock's face)
  const target = new THREE.Vector3(0, wall.position.y, -1.5);
  const FACE = wall.position.z + 0.47;

  let round = 0, placedTotal = 0;
  let shadow: Creature | null = null;
  let pieces: Piece[] = [];
  let whole: Creature | null = null;   // the living friend once the puzzle is done
  let wholeT = 0, finished = false, intro = true;
  const drag = new Drag<Piece>(ctx, 1.2);
  let dragging: Piece | null = null;

  const clear = () => {
    for (const p of pieces) ctx.group.remove(p.root);
    pieces = [];
    if (shadow) { removeCreature(shadow); shadow = null; }
  };

  const build = () => {
    clear();
    const kind = kinds[round % kinds.length];
    const size = kind === 'whale' ? 3.8 : kind === 'seahorse' ? 2.6 : 3;
    // the dark shape on the rock
    shadow = sized(kind, size);
    const sm = flat('#16284a');
    shadow.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = sm; m.castShadow = false; m.raycast = NO_HIT; } });
    shadow.root.scale.z *= 0.06;
    ctx.group.add(shadow.root);
    shadow.root.updateMatrixWorld(true);
    // center the shape on the rock
    const box = new THREE.Box3().setFromObject(shadow.root);
    const c = ctx.group.worldToLocal(box.getCenter(new THREE.Vector3()));
    shadow.root.position.add(target.clone().sub(c)).setZ(FACE);
    target.x = shadow.root.position.x; target.y = shadow.root.position.y;

    // the middle of the friend, in its own space: the 4 cuts go through it
    const probe = sized(kind, size);
    probe.root.updateMatrixWorld(true);
    const pb = new THREE.Box3().setFromObject(probe.root);
    const mid = pb.getCenter(new THREE.Vector3());
    const half = pb.getSize(new THREE.Vector3()).multiplyScalar(0.25);
    removeCreature(probe);

    const quads: [number, number][] = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
    const homes = shuffle([0, 1, 2, 3]);
    pieces = quads.map(([sx, sy], qi) => {
      const c = sized(kind, size);
      // the cuts, in the friend's own (unscaled) space
      const midL = mid.clone().divideScalar(c.root.scale.x);
      const planes = [
        new THREE.Plane(new THREE.Vector3(sx, 0, 0), -sx * midL.x),
        new THREE.Plane(new THREE.Vector3(0, sy, 0), -sy * midL.y),
      ].map(local => ({ local, world: local.clone() }));
      const clip = planes.map(p => p.world);
      c.root.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = (m.material as THREE.Material).clone();
        mat.clippingPlanes = clip;
        mat.clipShadows = true;
        m.material = mat;
        m.raycast = NO_HIT; // only the grab box below can be touched
      });
      // a grab box over just this quarter
      const grab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
      const offset = new THREE.Vector3(mid.x + sx * half.x, mid.y + sy * half.y, mid.z);
      grab.position.copy(offset).divideScalar(c.root.scale.x);
      grab.scale.set(half.x * 2.4, half.y * 2.4, 1.5).divideScalar(c.root.scale.x);
      c.root.add(grab);
      const slot = homes[qi];
      const home = new THREE.Vector3((slot - 1.5) * Math.min(3.2, hw * 0.48), 1.1, 1.2).sub(new THREE.Vector3(offset.x, offset.y, 0));
      c.root.position.copy(home).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, -3, 0));
      c.root.rotation.z = (Math.random() - 0.5) * 0.3;
      ctx.group.add(c.root);
      return { root: c.root, planes, offset, home, placed: false } as Piece;
    });
  };

  const place = (p: Piece) => {
    p.placed = true;
    placedTotal++;
    ctx.sfx('shell');
    ctx.fx.burst(p.root.localToWorld(p.offset.clone().divideScalar(p.root.scale.x)), 'sparkle', 10, 2, 0.4);
    if (pieces.every(x => x.placed)) {
      // all in place: the real friend appears and swims off happily
      const kind = kinds[round % kinds.length];
      whole = sized(kind, kind === 'whale' ? 3.8 : kind === 'seahorse' ? 2.6 : 3);
      whole.root.position.copy(target);
      ctx.group.add(whole.root);
      for (const x of pieces) ctx.group.remove(x.root);
      pieces = [];
      if (shadow) shadow.root.visible = false;
      whole.cheer();
      ctx.fx.celebrate(whole.root.getWorldPosition(new THREE.Vector3()), 1.2);
      ctx.sfx('win');
      ctx.praise();
      wholeT = 2.6;
    } else ctx.sfx('pop');
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.9, 12.5), look: new THREE.Vector3(0, 3, 0) },
    kaspionSpot: new THREE.Vector3(-hw - 0.2, 6.4, 0.5),
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.puzzle.intro'); }
      for (const p of pieces) {
        if (p.placed) p.root.position.lerp(target, Math.min(1, dt * 10));
        else if (p !== dragging) p.root.position.lerp(p.home, Math.min(1, dt * 5));
        p.root.rotation.z *= p.placed || p === dragging ? 0.8 : 1;
        p.root.updateMatrixWorld(true);
        for (const pl of p.planes) pl.world.copy(pl.local).applyMatrix4(p.root.matrixWorld);
      }
      if (whole) {
        whole.update(dt, t);
        wholeT -= dt;
        if (wholeT < 1.2) { whole.swim = 1; whole.root.position.x += dt * 5; }
        if (wholeT <= 0) {
          removeCreature(whole);
          whole = null;
          round++;
          if (round >= ctx.count) finished = true;
          else { build(); void ctx.say('world.puzzle.again'); }
        }
      }
    },
    tap(e) {
      if (whole || finished) return;
      if (e.kind === 'down') {
        const p = drag.down(e, pieces.filter(x => !x.placed));
        if (p) { dragging = p; ctx.sfx('tap'); }
      } else if (e.kind === 'move') drag.move(e);
      else {
        const p = drag.up();
        dragging = null;
        if (!p) return;
        // close enough to its place on the shadow? it clicks in
        if (p.root.position.distanceTo(target) < 1.6) place(p);
        else ctx.sfx('bonk');
      }
    },
    progress: () => ({ got: round, goal: ctx.count }),
    done: () => finished,
    hint: () => {
      const p = pieces.find(x => !x.placed);
      return p ? p.root.localToWorld(p.offset.clone().divideScalar(p.root.scale.x)).add(new THREE.Vector3(0, 0.8, 0)) : null;
    },
    auto() { const p = pieces.find(x => !x.placed); if (p && !whole) place(p); },
    debug: () => ({ round, placedTotal, pieces: pieces.map(p => p.placed) }),
    dispose() {
      clear();
      if (whole) removeCreature(whole);
      ctx.group.remove(wall);
      renderer.localClippingEnabled = hadClipping;
    },
  };
  build();
  return game;
}
