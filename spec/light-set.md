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
