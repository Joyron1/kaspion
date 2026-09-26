// Level 4 — "רחוק מתמיד" (page p04): one morning Kaspion swims farther than ever;
// the sea is still and blue — and suddenly something huge and black appears ahead.
// A journey to the LEFT through three stretches of sea, one per mission:
// 1. shells along the way (gentle jellyfish only bump him),
// 2. a current that carries him, with hoops to swim through,
// 3. deep, darker water with glowing pearls — and the great black shape at the end.

import * as art from '../engine/art';
import { Hoops, drawDeco, makeDeco } from '../engine/kit';
import { clamp, dist, easeInOut, rand, seeded, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

interface Item extends Point { got: boolean; ph: number }
interface Jelly extends Point { by: number; amp: number; sp: number; ph: number; sq: number }

export const far: LevelDef = {
  id: 'far',
  create(g) {
    // the world is three stretches wide; Kaspion starts at the right end and swims left
    const seg = () => Math.max(2600, g.W * 3.4);
    const worldW = () => seg() * 3 + 200;
    const hero = g.makeHero(worldW() - 220, g.H * 0.5);
    hero.face = -1;
    const deco = makeDeco(40, 7000, 4, 0.9);
    const rng = seeded(4);
    const band = () => ({ y0: g.H * 0.36, y1: g.H * 0.62 }); // where the current flows
    const yRange = () => ({ y0: g.top + 40, y1: g.floor - 80 });

    const shells: Item[] = [];
    const pearls: Item[] = [];
    const jellies: Jelly[] = [];
    const hoops = new Hoops(g, 2);
    let jellyToasts = 0;
    let finaleT = 0;
    let shadow = 0; // how much of the black shape is visible (0..1)

    const section = (i: number) => ({ x0: seg() * i + 100, x1: seg() * (i + 1) + 100 });
    const progress = () => clamp(1 - (hero.x - 200) / (worldW() - 420), 0, 1);

    // lay out the jellyfish once (stretches 1 and 2), so they are there from the start
    {
      const n = g.cfg.jellies ?? 6;
      for (let i = 0; i < n; i++) {
        const x = seg() * 1.2 + (seg() * 1.7 * (i + 0.5)) / Math.max(1, n);
        jellies.push({ x, y: 0, by: rng.range(0.35, 0.7), amp: rng.range(0.08, 0.16), sp: rng.range(0.5, 0.8), ph: rng.range(0, 6), sq: 0 });
      }
    }

    const nearest = (list: Item[]): Point[] => list.filter(i => !i.got);

    const collect = (list: Item[], radius: number, onGet: (i: Item) => void) => {
      for (const it of list) {
        if (it.got) continue;
        if (dist(hero, it) < radius) { it.got = true; onGet(it); }
      }
    };

    return {
      hero,
      world: () => ({ w: worldW(), h: g.H }),
      bounds: () => ({ x0: 60, x1: worldW() - 60, y0: g.top, y1: g.floor - 30 }),
      stages: [
        {
          intro: 'stage1', icon: 'shell',
          enter: () => {
            // shells spread from right to left through the first stretch, high and low
            const s = section(2), n = g.cfg.shells ?? 12, yr = yRange();
            for (let i = 0; i < n; i++) {
              const x = s.x1 - 160 - ((s.x1 - s.x0 - 240) * i) / Math.max(1, n - 1);
              const y = i % 2 ? yr.y0 + rand(0, 40) : yr.y1 - rand(0, 40);
              shells.push({ x, y, got: false, ph: rand(0, 6) });
            }
          },
          goal: () => shells.length, got: () => shells.filter(s => s.got).length,
          progress,
          update: () => collect(shells.filter(s => !s.got).slice(0, 2), 52, s => { g.sfx.shell(); g.fx.burst(s.x, s.y, 8, '#ffe066', 'star', 130); }),
          done: () => shells.length > 0 && shells.every(s => s.got),
          targets: () => nearest(shells).slice(0, 1),
        },
        {
          intro: 'stage2', icon: 'hoop',
          enter: () => {
            // hoops along the current through the middle stretch, some in it, some just outside
            const s = section(1), n = g.cfg.hoops ?? 14, b = band(), yr = yRange();
            for (let i = 0; i < n; i++) {
              const x = s.x1 + 80 - ((s.x1 - s.x0) * (i + 0.5)) / n;
              // alternate: in the current, then high above it, then low below it
              const y = i % 3 === 0 ? (b.y0 + b.y1) / 2 : i % 3 === 1 ? yr.y0 + 30 : yr.y1 - 20;
              hoops.add(x, y, 62);
            }
          },
          goal: () => hoops.total, got: () => hoops.got,
          progress,
          update: () => hoops.update(hero, true),
          done: () => hoops.total > 0 && hoops.finished,
          targets: () => hoops.targets(),
        },
        {
          intro: 'stage3', icon: 'pearl',
          enter: () => {
            const s = section(0), n = g.cfg.pearls ?? 12, yr = yRange();
            for (let i = 0; i < n; i++) {
              const x = s.x1 - 120 - ((s.x1 - s.x0 - 420) * i) / Math.max(1, n - 1);
              pearls.push({ x, y: i % 2 ? yr.y0 + rand(10, 50) : yr.y1 - rand(0, 40), got: false, ph: rand(0, 6) });
            }
          },
          goal: () => pearls.length, got: () => pearls.filter(p => p.got).length,
          progress,
          update: () => {
            // in the dark only the next pearl glows; the rest wait their turn
            const next = pearls.find(p => !p.got);
            if (next && dist(hero, next) < 50) { next.got = true; g.sfx.sparkle(); g.fx.burst(next.x, next.y, 10, '#fff4b8', 'star', 140); }
          },
          done: () => pearls.length > 0 && pearls.every(p => p.got),
          targets: () => { const next = pearls.find(p => !p.got); return next ? [next] : []; },
        },
      ],
      finale: dt => {
        // the huge black shape looms up ahead; Kaspion stops, amazed
        finaleT += dt;
        hero.tx = Math.max(hero.x, 420); hero.ty = g.H * 0.45;
        hero.mood = 'surprised';
        shadow = Math.min(1, shadow + dt * 0.5);
        return finaleT > 3.5;
      },
      update: (dt, live) => {
        g.steer(hero, dt);
        const t = g.t;
        // the current carries Kaspion left through the middle stretch
        const s1 = section(1), b = band();
        if (hero.x > s1.x0 && hero.x < s1.x1 && hero.y > b.y0 && hero.y < b.y1) hero.x -= 40 * dt;
        // jellyfish bob up and down and bump Kaspion gently away
        for (const j of jellies) {
          j.y = g.H * j.by + Math.sin(t * j.sp + j.ph) * g.H * j.amp;
          j.sq = Math.max(0, j.sq - dt * 2);
          if (!live || hero.hurt > 0) continue;
          const dx = hero.x - j.x, dy = hero.y - (j.y - 6), d = Math.hypot(dx, dy) || 1;
          if (d < 50) {
            hero.vx = (dx / d) * 300; hero.vy = (dy / d) * 300; hero.hurt = 0.8; j.sq = 1;
            g.sfx.bonk();
            g.fx.burst(hero.x, hero.y, 5, '#ffe066', 'star', 90);
            if (jellyToasts < 2) { jellyToasts++; g.toast('toast.jelly'); }
          }
        }
        // the black shape shows itself as Kaspion gets near the end
        if (hero.x < seg() * 0.9) shadow = Math.max(shadow, clamp(1 - hero.x / (seg() * 0.9), 0, 0.6));
      },
      background: c => {
        const depth = 0.05 + (1 - hero.x / worldW()) * 0.7;
        art.sea(c, g.W, g.H, g.t, depth, g.cam.x);
        art.farHills(c, g.W, g.H, g.cam.x * 0.4, `rgba(20,60,120,${0.35 + depth * 0.3})`, 2);
      },
      draw: c => {
        const t = g.t, x0 = g.cam.x - 60, x1 = g.cam.x + g.W + 60;
        // the great black shape at the far end (the whale, looking like a mountain)
        if (x0 < 700) {
          c.save(); c.globalAlpha = 0.25 + shadow * 0.75;
          const R = Math.min(g.W * 0.32, g.H * 0.42);
          art.whale(c, 60 + R * 0.4, g.floor - R * 0.2 + (1 - easeInOut(shadow)) * 30, R, -1, t, { rock: 1, tail: 0, fin: 0, eye: 0 });
          c.restore();
        }
        drawDeco(c, deco, g.floor, t, x0, x1);
        art.sand(c, Math.max(-20, x0), x1, g.floor);
        // the current: long pale stripes drifting left
        const s1 = section(1), b = band();
        if (x1 > s1.x0 && x0 < s1.x1) {
          c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#bfefff'; c.lineWidth = 5; c.lineCap = 'round';
          for (let k = 0; k < 16; k++) {
            const y = b.y0 + ((k * 37) % (b.y1 - b.y0));
            const x = s1.x1 - (((t * 90 + k * 173) % (s1.x1 - s1.x0)));
            if (x < x0 || x > x1) continue;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y); c.stroke();
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12, y - 8); c.moveTo(x, y); c.lineTo(x + 12, y + 8); c.stroke();
          }
          c.restore();
        }
        // only the next two shells shine, so the way zig-zags high and low
        for (const s of shells.filter(q => !q.got).slice(0, 2)) if (s.x > x0 && s.x < x1) art.shell(c, s.x, s.y, t);
        const nextPearl = pearls.find(p => !p.got);
        if (nextPearl && nextPearl.x > x0 && nextPearl.x < x1) {
          art.glow(c, nextPearl.x, nextPearl.y, 70);
          art.pearl(c, nextPearl.x, nextPearl.y + Math.sin(t * 2 + nextPearl.ph) * 4, 14, t);
        }
        for (const j of jellies) if (j.x > x0 && j.x < x1) art.jelly(c, j.x, j.y, t, j.sq, j.ph);
        hoops.draw(c);
        g.drawHero(hero);
      },
      overlay: c => {
        // the deep stretch is darker; a soft light stays around Kaspion
        const dark = clamp((seg() * 1.05 - hero.x) / (seg() * 0.6), 0, 1) * 0.55;
        if (dark <= 0.01) return;
        const hx = hero.x - g.cam.x, hy = hero.y - g.cam.y;
        const grad = c.createRadialGradient(hx, hy, 60, hx, hy, 260);
        grad.addColorStop(0, 'rgba(5,15,40,0)');
        grad.addColorStop(1, `rgba(5,15,40,${dark})`);
        c.fillStyle = grad;
        c.fillRect(0, 0, g.W, g.H);
      },
    };
  },
};
