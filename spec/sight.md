# Sight: a proposal

The plan to build it, with proposed numbers: `light-rebuild.md`.

Being worked out in chat during the light feature set (`light-set.md`); **not decided as a whole**.
What is decided is marked so. When it is, it changes `light-and-dread.md` (sections 1 and 2) and
`stealth.md` (section 4), and the light set is changed to match.

## Why

Playing the light set showed the screen and the rules disagreeing. A light's faint band played as
dim (you could tell a monster's kind there) but was drawn in the same grey as your dark sight (where
you could only tell something was there). Yours: "Same visual cue should have same gameplay effect."

And: "I'm wondering if light's 'faint' band should be just same thing as 'dark vision' without a
light. It's not light, it's a band of vision. And its width is property of player."

## The proposal

**Light** has two bands, lit and dim. The lights' faint bands go.

**Each creature** has (yours: "streamline this into Vision, Dark vision (both with distances) and a
tag: light-shy"):

| | What |
|---|---|
| **Vision** | How far it can tell what's in light: three distances, clear, kind, faint |
| **Dark vision** | The same three distances, for what's in the dark |
| **Light-shy** | A tag: no Vision; it sees by dark vision only, from itself; a light's own square blocks its sight as rock does; light on what it looks at makes it a band worse (dim) or two (full light); it goes for lights it sees and fights worse in them |

- **Dark vision has bands** (yours: "the player should make out if the monster right next to them
  is a goblin or a rat"). Clear is 0 for most creatures, the player too; dark-dwellers see clearly in
  the dark.
- **Dark vision reaches past light** (yours: "for player and most monsters dark vision should extend
  their vision beyond light"): the distance is from the creature or from a square in light it can
  see, whichever is nearer; past a light it tells no more than its Vision would at that distance,
  nor than it can in that light. On dark squares and dim ones alike. Not for the light-shy.
- **Ordinary eyes** take the better of Vision (by the light on the square; dim light makes it worse,
  question 1) and dark vision, on every square: **light never makes them see worse.** (Found trying
  it out: otherwise a dark elf saw some squares worse once the player lit the lamp.)
- **Light-shy eyes** see by dark vision alone: **light never makes them see better.** (Found trying
  it out: with a Vision of their own, a spider saw nothing on nearer dim squares and something on
  further lit ones.)
- **A light blocks light-shy sight** (yours: "light-shy creatures cannot see beyond a light source.
  It blocks their vision like a square of rock"; "This could be used as a sneaking tool, especially
  later when player can set lights"): a brazier's, a torch's, a lantern's square, and the player's
  with the lamp lit, stop a light-shy creature's sight as rock does. (Tried, the other way: glare,
  the brightest light anywhere on the line dazzling it, so a light's whole lit area screens what's
  beyond, more weakly.)
- **What it means.** For the player: clear, everything; kind, what it is; faint, that something is
  there ("?"). For a monster looking at the player: clear or kind, it sees them; faint, a glimpse.
- **Dark-dwellers** (yours: "should definitely notice a light and treat its source aggressively, but
  be hindered by it"): a light is seen from anywhere in line of sight; what a creature does about it
  is behaviour. A light-shy one goes for it. Dark elves ("see well in the dark and function ok in
  the light") have a long dark vision and no tag; cave spiders ("almost blind in light") have the
  tag.

- **Distances are round** (yours: "if the player's vision is a circle (and not a square), same
  should be true for monsters"): as the crow flies between squares' middles, as lights already are;
  a square is within a distance if its middle is. Every band is then a rough circle, drawn as one.
  (Today the player's dark sight is a square of 3 in the rules, `max(|dx|, |dy|)`, but drawn as a
  circle of 3½: the corners are seen but drawn dark.) Bands can be halves: next to you includes the
  diagonal squares only from 1½.

Placeholder numbers, to show the shape:

| | Vision (clear / kind / faint) | Dark vision (clear / kind / faint) | Light-shy |
|---|---|---|---|
| The player | all in sight / – / – | 0 / 1 / 3 | – |
| Goblin | 6 / 7 / 8 | 0 / 0 / 1 | – |
| Cave spider | – | 3 / 4 / 6 | yes |
| Dark elf | 6 / 7 / 8 | 4 / 5 / 6 | – |

The lamp (lit 5, dim 1) with the player's dark vision past it: kinds told to 7, "?" to 9 (today all
kinds to 9). Lamp out: the kind next to you, "?" to 3.

## Decided: the screen

Yours: "Map shows the light, and the dark vision as well. Dark vision on the map should be shown
like the faint band now: dark with floor grid and decorations. The difference between bands of dark
vision is shown what player can see about things."

- Lit and dim drawn as now; the player's dark vision (round them and past lights) drawn as the
  faint band is now: dark, with the floor's grid and things on it.
- Which band of dark vision a square is in shows only in what's drawn there: a monster's letter
  where its kind can be told, "?" where only that something is there.
- So the square under the player always shows how lit they are: no separate show of it.

## Decided: dim light; light-shy and lights

Yours: "C seems to behave best for dim light." In dim light no one sees clearly (clear becomes
kind) and every distance of Vision is halved: dim is half cover. Close, a goblin sees you; further
off it glimpses you or misses you. For the player, dim light tells the kind, however far.

Light-shy and lights, yours: "A light blocks as a rock, for light-shy." A light's own square stops
a light-shy creature's sight as rock does (glare, tried, not taken).

The diagonal step: "We can stay the decision about movement" (with stealth, feature set 2).

## Decided: the round look and the rules agree

The round, hand-drawn look stays (yours: "the round visual is important to me. We need to reconcile
the rules with it"). Explored on two pages, "Round light bands" and "Shadows and corners": how a
square counts, drawn sizes against the rules', the edges, how far a line may graze a corner.

- **One radius per band,** used by the rules and the drawing alike; a square counts by its middle
  (where the player, monsters and things are drawn). Counting by how much of a square is covered
  only moves the radius the drawing must sit at; a drawn size that grows with the radius fits no
  counting at every size.
- **Circles: half-step radii, and the ragged edge bent round the middles** (yours: "half radii steps
  and bending is okay for circumference"): the edges fall between rows of squares, and the wobble,
  where it would cross a middle the wrong way, is nudged past it; the bends are no bigger than the
  wobble, so the circles look as before. Every middle in the right shade.
- **Corners and pillars: a stricter line, smooth shadow edges** (yours: "For corners, stricter looks
  a lot better. But ragged and bent looks worse than smooth"): a line of sight or light must clear
  a wall's corner or a pillar by a tenth of a square (today it may graze them by a tenth); shadow
  edges drawn straight, without a wobble, by the same lines. Every square then looks the way it
  counts in the scenes tried; the shadows come out a little fatter (no pillar's shadow thinner than a
  square); sight and light no longer squeeze through a diagonal gap between two walls.
- **The player's sight by the same lines as light** (today it's a square-by-square field of view, so
  the two can differ at corners).

**How much light hurts the light-shy** (yours: "Dim 1 band, full 2"): a band worse on a dim square,
two on a lit one. A spider next to you in your lamp's light only glimpses you; in dim light it knows
you within 3.

**Numbers in whole steps** (yours: "Can we record the steps in full numbers: 1, 2, 3, but treat
them with half steps where needed? That'd be more human readable"): every band is written as a
whole number of steps, and reaches the squares whose middle lies within that number and a half (a
band of 3: within 3½). So the data reads 1, 2, 3 and the edges fall between rows of squares. 0 is no
band. Halving (dim light) halves the number first.

## Sneak attacks

**Decided** (yours: "Glimpse should allow stealth attack"): a blow on a monster that hasn't seen you,
only glimpsed you (or heard you), is a sneak attack. So the sight bands decide it:

| | When you can sneak attack it |
|---|---|
| Goblin (ordinary eyes, weak dark vision) | In the dark, lamp out, even next to it; not in dim within 3, not lit |
| Cave spider (light-shy) | When you're lit: dazzled, next to you it only glimpses you; not in the dark within 3 |
| Dark elf (strong dark vision) | Hardly ever: asleep, or with help (a potion, a perk) |
| Anything asleep | Always, unless your noise wakes it |

**To plan in a session of its own, with stealth** (yours: "This needs a longer planning session of its own. Maybe later?"). **Proposed: noticing takes time** (yours: "can we tie this somehow into movement and/or timing. I
envision someone pursuing player, player hiding behind a corner, and then stealth attacking a pursuer
when they appear from around the corner. Or stealth attacking a lured monster when they move close
by. Maybe noticing the player takes a while? Super fast player could step into the light and stealth
kill the first enemy from a group before it notices"). With actions taking ticks (`fighting.md`):

- A monster whose sight would tell your kind or more doesn't know you at once: it **notices** you
  after keeping you in sight for its **noticing time**. Until then it has only glimpsed you
  (suspicious, a guess), so a blow lands as a sneak attack.
- **Noticing time** (test), by mood: calm 100 ticks, wary or suspicious 60, alert or searching 30;
  quick-eyed kinds (dark elves) half. Never instant, so even a pursuer can be caught.
- **Sneak attacks on alert monsters** too, while they don't see you: a pursuer that has lost you
  round a corner.
- **Lying in wait** (a new action): you hold a blow ready, still and quiet; the moment a monster
  steps next to you, you strike at once. A corner, a door, a lured monster's path become ambushes,
  sure rather than left to when your turn falls.
- **Speed tells:** stepping out of the dark and striking a calm goblin by a fire takes your step
  plus the blow's start; walking in (100 ticks) only ties with its noticing (100), running in (60)
  beats it, a hasted player more so. The rest of the group notice in their own time.
- **The player sees it:** a monster noticing shows as such (its "?" mark), so you know you have a
  moment.

## Open

1. **Steps and distance** (yours: "is the distance to a diagonal square the same as distance to an
   orthogonal square? This matters at least for movement and range"). Sight, light, hearing and
   ranges measured round; a diagonal step:
   - one step, as now: walking diagonally covers about 1.4 of distance a turn, so fleeing or
     closing in diagonally is quicker than straight;
   - or a turn and a half (yours: "diagonal movement taking more ticks"): a square 5 off is about 5
     turns away whichever way it lies, matching the circles; paths weigh diagonals, the bot and
     travel with them.
   Melee reaches the 8 squares round either way. Ranges (throwing, shooting, hearing) use the round
   distance, as sight.
2. **The numbers:** the player's dark vision, the lights' new bands, each monster's.
3. Elsewhere: going for lights (feature set 2, the monster behaviour table); fighting worse in
   light (feature set 4).

The questions with diagrams: the "Sight in the dark" page (an artifact, from this chat).

## To discuss: how characters and items show in the dark

Yours: "Let's discuss how characters and items show in the dark." Nothing here is decided.

What the player can tell of a thing, as decided above: in light, everything; in dim light, its kind;
in the dark within their dark vision, its kind next to them and "?" (that something is there)
further off; past that, nothing. Drawn today (the "dark" test room, `?scene=dark`):

- A letter takes the light: in its colour with a paper outline when lit, toward ink in dim light.
  In the player's dark sight (drawn at the faint band's light) it keeps a faint pale outline, so it
  looks lit, like a sticker; outside it, plain ink. Things remembered: items faint; monsters not drawn.
- Something known only to be there: a "?" in ink, with that faint pale outline in the dark sight.
- The rules' dark sight is still a square of 3 (so "?"s show just past the drawn circle): the sight
  rebuild makes it round, and tells the kind next to the player.

The questions, with options to try in the test room (its "Try" panel, `VERSAL_DARK`, js/render.js):

1. **A letter whose kind can be told, in the dark:** A as now (a faint pale outline); B plain ink, no
   outline; C pale, as chalk; D hollow (a pale outline only); E its own colour, dimmed.
2. **Something known only to be there:** A "?" as now; A2 "?" with no outline; B only its shadow (the
   three pen strokes creatures stand on; a thing gets them too); C an ink smudge; D two pale eyes for a
   creature, a glint for a thing (that tells creatures from things, which the rules don't today).
3. Should a creature and a thing look different when only "something" is known?
4. The player's own letter in the dark (red, the faint pale outline, now).
5. Remembered things: items drawn faint where last seen; monsters not drawn once out of sight.

Yours, trying them: next to you, its kind (as decided); a letter in the dark, A as now; something
there, A2, "?" with no outline (your test room settings). And: "now that I tried it, I think seen
monsters should be remembered. It's strange they turn into question marks." Done, in the rules (what
the player knows; nothing a monster does): a monster whose kind the player has told stays told while
it stays in sight, though it goes off into the dark (`told`, `knowOf`; the tips say "what it was when
you saw it"). Lost from sight, it's forgotten, and is "?" again when next seen in the dark. Still
open: whether a monster out of sight should be drawn where it was last seen, as items are.

Yours: "Also seen items." Done: a thing on the floor, once told, stays told while it lies there,
in the dark too (`told`, `knowOfItem`); one dropped by the player is told. And the map remembers
only things actually seen (`seen`), as what they were seen as: one only ever seen as "?" stays "?"
(before, a thing on any square once seen was drawn by its letter, even one dropped there later).

Yours: "It doesn't seem to be working. Seen monsters turn into ?s." Found: the test room's "next to
you, its kind" only drew the kind; the rules still had what's next to the player as only something,
so a monster seen there was never told, and turned "?" as it stepped off. Now built in the rules, as
decided: in the dark the player tells the kind of what's next to them, the diagonals too
(`player.darkKind` 1, reaching 1½; the "Next to you" choice gone from the test room). Still so: a
monster lost from sight is forgotten, "?" when next seen in the dark.

Yours: "Yes, remember them for a few turns, so if they reappear soon, they're still seen the same way.
Don't remember them in the last seen position." Done: a monster told stays told for
`player.remember` turns (5, to tune) after it's lost from sight, so it's known again if it's back
by then; it isn't drawn while out of sight.

Yours: "Yes, put A2 into the game." Done: something known only to be there is a "?" in plain ink,
with no outline (js/render.js, `somethingLook`); the test room keeps the old "?" and the other marks
to compare. Still open: a letter in the dark (A as now, your pick when trying), your own letter in
the dark, whether a creature and a thing should look different as "?".

**Decided** (yours): a letter whose kind can be told in the dark: "As now" (a faint pale outline in
the dark sight; plain ink outside it). Your own letter in the dark: "As now" (red, the faint pale
outline). Creatures and things: "Let's use smaller question mark for items. It seems like it's like
that now already": so it is, in the game too: a thing's "?" in the things' lettering (0.66 of a
square), a creature's in the monsters' (1.05), small animals' too, so a "?" doesn't tell a rat
from a goblin.
