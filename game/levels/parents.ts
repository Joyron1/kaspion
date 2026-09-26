// Level 11 — "אבא ואמא!" (page p11): before the little whale has wiped his tears, the
// silver fish come back — and behind them his father and mother, giant, happy and laughing.
// Mission 1: light sea-anemone lanterns along the dark path.
// Mission 2: move the jellyfish out of the way (they float off, no stings).
// Mission 3: lead the little whale to his parents.

import * as art from '../engine/art';
import { Follower, School, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, easeOut, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

interface Lamp extends Point { lit: number; on: boolean }
interface Jelly extends Point { gone: boolean; up: number; ph: number; sq: number }

export const parents: LevelDef = {
  id: 'parents',
  create(g) {
    const worldW = () => g.W * 2.9;
    const calfR = () => Math.min(g.W * 0.16, g.H * 0.22);
    const hero = g.makeHero(worldW() - g.W * 0.45, g.H * 0.45);
    hero.face = -1;
    const calf = new Follower(worldW() - g.W * 0.25, g.H * 0.55, 95, 66); // a tired little whale swims slowly
    const parentsAt = (): Point => ({ x: g.W * 0.45, y: g.H * 0.5 });
    const deco = makeDeco(40, 6000, 41, 0.8);
    const yr = () => ({ y0: g.top + 50, y1: g.floor - 80 });
    const school = new School(g);

    // ---- mission 1: lanterns
    const lamps: Lamp[] = [];
    let lampIdx = 0, lampWait = 0;

    // ---- mission 2: jellyfish
    const jellies: Jelly[] = [];
    let jellyIdx = 0, jellyWait = 0, moveToasts = 0;

    // ---- mission 3: the reunion
    let arrive = 0;      // the parents swimming in (0..1)
    const rings: (Point & { done: boolean })[] = []; // a winding path the calf is led through
    let ringIdx = 0;
    let startGap = 1;
    let reunion = 0;

    const gap = () => dist(calf, parentsAt());

    return {
      hero,
      world: () => ({ w: worldW(), h: g.H }),
      bounds: () => ({ x0: 60, x1: worldW() - 60, y0: g.top, y1: g.floor - 30 }),
      stages: [
        {
          intro: 'stage1', icon: 'spark',
          enter: () => {
            const n = g.cfg.lamps ?? 13, y = yr();
            const x1 = worldW() - g.W * 0.35, x0 = g.W * 0.7;
            for (let i = 0; i < n; i++) {
              const x = x1 - ((x1 - x0) * i) / Math.max(1, n - 1);
              lamps.push({ x, y: i % 2 ? y.y0 + 30 : g.floor - 36, lit: 0, on: false });
            }
          },
          goal: () => lamps.length, got: () => lampIdx,
          update: dt => {
            if (lampWait > 0) { lampWait -= dt; return; }
            const l = lamps[lampIdx];
            if (l && dist(hero, l) < 54) {
              l.on = true; lampIdx++; lampWait = 1.3;
              g.sfx.sparkle();
              g.fx.burst(l.x, l.y - 20, 12, '#fff4b8', 'star', 140);
              if (lampIdx === 1 || lampIdx % 3 === 0) g.toast('toast.light');
            }
          },
          done: () => lamps.length > 0 && lampIdx >= lamps.length && lampWait <= 0,
          targets: () => (lampWait <= 0 && lamps[lampIdx] ? [lamps[lampIdx]] : []),
        },
        {
          intro: 'stage2', icon: 'star',
          enter: () => {
            const n = g.cfg.jellies ?? 13, y = yr();
            for (let i = 0; i < n; i++) {
              const x = g.W * 0.75 + ((worldW() - g.W * 1.2) * (i + 0.5)) / n;
              jellies.push({ x, y: i % 2 ? y.y0 + rand(20, 60) : y.y1 - rand(0, 40), gone: false, up: 0, ph: rand(0, TAU), sq: 0 });
            }
            jellies.sort((a, b) => b.x - a.x); // nearest to Kaspion's side first
          },
          goal: () => jellies.length, got: () => jellyIdx,
          update: dt => {
            if (jellyWait > 0) { jellyWait -= dt; return; }
            const j = jellies[jellyIdx];
            if (j && dist(hero, { x: j.x, y: j.y + Math.sin(g.t * 1.5 + j.ph) * 12 }) < 60) {
              j.gone = true; j.sq = 1; jellyIdx++; jellyWait = 1.2;
              g.sfx.whoosh();
              if (moveToasts < 3 && (jellyIdx === 1 || jellyIdx % 3 === 0)) { moveToasts++; g.toast('toast.move'); }
            }
          },
          done: () => jellies.length > 0 && jellyIdx >= jellies.length && jellyWait <= 0,
          targets: () => { const j = jellies[jellyIdx]; return jellyWait <= 0 && j ? [{ x: j.x, y: j.y + Math.sin(g.t * 1.5 + j.ph) * 12 }] : []; },
        },
        {
          intro: 'stage3', icon: 'whale',
          enter: () => {
            startGap = Math.max(1, gap());
            const n = g.cfg.rings ?? 9, y = yr();
            const xStart = calf.x - 200, xEnd = parentsAt().x + 320;
            for (let i = 0; i < n; i++) {
              const x = xStart - ((xStart - xEnd) * i) / Math.max(1, n - 1);
              rings.push({ x, y: i % 2 ? y.y0 + 40 : y.y1 - 20, done: false });
            }
            // the silver school comes back ahead of the parents
            for (let i = 0; i < 16; i++) {
              const b = school.add(-100 - rand(0, 200), g.H * 0.5 + rand(-120, 120), { size: rand(40, 50) });
              b.face = 1;
            }
          },
          progress: () => clamp(1 - (gap() - 190) / Math.max(1, startGap - 190), 0, 1),
          update: () => {
            // the calf follows Kaspion (see update); a ring counts when the calf swims through it
            const r = rings[ringIdx];
            if (r && dist(calf, r) < 105) { r.done = true; ringIdx++; g.sfx.sparkle(); g.fx.burst(r.x, r.y, 10, '#ffe066', 'star', 130); }
          },
          done: () => ringIdx >= rings.length && arrive >= 1 && gap() < 200,
          targets: () => {
            const r = rings[ringIdx];
            if (r) return [r];
            // last stretch: lead the way to mother and father
            const p = parentsAt();
            const d = Math.max(1, dist(calf, p));
            return [{ x: calf.x + ((p.x - calf.x) / d) * 150, y: calf.y + ((p.y - calf.y) / d) * 150 }];
          },
        },
      ],
      finale: dt => {
        reunion += dt;
        if (reunion - dt <= 0.2 && reunion > 0.2) g.sfx.whaleHappy();
        calf.update(dt, { x: parentsAt().x + 110, y: parentsAt().y + 40 });
        if (Math.random() < dt * 8) g.fx.add({ x: parentsAt().x + rand(-120, 160), y: parentsAt().y - rand(40, 140), type: 'heart', vy: -40, max: 1.5, color: art.PAL.pink, r: 9 });
        return reunion > 3.5;
      },
      update: dt => {
        g.steer(hero, dt);
        // the calf stays near where he waits until mission 3, then follows Kaspion
        if (lamps.length && lampIdx >= lamps.length && jellies.length && jellyIdx >= jellies.length) calf.update(dt, hero);
        else calf.update(dt, { x: worldW() - g.W * 0.25, y: g.H * 0.55 });
        for (const l of lamps) if (l.on) l.lit = Math.min(1, l.lit + dt * 2);
        for (const j of jellies) { if (j.gone) { j.up += dt; j.y -= 70 * dt; } j.sq = Math.max(0, j.sq - dt * 2); }
        if (startGap > 1 || (jellies.length && jellyIdx >= jellies.length)) arrive = Math.min(1, arrive + dt * 0.35);
        school.update(dt, hero);
        // returning fish swim in and gather around the parents
        school.fish.forEach((b, i) => {
          const p = parentsAt();
          const a = (i / school.fish.length) * TAU + g.t * 0.4;
          b.x += (p.x + Math.cos(a) * 220 - b.x) * Math.min(1, dt * 0.8);
          b.y += (p.y + Math.sin(a) * 110 - b.y) * Math.min(1, dt * 0.8);
          b.face = Math.cos(a + Math.PI / 2) >= 0 ? 1 : -1;
        });
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.35, g.cam.x),
      draw: c => {
        const t = g.t, x0 = g.cam.x - 100, x1 = g.cam.x + g.W + 100;
        drawDeco(c, deco, g.floor, t, x0, x1);
        art.sand(c, Math.max(-20, x0), x1, g.floor);
        // mother and father, giant and laughing, arriving from the left
        if (arrive > 0) {
          const k = easeOut(arrive), p = parentsAt(), r = calfR();
          art.whale(c, p.x - 120 - (1 - k) * g.W, p.y - r * 0.9, r * 1.6, 1, t, { body: art.PAL.papa, mood: 'happy', smile: true });
          art.whale(c, p.x - 60 - (1 - k) * g.W, p.y + r * 0.9, r * 1.4, 1, t + 1, { body: art.PAL.mama, lashes: true, mood: 'happy', smile: true });
        }
        // lanterns: sea anemones that glow when touched
        for (let i = 0; i < lamps.length; i++) {
          const l = lamps[i];
          if (l.x < x0 || l.x > x1) continue;
          if (l.lit > 0) art.glow(c, l.x, l.y - 16, 110 * l.lit, 'rgba(255,240,170,0.45)');
          art.anemone(c, l.x, l.y + 20, 48, l.on ? '#ffe066' : '#7f8ab8', t);
          c.beginPath(); c.arc(l.x, l.y - 14, 10, 0, TAU); c.fillStyle = l.on ? '#fff4b8' : '#b9c2e0'; c.fill();
          c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
          if (i === lampIdx && lampWait <= 0) art.sparkle(c, l.x + 20, l.y - 44, t, 0.55);
        }
        for (let i = 0; i < jellies.length; i++) {
          const j = jellies[i];
          if (j.up > 3 || j.x < x0 || j.x > x1) continue;
          const y = j.y + Math.sin(t * 1.5 + j.ph) * 12;
          c.save(); c.globalAlpha = j.gone ? Math.max(0, 1 - j.up / 3) : 1;
          art.jelly(c, j.x, y, t, j.sq, j.ph);
          c.restore();
          if (i === jellyIdx && jellyWait <= 0) art.sparkle(c, j.x + 26, y - 40, t, 0.5);
        }
        for (let i = ringIdx; i < Math.min(rings.length, ringIdx + 2); i++) art.hoop(c, rings[i].x, rings[i].y, 90, t, i === ringIdx);
        school.draw(c);
        art.whale(c, calf.x, calf.y, calfR(), calf.face, t, { mood: arrive >= 1 && gap() < 260 ? 'happy' : 'sad', smile: reunion > 0 });
        g.drawHero(hero);
      },
      overlay: c => {
        // dark until the lanterns are lit
        const dark = lamps.length ? 0.55 * (1 - lampIdx / lamps.length) : 0.55;
        if (dark < 0.02) return;
        const hx = hero.x - g.cam.x, hy = hero.y - g.cam.y;
        const grad = c.createRadialGradient(hx, hy, 80, hx, hy, 320);
        grad.addColorStop(0, 'rgba(4,12,34,0)');
        grad.addColorStop(1, `rgba(4,12,34,${dark})`);
        c.fillStyle = grad; c.fillRect(0, 0, g.W, g.H);
      },
    };
  },
};
