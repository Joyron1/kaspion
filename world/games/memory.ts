// Memory: friends hide inside clam shells on the sand. Open two; if they match, they pop out and dance.

import * as THREE from 'three';
import { clay } from '../core/shade';
import type { Creature, Kind } from '../characters';
import { pick, rayTo, removeCreature, shuffle, sized, type Ctx, type Game } from './kit';

const KINDS: Kind[] = ['fish', 'crab', 'octopus', 'seahorse', 'turtle', 'starfish', 'jelly', 'whale', 'kaspion'];
const SHELL_COLORS = ['#ff7fa8', '#ffa94d', '#a98bff', '#4fc3f7', '#5fdc97', '#ff8a65'];

function shellGeo(): THREE.BufferGeometry {
  // a ribbed scallop half, hinge at -z
  const g = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const rib = 1 + Math.cos(a * 9) * 0.05 * Math.min(1, Math.hypot(v.x, v.z) * 1.5);
    p.setXYZ(i, v.x * rib, v.y * 0.42 * rib, v.z * rib);
  }
  g.translate(0, 0, 1);
  g.computeVertexNormals();
  return g;
}

interface Clam {
  root: THREE.Group;
  lid: THREE.Group;
  kind: Kind;
  friend: Creature;
  open: number;     // 0..1
  want: number;
  matched: boolean;
  pearl: THREE.Mesh;
}

export function memoryGame(ctx: Ctx): Game {
  // `count` pairs in all, on boards of up to 4 pairs, the smaller boards first
  const nBoards = Math.ceil(ctx.count / 4);
  const boards = Array.from({ length: nBoards }, (_, i) => 2 * (Math.floor(ctx.count / nBoards) + (i >= nBoards - (ctx.count % nBoards) ? 1 : 0)));
  const geo = shellGeo();
  let board = 0, pairs = 0;
  const totalPairs = boards.reduce((a, b) => a + b / 2, 0);
  let clams: Clam[] = [];
  let first: Clam | null = null, second: Clam | null = null;
  let judge = 0;
  let pause = 0;
  let finished = false;
  let intro = true;
  let later: { t: number; fn: () => void } | null = null;
  const dancers: { c: Creature; t: number; from: THREE.Vector3 }[] = [];

  // a mossy stone table under the shells, so they stand out from the sand
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 0.35, 48), clay('#3f9f8f', { rough: 0.85, rim: 0.2, caustics: 0.7 }));
  table.receiveShadow = true;
  table.position.y = -0.12;
  ctx.group.add(table);
  const fitTable = (n: number) => {
    const wide = ctx.stage.aspect >= 1;
    const cols = n <= 4 ? 2 : n === 6 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const [c, r] = wide ? [cols, rows] : [rows, cols];
    table.scale.set(c * 1.75 + 1.4, 1, r * 1.5 + 1.4);
  };

  const layout = (n: number) => {
    const cols = n <= 4 ? 2 : n === 6 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const wide = ctx.stage.aspect >= 1;
    const [c, r] = wide ? [cols, rows] : [rows, cols];
    const gap = wide ? 3.2 : 2.9;
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i % c - (c - 1) / 2) * gap;
      const z = (Math.floor(i / c) - (r - 1) / 2) * gap * 0.85;
      out.push(new THREE.Vector3(x, 0.05, z));
    }
    return out;
  };

  const deal = () => {
    for (const c of clams) { removeCreature(c.friend); ctx.group.remove(c.root); }
    const n = boards[board];
    fitTable(n);
    const kinds = shuffle(KINDS).slice(0, n / 2);
    const deck = shuffle([...kinds, ...kinds]);
    const spots = layout(n);
    const color = SHELL_COLORS[board % SHELL_COLORS.length];
    clams = deck.map((kind, i) => {
      const root = new THREE.Group();
      root.position.copy(spots[i]);
      root.position.y = -2; // rises out of the sand
      root.rotation.y = (Math.random() - 0.5) * 0.25;
      const mat = clay(color, { rough: 0.35, rim: 0.5, caustics: 0.6 });
      mat.side = THREE.DoubleSide; // the inside of an open shell shows too
      const bottom = new THREE.Mesh(geo, mat);
      bottom.scale.set(1.1, -0.9, 0.9);
      bottom.position.z = -0.9;
      bottom.castShadow = bottom.receiveShadow = true;
      root.add(bottom);
      const lid = new THREE.Group();
      lid.position.set(0, 0.02, -0.9);
      const top = new THREE.Mesh(geo, mat);
      top.scale.set(1.1, 1.1, 0.9);
      top.castShadow = true;
      lid.add(top);
      root.add(lid);
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#fff6fb', roughness: 0.15, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 }));
      pearl.position.set(0.45, 0.12, 0.35);
      root.add(pearl);
      const friend = sized(kind, kind === 'whale' ? 1.5 : 1.15, { baby: true });
      const front = ['crab', 'octopus', 'starfish', 'jelly'].includes(kind);
      friend.root.position.set(0, front ? -0.05 : 0.35, 0.05);
      friend.root.rotation.y = front ? 0 : -0.5;
      friend.root.visible = false;
      root.add(friend.root);
      ctx.group.add(root);
      return { root, lid, kind, friend, open: 0, want: 0, matched: false, pearl };
    });
    first = second = null;
    dancers.length = 0;
    pause = 1.2;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 11.5, 9.5), look: new THREE.Vector3(0, 0, 0.4) },
    // behind the table, above its far edge: never over a shell
    kaspionSpot: new THREE.Vector3(-3, 2.2, -9.5),
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.memory.intro'); }
      if (pause > 0) pause -= dt;
      if (later && (later.t -= dt) <= 0) { const fn = later.fn; later = null; fn(); }
      for (const c of clams) {
        c.root.position.y += (0.42 - c.root.position.y) * Math.min(1, dt * 3);
        c.open += (c.want - c.open) * Math.min(1, dt * 7);
        c.lid.rotation.x = -c.open * 1.3;
        const show = c.open > 0.25;
        c.friend.root.visible = show;
        if (show) {
          c.friend.update(dt, t);
          const s = Math.min(1, (c.open - 0.25) / 0.5);
          c.friend.body.scale.setScalar(Math.max(0.01, s));
        }
      }
      if (judge > 0) {
        judge -= dt;
        if (judge <= 0 && first && second) {
          if (first.kind === second.kind) {
            first.matched = second.matched = true;
            for (const c of [first, second]) {
              c.friend.cheer();
              ctx.fx.celebrate(c.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 0.8);
              dancers.push({ c: c.friend, t: 0, from: c.friend.root.position.clone() });
            }
            ctx.sfx('sparkle');
            pairs++;
            ctx.praise();
            first = second = null;
            if (clams.every(c => c.matched)) {
              pause = 3;
              board++;
              if (board >= boards.length) {
                later = { t: 2.5, fn: () => { finished = true; } };
              } else {
                later = { t: 2.6, fn: () => { deal(); void ctx.say('world.memory.again'); } };
              }
            }
          } else {
            ctx.sfx('bonk');
            first.want = 0; second.want = 0;
            first = second = null;
          }
        }
      }
      // matched friends hop happily in their shells
      for (const d of dancers) {
        d.t += dt;
        d.c.root.position.y = d.from.y + Math.abs(Math.sin(d.t * 4)) * 0.35;
      }
    },
    tap(e) {
      if (e.kind !== 'down' || pause > 0 || judge > 0 || finished) return;
      // matched friends hop in their shells; taps pass through them
      const hit = pick(e.ray, clams.filter(c => !c.matched));
      if (!hit) return;
      const c = hit as Clam;
      if (c.matched || c === first) return;
      c.want = 1;
      ctx.sfx('shell');
      if (!first) first = c;
      else { second = c; judge = 1.1; }
    },
    progress: () => ({ got: pairs, goal: totalPairs }),
    debug: () => ({ board, pairs, pause: +pause.toFixed(2), judge: +judge.toFixed(2), first: first?.kind, later: !!later, clams: clams.map(c => c.kind[0] + (c.matched ? '*' : '') + c.open.toFixed(1)).join(' ') }),
    done: () => finished,
    hint: () => {
      // point at the partner of the open shell, or at any closed one
      const target = first ? clams.find(c => c !== first && c.kind === first!.kind) : clams.find(c => !c.matched);
      return target ? target.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0)) : null;
    },
    auto() {
      if (pause > 0 || judge > 0) return;
      const open = (c: Clam | undefined) => {
        if (!c) return;
        const p = c.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
        game.tap({ kind: 'down', ray: rayTo(ctx, p), ndc: new THREE.Vector2() });
      };
      if (!first) open(clams.find(c => !c.matched));
      else open(clams.find(c => c !== first && !c.matched && c.kind === first!.kind));
    },
    dispose() {
      for (const c of clams) { removeCreature(c.friend); ctx.group.remove(c.root); }
      geo.dispose();
      ctx.group.remove(table);
    },
  };
  deal();
  return game;
}
