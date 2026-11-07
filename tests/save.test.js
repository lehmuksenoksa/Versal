// Save and restore: play some steps, save the run to JSON text, restore it,
// play on; it must go exactly as the run played straight through, and the
// restored state must save to the same text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/rules/world.js";
import { RNG } from "../js/rules/rng.js";
import { botStep, snapshot } from "./support/bot.js";

// The bot's own state goes with it, so both runs make the same choices.
function play(seed, steps, saveAt) {
  let w = new World(seed);
  let r = new RNG((seed ^ 0x9e3779b9) >>> 0), mem = { depth: 0, onLevel: 0, more: true };
  const trace = [];
  for (let i = 0; i < steps && !w.ended; i++) {
    if (i === saveAt) {
      const text = JSON.stringify(w.save());
      w = World.restore(JSON.parse(text));
      assert.equal(JSON.stringify(w.save()), text, `seed ${seed}: the restored run saves differently`);
      const rs = r.state; r = new RNG(r.seed); r.state = rs;
      mem = JSON.parse(JSON.stringify(mem));
    }
    botStep(w, r, mem);
    trace.push(snapshot(w));
  }
  return trace;
}

test("a run saved and restored plays on exactly as before", () => {
  for (const [seed, at] of [[11, 40], [37, 300], [202, 900], [505, 1200]]) {
    const straight = play(seed, 1500, -1), restored = play(seed, 1500, at);
    assert.equal(restored.length, straight.length, `seed ${seed}: runs of different length`);
    const i = straight.findIndex((s, k) => s !== restored[k]);
    assert.equal(i, -1, `seed ${seed}, saved at ${at}: differs from step ${i}\n${straight[i]}\n${restored[i]}`);
  }
});

test("a save is small enough to keep in the browser", () => {
  const w = new World(64);
  for (let d = 2; d <= 3; d++) w.enter(d, "down");
  const kb = JSON.stringify(w.save()).length / 1024;
  assert.ok(kb < 1500, `a save of three levels is ${Math.round(kb)} KB`);
  console.log(`a save of three levels: ${Math.round(kb)} KB`);
});
