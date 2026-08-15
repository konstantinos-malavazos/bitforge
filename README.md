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

- A cancelling pair visibly dissolves as it meets, rather than blinking out.
- The tile each move spawns is kept off any square a pair just vacated. Without that,
  since 40% of spawns are a `1`, cancelling two `1`s would routinely drop a fresh `1`
  exactly where they vanished — reading as though they had merged into one, the precise
  opposite of what happened. It is only a preference: if those are the only free cells,
  the spawn still goes there.
- The new tile also arrives a beat after any merge result, so the two never appear in the
  same instant.

Score is the number of set bits produced by merges. There is no lose state: each line
collapses to at most two tiles per move, so the board can hold at most nine tiles and
can never deadlock.

Controls: swipe, arrow keys, or WASD.

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
- XOR rules only. Gate mode spawns from a flat table and does not have the problem.

Arm it with the `<<` button, then tap a tile — or use the arrow keys to move the gold
cursor and Enter to confirm, so it works without a pointer. Escape cancels, and swiping
while armed just makes the move.

## Rule sets

Two rule sets ship side by side. Pick one with the toggle in the How-to-play dialog, or
with `?rules=xor` / `?rules=gate`. Saved games, best scores and tutorial progress are
tracked separately per rule set, so switching never destroys the other's run.

**`xor`** (default) — the original. Every adjacent pair merges, unconditionally.

**`gate`** (prototype) — collisions have three outcomes:

| Collision | Rule | Role |
|---|---|---|
| No shared bits (`a & b == 0`) | combine → `a\|b`, score `popcount²` | the build move |
| Equal tiles (`a == b`) | annihilate, score `popcount × 2` | the pressure valve |
| Any shared bit | **block** | what fills the board |

Blocking is the whole point: it is the only thing that lets the board fill, which is what
makes a lose state possible. Two consequences fall out of the rules rather than being
written in — a forged `11111111` overlaps every other tile, so it becomes a wall that only
a second `11111111` can clear; and the game ends when no direction produces a legal move.
Gate mode also uses a flat spawn table, because the skewed one starves high bits.

Measured over 200 in-browser games under random play:

| | `xor` | `gate` |
|---|---|---|
| Games that end | 0% | **100%** |
| Median length | never | 81 moves |
| Average occupancy | 3–4 / 16 | **10.1 / 16** |
| Peak occupancy | 5 / 16 (bound: 9) | 16 / 16 |

Under 1-ply greedy play in the offline simulator, `gate` scores 1408 median against 976
for random — so direction choice is worth about 44%, where the original's outcome is
mostly determined by the spawn sequence.

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
an itch.io page. For an installable, offline-capable copy, serve the files from any
HTTPS origin — the GitHub Pages URL above is one.

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

## License

MIT — see [LICENSE](LICENSE).
