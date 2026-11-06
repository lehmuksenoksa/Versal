# Light and dread: the formal rules

As discussed in chat after the stealth rules, written like `stealth.md`: the shape is decided;
numbers marked **(test)** are starting values to tune in play. Built on rounds 2 and 3 (oil and
dread, what light is worth) and `stealth.md` (light levels: dark 0, dim 1, lit 2).

## 1. How light spreads

- **Every light has three bands, as in the proof of concept** (corrected in chat: "I think the dim
  band is a lot less in PoC, and player can see 3 steps beyond it into the dark. This could be
  tweaked."): a **lit** band; a narrow **dim** band; and a **faint** band beyond, dark for stealth
  (monsters see nothing more there) but where the player sees the ground's shape and that something
  is there. Distance in steps (`stealth.md`, section 1).
- **Light follows line of sight:** walls and closed doors stop it. A square takes the brightest
  light that reaches it.
- **Dim light comes only from the rings** in slice 1 (yours: "Yes, keep dim to rings for slice
  1"): no dim places of their own.
- **Carried lights move with their carrier**: the player's lamp, a cultist's lantern.
- **All light comes from sources** (yours: "We should also remove lit rooms and corridors and
  replace them with light sources in corridors and rooms"). No room or stretch of corridor is lit
  of itself, as some are in the proof of concept (`levelgen.js`: lit rooms, lit corridor stretches).
  Every light is a thing on the map, seen, and (most) put out. Corridors are lit by **torches on the
  wall**, a new light (and a new small look).
- The proof of concept already gives its lights a full band and a dim band (`LIGHTS` in
  `levelgen.js`), so this model is close to what's built.

| Light | Lit within | Dim, a band of | Faint, a band of |
|---|---|---|---|
| The player's lamp | 5 | 1 | 3 |
| The lamp out | — | — | 3 (the player's dark sight) |
| A cultist's lantern | 2 | 1 | 1½ |
| A brazier | 2½ | 1½ | 1½ |
| A campfire | 3½ | 2 | 2 |
| Candles | 1¼ | 1¼ | 1½ |
| A torch on the wall | 1½ (test) | 1 (test) | 1½ (test) |

Starting values from the proof of concept (`levelgen.js` `LIGHTS`, `expression.js` and `render.js`:
the lamp's `lightFull` 5, `lightDim` 1, `lightDark` 2, the lamp out 3½); all to test.

A new light is three numbers in the data.

## 2. The player's sight

Mirrors the monsters' (`stealth.md`), so one set of rules covers both.

- **The player sees every lit or dim square in line of sight, however far.** A brazier-lit hall is
  seen whole from a dark corridor: watching from the dark.
- **The player sees 3 steps into the dark beyond the edge of their own light** (yours: "player can
  see 3 steps beyond it into the dark"): with the lamp on, past its dim band; with it out, 3 steps
  round them. That is the faint band of the player's light (section 1): the ground's shape, and that
  something is there. (Test.)
- **What the player can tell, by the light where a thing is:**

  | Where it is | What the player can tell |
  |---|---|
  | Lit | Everything: what it is, its state (in its tip), what an item is |
  | Dim | What kind it is (a goblin, a chest), not more |
  | Dark, within the player's dark sight | Only that something is there (round 3) |
  | Dark, further | Nothing but what is heard |

- **Hearing:** sounds show as noise words where they come from, as in the proof of concept (dread's
  false noises come in there).
- **What has been seen stays on the map;** monsters vanish when out of sight.
- **Dark-vision** (a potion, a perk) works as for monsters: within its range, the dark counts as dim.
- The lamp's numbers come from the proof of concept (section 1): about 9 steps seen round the
  player with it lit, 3 with it out.
