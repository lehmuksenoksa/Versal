# Groundwork before the feature sets

The rebuild is done (`rebuild-plan.md`, R1 to R8). Asked to reassess the architecture against what
comes next ("Can you reassess the current architecture and the upcoming features. Could something
be done better, more efficiently etc. Can we prepare better?"), then: "Write it down, then start
the groundwork."

## 1. Where things stand

- **The rules** (`js/rules`, about 2,600 lines) are in good shape: content as data, the World in
  parts, the level generator in parts with its room kinds as data, saving, tests that run headless
  in about 35 seconds.
- **Three of the five things slice 1 rests on are missing**, and **the view** (`expression.js`,
  2,387 lines; `render.js`, 1,282), nearly half the code, wasn't part of the rebuild.

## 2. What would cost us if left (most important first)

1. **Light exists twice, and the two don't agree.** The rules work out the lit squares once, when a
   level is made, and never again; for the player they know only "lamp on or off". The view has a
   light of its own: its own lamp bands, reach and falloff. Slice 1 hangs almost everything on
   light (stealth's lit, dim and dark; dread; oil; wall torches; lights put out, relit, carried, set
   down; monsters burning). If the two disagree, the screen says dark while a monster sees you lit.
   **The fix:** one light model in the rules, worked out again whenever a light changes, a level for
   every square (dark, dim, lit), which the view draws from. The light feature set's real work.
2. **No way to test one rule in a set-up situation.** Every test starts from a random seed. Stealth
   needs "with this brazier and this sleeping goblin, can you cross unseen?"; traps need "step here,
   the net falls". **The fix (G1):** a World made from a small map typed as text, monsters and
   lights placed by letter. Then each rule of `stealth.md` and `light-and-dread.md` becomes a test
   before it's built.
3. **Some of the player's actions live in the interface.** Resting till healed, walking to a
   square, exploring: loops in `main.js` (the bot had to copy resting). Slice 1 adds pace, the light
   key, changing and setting down lights, the level-up page. **The fix (G2):** every action in the
   rules, as one list of commands that the keys, the bot and the tests all use.
4. **The view has no safety net.** The map check covers the inked map only, not the live view
   (light, sight, fading, flames), where every feature set will add its looks. **The fix (G3):** a
   view lock: the game's view at fixed seeds, the clock stopped, compared pixel for pixel. Then
   `expression.js` can be split as the generator was, when the light feature set reworks it.

## 3. Better done when the feature set that needs it comes

5. **One system of conditions,** for the player and monsters alike (burning, poison, invisibility,
   dark-sight, strength, sleep, slowing), each condition as data: how long, what it does each turn,
   what it changes. Today ailments are the player's only, a monster's bleeding a field of its own.
   With the first feature set that has two of them (fire, or the potions).
6. **Monsters' behaviour as a table:** states and abilities are branches in code; slice 1 brings
   archers (a clear line to shoot), a thief, a shaman, a chieftain, wolves. Each kind a set of
   behaviours from a table, as the room kinds are now. With stealth, which rewrites how monsters
   notice anyway.
7. **Populating by Depth:** monsters are placed from hand-made tables for three places; slice 1 needs
   six depths, the Depth rule, loose monsters and groups, camps, guard posts and prisons. A part of
   its own, like the generator's. With the six depths.

## 4. How the feature sets go

- **The order** (proposed): light before stealth, as stealth reads light levels.
  0. The groundwork: G1 to G3 (section 2).
  1. Light: one model, from sources only; torches on the walls.
  2. Stealth: senses, pace, awareness; monsters' behaviours.
  3. Lights as items and equipment; oil and dread.
  4. Fighting and character: attributes, Perks.
  5. Contents, step A: the monsters and things.
  6. Features and traps.
  7. Six depths and populating them.
- **Each set:** the spec's rules written as tests first (on G1's small maps), then the rules, then
  the looks, then you play it.
- **The behaviour lock** is re-recorded on purpose in each set; it guards rebuild-style changes.
  During feature work, the tests from the spec carry the weight.
- **The balance tool grows with each set:** the oil budget, the dread curve, the odds of sneaking
  past.
- **Saves break with each set** (the save's version raised, the page starting afresh): fine while
  you're the only player.

## 5. Decisions for you

- **Where content lives.** In two places now: the catalogue (the design) and `js/content` (the
  game); they'll drift apart. Proposed: `js/content` the one source, the catalogue's fields (tier,
  Depth, Level) moving in as each thing is built, the catalogue reading from it.
- **Secret doors on the way on.** About 1 depth-1 level in 6 can only be left through a secret door.
  Should every level have a way on without one?
- **The order of the feature sets** above.

## 6. The groundwork

| Step | What | Checked by |
|---|---|---|
| **G1. Small maps** | A World from a map typed as text: walls, floor, doors, the player, monsters and lights by letter; a monster placed by the rules (`placeMonster`), a level given instead of generated | The first tests written on small maps, of rules as they are now |
| **G2. Actions in the rules** | Every action the player takes as a command the rules carry out (`act`), resting till healed, walking and exploring among them; the keys, the bot and the tests using it | The bot, the lock (unchanged: same play), the browser check, you |
| **G3. The view lock** | The game's view at fixed seeds and turns, the clock stopped, hashed; compared before and after a change | It notices a deliberate change; it passes unchanged on a repeat |

## Progress

**G1, small maps: done.**
- **The rules take a level given** (`new World(seed, { levels: { 1: level } })`): taken as it is, lit
  by its own lights, nothing else put in it. Filling a new level is now two steps, lighting it
  (`lightUp`) and peopling it (`populate`); a monster is placed by a rule of its own
  (`placeMonster`), which the packs use too. The behaviour lock passes unchanged.
- **Small maps** (`tests/support/scenario.js`): a level typed as text (walls, floor, doors, secret
  doors, the player, stairs, braziers and campfires, monsters by letter, one letter a pack), with
  states for the monsters, rooms for names and traits, the lamp out; `picture(w)` draws the world
  back as text for a test's message (lit squares as `:`); `turnsUntil` lets turns pass till
  something happens.
- **The first rules tests on them** (`tests/rules.test.js`), of the rules as they are now: a brazier
  lights what it sees and a shut door stops it; a blow at a sleeping monster always lands, three
  times as hard; struck, a pack turns on the player; an angry monster comes and strikes; a lit player
  is noticed sooner than one with the lamp out; walking into a shut door opens it; no resting with a
  monster in sight; searching next to a secret door finds it. Checked that they notice: the sneak
  blow made twice as hard fails its test at once.

