# Round 43: slice 1's features

**Answered.** In slice 1:
- **Light:** braziers, candles, campfires; a torch on the wall. (No lantern on a hook.)
- **Floors:** rubble, bones, shallow water, moss and soft earth, wooden boards. (No rushing water.)
- **Water:** "Let's just do these: shallow water, deep water, and a current in either of them. A
  current moves player or monster." (No still water as its own feature.)
- **Doors and ways:**
  - doors; secret doors;
  - **a barricade:** "can be attacked to be opened. Takes X damage to break. Makes noise. Cannot be
    closed again";
  - **a gate:** "Seen through. Lever somewhere on the same map closes or opens"; and its lever.
  - Not a feature: the narrow way ("Isn't this basically just a corridor/tunnel that's one grid
    wide"): one-wide corridors and tunnels do it, by layout.
  - Later: the locked door ("with keys"), the collapsed passage ("with pickaxe").
- **Traps:** the tripwire, the pressure plate, and **the net:** "Holds you while monsters come. Can
  be attacked. Takes X damage to break." Later: falling rocks ("can become collapsed passage, when
  both are being implemented").
- **Hazards:** fire, webs.
- **Containers:** chests ("Not locked yet. No keys. Later."); **crates and barrels** ("Can be broken.
  Some contain things."); sacks and baskets; bodies; **nests and hoards** ("Goblin stashes, rat nests,
  spider webs."); hidden caches; coffins and sarcophagi; weapon and armour racks. No urns.
  **A look rule:** "Containers to interact with need to be graphically different from decorations."
- **Things to use:** the gong. (No cages and pens, oil, bookshelves, places to rest, altar.)

Tiers are in the catalogue (`environment`, `tier`).

For the plain Over Dungeon, depths 1 to 6: round 22's environmental features and containers (as
kept), with their Depths (round 31). Not in slice 1 already: height (ledges, chasms, rope bridges,
high ground, pits; round 39 in chat), glowing fungus, forge glow and lava. Rows that depend on
something left out say so.

## Light

All light comes from sources (light-and-dread.md).

| Feature | What | Note | My pick |
|---|---|---|---|
| Braziers, candles, campfires | Depth 1 · Lit; can be put out (a turn or two, and a noise), and relit by monsters | in the game | Yes |
| A torch on the wall | New (light-and-dread.md) · lights corridors; put out, relit | a new small look | Yes |
| A lantern on a hook | Depth 1 · Take it, or put it out | now that lights are items, one you can take | open |

## Sound underfoot



| Feature | What | Note | My pick |
|---|---|---|---|
| Rubble floor | Depth 1 · Loud to walk on | in the game | Yes |
| Bones | Depth 1 · Crunch underfoot, loud | — | Yes |
| Shallow water | Depth 1 · Wading: slow and loud | in the game (flooded rooms) | Yes |
| Moss and soft earth | Depth 3 · Quiet to walk on | quiet: the sneak's floor | Yes |
| Wooden boards and bridges | Depth 1 · Creak, loud | — | open |
| Rushing water | Depth 4 · A waterfall or rapids that cover your noise, and theirs | covers your noise, and theirs | open |

## Water



| Feature | What | Note | My pick |
|---|---|---|---|
| Deep water | Depth 3 · Swim: silent, but the lamp goes out | swim: silent, but your light goes out; shoving into it | open |
| A current | Depth 5 · Carries you along, one way | — | open |
| Still water | Depth 2 · Where leeches and worse wait | leeches, eels | open |

## Doors and ways



| Feature | What | Note | My pick |
|---|---|---|---|
| Door | Depth 1 · Open, close; monsters open them too | in the game | Yes |
| Secret door | Depth 2 · Found by searching, hinted by rubble or marks on the floor | in the game: found by searching | Yes |
| Narrow way | Depth 1 · A crawlway or crack: one at a time, so a swarm can be fought there | where a swarm is fought one at a time | Yes |
| Barricade | Depth 1 · Block a door, or break through one | — | open |
| Gate | Depth 3 · A portcullis to drop between you and them; never blocks the way on | a portcullis, with its lever | open |
| Lever | Depth 3 · Opens a gate or a hidden way | — | open |
| Locked door | Depth 1 · A key, or picked (time and noise) | no keys or lockpicks in slice 1 (round 42) | No |
| Collapsed passage | Depth 2 · Dug through with a pickaxe | no pickaxe in slice 1 (round 42) | No |

## Traps

Round 39's maybe: traps may wait for a later slice.

| Feature | What | Note | My pick |
|---|---|---|---|
| Tripwire | Depth 1 · Rings a bell: an alarm | rings a bell: an alarm (the bandits') | open |
| Pressure plate | Depth 3 · Darts or spikes | — | open |
| Falling rocks | Depth 6 · The ceiling comes down | — | open |
| Net | Depth 4 · Holds you fast | — | open |
| Pit trap | Depth 4 · A hidden pit | height: not in slice 1 | No |
| Gas vent | Depth 8 · A cloud of gas or spores | — | No |

## Hazards



| Feature | What | Note | My pick |
|---|---|---|---|
| Fire | Depth 3 · Spreads, burns, and lights the place | from a flask, a campfire: shove into it | Yes |
| Webs | Depth 1 · Stick to you; the spiders feel you through them | slice 1 has spiders | Yes |
| Steam vents | Depth 10 · Scald, but the steam hides you | — | No |
| Unstable floor | Depth 5 · Gives way under weight | — | No |
| Lava | Depth 13 · Deadly to touch; lights everything | Depth 13 | No |

## Containers



| Feature | What | Note | My pick |
|---|---|---|---|
| Chest | Depth 1 · Holds the better things; may be locked or trapped | — | Yes |
| Crates and barrels | Depth 1 · Cover to hide behind; some can be pushed | in the game | Yes |
| Sacks and baskets | Depth 1 · Quick to search, small things | — | Yes |
| Bodies | Depth 1 · What those before you carried | what those before you carried | Yes |
| Nests and hoards | Depth 3 · What a beast, a goblin or the dragon has gathered | goblin stashes | Yes |
| Hidden caches | Depth 2 · Behind a loose stone or under the floor: found by searching | found by searching | Yes |
| Urns | Depth 1 · Grave goods; disturbing them may wake the dead | may wake the dead | open |
| Coffins and sarcophagi | Depth 2 · Grave goods, and maybe their owner | the dead | open |
| Weapon and armour racks | Depth 2 · Gear in the armoury or the guardroom | — | open |

## Things to use



| Feature | What | Note | My pick |
|---|---|---|---|
| A gong | The bell · rung by an alarm-raiser, it rouses its side (stealth.md, section 8) | goblin camps and guard posts | Yes |
| Cages and pens | Depth 4 · Open them to let beasts loose on your foes | the goblins' wolves: open them on your foes | open |
| Oil | Depth 2 · A spill or a barrel to set alight | a spill or a barrel to set alight | open |
| Bookshelves | Depth 3 · Notes and scrolls to find; reading needs light | notes to read; reading needs light | open |
| Places to rest | Depth 1 · A hot spring, a bath, a kept shrine: rest is safer there | resting isn't specified yet | open |
| Altar | Depth 1 · Lifts curses; holy ground to rest | lifts curses: curses come with slice 2 | No |
