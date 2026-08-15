# The words this project uses

This file exists so that everyone writing about BitForge — people and agents — uses the
same words for the same things.

Two rules produced it. First, the game's own vocabulary is the only vocabulary that
lands: playtesters follow *tile*, *merge* and *forge*, and stop reading at *stationary*
and *divergence*. Second, a write-up that is not understood is not a write-up. Two of
them have come back with *"i didnt understand anything"* and *"i didnt understand"*.

`.claude/skills/wait-what/SKILL.md` points here. If a message did not land, come back and
write it again with these words.

---

## What the game is, in the plainest words available

Every tile is an 8-bit number. You see it in binary and in decimal.

You swipe. Tiles slide. When two tiles touch, they merge into one tile.

The merge is XOR. In plain words: **a 1 and a 0 make a 1. Two 1s make a 0.** Do the same
thing to each of the eight bits and you have the new tile.

Two tiles that are the same cancel. They both go and leave nothing.

Score is the count of 1s in each tile you make.

The goal is to forge `11111111`.

That is the whole game. The bit theory behind it is flavour, in a playtester's words:

> At the end of the day the 1s nullify and 1-0 becomes 1. The xor and these stuff are
> just flavour if someone wants to understand a bit more.

---

## The word list

Use the word on the left. Do not use the words on the right for the same thing.

| Use this | Not this | What it means |
|---|---|---|
| **tile** | piece, block, number, node | One 8-bit number on the board. |
| **board** | grid, field, arena | The 4×4 area the tiles are on. |
| **slot** | cell, square, position | One of the 16 places a tile can sit. |
| **move** | turn, step, action | One swipe. Everything slides once. |
| **swipe** | drag, flick, gesture | How a move is made on a phone. |
| **merge** | combine, collide, fuse | Two tiles become one. |
| **cancel** | annihilate, nullify, destroy | Two equal tiles merge and leave nothing. |
| **forge** | build, craft, create, reach | Make a tile that is a byte you wanted. |
| **register** | goal tile, 255, target | The byte `11111111`. |
| **order** | request, job, quest, contract | A byte the game asks you to forge. |
| **fill** | complete, satisfy, clear | Forge the byte an order asks for. |
| **spawn** | drop, appear, generate | A new tile arrives after a move. |
| **shift** | double, promote, upgrade | The `<<` tool. Doubles one tile. |
| **charge** | use, credit, token | One shift you have earned and can spend. |
| **score** | points | The running total. |
| **run** | game, session, attempt | One game from the first move to the last. |
| **mode** | variant, ruleset | Classic, or orders. |

### Words to keep out entirely

These have all been used in a message that did not land:

> denominated · stationary · divergence · objective function · asymptote · linear ·
> superlinear · median · p90 · percentile · monotone · ramp · cadence · throughput ·
> occupancy · policy · heuristic · state space

Some of them are needed in `README.md` and in commit messages, where the reader is
another engineer. **None of them belong in a message to the owner or in the game's own
text.**

If a measurement has to be given, give it in moves. *"About 60 moves"* is understood.
*"A median of 58 with a p90 of 168"* is not.

---

## How to write here

Follow ASD-STE100 Simplified Technical English. In practice that is six habits.

1. **One idea in one sentence.** If there is an "and" joining two ideas, make two
   sentences.
2. **Twenty words at most** in a sentence.
3. **Active voice.** *The game names a byte.* Not *a byte is named by the game.*
4. **One word for one thing.** Pick from the table above and do not vary it for style.
   Variation reads as two different things.
5. **Present tense.** *The tile comes off the board.* Not *the tile will come off.*
6. **Say the thing, then the reason.** Not the reason, then the thing.

### Two more, learned the hard way

**No tables of numbers as an explanation.** A table is a record, not an argument. Say what
the numbers mean in a sentence, and put the table underneath for anyone who wants it.

**A mechanic that needs a paragraph is the wrong mechanic.** If a rule cannot be taught in
one plain sentence, the problem is the rule.

### A worked example

This did not land:

> Ramp A is near-linear at 58/138/212 median moves for K=1..3, so the order gets longer
> rather than harder; Ramp B asymptotes at a 3.2× span.

This is the same thing:

> There are two ways to make later orders harder.
>
> One way asks for more bytes. One byte takes about 60 moves. Two take about 140. Three
> take about 210. So the order gets longer.
>
> The other way makes the `<<` button cost more each time. Then one byte takes 40 moves,
> then 60, then 84. So the order gets slower.
