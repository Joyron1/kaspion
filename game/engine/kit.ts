// Reusable pieces that levels are built from. Each piece owns its state,
// updates itself, draws itself, and reports targets for the idle hint / bot.

import * as art from './art';
import { TAU, clamp, dist, hash, rand, type Point } from './util';
import type { GameApi, Hero } from './types';

type C = CanvasRenderingContext2D;

// ------------------------------------------------------------------ pickups

export interface Pickup extends Point { alive: boolean; ph: number; r: number; vx?: number; vy?: number; kind?: number }

/**
 * Things to swim into and collect (bubbles, shells, plankton, hearts...).
 * `drift` moves them each frame; `draw` renders one.
 */
export class Pickups {
  items: Pickup[] = [];
  got = 0;
  private paced: { total: number; every: number; alive: number; spawn: () => Point & Partial<Pickup>; timer: number; made: number } | null = null;
  constructor(
    private g: GameApi,
    private opts: {
      radius?: number;
      draw: (c: C, p: Pickup, t: number) => void;
      drift?: (p: Pickup, dt: number, t: number) => void;
      onGet?: (p: Pickup) => void;
      sound?: 'pop' | 'shell' | 'sparkle' | 'join';
    },
  ) {}
  add(x: number, y: number, extra: Partial<Pickup> = {}) {
    const p: Pickup = { x, y, alive: true, ph: rand(0, TAU), r: this.opts.radius ?? 26, ...extra };
    this.items.push(p);
    return p;
  }
  /**
   * Release items over time instead of all at once: at most `alive` on screen,
   * a new one every `every` seconds, `total` in all. This is what keeps a
   * mission from being over in ten seconds.
   */
  pace(total: number, every: number, alive: number, spawn: () => Point & Partial<Pickup>) {
    this.paced = { total, every, alive, spawn, timer: 0, made: 0 };
  }
  get total() { return this.paced ? this.paced.total : this.items.length; }
  get left() { return this.total - this.got; }
  get finished() { return this.total > 0 && this.got >= this.total; }
  update(dt: number, hero: Hero, live: boolean) {
    const pc = this.paced;
    if (pc && live && pc.made < pc.total) {
      pc.timer -= dt;
      const aliveNow = this.items.filter(p => p.alive).length;
      // an empty screen gets the next item a little sooner, but never instantly
      const ready = aliveNow < pc.alive && (pc.timer <= 0 || (aliveNow === 0 && pc.timer <= pc.every * 0.45));
      if (ready) {
        const s = pc.spawn();
        this.add(s.x, s.y, s);
        pc.made++; pc.timer = pc.every;
      }
    }
    for (const p of this.items) {
      if (!p.alive) continue;
      this.opts.drift?.(p, dt, this.g.t);
      if (live && dist(hero, p) < p.r + 30) {
        p.alive = false; this.got++;
        this.g.sfx[this.opts.sound ?? 'pop']();
        this.g.fx.burst(p.x, p.y, 10, '#ffffff', 'dot', 150);
        this.g.fx.ring(p.x, p.y);
        this.opts.onGet?.(p);
      }
    }
  }
  draw(c: C) { for (const p of this.items) if (p.alive) this.opts.draw(c, p, this.g.t); }
  targets(): Point[] { return this.items.filter(p => p.alive); }
}

// ------------------------------------------------------------------ hoops

/** Rings to swim through, shown one or a few at a time in order. */
export class Hoops {
  points: (Point & { r: number; done: boolean })[] = [];
  index = 0;
  constructor(private g: GameApi, private visibleAhead = 2) {}
  add(x: number, y: number, r = 58) { this.points.push({ x, y, r, done: false }); }
  get total() { return this.points.length; }
  get got() { return this.index; }
  get finished() { return this.index >= this.points.length; }
  update(hero: Hero, live: boolean) {
    const h = this.points[this.index];
    if (!h || !live) return;
    if (Math.abs(hero.x - h.x) < h.r * 0.75 && Math.abs(hero.y - h.y) < h.r) {
      h.done = true; this.index++;
      this.g.sfx.sparkle();
      this.g.fx.burst(h.x, h.y, 12, '#ffe066', 'star', 160);
    }
  }
  draw(c: C) {
    for (let i = this.index; i < Math.min(this.points.length, this.index + this.visibleAhead); i++) {
      const h = this.points[i];
      art.hoop(c, h.x, h.y, h.r, this.g.t, i === this.index);
    }
  }
  targets(): Point[] { const h = this.points[this.index]; return h ? [h] : []; }
}

// ------------------------------------------------------------------ school of fish

export interface Buddy extends Point { vx: number; vy: number; face: number; joined: boolean; ph: number; size: number; bow?: string; hidden?: boolean }

/**
 * Kaspion's brothers, sisters and cousins. Unjoined buddies idle where they are;
 * joined ones trail the leader in a loose school.
 */
export class School {
  fish: Buddy[] = [];
  constructor(private g: GameApi) {}
  add(x: number, y: number, extra: Partial<Buddy> = {}) {
    const b: Buddy = { x, y, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, joined: false, ph: rand(0, TAU), size: rand(44, 56), ...extra };
    this.fish.push(b);
    return b;
  }
  get joinedCount() { return this.fish.filter(f => f.joined).length; }
  /** join any buddy the leader touches */
  collect(leader: Point, live: boolean, radius = 58, onJoin?: (b: Buddy) => void) {
    if (!live) return;
    for (const b of this.fish) {
      if (b.joined || b.hidden) continue;
      if (dist(leader, b) < radius) {
        b.joined = true; this.g.sfx.join();
        this.g.fx.burst(b.x, b.y, 8, '#ffffff', 'star', 120);
        onJoin?.(b);
      }
    }
  }
  joinAll() { for (const b of this.fish) b.joined = true; }
  update(dt: number, leader: Point & { face?: number }) {
    const t = this.g.t;
    const joined = this.fish.filter(f => f.joined);
    joined.forEach((b, i) => {
      // each follower keeps a slot behind and around the leader
      const ring = 1 + Math.floor(i / 6), a = (i % 6) / 6 * TAU + ring * 0.5 + Math.sin(t * 0.8 + b.ph) * 0.2;
      const back = -(leader.face ?? 1) * (40 + ring * 30);
      const tx = leader.x + back + Math.cos(a) * 30 * ring;
      const ty = leader.y + Math.sin(a) * 34 * ring;
      const k = 1 - Math.exp(-dt * 3.2);
      b.vx += ((tx - b.x) * 3 - b.vx) * k; b.vy += ((ty - b.y) * 3 - b.vy) * k;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.abs(b.vx) > 8) b.face = Math.sign(b.vx);
    });
    for (const b of this.fish) {
      if (b.joined) continue;
      b.y += Math.sin(t * 1.3 + b.ph) * 8 * dt;
      b.x += Math.sin(t * 0.6 + b.ph) * 10 * dt;
    }
  }
  draw(c: C) {
    for (const b of this.fish) {
      if (b.hidden) continue;
      art.fish(c, b.x, b.y, b.size, b.face, this.g.t + b.ph, { bow: b.bow, fast: b.joined });
      if (!b.joined) art.sparkle(c, b.x + 18, b.y - 22, this.g.t + b.ph, 0.45);
    }
  }
  targets(): Point[] { return this.fish.filter(f => !f.joined && !f.hidden); }
}

// ------------------------------------------------------------------ hide & seek

export interface Hidden extends Point { found: boolean; peek: number; data?: number }

/** Things hidden behind scenery; they peek out when Kaspion comes close, and are found on touch. */
export class Hideouts {
  spots: Hidden[] = [];
  found = 0;
  constructor(private g: GameApi, private opts: { near?: number; touch?: number; onFind?: (h: Hidden) => void }) {}
  add(x: number, y: number, data?: number) { this.spots.push({ x, y, found: false, peek: 0, data }); }
  get total() { return this.spots.length; }
  update(dt: number, hero: Hero, live: boolean) {
    const near = this.opts.near ?? 170, touch = this.opts.touch ?? 50;
    for (const s of this.spots) {
      if (s.found) { s.peek = Math.min(1, s.peek + dt * 3); continue; }
      const d = dist(hero, s);
      const want = d < near ? 1 - d / near : 0;
      s.peek += (Math.max(want, 0.12 + 0.1 * Math.sin(this.g.t * 2 + s.x)) - s.peek) * (1 - Math.exp(-dt * 5));
      if (live && d < touch) {
        s.found = true; this.found++;
        this.g.sfx.sparkle();
        this.g.fx.burst(s.x, s.y, 12, '#ffe066', 'star', 150);
        this.opts.onFind?.(s);
      }
    }
  }
  targets(): Point[] { return this.spots.filter(s => !s.found); }
}

// ------------------------------------------------------------------ falling things to catch

export interface Faller extends Point { vy: number; alive: boolean; ph: number; kind: number }

/** Things drifting down (tears, sunbeams, stars) that the child catches before they land. */
export class Fallers {
  list: Faller[] = [];
  caught = 0;
  private timer = 0;
  constructor(
    private g: GameApi,
    private opts: {
      every: number;            // seconds between spawns
      spawn: () => Point;       // where a new one appears
      speed?: number;           // fall speed
      max?: number;             // how many at once
      radius?: number;
      draw: (c: C, f: Faller, t: number) => void;
      onCatch?: (f: Faller) => void;
      onLand?: (f: Faller) => void;
      floor?: () => number;
    },
  ) {}
  update(dt: number, hero: Hero, live: boolean, spawning = true) {
    this.timer -= dt;
    if (spawning && this.timer <= 0 && this.list.filter(f => f.alive).length < (this.opts.max ?? 3)) {
      this.timer = this.opts.every;
      const p = this.opts.spawn();
      this.list.push({ x: p.x, y: p.y, vy: this.opts.speed ?? 45, alive: true, ph: rand(0, TAU), kind: Math.floor(rand(0, 4)) });
    }
    const floor = this.opts.floor?.() ?? this.g.floor;
    for (const f of this.list) {
      if (!f.alive) continue;
      f.y += f.vy * dt;
      f.x += Math.sin(this.g.t * 1.5 + f.ph) * 14 * dt;
      if (live && dist(hero, f) < (this.opts.radius ?? 28) + 30) {
        f.alive = false; this.caught++;
        this.g.sfx.pop();
        this.g.fx.burst(f.x, f.y, 10, '#ffe066', 'star', 140);
        this.opts.onCatch?.(f);
      } else if (f.y > floor) {
        f.alive = false;
        this.g.fx.burst(f.x, floor, 6, '#bfefff', 'dot', 80);
        this.opts.onLand?.(f);
      }
    }
    this.list = this.list.filter(f => f.alive);
  }
  draw(c: C) { for (const f of this.list) this.opts.draw(c, f, this.g.t); }
  targets(): Point[] { return this.list.filter(f => f.alive); }
}

// ------------------------------------------------------------------ a playful runner to tag

/** A friend that swims away when Kaspion comes close, but slowly enough for a 4-year-old. */
export class Runner implements Point {
  x: number; y: number; vx = 0; vy = 0; face = 1; tags = 0; cooldown = 0;
  constructor(private g: GameApi, x: number, y: number, private area: () => { x0: number; x1: number; y0: number; y1: number }, private speed = 120) {
    this.x = x; this.y = y;
  }
  update(dt: number, hero: Hero, live: boolean, onTag?: () => void) {
    const a = this.area();
    const d = dist(hero, this);
    this.cooldown = Math.max(0, this.cooldown - dt);
    let ax = Math.sin(this.g.t * 0.7) * 20, ay = Math.cos(this.g.t * 0.9) * 20;
    if (d < 220 && this.cooldown <= 0) {
      ax += ((this.x - hero.x) / (d || 1)) * this.speed * 1.4;
      ay += ((this.y - hero.y) / (d || 1)) * this.speed * 1.4;
    }
    // steer away from edges
    if (this.x < a.x0 + 60) ax += 160; if (this.x > a.x1 - 60) ax -= 160;
    if (this.y < a.y0 + 40) ay += 160; if (this.y > a.y1 - 40) ay -= 160;
    const k = 1 - Math.exp(-dt * 2);
    this.vx += (ax - this.vx) * k; this.vy += (ay - this.vy) * k;
    const sp = Math.hypot(this.vx, this.vy), max = this.speed;
    if (sp > max) { this.vx *= max / sp; this.vy *= max / sp; }
    this.x = clamp(this.x + this.vx * dt, a.x0, a.x1);
    this.y = clamp(this.y + this.vy * dt, a.y0, a.y1);
    if (Math.abs(this.vx) > 10) this.face = Math.sign(this.vx);
    if (live && this.cooldown <= 0 && d < 56) {
      this.tags++; this.cooldown = 1.6;
      this.g.sfx.giggle();
      this.g.fx.burst(this.x, this.y, 10, '#ff86c1', 'heart', 120);
      onTag?.();
    }
  }
}

// ------------------------------------------------------------------ followers (one big friend)

/** A slow friend (e.g. the baby whale) that follows Kaspion at a distance. */
export class Follower implements Point {
  x: number; y: number; vx = 0; vy = 0; face = -1;
  constructor(x: number, y: number, private gap = 150, private speed = 110) { this.x = x; this.y = y; }
  update(dt: number, leader: Point) {
    const dx = leader.x - this.x, dy = leader.y - this.y, d = Math.hypot(dx, dy);
    const want = d > this.gap ? Math.min(this.speed, (d - this.gap) * 1.5) : 0;
    const k = 1 - Math.exp(-dt * 2);
    this.vx += ((d ? dx / d : 0) * want - this.vx) * k;
    this.vy += ((d ? dy / d : 0) * want - this.vy) * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.abs(this.vx) > 6) this.face = Math.sign(this.vx);
  }
}

// ------------------------------------------------------------------ scenery helpers

export interface Deco { x: number; k: 'weed' | 'coral' | 'rock' | 'anemone'; h: number; c: string; ph: number }

/** A reproducible strip of sea-floor decoration between x0 and x1. */
export function makeDeco(x0: number, x1: number, seed = 1, density = 1): Deco[] {
  const out: Deco[] = [];
  const colors = [art.PAL.coral, art.PAL.purple, art.PAL.orange];
  for (let x = x0, i = 0; x < x1; i++) {
    const r = hash(seed * 31 + i * 7.13);
    const k = r < 0.5 ? 'weed' : r < 0.75 ? 'coral' : r < 0.9 ? 'rock' : 'anemone';
    out.push({
      x, k,
      h: k === 'weed' ? 60 + hash(i * 3.1 + seed) * 90 : k === 'coral' ? 55 + hash(i * 5.7 + seed) * 50 : 32 + hash(i + seed) * 26,
      c: k === 'weed' ? (hash(i + seed * 2) < 0.5 ? art.PAL.green : art.PAL.greenDark) : colors[Math.floor(hash(i * 9 + seed) * 3)],
      ph: hash(i * 13 + seed) * 6,
    });
    x += (90 + hash(i * 11 + seed) * 140) / density;
  }
  return out;
}

export function drawDeco(c: C, list: Deco[], floor: number, t: number, x0 = -Infinity, x1 = Infinity) {
  for (const d of list) {
    if (d.x < x0 - 150 || d.x > x1 + 150) continue;
    const base = art.sandY(d.x, floor) + 8;
    if (d.k === 'weed') art.weed(c, d.x, base, d.h, d.c, d.ph, t);
    else if (d.k === 'coral') art.coral(c, d.x, base, d.h, d.c);
    else if (d.k === 'rock') art.rock(c, d.x, base - 6, d.h);
    else art.anemone(c, d.x, base, d.h * 1.6, d.c, t);
  }
}

/** Spread n points over an area, keeping them apart (simple dart throwing). */
export function spread(n: number, area: { x0: number; x1: number; y0: number; y1: number }, minGap = 90, avoid: Point[] = []): Point[] {
  const pts: Point[] = [];
  for (let tries = 0; pts.length < n && tries < n * 60; tries++) {
    const p = { x: rand(area.x0, area.x1), y: rand(area.y0, area.y1) };
    if ([...pts, ...avoid].every(q => dist(p, q) > minGap)) pts.push(p);
  }
  while (pts.length < n) pts.push({ x: rand(area.x0, area.x1), y: rand(area.y0, area.y1) });
  return pts;
}
