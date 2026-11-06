# Fighting: the formal rules

As discussed in chat after light and dread, written like `stealth.md` and `light-and-dread.md`.
Built on round 2 (shoving, weapons that differ, shooting), round 3 (what light is worth: the dark is
blind) and round 18 (yours: "a lot of the gameplay should be fighting melee, shooting enemies,
retreating to a better position, running away").

## Decided

- **No warning of a heavy blow** (round 2's idea dropped: "no").
- **Dice** (yours: "dice for fighting. Attributes, gear and perks affect hit chance and damage"):
  each blow or shot has a chance to hit and rolls its damage. Unlike stealth (certain), fighting
  rolls, for the player and for monsters.
- **Shooting needs the target in sight, not in light** (yours: "in sight, not in light"; this
  changes round 3's "shooting from the dark needs the target lit"). What the player can see is in
  `light-and-dread.md`, section 2.
- **Where a fight's choices come from** (proposed in chat, the basis): position (doorways and narrow
  ways; being surrounded), speed (fast and slow monsters; running away), weapons that differ (round
  2), shooting and ammunition, the ground (shoving into water, pits, fire; loud floors), light (the
  dark is blind), opening with a sneak attack and breaking off (monsters fleeing when hurt;
  persistence), and escalation (a fight's noise, `06-levels.md`).
- **Armour takes damage off each blow** (yours: "Takes damage off each blow"), not making the wearer
  harder to hit. Its cost is elsewhere: noise and slowness (round 23: chainmail "some noise", plate
  "heavy, loud, slower"). So armour makes the player harder to hurt but easier to hear.

## A blow (proposed; numbers with attributes and balance)

- **Chance to hit:** the attacker's **accuracy** (from attributes, cunning by round 3; the weapon;
  perks) against a base, changed by the situation, kept between 5% and 95%:
  - the target in the dark: a large minus (the dark is blind); in dim light, a small one;
  - the attacker afraid (dread, `light-and-dread.md`, section 4): a minus;
  - being surrounded: for each foe next to the target past the first, a plus to hit it (so a
    doorway or a narrow way protects);
  - a target that doesn't sense the attacker: a sure hit, ×3 damage (the sneak attack, as today).
- **Damage:** the weapon's roll, plus brawn (round 3), minus the target's armour; at least 0.
- **Health** from grit (round 3).

## Time and speed

- **Actions take time** (proposed, agreed as the basis): a walking step or a blow costs 100 ticks;
  the player and every monster act when their time comes round. (The proof of concept does this in
  a simple form: a sneaking step costs 1.5 turns.)
- **Starting costs** (test):

  | Action | Ticks |
  |---|---|
  | Sneaking step | 150 |
  | Walking step | 100 |
  | Running step | 60 |
  | A blow | 100 (a dagger 60, a warhammer 150) |
  | A shot | 100 (a crossbow 200 to load) |
  | Putting out a candle or wall torch | 100 |
  | Putting out a brazier or campfire | 200 |

- **Monsters' speeds by kind** (test): fast, 60 (rats, wolves, bats); normal, 100 (goblins,
  cultists); slow, 150 (zombies, trolls, golems).
- **Running doesn't tire** (yours: "No stamina, only loud"): the player can run as long as they like,
  at the price of noise (`stealth.md`, section 5). The player can outrun the slow, not the fast.
