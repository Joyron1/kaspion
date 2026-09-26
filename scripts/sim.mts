// Headless level simulator: runs the real level code (same Game engine) with a
// child-like bot, no browser needed. Reports play time per level and per mission,
// and fails loudly on runtime errors or levels that cannot be finished.
//
//   npx tsx scripts/sim.mts                 # every level, 3 runs each
//   npx tsx scripts/sim.mts silver family   # some levels
//   npx tsx scripts/sim.mts --runs=5 --fast # "fast" = a sharp, quick player (lower bound)
//
// Times are in game seconds. Target for the "child" bot: 95–130 s per level
// (real 3–5 year olds are slower than the bot; 90–180 s is the goal for them).

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- minimal browser stand-ins -------------------------------------------------
const noop = () => {};
const gradient = { addColorStop: noop };
function mockCtx(): any {
  const store: Record<string | symbol, unknown> = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => gradient;
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k in t) return t[k];
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const W = 1024, H = 640;
(globalThis as any).window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
(globalThis as any).requestAnimationFrame = () => 0;
(globalThis as any).cancelAnimationFrame = noop;
(globalThis as any).Audio = class { play() { return Promise.resolve(); } pause() {} };
const canvas: any = {
  clientWidth: W, clientHeight: H, width: W, height: H,
  getContext: () => mockCtx(),
  addEventListener: noop, removeEventListener: noop, setPointerCapture: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
};

// ---- load the game -------------------------------------------------------------
const { Game } = await import('../game/engine/game');
const { LEVEL_DEFS } = await import('../game/levels');
const { LEVELS } = await import('../lib/content/levels');
const { allLineDefs } = await import('../lib/content/registry');

const texts = Object.fromEntries(allLineDefs().map(d => [d.key, d.text]));
const narrator: any = {
  say: async () => {}, text: (k: string, f = '') => texts[k] ?? f, stop: noop, unlock: noop, prefetch: noop,
};

const argv = process.argv.slice(2);
const flag = (n: string) => argv.find(a => a.startsWith(`--${n}`));
const runs = Number(flag('runs')?.split('=')[1] ?? 3);
const fast = Boolean(flag('fast'));
const cfgMode = flag('cfg')?.split('=')[1]; // min | max: every knob at its extreme
const wanted = argv.filter(a => !a.startsWith('--'));
const ids = wanted.length ? wanted : LEVELS.map(l => l.id);

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Result { id: string; seconds: number | null; stages: number[]; stuckAt?: number; error?: string; missing?: boolean }

function simulate(id: string): Result {
  const def = LEVEL_DEFS[id];
  if (!def) return { id, seconds: null, stages: [], missing: true };
  const meta = LEVELS.find(l => l.id === id)!;
  let done: { seconds: number; stages: number[] } | null = null;
  const game: any = new Game(canvas, def, {
    levelId: id, narrator,
    cfg: cfgMode === 'min' || cfgMode === 'max'
      ? Object.fromEntries(Object.entries(meta.knobs).map(([k, v]) => [k, cfgMode === 'min' ? v.min : v.max]))
      : { ...meta.config },
    onHud: noop, onToast: noop, onStage: noop,
    onComplete: (r: { seconds: number; stages: number[] }) => { done = r; },
  });
  const level = game.level;
  const hero = level.hero;
  const dt = 1 / 30;
  let now = 1000;
  const tick = () => { now += dt * 1000; game.frame(now); };
  // listen to the intro card
  for (let i = 0; i < 30 * (fast ? 0.3 : 2); i++) tick();
  game.start();

  let lastStage = -1, pause = 0, wander = 0, wanderPt = { x: 0, y: 0 }, lastSig = '';
  const LIMIT = 600; // game seconds
  let tsec = 0;
  try {
    while (!done && tsec < LIMIT) {
      tsec += dt;
      const st = level.stages[game.stageIndex];
      if (game.stageIndex !== lastStage) {
        lastStage = game.stageIndex;
        pause = fast ? 0.3 : rnd(1.5, 3); // listening to the new mission
      }
      const sig = `${st?.got?.() ?? ''}|${Math.round((st?.progress?.() ?? 0) * 20)}`;
      if (sig !== lastSig) { lastSig = sig; if (!fast) pause = Math.max(pause, rnd(0.3, 1.0)); }
      if (game.live) {
        if (pause > 0) { pause -= dt; hero.tx = hero.x; hero.ty = hero.y; }
        else if (!fast && wander > 0) { wander -= dt; hero.tx = wanderPt.x; hero.ty = wanderPt.y; }
        else if (!fast && Math.random() < 0.004) {
          wander = rnd(0.7, 1.6);
          wanderPt = { x: game.cam.x + rnd(80, game.W - 80), y: game.cam.y + rnd(game.top + 30, game.H - 100) };
        } else {
          const ts = st?.targets?.() ?? [];
          if (ts.length) {
            let best = ts[0], bd = Infinity;
            for (const p of ts) { const d = Math.hypot(p.x - hero.x, p.y - hero.y); if (d < bd) { bd = d; best = p; } }
            const j = fast ? 0 : 12;
            hero.tx = best.x + rnd(-j, j); hero.ty = best.y + rnd(-j, j);
          }
        }
      }
      tick();
    }
  } catch (e) {
    return { id, seconds: null, stages: game.stageTimes, error: (e as Error).stack?.split('\n').slice(0, 4).join(' | ') };
  }
  game.dispose();
  if (!done) return { id, seconds: null, stages: game.stageTimes, stuckAt: game.stageIndex };
  const d = done as { seconds: number; stages: number[] };
  return { id, seconds: d.seconds, stages: d.stages };
}

let bad = 0;
for (const id of ids) {
  const rs = Array.from({ length: runs }, () => simulate(id));
  const secs = rs.map(r => r.seconds).filter((s): s is number => s !== null);
  const avg = secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : null;
  const problem = rs.find(r => r.error || r.missing || r.seconds === null);
  const lo = cfgMode ? 0 : fast ? 60 : 95, hi = cfgMode ? 9999 : fast ? 200 : 130;
  const verdict = problem ? (problem.missing ? 'MISSING' : problem.error ? 'ERROR' : `STUCK at mission ${(problem.stuckAt ?? 0) + 1}`)
    : avg! < lo ? 'too short' : avg! > hi ? 'too long' : 'ok';
  if (verdict !== 'ok') bad++;
  console.log(`${id.padEnd(10)} ${String(avg ?? '-').padStart(4)}s  runs=${secs.join(',')}  missions=${rs[0].stages.join('/')}  ${verdict}${problem?.error ? `\n   ${problem.error}` : ''}`);
}
process.exit(bad ? 1 : 0);
