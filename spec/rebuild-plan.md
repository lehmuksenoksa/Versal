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
