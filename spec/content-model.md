# The content model

What the plan for monsters, places and regions is for, and what we need to know about each thing
to get there. Agreed after round 15. The catalogue (`data/catalogue.json`) follows it: these are
its fields.

## The aim

The content plan is done when **every run can assemble itself from the catalogue**, and the run:
- has regions that each feel and play differently;
- has foes that each ask the sneaking player something different;
- puts everything where it makes sense;
- fits a scope we can draw and balance.

## Four tests for every entry

1. **Can the generator place it?** It knows where, how deep, how often, how many.
2. **Does it change how you play?** For a monster: how it senses you, and what gets you past it.
3. **Does it belong where it is?** Its regions and themes.
4. **Can we afford it?** What it costs to draw and balance, and whether the first release needs it.

Two things that test the same way (the same role and the same answer) are one too many: that's
the cull. A place or region that fails test 1 or 3 is a hole: that's the fill.

## Fields

What we have is marked ✓. The rest is to be decided, in about this order.

### Monsters

| Field | What | For test | Have |
|---|---|---|---|
| Name, line | What it is | — | ✓ |
| Tags | Its type's tags, and the extras it may have (round 10) | 2 | — |
| **Role** | Guard, patroller, ambusher, swarm, tracker, alarm-raiser, hunter, brute, caster, leader, boss… | 2 | round 16 |
| **Answer** | What gets you past it | 2 | round 16 |
| Depth band | How deep it's found (shallow, middle, deep) | 1 | — |
| Group | Alone, a pair, a pack (how many) | 1 | — |
| Rarity | Common, uncommon, rare | 1 | — |
| Regions, themes | Where it belongs | 3 | ✓ (regions proposed) |
| Tier | First release or later | 4 | — |
| Drawing | A new letter, look or animation | 4 | — |

### Places (areas and rooms)

| Field | What | For test | Have |
|---|---|---|---|
| Name, line, plays, tells | What it is, what it allows, what it tells | — | ✓ |
| Size | Area or room, and how much space it needs | 1 | partly |
| Needs | What it requires (water, a drop, a wall to stand against) | 1 | — |
| Occupants | Who's in it (a theme, a holder, nobody) | 3 | partly (themes) |
| Rarity | Common, uncommon, rare (as your goblin halls: rare, camps: common) | 1 | partly |
| Depth band | | 1 | — |
| Regions, themes | | 3 | ✓ |
| Tier, drawing | New furniture or ground | 4 | — |

### Regions, transitions, themed areas

| Field | What | For test | Have |
|---|---|---|---|
| Name, line, kind | | — | ✓ |
| Depths | Where in the world by depth it appears | 1 | — |
| Maps | How many, how big | 1 | — |
| How it sits | Replaces the world's maps or branches off | 1 | — |
| Themes | Its mix | 3 | partly |
| Links | Which transitions join it to what | 1 | — |
| Boss | | 2 | — |
| Rarity | How often in a run | 1 | — |
| Tier | | 4 | — |

### Strangers

Name, why, alone or a group, regions, themes (✓); **what they offer** (trade, a tip, help, to
follow you, a choice); rarity; tier.

## Left for building

The exact numbers (health, damage, speed, how far each sense reaches) are set while building, by
simulated runs, not in the spec.
