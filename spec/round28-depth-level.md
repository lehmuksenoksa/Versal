# Round 28: Depth and Level, your idea

**Answered.** All my picks, except one:
- **Level follows:** depth.
- **How far Level closes the gap:** two fifths. "We will need to playtest this at some point. Hard
  to decide now with limited information."
- **How common a monster stays deeper:** peaks, then fades, never gone.
- **An item's Depth:** the deepest of its parts.
- **The Deep Dark when it isn't the end game:** a lesser boss early, the dark elf wizard made
  stronger.
- **Strangers and challenges:** Depth **and Level** (not my pick): traps hurt more deeper, strangers
  offer more deeper.
- **Words:** depth 1 to 20 for the dungeon; Level only for power.
- **The end game's three:** as now: the prince 18, the steel golem 18, the dragon 20.

In your words: "Items, strangers and monsters, and environmental challenges should all have a
property that tells at what depth do they start to appear. To guide generation: the deeper we go,
the more dangerous it gets, but the rewards become bigger as well." Recorded in
`04-systems.md` (Depth and Level). This round settles what you left open and what my critique
raised. One question each.

## What a monster's Level follows

A rat met at depth 10 should be tougher than one at depth 1, but not as tough as a monster of Depth 10. What sets how much tougher?

| Option | What | |
|---|---|---|
| Depth | Where it's met. The deeper, the higher its Level. | my pick |
| Player level | The player's level. Monsters grow as you grow. |  |
| Both, half each | Half from depth, half from the player's level. |  |

**Why depth:** it keeps "the deeper, the more dangerous, the bigger the rewards". Scaling with the player's level makes levelling up feel like nothing, because everything grows with you (a well-known complaint in games that did it), and it punishes a player who gained levels by sneaking and exploring. It's also the simplest to balance: one curve, by depth. **Rules out:** a weak character having an easier time anywhere; depth alone decides.

## How far Level closes the gap

A monster's Level is its Depth plus part of the way to where it's met. How much of the way?

| Option | What | |
|---|---|---|
| A quarter | A rat met at depth 10 is Level 3. Old foes stay easy. |  |
| Two fifths | A rat met at depth 10 is Level 4.6. Tougher, still well short of a Depth 10 monster. | my pick |
| Three fifths | A rat met at depth 10 is Level 6.4. Old foes stay a real threat. |  |

**Why two fifths:** it matches your rat. The number is a starting point: simulated runs will tune it while building. What matters now is that it's one number for every monster.

## How common a monster stays deeper

Rats appear from Depth 1 and aren't limited to it. How often do they turn up deeper?

| Option | What | |
|---|---|---|
| Just as common | As common at depth 15 as at depth 1. |  |
| Peaks, then fades | Most common from its Depth to a few levels deeper, then rarer, never gone. | my pick |
| Peaks, then gone | Common for a few levels, then no more. |  |

**Why peaks then fades:** the deep fills with what belongs there, while an old foe can still turn up, now tougher. It also replaces the Over Dungeon's hand-made 6/3/1 mix (round 21) with one rule that works everywhere. **Costs:** two numbers for the whole game (how long it peaks, how fast it fades), tuned by simulated runs. Bosses and the end game's three are the exception: they don't spread.

## An item's Depth

A crude dagger is shallow; a mithril dagger of dragon slaying is deep. Items are made of a thing and its tags (round 24). Where does an item's Depth come from?

| Option | What | |
|---|---|---|
| The deepest of its parts | The thing and each tag have a Depth. The item's is the deepest of them: mithril makes any dagger deep. | my pick |
| Its parts added up | Each tag adds to the thing's Depth: more tags, deeper. |  |
| Set by hand | Each finished item has its own Depth, written down. |  |

**Why the deepest:** one Depth per thing and per tag (about 60 things, about 40 tags) covers every combination, and it reads simply: a tag is found from its Depth on. Adding up punishes items with many small tags. Setting it by hand doesn't scale to the combinations. **Also:** items get no Level: the tags already scale them.

## The Deep Dark when it isn't the end game

The Deep Dark can come before the end game (levels 13 to 18), with the prince as its boss. With the prince at Depth 18, he'd appear higher up whenever that happens, not "very, very rarely".

| Option | What | |
|---|---|---|
| Only ever the end game | The full Deep Dark appears only at the bottom. Higher up, only its small version. |  |
| A lesser boss early | An early Deep Dark's boss is the dark elf wizard made stronger, as with the bandit chief (round 25). The prince is kept for the end game. | my pick |
| The prince comes higher | The prince's Depth comes down to 13. |  |

**Why a lesser boss:** the Deep Dark keeps its place in the middle of a run, and the prince stays the end game's, as you said. It follows your own rule from round 25 (a stronger leader of whoever's there). **The same check** for the Drowned City's horror (Depth 13, region levels 8 to 13) holds: the horror is met at its lair, the region's last level, 13 or deeper.

## Strangers and challenges

Strangers and environmental challenges get a Depth. Do they also get a Level?

| Option | What | |
|---|---|---|
| Depth only | They appear from their Depth. A trap is a trap. | my pick |
| Depth and Level | Traps hurt more deeper; strangers offer more deeper. |  |

**Why Depth only:** a stranger's offer and a trap's harm can be set by where they're found without a second number. Fewer moving parts to balance. A trap's damage can follow depth later if testing shows it needs to.

## Words

The dungeon has levels, the player has a level, and now monsters have a Level.

| Option | What | |
|---|---|---|
| Depth and Level | The dungeon's levels are called depth 1 to 20. Level means only power: the player's, or a monster's. | my pick |
| Leave as is | Level means all three, as the context says. |  |

**Why:** in the spec, the code and the game's own text ("Depth 12"), one word for one thing avoids mistakes. It changes wording, not the game.

## The end game's three

The dark elf prince, the dragon and the steel golem: Depth 18 to 20, one number each.

| Option | What | |
|---|---|---|
| As now | The prince 18, the steel golem 18, the dragon 20: from the danger ladder. | my pick |
| All 20 | All three only on the last level. |  |
| Spread | The steel golem 18, the prince 19, the dragon 20. |  |

**Why as now:** the end game spans levels 18 to 20, and the steel golem guards the Keep through all three, not only the last. The bosses meet you at their lair, the last level, whatever their Depth, so their Depth only says how far up they may very rarely appear.
