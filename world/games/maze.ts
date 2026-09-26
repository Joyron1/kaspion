// Maze: coral hedges on the sand, seen from above. Hold a finger on the screen and
// Kaspion swims toward it. Pearls show the way; a friend waits at the end.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clay } from '../core/shade';
import type { Creature, Kind } from '../characters';
import { removeCreature, sized, type Ctx, type Game } from './kit';

const FRIENDS: Kind[] = ['whale', 'fish', 'turtle', 'octopus', 'seahorse', 'crab'];
const HEDGE = ['#ff7aa2', '#ffab6b', '#ffd65c', '#b98cff', '#6fe0c3', '#ff8fd8'];

/** Cells cols x rows carved with a random depth-first walk; returns solid tiles (2c+1)x(2r+1). */
function carve(cols: number, rows: number): boolean[][] {
  const W = cols * 2 + 1, H = rows * 2 + 1;
  const solid = Array.from({ length: H }, () => Array(W).fill(true) as boolean[]);
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false) as boolean[]);
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  solid[1][1] = false;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const)
      .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen[y][x]);
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = next[Math.floor(Math.random() * next.length)];
    seen[ny][nx] = true;
    solid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = false;
    solid[ny * 2 + 1][nx * 2 + 1] = false;
    stack.push([nx, ny]);
  }
  // a couple of extra openings so there is more than one way (kinder for small kids)
  for (let k = 0; k < Math.floor(cols * rows / 6); k++) {
    const x = 1 + Math.floor(Math.random() * (W - 2)), y = 1 + Math.floor(Math.random() * (H - 2));
    if ((x + y) % 2 === 1) solid[y][x] = false;
  }
  return solid;
}

/** shortest path of tiles from a to b */
function route(solid: boolean[][], a: [number, number], b: [number, number]): [number, number][] {
  const H = solid.length, W = solid[0].length;
  const prev = new Map<number, number>();
  const q = [a[1] * W + a[0]];
  prev.set(q[0], -1);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === b[1] * W + b[0]) break;
    const x = cur % W, y = Math.floor(cur / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || solid[ny][nx]) continue;
      const id = ny * W + nx;
      if (prev.has(id)) continue;
      prev.set(id, cur);
      q.push(id);
    }
  }
  const out: [number, number][] = [];
  let c = b[1] * W + b[0];
  while (c !== -1 && prev.has(c)) { out.unshift([c % W, Math.floor(c / W)]); c = prev.get(c)!; }
  return out;
}

export function mazeGame(ctx: Ctx): Game {
  const wide = ctx.stage.aspect >= 1;
  const sizes: [number, number][] = ctx.level < 0.3 ? [[3, 2], [4, 3], [4, 3]] : ctx.level < 0.7 ? [[4, 3], [5, 3], [5, 4]] : [[4, 3], [5, 4], [6, 4]];
  const mazes = sizes.map(([c, r]) => (wide ? [c, r] : [r, c]) as [number, number]);
  let idx = 0;
  let solid: boolean[][] = [];
  let tile = 1;
  let hedges: THREE.InstancedMesh | null = null;
  let pearls: THREE.Mesh[] = [];
  let path: THREE.Vector3[] = [];
  let friend: Creature | null = null;
  let friendKind: Kind = 'whale';
  let goal = new THREE.Vector3();
  let got = 0, total = 0;
  let won = 0;          // countdown after reaching the friend
  let finished = false;
  let intro = true;
  const k = ctx.kaspion;
  const target = new THREE.Vector3();
  let steering = false;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(ctx.group.position.y + 0.9));
  const pearlGeo = new THREE.SphereGeometry(0.2, 18, 12);
  const pearlMat = new THREE.MeshPhysicalMaterial({ color: '#fff4fb', roughness: 0.12, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, emissive: '#ffe9f5', emissiveIntensity: 0.25 });
  let hedgeGeo: THREE.BufferGeometry | null = null;

  const W = () => solid[0].length, H = () => solid.length;
  const toWorld = (x: number, y: number, h = 0.9) => new THREE.Vector3((x - (W() - 1) / 2) * tile, h, (y - (H() - 1) / 2) * tile);
  const toTile = (p: THREE.Vector3): [number, number] => [Math.round(p.x / tile + (W() - 1) / 2), Math.round(p.z / tile + (H() - 1) / 2)];
  const isSolid = (x: number, y: number) => x < 0 || y < 0 || x >= W() || y >= H() || solid[y][x];

  // a smooth turquoise lagoon floor under the maze
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 4, 1), clay('#2f9fb0', { rough: 0.8, rim: 0.1, caustics: 0.8 }));
  bed.rotation.y = Math.PI / 4;
  bed.receiveShadow = true;
  bed.position.y = -0.1;
  ctx.group.add(bed);

  const build = () => {
    if (hedges) { ctx.group.remove(hedges); hedges.dispose(); }
    hedgeGeo?.dispose();
    for (const p of pearls) ctx.group.remove(p);
    if (friend) removeCreature(friend);
    const [cols, rows] = mazes[idx];
    solid = carve(cols, rows);
    const areaW = wide ? 15 : 9.5, areaD = wide ? 9.5 : 13;
    tile = Math.min(areaW / W(), areaD / H(), 1.7);
    const count = solid.flat().filter(Boolean).length;
    bed.scale.set(W() * tile * 0.72, 1, H() * tile * 0.72);
    hedgeGeo = new RoundedBoxGeometry(tile * 0.98, tile * 0.95, tile * 0.98, 3, tile * 0.3);
    hedgeGeo.translate(0, tile * 0.45, 0);
    hedges = new THREE.InstancedMesh(hedgeGeo, clay('#ffffff', { rough: 0.6, rim: 0.4, caustics: 0.7 }), count);
    hedges.castShadow = true; hedges.receiveShadow = true;
    const m = new THREE.Object3D(), col = new THREE.Color();
    let n = 0;
    const tint = HEDGE[idx % HEDGE.length];
    for (let y = 0; y < H(); y++) for (let x = 0; x < W(); x++) {
      if (!solid[y][x]) continue;
      m.position.copy(toWorld(x, y, 0));
      const border = x === 0 || y === 0 || x === W() - 1 || y === H() - 1;
      m.scale.set(1, border ? 1.15 : 0.85 + Math.random() * 0.35, 1);
      m.rotation.y = (Math.random() - 0.5) * 0.2;
      m.updateMatrix();
      hedges.setMatrixAt(n, m.matrix);
      hedges.setColorAt(n, col.set(Math.random() < 0.7 ? tint : HEDGE[(idx + 2 + n) % HEDGE.length]));
      n++;
    }
    ctx.group.add(hedges);
    // start top-left, friend bottom-right
    const start: [number, number] = [1, 1];
    const end: [number, number] = [W() - 2, H() - 2];
    const r = route(solid, start, end);
    path = r.map(([x, y]) => toWorld(x, y));
    pearls = r.slice(2, -1).filter((_, i) => i % 2 === 0).map(([x, y]) => {
      const p = new THREE.Mesh(pearlGeo, pearlMat);
      p.position.copy(toWorld(x, y, 0.75));
      p.castShadow = true;
      ctx.group.add(p);
      return p;
    });
    total += pearls.length + 1;
    friendKind = FRIENDS[(idx + Math.floor(ctx.level * 4)) % FRIENDS.length];
    friend = sized(friendKind, Math.min(2.2, tile * 1.2), { baby: true });
    goal = toWorld(end[0], end[1], ['crab', 'octopus'].includes(friendKind) ? 0.1 : 0.9);
    friend.root.position.copy(goal);
    friend.root.rotation.y = Math.PI * 0.75;
    ctx.group.add(friend.root);
    // Kaspion at the start
    k.root.position.copy(toWorld(start[0], start[1]));
    k.root.scale.setScalar(Math.min(1.2, tile * 0.8));
    target.copy(k.root.position);
    steering = false;
    won = 0;
  };

  const radius = () => tile * 0.3;
  const blocked = (p: THREE.Vector3) => {
    const r = radius();
    const [tx, ty] = toTile(p);
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
      if (!isSolid(x, y)) continue;
      const c = toWorld(x, y);
      const dx = Math.max(Math.abs(p.x - c.x) - tile / 2, 0), dz = Math.max(Math.abs(p.z - c.z) - tile / 2, 0);
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, wide ? 15.5 : 19, wide ? 7.5 : 8), look: new THREE.Vector3(0, 0, 0.3) },
    kaspionSpot: null,
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.maze.intro'); }
      friend?.update(dt, t);
      if (friend) friend.lookAt = k.root.getWorldPosition(new THREE.Vector3());
      for (const [i, p] of pearls.entries()) p.position.y = 0.75 + Math.sin(t * 3 + i) * 0.08;
      if (won > 0) {
        won -= dt;
        k.swim = 0.3;
        k.root.rotation.y += dt * 3;
        if (won <= 0) {
          idx++;
          if (idx >= mazes.length) finished = true;
          else { build(); void ctx.say('world.maze.again'); }
        }
        return;
      }
      // swim toward the finger, sliding along hedges
      const p = k.root.position;
      const d = new THREE.Vector3(target.x - p.x, 0, target.z - p.z);
      const len = d.length();
      if (steering && len > 0.08) {
        const speed = Math.min(4.2 * Math.max(0.8, tile), len * 5);
        d.normalize().multiplyScalar(speed * dt);
        const nx = p.clone(); nx.x += d.x;
        if (!blocked(nx)) p.x = nx.x;
        const nz = p.clone(); nz.z += d.z;
        if (!blocked(nz)) p.z = nz.z;
        k.swim = Math.min(1, k.swim + dt * 4);
        const want = Math.atan2(-d.z, d.x);
        let diff = want - k.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        k.root.rotation.y += diff * Math.min(1, dt * 10);
      } else k.swim = Math.max(0, k.swim - dt * 2);
      p.y = 0.9;
      // pearls
      for (let i = pearls.length - 1; i >= 0; i--) {
        if (pearls[i].position.distanceTo(p) < tile * 0.55) {
          ctx.fx.burst(pearls[i].getWorldPosition(new THREE.Vector3()), 'sparkle', 8, 2, 0.35);
          ctx.group.remove(pearls[i]);
          pearls.splice(i, 1);
          ctx.sfx('shell');
          got++;
        }
      }
      if (friend && p.distanceTo(goal) < tile * 0.8) {
        got += pearls.length + 1; // leftover pearls count too
        for (const pr of pearls) ctx.group.remove(pr);
        pearls = [];
        friend.cheer();
        ctx.fx.celebrate(friend.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 1.2);
        ctx.sfx('win');
        void ctx.say('world.maze.found');
        steering = false;
        won = 2.6;
      }
    },
    tap(e) {
      if (won > 0 || finished) return;
      if (e.kind === 'up') { steering = false; return; }
      const hit = new THREE.Vector3();
      if (!e.ray.ray.intersectPlane(floorPlane, hit)) return;
      target.copy(ctx.group.worldToLocal(hit));
      steering = true;
    },
    progress: () => ({ got, goal: Math.max(total, got) }),
    done: () => finished,
    hint: () => {
      // the next step along the way from where Kaspion is
      const [tx, ty] = toTile(k.root.position);
      const [ex, ey] = toTile(goal);
      const r = route(solid, [tx, ty], [ex, ey]);
      const n = r[Math.min(3, r.length - 1)];
      return n ? toWorld(n[0], n[1], 1.8).add(ctx.group.position) : null;
    },
    auto() {
      if (won > 0) return;
      const [tx, ty] = toTile(k.root.position);
      const [ex, ey] = toTile(goal);
      const r = route(solid, [tx, ty], [ex, ey]);
      const n = r[Math.min(1, r.length - 1)];
      if (n) { target.copy(toWorld(n[0], n[1])); steering = true; }
    },
    dispose() {
      if (hedges) { ctx.group.remove(hedges); hedges.dispose(); }
      hedgeGeo?.dispose();
      for (const p of pearls) ctx.group.remove(p);
      if (friend) removeCreature(friend);
      pearlGeo.dispose();
      ctx.group.remove(bed);
      k.root.scale.setScalar(1);
    },
  };
  build();
  void path;
  return game;
}
