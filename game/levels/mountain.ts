// Level 5 — "הר באמצע הים" (page p05): "it must be a mountain," thinks Kaspion.
// He comes closer slowly and carefully, a little at a time, and swims around it.
// The "mountain" is really the black whale, still looking like rock.
// Mission 1: creep toward it from hiding place to hiding place.
// Mission 2: follow the glowing stones around the mountain, over the top and back.
// Mission 3: find the little creatures living on it — then the mountain rumbles.

import * as art from '../engine/art';
import { drawDeco, makeDeco } from '../engine/kit';
import { TAU, clamp, dist, rand, type Point } from '../engine/util';
import type { LevelDef } from '../engine/types';

type C = CanvasRenderingContext2D;

interface Hide extends Point { kind: 'rock' | 'weed'; done: boolean }
interface Stone extends Point { got: boolean }
interface Critter extends Point { kind: 'crab' | 'star' | 'snail' | 'anemone'; found: boolean; peek: number }

function snail(c: C, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s / 40, s / 40);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = art.INK;
  c.beginPath(); c.moveTo(-22, 10); c.quadraticCurveTo(0, 16, 26, 8); c.quadraticCurveTo(30, 0, 22, -2); c.lineTo(-18, 2); c.closePath();
  c.fillStyle = '#9be46b'; c.fill(); c.lineWidth = 3; c.stroke();
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(20 + d * 3, -1); c.lineTo(24 + d * 5, -14 + Math.sin(t * 3 + d) * 2); c.lineWidth = 2.5; c.stroke();
    c.beginPath(); c.arc(24 + d * 5, -15 + Math.sin(t * 3 + d) * 2, 2.6, 0, TAU); c.fillStyle = art.INK; c.fill();
  }
  c.beginPath(); c.arc(-4, -6, 15, 0, TAU); c.fillStyle = '#ffb13b'; c.fill(); c.lineWidth = 3.5; c.stroke();
  c.beginPath();
  for (let a = 0; a < TAU * 2; a += 0.3) { const r = 13 - a * 1.8; c.lineTo(-4 + Math.cos(a) * r, -6 + Math.sin(a) * r); }
  c.lineWidth = 2.5; c.stroke();
  c.restore();
}

export const mountain: LevelDef = {
  id: 'mountain',
  create(g) {
    const worldW = () => g.W * 2.6;
    const R = () => Math.min(g.W * 0.3, g.H * 0.36);
    const mx = () => g.W * 0.55;                  // the mountain's centre (world x)
    const my = () => g.floor - R() * 0.28;        // resting on the sand, partly buried
    const hero = g.makeHero(worldW() - 120, g.H * 0.5);
    hero.face = -1;
    const deco = makeDeco(40, 6000, 13, 0.7).filter(d => Math.abs(d.x - g.W * 0.55) > g.W * 0.36);

    // ---- mission 1: hiding places leading to the mountain
    const hides: Hide[] = [];
    let hideIdx = 0;
    let hiding = 0;    // seconds Kaspion stays tucked in the current spot
    let rumble = 0;    // the mountain shivers a little

    // ---- mission 2: glowing stones around the mountain
    const stones: Stone[] = [];
    let stoneIdx = 0;
    let stoneWait = 0;

    // ---- mission 3: creatures living on the mountain
    const critters: Critter[] = [];
    let critterWait = 0;
    let finaleT = 0;

    const shake = () => (rumble > 0 ? Math.sin(g.t * 50) * 4 * Math.min(1, rumble) : 0);

    return {
      hero,
      world: () => ({ w: worldW(), h: g.H }),
      bounds: () => ({ x0: 50, x1: worldW() - 50, y0: g.top, y1: g.floor - 30 }),
      stages: [
        {
          intro: 'stage1', icon: 'spark',
          enter: () => {
            const n = g.cfg.hides ?? 9;
            const x1 = worldW() - 260, x0 = mx() + R() + 90;
            for (let i = 0; i < n; i++) {
              const x = x1 - ((x1 - x0) * i) / Math.max(1, n - 1);
              const high = i % 2 === 1;
              hides.push({ x, y: high ? g.top + 90 + rand(0, 40) : g.floor - 50, kind: high ? 'weed' : 'rock', done: false });
            }
          },
          goal: () => hides.length, got: () => hideIdx,
          update: dt => {
            if (hiding > 0) {
              hiding -= dt;
              hero.tx = hides[hideIdx - 1].x; hero.ty = hides[hideIdx - 1].y;
              return;
            }
            const h = hides[hideIdx];
            if (h && dist(hero, h) < 50) {
              h.done = true; hideIdx++;
              hiding = 2.2; rumble = 0.6;
              g.sfx.sparkle();
              g.fx.burst(h.x, h.y - 20, 8, '#ffe066', 'star', 110);
            }
          },
          done: () => hides.length > 0 && hideIdx >= hides.length && hiding <= 0,
          targets: () => (hiding > 0 || !hides[hideIdx] ? [] : [hides[hideIdx]]),
        },
        {
          intro: 'stage2', icon: 'pearl',
          enter: () => {
            // laps over the mountain: over the top to the far side, back again, and over once more
            const n = g.cfg.trail ?? 24, perLap = 8;
            const cx = mx(), cy = my(), r = R();
            for (let i = 0; i < n; i++) {
              const lap = Math.floor(i / perLap), k = (i % perLap) / (perLap - 1);
              const a = lap % 2 === 0 ? Math.PI * (-0.05 + 1.1 * k) : Math.PI * (1.05 - 1.1 * k);
              const rx = r * (lap % 2 === 0 ? 1.34 : 1.12), ry = r * (lap % 2 === 0 ? 1.02 : 0.82);
              stones.push({ x: cx + Math.cos(a) * rx, y: clamp(cy - Math.sin(a) * ry, g.top + 30, g.floor - 50), got: false });
            }
          },
          goal: () => stones.length, got: () => stoneIdx,
          update: dt => {
            if (stoneWait > 0) { stoneWait -= dt; return; }
            const s = stones[stoneIdx];
            if (s && dist(hero, s) < 46) {
              s.got = true; stoneIdx++;
              stoneWait = 0.8; // the next stone lights up a moment later
              g.sfx.pop();
              g.fx.burst(s.x, s.y, 8, '#bfefff', 'star', 110);
            }
          },
          done: () => stones.length > 0 && stoneIdx >= stones.length,
          targets: () => (stoneWait <= 0 && stones[stoneIdx] ? [stones[stoneIdx]] : []),
        },
        {
          intro: 'stage3', icon: 'star',
          enter: () => {
            const kinds: Critter['kind'][] = ['crab', 'star', 'snail', 'anemone'];
            const n = g.cfg.finds ?? 8;
            const cx = mx(), cy = my(), r = R();
            // spots on the mountain's surface, alternating sides so each find is a swim away
            const angles = [0.18, 0.82, 0.45, 0.1, 0.9, 0.3, 0.7, 0.55];
            for (let i = 0; i < n; i++) {
              const a = Math.PI * angles[i % angles.length];
              critters.push({ kind: kinds[i % 4], x: cx + Math.cos(a) * r * 0.9, y: cy - Math.sin(a) * r * 0.55 - 8, found: false, peek: 0 });
            }
          },
          goal: () => critters.length, got: () => critters.filter(c => c.found).length,
          update: dt => {
            if (critterWait > 0) { critterWait -= dt; return; }
            const k = critters.find(c => !c.found);
            if (!k || dist(hero, k) > 52) return;
            k.found = true;
            critterWait = 2.2; // it waves hello before the next one hides
            g.sfx.sparkle();
            g.fx.burst(k.x, k.y, 12, '#ffe066', 'star', 140);
            g.toast(`toast.${k.kind}`);
          },
          done: () => critters.length > 0 && critters.every(c => c.found) && critterWait <= 0,
          targets: () => { const k = critters.find(c => !c.found); return critterWait <= 0 && k ? [k] : []; },
        },
      ],
      finale: dt => {
        finaleT += dt;
        if (finaleT - dt <= 0.3 && finaleT > 0.3) { g.toast('toast.rumble'); g.sfx.whale(); }
        rumble = 1;
        hero.mood = 'surprised';
        return finaleT > 3.4;
      },
      update: dt => {
        g.steer(hero, dt);
        rumble = Math.max(0, rumble - dt);
        for (const k of critters) {
          const d = dist(hero, k);
          const want = k.found ? 1 : d < 200 ? 1 - d / 200 : 0.2 + 0.1 * Math.sin(g.t * 2 + k.x);
          k.peek += (want - k.peek) * Math.min(1, dt * 5);
        }
      },
      background: c => {
        art.sea(c, g.W, g.H, g.t, 0.3, g.cam.x);
        art.farHills(c, g.W, g.H, g.cam.x * 0.4, 'rgba(20,60,120,0.4)', 5);
      },
      draw: c => {
        const t = g.t, x0 = g.cam.x - 80, x1 = g.cam.x + g.W + 80;
        drawDeco(c, deco, g.floor, t, x0, x1);
        // the "mountain"
        art.whale(c, mx() + shake(), my(), R(), -1, t, { rock: 1, tail: 0, fin: 0, eye: 0 });
        // creatures on it peek out as Kaspion comes close
        const hiddenNow = critterWait <= 0 ? critters.find(q => !q.found) : undefined;
        for (const k of critters) {
          if (!k.found && k !== hiddenNow) continue;
          c.save(); c.globalAlpha = 0.3 + k.peek * 0.7;
          const s = 0.6 + k.peek * 0.4;
          if (k.kind === 'crab') art.crab(c, k.x, k.y, 40 * s, t);
          else if (k.kind === 'star') art.starfish(c, k.x, k.y, 18 * s, t);
          else if (k.kind === 'snail') snail(c, k.x, k.y, 40 * s, t);
          else art.anemone(c, k.x, k.y + 12, 46 * s, art.PAL.pink, t);
          c.restore();
          if (!k.found) art.sparkle(c, k.x + 18, k.y - 26, t + k.x, 0.4);
        }
        art.sand(c, Math.max(-20, x0), x1, g.floor);
        // hiding places: the next one glows
        for (let i = 0; i < hides.length; i++) {
          const h = hides[i];
          if (h.x < x0 || h.x > x1) continue;
          if (i === hideIdx) art.glow(c, h.x, h.y - 10, 90, 'rgba(255,240,150,0.45)');
          if (h.kind === 'rock') art.rock(c, h.x, art.sandY(h.x, g.floor) + 4, 56);
          else {
            for (let k = -2; k <= 2; k++) {
              art.inkStroke(c, () => {
                c.beginPath(); c.moveTo(h.x + k * 11, h.y + 40);
                for (let j = 1; j <= 5; j++) c.lineTo(h.x + k * 11 + Math.sin(t * 1.6 + k + j * 0.7) * j * 2.2, h.y + 40 - j * 18);
              }, 8, k % 2 ? art.PAL.green : art.PAL.greenDark);
            }
          }
          if (i === hideIdx) art.sparkle(c, h.x + 30, h.y - 50, t, 0.55);
        }
        // the stone trail: only the next three glow
        for (let i = stoneIdx; i < Math.min(stones.length, stoneIdx + (stoneWait > 0 ? 0 : 3)); i++) {
          const s = stones[i];
          art.glow(c, s.x, s.y, i === stoneIdx ? 44 : 30, 'rgba(190,240,255,0.5)');
          c.beginPath(); c.ellipse(s.x, s.y, i === stoneIdx ? 13 : 10, i === stoneIdx ? 10 : 8, 0, 0, TAU);
          c.fillStyle = '#bfefff'; c.fill(); c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
        }
        g.drawHero(hero);
        // tucked into a weed clump, the seaweed sways in front of him
        const h = hides[hideIdx - 1];
        if (hiding > 0 && h && h.kind === 'weed') {
          for (let k = -1; k <= 1; k++) {
            art.inkStroke(c, () => {
              c.beginPath(); c.moveTo(h.x + k * 14, h.y + 40);
              for (let j = 1; j <= 4; j++) c.lineTo(h.x + k * 14 + Math.sin(t * 1.6 + k + j) * j * 2, h.y + 40 - j * 20);
            }, 8, art.PAL.green);
          }
        }
      },
    };
  },
};
