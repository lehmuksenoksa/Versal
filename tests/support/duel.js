// Fights played by the game's own rules, for checking the balance maths
// (tools/balance/maths.js): the player next to one monster in an open
// room, both aware (or the monster asleep, for a sneak blow), striking till
// it falls. The player can't die (hit points enough), so every fight runs
// its course; the hit points the monster's blows take are counted.
import { World, MONSTERS } from "../../js/rules/world.js";
import { makeItem } from "../../js/rules/items.js";

// A square in a room with open floor all round it and the square east.
function arena(w) {
  const L = w.level, open = (x, y) => w.walkable(x, y) && !w.doorAt(x, y);
  for (const r of L.rooms)
    for (let y = r.y + 1; y < r.y + r.h - 1; y++)
      for (let x = r.x + 1; x < r.x + r.w - 2; x++) {
        let ok = true;
        for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 2 && ok; dx++) ok = open(x + dx, y + dy);
        if (ok) return { x, y };
      }
  throw new Error("no room for a fight");
}

// `n` fights with a `kind`: the mean blows the player took to bring it down,
// and the mean hit points its blows took off them; and each mean's standard
// error (`blowsErr`, `lostErr`), how far off it may be by chance.
export function duels(kind, n, { weapon = "dagger", level = 1, def = 0, sneak = false, seed = 1 } = {}) {
  const w = new World(seed), p = w.player, at = arena(w), M = MONSTERS[kind];
  p.equip = { hand: weapon ? makeItem(weapon, 1, null, true) : null, off: null, head: null, body: def ? makeItem("chainmail", 1, null, true) : null };
  if (def && def !== 2) throw new Error("armour: 0, or chainmail's 2");
  let lost = 0;
  const B = [], H = [];
  const strike = w.strike.bind(w);
  w.strike = (g) => { const before = p.hp; strike(g); lost += before - p.hp; };
  for (let i = 0; i < n; i++) {
    // (Each fight from the same footing: the experience of the last doesn't
    // carry over into a level, and a better blow.)
    Object.assign(p, { x: at.x, y: at.y, hp: 1e6, maxHp: 1e6, ailments: {}, level, xp: 0 });
    // (The king fallen, the run is won; the next fight goes on all the same.)
    w.won = null;
    const hp = w.dice.fight.int(...M.hp);
    const g = { id: w.nextId++, kind, glyph: M.glyph, x: at.x + 1, y: at.y, state: sneak ? "sleeping" : "aggressive", calm: 0, aware: sneak ? 0 : 1, hp, maxHp: hp, energy: w.dice.fight.next(), packSize: 1 };
    g.leader = g;
    w.actors = [p, g];
    w.updateFov();
    let blows = 0;
    lost = 0;
    for (let turns = 0; w.actors.includes(g); turns++) {
      if (turns > 10000) throw new Error(`a fight with a ${kind} that never ends`);
      // (It may have stepped off, a bat flitting: after it.)
      const dx = Math.sign(g.x - p.x), dy = Math.sign(g.y - p.y);
      if (Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)) > 1) { w.playerMove(dx, dy) || w.tick(); continue; }
      w.playerMove(dx, dy);
      blows++;
      p.ailments = {};
    }
    B.push(blows);
    H.push(lost);
  }
  const m = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const err = (a) => Math.sqrt(a.reduce((s, v) => s + (v - m(a)) ** 2, 0) / (a.length - 1) / a.length);
  return { blows: m(B), lost: m(H), blowsErr: err(B), lostErr: err(H) };
}
