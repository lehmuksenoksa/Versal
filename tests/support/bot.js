// A crude bot that plays whole runs of the game headless, for tests: it
// explores, fights what comes next to it, rests when hurt or bleeding (till
// healed and well, or till something stirs, as the game's rest does), drinks
// a potion when badly hurt, sometimes puts out its lamp, picks things up, wields and
// wears the best it has (now and then taking armour off, or dropping
// something), closes doors behind it, and takes the stairs down once a level
// is seen (or it has spent long enough on it), now and then climbing back up
// a level and down again. It isn't meant to play well, only to touch every
// part of the rules, the same way every time for the same seed: its own
// choices use its own dice, never the world's, so it doesn't change what the
// world does.
import { World, ITEMS } from "../../js/rules/world.js";
import { RNG } from "../../js/rules/rng.js";
import { wayTo, wayToExplore } from "../../js/rules/travel.js";
import { DIRS8 } from "../../js/rules/dungeon.js";
import { ITEM_TRAITS as TRAITS } from "../../js/rules/traits.js";
import { PACK } from "../../js/rules/content.js";

const PACK_SIZE = PACK.size;
const L0 = (w) => w.level, at = (w, s) => s.x === w.player.x && s.y === w.player.y;

const LEVEL_STEPS = 700;

// How good a thing is to the bot: a weapon by its mean blow, armour by what
// it takes off (its trait counted). Two-handed weapons are worth less: they
// leave no hand for anything else.
const mean = ([a, b]) => (a + b) / 2;
export function worth(it) {
  if (!it) return 0;
  const d = ITEMS[it.type], t = it.trait ? (TRAITS[it.trait] ?? {}) : {};
  if (d.cat === "weapon") return mean(d.dmg) + mean(t.dmg ?? [0, 0]) - (d.hands === 2 ? 1 : 0);
  if (d.cat === "armour") return (d.def ?? 0) + (t.def ?? 0);
  return 0;
}

// Things in the pack to put to use: a weapon better than the one held, armour
// better than what's worn there.
function better(w) {
  const p = w.player;
  return p.pack.find((it) => {
    const d = ITEMS[it.type];
    if (d.cat === "weapon") return worth(it) > worth(p.equip.hand);
    if (d.cat === "armour") return worth(it) > worth(p.equip[d.slot]);
    return false;
  });
}

// One step of the bot's play. Returns what it did, for the trace.
export function botStep(w, r, mem) {
  const p = w.player, depth = w.place.depth;
  if (mem.depth !== depth) Object.assign(mem, { depth, onLevel: 0, way: null, more: mem.back ? false : true, spot: null, swept: [], trail: [], hunt: null, resting: false });
  mem.onLevel++;
  // (Resting goes on, a turn each step, as the game's rest (R) does.)
  if (mem.resting) {
    const did = rest(w, mem);
    if (did) return did;
  }
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
  // (Hurt, or bleeding, and nothing about: rest, as the game's rest does.)
  if ((p.hp < p.maxHp / 2 || p.ailments.bleeding) && !w.cantRest() && !w.disturbed()) {
    w.log("You rest.");
    mem.resting = true;
    return rest(w, mem);
  }
  // (Back up a level for a look, then down again at once.)
  if (mem.back && L0(w).stairsDown && at(w, L0(w).stairsDown)) { mem.back = false; w.takeStairs("down"); return "down"; }
  // (Just come down: now and then, straight back up.)
  if (mem.onLevel === 1 && depth > 1 && !mem.back && r.chance(0.15) && L0(w).stairsUp && at(w, L0(w).stairsUp)) { mem.back = true; w.takeStairs("up"); return "up"; }
  // (Now and then, the lamp out or lit again.)
  if (r.chance(0.01)) { w.setSneaking(!w.sneaking, w.sneaking ? 9 : 3); return "lamp"; }
  // (Things: what lies here picked up, if there's room; the better weapon
  // or armour put to use; now and then armour taken off or a thing dropped.)
  if (w.itemsAt(p.x, p.y).length && p.pack.length < PACK_SIZE && r.chance(0.8) && w.pickUp()) return "pick up";
  const up = better(w);
  if (up && w.wield(up.key)) return ITEMS[up.type].cat === "weapon" ? "wield" : "wear";
  const worn = ["head", "body"].filter((k) => p.equip[k]);
  if (worn.length && r.chance(0.004) && w.takeOff(r.pick(worn))) return "take off";
  if (p.pack.length && r.chance(0.003)) { const it = r.pick(p.pack); if (it.type !== "potion" && w.drop(it.key)) return "drop"; }
  // (A door just come through: now and then, shut behind.)
  if (mem.door && w.canCloseDoor() && r.chance(0.3) && w.closeDoor()) { mem.door = false; return "close"; }
  mem.door = !!w.doorAt(p.x, p.y);
  // (Going round in a small loop, back and forth or round four squares (a
  // monster in sight closing the way one step and out of sight the next, so
  // the way turns back): go for the nearest monster in sight instead.)
  const trail = (mem.trail ??= []);
  trail.push(p.y * w.level.w + p.x);
  if (trail.length > 12) trail.shift();
  if (trail.length === 12 && new Set(trail).size <= 4 && !mem.hunt) {
    const seen = w.actors.filter((a) => a !== p && w.isVisible(a.x, a.y)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (seen.length) mem.hunt = { g: seen[0], steps: 0 };
  }
  // (Hunting: after it for up to 20 steps, till it falls.)
  if (mem.hunt) {
    const { g } = mem.hunt, go = w.actors.includes(g) && ++mem.hunt.steps <= 20 && wayTo(w, g.x, g.y);
    if (go && go.length && w.playerMove(go[0].x - p.x, go[0].y - p.y)) return "hunt";
    mem.hunt = null;
  }
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
  // (The last level seen, no stairs down: after the king.)
  const king = !down && w.actors.find((a) => a.kind === "king" && w.seen[a.y * L.w + a.x]);
  if (!way && king) {
    const go = wayTo(w, king.x, king.y);
    if (go && go.length && w.playerMove(go[0].x - p.x, go[0].y - p.y)) return "to the king";
  }
  // (All seen and no stairs found: search for secret doors where they'd be,
  // as a person would: at a dead end or along a wall, a while at each, then
  // on to another.)
  if (!way) {
    if (mem.spot && at(w, mem.spot)) {
      if (++mem.searched < SEARCH_TURNS) { w.search(); return "search"; }
      mem.spot = null;
    }
    if (!mem.spot) {
      // (Every wall searched: start the sweep again.)
      mem.spot = searchSpot(w, mem.swept) ?? searchSpot(w, (mem.swept = []));
      if (mem.spot) mem.swept.push(mem.spot);
      mem.searched = 0;
    }
    const go = mem.spot && wayTo(w, mem.spot.x, mem.spot.y);
    if (go && go.length && w.playerMove(go[0].x - p.x, go[0].y - p.y)) return "walk";
    if (go && !go.length) { w.search(); return "search"; }
    mem.spot = null;
  }
  // (Nowhere to go, or the way blocked: a random step, else search.)
  for (const [dx, dy] of r.shuffle([...DIRS8])) if (w.playerMove(dx, dy)) return "wander";
  w.search();
  return "search";
}

// A turn of rest, as the game's rest (R, js/main.js) takes one: stopped by
// something stirring (then null: the bot does something else), else a turn
// of rest, and stopped once healed and well.
function rest(w, mem) {
  const p = w.player;
  if (w.ended) { mem.resting = false; return null; }
  if (w.disturbed()) {
    mem.resting = false;
    w.log("Something stirs. You stop resting.");
    return null;
  }
  w.tick(true, true);
  if (!w.dead && p.hp >= p.maxHp && !Object.keys(p.ailments).length) {
    mem.resting = false;
    w.log("You feel rested.", "good");
  }
  return "rest";
}

// Where to search: a square seen and walkable with rock round most of it (a
// dead end, five or more of its eight neighbours rock) or along a wall
// (three or more), not next to a square searched already on this level
// (`done`), the nearest first (dead ends before walls): a sweep, as a person
// would search, not the same walls over and over. (Searching finds secret
// doors two squares off, so spots a square apart leave no wall unsearched.)
const SEARCH_TURNS = 8;
function searchSpot(w, done) {
  const L = w.level, p = w.player, ends = [], sides = [];
  for (let y = 1; y < L.h - 1; y++)
    for (let x = 1; x < L.w - 1; x++) {
      if (!w.seen[y * L.w + x] || !w.walkable(x, y)) continue;
      if (done.some((d) => Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 1)) continue;
      const rock = DIRS8.filter(([dx, dy]) => !w.walkable(x + dx, y + dy) && !w.doorAt(x + dx, y + dy)).length;
      if (rock >= 5) ends.push({ x, y });
      else if (rock >= 3) sides.push({ x, y });
    }
  const near = (a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y);
  return ends.sort(near)[0] ?? sides.sort(near)[0] ?? null;
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
