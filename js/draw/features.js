// The things in the rooms, drawn by family (spec/rebuild-plan.md, R5): each
// kind's family comes from the data (js/content/features.json), and each
// family is a table of drawing functions, one per kind. A new kind is a line
// of data and a function in its family's table.
//
// Every function takes the thing and `hand`: the pen (`P`, maprender.js), its
// dice, the canvas and mode, the thing's place and size in pixels, the pen's
// two weights, and the ink and paper colours.

import { feature } from "../rules/content.js";
import { structure } from "./structure.js";
import { furniture } from "./furniture.js";
import { lights } from "./lights.js";

export { BRAZIER_BOWL, TORCH_RING_IN } from "./lights.js";

export const FAMILIES = { structure, furniture, light: lights };

// The drawing function for a thing, or none (an unknown kind isn't drawn).
export const drawerFor = (f) => FAMILIES[feature(f).family]?.[f.type];
