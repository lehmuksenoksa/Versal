// The behaviour lock: what fixed runs of the game do, step by step, recorded
// once and compared ever after. A refactoring step must give the same runs.
import { createHash } from "node:crypto";
import { playRun, snapshot } from "./bot.js";

export const LOCK_SEEDS = [11, 23, 37, 51, 64, 78, 95, 101, 202, 303, 404, 505];
export const LOCK_STEPS = 1500;
export const FULL_EVERY = 100;

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

// A run's record: a short hash of every step's snapshot, the whole snapshot
// every FULL_EVERY steps (to see what differs), and how it ended.
export function recordRun(seed) {
  const steps = [], full = {};
  const { w } = playRun(seed, { maxSteps: LOCK_STEPS, each: (w, what, i) => {
    const s = `${what}|${snapshot(w)}`;
    steps.push(hash(s));
    if (i % FULL_EVERY === 0) full[i] = s;
  } });
  return { seed, steps, full, end: snapshot(w) };
}
