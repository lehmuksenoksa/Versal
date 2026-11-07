// Names and words: a thing's, a monster's, a room's; "a" or "an"; ordinals.
import { ITEMS, MONSTERS } from "./content.js";
import { ITEM_TRAITS } from "./traits.js";

export const an = (name) => (/^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`);
// A thing's name, its trait first ("a rusty sword", "3 strong potions of
// healing").
// (A weapon or armour not yet used that might be cursed has a question
// mark, its curse unsaid: "a sword?"; a murky potion found out says what it
// does.)
export const unsure = (it) => ["weapon", "armour"].includes(ITEMS[it.type].cat) && !it.known && (!it.trait || ITEM_TRAITS[it.trait]?.hidden);
export const shownTrait = (it) => (it.trait && !(ITEM_TRAITS[it.trait]?.hidden && !it.known) ? it.trait : null);
export const itemName = (it, article = true) => {
  // (A murky potion is no potion of healing that anyone knows of.)
  const D = it.trait === "murky" ? { name: "potion", plural: "potions" } : ITEMS[it.type], st = shownTrait(it), t = st ? `${st} ` : "", q = unsure(it) ? "?" : "";
  const brew = it.trait === "murky" && it.known ? (it.brew ? " (heals)" : " (poison)") : "";
  return (it.n > 1 ? `${it.n} ${t}${D.plural ?? `${D.name}s`}` : article ? an(t + D.name) : t + D.name) + q + brew;
};
// A monster's name, its trait first ("savage goblin warrior").
export const monName = (g) => `${g.trait ? `${g.trait} ` : ""}${MONSTERS[g.kind]?.name ?? g.kind}`;

export const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

// A room's name, for the rooms worth naming (null for the rest).
// (Its trait first: "a cursed crypt".)
const KINDS = { store: "storeroom", gallery: "gallery", hall: "pillared hall", crypt: "crypt", jail: "jail", barracks: "barracks", dining: "dining hall", shrine: "shrine" };
export function roomName(r, level) {
  if (!r) return null;
  if (r === level.throneRoom) return "the throne room";
  // (A room of no kind worth naming is named for its trait, if it has one.)
  const kind = (r.halls ? (r.hallKind === "I" ? "storeroom" : "great hall") : r.cave || r.collapsed ? null : KINDS[r.kind]) ?? (r.trait ? "room" : null);
  return kind ? an(r.trait ? `${r.trait} ${kind}` : kind) : null;
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
