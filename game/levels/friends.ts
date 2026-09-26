// Level 3 — "חברים בים" (page p03): Kaspion meets all kinds of fish — big and small,
// thin and fat — and even seahorses, and says hello to each.
// Mission 1: greet five very different fish that arrive one at a time.
// Mission 2: seahorses hide in a seaweed forest; find them.
// Mission 3: a playful little fish wants to play tag.

import * as art from '../engine/art';
import { Runner, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, easeOutBack, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type C = CanvasRenderingContext2D;
type Kind = 'big' | 'small' | 'thin' | 'fat' | 'striped';

const LOOK: Record<Kind, { rx: number; ry: number; body: string; fin: string }> = {
  big:     { rx: 80, ry: 46, body: '#4aa8ff', fin: '#2f7fd1' },
  small:   { rx: 20, ry: 13, body: '#ffd23f', fin: '#f2a93b' },
  thin:    { rx: 62, ry: 12, body: '#ff86c1', fin: '#e25d9f' },
  fat:     { rx: 42, ry: 38, body: '#ff9a4a', fin: '#e0742a' },
  striped: { rx: 44, ry: 26, body: '#fffaf0', fin: '#15223a' },
};

/** A friendly fish of the given kind, facing `face`, with a flip of `spin` (0..1). */
function friendFish(c: C, x: number, y: number, kind: Kind, face: number, t: number, spin = 0) {
  const L = LOOK[kind];
  c.save(); c.translate(x, y); c.scale(face >= 0 ? 1 : -1, 1);
  if (spin > 0) c.rotate(spin * TAU);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = art.INK;
  const wag = Math.sin(t * 6) * 0.25;
  // tail
  c.save(); c.translate(-L.rx * 0.9, 0); c.rotate(wag);
  c.beginPath(); c.moveTo(4, 0); c.lineTo(-L.ry * 0.9 - 8, -L.ry * 0.8 - 4); c.lineTo(-L.ry * 0.9 - 8, L.ry * 0.8 + 4); c.closePath();
  c.fillStyle = L.fin; c.fill(); c.lineWidth = 4; c.stroke();
  c.restore();
  // body
  const shape = () => { c.beginPath(); c.ellipse(0, 0, L.rx, L.ry, 0, 0, TAU); };
  shape(); c.fillStyle = L.body; c.fill();
  if (kind === 'striped') {
    c.save(); shape(); c.clip();
    c.fillStyle = art.INK;
    for (let i = -2; i <= 2; i++) c.fillRect(i * 16 - 5, -L.ry, 9, L.ry * 2);
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath(); c.ellipse(L.rx * 0.1, -L.ry * 0.45, L.rx * 0.55, L.ry * 0.2, 0, 0, TAU); c.fill();
  shape(); c.lineWidth = 4.5; c.stroke();
  // eye and smile
  const er = Math.max(4.5, Math.min(11, L.ry * 0.32));
  const ex = L.rx * 0.55, ey = -L.ry * 0.2;
  c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(ex + er * 0.25, ey, er * 0.5, 0, TAU); c.fillStyle = art.INK; c.fill();
  c.beginPath(); c.moveTo(L.rx * 0.72, L.ry * 0.25); c.quadraticCurveTo(L.rx * 0.82, L.ry * 0.42, L.rx * 0.93, L.ry * 0.18);
  c.lineWidth = 3; c.stroke();
  c.restore();
}

interface Friend extends Point { kind: Kind; face: number; vx: number; vy: number; greeted: boolean; spin: number; enter: number; ph: number }
interface Hideout extends Point { found: boolean; peek: number; lit: boolean }

export const friends: LevelDef = {
  id: 'friends',
  create(g) {
    const hero = g.makeHero(g.W * 0.5, g.H * 0.5);
    const deco = makeDeco(20, 3000, 11, 0.7);
    const area = () => ({ x0: 90, x1: g.W - 90, y0: g.top + 50, y1: g.floor - 80 });

    // ---- mission 1: five different fish, one after another
    const ORDER: Kind[] = ['big', 'small', 'thin', 'fat', 'striped'];
    const fishes: Friend[] = [];
    let greeted = 0;
    let nextArrive = 0;
    const greetTotal = () => clamp(g.cfg.greet ?? 5, 1, 5);
    const arrive = () => {
      const kind = ORDER[fishes.length];
      // come in from the side opposite Kaspion
      const fromLeft = hero.x > g.W / 2;
      const a = area();
      fishes.push({ kind, x: fromLeft ? -120 : g.W + 120, y: rand(a.y0 + 20, a.y1 - 20), face: fromLeft ? 1 : -1, vx: 0, vy: 0, greeted: false, spin: 0, enter: 0, ph: rand(0, TAU) });
    };

    // ---- mission 2: seahorses in a seaweed forest
    const forest: { x: number; h: number; ph: number }[] = [];
    const hideouts: Hideout[] = [];
    let seaFound = 0;
    let nextHide = 0;
    const seaTotal = () => g.cfg.seahorses ?? 8;
    const buildForest = () => {
      forest.length = 0;
      for (let x = 60; x < g.W - 40; x += rand(34, 52)) forest.push({ x, h: rand(g.H * 0.3, g.H * 0.55), ph: rand(0, 6) });
    };
    const hideNext = () => {
      if (hideouts.length >= seaTotal()) return;
      const a = area();
      // hide far from Kaspion, low enough to be inside the seaweed
      let best: Point = { x: a.x0, y: a.y1 };
      let bd = -1;
      for (let k = 0; k < 12; k++) {
        const p = { x: rand(a.x0, a.x1), y: rand(g.floor - g.H * 0.4, a.y1) };
        const d = dist(p, hero);
        if (d > bd) { bd = d; best = p; }
      }
      hideouts.push({ ...best, found: false, peek: 0, lit: true });
    };

    // ---- mission 3: tag
    const runner = new Runner(g, g.W * 0.75, g.H * 0.45, area, 140);
    let runnerOn = false;
    let dash: Point | null = null; // after being tagged the little fish zips to the far side, giggling

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'heart',
          enter: () => { arrive(); },
          goal: () => greetTotal(), got: () => greeted,
          update: dt => {
            if (nextArrive > 0) { nextArrive -= dt; if (nextArrive <= 0 && fishes.length < greetTotal()) arrive(); }
            for (const f of fishes) {
              if (f.greeted || f.enter < 1) continue;
              if (dist(hero, f) < LOOK[f.kind].rx * 0.6 + 44) {
                f.greeted = true; greeted++;
                g.sfx.giggle();
                g.fx.burst(f.x, f.y - 20, 8, art.PAL.pink, 'heart', 120);
                g.toast(`toast.${f.kind}`);
                nextArrive = 2.6;
              }
            }
          },
          done: () => greeted >= greetTotal(),
          targets: () => fishes.filter(f => !f.greeted && f.enter >= 1),
        },
        {
          intro: 'stage2', icon: 'spark',
          enter: () => { buildForest(); hideNext(); },
          goal: () => seaTotal(), got: () => seaFound,
          update: dt => {
            if (nextHide > 0) { nextHide -= dt; if (nextHide <= 0) hideNext(); }
            for (const h of hideouts) {
              if (h.found) continue;
              if (dist(hero, h) < 48) {
                h.found = true; seaFound++;
                g.sfx.sparkle();
                g.fx.burst(h.x, h.y, 12, '#ffe066', 'star', 150);
                g.toast('toast.seahorse');
                nextHide = 1.8;
              }
            }
          },
          done: () => seaFound >= seaTotal(),
          targets: () => hideouts.filter(h => !h.found),
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            runnerOn = true;
            runner.x = hero.x < g.W / 2 ? g.W * 0.8 : g.W * 0.2;
            runner.y = g.H * 0.45;
          },
          goal: () => g.cfg.tags ?? 7, got: () => Math.min(runner.tags, g.cfg.tags ?? 7),
          update: dt => {
            runner.update(dt, hero, true, () => {
              g.toast('toast.tag');
              const a = area();
              dash = { x: hero.x < g.W / 2 ? rand(g.W * 0.7, a.x1) : rand(a.x0, g.W * 0.3), y: rand(a.y0, a.y1) };
              runner.cooldown = 3;
            });
            if (dash) {
              const d = dist(runner, dash);
              if (d < 12) dash = null;
              else {
                const k = Math.min(1, (260 * dt) / d);
                runner.face = Math.sign(dash.x - runner.x) || runner.face;
                runner.x += (dash.x - runner.x) * k; runner.y += (dash.y - runner.y) * k;
              }
            }
          },
          done: () => runner.tags >= (g.cfg.tags ?? 7),
          targets: () => (runner.cooldown > 0 || dash ? [] : [runner]),
        },
      ],
      update: (dt, live) => {
        g.steer(hero, dt);
        const a = area();
        // greeted fish wander around happily; new ones swim in first
        for (const f of fishes) {
          if (f.enter < 1) {
            f.enter = Math.min(1, f.enter + dt * 0.36);
            const tx = f.face > 0 ? g.W * 0.25 : g.W * 0.75;
            f.x += (tx - f.x) * Math.min(1, dt * 1.2);
          } else {
            const speed = f.kind === 'small' ? 50 : 30;
            f.vx += (Math.sin(g.t * 0.4 + f.ph) * speed - f.vx) * dt;
            f.vy += (Math.cos(g.t * 0.5 + f.ph) * speed * 0.6 - f.vy) * dt;
            f.x = clamp(f.x + f.vx * dt, a.x0, a.x1);
            f.y = clamp(f.y + f.vy * dt, a.y0, a.y1);
            if (Math.abs(f.vx) > 5) f.face = Math.sign(f.vx);
          }
          if (f.greeted && f.spin < 1) f.spin = Math.min(1, f.spin + dt * 1.2);
        }
        for (const h of hideouts) {
          const d = dist(hero, h);
          const want = h.found ? 1 : d < 180 ? 1 - d / 180 : 0.15 + 0.1 * Math.sin(g.t * 2 + h.x);
          h.peek += (want - h.peek) * Math.min(1, dt * 5);
        }
        if (runnerOn && !live) runner.update(dt, hero, false);
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.1),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco.filter(d => d.x < g.W + 100), g.floor, t);
        art.sand(c, -20, g.W + 20, g.floor);
        // seahorses behind the seaweed, peeking out as Kaspion comes near
        for (const h of hideouts) {
          const dx = h.found ? 0 : (1 - h.peek) * 18;
          c.save();
          c.globalAlpha = h.found ? 1 : 0.35 + h.peek * 0.65;
          art.seahorse(c, h.x + dx, h.y + (h.found ? Math.sin(t * 2 + h.x) * 6 - 10 : 0), h.found ? 64 : 54, t, h.found ? '#ffb13b' : '#f2a93b');
          c.restore();
          if (!h.found) art.sparkle(c, h.x + 16, h.y - 40, t + h.x, 0.35 + h.peek * 0.3);
        }
        for (const w of forest) art.weed(c, w.x, g.floor + 6, w.h, w.x % 2 ? art.PAL.green : art.PAL.greenDark, w.ph, t);
        for (const f of fishes) {
          friendFish(c, f.x, f.y, f.kind, f.face, t + f.ph, f.greeted && f.spin < 1 ? easeOutBack(f.spin) : 0);
          if (!f.greeted && f.enter >= 1) art.sparkle(c, f.x, f.y - LOOK[f.kind].ry - 26, t + f.ph, 0.5);
        }
        if (runnerOn) {
          friendFish(c, runner.x, runner.y, 'small', runner.face, t * 1.5);
          if (runner.cooldown <= 0) art.sparkle(c, runner.x, runner.y - 30, t, 0.4);
        }
        g.drawHero(hero);
      },
    };
  },
};
