// Replays (js/rules/replay.js): a run played again from its seed and the
// calls made into the rules is the very same run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/rules/world.js";
import { playRun, botStep, snapshot } from "./support/bot.js";
import { RNG } from "../js/rules/rng.js";

test("a run's replay is the same run, checkpoint by checkpoint", () => {
  for (const seed of [1000, 1002, 5005]) {
    const { w } = playRun(seed, { maxSteps: 3000 });
    const data = JSON.parse(JSON.stringify(w.replay()));
    const r = World.replay(data);
    assert.equal(r.offCourse, undefined, `seed ${seed}: off course at call ${r.offCourse}`);
    assert.equal(r.error, undefined, `seed ${seed}: ${r.error}`);
    const marks = data.history.filter((c) => c[0] === "#").length;
    assert.ok(marks > 0 && r.checks === marks, `seed ${seed}: ${r.checks} of ${marks} checkpoints checked`);
    assert.equal(snapshot(r.w), snapshot(w), `seed ${seed}: the replay ended elsewhere`);
  }
});

test("a run saved and taken up again still replays from the start", () => {
  const seed = 1002, r = new RNG(7), mem = { depth: 0, onLevel: 0, more: true };
  let w = new World(seed);
  for (let i = 0; i < 600 && !w.ended; i++) botStep(w, r, mem);
  w = World.restore(JSON.parse(JSON.stringify(w.save())));
  for (let i = 0; i < 600 && !w.ended; i++) botStep(w, r, mem);
  const back = World.replay(JSON.parse(JSON.stringify(w.replay())));
  assert.equal(back.offCourse, undefined);
  assert.equal(snapshot(back.w), snapshot(w));
});

test("a replay that goes off course says where", () => {
  // (A run long enough, its first step a third of the way in changed.)
  let data = null;
  for (let seed = 1000; !data; seed++) { const { w } = playRun(seed, { maxSteps: 1500 }); if (w.history.length > 600) data = w.replay(); }
  const at = data.history.findIndex((c, i) => i > data.history.length / 3 && c[0] === "m");
  data.history[at] = data.history[at] === "m6" ? "m4" : "m6";
  const r = World.replay(data);
  assert.ok(r.offCourse !== undefined && r.offCourse > at && r.offCourse - at <= 101, `off course at ${r.offCourse}, the change at ${at}`);
});
