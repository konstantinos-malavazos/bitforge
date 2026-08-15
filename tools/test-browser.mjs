#!/usr/bin/env node
/* BitForge browser tests — drives the real index.html in a real browser.
 *
 *   npm i playwright          # from the repo root; node_modules/ is already gitignored
 *   node tools/test-browser.mjs
 *
 * Playwright is deliberately not in a package.json: the game ships as a single file with
 * no build step and no dependencies, and that is worth keeping. Install it in the repo
 * root and it stays out of the tree. NODE_PATH does not work here — ESM resolves
 * packages by walking up from this file, so the install has to be somewhere above it.
 *
 * A browser is used rather than a DOM stub because the things most likely to break are
 * the things a stub fakes: the slide animation reconciling against `grid`, localStorage
 * round-trips, and the stat bar being rendered at the right moment in a move. The
 * header-lag assertion below exists because a throwaway prototype shipped that bug and
 * only playing it found it.
 *
 * CHROME can override the browser path. The default matches the image this repo is
 * usually worked on from.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8099;

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = '/opt/pw-browsers';
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).sort().reverse()) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;   // let playwright fall back to its own download
}

/* charset=utf-8 is not optional. Without it every em dash in index.html renders as
   mojibake and the page looks broken for reasons that have nothing to do with the test. */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png':  'image/png',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(name + (extra ? ` — ${extra}` : ''));

await page.goto(`http://localhost:${PORT}/index.html`);
// Start as a returning player would, past the tutorial.
await page.evaluate(() => localStorage.setItem('xor2048.tutorial.xor.v2', 'done'));
await page.reload();
await page.waitForTimeout(200);

/* ---------- classic is untouched ---------- */
let s = await page.evaluate(() => ({
  mode, best,
  goalk: document.getElementById('goalk').textContent,
  goalv: document.getElementById('goalv').textContent,
  bestk: document.getElementById('bestk').textContent,
}));
check('boots into classic', s.mode === 'classic', s.mode);
check('classic goal label', s.goalk === 'Goal', s.goalk);
check('classic goal value', s.goalv === '11111111', s.goalv);
check('classic best label', s.bestk === 'Best', s.bestk);

await page.evaluate(() => {
  window.spawn = () => false;
  grid = [[255,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  checkMilestones();
});
check('classic still ends on 255', await page.evaluate(() => over === true && won === true));

/* ---------- switching to orders ---------- */
await page.evaluate(() => document.getElementById('mode').click());
await page.waitForTimeout(100);
s = await page.evaluate(() => ({
  mode, order, filled, over, won, pc: popcount(order), orderBin: bin(order),
  goalk: document.getElementById('goalk').textContent,
  goalv: document.getElementById('goalv').textContent,
  bestk: document.getElementById('bestk').textContent,
  btn: document.getElementById('mode').textContent,
}));
check('switches to orders', s.mode === 'orders', s.mode);
check('button now offers classic', s.btn === 'Classic', s.btn);
check('first order has 4-8 bits', s.pc >= 4 && s.pc <= 8, 'popcount ' + s.pc);
check('order label counts', s.goalk === 'Order 1', s.goalk);
check('order shown in binary', s.goalv === s.orderBin, s.goalv);
check('best is relabelled', s.bestk === 'Most orders', s.bestk);
check('orders run is not over', s.over === false && s.won === false);

// The four-bit floor is the whole reason orders are buildable rather than handed over.
const draws = await page.evaluate(() => {
  let lo = 8, hi = 0;
  for (let i = 0; i < 2000; i++) { const k = popcount(drawOrder()); lo = Math.min(lo,k); hi = Math.max(hi,k); }
  return { lo, hi };
});
check('2000 draws stay within 4-8 bits', draws.lo >= 4 && draws.hi <= 8, `${draws.lo}-${draws.hi}`);

/* ---------- filling an order ---------- */
const fill = await page.evaluate(() => {
  window.spawn = () => false;
  const T = order, before = filled;
  grid = [[T,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  checkOrders();
  return { before, filled, cleared: grid[0][0] === 0, over, won, pc: popcount(order) };
});
check('forged order is consumed', fill.cleared);
check('filled count rises', fill.filled === fill.before + 1);
check('next order is valid', fill.pc >= 4 && fill.pc <= 8);
check('filling does not end the run', fill.over === false && fill.won === false);

await page.evaluate(() => { grid = [[255,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; checkMilestones(); });
check('255 does not end an orders run', await page.evaluate(() => over === false && won === false));

/* ---------- the header-lag bug ----------
   Fill an order with a real move and confirm the bar names the NEXT order. The prototype
   ran its equivalent check after renderStats and showed the filled order for one more move. */
const lag = await page.evaluate(() => {
  window.spawn = () => false;
  const T = order;
  const a = T & -T;      // lowest set bit
  const b = T ^ a;       // everything else
  grid = [[a,b,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  // The next order is pinned. Drawn at random it can come back equal to the one just
  // filled — 11111111 is one byte in five draws of eight bits — and the assertion below
  // would fail for a reason that has nothing to do with the bug it guards.
  const before = filled, real = drawOrder;
  const NEXT = T === 0b11110000 ? 0b00001111 : 0b11110000;
  drawOrder = () => NEXT;
  move('left');
  drawOrder = real;
  return { targetBin: bin(T), shown: document.getElementById('goalv').textContent,
           orderBin: bin(order), nextBin: bin(NEXT), before, filled };
});
check('the move filled the order', lag.filled === lag.before + 1, `${lag.before} -> ${lag.filled}`);
check('bar does not lag a filled order', lag.shown !== lag.targetBin, 'bar showed ' + lag.shown);
check('bar shows the order just drawn', lag.shown === lag.nextBin, `${lag.shown} vs ${lag.nextBin}`);
check('and that is the live order', lag.orderBin === lag.nextBin, `${lag.orderBin} vs ${lag.nextBin}`);

/* ---------- a shift can finish an order ---------- */
const viaShift = await page.evaluate(() => {
  window.spawn = () => false;
  score = 500; shiftsUsed = 0;
  const T = order & ~1;                 // a byte with bit 0 clear, so a shift can land on it
  if (!T || popcount(T) < 1) return { skipped: true };
  order = T;
  grid = [[T >> 1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  const before = filled;
  armShift(); pick = { r: 0, c: 0 }; applyShift(0, 0);
  return { skipped: false, before, filled, cleared: grid[0][0] === 0 };
});
check('a shift can fill an order', viaShift.skipped || viaShift.filled === viaShift.before + 1,
  viaShift.skipped ? 'skipped, order had no shiftable form' : '');

/* ---------- saves are per mode ---------- */
const keys = await page.evaluate(() => {
  saveGame();
  return {
    orders:  !!localStorage.getItem('xor2048.save.orders.v1'),
    classic: !!localStorage.getItem('xor2048.save.xor.v2'),
    best:    !!localStorage.getItem('xor2048.best.orders.v1'),
  };
});
check('orders saves under its own key', keys.orders);
check('classic save is still there', keys.classic);
check('orders best is separate', keys.best);

const round = await page.evaluate(() => {
  const oFilled = filled, oOrder = order;
  setMode('classic');
  const cMode = mode, cGoal = document.getElementById('goalk').textContent;
  setMode('orders');
  return { cMode, cGoal, kept: filled === oFilled && order === oOrder, mode };
});
check('switching back reaches classic', round.cMode === 'classic' && round.cGoal === 'Goal');
check('the orders run survives a round trip', round.kept);
check('and lands back in orders', round.mode === 'orders');

await page.reload();
await page.waitForTimeout(200);
const kept = await page.evaluate(() => ({ mode, pc: popcount(order) }));
check('mode survives a reload', kept.mode === 'orders', kept.mode);
check('restored order is valid', kept.pc >= 4 && kept.pc <= 8, 'popcount ' + kept.pc);

// A save carrying a byte this mode could not have drawn must be replaced, not trusted.
const repaired = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('xor2048.save.orders.v1'));
  raw.order = 1;                        // one bit: below the floor, and a spawn would fill it
  localStorage.setItem('xor2048.save.orders.v1', JSON.stringify(raw));
  loadGame();
  return popcount(order);
});
check('an out-of-range saved order is redrawn', repaired >= 4 && repaired <= 8, 'popcount ' + repaired);

/* ---------- a long run ----------
   Random directions, not a fixed cycle: left/up/right/down oscillates and is a far worse
   policy than chance. The simulator puts random play at a 322-459 move median per target. */
const run = await page.evaluate(() => {
  setMode('classic'); setMode('orders'); startRun();
  const dirs = ['left','up','right','down'];
  for (let i = 0; i < 2500; i++) move(dirs[Math.floor(Math.random() * 4)]);
  return { filled, moves, over, won, pc: popcount(order) };
});
check('2500 moves do not end the run', run.over === false && run.won === false);
check('moves actually advanced', run.moves > 2000, 'moves ' + run.moves);
check('random play fills orders', run.filled > 0, 'filled ' + run.filled);
check('order is still valid after a long run', run.pc >= 4 && run.pc <= 8);

check('no page errors', errors.length === 0, errors.join(' | '));

for (const t of ok) console.log('  ok   ' + t);
for (const t of bad) console.log('  FAIL ' + t);
console.log(`\n${ok.length} passed, ${bad.length} failed`);

await browser.close();
server.close();
process.exit(bad.length ? 1 : 0);
