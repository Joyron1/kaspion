// Level 1 — "הדג הכסוף" (page p01): meet Kaspion at home in the reef and learn to swim.
// Stage 1: collect rising bubbles. Stage 2: catch sunbeams that make him shine.
// Stage 3: swim through hoops laid out around the reef.

import * as art from '../engine/art';
import { Fallers, Hoops, Pickups, drawDeco, makeDeco, spread } from '../engine/kit';
import { rand } from '../engine/util';
import type { LevelDef } from '../engine/types';

export const silver: LevelDef = {
  id: 'silver',
  create(g) {
    const hero = g.makeHero(g.W * 0.3, g.H * 0.5);
    const deco = makeDeco(20, 4000, 1, 1.2);
    let shine = 0; // grows as Kaspion catches sunbeams

    const area = () => ({ x0: 70, x1: g.W - 70, y0: g.top + 30, y1: g.floor - 70 });

    // ---- stage 1: bubbles rising from the reef
    const bubbles = new Pickups(g, {
      radius: 26,
      draw: (c, p) => art.bubble(c, p.x + Math.sin(g.t * 1.4 + p.ph) * 12, p.y, p.r),
      drift: (p, dt) => {
        p.y -= 16 * dt;
        if (p.y < g.top + 10) { p.y = g.floor - 60; p.x = rand(area().x0, area().x1); }
      },
    });

    // ---- stage 2: sunbeams drifting down from the surface
    const glints = new Fallers(g, {
      every: 3.3, max: 2, speed: 36, radius: 30,
      spawn: () => ({ x: rand(area().x0, area().x1), y: g.top }),
      draw: (c, f, t) => art.sparkle(c, f.x, f.y, t + f.ph, 0.9),
      onCatch: () => {
        shine++;
        if (shine % 3 === 0) g.toast('toast.shine');
      },
    });

    // ---- stage 3: hoops around the reef
    const hoops = new Hoops(g, 2);

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'bubble',
          enter: () => bubbles.pace(g.cfg.bubbles ?? 14, 2.9, 3, () => {
            // appear away from Kaspion so he has to swim for each one
            const a = area();
            const p = spread(1, a, 0, [])[0];
            if (Math.abs(p.x - hero.x) < a.x1 * 0.3) p.x = hero.x < g.W / 2 ? rand(g.W * 0.6, a.x1) : rand(a.x0, g.W * 0.4);
            return { ...p, r: rand(24, 29) };
          }),
          goal: () => bubbles.total, got: () => bubbles.got,
          update: dt => bubbles.update(dt, hero, true),
          done: () => bubbles.finished,
          targets: () => bubbles.targets(),
        },
        {
          intro: 'stage2', icon: 'spark',
          goal: () => g.cfg.glints ?? 11, got: () => Math.min(glints.caught, g.cfg.glints ?? 11),
          update: dt => glints.update(dt, hero, true),
          done: () => glints.caught >= (g.cfg.glints ?? 11),
          targets: () => glints.targets(),
        },
        {
          intro: 'stage3', icon: 'hoop',
          enter: () => {
            glints.list.length = 0;
            const a = area();
            const n = g.cfg.hoops ?? 14;
            for (let i = 0; i < n; i++) {
              // a zig-zag from one side of the reef to the other and back
              const x = i % 2 === 0 ? a.x0 + 40 + rand(0, 60) : a.x1 - 40 - rand(0, 60);
              const y = a.y0 + 40 + ((i * 0.37) % 1) * (a.y1 - a.y0 - 80);
              hoops.add(x, y, 60);
            }
          },
          goal: () => hoops.total, got: () => hoops.got,
          update: () => hoops.update(hero, true),
          done: () => hoops.total > 0 && hoops.finished,
          targets: () => hoops.targets(),
        },
      ],
      update: (dt, live) => {
        g.steer(hero, dt);
        if (!live) { bubbles.update(dt, hero, false); glints.update(dt, hero, false, false); }
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0),
      draw: c => {
        drawDeco(c, deco.filter(d => d.x < g.W + 100), g.floor, g.t);
        art.sand(c, -20, g.W + 20, g.floor);
        art.starfish(c, g.W * 0.18, g.floor + 18, 16, g.t);
        art.crab(c, g.W * 0.78, g.floor + 12, 38, g.t);
        bubbles.draw(c);
        glints.draw(c);
        hoops.draw(c);
        // the more sunbeams he catches, the more he glows
        if (shine > 0) art.glow(c, hero.x, hero.y, 50 + Math.min(shine, 12) * 5);
        g.drawHero(hero);
      },
    };
  },
};
