# Proposals: getting about, tips, and things with character

Three proposals, each with a recommendation. The choices are asked on the choices page, round 3
(https://claude.ai/artifact/SJnaJGxrLKgpnoaidfadRt), with pictures where there is something to
see. Nothing here is built yet.

Effort: **S** an evening, **M** a few days, **L** a week or more.

---

## 1. Quality of life

What the game has today: WASD, arrows and numpad step; a tap steps toward the finger, and holding
walks, steered, until a new monster comes into sight; r rests until healed or disturbed; l lists
what's in sight; the log keeps every message.

### Getting about

| # | Improvement | What it does | Effort | Recommended |
|---|---|---|---|---|
| 1 | **Click to walk** | Click (or tap) a floor square you've seen; you walk there by the shortest way through squares you know. You stop when a monster you hadn't seen comes into sight, when you're hurt, or when you step on something. A key or click stops you. | M | **First** |
| 2 | **Walk to the stairs** | `>` (or `<`) when not on stairs walks to the stairs down (up) you've found, with the same stops; again to take them. A click on stairs does the same. | S | **First** |
| 3 | **Explore** | `x` walks to the nearest place you haven't seen yet, again and again, with the same stops, picking up nothing. Until the level is seen ("Nothing left to explore."). | M | **First** |
| 4 | **Run** | Shift and a direction runs along a corridor or across a room until something changes: a fork, a doorway, a monster, a thing on the floor. | S | Second |
| 5 | **Click a monster** | Next to you: strike it. Further off: walk to it, stopping a square short (or when anything else turns up). | S | **First** (comes with 1) |
| 6 | **Click a thing on the floor** | Walk to it and pick it up. | S | **First** (comes with 1) |
| 7 | **Click a door** | Next to you: open or close it. | S | Second |

### Knowing what's what

| # | Improvement | What it does | Effort | Recommended |
|---|---|---|---|---|
| 8 | **Tips on hover** | See proposal 2. | M | **First** |
| 9 | **Compare before wielding** | In the inventory, each weapon and piece of armour says how it measures against what you have on: "1 better than your dagger", "your helmet is better". | S | **First** |
| 10 | **Better found: wield it?** | Picking up something better than what you hold or wear asks "Wield it? (y)", one key. | S | Second |
| 11 | **Room names** | Walking into a room says what it is ("You come into a crypt."), once per room; it also shows in the tips and the look. Needed by proposal 3's rooms. | S | **First** |
| 12 | **Wounds in words** | Monsters' health shown in the look and the tips: unhurt, scratched, wounded, badly wounded, near death. | S | **First** (comes with 8) |
| 13 | **The whole level** | Tab zooms out to show all you've seen of the level; Tab again (or any move) zooms back. | S | Second |
| 14 | **Repeats folded in the log** | "You hit the rat. ×3" instead of three lines. | S | Second |
| 15 | **The last words on the death page** | The last five messages before you died, under the tally. | S | Second |

### Less fuss

| # | Improvement | What it does | Effort | Recommended |
|---|---|---|---|---|
| 16 | **Potions picked up by walking over them** | When there's room in the pack. Other things still need `,`. | S | Second |
| 17 | **Resting searches** | Resting looks for secret doors as hard as searching does (today it only notices them as standing about does). | S | **First** |
| 18 | **Stop walking when hurt** | Any walk (held, clicked, explore, run) stops at the first hit point lost, and below a third of your health won't start. | S | **First** (comes with 1) |
| 19 | **Keep the run** | The run is kept in the browser; closing the tab and coming back carries on where you were. | L | Later |

**Recommendation:** the "First" ones as one milestone (1, 2, 3, 5, 6, 8, 9, 11, 12, 17, 18): clicking
and exploring, with the tips. The "Second" ones after, "Later" when the game is longer.

### Walking: what you see before you click

Hovering a square you can walk to shows where you'll go (pictures on the choices page):
- **Now:** nothing, only the pointer.
- **A:** an inked cross where you'll stop.
- **B:** a dotted ink trail of the way, and the cross. **Recommended:** the trail tells you which
  way round you'll go (through which door) before you commit, and dots are the lightest mark that
  shows it.
- **C:** footprints along the way.

The walk is shown only while hovering; nothing stays on the map once you walk.

### Walking on a phone

Today a tap steps once toward the finger and holding walks. **Recommended:**
- A tap **next to you** steps, as now (and strikes a monster there).
- A tap **further off** walks there (with the stops above). The trail shows for a moment.
- **Holding** walks, steered by the finger, as now.
- A tap on a **monster or thing** further off shows its tip (proposal 2); a second tap walks to it.

---

## 2. Tips on hover

Hovering a monster, a thing on the floor, a piece of furniture or a room's floor shows a short
tip. Pictures of each style are on the choices page; the scene is the game's own, the tip drawn
over it.

### How it looks

- **A: a torn black plate** beside the pointer, like the corner's and the sidebar's: the name in
  the lettering, a line of state, a dim line of what it does. A thin ink ring marks what the tip
  is about. **Recommended:** it reads on any ground (lit or dark), belongs with the rest of the
  game's plates, and doesn't cover what it's about.
- **B: lettered on the map** in ink with a paper halo, just above or below the thing, like the
  sounds and Dyson's own labels. The most like the map, but it covers squares near the thing and
  is hard to read on the dark hatching.
- **C: in the corner.** The map only gets the ring; the words go where the news is. Keeps the map
  clear, but the eye goes back and forth.

### What it says

| On | First line | Second | Third (dim) |
|---|---|---|---|
| A monster | Its name, with its trait if proposal 3 is taken ("Savage goblin warrior") | awake or not (asleep, unaware, suspicious, alarmed, fleeing) · wounds in words | What it does, from its ways: "Fast, in packs." "Poisonous bite; waits still." "Slow; never flees." "Carries a lantern." "Heals." |
| A thing on the floor | Its name ("Rusty sword") | Its numbers: "Blow 1–5, one hand"; "Takes off up to 2"; "Heals 7–12" | Against yours: "Better than your dagger (1–4)", in green when better, red when worse |
| Furniture | Its name ("A sarcophagus") | | |
| A room's floor | The room ("A flooded storeroom"), only when it has a name worth giving | What its trait does ("Every step wades: slow and loud.") | |
| Remembered (seen, not in sight now) | As above, "(remembered)" | | |

Not offered: a danger rating ("easy", "deadly"). It reads like a game telling you what to do;
the numbers and the words for wounds are enough. (Say if you'd like it.)

**When:** after the pointer rests a quarter of a second on a square; gone when it moves off.
Nothing shows while a walk is going.

**On a phone:** a tap on a monster or thing further off shows its tip (as above); the look panel
(l) lists the same lines for everything in sight.

---

## 3. Things with character

A few things in each level get a trait: a word before their name that changes how they play.
"Rusty sword", "sharp dagger", "savage goblin warrior", "timid spider", "flooded storeroom",
"cursed crypt". The word is in the name everywhere (the log, the look, the tips, the death page:
"Killed by a savage goblin warrior").

**How many:** about one thing in three found, one monster pack in four, and two to four rooms a
level. Recommended: these, then tuned by playing.

**Known at once:** each trait shows in the name as soon as it's seen. Recommended for now: hidden
traits (a cursed sword that won't come off) need a way to find them out first, and that's a bigger
change.

**Depth:** the bad traits are commoner on the first level, the good ones deeper.

### Items

| Trait | On | Effect | Recommended |
|---|---|---|---|
| **rusty** | weapons, chainmail | Blow 1 lower (a sword 1–5); chainmail takes off 1 less | ✓ |
| **sharp** | dagger, sword, axe | Blow 1 higher at the top (2–7); a blow of 4 or more makes a living monster bleed (1 a turn, 3 turns) | ✓ |
| **balanced** | any weapon | Hits a tenth more often | ✓ |
| **heavy** | axe, warhammer | Blow 2 higher, hits a tenth less often | ✓ |
| **notched** | any weapon | Hits a tenth less often | |
| **silvered** | sword, dagger | Twice the blow against the undead (skeletons, zombies) | ✓ |
| **goblin-bane** | sword, axe | 3 more against goblins (the king too); only deeper down | ✓ |
| **quick** | dagger | A sneak attack is four times as hard (not three) | ✓ |
| **sturdy** | helmet, chainmail | Takes off 1 more | ✓ |
| **padded** | chainmail | Hard blows make you bleed half as often | |
| **spiked** | helmet | A monster that hits you takes 1 | |
| **strong** | potion | Heals 12–18 | ✓ |
| **watered** | potion | Heals 3–6 | |

### Monsters

One trait for a whole pack (all savage, all timid); a pack's leader may have its own.

| Trait | On | Effect | Recommended |
|---|---|---|---|
| **savage** | living monsters | Blow 1 higher, never flees; half as much experience again | ✓ |
| **timid** | rats, goblins, spiders, cultists | Flees when first hurt; half the experience | ✓ |
| **sleepy** | rats, goblins, trolls | Asleep at the start, hears half as well | ✓ |
| **watchful** | goblins, cultists, spiders | Sees twice as far in the dark (your lamp out helps less) | ✓ |
| **swift** | rats, goblins, spiders | A quarter faster | |
| **starving** | rats, goblins | Fewer hit points, but never gives up a chase | ✓ |
| **crumbling** | skeletons | Half the hit points | ✓ |
| **eyeless** | skeletons | Doesn't see you, only hears you | ✓ |
| **bloated** | zombies | Bursts when killed: poisons you if next to it | ✓ |
| **venomous** | spiders, giant spiders | Poisons more often, for longer | |
| **veteran** | goblin warriors | Hits more often, blow 1 higher | ✓ |

### Rooms

Said when you walk in ("You come into a flooded storeroom."), and in the look and the tips. Some
need drawing (water, webs): each of those gets its own mockup before going in.

| Trait | Rooms | Effect | Needs drawing | Recommended |
|---|---|---|---|---|
| **flooded** | storerooms, plain rooms, on broken ground | Every step wades: a turn and a half, for monsters too, and heard twice as far | water | ✓ |
| **cursed** | crypts | The dead here rise again once, a few turns after falling; no healing inside | little or none | ✓ |
| **hallowed** | shrines | Resting heals twice as fast; the undead won't come in | little or none | ✓ |
| **echoing** | halls, galleries | Noises carry twice as far, yours and theirs | none | ✓ |
| **hushed** | dining halls, plain rooms | Your steps make half the noise | none (or rushes on the floor) | |
| **webbed** | galleries, caverns | Webs across some squares hold you a turn; spiders there | webs | ✓ |
| **looted** / **stocked** | storerooms | Nothing to find / two more things | none | ✓ |
| **infested** | storerooms, barracks | A rats' nest: rats come back a while after being killed | a nest | |
| **smoky** | barracks, dining halls (by the brazier) | Sight shortened to four squares inside | smoke | |
| **draughty** | any | Your lamp gutters: sight shortened while inside | none | |

**Recommendation:** items first (they're the quickest and you'll feel them at once), then monsters,
then rooms (the drawn ones each with a mockup).
