// p03 "חברים בים": on his way Kaspion meets all kinds of fish — big and small, thin and fat —
// and even seahorses; he says hello to each. They swim in one after another, in step with the words.

import * as art from '../engine/art';
import { TAU } from '../engine/util';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

type C = CanvasRenderingContext2D;

function body(c: C, x: number, y: number, rx: number, ry: number, color: string, fin: string, face: number, t: number, stripes = false) {
  c.save(); c.translate(x, y); c.scale(face, 1);
  c.lineJoin = 'round'; c.strokeStyle = art.INK;
  c.save(); c.translate(-rx * 0.9, 0); c.rotate(Math.sin(t * 6) * 0.25);
  c.beginPath(); c.moveTo(4, 0); c.lineTo(-ry - 8, -ry * 0.8 - 4); c.lineTo(-ry - 8, ry * 0.8 + 4); c.closePath();
  c.fillStyle = fin; c.fill(); c.lineWidth = 4; c.stroke(); c.restore();
  const shape = () => { c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); };
  shape(); c.fillStyle = color; c.fill();
  if (stripes) { c.save(); shape(); c.clip(); c.fillStyle = art.INK; for (let i = -2; i <= 2; i++) c.fillRect(i * 16 - 5, -ry, 9, ry * 2); c.restore(); }
  shape(); c.lineWidth = 4.5; c.stroke();
  const er = Math.max(4.5, Math.min(11, ry * 0.32));
  c.beginPath(); c.arc(rx * 0.55, -ry * 0.2, er, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(rx * 0.55 + er * 0.25, -ry * 0.2, er * 0.5, 0, TAU); c.fillStyle = art.INK; c.fill();
  c.beginPath(); c.moveTo(rx * 0.72, ry * 0.25); c.quadraticCurveTo(rx * 0.82, ry * 0.42, rx * 0.93, ry * 0.18); c.lineWidth = 3; c.stroke();
  c.restore();
}

export const friendsScene: SceneDef = {
  id: 'friends',
  create({ fx }) {
    const greeted = new Set<number>();
    // [appears at p, final x, final y]
    const cast: [number, number, number][] = [[0.22, 140, 150], [0.32, 640, 130], [0.42, 150, 330], [0.52, 650, 320], [0.66, 560, 250]];
    return {
      draw(c, t, p) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        art.weed(c, 60, FLOOR + 16, 120, art.PAL.green, 0, t);
        art.weed(c, 740, FLOOR + 16, 140, art.PAL.greenDark, 2, t);
        cast.forEach(([at, fxp, fyp], i) => {
          const k = phase(p, at, at + 0.08);
          if (k <= 0) return;
          const fromLeft = fxp < STAGE_W / 2;
          const x = fromLeft ? -120 + (fxp + 120) * k : STAGE_W + 120 - (STAGE_W + 120 - fxp) * k;
          const y = fyp + bob(t, 1, 8, i);
          const face = fromLeft ? 1 : -1;
          if (i === 0) body(c, x, y, 78, 44, '#4aa8ff', '#2f7fd1', face, t);
          if (i === 1) body(c, x, y, 20, 13, '#ffd23f', '#f2a93b', face, t);
          if (i === 2) body(c, x, y, 62, 12, '#ff86c1', '#e25d9f', face, t);
          if (i === 3) body(c, x, y, 42, 38, '#ff9a4a', '#e0742a', face, t);
          if (i === 4) { art.seahorse(c, x, y - 30, 70, t); art.seahorse(c, x + 60, y + 10, 56, t + 1); }
          if (k >= 1 && !greeted.has(i)) {
            greeted.add(i);
            fx.add({ x: x, y: y - 50, type: 'heart', vy: -30, max: 1.3, color: art.PAL.pink, r: 9 });
          }
        });
        // Kaspion in the middle, turning to greet each newcomer
        const lastIdx = cast.filter(([at]) => p >= at).length - 1;
        const face = lastIdx >= 0 ? (cast[lastIdx][1] < STAGE_W / 2 ? -1 : 1) : 1;
        art.fish(c, 400, 250 + bob(t, 1.2, 10), 88, face, t, { mood: 'happy' });
      },
    };
  },
};
