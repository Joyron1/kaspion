// p04 "רחוק מתמיד": one morning Kaspion swims far, much farther than ever; the sea is still
// and blue — and suddenly he sees something big and black ahead.

import * as art from '../engine/art';
import { FLOOR, STAGE_H, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const farScene: SceneDef = {
  id: 'far',
  create() {
    return {
      draw(c, t, p) {
        // soft morning light from above
        c.fillStyle = 'rgba(255,245,200,0.12)';
        c.fillRect(0, 0, STAGE_W, 90);
        art.farHills(c, STAGE_W, STAGE_H, t * 14, 'rgba(20,60,120,0.35)', 3);
        art.sand(c, -60, STAGE_W + 60, FLOOR + 20);
        // the big black shape looms at the left edge near the end
        const loom = phase(p, 0.7, 0.95);
        if (loom > 0) {
          c.save(); c.globalAlpha = loom;
          art.whale(c, -90 + loom * 90, 250, 260, -1, t, { rock: 1, tail: 0, fin: 0, eye: 0 });
          c.restore();
        }
        // little Kaspion crossing the wide, empty sea toward the left
        const travel = Math.min(p / 0.7, 1);
        const x = 690 - travel * 330 - (loom > 0 ? 0 : 0);
        const y = 250 + bob(t, 1.1, 14);
        art.fish(c, x, y, 64, -1, t, { mood: loom > 0.4 ? 'surprised' : 'happy', fast: travel < 1 });
        // a trail of little bubbles behind him
        for (let i = 1; i <= 4; i++) art.bubble(c, x + 40 + i * 22, y - 6 + Math.sin(t * 2 + i) * 5, 3 + i);
      },
    };
  },
};
