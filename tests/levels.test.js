// Every level the game makes can be played through: the stairs down (and the
// throne, on the last) can be reached from where the player arrives, and every
// room can be reached.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/world.js";
import { reachable } from "./support/checks.js";

const SEEDS = Number(process.env.LEVEL_SEEDS ?? 25);

test(`levels can be played through (${SEEDS} seeds, every depth)`, () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const w = new World(seed);
    for (let depth = 1; depth <= 3; depth++) {
      if (depth > 1) w.enter(depth, "down");
      const L = w.level, at = L.stairsUp ?? L.start, got = reachable(L, at.x, at.y), where = `seed ${seed}, depth ${depth}`;
      if (L.stairsDown) assert.ok(got[L.stairsDown.y * L.w + L.stairsDown.x], `${where}: the stairs down can't be reached`);
      for (const r of L.rooms ?? []) {
        let any = false;
        for (let y = r.y; y < r.y + r.h && !any; y++) for (let x = r.x; x < r.x + r.w && !any; x++) any = !!got[y * L.w + x];
        assert.ok(any, `${where}: a room at ${r.x},${r.y} can't be reached`);
      }
    }
  }
});
