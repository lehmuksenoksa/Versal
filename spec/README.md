# Versal: the full game, specified first

The proof of concept is done. Before any more is built, the whole game is planned: what it is,
how it plays, how it looks, how it's built. It is planned a part at a time, in rounds, and you
make the key decisions. When the whole of it is written and you say go, building starts.

## How we work

1. **The spec first, then the game.** Nothing more goes into the game until the spec is whole
   and you've given the go. After the go, the game is built milestone by milestone from the
   spec. If building turns up something the spec didn't see, it comes back to you as a question
   and doesn't get decided along the way.
2. **In rounds, broad to narrow.** Each round takes up several parts of the spec at once, not one
   requirement at a time. The first round is the big decisions that everything else hangs on.
   Later rounds narrow down: systems, then content, interface and looks, then how it's built.
   Later rounds may reopen earlier answers if something shows they don't hold.
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
| 2 | [The run](02-the-run.md) | Regions and levels, their order, bosses, the goal, how hard it gets | bosses decided; the goal and regions in round 4; what keeps a run moving in round 3 |
| 3 | [The character](03-the-character.md) | How levels are earned, the choices at a level up, attributes, magic | decided in outline (round 2); attributes and magic in round 3 |
| 4 | [Systems](04-systems.md) | Light and stealth, noise, awareness and the monsters' minds, combat, ailments, items and traits, resting, doors and secrets, food (or none) | decided in outline (round 2); what light is worth in round 3 |
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
| 3 | What round 2 left open: what light is worth, what keeps a run moving; the attributes, how they grow, magic. How to brainstorm the regions | on the choices page |
| 4 | The regions and the reason to go down: a round of their own, brainstormed | — |
| 5 | Parts 5 and 6: content and levels. Part 10's first questions (saving, data, budgets) | — |
| 6 | Parts 7 and 8: interface and visual language in full. Mockups where needed | — |
| 7 | Part 10 in full, part 11. The whole spec read through for gaps and contradictions, with my critique | — |
| — | The go | — |

The number of rounds isn't fixed. A round can be split, or one added, as answers come in.
