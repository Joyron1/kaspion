// p02 "משפחה גדולה": lots of silver brothers, sisters and cousins, all just like him,
// swimming together like one big fish — but Kaspion likes to swim far away on his own.
// A tight school moves as one body; near the end one fish (Kaspion) peels off.

import * as art from '../engine/art';
import { STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const familyScene: SceneDef = {
  id: 'family',
  create() {
    // a school shaped like one big fish: rows that narrow toward the head and tail
    const members: { dx: number; dy: number; ph: number; s: number }[] = [];
    const rows = [3, 5, 6, 6, 5, 3];
    rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) members.push({ dx: (i - (n - 1) / 2) * 44 + (r % 2) * 10, dy: (r - 2.5) * 30, ph: r * 0.9 + i * 0.6, s: 40 + ((r + i) % 3) * 4 });
    });
    return {
      draw(c, t, p) {
        const cx = 440 + Math.sin(t * 0.35) * 70, cy = 230 + bob(t, 0.6, 14);
        // the school sways as one body, like a wave passing through it
        for (const m of members) {
          const wave = Math.sin(t * 2 - m.dx * 0.02) * 8;
          art.fish(c, cx + m.dx, cy + m.dy + wave, m.s, -1, t + m.ph);
        }
        // Kaspion: a little bigger, at the front — and then off on his own
        const away = phase(p, 0.72, 1);
        const kx = cx - 190 - away * 250, ky = cy + 10 - away * 70 + bob(t, 1.3, 8);
        art.fish(c, kx, ky, 64, -1, t * (1 + away * 0.6), { fast: away > 0 });
        if (away > 0.1) {
          c.save(); c.globalAlpha = 0.5 * away;
          for (let i = 1; i < 5; i++) art.bubble(c, kx + 40 + i * 26, ky + Math.sin(t * 3 + i) * 6, 5 + i);
          c.restore();
        }
        void STAGE_W;
      },
    };
  },
};
