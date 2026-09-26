import type { Fx } from '../engine/fx';

/** Read-along illustrations are drawn on a fixed 800×500 stage, scaled to fit. */
export const STAGE_W = 800;
export const STAGE_H = 500;
export const FLOOR = STAGE_H - 50;

export interface SceneApi {
  fx: Fx;
}

export interface SceneInstance {
  /**
   * t = seconds since the page appeared, p = narration progress 0..1
   * (drive story moments from p so they line up with the words being read).
   */
  draw: (c: CanvasRenderingContext2D, t: number, p: number) => void;
}

export interface SceneDef {
  id: string;
  create: (api: SceneApi) => SceneInstance;
}
