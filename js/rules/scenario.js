// Small maps (spec/groundwork.md, G1): a World on a level typed as text,
// instead of one made by the generator, so a rule can be tried in a set-up
// situation: "with this brazier and this sleeping goblin, can you cross
// unseen?" Used by the tests (tests/support/scenario.js) and by the game's
// test rooms (js/scenes.js: `?scene=…` or `#test-…`).
//
//   const w = scenario(`
//     #########
//     #@..B..g#
//     #########
//   `, { states: { g: "sleeping" } });
//
// The map's letters:
//   #  rock (and a space)          .  floor
//   +  a shut door                 '  an open door
//   S  a secret door (rock till found)
//   @  the player                  <  >  stairs up, down
//   B  a brazier                   F  a campfire (both lights, in the way)
//   T  a torch on that wall square (its light in the floor beside it)
//   A  an altar, its three candles lit along it   V  the same, across
//   a monster's letter (MONSTER_LETTERS, or `legend` to add or change some):
//   those of one letter are a pack, the first its leader.
//   a thing lying about: its letter in `things` ({ letter: item type }).
//
// Options: `seed` (the dice; 1), `legend` ({ letter: kind }), `things`
// ({ letter: item type }, digits best), `pillars` ([[x, y], …], square
// pillars on the grid's crossings), `states`
// ({ letter: state }; else "neutral"), `rooms` (boxes { x, y, w, h, trait,
// kind } for what goes by rooms: names, traits), `sneaking` (the lamp out),
// `name` (the player's).
import { World } from "./world.js";
import { T, isOpen } from "./dungeon.js";
import { makeItem } from "./items.js";

export const MONSTER_LETTERS = { g: "goblin", w: "warrior", k: "king", s: "skeleton", z: "zombie", r: "rat", b: "bat", p: "spider", G: "giant", c: "cultist", t: "troll" };
const LIGHT_LETTERS = { B: "brazier", F: "fire" }, FEATURE = { brazier: "brazier", fire: "campfire" };

// The level a text map stands for, and where its monsters are.
export function levelFromText(text, { legend = {}, rooms = [], things = {}, pillars = [] } = {}) {
  const rows = text.replace(/^\n+|\s+$/g, "").split("\n");
  const pad = Math.min(...rows.filter((r) => r.trim()).map((r) => r.match(/^ */)[0].length));
  const lines = rows.map((r) => r.slice(pad).replace(/\s+$/, ""));
  const H = lines.length, W = Math.max(...lines.map((l) => l.length)), n = W * H, letters = { ...MONSTER_LETTERS, ...legend };
  const tiles = new Uint8Array(n), idx = (x, y) => y * W + x;
  const doors = [], secrets = [], lights = [], features = [], blocks = new Set(), monsters = [], torches = [], items = [];
  let start = null, stairsUp = null, stairsDown = null;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = lines[y][x] ?? " ";
      if (c === "#" || c === " ") continue;
      tiles[idx(x, y)] = c === "S" || c === "T" ? T.ROCK : T.FLOOR;
      if (c === "@") start = { x, y };
      else if (c === "<") stairsUp = { x, y };
      else if (c === ">") stairsDown = { x, y };
      else if (c === "T") torches.push({ x, y });
      else if (c === "+" || c === "'" || c === "S") (c === "S" ? secrets : doors).push({ x, y, dx: 0, dy: 0, ...(c === "S" ? {} : { open: c === "'" }) });
      else if (LIGHT_LETTERS[c]) {
        const kind = LIGHT_LETTERS[c];
        lights.push({ x: x + 0.5, y: y + 0.5, kind });
        features.push({ type: FEATURE[kind], x: x + 0.5, y: y + 0.5 });
        blocks.add(idx(x, y));
      } else if (c === "A" || c === "V") {
        // (An altar on its square, a little over the squares either side,
        // its candles along it or across: as a shrine's, levelgen/kinds.js.)
        const along = c === "A", flames = [-0.55, 0, 0.55].map((t) => (along ? [t, 0] : [0, t]));
        features.push({ type: "altar", x: x + 0.5, y: y + 0.5, w: along ? 1.7 : 0.75, h: along ? 0.75 : 1.7, holds: true });
        features.push({ type: "candles", x: x + 0.5, y: y + 0.5, flames });
        lights.push({ x: x + 0.5, y: y + 0.5, kind: "candles", flames });
        blocks.add(idx(x, y));
      } else if (letters[c]) monsters.push({ letter: c, kind: letters[c], x, y });
      else if (things[c]) items.push({ x, y, item: makeItem(things[c]) });
      else if (c !== ".") throw new Error(`a small map's letter ${JSON.stringify(c)}?`);
    }
  // (A torch on a wall square: its light just off the wall, in the floor
  // square beside it.)
  for (const t of torches) {
    const [dx, dy] = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([dx, dy]) => isOpen(tiles[idx(t.x + dx, t.y + dy)] ?? 0)) ?? [0, -1];
    const lx = t.x + dx + 0.5 - dx * 0.35, ly = t.y + dy + 0.5 - dy * 0.35;
    lights.push({ x: t.x + dx + 0.5, y: t.y + dy + 0.5, kind: "torch", fx: lx, fy: ly });
    features.push({ type: "torch", x: lx, y: ly, dx: -dx, dy: -dy });
  }
  // (A level below, come to by its stairs, needs no @.)
  start ??= stairsUp ?? stairsDown;
  if (!start) throw new Error("a small map needs the player (@) or stairs");
  // (A door's way through: along whichever way it has floor both sides.)
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (isOpen(tiles[idx(x, y)]) || secrets.some((s) => s.x === x && s.y === y));
  for (const d of [...doors, ...secrets]) [d.dx, d.dy] = open(d.x - 1, d.y) && open(d.x + 1, d.y) ? [1, 0] : [0, 1];
  for (const [s, dir] of [[stairsUp, "up"], [stairsDown, "down"]]) if (s) features.push({ type: "stairs", dir, x: s.x + 0.5, y: s.y + 0.5 });
  for (const [x, y] of pillars) features.push({ type: "post", x, y, shape: "square" });
  const level = {
    w: W, h: H, tiles, idx, get: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]),
    rooms: rooms.map((r) => ({ cx: r.x + (r.w >> 1), cy: r.y + (r.h >> 1), ...r })),
    roomOf: new Int16Array(n).fill(-1), wallOf: new Int16Array(n).fill(-1), area: new Uint8Array(n), cave: new Uint8Array(n), rubble: new Uint8Array(n),
    doors, secrets, features, posts: pillars.map(([x, y]) => [x, y]), recesses: [], lights, blocks, regions: [],
    start, stairsUp, stairsDown, startRoom: null, throneRoom: null,
  };
  return { level, monsters, items };
}

// A World on the small map `text`, its monsters placed.
export function scenario(text, { seed = 1, legend, rooms, things, pillars, states = {}, sneaking = false, name } = {}) {
  const { level, monsters, items } = levelFromText(text, { legend, rooms, things, pillars });
  const w = new World(seed, { levels: { 1: level }, ...(name ? { name } : {}) });
  w.items.push(...items);
  const leaders = {};
  for (const m of monsters) {
    const g = w.placeMonster(m.kind, m.x, m.y, { state: states[m.letter] ?? "neutral", leader: leaders[m.letter] });
    leaders[m.letter] ??= g;
  }
  for (const L of Object.values(leaders)) for (const a of w.pack(L)) a.packSize = w.pack(L).length;
  if (sneaking) w.act({ do: "lamp" });
  w.updateFov();
  w.events.length = 0;
  return w;
}
