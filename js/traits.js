// Things with character (round 3): a word before a thing's, a monster's or a
// room's name that changes how it plays, shown wherever the name is. Chosen
// in mockups/choices.html (round 3); the full table in PROPOSALS.md.

// Items: what each is found on (`on`), whether it's for the better (`good`:
// the bad commoner near the top, the good deeper), the shallowest it's found
// (`depth`), and what it does: `dmg` to the blow (low, high), `hit` to the
// chance to hit, `def` to what armour takes off, `bleed` (a blow of 4 or more
// makes a living monster bleed), `bane` (more blow against goblins),
// `padded` (hard blows make the player bleed half as often), `spikes` (a
// monster that hits the player takes this), `heal` (a potion's).
export const ITEM_TRAITS = {
  rusty: { on: ["dagger", "sword", "axe", "warhammer", "chainmail"], good: false, dmg: [-1, -1], def: -1 },
  sharp: { on: ["dagger", "sword", "axe"], good: true, dmg: [0, 1], bleed: true },
  heavy: { on: ["axe", "warhammer"], good: true, dmg: [2, 2], hit: -0.1 },
  "goblin-bane": { on: ["sword", "axe"], good: true, depth: 2, bane: 3 },
  sturdy: { on: ["helmet", "chainmail"], good: true, def: 1 },
  padded: { on: ["chainmail"], good: true, padded: true },
  spiked: { on: ["helmet"], good: true, spikes: 1 },
  strong: { on: ["potion"], good: true, heal: [12, 18] },
  watered: { on: ["potion"], good: false, heal: [3, 6] },
  // Hidden (round 4): a cursed thing is 1 worse and won't come off till the
  // curse is lifted (standing at an altar, CURSE); found out on wielding or
  // wearing it, till then named with a question mark ("a sword?"). Murky
  // potions all heal well or all poison, a run's luck (MURKY), found out on
  // drinking one. `weight`: how much commoner (or rarer) than the rest.
  cursed: { on: ["dagger", "sword", "axe", "warhammer", "helmet", "chainmail"], good: false, hidden: true, dmg: [-1, -1], def: -1, sticks: true, weight: 0.6 },
  murky: { on: ["potion"], good: false, weight: 0.8 },
};
// A murky potion that heals: as a strong one; one that poisons: poisoned
// for so many turns, and this much harm at once.
export const MURKY = { heal: [12, 18], poison: [12, 20], harm: [1, 3] };
// Lifting a curse: so many turns in a row next to an altar.
export const CURSE = { turns: 3 };
// How often a thing found has a trait; how the bad and good are weighed by
// the level's depth (1 to 3).
export const ITEM_TRAIT = { chance: 1 / 3, bad: [3, 2, 1], good: [1, 1.5, 2] };
// The kinds goblin-bane bites harder on.
export const GOBLINS = new Set(["goblin", "warrior", "king"]);
// A monster bleeding from a sharp blade: a hit point a turn, for so many
// turns.
export const MONSTER_BLEED = { at: 4, turns: 3 };

// Monsters, a whole pack alike (a leader may have its own): what each is
// found on, and what it does: `dmg` and `hit` to its blows, `hp` times its
// hit points, `speed` times its speed, `xp` times the experience for it;
// `brave` (never flees), `timid` (flees when first hurt), `sleepy` (asleep
// at the start, `hear` times as well), `see` (times as far in the dark),
// `relentless` (never gives up a chase), `poison` (more to the chance it
// poisons, and `poisonFor` times as long).
const LIVING = ["goblin", "warrior", "rat", "bat", "spider", "giant", "cultist", "troll"];
export const MONSTER_TRAITS = {
  savage: { on: LIVING, dmg: 1, brave: true, xp: 1.5 },
  timid: { on: ["rat", "goblin", "spider", "cultist"], timid: true, xp: 0.5 },
  sleepy: { on: ["rat", "goblin", "troll"], sleepy: true, hear: 0.5 },
  watchful: { on: ["goblin", "cultist", "spider"], see: 2 },
  swift: { on: ["rat", "goblin", "spider"], speed: 1.25 },
  starving: { on: ["rat", "goblin"], hp: 0.7, relentless: true },
  crumbling: { on: ["skeleton"], hp: 0.5 },
  venomous: { on: ["spider", "giant"], poison: 0.3, poisonFor: 1.5 },
  veteran: { on: ["warrior"], hit: 0.1, dmg: 1 },
};
// How often a pack has a trait; how often its leader has its own.
export const MONSTER_TRAIT = { chance: 1 / 4, leader: 1 / 3 };

// Rooms: what kinds each is found in (by `kind`, or the halls' `hallKind`),
// and the line said of it in its tip. `cursed`: the undead that fall there
// rise again once (after `rise` turns), and nothing heals inside. `hallowed`:
// resting heals twice as fast, and the undead won't come in. `echoing`:
// noises there carry twice as far. `looted`: nothing to find; `stocked`:
// `more` things to find.
export const ROOM_TRAITS = {
  cursed: { kinds: ["crypt"], about: "The dead rise again here, and nothing heals.", rise: [3, 6] },
  hallowed: { kinds: ["shrine"], about: "Rest heals twice as fast; the undead keep out." },
  echoing: { kinds: ["hall", "gallery", "halls"], about: "Every sound carries twice as far." },
  // (Flooded: every step wades, `slow` times as long, monsters' too, and
  // heard twice as far; drawn as chosen in round 5, A: a light bluish-grey
  // wash, the water's edge inside the walls, ripples.)
  flooded: { kinds: ["store", "plain", "I", "collapsed"], about: "Every step wades: slow, and loud.", slow: 1.5 },
  looted: { kinds: ["store", "I"], about: "Picked clean." },
  stocked: { kinds: ["store", "I"], about: "Well stocked.", more: 2 },
};
// How many rooms a level has with a trait.
export const ROOM_TRAIT = { count: [2, 4] };

// A room's kind for the table above (a hall of the king's by its plan).
export const roomKind = (r) => (r.halls ? (r.hallKind === "I" ? "I" : "halls") : r.collapsed ? "collapsed" : r.kind);
