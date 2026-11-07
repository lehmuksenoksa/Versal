# The rebuild plan

The first step of the building order (`11-getting-there.md`), written for review before its go.
Yours: "rebuild of the current PoC to architecturally support upcoming changes should be the first
thing. No new features, maybe even pairing down some existing ones, but updating the engine so new
features are easier and cheaper to add. Also, making automated testing possible."

## 1. The aim, and when it's done

**Aim:** the same game, reworked underneath, so each feature set after it is cheaper to add and can
be tested without a browser.

**Done when:**
1. The game plays as it does now, apart from what is pared down on purpose (section 7).
2. Every rule can be run and checked in plain Node, with no browser.
3. Adding a monster, an item, a trait or a light is an entry in a data file, not new code (unless it
   brings a new behaviour).
4. A run's whole state can be saved to plain data and restored, and play goes on identically.
5. Tests live in the repository and run with one command: rules tests, level checks, a crude bot,
   and a browser check that the page loads and plays.
6. Drawing a new thing of a known kind is adding it to its family's table, not editing the big
   drawing files.

## 2. What there is now

About 10,000 lines of JavaScript, plain ES modules, no build step, no package file, no tests.

| Part | Files | Lines | Notes |
|---|---|---|---|
| Rules and content | `world.js`, `traits.js`, `travel.js`, `fov.js`, `dungeon.js` | ~1,500 | `world.js` holds the rules **and** the content: `MONSTERS`, `ITEMS`, `PLACES` (who spawns where), and the numbers (`AWARE`, `NOISE`, `SENSES`, `MORALE`, `LEVELS`...) |
| Level generation | `levelgen.js` | 1,450 | Layout, rooms, lights (`LIGHTS`), features, all in one |
| Drawing | `maprender.js`, `expression.js`, `render.js`, `gpu.js`, `hatching.js`, `fire.js`, `sightline.js`, `strokes-worker.js` | ~6,000 | Each kind of thing drawn by its own branch (`f.type === ...`, about 30 of them) |
| Interface | `ui.js`, `plates.js`, `tips.js`, `main.js` | ~1,000 | `main.js` ties it together |

**Good news, checked:** the rules already run headless. `new World(seed)` works in plain Node and
makes a level in about 100 ms. `world.js` imports nothing from drawing; it imports two helpers from
`tips.js` (room names), which belong with the rules. And the rules already report what happens as
`events`, which drawing reads. So the split is mostly there; the rebuild finishes it.

## 3. The structure to aim for

Plain ES modules still, no build step (so the game still publishes as it does now).

```
js/
  rules/        the game itself, headless: runs in Node and the browser
    state.js      the run's state as plain data (section 5)
    world.js      the turn: who acts when, the events it reports
    senses.js     seeing, hearing, awareness (stealth, later)
    noise.js      sounds and how far they carry
    fight.js      blows, damage, ailments, morale
    items.js      the pack, using, wearing
    levels.js     making and entering levels (the generator, split from today's levelgen.js)
    names.js      names and words (from tips.js and world.js)
  content/      data only, JSON: what exists and its numbers
    monsters.json, items.json, traits.json, lights.json, places.json, tuning.json
  draw/         the browser only: everything drawn
    families/     one table per family of things (section 6)
    ... today's maprender, expression, render, gpu, hatching, fire
  ui/           the ledger, plates, tips, keys
  main.js
tests/          node --test
tools/          the balance maths (10-building-it.md)
```

**The one rule of the structure:** `rules/` and `content/` never import from `draw/` or `ui/`.
Drawing and the interface read the state and the events; they never change the state themselves.
The tests check this by trying to load `rules/` in Node.

**Content as data, in JSON** (yours: "Yes, change it to JSON"): the content files are JSON
(`content/monsters.json`, `items.json`, `traits.json`, `lights.json`, `places.json`, `tuning.json`).
- `tuning.json` (yours: "use tuning.json") holds the rules' own dials: the numbers that belong to no
  one monster, item or light (hit chance, sneak attacks, noise, awareness, levelling, the pack, how
  often traits come, the generator's settings). Drawing numbers stay with drawing; the player's own
  settings (zoom, low power) stay in the browser.
- Loaded the same way in Node and the browser, by importing JSON directly (`import ... with { type:
  "json" }`), which current browsers and Node support; a small loader only if an older browser needs
  one.
- Only data: no code can sneak in, so a new monster is an entry and nothing else.
- Read and written safely by any tool: scripts, the balance maths, the bot, the catalogue page, a
  future editor.
- No comments in JSON: notes go in a `note` field.
- The catalogue (`data/catalogue.json`) stays the design source; the game's content files are built
  from it, slice by slice, by a script.
- A check (with the tests) that every content file parses and has the fields its kind needs.

## 4. Tests

With Node's own test runner (`node --test`): no packages to install.

| Test | What it checks | When it runs |
|---|---|---|
| **Rules tests** | Small checks of single rules, written as each rule is touched | Every change |
| **Same seed, same run** | A fixed seed and a fixed list of the player's actions give exactly the same events every time | Every change |
| **The behaviour lock** | Before the rebuild starts: record the events of a set of fixed runs from today's code. Every refactoring step must give the same events (section 8) | Every rebuild step |
| **Save and restore** | Play some turns, save, restore, play on: the same as playing straight through | Every change |
| **Content check** | Every content file parses and has the fields its kind needs | Every change |
| **Level checks** | Hundreds of levels per depth: the stairs reachable, nothing stuck in a wall, every room reachable; later, a dark way past each group (part 6) | Every change to levels |
| **The crude bot** | Hundreds of whole runs played by a simple bot (it wanders, fights, takes stairs): no crash, no dead end, no endless loop | Every change |
| **The browser check** | The page loads in Playwright, plays a few turns by keys, no errors; screenshots of fixed seeds compared before and after drawing steps | Drawing and interface changes |

All headless except the last, and the whole set runs in under a minute (target).

## 5. The state as plain data

Everything a run is goes in one object of plain data (numbers, strings, arrays, plain objects):
the levels as left, every monster and its mind, items, the player, the turn, the log, **and the
dice's place**. Things like `Set`s and class instances are rebuilt from it, not stored. Then:
- saving is writing that object; restoring is reading it;
- the save-and-restore test proves nothing is missed;
- the bot and tests can start from any saved moment.

The game offers it to the player: resume where you left (decided), as part of R4.

## 6. Drawing by families (the groundwork only)

Today each kind of thing has its own branch in the drawing files. The groundwork: a **table per
family** (furniture, lights, floors, liquids, debris, monsters, items), each entry naming the drawing
function its kind uses and its numbers. Drawing looks a thing up by its kind. A new thing in a known
family is a new table entry; a new family is a new module, without touching the rest. **No new looks:**
everything is drawn exactly as now, which the screenshot comparison checks.

## 7. What's pared down

Already decided to go, so not carried over:
- **Curses** (slice 2): cursed items, "a sword?", and the altar's lifting of curses. The altar stays
  as furniture, with its candles.
- **Light without a source** (light only from sources): lit rooms and lit stretches of corridor with
  no light of their own. Corridors get darker until wall torches come with the light feature set.

Kept, though replaced later: today's awareness (a number), the lamp as a switch, today's fighting.
Each stays working until its feature set replaces it, so the game is playable throughout.

Proposed to pare, for you to decide (section 9): nothing else. The rest is small and works.

## 8. The steps, in order

Each step leaves the game playable; each is checked by the tests, and by you playing it where the
game changes.

| Step | What | Checked by |
|---|---|---|
| **R1. Tests first** | A package file (no dependencies), `node --test`; the same-seed test, the crude bot and the browser check against today's code; **the behaviour lock recorded** | They pass on today's code |
| **R2. Content out** | `MONSTERS`, `ITEMS`, traits, `LIGHTS`, `PLACES` and the numbers moved into `content/` | The behaviour lock: same events |
| **R3. Rules apart** | `world.js` split into the parts in section 3; names moved out of `tips.js`; the generator split from its content | The behaviour lock |
| **R4. State as data** | The state as one plain object; save and restore; **resume where you left** (saved as you play, offered when the page opens) | The save-and-restore test; the lock; you try a resume |
| **R5. Drawing by families** | The family tables; drawing by lookup | Screenshots of fixed seeds: same pixels |
| **R6. Pare down** | Curses and the altar's lifting; light without a source | Tests updated; **you play it** |
| **R7. Checks grown** | The level checks and the bot made fuller; the balance maths begun (`tools/`) | They run clean |
| **R8. The level generator rebuilt** | `levelgen.js` (1,400 lines) split into parts (layout, rooms and their kinds, caves, collapse, lights, doors and secrets, furnishing), its room kinds and furnishings as data, ready for templates and the slice's ground; levels the same for the same seed where the parts allow, else re-recorded on purpose | The level checks; the lock (re-recorded only if the levels change on purpose); you play it |

Steps R2, R3 and R5 change nothing you can see; the lock and the screenshots prove it. R4 adds
resuming; R6 is the paring down you'd notice.

## 9. Decisions for you before the go

1. ~~Content as JS data modules or JSON?~~ **JSON** (decided).
2. ~~The pare-down list?~~ **Curses and light without a source, only** (decided: "sure").
3. ~~Saving for the player?~~ **Offered in the rebuild:** resume where you left, a small step after R4
   (decided: "sure").
4. **The order of the steps** as in section 8?

## 10. Not in the rebuild

New features, new looks, the phone layout, the pages around the game, and any balance change. Those
come feature set by feature set, after.

## Progress

**R1, tests first: done.**
- `npm test` (Node's own runner, nothing to install), about 15 seconds:
  - **same seed, same run** (`tests/same-seed.test.js`);
  - **the crude bot** plays 30 whole runs, checking after every step that nothing is broken (no
    monster in a wall, none on another's square, health within bounds) (`tests/bot.test.js`,
    `tests/support/bot.js`, `tests/support/checks.js`);
  - **level checks**: 25 seeds, every depth: the stairs down and every room can be reached
    (`tests/levels.test.js`);
  - **the behaviour lock**: 12 runs of 1,500 steps recorded (`tests/lock/runs.json`); every refactoring
    step must replay them exactly (`tests/lock.test.js`). Re-recorded only on purpose
    (`npm run lock:record`), when behaviour is meant to change. Checked: a 1% change to the hit
    chance fails it.
- `npm run test:browser`: the page loads with a fixed seed (`?seed=`, added for tests), plays a few
  turns by keys, no errors, the view changes; screenshots in `tests/browser/shots/` (not kept in the
  repository).
- **A bug found and fixed before the lock was recorded:** a patrolling cultist could step onto the
  square of a monster standing at its goal (two on one square). It now waits (`world.js`, `patrol`).

**R2, content out: done.**
- `js/content/`: `monsters.json`, `items.json`, `traits.json`, `lights.json`, `places.json`,
  `tuning.json`, each with an `about` and notes on its fields (the code's comments carried over).
  Written from today's values by a one-off script, so every number came across exactly.
- `world.js`, `traits.js` and `levelgen.js` read them (`import ... with { type: "json" }`); their
  exported names are unchanged, so nothing else had to change.
- **The behaviour lock passes:** the game plays exactly as before. The browser check passes; the
  mockups that read the moved numbers still load.
- **New test, the content check** (`tests/content.test.js`): every file parses; monsters, items,
  lights and places have the fields they need; places and traits point only at things that exist.
- Noted, not caused by R2 and not fixed: `mockups/expression.html` has an error on load (a control it
  looks for is missing).

**R3, rules apart: done.**
- **The rules moved into `js/rules/`** (a pure move first, checked by the lock): `world`, `traits`,
  `levelgen`, `dungeon`, `fov`, `travel`, `rng`, `sightline`; every import in the game, the mockups
  and the tests updated.
- **`world.js` (1,080 lines) split into parts,** each a file of the World's methods joined to it:
  `levels.js`, `senses.js`, `moves.js`, `monsters.js`, `fight.js`, `items.js`; the World itself (the
  run, the turn, the log) is about 150 lines. `content.js` holds the content and numbers from the
  JSON; `names.js` the names and words, with the rooms' names moved out of `tips.js` (the interface).
- **Nothing changed:** the behaviour lock passes; the browser check passes; the mockups load as
  before. A scan checked every part imports all it uses (the bot doesn't reach every line).
- **New test, the structure rule** (`tests/structure.test.js`): the rules import only each other and
  the content.
- The level generator (`levelgen.js`, 1,400 lines) is one file still: its content is out (R2); its
  rebuild is added as **R8** (yours: "We should include rebuilding the level generator as R8").

**R4, the state as data, and resume: done.**
- **Saving and restoring** (`js/rules/save.js`): `world.save()` gives the whole run as plain data
  JSON can hold; `World.restore(data)` gives the run back. The state is a graph (a monster's pack
  leader, the room a rat calls home, the level in hand and the same level among those kept), so each
  object is written once with an id and reached again as a reference; Maps, Sets, typed arrays and
  the dice are written as tagged objects; a level's two small functions are made again on restoring.
  The turn's passing things (events not yet drawn, the turn's noises, the way-finding cache) start
  again empty.
- **How it differs from the plan's words:** the plan said the state would become "one object of plain
  data". The live state stays as it was (Maps, Sets and references in memory); saving turns it into
  plain data and back, exactly. That meets the aim (save, restore, play on identically) without
  touching every rule; if a feature set wants the live state plainer, it can change then.
- **New test, save and restore** (`tests/save.test.js`): four runs saved part-way (at steps 40 to
  1,200, some on deeper levels), written to JSON text, restored, played on: step for step the same
  as straight through, and the restored run saves to the same text. A save of all three levels is
  about 430 KB.
- **Resume in the game** (`js/main.js`): the run is kept in the browser every 5 turns, on each new
  level, and when the page is left; when the page opens, the run left is taken up, with a line in the
  log: "You take up your run where you left it. (N: a new run instead.)" N starts a new run until the
  resumed one goes on. The save is cleared when a run ends. `?seed=` (tests) always starts afresh.
- **The browser check** now also plays, reloads, checks the same run is back, and that N starts a new
  one.
- The game is republished with the rebuild so far: https://claude.ai/artifact/MrmBHHSF379Aq66PsysqXz

**R5, drawing by families: done.**
- **The things in the rooms as data** (`js/content/features.json`): each kind's family (structure,
  furniture, light), how far its shadow falls, whether it casts one, its outline for the lights'
  shadows (box, square, hex, none), whether it's a pillar, whether it's kept with the walls once
  seen. The rules read the outlines and pillars from it (`sightline.js`, `levels.js`); the drawing
  reads the shadows (`maprender.js`); the view reads which are pillars and kept (`expression.js`,
  `render.js`). No check of a kind by name is left outside the drawing tables.
- **The drawing by families** (`js/draw/`): a table of drawing functions per family, `structure.js`
  (posts, stairs), `furniture.js` (crates, barrels, shelves, tables, benches, chairs, beds, coffins,
  sarcophagi, altars), `lights.js` (braziers, candles, campfires); `features.js` looks a thing's
  function up by its family. The long chain of branches in `maprender.js` is gone; each function is
  the old branch moved as it was, so the pen's dice are drawn in the same order. A new kind in a
  known family is a line of data and a function in its table; a new family is a new file and a line
  in `features.js`.
- **What R5 doesn't cover:** the plan names families for floors, liquids, debris, monsters and items
  too. Floors (shallow water) and debris (rubble) are drawn once each today, by their own code, not by
  kind; monsters and items are drawn as letters in the view (`render.js`). Their tables are made when
  a feature set gives them a second kind to draw (round 45's floors, slice 1's new monsters and
  things), so as not to build tables of one.
- **Nothing changed, proven:**
  - **the map drawings** (`npm run test:maps`, new): 72 drawings (6 seeds, 3 depths, drawn whole, as
    the grid's layer, as the walls' layer, as the plan) are the same, pixel for pixel, as before the
    change. Checked that it notices: an altar's inset 0.12 to 0.13 fails 8 drawings; a post's shadow
    0.2 to 0.21 fails 18.
  - **the features' outlines** (`tests/outlines.test.js`, new): every post's and furniture's outline
    on those levels, as recorded before the change (they shape sight and light);
  - the behaviour lock, the browser check; the mockups load as before.
- **The content check** now also checks `features.json`: every kind the levels make is listed, each
  has a drawing function in its family's table, and each table draws only kinds of its family.

**R6, pare down: done.**
- **Curses are gone** (back in slice 2): the cursed trait of weapons and armour, things that won't
  come off, "a sword?" (a weapon or armour not yet used named with a question mark), the tips'
  "might be cursed", and the altar's lifting of curses (`items.js`, `names.js`, `tips.js`,
  `traits.json`, `tuning.json`). The altar stays as furniture, with its candles. The other item
  traits are unchanged; a thing found that would have been cursed now has one of the others, or none.
- **Kept, as not an item curse:** the cursed crypt, a room trait (the undead that fall there rise
  once; nothing heals). Say if it should go too.
- **All light comes from sources:** the stretches of corridor lit of themselves are gone (the
  generator, the rules' lit squares, the view's lit places, the levels mockup's slider). Rooms were
  already lit only by their own braziers and candles. Corridors are dark until wall torches come with
  the light feature set.
- **The levels:** the same walls, rooms, furniture, lights and starts for the same seed; only some
  secret doors fall elsewhere (the dice the corridors' light took are no longer taken): in 6 of the
  18 levels of the map check, 31 squares, all secret doors.
- **Re-recorded on purpose:** the behaviour lock and the map drawings. A save from before R6 isn't
  taken up (the save's version is raised): the page starts a new run.
- **New test, the pare-down** (`tests/paredown.test.js`): no item trait cursed, sticking or hidden;
  a thousand things found on every depth, none cursed; on 20 seeds, every depth, every lit square
  has one of the level's lights within reach. Checked that it notices: run on the code before R6,
  both fail.

**R7, checks grown: done.**
- **The level checks** (`tests/levels-1/2/3.test.js`, `tests/support/levelcheck.js`), 100 levels a
  depth in `npm test`, 500 in `npm run test:deep`; a file a depth, checked side by side. Besides the
  stairs and every room being reached: every thing lying about and the king can be reached; the
  player arrives, and things, monsters, furniture and lights stand, on open floor; doors and secret
  doors stand in a wall, between two ways through; the map's edge is rock all round.
- **The crude bot made fuller** (`tests/support/bot.js`): it also picks things up, wields and wears
  the best it has, now and then takes armour off or drops something, closes doors behind it, goes
  back up a level and down again, and searches as a person would, at dead ends and along walls (it
  used to search where it stood, and could spend a whole run in a region sealed by secret doors). If
  it finds itself stepping back and forth, it goes for the monster in sight.
- **The bot's runs checked harder** (`tests/bot-a/b.test.js`, `tests/support/botruns.js`): 100 runs
  in `npm test` (500 deep). After every step, more must hold: no monster over its hit points, no
  pack led by one gone, things lying about on floor, the pack not over full and each letter once,
  what's held and worn in its place (a two-handed weapon with the off hand free), level and
  experience in agreement, hit points as the levels give them. **Every run must end**, dead or won,
  within 5,000 steps (no dead end, no endless loop); and the runs together must touch every part of
  play: 14 of the bot's actions, 9 kinds of happening (blows both ways, fleeing, doors, secret doors
  found, the stairs, death, sneaking, a monster growing suspicious). Checked that it notices:
  levelling up made to forget its hit points fails at once.
- **The balance maths begun** (`tools/balance/maths.js`): a fight worked out exactly from the
  content and the rules, no play: the blows to bring a monster down (a troll's healing too), the hit
  points its blows take meanwhile through armour, the chance of bleeding or poison, a sneak blow
  first, a pack fought one at a time or all at once. **Checked against the rules**
  (`tests/balance.test.js`, `tests/support/duel.js`): 12 kinds of fight, 2,000 each, played by the
  game's own rules, agree with the maths within chance. Checked that it notices: armour made to take
  off a point more fails it.
- **The balance report** (`npm run balance`, `tools/balance.mjs`, written to `spec/balance-now.md`):
  the player's blow by weapon and level; every monster fought with each depth's likely gear; what
  each depth holds (counted on 100 levels a depth); clearing a level: the experience, the level it
  brings, the hit points it costs, what the potions heal. Not yet in it: oil and dread, monsters'
  Depth and Level (the two-fifths rule), stealth.
- **Found, and fixed:** on about 1 level in 30 (10 of 300 seeds), the player arrived standing on a
  brazier: arriving without stairs, they stood at the start room's middle, where a lit room puts its
  brazier. Now they arrive on the open square nearest the middle (`levelgen.js`); no other start
  moves. (The behaviour lock re-recorded for that and for the fuller bot; nothing else in the game
  changed.)
- **Found, not fixed (for R8, or for you):**
  - **Doors onto secret doors:** where a wall is two squares thick, a door may open onto a secret
    door, or two secret doors stand in a row (6 such doors in 120 levels). Playable (searching finds the
    second), but odd: for R8.
  - **A way on only through a secret door:** on 10 of 100 depth-1 levels, the stairs down can only be
    reached by finding a secret door (none on depths 2 and 3). Counted by the level checks. For you:
    should every level have a way on without one?
  - **Exploring turning back and forth:** a sleeping monster in a corridor, out of sight from one
    square and in sight from the next, closes the explore way one step and opens it the next. The
    game's explore stops when it comes into sight, so a player sees it as explore stopping and
    turning back. Minor; for the interface work.
- **The balance, a first read** (`spec/balance-now.md`; the gear at each depth is a guess):
  - **Depth 1 is the hardest.** With the dagger and no armour, clearing it costs about 54 hit points
    fought one at a time (136 in the open) against 20 hit points (more as the player levels up)
    and about 39 from its potions;
    about 10 rats a level, in packs. The bot dies there most (about half its runs).
  - **Depth 2 is the easiest** once a sword and chainmail are found: about 20 hit points for the
    whole level. Armour matters most against goblins' small blows.
  - **The king:** with an axe at level 5, chainmail and helmet, he costs about 37 hit points of a
    36-point player; with a warhammer at level 7 and chainmail, about 28 (and 4 more bleeding) of
    44. A close fight, unless the player comes better armed.
  - None of this is to tune now (no balance changes in the rebuild); it's the starting line the
    feature sets are measured against.
