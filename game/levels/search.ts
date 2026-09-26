// Level 9 — "לכל עבר" (page p09): all the silver fish come at once, listen to Kaspion,
// then scatter in every direction like little sparks of light to look for the whale's
// father and mother. In missions 2–3 the child plays one of the look-alike cousins.
// Mission 1: send groups of fish off in every direction (swim to each flag).
// Mission 2: search the dark water for whale clues.
// Mission 3: follow the whale song, note by note, to the parents.

import * as art from '../engine/art';
import { School, drawDeco, makeDeco, type Buddy } from '../engine/kit';
import { TAU, dist, easeOut, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type C = CanvasRenderingContext2D;
type ClueKind = 'bubbles' | 'mist' | 'print' | 'note' | 'flipper' | 'ring';
interface Flag extends Point { sent: boolean }
interface Runner { b: Buddy; vx: number; vy: number }
interface Clue extends Point { kind: ClueKind; found: boolean }
interface Note extends Point { got: boolean; ph: number }

function flag(c: C, x: number, y: number, t: number, lit: boolean) {
  c.save(); c.translate(x, y);
  if (lit) art.glow(c, 0, -20, 60, 'rgba(255,240,150,0.5)');
  c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -40); c.lineWidth = 6; c.strokeStyle = art.INK; c.lineCap = 'round'; c.stroke();
  const wave = Math.sin(t * 4) * 5;
  c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(22, -46 + wave, 40, -34); c.lineTo(40, -14); c.quadraticCurveTo(22, -24 + wave, 0, -18); c.closePath();
  c.fillStyle = lit ? art.PAL.sun : '#dde6ee'; c.fill(); c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke();
  c.restore();
}

function clue(c: C, k: Clue, t: number) {
  const { x, y } = k;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = art.INK;
  switch (k.kind) {
    case 'bubbles': for (let i = 0; i < 5; i++) art.bubble(c, x + i * 16 - 32, y - i * 14 + Math.sin(t * 2 + i) * 3, 8 + i * 2); break;
    case 'mist':
      c.fillStyle = 'rgba(220,245,255,0.85)';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + Math.cos(i * 1.3) * 20, y + Math.sin(i * 1.3) * 12, 16, 0, TAU); c.fill(); }
      c.lineWidth = 3; c.beginPath(); c.arc(x, y, 30, 0.2, 2.8); c.stroke(); break;
    case 'print':
      c.fillStyle = 'rgba(40,50,90,0.55)';
      c.beginPath(); c.ellipse(x - 22, y, 26, 10, -0.35, 0, TAU); c.ellipse(x + 22, y, 26, 10, 0.35, 0, TAU); c.fill(); break;
    case 'note':
      c.fillStyle = art.INK; c.lineWidth = 4;
      c.beginPath(); c.ellipse(x - 6, y + 10, 10, 7.5, -0.4, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(x + 3, y + 9); c.lineTo(x + 3, y - 22); c.lineTo(x + 18, y - 14); c.stroke(); break;
    case 'flipper':
      c.beginPath(); c.ellipse(x, y, 34, 13, 0.4, 0, TAU); c.fillStyle = art.PAL.whaleDark; c.fill(); c.lineWidth = 4; c.stroke(); break;
    case 'ring':
      c.lineWidth = 6; c.strokeStyle = 'rgba(220,245,255,0.9)';
      c.beginPath(); c.ellipse(x, y, 34 + Math.sin(t * 3) * 4, 20, 0, 0, TAU); c.stroke(); break;
  }
  c.restore();
}

export const search: LevelDef = {
  id: 'search',
  create(g) {
    const hero = g.makeHero(g.W * 0.5, g.H * 0.52);
    const deco = makeDeco(20, 3000, 31, 0.7);
    const school = new School(g);
    const area = () => ({ x0: 90, x1: g.W - 90, y0: g.top + 50, y1: g.floor - 80 });
    for (let i = 0; i < 18; i++) {
      const b = school.add(g.W * 0.5 + rand(-120, 120), g.H * 0.5 + rand(-80, 80), { size: rand(40, 50) });
      b.joined = true;
    }

    // ---- mission 1: flags around the edges
    const flags: Flag[] = [];
    let flagIdx = 0, flagWait = 0;
    const runners: Runner[] = [];

    // ---- mission 2: clues in the dark
    const clues: Clue[] = [];
    let clueIdx = 0, clueWait = 0;
    let dark = 0; // 0..1 how dark the water is

    // ---- mission 3: the song
    const notes: Note[] = [];
    let noteIdx = 0, noteWait = 0;
    let parents = 0; // 0..1 the parents appearing (finale)
    let parentsT = 0;

    const sendGroup = (to: Point) => {
      const joined = school.fish.filter(f => f.joined);
      const n = Math.min(3, joined.length);
      for (let i = 0; i < n; i++) {
        const b = joined[i];
        b.joined = false;
        const d = Math.hypot(to.x - b.x, to.y - b.y) || 1;
        runners.push({ b, vx: ((to.x - b.x) / d) * 420, vy: ((to.y - b.y) / d) * 420 });
      }
    };

    return {
      hero,
      stages: [
        {
          intro: 'stage1', icon: 'fish',
          enter: () => {
            const n = g.cfg.dirs ?? 8, a = area();
            // around the edges, jumping from side to side
            const spots: Point[] = [
              { x: a.x0, y: a.y0 }, { x: a.x1, y: a.y1 }, { x: g.W * 0.5, y: a.y0 }, { x: a.x0, y: a.y1 },
              { x: a.x1, y: a.y0 }, { x: g.W * 0.5, y: a.y1 }, { x: a.x0, y: (a.y0 + a.y1) / 2 }, { x: a.x1, y: (a.y0 + a.y1) / 2 },
            ];
            for (let i = 0; i < n; i++) flags.push({ ...spots[i % spots.length], sent: false });
          },
          goal: () => flags.length, got: () => flagIdx,
          update: dt => {
            if (flagWait > 0) { flagWait -= dt; return; }
            const f = flags[flagIdx];
            if (f && dist(hero, f) < 56) {
              f.sent = true; flagIdx++; flagWait = 2;
              // away they go, past the flag and off the screen
              const d = Math.hypot(f.x - g.W / 2, f.y - g.H / 2) || 1;
              sendGroup({ x: f.x + ((f.x - g.W / 2) / d) * 900, y: f.y + ((f.y - g.H / 2) / d) * 900 });
              g.sfx.whoosh();
              if (flagIdx === 1 || flagIdx % 2 === 0) g.toast('toast.go');
            }
          },
          done: () => flags.length > 0 && flagIdx >= flags.length && flagWait <= 0,
          targets: () => (flagWait <= 0 && flags[flagIdx] ? [flags[flagIdx]] : []),
        },
        {
          intro: 'stage2', icon: 'spark',
          enter: () => {
            // the rest of the school scatters too; now we are one cousin, searching alone
            for (const f of school.fish.filter(q => q.joined)) sendGroup({ x: f.x + rand(-900, 900), y: f.y + rand(-600, 600) });
            const n = g.cfg.clues ?? 10, a = area();
            const kinds: ClueKind[] = ['bubbles', 'mist', 'print', 'note', 'flipper', 'ring'];
            for (let i = 0; i < n; i++) {
              const onFloor = kinds[i % kinds.length] === 'print';
              clues.push({
                kind: kinds[i % kinds.length],
                x: i % 2 ? rand(a.x0, g.W * 0.4) : rand(g.W * 0.6, a.x1),
                y: onFloor ? g.floor - 10 : rand(a.y0, a.y1),
                found: false,
              });
            }
          },
          goal: () => clues.length, got: () => clueIdx,
          update: dt => {
            if (clueWait > 0) { clueWait -= dt; return; }
            const k = clues[clueIdx];
            if (k && dist(hero, k) < 58) {
              k.found = true; clueIdx++; clueWait = 1.8;
              g.sfx.sparkle();
              g.fx.burst(k.x, k.y, 12, '#ffe066', 'star', 150);
              g.toast('toast.clue');
            }
          },
          done: () => clues.length > 0 && clueIdx >= clues.length && clueWait <= 0,
          targets: () => (clueWait <= 0 && clues[clueIdx] ? [clues[clueIdx]] : []),
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            const n = g.cfg.notes ?? 16, a = area();
            // a winding path of notes toward the left, where the parents are
            for (let i = 0; i < n; i++) {
              const k = i / Math.max(1, n - 1);
              notes.push({ x: a.x1 - (a.x1 - a.x0 - 120) * k, y: (a.y0 + a.y1) / 2 + Math.sin(i * 1.3) * (a.y1 - a.y0) * 0.42, got: false, ph: rand(0, TAU) });
            }
          },
          goal: () => notes.length, got: () => noteIdx,
          update: dt => {
            if (noteWait > 0) { noteWait -= dt; return; }
            const nt = notes[noteIdx];
            if (nt && dist(hero, nt) < 50) {
              nt.got = true; noteIdx++; noteWait = 1;
              g.sfx.sparkle();
              g.fx.add({ x: nt.x, y: nt.y, type: 'note', vy: -50, max: 1.4, color: art.INK, r: 8 });
            }
          },
          done: () => notes.length > 0 && noteIdx >= notes.length,
          targets: () => (noteWait <= 0 && notes[noteIdx] ? [notes[noteIdx]] : []),
        },
      ],
      finale: dt => {
        parents = Math.min(1, parents + dt * 0.45);
        hero.tx = g.W * 0.62; hero.ty = g.H * 0.6;
        if (parents > 0.3 && Math.random() < dt * 5) g.fx.add({ x: g.W * 0.2 + rand(-40, 40), y: g.H * 0.3, type: 'heart', vy: -40, max: 1.3, color: art.PAL.pink, r: 8 });
        parentsT += dt;
        return parents >= 1 && parentsT > 3;
      },
      update: dt => {
        g.steer(hero, dt);
        school.update(dt, hero);
        for (const r of runners) {
          r.b.x += r.vx * dt; r.b.y += r.vy * dt; r.b.face = Math.sign(r.vx) || 1;
          if (Math.random() < dt * 12) g.fx.add({ x: r.b.x, y: r.b.y, type: 'star', max: 0.5, color: '#fff4b8', r: 4 });
        }
        for (let i = runners.length - 1; i >= 0; i--) {
          const b = runners[i].b;
          if (b.x < -200 || b.x > g.W + 200 || b.y < -200 || b.y > g.H + 200) { b.hidden = true; runners.splice(i, 1); }
        }
        // darker while searching, lighter when the song leads home
        const want = clues.length && clueIdx < clues.length ? 1 : notes.length ? 0.35 : 0;
        dark += (want - dark) * Math.min(1, dt * 0.8);
      },
      background: c => art.sea(c, g.W, g.H, g.t, 0.25 + dark * 0.5),
      draw: c => {
        const t = g.t;
        drawDeco(c, deco.filter(d => d.x < g.W + 100), g.floor, t);
        art.sand(c, -20, g.W + 20, g.floor);
        // the parents, far away, appearing at the end of the song
        if (parents > 0) {
          const k = easeOut(parents);
          c.save(); c.globalAlpha = k;
          const R = Math.min(g.W * 0.2, g.H * 0.26);
          art.whale(c, g.W * 0.18, g.H * 0.36 - (1 - k) * 30, R * 1.1, 1, t, { body: art.PAL.papa, smile: true, mood: 'happy' });
          art.whale(c, g.W * 0.26, g.H * 0.62 - (1 - k) * 30, R, 1, t + 1, { body: art.PAL.mama, lashes: true, smile: true, mood: 'happy' });
          c.restore();
        }
        for (let i = 0; i < flags.length; i++) flag(c, flags[i].x, flags[i].y, t, i === flagIdx && flagWait <= 0);
        for (const k of clues) {
          if (k.found) { c.save(); c.globalAlpha = 0.5; clue(c, k, t); c.restore(); continue; }
          if (k !== clues[clueIdx] || clueWait > 0) continue;
          // a faint glow so it can be found even outside Kaspion's light
          art.glow(c, k.x, k.y, 70, 'rgba(255,240,170,0.35)');
          clue(c, k, t);
        }
        for (let i = noteIdx; i < Math.min(notes.length, noteIdx + (noteWait > 0 ? 0 : 2)); i++) {
          const n = notes[i];
          art.glow(c, n.x, n.y, 40, 'rgba(255,240,170,0.4)');
          c.save(); c.fillStyle = art.INK; c.strokeStyle = art.INK; c.lineWidth = 4; c.lineCap = 'round';
          const y = n.y + Math.sin(t * 3 + n.ph) * 5;
          c.beginPath(); c.ellipse(n.x - 5, y + 9, 9, 7, -0.4, 0, TAU); c.fill();
          c.beginPath(); c.moveTo(n.x + 3, y + 8); c.lineTo(n.x + 3, y - 20); c.lineTo(n.x + 16, y - 12); c.stroke();
          c.restore();
        }
        school.draw(c);
        g.drawHero(hero);
      },
      overlay: c => {
        if (dark < 0.02) return;
        // dark water with a soft circle of light around Kaspion (never pitch black)
        const hx = hero.x - g.cam.x, hy = hero.y - g.cam.y;
        const grad = c.createRadialGradient(hx, hy, 70, hx, hy, 300);
        grad.addColorStop(0, 'rgba(4,12,34,0)');
        grad.addColorStop(1, `rgba(4,12,34,${0.62 * dark})`);
        c.fillStyle = grad; c.fillRect(0, 0, g.W, g.H);
        // clues glow through the dark
        const k = clues[clueIdx];
        if (k && clueWait <= 0 && dark > 0.5) art.glow(c, k.x - g.cam.x, k.y - g.cam.y, 50, 'rgba(255,240,170,0.35)');
      },
    };
  },
};
