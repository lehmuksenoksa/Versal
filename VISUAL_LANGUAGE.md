# Versal: the visual language

How everything on the map is drawn: the walls, the floor, the things on it, and anything new.
Each new element and each mockup keeps to these rules. Mockups are drawn with the game's own
drawing code (`pen`, `wallLine`, the shadow layer in `js/maprender.js`), not imitations of it.
Shown rule by rule, as broken and as kept, in `mockups/language.html`.

The model is Dyson Logos' maps: one hand, one pen, one ink, one grey, on paper.

**State (answered on the choices page):**
- Agreed: rules 1 (pen strokes), 2 (weights), 4 (fills) and the one tone, laid once (in 5).
- Height (5): the longer shadows chosen, but **not enough on their own** (open, below).
- Depth (6), shown step by step with bands: **not agreed** (open, below).

This is a first step, not the full spec. The rest is part 8 of the full game's spec
(`spec/README.md`).

## 1. Every line is a pen stroke

- Drawn with the pen (`pen().line`, `.shape`, `.box`, `.round`, `.lump`): each line a little
  bowed, its ends over- or under-shooting the corner by up to a 32nd of a square, its width
  varying by about a tenth, corners a touch off.
- Long lines are several strokes: walls are strokes about a third of a square long, each
  ending a little off the line (`drawWalls`); the floor grid's strokes stop short of the
  crossings now and then and break midway (`drawGrid`).
- No ruled lines, no perfect circles or arcs (`round` lumps a little and closes past its
  start), no perfectly even rows of anything.

## 2. One weight for each kind of line

In 32nds of a square (scaled with the square):

| Line | Weight |
|---|---|
| Walls (and anything built as a wall: a turret's, a stair's sides) | 8 |
| Outlines of things: furniture, a dais's edge, a stair's risers | 2.9 |
| Stones (rubble, a nest's debris) | 2.7 |
| Lines inside things: a crate's brace, a shelf's bays, a tread's nosing | 1.9 |
| The floor grid | a hairline (0.6 to 1.05), three-quarters ink |

## 3. Colours

Ink (`#1b1815`) and paper (`#f7f2e6`), and the one shadow grey (rule 5). Colour only where it
means something: fire and light, blood and the potions' red, water's wash, the nest's brown.
Never a gradient. Light and dark come from the game's lighting over the whole map, not from
the drawing of a thing.

## 4. Fills

A fill is the outline's own shape: the same pen points, laid under the ink (as `shape` does),
so the ink always covers its edge. Nothing filled to a ruled rectangle under a wobbling
outline: no paper or tone showing past the ink, no floor showing inside it. Things standing on
the floor are filled with paper; a raised floor (a dais) is floor, and keeps the floor's grid.

## 5. Height: the one shadow

The light comes from the top left. Anything standing above the floor casts the shadow down and
to the right, as far as it is high:

| What | Shadow |
|---|---|
| Walls, rock, posts | 0.22 of a square (posts 0.2) |
| Furniture, a dais, one step up | 0.11 |
| A low thing (a step's front, a kerb) | about half that |

Chosen: the longer ones, nearer Dyson's: walls, rock and posts 0.3 of a square; furniture, a dais
or a step 0.18. (The table above is the old lengths; the game still uses them.)

**Open: shadows alone don't show height enough** (it shows most on the dais). Your ideas, to be
mocked up and decided in the spec's visual round:
- **Line weight by height difference.** An edge drawn heavier the bigger the drop across it. On a
  dais, the line between the stair's second step and the dais is thinner than the dais's edge
  over the floor.
- **Higher areas toned a little differently**, a bit darker or lighter.
- **Taller things cast longer shadows** (a crate, a table, a wardrobe, each by its height).

- One tone, laid once: all the shadows laid out together, the things themselves cut out, then
  toned at once (`drawShadow`): never darker where two cross.
- A thing cuts its own shadow, and the shadows of anything lower, out of the floor under it; a
  higher thing's shadow falls on a lower one (a dais's upper tier on the lower).
- Floor marks (the grid, water, the nest's heap) cast none.

## 6. Depth

Not by a soft fade over the whole; that much is agreed.

**Open:** a band of the one shadow beside each riser was not agreed. Instead, **solid fill shading
for different heights and depths**: each level of floor (each step, a pit's floor) one flat tone,
with the same question as height: which way the tones go, and how that sits with the shadows.

## 7. Letters on the map

Few, and only where Dyson writes them (a stair's U or D). Ink with a paper halo, in the game's
lettering, as small as reads at the game's zoom.

## Not covered yet (part 8 of the spec)

- Hatching: its rules, written down (it is the map's biggest element and isn't in these rules
  yet).
- Broken lines: where a line breaks, and how often.
- Ragged lines for light: the light's edges.
- Families of things (furniture, raised floor, liquids, debris, lights), each with its rules, so a
  new thing follows its family.
- The interface: the plates, lettering, the log, tips, menus and pages, and the phone.

## Already in the game that break these (to bring into line)

- The walk trail's dots and cross (`drawPreview`, render.js): perfect circles, ruled lines.
- Flooded rooms (`drawWater`): the water's edge in ruled segments, the ripples perfect waves;
  the wash laid by half squares by their light, so its edge steps.
- The rats' nest (`drawNests`): the debris strokes plain curves of one width.
- A brazier's near rim (render.js): a perfect arc.
- Round 8's stairs and dais mockups: soft fades, perfect arcs, ruled lines, no shadow for the
  dais. To be redrawn under these rules.
