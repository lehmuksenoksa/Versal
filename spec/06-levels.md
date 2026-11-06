# 6. Levels

How a level is made and filled so it can be played. Open, apart from what's written here.

## Generating for stealth (discussed in chat, after the stealth rules)

What stealth needs from a map (my proposal, agreed as the basis):
1. **Light in a pattern:** lit islands in a dark sea; lights where the occupants are, the ways
   between dark or dim. Every light that can be put out is a tool.
2. **Things that break sight:** corners, doors, columns; no room one open field.
3. **Loops, not trees:** two or more ways between the places that matter, so a guard can be gone
   round, a patrol has a round, a chase has somewhere to go.
4. **Floors with sound in a pattern:** loud at the ways in, quiet on side paths.
5. **Room to lure:** a group stands close; side spaces lie within a glimpse of one, out of the
   others' sight.
6. **Somewhere to retreat:** a dark pocket or side room to break a chase.
7. **Reasons to take risks:** something good behind a guard or beside a sleeper, off the safe path.

### Decided

- **A sneaking route to the stairs on most levels** (yours: "Most of the time"). Most levels have at
  least one way from the stairs up to the stairs down that a careful, sneaking player can take
  unseen; some don't, and ask for a lure, a fight or a tool. How often: to test (start: 9 in 10).
- **Light: most of the time a mix of light and dark.** Built places held by sentient beings are
  lighter; caves and beasts' places darker. Caves can glow with fungus. Rarely, an area is almost
  fully lit, or completely dark but for the player's own light (yours).
  - **In slice 1:** caves are lit where goblins or other sentient beings live (their campfires, as
    in the proof of concept); caves nobody tends are dark but for the player's lamp. Glowing fungus
    keeps its Depth 8 and comes with a deeper slice (agreed in chat).
  - Proposed: the rare lit and dark areas as two more area traits beside the proof of concept's
    "flooded" and "echoing": **blazing** and **pitch dark**.
- **Monsters are placed by encounter templates** (yours: "Templates sounds good"): a group, its
  states, its place and its light, for example a camp at a fire with one at the approach, sleepers
  in a dark side room by a chest, a patrol on a loop between two lit rooms, a guard at a lit way
  with a way round, vermin in the dark, a wanderer. The depth's mix picks who; the template, how.
- **How dense:** found by playtesting (yours: "Hard to answer without playtesting"). A starting rule
  is needed for the first build. Proposed as the starting rule: groups spaced at least as far apart
  as a normal walk is heard, unless a template says otherwise (a camp's lookout); roughly one
  template per so many rooms, tuned in play; shallower levels fewer and calmer.

### The generator's steps (proposed)

1. Lay out rooms and corridors, with loops (the proof of concept's areas and kinds of ground carry
   over).
2. Place lights by what each room is for, and by ground: lighter where sentient beings live, darker
   in caves.
3. Lay floors: loud, quiet, water.
4. Place encounters from templates.
5. **Check the level with the stealth rules** (`stealth.md`): mark every square a calm monster would
   see or hear a sneaking player in; look for a path from the stairs up to the stairs down through
   unmarked squares. Where a level must have one and doesn't, move a light, a guard or a door, and
   check again.
