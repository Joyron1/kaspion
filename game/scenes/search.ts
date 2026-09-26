// p09 "לכל עבר": all the silver fish came at once, listened to Kaspion, and then scattered in
// every direction, quick as little sparks of light, to look for the whale's father and mother.

import * as art from '../engine/art';
import { TAU } from '../engine/util';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const searchScene: SceneDef = {
  id: 'search',
  create({ fx }) {
    const school = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * TAU, r: 70 + (i % 3) * 34, ph: i * 0.5 }));
    let sparkT = 0;
    return {
      draw(c, t, p) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        const cx = 400, cy = 240;
        const burst = phase(p, 0.55, 0.9);
        for (const f of school) {
          // gathered around Kaspion, all facing him — then away like sparks
          const r = f.r + burst * 520;
          const x = cx + Math.cos(f.a) * r * 1.3, y = cy + Math.sin(f.a) * r * 0.85 + bob(t, 2, 3, f.ph);
          const face = burst > 0 ? (Math.cos(f.a) >= 0 ? 1 : -1) : (Math.cos(f.a) >= 0 ? -1 : 1);
          if (burst > 0 && burst < 1) {
            c.save(); c.strokeStyle = 'rgba(255,245,190,0.7)'; c.lineWidth = 3; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(f.a) * 50, y - Math.sin(f.a) * 34); c.stroke(); c.restore();
          }
          art.fish(c, x, y, 40, face, t + f.ph, { fast: burst > 0 });
        }
        sparkT -= 1 / 60;
        if (burst > 0 && burst < 1 && sparkT <= 0) {
          sparkT = 0.05;
          const a = Math.random() * TAU, r = 120 + burst * 400;
          fx.add({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, type: 'star', max: 0.5, color: '#fff4b8', r: 5 });
        }
        art.fish(c, cx, cy + bob(t, 1.1, 6), 76, -1, t, { mood: 'happy' });
      },
    };
  },
};
