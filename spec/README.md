# Versal: the full game, specified first

The proof of concept is done. Before any more is built, the whole game is planned: what it is,
how it plays, how it looks, how it's built. It is planned a part at a time, in rounds, and you
make the key decisions. When the whole of it is written and you say go, building starts.

## How we work

1. **The spec first, then the game.** Nothing more goes into the game until the spec is whole
   and you've given the go. After the go, the game is built milestone by milestone from the
   spec. If building turns up something the spec didn't see, it comes back to you as a question
   and doesn't get decided along the way.
2. **Shallow first: explore wide before going deep.** In your words: "I'd like to go shallow and
   explore before deep diving into details."
   - A round stays at one depth. It doesn't run ahead into the details of what it asks about.
     For example, a region is first just a place in a line. Who lives there, its boss and its
     twist come later, each as a question of its own.
   - One decision per question. Things that can be decided separately are asked separately, not
     bundled into one option (for example, round 2's "a few choices in a fight" bundled
     warnings, shoving and kinds of weapon).
   - Not every tool fits every purpose (round 15): a structure (themes, tags, regions) is used
     where it helps, not forced onto everything.
   - Many options wide, then narrowed: keep, maybe, drop, then a closer look at what was kept.
   - Later rounds may reopen earlier answers if something shows they don't hold. Bundled answers
     from rounds 1 to 3 get unpicked as their details come up.
3. **Each decision comes as a proposal with critique.** For each one:
   - the options, with my pick and why;
   - what each option costs: work, and what it does to the rest of the game, its speed on
     phones, the code's shape, and how hard it is to balance and test;
   - what it rules out later.

   You decide on the choices page (https://claude.ai/artifact/SJnaJGxrLKgpnoaidfadRt), and the
   answers go into the spec.
4. **Mockups only where a decision has to be seen.** They follow the visual language and are drawn
   with the game's own drawing code.
5. **Experiments are allowed when a question needs measuring.** Some questions can't be answered
   by reasoning, for example how big a level a phone can draw at full speed. Then a small
   throwaway experiment can be run. It is reported, and it never goes into the game. (This is
   one of round 1's questions.)
6. **The visual decisions stay yours**, as before (`PLAN.md`, "How we work").

## The catalogue

Everything the brainstorms kept is in one data file, `data/catalogue.json`: regions, places,
strangers, monsters, tags, features, ways to tell the story, surprises, environmental features and containers, things to find, and item tags. From round 11 on it is
the source; the round files are its history. The game will later load its content from data like
it. A page to browse it, by region and with the holes shown: `mockups/catalogue.html`.

## The content model

What the plan for monsters, places and regions is for, and what we need to know about each:
`content-model.md`. The aim: every run assembles itself from the catalogue into regions that feel
and play differently, foes that each ask something different of a sneaking player, everything
where it makes sense, at a scope we can draw and balance.

## The spec's parts

Each part's state is one of:
- **open**: not yet taken up.
- **proposed**: options on the choices page.
- **decided**: answered, written down.
- **whole**: written in full, nothing open.

| # | Part | What it settles | State |
|---|---|---|---|
| 0 | [The proof of concept, reviewed](00-proof-of-concept.md) | What it proved, what carries over, what has to be redone for a full game | written |
| 1 | [Vision](01-vision.md) | What kind of game, how long a run, who grows how, between runs, story, where it's played, sound, saving | decided (round 1) |
| 2 | [The run](02-the-run.md) | Regions and levels, their order, bosses, the goal, how hard it gets | bosses, oil and dread decided; the goal and regions in round 4 |
| 3 | [The character](03-the-character.md) | How levels are earned, the choices at a level up, attributes, magic | decided (rounds 2 and 3); the level-up choices' list in round 5 |
| 4 | [Systems](04-systems.md) | Light and stealth, noise, awareness and the monsters' minds, combat, ailments, items and traits, resting, doors and secrets, food (or none) | decided in outline (rounds 2 and 3); details with the content |
| 5 | Content | Every monster, item, trait, room kind and ground kind, as tables | open |
| 6 | Levels | How each ground kind is made, set pieces, how a level is laid out to be played | open |
| 7 | Interface | Layout (big screens), panels, tips, keys and mouse, the level-up page, title, death and victory pages, settings, accessibility | open |
| 8 | Visual language | The map's rules in full (hatching, broken lines, light's ragged edges, height and depth, families of things), the interface's rules, every element by family | started (`../VISUAL_LANGUAGE.md`) |
| 9 | Sound | None (round 1): the noise words are its sound | decided |
| 10 | Building it | Code structure, data for content, saving, performance budgets (laptops), tests, balance by simulated runs, where it's published | open |
| 11 | Getting there | Milestones from the go to release; playtests | open |

## Rounds

| Round | Takes up | State |
|---|---|---|
| 1 | Part 0 (to read) and part 1. How we work (to confirm). The parts above (to confirm). | answered |
| 2 | Parts 2, 3 and 4 in outline: the run, the character, the systems | answered; three left open |
| 3 | What round 2 left open: what light is worth, what keeps a run moving; the attributes, how they grow, magic. How to brainstorm the regions | answered |
| 4 | Regions, shallow: places in a line each, keep, maybe or drop ([`round4-regions.md`](round4-regions.md)) | answered: 20 kept |
| 5 | Smaller places, shallow: areas and rooms ([`round5-places.md`](round5-places.md)) | answered: organised in [`places.md`](places.md) |
| 6 | What the places allow, shallow: features, ways to tell the story, surprises, friendly strangers ([`round6-features.md`](round6-features.md)) | answered |
| 7 | More friendly strangers, shallow ([`round7-strangers.md`](round7-strangers.md)); what to explore next | answered |
| 8 | Regions or areas; the same regions every run? ([`round8-regions-areas.md`](round8-regions-areas.md)) | answered |
| 9 | Monsters, shallow ([`round9-monsters.md`](round9-monsters.md)) | answered |
| 10 | Monsters described by tags, your idea ([`round10-tags.md`](round10-tags.md)) | answered |
| 11 | Tags, shallow ([`round11-tag-list.md`](round11-tag-list.md)) | answered: cleaned into [`tags.md`](tags.md) |
| 12 | The world's shape, your idea: regions of several maps, transitions, themed areas ([`round12-world.md`](round12-world.md)) | answered |
| 13 | A world by depth, the regions set in it, your idea ([`round13-depth.md`](round13-depth.md)) | answered |
| 14 | Culling the Dungeon Underneath ([`round14-dungeon.md`](round14-dungeon.md)) | answered |
| 15 | Themes: what goes with what; who holds the castle-like dungeon ([`round15-themes.md`](round15-themes.md)) | answered |
| 16 | The roles, opened up ([`round16-roles.md`](round16-roles.md)) | answered |
| 17 | Each monster's role and answer ([`round17-monster-roles.md`](round17-monster-roles.md)) | withdrawn: too piecemeal, too focused on stealth |
| 18 | Your roster of monsters, by family and rank ([`monsters.md`](monsters.md)); the heart of the game widened to fighting as well as stealth | decided |
| 19 | The bosses and the eldritch family (yours); where each family lives, as one table | waiting: the world first (round 20) |
| 20 | The danger ladder: how danger rises from a lone rat to the dragon ([`round20-danger.md`](round20-danger.md)) | folded into round 21 |
| 21 | The world plan, from your outline (and the run simulator, `mockups/runs.html`): the Over Dungeon, then regions, transitions and themed areas ([`world.md`](world.md)) | answered |
| 22 | Environmental features, shallow ([`round22-features.md`](round22-features.md)) | answered |
| 23 | Things to find, shallow ([`round23-things.md`](round23-things.md)) | answered |
| 24 | Item tags, your idea ([`round24-item-tags.md`](round24-item-tags.md)) | answered |
| 25 | What the Dungeon Underneath contains ([`round25-dungeon.md`](round25-dungeon.md)) | answered |
| 26 | The Dungeon Underneath's areas, reworked ([`round26-dungeon-areas.md`](round26-dungeon-areas.md)) | answered |
| 27 | Every region's areas and loose rooms, shallow ([`round27-areas-all.md`](round27-areas-all.md)) | answered |
| 28 | Depth and Level, your idea ([`round28-depth-level.md`](round28-depth-level.md)) | answered |
| 29 | Who's there, in every region, shallow ([`round29-whos-there.md`](round29-whos-there.md)) | answered |
| 30 | New foes from your comments: worms, spiders, the dwarven dead, orcs ([`round30-new-foes.md`](round30-new-foes.md)) | answered |
| 31 | The Depth table ([`round31-depth-table.md`](round31-depth-table.md)) | answered |
| 32 | Each region's features and containers, shallow ([`round32-features-by-region.md`](round32-features-by-region.md)) | answered |
| 33 | Which areas go together, every region ([`round33-areas-together.md`](round33-areas-together.md)) | answered |
| 34 | Who holds the Keep, and what changes ([`round34-keep-holders.md`](round34-keep-holders.md)) | answered |
| 35 | The smaller themed areas, shallow: transitions, the bandits' hold, the archive, the sanctum ([`round35-smaller-areas.md`](round35-smaller-areas.md)) | answered |
| 36 | What strangers offer, shallow ([`round36-strangers-offer.md`](round36-strangers-offer.md)) | answered |
| 37 | Which stranger offers what ([`round37-who-offers-what.md`](round37-who-offers-what.md)) | on the choices page |
| … | Each next round chosen after the last, shallow before deep | — |
| — | The go | — |

The rounds aren't planned ahead: each is chosen once the last is answered.
