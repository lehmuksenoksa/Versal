# Light and dread: the formal rules

As discussed in chat after the stealth rules, written like `stealth.md`: the shape is decided;
numbers marked **(test)** are starting values to tune in play. Built on rounds 2 and 3 (oil and
dread, what light is worth) and `stealth.md` (light levels: dark 0, dim 1, lit 2).

## 1. How light spreads

- **Every light has a bright radius and a dim ring.** Within the bright radius a square is **lit**;
  out to the dim ring, **dim**; beyond, **dark**. Distance in steps (`stealth.md`, section 1).
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

| Light | Lit within | Dim out to |
|---|---|---|
| The player's lamp | 2 (test) | 4 (test) |
| A cultist's lantern | 2 (test) | 4 (test) |
| A brazier | 3 (test) | 6 (test) |
| A campfire | 2 (test) | 5 (test) |
| A candle | 1 (test) | 2 (test) |
| A torch on the wall | 1 (test) | 3 (test) |

A new light is two numbers in the data.

## 2. The player's sight

Mirrors the monsters' (`stealth.md`), so one set of rules covers both.

- **The player sees every lit or dim square in line of sight, however far.** A brazier-lit hall is
  seen whole from a dark corridor: watching from the dark.
- **In the dark, the player sees 3 steps** (yours: "In proof on concept it's 3 and it feels right,
  but I might be wrong. We need to test this."): the ground's shape, and that something is there.
  (Test.)
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
- **To check against the lamp's numbers:** the proof of concept's lamp shows 8 steps round the
  player (`render.js`); section 1's lamp (lit 2, dim 4) would show 4. The lamp's radii likely need to
  be larger (test).
