// Small helpers shared by the read-along scenes.

import { clamp, easeInOut } from '../engine/util';

/** 0 before `a`, 1 after `b`, eased in between — for story moments tied to narration progress. */
export const phase = (p: number, a: number, b: number) => easeInOut(clamp((p - a) / Math.max(0.0001, b - a), 0, 1));

/** A gentle up-and-down float. */
export const bob = (t: number, speed = 1, amount = 6, offset = 0) => Math.sin(t * speed + offset) * amount;

/** Linear interpolation between two points. */
export const between = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
});
