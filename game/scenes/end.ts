// The last picture after "סוף": the whale family and Kaspion with his silver family,
// all together and gently bobbing, like the last page of a picture book.

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob } from './common';

export const endScene: SceneDef = {
  id: 'end',
  create({ fx }) {
    const kin = Array.from({ length: 12 }, (_, i) => ({ x: 90 + (i % 6) * 38, y: 150 + Math.floor(i / 6) * 34, ph: i * 0.7 }));
    let starT = 0;
    return {
      draw(c, t) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        art.weed(c, 40, FLOOR + 18, 130, art.PAL.green, 0, t);
        art.coral(c, 760, FLOOR + 18, 90, art.PAL.coral);
        art.whale(c, 520, 200 + bob(t, 0.7, 5), 150, -1, t, { body: art.PAL.papa, mood: 'happy', smile: true });
        art.whale(c, 600, 350 + bob(t, 0.7, 5, 1), 125, -1, t + 1, { body: art.PAL.mama, lashes: true, mood: 'happy', smile: true });
        art.whale(c, 330, 320 + bob(t, 0.9, 5, 2), 95, -1, t + 2, { mood: 'happy', smile: true });
        for (const k of kin) art.fish(c, k.x, k.y + bob(t, 1.5, 4, k.ph), 38, 1, t + k.ph);
        art.fish(c, 230, 250 + bob(t, 1.2, 6), 70, 1, t, { mood: 'happy' });
        starT -= 1 / 60;
        if (starT <= 0) {
          starT = 0.6;
          fx.add({ x: 100 + Math.random() * 600, y: 60 + Math.random() * 120, type: 'star', max: 1.2, color: '#fff4b8', r: 6 });
        }
      },
    };
  },
};
