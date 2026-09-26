// p06 "להר יש עין": suddenly Kaspion sees an eye in the middle of the mountain; it opens and a
// big tear rolls out. "Mountains have no eyes and don't cry — you're not a mountain, you're a whale!"

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { phase } from './common';

export const eyeScene: SceneDef = {
  id: 'eye',
  create({ fx }) {
    const R = 230, mx = 470, my = FLOOR - 40;
    let lastTear = 0;
    let crumbT = 0;
    return {
      draw(c, t, p) {
        const eye = phase(p, 0.15, 0.3);
        const unrock = phase(p, 0.68, 0.92);
        const lift = unrock * 50;
        art.whale(c, mx, my - lift, R, -1, t, { rock: 1 - unrock, tail: unrock, fin: unrock, eye, mood: eye > 0.5 ? 'sad' : undefined });
        art.sand(c, -60, STAGE_W + 60, FLOOR);
        // a big tear rolls out and falls
        const ex = mx - R * 0.6, ey = my - lift - R * 0.02;
        if (p > 0.32 && t - lastTear > 2.2) {
          lastTear = t;
          fx.add({ x: ex, y: ey + 10, type: 'tear', vy: 25, max: 2.2, color: '#8fdcff', r: 10 });
        }
        // as he stops being a mountain, pebbles and plants tumble off
        crumbT -= 1 / 60;
        if (unrock > 0 && unrock < 1 && crumbT <= 0) {
          crumbT = 0.08;
          fx.add({ x: mx + (Math.random() - 0.5) * R * 1.6, y: my - lift - R * 0.5, type: 'rock', vx: (Math.random() - 0.5) * 80, vy: -80, max: 1.2, color: art.PAL.mountain, r: 6 });
        }
        // little Kaspion in front, amazed
        art.fish(c, 130, 230 + Math.sin(t * 1.4) * 8, 70, 1, t, { mood: eye > 0.5 ? 'surprised' : 'happy' });
      },
    };
  },
};
