# The light set rebuilt: the plan

**Approved** (yours: "Let's go with the numbers as you proposed and tweak them in play testing
later"): the numbers below as proposed, to tune in play. The questions not answered, as I picked:
the steps in this order; trolls not light-shy yet; monsters' sight into today's awareness until the
stealth session. And dark vision past a light reaching dim squares as well as dark ones stays (yours:
"It's ok"): so for a goblin, a ring of glimpses about 2½ round every light, dim light keeping you
from being seen but not from being glimpsed. Asked about the numbers' reasons (yours: "What is your
story and gameplay reasons for these numbers?"): given in chat; the weak ones (the bat's, the
cultist's and the troll's dark vision; the monsters' clear distances, which do nothing until the
stealth session gives clear sight a part) to look at in play.

Asked also (yours: "is dark vision added up beyond normal vision? Will a goblin see better in partly
lit room than in a fully lit huge room?"): no. A square is seen by the better of Vision (by its light)
and dark vision (from the creature or the nearest lit or dim square it sees), never the two added;
and past a light, no better than Vision would see it lit. More light never makes ordinary eyes see
worse, and partial light never better than full.

Originally a draft (yours: "draft the plan with proposed numbers"). It builds on what's decided in `sight.md` (the
proposal, its "Decided" sections) and in `light-set.md` (the looks), and puts it into the game as
the light feature set did: each step's rules as tests on small maps first, then the rules, then the
looks; then you play it.

Left out, for the stealth planning session (yours: "This needs a longer planning session of its
own"): noticing taking time, lying in wait, sneak attacks on alert monsters, the diagonal step
(`sight.md`, "Open", 1). Monsters going for lights is behaviour (feature set 2), fighting worse in
light feature set 4.

## What changes, in short

- **Light has two bands, lit and dim.** The lights' faint bands go; past them, what you see is your
  dark vision, not light.
- **You and every monster see by the same model:** Vision (in light) and Dark vision (in the dark),
  each three distances, clear, kind and faint; some creatures light-shy.
- **Distances are round** and written in whole steps (a band of 3 reaches squares whose middle is
  within 3½), the same for the rules and the drawing, so every square looks as it counts.
- **The screen draws every light's bands the way it draws your lamp's** (yours: "the light bands
  look like player's lamp light bands. Those are our target"), and your dark vision as the faint
  band is drawn now.
- **Monsters notice you by their own eyes,** not by two fixed ranges for every kind.

## The steps

| Step | What | Tests first (small maps) |
|---|---|---|
| **S1. Round distances, one line of sight** | One distance for everything: round, between squares' middles; a band written `n` reaches middles within `n + ½`. One line-of-sight test for light and sight alike: a line must clear a wall's corner or a pillar by a tenth of a square (today light may graze by a tenth, and your sight is a square-by-square field of view). The player's sight uses it, so sight and light agree at corners. | A band of 3 takes the diagonal (2, 2) (2.8) and not (3, 2) (3.6); a line past a corner too close is stopped; no sight or light through a diagonal gap between two walls; your sight and a light's agree square by square round a pillar. |
| **S2. Light in two bands** | Each light: `lit` and `dim`, whole steps, from its spot (the table below). The faint band gone from the rules (`light.js`: lit 2, dim 1, dark 0 as now). `lights.json` rewritten. | A brazier's lit and dim squares, by the numbers; nothing past its dim band; the lamp's. |
| **S3. Your sight** | Vision: everything lit or dim in line of sight, however far (as now); in dim light, the kind. Dark vision: clear 0, kind 1, faint 3, from you, **and from every lit or dim square you can see** (yours: "dark vision should extend their vision beyond light"), no further past a light than your Vision there. What you can tell (`knowAt`) from those. Already built: the kind next to you, remembering what you've told, the "?" look. | Lamp out: kind next to you, "?" to 3, nothing at 4. Lamp lit (lit 5, dim 6): kinds to 7, "?" to 9. A "?" within 3 of a lit hall seen from far off, nothing beyond. |
| **S4. Monsters' sight** | Each kind's Vision and Dark vision and light-shy tag, in `monsters.json` (the table below). What a monster can tell of you, by the light on your square: **clear or kind, it sees you; faint, a glimpse; else nothing.** Dim light: no one sees clearly (clear becomes kind) and Vision's distances are halved (rule C). Light-shy: dark vision only, from itself; one band worse on a dim square, two on a lit one; a light's own square (a brazier's, a torch's, a lantern's, yours with the lamp lit) stops its sight as rock does. **Into the awareness as it is** (the stealth session changes that): seeing you adds what a sighting adds now (`aware.sight`, more the nearer), a glimpse what the dark adds now (`aware.sightDark`), next to it the extra as now; `aware.seeLit` and `seeDark` go. A blow on a monster that only glimpses you, or hasn't noticed you, is a sneak attack (decided). The `watchful` trait: each Dark vision band one more (it was "sees further in the dark"). | A goblin sees you lit at 7, glimpses you at 8, not at 9; lamp out next to it, only glimpses you, and your blow is a sneak attack; in dim light (its Vision halved: kind 3½) it sees you within 4, and (its dark vision past the light, as approved) glimpses you to its lit faint, 8½. A spider next to you in your lamp's light only glimpses you; dark, it sees you within 4½; a brazier between you hides you. |
| **S5. The screen** | Every light's bands drawn as your lamp's are: at the screen's own resolution, ragged circles at half steps, the wobble bent round the squares' middles so each middle is in the right band; shadows straight, along the same lines as the rules'. Your dark vision drawn as the faint band is now (dark, the floor's grid and things on it), round you and past the lights you see. The flicker as now. The view-and-rules check then covers every square's middle (today it leaves band edges out). | The view-and-rules check: every middle, every light, lamp lit and out. |
| **Then you play it.** | Then the stealth session. | |

Each step is committed on its own, the run lock and the view re-recorded where play or the look
changes on purpose, with what changed and why.

## The numbers, proposed

All in whole steps; a band of `n` reaches `n + ½`. The lights' are today's, rounded to whole steps
with their faint bands dropped (your dark vision now covers about what they did, as "?").

**Lights** (`lights.json`):

| | Lit | Dim | Today: lit / dim / faint (reaches) | Why |
|---|---|---|---|---|
| Campfire | 3 | 5 | 3½ / 5½ / 7½ | The same lit and dim. |
| Brazier | 2 | 4 | 2½ / 4 / 5½ | Dim a half step further, for the faint band it loses. |
| Candles | 1 | 2 | 1¼ / 2½ / 4 | |
| Wall torch | 1 | 2 | 1½ / 2½ / 4 | |
| Cultist's lantern | 2 | 3 | 2 / 3 / 4½ | |
| Your lamp | 5 | 6 | 5 / 6 / 9 (from your square) | As `sight.md` has it: kinds told to 7, "?" to 9. |

**You** (`tuning.json`, `player`): Vision: everything in sight; Dark vision clear 0, kind 1,
faint 3 (`darkKind` 1, `darkSight` 3, as now); remembered 5 turns after lost from sight (as now).

**Monsters** (`monsters.json`; Vision and Dark vision each clear / kind / faint):

| | Vision | Dark vision | Light-shy | Today | Why |
|---|---|---|---|---|---|
| Goblin, warrior, king | 6 / 7 / 8 | 0 / 0 / 2 | | lit: within 8; dark: within 2½ | Today's ranges; next to you in the dark only a glimpse, so a sneak attack (decided). |
| Cultist | 6 / 7 / 8 | 0 / 0 / 1 | | as goblins | Folk who carry their light. |
| Skeleton | 5 / 6 / 7 | 0 / 1 / 2 | | as goblins | The undead sense the living close by: next to them they know you. |
| Zombie | 3 / 4 / 5 | 0 / 1 / 1 | | as goblins | Dull eyes; slow to spot you, near-blind in the dark. |
| Rat | 3 / 4 / 6 | 1 / 2 / 3 | | as goblins | Poor eyes, lives in the dark. |
| Bat | 2 / 3 / 4 | 3 / 4 / 6 | | as goblins | Finds its way in the dark. |
| Spider | – | 3 / 4 / 6 | yes | as goblins | `sight.md`'s cave spider. |
| Giant spider | – | 4 / 5 / 7 | yes | as goblins | |
| Troll | 4 / 5 / 6 | 2 / 3 / 4 | | as goblins | A cave dweller that sees in the dark; light-shy is an option (see below). |

What a monster tells of you also depends on its state, as now (asleep sees nothing; a calm one
less, a suspicious one more: `senses`).

## What you'll notice

- Lights a little different: no faint band round them; instead a "?" where something stands within
  3 of a lit or dim square you can see, about as far as the faint band reached.
- Every band and shadow drawn as smoothly as your lamp's, and every square's middle in the shade it
  counts as.
- Monsters differ: rats and bats find you in the dark, zombies hardly see you at all, spiders don't
  see past a brazier, and stepping into a spider's light from the dark dazzles it.
- With the lamp out, a goblin next to you only glimpses you: your blow is a sneak attack.

## Questions for you

1. **The steps:** as above, or another order? (S5 can come right after S2, if you'd rather see the
   bands first.)
2. **The numbers:** as proposed, or changed? Any kind whose sight feels wrong to you?
3. **Trolls light-shy?** Cave trolls fearing light fits folklore and would make a torch a weapon
   against them; it also makes them go for lights once monsters do (feature set 2). My pick: not
   yet, until they have that behaviour.
4. **Monsters' noticing into today's awareness** (S4) until the stealth session: as proposed?

## Progress

**S1, round distances and one line of sight: done.** One line test for the rules' light, the
player's sight and what monsters see of the player (`lineClear`, `js/rules/sightline.js`): a line
to a square's middle must keep a tenth of a square clear of every wall square on its way (the one
it ends in aside) and of every pillar; the big furniture stops a fixed light's line only where it
crosses it, as before. So light and sight no longer graze into corners or squeeze through a
diagonal gap between two walls, and they agree at corners and round pillars. The dark sight is
round: 3 reaches the squares whose middle is within 3½ (it was a square of 3). Small maps can have
pillars (`pillars`). Tests first (`tests/sight.test.js`): the round dark sight; a line touching a
wall's corner stopped, one clearing it by 0.2 not; no light or sight through a diagonal gap; the
player's sight and the lamp's light the same square by square round pillars. The old test of the
square dark sight changed to the round one.

What changed in play: a little less seen and lit at corners, so the bot's runs went differently:
the run lock and the view re-recorded. **Speed:** a step as quick as before (0.76 ms; the player's
lines are kept while they stand still, and what monsters see of them is the same lines); the unit
tests take about a quarter longer, the recorded runs now longer. **The view** still draws light by
its own lines, so at a corner it can now light a square the rules keep dark: the view-and-rules
check finds one such square (of hundreds compared), to go with S5, which draws by the rules' lines.
The browser check's guard step made sure no run is still going on before it looks at what's saved
(a run going on saved again, now and then failing the check).

**S2, light in two bands: done.** `lights.json`: each light's `lit` and `dim` in whole steps, as
approved (campfire 3 and 5, brazier 2 and 4, candles and torch 1 and 2, lantern 2 and 3, lamp 5
and 6), each reaching half a step more (`lightReach`); no faint band in the rules. The level
generator's campfire lanes measure the same (5½), so the levels are unchanged (the map drawings
match). The view draws each light's lit and dim bands from the same numbers, and past them, until
S5, a faint ring as wide as the player's dark sight (what they'll see past a light, S3); the
view-and-rules check counts that ring as dark. Tests first: a brazier's and the lamp's bands, no
faint band; every light's bands in whole steps, the dim no nearer than the lit. The tests of the
old bands changed to the new numbers; three tests of resting, exploring and running with a goblin
in sight had it 7 off, in the lamp's old faint band: now 6 off, in its dim. What changed in play:
the faint bands no longer count as dim (a player in one is no longer lit for the monsters): the run
lock and the view re-recorded.

**S3, the player's sight: done.** Seen: every lit or dim square in line of sight, however far (as
before); and a dark one by the player's dark vision, measured from the player or from the nearest
lit or dim square they see: within 3½ that something's there, within 1½ its kind (`los.tell`, kept
with the lines, not saved). What they can tell (`knowAt`) from that: lit everything, dim the kind,
dark by the dark vision. So with the lamp lit (lit 5, dim 6) kinds are told to 7 and something seen
to 9; a "?" shows within 3 of a light seen far off. Tests first: the lamp out (the kind next to
them, something within 3, nothing at 4); the lamp lit (kinds to 7, something to 9, nothing at 10);
past a brazier far down a corridor, on both sides. The test of how far the lamp lit lets the player
see changed (as far as its light, and 3 past it). What changed in play: more seen and remembered
round lights far off: the run lock and the view re-recorded. A step 0.9 ms.

**S4, monsters' sight: done.** Each kind's Vision, Dark vision and light-shy tag in
`monsters.json`, as approved; `watchful` adds 1 to each of its dark vision's distances (it was "sees
twice as far in the dark"). What a monster can tell of the player (`sightOf`, `tellOf`,
`js/rules/senses.js`), along the same lines as the player's sight: its Vision by the light on the
player's square (dim: none clear, each halved); its dark vision from itself, or from a lit or dim
square near the player it sees, past a light no better than its Vision would see them lit; the
better of the two. Light-shy: dark vision only, from itself, a band worse on a dim square, two on a
lit one, and a light's own square in the way (a level's light, a lantern carrier) stops it. A band
of 0 is none. Into the awareness as it is: seeing the player adds what a sighting added, a glimpse
what a sighting in the dark added, more the nearer (over how far that sight reaches), next to it
more again; `aware.seeLit` and `seeDark` gone. Sneak attacks: also on a suspicious monster that only
glimpses the player (an alarmed one waits for the stealth session). Tests first: a goblin seeing the
lamp-lit player at 7, glimpsing at 8, not at 9; the lamp out, a suspicious goblin next to them
glimpsing and struck unawares, the lamp lit, seeing and struck plainly; the player in dim light,
seen within 4 and glimpsed to 8½ (the plan's example said 4½: corrected); a spider next to the
lamp-lit player glimpsing; in the dark seeing within 4½, glimpsing to 6½; a brazier between hiding
the player from it. What changed in play: monsters notice by their own eyes: the run lock and the
view re-recorded. A step 0.85 ms.

**S5, the screen: a first version, to show you.** The level's lights worked out twice as finely
each way (16 samples to a square, `LAMP_SAMPLES`), the ragged noise too, and banded at the screen's
own resolution, as the lamp's are; the ragged edge bent round the squares' middles (where a middle
would fall on the wrong side of the lit or dim edge for its distance, the edge nudged a little past
it, the nudge fading out half a square off), so every middle is drawn in its band. Shadows: their
edges straight, as the light's lines from its flame; at each corner of the walls on the grid a
small diamond a tenth of a square round it, so sight and light pass corners no nearer than the
rules' lines do. The view-and-rules check now covers every square's middle, band edges too (it
left them out): it agrees. The player's dark vision past the lights is drawn as the faint ring
round each light (as in S2), the lamp's look unchanged, the flicker as it was. Working out a
level's lights at the finer samples takes about twice as long (about 0.1 s for a level's dozen
lights, on entering it). The view re-recorded.

Yours, on the flicker: "The flicker of light sources should look like the players lamps flicker. No
change in luminosity. Similar tempo. Contracting and expanding. Now the flicker looks like the light
is under water. Not right." (The GPU stretched the whole light round the nearest fire, other lights'
and shadows too, and each fire's brightness pulsed.) Now: each fire's own light, kept apart, swells
and shrinks about its flame on the lamp's waves (`fireSwell`, `js/expression.js`), its edge moving
out and in by up to a fifth of a square as the lamp's does, each fire its own way; no change in
brightness; where lights meet, the brightest shows, so no seams. On the GPU the fires' own light
side by side in one picture (`fireAtlas`), up to 16 fires in sight (more: all shown steady); without
the GPU each fire's picture swells as before, the brightness flicker gone.

Yours: "The dark sight around the player seems to differ from the one beyond the lights." It did:
the ring past each light was drawn as part of the light (warmed, a browner grey) and cut where the
player sees far off by a picture at the map points (stair-stepped), while the player's own dark sight
is drawn as their lamp's faint band (a cooler grey). Now the ring past the lights is drawn as the
player's own dark sight is, the two one where they meet (on the GPU); and what lets the player see
far off is made from the finer samples, its edge smooth. Without the GPU, the ring is still drawn as
before.

Yours: "The players dark sight seems to be overlayed on dim bands of light? And the same for the
player's lamp's dim band, which should merge with the other dim bands instead." It was: the player's
light (lamp or dark sight) was laid down first and the level's lights over it, so where they met the
two added up. Now (on the GPU) they merge as the level's lights do among themselves: the brighter
shows, warmed by the level's lights as far as theirs is the light shown. The lamp's light keeps its
own paler tint, so where it reaches is still to be seen.
