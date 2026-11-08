// Small maps for tests: the builder is the game's own (js/rules/scenario.js,
// used by its test rooms too); here, what only the tests want: the world as
// text, and turns passing.
import { isOpen } from "../../js/rules/dungeon.js";
import { MONSTER_LETTERS } from "../../js/rules/scenario.js";

export { MONSTER_LETTERS, levelFromText, scenario } from "../../js/rules/scenario.js";

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
