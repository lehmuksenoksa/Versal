// The speed check (spec/groundwork.md, section 7): loose limits, several
// times what this machine takes, so a slower one passes and only a real
// slowdown fails. Today, here: a bot's step about 0.6 ms on average; a
// level's light worked out again about 1.6 ms (4.3 at worst); a level made
// about 65 ms.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/rules/world.js";
import { playRun } from "./support/bot.js";

test("a turn of play is quick: a bot's step under 3 ms on average", () => {
  let steps = 0;
  const t = performance.now();
  for (let seed = 1000; seed < 1010; seed++) steps += playRun(seed, { maxSteps: 3000 }).steps;
  const ms = (performance.now() - t) / steps;
  assert.ok(ms < 3, `${ms.toFixed(2)} ms a step`);
});

test("a level's light is worked out quickly: under 25 ms at worst", () => {
  let worst = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const w = new World(seed);
    for (let depth = 1; depth <= 3; depth++) {
      if (depth > 1) w.enter(depth, "down");
      const t = performance.now();
      for (let i = 0; i < 5; i++) { w.light.changed(); w.light.update(); }
      worst = Math.max(worst, (performance.now() - t) / 5);
    }
  }
  assert.ok(worst < 25, `${worst.toFixed(1)} ms`);
});

test("a level is made quickly: under 500 ms", () => {
  let worst = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const t = performance.now(), w = new World(seed);
    worst = Math.max(worst, performance.now() - t);
    w.enter(3, "down");
  }
  assert.ok(worst < 500, `${worst.toFixed(0)} ms`);
});
