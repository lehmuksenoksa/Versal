// Small maps for tests (spec/groundwork.md, G1): a World on a level typed as
// text, instead of one made by the generator, so a rule can be tried in a
// set-up situation: "with this brazier and this sleeping goblin, can you
// cross unseen?"
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
//   a monster's letter (MONSTER_LETTERS, or `legend` to add or change some):
//   those of one letter are a pack, the first its leader.
//
// Options: `seed` (the dice; 1), `legend` ({ letter: kind }), `states`
// ({ letter: state }; else "neutral"), `rooms` (boxes { x, y, w, h, trait,
// kind } for what goes by rooms: names, traits), `sneaking` (the lamp out).
import { World } from "../../js/rules/world.js";
import { T, isOpen } from "../../js/rules/dungeon.js";

export const MONSTER_LETTERS = { g: "goblin", w: "warrior", k: "king", s: "skeleton", z: "zombie", r: "rat", b: "bat", p: "spider", G: "giant", c: "cultist", t: "troll" };
const LIGHT_LETTERS = { B: "brazier", F: "fire" }, FEATURE = { brazier: "brazier", fire: "campfire" };

// The level a text map stands for, and where its monsters are.
export function levelFromText(text, { legend = {}, rooms = [] } = {}) {
  const rows = text.replace(/^\n+|\s+$/g, "").split("\n");
  const pad = Math.min(...rows.filter((r) => r.trim()).map((r) => r.match(/^ */)[0].length));
  const lines = rows.map((r) => r.slice(pad).replace(/\s+$/, ""));
  const H = lines.length, W = Math.max(...lines.map((l) => l.length)), n = W * H, letters = { ...MONSTER_LETTERS, ...legend };
  const tiles = new Uint8Array(n), idx = (x, y) => y * W + x;
  const doors = [], secrets = [], lights = [], features = [], blocks = new Set(), monsters = [];
  let start = null, stairsUp = null, stairsDown = null;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = lines[y][x] ?? " ";
      if (c === "#" || c === " ") continue;
      tiles[idx(x, y)] = c === "S" ? T.ROCK : T.FLOOR;
      if (c === "@") start = { x, y };
      else if (c === "<") stairsUp = { x, y };
      else if (c === ">") stairsDown = { x, y };
      else if (c === "+" || c === "'" || c === "S") (c === "S" ? secrets : doors).push({ x, y, dx: 0, dy: 0, ...(c === "S" ? {} : { open: c === "'" }) });
      else if (LIGHT_LETTERS[c]) {
        const kind = LIGHT_LETTERS[c];
        lights.push({ x: x + 0.5, y: y + 0.5, kind });
        features.push({ type: FEATURE[kind], x: x + 0.5, y: y + 0.5 });
        blocks.add(idx(x, y));
      } else if (letters[c]) monsters.push({ letter: c, kind: letters[c], x, y });
      else if (c !== ".") throw new Error(`a small map's letter ${JSON.stringify(c)}?`);
    }
  // (A level below, come to by its stairs, needs no @.)
  start ??= stairsUp ?? stairsDown;
  if (!start) throw new Error("a small map needs the player (@) or stairs");
  // (A door's way through: along whichever way it has floor both sides.)
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (isOpen(tiles[idx(x, y)]) || secrets.some((s) => s.x === x && s.y === y));
  for (const d of [...doors, ...secrets]) [d.dx, d.dy] = open(d.x - 1, d.y) && open(d.x + 1, d.y) ? [1, 0] : [0, 1];
  for (const [s, dir] of [[stairsUp, "up"], [stairsDown, "down"]]) if (s) features.push({ type: "stairs", dir, x: s.x + 0.5, y: s.y + 0.5 });
  const level = {
    w: W, h: H, tiles, idx, get: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]),
    rooms: rooms.map((r) => ({ cx: r.x + (r.w >> 1), cy: r.y + (r.h >> 1), ...r })),
    roomOf: new Int16Array(n).fill(-1), wallOf: new Int16Array(n).fill(-1), area: new Uint8Array(n), cave: new Uint8Array(n), rubble: new Uint8Array(n),
    doors, secrets, features, posts: [], recesses: [], lights, blocks, regions: [],
    start, stairsUp, stairsDown, startRoom: null, throneRoom: null,
  };
  return { level, monsters };
}

// A World on the small map `text`, its monsters placed.
export function scenario(text, { seed = 1, legend, rooms, states = {}, sneaking = false } = {}) {
  const { level, monsters } = levelFromText(text, { legend, rooms });
  const w = new World(seed, { levels: { 1: level } });
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

// The world as text, for a test's message: the map, the monsters by their
// letter (the player @), lit floor `:`, dim `,`, dark `.`, doors.
export function picture(w) {
  const L = w.level, out = [], letter = Object.fromEntries(Object.entries(MONSTER_LETTERS).map(([k, v]) => [v, k]));
  for (let y = 0; y < L.h; y++) {
    let row = "";
    for (let x = 0; x < L.w; x++) {
      const a = w.actorAt(x, y), d = w.doorAt(x, y);
      row += a ? (a === w.player ? "@" : letter[a.kind] ?? "m") : d ? (d.open ? "'" : "+") : !isOpen(L.get(x, y)) ? "#" : L.blocks.has(y * L.w + x) ? "*" : [".", ",", ":"][w.light.at(x, y)];
    }
    out.push(row);
  }
  return out.join("\n");
}

// Turns pass with the player standing still (searching, or `act` each
// turn), until `until(w)` or `max` turns; the turns it took (null if never).
export function turnsUntil(w, until, { max = 100, act = (w) => w.search() } = {}) {
  for (let t = 1; t <= max; t++) {
    act(w);
    if (until(w)) return t;
  }
  return null;
}
