// Level 7 — "לוויתן קטן" (page p07): "You're so big — why are you crying?"
// "I may be big, but I'm still a little whale. I swam far and lost my father and mother."
// "Don't cry, I'll help you find them."
// Mission 1: wipe the tears rolling down his cheek, one by one.
// Mission 2: memory bubbles float up from his blowhole — pop them to see what he remembers.
// Mission 3: swim a promise circle around him; he smiles.

import * as art from '../engine/art';
import { drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type C = CanvasRenderingContext2D;
type Memory = 'mom' | 'dad' | 'home' | 'current' | 'song';

interface Tear extends Point { alive: boolean; ph: number; age: number; drift: Point }
interface Mem extends Point { kind: Memory; popped: number; alive: boolean; ph: number; goal: Point }
interface Mark extends Point { done: boolean }

/** The little picture shown inside a memory bubble. */
function memoryIcon(c: C, kind: Memory, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y);
  switch (kind) {
    case 'mom': art.whale(c, 0, 0, 22 * s, -1, t, { body: art.PAL.mama, lashes: true, smile: true }); break;
    case 'dad': art.whale(c, 0, 0, 26 * s, -1, t, { body: art.PAL.papa, smile: true }); break;
    case 'home':
      art.rock(c, -8 * s, 14 * s, 18 * s);
      art.weed(c, 12 * s, 16 * s, 26 * s, art.PAL.green, 0, t);
      break;
    case 'current':
      c.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 3 + a * 2.6 * s; c.lineTo(Math.cos(a + t) * r, Math.sin(a + t) * r); }
      c.lineWidth = 4; c.strokeStyle = art.INK; c.stroke();
      break;
    case 'song':
      c.fillStyle = art.INK; c.strokeStyle = art.INK; c.lineWidth = 3.5;
      c.beginPath(); c.ellipse(-4 * s, 8 * s, 7 * s, 5.5 * s, -0.4, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(2.5 * s, 7 * s); c.lineTo(2.5 * s, -16 * s); c.lineTo(12 * s, -10 * s); c.stroke();
      break;
  }
  c.restore();
}

export const promise: LevelDef = {
  id: 'promise',
  create(g) {
    const hero = g.makeHero(g.W * 0.2, g.H * 0.5);
    const deco = makeDeco(20, 3000, 23, 0.5).filter(d => d.x < g.W * 0.25 || d.x > g.W * 0.95);

    const R = () => Math.min(g.W * 0.3, g.H * 0.36);
    const cx = () => g.W * 0.6;
    const cy = () => g.H * 0.52 + Math.sin(g.t * 0.8) * 6;
    const at = (lx: number, ly: number): Point => ({ x: cx() + lx * R(), y: cy() + ly * R() });
    let smile = 0;

    // ---- mission 1: tears on his cheek
    const tears: Tear[] = [];
    let tearsMade = 0, wiped = 0, tearTimer = 0;
    const tearTotal = () => g.cfg.tears ?? 12;

    // ---- mission 2: memory bubbles
    const ORDER: Memory[] = ['mom', 'dad', 'home', 'current', 'song'];
    const mems: Mem[] = [];
    let memTimer = 0, popped = 0;
    const memTotal = () => clamp(g.cfg.memories ?? 9, 1, 12);

    // ---- mission 3: the promise circle
    const marks: Mark[] = [];
    let markIdx = 0, markWait = 0;
    let finaleT = 0;

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'tear',
          goal: tearTotal, got: () => wiped,
          update: dt => {
            tearTimer -= dt;
            const alive = tears.filter(t => t.alive).length;
            if (tearsMade < tearTotal() && alive === 0 && tearTimer <= 0) {
              const e = at(-0.6, 0.02);
              tears.push({ x: e.x, y: e.y, alive: true, ph: rand(0, TAU), age: 0, drift: { x: rand(80, g.W * 0.4), y: rand(g.top + 70, g.floor - 90) } });
              tearsMade++;
            }
            for (const t of tears) {
              if (!t.alive) continue;
              // rolls down his cheek, then floats off into the water
              t.age += dt;
              if (t.age < 1.4) { t.y += 22 * dt; t.x = at(-0.6, 0).x + Math.sin(g.t + t.ph) * 3; }
              else {
                const d = dist(t, t.drift);
                if (d > 3) { t.x += ((t.drift.x - t.x) / d) * 55 * dt; t.y += ((t.drift.y - t.y) / d) * 55 * dt; }
                t.x += Math.sin(g.t * 1.3 + t.ph) * 8 * dt;
              }
              if (t.age >= 1.4 && dist(hero, t) < 46) {
                t.alive = false; wiped++;
                tearTimer = 1.2;
                g.sfx.sparkle();
                g.fx.burst(t.x, t.y, 10, '#bfefff', 'star', 120);
              }
            }
          },
          done: () => wiped >= tearTotal(),
          targets: () => tears.filter(t => t.alive && t.age >= 1.4),
        },
        {
          intro: 'stage2', icon: 'bubble',
          update: dt => {
            memTimer -= dt;
            const aliveNow = mems.filter(m => m.alive).length;
            if (mems.length < memTotal() && aliveNow === 0 && memTimer <= 0) {
              const b = at(-0.35, -0.6);
              mems.push({ x: b.x, y: b.y, kind: ORDER[mems.length % ORDER.length], popped: 0, alive: true, ph: rand(0, TAU), goal: { x: mems.length % 2 ? rand(90, g.W * 0.3) : rand(g.W * 0.45, g.W - 90), y: rand(g.top + 60, g.H * 0.45) } });
            }
            for (const m of mems) {
              if (m.popped > 0) { m.popped += dt; continue; }
              // drift slowly away from the whale toward open water
              const d = dist(m, m.goal);
              if (d > 4) { m.x += ((m.goal.x - m.x) / d) * 38 * dt; m.y += ((m.goal.y - m.y) / d) * 38 * dt; }
              m.x = clamp(m.x + Math.sin(g.t * 0.9 + m.ph) * 10 * dt, 90, g.W - 90);
              if (m.alive && dist(hero, m) < 60) {
                m.alive = false; m.popped = 0.01; popped++;
                memTimer = 2.8;
                g.sfx.pop();
                g.toast(`toast.${m.kind}`);
              }
            }
          },
          goal: memTotal, got: () => popped,
          done: () => popped >= memTotal() && memTimer <= 0,
          targets: () => mems.filter(m => m.alive),
        },
        {
          intro: 'stage3', icon: 'heart',
          enter: () => {
            const n = g.cfg.ring ?? 20;
            // one and a half laps around him, a little closer on the second lap
            for (let i = 0; i < n; i++) {
              const a = Math.PI * 0.95 + (i / 10) * TAU;
              const lap2 = Math.floor(i / 10) % 2 === 1;
              const rx = R() * (lap2 ? 1.25 : 1.45), ry = R() * (lap2 ? 0.85 : 1.0);
              marks.push({ x: clamp(cx() + Math.cos(a) * rx, 60, g.W - 60), y: clamp(g.H * 0.52 + Math.sin(a) * ry, g.top + 30, g.floor - 50), done: false });
            }
          },
          goal: () => marks.length, got: () => markIdx,
          update: dt => {
            if (markWait > 0) { markWait -= dt; return; }
            const m = marks[markIdx];
            if (m && dist(hero, m) < 46) {
              m.done = true; markIdx++; markWait = 0.6;
              smile = Math.min(1, markIdx / marks.length);
              g.sfx.pop();
              g.fx.burst(m.x, m.y, 6, art.PAL.pink, 'heart', 90);
            }
          },
          done: () => marks.length > 0 && markIdx >= marks.length,
          targets: () => (markWait <= 0 && marks[markIdx] ? [marks[markIdx]] : []),
        },
      ],
      finale: dt => {
        finaleT += dt;
        if (finaleT - dt <= 0.2 && finaleT > 0.2) { g.toast('toast.smile'); g.sfx.whaleHappy(); }
        smile = 1;
        if (Math.random() < dt * 6) { const p = at(rand(-0.8, 0.6), -0.7); g.fx.add({ x: p.x, y: p.y, type: 'heart', vy: -40, max: 1.4, color: art.PAL.pink, r: 8 }); }
        return finaleT > 3;
      },
      update: dt => {
        g.steer(hero, dt);
        for (const m of mems) if (m.popped > 2.2) m.popped = 0;
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.3),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco, g.floor, t);
        art.sand(c, -20, g.W + 20, g.floor);
        art.whale(c, cx(), cy(), R(), -1, t, { mood: smile >= 1 ? 'happy' : 'sad', smile: smile >= 1 });
        for (const tr of tears) if (tr.alive) {
          c.save(); c.translate(tr.x, tr.y); c.scale(1.5, 1.5);
          c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(9, 2, 0, 7); c.quadraticCurveTo(-9, 2, 0, -12);
          c.fillStyle = '#8fdcff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = art.INK; c.stroke();
          c.restore();
        }
        for (const m of mems) {
          if (m.alive) {
            art.bubble(c, m.x, m.y, 36);
            c.save(); c.globalAlpha = 0.35; memoryIcon(c, m.kind, m.x, m.y, 0.8, t); c.restore();
          } else if (m.popped > 0) {
            // the memory shows big for a moment, then fades
            const k = m.popped;
            c.save(); c.globalAlpha = Math.max(0, Math.min(1, 2.2 - k));
            c.beginPath(); c.arc(m.x, m.y, 48, 0, TAU); c.fillStyle = 'rgba(255,250,240,0.85)'; c.fill();
            c.lineWidth = 4; c.strokeStyle = art.INK; c.stroke();
            memoryIcon(c, m.kind, m.x, m.y, 1.3, t);
            c.restore();
          }
        }
        for (let i = markIdx; i < Math.min(marks.length, markIdx + (markWait > 0 ? 0 : 2)); i++) {
          const m = marks[i];
          art.glow(c, m.x, m.y, 40, 'rgba(255,180,220,0.45)');
          art.heart(c, m.x, m.y + Math.sin(t * 3 + i) * 3, i === markIdx ? 22 : 15);
        }
        g.drawHero(hero);
      },
    };
  },
};
