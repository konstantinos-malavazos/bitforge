# XOR-2048 · Binary Merge

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

Score is the number of set bits produced by merges. There is no lose state: each line
collapses to at most two tiles per move, so the board can hold at most nine tiles and
can never deadlock.

Controls: swipe, arrow keys, WASD, or the on-screen D-pad.

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
manifest.webmanifest    PWA metadata (installable to a phone home screen)
sw.js                   service worker, offline shell cache
icons/                  generated app icons — do not hand-edit
tools/make-icons.mjs    icon generator (no dependencies; run with node)
tools/build-itch.sh     produces dist/xor2048-itch.zip
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
- A separate landscape layout puts the board beside the D-pad on short viewports.

## Publishing to itch.io

```sh
./tools/build-itch.sh      # writes dist/xor2048-itch.zip
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

## Installing to a phone home screen

itch.io serves games from a sandboxed iframe on a separate origin, so the manifest and
service worker are ignored there — the game runs fine, it just is not installable from
an itch.io page. For an installable, offline-capable copy, host the files anywhere with
HTTPS. The included workflow deploys to GitHub Pages on every push to `main` and enables
Pages itself on first run, so no manual setup is needed. Note that Pages on a *private*
repository requires a paid plan; on a public repository it is free.

From that URL:

- **Android/Chrome** — an "Install" button appears in the top bar (`beforeinstallprompt`).
- **iOS/Safari** — Share → *Add to Home Screen*. iOS does not support install prompts,
  so no button is shown; the `apple-touch-icon` and standalone meta tags are already in
  place.

## Balance notes

Simulated over 600 playthroughs of the current rules:

- The board averages ~4 occupied cells out of 16 and never exceeded 5, because every
  swipe force-merges every adjacent pair. The 4×4 grid is mostly empty at all times.
- Playing greedily (maximising board popcount) reaches 255 in **100%** of runs, median
  **205 moves**. Random play reaches it **3.3%** of the time.
- XOR never carries, so bit 7 can only enter the board as a literal `128` spawn, at
  1.5% per spawn. The same holds for `64` at 2.5%. The endgame is largely spent waiting
  on those two spawns.

Tuning the spawn table, or making merges conditional so overlapping tiles block instead
of collapsing, would both shorten that tail. Neither is changed here.

## License

MIT — see [LICENSE](LICENSE).
