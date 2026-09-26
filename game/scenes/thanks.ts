// p12 "תודה ולילה טוב": the parents swim in circles around their little whale and thank Kaspion
// again and again; they celebrate until the day ends; then everyone says good night and swims home.

import * as art from '../engine/art';
import { TAU } from '../engine/util';
import { FLOOR, STAGE_H, STAGE_W, type SceneDef } from './types';
import { bob, phase } from './common';

export const thanksScene: SceneDef = {
  id: 'thanks',
  create({ fx }) {
    const swirl = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU, ph: i * 0.8 }));
    let heartT = 0;
    return {
      draw(c, t, p) {
        const night = phase(p, 0.6, 0.9);
        const sleepy = night > 0.8;
        art.sand(c, -60, STAGE_W + 60, FLOOR + 10);
        const cx = 400, cy = 250;
        const spin = t * 0.5 * (1 - night * 0.8);
        // the parents circling their little one
        art.whale(c, cx + Math.cos(spin) * 200, cy + Math.sin(spin) * 60 - 20, 90, -Math.sin(spin) >= 0 ? 1 : -1, t, { body: art.PAL.papa, mood: sleepy ? 'sleepy' : 'happy', smile: true });
        art.whale(c, cx + Math.cos(spin + Math.PI) * 200, cy + Math.sin(spin + Math.PI) * 60 - 20, 80, -Math.sin(spin + Math.PI) >= 0 ? 1 : -1, t + 1, { body: art.PAL.mama, lashes: true, mood: sleepy ? 'sleepy' : 'happy', smile: true });
        art.whale(c, cx, cy + 10 + bob(t, 0.9, 5), 70, -1, t + 2, { mood: sleepy ? 'sleepy' : 'happy', smile: true });
        // silver fish swirling in a ring of joy
        for (const f of swirl) {
          const a = f.a + spin * 1.3;
          art.fish(c, cx + Math.cos(a) * 300, cy + Math.sin(a) * 150, 36, Math.sin(a) > 0 ? -1 : 1, t + f.ph, { mood: sleepy ? 'sleepy' : 'happy' });
        }
        art.fish(c, cx + 130, cy - 110 + bob(t, 1.2, 6), 60, -1, t, { mood: sleepy ? 'sleepy' : 'happy' });
        heartT -= 1 / 60;
        if (night < 0.5 && heartT <= 0) {
          heartT = 0.5;
          fx.add({ x: cx + (Math.random() - 0.5) * 260, y: cy - 40, type: 'heart', vy: -35, max: 1.8, color: art.PAL.pink, r: 9 });
        }
        // evening: the water darkens, a moon and stars appear above
        if (night > 0) {
          c.fillStyle = `rgba(8,18,50,${night * 0.5})`;
          c.fillRect(-200, -200, STAGE_W + 400, STAGE_H + 400);
          c.save(); c.globalAlpha = night;
          c.beginPath(); c.arc(680, 60, 30, 0, TAU); c.fillStyle = '#fff4b8'; c.fill(); c.lineWidth = 3; c.strokeStyle = art.INK; c.stroke();
          for (let i = 0; i < 7; i++) art.star(c, 80 + i * 90, 40 + (i % 2) * 30, 6 + Math.sin(t * 2 + i) * 1.5, '#fff4b8');
          c.restore();
        }
      },
    };
  },
};
