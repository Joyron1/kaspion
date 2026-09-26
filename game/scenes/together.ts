// p13 "חברים טובים": from that day on, Kaspion and the whale play together every day; the little
// fish and the big whale are the best friends in the sea. The whale spouts; Kaspion rides the fountain.

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob } from './common';

export const togetherScene: SceneDef = {
  id: 'together',
  create({ fx }) {
    let sparkT = 0;
    return {
      draw(c, t) {
        c.fillStyle = 'rgba(255,245,200,0.12)';
        c.fillRect(0, 0, STAGE_W, 100);
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        const wx = 430, wy = 320 + bob(t, 0.8, 6), R = 170;
        // every few seconds a big happy spout
        const cycle = (t % 4) / 4;
        const spout = cycle < 0.55 ? Math.sin((cycle / 0.55) * Math.PI) : 0;
        art.whale(c, wx, wy, R, -1, t, { mood: 'happy', smile: true, spout });
        // Kaspion rides the fountain up, then loops around the whale
        const sx = wx - R * 0.35, sy = wy - R * 0.58;
        let kx: number, ky: number, face = 1;
        if (spout > 0.05) { kx = sx + Math.sin(t * 6) * 6; ky = sy - 40 - spout * 150; }
        else {
          const a = t * 1.4;
          kx = wx + Math.cos(a) * R * 1.35; ky = wy - 20 + Math.sin(a) * R * 0.75;
          face = -Math.sin(a) >= 0 ? 1 : -1;
        }
        art.fish(c, kx, ky, 62, face, t, { mood: 'happy', fast: spout > 0.05 });
        sparkT -= 1 / 60;
        if (sparkT <= 0) {
          sparkT = 0.35;
          fx.add({ x: kx + (Math.random() - 0.5) * 60, y: ky - 20, type: Math.random() < 0.5 ? 'heart' : 'star', vy: -30, max: 1.3, color: Math.random() < 0.5 ? art.PAL.pink : '#ffe066', r: 7 });
        }
      },
    };
  },
};
