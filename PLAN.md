# Versal: plan for expanding the game

All five milestones are in the game (the first version of each); what follows is the plan as decided.

The look is roughly done; this is what comes next, in milestones that can each be tried on their own.
Decided with the player of the game; open questions at the end.

## How we work

- **Every visual decision is the player's.** Nothing new to look at, and no change to how anything
  looks, goes into the game without their say.
- **A mockup first.** Each visual element or change starts as a mockup page (in `mockups/`, or
  published for them to see) showing the options side by side, with the one recommended and why.
  They choose or change it; only then is it built into the game.
- **No visual choices made quietly while building.** If one comes up mid-work, stop and ask before
  going on.
- **Each new visual element gets a slide** in the presentation of the visual elements
  (https://claude.ai/artifact/WCzvGZbKDgWCHNNdtuyaGv): what it is, a picture of it from the game,
  who decided what, and what is open for their say.
- Options are offered with a recommendation; decisions are asked with a tool that shows each
  decision and its options.

## Decisions (asked and answered)

- **Health:** 20 HP to start; goblins hit for 1–3, skeletons 1–4. Damage shown as numbers in the log.
- **Death:** a death page over the dimmed map (what killed you, where, turns, kills, level reached);
  any key or tap starts a new run.
- **Healing:** r rests until healed or something comes into sight or hearing (1 HP per 5 turns);
  1 HP per 20 turns anyway.
- **Ailments:** bleeding from heavy hits (1 HP a turn for a few turns; resting stops it); poison
  from spider bites (1 HP every few turns, longer). Both wear off.
- **Character:** the name typed at the start; the class "Adventurer" for now.
- **Levels:** XP per kill by kind; each new level +4 max HP, +1 attack every other level.
- **Plates:** exactly `mockups/ledger/plates.json`, scaled to the window, drawn once per size.
- **Small screens:** today's phone view kept, with health and the newest message on top and the
  panels over the map (phone layout tabled).
- **Items:** a few on floors (more and better deeper), sometimes dropped by goblins and cultists.
  Ten slots a–j, potions of a kind stacking; worn and held don't count. Start with a dagger in hand
  (1–4) and a potion of healing. Hand, off hand, head, body; the warhammer takes both hands.
- **Sneaking:** a step with the lamp out takes one and a half turns.
- **Awareness:** suspicion that builds while a monster sees or hears you (more when close, lit or
  loud): at a third, suspicious (comes to look, ?); full, alarmed (chases, !); it ebbs.
- **Sneak attacks:** triple damage on an unaware monster.
- **Morale:** when half a pack is dead the rest flee out of sight and regroup later; the undead
  never flee.
- **Ground:** each level changes gradually from its first kind (by the stairs up) to the next (by
  the stairs down, on the far side).
- **Stairs:** one down and one up per level; levels kept as left.
- **New monsters, each their own way:** rats fast, weak, in packs; bats flit erratically; spiders
  wait still and bite (poison); zombies slow, tough, relentless; cultists carry lanterns and
  patrol; trolls slow, huge, healing; warriors lead goblin packs; the king waits with his guard.
- **Winning:** a victory page with the run's tally, then a new run.
- **Keys:** WASD, arrows and numpad move (vi keys dropped). e equipment, i inventory, l look,
  m messages, z search, f lamp, c close, r rest, q drink, W wield, t take off, D drop, , pick up,
  < > stairs, . or space wait, ? help.
- **Tones per level:** not now.
- **Delivery:** milestone by milestone, each pushed and the game artifact updated.

## Milestone 1: the player can be hurt

- The player has hit points; monsters do damage. Death says so and starts a new run.
- Rest to heal, only when no monster is near.
- A message log for what isn't a sound ("you pick up a dagger", "the stairs lead down").
- A help overlay with the keys and touch controls.

## Milestone 2: the side panel

Chosen so far (the "ink ledger", `mockups/ledger.html`; still being refined):

- Black with light text, lettered as the map is: Texturina for names and items, Crimson Pro for
  messages. Items and creatures listed by their letters, with dotted leaders to their values.
- On a big screen the sidebar is always there, on the right. At its top, always: the name, class
  and level; "Health" with hit points as current/most (11/23) and any ailments (bleeding,
  poisoned...) in their colours. Under it, the character sheet (experience gained/needed for the
  next level, the stats), or what's opened in its place: **e**quipment (worn and held, by where;
  attack and defence as their sums), **i**nventory (carried, lettered for use), **l**ook (creatures
  in sight and how aware, then things; `!` and `?` over the letters on the map). The keys along
  its foot.
- At the top left of the map: the place as the heading, the level ("1st level"), the newest three
  messages (older ones fade; a long one wraps and older ones give way), "m for more". **m** pulls
  the whole log down as a drawer: dark grey, to stand apart from the sidebar, its foot torn as the
  plates are (also in `plates.json`).
- Both sit on black plates with torn edges: each a black area (the corner's an upside-down
  pyramid of leaning boxes, the sidebar wider at the top) and a band in which the edge is drawn
  as cave walls are, then torn. The shapes chosen are in `mockups/ledger/plates.json`.
- No fade at the level's edge (done); the sidebar has no line of its own.
- Tabled for now: the phone layout (and where search, lamp, close and rest go there).
- Stats kept few: health, attack (from the weapon), defence (from armour), speed.

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
| 1 | built dungeon (the start) | collapsed rooms | skeletons, zombies, rats, cultists, spiders |
| 2 | collapsed rooms | caverns | rats, zombies, goblins, bats, spiders, giant spiders |
| 3 | caverns | the goblin king's halls | goblins, goblin warriors, trolls, spiders, giant spiders, the goblin king |

- The goblin king's halls: a new kind of ground; big rough-hewn halls dug out of the cavern, a
  throne room where the king waits with his guard.
- Winning: kill the goblin king.

## The monsters' letters

Every letter is edged in paper (fading with the light), except the undead, edged in ink.

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

## Light and shadow (done, first version)

- Lit rooms lit by lights of their own that suit them (candles, braziers), not evenly;
  columns, posts and big furniture throw shadows from them; lit rooms more often have columns.
- Rock formations round campfires placed to make dark lanes past the camp or up to it.
- The king's halls: braziers down the middle aisle, the columns striping the side aisles with shadow.
- Dousing lights: not yet (see how the shadows play first).

## Feedback on the presentation

From the open questions in the presentation of the visual elements; chosen on the choices page
(`mockups/choices.html`, published with the answers saved in it).

- **In the game:** equipment and inventory without their sums; the name asked in the corner over
  the level; a torn line under health; things on the floor at 0.66 of a square; rats, bats and
  spiders at 0.75; the cultist's lantern as light on the floor (lit 2, dim 1, moving with them),
  no flame; the camera always on the player, levels kept 4 squares back from the map's edge so
  the hatching never meets it; candles as three fat candles; routes R4 (long loops, then short
  tunnels); the king's halls varied by kind (columned either way, a forest of columns, round, a
  crossing, split, round an uncut core, a storeroom, half dug, the throne room with an apse).
- **Round 2:** braziers D (a bowl a third bigger, the flame burning down inside it) in the game;
  hearths set aside for now (none of two rounds worked; in the backlog); the throne to redo from
  the player's examples of Dyson's maps, as the stairs.
- **Stairs:** none of the mockups right yet; to redo from the player's examples of Dyson's maps.
  Telling up from down: ink only (chosen), once the stairs are.
- **Backlog:** a real victory page.

## Round 3: getting about, tips, things with character (choices page)

Proposals in `PROPOSALS.md`; answers on the choices page, round 3.

- **Quality of life, built:** click to walk (1), explore with x (3), click a monster (5), a thing
  (6) or a door (7), room names (11), wounds in words (12), the whole level on Tab (13), repeats
  folded in the log (14), potions picked up by walking (16), resting searches (17), walks stop
  when hurt and won't start below a third of health (18). Not taken: walk to the stairs, run,
  comparing before wielding, "wield it?", last words on the death page, keeping the run.
- **Click to walk:** the way shown as a dotted ink trail and a cross (B). Phones as they were: a
  tap steps, a hold walks; click to walk with a mouse only (A).
- **Tips:** a torn black plate beside the thing, a thin ink ring round it (A). They say: name and
  trait, awake or not, wounds, what it does, a thing's numbers, furniture, the room on its floor.
  Not: comparing with yours, remembered things, a danger rating.
- **Traits:** items, monsters, rooms and hidden ones all wanted. Items: rusty, sharp, heavy,
  goblin-bane, sturdy, padded, spiked, strong, watered. Monsters: savage, timid, sleepy, watchful,
  swift, starving, crumbling, venomous, veteran. Rooms: flooded, cursed, hallowed, echoing,
  looted/stocked, infested. Built: all but the flooded and infested rooms (they need drawing:
  mockups first, round 4) and the hidden traits (a way to find them out first: round 4).

## Round 4 (choices page)

- **Hidden traits:** cursed things and murky potions; found out on using them (A); a curse lifted
  by standing a few turns at any altar (B). Built.
- **Flooded rooms:** the water's edge (D) with a bluish-grey wash over the whole room, a few more
  ripples: mockups again.
- **Infested rooms:** the nest (A), but drawn at the furniture's line weight; the lines were too
  faint: mockups again.

## Not now

Throwing stones, shoving, kicking doors, dousing campfires, monsters facing a direction, telegraphed
blows, a defend action, weapon types against monster types, saving the run in the browser.

## Open

- Giant spiders (`S`) on levels 2 and 3 for now; spiders (`s`) on every level.
- More kinds of ground and monsters later.
