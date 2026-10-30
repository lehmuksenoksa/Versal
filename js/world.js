// The world: one map, the player, and a few packs of goblins milling about.
// Turn-based: goblins take a step each time the player does. The player sees
// what lies in their field of view, and remembers what they have seen.
// A goblin is "neutral" (milling about), "sleeping" (still; some packs start
// so), or "aggressive" (holding its ground, having seen the player close by);
// a pack turns together, and calms again once the player is out of sight a
// while.

import { RNG } from "./rng.js";
import { T, isWalkable, isOpen, DIRS8 } from "./dungeon.js";
import { generateAreas } from "./levelgen.js";
import { computeFov } from "./fov.js";

// Turns out of sight before an aggressive pack calms down.
const AGGRO_TURNS = 6;

export class World {
  constructor(seed, { sight = 9 } = {}) {
    this.sight = sight;
    this.rng = new RNG(seed);
    this.seed = this.rng.seed;
    this.events = [];
    this.nextId = 1;
    const level = (this.level = generateAreas(this.rng));
    // Pillars on grid crossings, which no step goes diagonally past; and the
    // doors, by their square.
    this.posts = new Set((level.posts ?? []).map(([x, y]) => y * (level.w + 1) + x));
    this.doors = new Map((level.doors ?? []).map((d) => [d.y * level.w + d.x, d]));
    this.player = { id: this.nextId++, kind: "player", glyph: "@", x: level.start.x, y: level.start.y };
    this.actors = [this.player];
    const rooms = this.rng.shuffle(level.rooms.filter((r) => r !== level.startRoom));
    // A pack in about a third of the rooms.
    for (const room of rooms.slice(0, Math.round(level.rooms.length / 3))) this.spawnPack(room, this.rng.int(4, 7));
    this.visible = new Uint8Array(level.w * level.h);
    this.seen = new Uint8Array(level.w * level.h);
    this.updateFov();
  }

  updateFov() {
    const { w, h } = this.level;
    this.visible.fill(0);
    computeFov(w, h, this.player.x, this.player.y, this.sight, (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y), (x, y) => {
      this.visible[y * w + x] = 1;
      this.seen[y * w + x] = 1;
    });
  }

  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; }

  spawnPack(room, n) {
    let leader = null;
    const state = this.rng.chance(0.35) ? "sleeping" : "neutral";
    for (let k = 0; k < n; k++) {
      const spot = this.freeSpotIn(room);
      if (!spot) break;
      const g = { id: this.nextId++, kind: "goblin", glyph: "g", x: spot.x, y: spot.y, state, calm: 0 };
      g.leader = leader || g;
      leader = g.leader;
      this.actors.push(g);
    }
  }

  freeSpotIn(room) {
    for (let tries = 0; tries < 40; tries++) {
      const x = this.rng.int(room.x, room.x + room.w - 1), y = this.rng.int(room.y, room.y + room.h - 1);
      if (this.tileAt(x, y) === T.FLOOR && this.isFree(x, y)) return { x, y };
    }
    return null;
  }

  tileAt(x, y) { return this.level.get(x, y); }
  actorAt(x, y) { return this.actors.find((a) => a.x === x && a.y === y); }
  isFree(x, y) { return isWalkable(this.tileAt(x, y)) && !this.shut(x, y) && !this.actorAt(x, y); }
  // The door in the square (x, y), if any; whether one is there and shut.
  doorAt(x, y) { return this.doors.get(y * this.level.w + x); }
  shut(x, y) { return this.doorAt(x, y)?.open === false; }
  // Can a step go from (x, y) by (dx, dy)? Not diagonally past a post.
  canStep(x, y, dx, dy) {
    if (!dx || !dy) return true;
    return !this.posts.has((y + (dy > 0 ? 1 : 0)) * (this.level.w + 1) + x + (dx > 0 ? 1 : 0));
  }

  // Returns true if a turn passed.
  playerMove(dx, dy) {
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    if (this.actorAt(nx, ny)) return false;
    if (!isWalkable(this.tileAt(nx, ny)) || !this.canStep(p.x, p.y, dx, dy)) return false;
    // Walking into a shut door opens it, which takes the turn.
    if (this.shut(nx, ny)) {
      const door = this.doorAt(nx, ny);
      door.open = true;
      this.events.push({ type: "door", door });
      return this.tick();
    }
    this.moveActor(p, nx, ny);
    return this.tick();
  }

  tick() {
    for (const g of this.actors) if (g !== this.player) this.mill(g);
    this.updateFov();
    this.notice();
    return true;
  }

  // Goblins that see the player close by (seen by them, as the player sees
  // them) turn aggressive, their packs with them; a sleeper only when very
  // close. Aggressive ones calm down after AGGRO_TURNS out of sight.
  notice() {
    const p = this.player, angry = new Set();
    for (const g of this.actors) {
      if (g === p) continue;
      const d = Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)), seen = this.isVisible(g.x, g.y);
      if (seen && d <= (g.state === "sleeping" ? 3 : 7)) angry.add(g.leader);
    }
    for (const g of this.actors) {
      if (g === p) continue;
      if (angry.has(g.leader)) {
        g.state = "aggressive";
        g.calm = 0;
      } else if (g.state === "aggressive" && ++g.calm >= AGGRO_TURNS) g.state = "neutral";
    }
  }

  // Leaders wander; the rest of the pack stays within two steps of them.
  mill(g) {
    // (Sleepers lie still; the aggressive hold their ground.)
    if (g.state !== "neutral") return;
    const L = g.leader;
    if (L === g) {
      if (this.rng.chance(0.4)) this.randomStep(g);
      return;
    }
    const near = (x, y) => Math.max(Math.abs(x - L.x), Math.abs(y - L.y)) <= 2;
    if (!near(g.x, g.y)) return this.stepToward(g, L.x, L.y);
    if (this.rng.chance(0.6)) this.randomStep(g, near);
  }

  randomStep(a, ok = () => true) {
    for (const [dx, dy] of this.rng.shuffle([...DIRS8])) {
      const x = a.x + dx, y = a.y + dy;
      if (this.isFree(x, y) && this.canStep(a.x, a.y, dx, dy) && ok(x, y)) return this.moveActor(a, x, y);
    }
  }

  stepToward(a, tx, ty) {
    const dx = Math.sign(tx - a.x), dy = Math.sign(ty - a.y);
    for (const [sx, sy] of [[dx, dy], [dx, 0], [0, dy]]) {
      if ((sx || sy) && this.isFree(a.x + sx, a.y + sy) && this.canStep(a.x, a.y, sx, sy)) return this.moveActor(a, a.x + sx, a.y + sy);
    }
  }

  moveActor(a, x, y) {
    this.events.push({ type: "move", actor: a });
    a.x = x;
    a.y = y;
  }
}
