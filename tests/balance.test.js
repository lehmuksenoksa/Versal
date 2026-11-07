// The balance maths (tools/balance/maths.js) against fights played by the
// game's own rules (tests/support/duel.js): the blows a fight takes and the
// hit points it costs agree, within what chance allows (four standard
// errors) and 2% for rounding. So the maths can be trusted for the curves,
// and a rule changed without the maths (or the other way) is caught.
import { test } from "node:test";
import assert from "node:assert/strict";
import { duel } from "../tools/balance/maths.js";
import { duels } from "./support/duel.js";

const N = 1000;
// (The bat is left out: its flitting about is only roughly counted.)
const CASES = [
  ["rat", {}], ["goblin", {}], ["skeleton", {}], ["zombie", {}], ["spider", {}], ["cultist", {}],
  ["goblin", { sneak: true }], ["cultist", { sneak: true }],
  ["warrior", { weapon: "sword", level: 3, def: 2 }], ["giant", { weapon: "axe", level: 3 }],
  ["troll", { weapon: "axe", level: 5 }], ["king", { weapon: "warhammer", level: 7, def: 2 }],
];

for (const [kind, opts] of CASES)
  test(`the maths and the rules agree: a ${kind}, ${JSON.stringify(opts)}`, () => {
    const got = duels(kind, N, opts), want = duel(kind, opts);
    const near = (a, b, e) => Math.abs(a - b) <= 4 * e + 0.02 * b;
    assert.ok(near(got.blows, want.blows, got.blowsErr), `blows: played ${got.blows.toFixed(3)} ± ${got.blowsErr.toFixed(3)}, maths ${want.blows.toFixed(3)}`);
    assert.ok(near(got.lost, want.lost, got.lostErr), `hit points lost: played ${got.lost.toFixed(3)} ± ${got.lostErr.toFixed(3)}, maths ${want.lost.toFixed(3)}`);
  });
