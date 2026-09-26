// Level 6 — "להר יש עין" (page p06): in the middle of the mountain an eye opens and a big
// tear rolls out. Mountains have no eyes and don't cry — it's a whale!
// Mission 1: sparkling spots wake up the "mountain" one part at a time (tail, flipper, spout),
//            each part lets out a few bubbles to catch.
// Mission 2: the eye opens and cries; catch the falling tears.
// Mission 3: clean the seaweed off his back — the rock look fades and a young whale appears.

import * as art from '../engine/art';
import { Fallers, Pickups, drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, easeInOut, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type Part = 'tail' | 'fin' | 'spout';
interface Weed extends Point { gone: boolean; lift: number; ph: number }

export const eye: LevelDef = {
  id: 'eye',
  create(g) {
    const hero = g.makeHero(g.W * 0.15, g.H * 0.4);
    const deco = makeDeco(20, 3000, 17, 0.6).filter(d => d.x < g.W * 0.18 || d.x > g.W * 0.92);

    // whale geometry (drawn facing left, so the head is on the left)
    const R = () => Math.min(g.W * 0.32, g.H * 0.4);
    const cx = () => g.W * 0.56;
    let lift = 0; // 0 = resting in the sand like a mountain, 1 = floating free
    const cy = () => g.floor - R() * 0.3 - lift * R() * 0.25;
    const at = (lx: number, ly: number): Point => ({ x: cx() + lx * R(), y: cy() + ly * R() });
    const PART_AT: Record<Part, [number, number]> = { tail: [0.95, -0.28], fin: [-0.02, 0.24], spout: [-0.35, -0.62] };
    const ORDER: Part[] = ['tail', 'fin', 'spout'];

    const rev = { tail: 0, fin: 0, eye: 0, spout: 0 };
    let rock = 1;
    let partIdx = 0;       // which part's sparkle is showing
    let partAnim = 0;      // seconds left of the current part's little show
    let spoutT = 0;

    // bubbles each woken part lets out
    const bubbles = new Pickups(g, {
      radius: 24,
      draw: (c, p) => art.bubble(c, p.x + Math.sin(g.t * 1.6 + p.ph) * 10, p.y, p.r),
      drift: (p, dt) => { p.y = Math.max(g.top + 30, p.y - 22 * dt); },
    });
    let bubblesOwed = 0;
    let bubbleTimer = 0;

    // tears from the eye
    const tears = new Fallers(g, {
      every: 2.8, max: 2, speed: 32, radius: 26,
      spawn: () => { const e = at(-0.6, -0.02); return { x: e.x + rand(-6, 6), y: e.y }; },
      draw: (c, f) => {
        c.save(); c.translate(f.x, f.y); c.scale(1.6, 1.6);
        c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(9, 2, 0, 7); c.quadraticCurveTo(-9, 2, 0, -12);
        c.fillStyle = '#8fdcff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = art.INK; c.stroke();
        c.restore();
      },
    });

    // seaweed growing on his back
    const weeds: Weed[] = [];
    let weedIdx = 0;
    let weedWait = 0;
    let morph = 0; // 0..1 rock fading away (finale)

    const sparklePos = () => { const [lx, ly] = PART_AT[ORDER[partIdx]]; return at(lx, ly); };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'spark',
          goal: () => ORDER.length, got: () => Math.min(partIdx, ORDER.length),
          update: dt => {
            if (partAnim > 0) {
              partAnim -= dt;
              const part = ORDER[partIdx - 1];
              if (part === 'tail') rev.tail = Math.min(1, rev.tail + dt * 1.2);
              if (part === 'fin') rev.fin = Math.min(1, rev.fin + dt * 1.2);
              if (part === 'spout') spoutT = 2.2;
              if (partAnim <= 0) bubblesOwed = g.cfg.bubbles ?? 6;
              return;
            }
            if (bubblesOwed > 0) {
              // the woken part breathes out bubbles one at a time
              bubbleTimer -= dt;
              if (bubbleTimer <= 0) {
                const part = ORDER[partIdx - 1];
                const [lx, ly] = PART_AT[part];
                const p = at(lx, ly);
                const left = bubblesOwed % 2 === 1;
                bubbles.add(left ? rand(90, g.W * 0.4) : rand(g.W * 0.6, g.W - 90), clamp(p.y - rand(30, 120), g.top + 50, g.floor - 90), { r: rand(22, 27) });
                bubblesOwed--;
                bubbleTimer = 1.5;
              }
            }
            bubbles.update(dt, hero, true);
            if (bubblesOwed > 0 || bubbles.items.some(b => b.alive)) return;
            if (partIdx < ORDER.length && dist(hero, sparklePos()) < 54) {
              const part = ORDER[partIdx];
              partIdx++;
              partAnim = 2.2;
              g.sfx.sparkle();
              g.fx.burst(hero.x, hero.y, 12, '#ffe066', 'star', 150);
              g.toast(`toast.${part}`);
              if (part === 'spout') g.sfx.splash();
            }
          },
          done: () => partIdx >= ORDER.length && partAnim <= 0 && bubblesOwed === 0 && !bubbles.items.some(b => b.alive),
          targets: () => {
            if (partAnim > 0) return [];
            const alive = bubbles.targets();
            if (alive.length || bubblesOwed > 0) return alive;
            return partIdx < ORDER.length ? [sparklePos()] : [];
          },
        },
        {
          intro: 'stage2', icon: 'tear',
          enter: () => { g.toast('toast.eye'); },
          goal: () => g.cfg.tears ?? 11, got: () => Math.min(tears.caught, g.cfg.tears ?? 11),
          update: dt => tears.update(dt, hero, true, rev.eye > 0.9 && tears.caught < (g.cfg.tears ?? 11)),
          done: () => tears.caught >= (g.cfg.tears ?? 11),
          targets: () => tears.targets(),
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            tears.list.length = 0;
            const n = g.cfg.weeds ?? 16;
            for (let i = 0; i < n; i++) {
              // spread along his back, alternating ends so each clump is a swim away
              const k = i % 2 === 0 ? 0.1 + (i / n) * 0.35 : 0.9 - (i / n) * 0.35;
              const lx = -0.85 + k * 1.6;
              const ly = -0.58 * Math.sqrt(Math.max(0, 1 - lx * lx)) - 0.05;
              weeds.push({ ...at(lx, ly), gone: false, lift: 0, ph: rand(0, TAU) });
            }
          },
          goal: () => weeds.length, got: () => weedIdx,
          update: dt => {
            if (weedWait > 0) { weedWait -= dt; return; }
            const w = weeds[weedIdx];
            if (w && dist(hero, w) < 52) {
              w.gone = true; weedIdx++;
              weedWait = 1.1;
              g.sfx.pop();
              g.fx.burst(w.x, w.y, 8, art.PAL.green, 'dot', 110);
            }
          },
          done: () => weeds.length > 0 && weedIdx >= weeds.length,
          targets: () => (weedWait <= 0 && weeds[weedIdx] ? [weeds[weedIdx]] : []),
        },
      ],
      finale: dt => {
        // the rock look fades and he lifts off the sand: a young whale
        morph = Math.min(1, morph + dt * 0.5);
        rock = 1 - easeInOut(morph);
        lift = easeInOut(morph);
        if (Math.random() < dt * 10 && morph < 1) {
          const p = at(rand(-0.8, 0.8), -0.4);
          g.fx.add({ x: p.x, y: p.y, type: 'rock', vx: rand(-60, 60), vy: rand(-160, -60), max: 1.2, color: art.PAL.mountain, r: rand(4, 8) });
        }
        return morph >= 1;
      },
      update: dt => {
        g.steer(hero, dt);
        if (spoutT > 0) spoutT -= dt;
        rev.spout = spoutT > 0 ? Math.min(1, spoutT) : 0;
        // the eye opens as soon as mission 2 starts (mission 1 done)
        if (partIdx >= ORDER.length && partAnim <= 0 && !bubbles.items.some(b => b.alive)) rev.eye = Math.min(1, rev.eye + dt * 0.8);
        for (const w of weeds) if (w.gone) { w.lift += dt; w.y -= 50 * dt; }
        if (weedIdx >= weeds.length && weeds.length) rev.tail = 1;
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.35),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco, g.floor, t);
        art.whale(c, cx(), cy(), R(), -1, t, {
          rock, tail: rev.tail, fin: rev.fin, eye: rev.eye, spout: rev.spout, mood: rev.eye > 0.5 ? 'sad' : undefined,
        });
        // seaweed on his back
        for (const w of weeds) {
          if (w.gone && w.lift > 2) continue;
          c.save(); c.globalAlpha = w.gone ? Math.max(0, 1 - w.lift / 2) : 1;
          for (let k = -1; k <= 1; k++) {
            art.inkStroke(c, () => {
              c.beginPath(); c.moveTo(w.x + k * 8, w.y + 6);
              for (let j = 1; j <= 4; j++) c.lineTo(w.x + k * 8 + Math.sin(t * 1.8 + w.ph + k + j) * j * 2, w.y + 6 - j * 11);
            }, 7, k ? art.PAL.green : art.PAL.greenDark);
          }
          c.restore();
        }
        if (weeds.length && weeds[weedIdx] && weedWait <= 0) art.sparkle(c, weeds[weedIdx].x + 14, weeds[weedIdx].y - 50, t, 0.5);
        art.sand(c, -20, g.W + 20, g.floor);
        if (partIdx < ORDER.length && partAnim <= 0 && !bubbles.items.some(b => b.alive)) {
          const p = sparklePos(); art.sparkle(c, p.x, p.y, t, 1);
        }
        bubbles.draw(c);
        tears.draw(c);
        g.drawHero(hero, { mood: rev.eye > 0.5 && rock > 0.5 ? 'surprised' : undefined });
      },
    };
  },
};
