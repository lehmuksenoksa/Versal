// The game's content and its dials, as data (js/content/*.json, each with
// notes on its fields): the kinds of monster, the things to be found, the
// places, and the rules' numbers (tuning.json).
import MONSTERS_DATA from "../content/monsters.json" with { type: "json" };
import ITEMS_DATA from "../content/items.json" with { type: "json" };
import PLACES_DATA from "../content/places.json" with { type: "json" };
import TUNING from "../content/tuning.json" with { type: "json" };
import FEATURES_DATA from "../content/features.json" with { type: "json" };

export const MONSTERS = MONSTERS_DATA.monsters;
export const ITEMS = ITEMS_DATA.items;
// The places, one a level.
export const PLACES = PLACES_DATA.places;
export const PLACE = PLACES[0];

export const PLAYER = TUNING.player;
export const LEVELS = TUNING.levels;
export const AILMENTS = TUNING.ailments;
export const PACK = TUNING.pack;
// How the monsters chase, the player's blow, sneaking, noticing, noise,
// morale, secret doors.
export const GOBLIN = TUNING.chase;
export const WHACK = TUNING.whack, SNEAK_HIT = TUNING.sneakHit;
export const SNEAK_STEP = TUNING.sneakStep;
export const AWARE = TUNING.aware;
export const NOISE = TUNING.noise;
export const SENSES = TUNING.senses;
export const MORALE = TUNING.morale;
export const SECRET = TUNING.secret;

// The things in the rooms: each kind's family and what the rules and the
// drawing need to know of it (features.json); `feature(f)` for a thing.
export const FEATURES = FEATURES_DATA.features;
const NONE = {};
export const feature = (f) => FEATURES[f.type] ?? NONE;
