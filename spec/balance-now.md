# The balance now

Written by `node tools/balance.mjs --write` from the content and the rules as they are; do not edit
by hand. The maths is checked against fights played by the game's own rules (`tests/balance.test.js`).
The levels: 100 made for each depth, as the game makes them.

## The player's blow

Lands 75% of the time on a monster that's aware of them; always, and 3 times as hard, on one
asleep or unaware. Better by 1 every other level. Starts with 20 hit points, 4 more each level.

| Weapon | Level 1 | Level 3 | Level 5 | Level 7 | Hands |
|---|---:|---:|---:|---:|---:|
| dagger | 1–4 (1.9 a turn) | 2–5 (2.6 a turn) | 3–6 (3.4 a turn) | 4–7 (4.1 a turn) | 1 |
| sword | 2–6 (3.0 a turn) | 3–7 (3.8 a turn) | 4–8 (4.5 a turn) | 5–9 (5.3 a turn) | 1 |
| axe | 3–7 (3.8 a turn) | 4–8 (4.5 a turn) | 5–9 (5.3 a turn) | 6–10 (6.0 a turn) | 1 |
| warhammer | 4–10 (5.3 a turn) | 5–11 (6.0 a turn) | 6–12 (6.8 a turn) | 7–13 (7.5 a turn) | 2 |

## One fight, one monster

Next to the player and aware of them: the blows it takes to bring down, the hit points its blows take off
the player meanwhile (bleeding and poison as they run their course after, apart), and how many turns it
would take it alone to kill the player from full health. Worked out for the gear and level a player might
have arriving at each depth: a guess to read against, not measured.

**depth 1:** dagger, level 1, no armour (20 hit points).

| Monster | Hit points | Blows | Lost | Bleeding, poison | Kills you in | Blows, from a sneak blow | XP |
|---|---:|---:|---:|---:|---:|---:|---:|
| goblin | 3–6 | 2.9 | 2.0 |  | 19.0 turns | 1.2 | 5 |
| warrior | 10–14 | 6.9 | 11.7 | 3.1 | 10.2 turns | 3.9 | 15 |
| king | 60–70 | 35.2 | 134.1 | 4.0 | 5.1 turns | 32.2 | 100 |
| skeleton | 8–12 | 5.9 | 3.2 | 1.2 | 30.8 turns | 2.9 | 8 |
| zombie | 10–14 | 6.9 | 4.4 |  | 27.2 turns | 3.9 | 10 |
| rat | 1–3 | 1.7 | 0.8 |  | 18.5 turns | 1.0 | 2 |
| bat (rough) | 2–3 | 1.9 | 0.6 |  | 26.9 turns | 1.0 | 3 |
| spider | 3–5 | 2.6 | 2.1 | 2.1 | 15.9 turns | 1.1 | 6 |
| giant | 12–16 | 8.0 | 15.7 | 5.1 | 8.9 turns | 5.0 | 25 |
| cultist | 6–9 | 4.5 | 6.7 |  | 10.6 turns | 2.0 | 12 |
| troll | 30–40 | 25.7 | 62.6 |  | 7.9 turns | 21.3 | 40 |

**depth 2:** sword, level 3, chainmail (28 hit points).

| Monster | Hit points | Blows | Lost | Bleeding, poison | Kills you in | Blows, from a sneak blow | XP |
|---|---:|---:|---:|---:|---:|---:|---:|
| goblin | 3–6 | 1.7 | 0.4 |  | 48.0 turns | 1.0 | 5 |
| warrior | 10–14 | 3.8 | 3.9 | 1.4 | 19.9 turns | 1.3 | 15 |
| king | 60–70 | 17.9 | 56.9 | 4.0 | 8.3 turns | 14.9 | 100 |
| skeleton | 8–12 | 3.3 | 0.9 | 0.3 | 68.0 turns | 1.1 | 8 |
| zombie | 10–14 | 3.8 | 1.5 |  | 53.3 turns | 1.3 | 10 |
| rat | 1–3 | 1.3 | 0.2 |  | 58.3 turns | 1.0 | 2 |
| bat (rough) | 2–3 | 1.3 | 0.1 |  | 84.8 turns | 1.0 | 3 |
| spider | 3–5 | 1.6 | 0.4 | 0.9 | 40.0 turns | 1.0 | 6 |
| giant | 12–16 | 4.3 | 5.6 | 4.1 | 16.7 turns | 1.6 | 25 |
| cultist | 6–9 | 2.6 | 2.1 |  | 21.5 turns | 1.0 | 12 |
| troll | 30–40 | 11.2 | 21.9 |  | 13.1 turns | 7.6 | 40 |

**depth 3:** axe, level 5, chainmail and helmet (36 hit points).

| Monster | Hit points | Blows | Lost | Bleeding, poison | Kills you in | Blows, from a sneak blow | XP |
|---|---:|---:|---:|---:|---:|---:|---:|
| goblin | 3–6 | 1.4 | 0.2 |  | 82.3 turns | 1.0 | 5 |
| warrior | 10–14 | 2.9 | 2.2 | 0.8 | 31.0 turns | 1.0 | 15 |
| king | 60–70 | 13.0 | 36.9 | 3.9 | 11.7 turns | 10.0 | 100 |
| skeleton | 8–12 | 2.5 | 0.5 | 0.2 | 110.8 turns | 1.0 | 8 |
| zombie | 10–14 | 2.9 | 0.8 |  | 83.1 turns | 1.0 | 10 |
| rat | 1–3 | 1.3 | 0.1 |  | 100.0 turns | 1.0 | 2 |
| bat (rough) | 2–3 | 1.3 | 0.1 |  | 145.5 turns | 1.0 | 3 |
| spider | 3–5 | 1.3 | 0.2 | 0.5 | 68.6 turns | 1.0 | 6 |
| giant | 12–16 | 3.2 | 3.2 | 3.3 | 25.2 turns | 1.0 | 25 |
| cultist | 6–9 | 2.0 | 1.1 |  | 33.6 turns | 1.0 | 12 |
| troll | 30–40 | 7.9 | 13.4 |  | 18.5 turns | 4.5 | 40 |

## What each depth holds

| Depth | Rooms | Monsters (each kind, on average) | Things (on average) |
|---|---:|---|---|
| 1, The old crypts | 25.0 | rat 11.0, zombie 3.2, cultist 3.1, skeleton 3.1, spider 2.2 | potion 4.1, dagger 2.2, helmet 1.7, sword 1.6, chainmail 0.9 |
| 2, The broken deep | 25.0 | goblin 24.5, rat 5.8, zombie 1.8, spider 1.4, warrior 1.0, bat 0.5, giant 0.1 | potion 3.0, dagger 1.8, axe 1.4, sword 1.4, helmet 1.2, chainmail 0.6, warhammer 0.6 |
| 3, The goblin warrens | 20.8 | goblin 28.8, warrior 8.9, rat 1.1, king 1.0, bat 0.6, troll 0.4, spider 0.4, giant 0.1 | potion 2.9, dagger 1.6, sword 1.2, axe 1.0, helmet 1.0, warhammer 0.6, chainmail 0.4 |

## Clearing a level, and what it gives

Every pack on the level fought, one pack at a time, with that depth's gear: the hit points it costs fighting
each pack where only one can reach the player (a corridor's mouth) and in the open (all of the pack at once).
Against it: the healing potions on the level, and the turns of rest to heal the rest. The experience is all of
it, and the level it brings the player to, all told from the start.

| Depth | Packs | XP | Level after | Lost, one at a time | Lost, in the open | Potions heal | Rest to heal the rest (one at a time) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 (dagger, level 1, no armour) | 8.3 | 130 | 4 | 57.6 | 146.7 | 39.3 | 91 turns |
| 2 (sword, level 3, chainmail) | 8.1 | 180 | 6 | 19.2 | 85.8 | 28.4 | 0 turns |
| 3 (axe, level 5, chainmail and helmet) | 8.3 | 404 | 8 | 67.7 | 124.4 | 27.2 | 203 turns |

(Resting heals a hit point every 5 turns; walking about, every 20. A potion heals 7–12.
Murky potions, traits on things and monsters, and rooms' traits are left out of these sums.)

## Not in the maths yet

- **Oil and dread:** not in the game yet (the light feature set).
- **Monsters' Depth and Level, and the two-fifths rule** (round 28): not in the content yet.
- **Stealth:** how often a level can be crossed unseen; its own small simulation, with the stealth rules.
- **Traits** on things, monsters and rooms: left out of the sums above.
