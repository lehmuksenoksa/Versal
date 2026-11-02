// What things are, in words: the tips shown while the mouse rests on
// something (a monster, a thing on the floor, furniture, a room's floor), as
// chosen (mockups/choices.html, round 3: A, a torn black plate beside it, a
// thin ink ring round what it's about); and the words for a monster's state
// and wounds, and the rooms' names, used by the look and the log too.
import { MONSTERS, ITEMS, itemName } from "./world.js";

// How a monster's state reads.
export const STATE = { sleeping: "asleep", neutral: "unaware", suspicious: "suspicious", aggressive: "alarmed", fleeing: "fleeing" };
// Furniture worth naming (the rest too common to).
export const THINGS = { stairs: "stairs", campfire: "a campfire", altar: "an altar", coffin: "a coffin", sarcophagus: "a sarcophagus", table: "a table", bed: "a bed", shelf: "shelves", bench: "a bench", crate: "a crate", barrel: "a barrel", chair: "a chair", brazier: "a brazier", candles: "candles" };

// A monster's wounds in words, by the share of its hit points left (at
// least this much).
const WOUNDS = [[1, "unhurt"], [0.7, "scratched"], [0.4, "wounded"], [0.15, "badly wounded"], [0, "near death"]];
export const wounds = (a) => WOUNDS.find(([at]) => a.hp / a.maxHp >= at - 1e-9)[1];

// What each kind of monster does, in a line.
const ABOUT = {
  goblin: "In packs. Sometimes drops what it carried.",
  warrior: "Leads goblin packs. Hard blows make you bleed.",
  king: "Waits on his throne, his guard round him.",
  skeleton: "Slow; never flees. Its claws make you bleed.",
  zombie: "Slow and tough; never gives up a chase.",
  rat: "Fast and weak, in packs.",
  bat: "Flits about, hard to pin down.",
  spider: "Waits still. Its bite poisons.",
  giant: "Waits still. Its bite poisons badly.",
  cultist: "Patrols with a lantern that lights you up.",
  troll: "Slow and huge. Heals as it fights.",
};

// A room's name, for the rooms worth naming (null for the rest).
const KINDS = { store: "a storeroom", gallery: "a gallery", hall: "a pillared hall", crypt: "a crypt", jail: "a jail", barracks: "a barracks", dining: "a dining hall", shrine: "a shrine" };
export function roomName(r, level) {
  if (!r) return null;
  if (r === level.throneRoom) return "the throne room";
  if (r.halls) return r.hallKind === "I" ? "a storeroom" : "a great hall";
  if (r.cave || r.collapsed) return null;
  return KINDS[r.kind] ?? null;
}
// The room the square (x, y) is in, if any (the smallest whose box it's in).
export function roomAt(level, x, y) {
  let best = null;
  for (const r of level.rooms ?? []) {
    if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) continue;
    if (!best || r.w * r.h < best.w * best.h) best = r;
  }
  return best;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The tip for the square (x, y), or null: { at: the square to ring (null for
// a room's floor), title, lines: [[text, class], …] }. `shown(a)`: is the
// monster `a` drawn (in sight and lit)?
export function tipFor(w, x, y, shown) {
  if (!w.isVisible(x, y)) return null;
  const a = w.actorAt(x, y);
  if (a && a !== w.player && shown(a)) {
    const M = MONSTERS[a.kind], hurt = wounds(a);
    return { at: { x, y }, title: cap(M.name), lines: [[[STATE[a.state] ?? a.state, "st"], [hurt, hurt === "unhurt" ? "" : "bad"]]], about: ABOUT[a.kind] ?? "" };
  }
  const floor = w.itemsAt(x, y);
  if (floor.length) {
    const it = floor[floor.length - 1].item, d = ITEMS[it.type];
    const what = d.cat === "weapon" ? `Blow ${d.dmg[0]}–${d.dmg[1]}, ${d.hands === 2 ? "two hands" : "one hand"}`
      : d.cat === "armour" ? `Worn on the ${d.slot}; takes off up to ${d.def}`
      : d.heal ? `Heals ${d.heal[0]}–${d.heal[1]}` : "";
    return { at: { x, y }, title: cap(itemName(it, false)), lines: what ? [[[what, ""]]] : [], about: floor.length > 1 ? `And ${floor.length - 1} more beneath.` : "" };
  }
  const L = w.level;
  for (const [st, name] of [[L.stairsDown, "Stairs down"], [L.stairsUp, "Stairs up"]]) if (st && st.x === x && st.y === y) return { at: { x, y }, title: name, lines: [], about: "" };
  const f = (L.features ?? []).find((f) => THINGS[f.type] && Math.floor(f.x) === x && Math.floor(f.y) === y);
  if (f) return { at: { x, y }, title: cap(THINGS[f.type]), lines: [], about: "" };
  const name = roomName(roomAt(L, x, y), L);
  if (name && w.walkable(x, y)) return { at: null, title: cap(name), lines: [], about: "" };
  return null;
}

// The tip as HTML for its plate.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function tipHtml(t) {
  const line = (parts) => parts.map(([text, cls]) => `<span class="${cls}">${esc(text)}</span>`).join(" · ");
  return `<b>${esc(t.title)}</b>${t.lines.map((l) => `<div>${line(l)}</div>`).join("")}${t.about ? `<div class="dim">${esc(t.about)}</div>` : ""}`;
}
