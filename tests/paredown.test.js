// What R6 pared away stays away (spec/rebuild-plan.md, section 7): no cursed
// things, and no light without a source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/rules/world.js";
import { LIGHTS } from "../js/rules/levelgen.js";
import { ITEM_TRAITS } from "../js/rules/traits.js";
import TUNING from "../js/content/tuning.json" with { type: "json" };

test("no curses: no cursed trait, nothing that sticks or hides", () => {
  assert.equal(ITEM_TRAITS.cursed, undefined);
  for (const [k, t] of Object.entries(ITEM_TRAITS)) assert.ok(!t.sticks && !t.hidden, `item trait ${k}`);
  assert.equal(TUNING.curse, undefined);
  // (A thousand things found, on every depth: none cursed.)
  const w = new World(5);
  for (let depth = 1; depth <= 3; depth++) {
    if (depth > 1) w.enter(depth, "down");
    for (let i = 0; i < 1000; i++) assert.notEqual(w.randomItem().trait, "cursed");
  }
});

test("all light comes from a source (20 seeds, every depth)", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = new World(seed);
    for (let depth = 1; depth <= 3; depth++) {
      if (depth > 1) w.enter(depth, "down");
      const L = w.level, where = `seed ${seed}, depth ${depth}`;
      assert.equal(L.lit, undefined, `${where}: the level has lit places of its own`);
      // Every lit square is within its band's reach of one of the level's lights.
      for (let y = 0; y < L.h; y++)
        for (let x = 0; x < L.w; x++) {
          if (!w.lit[y * L.w + x]) continue;
          const by = (L.lights ?? []).some((l) => { const B = LIGHTS[l.kind] ?? LIGHTS.fire; return Math.hypot(x + 0.5 - l.x, y + 0.5 - l.y) <= B.full + B.dim; });
          assert.ok(by, `${where}: the square ${x},${y} is lit with no light near`);
        }
    }
  }
});
