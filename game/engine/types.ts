import type { Fx } from './fx';
import type { Point } from './util';
import type { sfx } from './sfx';

export type IconName = 'bubble' | 'shell' | 'spark' | 'fish' | 'heart' | 'pearl' | 'food' | 'star' | 'whale' | 'hoop' | 'tear';

export interface Hero {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number; face: number; hurt: number;
  size: number;
  mood?: 'happy' | 'sad' | 'surprised';
  hidden?: boolean;
}

/**
 * One mission inside a level. A level runs its stages in order; each stage
 * should take a young child roughly 30–60 seconds.
 */
export interface Stage {
  /** level text name narrated and shown when the stage starts, e.g. 'stage1' */
  intro: string;
  icon?: IconName;
  goal?: () => number;
  got?: () => number;
  /** 0..1 for journeys without countable items */
  progress?: () => number;
  enter?: () => void;
  /** runs only while the child is playing this stage */
  update: (dt: number) => void;
  done: () => boolean;
  /** world points the child should head for next (idle hint + test bot) */
  targets?: () => Point[];
}

export interface Bounds { x0: number; x1: number; y0: number; y1: number }

export interface LevelInstance {
  hero: Hero;
  stages: Stage[];
  /** world size; defaults to the screen */
  world?: () => { w: number; h: number };
  bounds?: () => Bounds;
  /** where the camera wants its top-left; default follows the hero */
  camera?: () => Point;
  /** ambient world: runs every frame, live=false before play starts */
  update: (dt: number, live: boolean) => void;
  /** draw the world; the camera transform is already applied */
  draw: (c: CanvasRenderingContext2D) => void;
  /** screen-space background drawn before the camera (water, far hills) */
  background?: (c: CanvasRenderingContext2D) => void;
  /** screen-space overlay drawn after the world */
  overlay?: (c: CanvasRenderingContext2D) => void;
  /** optional closing animation after the last stage; return true when finished */
  finale?: (dt: number) => boolean;
  onResize?: () => void;
}

export interface GameApi {
  readonly c: CanvasRenderingContext2D;
  /** visible area in world units */
  readonly W: number;
  readonly H: number;
  /** y of the sea floor for screen-sized levels */
  readonly floor: number;
  /** y below the HUD where play can start */
  readonly top: number;
  readonly t: number;
  readonly cam: Point;
  readonly pointer: { x: number; y: number; down: boolean };
  readonly fx: Fx;
  readonly sfx: typeof sfx;
  readonly cfg: Record<string, number>;
  readonly live: boolean;
  /** narrate a level text by name ('intro', 'stage2', 'toast.found') or a ui key ('ui.praise.1') */
  say: (name: string) => Promise<void>;
  /** show a short banner and narrate it */
  toast: (name: string) => void;
  praise: () => void;
  text: (name: string) => string;
  makeHero: (x: number, y: number) => Hero;
  drawHero: (h: Hero, extra?: { mood?: Hero['mood'] }) => void;
  steer: (h: Hero, dt: number, b?: Bounds) => void;
  /** hero touches point within radius (world units) */
  touches: (h: Hero, p: Point, r?: number) => boolean;
}

export interface LevelDef {
  id: string;
  create: (g: GameApi) => LevelInstance;
}

export interface HudState {
  stage: number;
  stages: number;
  icon: IconName | null;
  got: number;
  goal: number;
  progress: number | null;
}

export interface PlayResult {
  seconds: number;
  stages: number[];
}
