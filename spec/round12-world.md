# Round 12: the world's shape

Your idea: "maybe we could have a few bigger regions, consisting of several maps of varying size,
going up and down in level or even sideways. Regions like The Dungeon Underneath, Goblin
Territory, Abandoned Dwarven Keep, The Deep Dark, The Drowned City. Some smaller areas that serve
as transitions between areas: Mines, Breach, Sewers. Some smaller areas that aren't regions as
such, but revolve around a theme, like the bandit hold."

Three kinds of place:
- **Regions:** big; several maps of varying size, linked up, down and sideways.
- **Transitions:** smaller; they lead from one region to another.
- **Themed areas:** smaller; built round one theme, found within or between regions.

## My critique

- **It fits what the generator does.** A level already blends one kind of ground into the next.
  A region becomes several maps sharing its kinds of ground, at different sizes: a transition
  small, a region's heart large.
- **Sideways is new.** Today a level has a stair down and a stair up. Linking maps sideways means
  passages at a map's edge, and a way to show where each leads. Maps are kept as left (as now),
  so going back is free to build.
- **Danger no longer follows depth.** With sideways and upward links, "deeper is harder" doesn't
  hold by itself. Danger would be set by region, and by how far a map is from the start.
- **The run's length.** Round 1 set 1 to 2 hours. That stays, counted in maps rather than
  levels: perhaps 4 regions of 2 to 4 maps each, with transitions between.
- **Saving and memory.** More maps kept means a bigger save. A map is small as plain data, and maps
  not shown give up their drawing caches (part 0). On laptops (round 1) that's comfortably in
  budget.
- **Going back.** With up and sideways links, players will go back through maps they've seen.
  The oil and dread (round 3) still press on them, and the remembered map makes going back quick.
- **It settles round 8's thin regions.** The forge, the vents, the webs and the pits stop needing
  to be regions: they become parts of a bigger one, or themed areas.

## Questions

Each is separate.

1. **The three kinds of place** (regions of several maps, transitions, themed areas)? *My pick: yes.*
2. **How the regions link:**
   - **A** in a line: each region leads to the next;
   - **B** a branching world: at some points you choose which region comes next *(my pick)*;
   - **C** open: regions linked every way, to roam back and forth.

   **Why B:** a choice of route is a choice a roguelike player enjoys, and different runs see
   different regions. C is hard to keep a run's danger rising in, and A gives no choice.
3. **How many of the regions a run goes through:**
   - **A** all of them, every run;
   - **B** some of them, by the route chosen *(my pick, with branching)*.
4. **Where each of round 8's places goes** (my picks below). The choices:
   - one of the five regions;
   - a transition;
   - a themed area;
   - drop.

| Was (round 8) | My pick | Why |
|---|---|---|
| The dungeon | The Dungeon Underneath | It is that region |
| The collapsed rooms | The Dungeon Underneath | Its edge, where it turns to caves |
| The caverns | The Deep Dark | The natural caves |
| The goblin king's halls | Goblin Territory | Its heart |
| The drowned city | The Drowned City | It is that region |
| The sewers | Transition | Your example |
| The goblin warrens | Goblin Territory | |
| The glowing deep | The Deep Dark | |
| The webs | The Deep Dark | |
| The mines | Transition | Your example |
| The dwarven hold | Abandoned Dwarven Keep | It is that region |
| The forge | Abandoned Dwarven Keep | "Part of the dwarven keep or near the mines" |
| The sulphur vents | The Deep Dark | |
| The rift | The Deep Dark | Or a transition, crossing between regions |
| The archive | Themed area | A buried library could be anywhere built |
| The bone field | The Deep Dark | |
| The underwood | The Deep Dark | |
| The pits | Goblin Territory | Goblins keep the beasts and the fights |
| The bandits' hold | Themed area | Your example |
| The cult's sanctum | Themed area | Could be found in any region |
| A breach (round 5's area) | Transition | Your example |
