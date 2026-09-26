// Cover / home background: Kaspion and his silver family drift past the reef,
// and far behind them the dark shape of a whale glides by.

import * as art from '../engine/art';
import { makeDeco, drawDeco } from '../engine/kit';
import { STAGE_W, FLOOR, type SceneDef } from './types';

export const cover: SceneDef = {
  id: 'cover',
  create() {
    const deco = makeDeco(10, STAGE_W, 3, 1.3);
    const school = Array.from({ length: 9 }, (_, i) => ({ dx: (i % 3) * 38 + (i > 5 ? 20 : 0), dy: Math.floor(i / 3) * 30 - 30, ph: i * 0.7 }));
    return {
      draw(c, t) {
        // a whale far away in the blue
        c.save(); c.globalAlpha = 0.35;
        const wx = ((t * 12) % (STAGE_W + 500)) - 250;
        art.whale(c, STAGE_W - wx, 170, 110, -1, t, { spout: 0 });
        c.restore();
        drawDeco(c, deco, FLOOR, t);
        art.sand(c, -40, STAGE_W + 40, FLOOR);
        art.starfish(c, 120, FLOOR + 22, 16, t);
        art.crab(c, 660, FLOOR + 14, 36, t);
        // the family swimming together, like one big fish
        const sx = 470 + Math.sin(t * 0.4) * 60, sy = 300 + Math.sin(t * 0.7) * 16;
        for (const f of school) art.fish(c, sx + f.dx + Math.sin(t * 2 + f.ph) * 4, sy + f.dy + Math.cos(t * 2 + f.ph) * 4, 44, -1, t + f.ph);
        // Kaspion out in front, on his own
        art.fish(c, 300 + Math.sin(t * 0.6) * 90, 360 + Math.sin(t * 1.1) * 20, 84, Math.cos(t * 0.6) >= 0 ? 1 : -1, t);
      },
    };
  },
};
