// The behaviour lock: the game must play the recorded runs exactly as they
// were recorded (tools/record-lock.mjs). A failure names the first step that
// differs, with the nearest recorded snapshot before it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recordRun, FULL_EVERY } from "./support/lock.js";

const LOCK = JSON.parse(readFileSync(new URL("./lock/runs.json", import.meta.url), "utf8"));

test(`the behaviour lock: ${LOCK.runs.length} recorded runs played the same`, () => {
  for (const want of LOCK.runs) {
    const got = recordRun(want.seed);
    const i = want.steps.findIndex((h, k) => h !== got.steps[k]);
    const at = Math.floor(Math.max(i, 0) / FULL_EVERY) * FULL_EVERY;
    assert.ok(i === -1 && got.steps.length === want.steps.length,
      i === -1 ? `seed ${want.seed}: the run is ${got.steps.length} steps long, recorded ${want.steps.length}`
        : `seed ${want.seed}: differs from step ${i} (recorded at step ${at}: ${want.full[at]}; now: ${got.full[at]})`);
  }
});
