# 0. The proof of concept, reviewed

What exists: three levels and the goblin king; 11 monsters, 7 kinds of item, 25 traits; sneaking,
light, awareness, noise; click to walk, tips. It is about 10,000 lines of JavaScript, plain ES
modules with no build step, published as one page.

## What it proved

- **The look works live.** A Dyson-style inked map can be drawn as it is explored:
  - hatching tapering from known walls;
  - a shadow cast down and to the right;
  - light in flat bands;
  - fog over ground not yet seen.

  It runs on the GPU, with a canvas fallback, and stays fast on a phone.
- **Light and sneaking make the game its own.**
  - With the lamp out you are harder to notice but see less.
  - Lit rooms give you away.
  - Monsters go from unaware to suspicious to alarmed.
  - A blow on an unaware monster does triple damage.
  - The noise words on the map show what is heard.

  Together these are what set it apart from other roguelikes.
- **Levels by kinds of ground.** Built rooms, collapsed rooms, caverns and the king's halls, one
  kind changing into the next across a level, make each level a place.
- **The ink ledger interface.** The black torn plates, the lettering, the log and the tips hang
  together as one style.

## What it didn't settle

- **Why play twice.** A run is three levels; there are no choices to make in how the character
  grows, and nothing differs between runs but the map.
- **Depth of play.** Fights are mostly bump-and-trade. There are few items and no tools: nothing
  to throw, read or use on the level.
- **Phones.** Touch works, but the phone layout was put off.
- **The pages around the game.** There is no title, settings or saving, and the victory page is
  a placeholder.
- **Several things not drawn yet:** stairs, the throne, hearths, doors, and height and depth.

## What carries over, what has to be redone

My critique, part by part. It bears on part 10 and on what the full game can afford.

| Part | Carries over | Has to change for a full game | Why |
|---|---|---|---|
| Drawing the map (`maprender`, `hatching`, `gpu`, `expression`) | Most of it | **A way to add things to the map.** Each new thing (water, the nest, braziers) has been drawn by code added to `render.js` (1,281 lines). Each new thing should be described in one place: its ink, the shadow it casts, the light it blocks, what's drawn over it. | With 50 or more things to draw, the renderer would become unmaintainable and slow down, and the visual language couldn't be enforced in one place |
| Level generator (`levelgen`, `dungeon`) | The areas and kinds of ground, rooms by kind | More ground kinds and set pieces as data; levels tested for being playable (reachable, fair stealth routes) | Today each kind is code; adding regions means adding generators |
| The world (`world.js`) | Speeds, awareness, noise, morale, ailments | **The rules split from the content.** Monsters, items and traits defined as data (as `traits.js` started), with their behaviours in small parts, not special cases inside `whack` and `strike` | A full game's content (maybe 40 monsters, 80 items) won't fit in one class. Balance needs the numbers in tables |
| Game state | — | **Designed to be saved**: everything a run is (levels as left, monsters' minds, the random generator's place) as plain data | Saving can't be added later without combing through all of it. It is cheap if decided now, dear after |
| Several levels at once | Levels kept as left | Drawing caches (hatching strokes, GPU buffers) dropped for levels not shown, rebuilt on return | Fine for 3 levels; with 10 or more, memory on phones runs out |
| Interface (`ui`, `plates`, tips) | The style, the ledger | The phone layout designed as fully as the big screen; menus, settings, the title | It was tabled |
| Tests | — | **Tests kept in the repository:** rules tested without a browser, a few browser checks, and **simulated runs** (a bot playing hundreds of runs) to tune the balance | So far each change was checked by scripts I wrote and threw away. A full game can't be balanced by hand |
| Way of working | Mockups, the choices page, decisions written down | **Families instead of one-offs.** Each element took 2 to 7 rounds of mockups. With rules for each family of things (furniture, raised floor, liquids, debris, lights), only one example of each family needs rounds, and the rest follow the rules | At the full game's scale, rounds per element would take most of the time |

## Risks worth knowing now

- **Drawing cost grows with the level.** The hatching and the light are the expensive parts.
  Bigger levels, more lights, or more things casting shadows each cost on phones. The full game
  needs a budget (part 10), measured, not guessed.
- **Stealth needs monsters with minds.** If stealth is the heart (round 1, question 1), monsters
  must search, patrol, follow sounds and react to light. That is the most work in the systems, and
  each turn's thinking has to stay cheap on phones.
- **Hand-drawn looks take time.** Each new kind of thing has taken several rounds to get right. The
  amount of content the full game has should be weighed against that (round 1, question 2).
