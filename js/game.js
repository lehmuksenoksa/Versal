// Game rules: turns, monsters and their swarming, combat, items, levels.
// The renderer reads state from here and consumes `events` to animate.

import { RNG } from "./rng.js";
import { generateLevel, T, isWalkable, bfs, DIRS8 } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { MONSTERS, NPCS, ITEMS, WEAPONS, ARMOURS, DEPTHS, MAX_DEPTH } from "./content.js";

const FOV_RADIUS = 9;

const VERBS = {
  rat: "bites", bat: "nips", goblin: "stabs", kobold: "slashes", zombie: "claws",
  skeleton: "hacks at", orc: "cleaves", troll: "pummels", goblinKing: "batters you with his sceptre", dragon: "rends",
};

const article = (a) => "the " + a.name;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export class Game {
  constructor(seed) {
    this.rng = new RNG(seed);
    this.seed = this.rng.seed;
    this.nextId = 1;
    this.messages = [];
    this.events = [];
    this.state = "play";
    this.turn = 0;
    this.kills = 0;
    this.player = {
      id: this.nextId++, kind: "player", name: "you", glyph: "@",
      x: 0, y: 0, hp: 40, maxHp: 40, level: 1, xp: 0,
      weapon: 0, armour: 0, potions: 2, scrolls: 0, gold: 0,
    };
    this.enterDepth(1);
    this.log("You descend into the book. Its pages smell of oak gall and old blood.", "lore");
  }

  // ---------- level setup -------------------------------------------------

  enterDepth(depth) {
    const rng = this.rng;
    this.depth = depth;
    const level = (this.level = generateLevel(depth, rng, { finalDepth: depth === MAX_DEPTH }));
    this.actors = [this.player];
    this.items = [];
    this.seen = new Uint8Array(level.w * level.h);
    this.visible = new Uint8Array(level.w * level.h);
    this.player.x = level.start.x;
    this.player.y = level.start.y;
    this.toPlayer = null;
    const info = DEPTHS[depth];

    const others = level.rooms.filter((r) => r !== level.startRoom && (!info.boss || r !== level.lair));
    for (let n = rng.int(...info.count); n > 0; n--) {
      const kind = weighted(rng, info.encounters);
      this.spawnGroup(kind, rng.pick(others));
    }
    for (let n = rng.int(...info.items); n > 0; n--) {
      const room = rng.pick(level.rooms);
      const spot = this.freeSpotIn(room);
      if (spot) this.items.push(this.makeItem(spot.x, spot.y));
    }
    if (info.npc) {
      const spot = this.freeSpotIn(level.startRoom, 2);
      if (spot) this.addActor(this.makeNpc(info.npc, spot.x, spot.y));
    }
    if (info.boss) {
      const boss = this.addActor(this.makeMonster(info.boss, level.lair.cx, level.lair.cy));
      boss.packId = "boss";
      if (info.boss === "goblinKing") {
        for (let k = 0; k < 5; k++) {
          const s = this.freeSpotIn(level.lair);
          if (s) this.addActor(this.makeMonster("goblin", s.x, s.y)).packId = "boss";
        }
      }
      if (info.boss === "dragon") {
        for (let k = 0; k < 5; k++) {
          const s = this.freeSpotIn(level.lair);
          if (s) this.items.push({ ...this.itemOf("gold"), x: s.x, y: s.y, amount: rng.int(20, 45) });
        }
      }
    }
    this.updateFov();
    this.events.push({ type: "level" });
    this.log(`${toRoman(depth)}. ${info.title}.`, "chapter");
    if (info.boss === "goblinKing") this.log("Somewhere ahead, a great many small feet are drumming.", "danger");
    if (info.boss === "dragon") this.log("The air is warm, and the walls are scorched in long tongues.", "danger");
  }

  spawnGroup(kind, room) {
    const def = MONSTERS[kind];
    // Swarms grow with depth; the first leaf only gets small ones.
    const n = def.pack ? Math.min(this.rng.int(...def.pack), 2 + this.depth * 2) : 1;
    const packId = def.pack ? this.nextId++ : null;
    let leader = null;
    for (let k = 0; k < n; k++) {
      const spot = leader ? this.freeSpotNear(leader.x, leader.y, 2) || this.freeSpotIn(room) : this.freeSpotIn(room);
      if (!spot) break;
      const m = this.addActor(this.makeMonster(kind, spot.x, spot.y));
      m.packId = packId;
      if (!leader) leader = m;
      m.leader = leader;
    }
  }

  makeMonster(kind, x, y) {
    const d = MONSTERS[kind];
    return {
      id: this.nextId++, kind, def: d, name: d.name, glyph: d.glyph, x, y,
      hp: d.hp, maxHp: d.hp, energy: this.rng.int(0, 99), awake: false, boss: !!d.boss,
      cooldown: 2, summonTimer: d.summonEvery || 0,
    };
  }

  makeNpc(kind, x, y) {
    const d = NPCS[kind];
    return {
      id: this.nextId++, kind, def: d, name: d.name, glyph: d.glyph, x, y,
      hp: d.hp, maxHp: d.hp, energy: 0, friendly: true, home: { x, y }, lineIdx: 0, gave: false,
    };
  }

  itemOf(kind) { return { id: this.nextId++, kind, ...ITEMS[kind] }; }

  makeItem(x, y) {
    const rng = this.rng;
    const kind = weighted(rng, [["potion", 3], ["scroll", 2], ["gold", 4], ["weapon", 1.2], ["armour", 1.2]]);
    const it = { ...this.itemOf(kind), x, y };
    if (kind === "gold") it.amount = rng.int(3, 12) * this.depth;
    if (kind === "weapon") { it.tier = Math.min(WEAPONS.length - 1, this.depth + rng.int(0, 1)); it.name = WEAPONS[it.tier].name; }
    if (kind === "armour") { it.tier = Math.min(ARMOURS.length - 1, this.depth + rng.int(-1, 0)); it.name = ARMOURS[it.tier].name; }
    return it;
  }

  addActor(a) { this.actors.push(a); return a; }

  freeSpotIn(room, minDistFromPlayer = 0) {
    for (let tries = 0; tries < 40; tries++) {
      const x = this.rng.int(room.x, room.x + room.w - 1), y = this.rng.int(room.y, room.y + room.h - 1);
      if (this.isFree(x, y) && this.level.tiles[y * this.level.w + x] === T.FLOOR && !this.itemAt(x, y)) {
        if (minDistFromPlayer && Math.max(Math.abs(x - this.player.x), Math.abs(y - this.player.y)) < minDistFromPlayer) continue;
        return { x, y };
      }
    }
    return null;
  }

  freeSpotNear(x, y, r) {
    const spots = [];
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (this.isFree(x + dx, y + dy) && this.tileAt(x + dx, y + dy) === T.FLOOR) spots.push({ x: x + dx, y: y + dy });
    return spots.length ? this.rng.pick(spots) : null;
  }

  // ---------- queries ------------------------------------------------------

  tileAt(x, y) { return this.level.get(x, y); }
  doorAt(x, y) { return this.level.doors.get(y * this.level.w + x); }
  actorAt(x, y) { return this.actors.find((a) => a.x === x && a.y === y); }
  itemAt(x, y) { return this.items.find((i) => i.x === x && i.y === y); }
  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; }
  isSeen(x, y) { return this.seen[y * this.level.w + x] === 1; }
  isFree(x, y) { return isWalkable(this.tileAt(x, y)) && !this.actorAt(x, y); }

  opaque(x, y) {
    const t = this.tileAt(x, y);
    if (t === T.ROCK || t === T.PILLAR) return true;
    if (t === T.DOOR) return !this.doorAt(x, y).open;
    return false;
  }

  attackRange(a) {
    if (a === this.player) {
      const bonus = WEAPONS[a.weapon].atk;
      return [1 + Math.floor(a.level / 2) + Math.floor(bonus / 2), 3 + a.level + bonus];
    }
    return a.def.atk;
  }
  defenceOf(a) { return a === this.player ? ARMOURS[a.armour].def : a.def.def; }

  hostilesInView() {
    return this.actors.filter((a) => a !== this.player && !a.friendly && this.isVisible(a.x, a.y));
  }

  updateFov() {
    const { w, h } = this.level;
    this.visible.fill(0);
    computeFov(w, h, this.player.x, this.player.y, FOV_RADIUS, (x, y) => this.opaque(x, y), (x, y) => {
      const i = y * w + x;
      this.visible[i] = 1;
      this.seen[i] = 1;
    });
  }

  log(text, kind = "info") {
    this.messages.push({ text, kind, turn: this.turn });
    if (this.messages.length > 60) this.messages.shift();
  }

  // ---------- player actions (return true if a turn passed) ---------------

  playerMove(dx, dy) {
    if (this.state !== "play") return false;
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    const other = this.actorAt(nx, ny);
    if (other) {
      if (other.friendly) {
        // Chat, then trade places so a friend never blocks a corridor.
        if (other.lineIdx < other.def.lines.length) this.talk(other);
        else this.log(`You squeeze past ${other.name}.`);
        this.moveActor(other, p.x, p.y);
        this.moveActor(p, nx, ny);
        this.pickUp();
      } else this.attack(p, other);
      return this.endTurn();
    }
    const t = this.tileAt(nx, ny);
    if (t === T.DOOR) {
      const door = this.doorAt(nx, ny);
      if (!door.open) {
        door.open = true;
        this.events.push({ type: "door", door });
        this.log("You shoulder the door open. It groans on its hinges.");
        return this.endTurn();
      }
    }
    if (!isWalkable(t)) return false;
    this.moveActor(p, nx, ny);
    this.pickUp();
    if (t === T.STAIRS_DOWN) this.log("A stair winds down into the next leaf. Press > to descend.", "good");
    return this.endTurn();
  }

  wait() {
    if (this.state !== "play") return false;
    return this.endTurn();
  }

  quaff() {
    const p = this.player;
    if (this.state !== "play" || p.potions <= 0) {
      if (p.potions <= 0) this.log("Your satchel holds no draughts.");
      return false;
    }
    p.potions--;
    const heal = Math.min(p.maxHp - p.hp, 12 + p.level * 3);
    p.hp += heal;
    this.events.push({ type: "heal", actor: p, amount: heal });
    this.log(`You drink a draught of healing and feel the ink of you thicken. (+${heal})`, "good");
    return this.endTurn();
  }

  read() {
    const p = this.player;
    if (this.state !== "play" || p.scrolls <= 0) {
      if (p.scrolls <= 0) this.log("You carry no scrolls.");
      return false;
    }
    const targets = this.hostilesInView();
    if (!targets.length) {
      this.log("The scroll's letters squirm, but find nothing to smite. You keep it.");
      return false;
    }
    p.scrolls--;
    this.log("You read the scroll aloud. Every word strikes like a falling capital!", "good");
    this.events.push({ type: "smite", targets: targets.map((t) => ({ x: t.x, y: t.y })) });
    for (const t of targets) this.damage(p, t, this.rng.int(8, 13), "smite");
    return this.endTurn();
  }

  descend() {
    const p = this.player;
    if (this.state !== "play") return false;
    if (this.tileAt(p.x, p.y) !== T.STAIRS_DOWN) {
      this.log("There is no stair here.");
      return false;
    }
    this.enterDepth(this.depth + 1);
    return true;
  }

  // One step of click-to-travel toward (tx, ty). Returns false when travel should stop.
  travelStep(tx, ty) {
    const p = this.player, { w, h, tiles } = this.level;
    if (p.x === tx && p.y === ty) return false;
    const seen = this.seen;
    const dist = bfs(tiles, w, h, tx, ty, (t) => isWalkable(t));
    let best = null;
    for (const [dx, dy] of DIRS8) {
      const x = p.x + dx, y = p.y + dy, i = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || !seen[i]) continue;
      if (!best || dist[i] < best.d) best = { dx, dy, d: dist[i] };
    }
    if (!best || best.d >= 1e9) return false;
    const before = new Set(this.hostilesInView().map((a) => a.id));
    const acted = this.playerMove(best.dx, best.dy);
    const spotted = this.hostilesInView().some((a) => !before.has(a.id));
    return acted && !spotted && this.state === "play";
  }

  // ---------- turn processing ----------------------------------------------

  endTurn() {
    this.turn++;
    const p = this.player;
    this.updateFov();
    this.toPlayer = bfs(this.level.tiles, this.level.w, this.level.h, p.x, p.y);
    if (this.turn % 5 === 0 && p.hp < p.maxHp) p.hp++;
    for (const m of [...this.actors]) {
      if (m === p || m.dead) continue;
      m.energy += m.def.speed;
      while (m.energy >= 100 && !m.dead && this.state === "play") {
        m.energy -= 100;
        this.monsterAct(m);
      }
    }
    this.updateFov();
    return true;
  }

  monsterAct(m) {
    const p = this.player;
    if (m.friendly) return this.npcAct(m);
    const d = Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y));
    if (!m.awake && this.isVisible(m.x, m.y)) {
      const noticeRange = m.boss ? 5 : 8;
      if (d <= noticeRange && (d <= 3 || this.rng.chance(0.55))) this.wake(m);
    }
    if (!m.awake) return this.idle(m);

    if (m.def.summons && --m.summonTimer <= 0) {
      m.summonTimer = m.def.summonEvery;
      if (this.actors.filter((a) => a.kind === m.def.summons).length < 14) return this.summon(m);
    }
    if (m.def.breath) {
      m.cooldown--;
      const b = m.def.breath;
      if (m.cooldown <= 0 && d <= b.range && this.isVisible(m.x, m.y) && (d > 1 || this.rng.chance(0.35))) return this.breathe(m);
    }
    if (d === 1) return this.attack(m, p);
    if (m.def.erratic && this.rng.chance(0.45)) return this.randomStep(m);
    if (!this.toPlayer || this.toPlayer[m.y * this.level.w + m.x] > 30) return this.idle(m);
    this.stepDownhill(m);
  }

  wake(m) {
    if (m.awake) return;
    const group = m.packId ? this.actors.filter((a) => a.packId === m.packId) : [m];
    for (const a of group) {
      if (a.awake) continue;
      a.awake = true;
      this.events.push({ type: "alert", actor: a });
    }
    if (m.boss || group.some((a) => a.boss)) {
      const boss = group.find((a) => a.boss) || m;
      if (boss.kind === "dragon") this.log("The great Capital stirs. The Dragon uncoils from its letter, eyes like coals!", "danger");
      else this.log(`The ${boss.name} rises from his gilded square and points his sceptre at you!`, "danger");
    } else if (group.length > 2) {
      this.log(`${cap(article(m))} shrieks, and the whole swarm comes ${m.kind === "rat" ? "scurrying" : "hopping"}!`, "danger");
    } else if (this.isVisible(m.x, m.y)) {
      this.log(`${cap(article(m))} notices you.`, "danger");
    }
  }

  idle(m) {
    const rng = this.rng;
    if (m.boss) return;
    if (m.leader && m.leader !== m && !m.leader.dead) {
      // Swarm members mill about their leader.
      const L = m.leader;
      const d = Math.max(Math.abs(m.x - L.x), Math.abs(m.y - L.y));
      if (d > 2) return this.stepToward(m, L.x, L.y);
      if (rng.chance(0.6)) return this.randomStep(m, (x, y) => Math.max(Math.abs(x - L.x), Math.abs(y - L.y)) <= 2);
      return;
    }
    const restless = m.def.erratic ? 0.75 : m.packId ? 0.4 : 0.12;
    if (rng.chance(restless)) this.randomStep(m);
  }

  npcAct(m) {
    if (!this.rng.chance(0.3)) return;
    this.randomStep(m, (x, y) => Math.abs(x - m.home.x) <= 2 && Math.abs(y - m.home.y) <= 2);
  }

  randomStep(m, ok = () => true) {
    const dirs = this.rng.shuffle([...DIRS8]);
    for (const [dx, dy] of dirs) {
      const x = m.x + dx, y = m.y + dy;
      if (this.tileAt(x, y) === T.DOOR && !this.doorAt(x, y).open) continue;
      if (this.isFree(x, y) && ok(x, y)) return this.moveActor(m, x, y);
    }
  }

  stepToward(m, tx, ty) {
    const dx = Math.sign(tx - m.x), dy = Math.sign(ty - m.y);
    for (const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]]) {
      if (!ax && !ay) continue;
      if (this.isFree(m.x + ax, m.y + ay)) return this.moveActor(m, m.x + ax, m.y + ay);
    }
  }

  // Follow the distance map toward the player; side-step around packmates to surround.
  stepDownhill(m) {
    const { w } = this.level, dist = this.toPlayer;
    const here = dist[m.y * w + m.x];
    let best = [], bestD = here;
    const sidesteps = [];
    for (const [dx, dy] of DIRS8) {
      const x = m.x + dx, y = m.y + dy, d = dist[y * w + x];
      if (d === undefined || d >= 1e9) continue;
      const door = this.tileAt(x, y) === T.DOOR ? this.doorAt(x, y) : null;
      if (door && !door.open && d < here) {
        door.open = true;
        this.events.push({ type: "door", door });
        if (this.isVisible(x, y)) this.log(`A door bangs open. ${cap(article(m))} is coming.`, "danger");
        return;
      }
      if (!this.isFree(x, y)) continue;
      if (d < bestD) { bestD = d; best = [[x, y]]; }
      else if (d === bestD && d < here) best.push([x, y]);
      else if (d === here) sidesteps.push([x, y]);
    }
    if (best.length) {
      const [x, y] = this.rng.pick(best);
      return this.moveActor(m, x, y);
    }
    if (sidesteps.length && this.rng.chance(0.5)) {
      const [x, y] = this.rng.pick(sidesteps);
      this.moveActor(m, x, y);
    }
  }

  moveActor(a, x, y) {
    this.events.push({ type: "move", actor: a, fx: a.x, fy: a.y, tx: x, ty: y });
    a.x = x;
    a.y = y;
  }

  talk(npc) {
    const lines = npc.def.lines;
    const line = lines[Math.min(npc.lineIdx, lines.length - 1)];
    npc.lineIdx++;
    this.log(line, "lore");
    this.events.push({ type: "talk", actor: npc });
    if (line.includes("draught") && !npc.gave) {
      npc.gave = true;
      this.player.potions++;
      this.log("Brother Anselm presses a stoppered draught into your hand.", "good");
    }
  }

  // ---------- combat ---------------------------------------------------------

  attack(a, d) {
    const p = this.player;
    this.events.push({ type: "lunge", actor: a, dx: d.x - a.x, dy: d.y - a.y });
    if (d !== p && !d.awake) this.wake(d);
    if (!this.rng.chance(a === p ? 0.88 : 0.7)) {
      this.events.push({ type: "miss", actor: d });
      if (a === p) this.log(`You swing at ${article(d)} and miss.`);
      else if (this.isVisible(a.x, a.y)) this.log(`${cap(article(a))} misses you.`);
      return;
    }
    const raw = this.rng.int(...this.attackRange(a));
    const dmg = Math.max(0, raw - this.rng.int(0, this.defenceOf(d)));
    this.damage(a, d, dmg, "melee");
  }

  damage(a, d, dmg, how) {
    const p = this.player;
    if (dmg <= 0) {
      this.events.push({ type: "miss", actor: d, text: "clang" });
      this.log(d === p ? `${cap(article(a))}'s blow glances off your ${ARMOURS[p.armour].name}.` : `Your blow glances off ${article(d)}.`);
      return;
    }
    d.hp -= dmg;
    this.events.push({ type: "hurt", actor: d, amount: dmg });
    if (how === "melee") {
      if (a === p) this.log(`You strike ${article(d)}. (${dmg})`, "combat");
      else this.log(`${cap(article(a))} ${VERBS[a.kind] || "hits"}${VERBS[a.kind]?.includes("you") ? "" : " you"}. (${dmg})`, "hurt");
    }
    if (how === "fire" && d === p) this.log(`You are wreathed in dragonfire! (${dmg})`, "hurt");
    if (d.hp <= 0) this.kill(d, a);
  }

  kill(d, by) {
    const p = this.player;
    if (d === p) {
      this.state = "dead";
      this.deathBy = by === p ? "your own folly" : by.boss ? "the " + by.name : (/^[aeiou]/.test(by.name) ? "an " : "a ") + by.name;
      this.events.push({ type: "die", actor: d, x: d.x, y: d.y });
      this.log(`You are slain by ${this.deathBy}. Here endeth the tale.`, "danger");
      return;
    }
    d.dead = true;
    this.actors = this.actors.filter((x) => x !== d);
    this.events.push({ type: "die", actor: d, x: d.x, y: d.y });
    this.kills++;
    if (by === p || by === undefined) this.log(d.boss ? `The ${d.name} is undone! Gold leaf flakes from its letter.` : `You slay ${article(d)}.`, d.boss ? "good" : "combat");
    else if (this.isVisible(d.x, d.y)) this.log(`${cap(article(d))} is caught in the fire and burns away.`, "combat");
    if (by === p) this.gainXp(d.def.xp || 0);
    if (d.def.drops && this.rng.chance(d.def.drops) && !this.itemAt(d.x, d.y))
      this.items.push({ ...this.itemOf("gold"), x: d.x, y: d.y, amount: this.rng.int(2, 8) * this.depth });
    if (d.kind === "goblinKing") {
      const w = { ...this.itemOf("weapon"), x: d.x, y: d.y, tier: 3, name: WEAPONS[3].name };
      this.items.push(w);
      this.log("The King's war axe clatters to the floor.", "good");
    }
    if (d.kind === "dragon") {
      this.state = "won";
      this.log("The Dragon's letter fades to a pale outline on the page. The book is finished.", "chapter");
    }
  }

  gainXp(n) {
    const p = this.player;
    p.xp += n;
    while (p.xp >= 10 * (p.level * (p.level + 1)) / 2) {
      p.level++;
      p.maxHp += 8;
      p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp / 2));
      this.events.push({ type: "levelup", actor: p });
      this.log(`Thou art grown in skill. You reach level ${p.level}.`, "good");
    }
  }

  summon(m) {
    let n = 0;
    for (let k = 0; k < 3; k++) {
      const s = this.freeSpotNear(m.x, m.y, 1);
      if (!s) break;
      const g = this.addActor(this.makeMonster(m.def.summons, s.x, s.y));
      g.awake = true;
      g.packId = m.packId;
      this.events.push({ type: "summon", actor: g, fx: m.x, fy: m.y });
      n++;
    }
    if (n) this.log("The Goblin King shrieks! Goblins come tumbling out of the margins.", "danger");
  }

  breathe(m) {
    const p = this.player, b = m.def.breath;
    m.cooldown = b.cooldown;
    // Trace a line from the dragon through the player, out to full range.
    const path = [];
    const dx = p.x - m.x, dy = p.y - m.y, steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 1; k <= b.range; k++) {
      const x = Math.round(m.x + (dx / steps) * k), y = Math.round(m.y + (dy / steps) * k);
      if (this.opaque(x, y)) break;
      path.push({ x, y });
    }
    this.events.push({ type: "breath", actor: m, path });
    this.log("The Dragon draws breath and looses a gout of vermilion fire!", "danger");
    for (const { x, y } of path) {
      const a = this.actorAt(x, y);
      if (a && a !== m) this.damage(m, a, this.rng.int(...b.dmg) - (a === p ? ARMOURS[p.armour].def : 0), "fire");
      if (this.state !== "play") return;
    }
  }

  pickUp() {
    const p = this.player;
    const it = this.itemAt(p.x, p.y);
    if (!it) return;
    this.items = this.items.filter((i) => i !== it);
    this.events.push({ type: "pickup", item: it, x: p.x, y: p.y });
    switch (it.kind) {
      case "potion": p.potions++; this.log("You find a draught of healing.", "good"); break;
      case "scroll": p.scrolls++; this.log("You find a scroll of smiting, its letters still wet.", "good"); break;
      case "gold": p.gold += it.amount; this.log(`You gather ${it.amount} gold.`, "good"); break;
      case "weapon":
        if (it.tier > p.weapon) { p.weapon = it.tier; this.log(`You take up the ${it.name}.`, "good"); }
        else this.log(`You find a ${it.name}, no better than your own, and leave it.`);
        break;
      case "armour":
        if (it.tier > p.armour) { p.armour = it.tier; this.log(`You buckle on the ${it.name}.`, "good"); }
        else this.log(`You find some ${it.name}, no better than your own, and leave it.`);
        break;
    }
  }
}

function weighted(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of table) if ((r -= w) <= 0) return k;
  return table[0][0];
}

export function toRoman(n) {
  return ["", "I", "II", "III", "IV", "V"][n] || String(n);
}
