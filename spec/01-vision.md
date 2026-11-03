# 1. Vision (round 1)

These are the decisions everything else hangs on. Each one has its options, my pick, and what
each option costs or rules out. They are asked on the choices page, round 1 of the spec. When
you've answered, this part is rewritten as the decisions.

Work is weighed as **S** (little), **M**, **L** and **XL** (a large share of the whole).

---

## 1. The heart of the game

What a run is mostly about, moment to moment.

| | Option | What it means | Costs and consequences |
|---|---|---|---|
| A | **Stealth in the dark** *(my pick)* | You are weak against what lives down there. The lamp, light, noise and being seen are the main tools. Fights are dangerous and often best avoided or taken by surprise. | Builds on what the proof of concept has that others don't. The work goes into the monsters' minds: searching, patrols, following sounds, reacting to light, raising the alarm (**L**). Each turn's thinking has to stay cheap on phones. Levels have to be made for sneaking: routes, cover, light and dark (part 6). Content: fewer but deeper monsters. |
| B | **Fight and find** | A classic dungeon crawl: fighting and loot first, sneaking one tool among many. | Needs a lot of content to stay fresh (many monsters, items and kinds of item: **XL**), and with it the drawing of each. The light and sneaking already built become a side feature. |
| C | **Few, hard fights** | Tactical: fewer fights, each a puzzle of position, with telegraphed blows, shoving, defending. | Needs telegraphs drawn on the map, more animation and an interface for intent (**L**). Fits with A as a second layer, but alone it drops what's special about the game. |

**Why A:** it is the one thing the proof of concept does that other roguelikes don't, and the map
(light in bands, the hatching, the shadows) is already made for it. A and C mix well: stealth as
the heart, with the fights that do happen made tactical. That is how I'd write it in round 2.

## 2. What it's for

| | Option | Costs and consequences |
|---|---|---|
| A | **For you and people you share it with** | Finished when you're happy with it. No store, no support. |
| B | **Released free, publicly** (for example on itch.io) *(my pick)* | A public release needs playtests by strangers, onboarding, settings, accessibility, browsers tested. Publishing is small. |
| C | **Sold** (Steam or itch.io, as an app) | Everything in B, plus the game wrapped as a desktop app, a store page, a trailer, support, maybe achievements and cloud saves. Polish and balance have to meet a paying player's bar (**L** on top). The fonts (Texturina, Crimson Pro) are under the Open Font License, so they can be sold with the game. |

**Why B:** it sets a real finish line (strangers can pick it up and play) without a store's extra
work, and C stays open later.

## 3. Length of a run

| | Option | Costs and consequences |
|---|---|---|
| A | **Short:** 5 or 6 levels in 2 regions, about 30 to 45 minutes | The least content. Saving is optional. Easy to replay. |
| B | **Middle:** about 10 levels in 3 or 4 regions, a boss closing each, 1 to 2 hours *(my pick)* | 1 or 2 regions to add to today's ground kinds, each with its look (rounds of mockups), monsters and set pieces. Saving needed. Levels not shown have to give up their drawing caches (part 0). |
| C | **Long:** 20 or more levels, many hours | Content and look at the scale of B in "Heart" (**XL**). Variety has to come from the generators. Each level drawn by hand-feel risks sameness. |

**Why B:** room for a run to rise and change (each region a new place and danger) at a size the
drawing can keep up with.

## 4. The character

| | Option | Costs and consequences |
|---|---|---|
| A | **One adventurer**, growing by levels and finds (as now) | Least work. Runs differ only by what's found. |
| B | **A background chosen at the start** (3 or 4: for example a thief, a soldier, a priest, a scholar), each with its own stats, gear and one ability *(my pick)* | Each background adds balance work (simulated runs help) and a few new things to draw and explain. Runs play differently from the first turn. |
| C | **Choices at each level up** (skills or feats) | Builds made over a run. The number of combinations makes balance hard. Needs a level-up page. |
| D | **B and C** | The most variety, and the most balance and interface work (**L**). |

**Why B:** it gives a reason to play again and fits the stealth heart (a thief and a soldier
should play a level differently). C can be added later without undoing B.

## 5. Between runs

| | Option | Costs and consequences |
|---|---|---|
| A | **Nothing carries over**, but past runs are remembered (a roll of the dead: who, how far, what killed them) *(my pick)* | Small. Kept in the browser, per device. |
| B | **Unlocks:** new backgrounds and starting things earned by how far runs get | A profile kept per device (no server, so it doesn't move between devices). Unlocks have to be balanced and designed. |
| C | **A home between runs** (a camp or town: buying, choosing) | A whole second game place to design, draw and build (**L**). |

**Why A:** a roguelike's runs stand alone. The roll of the dead gives memory and flavour for
little. B can be added later.

## 6. Story

| | Option | Costs and consequences |
|---|---|---|
| A | **None** beyond the goal (kill the boss at the bottom) | Nothing to write. |
| B | **A thin thread:** a reason to go down, told in a few lines at the start and the end; notes found on levels; rooms and regions with names and a history *(my pick)* | Writing, and a page for notes. Notes in a generated level are placed by rules. |
| C | **A told story:** characters, talk, quests | Talk and quests need a dialogue interface and written content, and fit badly with generated levels (**L**). |

**Why B:** the map already tells a story (crypts, barracks, the king's halls). A thread ties the
regions together and gives the end weight, for little.

## 7. Where it's played

| | Option | Costs and consequences |
|---|---|---|
| A | **Big screens only.** Phones not supported | The interface is designed once. Drawing budgets are set by laptops. |
| B | **Big screens first; phones fully playable** with a layout of their own, designed after the big screen's *(my pick)* | The interface is designed twice, the phone's simpler. Drawing budgets are set by phones (part 10), which limits level size, lights and shadows. |
| C | **Both alike:** every part designed for both from the start | The most interface work, every decision twice (**L**). |

**Why B:** the proof of concept already runs on phones and was tuned for them. Dropping them
throws that away. But the map and the ledger read best on a big screen, so that is where design
starts.

## 8. Sound

| | Option | Costs and consequences |
|---|---|---|
| A | **None:** the noise words on the map are its sound *(my pick)* | Nothing. The words are already part of the look and of the stealth. |
| B | **A little:** a quiet ambience per region, a few sounds (steps, blows, doors), the words kept | Sounds found or made, licensed, and mixed. I can wire sound in but can't judge how it sounds. That would be yours, or someone's you trust. |
| C | **Sound and music** | B plus music: commissioned or licensed (**L**, and outside what I can make). |

**Why A:** the words on the map are an unusual and fitting stand-in for sound. B can be added
later without changing the design, since sounds would follow the words.

## 9. Saving

| | Option | Costs and consequences |
|---|---|---|
| A | **One run saved on leaving, gone on dying** (as roguelikes do) *(my pick)* | Everything about a run has to be plain data (part 0). Cheap if designed so from the start. The save is kept in the browser. |
| B | **No saving** (as now) | Only fits a short run (3A). A closed tab loses the run. |
| C | **Saves at will** | Undoes death, and with it what a roguelike is. Same work as A. |

## 10. How we work

As written in `README.md`:
- the spec in rounds;
- proposals with critique;
- you decide;
- mockups only where a decision has to be seen;
- nothing built until the go.

The question is whether small throwaway **experiments** are allowed when a question needs
measuring (for example how big a level a phone can draw). *My pick: yes.* They are reported and
never go into the game.

## 11. The spec's parts

The parts in `README.md` (0 to 11), and the order of rounds. Anything missing, or to merge or
split?
