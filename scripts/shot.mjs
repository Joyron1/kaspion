#!/usr/bin/env node
// Screenshot a page of the running app, optionally after starting a level.
//   node scripts/shot.mjs http://localhost:3200/play/family?bot=1 out.png --start --wait=8000
//   node scripts/shot.mjs "http://localhost:3200/dev/scene/eye?t=3&p=0.6" out.png
// With --start it presses "יאללה!" and lets the child bot play for --wait ms.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const [url, out, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const wait = Number(opt.wait ?? 2500);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(opt.w ?? 1024), height: Number(opt.h ?? 640) } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
if (opt.start) {
  await page.getByRole('button', { name: /יאללה/ }).click();
  // steer toward targets like the play-tester does, so the shot shows real play
  const t0 = Date.now();
  let down = false;
  while (Date.now() - t0 < wait) {
    const st = await page.evaluate(() => window.__kaspion && { live: window.__kaspion.live, t: window.__kaspion.targets(), h: window.__kaspion.hero() });
    if (st?.live && st.t.length) {
      const p = st.t.reduce((b, q) => (Math.hypot(q.x - st.h.x, q.y - st.h.y) < Math.hypot(b.x - st.h.x, b.y - st.h.y) ? q : b));
      if (!down) { await page.mouse.move(p.x, p.y); await page.mouse.down(); down = true; } else await page.mouse.move(p.x, p.y);
    }
    await page.waitForTimeout(120);
  }
  if (down) await page.mouse.up();
} else {
  await page.waitForTimeout(wait);
}
await page.screenshot({ path: out });
console.log(JSON.stringify({ saved: out, errors }));
await browser.close();
