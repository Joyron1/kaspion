// Level 10 — "לא נשאר לבד" (page p10): only Kaspion stays with the little whale so he
// won't be alone. "Don't worry, my brothers will find them soon." They wait together.
// A calm, cosy level; the whale smiles a little more with every mission.
// Mission 1: the whale blows bubbles — pop them.
// Mission 2: shells hide under the sand — find them.
// Mission 3: count starfish together, one by one.

import * as art from '../engine/art';
import { Pickups, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

interface Buried extends Point { found: boolean; pop: number; color: string }
interface Star extends Point { counted: boolean; grow: number; color: string }

export const company: LevelDef = {
  id: 'company',
  create(g) {
    const hero = g.makeHero(g.W * 0.25, g.H * 0.45);
    const deco = makeDeco(20, 3000, 37, 0.6).filter(d => d.x < g.W * 0.25 || d.x > g.W * 0.88);
    const R = () => Math.min(g.W * 0.26, g.H * 0.33);
    const cx = () => g.W * 0.58;
    const cy = () => g.floor - R() * 0.42 + Math.sin(g.t * 0.7) * 4;
    let joy = 0; // 0 sad → 1 happy

    // ---- mission 1: bubbles from the blowhole
    let giggles = 0;
    const bubbles = new Pickups(g, {
      radius: 26,
      draw: (c, p) => art.bubble(c, p.x + Math.sin(g.t * 1.4 + p.ph) * 10, p.y, p.r),
      drift: (p, dt) => {
        // rise, then wander off sideways across the water
        p.y = Math.max(g.top + 50, p.y - 30 * dt);
        p.x = clamp(p.x + (p.vx ?? 0) * dt, 70, g.W - 70);
      },
      onGet: () => {
        joy = Math.min(1, joy + 0.03);
        giggles++;
        if (giggles % 4 === 1) { g.sfx.giggle(); g.toast('toast.giggle'); }
      },
    });

    // ---- mission 2: shells under the sand
    const buried: Buried[] = [];
    let shellIdx = 0, shellWait = 0;

    // ---- mission 3: starfish to count
    const stars: Star[] = [];
    let starIdx = 0, starWait = 0;

    const blowhole = (): Point => ({ x: cx() - R() * 0.35, y: cy() - R() * 0.58 });
    const floorSpot = (i: number) => {
      // alternate between the two sides of the whale, along the sand
      const left = i % 2 === 0;
      const x = left ? rand(80, cx() - R() * 1.05) : rand(cx() + R() * 1.2, g.W - 80);
      return { x: clamp(x, 80, g.W - 80), y: art.sandY(x, g.floor) + 6 };
    };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'bubble',
          enter: () => bubbles.pace(g.cfg.bubbles ?? 18, 2.9, 3, () => {
            const b = blowhole();
            return { x: b.x, y: b.y - 10, r: rand(22, 28), vx: (Math.random() < 0.5 ? -1 : 1) * rand(35, 65) };
          }),
          goal: () => bubbles.total, got: () => bubbles.got,
          update: dt => bubbles.update(dt, hero, true),
          done: () => bubbles.finished,
          targets: () => bubbles.targets(),
        },
        {
          intro: 'stage2', icon: 'shell',
          enter: () => {
            const n = g.cfg.shells ?? 10;
            const colors = ['#ffb49a', '#ffd6ec', '#fff1b8', '#c9f0ff'];
            for (let i = 0; i < n; i++) buried.push({ ...floorSpot(i), found: false, pop: 0, color: colors[i % colors.length] });
          },
          goal: () => buried.length, got: () => shellIdx,
          update: dt => {
            if (shellWait > 0) { shellWait -= dt; return; }
            const s = buried[shellIdx];
            if (s && dist(hero, { x: s.x, y: s.y - 20 }) < 56) {
              s.found = true; shellIdx++; shellWait = 1.3;
              joy = Math.min(1, joy + 0.05);
              g.sfx.shell();
              g.fx.burst(s.x, s.y - 10, 10, art.PAL.sand, 'dot', 120);
            }
          },
          done: () => buried.length > 0 && shellIdx >= buried.length && shellWait <= 0,
          targets: () => { const s = buried[shellIdx]; return shellWait <= 0 && s ? [{ x: s.x, y: s.y - 20 }] : []; },
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            const n = clamp(g.cfg.stars ?? 7, 1, 7);
            const colors = [art.PAL.orange, art.PAL.coral, '#ffd23f', art.PAL.pink, art.PAL.purple, '#7ccf6a', '#4aa8ff'];
            for (let i = 0; i < n; i++) stars.push({ ...floorSpot(i + 1), counted: false, grow: 0, color: colors[i] });
          },
          goal: () => stars.length, got: () => starIdx,
          update: dt => {
            if (starWait > 0) { starWait -= dt; return; }
            const s = stars[starIdx];
            if (s && s.grow >= 1 && dist(hero, { x: s.x, y: s.y - 16 }) < 56) {
              s.counted = true; starIdx++; starWait = 2;
              joy = Math.min(1, joy + 0.08);
              g.sfx.sparkle();
              g.fx.burst(s.x, s.y - 16, 12, '#ffe066', 'star', 140);
              g.toast(`toast.n${starIdx}`);
            }
          },
          done: () => stars.length > 0 && starIdx >= stars.length && starWait <= 0,
          targets: () => { const s = stars[starIdx]; return starWait <= 0 && s && s.grow >= 1 ? [{ x: s.x, y: s.y - 16 }] : []; },
        },
      ],
      update: (dt, live) => {
        g.steer(hero, dt);
        if (!live) bubbles.update(dt, hero, false);
        for (const s of buried) if (s.found) s.pop = Math.min(1, s.pop + dt * 2);
        const next = stars[starIdx];
        if (next && starWait <= 0) next.grow = Math.min(1, next.grow + dt * 1.5);
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.3),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco, g.floor, t);
        // a soft cosy glow around the two friends
        art.glow(c, cx() - R() * 0.4, cy(), R() * 1.6, 'rgba(255,230,170,0.18)');
        art.whale(c, cx(), cy(), R(), -1, t, { mood: joy > 0.45 ? 'happy' : 'sad', smile: joy > 0.45 });
        art.sand(c, -20, g.W + 20, g.floor);
        // shells: a sandy bump with a sparkle, then the shell pops up
        for (let i = 0; i < buried.length; i++) {
          const s = buried[i];
          if (s.found) { art.shell(c, s.x, s.y - 14 - s.pop * 14, t, s.color, false); continue; }
          if (i !== shellIdx || shellWait > 0) continue;
          c.beginPath(); c.ellipse(s.x, s.y + 2, 30, 12, 0, Math.PI, TAU); c.fillStyle = '#e8bd5c'; c.fill();
          c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
          art.sparkle(c, s.x + 10, s.y - 24, t, 0.55);
        }
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          if (!s.counted && (i !== starIdx || s.grow <= 0)) continue;
          art.starfish(c, s.x, s.y - 10, 20 * (s.counted ? 1 : s.grow), t + i, s.color);
          if (s.counted) {
            // the number stays above each counted starfish as dots
            for (let k = 0; k <= i; k++) {
              c.beginPath(); c.arc(s.x - (i * 7) / 2 + k * 7, s.y - 44, 3, 0, TAU); c.fillStyle = '#fffaf0'; c.fill();
            }
          }
        }
        bubbles.draw(c);
        g.drawHero(hero);
      },
    };
  },
};
