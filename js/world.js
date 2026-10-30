// The world: one map, the player, and a few packs of goblins. Turn-based:
// each turn the player acts (steps, whacks a goblin in the way, opens or
// closes a door, or waits) and the goblins, a little slower, act after.
// The player sees what lies in their field of view, and remembers what they
// have seen; with the lamp out (sneaking) they see less, and are noticed
// less, unless they stand where the level's lights fall.
// A goblin is "neutral" (milling about with its pack), "sleeping" (still;
// some packs start so), or "aggressive" (chasing the player, attacking when
// next to them, opening doors in the way now and then). A pack turns
// together; it gives up when the player is out of its sight a while, or far
// off.

import { RNG } from "./rng.js";
import { T, isWalkable, isOpen, DIRS8 } from "./dungeon.js";
import { generateAreas } from "./levelgen.js";
import { computeFov } from "./fov.js";

const GOBLIN = {
  // Moves a goblin makes for each of the player's.
  speed: 0.75,
  // Hits it takes.
  hp: [1, 2],
  // How far (in squares) a goblin notices the player, lamp lit and out; and
  // a sleeper.
  notice: 7, noticeSneaking: 3, wake: 3, wakeSneaking: 1,
  // The chance, each turn, that a goblin notices a sneaking player in reach.
  sneakChance: 0.5,
  // An aggressive pack gives up after this many turns not seeing the player,
  // or at once when they are further off than `lose`.
  calm: 8, lose: 14,
  // The chance a chasing goblin gets a shut door open.
  door: 0.5,
  // How far off a whack wakes sleeping packs.
  hearWhack: 8,
};
// The player's chance to hit with a whack.
const WHACK = 0.75;

export class World {
  constructor(seed, { sight = 9 } = {}) {
    this.sight = sight;
    this.sneaking = false;
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
    // Squares in the way though floor (campfires), and squares lit by the
    // level's lights (no sneaking there).
    this.blocks = level.blocks ?? new Set();
    this.lit = new Uint8Array(level.w * level.h);
    const opaque = (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y);
    for (const l of level.lights ?? [])
      computeFov(level.w, level.h, Math.floor(l.x), Math.floor(l.y), 5.5, opaque, (x, y) => (this.lit[y * level.w + x] = 1));
    // (A lit place, and the open squares next to it, its light's dim band.)
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        if (!level.lit?.[y * level.w + x]) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!opaque(x + dx, y + dy)) this.lit[(y + dy) * level.w + x + dx] = 1;
      }
    // A pack round every campfire, awake; and in about a third of the rooms.
    const rooms = this.rng.shuffle(level.rooms.filter((r) => r !== level.startRoom)).sort((a, b) => (b.campfire ? 1 : 0) - (a.campfire ? 1 : 0));
    const packs = Math.max(Math.round(level.rooms.length / 3), rooms.filter((r) => r.campfire).length);
    for (const room of rooms.slice(0, packs)) this.spawnPack(room, this.rng.int(4, 7), room.campfire ? "neutral" : null);
    this.visible = new Uint8Array(level.w * level.h);
    this.seen = new Uint8Array(level.w * level.h);
    // What has a line of sight to the player (for goblins noticing them,
    // whatever the player can see).
    this.inView = new Uint8Array(level.w * level.h);
    this.updateFov();
  }

  updateFov() {
    const { w, h } = this.level, opaque = (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y);
    this.visible.fill(0);
    computeFov(w, h, this.player.x, this.player.y, this.sight, opaque, (x, y) => {
      this.visible[y * w + x] = 1;
      this.seen[y * w + x] = 1;
    });
    this.inView.fill(0);
    computeFov(w, h, this.player.x, this.player.y, GOBLIN.lose, opaque, (x, y) => (this.inView[y * w + x] = 1));
  }

  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; }

  spawnPack(room, n, state = null) {
    let leader = null;
    state ??= this.rng.chance(0.35) ? "sleeping" : "neutral";
    for (let k = 0; k < n; k++) {
      const spot = this.freeSpotIn(room);
      if (!spot) break;
      const g = { id: this.nextId++, kind: "goblin", glyph: "g", x: spot.x, y: spot.y, state, calm: 0, hp: this.rng.int(...GOBLIN.hp), energy: this.rng.next() };
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
  isFree(x, y) { return this.walkable(x, y) && !this.shut(x, y) && !this.actorAt(x, y); }
  walkable(x, y) { return isWalkable(this.tileAt(x, y)) && !this.blocks.has(y * this.level.w + x); }
  // The door in the square (x, y), if any; whether one is there and shut.
  doorAt(x, y) { return this.doors.get(y * this.level.w + x); }
  shut(x, y) { return this.doorAt(x, y)?.open === false; }
  // Can a step go from (x, y) by (dx, dy)? Not diagonally past a post.
  canStep(x, y, dx, dy) {
    if (!dx || !dy) return true;
    return !this.posts.has((y + (dy > 0 ? 1 : 0)) * (this.level.w + 1) + x + (dx > 0 ? 1 : 0));
  }
  pack(g) { return this.actors.filter((a) => a.kind === "goblin" && a.leader === g.leader); }

  // The player steps by (dx, dy): into a goblin, a whack; into a shut door,
  // opening it. Returns true if a turn passed.
  playerMove(dx, dy) {
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    if (!this.canStep(p.x, p.y, dx, dy)) return false;
    const g = this.actorAt(nx, ny);
    if (g && g.kind === "goblin") {
      this.whack(g);
      return this.tick();
    }
    if (g || !this.walkable(nx, ny)) return false;
    if (this.shut(nx, ny)) {
      this.setDoor(this.doorAt(nx, ny), true, p);
      return this.tick();
    }
    this.moveActor(p, nx, ny);
    return this.tick();
  }

  // Close an open door next to the player (none standing in it). Returns
  // true if one was, which takes the turn.
  closeDoor() {
    const p = this.player;
    for (const [dx, dy] of DIRS8) {
      const d = this.doorAt(p.x + dx, p.y + dy);
      if (!d || !d.open || this.actorAt(d.x, d.y)) continue;
      this.setDoor(d, false, p);
      return this.tick();
    }
    return false;
  }

  setDoor(door, open, by) {
    door.open = open;
    this.events.push({ type: "door", door, by });
  }

  // Lamp out (sneaking, seeing only `sight`) or lit again.
  setSneaking(on, sight) {
    this.sneaking = on;
    this.sight = sight;
    this.updateFov();
    this.events.push({ type: "sneak", on });
  }

  // A whack at goblin `g`: it may miss; a goblin out of hits falls. Its pack
  // turns on the player, and the noise wakes packs asleep near by.
  whack(g) {
    const hit = this.rng.chance(WHACK);
    if (hit) g.hp--;
    const killed = g.hp <= 0;
    this.events.push({ type: "whack", target: g, hit, killed });
    for (const a of this.pack(g)) {
      a.state = "aggressive";
      a.calm = 0;
    }
    if (killed) {
      this.actors.splice(this.actors.indexOf(g), 1);
      // (A pack whose leader falls follows another.)
      if (g.leader === g) {
        const rest = this.pack(g);
        for (const a of rest) a.leader = rest[0];
      }
    }
    const p = this.player;
    for (const a of this.actors)
      if (a.kind === "goblin" && a.state === "sleeping" && Math.hypot(a.x - p.x, a.y - p.y) <= GOBLIN.hearWhack) a.state = "neutral";
  }

  // A turn passes: the goblins act (each as its speed allows), then see
  // what they notice.
  tick() {
    this.updateFov();
    this.chaseMap = null;
    for (const g of [...this.actors]) {
      if (g === this.player) continue;
      g.energy += GOBLIN.speed;
      if (g.energy < 1) continue;
      g.energy -= 1;
      if (g.state === "aggressive") this.chase(g);
      else if (g.state === "neutral") this.mill(g);
    }
    this.updateFov();
    this.notice();
    return true;
  }

  // Goblins that see the player close by turn aggressive, their packs with
  // them; a sleeper only when very close. With the lamp out, only nearer
  // and not every turn. Aggressive packs give up after GOBLIN.calm turns of
  // not seeing the player, or when they are far off.
  notice() {
    const p = this.player, angry = new Set(), W = this.level.w;
    // (In a lit place, the lamp out hides nothing.)
    const hidden = this.sneaking && !this.lit[p.y * W + p.x];
    const reach = hidden ? GOBLIN.noticeSneaking : GOBLIN.notice, wake = hidden ? GOBLIN.wakeSneaking : GOBLIN.wake;
    for (const g of this.actors) {
      if (g === p) continue;
      const d = Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)), sees = this.inView[g.y * W + g.x] === 1;
      g.sees = sees;
      if (!sees || d > (g.state === "sleeping" ? wake : reach)) continue;
      if (hidden && !this.rng.chance(GOBLIN.sneakChance)) continue;
      angry.add(g.leader);
    }
    for (const g of this.actors) {
      if (g === p) continue;
      if (angry.has(g.leader)) {
        g.state = "aggressive";
        g.calm = 0;
      }
    }
    // (A pack keeps on while any of it sees the player.)
    for (const g of this.actors) {
      if (g === p || g.state !== "aggressive" || g.leader !== g) continue;
      const pack = this.pack(g), far = pack.every((a) => Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) > GOBLIN.lose);
      const calm = pack.some((a) => a.sees) ? 0 : (g.calm ?? 0) + 1;
      for (const a of pack) {
        a.calm = calm;
        if (far || calm >= GOBLIN.calm) a.state = "neutral";
      }
    }
  }

  // Steps to the player from each square (walking, through doors shut or
  // not), out a little past where packs give up.
  chaseSteps() {
    if (this.chaseMap) return this.chaseMap;
    const { w, h } = this.level, dist = new Int16Array(w * h).fill(-1), p = this.player, q = [p.y * w + p.x];
    dist[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const j = q[i], x = j % w, y = (j / w) | 0;
      if (dist[j] > GOBLIN.lose * 2) break;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy, k = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[k] >= 0 || !this.walkable(nx, ny) || !this.canStep(x, y, dx, dy)) continue;
        dist[k] = dist[j] + 1;
        q.push(k);
      }
    }
    return (this.chaseMap = dist);
  }

  // An aggressive goblin: next to the player, it attacks; otherwise a step
  // nearer, opening a shut door in the way now and then.
  chase(g) {
    const p = this.player, dx = p.x - g.x, dy = p.y - g.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) === 1 && this.canStep(g.x, g.y, dx, dy) && !this.shut(p.x, p.y)) {
      this.events.push({ type: "attack", actor: g });
      return;
    }
    const dist = this.chaseSteps(), W = this.level.w, here = dist[g.y * W + g.x];
    if (here < 0) return this.mill(g);
    let best = null;
    for (const [sx, sy] of this.rng.shuffle([...DIRS8])) {
      const x = g.x + sx, y = g.y + sy, d = dist[y * W + x];
      if (d < 0 || d >= here || !this.canStep(g.x, g.y, sx, sy)) continue;
      if (this.actorAt(x, y)) continue;
      if (!best || d < best.d) best = { x, y, d };
    }
    if (!best) return;
    if (this.shut(best.x, best.y)) {
      if (this.rng.chance(GOBLIN.door)) this.setDoor(this.doorAt(best.x, best.y), true, g);
      else this.events.push({ type: "rattle", actor: g });
      return;
    }
    this.moveActor(g, best.x, best.y);
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
