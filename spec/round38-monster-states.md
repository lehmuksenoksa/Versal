# Round 38: monsters' states, shallow

**Answered.**
- **States.** Here: asleep, patrolling, at a campfire, at work, wandering, lying in wait, dormant,
  caged or chained, fighting something else, fleeing. Maybe: on guard, eating. Out: dozing.
  "Monsters do not have a heading, they can't see only one way." So no facing: a guard at a post
  sees all round it, and "get behind it" isn't a way past.
- **How aware: a meter, hidden.** "It shouldn't be clearly shown, but here we need different
  states and different monsters to have different range of vision, dark-vision and hearing. It's
  something the player learns through play."
- **What wakes a sleeper: noise, and dark becoming light.** A change from dark to light wakes it;
  a sleeper in a room that's already lit isn't woken by the light.
- **How you know a state: in its tip only.** "Animation for some states, looking at it for all."
  No mark on the map.
- **Alarms: raised by alarms, but not level-wide.** "Alarms shouldn't be level wide, maybe X steps
  from the bell/gong/etc and we need to consider their effect on all the monsters on the level:
  does a goblin gong rouse spiders, for example?"

Your hierarchy (`content-model.md`): a room has "a set of enemies in certain state". Already
decided: monsters search where they last saw or heard you and follow noises; guards keep posts and
patrols walk rounds (duties, round 16); sleepers wake to an alarm (round 2); minds are small sets
of states with clear rules (round 2). This round: the states a monster can be found in, and four
rules about them. Which monster is found in which state comes with generation.

## The states a monster is found in

How it is when you first come upon it. Each changes what sneaking past or fighting it is like.

| State | What it means for you | My pick |
|---|---|---|
| Asleep | Hears only loud noise: pass it, or strike first | Here |
| On guard | At a post, watching one way: get behind it (a duty, round 16) | Here |
| Patrolling | Walks a round: learn it, slip through the gap (a duty, round 16) | Here |
| At a campfire | Sitting, talking, looking at the fire: half blind to the dark | Here |
| Eating | Busy, back turned; maybe on a body | Here |
| At work | Digging, forging, praying, hauling: busy and noisy | Here |
| Wandering | Roams with no post: turns up anywhere (the wanderer role) | Here |
| Lying in wait | Still and hidden until you're close (the ambusher role) | Here |
| Dormant | Not alive until woken: golems, armour, bone heaps, statues | Here |
| Caged or chained | In pens or cells: harmless until let out, then on whoever's near | Here |
| Fighting something else | Another monster or a stranger: wait, or join in | Here |
| Fleeing | Wounded, running for help: stop it, or the alarm comes (the alarm-raiser) | Here |
| Dozing | Half asleep: quiet steps pass, any noise wakes it (between asleep and awake) | Maybe |

## How aware a monster is

Once it's in the level with you, how many steps between not knowing and knowing.

| Option | What | |
|---|---|---|
| Two steps | Unaware, or alert. Simple to read. |  |
| Three steps | Unaware, suspicious (it heard or glimpsed something and comes to look), alert. Then searching, when it loses you (round 2). | my pick |
| A meter | A number that rises and falls with what it senses, shown for each monster. |  |

**Why three:** "suspicious" is where stealth lives: the moment you can still get away, and a stone thrown elsewhere can turn it. Two steps make every slip a fight. A meter is precise but asks the player to read numbers on every monster, and the ink map has little room for them. **Costs:** one more state per mind; cheap.

## What wakes a sleeper

Besides an alarm (round 2).

| Option | What | |
|---|---|---|
| Noise | Only noise: a loud floor, a fight, a shout. |  |
| Noise and light | Noise, or your light falling on it. | my pick |
| Noise, light and time | Also waking by itself after a while. |  |

**Why noise and light:** it ties sleepers to the lamp (round 3: light draws eyes): to pass a sleeper you go quiet and dark, or risk it. Waking by itself adds a clock to every sleeper, which oil already is.

## How you know a monster's state

The look of it is a visual decision, yours later (part 8). This is only whether it's shown.

| Option | What | |
|---|---|---|
| A mark on the map | A small mark by each monster you can see (asleep, suspicious, alert), and the state in its tip. | my pick |
| In its tip only | Shown only when you look at it. |  |
| Not shown | Read from how it moves and the log. |  |

**Why a mark:** stealth needs to be readable at a glance, or a sneak feels unfair. Its look is yours to decide with the visual language.

## A level-wide alert

Left open in round 2.

| Option | What | |
|---|---|---|
| None | Each monster on its own, plus alarms that wake those near. |  |
| Raised by alarms | An alarm (a gong, a horn, a fleeing goblin) raises the whole level's alert: more awake, more searching. It falls slowly. | my pick |
| Also rises with time | As above, and it creeps up the longer you stay. |  |

**Why raised by alarms:** it gives alarm-raisers and gongs their weight: one escaped goblin changes the level. Rising with time would be a second clock; oil and dread already are (round 3).
