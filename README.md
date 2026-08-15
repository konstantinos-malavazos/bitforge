# BitForge 255

A 2048-style puzzle where every tile is an **8-bit number** and colliding tiles **XOR**
instead of adding. Equal bits cancel, different bits combine. The goal is to forge the
full register: `11111111` (255).

Single-page game — no build step, no dependencies, no framework. Open `index.html`.

## Rules

| Situation | Example | Result |
|---|---|---|
| Different bits combine | `0010 ^ 0100` | `0110` |
| Equal tiles cancel | `0011 ^ 0011` | `0000` — the "delete" tool |
| Overlapping bits are lost | `0110 ^ 0011` | `0101` — wasted potential |

Tiles pack toward the edge you swiped, then pair off two at a time from that edge. So a
row of **three** tiles normally collapses to **two** — the leading pair merges and the
third is left over. It collapses to **one** only when that leading pair is identical,
because equal tiles cancel to nothing:

| Row (swiped left) | Result | Why |
|---|---|---|
| `1 2 5` | `3 5` | `1^2 = 3`, the `5` is left over |
| `3 3 5` | `5` | `3^3 = 0`, the pair annihilates |

Verified exhaustively over 2401 rows: of the three-tile rows that collapse to one, 100%
have an identical leading pair; of those that collapse to two, none do.

Cancelling and merging are deliberately kept distinguishable on screen, because the two
outcomes are easy to confuse:

- Colour states the outcome: a merge result flashes **green** as it appears, and a
  doomed pair turns **red** the moment it starts travelling, so you see what will happen
  on the way in rather than only at impact. The square a pair vacates flashes red too,
  since the tiles themselves are gone by then. Motion carries the same information
  independently — merges pop and stay, cancellations swell and implode — so the
  red/green pair is never the only cue.
- A cancelling pair visibly dissolves as it meets, rather than blinking out.
- The tile each move spawns is kept off any square a pair just vacated. Without that,
  since 40% of spawns are a `1`, cancelling two `1`s would routinely drop a fresh `1`
  exactly where they vanished — reading as though they had merged into one, the precise
  opposite of what happened. It is only a preference: if those are the only free cells,
  the spawn still goes there.
- The new tile also arrives a beat after any merge result, so the two never appear in the
  same instant.

Score is the number of set bits produced by merges. There is no lose state: each line
collapses to at most two tiles per move, so the board can hold at most nine tiles of
sixteen and can never deadlock. This is arithmetic rather than balance, and it is the
constraint any future "keep playing" mode has to work around — the board cannot be made
to fill.

Controls: swipe, arrow keys, or WASD.

The tutorials and the on-screen legend explain a tile as a row of eight slots — two `1`s
in the same slot cancel, a `1` with a `0` makes a `1` — because playtesters bounced off
the bit theory. They still name the mechanics `merge`, `cancel` and `forge`; only the
explanation underneath them is plainer. The How-to-play dialog keeps the full bit-level
statement of the same rules.

## The shift tool

XOR never carries. Nothing you merge can ever set a bit that neither operand had, so
bit 7 cannot be built — it can only arrive as a literal `128` spawn, which is 1.5% of
spawns. The endgame was therefore a wait, not a decision: a median of 45 moves before a
`128` showed up at all, and a 90th percentile of 557 moves to finish.

Every 50 points earns one `<<` charge. Spending it doubles a tile of your choice, so
`01000000` becomes `10000000` — the bit you cannot merge your way to. Charges are bought
with score, so the tool is earned by playing well rather than waited for.

- Cannot target a tile that already holds bit 7; the shift would push it out of the
  register. The attempt is refused and costs nothing.
- Does not consume a move and does not spawn a tile.
- A shift always clears bit 0, so it can never produce `11111111` by itself.

Arm it with the `<<` button, then tap a tile — or use the arrow keys to move the gold
cursor and Enter to confirm, so it works without a pointer. Escape cancels, and swiping
while armed just makes the move.

The control fills with the accent colour the moment a charge is available and pulses as
each one lands, and a meter under it tracks progress toward the next, so the economy is
visible rather than implied. Step 4 of the tutorial hands out one free charge and will
not accept a swipe, so the tool is met before it is needed.

## Ending a run

Forging `11111111` ends the game rather than continuing past it. A panel reports the
score, the move count and the best score, and offers a new game; *View board* dismisses
it to look at the final position, but the run stays finished and input stays off. A
finished run reloads with its panel intact.

That is the classic mode. Orders has no ending at all — see below.

## One rule set

A `gate` prototype used to ship alongside the original rules: tiles combined only when
they shared no bits, equal tiles annihilated, and any overlap **blocked**. The blocking
was the point — it filled the board and made a lose state possible, which the original
rules cannot have.

It was removed, for the same reason an endless prototype was removed just before it:

> the gate does not merge. it stacks so i think it is not good to be there

Tiles that refuse to merge do not read as a different game. They read as the game being
broken — and they were reported as exactly that in playtesting, before the rule set was
even identified as the cause. **Merging and nullification are what this game is.** Any
mechanic that suspends them for any tile is wrong here, however well it scores.

That leaves one rule set, so the rules toggle, the flat spawn table, the jam detection
and the second tutorial are all gone with it. Storage keys keep their original `.xor.`
segment, so saves written by the two-mode build still load.

Orders, below, brought the per-mode storage keys back. It did not bring back a second
rule set: it changes what you are asked to forge, never how a tile behaves.

## Orders

A second mode, reached from the button in the top bar. The bar names a byte; you forge
it; it comes off the board and another byte is named. That repeats for as long as you
want to keep going.

**There is no timer and no ending.** This is the mode's defining constraint and it was
the owner's call — *"never timer"*. Every ending that was designed for it turned out to
be a counter in a different coat: a deadline per order, a move budget, a queue of orders
backing up. Without one, nothing stops a run but the player, so **Most orders** replaces
**Best** and counts orders filled rather than points. Score with no ending only records
how long somebody was willing to sit there.

**A filled order is consumed, not blocked.** This is what makes the mode legal under the
rule above. Taking a tile off the board is what a cancelling pair already does; no tile
is ever stopped from merging. `11111111` is not a win here either — it is just another
byte the mode can ask for, and ending the run on it would end the mode the first time it
came up.

**Orders never ask for fewer than four bits.** Every spawn is a single bit, so a one-,
two- or three-bit order is routinely filled by a spawn with no play involved — a p10 of
three moves. Four bits is the floor that makes an order something you build.

Each mode keeps its own board and its own record under its own keys, so switching parks
a run rather than throwing it away. A classic run ends at `11111111` and scores a median
262; an orders run never ends at all, so a shared best score would bury the classic one
within one sitting.

**No difficulty ramp yet.** Every order is drawn the same way, so order 20 is no harder
than order 2. Two ramps have been measured and neither is built — see *Balance notes*.

## Layout

```
index.html              the whole game
.nojekyll               serve the root as-is on GitHub Pages, no Jekyll pass
manifest.webmanifest    PWA metadata (installable to a phone home screen)
sw.js                   service worker, offline shell cache
icons/                  generated app icons — do not hand-edit
tools/make-icons.mjs    icon generator (no dependencies; run with node)
tools/build-itch.sh     produces dist/site/ and dist/bitforge-itch.zip
```

Regenerate icons after changing the generator:

```sh
node tools/make-icons.mjs
```

## Mobile

The game is built phone-first and is tested down to a 320×568 viewport:

- Height is driven by `dvh` with a `visualViewport` override, so a showing/hiding URL
  bar — and itch.io's fullscreen iframe on Android — does not cut off the layout.
- `overscroll-behavior: none` plus a non-scrolling body stops swipe-down from
  triggering pull-to-refresh mid-game.
- The board opts out of browser panning with `touch-action: none`; everything else uses
  `touch-action: manipulation`, which kills double-tap zoom and tap delay while leaving
  pinch-zoom available for accessibility.
- Padding respects `env(safe-area-inset-*)` for notches and home indicators.
- Multi-touch is treated as a pinch and never as a swipe.
- Progress, best score, and tutorial completion persist in `localStorage`, and the game
  saves on `visibilitychange` and `pagehide` so a backgrounded tab being evicted does
  not lose the run.
- A separate landscape layout puts the board beside the controls on short viewports.

## Publishing to itch.io

```sh
./tools/build-itch.sh      # writes dist/site/ and dist/bitforge-itch.zip
```

Upload that zip, then in the project's edit page:

| Setting | Value |
|---|---|
| Kind of project | HTML |
| Uploaded file | check **This file will be played in the browser** |
| Viewport dimensions | `480 × 800` (any portrait ratio; the layout is fluid) |
| Mobile friendly | **on** — enables orientation control and drops the "may not work" warning |
| Orientation | Portrait |
| Fullscreen button | on |

`index.html` must sit at the root of the zip, not inside a folder — the build script
already arranges it that way.

On mobile, itch.io always uses click-to-play and always launches the game fullscreen,
regardless of the desktop embed setting.

## GitHub Pages

The repository root is the site — `index.html`, `manifest.webmanifest`, `sw.js` and
`icons/` are already laid out as a servable directory, and every path in them is
relative. So Pages needs no build step and no workflow: point it at the branch and
every merge to `main` publishes itself.

Enable it once, in **Settings → Pages**:

| Setting | Value |
|---|---|
| Source | **Deploy from a branch** |
| Branch | `main` |
| Folder | `/ (root)` |

That publishes to `https://<owner>.github.io/bitforge/`. The first build takes a
minute or two; after that a push is live within about a minute.

**Do not replace this with an Actions workflow.** One existed and was removed in
`c87db9e`: `actions/configure-pages` cannot enable a Pages site that does not exist
yet, and `enablement: true` is refused with *"Resource not accessible by integration"*
because that endpoint needs admin credentials the workflow token does not have. The
deploy stayed dependent on the same manual setting either way, and the failing job
kept `main` red. Deploying from the branch needs no token and has no job to fail.

`.nojekyll` at the root tells Pages to serve the files as they are rather than running
them through Jekyll.

The site is a project page, so it is served from the `/bitforge/` subdirectory rather
than the domain root. Nothing needs adjusting for that — `start_url`, `scope` and `id`
in the manifest are all `./`, the service worker precaches `./` paths and registers
with a relative URL, so its scope follows the subdirectory automatically.

## Installing to a phone home screen

itch.io serves games from a sandboxed iframe on a separate origin, so the manifest and
service worker are ignored there — the game runs fine, it just is not installable from
an itch.io page. The Install button is therefore removed outright in that environment
rather than left to fail: it is dropped whenever the page is framed, and also when the
page is served from an `itch.io` or `itch.zone` host at the top level, where installing
would bookmark itch's hosting path instead of this game.

For an installable, offline-capable copy, serve the files from any HTTPS origin — the
GitHub Pages URL above is one.

If you would rather not enable Pages, this route needs no repository integration at all:

1. `./tools/build-itch.sh`
2. Drag `dist/site/` onto <https://app.netlify.com/drop>

That returns an HTTPS URL immediately. Any static host works the same way — the game is
a handful of files with relative paths, so it runs from a subdirectory too.

From that URL:

- **Android/Chrome** — an "Install" button appears in the top bar (`beforeinstallprompt`).
- **iOS/Safari** — Share → *Add to Home Screen*. iOS does not support install prompts,
  so no button is shown; the `apple-touch-icon` and standalone meta tags are already in
  place.

## Balance notes

The board averages ~4 occupied cells out of 16 and never exceeds 5, because every swipe
force-merges every adjacent pair. The 4×4 grid is mostly empty at all times.

The bit-7 wait was measured over 3000 games per row, played by a policy that drives one
tile toward a full register. "Skill gap" is the random-play median divided by the skilled
median — how much the player's decisions are worth:

| | median | p90 | first `128` | skill gap |
|---|---|---|---|---|
| No tool, shipped spawn table | 199 | 557 | move 45 | 2.18× |
| No tool, flat spawn table | 87 | 254 | move 4 | 3.76× |
| **Shift, 1 charge / 50 points** | **75** | **173** | move 24 | **4.73×** |
| Shift, 1 charge / 100 points | 104 | 238 | move 36 | 3.74× |
| Shift, 1 charge / 200 points | 136 | 325 | move 46 | 3.04× |

The tool was chosen over reweighting spawns because of the last column. Flattening the
spawn table shortens the game for everyone — random play improves almost as much as
skilled play. The tool is the opposite: random play barely moves (median 433 → 355)
while skilled play nearly triples (199 → 75), because the gain comes from choosing when
to spend a charge and which tile to spend it on. It also cuts the frustrating tail
hardest, p90 557 → 173.

Two alternatives were measured and rejected:

- **Need-weighted spawns** — bias the table toward bits the board is missing. Fastest of
  everything tested (median 24–39) but the skill gap collapses to 1.28×: when the board
  hands you the bit you need, there is no decision left.
- **A 2048-style carry** — identical tiles promote (`a` + `a` = `a<<1`) instead of
  cancelling, giving a ladder to bit 7. It changes nothing: median 203 against a
  baseline of 199. With only ~4.5 tiles on a board where every unequal pair merges on
  contact, identical tiles almost never meet, so the ladder never fires. Removing high
  spawns to force the ladder drops the win rate to **0%**.
- **An endless mode** — built and removed. Forging `11111111` no longer ended the run;
  the register became a wall that only a second register could clear, and that collision
  scored. It played badly: a tile that refuses to merge does not read as this game, it
  reads as a bug. The measurements are worth keeping if it is ever revisited.
  - The wall was not optional. Left as an ordinary tile a `255` XORs with the first thing
    it touches and stops being a register, so over 300 runs of 800 moves a register pair
    collided **zero** times. Making the payoff reachable *requires* breaking merging.
  - It could not be given a lose state. Peak occupancy 8/16 and **0%** of runs ended in
    3000 moves — each line still collapses to at most two tiles, and a second register
    clears the first rather than piling up.
  - Score inflation lives in the payout schedule, not the shift economy. Flat payouts are
    stable at any size (flat 2000 holds at 8.3/move from 800 to 3200 moves); `100·n`
    creeps to 4.4 and `100·2ⁿ` diverges to 11.2 and climbing.
  - The feared `score → charges → register → score` loop does not exist. A policy that
    dumps its whole charge stockpile chain-shifting to bit 7 scores within **1%** of one
    that does not, under every payout schedule and charge source tried. Charges are not
    the binding constraint: a long run banks ~70 and spends ~7.

### Making a later order harder

Orders ships without a ramp, so order 20 is drawn exactly like order 2. Bit count cannot
supply one — an arbitrary target costs 52 moves at 4–5 bits, 56 at 6–7 and 51 for
`11111111` itself, which is flat. Any ramp has to be authored. Three were measured with
`node tools/simulate.mjs hold` and `node tools/simulate.mjs bank`.

**Rejected — one order naming several bytes that must sit on the board together.**

| bytes held at once | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| median moves | 59 | 1139 | — | — |
| runs completing one | 100% | 65% | 1% | 0% |

A cliff, not a ramp. The cause is a rule already in the game: every adjacent pair merges
unconditionally, so a finished byte cannot be parked while the next is built — it gets
eaten. Worth keeping as the sharpest measure of how fragile a forged tile is.

**Ramp A — more bytes per order, forged one at a time and consumed as they land.**

| bytes | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| median moves | 58 | 138 | 212 | 287 | 364 |

Near-linear, so the order gets *longer* rather than harder. Four bytes is already a
287-move slog; three looks like the practical cap.

**Ramp B — the shift tool getting dearer with each order.**

| `<<` cost | 25 | 50 | 100 | 200 | out of reach |
|---|---|---|---|---|---|
| median moves | 40 | 60 | 84 | 99 | 128 |

A 3.2× span that asymptotes once nobody can afford the tool. The order gets *slower*,
because the game takes the tool away.

Both work and neither is a timer. Which one to build — or whether the mode is better
without a ramp at all — is unsettled, and is a question about feel rather than one more
simulation can answer.

## License

MIT — see [LICENSE](LICENSE).
