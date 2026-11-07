// The outlines of every feature of fixed levels (postOutline, shadeOutline),
// as text: they shape sight and light, so a change to how features are
// described must leave them the same.
import { World } from "../../js/rules/world.js";
import { postOutline, shadeOutline } from "../../js/rules/sightline.js";

export function outlines() {
  const out = [];
  for (const seed of [3, 17, 41, 77, 123, 999]) {
    const w = new World(seed);
    for (let depth = 1; depth <= 3; depth++) {
      if (depth > 1) w.enter(depth, "down");
      for (const f of w.level.features ?? []) out.push(`${seed}/${depth} ${f.type} ${JSON.stringify(postOutline(f, 32))} ${JSON.stringify(shadeOutline(f, 32))}`);
    }
  }
  return out;
}
