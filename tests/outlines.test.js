// The features' outlines (sight and light are cast against them) stay as
// recorded (tests/lock/outlines.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { outlines } from "./support/outlines.js";

test("the features' outlines are as recorded", () => {
  const want = JSON.parse(readFileSync(new URL("./lock/outlines.json", import.meta.url), "utf8")), got = outlines();
  assert.equal(got.length, want.length, "a different number of features");
  const i = want.findIndex((s, k) => s !== got[k]);
  assert.equal(i, -1, `differs at ${i}:\n${want[i]}\n${got[i]}`);
});
