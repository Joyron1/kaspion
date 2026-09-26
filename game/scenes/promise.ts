// p07 "לוויתן קטן": "you're so big, why are you crying?" "I may be big, but I'm still a little
// whale; I swam far and lost my father and mother." "Don't cry, I'll help you find them."
// Big whale, tiny fish; thought bubbles show his parents; at the end a nuzzle and a heart.

import * as art from '../engine/art';
import { TAU } from '../engine/util';
import { FLOOR, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const promiseScene: SceneDef = {
  id: 'promise',
  create({ fx }) {
    const R = 180, wx = 500, wy = 305;
    let lastTear = 0, hearted = false;
    return {
      draw(c, t, p) {
        art.sand(c, -60, STAGE_W + 60, FLOOR + 20);
        const comfort = phase(p, 0.85, 1);
        const y = wy + bob(t, 0.8, 6);
        art.whale(c, wx, y, R, -1, t, { mood: comfort > 0.5 ? 'happy' : 'sad', smile: comfort > 0.8 });
        if (comfort < 0.6 && t - lastTear > 2) {
          lastTear = t;
          fx.add({ x: wx - R * 0.6, y: y + 12, type: 'tear', vy: 20, max: 2, color: '#8fdcff', r: 8 });
        }
        // thought bubbles: mother and father whale (while he tells what happened)
        const think = phase(p, 0.4, 0.5) * (1 - phase(p, 0.78, 0.86));
        if (think > 0) {
          c.save(); c.globalAlpha = think;
          for (const [bx, by, r] of [[wx - 60, y - R * 0.75, 8], [wx - 30, y - R * 0.9, 12]]) {
            c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
          }
          c.beginPath(); c.ellipse(wx + 60, y - R * 1.02, 150, 62, 0, 0, TAU);
          c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 4; c.strokeStyle = art.INK; c.stroke();
          art.whale(c, wx + 10, y - R * 1.02, 40, -1, t, { body: art.PAL.mama, lashes: true, smile: true });
          art.whale(c, wx + 120, y - R * 1.02, 46, -1, t + 1, { body: art.PAL.papa, smile: true });
          c.restore();
        }
        // tiny Kaspion by the whale's eye, drifting closer to nuzzle his cheek at the end
        const kx = 120 + comfort * (wx - R * 0.95 - 120), ky = y - 10 + comfort * 30;
        art.fish(c, kx, ky + bob(t, 1.3, 6), 58, 1, t, { mood: 'happy' });
        if (comfort > 0.9 && !hearted) { hearted = true; fx.celebrate(kx + 30, ky - 30); }
      },
    };
  },
};
