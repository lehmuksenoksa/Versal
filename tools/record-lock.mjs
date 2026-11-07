// Records the behaviour lock (tests/lock/runs.json) from the game as it is
// now. Run it only on purpose: when the game's behaviour is meant to change
// (a feature set, a pare-down), never to make a failing refactoring pass.
import { writeFileSync } from "node:fs";
import { LOCK_SEEDS, LOCK_STEPS, recordRun } from "../tests/support/lock.js";

const runs = LOCK_SEEDS.map((seed) => recordRun(seed));
writeFileSync(new URL("../tests/lock/runs.json", import.meta.url), JSON.stringify({ recorded: new Date().toISOString(), steps: LOCK_STEPS, runs }));
console.log(`Recorded ${runs.length} runs of up to ${LOCK_STEPS} steps.`);
