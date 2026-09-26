// p08 "קוראים למשפחה": Kaspion swims fast and calls all his brothers and sisters, cousins:
// "Come quickly! A little whale is lost and needs our help!" Silver fish stream in from every side.

import * as art from '../engine/art';
import { TAU } from '../engine/util';
import { FLOOR, STAGE_H, STAGE_W, type SceneDef } from './types';
import { bob } from './common';

export const callScene: SceneDef = {
  id: 'call',
  create({ fx }) {
    // relatives arriving from all around the edges, each at its own moment
    const kin = Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * TAU + (i % 3) * 0.2;
      return { a, at: 0.15 + (i / 22) * 0.75, dist: 70 + (i % 4) * 26, ph: i * 0.7 };
    });
    let ringT = 0;
    return {
      draw(c, t, p) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        const cx = 400 + Math.sin(t * 0.8) * 40, cy = 240 + bob(t, 1.4, 10);
        // calling out: rings spread from Kaspion
        ringT -= 1 / 60;
        if (ringT <= 0 && p < 0.95) { ringT = 0.9; fx.ring(cx + 40, cy); }
        for (const k of kin) {
          const arrive = Math.min(1, Math.max(0, (p - k.at) / 0.12));
          if (arrive <= 0) continue;
          const far = { x: STAGE_W / 2 + Math.cos(k.a) * 560, y: STAGE_H / 2 + Math.sin(k.a) * 360 };
          const near = { x: cx + Math.cos(k.a) * k.dist * 1.4, y: cy + Math.sin(k.a) * k.dist };
          const x = far.x + (near.x - far.x) * arrive, y = far.y + (near.y - far.y) * arrive + bob(t, 2, 4, k.ph);
          art.fish(c, x, y, 42, near.x > far.x ? 1 : -1, t + k.ph, { fast: arrive < 1 });
        }
        art.fish(c, cx, cy, 76, 1, t * 1.5, { fast: true, mood: 'happy' });
        // speed lines behind him
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const yy = cy - 14 + i * 14; c.beginPath(); c.moveTo(cx - 60 - i * 8, yy); c.lineTo(cx - 100 - i * 8, yy); c.stroke(); }
        c.restore();
      },
    };
  },
};
