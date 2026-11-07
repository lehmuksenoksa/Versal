// What things are, in words: the tips shown while the mouse rests on
// something (a monster, a thing on the floor, furniture, a room's floor), as
// chosen (mockups/choices.html, round 3: A, a torn black plate beside it;
// no ring round the thing, asked later); and the words for a monster's state
// and wounds, and the rooms' names, used by the look and the log too.
import { ITEMS, MONSTERS, itemName, monName, shownTrait, roomName, roomAt } from "./rules/world.js";
import { KNOW } from "./rules/senses.js";
import { ITEM_TRAITS, ROOM_TRAITS } from "./rules/traits.js";

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

// What each trait does, in a few words (after the line about the kind).
const ITEM_SAYS = { heavy: "Hits a tenth less often.", sharp: "A hard blow makes the living bleed.", "goblin-bane": "Bites 3 harder on goblins.", padded: "Hard blows make you bleed half as often.", spiked: "Cuts what hits you." };
const MONSTER_SAYS = { savage: "Savage: hits harder, never flees.", timid: "Timid: flees when hurt.", sleepy: "Sleepy: hears little.", watchful: "Watchful: sees far in the dark.", swift: "Swift.", starving: "Starving: weak, but never gives up a chase.", crumbling: "Crumbling: breaks easily.", venomous: "Venomous: poisons often and long.", veteran: "A veteran: hits hard and often." };

// A thing's numbers with its trait: its blow, what it takes off, what it
// heals.
export function itemStats(it) {
  const d = ITEMS[it.type], T = ITEM_TRAITS[shownTrait(it)] ?? {};
  const lo = d.dmg ? Math.max(1, d.dmg[0] + (T.dmg?.[0] ?? 0)) : 0;
  return { dmg: d.dmg ? [lo, Math.max(lo, d.dmg[1] + (T.dmg?.[1] ?? 0))] : null, def: d.def !== undefined ? Math.max(0, d.def + (T.def ?? 0)) : null, heal: T.heal ?? d.heal ?? null };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The tip for the square (x, y), or null: { at: the square to ring (null for
// a room's floor), title, lines: [[text, class], …] }. `shown(a)`: is the
// monster `a` drawn (in sight and lit)?
export function tipFor(w, x, y, shown) {
  if (!w.isVisible(x, y)) return null;
  // (Only what can be told, by the light there (light-and-dread.md, section
  // 2): in the dark close by, that something's there; in dim light, its kind;
  // lit, everything.)
  const know = w.knowAt(x, y), a = w.actorAt(x, y);
  const something = { at: { x, y }, title: "Something", lines: [], about: "In the dark, close by: something's there." };
  if (a && a !== w.player && shown(a)) {
    if (know === KNOW.something) return something;
    if (know === KNOW.kind) return { at: { x, y }, title: cap(MONSTERS[a.kind]?.name ?? a.kind), lines: [], about: "In dim light: what it is, no more." };
    const hurt = wounds(a);
    return { at: { x, y }, title: cap(monName(a)), lines: [[[STATE[a.state] ?? a.state, "st"], [hurt, hurt === "unhurt" ? "" : "bad"]]], about: [ABOUT[a.kind], MONSTER_SAYS[a.trait]].filter(Boolean).join(" ") };
  }
  const floor = w.itemsAt(x, y);
  if (floor.length) {
    const it = floor[floor.length - 1].item, d = ITEMS[it.type], S = itemStats(it);
    if (know === KNOW.something) return something;
    if (know === KNOW.kind) return { at: { x, y }, title: cap(it.trait === "murky" ? "potion" : d.name), lines: [], about: "In dim light: what it is, no more." };
    const what = d.cat === "weapon" ? `Blow ${S.dmg[0]}–${S.dmg[1]}, ${d.hands === 2 ? "two hands" : "one hand"}`
      : d.cat === "armour" ? `Worn on the ${d.slot}; takes off up to ${S.def}`
      : it.trait === "murky" ? (it.known ? (it.brew ? "Heals 12–18" : "Poisons") : "Heals well, or poisons")
      : S.heal ? `Heals ${S.heal[0]}–${S.heal[1]}` : "";
    return { at: { x, y }, title: cap(itemName(it, false)), lines: what ? [[[what, ""]]] : [], about: [ITEM_SAYS[shownTrait(it)], it.trait === "murky" && !it.known ? "Drink one to know." : "", floor.length > 1 ? `And ${floor.length - 1} more beneath.` : ""].filter(Boolean).join(" ") };
  }
  const L = w.level;
  for (const [st, name] of [[L.stairsDown, "Stairs down"], [L.stairsUp, "Stairs up"]]) if (st && st.x === x && st.y === y) return { at: { x, y }, title: name, lines: [], about: "" };
  const f = (L.features ?? []).find((f) => THINGS[f.type] && Math.floor(f.x) === x && Math.floor(f.y) === y);
  if (f) return { at: { x, y }, title: cap(THINGS[f.type]), lines: [], about: "" };
  const room = roomAt(L, x, y), name = roomName(room, L);
  if (name && w.walkable(x, y)) return { at: null, title: cap(name), lines: [], about: ROOM_TRAITS[room.trait]?.about ?? "" };
  return null;
}

// The tip as HTML for its plate.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function tipHtml(t) {
  const line = (parts) => parts.map(([text, cls]) => `<span class="${cls}">${esc(text)}</span>`).join(" · ");
  return `<b>${esc(t.title)}</b>${t.lines.map((l) => `<div>${line(l)}</div>`).join("")}${t.about ? `<div class="dim">${esc(t.about)}</div>` : ""}`;
}
