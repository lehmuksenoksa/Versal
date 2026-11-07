// The crude bot plays whole runs (half of them here, from seed 1000; the
// other half in bot-b.test.js, side by side): see tests/support/botruns.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { botRuns } from "./support/botruns.js";

const RUNS = Number(process.env.BOT_RUNS ?? 40);

test(`the bot plays ${RUNS} runs (from seed 1000): sound, ended, every part touched`, () => {
  const r = botRuns(1000, RUNS);
  assert.deepEqual(r.broken, [], "the world broken");
  assert.deepEqual(r.unfinished, [], "runs that never end");
  assert.deepEqual(r.missing, [], "parts of play never touched");
  // (How the runs went, for the record.)
  console.log("bot runs:", JSON.stringify(r.ends));
});
