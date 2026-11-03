# Round 10: monsters described by tags

Your idea: "maybe we could have a system of tags that inform the behaviour of that type of
monster. A monster type would have a collection of tags, for example <beast>, <pack>, <small>
for rats, and individual monsters could have extra ones: <savage>, <timid> etc. The extra ones
would be chosen from a limited collection for the monster type and not all types would have all
extra ones. For example no timid goblin warriors." And: "This way, you could easily have undead
rats." "And vary the monsters."

## What's there now

Half of it is in the game already. The monster traits (savage, timid, sleepy, watchful, swift,
starving, crumbling, venomous, veteran) are your extras. Each has a list of the kinds it can go on
(`js/traits.js`), so there is no timid warrior today. What's new is the type's own tags driving
its behaviour, in place of code written for each kind, and extras that change what a monster is
(undead).

## My critique

- **It's the right shape for the code.** Part 0 found the rules tangled with the content: special
  cases for each kind inside `world.js`. With tags, each tag is one small piece of behaviour
  (how it senses, moves, takes light, keeps company, flees or doesn't), and a monster is the sum
  of its tags. A new monster is a line of data, not new code. Each tag can be tested on its own,
  without a browser.
- **No cost per turn.** The tags are summed into one profile when the monster is made, so a turn
  reads plain numbers and flags, as now. Saving (round 1) stores the tag list, which is small.
- **Tags will clash.** <undead> never flees, <timid> flees when hurt; <pack> and <alone>. Each tag
  needs a list of what it can't go with. Your limited lists per type already prevent most clashes.
- **The player has to be able to read it.** A name carries one extra well ("a savage rat"). Two
  are harder ("a savage undead rat"), three unreadable. The tips can list the rest.
- **Some tags change the look.** An undead rat should look undead (today the undead are edged in
  ink, not paper). Each tag that changes the look is a visual decision, later.
- **Variety from few types.** As you say, it varies the monsters. A dozen types with a few
  extras each make many foes, and each new type needs drawing once, not once per variant.
- **Balance multiplies.** Every type times its extras is a different foe. Your limited lists keep
  that in hand, and simulated runs check it.

## Questions

Each is separate.

1. **Monsters described by tags** (a type's own tags, plus extras from the type's short list)?
   *My pick: yes.*
2. **Which sorts of tags a type has** (pick any):
   - *what it is* (beast, dead, people, goblinkin, deep thing, made thing);
   - *size* (small, large);
   - *company* (alone, pack, swarm);
   - *senses* (sight, sight in the dark, hearing, smell);
   - *light* (shuns it, drawn to it, carries it);
   - *how it moves* (fast, slow, flits, swims, climbs).

   *My pick: all six.* They're what the stealth reads.
3. **How many extras on one monster:**
   - **A** one at most;
   - **B** up to two;
   - **C** more, deeper down.

   *My pick: A, one, so the name always reads ("a savage rat").* B or C can come later.
4. **Extras that change what a monster is** (undead rats, a giant kind, a ghostly kind)?
   *My pick: yes, your example.* Each one's look is a later question.
5. **The same tags for things, rooms and strangers** (things and rooms have traits today too)?
   *My pick: yes.* One system to build, test and show in the tips. A rusty sword, a flooded
   room and a savage rat work the same way.
