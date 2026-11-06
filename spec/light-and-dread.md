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

| Light | Lit within | Dim out to |
|---|---|---|
| The player's lamp | 2 (test) | 4 (test) |
| A cultist's lantern | 2 (test) | 4 (test) |
| A brazier | 3 (test) | 6 (test) |
| A campfire | 2 (test) | 5 (test) |
| A candle | 1 (test) | 2 (test) |

A new light is two numbers in the data.
