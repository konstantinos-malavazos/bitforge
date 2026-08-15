# Handoff — orders is built and merged, and nobody has played it

**Next session's job:** the endless question is answered and shipped. What is missing is
a playtest, and then one decision that only a playtest can settle. Do not re-run the
brainstorm, and do not redesign the mode before someone has swiped it.

Repo: `konstantinos-malavazos/bitforge` · one file, `index.html`, 1428 lines, no build
step, no dependencies, no framework.

**Branch:** start a new one from `main`
(`git fetch origin main && git checkout -B <branch> origin/main`). PR #20 is merged;
never stack on merged history.

---

## What changed on main this session

Orders shipped. This is the first change to the game itself in three sessions.

| Where | What |
|---|---|
| `index.html` | Orders mode, reachable from a new button in the top bar. |
| `README.md` | New *Orders* section; the ramp measurements added to *Balance notes*. |
| `tools/simulate.mjs` | Two new commands, `hold` and `bank`. Now 513 lines. |
| `sw.js` | `CACHE` bumped to `bitforge-v5`. |
| `.gitignore` | `prototype/` ignored, so a throwaway can never reach the live site. |

## The mode, in one paragraph

The bar names a byte. You forge it, it is taken off the board, another byte is named.
That repeats for as long as the player wants. There is no timer and no ending. **Best**
is relabelled **Most orders** and counts orders filled instead of points. Classic is
untouched and each mode keeps its own board and its own record under its own keys, so
switching parks a run rather than discarding it.

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

## The ramp question — the one real decision left

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
3. **`CONTEXT.md` does not exist.** `.claude/skills/wait-what/SKILL.md` tells the agent to
   use "the ubiquitous language from `CONTEXT.md`", and there is no such file. The skill
   built for the *"i didnt understand"* problem is running at half strength. Writing it is
   a small job and was offered but not commissioned.

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

`/wait-what` is installed for when it slips again. If a mechanic cannot be taught in one
plain sentence, it is the wrong mechanic.

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

## Environment and workflow facts

- **No CI.** Zero workflows; absence of checks on a PR is expected. Do not add a Pages
  workflow — one existed and was removed in `c87db9e`.
- **Egress is restricted.** `*.github.io` and `raw.githack.com` are blocked, so the live
  site cannot be verified from inside a session. Say so rather than implying you checked.
- **Caches bite.** `sw.js` has a `CACHE` constant that must be bumped whenever a
  *precached* file changes. It is at `bitforge-v5`. The itch.io build is a frozen snapshot
  (`./tools/build-itch.sh`).
- **The repository root is the published site.** Anything committed there goes live. This
  is why `prototype/` is gitignored and why the orders throwaway was deleted twice.
- **Browser testing:** `npm i playwright` in a scratchpad, launch with
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, serve the repo
  from a small `node:http` server — **send `charset=utf-8`** or every em dash is mojibake.
  Drive with `page.evaluate`; top-level declarations (`grid`, `score`, `move`, `applyMove`,
  `charges`, `armShift`, `applyShift`, `mode`, `order`, `filled`, `setMode`, `startRun`,
  `checkOrders`, `drawOrder`, `bin`, `popcount`) are reachable directly. Stub
  `window.spawn = () => false` for rules assertions. Orders was verified this way over 31
  assertions; that harness was **not committed** and will need rebuilding.
- **Storage keys.** Classic: `xor2048.save.xor.v2`, `xor2048.best.xor.v2`. Orders:
  `xor2048.save.orders.v1`, `xor2048.best.orders.v1`. Current mode: `xor2048.mode.v1`.
- **PR flow:** open as draft; the user marks ready and merges quickly.

No credentials, tokens or personal data appear in this document or in the repo.
