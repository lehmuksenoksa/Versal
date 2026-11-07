// The dice in streams (spec/groundwork.md, G5): each level made and peopled
// by dice of its own, so it's the same whatever was played before it; and in
// play, a die thrown in one part (fights, monsters' minds, things, the rest)
// shifts no other part's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../js/rules/world.js";
import { playRun } from "./support/bot.js";

// A level, and what's in it, as text.
const print = (w) => JSON.stringify({
  tiles: Array.from(w.level.tiles).join(""),
  monsters: w.actors.filter((a) => a !== w.player).map((a) => [a.kind, a.x, a.y, a.hp, a.state, a.trait ?? ""]),
  things: w.items.map((f) => [f.item.type, f.x, f.y, f.item.trait ?? ""]),
});

test("a level is the same whatever was played before it", () => {
  for (const seed of [2, 3, 7]) {
    // (Played on depth 1 by the bot until it went down, against straight down.)
    let played = null;
    playRun(seed, { maxSteps: 4000, each: (w) => { if (!played && w.place.depth === 2) played = print(w); } });
    const fresh = new World(seed);
    fresh.enter(2, "down");
    assert.ok(played, `seed ${seed}: the bot never got to depth 2`);
    assert.equal(played, print(fresh), `seed ${seed}: depth 2 differs with depth 1 played first`);
  }
});

test("a die thrown in one part shifts no other's", () => {
  const a = new World(5), b = new World(5);
  for (let i = 0; i < 50; i++) b.dice.things.next();
  for (const k of ["fight", "minds", "world"]) assert.equal(a.dice[k].next(), b.dice[k].next(), `the ${k} dice shifted`);
});
