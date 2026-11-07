// The player's actions (spec/groundwork.md, G2): everything the player does,
// as a command the rules carry out, the same for the keys, a tap, the bot
// and the tests. `act({ do, ... })`:
//   move { dx, dy }        a step (into a monster: a blow; into a shut door:
//                          opening it)
//   wait, search           a turn spent watching, or looking for secret doors
//   close { x?, y? }       shut a door next to the player (that one, or any)
//   stairs { dir }         up or down, standing on them
//   pickUp; drink, wield, drop { key }; takeOff { where }
//   lamp                   the lamp out, or lit again
//   rest                   rest till healed and well (an activity)
//   walk { to, near?, then? }  walk to a square seen, or up to it (`near`),
//                          then do `then` (a command); explore: walk to the
//                          nearest place not yet seen, and on (activities)
//   run { dx, dy }         run that way: along a corridor round its bends,
//                          straight on in the open, till something changes
//                          (an activity)
// An activity goes on a turn at a time (`goOn`) until done or stopped: by
// something stirring, something coming into sight, a hurt, something
// underfoot; the interface stops it for a key (`stop`).
// Methods of the World (js/rules/world.js), joined to it there.
import { PLAYER } from "./content.js";
import { an, monName } from "./names.js";
import { wayTo, wayToExplore, WALK } from "./travel.js";
import { encodeCall } from "./replay.js";
import { DIRS8 } from "./dungeon.js";

export const actionMethods = {
  // Carry out a command; true if a turn passed (or an activity began).
  // (Each call from outside the rules noted, for replays: replay.js.)
  act(cmd) { return this.noted(encodeCall(cmd), () => this.doAct(cmd)); },
  doAct(cmd) {
    if (this.ended) return false;
    switch (cmd.do) {
      case "move": return this.playerMove(cmd.dx, cmd.dy);
      case "wait": return this.tick();
      case "search": return this.search();
      case "close": return cmd.x === undefined ? this.closeDoor() : this.closeDoorAt(cmd.x, cmd.y);
      case "stairs": return this.takeStairs(cmd.dir);
      case "pickUp": return this.pickUp();
      case "drink": return this.drink(cmd.key);
      case "wield": return this.wield(cmd.key);
      case "drop": return this.drop(cmd.key);
      case "takeOff": return this.takeOff(cmd.where);
      case "lamp": return this.lamp();
      case "rest": return this.startRest();
      case "walk": return this.startWalk({ to: cmd.to, near: !!cmd.near, then: cmd.then ?? null });
      case "explore": return this.startWalk({ explore: true });
      case "run": return this.startRun(cmd.dx, cmd.dy);
    }
    throw new Error(`no action "${cmd.do}"`);
  },

  // The lamp out (sneaking, seeing only so far round) or lit again: no turn.
  lamp() {
    this.setSneaking(!this.sneaking);
    return true;
  },

  // ---- Activities: resting, walking, exploring ----
  // One turn of the activity under way (`doing`); true if a turn passed. It
  // goes on while `doing` stays.
  goOn() { return this.noted(".", () => this.doGoOn()); },
  doGoOn() {
    const D = this.doing;
    if (!D) return false;
    if (this.ended) return this.stop(null);
    return D.do === "rest" ? this.restTurn() : D.do === "run" ? this.runTurn() : this.walkTurn();
  },

  // The activity stopped (and why, if it's worth saying); false.
  stop(why = null, kind = "") { return this.noted(`!${JSON.stringify([why, kind])}`, () => this.doStop(why, kind)); },
  doStop(why, kind) {
    if (!this.doing) return false;
    this.doing = null;
    if (why) this.log(why, kind);
    return false;
  },

  // Rest till healed and well, or till something stirs.
  startRest() {
    const why = this.cantRest();
    if (why) { this.log(why); return false; }
    this.log("You rest.");
    this.doing = { do: "rest" };
    return true;
  },

  // A turn of rest (searching as it goes, as the player looks about).
  restTurn() {
    const p = this.player;
    if (this.disturbed()) return this.stop("Something stirs. You stop resting.");
    this.tick(true, true);
    if (!this.dead && p.hp >= p.maxHp && !Object.keys(p.ailments).length) this.stop("You feel rested.", "good");
    return true;
  },

  // The monsters in the player's sight, by id.
  inSightIds() { return this.actors.filter((a) => a !== this.player && this.isVisible(a.x, a.y)).map((a) => a.id); },

  // Walk by itself (travel.js): to a square, or up to it (`near`: a monster),
  // then `then`; or exploring. Not exploring with a monster about that's
  // after the player; not far, badly hurt.
  startWalk({ to = null, near = false, then = null, explore = false }) {
    this.doing = null;
    const after = explore && this.actors.find((a) => a !== this.player && this.isVisible(a.x, a.y) && (a.state === "aggressive" || a.state === "suspicious"));
    if (after) { this.log(`Not with ${an(monName(after))} about.`); return false; }
    const way = explore ? wayToExplore(this) : wayTo(this, to.x, to.y);
    if (!way) { this.log(explore ? "There's nothing left to explore that you can reach." : "You can't see a way there."); return false; }
    if (way.length > 1 && this.player.hp < this.player.maxHp * WALK.tooHurt) { this.log("You're too hurt to go far. Rest first (r)."); return false; }
    this.doing = { do: explore ? "explore" : "walk", ...(to ? { to: { x: to.x, y: to.y } } : {}), near, then, seen: this.inSightIds(), hp: this.player.hp };
    return true;
  },

  // A step of the walk, the way found afresh; stopped by a monster not in
  // sight before coming into it, a hit point lost, something underfoot (not
  // what it was walking to); there, what it was to do.
  walkTurn() {
    const D = this.doing, p = this.player, explore = D.do === "explore";
    const way = explore ? wayToExplore(this) : wayTo(this, D.to.x, D.to.y);
    const there = way && (D.near ? way.length <= 1 : way.length === 0);
    if (!way || there) {
      this.stop(!way && explore ? "There's nothing left to explore that you can reach." : null);
      return there && D.then ? this.act(D.then) : false;
    }
    const s = way[0];
    if (!this.playerMove(s.x - p.x, s.y - p.y)) return this.stop(null);
    const now = this.inSightIds(), fresh = this.actors.find((a) => now.includes(a.id) && !D.seen.includes(a.id));
    if (fresh) { this.stop(`You stop: ${an(monName(fresh))} comes into sight.`); return true; }
    D.seen = now;
    if (p.hp < D.hp || this.ended) { this.stop(null); return true; }
    const atEnd = !explore && p.x === D.to.x && p.y === D.to.y;
    if (!atEnd && this.itemsAt(p.x, p.y).length) this.stop(null);
    return true;
  },

  // ---- Running ----
  // Run that way (not with a monster in sight).
  startRun(dx, dy) {
    this.doing = null;
    const seen = this.inSightIds();
    if (seen.length) { this.log("Not with a monster in sight."); return false; }
    this.doing = { do: "run", dx, dy, seen, hp: this.player.hp, sides: null, corridor: null, from: { x: this.player.x, y: this.player.y }, steps: 0 };
    return true;
  },

  // A step of the run. Ahead if it can; in a corridor (one way on, not
  // back), round its bend. Then stopped where something changes: an opening
  // beside or a wall ending (what's open to either side is not as it was),
  // a door by the way, stairs or a thing underfoot, a monster coming into
  // sight, a hit point lost.
  runTurn() {
    const D = this.doing, p = this.player;
    const open = (x, y) => this.walkable(x, y);
    const can = ([dx, dy]) => open(p.x + dx, p.y + dy) && this.canStep(p.x, p.y, dx, dy) && !this.actorAt(p.x + dx, p.y + dy);
    // (The ways on from here, going `way`: open, not back nor 45° from back,
    // as openings: ways side by side round the compass make one. A
    // corridor: one opening, no wider than two ways (straight on, or a
    // bend's corner).)
    const openings = (way) => {
      const on = RING.map((d) => can(d) && Math.abs(d[0] + way[0]) + Math.abs(d[1] + way[1]) > 1);
      const start = on.indexOf(false), groups = [];
      if (start < 0) return [RING.slice()];
      for (let k = 1, cur = null; k <= 8; k++) {
        const i = (start + k) % 8;
        if (on[i]) (cur ??= groups[groups.push([]) - 1]).push(RING[i]);
        else cur = null;
      }
      return groups;
    };
    // (In the open: floor two squares wide anywhere round the player.)
    const wide = () => [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([ox, oy]) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([ax, ay]) => open(p.x + ox + ax, p.y + oy + ay)));
    const corridor = (g) => g.length === 1 && g[0].length <= 2 && !wide();
    let way = [D.dx, D.dy];
    const here = openings(way);
    D.corridor ??= corridor(here);
    if (!can(way)) {
      // (Round a corridor's bend, straight steps before diagonal; else stop.)
      if (!D.corridor || !corridor(here)) return this.stop(null);
      way = [...here[0]].sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - (Math.abs(b[0]) + Math.abs(b[1])))[0];
      D.sides = null;
    }
    if (!this.playerMove(way[0], way[1])) return this.stop(null);
    [D.dx, D.dy] = way;
    // (Round a loop to where it began, or far enough: stop.)
    if ((p.x === D.from.x && p.y === D.from.y) || ++D.steps >= RUN_MAX) { this.stop(null); return true; }
    const now = this.inSightIds(), fresh = this.actors.find((a) => now.includes(a.id) && !D.seen.includes(a.id));
    if (fresh) { this.stop(`You stop: ${an(monName(fresh))} comes into sight.`); return true; }
    D.seen = now;
    if (p.hp < D.hp || this.ended) { this.stop(null); return true; }
    const L = this.level, at = (s) => s && s.x === p.x && s.y === p.y;
    if (this.itemsAt(p.x, p.y).length || at(L.stairsDown) || at(L.stairsUp) || this.doorAt(p.x, p.y)) { this.stop(null); return true; }
    // (A door beside or ahead: stop by it.)
    if (DIRS8.some(([dx, dy]) => (!dx || !dy) && !(dx === -way[0] && dy === -way[1]) && this.doorAt(p.x + dx, p.y + dy))) { this.stop(null); return true; }
    // (In a corridor: on, bends and all. Leaving one, at a junction or the
    // open: stop. In the open: stop where what's open to the left and right
    // of the way changes, an opening or a wall's end.)
    if (corridor(openings(way))) { D.corridor = true; D.sides = null; return true; }
    if (D.corridor) { this.stop(null); return true; }
    const [lx, ly] = [way[1], -way[0]], sides = [open(p.x + lx, p.y + ly), open(p.x - lx, p.y - ly)].join();
    if (D.sides !== null && sides !== D.sides) { this.stop(null); return true; }
    D.sides = sides;
    return true;
  },
};

// A run's longest, in steps.
const RUN_MAX = 300;

// The eight ways round the compass, in order (for running's openings).
const RING = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

// (The player's sight, the lamp lit and out: tuning.json's.)
export const SIGHT = PLAYER.sight;
