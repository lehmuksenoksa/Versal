# Versal

A sketchpad for the look and feel of a browser roguelike: one hand-inked dungeon map, the player,
and some goblins.

- The map is drawn once, offscreen, in the manner of Dyson Logos' dungeon maps: heavy walls drawn
  as chains of short pen strokes (jagged in cave rooms), a grey shadow cast down-right, bold stone
  hatching in the rock, and a hand-drawn floor grid.
- The player (`@`) and goblins (`g`) are blackletter glyphs, set in UnifrakturMaguntia.
- Goblins hop with squash and stretch, dart about within their tile, and mill around a pack leader.
- The player sees only what lies in their field of view and remembers what they have seen;
  unexplored ground stays blank paper, and they carry a warm light.

## Running it

No build step. ES modules need to be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Move with the arrow keys, numpad, `hjkl`/`yubn` or `wasd`, or click or tap toward a spot. Press `.` or
space to wait a turn. Walk into a door to open it. `window.versal` exposes the world and renderer
in the browser console.

## Code map

| File | What it does |
| --- | --- |
| `js/dungeon.js` | Rooms and caves, corridors, doors and furniture. |
| `js/maprender.js` | The hand-inked map: wall outlines and strokes, shadow, floor grid, furniture, room numbers. |
| `js/hatching.js` | The stone hatching: rock cut into stretched triangle cells, each filled with a small group of strokes. |
| `mockups/glyphs.html` | Player and goblin letters in Texturina and Grenze Gotisch, with ink, weight, halo and shadow options. |
| `mockups/visibility.html` | The game with a panel for tuning sight, memory, unknown ground and light. |
| `mockups/hatching.html` | Standalone page for tuning the hatching, walls and grid with sliders. The game uses its "Cells with zones" panel with the settings in `HATCH` (`js/hatching.js`) and `WALL`/`GRID` (`js/maprender.js`). |
| `js/world.js` | The player, goblin packs and their milling about; field of view and memory. |
| `js/fov.js` | Recursive shadowcasting field of view. |
| `js/render.js` | Per-frame drawing: camera, sight, memory and light (`VIS_DEFAULTS`), glyph poses and tweens. |
| `js/main.js` | Input and the main loop. |

## Fonts

UnifrakturMaguntia (J. "Mach" Wust, after Peter Wiegel) and IM Fell English (Igino Marini) are in
`fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.
