# Versal

A sketchpad for the look and feel of a browser roguelike: one hand-inked dungeon map, the player,
and some goblins.

- The map is drawn once, offscreen, in the manner of Dyson Logos' dungeon maps.
- The player (`@`) and goblins (`g`) are blackletter glyphs, set in UnifrakturMaguntia.
- Goblins hop with squash and stretch, dart about within their tile, and mill around a pack leader.

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
| `js/dungeon.js` | Rooms, corridors, doors and furniture. |
| `js/maprender.js` | The hand-inked map: paper, hatching, floor grid, walls, furniture, room numbers. |
| `js/world.js` | The player, goblin packs and their milling about. |
| `js/render.js` | Per-frame drawing: camera, doors, glyph poses and movement tweens. |
| `js/main.js` | Input and the main loop. |

## Fonts

UnifrakturMaguntia (J. "Mach" Wust, after Peter Wiegel) and IM Fell English (Igino Marini) are in
`fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.
