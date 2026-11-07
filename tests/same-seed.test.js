// The same seed and the same choices give exactly the same run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { playRun, snapshot } from "./support/bot.js";

test("same seed, same run", () => {
  for (const seed of [7, 4242]) {
    const a = [], b = [];
    playRun(seed, { maxSteps: 1500, each: (w) => a.push(snapshot(w)) });
    playRun(seed, { maxSteps: 1500, each: (w) => b.push(snapshot(w)) });
    assert.equal(a.length, b.length, `seed ${seed}: runs of different length`);
    const i = a.findIndex((s, k) => s !== b[k]);
    assert.equal(i, -1, `seed ${seed}: runs part at step ${i}\n${a[i]}\n${b[i]}`);
  }
});
