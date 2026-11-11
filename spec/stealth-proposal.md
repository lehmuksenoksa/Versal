# Stealth: a proposal

Asked: "Please make a comprehensive proposal for stealth, based on our discussions, stealth gameplay
best practices (taking into account the unique nature of old school roguelikes) and your own
thoughts and criticism."

Nothing here is decided except what is marked **decided**, with your words. Numbers are test values.
When you have decided, this replaces `stealth.md` (written before the light rebuild) and the
stealth notes in `sight.md`, and becomes the plan for feature set 2 (`groundwork.md`, section 4).

Read sections 1 and 9 first if you are short of time: the proposal in short, and the questions.

## 1. In short

**The rules, in seven sentences.**

1. You have two controls: the **lamp** (how lit you are) and the **pace** (how loud you are).
2. A monster **senses** you by sight (its Vision and Dark vision, as built) or by hearing; what it
   gets is nothing, a **guess** at where you are, or the sight of you.
3. A glimpse or a sound only ever gives a guess: the monster turns **suspicious** and comes to look,
   and it can be led about that way for as long as you like.
4. Seeing you is not yet knowing you: **noticing takes time**, a turn for a calm monster, less for a
   roused one, twice as long in dim light or at the edge of its sight.
5. A monster that has noticed you is **alert**: it shouts to its side and comes for you. One that
   loses you **searches**, then stays **wary**.
6. A blow on a monster that isn't alert is a **sneak attack**: it can't miss, does three times its
   full damage, and if it kills, it kills quietly.
7. Nothing is thrown for any of it. The same situation gives the same result; only your own items
   and perks can add a chance, in your favour.

**What comes out of those rules without more rules:**

- *Calm ones you creep up on; roused ones you wait for.* If you step into a monster's sight, it has
  your whole step to notice you. If it steps into yours, you act first. So a corner, a doorway or a
  dark pocket on a lured monster's path is an ambush, with no new action to learn.
- *In its sight, be quick; out of its sight, be quiet.* Running is how you cross a lit gap; sneaking
  is how you pass in the dark.
- *Goblins own the light, vermin own the dark.* The sight numbers already built make two families of
  danger with opposite answers, and the lamp is the switch between them.

**The five things I would change in what is written or built today:**

1. Retire the hidden 0-to-1 awareness meter in the game and the instant mood moves in `stealth.md`
   for one short clock per monster: its noticing time.
2. Moods no longer change how far a monster sees. Light and its kind decide how far; its mood
   decides how quickly it makes up its mind and what it does about it.
3. A limit on luring, so pulling a group apart one by one is not the best and dullest way to play.
4. Sneak attack damage certain, and told before you strike, so a "stealth kill" that doesn't kill is
   your mistake and never the dice's.
5. Show more than "its tip only": name the cause every time you are noticed, and mark a monster's
   mood on the map. How it is drawn is yours to decide.

## 2. What is decided, and kept

From `04-systems.md`, `fighting.md`, `round38-monster-states.md`, `sight.md`, `06-levels.md`:

- **Two controls** (yours: "B, two controls: lamp and pace"): sneaking, walking, running.
- **The dark is not invisibility** (yours: "Player shouldn't turn undiscoverable by turning of their
  lamp. In the dark, player should be able to sneak next to a monster without automatically being
  seen. In the dark, an alert monster should be able to attack a player.").
- **Stealth kills** (yours: "No, we need those stealth kills. Also we need room for things like
  Potion of Invisibility"); **a glimpse allows one** (yours: "Glimpse should allow stealth attack").
- **Luring** (yours: "This should be used to lure single enemies away from groups as well." and "I
  think a player should be able to lure a monster with glimpses. So only clearly seeing should turn
  alert. But this needs to be tested as well.").
- **Certain** (yours: "Maybe items and abilities could affect chance?"): monsters never throw dice
  to sense you; your items and perks may.
- **Asleep** (yours: "Sleep > Vision 0, Hearing halved"); sleepers wake to noise and to dark
  becoming light.
- **No facing** (yours: "Monsters do not have a heading, they can't see only one way").
- **Sides** (yours: "An alert goblin should alert other goblins nearby, not all goblins on the map.
  An alert goblin maybe shouldn't rouse a nearby rat to attack player as well."); no chains of
  shouts; a gong is the one big sound.
- **The ladder of moods:** calm, suspicious, alert, searching, wary.
- **Kinds differ** (yours: "Different monsters should behave a bit different as well. But maybe this
  can be done later.").
- **Actions take ticks**, 100 to a turn: a sneaking step 150, a walking step 100, a running step 60;
  monsters fast 60, normal 100, slow 150. "No stamina, only loud".
- **A sneak attack** always hits and does three times the damage (a dagger four).
- **Noticing through time** is your idea (yours: "can we tie this somehow into movement and/or
  timing. I envision someone pursuing player, player hiding behind a corner, and then stealth
  attacking a pursuer when they appear from around the corner. Or stealth attacking a lured monster
  when they move close by. Maybe noticing the player takes a while? Super fast player could step
  into the light and stealth kill the first enemy from a group before it notices"). Section 5.3
  makes it exact.
- **Built already:** round distances and one line of sight for light, you and the monsters; light in
  two bands; each kind's Vision and Dark vision in three bands (clear, kind, glimpse); light-shy
  kinds; dim light halving Vision. The run's experience already pays for sneaking past a monster and
  for each sneak attack, beside the little a kill gives (`03-the-character.md`).

## 3. What good stealth needs

### From stealth games

1. **You can read the watcher and yourself.** The games that last (Thief, Mark of the Ninja,
   Invisible, Inc.) tell you how exposed you are and what each guard thinks. Thief did it with two
   channels, light and sound, which is exactly your two controls. When the player can't tell why
   they were seen, certain rules feel like bad luck.
2. **Failure comes in steps.** Suspicion before alarm, a moment to react before the shout, a search
   that can be escaped. Being found should start a new problem, not end the plan.
3. **Guards are fair, a little slow, and they say what they think.** "What was that?" is a rule
   told aloud. They may forget, but something should stay changed.
4. **You act on them, not only round them.** Lures, noise, putting lights out: the player leads the
   guards. Hiding alone is waiting.
5. **A reward for the hunter.** The silent kill is the payoff for the set-up.
6. **Places with more than one way.** Loops, cover, light in a pattern (`06-levels.md` has this).

### What an old-school roguelike changes

1. **No reloading.** A run is lost on death, so being found must be survivable more often than not:
   somewhere to run, a door to shut, a search that gives up. A stealth failure that is always a
   lost run would teach players never to sneak.
2. **Time is free unless something makes it dear.** In a turn-based game waiting costs the player
   nothing, so anything that resets by waiting will be waited out, and the best play becomes the
   dullest. Our answers are oil and dread (`light-and-dread.md`), and consequences that don't reset.
3. **The level is made by dice.** No designer places each guard, so the rules themselves must make
   the situations, and the generator must check what it made (a sneaking route, room to lure).
4. **The player counts squares.** Turns and squares can be counted, and players will. The rules
   should be simple enough to count: "one step in its sight", "three squares of dark".
5. **The best play must not be the dullest.** Roguelikes have a long record of this going wrong:
   fighting in doorways, dancing round pillars, pulling monsters one at a time. Section 5.4 has a
   limit for the one we are inviting.
6. **The same rules both ways.** Old practice: what you can do to a monster, it can do to you. A
   spider lying in wait in the dark is the price of walking with the lamp out (question 10).
7. **Death teaches.** With no reloads, the log is the teacher: each time you are noticed, it should
   say by whom and how.
8. **Stealth is one way, not the way.** The loud run must stay playable; sneaking past must pay as
   well as killing. The experience table already does this.
9. **The conveniences must behave.** Exploring, travelling and resting by one key must never change
   your pace or lamp, and must stop at the first sign of anything.

How others have done it, as I remember them: Brogue has one noticing distance, halved when you keep
still and doubled when you fight, and triples the damage of a blow on a monster that hasn't noticed
you; Crawl puts most monsters asleep and lets noise wake them, with daggers best at stabbing; Sil
gives every monster a state (asleep, unwary, alert) that the player can look up. All three use dice
for noticing. We don't, which makes showing the player enough even more important.

## 4. Where the specs and the game disagree today

| | `stealth.md` (before the rebuild) | The game today | Proposed |
|---|---|---|---|
| Distances | Steps, a diagonal as one | Round | Round, as built |
| A monster's sight | One range `V`, changed by its mood | Vision and Dark vision in three bands, by kind | The bands, as built; mood changes no range |
| Becoming alert | At once, on a clear sighting | A hidden meter filling by sight and sound | A clock: its noticing time, filled only by seeing you |
| A glimpse or sound | Suspicious, never alert | Adds to the meter, so enough of them make it alert | Suspicious, never alert |
| A meter | "No awareness meter as such" | Yes, hidden (round 38: "a meter, hidden") | One short clock, a turn or two at most |
| Controls | Lamp and pace | One: lamp out means sneaking | Lamp and pace |
| Telling others | Shouts by side, heard like any sound | The pack turns with it | Shouts by side |
| Sneak attack | On a calm or wary monster that doesn't sense you | Asleep, calm, or suspicious with a glimpse at most | On any monster that isn't alert |

## 5. The proposal

### 5.1 Your two controls

- **The lamp:** lit or out. Lit, your square is lit, so every kind's Vision reaches you; out, you
  are as lit as your square. A lit lamp is also seen as a glow from further than you are: a monster
  with a line to you gets a glimpse out to twice the reach of its Vision (test).
- **The pace:** sneaking (150 ticks, half as loud), walking (100, the measure), running (60, twice
  as loud). The pace changes sound and time and nothing else. One key steps through them; the
  ledger shows it.
- **Items and perks** work on those two numbers, as decided: how lit you count as (a cloak of
  shadows: one level darker), how loud (boots of silence: one pace quieter), or what a sighting is
  worth (a potion of invisibility: never more than a glimpse, and only next to you). With later sets.

The fast pace needs another name than "running": the game already calls walking on by Shift
"running" (`groundwork.md`, section 8). Proposed: **hurrying** (question 11).

### 5.2 What a monster senses

**Sight**, exactly as built in the light rebuild (`light-rebuild.md`): a line to you, and by the
light on your square its Vision (lit), half its Vision and never clearly (dim) or its Dark vision
(dark), each in three bands. Light-shy kinds the other way round. So a sighting is one of:

| The band you are in | Called | What it is worth |
|---|---|---|
| Clear | It sees you well | Its noticing clock runs |
| Kind | It sees you | Its noticing clock runs at half speed |
| Glimpse | It glimpses something | A guess, and never more |
| None | Nothing | Nothing |

That gives the "clear" distances a use, which they don't have today, and gives dim light a second
meaning: everything takes twice as long to notice you there.

**Hearing**, as decided: a monster's Hearing is how far it hears a walking step. Each sound has a
loudness that multiplies it; sound travels step by step round corners, a door on the way counts as
3 steps and a wall as 6. A sound gives a guess at the place it was made. Loudness (test): a
sneaking step ½, a walking step 1, a hurrying step 2, a door 1½, a thrown stone 1½, a blow 3, a
shout 4, a gong 10. Loud and quiet floors (rubble, water; moss) come with the features set.

**What it is doing dulls it**, as decided: asleep, it sees nothing and hears half; at a campfire, it
has no Dark vision; at work or eating, it hears half.

**One rule for the roused.** A monster that is suspicious, searching or alert is feeling about for
you: next to it, it sees you whatever the light. This is the ladder's "in the dark it sees the
player right next to it" as one rule, and it is what lets an alert monster fight you in the dark.
A calm or wary monster has only its bands.

### 5.3 What it makes of it: noticing takes time

A monster knows one of three things about you: nothing; a **guess** (a place); or **you**.

- **A glimpse or a sound gives a guess, at once.** A calm or wary monster turns suspicious. Glimpses
  and sounds never add up to more: each only moves the guess.
- **Seeing you starts its noticing clock.** While the clock runs, the sighting counts as a glimpse:
  it is suspicious, its guess is where you are. When it has seen you for its **noticing time**, it
  knows you: it is alert.
- **The noticing time** (test), by its mood when it began: calm 100 ticks; suspicious or wary 60;
  searching 30. Slow-witted kinds twice that (zombie, troll), quick ones half (bat; dark elves
  later). In the kind band or in dim light the clock runs at half speed.
- **The clock runs back** as fast as it ran, while it doesn't see you. So peeping in and out of
  sight doesn't cheat it, and doesn't add up either.
- **On a tie, you act first.** A calm goblin needs 100 ticks; your walking step takes 100; the blow
  that follows is a sneak attack.
- **Only time in its sight counts.** If you step into its sight, the clock runs for the whole of
  your step. If it steps to where it can see you, the clock starts from nothing, and you act next.
- **Touch is knowing.** A monster that walks into you, or is struck and lives, is alert at once.
- **Once it knows you, it keeps you** for as long as it senses you at all, a glimpse included. It
  loses you only by sensing nothing (section 5.4).

What you can count on, which is what the player will learn:

| Against | In its clear sight you have | In dim light, or at the edge of its sight |
|---|---|---|
| A calm monster | 1 walking step or 1 hurrying step; no sneaking step | 2 walking, 3 hurrying, 1 sneaking |
| A suspicious or wary one | 1 hurrying step | 1 walking, 2 hurrying |
| A searching one | Nothing: let it come to you | 1 hurrying step |

Every one of those sightings still leaves it suspicious. Crossing a lit gap in a goblin's sight is
never free: done quickly, it costs you a goblin coming to look; done slowly, a shout.

**Why a clock and not the meter we have.** The meter in the game mixes four things (sight, distance,
sound, time) into one hidden number, so neither of us can say what a step will do. The clock is
filled by one thing, in a unit the player already counts in. It is still hidden, as you wanted
("It shouldn't be clearly shown... It's something the player learns through play"), but it is short
and its start can be seen (section 5.9).

### 5.4 The moods, and what each does

| Mood | What it knows | What it does | Leaves it when |
|---|---|---|---|
| Calm | Nothing | What it was found doing (`round38-monster-states.md`) | A glimpse, a sound, a sighting |
| Suspicious | A guess | Goes to the guess, alone and silent; looks about there for 5 turns (test) | It notices you (alert); it finds nothing (wary, and back to its place) |
| Alert | You | Shouts once, then acts by its kind: comes for you, shoots, flees to its side | It senses nothing for its persistence (searching) |
| Searching | A guess | Goes to where it last sensed you and looks round, 10 turns (test); those who tend lights relight them | It notices you (alert); it finds nothing (wary) |
| Wary | Nothing | Back to its place; notices quicker; no longer goes to look alone | After 40 turns (calm), or never on this visit (question 5) |

- **Persistence**, as in `stealth.md`: for so many turns after it stops sensing you an alert monster
  still follows your true path; then it has only its guess. Dull kinds 0, most 1, hunters 2 or 3.
- **Shouting takes its turn** (proposed): a monster that has just noticed you spends its next action
  shouting, and neither moves nor strikes with it. Beasts, vermin and the dead don't shout; they
  come at once. This is the moment to react that stealth games give: one action to kill it, shut a
  door or run. A monster killed while still noticing never shouts at all.
- **The limit on luring** (proposed). As decided, a suspicious monster comes alone and doesn't call
  the others, so one can be drawn off and killed. Left at that, the best way through every camp is
  the same: draw one, kill it, draw the next. So:
  - a monster of a group that goes off and isn't back in 10 turns (test) is **missed**: the rest of
    its group turn wary;
  - a wary monster that turns suspicious doesn't go alone: the nearest of its group goes with it.

  A group can be thinned by one for nothing. After that they come in twos: one for your ambush, and
  one that sees it done.
- **What a monster does when suspicious differs by kind** (section 5.8): some go to look, some stand
  and watch, some ignore it.

### 5.5 Sneak attacks, and lying in wait

- **A sneak attack is a blow on a monster that isn't alert:** asleep, calm, wary, suspicious, or
  searching for you. That is simpler than today's rule and takes in the pursuer who has lost you.
- **It can't miss, and its damage is certain** (proposed): the weapon's full damage, three times
  (a dagger four), with no throw. Looking at the monster tells you beforehand whether such a blow
  would kill it.
- **A kill by sneak attack is quiet** (proposed): as loud as a sneaking step. A sneak attack that
  doesn't kill is as loud as any blow, and the monster is alert.
- **Lying in wait is standing still.** There is no new action. By section 5.3, a monster that steps
  up to you has not begun to notice you when your turn comes, and you act first. So:
  - a lured monster walks to its guess and you strike it as it arrives;
  - a pursuer comes round the corner you are standing behind and you strike it;
  - in the dark, a goblin that only glimpses you can be struck whenever you like.

  What you must not do is step toward a roused monster: then it has your whole step to notice you.

```
The corner.            The goblin (g) is alert and chasing. You (@) go round the corner into
                       the dark and stand still.
  #########            1. It loses you. For 1 turn it still follows your true path, then it has
  .....g..#               only a guess: it is searching.
  ######..#            2. It comes round the corner and stops next to you. It stepped; its clock
       #@.#               starts from nothing.
       #..#            3. Your turn comes first. Your blow is a sneak attack.
```

### 5.6 Sides, shouts and gongs

As decided, with shouting taking the shouter's turn (5.4):

- A shout is a sound with a side. The same side within its reach is **roused**: searching, its guess
  the shouter's place. Another side hears a noise: suspicious. Kinds that ignore noises do nothing.
- Only a monster that noticed you itself shouts; the roused don't pass it on.
- A gong or a bell is the one big sound, placed on purpose. Tripwire bells as in `features.md`.
- Being roused by a shout doesn't tell them where you are, only where the shouter was. You have the
  time it takes them to come.

### 5.7 Being found, and getting away

Being found should be a new problem with several answers:

- **Kill the one that saw you** before it shouts: one action, if you are next to it.
- **Break its sight and be quiet** for longer than its persistence: it goes to where it lost you,
  and you are somewhere else, or behind the corner.
- **Shut a door:** sight is cut and sound muffled; a monster needs its turn to open it (the game
  already has a chance that a chasing monster fails).
- **Go where it can't see:** a goblin loses you in the dark at three squares; a spider loses you in
  the light.
- **Leave by the stairs:** as decided, monsters next to you follow.
- **Fight:** the loud run has to stay playable.

What stays changed afterwards: the group is wary (question 5), lights are relit, and whoever was
roused is standing somewhere new.

### 5.8 Kinds differ

One row of behaviour per kind, in `monsters.json` beside the sight numbers. Proposed for the kinds
in the game now (all test; Hearing in squares for a walking step):

| Kind | Hearing | Notices | Persistence | When suspicious | When alert | Shouts | Tends lights |
|---|---|---|---|---|---|---|---|
| Goblin | 3 | As any | 1 | Goes to look | Comes for you; flees when hurt | Yes | Yes |
| Goblin warrior | 3 | As any | 2 | Stands its post and watches; turns wary | Comes for you | Yes | Yes |
| Goblin king | 4 | As any | 2 | Sends the nearest goblin to look | Stays among its guard | Yes | No |
| Cultist | 3 (half at work) | As any | 1 | Goes to look | Comes for you | Yes | Yes |
| Skeleton | 3 | As any | 3 | Stands | Comes for you, never gives up quickly | No | No |
| Zombie | 2 | Slow | 0 | Goes to any sound, however often | Comes for you | No | No |
| Rat | 4 | As any | 0 | Ignores it | Comes only with others of its kind near | No | No |
| Bat | 6 | Quick | 0 | Ignores it | Flits in and out | No | No |
| Spider | 4 | As any | 1 | Stays where it is, waiting | Comes for you; won't step into light | No | No |
| Giant spider | 4 | As any | 2 | Stays where it is, waiting | Comes for you; won't step into light | No | No |
| Troll | 2 | Slow | 3 | Ignores it | Comes for you | No | No |

Three behaviours worth having from the start, because each makes a different problem:

- **The one that won't be lured** (the warrior on guard): it must be gone round, or its light put out.
- **The one that is always lured** (the zombie): a tool as much as a danger.
- **The one that waits** (the spider): light-shy kinds don't step onto lit squares unless alert, and
  then fight worse there (with the fighting set). Your lamp is a wall to them; your oil is its price.

This also settles the weak points noted after the rebuild: skeletons and zombies see you next to
them in the dark, which ruled out sneak attacks there; with noticing time, a walking step up to one
is still in time. Later: tracking by smell for wolves and hounds, who then follow your path however
dark it is.

### 5.9 What the player is told

The rules are certain, so what is shown decides whether they feel fair. Proposed, least first:

1. **Yourself.** The ledger shows your pace, and a word for how lit you are (lit, dim, dark). The
   map already draws the light you stand in.
2. **Every change of mind is a line in the log,** for a monster you can see or hear: "The goblin
   looks up." "The goblin comes to look." "The goblin shrugs and goes back to the fire." "The goblin
   sees you!" "A shout, to the north."
3. **The cause is named when you are noticed:** "The goblin sees you in the firelight." "The rat
   hears your step." "The spider feels you next to it." This is the teaching the genre does through
   death; without it the hidden clock is only a mystery.
4. **A monster's mood on the map.** Round 38 decided "in its tip only" with "Animation for some
   states, looking at it for all". I think that is too little for certain rules: the player must
   look at every monster every turn to play well. Three ways to show it, to try in the test room:
   A, the tip and the log only; B, a small mark by the letter for suspicious and for alert; C, the
   letter leans toward where it thinks you are, which would also show its guess. Note the "?" is
   taken: it already means "something is there" in the dark. This is a visual decision and yours
   (question 6).
5. **Before a blow,** the tip says if it would be a sneak attack and if it would kill.
6. **Looking at a monster tells its senses in words:** "Sees well by light, poorly in the dark.
   Sharp ears. Slow to notice." No numbers; the numbers are learned.
7. **Sounds you hear** from things you can't see, marked where they came from: steps, snoring, talk
   at a fire. In the dark, sound is most of what you know. How it is drawn: yours.

### 5.10 Your tools

| | In this set | Later |
|---|---|---|
| The lamp, lit or out | Yes | Oil (set 3) |
| The pace | Yes | |
| Standing still to ambush | Yes | |
| Doors: shut to cut sight and sound | Yes, as built | Locks, barricades (features) |
| A glimpse as a lure | Yes | |
| A thrown stone: a sound where it lands | Proposed here (question 9) | Other things thrown |
| Putting out and relighting lights | Proposed here (question 9) | Lights as items (set 3) |
| Cloak, boots, potions, perks | | Contents, character |

### 5.11 What levels must give

`06-levels.md` has the list (light in a pattern, things that break sight, loops, room to lure,
somewhere to retreat, reasons to take risks) and the decision that most levels have a sneaking
route. With these rules the generator can check more exactly, by the rules themselves:

- lit gaps on the sneaking route are one square across in clear sight of a calm watcher, two in dim;
- every group has a dark place within a glimpse of one of its members and out of sight of the rest;
- a dark pocket or a door within a chase's reach of each group;
- a bot that only sneaks reaches the stairs on 9 levels in 10 (the number you chose to start with).

## 6. Three examples

**The camp.** Three goblins sit by a campfire (lit to 3, dim to 5). At the fire they have no Dark
vision. You come up in the dark, lamp out, sneaking.

- Past the dim edge you are neither seen nor heard.
- You step onto the outermost dim square, 4 from the nearest goblin. Dim halves its Vision: it
  sees you there, but slowly (200 ticks to notice; your sneaking step took 150). "The goblin looks
  up." You step back behind the rock and stand still; it has lost sight of you and has only a
  guess. It comes to look, alone. It walks up; you act first; the blow would kill, and does,
  quietly.
- Ten turns on, it is missed. The other two turn wary. The next thing they glimpse, both come.
- If instead you hurry straight in from the dark to strike one at the fire: two dim squares and two
  lit ones are 240 ticks in their sight (the dim ones at half speed: 180 against the 100 it needs),
  and your steps are heard at 6. Noticed before you arrive.

**The gap.** A lit corridor mouth, two squares wide; a goblin warrior on guard 7 squares down it.
At 7 you are at the edge of its sight: 200 ticks to notice. Two walking steps take 200: across, and
only glimpsed. It turns suspicious, but warriors stand their post: it watches, and turns wary.
Sneaking across takes 300: "The goblin warrior sees you in the torchlight!" It shouts.

**The spider.** A giant spider waits in a dark hall. With your lamp out it sees you at 5 and you see
it at 3. With your lamp lit you see it at 5, and it is dazzled: it only glimpses you, within 4, and
it won't step into your light. You cross with the lamp burning, and the goblins in the next room
see the glow.

## 7. My criticism

Of what we have, and of this proposal.

1. **Two specs and the game disagree** (section 4). Feature set 2 can't start until one model is
   chosen. This is the largest point; the rest are details by comparison.
2. **The lure loop.** Luring by glimpses, as decided, is the strongest and safest tactic, and with
   no limit it is always right. I have proposed a limit (5.4). It narrows something you asked for,
   so it is yours to accept.
3. **Waiting is free.** Wary for 40 turns will be waited out by holding a key. Either wary lasts,
   or the clocks must bite. And the clocks (oil, dread) are in set 3, after stealth: until they
   exist, sneaking everywhere with the lamp out costs nothing, and stealth will feel safer and
   slower than it should. I would not tune stealth's numbers finally before set 3.
4. **A stealth kill that doesn't kill** is the worst moment in the game: a loud blow, an alert
   monster, and it was the dice. Certain damage and a word beforehand fix it (5.5). The price:
   sneak attacks are the one blow without a throw.
5. **A blow is loud (3).** As written in `stealth.md`, every kill is heard by everything within
   three times its Hearing, so each "stealth kill" would bring the room. Hence the quiet kill.
6. **Hurrying is very good for running away:** 60 ticks to a step outruns every normal monster,
   with noise the only cost ("No stamina, only loud"). It works if fast monsters are common enough
   to be the answer (wolves, bats) and if noise really brings trouble. To watch in play.
7. **No facing** costs the genre's best-known move, coming up from behind. I think it is right for
   a grid, and that what a monster is doing (at the fire, at work, asleep) replaces it well. But it
   puts all the weight on light and time, so the lights on a level have to be placed well. The
   generator's checks (5.11) matter more than in a game with cones of sight.
8. **Sneaking is wrong in the light.** By these rules a sneaking step into a calm monster's sight
   is always noticed, and a hurrying one isn't. I think that is a good rule and easily said (in its
   sight, be quick), but it will surprise players once. The log's cause line covers it.
9. **Hidden moods.** Certain rules with hidden state feel like dice. I would show the mood (5.9).
10. **The "?" is spoken for** by the dark; a noticing monster needs another mark.
11. **Too many numbers** is the risk in my own proposal: three bands, three paces, three noticing
    times. The test is whether section 1 still says it all after play. If not, the first to go is
    the half speed in the kind band.
12. **The same rules both ways** isn't in the plan. Monsters that lie in wait should get something
    for it, or the dark costs nothing but dread (question 10).
13. **The weak sight numbers** from the rebuild remain to tune (bat, cultist, troll).

## 8. Numbers (all test)

| | |
|---|---|
| Paces | Sneak 150 ticks, loudness ½; walk 100, 1; hurry 60, 2 |
| Loudness | Door 1½; stone 1½; blow 3; quiet kill ½; shout 4; gong 10 |
| Sound on its way | A door 3 steps, a wall 6 |
| Noticing time | Calm 100 ticks; suspicious, wary 60; searching 30; slow kinds twice, quick half |
| Half speed | In the kind band; in dim light |
| Timers | Looking 5 turns; searching 10; wary 40 or the visit; missed after 10 |
| Lamp's glow | A glimpse to twice the Vision's reach |
| Sneak attack | Full damage three times; a dagger four |
| Hearing, persistence | By kind, section 5.8 |
| Monsters' speeds | Today each kind has its own (a goblin three steps to your four, a zombie about one to your three); the ticks of `fighting.md` (fast 60, normal 100, slow 150) come with this set's first step, and change who outruns whom |

Gone from `tuning.json` when this is built: the awareness numbers (`sight`, `near`, `sightDark`,
`nearDark`, `hear`, `ebb`), the senses by state, `calm` and `lose` of the chase, and lamp-out as
sneaking.

## 9. Questions for you

Each with my pick first.

1. **How noticing is counted.**
   - A (my pick): in ticks of being seen, as section 5.3. Speed matters exactly as you pictured.
   - B: in the monster's own looks: a calm one needs two turns of its own seeing you, a roused one
     one. Simpler to say; quick monsters notice quicker of themselves; your own speed matters less.
   - C: at once, as `stealth.md`. No ambush of a pursuer, no dash.
2. **Lying in wait.**
   - A (my pick): standing still, no new action (5.5).
   - B: a held blow that strikes of itself when something steps up. Surer, but it strikes things
     you might not want struck, and it is one more key.
3. **Sneak attack damage.**
   - A (my pick): certain, told beforehand, and a kill is quiet.
   - B: thrown like any blow. Keeps one rule for all blows; brings back criticism 4.
4. **The limit on luring.**
   - A (my pick): the missed one makes its group wary; wary ones come in twos.
   - B: no limit, as decided so far. Simplest; see criticism 2.
   - C: each monster can be lured once; after that it only watches. Harder to read.
5. **After an alarm.**
   - A (my pick): a monster that has been alert stays wary for the rest of your visit to the level;
     one that was only suspicious is wary for 40 turns.
   - B: 40 turns for both.
6. **Showing moods on the map** (visual, yours): the tip and log only; a mark; a lean. I would
   draw B and C in the test room for you to try, with a mark that isn't "?".
7. **Shouting takes the monster's turn?** My pick: yes.
8. **A diagonal step** (you left this open): my pick is one step, as now, and as nearly every
   roguelike does. A turn and a half matches the round distances, but your step and the monsters'
   fall out of time with each other, so a goblin seems to get two moves for one of yours, and the
   squares stop being countable. The cost of keeping it: going diagonally is quicker over ground,
   for you and for them alike.
9. **Brought forward into this set:** putting out and relighting lights (`light-and-dread.md`,
   section 5, already decided in shape) and stones to throw. My pick: both. They are the two tools
   that make stealth something you do and not only somewhere you stand. Stones would be things
   found (in rubble, in sacks), not an endless supply.
10. **Monsters ambushing you:** a monster you haven't seen that strikes you from the dark does more
    (my pick: half as much again, with the fighting set; never three times).
11. **The fast pace's name:** hurrying (my pick), dashing, or keep running and rename the Shift walk.

## 10. Building it

As the light rebuild: each step's rules as tests first, then the rules, then the look, then you
play it in the test room. The behaviour lock is re-recorded at each step; saves may break.

| Step | What | You can try |
|---|---|---|
| T1 | Pace and lamp as two controls; ticks for steps; the ledger | Walking, sneaking, hurrying |
| T2 | Hearing: sound step by step, loudness, guesses | A room with a door and a listener |
| T3 | What it knows, the noticing clock, the five moods and their timers; the meter goes | A goblin in a lit hall; the gap |
| T4 | Sneak attacks: not alert, certain, quiet kill; ambush by standing still | The corner |
| T5 | Sides and shouts; the missed one; wary in twos | The camp |
| T6 | Kinds: the behaviour table | One room for each behaviour |
| T7 | What you are told: log lines, causes, tips, and the mood's look once chosen | All of the above |
| T8 | Lights out and relit; stones (if question 9) | A torch to put out, a stone to throw |
| T9 | The generator's checks and the sneaking bot; the full game | The game |

**Checks to keep as tests** (replacing the 8 in `stealth.md`):

1. With no chance effect, the same situation gives the same result every time.
2. Glimpse after glimpse, sound after sound: the monster stays suspicious, its guess following.
3. A calm goblin in light: one walking step into its sight, then a blow: a sneak attack. Two steps,
   then a blow: it is alert and has shouted.
4. The same at the edge of its sight or in dim light: two walking steps are in time.
5. A sneaking step into a calm goblin's clear sight: noticed. A hurrying step: not.
6. A monster stepping up to a player who stands still: the player's blow is a sneak attack,
   whatever the monster's mood, unless it already knew them.
7. An alert goblin next to the player in the dark keeps them; three squares off in the dark and
   unheard, it loses them after its persistence, and goes to where it last sensed them.
8. A goblin shouts: a goblin in reach through an open door is roused and goes to the shouter; a rat
   beside it does nothing; a cultist turns suspicious; the roused goblin doesn't shout.
9. A goblin killed while its clock runs never shouts.
10. A sneak attack that kills is heard no further than a sneaking step; one that doesn't, as a blow.
11. One goblin lured from three and killed: after 10 turns the other two are wary; the next glimpse
    brings both.
12. A sleeper in a dark room wakes when a lamp is carried in; in a lit room it doesn't wake from
    the light. Asleep, it hears half.
13. A walking step is heard at a goblin's Hearing, less through a door, less still through a wall.
14. A warrior on guard that glimpses the player doesn't leave its post; a zombie goes to every sound.
15. A spider doesn't step onto a lit square while it isn't alert.
