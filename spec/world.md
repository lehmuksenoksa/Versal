# The world plan (round 21)

Your outline: "I'd like us to plan "Over Dungeon", which consists of more general dungeon, and
can have any of the monsters, based on depth. More depth > generally more dangerous foes or bigger
groups of lesser foes, but also some easier foes there as well. Then the regions and other themed
areas. Some themed areas or rooms can only happen inside a specific region. These regions would
have specific level range where they can appear, and they have a specific list of locations and
monster that will be generated there."

This is the draft from it, to correct. The page: https://claude.ai/artifact/ (world plan; link in
the chat). The data: `data/catalogue.json`, under `world`. Monster danger is in rats (round 20);
the numbers sketch the shape of the climb.

## The Over Dungeon

The general dungeon between and around the regions: any monster, by depth. Its ground changes with depth: built rooms near the top, falling in, then caves, then something deeper still.

What a fight there is made of (my proposal):

- **6 in 10, at its depth:** Monsters that first appear at this step or the one above, in groups sized to a fair fight.
- **3 in 10, lesser, in bigger groups:** Monsters from shallower steps, more of them, so the fight is still fair (twelve rats instead of one wolf).
- **1 in 10, easy:** A lone lesser foe: a breather.
- **now and then, from deeper:** One monster from two steps deeper: a surprise (round 6's 'a stranger from deeper').

Never in the Over Dungeon: Lich, Goblin king, Eldritch horror, Dark elf prince, Dragon, Shadow, Abomination, Lurker, Dark elf wizard, Steel golem (bosses, and what belongs only to one region).

Its locations: Storeroom, Gallery, Pillared hall, Crypt, Jail, Barracks, Dining hall, Shrine, Guardroom, Well room, Larder, Kitchen, A collapsed wing, A flooded wing, A dry well, A sinkhole, A stair tower, A smugglers' stash, A hermit's hollow, An adventurers' last camp, A barricaded room, A lost party's camp, A peddler's stall, A kept shrine, A hideout in a crack, A trapper's den, Goblin camp, Goblin guard post, Spider nest, Mushroom grove, Crystal grotto, River crossing, Hot spring, Ledge path, Cave-in maze.

## The regions

### The Dungeon Underneath (steps 1 to 4; boss: Lich)

A castle-like dungeon, held each run by the dead garrison, the cult or outlaws (round 15); the lich leads the dead or the cult.

- **Monsters:** Rat, Giant rat, Spider, Skeleton, Skeleton warrior, Skeleton archer, Zombie, Bone heap, Ghost, Wight, Cultist, Cultist warrior, Cultist archer, Cult priest, Bandit, Bandit archer, Bandit chief, Thief, Mimic.
- **Locations:** Guard post, Guardroom, Barracks, Prison block, Jail, Armoury, Kitchen, Larder, Dining hall, Gatehouse, Crypt, Crypt row, Ossuary, Sarcophagus chamber, Shrine, Chapel, Temple, Torture chamber, Treasury, Bath, Well room, Statue gallery, Sealed wing, A collapsed wing.
- **Only here:** The lich's tomb (the boss's lair), Prison block, Ossuary, Sarcophagus chamber.
- **Themed areas found here:** The archive, The cult's sanctum.

### Goblin Territory (steps 3 to 7; boss: Goblin king)

Goblin caves: camps, guard posts and warrens common; halls and the throne room rare (round 15).

- **Monsters:** Rat, Wolf, Dire wolf, Goblin, Goblin warrior, Goblin archer, Goblin shaman, Goblin chieftain, Goblin beasthound, Ogre, Troll.
- **Locations:** Goblin camp, Goblin guard post, Warrens, Crude prison, Beast pens, Nursery, Fighting pit, Kitchen, Larder, Armoury, Halls (rare), Throne room (rare).
- **Only here:** Throne room, Fighting pit, Beast pens, Nursery, Crude prison, Warrens.

### The Drowned City (steps 5 to 8; boss: Eldritch horror)

Ruins half under black water; something old and wrong sleeps under it.

- **Monsters:** Eel, Cave crab, Leech, Snake, Slime, Ooze, Floating eye, Water elemental, Shadow, Lurker, Abomination, Cultist, Cult priest.
- **Locations:** Flooded streets, A flooded wing, Cistern, Pool room, Temple, Ruined chapel, Bath, Well room, Statue gallery, A river crossing, A sunken plaza.
- **Only here:** Flooded streets, A sunken plaza, The horror's pool (the boss's lair).
- **Themed areas found here:** The archive, The cult's sanctum.

### The Deep Dark (steps 8 to 11; boss: Dark elf prince)

Natural caves and what lives in them: glowing fungus, webs, vents, the rift, bones, roots. The dark elves rule here.

- **Monsters:** Bat, Giant spider, Giant centipede, Cave bear, Cave lion, Worm, Snake, Ooze, Troll, Earth elemental, Dark elf, Dark elf warrior, Dark elf archer, Dark elf wizard.
- **Locations:** Glowing deep, Mushroom grove, Crystal grotto, Spider nest, Webs, Hot spring, Sulphur vents, Ledge path, The rift, Bone field, Underwood, A river crossing, A sinkhole, Dark elf outpost.
- **Only here:** Dark elf outpost, The prince's court (the boss's lair), The rift, Underwood.

### The Abandoned Dwarven Keep (steps 10 to 12; boss: Dragon)

A fallen dwarf city, its gates and halls, its forge still warm; the dragon sleeps on what's left of its wealth.

- **Monsters:** Golem, Bronze golem, Iron golem, Steel golem, Animated armour, Skeleton warrior, Ghost, Wight, Fire elemental, Greater fire elemental, Greater earth elemental, Mimic.
- **Locations:** Gates, Great stairway, Halls, Forge, Smithy, Workshop, Map room, Treasury, Bath, Crypt row, Statue gallery, Winch room, Gatehouse, Armoury, Sealed wing.
- **Only here:** Gates, Great stairway, Forge, Map room, The dragon's hoard (the boss's lair).
- **Themed areas found here:** The archive.

## Transitions

- **The sewers** (steps 2 to 6), between the Dungeon Underneath and the Drowned City: Rat, Giant rat, Ooze, Slime, Eel, Leech, Thief; Channels, Cistern, Smugglers' hole.
- **The mines** (steps 4 to 10), between goblin Territory, the Deep Dark and the Dwarven Keep: Bat, Giant centipede, Worm, Earth elemental, Goblin; Mine-head, Cave-in maze, Miners' pocket, Winch room.
- **A breach** (steps 2 to 10), between any built place and the caves: Whatever lives on either side; A broken wall into the other side.

## Themed areas

- **The bandits' hold**: The Over Dungeon, steps 1 to 6. Bandit, Bandit archer, Bandit chief, Thief, Wolf; Hideout, Storeroom, Smugglers' stash, Jail, Feast hall.
- **The archive**: Only in the Dungeon Underneath, the Drowned City and the Dwarven Keep (round 12). Floating eye, Mimic, Golem, Animated armour; Library, Alchemist's room, Scholar's dig, Statue gallery.
- **The cult's sanctum**: Only in the Dungeon Underneath and the Drowned City (round 12). Cultist, Cultist warrior, Cultist archer, Cult priest, Skeleton, Zombie; Temple, Sacrifice room, Summoning circle, Torture chamber, Prison cells.

## My critique

- **The regions overlap in depth, so routes branch.** For example, Goblin Territory (3 to 7) and
  the Drowned City (5 to 8), or the Deep Dark (8 to 11) and the Keep (10 to 12).
- **The Over Dungeon's deep end is thin.** Below step 10 nothing new turns up there: the deep's
  new kinds belong to regions. Either the deep Over Dungeon is mostly bigger groups (as you
  allowed), or it needs a few deep kinds of its own.
- **New, to name:** a few locations the regions need that weren't brainstormed:
  - flooded streets and a sunken plaza (the Drowned City);
  - a dark elf outpost (the Deep Dark);
  - each boss's lair.

