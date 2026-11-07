// Single rules, tried on small maps (tests/support/scenario.js): the rules
// as they are now. When a feature set changes a rule, its test here changes
// with it, written from the spec before the rule is built.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scenario, picture, turnsUntil } from "./support/scenario.js";

const ROOM = `
  ##########
  #@.......#
  #........#
  #........#
  ##########
`;

test("a brazier lights what it can see; a shut door stops its light", () => {
  const w = scenario(`
    ###########
    #@...#....#
    #....+..B.#
    #....#....#
    ###########
  `);
  const lit = (x, y) => !!w.lit[y * w.level.w + x];
  assert.ok(lit(6, 2) && lit(9, 1), picture(w));
  assert.ok(!lit(4, 2) && !lit(1, 1), `the light passed the shut door\n${picture(w)}`);
});

test("a blow at a sleeping monster always lands, three times as hard", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = scenario(ROOM.replace("@.", "@g"), { seed, states: { g: "sleeping" } });
    w.playerMove(1, 0);
    const blow = w.events.find((e) => e.type === "whack");
    assert.ok(blow.hit && blow.sneak, `seed ${seed}: missed, or not a sneak blow`);
    assert.ok(blow.dmg >= 3 && blow.dmg % 3 === 0, `seed ${seed}: a sneak blow of ${blow.dmg}`);
  }
});

test("struck, the monster and its pack turn on the player", () => {
  const w = scenario(`
    ##########
    #@g......#
    #......gg#
    ##########
  `, { states: { g: "sleeping" } });
  w.playerMove(1, 0);
  for (const g of w.actors.filter((a) => a.kind === "goblin")) assert.equal(g.state, "aggressive", picture(w));
});

test("an angry monster comes for the player and strikes", () => {
  const w = scenario(ROOM.replace("#........#\n  ##", "#.......z#\n  ##"), { states: { z: "aggressive" } });
  w.player.hp = w.player.maxHp = 1000;
  const turns = turnsUntil(w, (w) => w.events.some((e) => e.type === "attack"), { max: 60 });
  assert.ok(turns !== null, `the zombie never struck\n${picture(w)}`);
});

test("a monster sees a lit player sooner than one with the lamp out", () => {
  const when = (sneaking) => {
    const w = scenario(ROOM.replace("#........#\n  #........#\n  ##", "#........#\n  #.....g..#\n  ##"), { sneaking });
    return turnsUntil(w, (w) => w.actors.some((a) => a.kind === "goblin" && a.state !== "neutral"), { max: 200, act: (w) => w.tick() });
  };
  const lit = when(false), dark = when(true);
  assert.ok(lit !== null, "a lit player never noticed");
  assert.ok(dark === null || dark > lit, `noticed in ${lit} turns lit, ${dark} with the lamp out`);
});

test("walking into a shut door opens it, and takes the turn", () => {
  const w = scenario(`
    #######
    #@+...#
    #######
  `);
  const turn = w.turn;
  w.playerMove(1, 0);
  assert.equal(w.doorAt(2, 1).open, true);
  assert.equal(w.player.x, 1, "stepped into the door's square as it opened");
  assert.equal(w.turn, turn + 1);
});

test("no resting with a monster in sight", () => {
  const w = scenario(ROOM.replace("#........#\n  ##", "#.......g#\n  ##"));
  w.player.hp = 5;
  assert.match(w.cantRest() ?? "", /enemy in sight/);
});

test("searching next to a secret door finds it", () => {
  const w = scenario(`
    #####
    #@S.#
    #####
  `);
  const turns = turnsUntil(w, (w) => w.level.secrets[0].found, { max: 50 });
  assert.ok(turns !== null, "never found");
  assert.ok(w.doorAt(2, 1), "found, but no door there");
});

// ---- The player's actions as commands (js/rules/actions.js) ----

test("resting goes on till healed and well, a turn at a time", () => {
  const w = scenario(ROOM);
  w.player.hp = w.player.maxHp - 3;
  assert.ok(w.act({ do: "rest" }));
  let turns = 0;
  while (w.doing && turns < 500) { w.goOn(); turns++; }
  assert.equal(w.doing, null);
  assert.equal(w.player.hp, w.player.maxHp);
  assert.match(w.messages.at(-1).text, /You feel rested/);
});

test("resting stops when something stirs", () => {
  const w = scenario(`
    ##############
    #@...........#
    ##############
  `);
  w.player.hp = 5;
  w.act({ do: "rest" });
  w.goOn();
  w.placeMonster("zombie", 8, 1, { state: "aggressive" });
  let turns = 0;
  while (w.doing && turns < 50) { w.goOn(); turns++; }
  assert.equal(w.doing, null);
  assert.ok(w.messages.some((m) => /stop resting/.test(m.text)), w.messages.map((m) => m.text).join(" | "));
});

test("walking to a square goes there and, if told, picks up what's there", () => {
  const w = scenario(ROOM);
  w.items.push({ x: 6, y: 3, item: { type: "dagger", glyph: "/", n: 1 } });
  w.act({ do: "walk", to: { x: 6, y: 3 }, then: { do: "pickUp" } });
  let turns = 0;
  while (w.doing && turns < 50) { w.goOn(); turns++; }
  assert.deepEqual([w.player.x, w.player.y], [6, 3]);
  assert.ok(w.player.pack.some((it) => it.type === "dagger"), "didn't pick it up");
});

test("exploring stops when a monster comes into sight", () => {
  const w = scenario(`
    ####################
    #@.................#
    #####.##############
        #.#
        #.#
        #g#
        ###
  `);
  w.act({ do: "explore" });
  let turns = 0;
  while (w.doing && turns < 100) { w.goOn(); turns++; }
  assert.ok(w.messages.some((m) => /comes into sight/.test(m.text)), `${picture(w)}\n${w.messages.map((m) => m.text).join(" | ")}`);
});

test("no exploring with a monster about that's after you", () => {
  const w = scenario(ROOM.replace("#........#\n  ##", "#.......g#\n  ##"), { states: { g: "aggressive" } });
  assert.equal(w.act({ do: "explore" }), false);
  assert.match(w.messages.at(-1).text, /Not with a goblin about/);
});

test("the lamp out: sight close round; lit again: far", () => {
  const w = scenario(ROOM);
  const far = w.sight;
  w.act({ do: "lamp" });
  assert.ok(w.sneaking && w.sight < far, `sight ${w.sight} with the lamp out, ${far} lit`);
  w.act({ do: "lamp" });
  assert.ok(!w.sneaking && w.sight === far);
});

// ---- A level's state kept with it (groundwork G4) ----

test("a level keeps what changed on it while the player is away", async () => {
  const { levelFromText } = await import("./support/scenario.js");
  const { World } = await import("../js/rules/world.js");
  const upper = levelFromText(`
    ########
    #@'.g.>#
    ########
  `), lower = levelFromText(`
    #######
    #<...+#
    #######
  `);
  const w = new World(1, { levels: { 1: upper.level, 2: lower.level } });
  w.placeMonster("goblin", 4, 1, { state: "sleeping" });
  w.items.push({ x: 3, y: 1, item: { type: "dagger", glyph: "/", n: 1 } });
  w.act({ do: "close", x: 2, y: 1 });
  Object.assign(w.player, { x: 6, y: 1 });
  w.act({ do: "stairs", dir: "down" });
  assert.equal(w.place.depth, 2);
  assert.ok(!w.actors.some((a) => a.kind === "goblin") && !w.items.length, "the upper level's goblin or dagger came down too");
  w.act({ do: "move", dx: 1, dy: 0 });
  w.act({ do: "stairs", dir: "up" });
  assert.ok(w.place.depth === 2, "went up from off the stairs");
  Object.assign(w.player, { x: 1, y: 1 });
  w.act({ do: "stairs", dir: "up" });
  assert.equal(w.place.depth, 1);
  assert.deepEqual([w.player.x, w.player.y], [6, 1], "not back on the stairs down");
  assert.equal(w.doorAt(2, 1).open, false, "the door shut before going down is open again");
  assert.ok(w.items.some((f) => f.item.type === "dagger"), "the dagger is gone");
  assert.ok(w.actors.some((a) => a.kind === "goblin"), "the goblin is gone");
  assert.equal(w.actors[0], w.player, "the player isn't first among the actors");
  assert.equal(w.actors.filter((a) => a === w.player).length, 1);
});
