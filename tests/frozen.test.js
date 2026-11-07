// The content is read, never changed (spec/groundwork.md, section 8): every
// content object frozen, deep down, before the game is played, so a rule
// that changed one by mistake (a monster's hit points, an item's damage)
// throws here instead of quietly changing it for the rest of the run.
// (Its own file: freezing lasts for this process only.)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as content from "../js/rules/content.js";
import * as traits from "../js/rules/traits.js";
import * as levelgen from "../js/rules/levelgen.js";

const freeze = (o) => {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) freeze(v); }
  return o;
};
for (const mod of [content, traits, levelgen]) for (const v of Object.values(mod)) if (v && typeof v === "object") freeze(v);

const { playRun } = await import("./support/bot.js");
const { invariants } = await import("./support/checks.js");

test("the content is never changed by play (20 bot runs, the content frozen)", () => {
  for (let seed = 7000; seed < 7020; seed++) {
    assert.doesNotThrow(() => playRun(seed, { maxSteps: 3000, each: (w) => { const bad = invariants(w); if (bad.length) throw new Error(bad.join("; ")); } }), `seed ${seed}`);
  }
});

test("frozen means frozen: changing content throws", () => {
  assert.throws(() => { "use strict"; content.MONSTERS.goblin.hp[0] = 99; });
});
