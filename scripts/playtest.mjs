#!/usr/bin/env node
// Automated play-tester: plays levels like a young child would and reports how long each takes.
//
//   node scripts/playtest.mjs [baseUrl] [--levels=silver,family] [--runs=2] [--profile=child|fast] [--shots=dir]
//
// "child" pauses before each move, wanders off now and then and drags a bit
// imprecisely, which is closer to a 4-year-old than a perfect bot.
// Needs the app running (npm run build && npm start) and Playwright.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const [k, v] = a.slice(2).split('=');
  return [k, v ?? 'true'];
}));
const base = process.argv.slice(2).find(a => !a.startsWith('--')) || 'http://localhost:3000';
const runs = Number(args.runs || 1);
const profile = args.profile || 'child';
const shots = args.shots;
if (shots) mkdirSync(shots, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

async function listLevels(page) {
  await page.goto(`${base}/play`);
  return page.$$eval('a[href^="/play/"]', as => as.map(a => a.getAttribute('href').split('/').pop()));
}

async function playOnce(browser, id, run) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}/play/${id}?bot=1`);
  await page.waitForFunction(() => window.__kaspion, null, { timeout: 15000 });
  await sleep(profile === 'child' ? 1500 : 200); // "listening" to the intro
  await page.getByRole('button', { name: /יאללה/ }).click();

  const t0 = Date.now();
  const LIMIT = 420_000;
  let lastStage = -1, pauseUntil = 0, wanderUntil = 0, wanderPt = null, down = false;
  let shotN = 0;
  while (Date.now() - t0 < LIMIT) {
    const st = await page.evaluate(() => {
      const k = window.__kaspion;
      return k ? { mode: k.mode, stage: k.stage, live: k.live, targets: k.targets(), hero: k.hero(), elapsed: k.elapsed, stageTimes: k.stageTimes } : null;
    });
    if (!st) break;
    if (st.mode === 'done') {
      if (down) await page.mouse.up();
      if (shots) await page.screenshot({ path: `${shots}/${id}-done.png` });
      await page.close();
      return { id, run, seconds: Math.round(st.elapsed), stages: st.stageTimes, errors };
    }
    const now = Date.now();
    if (st.stage !== lastStage) {
      if (shots && lastStage >= 0) await page.screenshot({ path: `${shots}/${id}-s${lastStage + 1}.png` });
      lastStage = st.stage;
      pauseUntil = now + (profile === 'child' ? rnd(1500, 3000) : 300); // listening to the new mission
    }
    if (shots && shotN === 0 && st.live && now - t0 > 6000) { shotN++; await page.screenshot({ path: `${shots}/${id}-play.png` }); }
    if (!st.live || now < pauseUntil) {
      if (down) { await page.mouse.up(); down = false; }
      await sleep(120);
      continue;
    }
    let goal;
    if (profile === 'child' && now < wanderUntil && wanderPt) goal = wanderPt;
    else if (profile === 'child' && Math.random() < 0.012) {
      wanderUntil = now + rnd(700, 1600);
      wanderPt = { x: rnd(80, 944), y: rnd(140, 560) };
      goal = wanderPt;
    } else if (st.targets.length) {
      const h = st.hero;
      goal = st.targets.reduce((b, p) => (Math.hypot(p.x - h.x, p.y - h.y) < Math.hypot(b.x - h.x, b.y - h.y) ? p : b));
      if (profile === 'child') goal = { x: goal.x + rnd(-14, 14), y: goal.y + rnd(-14, 14) };
    } else {
      // nothing to aim at (e.g. waiting for something to appear): drift around
      goal = { x: 512 + Math.sin(now / 900) * 250, y: 360 + Math.cos(now / 1300) * 120 };
    }
    const gx = Math.max(4, Math.min(1020, goal.x)), gy = Math.max(100, Math.min(636, goal.y));
    if (!down) { await page.mouse.move(gx, gy); await page.mouse.down(); down = true; }
    else await page.mouse.move(gx, gy, { steps: 2 });
    // a child lifts the finger once the fish arrives, then taps again
    if (profile === 'child' && Math.hypot(st.hero.x - gx, st.hero.y - gy) < 30 && Math.random() < 0.3) {
      await page.mouse.up(); down = false; pauseUntil = now + rnd(300, 900);
    }
    await sleep(110);
  }
  const last = await page.evaluate(() => window.__kaspion && { stage: window.__kaspion.stage, elapsed: window.__kaspion.elapsed });
  if (shots) await page.screenshot({ path: `${shots}/${id}-timeout.png` });
  await page.close();
  return { id, run, seconds: null, stuckAtStage: last?.stage, elapsed: last?.elapsed, errors };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const index = await browser.newPage();
let levels = args.levels ? args.levels.split(',') : await listLevels(index);
await index.close();
const results = [];
for (const id of levels) {
  for (let r = 0; r < runs; r++) {
    const res = await playOnce(browser, id, r);
    results.push(res);
    const verdict = res.seconds == null ? 'STUCK' : res.seconds < 90 ? 'short' : res.seconds > 180 ? 'long' : 'ok';
    console.log(JSON.stringify({ ...res, verdict }));
  }
}
await browser.close();
