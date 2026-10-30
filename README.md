# Versal

A sketchpad for the look and feel of a browser roguelike: one hand-inked dungeon map, the player,
and some goblins.

- The map is drawn in the manner of Dyson Logos' dungeon maps: heavy walls drawn as chains of short
  pen strokes (jagged in cave rooms), a grey shadow cast down-right, a hand-drawn floor grid, and bold
  stone hatching in the rock. The hatching is one pattern for all the rock (the map hatched as solid
  stone); a depth map from the known walls sets how heavily it is inked, so it never gives away
  ground not yet seen.
- Levels are made by areas: dungeon (built rooms and straight corridors; rooms of different kinds
  with pillars, niches, jail cells, beds, tables, shelves, crates and doors), cavern (misshapen caves
  with rock formations and rubble, winding passages) and collapsed (both, rooms half fallen in).
- The player (a red `@`) and goblins (`g`) are letters set in Texturina, with a hatched pen shadow.
- Goblins hop with squash and stretch, dart about within their tile, and mill around a pack leader.
  Some packs sleep (slumped, breathing slowly); a pack that sees the player close by turns
  aggressive: it chases them (a little slower than they move), attacks when next to them (no damage
  yet), and opens doors in the way now and then; it gives up when they are out of sight a while or
  far off.
- Light other than the player's: goblin campfires in the caverns (a pack always round them; the
  flame burns, redrawn on twos), and lit dungeon rooms and stretches of corridor, lit throughout,
  their light pouring out of open doorways in bands like the player's. Lit places are seen from
  far off, in line of sight, and a sneaking player standing in one is noticed as if their lamp
  were lit.
- The player whacks a goblin by walking into it (goblins take a hit or two), opens a door by walking
  into it and closes one next to them with C, and puts the lamp out with F to sneak: sight close
  round them, only the dark band of light, and goblins much less likely to notice or wake.
- Low power, for phones: on touch screens (or if frames run slow, or with `?quality=low`; never with
  `?quality=high`) the game draws at one device pixel per screen pixel and puts the map together
  again only twelve times a second while the view stands still.
- Secret doors: some dungeon doors look like plain wall until found. Each turn the player may spot
  one in sight within two squares (better next to it); searching with E spends a turn and gives
  much better chances. Once found it is an ordinary door. Goblins don't use them until then.
- Goblins' noises are written above them as small words that rise and fade: "scuttle" when they
  move, "grr" when aggressive, "zzz" asleep. They show out of sight too, within hearing, fainter
  with distance.
- The player sees what lies in their line of sight, cast against the walls: sharp where walls block
  the view, fading out with distance. What is in sight is drawn in black ink; what is remembered is
  drawn more faintly, in browner ink, on a floor toned toward the stone; ground never seen is black,
  fading in through thickening strokes. They carry a candle whose flame casts shadows, sharp near a
  wall and softer away from it, with darkness outside its light.

## Running it

No build step. ES modules need to be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Move with the arrow keys, numpad, `hjkl`/`yubn` or `wasd`, or click or tap toward a spot; walk into
a goblin to whack it, into a shut door to open it. Press `c` to close a door next to you, `f` to put
the lamp out (sneak) or light it, and `.` or space to wait a turn. Zoom with the mouse wheel or
`+`/`-` (`0` resets to 48%). `window.versal` exposes the world and renderer
in the browser console.

## Code map

| File | What it does |
| --- | --- |
| `js/levelgen.js` | The game's levels, by areas (`LEVELGEN_DEFAULTS`): regions of dungeon, cavern and collapsed ground, their rooms, corridors, rubble, doors, room kinds and furnishings. |
| `js/dungeon.js` | Tile types, cave carving, and the older single-kind generator (still used by the expression mockup). |
| `js/maprender.js` | The hand-inked map: wall outlines and strokes, recesses, doors, shadow, floor grid (looser on cave floors), rubble, furniture and pillars, room numbers. |
| `mockups/levels.html` | A whole generated level, fully lit, with sliders for `js/levelgen.js`: regions, rooms, caverns, collapse, room kinds and furnishing. |
| `js/hatching.js` | The stone hatching: rock cut into stretched triangle cells, each filled with a small group of strokes. |
| `mockups/glyphs.html` | Player and goblin letters in Texturina and Grenze Gotisch, with ink, weight, halo and shadow options. |
| `mockups/expression.html` | The map as the game shows it, with a player to walk about and a panel for every setting of `js/expression.js`: sight, the candle and darkness, the in-sight and remembered looks, the depth map and hatching, unexplored ground, the rock. |
| `mockups/hatching.html` | Standalone page for tuning the hatching, walls and grid with sliders. The game's hatching uses its "Cells with zones" panel with the settings in `HATCH` (`js/hatching.js`) and `WALL`/`GRID` (`js/maprender.js`). |
| `js/world.js` | The player, goblin packs and their milling about (no step diagonally past a post); field of view and memory. |
| `js/fov.js` | Recursive shadowcasting field of view (tile-based, for game logic). |
| `js/sightline.js` | Visibility polygons cast against the wall outlines, for sight and light. |
| `js/expression.js` | How the map is shown as it is explored (`EXPRESSION_DEFAULTS`): the solid-rock hatching and its depth map, the in-sight and remembered looks, the cover over unseen ground, sight, the candle and darkness. |
| `js/render.js` | Per-frame drawing: camera and zoom, the map (via `js/expression.js`), glyph poses and tweens. |
| `js/main.js` | Input and the main loop. |

## Fonts

Texturina (The Texturina Project Authors) and IM Fell English (Igino Marini) are in
`fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.
