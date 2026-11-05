# Round 31: the Depth table

**Answered.** Everything as proposed, except seven marked shallower, without numbers. My reading,
to correct if wrong:

| | Proposed | Now |
|---|---|---|
| Short bow | 2 | 1 |
| Ring of quiet steps | 6 | 4 |
| Ring of strength | 10 | 7 |
| Wand of fire | 9 | 6 |
| Steel | 6 | 4 |
| Silver | 9 | 6 |
| Mithril | 15 | 12 |

Round 30's new foes: Depths and ranks as listed, the orcs' ranks included. The Depths are in the
catalogue (`data/catalogue.json`): on each stranger, thing and environmental feature, and the item
tags' under `itemTags.depth`.

Round 28 settled Depth: the level a thing starts to appear at, 1 to 20, not a limit. Monsters had
theirs from the danger ladder. This is my proposal for everything else: strangers, things to find,
item tags and environmental challenges, and round 30's new foes to confirm.

How I set them:
- **Shallow (1 to 7):** what a beginning needs: plain gear, healing, the first tools, common
  strangers, simple traps.
- **Middle (8 to 14):** stronger magic, steel, silver, the deeper strangers, harder hazards.
- **Deep (15 to 20):** mithril, dragon slaying.
- **Region things** (dwarven, dark elven, glowing fungus, lava) start near their region's
  shallowest level.
- An item's Depth is the deepest of its parts (round 28).

On the page: leave a row unticked if its Depth is fine; tick Shallower or Deeper if not.

Strangers left unmarked in round 7 and not taken up since (a deserter, a searcher, refugees, a
rescue party, a surveying party, turncoats, a wounded knight) aren't listed; nor is anything
dropped. The cook is out (round 29).

## Strangers met alone



| Depth | | What |
|---|---|---|
| 1 | A peddler | Follows adventurers down to buy their finds and sell them what they need |
| 1 | A prisoner | Taken by goblins, bandits or the cult |
| 1 | A priest | Keeps a shrine down here |
| 1 | A dog | Left behind by its master; follows whoever feeds it |
| 1 | A fellow adventurer | Came for the same reason you did |
| 2 | A kindly ghost | One of the dead who isn't hostile |
| 2 | A pilgrim | Come to a holy place below |
| 2 | A sellsword | Will follow you, for pay |
| 2 | A smuggler | Uses the deep ways to move goods |
| 3 | A lone survivor | The rest of their party died |
| 3 | A lost miner | Cut off by a cave-in |
| 3 | A mapmaker | Mapping the deep, and selling maps |
| 3 | A treasure hunter | After the tombs and vaults |
| 3 | A bard | Come down for a song worth singing |
| 4 | An escaped slave | Got away from the goblins, and hiding |
| 4 | A talking raven | Someone's familiar, outliving its master |
| 5 | A scholar | Studying the ruins |
| 5 | A chained beast | A captive monster who'd fight its captors if freed |
| 6 | A madman | Been down too long; useful truths among the ravings |
| 8 | A hermit | Fled the world above |
| 8 | A bound spirit | Trapped here, asking to be freed |
| 9 | A runaway apprentice | Fled a wizard's service with a stolen book |
| 10 | An undead dwarf | The last of the hold, risen but still themselves (your twist) |
| 12 | A golem | Still keeping its last order, and not against you |
| 12 | The last dwarf | Of the fallen hold |

## Strangers met in groups



| Depth | | What |
|---|---|---|
| 1 | Ratcatchers | Paid to clear the vermin from the upper levels |
| 2 | A party of adventurers | Friendly rivals, after the same as you (your idea) |
| 3 | Holy warriors | Come to put the dead to rest |
| 4 | Escaped prisoners | Fled the pens together |
| 5 | A miners' crew | Prospecting a new seam |
| 6 | Tomb wardens | Sworn to keep the old tombs |
| 8 | A scholars' expedition | Scholars with porters and guards, digging out ruins |
| 10 | A dwarven expedition | Come to take back a lost keep (your idea) |
| 10 | Monster hunters | Hunting one beast for its bounty |
| 13 | Deep-folk travellers | A small band of some deep folk, passing through |

## Weapons and armour

The things themselves. Their tags add Depth (below).

| Depth | | What |
|---|---|---|
| 1 | Dagger | Quick: strikes twice where others strike once; best for a sneak attack |
| 1 | Sword | Balanced: hits often, hits fair |
| 1 | Axe | Sweeps: can hit two beside each other |
| 1 | Club | Crude and common; goblins carry them |
| 2 | Spear | Reaches two squares: strike from behind someone, or across a gap |
| 2 | Mace | Crushes: good against armour and bone |
| 3 | Staff | Two hands; for those who cast |
| 4 | Warhammer | Two hands; heavy blows that stun |
| 1 | Sling | Quiet; any stone will do |
| 1 | Arrows and bolts | Ammunition: some can be picked up again |
| 2 | Short bow | Quick shots, fair range |
| 4 | Crossbow | Strong, slow to load, loud |
| 6 | Special arrows | Fire, blunt (knock down), whistling (a lure) |
| 1 | Helmet | Head |
| 1 | Leather armour | Body: less protection, quiet |
| 2 | Shield | Off hand: block blows and arrows |
| 2 | Cloak | Harder to notice in the dark |
| 3 | Chainmail | Body: good protection, some noise |
| 3 | Soft boots | Quieter steps |
| 8 | Plate | Body: the best protection; heavy, loud, slower |

## Light, throwing, tools and treasure



| Depth | | What |
|---|---|---|
| 1 | Lamp oil | Keeps the lamp lit (the run's clock) |
| 1 | Candles | A light to set down and leave behind |
| 1 | Torch | A brighter light to carry or set down, burning out |
| 1 | Stones | A noise where they land: monsters go to look |
| 2 | Darts and throwing knives | A quiet hit at range |
| 3 | Caltrops | Slow and hurt those who follow you |
| 3 | Oil flask | Fire where it lands |
| 1 | Key | Opens one locked door |
| 2 | Rope | Climb back up a ledge, or down a pit |
| 3 | Lockpicks | Pick locks faster and quieter |
| 4 | Pickaxe | Dig through a collapse, or a new way |
| 1 | Coins | To trade with the peddler and others |
| 5 | Gems | Worth more, light to carry |
| 8 | Relics | Worth a lot to the right stranger |

## Potions and scrolls



| Depth | | What |
|---|---|---|
| 1 | Healing | Health back |
| 1 | Murky | Unknown until drunk: all heal, or all poison, a run's luck |
| 2 | Antidote | Cures poison |
| 3 | Strong spirits | Dread falls (your name for courage) |
| 4 | Dark-sight | See in the dark for a while |
| 5 | Strength | More Brawn for a while |
| 2 | Map | Shows the level |
| 2 | Identify | Identifies an item (your name for knowing) |
| 3 | Darkness | A patch of the dark where you need it |
| 4 | Silence | Your steps make no sound for a while |
| 5 | Sleep | Those near fall asleep |
| 5 | Remove curse | Lifts a curse without an altar |
| 6 | Blink | A step of a few squares |
| 6 | Ward | Keeps the dead back |
| 7 | Sight through walls | See what's near for a while |

## Charms and wands



| Depth | | What |
|---|---|---|
| 6 | Ring of quiet steps | You're harder to hear |
| 7 | Amulet of warding | The dead notice you less |
| 8 | Ring of dark-sight | See further in the dark |
| 9 | Amulet of courage | Dread rises slower |
| 10 | Ring of strength | One more to an attribute |
| 12 | Ring of mending | Heal slowly as you go |
| 6 | Wand of sleep | Puts one to sleep, a few charges |
| 8 | Wand of slowing | Slows a foe |
| 9 | Wand of fire | A burst of fire |
| 10 | Wand of fear | A foe flees |
| 12 | Wand of digging | Digs a tunnel through rock |

## Item tags: quality, maker, material

An item's Depth is the deepest of its parts (round 28). A fine steel dagger: dagger 1, fine 4, steel 6, so Depth 6.

| Depth | | What |
|---|---|---|
| 1 | Crude | Quality: Normal, but heavier |
| 4 | Fine | Quality: A bit better damage |
| 10 | Masterwork | Quality: Better damage, lighter, maybe faster to use |
| 2 | Goblin-made | Maker; most common in Goblin Territory |
| 3 | Cultist | Maker; the cult's |
| 8 | Ancient | Maker |
| 8 | Dwarven | Maker; most common in the Keep |
| 12 | Dark elven | Maker; most common in the Deep Dark |
| 1 | Stone | Material |
| 1 | Bronze | Material |
| 1 | Iron | Material: plain, left unsaid |
| 6 | Steel | Material |
| 9 | Silver | Material: Bites the dead and the eldritch |
| 15 | Mithril | Material: Light and hard; deep |

## Item tags: condition, slaying, enchantment



| Depth | | What |
|---|---|---|
| 1 | Rusty | Condition |
| 2 | Heavy | Condition |
| 2 | Padded | Condition |
| 3 | Sharp | Condition |
| 3 | Sturdy | Condition |
| 4 | Cursed | Condition |
| 5 | Spiked | Condition |
| 4 | Of spider slaying |  |
| 4 | Of goblin slaying |  |
| 6 | Of undead slaying |  |
| 7 | Of beast slaying |  |
| 12 | Of elf slaying |  |
| 12 | Of horror slaying |  |
| 16 | Of dragon slaying |  |
| 5 | Of light |  |
| 8 | Of fire |  |
| 8 | Of silence |  |
| 9 | Of venom |  |
| 10 | Of shadows |  |
| 10 | Of warding |  |
| 11 | Of returning |  |
| 12 | Of swiftness |  |

## Environment: cover, light, footing, water, heights, ways

Most are everywhere from the start (Depth 1); only those that change the challenge come deeper. Region things (glowing fungus, lava) also follow their regions.

| Depth | | What |
|---|---|---|
| 1 | Columns | Hiding and cover: Break line of sight and cast shadow |
| 1 | Braziers, candles, campfires | Light: Lit; can be put out (a turn or two, and a noise), and relit by monsters |
| 1 | A lantern on a hook | Light: Take it, or put it out |
| 8 | Glowing fungus | Light: Dim light everywhere that can't be put out, only cut away |
| 12 | Forge and lava glow | Light: Light that can't be put out |
| 1 | Rubble floor | Sound underfoot: Loud to walk on |
| 1 | Bones | Sound underfoot: Crunch underfoot, loud |
| 1 | Shallow water | Sound underfoot: Wading: slow and loud |
| 1 | Wooden boards and bridges | Sound underfoot: Creak, loud |
| 3 | Moss and soft earth | Sound underfoot: Quiet to walk on |
| 4 | Rushing water | Sound underfoot: A waterfall or rapids that cover your noise, and theirs |
| 2 | Still water | Water: Where leeches and worse wait |
| 3 | Deep water | Water: Swim: silent, but the lamp goes out |
| 5 | A current | Water: Carries you along, one way |
| 1 | High ground | Height and drops: A dais, a balcony or a gallery: see further, shoot down, hold it |
| 2 | Ledge | Height and drops: Drop down, but can't climb back |
| 3 | Pit | Height and drops: A fall to the level below |
| 5 | Rope bridge | Height and drops: Cross it, or cut it behind you |
| 6 | Chasm | Height and drops: Can't be crossed but by a bridge; shove things in |
| 1 | Door | Doors and ways: Open, close; monsters open them too |
| 1 | Locked door | Doors and ways: A key, or picked (time and noise) |
| 1 | Barricade | Doors and ways: Block a door, or break through one |
| 1 | Narrow way | Doors and ways: A crawlway or crack: one at a time, so a swarm can be fought there |
| 2 | Secret door | Doors and ways: Found by searching, hinted by rubble or marks on the floor |
| 2 | Collapsed passage | Doors and ways: Dug through with a pickaxe |
| 3 | Gate | Doors and ways: A portcullis to drop between you and them; never blocks the way on |
| 3 | Lever | Doors and ways: Opens a gate or a hidden way |

## Environment: traps, hazards, containers, things to use

Traps and hazards also have a Level (round 28): they hurt more deeper.

| Depth | | What |
|---|---|---|
| 1 | Tripwire | Traps: Rings a bell: an alarm |
| 3 | Pressure plate | Traps: Darts or spikes |
| 4 | Pit trap | Traps: A hidden pit |
| 4 | Net | Traps: Holds you fast |
| 6 | Falling rocks | Traps: The ceiling comes down |
| 8 | Gas vent | Traps: A cloud of gas or spores |
| 1 | Webs | Hazards: Stick to you; the spiders feel you through them |
| 3 | Fire | Hazards: Spreads, burns, and lights the place |
| 5 | Unstable floor | Hazards: Gives way under weight |
| 10 | Steam vents | Hazards: Scald, but the steam hides you |
| 13 | Lava | Hazards: Deadly to touch; lights everything |
| 1 | Chest | Containers: Holds the better things; may be locked or trapped |
| 1 | Crates and barrels | Hiding and cover: Cover to hide behind; some can be pushed |
| 1 | Sacks and baskets | Containers: Quick to search, small things |
| 1 | Urns | Containers: Grave goods; disturbing them may wake the dead |
| 1 | Bodies | Containers: What those before you carried |
| 2 | Coffins and sarcophagi | Containers: Grave goods, and maybe their owner |
| 2 | Weapon and armour racks | Containers: Gear in the armoury or the guardroom |
| 2 | Hidden caches | Containers: Behind a loose stone or under the floor: found by searching |
| 3 | Nests and hoards | Containers: What a beast, a goblin or the dragon has gathered |
| 1 | Altar | Things to use: Lifts curses; holy ground to rest |
| 1 | Places to rest | Things to use: A hot spring, a bath, a kept shrine: rest is safer there |
| 2 | Oil | Things to use: A spill or a barrel to set alight |
| 3 | Bell | Things to use: Ring it to draw monsters where you want them |
| 3 | Bookshelves | Things to use: Notes and scrolls to find; reading needs light |
| 4 | Cages and pens | Things to use: Open them to let beasts loose on your foes |
| 5 | Mine cart | Things to use: Ride it (fast, loud) or push it into things |

## Round 30's new foes: Depths and ranks

Ranks too: if one is wrong, say so in the comment. The orcs' ranks are my proposal.

| Depth | | What |
|---|---|---|
| 1 | Worm | Worm, common: Small and easy alone, but breeds fast |
| 3 | Cave spider | Spiders, common: Hunts in the open, quick; poison |
| 6 | Spitting spider | Spiders, archer: Spits web from afar; held for a few turns |
| 11 | Spider queen | Spiders, leader: The nest's mother; guarded, lays eggs |
| 13 | Great worm | Worm, greater: Huge; digs through rock; hunts by sound |
| 8 | Undead dwarven guard | The dwarven dead, common: The fallen hold's soldiers |
| 8 | Undead dwarven crossbowman | The dwarven dead, archer |
| 12 | Undead dwarven high guard | The dwarven dead, greater: Noticeably tougher; not just sitting at doors |
| 14 | Undead dwarven rune lord | The dwarven dead, caster: Casts with runes |
| 6 | Orc spearman | Orcs, common: Reaches two squares; the war band's line |
| 8 | Orc blood warrior | Orcs, warrior |
| 10 | Orc berserker | Orcs, greater: Charges, doesn't stop for wounds |
| 11 | Orc blood sorcerer | Orcs, caster |
| 13 | Orc warlord | Orcs, leader: The war band's chief |
| 12 | Abomination | Eldritch, greater: A thing that shouldn't be |
