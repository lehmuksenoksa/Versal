// The crude bot plays whole runs: nothing may crash, every step must leave
// the world sound (invariants), and every run must end or reach the cap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { playRun } from "./support/bot.js";
import { invariants } from "./support/checks.js";

const RUNS = Number(process.env.BOT_RUNS ?? 30);

test(`the bot plays ${RUNS} runs without breaking anything`, () => {
  const ends = {};
  for (let seed = 1000; seed < 1000 + RUNS; seed++) {
    let broken = null;
    const { w } = playRun(seed, { maxSteps: 5000, each: (w, what, i) => {
      if (broken) return;
      const bad = invariants(w);
      if (bad.length) broken = `seed ${seed}, step ${i} (${what}): ${bad.join("; ")}`;
    } });
    assert.equal(broken, null, broken);
    const end = w.dead ? `died on depth ${w.place.depth}` : w.won ? "won" : `still going on depth ${w.place.depth}`;
    ends[end] = (ends[end] ?? 0) + 1;
  }
  // (How the runs went, for the record.)
  console.log("bot runs:", ends);
});
