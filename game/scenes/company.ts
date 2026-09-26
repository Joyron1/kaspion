// p10 "לא נשאר לבד": only Kaspion stays with the little whale; "don't worry, my brothers
// will find them soon"; they wait together, two new friends. Cosy, quiet; sad turns to a smile.

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const companyScene: SceneDef = {
  id: 'company',
  create({ fx }) {
    let bubbleT = 0;
    return {
      draw(c, t, p) {
        const R = 170, wx = 470, wy = FLOOR - 70 + bob(t, 0.6, 4);
        const happy = phase(p, 0.45, 0.8);
        art.glow(c, wx - 120, wy - 20, 300, `rgba(255,230,170,${0.12 + happy * 0.12})`);
        art.whale(c, wx, wy, R, -1, t, { mood: happy > 0.5 ? 'happy' : 'sad', smile: happy > 0.8 });
        art.sand(c, -60, STAGE_W + 60, FLOOR);
        art.anemone(c, 110, FLOOR + 12, 70, art.PAL.pink, t);
        art.starfish(c, 700, FLOOR + 20, 16, t);
        // Kaspion snuggled right by the whale's eye
        art.fish(c, wx - R * 0.98, wy - R * 0.2 + bob(t, 1, 5), 56, 1, t * 0.7, { mood: 'happy' });
        // slow bubbles rising, now and then
        bubbleT -= 1 / 60;
        if (bubbleT <= 0) {
          bubbleT = 1.4;
          fx.add({ x: wx - R * 0.35, y: wy - R * 0.6, type: 'dot', vy: -30, max: 3, color: 'rgba(255,255,255,0.8)', r: 8 });
        }
      },
    };
  },
};
