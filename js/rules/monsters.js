// How monsters move by their state: milling, patrolling, investigating, chasing, fleeing; the ways they find.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, GOBLIN } from "./content.js";
import { DIRS8 } from "./dungeon.js";

export const monsterMethods = {
  // A suspicious monster goes to look where it last saw or heard the player.
  investigate(g) {
    const t = g.lastSpot;
    if (!t || (g.x === t.x && g.y === t.y)) return this.randomStep(g);
    // (Slowly: not every turn.)
    if (this.dice.minds.chance(0.7)) this.stepToward(g, t.x, t.y);
  },

  // A fleeing monster gets away from the player; cornered, it fights. When
  // its fear is spent it rejoins its pack, wary.
  flee(g) {
    const p = this.player, dist = this.chaseSteps(), W = this.level.w, here = dist[g.y * W + g.x];
    if (--g.fear <= 0) {
      g.state = "neutral";
      g.wary = true;
      g.aware = 0.3;
      return;
    }
    let best = null;
    for (const [sx, sy] of this.dice.minds.shuffle([...DIRS8])) {
      const x = g.x + sx, y = g.y + sy;
      if (!this.isFree(x, y) || !this.canStep(g.x, g.y, sx, sy)) continue;
      const d = dist[y * W + x];
      if (d < 0 || (here >= 0 && d <= here)) continue;
      if (!best || d > best.d) best = { x, y, d };
    }
    if (best) return this.moveActor(g, best.x, best.y);
    if (Math.max(Math.abs(p.x - g.x), Math.abs(p.y - g.y)) === 1) this.strike(g);
  },

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
  },

  // An aggressive goblin: next to the player, it attacks; otherwise a step
  // nearer, opening a shut door in the way now and then.
  chase(g) {
    const p = this.player, dx = p.x - g.x, dy = p.y - g.y;
    // (A bat flits about even chasing.)
    if (MONSTERS[g.kind].erratic && this.dice.minds.chance(0.4)) return this.randomStep(g);
    if (Math.max(Math.abs(dx), Math.abs(dy)) === 1 && this.canStep(g.x, g.y, dx, dy) && !this.shut(p.x, p.y)) {
      if (!this.dead) this.strike(g);
      return;
    }
    const dist = this.chaseSteps(), W = this.level.w, here = dist[g.y * W + g.x];
    if (here < 0) return this.mill(g);
    let best = null;
    for (const [sx, sy] of this.dice.minds.shuffle([...DIRS8])) {
      const x = g.x + sx, y = g.y + sy, d = dist[y * W + x];
      if (d < 0 || d >= here || !this.canStep(g.x, g.y, sx, sy)) continue;
      if (this.actorAt(x, y)) continue;
      if (!best || d < best.d) best = { x, y, d };
    }
    if (!best) return;
    if (this.shut(best.x, best.y)) {
      if (this.dice.minds.chance(GOBLIN.door)) this.setDoor(this.doorAt(best.x, best.y), true, g);
      else this.events.push({ type: "rattle", actor: g });
      return;
    }
    this.moveActor(g, best.x, best.y);
  },

  // Leaders wander; the rest of the pack stays within two steps of them.
  mill(g) {
    const L = g.leader, M = MONSTERS[g.kind], k = M.wander;
    // (Spiders and the king wait where they are.)
    if (M.lurker) return;
    if (L === g) {
      // (Cultists walk from room to room.)
      if (M.patrol) return this.patrol(g);
      if (this.dice.minds.chance(0.4 * k)) this.randomStep(g);
      return;
    }
    const near = (x, y) => Math.max(Math.abs(x - L.x), Math.abs(y - L.y)) <= 2;
    if (!near(g.x, g.y)) return this.stepToward(g, L.x, L.y);
    if (this.dice.minds.chance(0.6 * k)) this.randomStep(g, near);
  },

  // A patrol's leader walks to a room (picked anew on getting there), by the
  // shortest way.
  patrol(g) {
    const rooms = this.level.rooms;
    if (!g.goal || (Math.abs(g.x - g.goal.x) <= 1 && Math.abs(g.y - g.goal.y) <= 1) || this.dice.minds.chance(0.01)) {
      const r = this.dice.minds.pick(rooms);
      g.goal = { x: r.cx, y: r.cy };
    }
    if (!this.dice.minds.chance(0.7)) return;
    const step = this.stepOnWay(g, g.goal);
    // (The way's last step may be onto someone standing at the goal: wait.)
    if (step) { if (this.isFree(step.x, step.y)) this.moveActor(g, step.x, step.y); }
    else g.goal = null;
  },

  // The first step on the shortest way from `a` to `t` (walking, through open
  // doors), within 60 squares; null if none.
  stepOnWay(a, t) {
    const W = this.level.w, key = (x, y) => y * W + x, prev = new Map([[key(a.x, a.y), -1]]), q = [[a.x, a.y]];
    for (let i = 0; i < q.length && i < 6000; i++) {
      const [x, y] = q[i];
      if (x === t.x && y === t.y) {
        let k = key(x, y), first = null;
        while (prev.get(k) !== -1) { first = k; k = prev.get(k); }
        return first === null ? null : { x: first % W, y: Math.floor(first / W) };
      }
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !this.canStep(x, y, dx, dy) || !this.walkable(nx, ny) || this.shut(nx, ny)) continue;
        if (this.actorAt(nx, ny) && !(nx === t.x && ny === t.y)) continue;
        prev.set(k, key(x, y));
        q.push([nx, ny]);
      }
    }
    return null;
  },

  randomStep(a, ok = () => true) {
    for (const [dx, dy] of this.dice.minds.shuffle([...DIRS8])) {
      const x = a.x + dx, y = a.y + dy;
      if (this.isFree(x, y) && this.canStep(a.x, a.y, dx, dy) && ok(x, y)) return this.moveActor(a, x, y);
    }
  },

  stepToward(a, tx, ty) {
    const dx = Math.sign(tx - a.x), dy = Math.sign(ty - a.y);
    for (const [sx, sy] of [[dx, dy], [dx, 0], [0, dy]]) {
      if ((sx || sy) && this.isFree(a.x + sx, a.y + sy) && this.canStep(a.x, a.y, sx, sy)) return this.moveActor(a, a.x + sx, a.y + sy);
    }
  },
};
