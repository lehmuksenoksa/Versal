// The level generator makes the same levels as recorded (tests/lock/
// levels.json; tests/support/levelprints.js): 60 seeds of every place. A
// refactoring must pass it; a change to the levels meant re-records it
// (npm run lock:record).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { levelPrints } from "./support/levelprints.js";

test("the levels are as recorded", () => {
  const want = JSON.parse(readFileSync(new URL("./lock/levels.json", import.meta.url), "utf8")), got = levelPrints();
  const differ = Object.keys(want).filter((k) => want[k] !== got[k]);
  assert.deepEqual(differ, [], `${differ.length} of ${Object.keys(want).length} levels differ (place/seed)`);
});
