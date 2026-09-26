'use client';

import { useEffect, useRef } from 'react';
import { Fx } from '@/game/engine/fx';
import { sea } from '@/game/engine/art';
import { SCENES } from '@/game/scenes';
import { STAGE_H, STAGE_W } from '@/game/scenes/types';

/** Full-bleed animated scene, e.g. behind the home screen. Covers the area (crops, no bars). */
export default function SceneCanvas({ scene, className }: { scene: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const def = SCENES[scene];
    if (!cv || !def) return;
    const c = cv.getContext('2d')!;
    const fx = new Fx();
    const inst = def.create({ fx });
    const t0 = performance.now();
    let raf = 0, last = t0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const sc = Math.max(w / STAGE_W, h / STAGE_H);
      const ox = (w - STAGE_W * sc) / 2, oy = h - STAGE_H * sc;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      sea(c, w, h, now / 1000, 0);
      c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      const t = (now - t0) / 1000;
      inst.draw(c, t, (t % 20) / 20);
      fx.update(dt); fx.draw(c);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scene]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
