// p01 "כספיון": in the middle of the blue sea lives a little fish whose scales shine like
// silver — so everyone calls him Kaspion. Kaspion alone in the wide sea; a beam of sunlight
// sweeps over him and makes him sparkle.

import * as art from '../engine/art';
import { STAGE_W, STAGE_H, FLOOR, type SceneDef } from './types';
import { bob, phase } from './common';

export const silverScene: SceneDef = {
  id: 'silver',
  create({ fx }) {
    let sparkT = 0;
    return {
      draw(c, t, p) {
        // a sunbeam sweeping down from the surface
        const beam = phase(p, 0.3, 0.75);
        const bx = 120 + beam * 520;
        c.save();
        c.fillStyle = `rgba(255,245,200,${0.1 + 0.18 * Math.sin(beam * Math.PI)})`;
        c.beginPath(); c.moveTo(bx - 40, 0); c.lineTo(bx + 40, 0); c.lineTo(bx + 150, STAGE_H); c.lineTo(bx + 30, STAGE_H); c.closePath(); c.fill();
        c.restore();
        // far below, a hint of sand (the book's sea is mostly open blue)
        art.sand(c, -60, STAGE_W + 60, FLOOR + 30);
        // Kaspion swims a slow, happy loop in the middle
        const x = STAGE_W / 2 + Math.sin(t * 0.45) * 150;
        const y = 240 + bob(t, 0.9, 26);
        const face = Math.cos(t * 0.45) >= 0 ? 1 : -1;
        const shine = beam > 0.05 && beam < 0.95;
        if (shine) art.glow(c, x, y, 110, 'rgba(255,250,210,0.45)');
        art.fish(c, x, y, 110, face, t, { mood: 'happy' });
        // silver sparkles as the light touches him
        sparkT -= 1 / 60;
        if (shine && sparkT <= 0) {
          sparkT = 0.18;
          fx.add({ x: x + (Math.random() - 0.5) * 90, y: y + (Math.random() - 0.5) * 50, type: 'star', max: 0.7, color: '#ffffff', r: 5 });
        }
      },
    };
  },
};
