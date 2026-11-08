# Sight: a proposal

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
| **Light-shy** | A tag: nearly blind in light; its dark vision doesn't reach past lights; it goes for lights it sees and fights worse in them |

- **Dark vision has bands** (yours: "the player should make out if the monster right next to them
  is a goblin or a rat"). Clear is 0 for most creatures, the player too; dark-dwellers see clearly in
  the dark.
- **Dark vision reaches past light** (yours: "for player and most monsters dark vision should extend
  their vision beyond light"): in the dark, the distance is from the creature or from a square in
  light it can see, whichever is nearer; past a light it tells no more than it can tell in that
  light (so not beyond its own Vision). Not for the light-shy.
- **A square in light:** read Vision at that distance; dim light makes it worse (question 1). **A
  dark square:** read Dark vision. Where both apply, the better counts.
- **What it means.** For the player: clear, everything; kind, what it is; faint, that something is
  there ("?"). For a monster looking at the player: clear or kind, it sees them; faint, a glimpse.
- **Dark-dwellers** (yours: "should definitely notice a light and treat its source aggressively, but
  be hindered by it"): a light is seen from anywhere in line of sight; what a creature does about it
  is behaviour. A light-shy one goes for it. Dark elves ("see well in the dark and function ok in
  the light") have a long dark vision and no tag; cave spiders ("almost blind in light") have the
  tag.

Placeholder numbers, to show the shape:

| | Vision (clear / kind / faint) | Dark vision (clear / kind / faint) | Light-shy |
|---|---|---|---|
| The player | all in sight / – / – | 0 / 1 / 3 | – |
| Goblin | 6 / 7 / 8 | 0 / 0 / 1 | – |
| Cave spider | 2 / 3 / 5 | 3 / 4 / 6 | yes |

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

## Open

1. **What dim light does to sight** (for the player, every option is the same: the kind):
   - A, one band worse: a monster sees you in dim nearly as far as in full light;
   - B, one band worse and a monster must see you clearly: in dim you're only ever glimpsed;
   - C, no detail and half as far: dim is half cover (close to `stealth.md` now). Leaning C.
2. **How blind the light-shy are in light:** at most faint, or just a short Vision. Leaning at most
   faint.
3. **What dazzles a light-shy creature:** the light on its target (leaning), or on its own square.
4. **The numbers:** the player's dark vision, the lights' new bands, each monster's.
5. Elsewhere: going for lights (feature set 2, the monster behaviour table); fighting worse in
   light (feature set 4).

The questions with diagrams: the "Sight in the dark" page (an artifact, from this chat).
