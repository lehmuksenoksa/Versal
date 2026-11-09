// Light (spec/light-set.md, L1; light-and-dread.md, section 1), on small
// maps: each square dark (0), dim (1) or lit (2); lit within a light's full
// band, dim within its dim and faint bands; along lines of sight; the
// brightest wins; carried lights go with who carries them; no light without a
// source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scenario, picture } from "./support/scenario.js";
import { World } from "../js/rules/world.js";
import { PLAYER } from "../js/rules/content.js";

const at = (w, x, y) => w.light.at(x, y);

test("a brazier lights its lit band, then dim through its dim band, then nothing", () => {
  // (The brazier at 8,2, its middle 8.5,2.5: lit 2, dim 4, each reaching
  // half a step more: spec/light-rebuild.md, S2.)
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
  assert.equal(at(w, 12, 2), 1, picture(w));
  assert.equal(at(w, 13, 2), 0, picture(w));
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
  // (The lamp: lit 5, dim 6.)
  assert.equal(at(w, 1, 1), 2);
  assert.equal(at(w, 6, 1), 2, picture(w));
  assert.equal(at(w, 7, 1), 1, picture(w));
  assert.equal(at(w, 8, 1), 0, picture(w));
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

// ---- The player's sight by light (L2; light-and-dread.md, section 2) ----

const sees = (w, x, y) => w.isVisible(x, y);

test("a lit room is seen from the dark, however far", () => {
  const w = scenario(`
    ###############################
    #@..........................B.#
    ###############################
  `, { sneaking: true });
  assert.ok(sees(w, 27, 1) && sees(w, 29, 1), `the lit end not seen from 26 squares off\n${picture(w)}`);
  assert.ok(!sees(w, 12, 1), `a dark square 11 off seen\n${picture(w)}`);
});

test("in the dark, the player sees 3 steps round them, round (within 3½: spec/light-rebuild.md, S1), no further", () => {
  const w = scenario(`
    ############
    #@.........#
    #..........#
    #..........#
    #..........#
    #..........#
    ############
  `, { sneaking: true });
  assert.ok(sees(w, 4, 1) && sees(w, 3, 3), picture(w));
  assert.ok(!sees(w, 5, 1) && !sees(w, 1, 5) && !sees(w, 4, 4), picture(w));
});

test("with the lamp lit, the player sees as far as its light reaches, and their dark vision 3 past it", () => {
  const w = scenario(`
    ######################
    #@...................#
    ######################
  `);
  assert.ok(sees(w, 10, 1), picture(w));
  assert.ok(!sees(w, 11, 1), picture(w));
});

test("walls still hide what's lit beyond them", () => {
  const w = scenario(`
    ##########
    #@..#.B..#
    #...#....#
    ##########
  `, { sneaking: true });
  assert.ok(!sees(w, 7, 1), picture(w));
});

test("what the player can tell: lit everything, dim the kind, dark close by only that something's there", () => {
  const w = scenario(`
    ##############################
    #@.g.......................B.#
    ##############################
  `, { sneaking: true, legend: { h: "goblin" } });
  // (A goblin 2 off in the dark; one in the brazier's light; one in its dim.)
  w.placeMonster("goblin", 28, 1);
  w.placeMonster("goblin", 23, 1);
  w.updateFov();
  assert.equal(w.knowAt(3, 1), 1, "the goblin in the dark close by");
  assert.equal(w.knowAt(28, 1), 3, "the goblin in the light");
  assert.equal(w.knowAt(23, 1), 2, "the goblin in the dim");
  assert.equal(w.knowAt(12, 1), 0, "a dark square far off");
});

test("a monster told in the light stays told as it goes off into the dark, and a few turns after it's lost from sight", () => {
  const w = scenario(`
    ##############################
    #@.........................B.#
    ##############################
  `, { sneaking: true });
  // (A goblin in the brazier's dim light: its kind told.)
  const g = w.placeMonster("goblin", 23, 1);
  w.updateFov();
  assert.equal(w.knowOf(g), 2, "told in the dim");
  // (It walks off into the dark close by the player: still a goblin, not "?".)
  g.x = 3;
  w.updateFov();
  assert.equal(w.knowAt(3, 1), 1, "the square only says something's there");
  assert.equal(w.knowOf(g), 2, "but the goblin is remembered");
  // (Lost from sight, back soon: still a goblin.)
  g.x = 12;
  w.updateFov();
  assert.equal(w.knowOf(g), 0, "out of sight");
  w.turn += PLAYER.remember - 1;
  g.x = 3;
  w.updateFov();
  assert.equal(w.knowOf(g), 2, "back soon: remembered");
  // (Lost again, back only after longer: only something.)
  g.x = 12;
  w.updateFov();
  w.turn += PLAYER.remember;
  w.updateFov();
  g.x = 3;
  w.updateFov();
  assert.equal(w.knowOf(g), 1, "back too late: something");
});

test("in the dark, the kind of what's next to the player, the diagonals too; further off only something", () => {
  const w = scenario(`
    #######
    #.....#
    #..@..#
    #.....#
    #######
  `, { sneaking: true });
  w.updateFov();
  assert.equal(w.knowAt(4, 2), 2, "next to them");
  assert.equal(w.knowAt(4, 3), 2, "the diagonal");
  assert.equal(w.knowAt(5, 2), 1, "two off");
  // (A skeleton seen next to them, stepping off: still a skeleton.)
  const s = w.placeMonster("skeleton", 4, 2);
  w.updateFov();
  s.x = 5;
  w.updateFov();
  assert.equal(w.knowOf(s), 2, "remembered as it steps off");
});

test("a thing told stays told in the dark; one never seen isn't remembered", () => {
  const w = scenario(`
    ##############################
    #@.........................B.#
    ##############################
  `, { sneaking: true });
  // (A potion in the brazier's dim light: told.)
  const potion = { x: 23, y: 1, item: { type: "potion", glyph: "!", n: 1 } };
  w.items.push(potion);
  w.updateFov();
  assert.equal(w.knowOfItem(potion), 2, "told in the dim");
  assert.ok(potion.seen && potion.told);
  // (The brazier's light gone: the potion in the dark now, still a potion.)
  w.level.lights.length = 0;
  w.light.changed();
  potion.x = 3;
  w.updateFov();
  assert.equal(w.knowAt(3, 1), 1, "the square only says something's there");
  assert.equal(w.knowOfItem(potion), 2, "but the potion is remembered");
  // (A thing dropped far off in the dark, never seen: not remembered.)
  w.items.push({ x: 12, y: 1, item: { type: "potion", glyph: "!", n: 1 } });
  w.updateFov();
  assert.ok(!w.items.at(-1).seen, "never seen");
});

test("the tips say only what can be told", async () => {
  const { tipFor } = await import("../js/tips.js");
  const w = scenario(`
    ##############################
    #@.g.......................B.#
    ##############################
  `, { sneaking: true });
  w.placeMonster("goblin", 28, 1, { trait: "savage" });
  w.placeMonster("goblin", 23, 1, { trait: "savage" });
  w.updateFov();
  const shown = () => true;
  assert.equal(tipFor(w, 3, 1, shown).title, "Something");
  assert.equal(tipFor(w, 23, 1, shown).title, "Goblin", "the dim one: its kind, no trait");
  assert.equal(tipFor(w, 23, 1, shown).lines.length, 0, "the dim one: no state, no wounds");
  assert.match(tipFor(w, 28, 1, shown).title, /Savage goblin/i, "the lit one: all of it");
});

// ---- Torches on the walls (L3) ----

test("a torch on a corridor's wall lights its bands along the corridor", () => {
  // (Its light from the middle of its square: lit 1, dim 2.)
  const w = scenario(`
    ###############
    #@...........##
    ######T#######
  `, { sneaking: true });
  assert.equal(at(w, 6, 1), 2, picture(w));
  assert.equal(at(w, 7, 1), 2, picture(w));
  assert.equal(at(w, 8, 1), 1, picture(w));
  assert.equal(at(w, 9, 1), 0, picture(w));
  assert.equal(at(w, 11, 1), 0, picture(w));
});

test("torches stand on corridors' walls in built ground, apart (100 levels)", async () => {
  const { levelFor } = await import("./support/levelcheck.js");
  const { TUNING_LEVELGEN } = await import("./support/levelcheck.js");
  let torches = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const w = levelFor(seed, 1), L = w.level, W = L.w;
    const mine = (L.lights ?? []).filter((l) => l.kind === "torch");
    torches += mine.length;
    for (const t of mine) {
      const x = Math.floor(t.x), y = Math.floor(t.y), f = L.features.find((f) => f.type === "torch" && f.x === t.fx && f.y === t.fy);
      assert.ok(f, `seed ${seed}: a torch's light with no torch`);
      assert.ok(w.walkable(x, y) && L.roomOf[y * W + x] < 0, `seed ${seed}: a torch not in a corridor at ${x},${y}`);
      assert.ok(!w.walkable(x + f.dx, y + f.dy), `seed ${seed}: a torch not against a wall at ${x},${y}`);
      assert.equal(L.area[y * W + x], 0, `seed ${seed}: a torch outside built ground at ${x},${y}`);
      for (const o of mine) if (o !== t) assert.ok(Math.max(Math.abs(Math.floor(o.x) - x), Math.abs(Math.floor(o.y) - y)) >= TUNING_LEVELGEN.torchApart, `seed ${seed}: two torches close at ${x},${y}`);
    }
  }
  assert.ok(torches > 100, `only ${torches} torches in 100 levels`);
});
