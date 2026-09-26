// p11 "אבא ואמא!": before the little whale finished wiping his tears, all the silver fish came
// back — and behind them swam his father and mother, giant, happy and laughing.

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const parentsScene: SceneDef = {
  id: 'parents',
  create({ fx }) {
    const school = Array.from({ length: 16 }, (_, i) => ({ dx: (i % 4) * 40, dy: Math.floor(i / 4) * 32 - 48, ph: i * 0.6 }));
    let hearted = false, lastTear = 0;
    return {
      draw(c, t, p) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        const fish = phase(p, 0.18, 0.45), big = phase(p, 0.5, 0.8);
        // the little whale on the right, a last tear
        const cx = 620, cy = 280 + bob(t, 0.8, 5);
        art.whale(c, cx, cy, 110, -1, t, { mood: big > 0.6 ? 'happy' : 'sad', smile: big > 0.9 });
        if (big < 0.5 && t - lastTear > 2.4) { lastTear = t; fx.add({ x: cx - 66, y: cy + 6, type: 'tear', vy: 18, max: 2, color: '#8fdcff', r: 7 }); }
        // mother and father arrive, enormous and laughing
        if (big > 0) {
          art.whale(c, -260 + big * 470, 170 + bob(t, 0.7, 5), 170, 1, t, { body: art.PAL.papa, mood: 'happy', smile: true });
          art.whale(c, -300 + big * 470, 360 + bob(t, 0.7, 5, 1), 140, 1, t + 1, { body: art.PAL.mama, lashes: true, mood: 'happy', smile: true });
        }
        // the silver school streams in first
        if (fish > 0) {
          const sx = -160 + fish * 520;
          for (const f of school) art.fish(c, sx + f.dx, 260 + f.dy + bob(t, 2, 4, f.ph), 40, 1, t + f.ph, { fast: fish < 1 });
        }
        if (big >= 1 && !hearted) { hearted = true; fx.celebrate(cx - 60, cy - 90); }
        if (big >= 1 && Math.random() < 0.03) fx.add({ x: 300 + Math.random() * 300, y: 200, type: 'heart', vy: -30, max: 1.5, color: art.PAL.pink, r: 9 });
      },
    };
  },
};
