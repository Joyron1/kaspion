// Runs one level: canvas, input, camera, stage flow, hints, timing.

import { Fx } from './fx';
import { fish, arrow } from './art';
import { sfx, unlockAudio } from './sfx';
import type { Narrator } from './narrator';
import { clamp, dist, rand, type Point } from './util';
import type { Bounds, GameApi, Hero, HudState, LevelDef, LevelInstance, PlayResult } from './types';

export type GameMode = 'intro' | 'play' | 'finale' | 'done';

export interface GameOptions {
  levelId: string;
  narrator: Narrator;
  cfg: Record<string, number>;
  onHud: (h: HudState) => void;
  onToast: (text: string) => void;
  onStage: (index: number, text: string) => void;
  onComplete: (r: PlayResult) => void;
  bot?: boolean;
}

const HUD_PX = 88;         // CSS pixels reserved for the top bar
export const HERO_SPEED = 235; // world units per second
const BREAK = 3.2;           // seconds of celebration between missions
const HINT_AFTER = 11;      // seconds without progress before the arrow appears
const SAY_HINT_AFTER = 16;  // ...and before the narrator offers help

export class Game implements GameApi {
  readonly c: CanvasRenderingContext2D;
  readonly fx = new Fx();
  readonly sfx = sfx;
  readonly cfg: Record<string, number>;
  readonly pointer = { x: 0, y: 0, down: false };
  cam: Point = { x: 0, y: 0 };
  t = 0;
  mode: GameMode = 'intro';

  private canvas: HTMLCanvasElement;
  private opts: GameOptions;
  private level!: LevelInstance;
  private S = 1; private DPR = 1; private cw = 0; private ch = 0;
  private _W = 600; private _H = 450;
  private raf = 0; private last = 0;
  private stageIndex = 0;
  private stageTime = 0;
  private stageTimes: number[] = [];
  private playTime = 0;
  private idle = 0; private hintSaid = false;
  private lastProgressSig = '';
  private hudSig = '';
  private screenPointer = { x: 0, y: 0 };
  private wanderT = 0;
  private breakT = 0; // short pause between stages
  private disposed = false;
  private cleanup: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, def: LevelDef, opts: GameOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.cfg = opts.cfg;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('canvas 2d unavailable');
    this.c = c;
    this.resize();
    this.level = def.create(this);
    this.bindInput();
    const onResize = () => { this.resize(); this.level.onResize?.(); };
    window.addEventListener('resize', onResize);
    this.cleanup.push(() => window.removeEventListener('resize', onResize));
    if (opts.bot) this.exposeBot();
    this.emitHud(true);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------- GameApi
  get W() { return this._W; }
  get H() { return this._H; }
  get floor() { return this._H - 50; }
  get top() { return HUD_PX / this.S + 12; }
  get live() { return this.mode === 'play' && this.breakT <= 0; }

  say = (name: string) => this.opts.narrator.say(this.key(name));
  text = (name: string) => this.opts.narrator.text(this.key(name), '');
  toast = (name: string) => {
    const txt = this.text(name);
    if (txt) this.opts.onToast(txt);
    void this.say(name);
  };
  praise = () => {
    const n = 1 + Math.floor(Math.random() * 5);
    this.toast(`ui.praise.${n}`);
  };

  makeHero = (x: number, y: number): Hero => ({ x, y, vx: 0, vy: 0, tx: x, ty: y, face: 1, hurt: 0, size: 78 });

  drawHero = (h: Hero, extra?: { mood?: Hero['mood'] }) => {
    if (h.hidden) return;
    const sp = Math.hypot(h.vx, h.vy);
    const mood = h.hurt > 0 ? 'ouch' : (extra?.mood ?? h.mood ?? 'happy');
    fish(this.c, h.x, h.y + Math.sin(this.t * 3) * 2, h.size, h.face, this.t, { fast: sp > 60, mood });
  };

  steer = (h: Hero, dt: number, b?: Bounds) => {
    const bb = b ?? this.defaultBounds();
    if (h.hurt > 0) h.hurt -= dt;
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
    const sp = Math.min(d * 3, HERO_SPEED);
    const dvx = d > 1 ? (dx / d) * sp : 0, dvy = d > 1 ? (dy / d) * sp : 0;
    const k = 1 - Math.exp(-dt * (h.hurt > 0 ? 1.4 : 6));
    h.vx += (dvx - h.vx) * k; h.vy += (dvy - h.vy) * k;
    h.x = clamp(h.x + h.vx * dt, bb.x0, bb.x1);
    h.y = clamp(h.y + h.vy * dt, bb.y0, bb.y1);
    if (Math.abs(h.vx) > 12) h.face = Math.sign(h.vx);
  };

  touches = (h: Hero, p: Point, r = 44) => dist(h, p) < r;

  // ------------------------------------------------------------- lifecycle
  /** Called by the screen when the child taps "let's go". */
  start() {
    unlockAudio();
    this.opts.narrator.unlock();
    this.mode = 'play';
    this.stageIndex = 0;
    this.enterStage();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach(f => f());
    this.opts.narrator.stop();
    if (this.opts.bot) delete (window as unknown as Record<string, unknown>).__kaspion;
  }

  private key(name: string) {
    return name.startsWith('ui.') ? name : `level.${this.opts.levelId}.${name}`;
  }

  private enterStage() {
    const st = this.level.stages[this.stageIndex];
    this.stageTime = 0; this.idle = 0; this.hintSaid = false; this.lastProgressSig = '';
    st.enter?.();
    const txt = this.text(st.intro);
    this.opts.onStage(this.stageIndex, txt);
    void this.say(st.intro);
    this.emitHud(true);
  }

  private stageDone() {
    const st = this.level.stages[this.stageIndex];
    this.stageTimes.push(Math.round(this.stageTime));
    sfx.stage();
    this.fx.celebrate(this.level.hero.x, this.level.hero.y - 30);
    void st;
    if (this.stageIndex < this.level.stages.length - 1) {
      this.praise();
      this.breakT = BREAK;
      this.stageIndex++;
    } else if (this.level.finale) {
      this.mode = 'finale';
    } else {
      this.finish();
    }
  }

  private finish() {
    this.mode = 'done';
    sfx.win();
    this.opts.onComplete({ seconds: Math.round(this.playTime), stages: this.stageTimes });
  }

  // ------------------------------------------------------------- frame
  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const L = this.level, h = L.hero;

    if (this.mode === 'play' || this.mode === 'finale') this.playTime += dt;

    // camera and pointer in world units
    this.updateCamera();
    this.pointer.x = this.screenPointer.x + this.cam.x;
    this.pointer.y = this.screenPointer.y + this.cam.y;

    if (this.mode === 'play') {
      if (this.breakT > 0) {
        this.breakT -= dt;
        if (this.breakT <= 0) this.enterStage();
      } else {
        if (this.pointer.down) { h.tx = this.pointer.x; h.ty = this.pointer.y; }
        const st = L.stages[this.stageIndex];
        this.stageTime += dt;
        st.update(dt);
        this.trackIdle(dt);
        this.emitHud(false);
        if (st.done()) this.stageDone();
      }
    } else if (this.mode === 'intro' || this.mode === 'done') {
      // let Kaspion swim about by himself behind the cards
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(1.8, 3.2);
        const b = this.bounds();
        h.tx = clamp(this.cam.x + rand(80, this.W - 80), b.x0, b.x1);
        h.ty = clamp(this.cam.y + rand(this.top + 40, this.H - 140), b.y0, b.y1);
      }
    } else if (this.mode === 'finale') {
      if (L.finale!(dt)) this.finish();
    }

    L.update(dt, this.live);
    this.fx.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private trackIdle(dt: number) {
    const st = this.level.stages[this.stageIndex];
    const sig = `${st.got?.() ?? ''}|${Math.round((st.progress?.() ?? 0) * 20)}`;
    if (sig !== this.lastProgressSig) { this.lastProgressSig = sig; this.idle = 0; this.hintSaid = false; return; }
    this.idle += dt;
    if (this.idle > SAY_HINT_AFTER && !this.hintSaid) {
      this.hintSaid = true;
      this.toast('ui.idle.hint');
    }
  }

  private nearestTarget(): Point | null {
    const st = this.level.stages[this.stageIndex];
    const ts = st?.targets?.() ?? [];
    if (!ts.length) return null;
    const h = this.level.hero;
    let best = ts[0], bd = Infinity;
    for (const p of ts) { const d = dist(h, p); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  private bounds(): Bounds { return this.level.bounds?.() ?? this.defaultBounds(); }

  private defaultBounds(): Bounds {
    const w = this.level?.world?.() ?? { w: this.W, h: this.H };
    const y1 = w.h <= this.H ? this.floor - 30 : w.h - 80;
    return { x0: 40, x1: w.w - 40, y0: this.top, y1 };
  }

  private updateCamera() {
    const L = this.level;
    if (!L) return;
    const w = L.world?.() ?? { w: this.W, h: this.H };
    const want = L.camera?.() ?? { x: L.hero.x - this.W / 2, y: L.hero.y - this.H / 2 };
    this.cam.x = clamp(want.x, 0, Math.max(0, w.w - this.W));
    this.cam.y = clamp(want.y, 0, Math.max(0, w.h - this.H));
  }

  private render() {
    const c = this.c, L = this.level;
    c.setTransform(this.DPR * this.S, 0, 0, this.DPR * this.S, 0, 0);
    L.background?.(c);
    c.save();
    c.translate(-this.cam.x, -this.cam.y);
    L.draw(c);
    this.fx.draw(c);
    // idle hint arrow from the hero toward the next target
    if (this.live && this.idle > HINT_AFTER) {
      const p = this.nearestTarget();
      if (p) {
        const h = L.hero, a = Math.atan2(p.y - h.y, p.x - h.x);
        const d = Math.min(110, dist(h, p) * 0.5);
        arrow(c, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, a, this.t, 0.9);
      }
    }
    c.restore();
    L.overlay?.(c);
  }

  // ------------------------------------------------------------- HUD
  private emitHud(force: boolean) {
    const st = this.level.stages[this.stageIndex];
    const h: HudState = {
      stage: this.stageIndex,
      stages: this.level.stages.length,
      icon: st?.icon ?? null,
      got: st?.got?.() ?? 0,
      goal: st?.goal?.() ?? 0,
      progress: st?.progress ? Math.round(st.progress() * 100) / 100 : null,
    };
    const sig = JSON.stringify(h);
    if (force || sig !== this.hudSig) { this.hudSig = sig; this.opts.onHud(h); }
  }

  // ------------------------------------------------------------- input & size
  private resize() {
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    this.cw = this.canvas.clientWidth; this.ch = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.cw * this.DPR);
    this.canvas.height = Math.round(this.ch * this.DPR);
    this.S = Math.min(this.cw / 600, this.ch / 450);
    this._W = this.cw / this.S; this._H = this.ch / this.S;
  }

  private bindInput() {
    const cv = this.canvas;
    const set = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      this.screenPointer.x = (e.clientX - r.left) / this.S;
      this.screenPointer.y = (e.clientY - r.top) / this.S;
    };
    const down = (e: PointerEvent) => {
      set(e); this.pointer.down = true;
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      unlockAudio();
      if (this.live) {
        this.fx.ring(this.screenPointer.x + this.cam.x, this.screenPointer.y + this.cam.y);
        sfx.tap();
      }
    };
    const move = (e: PointerEvent) => { if (this.pointer.down) set(e); };
    const up = () => { this.pointer.down = false; };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.cleanup.push(() => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    });
  }

  /** Test hooks for the automated play-tester (only with ?bot=1). */
  private exposeBot() {
    const api = {};
    Object.defineProperties(api, {
      mode: { get: () => this.mode },
      stage: { get: () => this.stageIndex },
      stages: { get: () => this.level.stages.length },
      live: { get: () => this.live },
      elapsed: { get: () => this.playTime },
      stageTimes: { get: () => this.stageTimes },
      /** CSS-pixel positions relative to the canvas */
      targets: {
        value: () => {
          const st = this.level.stages[this.stageIndex];
          return (st?.targets?.() ?? []).map(p => ({ x: (p.x - this.cam.x) * this.S, y: (p.y - this.cam.y) * this.S }));
        },
      },
      hero: { value: () => { const h = this.level.hero; return { x: (h.x - this.cam.x) * this.S, y: (h.y - this.cam.y) * this.S }; } },
    });
    (window as unknown as Record<string, unknown>).__kaspion = api;
  }
}
