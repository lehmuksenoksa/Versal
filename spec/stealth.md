# Stealth: the formal rules

The rules for noticing, as discussed in chat after round 39, written as a specification: terms,
data, the checks, the moods and their moves, sides and shouts, and the order of a turn. Every
number marked **(test)** is a starting value to tune in play; the shape of the rules is decided.
`04-systems.md` keeps the discussion in words; where the two differ, this file holds.

## 1. Terms

- **Step:** one square, in any of eight directions. **Distance** `d` between two squares is the
  number of steps between them (Chebyshev: `max(|dx|, |dy|)`).
- **Line of sight:** no wall, closed door or column between two squares (as the game computes it
  today).
- **Light level** of a square: **dark** (0), **dim** (1) or **lit** (2).
- **Sound distance** `ds` from a sound to a monster: the cheapest path between them where an open
  square costs 1, a closed door `C_door`, and a wall square `C_wall` (section 5).
- **Sighting:** a monster sees the player, either **clearly** or as a **glimpse**.
- **Run's dice:** the run's random generator. Only the player's items and perks ever roll it
  (section 6); monsters never do.

## 2. The player

| Field | Values | Set by |
|---|---|---|
| `lamp` | on, off | the player |
| `pace` | sneak, walk, run | the player |
| `shade` | 0, 1, 2 | items and perks: how many light levels darker the player counts as |
| `hush` | a factor, 1 by default | items and perks: how loud the player is |
| `luck` | a list of chance effects | items and perks (section 6) |

- **The lamp lights** the player's square and the squares around it (its radius, as today).
- **The player's light level** `Lp = max(0, light(player's square) − shade)`.
- **Pace** sets speed (sneaking slower, running faster; numbers with movement) and loudness
  (section 5).

## 3. A monster

**From its type** (data, per family or kind):

| Field | Meaning |
|---|---|
| `V` | Vision: steps it sees the player in full light |
| `DV` | Dark-vision: steps it sees in dim and dark; 0 if it has none |
| `H` | Hearing: steps at which it hears the player walk |
| `side` | goblins, the cult, a beast's own, or none (vermin) |
| tags | e.g. `ignores noises`, `relentless` |

**From its state** (asleep, at a campfire, at work, patrolling, lying in wait, …), multipliers:

| State | on `V` | on `H` | dark-vision |
|---|---|---|---|
| Asleep | ×0 | ×½ | off |
| At a campfire | ×1 | ×1 | off |
| At work | ×1 | ×½ | as normal |
| Lying in wait | ×1¼ (test) | ×1¼ (test) | as normal |
| Others | ×1 | ×1 | as normal |

Dormant monsters make no checks at all until woken.

**Its mind** (kept per monster, saved with the run):

| Field | Values |
|---|---|
| `mood` | calm, suspicious, alert, searching, wary |
| `target` | none; or a square, either **known** (it senses the player now) or a **guess** |
| `timer` | turns left in the current mood, where the mood has one |
| `roused` | whether it became alert from a shout, not by sensing the player |

## 4. Sight

Each turn, for each monster that isn't dormant, with line of sight to the player at distance `d`:

**Its range** `R`, from the player's light level `Lp`, using `V` and `DV` after the state's
multipliers:

| `Lp` | No dark-vision | Dark-vision |
|---|---|---|
| lit (2) | `V` | `V × dazzle` (test: ½) |
| dim (1) | `V × ½` (test) | `max(DV, V × ½)` |
| dark (0) | by mood, the table below | `DV` |

**In the dark, without dark-vision:**

| Mood | Clear within | Glimpse within |
|---|---|---|
| Calm | none | 1, unless the player is sneaking |
| Wary | none | 1 |
| Suspicious | 1 | — |
| Alert, searching | 2 (test) | — |

**Clear or a glimpse** (where the dark table doesn't decide it):
- **Clear** if `Lp` is lit and `d ≤ R − G` (test: `G` = 1), or `Lp` is dim and `d ≤ G_dim` (test: 2).
- **Glimpse** if otherwise `d ≤ R`.
- **Nothing** if `d > R`.

**The lamp's glow:** if the lamp is on and the monster has line of sight to the player's square at
`d ≤ R_glow` (test: twice `V`, at least 8), and the sight check gave nothing, it is a glimpse.

## 5. Hearing

Every sound has a **source square**, a **loudness** `k`, and a **side** (none for the player's).

| Sound | `k` |
|---|---|
| Sneaking step | ½ (test) |
| Walking step | 1 |
| Running step | 2 (test) |
| A door opened or shut | 1½ (test) |
| A blow struck | 3 (test) |
| A thrown stone landing | 1½ (test) |
| A shout | 4 (test) |
| A gong or a bell | 10 (test) |

The square changes it: rubble, bones, water, wooden boards ×1½; moss and soft earth ×½; an echoing
room ×2 (test). The player's steps and blows are multiplied by `hush`.

**Heard** if `ds ≤ H × state's hearing × k`. `C_door` = 3 (test), `C_wall` = 6 (test). Sound
spreads only as far as the loudest reach on the level needs, so the cost stays small.

**Hearing the player** gives the monster a guess at the sound's source (as a glimpse does).
Hearing a shout or a gong: section 8.

## 6. Chance, from the player's things only

After sight and hearing are decided, each of the player's chance effects that applies may cancel
one result. An effect names its condition and its chance, for example:
- a cloak of shadows: a glimpse in dim light misses one time in three;
- a perk: the first clear sighting by an alert monster on a level misses half the time;
- a charm: a step the player makes goes unheard one time in four.

Rolled on the run's dice, once per check. With no such effect, nothing is rolled.

## 7. The moods and their moves

| From | On | To | `target` |
|---|---|---|---|
| calm, wary | a glimpse, or hearing the player, or the glow | suspicious, `timer = T_look` | guess: the source |
| suspicious | another glimpse or sound | suspicious, `timer = T_look` | guess: the new source |
| any | a clear sighting | alert | known: the player's square |
| alert | no sighting or sound this turn | searching, `timer = T_search` | guess: last known square |
| searching | a glimpse or sound | searching, `timer = T_search` | guess: the new source |
| searching | `timer` ends | wary, `timer = T_wary` | none |
| suspicious | `timer` ends | its last mood before (calm or wary) | none |
| wary | `timer` ends | calm | none |
| asleep, any mood | a sound heard, or its square going from dark to lit | awake, then as above | — |

- Glimpses never make a monster alert; only a clear sighting does. So a monster can be led about
  with glimpses.
- **What each mood does:** calm and wary carry on with their state and duty; suspicious walks to
  the guess, alone, and looks round; alert acts by its role (round 16); searching walks to the guess
  and looks round. Different searching by kind: later.
- **Test values:** `T_look` 5, `T_search` 10, `T_wary` 40 turns. Wary also sees and hears a little
  more (×1¼, test).

## 8. Sides, shouts and gongs

- **A monster that becomes alert by its own sight or hearing shouts once:** a sound with `k` of a
  shout and its side, from its square.
- **Hearing a shout or a gong** (by section 5's rule), a monster:
  - of the **same side**: becomes alert and `roused`, `target` a guess at the player's square as the
    shouter knew it;
  - of **another side**: hears a noise: as hearing the player (section 7), `target` the source;
  - tagged **ignores noises**, or asleep and the sound not loud enough to wake it: nothing.
- **Roused monsters don't shout.** Only a monster that senses the player itself shouts. A gong is
  one sound, rung by a monster whose role is to (the alarm-raiser), and is heard by its side as a
  shout.
- A holder's side includes what it raised (the cult's skeletons and zombies).
- Sides fighting each other: not in slice 1.

## 9. A turn, in order

1. The player acts (moves, strikes, opens a door, throws): its sounds are made.
2. Each monster acts by its mood (walks, strikes, shouts, rings).
3. Sounds of this turn are heard (section 5), then sightings (section 4) and the glow, then chance
   (section 6).
4. Moods move (section 7); shouts from monsters newly alert are made and heard this same turn by
   section 8 (not passed on).
5. Timers count down.

A blow on a monster that is calm or wary and doesn't sense the player this turn is a **sneak
attack** (today ×3 damage; the number comes with fighting).

## 10. Checks to keep as tests

Without graphics, as rules tests (`10-building-it.md`):
1. A calm goblin, the player sneaking next to it in the dark: no sighting; walking: a glimpse.
2. An alert goblin in the dark: a clear sighting at 2 steps.
3. A sleeper in a dark room: a lamp carried in wakes it; the same sleeper in a lit room doesn't
   wake from the light.
4. A goblin shouts: a goblin 8 steps away through an open door turns alert; a rat beside it does
   nothing; a cultist in the next room turns suspicious; the roused goblin doesn't shout.
5. A glimpse, then another, then another: the monster stays suspicious, its guess following.
6. A walking step on rubble is heard further than on moss, and less through a wall.
7. With no chance effect, the same situation gives the same result every time.
