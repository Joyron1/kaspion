// Level 13 — "חברים טובים" (page p13): from that day on Kaspion and the whale play together
// every day — the little fish and the big whale are the best friends in the sea.
// Mission 1: the whale spouts stars — catch them as they drift down.
// Mission 2: a friends' race — swim through the hoops with the whale close behind.
// Mission 3: gather everyone for a family photo. Cheese!

import * as art from '../engine/art';
import { Fallers, Follower, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type Kind = 'crab' | 'octopus' | 'turtle' | 'seahorse' | 'starfish' | 'fish';
interface Pal extends Point { kind: Kind; joined: boolean; slot: Point; ph: number }
interface Ring extends Point { done: boolean }

export const together: LevelDef = {
  id: 'together',
  create(g) {
    const hero = g.makeHero(g.W * 0.25, g.H * 0.45);
    const deco = makeDeco(20, 3000, 53, 0.9);
    const R = () => Math.min(g.W * 0.2, g.H * 0.26);
    const home = (): Point => ({ x: g.W * 0.62, y: g.H * 0.48 });
    const whale = new Follower(home().x, home().y, 150, 170);
    let whaleFree = false; // follows Kaspion during the race
    let spout = 0;

    // ---- mission 1: stars from the spout
    const stars = new Fallers(g, {
      every: 2.6, max: 3, speed: 34, radius: 28,
      spawn: () => {
        spout = 1; g.sfx.splash();
        const left = Math.random() < 0.5;
        return { x: left ? rand(90, g.W * 0.45) : rand(g.W * 0.55, g.W - 90), y: g.top + 10 };
      },
      draw: (c, f, t) => { art.glow(c, f.x, f.y, 36); art.star(c, f.x, f.y, 20 + Math.sin(t * 5 + f.ph) * 2, '#ffe066'); },
    });

    // ---- mission 2: the race
    const rings: Ring[] = [];
    let ringIdx = 0, ringWait = 0;

    // ---- mission 3: the photo
    const pals: Pal[] = [];
    let palIdx = 0, palWait = 0;
    let photo = 0; // flash
    let posed = false;
    const frame = (): Point => ({ x: home().x - R() * 1.3, y: home().y - R() * 0.2 });

    const drawPal = (c: CanvasRenderingContext2D, p: Pal, t: number) => {
      switch (p.kind) {
        case 'crab': art.crab(c, p.x, p.y, 44, t); break;
        case 'octopus': art.octopus(c, p.x, p.y, 58, t); break;
        case 'turtle': art.turtle(c, p.x, p.y, 80, p.joined ? -1 : 1, t); break;
        case 'seahorse': art.seahorse(c, p.x, p.y, 62, t); break;
        case 'starfish': art.starfish(c, p.x, p.y, 20, t); break;
        case 'fish': for (let k = 0; k < 3; k++) art.fish(c, p.x + (k - 1) * 26, p.y + (k % 2) * 14, 36, -1, t + k); break;
      }
    };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'star',
          goal: () => g.cfg.stars ?? 12, got: () => Math.min(stars.caught, g.cfg.stars ?? 12),
          update: dt => stars.update(dt, hero, true, stars.caught + stars.list.length < (g.cfg.stars ?? 12) + 3),
          done: () => stars.caught >= (g.cfg.stars ?? 12),
          targets: () => stars.targets(),
        },
        {
          intro: 'stage2', icon: 'hoop',
          enter: () => {
            stars.list.length = 0;
            whaleFree = true;
            const n = g.cfg.hoops ?? 12;
            const a = { x0: 110, x1: g.W - 110, y0: g.top + 60, y1: g.floor - 90 };
            for (let i = 0; i < n; i++) {
              rings.push({ x: i % 2 ? a.x0 + rand(0, 60) : a.x1 - rand(0, 60), y: a.y0 + ((i * 0.37 + 0.15) % 1) * (a.y1 - a.y0), done: false });
            }
          },
          goal: () => rings.length, got: () => ringIdx,
          update: dt => {
            if (ringWait > 0) { ringWait -= dt; return; }
            const r = rings[ringIdx];
            if (r && dist(hero, r) < 56) {
              r.done = true; ringIdx++; ringWait = 0.6;
              g.sfx.sparkle();
              g.fx.burst(r.x, r.y, 10, '#ffe066', 'star', 130);
            }
          },
          done: () => rings.length > 0 && ringIdx >= rings.length,
          targets: () => (ringWait <= 0 && rings[ringIdx] ? [rings[ringIdx]] : []),
        },
        {
          intro: 'stage3', icon: 'heart',
          enter: () => {
            whaleFree = false;
            const kinds: Kind[] = ['crab', 'octopus', 'turtle', 'seahorse', 'starfish', 'fish'];
            const n = g.cfg.friends ?? 8;
            const f = frame();
            for (let i = 0; i < n; i++) {
              const kind = kinds[i % kinds.length];
              const onFloor = kind === 'crab' || kind === 'starfish';
              const left = i % 2 === 0;
              pals.push({
                kind,
                x: left ? rand(90, g.W * 0.3) : rand(g.W * 0.72, g.W - 90),
                y: onFloor ? g.floor + 2 : rand(g.top + 70, g.floor - 110),
                joined: false,
                // a place in the photo, around the whale
                slot: { x: f.x + Math.cos(Math.PI + (i / n) * Math.PI) * R() * 1.9 + R() * 1.3, y: clamp(f.y + Math.sin(Math.PI + (i / n) * Math.PI) * R() * 1.3 + R() * 0.9, g.top + 60, g.floor - 20) },
                ph: rand(0, TAU),
              });
            }
          },
          goal: () => pals.length + 1, got: () => palIdx + (posed ? 1 : 0),
          update: dt => {
            if (palWait > 0) { palWait -= dt; return; }
            const p = pals[palIdx];
            if (p && dist(hero, p) < 60) {
              p.joined = true; palIdx++; palWait = 1.3;
              g.sfx.join();
              g.fx.burst(p.x, p.y, 8, art.PAL.pink, 'heart', 110);
            } else if (!p && !posed && dist(hero, frame()) < 60) {
              // everyone is here: smile!
              posed = true; photo = 1;
              g.sfx.sparkle();
              g.toast('toast.photo');
            }
          },
          done: () => posed && photo < 0.2,
          targets: () => {
            if (palWait > 0) return [];
            const p = pals[palIdx];
            return p ? [p] : posed ? [] : [frame()];
          },
        },
      ],
      update: dt => {
        g.steer(hero, dt);
        if (whaleFree) whale.update(dt, hero);
        else whale.update(dt, home());
        spout = Math.max(0, spout - dt * 0.8);
        photo = Math.max(0, photo - dt * 0.6);
        for (const p of pals) if (p.joined) {
          p.x += (p.slot.x - p.x) * Math.min(1, dt * 1.5);
          p.y += (p.slot.y - p.y) * Math.min(1, dt * 1.5);
        }
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco.filter(d => d.x < g.W + 100), g.floor, t);
        art.sand(c, -20, g.W + 20, g.floor);
        art.whale(c, whale.x, whale.y + Math.sin(t) * 5, R(), whaleFree ? whale.face : -1, t, { mood: 'happy', smile: true, spout });
        for (let i = ringIdx; i < Math.min(rings.length, ringIdx + (ringWait > 0 ? 0 : 2)); i++) art.hoop(c, rings[i].x, rings[i].y, 60, t, i === ringIdx);
        stars.draw(c);
        // the photo spot: a sparkly frame next to the whale
        if (pals.length) {
          const f = frame();
          c.save(); c.globalAlpha = palIdx >= pals.length && !posed ? 1 : 0.5;
          c.setLineDash([12, 10]); c.lineWidth = 5; c.strokeStyle = '#fffaf0';
          c.strokeRect(f.x - 60, f.y - 50, 120, 100);
          c.restore();
          if (palIdx >= pals.length && !posed) art.sparkle(c, f.x + 50, f.y - 50, t, 0.7);
        }
        for (let i = 0; i < pals.length; i++) {
          const p = pals[i];
          if (!p.joined && (i !== palIdx || palWait > 0)) continue;
          drawPal(c, p, t + p.ph);
          if (!p.joined) art.sparkle(c, p.x + 26, p.y - 50, t, 0.5);
        }
        g.drawHero(hero);
      },
      overlay: c => {
        if (photo <= 0) return;
        // camera flash
        c.fillStyle = `rgba(255,255,255,${Math.min(0.9, photo)})`;
        c.fillRect(0, 0, g.W, g.H);
      },
    };
  },
};
