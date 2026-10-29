# Versal

A sketchpad for the look and feel of a browser roguelike: one hand-inked dungeon map, the player,
and some goblins.

- The map is drawn once, offscreen, in the manner of Dyson Logos' dungeon maps: heavy walls drawn
  as chains of short pen strokes (jagged in cave rooms), a grey shadow cast down-right, bold stone
  hatching in the rock, and a hand-drawn floor grid.
- The player (a red `@`) and goblins (`g`) are letters set in Texturina, with a hatched pen shadow.
- Goblins hop with squash and stretch, dart about within their tile, and mill around a pack leader.
- The player sees only what lies in their line of sight, cast against the walls, and remembers what
  they have seen as a plain plan of the walls; unexplored ground stays dark. Near the floor in sight the
  map's own hatching shows, but never close to floor not yet seen; beyond it, hatching drawn as if the
  whole map were solid rock thins out with distance, so it gives away nothing unexplored. They carry a small warm light that walls shadow, and the rock outside the rooms
  is toned darker than the floor.

## Running it

No build step. ES modules need to be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Move with the arrow keys, numpad, `hjkl`/`yubn` or `wasd`, or click or tap toward a spot. Press `.` or
space to wait a turn. Zoom with the mouse wheel or `+`/`-` (`0` resets to 75%). `window.versal` exposes the world and renderer
in the browser console.

## Code map

| File | What it does |
| --- | --- |
| `js/dungeon.js` | Rooms and caves, corridors, doors and furniture. |
| `js/maprender.js` | The hand-inked map: wall outlines and strokes, shadow, floor grid, furniture, room numbers. |
| `js/hatching.js` | The stone hatching: rock cut into stretched triangle cells, each filled with a small group of strokes. |
| `mockups/glyphs.html` | Player and goblin letters in Texturina and Grenze Gotisch, with ink, weight, halo and shadow options. |
| `mockups/visibility.html` | The game with a panel for tuning sight, memory, unknown ground and light. |
| `mockups/expression.html` | Rooms, walls and one hatching (the map hatched as solid rock, inked by a depth map from the known walls), with a player whose sight and candle can be walked around: the in-sight and remembered looks, unexplored ground, darkness and light. |
| `mockups/hatching.html` | Standalone page for tuning the hatching, walls and grid with sliders. The game uses its "Cells with zones" panel with the settings in `HATCH` (`js/hatching.js`) and `WALL`/`GRID` (`js/maprender.js`). |
| `js/world.js` | The player, goblin packs and their milling about; field of view and memory. |
| `js/fov.js` | Recursive shadowcasting field of view (tile-based, for game logic). |
| `js/sightline.js` | Visibility polygons cast against the wall outlines, for sight and light. |
| `js/render.js` | Per-frame drawing: camera, sight, memory and light (`VIS_DEFAULTS`), glyph poses and tweens. |
| `js/main.js` | Input and the main loop. |

## Fonts

Texturina (The Texturina Project Authors) and IM Fell English (Igino Marini) are in
`fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.
