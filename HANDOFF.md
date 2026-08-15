# Handoff — orders is built, tuned, and still unplayed

**Next session's job:** the endless question is answered and shipped, and the mode has
since been tuned once. Every decision in it was made from simulation. **Nobody has
played it.** Get it played before changing anything else. Do not re-run the brainstorm.

Repo: `konstantinos-malavazos/bitforge` · one file, `index.html`, 1464 lines, no build
step, no dependencies, no framework.

**Branch:** start a new one from `main`
(`git fetch origin main && git checkout -B <branch> origin/main`). PRs #20, #21 and #22
are merged; never stack on merged history.

---

## What changed on main this session

Orders shipped. This is the first change to the game itself in three sessions.

| Where | What |
|---|---|
| `index.html` | Orders mode, reachable from a new button in the top bar. |
| `README.md` | New *Orders* section; the ramp measurements added to *Balance notes*. |
| `tools/simulate.mjs` | Three new commands, `hold`, `bank` and `think`. Now 618 lines. |
| `sw.js` | `CACHE` bumped to `bitforge-v7`. |
| `.gitignore` | `prototype/` and `node_modules` ignored — the latter without a trailing slash, so a *symlinked* install cannot slip past it. |
| `tools/test-browser.mjs` | 52 browser assertions over both modes. Needs playwright. |
| `CONTEXT.md` | The word list, and how to write for this owner. `/wait-what` points here. |

## The mode, in one paragraph

The bar names a byte. You forge it, it is taken off the board, another byte is named.
That repeats for as long as the player wants. There is no timer and no ending. **Best**
is relabelled **Most orders** and counts orders filled instead of points. **Two tiles
arrive each move here, against one in classic.** Classic is untouched and each mode keeps
its own board and its own record under its own keys, so switching parks a run rather than
discarding it.

---

## Four hard constraints

The first three are inherited and still hold. The fourth is new and came from the user.

**1. Tiles must always merge.** Confirmed by two removals in the user's own words: *"it is
stupid. You destroyed the merging and nullification"* and *"the gate does not merge. it
stacks"*. An idea whose stopping mechanism works by preventing a merge has already failed.

Consuming a forged tile is **not** blocking — it is what a cancelling pair already does.
That is the loophole orders uses, and the only reason the mode is legal here.

**2. The board provably cannot fill.** Every adjacent pair merges unconditionally, so no
board size can deadlock. The ending can never come from the board.

**3. Any ending counted in points pays the player to stop building.** Throughput play
scores 4.48 per move against 3.42 for register-building, at every payout tested up to 250.

**4. Never a timer.** The user's words, this session: *"never timer"*. This killed the
whole of last session's recommended design (orders with a tightening deadline) and every
substitute for it, because each one turns out to be a counter in a different coat — a
deadline per order, a move budget, a queue of orders backing up.

**The consequence is load-bearing and was accepted deliberately: with no timer, nothing
ends a run but the player.** That is why the record counts orders rather than points. Do
not "fix" this by reintroducing a clock under another name.

---

## Numbers worth having in your head

| | Skilled | Random |
|---|---|---|
| Moves per register, warm board (median) | 51 | 222 |
| Score per move | 3.42 | 2.93 |
| Score per move, pure throughput play | **4.48** | |
| Peak occupancy | 5 of 16 | bound is 9, never approached |

**Moves to forge an arbitrary target byte:** 2–3 bits 24, 4–5 bits 52, 6–7 bits 56, and
`11111111` itself 51. Flat above four bits — which is why bit count cannot be a ramp.
Below four bits a raw spawn routinely fills the target with no play at all, which is why
orders has a floor of four.

**Register cadence is stationary** — 62 moves for the first, then 50/50/52/50/53/53/55.
There is no natural difficulty curve to inherit; any ramp has to be authored.

## The ramp question — measured, unbuilt, and now second in line

Orders ships **without a ramp**. Order 20 is drawn exactly like order 2. Two candidates
are measured and neither is built, because which one to use is a question about feel.

**Ramp A — more bytes per order**, forged one at a time and consumed as they land.
`node tools/simulate.mjs bank`

| bytes | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| median moves | 58 | 138 | 212 | 287 | 364 |

Near-linear: the order gets *longer*, not harder. Three is the practical cap; four is a
287-move slog.

**Ramp B — the shift tool getting dearer per order.** Same command.

| `<<` cost | 25 | 50 | 100 | 200 | out of reach |
|---|---|---|---|---|---|
| median moves | 40 | 60 | 84 | 99 | 128 |

A 3.2× span that asymptotes once nobody can afford the tool. The order gets *slower*,
because the game takes the tool away.

**Dead — one order naming several bytes held on the board at once.**
`node tools/simulate.mjs hold`

| bytes at once | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| median moves | 59 | 1139 | — | — |
| runs completing one | 100% | 65% | 1% | 0% |

A cliff, not a ramp. Every adjacent pair merges unconditionally, so a finished byte
cannot be parked while the next is built — it gets eaten. Keep the corpse: it is also the
sharpest measure of how fragile a forged tile is.

**A third option is live: no ramp at all.** The mode may be fine as a calm, open-ended
puzzle. Nobody knows yet, because nobody has played it.

## Bigger versus harder — read this before touching the ramp

The owner rejected both ramps above in one sentence: *"lets make it harder mentally, not
just bigger."* Both make an order **bigger** — more bytes, or a dearer tool. Neither makes
it need more thought, and that distinction is measurable.

**The metric is the skill gap:** careless median divided by careful median. It is the
number this repo already used to reject need-weighted spawns for collapsing to 1.28x, and
to justify the shift tool for widening to 4.73x. **A change that leaves the gap flat is
more work, not more game.** Measure candidates with `node tools/simulate.mjs think`.

| variant | careful | careless | gap | p90 | tiles on board | waiting moves |
|---|---|---|---|---|---|---|
| one spawn a move | 57 | 358 | 6.3x | 158 | 4.2/16 | 16.5% |
| 3x3 board | 48 | 340 | 7.1x | 125 | 3.7/9 | 14.7% |
| **two spawns a move — shipped** | **28** | **264** | **9.4x** | **78** | **6.0/16** | **2.0%** |
| next order shown | 57 | 370 | 6.5x | 166 | 4.3/16 | 16.7% |
| 3x3 and two spawns | 22 | 269 | 12.2x | 54 | 5.5/9 | 1.4% |

**The deciding column is the last one.** With one spawn, one move in six merged nothing
*by choice* — the player marking time until a useful bit turned up. Two spawns makes it
one move in fifty. Orders also got *shorter*, not longer, and the bad tail halved.

- **Showing the next order does nothing.** 6.5x against 6.3x is noise. Foresight is not
  what this mode is short of. Do not build a preview.
- **A 3x3 board is the stronger version of the same idea**, 12.2x, and is **not built**.
  It runs at 5.5 tiles of 9, and shrinking the board changes how the game looks far more
  than a spawn count does. This is the next lever if two spawns proves too gentle.
- **Two spawns is not a ramp.** It makes every order denser; order 20 is still drawn
  exactly like order 2.

**Caveat on every gap number here:** the policy is one-ply, so a busier board hands it
more good options and the absolute gaps are probably flattering. The *ordering* between
variants is the trustworthy part.

## Dead, with the number that kills it

- **A fixed move budget with a fixed refill.** Must be under 61 to end a good player and
  over 255 to let a weak one sustain. Random play forges zero registers on a 320-move
  budget; skilled play at a refill of 80 hit the cap in 97% of runs.
- **Any lose state from the board.** Arithmetic, not balance.
- **A core tile that dies if it cancels.** Cancellations run 4.1 per 100 moves careless
  and 0.1 careful. It never fires.
- **Escalating score bonuses.** `100·2ⁿ` diverges to 11.2 per move.
- **A cost on moves that merge nothing.** Terminates, but a caring player drives chosen
  dry moves to the forced floor, so every life lost is dealt by the spawn, not by play.
- **Everything with a clock in it.** See constraint 4.

---

## Still open — ask before building

1. **Which ramp, if any.** Needs a playtest first. This is the main question.
2. **What Most orders should count.** Orders filled was chosen by reasoning, not by the
   user — they were asked and said *"not sure yet. lets discuss"*. Points is a one-line
   change if they prefer it.
3. **Whether two spawns a move feels right.** It is the only tuning decision made so far
   and it came entirely from simulation. Busier can read as richer or as noisier and no
   number distinguishes those. If it is too gentle, the 3x3 board is the same idea turned
   up. If it is too busy, the number lives in one constant, `ORDERS_SPAWNS`.

## How to talk to this user

This matters as much as any mechanic, and it went wrong twice this session before it went
right. A tabulated pitch of two ramps came back as *"i didnt understand"* — the same
failure as last session's *"i didnt understand anything."*

What works: short sentences, one idea each, active voice, and the game's own vocabulary —
tile, slot, merge, cancel, forge, register, move, shift, order, board. No "ramp",
"median", "asymptote", "linear". Say *the order gets longer* and *the order gets slower*,
not Ramp A and Ramp B. The playtesters do not follow the bit theory either:

> At the end of the day the 1s nullify and 1-0 becomes 1. The xor and these stuff are just
> flavour if someone wants to understand a bit more.

**Read `CONTEXT.md` before writing anything for this owner.** It holds the word list — the
word to use and the words not to use for the same thing — the terms to keep out entirely,
and a worked example of the same explanation written badly and then well. `/wait-what`
points at it. If a mechanic cannot be taught in one plain sentence, it is the wrong
mechanic.

Watch for unfilled placeholders. This session opened with a prompt containing a literal
`<what felt good, what felt bad, what you would change>` — the feedback had not been
written. Ask rather than infer.

## Process lessons

- `node tools/simulate.mjs validate` must pass before you trust any number it prints. It
  replays the README figures; a wide miss means drift from `index.html`.
- **Do not rebuild the simulator.** It was written and thrown away four times before it
  was finally committed.
- If a simulation says the core interaction never happens, that is the answer, not an
  obstacle to route around.
- Simulation cannot say how something feels. That is the entire reason orders shipped
  without a ramp.
- The user marks a PR ready and merges within minutes. Get the PR body right the first
  time — it is the record that survives.
- **Stubbing `window.spawn` in a browser test leaks into every later block.** It
  overwrites the global outright, so the real function is unreachable and a later block
  gets an empty board and asserts nothing at all. This shipped twice: once silently, once
  caught only because a block moved. `tools/test-browser.mjs` now stashes the pristine
  function on every load and restores from the stash. Never capture it mid-file.
- **The user is often on a phone with no laptop.** Anything that needs a shell — the itch
  build, the tests, the simulator — has to be run in-session and the artifact handed over,
  not given as instructions.

## Environment and workflow facts

- **No CI.** Zero workflows; absence of checks on a PR is expected. Do not add a Pages
  workflow — one existed and was removed in `c87db9e`.
- **Egress is restricted.** `*.github.io` and `raw.githack.com` are blocked, so the live
  site cannot be verified from inside a session. Say so rather than implying you checked.
- **Caches bite.** `sw.js` has a `CACHE` constant that must be bumped whenever a
  *precached* file changes. It is at `bitforge-v7`. It was missed once this session and
  caught only on the next commit — check it whenever `index.html` moves.
- **The repository root is the published site.** Anything committed there goes live. This
  is why `prototype/` is gitignored and why the orders throwaway was deleted twice.
- **Browser tests:** `npm i playwright` from the repo root (`node_modules` is already
  gitignored), then `node tools/test-browser.mjs`. 52 assertions covering both modes; it
  serves the repo itself and finds Chromium under `/opt/pw-browsers`, or takes `CHROME`.
  Run it after any change to `index.html`.
  - Playwright is deliberately absent from any `package.json`. The game ships as one file
    with no build step and no dependencies, and that is worth keeping.
  - `NODE_PATH` does **not** work — ESM resolves by walking up from the importing file,
    so the install has to sit above `tools/`.
  - Writing more: drive with `page.evaluate`; top-level declarations (`grid`, `score`,
    `move`, `applyMove`, `charges`, `armShift`, `applyShift`, `mode`, `order`, `filled`,
    `setMode`, `startRun`, `checkOrders`, `drawOrder`, `bin`, `popcount`) are reachable
    directly, and `drawOrder` can be reassigned to pin a random draw. Stub
    `window.spawn = () => false` for rules assertions, and serve with **`charset=utf-8`**
    or every em dash is mojibake.
- **Storage keys.** Classic: `xor2048.save.xor.v2`, `xor2048.best.xor.v2`. Orders:
  `xor2048.save.orders.v1`, `xor2048.best.orders.v1`. Current mode: `xor2048.mode.v1`.
- **PR flow:** open as draft; the user marks ready and merges quickly.
- **Publishing.** Three routes, and only one of them can be driven from a session:
  - *GitHub Pages* — the repository root **is** the site, so every merge to `main`
    publishes itself. Needs enabling once in Settings → Pages, which only the owner can
    do. See README → GitHub Pages, and do not add an Actions workflow.
  - *itch.io* — `./tools/build-itch.sh` writes `dist/bitforge-itch.zip` with
    `index.html` at the archive root, which is what itch.io requires. **Uploading cannot
    be done from a session:** `itch.io` is blocked by the proxy (`CONNECT` returns 403),
    `butler` is not installed, and it would need the owner's credentials regardless.
    Build the zip, hand it over with `SendUserFile`, and give the settings table from
    README → Publishing to itch.io. Never ask for an API key.
  - *Netlify drop* — `dist/site/` is a plain folder for `app.netlify.com/drop`. Same
    limitation: the drag-and-drop is the owner's to do.
  - `dist/` is gitignored. Build artifacts must never be committed; the repository root
    is the live site.

No credentials, tokens or personal data appear in this document or in the repo.
