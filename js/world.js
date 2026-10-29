// The world: one map, the player, and a few packs of goblins milling about.
// Turn-based: goblins take a step each time the player does.

import { RNG } from "./rng.js";
import { generateLevel, T, isWalkable, DIRS8 } from "./dungeon.js";

export class World {
  constructor(seed) {
    this.rng = new RNG(seed);
    this.seed = this.rng.seed;
    this.events = [];
    this.nextId = 1;
    const level = (this.level = generateLevel(this.rng));
    this.player = { id: this.nextId++, kind: "player", glyph: "@", x: level.start.x, y: level.start.y };
    this.actors = [this.player];
    const rooms = this.rng.shuffle(level.rooms.filter((r) => r !== level.startRoom));
    for (const room of rooms.slice(0, 4)) this.spawnPack(room, this.rng.int(4, 7));
  }

  spawnPack(room, n) {
    let leader = null;
    for (let k = 0; k < n; k++) {
      const spot = this.freeSpotIn(room);
      if (!spot) break;
      const g = { id: this.nextId++, kind: "goblin", glyph: "g", x: spot.x, y: spot.y };
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
  doorAt(x, y) { return this.level.doors.get(y * this.level.w + x); }
  actorAt(x, y) { return this.actors.find((a) => a.x === x && a.y === y); }
  isFree(x, y) {
    const t = this.tileAt(x, y);
    if (t === T.DOOR && !this.doorAt(x, y).open) return false;
    return isWalkable(t) && !this.actorAt(x, y);
  }

  // Returns true if a turn passed.
  playerMove(dx, dy) {
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    if (this.actorAt(nx, ny)) return false;
    const t = this.tileAt(nx, ny);
    if (t === T.DOOR && !this.doorAt(nx, ny).open) {
      this.doorAt(nx, ny).open = true;
      this.events.push({ type: "door", door: this.doorAt(nx, ny) });
      return this.tick();
    }
    if (!isWalkable(t)) return false;
    this.moveActor(p, nx, ny);
    return this.tick();
  }

  tick() {
    for (const g of this.actors) if (g !== this.player) this.mill(g);
    return true;
  }

  // Leaders wander; the rest of the pack stays within two steps of them.
  mill(g) {
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
      if (this.isFree(x, y) && ok(x, y)) return this.moveActor(a, x, y);
    }
  }

  stepToward(a, tx, ty) {
    const dx = Math.sign(tx - a.x), dy = Math.sign(ty - a.y);
    for (const [sx, sy] of [[dx, dy], [dx, 0], [0, dy]]) {
      if ((sx || sy) && this.isFree(a.x + sx, a.y + sy)) return this.moveActor(a, a.x + sx, a.y + sy);
    }
  }

  moveActor(a, x, y) {
    this.events.push({ type: "move", actor: a });
    a.x = x;
    a.y = y;
  }
}
