// Light (spec/light-set.md, L1; light-and-dread.md, section 1), on small
// maps: each square dark (0), dim (1) or lit (2); lit within a light's full
// band, dim within its dim and faint bands; along lines of sight; the
// brightest wins; carried lights go with who carries them; no light without a
// source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scenario, picture } from "./support/scenario.js";
import { World } from "../js/rules/world.js";

const at = (w, x, y) => w.light.at(x, y);

test("a brazier lights its full band, then dim through its dim and faint bands, then nothing", () => {
  // (The brazier at 8,2, its middle 8.5,2.5: full 2½, dim 1½, faint 1½.)
  const w = scenario(`
    #################
    #@..............#
    #.......B.......#
    #...............#
    #################
  `, { sneaking: true });
  assert.equal(at(w, 9, 2), 2, picture(w));
  assert.equal(at(w, 10, 2), 2, picture(w));
  assert.equal(at(w, 11, 2), 1, picture(w));
  assert.equal(at(w, 13, 2), 1, picture(w));
  assert.equal(at(w, 14, 2), 0, picture(w));
  assert.equal(at(w, 1, 1), 0, picture(w));
});

test("walls and shut doors stop light; a door opened lets it through", () => {
  const w = scenario(`
    ###########
    #...#.....#
    #...+..B..#
    #@..#.....#
    ###########
  `, { sneaking: true });
  assert.equal(at(w, 3, 2), 0, `light through the shut door\n${picture(w)}`);
  assert.equal(at(w, 2, 1), 0, `light through the wall\n${picture(w)}`);
  Object.assign(w.player, { x: 3, y: 2 });
  w.act({ do: "move", dx: 1, dy: 0 });
  assert.equal(w.doorAt(4, 2).open, true);
  assert.ok(at(w, 3, 2) > 0, `no light through the open door\n${picture(w)}`);
});

test("where two lights meet, the brighter wins", () => {
  const w = scenario(`
    ##############
    #@...........#
    #..B.....B...#
    #............#
    ##############
  `, { sneaking: true });
  // (Square 5: 2 from the first, lit; 4 from the second, dim: lit. Square 6:
  // 3 from both, dim from both: dim.)
  assert.equal(at(w, 5, 2), 2, picture(w));
  assert.equal(at(w, 6, 2), 1, picture(w));
  // (Between them: dim from both, or lit from one: never less than the most.)
  for (let x = 1; x <= 12; x++) assert.ok(at(w, x, 2) >= 1 || x === 3 || x === 9, `${x},2 dark between two braziers\n${picture(w)}`);
});

test("the player's lamp lights round them and goes with them; out, it lights nothing", () => {
  const w = scenario(`
    ######################
    #@...................#
    ######################
  `);
  // (The lamp: full 5, dim 1, faint 3.)
  assert.equal(at(w, 1, 1), 2);
  assert.equal(at(w, 5, 1), 2, picture(w));
  assert.equal(at(w, 7, 1), 1, picture(w));
  assert.equal(at(w, 9, 1), 1, picture(w));
  assert.equal(at(w, 11, 1), 0, picture(w));
  for (let i = 0; i < 6; i++) w.act({ do: "move", dx: 1, dy: 0 });
  assert.equal(w.player.x, 7);
  assert.equal(at(w, 11, 1), 2, `the lamp's light didn't go with the player\n${picture(w)}`);
  w.act({ do: "lamp" });
  assert.equal(at(w, 7, 1), 0, `the lamp out, still light\n${picture(w)}`);
});

test("a cultist's lantern lights round the cultist, wherever it goes", () => {
  const w = scenario(`
    ####################
    #@.................#
    #..............c...#
    ####################
  `, { sneaking: true, states: { c: "aggressive" } });
  w.player.hp = w.player.maxHp = 1000;
  for (let i = 0; i < 4; i++) {
    const c = w.actors.find((a) => a.kind === "cultist");
    assert.equal(at(w, c.x, c.y), 2, `no light round the cultist at ${c.x},${c.y}\n${picture(w)}`);
    w.act({ do: "wait" });
  }
});

test("no light without a source", () => {
  const w = scenario(`
    ##########
    #@.......#
    #........#
    ##########
  `, { sneaking: true });
  for (let y = 0; y < w.level.h; y++) for (let x = 0; x < w.level.w; x++) assert.equal(at(w, x, y), 0, `${x},${y} lit\n${picture(w)}`);
});

test("the same light after saving and taking the run up again", () => {
  const w = new World(9);
  w.act({ do: "lamp" });
  const back = World.restore(JSON.parse(JSON.stringify(w.save())));
  for (let y = 0; y < w.level.h; y++) for (let x = 0; x < w.level.w; x++) assert.equal(back.light.at(x, y), w.light.at(x, y), `${x},${y}`);
});

test("a player in light is noticed as one with the lamp lit", () => {
  // (A goblin by a brazier, the player in its light, the lamp out: noticed
  // as soon as with the lamp lit in the dark.)
  const when = (map, sneaking) => {
    const w = scenario(map, { sneaking });
    for (let t = 1; t <= 200; t++) { w.act({ do: "wait" }); if (w.actors.some((a) => a.kind === "goblin" && a.state !== "neutral")) return t; }
    return null;
  };
  const inLight = when(`
    ##############
    #...B.@...g..#
    ##############
  `, true);
  const inDark = when(`
    ##############
    #.....@...g..#
    ##############
  `, true);
  assert.ok(inLight !== null, "a player in a brazier's light never noticed");
  assert.ok(inDark === null || inDark > inLight, `noticed in ${inLight} turns in the light, ${inDark} in the dark`);
});
