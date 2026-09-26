// Level 12 — "תודה ולילה טוב" (page p12): the parents swim in circles around their little
// whale and thank Kaspion again and again; they celebrate until the day ends; then
// everyone says good night and swims home.
// Mission 1: swim a big happy circle around the whale family.
// Mission 2: catch the thank-you hearts.
// Mission 3: evening falls — say good night to every friend.

import * as art from '../engine/art';
import { Pickups, School } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type C = CanvasRenderingContext2D;
type FriendKind = 'seahorse' | 'crab' | 'octopus' | 'turtle' | 'starfish' | 'fish';
interface Ring extends Point { done: boolean }
interface Friend extends Point { kind: FriendKind; asleep: boolean; zz: number; ph: number }

function sleepyEyes(c: C, x: number, y: number, w: number) {
  // closed eyes drawn over a friend
  c.save(); c.strokeStyle = art.INK; c.lineWidth = 3; c.lineCap = 'round';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * w, y, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  c.restore();
}

export const thanks: LevelDef = {
  id: 'thanks',
  create(g) {
    const hero = g.makeHero(g.W * 0.15, g.H * 0.5);
    const school = new School(g);
    const R = () => Math.min(g.W * 0.13, g.H * 0.17);
    const fam = (): Point => ({ x: g.W * 0.5, y: g.H * 0.5 + 10 });
    for (let i = 0; i < 10; i++) school.add(g.W * 0.5 + rand(-200, 200), g.H * 0.5 + rand(-100, 100), { size: rand(34, 42) });

    // ---- mission 1: rings in a big circle
    const rings: Ring[] = [];
    let ringIdx = 0, ringWait = 0;

    // ---- mission 2: thank-you hearts
    const hearts = new Pickups(g, {
      radius: 24,
      draw: (c, p, t) => art.heart(c, p.x + Math.sin(t * 1.5 + p.ph) * 8, p.y, 26, art.PAL.pink),
      drift: (p, dt) => {
        p.y = Math.max(g.top + 40, p.y - 24 * dt);
        p.x = clamp(p.x + (p.vx ?? 0) * dt, 70, g.W - 70);
      },
      sound: 'sparkle',
    });

    // ---- mission 3: good night
    const friends: Friend[] = [];
    let friendIdx = 0, friendWait = 0, nightToasts = 0;
    let evening = 0;

    const drawFriend = (c: C, f: Friend, t: number) => {
      const bob = f.asleep ? Math.sin(t * 1.2 + f.ph) * 2 : Math.sin(t * 2 + f.ph) * 5;
      switch (f.kind) {
        case 'seahorse': art.seahorse(c, f.x, f.y + bob, 70, f.asleep ? 0 : t); if (f.asleep) sleepyEyes(c, f.x + 2, f.y + bob - 26, 0); break;
        case 'crab': art.crab(c, f.x, f.y + bob * 0.3, 50, f.asleep ? 0 : t); if (f.asleep) sleepyEyes(c, f.x, f.y - 18, 8); break;
        case 'octopus': art.octopus(c, f.x, f.y + bob, 64, f.asleep ? t * 0.3 : t); if (f.asleep) sleepyEyes(c, f.x, f.y + bob - 8, 9); break;
        case 'turtle': art.turtle(c, f.x, f.y + bob, 90, -1, f.asleep ? 0 : t); break;
        case 'starfish': art.starfish(c, f.x, f.y, 24, t); if (f.asleep) sleepyEyes(c, f.x, f.y - 2, 4); break;
        case 'fish':
          for (let k = 0; k < 3; k++) art.fish(c, f.x + (k - 1) * 30, f.y + bob + (k % 2) * 16, 40, -1, t + k, { mood: f.asleep ? 'sleepy' : 'happy' });
          break;
      }
    };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'hoop',
          enter: () => {
            const n = g.cfg.circle ?? 20, c0 = fam();
            const rx = Math.min(g.W * 0.4, g.W / 2 - 80), ry = (g.floor - g.top) * 0.36;
            for (let i = 0; i < n; i++) {
              const a = Math.PI + (i / 10) * TAU; // starts on the left, goes around (more than once when long)
              rings.push({ x: c0.x + Math.cos(a) * rx, y: clamp(c0.y + Math.sin(a) * ry, g.top + 40, g.floor - 60), done: false });
            }
          },
          goal: () => rings.length, got: () => ringIdx,
          update: dt => {
            if (ringWait > 0) { ringWait -= dt; return; }
            const r = rings[ringIdx];
            if (r && dist(hero, r) < 52) {
              r.done = true; ringIdx++; ringWait = 0.7;
              g.sfx.sparkle();
              g.fx.burst(r.x, r.y, 10, '#ffe066', 'star', 130);
            }
          },
          done: () => rings.length > 0 && ringIdx >= rings.length,
          targets: () => (ringWait <= 0 && rings[ringIdx] ? [rings[ringIdx]] : []),
        },
        {
          intro: 'stage2', icon: 'heart',
          enter: () => hearts.pace(g.cfg.hearts ?? 17, 3, 3, () => {
            const c0 = fam();
            const fromDad = Math.random() < 0.5;
            return { x: c0.x + (fromDad ? -R() * 1.3 : R() * 1.3), y: c0.y - R() * 1.3, vx: (fromDad ? -1 : 1) * rand(30, 60) };
          }),
          goal: () => hearts.total, got: () => hearts.got,
          update: dt => hearts.update(dt, hero, true),
          done: () => hearts.finished,
          targets: () => hearts.targets(),
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            const kinds: FriendKind[] = ['seahorse', 'crab', 'octopus', 'turtle', 'starfish', 'fish'];
            const n = g.cfg.friends ?? 9;
            for (let i = 0; i < n; i++) {
              const kind = kinds[i % kinds.length];
              const onFloor = kind === 'crab' || kind === 'starfish';
              const left = i % 2 === 0;
              const x = left ? rand(90, g.W * 0.3) : rand(g.W * 0.7, g.W - 90);
              friends.push({ kind, x, y: onFloor ? g.floor + 4 : rand(g.top + 70, g.floor - 110), asleep: false, zz: 0, ph: rand(0, TAU) });
            }
          },
          goal: () => friends.length, got: () => friendIdx,
          update: dt => {
            if (friendWait > 0) { friendWait -= dt; return; }
            const f = friends[friendIdx];
            if (f && dist(hero, { x: f.x, y: f.y - 20 }) < 64) {
              f.asleep = true; friendIdx++; friendWait = 1.7;
              g.sfx.pop();
              if (nightToasts < 4) { nightToasts++; g.toast('toast.night'); }
            }
          },
          done: () => friends.length > 0 && friendIdx >= friends.length && friendWait <= 0,
          targets: () => { const f = friends[friendIdx]; return friendWait <= 0 && f ? [{ x: f.x, y: f.y - 20 }] : []; },
        },
      ],
      update: (dt, live) => {
        g.steer(hero, dt);
        if (!live) hearts.update(dt, hero, false);
        // the silver family swirls happily around the whales
        const c0 = fam();
        school.fish.forEach((b, i) => {
          const a = (i / school.fish.length) * TAU + g.t * 0.35;
          b.x += (c0.x + Math.cos(a) * R() * 2.9 - b.x) * Math.min(1, dt * 1.5);
          b.y += (c0.y + Math.sin(a) * R() * 1.7 - b.y) * Math.min(1, dt * 1.5);
          b.face = Math.sin(a) > 0 ? 1 : -1;
        });
        // the day slowly ends during mission 3
        const want = friends.length ? 0.35 + 0.55 * (friendIdx / friends.length) : 0;
        evening += (want - evening) * Math.min(1, dt * 0.6);
        for (const f of friends) if (f.asleep) {
          f.zz += dt;
          if (f.zz > 1.2) { f.zz = 0; g.fx.add({ x: f.x + 20, y: f.y - 40, type: 'dot', vy: -30, vx: 10, max: 1.6, color: '#fffaf0', r: 7 }); }
        }
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.1 + evening * 0.75),
      draw: c => {
        const t = g.t, c0 = fam(), r = R();
        const sleepy = evening > 0.8;
        art.sand(c, -20, g.W + 20, g.floor);
        // the whale family: father, mother and the little one between them
        art.whale(c, c0.x - r * 1.25, c0.y - r * 0.3 + Math.sin(t * 0.8) * 5, r * 1.35, 1, t, { body: art.PAL.papa, mood: sleepy ? 'sleepy' : 'happy', smile: true });
        art.whale(c, c0.x + r * 1.3, c0.y - r * 0.2 + Math.sin(t * 0.8 + 1) * 5, r * 1.2, -1, t + 1, { body: art.PAL.mama, lashes: true, mood: sleepy ? 'sleepy' : 'happy', smile: true });
        art.whale(c, c0.x, c0.y + r * 0.9 + Math.sin(t * 0.9 + 2) * 4, r * 0.8, -1, t + 2, { mood: sleepy ? 'sleepy' : 'happy', smile: true });
        school.draw(c);
        for (let i = ringIdx; i < Math.min(rings.length, ringIdx + (ringWait > 0 ? 0 : 2)); i++) art.hoop(c, rings[i].x, rings[i].y, 54, t, i === ringIdx);
        hearts.draw(c);
        for (let i = 0; i < friends.length; i++) {
          const f = friends[i];
          if (!f.asleep && (i !== friendIdx || friendWait > 0)) continue;
          drawFriend(c, f, t);
          if (!f.asleep) art.sparkle(c, f.x + 24, f.y - 70, t, 0.5);
        }
        g.drawHero(hero);
      },
      overlay: c => {
        if (evening < 0.4) return;
        // the moon at the surface and a few stars as the evening comes
        const k = clamp((evening - 0.4) / 0.5, 0, 1);
        c.save(); c.globalAlpha = k;
        c.beginPath(); c.arc(g.W * 0.84, g.top + 34, 26, 0, TAU); c.fillStyle = '#fff4b8'; c.fill();
        c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
        for (let i = 0; i < 6; i++) art.star(c, g.W * (0.1 + i * 0.13), g.top + 20 + (i % 2) * 22, 6 + Math.sin(g.t * 2 + i) * 1.5, '#fff4b8');
        c.restore();
      },
    };
  },
};
