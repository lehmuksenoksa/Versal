// The crude bot's runs, checked (spec/rebuild-plan.md, R7): nothing may
// crash; after every step the world must be sound (invariants); every run
// must end, dead or won, before the cap (no dead end, no endless loop); and
// the runs together must touch every part of play (`COVERS`).
import { playRun } from "./bot.js";
import { invariants } from "./checks.js";

export const MAX_STEPS = 10000;
// What the bot must have done, and what must have happened, in a set of runs.
export const COVERS = {
  done: ["walk", "strike", "rest", "drink", "lamp", "search", "pick up", "wield", "wear", "take off", "drop", "close", "down", "up", "run"],
  happened: ["whack", "attack", "flee", "door", "secret", "level", "death", "sneak", "suspect"],
};

export function botRuns(from, n) {
  const ends = {}, done = {}, happened = {}, broken = [], unfinished = [];
  for (let seed = from; seed < from + n; seed++) {
    const { w } = playRun(seed, { maxSteps: MAX_STEPS, each: (w, what, i) => {
      done[what] = (done[what] ?? 0) + 1;
      for (const e of w.events) happened[e.type] = (happened[e.type] ?? 0) + 1;
      w.events.length = 0;
      if (broken.length >= 5) return;
      const bad = invariants(w);
      if (bad.length) broken.push(`seed ${seed}, step ${i} (${what}): ${bad.join("; ")}`);
    } });
    if (!w.ended) unfinished.push(`seed ${seed}, still on depth ${w.place.depth} after ${MAX_STEPS} steps`);
    const end = w.dead ? `died on depth ${w.place.depth}` : w.won ? "won" : "unfinished";
    ends[end] = (ends[end] ?? 0) + 1;
  }
  const missing = [...COVERS.done.filter((k) => !done[k]), ...COVERS.happened.filter((k) => !happened[k])];
  return { ends, done, happened, broken, unfinished, missing };
}
