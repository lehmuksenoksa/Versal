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
