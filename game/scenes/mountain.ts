// p05 "הר באמצע הים": "it must be a mountain," thinks Kaspion. He comes closer slowly and
// carefully, a little more and a little more, and swims around the big mountain.

import * as art from '../engine/art';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { phase } from './common';

export const mountainScene: SceneDef = {
  id: 'mountain',
  create() {
    const R = 190, mx = 330, my = FLOOR - 50;
    return {
      draw(c, t, p) {
        art.whale(c, mx, my, R, -1, t, { rock: 1, tail: 0, fin: 0, eye: 0 });
        art.sand(c, -60, STAGE_W + 60, FLOOR);
        art.weed(c, 700, FLOOR + 10, 110, art.PAL.green, 1, t);
        art.rock(c, 620, FLOOR + 4, 34);
        // first half: small careful hops toward the mountain (move, pause, move...)
        const hops = 4;
        const approach = Math.min(1, p / 0.6);
        const step = Math.floor(approach * hops);
        const within = approach * hops - step;
        const k = (step + Math.min(1, within * 2)) / hops; // moves in the first half of each step, then waits
        let x = 700 - k * 180, y = 230 + Math.sin(k * Math.PI * 4) * 12;
        let face = -1;
        // second half: an arc over the top of the mountain
        const around = phase(p, 0.62, 1);
        if (around > 0) {
          const a = around * Math.PI;
          x = mx + Math.cos(a) * (R + 70);
          y = my - Math.sin(a) * (R * 0.58 + 80);
          face = -1;
        }
        const mood = around > 0 ? 'happy' : within < 0.5 ? 'happy' : 'surprised';
        art.fish(c, x, y, 64, face, t, { mood });
        if (within > 0.5 && around <= 0 && p < 0.6) art.sparkle(c, x - 30, y - 40, t, 0.35);
      },
    };
  },
};
