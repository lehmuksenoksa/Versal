// Monsters, items and which depths they haunt.

// `anim` picks the idle motion in render.js; `pack` spawns a swarm.
export const MONSTERS = {
  rat:      { name: "rat", glyph: "r", hp: 3, atk: [1, 2], def: 0, speed: 120, xp: 1, anim: "scurry", pack: [2, 5] },
  bat:      { name: "bat", glyph: "b", hp: 4, atk: [1, 3], def: 0, speed: 150, xp: 2, anim: "flutter", erratic: true },
  goblin:   { name: "goblin", glyph: "g", hp: 6, atk: [1, 3], def: 0, speed: 110, xp: 3, anim: "hop", pack: [4, 7], drops: 0.15 },
  kobold:   { name: "kobold", glyph: "k", hp: 7, atk: [2, 4], def: 1, speed: 100, xp: 4, anim: "skitter", pack: [2, 3] },
  zombie:   { name: "zombie", glyph: "z", hp: 15, atk: [2, 5], def: 1, speed: 55, xp: 6, anim: "sway" },
  skeleton: { name: "skeleton", glyph: "s", hp: 12, atk: [3, 6], def: 2, speed: 100, xp: 8, anim: "rattle", pack: [2, 3] },
  orc:      { name: "orc", glyph: "o", hp: 18, atk: [3, 7], def: 2, speed: 100, xp: 10, anim: "stomp", pack: [2, 3], drops: 0.3 },
  troll:    { name: "troll", glyph: "t", hp: 32, atk: [5, 10], def: 3, speed: 85, xp: 22, anim: "lumber" },
  goblinKing: {
    name: "Goblin King", glyph: "G", hp: 48, atk: [3, 8], def: 2, speed: 100, xp: 40,
    boss: true, motif: "crown", summons: "goblin", summonEvery: 6, unique: true,
  },
  dragon: {
    name: "Dragon", glyph: "D", hp: 100, atk: [6, 12], def: 4, speed: 95, xp: 100,
    boss: true, motif: "dragon", breath: { range: 6, dmg: [7, 12], cooldown: 4 }, unique: true,
  },
};

export const NPCS = {
  scribe: {
    name: "Brother Anselm", glyph: "m", hp: 99, atk: [0, 0], def: 9, speed: 50, anim: "bob", friendly: true,
    lines: [
      "Brother Anselm looks up from his vellum. “Mind the capitals, wanderer. The great beasts of this place were inked in gold, and they will not stay on the page.”",
      "“The little ones run in packs. Strike one and the whole swarm comes hopping. A narrow corridor is your friend.”",
      "“Three leaves deep lies the Dragon, the first letter of the oldest chapter. Bring it down and the book can close.”",
      "“Take this draught. I have no further use for it; my ink is my medicine.”",
      "Brother Anselm returns to his copying, murmuring the alphabet backwards.",
    ],
    gift: "potion",
  },
};

export const ITEMS = {
  potion: { name: "draught of healing", glyph: "!", color: "#a3261b", stack: "potions" },
  scroll: { name: "scroll of smiting", glyph: "?", color: "#6e4a17", stack: "scrolls" },
  gold:   { name: "gold", glyph: "$", color: "#a87a12" },
  weapon: { glyph: ")", color: "#2a2723" },
  armour: { glyph: "[", color: "#2a2723" },
};

export const WEAPONS = [
  { name: "bare fists", atk: 0 },
  { name: "rusted dagger", atk: 1 },
  { name: "short sword", atk: 2 },
  { name: "war axe", atk: 4 },
  { name: "knightly longsword", atk: 6 },
];
export const ARMOURS = [
  { name: "travelling cloak", def: 0 },
  { name: "boiled leather", def: 1 },
  { name: "ring mail", def: 2 },
  { name: "plate harness", def: 3 },
];

// Weighted encounter tables per depth (1-based).
export const DEPTHS = [
  null,
  {
    title: "The Upper Gallery",
    encounters: [["rat", 4], ["bat", 2], ["goblin", 2], ["kobold", 1]],
    count: [6, 8], items: [5, 7], npc: "scribe",
  },
  {
    title: "The Goblin Warrens",
    encounters: [["goblin", 5], ["kobold", 2], ["zombie", 2], ["bat", 1], ["rat", 1]],
    count: [7, 9], items: [6, 8], boss: "goblinKing",
  },
  {
    title: "The Dragon's Leaf",
    encounters: [["orc", 3], ["skeleton", 3], ["troll", 1], ["goblin", 2], ["zombie", 1]],
    count: [7, 9], items: [6, 8], boss: "dragon",
  },
];
export const MAX_DEPTH = DEPTHS.length - 1;
