# Versal

A sketchpad for the look and feel of a browser roguelike: one hand-inked dungeon map, the player,
goblins in the caves and skeletons in the built rooms. The player always starts in a dungeon room.

- The map is drawn in the manner of Dyson Logos' dungeon maps: heavy walls drawn as chains of short
  pen strokes (jagged in cave rooms), a grey shadow cast down-right, a hand-drawn floor grid, and bold
  stone hatching in the rock. The hatching is one pattern for all the rock (the map hatched as solid
  stone); a depth map from the known walls sets how heavily it is inked: full depth behind walls
  known all along, tapering to nothing toward where a wall runs on into wall not yet seen, so it
  never gives away ground not yet seen. Floor that has been seen is never hatched.
- Levels are made by areas: dungeon (built rooms and straight corridors; rooms of different kinds
  with pillars, niches, jail cells, beds, tables, shelves, crates and doors), cavern (misshapen caves
  with rock formations and rubble, winding passages) and collapsed (both, rooms half fallen in).
- The player (a red `@`), goblins (`g`) and skeletons (a white `z`, edged in ink) are letters set in
  Texturina, with a hatched pen shadow. Letters take the light as the map does: a paper outline
  (the undead's in ink) that fades with the light, the colour darkening towards ink in the dim and
  dark bands, and on unlit floor plain black with no outline. Skeletons behave as goblins do but far less lively: slower,
  alone or in pairs (but packs in crypts), standing stiff and swaying a little now and then rather
  than hopping, lying still when dormant, and seldom heard.
- Goblins hop with squash and stretch, dart about within their tile, and mill around a pack leader.
  Some packs sleep (slumped, breathing slowly); a pack that sees the player close by turns
  aggressive: it chases them (a little slower than they move), attacks when next to them (no damage
  yet), and opens doors in the way now and then; it gives up when they are out of sight a while or
  far off.
- Light other than the player's: goblin campfires in the caverns (a pack always round them; a
  flame burning over a teepee of three logs, redrawn on twos), and lit dungeon rooms and stretches of corridor, lit throughout,
  their light pouring out of open doorways in bands like the player's. Lit places are seen from
  far off, in line of sight, and a sneaking player standing in one is noticed as if their lamp
  were lit.
- The player whacks a monster by walking into it (goblins take a hit or two, skeletons three or four), opens a door by walking
  into it and closes one next to them with C, and puts the lamp out with F to sneak: sight close
  round them, only the dark band of light, and goblins much less likely to notice or wake.
- The map is drawn on the GPU (WebGL2) where there is one: the hatching inked there from every
  stroke's shape, sent once, and each frame put together in one pass. The walls, floor and its
  markings are sent once too; each step only small masks (how well each spot was seen, the depth
  map, the cover) are worked out, round what changed, and sent. The game starts before the
  hatching's strokes are made: they are made in a worker (`js/strokes-worker.js`) and fade in. Without one (or with only a
  software one, or with `?render=canvas`) it is drawn with canvases as before; `?render=gpu` uses
  the GPU even in software. `?perf` shows a readout of what draws the map and how long frames,
  steps and redraws take.
- Low power, for phones: on touch screens (or if frames run slow, or with `?quality=low`; never with
  `?quality=high`). On the GPU the map is still drawn as sharp as the screen (its drawings capped at
  5 million pixels when zoomed in close). With canvases, the game draws the map at one device pixel per screen pixel (the letters, flames and words on a
  layer over it as sharp as the screen) and puts the map together
  again only twelve times a second while the view stands still.
- Secret doors: some dungeon doors look like plain wall until found. Each turn the player may spot
  one in sight within two squares (better next to it); searching with Z spends a turn and gives
  much better chances. Once found it is an ordinary door. Goblins don't use them until then.
- Goblins' noises are written above them as small words that rise and fade: "scuttle" when they
  move, "grr" when aggressive, "zzz" asleep; skeletons "clatter", "hsss" and lie silent but for a
  creak, and fall apart with a "crash!". They show out of sight too, within hearing, fainter
  with distance. In a fight the words of the fighting fly off into open space, clear of each other
  and of the letters: hits pop out along the blow (yellow, in small capitals), misses sink, death
  cries (red) jolt and sink; the background noise isn't shown while blows are flying.
- The room the player is in has its walls and their hatching inked halfway toward in sight where
  they're out of view, as far as they are known, so a room broken up by columns or formations still
  reads as one place (the floor grid only where seen). Rooms are as the level made them: each
  square's floor and the rock bordering it belong to a room (`roomOf`, `wallOf`), with its
  recesses, niches and cells; corridors, passages and doorways to none.
- The player sees what lies in their line of sight, cast against the walls and pillars (what is
  behind a pillar is hidden, goblins too): sharp where they block the view, fading out with distance.
  Known walls and hatching within a few squares stay inked as in sight round a corner, but the
  floor grid shows only where the player sees. What is in sight is drawn in black ink; what is remembered is
  drawn more faintly, without the floor grid or the furniture, on a floor toned toward the stone; ground never seen is black,
  fading in through thickening strokes. They carry a candle whose flame casts shadows, sharp near a
  wall and softer away from it, with darkness outside its light.

## Running it

No build step. ES modules need to be served over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Move with the arrow keys, numpad or `wasd`; walk into a monster to attack it, into a shut door to
open it. Press `c` to close a door next to you, `z` to search for secret doors, `r` to rest until
healed (stopped by anything coming into sight or chasing near by, or any key), `f` to put the lamp
out (sneak) or light it, and `.` or space to wait a turn. `m` pulls down every message, `?` shows
the keys. `e`, `i` and `l` open equipment, inventory and a look at what's in sight (with `!` and `?`
over monsters on the map that have noticed you) in the sidebar, in place of the character sheet.

Things lie about the rooms, written as letters on the floor (`)` weapons, `[` armour, `!` potions;
remembered faintly once seen), and goblins sometimes drop what they carried. `,` picks up what's
underfoot; `q` drinks a potion of healing, `W` wields a weapon or puts on armour, `t` takes one off,
`D` drops one, each asking which by its letter (or click the word beside it in the sidebar). The
pack holds ten things (`a` to `j`), potions of a kind together. The player starts with a dagger
(1–4) and a potion; swords (2–6), axes (3–7) and two-handed warhammers (4–10) hit harder; a helmet
or chainmail takes up to 1 or 2 off a blow.

Monsters notice the player gradually: each turn one sees or hears them it grows more aware (much
more when the player is lit, by the lamp or a lit place, and close; less while milling about; not
at all by sight while asleep); a third aware, it turns suspicious (`?`), stops and peers, and goes
to look where it last saw or heard them; fully aware, it and its pack chase (`!`). Awareness ebbs
while it sees and hears nothing. With the lamp out a step takes one and a half turns, is quieter,
and the player can only be seen from two or three squares off, so a monster can be reached unaware.
A blow at a monster that hasn't noticed the player (asleep or unaware) always lands, three times as
hard. When no more than half a goblin pack is left the rest flee, then regroup, warier; the undead
never flee.

A run starts by asking the player's name (`?name=…` in the address skips it). The player has 20 hit
points and is an adventurer of the first level; kills give experience (a goblin 5, a skeleton 8),
and each new level 4 more hit points and, every other one, a harder blow. Goblins hit for 1 to 3, skeletons claw for 1 to 4, and a hard claw
can make you bleed (a hit point a turn for a few turns; resting stops it). Wounds heal a hit point
every 20 turns, every 5 resting. At none, the run ends: a page says how, and any key or tap starts
a new one. The place, its level and the newest three messages are written at the top left of the
map; on a wide screen the sidebar on the right shows who the player is, their health, anything
ailing them, and their sheet (experience, stats). On a wide screen both sit on torn black plates,
and the messages drawer is a dark grey sheet torn at its foot, all shaped as chosen in the ledger
mockup (`js/plates.js`, from `mockups/ledger/plates.json`).

With a finger (or the mouse), tap to step once toward it (as the finger lifts), the way by its angle from the player
(straight up, down and across taking wider wedges than the diagonals); hold to keep walking,
steered by the finger and sliding round walls, until a goblin comes into sight. On touch screens a
strip of buttons along the bottom searches (or waits), rests, puts out or lights the lamp, and closes a
door. Pinch with two fingers to zoom. Zoom with the mouse wheel or
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
| `mockups/sidebar.html` | Six proposals for the frame around the map (character sheet, pack, log, actions), each on desktop and phone. |
| `mockups/ledger.html` | The chosen sidebar style refined: place, health and newest messages on top, a message drawer, equipment, inventory and look on demand (keys e, i, l, m). |
| `mockups/letters.html` | Every letter, the player's and the monsters' to come, under each band of light, with each one's outline (paper or ink) and switches for how letters take the light. |
| `mockups/expression.html` | The map as the game shows it, with a player to walk about and a panel for every setting of `js/expression.js`: sight, the candle and darkness, the in-sight and remembered looks, the depth map and hatching, unexplored ground, the rock. |
| `mockups/hatching.html` | Standalone page for tuning the hatching, walls and grid with sliders. The game's hatching uses its "Cells with zones" panel with the settings in `HATCH` (`js/hatching.js`) and `WALL`/`GRID` (`js/maprender.js`). |
| `js/world.js` | The player, goblin packs and their milling about (no step diagonally past a post); blows, health, ailments, healing and death; the message log; field of view and memory. |
| `js/ui.js` | The words around the map: the place and newest messages, the sidebar (sheet, equipment, inventory, look), the messages drawer, the help, the name and end-of-run pages. |
| `js/plates.js` | The torn plates under the corner, the sidebar and the drawer: the chosen polylines, their edges drawn as cave walls and torn. |
| `js/fov.js` | Recursive shadowcasting field of view (tile-based, for game logic). |
| `js/sightline.js` | Visibility polygons cast against the wall outlines, for sight and light. |
| `js/expression.js` | How the map is shown as it is explored (`EXPRESSION_DEFAULTS`): the solid-rock hatching and its depth map, the in-sight and remembered looks, the cover over unseen ground, sight, the candle and darkness. |
| `js/gpu.js` | The map drawn on the GPU (WebGL2): one pass a frame putting together what `js/expression.js` prepares, the hatching inked there from every stroke's shape (sent once), the flicker a few numbers. |
| `js/render.js` | Per-frame drawing: camera and zoom, the map (on the GPU via `js/gpu.js`, or with canvases via `js/expression.js`), glyph poses and tweens. |
| `mockups/speed.html` | The same level drawn on the GPU and with canvases side by side, with timings; also stroke stamps, a worker, the flicker. |
| `js/main.js` | Input and the main loop. |

## Fonts

Texturina (The Texturina Project Authors) and IM Fell English (Igino Marini) are in
`fonts/` under the SIL Open Font License; see the `OFL-*.txt` files.
