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

## The hierarchy (yours, after round 21)

In your words: "A region consists of several levels with a common theme. The maps have a distinct
look and there's a set of enemies and strangers who can appear and environmental gameplay
features. They can contain smaller areas, which can contain a set of rooms and a set of enemies and
strangers who can appear. A room is one room some of those: distinct look, a set of items, a set of
enemies in certain state, environmental gameplay features. A smaller region is just one level. A
sub-region is level or half a level attached to larger region." And: "The Over Dungeon is a
generic region that can be used at any depth for the branching paths between more thematic areas."

| Level | What it is | What it has |
|---|---|---|
| **Region** | Several levels with a common theme | A distinct look; enemies and strangers who can appear; environmental gameplay features; areas |
| **The Over Dungeon** | A generic region, used at any depth, for the branching ways between the themed ones | Its look and monsters change with depth |
| **Smaller region** | One level, on its own: the bandits' hold, a region's smaller version (a goblin outpost, a dwarven hall…) | As a region, at one level's size |
| **Transition** | A smaller region that leads from one region to another: the mines, the sewers, a breach | As a smaller region |
| **Sub-region** | A level or half a level, attached to a larger region: the archive, the cult's sanctum | As a smaller region, but only inside its regions |
| **Area** | Part of a level | A set of rooms; enemies and strangers who can appear |
| **Room** | One room | Some of: a distinct look, items, enemies in a certain state, environmental features |

Also each needs (my additions, agreed "pretty much"):
- **its depth range** (monsters filtered by the danger ladder there);
- **how its levels connect** (stairs, where a way down splits, what each fork leads to);
- **a boss and its lair** (for a region);
- **its light;**
- **how its maps are made;**
- **its things to find;**
- **how rare it is;**
- **its story.**

**Not every room is in an area** (yours, after round 26): "Areas are there to make random
generated maps feel more designed by an actual sentient being." A level is a few areas set among
loose rooms: corridors, ordinary rooms, storerooms, empty cells. The loose rooms come from the
region's (or the Over Dungeon's) common rooms. How much of a level is areas and how much is loose
is for generation (part 6).

Duties (guarding a post, walking a round) belong to areas and rooms. A room has a common kind and a
region's variant: a storeroom in the warrens isn't one in the keep.

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
