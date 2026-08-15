# Handoff — the endless brainstorm has an answer, and an unmade decision

**Next session's job:** the design work is done and measured. What is missing is a
decision from the user, and then an implementation. Do not re-run the brainstorm.

Repo: `konstantinos-malavazos/bitforge` · one file, `index.html`, 1263 lines, no build
step, no dependencies, no framework.

**Branch:** start a new one from `main`
(`git fetch origin main && git checkout -B <branch> origin/main`). PR #18 is merged;
never stack on merged history.

---

## What changed on main this session

Nothing in the game. `index.html` is byte-identical.

| Added | What it is |
|---|---|
| `tools/simulate.mjs` | The balance simulator, finally committed. Dependency-free node. |
| `.claude/skills/wait-what/SKILL.md` | User-invoked. Asks for a re-pitch in Simplified Technical English. |

**Do not rebuild the simulator.** It had been written and thrown away four times before
this. Run `node tools/simulate.mjs` first — `validate` replays the README figures, so a
wide miss means it has drifted from `index.html` and every other number it prints is
about a different game. Its other commands: `cadence`, `dry`, `ceiling`, `orders`.

## Read these first, they are the real record

| Where | What is in it |
|---|---|
| PR #18 | This session. Every measurement below, plus the prototype's settings and why it was removed. |
| `README.md` → Balance notes | The rejected mechanics, the earlier endless measurements, the shift-tool economy. |
| `README.md` → One rule set | Why gate went, and the merge principle in the repo's own voice. |
| PR #12 / #14 / #16 | The endless mode as built, why it was removed, and the gate removal. |
| `git log` | The reasoning and the numbers are in the commit messages. |

---

## Three hard constraints

The first two are inherited. The third is new, and it killed more candidates than either.

**1. Tiles must always merge.** Confirmed by two removals in the user's own words: *"it is
stupid. You destroyed the merging and nullification"* and *"the gate does not merge. it
stacks"*. Blocking does not read as a different game; it reads as a bug. An idea whose
stopping mechanism works by preventing a merge has already failed.

Consuming a forged tile is **not** blocking — it is what a cancelling pair already does.
That is the loophole every surviving idea uses.

**2. The board provably cannot fill.** Every adjacent pair merges unconditionally. This
session settled the general case: **no board size can deadlock.** If the board is full,
every line holds at least two tiles, every adjacent pair merges, so a move always changes
something. Shrinking the grid only changes texture — the occupancy bound is 7 of 9 on a
3×3 against 9 of 16 on a 4×4. It never produces an ending. The ending must come from a
counter outside the board.

**3. The ending must be counted in forges, not in points.** Play that just takes the
biggest merge available scores **4.48** per move; play that builds a register scores
**3.42** — and the fast player forges registers almost as often, incidentally. So any
clock you outrun with score pays the player to stop building registers. Raising the
register payout does not fix it: fast play stayed ahead at every payout up to 250 per
register, because a bigger prize inflates the fast player's score too.

---

## Numbers worth having in your head

| | Skilled | Random |
|---|---|---|
| Moves per register, warm board (median, #2 onward) | 51 | 222 |
| Moves per register, mean — the number a refill must beat | 61 | 255 |
| Score per move | 3.42 | 2.93 |
| Score per move, pure throughput play | **4.48** (converging: 4.29 → 4.43 → 4.48) | |
| Moves that merge nothing, by choice | 16.8% | 20.9% |
| Moves that merge nothing, forced | 1.06% | 2.13% |
| Cancellations per 100 moves | 4.1 | 6.0 (0.1 for careful play) |
| Peak occupancy | 5 of 16 | bound is 9, never approached |

**Register cadence is stationary.** 62 moves for the first, then 50/50/52/50/53/53/55 with
no ramp. There is no natural difficulty curve to inherit; any ramp has to be authored.

**Moves to forge an arbitrary target byte:** 2–3 bits 24, 4–5 bits 52, 6–7 bits 56, and
`11111111` itself 51. The full register is *not* the hardest byte — it is the only one
with no wrong bits to avoid. Below four bits a raw spawn routinely fills the target with
no play at all (p10 of 3 moves), so any target-naming mode needs a floor of four.

---

## Dead, with the number that kills it

- **A fixed move budget with a fixed refill.** A fixed refill must be under 61 to end a
  good player and over 255 to let a weak one sustain. Measured either side: random play
  forges **zero** registers even on a 320-move budget and never once sees the refill;
  skilled play at a refill of 80 hit the cap in 97% of runs.
- **Any lose state from the board.** See constraint 2. Arithmetic, not balance.
- **A core tile that dies if it cancels.** Cancellations run 4.1 per 100 moves careless
  and 0.1 careful — and that is *any* pair, not the core. It never fires.
- **Cash out versus push on, alone.** With no lose state there is nothing to weigh.
  Only meaningful bolted onto a clock.
- **Escalating score bonuses.** Already recorded: `100·2ⁿ` diverges to 11.2 per move.

## What survives, ranked

**1. Orders with a tightening deadline — recommended.** The board names a byte; forge it
before a counter runs out; each order arrives with less time. The only candidate where
building beat throughput in *every* configuration tested (592 moves against 419 at a
160-move deadline; 301 against 211 at 120). Random play never completed a single order.

*Teach it as:* "Forge the byte shown before the counter runs out. Each one gives you less
time than the last."

*Risks:* orders under four bits complete themselves; naming a target is new UI.

**2. A move budget with a decaying refill — works, but is not endless.** Termination is
guaranteed by construction (the run cannot exceed start + Σ refills), but a competent
player collects nearly all of it: median 914 against a hard maximum of 920. It is a
fixed-length time attack you have to earn, ranked by score. Pitch it that way or not at all.

**3. A cost on moves that merge nothing — terminates, but the ending is luck.** Score per
move stays flat as lives grow (4.01 → 4.16), so no divergence, and length scales with
lives (10 → ~558 moves). But a player who cares drives chosen dry moves from 16.8% to
1.6%, which *is* the forced floor, and one move of foresight lowered that floor by nothing
(1.58% → 1.59%). Every life a good player loses is dealt by the spawn. It also taxes
patience — dry moves are how you wait for a disjoint partner — and register cadence slows
from 64 to 88 moves once you stop paying. Keep it as a secondary pressure at most.

---

## The prototype that existed, and how to get it back

A playable throwaway of idea 1 was built, played, and removed again. Recover it with:

```sh
git show 80c5902:prototype/build-orders.mjs > /tmp/build-orders.mjs
node /tmp/build-orders.mjs          # writes prototype/orders.html from index.html
```

It patches `index.html` rather than forking it, so what it changes stays legible. It was
removed because the repository root *is* the published site — keeping it would put a
rough rule set live for anyone with the link.

Settings, chosen from simulation rather than taste: clock of **200 moves shrinking by 12
per order**, targets of **4–8 bits**, a forged order **consumed** and paying a flat 40.
That gives a median 7 orders over 497 moves for building play, 380 for throughput play,
zero orders for random play, and every run ends (the deadline reaches zero at order 17).

Tighter schedules were tried first and were too harsh to judge feel by — at a 110-move
start the median run filled two orders. **The variance ends these runs, not the shrink:**
a median order takes 52 moves but the p90 is 160, so every order is a fresh roll.

One bug found by playing it, which will recur if this is built for real: the header lagged
a move behind after an order was filled, because `checkMilestones` runs *after*
`renderStats` in `move()`.

---

## Still unanswered — ask before building

1. **Which direction.** The user chose "let me see it first" over picking one, played the
   prototype, and merged the PR without saying how it felt. Ask what it did wrong.
2. **Mode, or the one game?** Endless runs score 1000–5000 against a median 262 for a
   normal run, so a shared best score buries the existing one. The mode system was deleted
   with gate, so this is an open call rather than a slot to fill. The option most
   consistent with "one rule set" is that orders *become* the game, with `11111111` as the
   first order.
3. **Scoring.** The prototype's flat 40 per order was never thought about.

## How to talk to this user

This matters as much as any mechanic. The first write-up this session was returned with
*"i didnt understand anything."* The playtesters do not follow the bit theory either:

> At the end of the day the 1s nullify and 1-0 becomes 1. The xor and these stuff are just
> flavour if someone wants to understand a bit more.

What worked: short sentences, one idea each, active voice, and the game's own vocabulary —
tile, slot, merge, cancel, forge, register, move, shift. No "denominated", "stationary",
"divergence", "objective function". `/wait-what` is installed for when it slips again.
If a stopping mechanism cannot be taught in one plain sentence, it is the wrong mechanism.

## Process lessons

- The simulator's `validate` must pass before you trust any number it prints.
- The skilled policy in `tools/simulate.mjs` is roughly 20% stronger with the shift tool
  than the one behind the published table (median 62 against a recorded 75), so its
  register-cadence figures read as a **floor**, not a centre.
- All policies are one-ply. The foresight result that sank idea 3 used three spawn samples
  and a single move of lookahead — it bounds a shallow search, not a deep one.
- If a simulation says the core interaction never happens, that is the answer, not an
  obstacle to route around. The previous session invented a wall to "fix" such a result
  and built a whole mode on a broken premise.
- Simulation cannot say how something feels. Build a throwaway and play it — it cost about
  twenty minutes and caught a real bug.

## Environment and workflow facts

- **No CI.** Zero workflows; absence of checks on a PR is expected. Do not add a Pages
  workflow — one existed and was removed in `c87db9e`. See README → GitHub Pages.
- **Egress is restricted.** `*.github.io` and `raw.githack.com` are blocked, so the live
  site cannot be verified from inside a session. Say so rather than implying you checked.
- **Caches bite.** `sw.js` has a `CACHE` constant that must be bumped whenever a
  *precached* file changes. It is at `bitforge-v4`; nothing precached changed this session.
  The itch.io build is a frozen snapshot (`./tools/build-itch.sh`).
- **Browser testing:** `npm i playwright` in a scratchpad, launch with
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, serve the repo
  from a small `node:http` server — **send `charset=utf-8`** or every em dash is mojibake.
  Drive with `page.evaluate`; top-level declarations (`grid`, `score`, `move`, `applyMove`,
  `charges`, `armShift`, `applyShift`, …) are reachable directly. Stub
  `window.spawn = () => false` for rules assertions.
- **PR flow:** open as draft; the user marks ready and merges quickly.
- Artifacts from this session, still live and private to the user: the findings report and
  the playable prototype. Ask them for the links rather than assuming they are lost.

No credentials, tokens or personal data appear in this document or in the repo.
