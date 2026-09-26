'use client';

import { useEffect, useRef } from 'react';
import { Fx } from '@/game/engine/fx';
import { sea } from '@/game/engine/art';
import { SCENES } from '@/game/scenes';
import { STAGE_H, STAGE_W } from '@/game/scenes/types';

/** Renders one scene at 800×500 with time frozen at t, for screenshots (dev only). */
export default function ScenePreview({ id, t, p }: { id: string; t: number; p: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const def = SCENES[id];
    if (!cv || !def) return;
    const c = cv.getContext('2d')!;
    const fx = new Fx();
    const inst = def.create({ fx });
    // run up to t in small steps so stateful scenes reach the right moment
    const steps = Math.max(1, Math.round(t * 30));
    for (let i = 0; i <= steps; i++) {
      const ti = (t * i) / steps;
      c.setTransform(1, 0, 0, 1, 0, 0);
      sea(c, STAGE_W, STAGE_H, ti, 0.1);
      inst.draw(c, ti, p * (i / steps));
      fx.update(1 / 30);
      fx.draw(c);
    }
    cv.dataset.ready = '1';
  }, [id, t, p]);
  return <canvas ref={ref} width={STAGE_W} height={STAGE_H} style={{ display: 'block' }} data-scene={id} />;
}
