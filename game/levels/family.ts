// Level 2 — "כמו דג אחד" (page p02): Kaspion's many silver brothers, sisters and
// cousins swim together like one big fish.
// Mission 1: find the siblings hiding in the reef — each joins the school.
// Mission 2: the whole school eats plankton together.
// Mission 3: swim as one through a zig-zag of gently swaying hoops; finale: everyone gathers tight.

import * as art from '../engine/art';
import { Hoops, Pickups, School, drawDeco, makeDeco, type Buddy } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

interface Spot extends Point { kind: 'weed' | 'coral' | 'rock'; buddy: Buddy | null; lit: boolean; color: string }

export const family: LevelDef = {
  id: 'family',
  create(g) {
    const hero = g.makeHero(g.W * 0.5, g.H * 0.45);
    const deco = makeDeco(20, 3000, 7, 0.8);
    const school = new School(g);
    const area = () => ({ x0: 80, x1: g.W - 80, y0: g.top + 40, y1: g.floor - 70 });

    // ---- mission 1: hiding places around the reef, two lit at a time
    let spots: Spot[] = [];
    let found = 0;
    let nextLight = 0; // a short breath after each sibling joins, before the next one peeks out
    const layoutSpots = () => {
      const n = g.cfg.hide ?? 9;
      spots = [];
      const colors = [art.PAL.coral, art.PAL.purple, art.PAL.orange];
      for (let i = 0; i < n; i++) {
        // alternate sides and heights so each sibling is a real swim away from the last
        const side = i % 2 === 0 ? 0.12 + (i / n) * 0.3 : 0.88 - (i / n) * 0.3;
        const x = clamp(g.W * side + rand(-30, 30), 90, g.W - 90);
        const onFloor = i % 3 === 0;
        const y = onFloor ? g.floor - 40 : rand(g.top + 100, g.floor - 130);
        const kind: Spot['kind'] = onFloor ? (i % 2 ? 'rock' : 'coral') : 'weed';
        spots.push({ x, y, kind, buddy: null, lit: false, color: colors[i % 3] });
      }
    };
    const hidePoint = (s: Spot) => ({ x: s.x + 22, y: s.kind === 'weed' ? s.y - 8 : s.y - 44 });
    const lightNext = () => {
      const lit = spots.filter(s => s.lit && !s.buddy);
      const dark = spots.filter(s => !s.lit);
      if (lit.length < 1 && dark.length) {
        // light the hiding place farthest from Kaspion, so he crosses the reef
        dark.sort((a, b) => dist(b, hero) - dist(a, hero));
        dark[0].lit = true;
      }
    };

    // ---- mission 2: plankton for everyone
    const food = new Pickups(g, {
      radius: 22,
      draw: (c, p, t) => art.plankton(c, p.x, p.y + Math.sin(t * 2 + p.ph) * 6, 13, t),
      drift: (p, dt, t) => { p.x += Math.sin(t * 0.7 + p.ph) * 12 * dt; p.y += Math.cos(t * 0.9 + p.ph) * 6 * dt; },
      sound: 'pop',
    });

    // ---- mission 3: hoops, swum through together
    const hoops = new Hoops(g, 2);
    let sway = 0;
    let finaleT = 0;

    const drawSpot = (c: CanvasRenderingContext2D, s: Spot, t: number) => {
      const base = art.sandY(s.x, g.floor) + 8;
      if (s.lit && !s.buddy) {
        // a peeking silver sibling and a sparkle say "someone is here"
        const p = hidePoint(s);
        const peek = 0.5 + 0.5 * Math.sin(t * 3 + s.x);
        art.fish(c, p.x + peek * 8, p.y, 36, 1, t, { mood: 'happy' });
        art.sparkle(c, p.x - 28, p.y - 34, t + s.x, 0.6);
      }
      if (s.kind === 'coral') art.coral(c, s.x, base, 92, s.color);
      else if (s.kind === 'rock') art.rock(c, s.x, base - 4, 50);
      else {
        // a floating clump of sea grass the sibling hides in
        for (let k = -2; k <= 2; k++) {
          art.inkStroke(c, () => {
            c.beginPath(); c.moveTo(s.x + k * 10, s.y + 36);
            for (let j = 1; j <= 5; j++) c.lineTo(s.x + k * 10 + Math.sin(t * 1.6 + k + j * 0.7) * j * 2.2, s.y + 36 - j * 17);
          }, 8, k % 2 ? art.PAL.green : art.PAL.greenDark);
        }
      }
    };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'fish',
          enter: () => { layoutSpots(); lightNext(); },
          goal: () => spots.length, got: () => found,
          update: dt => {
            if (nextLight > 0) { nextLight -= dt; if (nextLight <= 0) lightNext(); }
            for (const s of spots) {
              if (!s.lit || s.buddy) continue;
              const p = hidePoint(s);
              if (dist(hero, p) < 52) {
                const b = school.add(p.x, p.y, { size: rand(44, 54) });
                b.joined = true;
                s.buddy = b;
                found++;
                g.sfx.join();
                g.fx.burst(p.x, p.y, 12, '#ffffff', 'star', 150);
                if (found === 1 || found % 3 === 0) g.toast('toast.found');
                nextLight = 1.6;
              }
            }
          },
          done: () => spots.length > 0 && found >= spots.length,
          targets: () => spots.filter(s => s.lit && !s.buddy).map(hidePoint),
        },
        {
          intro: 'stage2', icon: 'food',
          enter: () => food.pace(g.cfg.food ?? 16, 2.6, 3, () => {
            const a = area();
            // new food appears on the other half of the reef from where the school is
            const left = hero.x > g.W / 2;
            return { x: left ? rand(a.x0, g.W * 0.45) : rand(g.W * 0.55, a.x1), y: rand(a.y0, a.y1) };
          }),
          goal: () => food.total, got: () => food.got,
          update: dt => food.update(dt, hero, true),
          done: () => food.finished,
          targets: () => food.targets(),
        },
        {
          intro: 'stage3', icon: 'hoop',
          enter: () => {
            const a = area();
            const n = g.cfg.hoops ?? 12;
            for (let i = 0; i < n; i++) {
              const x = i % 2 === 0 ? a.x0 + 30 + rand(0, 50) : a.x1 - 30 - rand(0, 50);
              const y = a.y0 + 40 + ((i * 0.43 + 0.2) % 1) * (a.y1 - a.y0 - 80);
              hoops.add(x, y, 70);
            }
          },
          goal: () => hoops.total, got: () => hoops.got,
          update: dt => {
            // the hoops sway gently up and down, so the school has to follow them
            sway += dt;
            const a = area();
            for (let i = hoops.index; i < hoops.points.length; i++) {
              const h = hoops.points[i];
              h.y = clamp(h.y + Math.sin(sway * 0.8 + i) * 16 * dt, a.y0 + 20, a.y1 - 20);
            }
            hoops.update(hero, true);
          },
          done: () => hoops.total > 0 && hoops.finished,
          targets: () => hoops.targets(),
        },
      ],
      finale: dt => {
        finaleT += dt;
        // everyone snuggles into one big shape around Kaspion
        school.fish.forEach((b, i) => {
          const a = (i / Math.max(1, school.fish.length)) * TAU + finaleT * 0.8;
          const r = 46 + (i % 3) * 22;
          b.x += (hero.x + Math.cos(a) * r * 1.5 - b.x) * Math.min(1, dt * 3);
          b.y += (hero.y + Math.sin(a) * r * 0.8 - b.y) * Math.min(1, dt * 3);
          b.face = hero.face;
        });
        if (Math.random() < dt * 4) g.fx.burst(hero.x + rand(-90, 90), hero.y + rand(-50, 50), 3, '#ffffff', 'star', 60);
        return finaleT > 3.2;
      },
      update: (dt, live) => {
        g.steer(hero, dt);
        school.update(dt, hero);
        if (!live) food.update(dt, hero, false);
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.05),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco.filter(d => d.x < g.W + 100), g.floor, t);
        art.sand(c, -20, g.W + 20, g.floor);
        for (const s of spots) drawSpot(c, s, t);
        food.draw(c);
        hoops.draw(c);
        school.draw(c);
        g.drawHero(hero);
      },
    };
  },
};
