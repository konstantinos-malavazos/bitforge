#!/usr/bin/env node
/* BitForge balance simulator — no dependencies, run with node.
 *
 *   node tools/simulate.mjs                 # validate against the README numbers
 *   node tools/simulate.mjs cadence         # moves to forge each successive register
 *   node tools/simulate.mjs dry             # moves that merge nothing, chosen and forced
 *   node tools/simulate.mjs ceiling         # the score-per-move ceiling
 *   node tools/simulate.mjs orders          # moves to forge an arbitrary target byte
 *
 * The rules below mirror index.html. Change one there and it has to change here, or
 * every number this prints is about a different game. `validate` exists to catch that:
 * it replays the measurements already recorded in README > Balance notes, so a
 * simulator that has drifted says so before anyone trusts it.
 */

const SIZE = 4;
const DIRS = ['left', 'right', 'up', 'down'];
const SHIFT_COST = 50;

/* ---------- rules, mirrored from index.html ---------- */

const popcount = n => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };

function randomTile() {
  const r = Math.random();
  let k;
  if (r < .40) k = 0; else if (r < .60) k = 1; else if (r < .75) k = 2;
  else if (r < .85) k = 3; else if (r < .92) k = 4; else if (r < .96) k = 5;
  else if (r < .985) k = 6; else k = 7;
  return 1 << k;
}

const coord = (dir, i, j) =>
  dir === 'left' ? [i, j] :
  dir === 'right' ? [i, SIZE - 1 - j] :
  dir === 'up' ? [j, i] : [SIZE - 1 - j, i];

// Tiles pack toward the swiped edge, then pair off two at a time from that edge.
// Advancing by 2 on a merge is what stops a tile merging twice in one move.
function mergeLine(line) {
  const tiles = line.filter(v => v !== 0);
  const out = [];
  let gained = 0, merges = 0;
  const vanished = [];
  for (let i = 0; i < tiles.length;) {
    if (i + 1 >= tiles.length) { out.push(tiles[i]); i += 1; continue; }
    const m = tiles[i] ^ tiles[i + 1];
    if (m !== 0) { out.push(m); gained += popcount(m); merges++; }
    else vanished.push(out.length);   // equal tiles cancel, and both are gone
    i += 2;
  }
  while (out.length < SIZE) out.push(0);
  return { out, gained, merges, vanished };
}

function applyMove(grid, dir) {
  const before = grid.flat().join(',');
  let gained = 0, merges = 0;
  const avoid = new Set();
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) { const [r, c] = coord(dir, i, j); line.push(grid[r][c]); }
    const res = mergeLine(line);
    gained += res.gained; merges += res.merges;
    for (const j of res.vanished) { const [r, c] = coord(dir, i, j); avoid.add(r + ',' + c); }
    for (let j = 0; j < SIZE; j++) { const [r, c] = coord(dir, i, j); grid[r][c] = res.out[j]; }
  }
  return { changed: grid.flat().join(',') !== before, gained, merges, avoid };
}

// `avoid` holds the cells where a pair just annihilated — only ever a preference.
function spawn(grid, avoid) {
  let free = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) free.push([r, c]);
  if (!free.length) return false;
  if (avoid && avoid.size) {
    const clear = free.filter(([r, c]) => !avoid.has(r + ',' + c));
    if (clear.length) free = clear;
  }
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  grid[r][c] = randomTile();
  return true;
}

const clone = g => g.map(r => r.slice());
const newGrid = () => {
  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  spawn(g); spawn(g);
  return g;
};

/* ---------- policies ----------
 * register   drives one tile toward a full register — the player the game is written for
 * throughput takes the biggest merge available every move and never nurses a lead tile
 * nodry      never makes a move that merges nothing, if it has any other option
 * random     picks uniformly among the moves that change the board
 *
 * A greedy search scores worse than random until it is paid for finishing, so reaching
 * the target dominates every other term in the evaluation.
 */

// Value of a position aiming at target byte T. For T = 255 nothing is ever "outside"
// the target, so the penalty terms fall away and this is just register-driving play.
function evalTo(g, T) {
  const tiles = g.flat().filter(v => v);
  if (tiles.some(v => v === T)) return 1e7;
  const worth = v => popcount(v & T) - popcount(v & ~T);
  let lead = 0, leadWorth = -99;
  for (const v of tiles) {
    const w = worth(v);
    if (w > leadWorth || (w === leadWorth && v > lead)) { leadWorth = w; lead = v; }
  }
  const need = T & ~lead;
  let cover = 0, bestPartner = 0, seenLead = false;
  for (const v of tiles) {
    if (v === lead && !seenLead) { seenLead = true; continue; }
    cover |= v & need;
    const useful = popcount(v & need) - popcount(v & lead) - popcount(v & ~T);
    if (useful > bestPartner) bestPartner = useful;
  }
  return 1000 * leadWorth + 120 * popcount(cover) + 200 * bestPartner + 8 * tiles.length;
}

const canShift = v => v > 0 && !(v & 128);

// Spend charges while a shift improves the position. Under XOR nothing carries, so this
// is the only way to bit 7 short of waiting for a literal 128 spawn.
function useCharges(g, charges, policy, T) {
  let used = 0;
  while (used < charges) {
    if (policy === 'random') {
      const opts = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (canShift(g[r][c])) opts.push([r, c]);
      if (!opts.length) break;
      const [r, c] = opts[Math.floor(Math.random() * opts.length)];
      g[r][c] <<= 1; used++; continue;
    }
    let best = null, bestVal = evalTo(g, T);
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!canShift(g[r][c])) continue;
      const v = g[r][c];
      g[r][c] = v << 1;
      const val = evalTo(g, T);
      g[r][c] = v;
      if (val > bestVal) { bestVal = val; best = [r, c]; }
    }
    if (!best) break;              // nothing worth spending on; bank the charge
    g[best[0]][best[1]] <<= 1; used++;
  }
  return used;
}

/* One run.
 *   policy      register | throughput | nodry | random
 *   target      255, or 'orders' to draw a fresh target byte after each forge
 *   orderBits   [min,max] popcount for drawn targets
 *   consume     clear the target tile on forge and keep playing, instead of stopping
 *   shiftCost   null to play with no tool
 *   maxMoves    hard cap
 */
function playRun(opts = {}) {
  const {
    policy = 'register', target = 255, orderBits = [4, 8], consume = false,
    shiftCost = SHIFT_COST, maxMoves = 3000,
  } = opts;

  const drawTarget = () => {
    if (target !== 'orders') return target;
    const [lo, hi] = orderBits;
    const k = lo + Math.floor(Math.random() * (hi - lo + 1));
    const bits = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - .5).slice(0, k);
    return bits.reduce((a, b) => a | (1 << b), 0);
  };

  const g = newGrid();
  let T = drawTarget();
  let score = 0, moves = 0, spent = 0, forged = 0;
  let dry = 0, forcedDry = 0, cancels = 0, peak = 0, occSum = 0, lastForge = 0;
  const gaps = [];

  while (moves < maxMoves) {
    if (shiftCost != null) {
      const charges = Math.floor(score / shiftCost) - spent;
      if (charges > 0) spent += useCharges(g, charges, policy, T);
      if (g.flat().some(v => v === T) && !consume) { forged++; gaps.push(moves - lastForge); break; }
    }

    const legal = [];
    let anyMerge = false;
    for (const d of DIRS) {
      const t = clone(g);
      const res = applyMove(t, d);
      if (!res.changed) continue;
      legal.push({ d, res, t });
      if (res.merges) anyMerge = true;
    }
    if (!legal.length) break;      // unreachable in practice: a full board always merges

    let pick;
    if (policy === 'random') pick = legal[Math.floor(Math.random() * legal.length)];
    else {
      let bestVal = -Infinity;
      for (const o of legal) {
        let v = policy === 'throughput'
          ? 1000 * o.res.gained + evalTo(o.t, T) / 1000
          : evalTo(o.t, T) + 3 * o.res.gained;
        if (policy !== 'register' && !o.res.merges) v -= 20000;
        if (v > bestVal) { bestVal = v; pick = o; }
      }
    }

    const res = applyMove(g, pick.d);
    moves++; score += res.gained; cancels += res.avoid.size;
    if (!res.merges) { dry++; if (!anyMerge) forcedDry++; }
    spawn(g, res.avoid);
    const occ = g.flat().filter(v => v).length;
    peak = Math.max(peak, occ); occSum += occ;

    let hit = false;
    for (let r = 0; r < SIZE && !hit; r++) for (let c = 0; c < SIZE && !hit; c++) {
      if (g[r][c] === T) { hit = true; if (consume) g[r][c] = 0; }
    }
    if (hit) {
      forged++; gaps.push(moves - lastForge); lastForge = moves;
      if (!consume) break;
      T = drawTarget();
    }
  }

  return { moves, score, forged, gaps, dry, forcedDry, cancels, peak,
           won: forged > 0, spent, avgOcc: occSum / Math.max(1, moves),
           scorePerMove: score / Math.max(1, moves) };
}

/* ---------- reporting ---------- */

const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const runs = (n, o) => Array.from({ length: n }, () => playRun(o));
const pad = (v, n) => String(v).padStart(n);

function validate(n = 1500) {
  console.log('Replaying README > Balance notes. Medians are moves to forge the register.');
  console.log('Recorded: no tool 199, shift at 50 points 75, and the skill gap peaking at 50.');
  console.log('A rebuilt simulator lands near those rather than on them — 180 / 62 / peak at 50');
  console.log('was the last rebuild. Treat a wide miss as drift from index.html, not as balance.\n');
  console.log('                       median   p90   random   skill gap');
  for (const [label, shiftCost] of [['no tool', null], ['shift at 25', 25], ['shift at 50', 50],
                                    ['shift at 100', 100], ['shift at 200', 200]]) {
    const reg = runs(n, { policy: 'register', shiftCost }).filter(r => r.won).map(r => r.moves);
    const rnd = runs(n, { policy: 'random', shiftCost }).filter(r => r.won).map(r => r.moves);
    console.log(label.padEnd(20), pad(median(reg), 6), pad(pctl(reg, .9), 5),
      pad(median(rnd), 8), pad((median(rnd) / median(reg)).toFixed(2) + 'x', 11));
  }
}

function cadence(n = 600) {
  const cap = 900;
  console.log(`Moves to forge register n, counted from the previous one. The register is`);
  console.log(`consumed on forge, so the board stays warm. ${n} runs of ${cap} moves.\n`);
  for (const policy of ['register', 'throughput', 'nodry', 'random']) {
    const rs = runs(n, { policy, consume: true, maxMoves: cap });
    const byIndex = [];
    for (const r of rs) r.gaps.forEach((g, i) => { (byIndex[i] ||= []).push(g); });
    const later = byIndex.slice(1).flat();
    console.log(policy.padEnd(11),
      'first', pad(byIndex[0] ? median(byIndex[0]) : '-', 4),
      '| #2 onward: median', pad(later.length ? median(later) : '-', 4),
      'mean', pad(later.length ? mean(later).toFixed(0) : '-', 4),
      'p10', pad(later.length ? pctl(later, .1) : '-', 4),
      'p90', pad(later.length ? pctl(later, .9) : '-', 4),
      '| registers per run', mean(rs.map(r => r.forged)).toFixed(1));
  }
  console.log('\nThe cadence is stationary: no ramp appears as a run goes on, so any');
  console.log('difficulty curve a mode wants has to be authored rather than inherited.');
}

function dryMoves(n = 400) {
  const cap = 1500;
  console.log('A move that merges nothing is "dry". Chosen dry is the rate a policy pays');
  console.log('by preference; forced dry is the rate at which NO direction merges at all.\n');
  for (const policy of ['register', 'throughput', 'nodry', 'random']) {
    const rs = runs(n, { policy, consume: true, maxMoves: cap });
    console.log(policy.padEnd(11),
      'chosen', pad((100 * mean(rs.map(r => r.dry / r.moves))).toFixed(2) + '%', 7),
      '| forced', pad((100 * mean(rs.map(r => r.forcedDry / r.moves))).toFixed(2) + '%', 6),
      '| cancels per 100 moves', pad((100 * mean(rs.map(r => r.cancels / r.moves))).toFixed(1), 5),
      '| occupancy avg', mean(rs.map(r => r.avgOcc)).toFixed(1),
      'peak', Math.max(...rs.map(r => r.peak)));
  }
  console.log('\nThe forced rate is the floor a "dry moves cost you" mechanic charges even');
  console.log('a player who never chooses one.');
}

function ceiling(n = 300) {
  console.log('Mean score per move as the move budget grows. A bounded, converging number');
  console.log('here is what lets a rising requirement end every run by construction.\n');
  console.log('                200 moves   800   3200');
  for (const policy of ['throughput', 'nodry', 'register', 'random']) {
    const row = [200, 800, 3200].map(cap =>
      pad(mean(runs(n, { policy, consume: true, maxMoves: cap }).map(r => r.scorePerMove)).toFixed(2), 6));
    console.log(policy.padEnd(14), row.join('  '));
  }
}

function orders(n = 400) {
  const cap = 1500;
  console.log('Moves to forge an arbitrary target byte, by how many slots it needs filled.');
  console.log('255 is not the hardest target — it is the only one with no wrong bits to avoid.\n');
  for (const bits of [[2, 3], [4, 5], [6, 7], [8, 8]]) {
    const out = [];
    for (const policy of ['register', 'random']) {
      const gaps = runs(n, { policy, target: 'orders', orderBits: bits, consume: true, maxMoves: cap })
        .flatMap(r => r.gaps);
      out.push(`${policy} median ${pad(median(gaps), 4)} p10 ${pad(pctl(gaps, .1), 3)} p90 ${pad(pctl(gaps, .9), 4)}`);
    }
    console.log(`${bits[0]}-${bits[1]} bits`.padEnd(11), out.join('  |  '));
  }
  console.log('\nTargets of three bits or fewer are routinely satisfied by a spawn, with no');
  console.log('play involved — note the p10. Any target-naming mode needs a floor of four.');
}

const CMDS = { validate, cadence, dry: dryMoves, ceiling, orders };
const cmd = process.argv[2] || 'validate';
if (!CMDS[cmd]) {
  console.error(`unknown command "${cmd}" — expected one of: ${Object.keys(CMDS).join(', ')}`);
  process.exit(1);
}
CMDS[cmd]();
