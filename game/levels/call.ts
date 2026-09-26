// Level 8 — "קוראים למשפחה" (page p08): Kaspion hurries to call all his brothers,
// sisters and cousins: "Come quickly! A little whale is lost and needs our help!"
// Mission 1: swim fast to the family's waters (to the RIGHT); air bubbles give a push.
// Mission 2: call every group of silver fish — they join the school.
// Mission 3: lead the whole family back (to the LEFT) through gates to the whale.

import * as art from '../engine/art';
import { Hoops, School, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

interface Boost extends Point { got: boolean; ph: number }
interface Group extends Point { called: boolean; size: number; hideIn: 'coral' | 'weed' | 'rock' }

export const call: LevelDef = {
  id: 'call',
  create(g) {
    const worldW = () => Math.max(4200, g.W * 5.6);
    const home = () => worldW() - g.W; // where the family's waters begin
    const hero = g.makeHero(260, g.H * 0.5);
    hero.face = 1;
    const deco = makeDeco(40, 9000, 29, 0.9);
    const yr = () => ({ y0: g.top + 40, y1: g.floor - 80 });
    const school = new School(g);

    // ---- mission 1: boost bubbles on the way home
    const boosts: Boost[] = [];
    let boostT = 0;

    // ---- mission 2: groups of silver fish around the family's waters
    const groups: Group[] = [];
    let calledCount = 0, callWait = 0;

    // ---- mission 3: gates on the way back to the whale
    const gates = new Hoops(g, 2);

    const reachedHome = () => hero.x > home() + 60;

    return {
      hero,
      world: () => ({ w: worldW(), h: g.H }),
      bounds: () => ({ x0: 60, x1: worldW() - 60, y0: g.top, y1: g.floor - 30 }),
      stages: [
        {
          intro: 'stage1', icon: 'bubble',
          enter: () => {
            const n = g.cfg.boosts ?? 12, y = yr();
            for (let i = 0; i < n; i++) {
              const x = 520 + ((home() - 520) * (i + 0.5)) / n;
              boosts.push({ x, y: i % 2 ? y.y0 + rand(0, 40) : y.y1 - rand(0, 40), got: false, ph: rand(0, TAU) });
            }
          },
          goal: () => boosts.length, got: () => boosts.filter(b => b.got).length,
          progress: () => clamp(hero.x / (home() + 60), 0, 1),
          update: () => {
            // only the next two bubbles count, so the way zig-zags high and low
            for (const b of boosts.filter(q => !q.got).slice(0, 2)) {
              if (dist(hero, b) < 50) {
                b.got = true; boostT = 1.1;
                g.sfx.whoosh();
                g.fx.burst(b.x, b.y, 10, '#ffffff', 'dot', 150);
              }
            }
          },
          done: () => boosts.length > 0 && boosts.every(b => b.got) && reachedHome(),
          targets: () => {
            const next = boosts.find(b => !b.got);
            return next ? [next] : [{ x: home() + 200, y: g.H * 0.5 }];
          },
        },
        {
          intro: 'stage2', icon: 'fish',
          enter: () => {
            const n = g.cfg.groups ?? 8, y = yr();
            const kinds: Group['hideIn'][] = ['coral', 'weed', 'rock'];
            for (let i = 0; i < n; i++) {
              // alternate sides of the family's waters, high and low
              const x = home() + (i % 2 ? g.W * 0.2 : g.W * 0.8) + rand(-40, 40);
              const gy = i % 3 === 0 ? y.y1 : i % 3 === 1 ? y.y0 + 20 : (y.y0 + y.y1) / 2;
              groups.push({ x, y: gy, called: false, size: 2 + (i % 2), hideIn: kinds[i % 3] });
            }
          },
          goal: () => groups.length, got: () => calledCount,
          update: dt => {
            if (callWait > 0) { callWait -= dt; return; }
            const next = groups.find(q => !q.called);
            if (next && dist(hero, next) < 60) {
              next.called = true; calledCount++;
              callWait = 1.6;
              g.sfx.call();
              if (calledCount === 1 || calledCount % 2 === 0) g.toast('toast.call');
              for (let k = 0; k < next.size; k++) {
                const b = school.add(next.x + rand(-30, 30), next.y + rand(-20, 20), { size: rand(42, 52) });
                b.joined = true;
              }
              g.fx.ring(hero.x, hero.y); g.fx.ring(hero.x, hero.y, '#ffe066');
            }
          },
          done: () => groups.length > 0 && calledCount >= groups.length && callWait <= 0,
          targets: () => { const next = groups.find(q => !q.called); return callWait <= 0 && next ? [next] : []; },
        },
        {
          intro: 'stage3', icon: 'hoop',
          enter: () => {
            const n = g.cfg.hoops ?? 10, y = yr();
            const x1 = home() - 200, x0 = g.W * 0.9;
            for (let i = 0; i < n; i++) {
              const x = x1 - ((x1 - x0) * i) / Math.max(1, n - 1);
              gates.add(x, i % 2 ? y.y0 + 50 : y.y1 - 30, 78);
            }
          },
          goal: () => gates.total, got: () => gates.got,
          progress: () => clamp(1 - (hero.x - g.W * 0.6) / (home() - g.W * 0.6), 0, 1),
          update: () => gates.update(hero, true),
          done: () => gates.total > 0 && gates.finished,
          targets: () => gates.targets(),
        },
      ],
      update: dt => {
        if (boostT > 0) { boostT -= dt; hero.x += 110 * dt * hero.face; }
        g.steer(hero, dt);
        school.update(dt, hero);
      },
      background: c => {
        art.sea(c, g.W, g.H, g.t, 0.15, g.cam.x);
        art.farHills(c, g.W, g.H, g.cam.x * 0.4, 'rgba(20,60,120,0.35)', 8);
      },
      draw: c => {
        const t = g.t, x0 = g.cam.x - 80, x1 = g.cam.x + g.W + 80;
        // the little whale waiting where Kaspion came from
        if (x0 < 700) {
          const R = Math.min(g.W * 0.22, g.H * 0.3);
          art.whale(c, 80 + R * 0.3, g.H * 0.5 + Math.sin(t) * 6, R, 1, t, { mood: 'sad' });
        }
        drawDeco(c, deco, g.floor, t, x0, x1);
        art.sand(c, Math.max(-20, x0), x1, g.floor);
        for (const b of boosts.filter(q => !q.got).slice(0, 2)) if (b.x > x0 && b.x < x1) {
          art.bubble(c, b.x + Math.sin(t * 1.5 + b.ph) * 8, b.y, 28);
          art.arrow(c, b.x, b.y, 0, t, 0.35);
        }
        // groups waiting to be called: peeking out, the next one sparkles
        const next = groups.find(q => !q.called);
        for (const q of groups) {
          if (q.called || q.x < x0 || q.x > x1) continue;
          for (let k = 0; k < q.size; k++) art.fish(c, q.x + (k - 1) * 28, q.y + ((k % 2) * 2 - 1) * 12 + Math.sin(t * 2 + k) * 4, 42, -1, t + k);
          if (q.hideIn === 'coral') art.coral(c, q.x + 30, q.y + 60, 80, art.PAL.coral);
          else if (q.hideIn === 'rock') art.rock(c, q.x + 20, q.y + 30, 44);
          else for (let k = -1; k <= 1; k++) art.weed(c, q.x + k * 14 + 20, q.y + 44, 80, art.PAL.green, k, t);
          if (q === next && callWait <= 0) art.sparkle(c, q.x - 10, q.y - 44, t, 0.6);
        }
        gates.draw(c);
        school.draw(c);
        g.drawHero(hero);
      },
    };
  },
};
