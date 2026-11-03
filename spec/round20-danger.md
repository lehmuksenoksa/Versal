# Round 20: the danger ladder

You asked: "What I want is to plan and understand the escalation of danger from top to bottom.
The easiest is one lone rat and at the end of the scale there's the dragon. But everything in
between and combinations. A dozen rats would and should be dangerous to level 1 adventurer.
Maybe a danger ladder is exactly what we need: to go through how the danger escalates, how that
is tied to the depth. We should look this from the whole world perspective first, and THEN see
where the regions set."

The ladder is on the catalogue page, under Danger ladder:
https://claude.ai/artifact/WpPGj87jr2GcuEkkfBrTKv#ladder. Round 19's questions (the regions'
depths, the lich with outlaws, the eldritch family) wait until after it.

## The model

- **Danger in rats.** A monster's danger, counted so that a lone rat is 1, and so on up to the
  dragon at 150.
- **Groups.** A group counts for more than its sum: each one after the first adds 8%, so twelve
  rats are about 23. Fought one at a time, in a narrow way (your note on swarms, round 16), a group
  counts as its sum, 12.
- **Twelve steps down the world:** shallow 1–4, middle 5–8, deep 9–12. Each has a **fair fight**,
  the biggest a character there should win:

  | Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Fair fight | 3 | 5 | 7 | 10 | 13 | 17 | 22 | 28 | 35 | 45 | 55 | 70 |

- **A monster first appears** at the first step where one of it alone is a fair fight; bosses
  at their region's step.
- **Encounters** are marked easy (under half a fair fight), fair, hard (up to twice) or run (more).

All the numbers are a proposal for the shape of the climb, not the game's stats; those are tuned
by simulated runs (`content-model.md`).

## The scale (danger in rats)


| Danger | Monsters |
|---|---|
| 1 | Rat 1, Bat 1, Leech 1 |
| 2–3 | Spider 2, Snake 2, Giant rat 3, Giant centipede 3, Skeleton 3, Will-o'-wisp 3, Goblin 3, Cultist 3, Bandit 3, Thief 3 |
| 4–5 | Wolf 4, Eel 4, Cave crab 4, Slime 4, Bone heap 4, Skeleton archer 4, Zombie 4, Goblin archer 4, Cultist archer 4, Bandit archer 4, Ghost bat 5, Goblin beasthound 5 |
| 6–9 | Floating eye 6, Mimic 6, Skeleton warrior 7, Goblin warrior 7, Cultist warrior 7, Giant spider 8, Goblin shaman 8, Dire wolf 9, Cult priest 9 |
| 10–14 | Worm 10, Ooze 10, Animated armour 10, Ghost 10, Dark elf 10, Shadow 10, Dark elf archer 11, Cave bear 12, Cave lion 12, Wight 12, Dark elf warrior 14, Lurker 14 |
| 15–24 | Goblin chieftain 15, Ogre 15, Bandit chief 15, Golem 18, Dark elf wizard 18, Troll 20, Earth elemental 20, Water elemental 20, Fire elemental 20, Wraith 22 |
| 25–49 | Bronze golem 25, Abomination 30, Iron golem 35, Greater earth elemental 40, Greater water elemental 40, Greater fire elemental 40 |
| 50+ | Steel golem 50 |
| Bosses | Lich 30 (step 4), Goblin king 45 (step 7), Eldritch horror 60 (step 8), Dark elf prince 90 (step 11), Dragon 150 (step 12) |

## My critique

- **The top is crowded, the bottom thin.** Step 1 brings 17 new kinds, step 4 another 12. Steps 8
  to 11 bring one to three each, and step 12 none. A run would meet most of the roster in its
  first hour, and the deep would be the same monsters in bigger groups. Either spread the shallow
  ones further down, or add deep ones, or both.
- **Groups do the escalating well.** Twelve rats at step 1 are a run; one at a time in a narrow way
  they're a hard fight. Retreating to a better place matters, as you wanted.
- **The family bands climb in steps.** A bandit and an archer (step 3) become a chief's band
  (step 6). A goblin warrior's group (step 5) becomes a chieftain's war band (step 9). Each family
  has a shallow and a deep shape.
- **The bosses sit about twice a fair fight above their step,** before their guards: the lich 30
  at step 4, the goblin king 45 at 7, the eldritch horror 60 at 8, the dark elf prince 90 at 11,
  the dragon 150 at 12.

## Questions

Each is separate.

1. **Danger counted in rats?** *My pick: yes.* It's a unit anyone can picture.
2. **Groups: each after the first adds 8%, one at a time counts as the sum?** *My pick: yes.*
3. **Twelve steps, the fair fight growing from 3 to 70?** *My pick: yes.*
4. **The scale, each monster's danger, as a whole?** Correct any in the comment.
5. **Crowded top, thin bottom:**
   - **A** spread the shallow ones further down;
   - **B** add deep monsters;
   - **C** both *(my pick)*.
6. **The bosses' steps and strengths?** Correct in the comment.

