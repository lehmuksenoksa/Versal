# Versal

A proof-of-concept roguelike that plays in the browser and looks like a page from an illuminated
manuscript crossed with a hand-inked dungeon map.

- **Maps** are drawn once per level in the manner of Dyson Logos' dungeon maps: heavy pen walls,
  clustered stone hatching outside them, a faint grid on the floors, pencilled room numbers, and
  furniture in ink (pillars, wells, coffins, stairs, rubble). Lines carry a little hand tremor.
- **Creatures and items** are still single characters, set in a blackletter face
  (UnifrakturMaguntia). A goblin is a fraktur `g`, a rat an `r`, the player an `@`.
- **They move.** Every creature type has its own idle motion: goblins hop with squash and stretch
  and dart about their swarm-mates, rats scurry, bats flutter, zombies sway, skeletons rattle,
  orcs stomp. Moves tween between tiles, attacks lunge, hits shake and flash.
- **Swarms.** Goblins, rats, kobolds, skeletons and orcs spawn in packs that mill around a leader
  until one notices you. Then the whole pack wakes and surrounds you.
- **Bosses are versals** (illuminated initials), drawn procedurally with a gilded frame, a
  coloured field with white filigree and a blackletter capital:
  - the **Goblin King** is a gold `G` on red with a bobbing crown, twitching ears and vines. He
    summons more goblins.
  - the **Dragon** is a vermilion `D` on ultramarine. Its body winds over and under the letter,
    its wings flap behind the frame, and it breathes fire in a line.

Three leaves (levels) deep. Slay the Dragon on the third.

## Running it

No build step and no dependencies. ES modules need to be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static host works, including GitHub Pages.

## Controls

| Action | Keys |
| --- | --- |
| Move / attack | arrow keys, numpad, `hjkl` + `yubn` (diagonals), or `wasd` |
| Walk to a spot | click or tap it (stops when something new comes into view) |
| Wait | `.`, space, numpad 5 |
| Quaff a draught of healing | `q` |
| Read a scroll of smiting (hits everything in view) | `r` |
| Descend | `>` or Enter while on the stair |

Bump into Brother Anselm (the green `m` on the first leaf) to talk. He has advice and a gift.
Hover over anything on the map to name it.

## Code map

| File | What it does |
| --- | --- |
| `js/dungeon.js` | Rooms, corridors (MST plus a few loops), doors, stairs, furniture. Checks connectivity. |
| `js/maprender.js` | The offscreen, hand-inked map: paper, hatching, floor grid, walls, furniture, ink blots. |
| `js/versal.js` | Procedural illuminated initials, with dragon, crown and vine motifs. |
| `js/render.js` | Per-frame drawing: camera, glyph poses and tweens, doors, fog of war, particles, text. |
| `js/game.js` | Rules: energy-based turns, pack AI, distance-map pathing, combat, bosses, items, XP. |
| `js/content.js` | Monster, NPC, item and depth tables. Add a creature here and give it an `anim`. |
| `js/fov.js` | Recursive shadowcasting. |
| `js/ui.js`, `js/main.js` | Side panel, input, title and ending cards, main loop. |
| `tools/bot.mjs` | Headless smoke test: a bot plays full games in Node and checks invariants. |

`window.versal.game` exposes the live game in the browser console for poking around.

```bash
node tools/bot.mjs 50
```

## Fonts

UnifrakturMaguntia and UnifrakturCook (J. "Mach" Wust, after Peter Wiegel) and IM Fell English
(Igino Marini) are bundled in `fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.

## Ideas beyond the proof of concept

- More versal motifs (a lich's `L` with a skull, a serpent `S`), and multi-tile boss footprints.
- Cave levels with smoothed, curving wall outlines; Dyson-style secret doors marked `S`.
- Rubricated marginalia: little goblins climbing the codex border when a swarm is awake.
- Sound: quill scratches for moves, a page turn between leaves.
