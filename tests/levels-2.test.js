// The level checks for depth 2 (tests/support/levelcheck.js): every level
// sound, its way on reachable, everything in it where it should be.
// (One file a depth, so the depths are checked side by side.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDepth } from "./support/levelcheck.js";

const SEEDS = Number(process.env.LEVEL_SEEDS ?? 100);

test(`depth 2: ${SEEDS} levels sound`, () => {
  const { problems } = checkDepth(2, SEEDS);
  assert.deepEqual(problems.slice(0, 10), [], `${problems.length} problems`);
});
