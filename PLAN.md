# Versal: plan for expanding the game

The look is roughly done; this is what comes next, in milestones that can each be tried on their own.
Decided with the player of the game; open questions at the end.

## Milestone 1: the player can be hurt

- The player has hit points; monsters do damage. Death says so and starts a new run.
- Rest to heal, only when no monster is near.
- A message log for what isn't a sound ("you pick up a dagger", "the stairs lead down").
- A help overlay with the keys and touch controls.

## Milestone 2: the side panel

- A character sheet in the manner of an RPG's, black with light text as in the old roguelikes
  (ADOM, NetHack): stats, a small inventory, the log.
- Stats kept few: health, attack (from the weapon), defence (from armour), speed.
- Mocked up first (two or three versions). On a phone, a strip.

## Milestone 3: items

- Items on the floor, picked up, used or equipped, dropped.
- Potions (heal). Weapons: dagger, sword, axe, warhammer (each its damage). Armour: helmet,
  chainmail (less damage taken).
- Later, not now: weapon types with attack speed, attack type, attack area.

## Milestone 4: sneaking and time

- Actions take time; the player and each monster act at their own speeds (now: the player 1,
  goblins 0.75, skeletons 0.4 moves to the player's 1).
- Lamp out is sneaking, always: still a square at a time, but each step takes longer (more happens
  meanwhile), and the player is much harder to notice.
- Awareness in stages: unaware, suspicious (comes to look), alarmed (chases); suspicion builds over
  turns, so the player can back off. Read from the monster's animation.
- A monster's state changes its senses: asleep, it doesn't see and hears less; milling, it is
  distracted and sees and hears less; alert, sharp.
- Light: easy to see in lit places or with the lamp lit; hard in the dark beyond a square or two
  (ranges to be tuned).
- Sneak attacks: a monster that hasn't noticed the player takes a much harder hit.
- Morale: when enough of a pack has died, the rest flee.

## Milestone 5: three levels and the goblin king

- Stairs down and up; each level remembers what has been explored and who is still alive.
- Each level its own generator settings and monsters, maybe its own tones (darkness, rock).
- Each level starts in one kind of ground and changes into the next:

| Level | Starts as | Changes into | Monsters |
|---|---|---|---|
| 1 | built dungeon (the start) | collapsed rooms | skeletons, zombies, rats, cultists |
| 2 | collapsed rooms | caverns | rats, zombies, goblins, bats, spiders, giant spiders |
| 3 | caverns | the goblin king's halls | goblins, goblin warriors, trolls, giant spiders, the goblin king |

- The goblin king's halls: a new kind of ground; big rough-hewn halls dug out of the cavern, a
  throne room where the king waits with his guard.
- Winning: kill the goblin king.

## The monsters' letters

| Monster | Letter | Colour, look |
|---|---|---|
| Goblin | `g` | black |
| Goblin warrior | `g` | black, clearly bigger |
| Goblin king | `G` | black, big, with a crown |
| Rat | `r` | brown |
| Bat | `b` | dark grey |
| Skeleton | `z` | white (edged in ink) |
| Zombie | `z` | sickly green (told from the white skeleton by colour) |
| Cultist | `h` | red (h for human) |
| Spider | `s` | black |
| Giant spider | `S` | black |
| Troll | `T` | green |

## Not now

Throwing stones, shoving, kicking doors, dousing campfires, monsters facing a direction, telegraphed
blows, a defend action, weapon types against monster types, saving the run in the browser.

## Open

- Which levels spiders (`s`) and giant spiders (`S`) go on (giant spiders on 2 and 3 for now).
- More kinds of ground and monsters later.
