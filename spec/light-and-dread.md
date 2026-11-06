# Light and dread: the formal rules

As discussed in chat after the stealth rules, written like `stealth.md`: the shape is decided;
numbers marked **(test)** are starting values to tune in play. Built on rounds 2 and 3 (oil and
dread, what light is worth) and `stealth.md` (light levels: dark 0, dim 1, lit 2).

## 1. How light spreads

- **Every light has two bands for play, drawn as three** (yours: "Can we treat dim and faint band
  same from gameplay perspective, but show them differently visually? Then the ring wouldn't be
  thin"). For play: **lit**, then **dim**, then dark. On the map the dim band is drawn in two tones,
  as the proof of concept's dim and faint bands are now; both play as dim. So the dim ring is wide,
  not a single step. Distance in steps (`stealth.md`, section 1).
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

| Light | Lit within | Dim, a band of (drawn: dim, then faint) |
|---|---|---|
| The player's lamp | 5 | 4 (1 + 3) |
| A cultist's lantern | 2 | 2½ (1 + 1½) |
| A brazier | 2½ | 3 (1½ + 1½) |
| A campfire | 3½ | 4 (2 + 2) |
| Candles | 1¼ | 2¾ (1¼ + 1½) |
| A torch on the wall | 1½ (test) | 2½ (1 + 1½) (test) |

Starting values from the proof of concept (`levelgen.js` `LIGHTS`; the lamp's in `expression.js`);
all to test.

A new light is two numbers in the data for play, and one more for how its dim band is drawn.

## 2. The player's sight

Mirrors the monsters' (`stealth.md`), so one set of rules covers both.

- **The player sees every lit or dim square in line of sight, however far.** A brazier-lit hall is
  seen whole from a dark corridor: watching from the dark.
- **The player's dark sight: 3 steps round them** (as the proof of concept: "player can see 3 steps
  beyond it into the dark", now carried by the lamp's wider dim band). This is sight, not light: it
  shows the ground's shape and that something is there, and lights nothing, so it doesn't make the
  player seen. It matters with the lamp out; with it lit, the lamp's dim band reaches further.
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
- The lamp's numbers come from the proof of concept (section 1): about 9 steps seen round the
  player with it lit, 3 with it out.

## 3. Oil

Decided in round 3: the lamp burns oil while lit; oil is found on levels; out of oil, the player is
in the dark until they find more; an oil gauge in the ledger.

- **Flasks are carried** (yours): picked up into the pack, poured into the lamp when the player
  chooses. The lamp holds so much; a flask adds so much.
- **One flask, two uses** (yours: "merge them"): round 23's lamp oil and thrown oil flask are one
  thing, a **flask of oil**: pour it into the lamp, or throw it for fire where it lands. Every flask
  is light later or fire now. (Depth 1, as lamp oil was.)
- **Counted in turns of burning** (proposed): the lamp holds so many turns, a flask adds so many.
- **The budget** (proposed, to test): on an average level, the oil found keeps the lamp lit for
  about half the turns it takes to cross it. The player chooses where light is worth it.
- **A warning** (proposed): in the lamp's last tenth, it gutters: its bands shrink and it flickers.
