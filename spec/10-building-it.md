# 10. Building it

How the game is built: code structure, content as data, saving, performance budgets, tests,
balance. Open, apart from what's written here.

## Testing and balance (after round 38)

Your question: "This needs to be planned for efficiency as well. Do we need full simulations? Can
we do it without graphic, or can we just do maths?" Answer: no full simulations for balance, no
graphics anywhere, and maths first. From cheapest to dearest:

1. **Maths first, for the curves.** A small script answers most balance questions at once:
   - the fair fight at each depth (the danger ladder);
   - a monster's stats from its Depth and Level (the two-fifths rule, round 28);
   - turns to kill and to be killed;
   - oil needed against oil found per level;
   - how fast you level up.
2. **Rules tests, without graphics.** With the rules split from the drawing (the rebuild), they run
   in plain Node: no browser, thousands of turns a second. Small checks such as "a sleeper wakes when
   dark becomes light" or "a thrown stone draws a monster over", kept in the repository so a change
   can't quietly break what worked.
3. **Small simulations of single parts, where maths can't reach.** A few hundred lines each, run
   thousands of times in seconds:
   - **fights:** a character against a group, for win rates by depth and gear;
   - **level checks:** every level reachable, and a dark way past each guard or camp (tests the
     generator with nobody playing);
   - **stealth in one room:** with these lights and monsters, can you cross unseen?
4. **A crude bot for whole runs, only to catch breakage:** it wanders, fights and takes stairs, to
   find crashes, dead ends and levels that can't be finished. It doesn't judge balance.
5. **Playtests by you, for feel.**

**Skipped:** a bot that plays well enough to balance whole runs. Costly to build, and it measures
the bot's play, not a person's. If a later slice shows the need, it comes then.

**In slice 1:** maths for the curves, rules tests, fight simulations and level checks, and the
crude bot. All headless, in seconds, on any machine.
