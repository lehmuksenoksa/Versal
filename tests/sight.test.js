// The light set rebuilt (spec/light-rebuild.md): its rules, step by step,
// on small maps, written before the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scenario, picture } from "./support/scenario.js";

// ---- S1. Round distances, one line of sight ----

test("S1: the dark sight is round: 3 reaches the squares whose middle is within 3½", () => {
  const w = scenario(`
    #########
    #.......#
    #.......#
    #.......#
    #...@...#
    #.......#
    #.......#
    #.......#
    #########
  `, { sneaking: true });
  const at = (dx, dy) => w.isVisible(4 + dx, 4 + dy);
  assert.ok(at(3, 0) && at(3, 1) && at(2, 2), "within 3½: (3, 0), (3, 1) 3.2, (2, 2) 2.8");
  assert.ok(!at(3, 2) && !at(3, 3), "beyond: (3, 2) 3.6, (3, 3) 4.2");
});

// (A wall square standing alone at (5, 3); the player at (1, 1), the lamp
// lit. The line to (7, 3) touches the wall's corner; the one to (6, 5)
// clears it by 0.23.)
const PAST_A_CORNER = `
  ###############
  #@............#
  #.............#
  #....#........#
  #.............#
  #.............#
  ###############
`;

test("S1: a line must clear a wall's corner by a tenth of a square: light and sight alike", () => {
  const w = scenario(PAST_A_CORNER);
  assert.equal(w.light.at(7, 3), 0, `the lamp's light touching the corner stops\n${picture(w)}`);
  assert.ok(!w.isVisible(7, 3), "and the player's sight");
  assert.ok(w.light.at(6, 5) > 0 && w.isVisible(6, 5), "clearing it by 0.23, both get past");
});

test("S1: no light or sight through a diagonal gap between two walls", () => {
  const w = scenario(`
    #####
    #@#.#
    ##..#
    #...#
    #####
  `);
  assert.equal(w.light.at(2, 2), 0, picture(w));
  assert.ok(!w.isVisible(2, 2));
});

test("S1: round a pillar, the player's sight and the lamp's light agree square by square", () => {
  const w = scenario(`
    ###########
    #.........#
    #.........#
    #...@.....#
    #.........#
    #.........#
    #.........#
    ###########
  `, { pillars: [[6, 3], [3, 5], [7, 6]] });
  const off = [], hidden = [];
  for (let y = 1; y < 7; y++)
    for (let x = 1; x < 10; x++) {
      if ((w.light.at(x, y) > 0) !== w.isVisible(x, y)) off.push(`(${x}, ${y})`);
      if (!w.isVisible(x, y)) hidden.push(`(${x}, ${y})`);
    }
  assert.deepEqual(off, [], picture(w));
  assert.ok(hidden.length > 0, "the pillars hide something");
});

// ---- S2. Light in two bands ----

test("S2: a brazier lights within 2½ and dims within 4½ (lit 2, dim 4): no faint band beyond", () => {
  const w = scenario(`
    ##############
    #B..........@#
    ##############
  `, { sneaking: true });
  // (The brazier's middle at 1½: square x is x - 1 from it.)
  assert.deepEqual([2, 3, 4, 5, 6, 7].map((x) => w.light.at(x, 1)), [2, 2, 1, 1, 0, 0], picture(w));
});

test("S2: the lamp lights within 5½ and dims within 6½ (lit 5, dim 6), and no further", () => {
  const w = scenario(`
    ##############
    #@...........#
    ##############
  `);
  assert.deepEqual([6, 7, 8, 9].map((x) => w.light.at(x, 1)), [2, 1, 0, 0], picture(w));
});
