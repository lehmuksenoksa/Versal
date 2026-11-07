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
// An activity goes on a turn at a time (`goOn`) until done or stopped: by
// something stirring, something coming into sight, a hurt, something
// underfoot; the interface stops it for a key (`stop`).
// Methods of the World (js/rules/world.js), joined to it there.
import { PLAYER } from "./content.js";
import { an, monName } from "./names.js";
import { wayTo, wayToExplore, WALK } from "./travel.js";

export const actionMethods = {
  // Carry out a command; true if a turn passed (or an activity began).
  act(cmd) {
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
  goOn() {
    const D = this.doing;
    if (!D) return false;
    if (this.ended) return this.stop(null);
    return D.do === "rest" ? this.restTurn() : this.walkTurn();
  },

  // The activity stopped (and why, if it's worth saying); false.
  stop(why = null, kind = "") {
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
};

// (The player's sight, the lamp lit and out: tuning.json's.)
export const SIGHT = PLAYER.sight;
