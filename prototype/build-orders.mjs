/* Builds the throwaway "orders" prototype by patching index.html.
   A transform rather than a fork, so what the prototype changes stays legible. */
import fs from 'node:fs';

let s = fs.readFileSync('/home/user/bitforge/index.html', 'utf8');
const sub = (find, repl, label) => {
  if (!s.includes(find)) { console.error('MISS:', label); process.exit(1); }
  s = s.replace(find, repl);
};

/* ---- 1. strip the document wrapper; the artifact host supplies it ---- */
s = s.slice(s.indexOf('<title>'));                      // drop doctype/html/head-meta/links
// The charset has to survive: this file is also meant to be opened straight off
// disk, where there is no Content-Type header to fall back on and every em dash
// in the copy would otherwise arrive as mojibake.
s = '<meta charset="utf-8">\n' + s;
s = s.replace('</head>\n<body>', '');
s = s.replace(/<\/body>\s*<\/html>\s*$/, '');

/* ---- 2. drop the service worker: no sw.js is served beside a prototype ---- */
sub(`if('serviceWorker' in navigator && location.protocol === 'https:'){
  window.addEventListener('load', () => {
    // Fails harmlessly inside sandboxed embeds such as itch.io's iframe.
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}`, '/* service worker removed in the prototype */', 'sw');

/* ---- 3. its own storage, so a real save and best score are never touched ---- */
sub(`const SAVE_KEY = 'xor2048.save.xor.v2';
const BEST_KEY = 'xor2048.best.xor.v2';
const TUT_KEY  = 'xor2048.tutorial.xor.v2';`,
`const SAVE_KEY = 'proto.orders.save.v1';
const BEST_KEY = 'proto.orders.best.v1';
const TUT_KEY  = 'proto.orders.tutorial.v1';

/* ---------- PROTOTYPE: orders with a tightening deadline ----------
   The board names a byte. Forge it before the counter runs out, and the next one
   arrives with less time. Deadline n = 200 - 12n, so it reaches zero at order 17
   and the run cannot go on for ever.

   Chosen from simulation: careful play gets a median 7 orders over 497 moves and
   stays ahead of play that just merges fast (380). Targets are 4-8 bits because
   anything smaller is routinely satisfied by a spawn, with no play involved. */
const ORDER_START = 200, ORDER_STEP = 12, ORDER_BITS = [4, 8];
let target = 255, left = ORDER_START, orders = 0;

function drawTarget(){
  const [lo, hi] = ORDER_BITS;
  const k = lo + Math.floor(Math.random() * (hi - lo + 1));
  const bits = [0,1,2,3,4,5,6,7].sort(() => Math.random() - .5).slice(0, k);
  return bits.reduce((a, b) => a | (1 << b), 0);
}
const deadlineFor = n => Math.max(0, ORDER_START - ORDER_STEP * n);
const bits8 = v => v.toString(2).padStart(8, '0');`, 'keys');

/* ---- 4. persist the order state with the run ---- */
sub(`store.set(SAVE_KEY, JSON.stringify({ grid, score, moves, won, over, shiftsUsed }));`,
    `store.set(SAVE_KEY, JSON.stringify({ grid, score, moves, won, over, shiftsUsed, target, left, orders }));`, 'save');
sub(`    won = !!s.won;
    over = !!s.over;
    return true;`,
`    won = !!s.won;
    over = !!s.over;
    target = Number(s.target) || 255;
    left = Number(s.left) || 0;
    orders = Number(s.orders) || 0;
    return true;`, 'load');

/* ---- 5. forging the target clears it and names the next, instead of ending ---- */
sub(`function checkMilestones(){
  if(won) return;
  if(grid.flat().some(v => v === 255)){
    // Forging the register ends the run rather than continuing past it.
    won = true; over = true;
    armed = false;
    setMsg(\`11111111 forged in \${moves} moves. Score \${score}.\`, 'win');
    renderTools();
    showOver();
  }
}`,
`function checkMilestones(){
  if(over) return;
  let hit = false;
  for(let r=0;r<SIZE && !hit;r++) for(let c=0;c<SIZE && !hit;c++){
    // The forged byte is CONSUMED — spent, the way a cancelling pair is. It is
    // never turned into a tile that refuses to merge.
    if(grid[r][c] === target){ grid[r][c] = 0; hit = true; }
  }
  if(hit){
    orders++;
    score += 40;
    won = true;
    left = deadlineFor(orders);
    target = drawTarget();
    syncTiles();
    // move() renders before it calls this, so the header would otherwise show the
    // filled order and its spent counter for one more move.
    renderStats();
    if(left <= 0){ endRun('The last order was the last one. No time is left.'); return; }
    setMsg(\`Order filled. Next: \${bits8(target)} — \${left} moves.\`, 'win');
  } else if(left <= 0){
    endRun(\`Out of moves on \${bits8(target)}.\`);
  }
}

function endRun(why){
  over = true;
  armed = false;
  setMsg(why, 'nudge');
  renderTools();
  showOver();
}`, 'milestones');

/* ---- 6. a move spends one from the counter ---- */
sub(`  score += res.gained;
  moves++;`, `  score += res.gained;
  moves++;
  left--;`, 'countdown');

/* ---- 7. header reads the order and the counter ---- */
sub(`    <div class="stat" id="goal"><div class="k" id="goalk">Goal</div><div class="v" id="goalv">11111111</div></div>
    <div class="stat"><div class="k">Moves</div><div class="v" id="moves">0</div></div>`,
`    <div class="stat" id="goal"><div class="k" id="goalk">Order</div><div class="v" id="goalv">11111111</div></div>
    <div class="stat" id="left"><div class="k">Moves left</div><div class="v" id="leftv">0</div></div>`, 'bar');

sub(`  document.getElementById('score').textContent = score;
  document.getElementById('moves').textContent = moves;
  document.getElementById('bestv').textContent = best;`,
`  document.getElementById('score').textContent = score;
  document.getElementById('bestv').textContent = best;
  document.getElementById('goalv').textContent = bits8(target);
  const lv = document.getElementById('leftv');
  lv.textContent = Math.max(0, left);
  lv.style.color = left <= 15 ? 'var(--bad, #ff6b6b)' : '';`, 'stats');

/* ---- 8. a new run starts on a fresh order ---- */
sub(`  score = 0; moves = 0; won = false; over = false;`,
    `  score = 0; moves = 0; won = false; over = false;
  orders = 0; target = drawTarget(); left = ORDER_START;`, 'newgame');

/* ---- 9. the end panel reports orders, not a forged register ---- */
sub(`  document.getElementById('over-title').textContent = 'Register forged';
  document.getElementById('over-reg').textContent = '11111111';
  document.getElementById('over-sub').textContent = '255 — every bit set.';
  document.getElementById('over-score').textContent = score;
  document.getElementById('over-moves').textContent = moves;`,
`  document.getElementById('over-title').textContent = orders ? 'Run over' : 'No orders filled';
  document.getElementById('over-reg').textContent = String(orders);
  document.getElementById('over-sub').textContent = orders === 1 ? 'order filled' : 'orders filled';
  document.getElementById('over-score').textContent = score;
  document.getElementById('over-moves').textContent = moves;`, 'over');

/* ---- 10. the tutorial teaches the old goal, so skip straight into a run ---- */
sub(`  } else if(store.get(TUT_KEY) === 'done'){
    startNormalGame();
  } else {
    startTutorial();
  }`, `  } else {
    startNormalGame();
  }`, 'boot');

/* ---- 11. say what the game is now ---- */
sub(`+ 'same slot cancel, a <b>1</b> with a <b>0</b> makes a <b>1</b>. Equal tiles vanish to '
+ '<b>0</b>. Every 50 points earns a <b>&lt;&lt;</b> shift that doubles a tile. Forge '
+ '<b>11111111</b> (255).';`,
`+ 'same slot cancel, a <b>1</b> with a <b>0</b> makes a <b>1</b>. Equal tiles vanish to '
+ '<b>0</b>. Every 50 points earns a <b>&lt;&lt;</b> shift that doubles a tile. Forge the '
+ '<b>order</b> shown above before the moves run out — each one you fill gives you less time.';`, 'legend');

/* ---- 12. mark it as a prototype on screen ---- */
sub(`  <div class="topbar">`, `  <div style="background:#2a2417;border:1px solid #6b5a2a;color:#ffd166;border-radius:8px;
    padding:8px 12px;margin:0 0 10px;font-size:12.5px;line-height:1.45">
    <b>Prototype — not the game.</b> Rough test of one endless idea: the board names an
    order, you forge it before the counter runs out, and each one gives less time. Its
    score is kept separately and cannot touch your real best.
  </div>
  <div class="topbar">`, 'banner');

sub(`      setMsg(\`11111111 forged in \${moves} moves. Score \${score}.\`, 'win');`,
    `      setMsg(\`Run over — \${orders} filled, score \${score}.\`, 'win');`, 'resume');

sub(`<title>BitForge 255</title>`, `<title>BitForge Orders Prototype</title>`, 'title');

fs.writeFileSync('/home/user/bitforge/prototype/orders.html', s);
console.log('built prototype/orders.html —', s.length, 'bytes');
