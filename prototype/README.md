# Prototype — not the game

A throwaway build for judging how one endless idea *feels*. Simulation cannot answer
that, so this exists to be played and then thrown away. **Delete this directory before
merging anything.** No rule in `index.html` changes.

## The idea

The board names a byte. Forge it before the counter runs out, and the next order arrives
with less time: `deadline(n) = 200 - 12n`, which reaches zero at the seventeenth order,
so a run cannot go on for ever.

A forged order is **consumed** — the tile is spent, the way a cancelling pair is. Nothing
here is ever stopped from merging.

Orders are 4 to 8 bits. Anything smaller is routinely satisfied by a raw spawn, with no
play involved: at three bits or fewer the tenth percentile is three moves.

## Why those numbers

From `tools/simulate.mjs`. With a 200-move start shrinking by 12, play that builds toward
the order gets a median 7 orders over 497 moves, and stays ahead of play that just merges
as fast as it can (380 moves). Random play never finishes an order. Every run ends.

Tighter schedules were tried first and were too harsh to judge feel by: at a 110-move
start the median run filled 2 orders. The variance does the ending, not the shrink — a
median order takes 52 moves but the 90th percentile is 160, so each order is a fresh roll.

## Running it

Open `orders.html` in a browser — no build step, no server needed. It keeps its own
`localStorage` keys, so it cannot touch a real save or best score.

`build-orders.mjs` is how it was made: it patches `index.html` rather than forking it, so
what the prototype actually changes stays legible. Rebuild with:

```sh
node prototype/build-orders.mjs
```

## Known rough edges

- The tutorial teaches the old goal, so it is skipped entirely.
- Scoring is unconsidered: a filled order pays a flat 40 on top of merge score.
- Nothing explains the rule on screen beyond one line in the legend.
