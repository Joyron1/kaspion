// The journey: thirteen stations along a long sea valley. Kaspion swims from one to the
// next while the narrator reads that page of the story; at each station waits a mini-game.

import * as THREE from 'three';
import { Stage } from './core/stage';
import { Fx } from './core/fx';
import { Ocean, Garden, mood } from './env/ocean';
import { makeFish, makeKaspion, makeWhale, makeCreature, type Creature, type Kind } from './characters';
import { removeCreature, swimTo, type Ctx, type Game } from './games/kit';
import { shadowGame } from './games/shadow';
import { momGame } from './games/mom';
import { memoryGame } from './games/memory';
import { mazeGame } from './games/maze';
import { colorGame } from './games/color';
import { STATIONS, type GameKind, type StationDef } from '@/lib/content/world';

export type Phase = 'ready' | 'travel' | 'arrive' | 'play' | 'won' | 'end';

export interface WorldState {
  phase: Phase;
  station: number;        // index into STATIONS
  got: number;
  goal: number;
  /** the story page being read while swimming */
  page: string | null;
}

export interface WorldHooks {
  /** how many tasks each game has */
  counts(): Record<GameKind, number>;
  say(key: string): Promise<void>;
  sfx(name: Parameters<Ctx['sfx']>[0]): void;
  onState(s: WorldState): void;
  onStationDone(index: number): void;
  estimate(key: string): number;
  bot: boolean;
  /** light rendering for tests on software graphics (no bot) */
  lite?: boolean;
}

const GAMES: Record<GameKind, (c: Ctx) => Game> = {
  shadow: shadowGame, mom: momGame, memory: memoryGame, maze: mazeGame, color: colorGame,
};

const GAP = 62;
export const stationPos = (i: number) => new THREE.Vector3(Math.sin(i * 0.95) * 11, 0, -i * GAP);
const HOME = new THREE.Vector3(4, 4, 46);

/** The swim to station i: a gentle S through the valley, ending up in the station's corner. */
function travelCurve(from: THREE.Vector3, i: number): THREE.CatmullRomCurve3 {
  const to = stationPos(i).add(ARRIVE);
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3((i % 2 ? 1 : -1) * 6, 1.8, 0));
  const a = from.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 0.8, 0));
  const b = mid.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.6, 0));
  return new THREE.CatmullRomCurve3([from, a, mid, b, to], false, 'centripetal');
}
/** where Kaspion arrives at a station (local): high on the left, clear of every game */
const ARRIVE = new THREE.Vector3(-6, 5.8, 2);

interface Buddy { c: Creature; role: 'baby' | 'mama' | 'papa'; off: THREE.Vector3; at: THREE.Vector3; ph: number }

export class World {
  readonly stage: Stage;
  private fx: Fx;
  private ocean: Ocean;
  private kaspion: Creature;
  private phase: Phase = 'ready';
  private index = 0;
  private game: Game | null = null;
  private group: THREE.Group | null = null;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private goalPos = new THREE.Vector3();
  private goalLook = new THREE.Vector3();
  private curve: THREE.CatmullRomCurve3 | null = null;
  private travelT = 0;
  private curveLen = 1;
  private route: THREE.Vector3[] = [];
  private camDir = new THREE.Vector3(0, 0, -1);
  private travelDur = 10;
  private idle = 0;
  private lastGot = -1;
  private hintEvery = 0;
  private hinted = false;
  private wonT = 0;
  private autoT = 0;
  private gardens: Garden[] = [];
  private buddies: Buddy[] = [];
  private locals: Creature[] = [];
  private localAt = -1;
  private schoolAngle = 0;
  private schoolAway = 0;
  private state: WorldState = { phase: 'ready', station: 0, got: 0, goal: 0, page: null };

  constructor(canvas: HTMLCanvasElement, private hooks: WorldHooks) {
    const lite = hooks.bot || Boolean(hooks.lite);
    this.stage = new Stage(canvas, { lite });
    if (lite) { this.stage.maxDt = 0.1; this.stage.substeps = 8; }
    this.fx = new Fx(this.stage.scene);
    const len = STATIONS.length * GAP + 140;
    const flats = STATIONS.map((_, i) => { const p = stationPos(i); return { x: p.x, z: p.z, r: 14 }; });
    this.ocean = new Ocean(this.stage, { length: len, width: 150, flats });
    const h = (x: number, z: number) => this.ocean.height(x, z);
    // every swim lane, so no plant stands between the camera and Kaspion on the way
    const lane: THREE.Vector2[] = [];
    STATIONS.forEach((_, i) => {
      const from = i === 0 ? HOME.clone() : stationPos(i - 1).add(ARRIVE);
      for (const p of travelCurve(from, i).getSpacedPoints(80)) lane.push(new THREE.Vector2(p.x, p.z));
    });
    const blocked = (x: number, z: number, r: number) => lane.some(p => (p.x - x) ** 2 + (p.y - z) ** 2 < r * r);
    STATIONS.forEach((s, i) => {
      const garden = new Garden(this.stage.scene, this.stage.lowPower);
      garden.blocked = blocked;
      const p = stationPos(i);
      garden.plant(p.x, p.z, 14.5, 42, s.theme, 11 + i * 7, h);
      // along the way to the next station, leaving a lane to swim through
      const q = stationPos(i + 1);
      const mid = p.clone().lerp(q, 0.5);
      garden.plant(mid.x - 13, mid.z, 3, 12, i % 3 === 0 ? 'kelp' : 'coral', 101 + i, h);
      garden.plant(mid.x + 13, mid.z, 3, 12, i % 2 === 0 ? 'rocks' : 'kelp', 201 + i, h);
      garden.finish();
      this.gardens.push(garden);
    });
    const home = new Garden(this.stage.scene, this.stage.lowPower);
    home.blocked = blocked;
    home.plant(HOME.x, HOME.z - 6, 8, 34, 'coral', 5, h);
    home.finish();
    this.gardens.push(home);

    this.kaspion = makeKaspion();
    // turn, then pitch the nose, then bank: so leaning into a curve looks right
    this.kaspion.root.rotation.order = 'YZX';
    this.kaspion.root.position.copy(HOME);
    this.stage.scene.add(this.kaspion.root);

    this.camPos.copy(HOME).add(new THREE.Vector3(0, 3, 10));
    this.camLook.copy(HOME);
    this.goalPos.copy(this.camPos);
    this.goalLook.copy(this.camLook);
    this.stage.camera.position.copy(this.camPos);

    this.stage.onTick((dt, t) => this.tick(dt, t));
    this.stage.onTap(e => {
      if (this.phase === 'play' && this.game) {
        this.game.tap(e);
        if (e.kind === 'down') this.idle = 0;
      }
    });
    this.stage.start();
    if (typeof window !== 'undefined') {
      (window as unknown as { __world: unknown }).__world = {
        state: () => this.state,
        skip: () => this.skipTravel(),
        auto: () => this.game?.auto(),
        info: () => ({ ...this.stage.renderer.info.render, geos: this.stage.renderer.info.memory.geometries, progs: this.stage.renderer.info.programs?.length }),
        debug: () => ({ ...this.state, t: +this.stage.t.toFixed(1), frames: this.frames, dbg: this.game?.debug?.() }),
      };
    }
  }

  /** Put Kaspion at the start of the way to station `i` (0 = from home). */
  begin(i: number) {
    this.index = Math.max(0, Math.min(STATIONS.length - 1, i));
    const from = this.index === 0 ? HOME.clone() : stationPos(this.index - 1).add(new THREE.Vector3(0, 3, 0));
    this.kaspion.root.position.copy(from);
    this.camPos.copy(from).add(new THREE.Vector3(2, 3, 10));
    this.stage.camera.position.copy(this.camPos);
    this.setBuddies();
    this.travel();
  }

  private station(): StationDef { return STATIONS[this.index]; }

  private emit(extra: Partial<WorldState> = {}) {
    const p = this.game?.progress() ?? { got: 0, goal: 0 };
    this.state = { phase: this.phase, station: this.index, got: p.got, goal: p.goal, page: null, ...extra };
    this.hooks.onState(this.state);
  }

  // ------------------------------------------------------------ travel
  private travel() {
    const s = this.station();
    const from = this.kaspion.root.getWorldPosition(new THREE.Vector3());
    this.curve = travelCurve(from, this.index);
    this.curveLen = this.curve.getLength();
    this.camDir.copy(this.curve.getTangentAt(0)).normalize();
    const key = `story.${s.page}`;
    this.travelDur = this.hooks.bot ? 2.5 : Math.max(11, this.hooks.estimate(key) + 3);
    this.travelT = 0;
    this.phase = 'travel';
    this.emit({ page: s.page });
    this.hooks.sfx('whoosh');
    this.reading = this.hooks.say(key);
  }

  skipTravel() { if (this.phase === 'travel') this.travelT = this.travelDur; }

  // ------------------------------------------------------------ station
  private async arrive() {
    this.phase = 'arrive';
    this.emit();
    const origin = stationPos(this.index);
    const g = new THREE.Group();
    g.position.copy(origin);
    this.stage.scene.add(g);
    this.group = g;
    g.attach(this.kaspion.root);
    const s = this.station();
    const ctx: Ctx = {
      stage: this.stage,
      fx: this.fx,
      group: g,
      kaspion: this.kaspion,
      level: s.level,
      count: this.hooks.counts()[s.game] ?? 5,
      say: key => (this.hooks.bot ? Promise.resolve() : this.hooks.say(key)),
      sfx: n => this.hooks.sfx(n),
      praise: () => {
        const n = 1 + Math.floor(Math.random() * 5);
        if (!this.hooks.bot) void this.hooks.say(`ui.praise.${n}`);
        this.kaspion.cheer();
      },
      halfWidth: (depth = 0) => {
        const cam = this.stage.camera;
        const dist = 12.5 - depth;
        return Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist * cam.aspect;
      },
      bot: this.hooks.bot,
    };
    this.kaspion.cheer();
    this.hooks.sfx('stage');
    // let the story page finish (but don't wait forever)
    if (!this.hooks.bot) await Promise.race([this.reading, new Promise(r => setTimeout(r, 6000))]);
    if (this.group !== g) return;
    if (!this.hooks.bot) await this.hooks.say(`world.${s.id}.intro`);
    if (this.group !== g) return; // left meanwhile
    this.game = GAMES[s.game](ctx);
    const spot = this.game.kaspionSpot;
    const from = this.kaspion.root.position;
    this.route = spot ? [new THREE.Vector3(Math.min(from.x, spot.x) - 3.5, Math.max(from.y, spot.y) + 1, spot.z)] : [];
    this.phase = 'play';
    this.idle = 0;
    this.lastGot = -1;
    this.hinted = false;
    this.emit();
  }

  private win() {
    this.phase = 'won';
    this.wonT = 0;
    this.kaspion.cheer();
    this.fx.celebrate(this.kaspion.root.getWorldPosition(new THREE.Vector3()), 1.6);
    this.hooks.sfx('win');
    this.hooks.onStationDone(this.index);
    if (!this.hooks.bot) void this.hooks.say('world.win');
    this.emit();
  }

  /** leave the station (after a win): on to the next, or the grand finale */
  next() {
    if (this.phase !== 'won') return;
    this.game?.dispose();
    this.game = null;
    if (this.group) {
      this.stage.scene.attach(this.kaspion.root);
      this.kaspion.root.scale.setScalar(1);
      this.stage.scene.remove(this.group);
      this.group = null;
    }
    if (this.index >= STATIONS.length - 1) {
      this.phase = 'end';
      this.emit();
      if (!this.hooks.bot) void this.hooks.say('world.end');
      return;
    }
    this.index++;
    this.setBuddies();
    this.travel();
  }

  // ------------------------------------------------------------ friends who come along
  private setBuddies() {
    const want: { kind: 'whale' | 'mama' | 'papa'; off: THREE.Vector3 }[] = [];
    if (this.index >= 7) want.push({ kind: 'whale', off: new THREE.Vector3(-5, 1.2, -4) });
    if (this.index >= 11) {
      want.push({ kind: 'mama', off: new THREE.Vector3(-9, 3.5, -9) });
      want.push({ kind: 'papa', off: new THREE.Vector3(5, 4.5, -11) });
    }
    for (const w of want) {
      const role = w.kind === 'whale' ? 'baby' : w.kind;
      if (this.buddies.some(b => b.role === role)) continue;
      const c = makeWhale({ role });
      c.root.scale.multiplyScalar(role === 'baby' ? 1.6 : 1.5);
      const at = this.kaspion.root.getWorldPosition(new THREE.Vector3()).add(w.off).add(new THREE.Vector3(0, 0, 25));
      c.root.position.copy(at);
      this.stage.scene.add(c.root);
      this.buddies.push({ c, role, off: w.off, at, ph: Math.random() * 6 });
    }
  }

  /** creatures that live at a station (the silver family, the sleeping "mountain", night jellies) */
  private setLocals(i: number) {
    if (this.localAt === i) return;
    for (const c of this.locals) removeCreature(c);
    this.locals = [];
    this.localAt = i;
    const p = stationPos(i);
    const s = STATIONS[i];
    const add = (c: Creature, at: THREE.Vector3) => { c.root.position.copy(at); this.stage.scene.add(c.root); this.locals.push(c); return c; };
    if (['p02', 'p08', 'p09'].includes(s.page)) {
      for (let k = 0; k < 9; k++) add(makeFish({ silver: true }), p.clone().add(new THREE.Vector3(0, 6, -10)));
    }
    if (s.page === 'p03') {
      const kinds: Kind[] = ['fish', 'seahorse', 'fish', 'turtle', 'seahorse'];
      kinds.forEach((k, n) => add(makeCreature(k), p.clone().add(new THREE.Vector3(-14 + n * 7, 4 + (n % 2) * 2, -13))));
    }
    if (s.page === 'p05' || s.page === 'p06') {
      const w = add(makeWhale({ role: 'baby' }), p.clone().add(new THREE.Vector3(3, 3.2, -15)));
      w.root.scale.setScalar(2.6);
      w.root.rotation.y = -0.3;
    }
    if (s.page === 'p12') {
      for (let k = 0; k < 6; k++) add(makeCreature('jelly'), p.clone().add(new THREE.Vector3(-15 + k * 6, 5 + (k % 3) * 1.5, -12 - (k % 2) * 4)));
    }
    if (s.page === 'p13' || s.page === 'p03') {
      for (let k = 0; k < 3; k++) add(makeCreature((['crab', 'starfish', 'octopus'] as Kind[])[k]), p.clone().add(new THREE.Vector3(-13 + k * 13, 0.2, -12)));
    }
  }

  // ------------------------------------------------------------ frame
  private frames = 0;
  private reading: Promise<void> = Promise.resolve();
  private tick(dt: number, t: number) {
    this.frames++;
    const k = this.kaspion;
    const here = this.phase === 'ready' ? 0 : this.index;
    this.ocean.follow(mood(STATIONS[here].mood), dt);
    const topDown = this.game && this.game.camera.pos.y > 9;
    this.ocean.sunScale += ((topDown ? 0.62 : 1) - this.ocean.sunScale) * Math.min(1, dt * 2);
    const near = this.phase === 'travel' && this.travelT / this.travelDur < 0.5 && this.index > 0 ? this.index - 1 : here;
    this.setLocals(near);

    if (this.phase === 'ready') {
      k.swim = 0.3;
      k.root.position.y = HOME.y + Math.sin(t) * 0.2;
      k.root.rotation.y = -0.4 + Math.sin(t * 0.4) * 0.3;
      this.goalLook.copy(k.root.position);
      this.goalPos.copy(k.root.position).add(new THREE.Vector3(1.5, 1.2, 7));
    } else if (this.phase === 'travel' && this.curve) {
      this.travelT += dt;
      const u = Math.min(1, this.travelT / this.travelDur);
      // speed: speed up gently, cruise, slow down gently at the station
      const A = 0.18, vmax = 1 / (1 - A);
      let e = u < A ? 0.5 * vmax * u * u / A : u > 1 - A ? 1 - 0.5 * vmax * (1 - u) ** 2 / A : vmax * (u - A / 2);
      // a small surge with every tail beat, the way fish really swim
      const cruise = Math.min(1, u / A, (1 - u) / A);
      e = THREE.MathUtils.clamp(e + Math.sin(t * 7) * 0.12 * cruise / this.curveLen, 0, 1);
      const p = this.curve.getPointAt(e);
      const dir = this.curve.getTangentAt(e).normalize();
      k.root.position.copy(p);
      // turn toward the way ahead, lean into the turn, nose up or down with the path
      const yaw = Math.atan2(-dir.z, dir.x);
      let diff = yaw - k.root.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const turn = diff * Math.min(1, dt * 4);
      k.root.rotation.y += turn;
      const bank = THREE.MathUtils.clamp(-(turn / Math.max(dt, 1e-3)) * 0.35, -0.55, 0.55);
      k.root.rotation.x += (bank - k.root.rotation.x) * Math.min(1, dt * 3);
      const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) * 0.8, -0.3, 0.3);
      k.root.rotation.z += (pitch - k.root.rotation.z) * Math.min(1, dt * 3);
      k.swim = 0.55 + 0.45 * cruise;
      // third-person camera: right behind Kaspion and a little above, following his heading smoothly
      this.camDir.lerp(dir, 1 - Math.exp(-dt * 2.2)).normalize();
      const flat = new THREE.Vector3(this.camDir.x, this.camDir.y * 0.4, this.camDir.z).normalize();
      // three-quarter view from behind: we see his side and eye, and where he is heading
      const sideV = new THREE.Vector3(-flat.z, 0, flat.x).normalize();
      // aim below him so he rides in the upper middle of the screen, above the story caption
      this.goalPos.copy(p).addScaledVector(flat, -4.6).addScaledVector(sideV, 1.9).add(new THREE.Vector3(0, 0.9, 0));
      this.goalLook.copy(p).addScaledVector(flat, 4.5).add(new THREE.Vector3(0, -1.9, 0));
      // a few tiny bubbles from the gills, drifting up (not into the lens)
      if (Math.random() < dt * 1.5) this.fx.add('bubble', p.clone().add(new THREE.Vector3(0, 0.35, 0)), { v: new THREE.Vector3(0, 1.4, 0), life: 1.4, size: 0.07 + Math.random() * 0.06, rise: 0.3 });
      if (u >= 1) { k.root.rotation.z = 0; k.root.rotation.x = 0; void this.arrive(); }
    } else if (this.group) {
      const g = this.group.position;
      if (this.game) {
        const cam = this.game.camera;
        this.goalPos.copy(g).add(cam.pos);
        this.goalLook.copy(g).add(cam.look);
      } else {
        this.goalPos.copy(g).add(new THREE.Vector3(0, 4, 12.5));
        this.goalLook.copy(g).add(new THREE.Vector3(0, 2.6, 0));
      }
      const spot = this.game?.kaspionSpot ?? (this.game ? null : ARRIVE);
      if (spot) {
        // go round the outside (up and to the side), never across the play area
        if (this.route.length && swimTo(k, this.route[0], dt, 6)) this.route.shift();
        if (!this.route.length && swimTo(k, spot, dt, 6)) {
          k.root.rotation.y += (-0.35 - k.root.rotation.y) * Math.min(1, dt * 3);
          k.root.rotation.z *= 0.9;
        }
        k.lookAt = this.game?.hint() ?? this.stage.camera.position;
      }
      if (this.phase === 'play' && this.game) this.play(dt, t);
      if (this.phase === 'won') {
        this.wonT += dt;
        if (this.hooks.bot && this.wonT > 1) this.next();
        else if (this.wonT > 9) this.next();
      }
    } else if (this.phase === 'end') {
      k.swim = 0.6;
      const c = stationPos(STATIONS.length - 1).add(new THREE.Vector3(0, 4, 0));
      k.root.position.set(c.x + Math.cos(t * 0.6) * 5, c.y + Math.sin(t * 1.2), c.z + Math.sin(t * 0.6) * 5);
      k.root.rotation.y = -t * 0.6 - Math.PI / 2;
      this.goalLook.copy(c);
      this.goalPos.copy(c).add(new THREE.Vector3(Math.sin(t * 0.1) * 4, 3, 17));
      if (Math.random() < dt * 1.5) this.fx.celebrate(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 4, (Math.random() - 0.5) * 6)), 1.2);
    }

    k.update(dt, t);
    this.game?.update(dt, t);
    this.updateBuddies(dt, t);
    for (const [n, c] of this.locals.entries()) this.updateLocal(c, n, dt, t);
    this.fx.update(dt);
    // gardens beyond the fog are not drawn at all
    for (const g of this.gardens) g.group.visible = g.center.distanceTo(this.camPos) < 105;

    // camera easing
    // during the swim the camera stays close behind (after a softer first second)
    const stiff = this.phase === 'travel' ? (this.travelT < 1.2 ? 2.5 : 6) : 1.6;
    const kk = 1 - Math.exp(-dt * stiff);
    this.camPos.lerp(this.goalPos, kk);
    this.camLook.lerp(this.goalLook, kk);
    this.stage.camera.position.copy(this.camPos);
    this.stage.camera.lookAt(this.camLook);
    this.stage.focus.copy(this.camLook);
  }

  private play(dt: number, t: number) {
    const game = this.game!;
    const p = game.progress();
    if (p.got !== this.lastGot) {
      this.lastGot = p.got;
      this.idle = 0;
      this.hinted = false;
      this.emit();
    }
    this.idle += dt;
    if (this.idle > 12) {
      const h = game.hint();
      this.hintEvery -= dt;
      if (h && this.hintEvery <= 0) {
        this.hintEvery = 1.1;
        this.fx.burst(h, 'sparkle', 8, 1.6, 0.6);
        this.fx.add('star', h, { v: new THREE.Vector3(0, -0.6, 0), life: 1, size: 0.7 });
        if (!this.hinted) { this.hinted = true; if (!this.hooks.bot) void this.hooks.say('world.hint'); }
      }
    }
    if (this.hooks.bot) {
      this.autoT -= dt;
      if (this.autoT <= 0) { this.autoT = 0.45; game.auto(); }
    }
    if (game.done()) this.win();
    void t;
  }

  private updateBuddies(dt: number, t: number) {
    const k = this.kaspion.root.getWorldPosition(new THREE.Vector3());
    for (const b of this.buddies) {
      let target: THREE.Vector3;
      if (this.phase === 'travel' || this.phase === 'ready') target = k.clone().add(b.off);
      else {
        // watch the game from behind the play area
        const g = stationPos(this.index);
        target = g.clone().add(new THREE.Vector3(b.off.x * 1.4, 7 + b.off.y, -17 + b.off.z * 0.6));
      }
      target.y += Math.sin(t * 0.8 + b.ph) * 0.4;
      b.at.lerp(target, 1 - Math.exp(-dt * 0.9));
      const d = b.at.clone().sub(b.c.root.position);
      b.c.root.position.copy(b.at);
      if (d.lengthSq() > 1e-5) {
        const yaw = Math.atan2(-d.z, d.x);
        let diff = yaw - b.c.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.c.root.rotation.y += diff * Math.min(1, dt * 1.5);
      }
      b.c.swim = Math.min(1, d.length() / dt / 6);
      b.c.lookAt = this.phase === 'play' ? this.kaspion.root.getWorldPosition(new THREE.Vector3()) : null;
      b.c.update(dt, t);
    }
  }

  private updateLocal(c: Creature, n: number, dt: number, t: number) {
    const p = stationPos(this.localAt);
    if (c.kind === 'kaspion') {
      // the silver family swims round and round like one big fish
      this.schoolAngle += dt * 0.05;
      const a = t * 0.45 + n * 0.32;
      // while a game is on, the family swims far behind so nothing crosses the play area
      const away = this.game ? 1 : 0;
      this.schoolAway += (away - this.schoolAway) * Math.min(1, dt * 0.5);
      c.root.position.set(p.x + Math.cos(a) * 16, 6 + Math.sin(a * 2 + n) * 0.6 + (n % 3) * 0.7 + this.schoolAway * 4, p.z - 6 - this.schoolAway * 22 + Math.sin(a) * 9);
      c.root.rotation.y = -a - Math.PI / 2;
      c.swim = 0.8;
    } else if (c.kind === 'fish' || c.kind === 'seahorse' || c.kind === 'turtle') {
      c.root.position.x += Math.sin(t * 0.3 + n) * dt * 1.2;
      c.root.rotation.y = Math.cos(t * 0.3 + n) > 0 ? 0 : -Math.PI;
      c.swim = 0.5;
    } else if (c.kind === 'whale') {
      c.swim = 0.1;
      c.lookAt = this.kaspion.root.getWorldPosition(new THREE.Vector3());
    }
    c.update(dt, t);
  }

  dispose() {
    this.game?.dispose();
    this.stage.dispose();
  }
}
