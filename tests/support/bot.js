// A crude bot that plays whole runs of the game headless, for tests: it
// explores, fights what comes next to it, rests when hurt, drinks a potion
// when badly hurt, sometimes puts out its lamp, and takes the stairs down
// once a level is seen (or it has spent long enough on it). It isn't meant
// to play well, only to touch every part of the rules, the same way every
// time for the same seed: its own choices use its own dice, never the
// world's, so it doesn't change what the world does.
import { World } from "../../js/rules/world.js";
import { RNG } from "../../js/rules/rng.js";
import { wayTo, wayToExplore } from "../../js/rules/travel.js";
import { DIRS8 } from "../../js/rules/dungeon.js";

const LEVEL_STEPS = 700;

// One step of the bot's play. Returns what it did, for the trace.
export function botStep(w, r, mem) {
  const p = w.player, depth = w.place.depth;
  if (mem.depth !== depth) Object.assign(mem, { depth, onLevel: 0, way: null });
  mem.onLevel++;
  // (A monster next to it, in sight: strike it.)
  for (const [dx, dy] of DIRS8) {
    const g = w.actorAt(p.x + dx, p.y + dy);
    if (g && g !== p && w.isVisible(g.x, g.y) && w.canStep(p.x, p.y, dx, dy)) { w.playerMove(dx, dy); return "strike"; }
  }
  // (Badly hurt: a potion if it has one; hurt and nothing about: rest.)
  if (p.hp < p.maxHp / 4) {
    const pot = p.pack.find((it) => it.type === "potion");
    if (pot) { w.drink(pot.key); return "drink"; }
  }
  if (p.hp < p.maxHp / 2 && !w.cantRest() && !w.disturbed()) { w.tick(true, true); return "rest"; }
  // (Now and then, the lamp out or lit again.)
  if (r.chance(0.01)) { w.setSneaking(!w.sneaking, w.sneaking ? 9 : 3); return "lamp"; }
  // (Done here once the level is seen, or after long enough, if the stairs
  // down are known: go down. Until they're known, keep exploring.)
  const L = w.level, down = L.stairsDown, known = down && w.seen[down.y * L.w + down.x];
  const done = known && (mem.onLevel > LEVEL_STEPS || !mem.more);
  if (done && down.x === p.x && down.y === p.y) { w.takeStairs("down"); return "down"; }
  let way = done ? wayTo(w, down.x, down.y) : wayToExplore(w);
  if (!done) mem.more = !!way;
  if (!way && known) way = wayTo(w, down.x, down.y);
  if (way && way.length) {
    const s = way[0];
    if (w.playerMove(s.x - p.x, s.y - p.y)) return "walk";
  }
  // (All seen and no stairs found: search for a secret door now and then.)
  if (!way && r.chance(0.3)) { w.search(); return "search"; }
  // (Nowhere to go, or the way blocked: a random step, else search.)
  for (const [dx, dy] of r.shuffle([...DIRS8])) if (w.playerMove(dx, dy)) return "wander";
  w.search();
  return "search";
}

// A whole run with seed `seed`, at most `maxSteps` of the bot's steps.
// `each(w, what, i)` is called after every step.
export function playRun(seed, { maxSteps = 4000, each = null } = {}) {
  const w = new World(seed);
  const r = new RNG((seed ^ 0x9e3779b9) >>> 0), mem = { depth: 0, onLevel: 0, more: true };
  let i = 0;
  for (; i < maxSteps && !w.ended; i++) {
    const what = botStep(w, r, mem);
    if (each) each(w, what, i);
  }
  return { w, steps: i };
}

// What the world looks like after a step, as a line of text: the turn, the
// depth, the player, every monster (by id), and the messages so far. Two
// runs are the same if these lines are.
export function snapshot(w) {
  const p = w.player;
  const actors = w.actors.filter((a) => a !== p).map((a) => `${a.id}:${a.kind}@${a.x},${a.y}:${a.hp}:${a.state}`).sort().join(";");
  const items = w.items.map((i) => `${i.item.type}@${i.x},${i.y}`).sort().join(";");
  return [w.turn, w.place.depth, `${p.x},${p.y}`, p.hp, p.xp, p.level, w.sneaking ? 1 : 0, actors, items, w.messages.length, w.messages.at(-1)?.text ?? "", w.dead?.how ?? "", w.won ? "won" : ""].join("|");
}
