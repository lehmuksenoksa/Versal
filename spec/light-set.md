# Feature set 1: light

The first feature set (`groundwork.md`, section 4; yours: "Keep the order, start on light"). Its
rules: `light-and-dread.md`, sections 1 (how light spreads) and 2 (the player's sight). Lights put
out and relit, carried and set down, oil and dread come with feature set 3 (lights as items).

Each step as agreed: the spec's rules as tests on small maps first, then the rules, then the looks;
then you play it.

| Step | What |
|---|---|
| **L1. One model of light, in the rules** | A part of its own (`js/rules/light.js`), owned by the World. Every light a source, on the level: braziers, candles, campfires; the carried ones (the player's lamp, a cultist's lantern) moving with who carries them. Each square dark (0), dim (1) or lit (2): lit within a light's full band, dim within its dim and faint bands (the faint one drawn fainter, played as dim); along lines of sight (walls, shut doors, pillars and big furniture stop it); the brightest wins. Worked out again when a light or a door changes; the carried ones each turn. Monsters noticing the player read the player's square's light from it. |
| **L2. The player's sight by light** | Every lit or dim square in line of sight, however far; the player's dark sight, 3 round; what can be told by the light: lit, everything; dim, the kind; dark within dark sight, that something is there; further, nothing. |
| **L3. Torches on the walls** | Corridors lit only by torches on their walls (a new light: lit within 1½, dim 2½, test); how many, a starting value to try. Its look: options to choose from. |
| **L4. The view draws the rules' light** | The view's light from the same numbers (the lamp's too: in `lights.json`, no longer the view's settings), dim drawn in two tones as now; a check that the view and the rules agree square by square. Then the view's light split out of `expression.js`, behind the view lock. |
| **Then you play it.** | |

**The numbers** are `light-and-dread.md`'s test values, already in `lights.json` but the lamp's
(lit within 5, dim 4 beyond: 1 dim and 3 faint); with the lamp lit, about 9 squares seen round the
player (today's fixed sight is 8).

**What you'll notice:** lit rooms seen from the dark however far; corridors dark but for torches;
in the dark, close by, shapes rather than monsters; a cultist's lantern lighting the player as the
rest do.

## Progress

**L1, one model of light: done.** `js/rules/light.js`, a part of its own (`world.light`;
`light.at(x, y)`: 0 dark, 1 dim, 2 lit). Every light a source: the level's own (worked out again
when one changes or a door opens or shuts), and the carried ones, the player's lamp (now in
`lights.json`: lit within 5, dim 1 and faint 3 beyond) and a cultist's lantern, each turn; along
lines of sight, walls, shut doors and pillars stopping it, and the big furniture the level's
lights' (the carried ones cast past it, as the view draws the lamp); the faint band played as dim;
the brightest wins. Not saved: worked out again from the levels' lights. The rules' old lit squares
gone; monsters notice a player whose square is dim or lit (their lamp, a light's, a lantern's).
Tests first, from the spec, on small maps (`tests/light.test.js`): a brazier's bands; walls and
shut doors stopping light, an opened door letting it through; the brighter winning; the lamp going
with the player, and out, lighting nothing; a lantern going with its cultist; no light without a
source; the same light after saving; a player in a light's band noticed as one with the lamp lit.
What changed in play: a cultist's lantern lights the player by its bands (it was within 3 and in
sight), and the lights' faint bands count as dim (they counted as dark): the run lock re-recorded.
The view unchanged (the view lock passes).

**L2, the player's sight by light: done.** What the player sees (`updateFov`): every lit or dim
square in line of sight, however far (a brazier-lit hall seen whole from a dark corridor); in the
dark, their dark sight, 3 steps round (`tuning.json`, `player.darkSight`). With the lamp lit, as
far as its light reaches: 9 (it was a fixed 8, the view's). `knowAt(x, y)`: what the player can tell
there, by the light: lit, everything; dim, its kind; dark within their dark sight, that something's
there; else nothing. The tips say only that much ("Something"; "Goblin", no state, wounds or
trait, in dim light); the view draws a thing or a monster known only to be there as **"?" (a
stand-in: its look to choose)**. Tests first, from the spec (`tests/light.test.js`): a lit place
seen from 26 squares off in the dark; dark sight 3 and no more; the lamp's reach; walls hiding
light beyond; what can be told at each light; the tips. What changed in play: lit places far off are
in sight (monsters there seen, and stopping explore and running as they come into sight); the run
lock and the view re-recorded. **Speed:** sight across the whole level made a bot's step 2½ times
slower (0.29 to 0.75 ms), most of it testing pillars nowhere near the line of sight; a box test
first brought it to 0.45 ms, play unchanged.

**L3, torches on the walls: done.** A new light, `torch` (`lights.json`: lit within 1½, dim 1 and faint
1½ beyond, a small flame), and a new thing (`features.json`, the light family, drawn by
`js/draw/lights.js`): on the walls of the corridors in built ground, the corridors' only light,
about one for every 18 squares of corridor and none nearer another than 10 (`tuning.json`:
`torchEvery`, `torchApart`; starting values). Placed last in a level's making. Small maps: `T`, a
torch on that wall square. Tests first: a torch's bands along a corridor; on 100 levels, every torch
in a corridor, against a wall, in built ground, apart. **Its look: an iron bracket and a small
flame, a stand-in**: its look to choose, with the "?" (L2). The levels' fingerprints, the run lock,
the outlines, the map drawings and the view re-recorded; the deep run passes.

**L4, the view draws the rules' light, part one: done.**
- **The same numbers:** the view's lamp from `lights.json` (it was its own settings: lit 4½, dim 1,
  faint 2; now as the rules: lit to 5, dim 1, faint 3, reaching 9), counted from the player's
  square's middle as the rules count, and the lamp-out glow as far as the player's dark sight.
- **A check that the two agree** (`tests/browser/light.mjs`, `npm run test:light`): at 24 moments in
  play (the bot's moves in the page, the lamp lit and out, 4 seeds), every square both have in sight
  the same light, dark, dim or lit, in the rules and as drawn (the view's light at its middle; with
  the lamp out, the level's lights and lanterns only: the glow round the player is their dark
  sight, not light). Squares within 0.35 of a band's end left out (the view's edges are ragged on
  purpose). 408 squares agree; widening the view's lamp by one fails it.
- **What it found, and how the two now agree:** a torch's light was cast from beside its wall by the
  view and from its whole square by the rules: both now cast it from the square's middle, its flame
  drawn on the wall. And the rules' casting is generous at walls' corners: a lit square now needs a
  clear line from the light to its middle too, a line grazing a wall's corner by no more than a
  tenth of a square getting past (as the view's walls, drawn along the squares' edges, let it).
- **Found by the deep run:** the bot pacing a 15-square loop round a monster in sight now that lit
  places are seen from afar: it goes for the monster when it's back on one square four times in
  sixty steps.
- The levels' fingerprints, the run lock, the map drawings and the view re-recorded; the deep run
  passes (slower: about 6 minutes, light now checking a line for each square it reaches).

**L4, part two: done.** The view's light split out of `expression.js` (2,387 lines, now 2,035) into
`js/expression-light.js` (372): the lamp cast in ragged bands, the level's lights and lanterns inked
onto the map, how lit a point is drawn. Each method moved as it was; a parser checked for names
left behind (the view's shared constants and helpers, now exported). The view lock matches pixel
for pixel; the light check, the browser check and the mockups as before.

**The light feature set is built: L1 to L4. Next: you play it.** Two looks are stand-ins, to choose:
a torch on the wall (a bracket and a small flame) and a thing known only to be there in the dark
("?").

**The speed check** (`tests/speed.test.js`), as planned with this set: loose limits, several times
this machine's (a bot's step under 3 ms on average, a level's light under 25 ms, making a level
under 500 ms). Light's clear-line check had made a step 0.76 ms; now 0.40 ms, play unchanged (the
lock passes): the carried lights kept until one moves, the squares a line crosses tried before the
fine walk along it, what stops light kept in a grid. The everyday suite back under its minute (59
seconds): the bot 80 runs (40 a half), the duels 1,000 a case, frozen content 12 runs; the deep run
keeps its 500.

**Played: the screen and the rules disagree on a light's faint band.** It plays as dim (a monster's
kind can be told there) but is drawn like the player's dark sight (only "something" there). Being
worked out as a proposal: `sight.md` (the faint band becomes the player's dark vision; Vision, Dark
vision and light-shy for every creature). Decided so far: the map shows the light and the dark vision,
dark vision drawn as the faint band is now; its bands show only in what's drawn on things. The two
stand-in looks are still to discuss (yours: "These are not decided"); options shown so far: the torch
as an iron cup on the wall or others, "?" as a hatched shape or others.

**The lights' looks, being worked out** (pages "Versal's lights" and "Light holders and flames").
Yours, after round 1: the wall torch between "as now" (the least) and an empty ring on a bracket (the
most); the campfire as now or an asterisk (to try: square ends, five arms); the brazier "looks ok
enough"; candles perhaps longer wicks. Flames: in ink, seen from above and embers dropped; the
brazier's flame size and placement good; in the map's inks "promising" (to try: outline weights,
none); for candles and wall torches no flame works yet, "maybe a small flame could work, if it wasn't
just miniaturized larger flame". Also still to discuss: how characters and items show in the dark.
After round 2: the wall torch "something between short and middle bracket, between middle and large
ring"; candle wicks "long seem to work"; the campfire "Five square ends looks ok"; round 1's flame
shape in the map's inks wanted back (round 2 had dropped it); small flames "still needs at least two
tongues, and it needs to be shorter in height, not longer". Round 3 shows these.
Flames, set on the "Flame workbench" (yours): in the map's inks (sienna, ochre, a straw heart), round
1's shape for the big ones, a squat shape with two tongues for the small ones; no outline. Sizes are
the bulb's radius, places from the light's spot (big) or from the holder (small), in squares:

| | Size | Place | Flicker |
|---|---|---|---|
| Brazier | 0.3 | on the bowl (−0.005, 0) | 0.2 |
| Campfire | 0.225 | on the logs (0, 0) | 0.2 |
| Wall torch | 0.17, two tongues | on the ring (0, −0.025 from its middle) | 0.1 |
| Candles | 0.16, two tongues | on each candle (0, −0.08 from its middle) | 0.1 |

Small flames are placed from their holder's middle (the ring's, each candle's) and always stand up
the screen, so they sit the same on every wall and both ways along an altar (shown on the
workbench). The holders, as chosen: the wall torch a ring (0.09) on a bracket (0.085); candles with
long wicks; the campfire five square ends; the brazier as it is.

Yours, after trying them in the test room: "The flames still don't look right. Can you add dark red
outlines, not fully black?" Now outlined in a dark red (#6b2414), 1.4 pen widths round the big flames
and 0.9 round the small (`outline` in lights.json); weights still to tune. Still not decided.

And on light in general: "the light bands are too pixelated and the technique used to produce the
flicker looks weird when there's more then one light close by." Now: the lights' bands are worked
out at the map points (eight a square) as before, for the rules, but the screen draws each band's
edge as a smooth line between them rather than a staircase of them (with the GPU: banded again per
pixel from the light unbanded; without: from a picture three times finer). (I also changed the flicker
then, on my own; yours: "the new flicker is absolutely ugly. You can't make that kind of visual
decisions on your own." So it is back as it was: each fire's light swelling and shrinking a little
about it and dimming toward its edge, the seams where lights meet with it.) Where light is (the
rules) is unchanged.

Yours, for the light set's rebuild: "After we update the lights, I want us to work so that the light
bands look like player's lamp light bands. Those are our target." (The player's lamp is drawn as
shapes at the screen's own resolution: ragged circles and shadows cast from the flame; see
js/expression-light.js. The level's lights are worked out at the map points and smoothed.)

Yours, on those: "The red outline doesn't help :( Maybe we need to try something different. Maybe the
inked outline and paper coloured flame?" (Round 1's "in ink", dropped then, was close: outlined, the
paper inside, two strokes in it, on the older shape.) Now tried in the test room, its picker
switching between the map's inks (as now), ink on paper, ink on paper with an inner line, and ink on
paper with a warm middle (js/fire.js STYLES; the ink outlines 1.9 pen widths big, 1.3 small). The game
draws the map's inks unless the test room's picker says otherwise. Not decided.

Yours, next: "Can we do the flame size and location tool with these kinds of flames? By the way, the
fill should be the same as a lit square." The workbench now has the styles too (ink on a lit square
to start with, the outlines 1.9 big, 1.3 small, on its sliders), its squares and flames' fill the
colour of a square lit by a level's light (#f3d3a9: the paper warmed by the light, as the GPU draws
it; drawn without the GPU, lit squares come out a little darker). The test room's ink flames use the
same fill. Not decided.

Yours, next: "Can you add flame shape options to the large flames: two tongues, and the original
flame shape?" On the workbench the brazier and campfire now choose between three tongues (round 1's
shape, as now), two (the small flames' squat shape at the big flame's size) and the original (the
game's first campfire flame, before round 1: three tongues of uneven heights, a second layer with
two, a single tongue for its heart). Not decided.

Your workbench settings, to try in the test room (its picker's first choice, "Your workbench
settings"; the game itself still draws the flames as lights.json has them): the inner line style;
the brazier two tongues, 0.24, at (−0.005, −0.055); the campfire two tongues, 0.205, at (0, −0.035);
both outlined 1.9; the wall torch 0.12 at (0, −0.085) and candles 0.115 at (0, −0.08), outlined 1.3;
flicker as before. Not decided.
