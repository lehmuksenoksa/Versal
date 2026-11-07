# 11. Getting there: the roadmap

Your call, after round 38: "I think we need to limit the scope a lot to make this feasible to
design and to implement. There's too many gameplay features and mechanics to design at the moment,
and to see how they interplay. Also, I would really like for a lot of the areas and features to
have their distinct look, and that will take a lot of effort as well."

## How we work from here

- **The catalogue stays whole.** Nothing in it is thrown away. Each entry gets a **tier** (the
  content model's field): slice 1, or later.
- **The game grows in slices.** Each slice is specified in depth (its looks, numbers and rules),
  then built, published and playtested. The next slice is specified after you've played the last.
  "The go" is given per slice.
- **Only the current slice is specified in depth.** Everything else stays shallow in the catalogue.

## The order of building (yours, after round 45)

"Maybe we should hold our horses here. I think we're tackling way too much at a time for single
release in Slice 1. I think rebuild of the current PoC to architecturally support upcoming changes
should be the first thing. No new features, maybe even pairing down some existing ones, but updating
the engine so new features are easier and cheaper to add. Also, making automated testing possible.
Then features/feature sets one at a time. The small scale of PoC allows for faster testing and
making sure everything works before we add too many variables to tell what isn't working."

1. **The rebuild first: no new features.** The proof of concept's engine reworked so new features are
   easier and cheaper to add, and automated testing is possible. Some existing features may be pared
   down. The plan, for review before its go: `rebuild-plan.md`.
2. **Then feature sets, one at a time,** each built, tested and played on the proof of concept's small
   scale before the next, so when something doesn't work it's clear what.
3. **Groundwork first, then the feature sets in order** (after the rebuild, asked to reassess:
   `groundwork.md`): small maps for tests, the player's actions in the rules, a lock on the view;
   then light, stealth, lights as items with oil and dread, fighting and character, contents,
   features and traps, six depths.
4. **Slice 1's spec stays the target:** what's decided for slice 1 is built feature set by feature
   set, not all at once. Its looks are decided as each feature set comes (round 45 waits).

## The slices

| Slice | What it adds | Maps |
|---|---|---|
| **1. The Over Dungeon** | Six levels of the plain Over Dungeon; a few new mechanics; the rebuild part 0 calls for (content as data, saving, tests, things drawn as families) | 6 |
| 2. The first region | Goblin Territory (the goblin king at the bottom) set in the Over Dungeon; more mechanics | 6 to 8 |
| 3. A second region | A transition between two regions, and the first forks in the way down | about 10 |
| 4. Toward the full world | More regions, the end game, the twenty depths | 20 |

Slices 2 to 4 are a sketch: each is chosen after the last is played.

## Slice 1 (decided so far)

- **The plain Over Dungeon, depths 1 to 6** (yours: "Let's do Plain Over Dungeon all six levels
  for now. We have other questions to solve first."). Built rooms near the top, falling in, then
  caves (round 13). No region, no boss: the run ends when you reach the stair down from depth 6.
- **Goblin Territory moves to slice 2** (it was slice 1 for a moment: "How about we bump Goblin
  territories to the first region"; then "3-4 overdungeon, 2-3 goblin territories").
- **Goblins can still appear**, as the Over Dungeon's own: goblin camps, guard posts and crude
  prisons (round 21).
- **Its monsters, items, strangers and features are a small set** for depths 1 to 6, picked from
  the catalogue, not the whole roster. Monsters: 23, built in two steps (`round41-slice1-monsters.md`).
- **Its things to find:** in two steps, as its monsters (`round42-slice1-things.md`). No strangers in
  slice 1; trade, unknown things and curses come with slice 2 (the proof of concept's cursed items
  are taken out for slice 1; the murky potion stays).
- **Its features:** `round43-slice1-features.md`; traps come in (tripwire, pressure plate, net).
  A look rule: things to interact with look different from decoration.
- **Its ending: a goblin camp led by a goblin chieftain near the stairs down on depth 6** (a leader,
  not a boss).
- **The rebuild is in** (yours: "I like the rebuild plan"): content as data, saving, tests (the plan
  in `10-building-it.md`), drawing by families.
- **Not in slice 1:** the phone layout; the title, death and victory pages.
- **The mechanics are discussed before they're chosen** (yours: "We haven't really thought through
  and fleshed out how the five attributes might work. We haven't thought of how stealth mechanics
  would work. We haven't really thought of what the level-up choices could be - let's call them
  Perks for now. We haven't fleshed out Light and Dread either. These are interconnected, and a lot
  of work each on their own. They need to be prioritized as well.") Round 39's mechanics grid is
  set aside for that.
- **Level-up choices are called Perks.**
- Parked: round 39's senses and alarms; they come back with stealth.

**Its looks to decide:** `slice1-looks.md`.
