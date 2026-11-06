# 4. Systems

The rules the game runs on, in outline: how deep each one goes. Their details (numbers, lists)
come with the content.

## Decided (rounds 2 and 3)

- **Monsters' minds: searching, and a level that keeps watch.**
  - Searching: a monster that loses you goes to where it last saw or heard you and looks round,
    and it follows noises to their source.
  - Watch: guards at posts and patrols on routes; packs that call others when alarmed (a shout, a
    goblin horn); sleepers woken by the alarm.
  - Minds are small sets of states with clear rules, cheap per turn and testable without a
    browser.
  - The level-wide alert: none; alarms reach so many steps (round 38).
- **Light: lights you can put out and light.** Braziers, candles and campfires take a turn or two
  and make a noise. Monsters may relight them, or grow suspicious. The lamp stays on or off: not
  hooded, and no light to throw.
- **Noise: noise to use, and the ground's sound.**
  - Throw a stone (or anything) to make a noise where it lands; monsters go to look.
  - Some floors are loud (rubble, water), some quiet (moss, carpet); running is loud.
  - Floors are drawn so their sound can be read (part 8).
- **Fighting: a few choices, and shooting.**
  - A monster's heavy blow is shown a turn before.
  - Shove (into a pit, water, a fire).
  - Weapons that differ (a dagger quick, a spear reaching two, an axe sweeping, a hammer
    stunning).
  - Bows, slings and crossbows, for you and for monsters.

  Critique carried forward: shooting from the dark can make sneaking too easy. The ways to keep it
  in check are listed under 4.2 (round 3) and in part 5 (ammunition, the noise of a shot, monsters
  that shoot back from cover).
- **Things to find:**
  - light (oil, candles; not to throw, by the light decision);
  - things to throw (stones, darts, nets, caltrops);
  - scrolls;
  - charms (rings, amulets);
  - wands;
  - keys.

  No food.
- **Monsters described by tags** (round 10, your idea):
  - **Tags:** a type has its own tags, and an individual can have one extra, drawn from the type's
    short list (no timid goblin warriors).
  - **Sorts of tags:** what it is, size, company, senses, light and how it moves, with more
    brainstormed in round 11.
  - **Extras can change what a monster is** (undead rats).
  - **The same tags for things, rooms and strangers.**

  The tags are summed into one profile when a monster is made, and each tag lists what it can't go
  with.
- **Monsters' roles and duties** (round 16). Each monster type has one role:
  - wanderer;
  - pack;
  - swarm;
  - ambusher;
  - hunter;
  - alarm-raiser;
  - brute;
  - caster;
  - leader;
  - lure;
  - thief;
  - breeder;
  - boss.

  Guarding a post and walking a round are **duties**, given by where a monster is placed, not
  monster types. Wishes from the round:
  - a way to draw one of a pack's attention at a time;
  - swarms that can be fought one by one in tight spaces;
  - lures that may lead to treasure as well as to monsters.
- **What the levels hold:** all five.
  - Hiding places (alcoves, curtains, deep shadow).
  - Traps (alarms, pits, spikes; found by searching; usable against monsters).
  - Locked doors (picked, or opened with keys).
  - Levers and hidden ways.
  - Water and ledges (deep water to swim without the lamp; ledges to drop from).

- **What light is worth** (round 3). Light shows what the dark hides and helps where the dark
  hurts. All five ways:
  - **Traps and secrets show only in light.** In the dark, a trap is found by walking into it,
    and secret doors and levers only by searching.
  - **The dark is blind.** Blows in the dark miss more; you can't shoot what you can't see.
    Monsters that see in the dark don't suffer it. Shooting from the dark needs the target lit,
    which keeps shooting in check.
  - **Some things shun light.** Rats, bats and spiders keep out of your light and won't attack
    into it; some of the dead are slowed in it.
  - **Reading needs light.** Scrolls and notes can't be read in the dark; spells already known can
    be cast.
  - **Things are told only in light.** In the dark band you see that something's there, not what.

  With the oil and dread (2), light and dark are a loop:
  - **Light:** you see the traps, fight well, hold off vermin, read, and gain ground (and
    experience) faster; it costs oil and draws eyes.
  - **Dark:** you go unseen, but blind to traps, fighting badly, while dread rises.

## Depth and Level (yours, after round 27)

In your words: "Items, strangers and monsters, and environmental challenges should all have a
property that tells at what depth do they start to appear. To guide generation: the deeper we go,
the more dangerous it gets, but the rewards become bigger as well."

- **Depth:** one number, 1 to 20, on every monster, stranger, item and environmental challenge: the
  level it starts to appear at. Not a limit: rats have Depth 1 and still appear deeper.
- **The end game's three** (the dark elf prince, the dragon, the steel golem): a Depth of 18 to 20,
  one number each, not yet chosen. They almost always appear only in the end game, or very, very
  rarely a bit higher up.
- **A monster's Level** scales with how deep the player is or with the player's level (not yet
  chosen). A rat met at depth 10 is not as weak as one at depth 1, and not as tough as a monster of
  Depth 10.
- **A monster's base stats follow its Depth; its final stats are changed by its Level.**
- **Items have Depth too.** Together these set how the game's power scales.

In the catalogue, the monsters' `fromStep` (the danger ladder's step) is now `depth`: the same
numbers.

Settled in round 28 (`round28-depth-level.md`):
- **Level follows depth**, not the player's level.
- **Level closes two fifths of the gap:** a monster's Level is its Depth plus two fifths of the way
  to the depth where it's met. A rat met at depth 10 is Level 4.6. A starting point, to playtest.
- **A monster is most common from its Depth to a few levels deeper, then rarer, never gone.**
  Bosses and the end game's three don't spread. This one rule replaces the Over Dungeon's 6/3/1 mix.
- **An item's Depth is the deepest of its parts:** the thing and each tag have a Depth. Items have
  no Level: their tags scale them.
- **Strangers and environmental challenges have a Depth and a Level:** traps hurt more deeper,
  strangers offer more deeper.
- **The end game's three:** the dark elf prince 18, the steel golem 18, the dragon 20.
- **Words:** the dungeon's levels are **depth 1 to 20**; **Level** means only power (the player's,
  a monster's, a stranger's or a challenge's).

## Monsters' states and senses (round 38)

- **States a monster is found in:** asleep, patrolling, at a campfire, at work, wandering, lying in
  wait, dormant, caged or chained, fighting something else, fleeing; maybe on guard and eating.
- **No facing.** Monsters have no heading: they see all round them.
- **Awareness is a hidden meter**, rising and falling with what a monster senses. Not shown; the
  player learns it through play.
- **Senses differ by monster and by state:** range of vision, dark-vision and hearing.
- **A sleeper wakes to noise, or to dark becoming light** (not to light that was already there).
- **A monster's state is told in its tip** when you look at it; some states also show by animation.
- **Alarms (a gong, a bell, a horn) reach so many steps, not the whole level.** Which monsters an
  alarm rouses is open (does a goblin gong rouse spiders?).

## Stealth: noticing (discussed in chat, after round 39)

Your model: "What do we actually need to know? Does the monster notice (see or hear) the player,
right?" No awareness meter as such. Each turn, each monster that isn't dormant checks two things.

- **Sight.** Needs a line of sight (walls and columns block it). How far depends on the monster's
  **Vision** (how far it sees in good light), its state, and **how lit the player's square is**:
  fully lit, the monster's Vision; dim, less; dark, not at all (unless next to it). Monsters with
  **dark-vision** see in the dark, and are dazzled in full light. The player's lamp lights the
  player's own square.
- **Hearing.** Of sounds the player makes, not of the player. A monster's **Hearing** is how far it
  hears a normal walk; each action has a loudness (sneaking quieter, running and fighting louder),
  the floor changes it (rubble, water louder; moss quieter), and walls muffle it.
- **States change the senses** (yours: "Sleep > Vision 0, Hearing halved"); for example at a
  campfire, no dark-vision; at work, hearing dulled.
- **Items and perks change the outcome** (yours: a potion of invisibility, boots of silence, a cloak
  of shadows, perks). They work on the player's two numbers: how lit the player counts as, and how
  loud.
- **Certain, with a glimpse.** Noticing is certain, not a chance: inside range, the monster
  notices. A **glimpse** (seen at the edge of its range, or in dim light) makes it suspicious and it
  comes to look; seeing the player clearly makes it alert. Yours: "Something like this. The range
  and conditions of a 'glimpse' needs to be tested to decide exactly how it should be."

Proposed, not yet decided: a lamp's glow seen from further than the player (suspicious, not
alert); next to a monster always means noticed, unless it's asleep or dormant. The numbers
(Vision, Hearing, loudness) come with balance.
