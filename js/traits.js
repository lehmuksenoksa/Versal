// Things with character (round 3): a word before a thing's, a monster's or a
// room's name that changes how it plays, shown wherever the name is. Chosen
// in mockups/choices.html (round 3); the full table in PROPOSALS.md.
import TRAITS from "./content/traits.json" with { type: "json" };
import TUNING from "./content/tuning.json" with { type: "json" };

// The traits and their numbers are data: js/content/traits.json (with notes
// on what each field does) and js/content/tuning.json.
export const ITEM_TRAITS = TRAITS.items;
export const MURKY = TUNING.murky;
export const CURSE = TUNING.curse;
export const ITEM_TRAIT = TUNING.itemTrait;
// The kinds goblin-bane bites harder on.
export const GOBLINS = new Set(TRAITS.baneOf);
export const MONSTER_BLEED = TUNING.monsterBleed;
export const MONSTER_TRAITS = TRAITS.monsters;
export const MONSTER_TRAIT = TUNING.monsterTrait;
export const ROOM_TRAITS = TRAITS.rooms;
export const ROOM_TRAIT = TUNING.roomTrait;

// A room's kind for the table above (a hall of the king's by its plan).
export const roomKind = (r) => (r.halls ? (r.hallKind === "I" ? "I" : "halls") : r.collapsed ? "collapsed" : r.kind);
