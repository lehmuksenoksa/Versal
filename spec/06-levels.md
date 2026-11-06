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
  - Tabled: the rare lit and dark areas as area traits ("blazing", "pitch dark"): "Let's table these
    for now".
- **Monsters are placed by encounter templates** (yours: "Templates sounds good"): a group, its
  states, its place and its light, for example a camp at a fire with one at the approach, sleepers
  in a dark side room by a chest, a patrol on a loop between two lit rooms, a guard at a lit way
  with a way round, vermin in the dark, a wanderer. The depth's mix picks who; the template, how.
- **How dense: by escalation** (yours: "Maybe we should consider escalation of fights here?"; the
  numbers found by playtesting).
  - **Within a fight, one step at a time.** A fight grows by sound (`stealth.md`): one foe notices;
    it shouts and its group comes; the fight's noise (blows) reaches a group of another side, which
    comes to look; a gong brings every group of its side within reach. Groups are placed so a fight
    usually climbs one step at a time, with a few turns between steps to flee, hide or finish it:
    neighbouring groups normally beyond the reach of a fight's noise, at most one within it as a
    deliberate risk. A gong is the big step, placed on purpose (at a camp, a few groups in its
    reach). Templates may escalate faster by design (a camp and its lookout are one group). The
    generator checks it: how many groups a fight at each place would reach, by the hearing rule.
  - **Across a level, pacing.** Gentler near the stairs up (arriving is never an instant fight);
    the strongest groups and the gongs nearer the stairs down, or by the good things off the route.
  - Across a run, depth escalates through Depth and Level (round 28).

### The generator's steps (proposed)

1. Lay out rooms and corridors, with loops (the proof of concept's areas and kinds of ground carry
   over).
2. Place lights by what each room is for, and by ground: lighter where sentient beings live, darker
   in caves.
3. Lay floors: loud, quiet, water.
4. Place encounters from templates, spaced by escalation and paced across the level.
5. **Check the level with the stealth rules** (`stealth.md`): mark every square a calm monster would
   see or hear a sneaking player in; look for a path from the stairs up to the stairs down through
   unmarked squares. Where a level must have one and doesn't, move a light, a guard or a door, and
   check again.
