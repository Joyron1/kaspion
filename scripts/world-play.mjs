#!/usr/bin/env node
// Play stations of the 3D journey with the bot and take screenshots along the way.
//   node scripts/world-play.mjs http://localhost:3200 --from=1 --to=3 --out=/tmp/shots [--human]
// --human: no bot; just screenshots of a station's game after it starts (the game waits for taps).

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const [base, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const from = Number(opt.from ?? 1), to = Number(opt.to ?? from);
const out = opt.out ?? '.';
const w = Number(opt.w ?? 1024), h = Number(opt.h ?? 640);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|speech/i.test(m.text())) errors.push(m.text()); });
await page.goto(`${base}/world${opt.human ? '' : '?bot=1'}`, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => window.__world, null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/ready.png` });
await page.getByRole('button', { name: String(from), exact: true }).click();
const state = () => page.evaluate(() => window.__world.state());
const report = [];
for (let st = from - 1; st < to; st++) {
  const t0 = Date.now();
  let shotTravel = false, shotPlay = 0, playStart = 0;
  for (;;) {
    const s = await state();
    if (s.station !== st && s.phase === 'travel' && Date.now() - t0 > 2000) break;
    if (s.phase === 'end') break;
    if (s.phase === 'travel' && !shotTravel && Date.now() - t0 > 1200) { shotTravel = true; await page.screenshot({ path: `${out}/s${st + 1}-travel.png` }); }
    if (s.phase === 'play') {
      if (!playStart) playStart = Date.now();
      const since = Date.now() - playStart;
      if (shotPlay === 0 && since > 2500) { shotPlay = 1; await page.screenshot({ path: `${out}/s${st + 1}-play-a.png` }); }
      if (shotPlay === 1 && since > (opt.human ? 6000 : 9000)) {
        shotPlay = 2; await page.screenshot({ path: `${out}/s${st + 1}-play-b.png` });
        if (opt.human) break;
      }
    }
    if (s.phase === 'won' && shotPlay < 3) { shotPlay = 3; await page.screenshot({ path: `${out}/s${st + 1}-won.png` }); }
    if (Date.now() - t0 > Number(opt.limit ?? 420) * 1000) { errors.push(`station ${st + 1} timed out in ${s.phase}`); break; }
    await page.waitForTimeout(200);
  }
  report.push({ station: st + 1, seconds: Math.round((Date.now() - t0) / 1000) });
}
console.log(JSON.stringify({ report, errors }, null, 1));
await browser.close();
