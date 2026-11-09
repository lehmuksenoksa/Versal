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

// ---- S3. The player's sight ----
// (What they can tell: 3 everything, 2 its kind, 1 that something's
// there, 0 nothing.)

test("S3: the lamp out: the kind next to them, something within 3, nothing at 4", () => {
  const w = scenario(`
    ###########
    #@........#
    ###########
  `, { sneaking: true });
  assert.deepEqual([2, 3, 4, 5].map((x) => w.knowAt(x, 1)), [2, 1, 1, 0], picture(w));
});

test("S3: the lamp lit (lit 5, dim 6): kinds told to 7, something to 9, nothing at 10", () => {
  const w = scenario(`
    ###############
    #@............#
    ###############
  `);
  // (Square x is x - 1 from the player: 6 lit, 7 dim, 8 next to the dim
  // light, 9 and 10 within 3 of it, 11 not.)
  assert.deepEqual([6, 7, 8, 9, 10, 11].map((x) => w.knowAt(x, 1)), [3, 2, 2, 1, 1, 0], picture(w));
});

test("S3: the dark vision reaches past a light seen far off: within 3 of its light, no further", () => {
  // (A brazier far down a corridor, the player's lamp out: its light from
  // 16 to 24, its middle 20½.)
  const w = scenario(`
    ##############################
    #@..................B........#
    ##############################
  `, { sneaking: true });
  assert.deepEqual([12, 13, 15, 16].map((x) => w.knowAt(x, 1)), [0, 1, 2, 2], `this side\n${picture(w)}`);
  assert.deepEqual([24, 25, 26, 27, 28].map((x) => w.knowAt(x, 1)), [2, 2, 1, 1, 0], `the far side\n${picture(w)}`);
});

// ---- S4. Monsters' sight ----
// (What a monster can tell of the player, `tellOf`: 3 clearly, 2 their kind
// (it sees them), 1 a glimpse, 0 nothing.)

const CORRIDOR = `
  ######################
  #@...................#
  ######################
`;

test("S4: a goblin (Vision 6, 7, 8) sees the player lit by the lamp at 7, glimpses them at 8, not at 9", () => {
  const w = scenario(CORRIDOR);
  const tells = [8, 9, 10].map((x) => { const g = w.placeMonster("goblin", x, 1); w.updateFov(); const t = w.tellOf(g); w.actors.splice(w.actors.indexOf(g), 1); return t; });
  assert.deepEqual(tells, [2, 1, 0], picture(w));
});

test("S4: the lamp out, a goblin next to the player only glimpses them; a suspicious one struck so is struck unawares", () => {
  const w = scenario(`
    #######
    #@g...#
    #######
  `, { sneaking: true, states: { g: "suspicious" } });
  const g = w.actors.find((a) => a.kind === "goblin");
  assert.equal(w.tellOf(g), 1);
  w.act({ do: "move", dx: 1, dy: 0 });
  assert.ok(w.events.some((e) => e.type === "whack" && e.sneak), "a sneak attack");
});

test("S4: with the lamp lit, a suspicious goblin next to the player sees them: no sneak attack", () => {
  const w = scenario(`
    #######
    #@g...#
    #######
  `, { states: { g: "suspicious" } });
  const g = w.actors.find((a) => a.kind === "goblin");
  assert.equal(w.tellOf(g), 3);
  w.act({ do: "move", dx: 1, dy: 0 });
  assert.ok(w.events.some((e) => e.type === "whack" && !e.sneak), "a plain blow");
});

test("S4: the player in dim light: a goblin sees them within 4 (its Vision halved), glimpses them further, to its lit faint 8½", () => {
  // (A brazier at 1: the player at 5, 4 from it, in its dim light.)
  const w = scenario(`
    ######################
    #B...@...............#
    ######################
  `, { sneaking: true });
  assert.equal(w.light.at(5, 1), 1, picture(w));
  const tells = [9, 10, 13, 14].map((x) => { const g = w.placeMonster("goblin", x, 1); w.updateFov(); const t = w.tellOf(g); w.actors.splice(w.actors.indexOf(g), 1); return t; });
  assert.deepEqual(tells, [2, 1, 1, 0], picture(w));
});

test("S4: a spider (light-shy, dark vision 3, 4, 6) next to the player lit by the lamp only glimpses them", () => {
  const w = scenario(`
    #######
    #@p...#
    #######
  `);
  assert.equal(w.tellOf(w.actors.find((a) => a.kind === "spider")), 1);
});

test("S4: in the dark, a spider sees the player within 4½ and glimpses them to 6½", () => {
  const w = scenario(CORRIDOR, { sneaking: true });
  const tells = [5, 6, 8].map((x) => { const g = w.placeMonster("spider", x, 1); w.updateFov(); const t = w.tellOf(g); w.actors.splice(w.actors.indexOf(g), 1); return t; });
  assert.deepEqual(tells, [2, 1, 0], picture(w));
});

test("S4: a brazier between a spider and the player hides them, as rock would", () => {
  // (The player 5 from the brazier, in the dark; the spider 6 from them,
  // within its dark vision's faint 6½, the brazier's square between.)
  const w = scenario(`
    ###########
    #@....Bp..#
    ###########
  `, { sneaking: true });
  assert.equal(w.light.at(1, 1), 0, picture(w));
  assert.equal(w.tellOf(w.actors.find((a) => a.kind === "spider")), 0, picture(w));
});
