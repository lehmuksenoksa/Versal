# The world plan (round 21)

Your outline: "I'd like us to plan "Over Dungeon", which consists of more general dungeon, and
can have any of the monsters, based on depth. More depth > generally more dangerous foes or bigger
groups of lesser foes, but also some easier foes there as well. Then the regions and other themed
areas. Some themed areas or rooms can only happen inside a specific region. These regions would
have specific level range where they can appear, and they have a specific list of locations and
monster that will be generated there."

And: "In my mind, out of the 5 main regions only 2-3 appear on each run. One of them is always
the end game. I'm also thinking that I could be good to have some of these appear as smaller
regions sometimes. For example, dwarven keep could appear higher in the dungeon, with less map
space/levels, more depth approriate challenge and no dragon." And: "Overall, I'd like to see at
least 5 themed areas. But then we would probably need the depth to be 20 levels all-in-all, to
allow space for that." And: "When I said themed areas: I meant regions, transitions and
"themed areas" - which I would change to "sub-regions"."

So **themed areas** are all three kinds: regions, transitions and sub-regions (what were called
themed areas before), and a run has at least five of them.

A draft, to correct. The page: https://claude.ai/artifact/J78tDpCuv2GMniBu47AYru. The data:
`data/catalogue.json`, under `world` and `ladder`. Monster danger is in rats (round 20); the
numbers sketch the shape of the climb.

## Twenty levels

Shallow 1 to 7, middle 8 to 14, deep 15 to 20. A fair fight (the biggest a character at that
level should win, in rats) grows 3, 4, 4, 5, 6, 7, 8, 10, 11, 13, 16, 19, 22, 26, 31, 36, 43, 50, 59, 70.

Critique:
- **Pace.** A run of 2 to 4 hours (round 13) over twenty levels is 6 to 12 minutes a level: smaller
  levels, or longer runs. Regions' maps count as levels.
- **The deep end grows thinner.** Nothing new turns up in the Over Dungeon below level 18. The
  extra depth makes the question of a few deep kinds of its own more pressing.

## How a run is made

- Each run has at least five themed areas (regions, transitions and sub-regions together), with the Over Dungeon between them. Of the 5 regions, 2 or 3 appear. One is always the end game: at the bottom (levels 18 to 20), full, with its boss at its strongest. The others come on the way, full (at their range, with their boss) or small (higher up, a map or two, no boss).
- **Can be the end game** (my proposal): The Dwarven Keep, the Deep Dark or the Drowned City.
- **Monsters by depth:** A region's monsters are filtered by the depth it's placed at: those whose danger fits the step (the ladder). A small region higher up gets the lesser of its kind.

| Region | Full | Small version | Can be the end game |
|---|---|---|---|
| The Dungeon Underneath | levels 1 to 6, 2 to 3 maps, the lich | A dungeon wing: levels 1 to 9, 1 map(s); instead of the boss, its holder's leader (the cult priest, a skeleton warrior, the bandit chief) | no |
| Goblin Territory | levels 4 to 11, 2 to 3 maps, the goblin king | A goblin outpost: levels 2 to 9, 1 map(s); instead of the boss, a goblin chieftain | no |
| The Drowned City | levels 8 to 13, 2 to 3 maps, the eldritch horror | A flooded quarter: levels 4 to 11, 1 to 2 map(s); instead of the boss, no boss; an abomination at most | yes |
| The Deep Dark | levels 13 to 18, 2 to 3 maps, the dark elf prince | A dark elf outpost: levels 8 to 15, 1 to 2 map(s); instead of the boss, a dark elf wizard | yes |
| The Abandoned Dwarven Keep | levels 17 to 20, 3 maps, the dragon | A dwarven hall: levels 6 to 15, 1 to 2 map(s); instead of the boss, no dragon; a golem as its guardian | yes |

Example runs, top to bottom, each with five or more themed areas:
1. The Over Dungeon → The Dungeon Underneath (region, levels 1 to 6: the lich), with the cult's sanctum (sub-region) inside → The sewers (transition) → A flooded quarter (small Drowned City, level 9) → The mines (transition) → The Abandoned Dwarven Keep (end game: the dragon)
2. The Over Dungeon → The bandits' hold (sub-region) → A goblin outpost (small Goblin Territory, level 5) → The Drowned City (region, levels 9 to 13: the eldritch horror), with the archive (sub-region) inside → A breach (transition) → The Deep Dark (end game: the dark elf prince)
3. The Over Dungeon → A dungeon wing (small Dungeon Underneath, level 3) → Goblin Territory (region, levels 5 to 11: the goblin king) → The mines (transition) → A dwarven hall (small Dwarven Keep, level 14), with the archive (sub-region) inside → The Drowned City (end game: the eldritch horror, at its strongest)

Critique: whichever region is the end game, its boss is the run's last test, so the eldritch
horror or the dark elf prince fights at the dragon's level then, and at its own level when met on
the way: one boss to draw, two sets of numbers.

## Generation: sub-regions and diverging paths (your notes)

- "I would consider the smaller versions of regions as sub-regions from generation point of
  view." A region's small version is placed as a sub-region: a map or two, set where its range
  allows.
- "I'd also like diverging paths in the generated dungeon. The player can go down different ways
  to different paths through the dungeon. One choice might lead to a Transition, one might lead to
  Over Dungeon." The levels branch: a way down can split in two, and two ways can join again. Each
  way can lead somewhere different.
- "Can we simulate these kind of branching paths?" Yes: the run simulator
  (`mockups/runs.html`).

## The Over Dungeon

The general dungeon between and around the regions: any monster, by depth. Its ground changes with depth: built rooms near the top, falling in, then caves, then something deeper still.

What a fight there is made of (my proposal):
- **6 in 10, at its depth:** Monsters that first appear at this level or the one above, in groups sized to a fair fight.
- **3 in 10, lesser, in bigger groups:** Monsters from shallower levels, more of them, so the fight is still fair (twelve rats instead of one wolf).
- **1 in 10, easy:** A lone lesser foe: a breather.
- **now and then, from deeper:** One monster from two levels deeper: a surprise (round 6's 'a stranger from deeper').

Never in the Over Dungeon: Lich, Goblin king, Eldritch horror, Dark elf prince, Dragon, Shadow, Abomination, Lurker, Dark elf wizard, Steel golem.

Its locations: Storeroom, Gallery, Pillared hall, Crypt, Jail, Barracks, Dining hall, Shrine, Guardroom, Well room, Larder, Kitchen, A collapsed wing, A flooded wing, A dry well, A sinkhole, A stair tower, A smugglers' stash, A hermit's hollow, An adventurers' last camp, A barricaded room, A lost party's camp, A peddler's stall, A kept shrine, A hideout in a crack, A trapper's den, Goblin camp, Goblin guard post, Spider nest, Mushroom grove, Crystal grotto, River crossing, Hot spring, Ledge path, Cave-in maze.

## The regions

### The Dungeon Underneath (levels 1 to 6; boss: Lich)

A castle-like dungeon, held each run by the dead garrison, the cult or outlaws (round 15); the lich leads the dead or the cult.

- **Monsters:** Rat, Giant rat, Spider, Skeleton, Skeleton warrior, Skeleton archer, Zombie, Bone heap, Ghost, Wight, Cultist, Cultist warrior, Cultist archer, Cult priest, Bandit, Bandit archer, Bandit chief, Thief, Mimic.
- **Locations:** Guard post, Guardroom, Barracks, Prison block, Jail, Armoury, Kitchen, Larder, Dining hall, Gatehouse, Crypt, Crypt row, Ossuary, Sarcophagus chamber, Shrine, Chapel, Temple, Torture chamber, Treasury, Bath, Well room, Statue gallery, Sealed wing, A collapsed wing.
- **Only here:** The lich's tomb (the boss's lair), Prison block, Ossuary, Sarcophagus chamber.
- **Sub-regions found here:** The archive, The cult's sanctum.

### Goblin Territory (levels 4 to 11; boss: Goblin king)

Goblin caves: camps, guard posts and warrens common; halls and the throne room rare (round 15).

- **Monsters:** Rat, Wolf, Dire wolf, Goblin, Goblin warrior, Goblin archer, Goblin shaman, Goblin chieftain, Goblin beasthound, Ogre, Troll.
- **Locations:** Goblin camp, Goblin guard post, Warrens, Crude prison, Beast pens, Nursery, Fighting pit, Kitchen, Larder, Armoury, Halls (rare), Throne room (rare).
- **Only here:** Throne room, Fighting pit, Beast pens, Nursery, Crude prison, Warrens.

### The Drowned City (levels 8 to 13; boss: Eldritch horror)

Ruins half under black water; something old and wrong sleeps under it.

- **Monsters:** Eel, Cave crab, Leech, Snake, Slime, Ooze, Floating eye, Water elemental, Shadow, Lurker, Abomination, Cultist, Cult priest.
- **Locations:** Flooded streets, A flooded wing, Cistern, Pool room, Temple, Ruined chapel, Bath, Well room, Statue gallery, A river crossing, A sunken plaza.
- **Only here:** Flooded streets, A sunken plaza, The horror's pool (the boss's lair).
- **Sub-regions found here:** The archive, The cult's sanctum.

### The Deep Dark (levels 13 to 18; boss: Dark elf prince)

Natural caves and what lives in them: glowing fungus, webs, vents, the rift, bones, roots. The dark elves rule here.

- **Monsters:** Bat, Giant spider, Giant centipede, Cave bear, Cave lion, Worm, Snake, Ooze, Troll, Earth elemental, Dark elf, Dark elf warrior, Dark elf archer, Dark elf wizard.
- **Locations:** Glowing deep, Mushroom grove, Crystal grotto, Spider nest, Webs, Hot spring, Sulphur vents, Ledge path, The rift, Bone field, Underwood, A river crossing, A sinkhole, Dark elf outpost.
- **Only here:** Dark elf outpost, The prince's court (the boss's lair), The rift, Underwood.

### The Abandoned Dwarven Keep (levels 17 to 20; boss: Dragon)

A fallen dwarf city, its gates and halls, its forge still warm; the dragon sleeps on what's left of its wealth.

- **Monsters:** Golem, Bronze golem, Iron golem, Steel golem, Animated armour, Skeleton warrior, Ghost, Wight, Fire elemental, Greater fire elemental, Greater earth elemental, Mimic.
- **Locations:** Gates, Great stairway, Halls, Forge, Smithy, Workshop, Map room, Treasury, Bath, Crypt row, Statue gallery, Winch room, Gatehouse, Armoury, Sealed wing.
- **Only here:** Gates, Great stairway, Forge, Map room, The dragon's hoard (the boss's lair).
- **Sub-regions found here:** The archive.

## Transitions

- **The sewers** (levels 2 to 10), between the Dungeon Underneath and the Drowned City: Rat, Giant rat, Ooze, Slime, Eel, Leech, Thief; Channels, Cistern, Smugglers' hole.
- **The mines** (levels 6 to 16), between goblin Territory, the Deep Dark and the Dwarven Keep: Bat, Giant centipede, Worm, Earth elemental, Goblin; Mine-head, Cave-in maze, Miners' pocket, Winch room.
- **A breach** (levels 2 to 16), between any built place and the caves: Whatever lives on either side; A broken wall into the other side.

## Sub-regions

- **The bandits' hold**: The Over Dungeon, levels 1 to 10. Bandit, Bandit archer, Bandit chief, Thief, Wolf; Hideout, Storeroom, Smugglers' stash, Jail, Feast hall.
- **The archive**: Only in the Dungeon Underneath, the Drowned City and the Dwarven Keep (round 12). Floating eye, Mimic, Golem, Animated armour; Library, Alchemist's room, Scholar's dig, Statue gallery.
- **The cult's sanctum**: Only in the Dungeon Underneath and the Drowned City (round 12). Cultist, Cultist warrior, Cultist archer, Cult priest, Skeleton, Zombie; Temple, Sacrifice room, Summoning circle, Torture chamber, Prison cells.

## Also noted

A few locations the regions need that weren't brainstormed: flooded streets and a sunken plaza
(the Drowned City); a dark elf outpost (the Deep Dark); each boss's lair.

