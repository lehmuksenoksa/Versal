// The world: one map, the player, and a few packs of monsters: goblins in
// the caves, skeletons in the built rooms. Turn-based: each turn the player
// acts (steps, whacks a monster in the way, opens or closes a door, or
// waits) and the monsters, a little slower, act after.
// The player sees what lies in their field of view, and remembers what they
// have seen; with the lamp out (sneaking) they see less, and are noticed
// less, unless they stand where the level's lights fall.
// A monster (each kind the same but for its letter and noises) is
// "neutral" (milling about with its pack), "sleeping" (still;
// some packs start so), or "aggressive" (chasing the player, attacking when
// next to them, opening doors in the way now and then). A pack turns
// together; it gives up when the player is out of its sight a while, or far
// off.

import { RNG } from "./rng.js";
import { T, isWalkable, isOpen, DIRS8 } from "./dungeon.js";
import { generateAreas } from "./levelgen.js";
import { computeFov } from "./fov.js";
import { postOutline, crossesOutline } from "./sightline.js";

// The kinds of monster: their letters and names; their speed (moves for each
// of the player's); how much they wander when milling about (the goblins' 1);
// how many to a pack (in a crypt, `crypt`); their hit points; their blows
// (the chance to hit, the damage, what it's called, and whether a hard one
// makes the player bleed).
export const MONSTERS = {
  goblin: { glyph: "g", name: "goblin", speed: 0.75, wander: 1, pack: [4, 7], hp: [3, 6], hit: 0.7, dmg: [1, 3], verb: "hits", xp: 5, drops: true },
  // (Skeletons slow and still, alone or in pairs but in crypts, and tough.)
  skeleton: { glyph: "z", name: "skeleton", speed: 0.4, wander: 0.3, pack: [1, 2], crypt: [4, 7], hp: [8, 12], hit: 0.65, dmg: [1, 4], verb: "claws", bleeds: true, xp: 8, undead: true },
};

// The player: hit points to start with; the blow (until there are weapons, as
// a dagger's); healing, a hit point every so many turns, resting and not.
export const PLAYER = { hp: 20, attack: [1, 4], heal: 20, restHeal: 5, cls: "Adventurer" };
// Experience: what each level needs, all told; each new level gives `hp` more
// hit points, and every other one +1 to the blow.
export const LEVELS = { xp: [0, 20, 50, 100, 170, 260, 380, 530, 720, 950], hp: 4 };
// Ailments: bleeding, from a hard blow (`at` damage or more, by a monster
// that `bleeds`, half the time), a hit point a turn for a few turns, stopped by
// resting; poison, a hit point every `every` turns for a while.
export const AILMENTS = { bleeding: { at: 3, chance: 0.5, turns: [3, 5], every: 1 }, poisoned: { turns: [12, 20], every: 3 } };
// The things to be found: weapons (their blow, and how many hands), armour
// (where it's worn, how much of a blow it takes off: up to its `def`), and
// potions (how much they heal); each with its letter and ink, how deep it's
// first found (`depth`) and how common (`weight`).
export const ITEMS = {
  dagger: { glyph: ")", name: "dagger", cat: "weapon", dmg: [1, 4], hands: 1, depth: 1, weight: 3 },
  sword: { glyph: ")", name: "sword", cat: "weapon", dmg: [2, 6], hands: 1, depth: 1, weight: 2 },
  axe: { glyph: ")", name: "axe", cat: "weapon", dmg: [3, 7], hands: 1, depth: 2, weight: 2 },
  warhammer: { glyph: ")", name: "warhammer", cat: "weapon", dmg: [4, 10], hands: 2, depth: 2, weight: 1 },
  helmet: { glyph: "[", name: "helmet", cat: "armour", slot: "head", def: 1, depth: 1, weight: 2 },
  chainmail: { glyph: "[", name: "chainmail", cat: "armour", slot: "body", def: 2, depth: 1, weight: 1 },
  potion: { glyph: "!", name: "potion of healing", plural: "potions of healing", cat: "potion", heal: [7, 12], ink: "#c4402e", depth: 1, weight: 5 },
};
// How many things the player can carry (worn and held aside); bare hands' blow;
// how many things lie about a level (for every so many rooms); the chance a
// goblin drops something when it falls.
export const PACK = { size: 10, letters: "abcdefghij", bare: [1, 2], perRooms: 2.5, drop: 0.15 };
const an = (name) => (/^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`);
export const itemName = (it, article = true) => (it.n > 1 ? `${it.n} ${ITEMS[it.type].plural ?? `${ITEMS[it.type].name}s`}` : article ? an(ITEMS[it.type].name) : ITEMS[it.type].name);
const makeItem = (type, n = 1) => ({ type, glyph: ITEMS[type].glyph, n });

// Where the player is (one place for now).
export const PLACE = { name: "The old crypts", depth: 1 };

// How the monsters (goblins and skeletons alike) behave.
const GOBLIN = {
  // An aggressive pack gives up after this many turns not seeing the player,
  // or at once when they are further off than `lose`.
  calm: 8, lose: 14,
  // The chance a chasing goblin gets a shut door open.
  door: 0.5,
};
// The player's chance to hit with a whack; a blow at a monster that hasn't
// noticed them (asleep or unaware) always lands, `sneak` times as hard.
const WHACK = 0.75, SNEAK_HIT = 3;
// Time: a step with the lamp out takes this many turns.
export const SNEAK_STEP = 1.5;
// Noticing the player. A monster's awareness (0 to 1) grows each turn it sees
// or hears them, and ebbs (`ebb` a turn) while it doesn't; at a third it's
// suspicious and comes to look (?), full, alarmed, and its pack chases (!);
// a suspicious one calms below `calm`. Seen: within `seeLit` squares where
// the player is lit (the lamp, or a lit place), `seeDark` where not; `sight`
// (`sightDark` in the dark) a turn up close, less further off, `near`
// (`nearDark`) more next to them. Heard: each
// noise (`NOISE`, how far it carries and how loud) a turn, `hear` at most.
// How much a monster sees and hears by its state (`SENSES`); one that has fled
// is `wary` (more).
export const AWARE = { seeLit: 8, seeDark: 2.5, sight: 0.45, near: 0.4, sightDark: 0.22, nearDark: 0.1, hear: 0.35, ebb: 0.05, calm: 0.2, wary: 1.5 };
const NOISE = { step: [3, 0.5], sneak: [1, 0.3], blow: [8, 1], door: [4, 0.6] };
const SENSES = { sleeping: { see: 0, hear: 0.5 }, neutral: { see: 0.6, hear: 0.6 }, suspicious: { see: 1.2, hear: 1.2 } };
// Morale: when no more than half a pack is left the rest flee (the undead
// never) for a while, then regroup, wary.
const MORALE = { flee: [10, 18] };
// The chance, each turn, of the player seeing a secret door in sight: next
// to it, and two squares off; searching (a turn spent looking), and not.
const SECRET = { near: 0.15, far: 0.06, searchNear: 0.6, searchFar: 0.3, reach: 2 };

export const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

export class World {
  constructor(seed, { sight = 9, name = "Adventurer" } = {}) {
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
    this.pillars = (level.features ?? []).filter((f) => f.type === "post").map((f) => ({ x: f.x, y: f.y, pts: postOutline(f) }));
    this.doors = new Map((level.doors ?? []).map((d) => [d.y * level.w + d.x, d]));
    this.player = { id: this.nextId++, kind: "player", glyph: "@", x: level.start.x, y: level.start.y, hp: PLAYER.hp, maxHp: PLAYER.hp, ailments: {}, healing: 0, kills: 0, name, cls: PLAYER.cls, level: 1, xp: 0,
      // What's held and worn, by where; what's carried, each with its letter.
      equip: { hand: makeItem("dagger"), off: null, head: null, body: null }, pack: [] };
    this.stow(makeItem("potion"));
    // The turns gone by, the messages so far (each { text, turn, kind }), and
    // how the run ended (null while it goes on).
    this.turn = 0;
    this.messages = [];
    this.dead = null;
    this.place = PLACE;
    this.log(`You come down into ${PLACE.name.toLowerCase()}.`);
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
    for (const room of rooms.slice(0, packs)) {
      const kind = room.cave ? "goblin" : "skeleton", M = MONSTERS[kind];
      this.spawnPack(room, this.rng.int(...(room.kind === "crypt" && M.crypt ? M.crypt : M.pack)), room.campfire ? "neutral" : null, kind);
    }
    // Things lying about: a few in the rooms (not the one the player starts in).
    this.items = [];
    for (const room of this.rng.shuffle(level.rooms.filter((r) => r !== level.startRoom)).slice(0, Math.round(level.rooms.length / PACK.perRooms))) {
      const spot = this.freeSpotIn(room);
      if (spot) this.items.push({ x: spot.x, y: spot.y, item: this.randomItem() });
    }
    this.visible = new Uint8Array(level.w * level.h);
    this.seen = new Uint8Array(level.w * level.h);
    // What has a line of sight to the player (for goblins noticing them,
    // whatever the player can see).
    this.inView = new Uint8Array(level.w * level.h);
    this.updateFov();
  }

  // What the player can see: squares in sight past the walls and shut doors
  // (and the pillars: a square is hidden behind one when the line between
  // the middles of the two squares crosses it, as the map draws it).
  updateFov() {
    const { w, h } = this.level, { x: px, y: py } = this.player, opaque = (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y);
    const reach = Math.max(this.sight, GOBLIN.lose) + 1;
    const pillars = this.pillars.filter((p) => Math.abs(p.x - px - 0.5) <= reach && Math.abs(p.y - py - 0.5) <= reach);
    const behind = (x, y) => pillars.some((p) => crossesOutline(px + 0.5, py + 0.5, x + 0.5, y + 0.5, p.pts));
    this.visible.fill(0);
    computeFov(w, h, px, py, this.sight, opaque, (x, y) => {
      if (behind(x, y)) return;
      this.visible[y * w + x] = 1;
      this.seen[y * w + x] = 1;
    });
    this.inView.fill(0);
    computeFov(w, h, px, py, GOBLIN.lose, opaque, (x, y) => {
      if (!behind(x, y)) this.inView[y * w + x] = 1;
    });
  }

  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; }

  spawnPack(room, n, state = null, kind = "goblin") {
    let leader = null;
    state ??= this.rng.chance(0.35) ? "sleeping" : "neutral";
    for (let k = 0; k < n; k++) {
      const spot = this.freeSpotIn(room);
      if (!spot) break;
      const g = { id: this.nextId++, kind, glyph: MONSTERS[kind].glyph, x: spot.x, y: spot.y, state, calm: 0, hp: this.rng.int(...MONSTERS[kind].hp), energy: this.rng.next() };
      g.leader = leader || g;
      leader = g.leader;
      this.actors.push(g);
    }
    // (How big the pack was, for its morale.)
    if (leader) for (const a of this.pack(leader)) a.packSize = this.pack(leader).length;
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
  pack(g) { return this.actors.filter((a) => a !== this.player && a.leader === g.leader); }

  // A message for the log: `kind` "hurt" for harm done to the player, "good"
  // for the better.
  log(text, kind = "") {
    this.messages.push({ text, turn: this.turn, kind });
  }

  // The player steps by (dx, dy): into a monster, a whack; into a shut door,
  // opening it. Returns true if a turn passed.
  playerMove(dx, dy) {
    if (this.dead) return false;
    const p = this.player, nx = p.x + dx, ny = p.y + dy;
    if (!this.canStep(p.x, p.y, dx, dy)) return false;
    const g = this.actorAt(nx, ny);
    if (g && g !== this.player) {
      this.whack(g);
      return this.tick();
    }
    if (g || !this.walkable(nx, ny)) return false;
    if (this.shut(nx, ny)) {
      this.setDoor(this.doorAt(nx, ny), true, p);
      return this.tick();
    }
    this.moveActor(p, nx, ny);
    const here = this.itemsAt(nx, ny);
    if (here.length) this.log(`You see ${here.map((i) => itemName(i.item)).join(" and ")} here.`);
    // (Sneaking, a step is slower, and quieter.)
    this.makeNoise(this.sneaking ? "sneak" : "step");
    return this.tick(false, false, this.sneaking ? SNEAK_STEP : 1);
  }

  // A noise the player makes, at their square, heard this turn.
  makeNoise(kind, x = this.player.x, y = this.player.y) {
    (this.noises ??= []).push({ x, y, r: NOISE[kind][0], loud: NOISE[kind][1] });
  }

  // Is there an open door next to the player to close (none standing in it)?
  canCloseDoor() {
    const p = this.player;
    return DIRS8.some(([dx, dy]) => {
      const d = this.doorAt(p.x + dx, p.y + dy);
      return d && d.open && !this.actorAt(d.x, d.y);
    });
  }

  // Close an open door next to the player (none standing in it). Returns
  // true if one was, which takes the turn.
  closeDoor() {
    if (this.dead) return false;
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
    if (by === this.player) this.makeNoise("door");
    this.events.push({ type: "door", door, by });
  }

  // The player spends a turn searching for secret doors.
  search() {
    if (this.dead) return false;
    this.events.push({ type: "search" });
    return this.tick(true);
  }

  // Each turn, the player may see a secret door in sight close by (more
  // likely searching): it is a door from then on, shut.
  spot(searching) {
    const p = this.player, L = this.level;
    for (const s of L.secrets ?? []) {
      const d = Math.max(Math.abs(s.x - p.x), Math.abs(s.y - p.y));
      if (s.found || d > SECRET.reach || !this.isVisible(s.x, s.y)) continue;
      const chance = d <= 1 ? (searching ? SECRET.searchNear : SECRET.near) : searching ? SECRET.searchFar : SECRET.far;
      if (!this.rng.chance(chance)) continue;
      s.found = true;
      L.tiles[s.y * L.w + s.x] = T.FLOOR;
      const door = { x: s.x, y: s.y, dx: s.dx, dy: s.dy, open: false, secret: true };
      L.doors.push(door);
      this.doors.set(s.y * L.w + s.x, door);
      this.events.push({ type: "secret", door });
      this.log("You find a secret door.", "good");
    }
  }

  // Lamp out (sneaking, seeing only `sight`) or lit again.
  setSneaking(on, sight) {
    this.sneaking = on;
    this.sight = sight;
    this.updateFov();
    this.events.push({ type: "sneak", on });
    this.log(on ? "You put out your lamp." : "You light your lamp.");
  }

  // The player's blow, as damage from to: their weapon's (bare hands') and
  // better every other level.
  attack() {
    const b = Math.floor((this.player.level - 1) / 2), w = this.player.equip.hand, d = w ? ITEMS[w.type].dmg : PACK.bare;
    return [d[0] + b, d[1] + b];
  }
  // How much of a blow the player's armour can take off (up to this).
  defence() {
    return Object.values(this.player.equip).reduce((s, it) => s + (it ? ITEMS[it.type].def ?? 0 : 0), 0);
  }

  // ---- Things ----
  // A thing for this place: of those found this deep, by how common.
  randomItem() {
    const kinds = Object.entries(ITEMS).filter(([, d]) => d.depth <= this.place.depth);
    let r = this.rng.next() * kinds.reduce((s, [, d]) => s + d.weight, 0);
    for (const [type, d] of kinds) if ((r -= d.weight) < 0) return makeItem(type);
    return makeItem("potion");
  }
  itemsAt(x, y) { return this.items.filter((i) => i.x === x && i.y === y); }
  // Into the pack: potions of a kind together, else the first free letter.
  // False if there's no room.
  stow(item) {
    const pack = this.player.pack, same = ITEMS[item.type].cat === "potion" && pack.find((i) => i.type === item.type);
    if (same) { same.n += item.n; return same; }
    if (pack.length >= PACK.size) return false;
    const key = [...PACK.letters].find((k) => !pack.some((i) => i.key === k));
    const it = { ...item, key };
    pack.push(it);
    pack.sort((a, b) => a.key.localeCompare(b.key));
    return it;
  }
  packItem(key) { return this.player.pack.find((i) => i.key === key); }
  unpack(it) {
    const pack = this.player.pack;
    pack.splice(pack.indexOf(it), 1);
    const { key, ...item } = it;
    return item;
  }
  // Pick up what lies here (a turn), if there's room.
  pickUp() {
    if (this.dead) return false;
    const p = this.player, here = this.itemsAt(p.x, p.y);
    if (!here.length) { this.log("There's nothing here."); return false; }
    let took = false;
    for (const floor of here) {
      const it = this.stow(floor.item);
      if (!it) { this.log(`You can't carry ${itemName(floor.item)}: your pack is full.`); break; }
      this.items.splice(this.items.indexOf(floor), 1);
      this.log(`You pick up ${itemName(floor.item)} (${it.key}).`);
      took = true;
    }
    return took ? this.tick() : false;
  }
  // Drink a potion from the pack (a turn).
  drink(key) {
    const it = this.packItem(key), d = it && ITEMS[it.type];
    if (!it || d.cat !== "potion") return false;
    const p = this.player, heal = this.rng.int(...d.heal), before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    if (p.ailments.bleeding) delete p.ailments.bleeding;
    if (--it.n <= 0) this.player.pack.splice(this.player.pack.indexOf(it), 1);
    this.log(`You drink ${an(d.name)}. You feel better. (+${p.hp - before})`, "good");
    return this.tick();
  }
  // Wield a weapon or put on armour from the pack (a turn); what was there
  // goes into the pack in its place (a two-handed weapon frees the off hand).
  wield(key) {
    const it = this.packItem(key), d = it && ITEMS[it.type];
    if (!it || (d.cat !== "weapon" && d.cat !== "armour")) return false;
    const p = this.player, where = d.cat === "weapon" ? "hand" : d.slot;
    const item = this.unpack(it), old = p.equip[where], extra = d.hands === 2 ? p.equip.off : null;
    p.equip[where] = item;
    if (extra) p.equip.off = null;
    for (const o of [old, extra]) if (o && !this.stow(o)) this.drop(o, true);
    this.log(d.cat === "weapon" ? `You wield the ${d.name}.` : `You put on the ${d.name}.`);
    return this.tick();
  }
  // Take off what's held or worn there (a turn), into the pack.
  takeOff(where) {
    const p = this.player, it = p.equip[where];
    if (!it) return false;
    if (p.pack.length >= PACK.size) { this.log("Your pack is full."); return false; }
    p.equip[where] = null;
    this.stow(it);
    this.log(ITEMS[it.type].cat === "weapon" ? `You put away the ${ITEMS[it.type].name}.` : `You take off the ${ITEMS[it.type].name}.`);
    return this.tick();
  }
  // Drop a thing from the pack where the player stands (a turn); or, `item`
  // given (`quiet`), drop that without a turn.
  drop(keyOrItem, quiet = false) {
    const p = this.player;
    let item = keyOrItem;
    if (typeof keyOrItem === "string") {
      const it = this.packItem(keyOrItem);
      if (!it) return false;
      item = this.unpack(it);
    }
    this.items.push({ x: p.x, y: p.y, item });
    this.log(`You drop ${itemName(item)}.`);
    return quiet ? true : this.tick();
  }
  // The experience the player's next level needs, all told (null at the last).
  nextLevel() { return LEVELS.xp[this.player.level] ?? null; }

  // Experience for a kill; enough, and a new level.
  gainXp(n) {
    const p = this.player;
    p.xp += n;
    while (this.nextLevel() !== null && p.xp >= this.nextLevel()) {
      p.level++;
      p.maxHp += LEVELS.hp;
      p.hp += LEVELS.hp;
      this.log(`You reach the ${ordinal(p.level)} level.`, "good");
    }
  }

  // A whack at monster `g`: it may miss; one out of hit points falls. Its pack
  // turns on the player, and the noise wakes packs asleep near by.
  whack(g) {
    const unaware = g.state === "sleeping" || g.state === "neutral";
    const hit = unaware || this.rng.chance(WHACK), dmg = hit ? this.rng.int(...this.attack()) * (unaware ? SNEAK_HIT : 1) : 0;
    if (hit) g.hp -= dmg;
    const killed = g.hp <= 0, name = MONSTERS[g.kind].name;
    this.events.push({ type: "whack", target: g, hit, killed, dmg, sneak: unaware });
    this.makeNoise("blow");
    const what = unaware ? `the unaware ${name}` : `the ${name}`;
    this.log(!hit ? `You miss ${what}.` : killed ? `You kill ${what}.${unaware ? ` (${dmg})` : ""}` : `You ${unaware ? "strike" : "hit"} ${what}. (${dmg})`, killed ? "good" : "");
    if (killed) {
      this.player.kills++;
      this.gainXp(MONSTERS[g.kind].xp);
      // (Goblins sometimes drop what they carried.)
      if (MONSTERS[g.kind].drops && this.rng.chance(PACK.drop)) {
        const item = this.randomItem();
        this.items.push({ x: g.x, y: g.y, item });
        this.log(`The ${name} drops ${itemName(item)}.`);
      }
    }
    for (const a of this.pack(g)) {
      if (a.state === "fleeing") continue;
      a.state = "aggressive";
      a.calm = 0;
      a.aware = 1;
    }
    if (killed) {
      this.actors.splice(this.actors.indexOf(g), 1);
      // (A pack whose leader falls follows another.)
      const rest = this.pack(g);
      if (g.leader === g) for (const a of rest) a.leader = rest[0];
      // (Half the pack gone, the rest flee: the undead never.)
      const L = rest[0]?.leader;
      if (L && !MONSTERS[g.kind].undead && !L.broken && rest.length <= (g.packSize ?? 1) / 2) {
        L.broken = true;
        for (const a of rest) { a.state = "fleeing"; a.fear = this.rng.int(...MORALE.flee); }
        this.log(rest.length > 1 ? `The ${name}s flee!` : `The ${name} flees!`, "good");
        this.events.push({ type: "flee", actor: rest[0] });
      }
    }
  }

  // A turn passes: the goblins act (each as its speed allows), then see
  // what they notice; the player's ailments and healing take their course.
  // (`resting`: a turn spent resting: healing quicker, and bleeding stops.)
  // (`cost`: how many turns the player's action takes: the monsters act as
  // much more, the ailments and healing go on each whole turn.)
  tick(searching = false, resting = false, cost = 1) {
    if (this.dead) return false;
    const before = this.turn;
    this.clock = (this.clock ?? 0) + cost;
    this.turn = Math.floor(this.clock + 1e-9);
    this.updateFov();
    this.spot(searching);
    this.chaseMap = null;
    for (const g of [...this.actors]) {
      if (g === this.player) continue;
      g.energy += MONSTERS[g.kind].speed * cost;
      while (g.energy >= 1 && !this.dead && this.actors.includes(g)) {
        g.energy -= 1;
        if (g.state === "aggressive") this.chase(g);
        else if (g.state === "suspicious") this.investigate(g);
        else if (g.state === "fleeing") this.flee(g);
        else if (g.state === "neutral") this.mill(g);
      }
    }
    this.updateFov();
    this.notice();
    this.noises = [];
    for (let t = before; t < this.turn && !this.dead; t++) this.ailing(resting);
    return true;
  }

  // Is the player lit (their lamp, or a lit place)?
  playerLit() {
    const p = this.player;
    return !this.sneaking || !!this.lit[p.y * this.level.w + p.x];
  }

  // A suspicious monster goes to look where it last saw or heard the player.
  investigate(g) {
    const t = g.lastSpot;
    if (!t || (g.x === t.x && g.y === t.y)) return this.randomStep(g);
    // (Slowly: not every turn.)
    if (this.rng.chance(0.7)) this.stepToward(g, t.x, t.y);
  }

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
    for (const [sx, sy] of this.rng.shuffle([...DIRS8])) {
      const x = g.x + sx, y = g.y + sy;
      if (!this.isFree(x, y) || !this.canStep(g.x, g.y, sx, sy)) continue;
      const d = dist[y * W + x];
      if (d < 0 || (here >= 0 && d <= here)) continue;
      if (!best || d > best.d) best = { x, y, d };
    }
    if (best) return this.moveActor(g, best.x, best.y);
    if (Math.max(Math.abs(p.x - g.x), Math.abs(p.y - g.y)) === 1) this.strike(g);
  }

  // Ailments take their course, and wounds heal (quicker resting).
  ailing(resting) {
    const p = this.player, A = p.ailments;
    if (A.bleeding && resting) {
      delete A.bleeding;
      this.log("Your bleeding stops.");
    }
    for (const [name, turns] of Object.entries(A)) {
      if (this.turn % AILMENTS[name].every === 0) p.hp--;
      if (turns <= 1) {
        delete A[name];
        this.log(name === "bleeding" ? "Your bleeding stops." : "The poison wears off.");
      } else A[name] = turns - 1;
      if (p.hp <= 0) return this.die(name === "bleeding" ? "bled to death" : "died of poison");
    }
    p.healing += 1 / (resting ? PLAYER.restHeal : PLAYER.heal);
    if (p.healing >= 1) {
      p.healing -= 1;
      if (p.hp < p.maxHp) p.hp++;
    }
  }

  // A monster's blow at the player: it may miss; a hard one may make them
  // bleed; out of hit points, they die.
  strike(g) {
    const M = MONSTERS[g.kind], p = this.player, hit = this.rng.chance(M.hit);
    let dmg = hit ? this.rng.int(...M.dmg) : 0;
    this.events.push({ type: "attack", actor: g, hit, dmg });
    if (!hit) return this.log(`The ${M.name} misses you.`);
    // (Armour takes some of the blow off, up to its defence.)
    const saved = Math.min(dmg, this.rng.int(0, this.defence()));
    if (saved >= dmg) return this.log(`The ${M.name} ${M.verb} you, but your armour holds.`);
    dmg -= saved;
    p.hp -= dmg;
    const B = AILMENTS.bleeding, bleed = M.bleeds && dmg >= B.at && this.rng.chance(B.chance);
    if (bleed) p.ailments.bleeding = Math.max(p.ailments.bleeding ?? 0, this.rng.int(...B.turns));
    this.log(`The ${M.name} ${M.verb} you. (${dmg})${bleed ? " You bleed." : ""}`, "hurt");
    if (p.hp <= 0) this.die(`killed by a ${M.name}`);
  }

  // The run ends: how, where, and what was done.
  die(how) {
    const p = this.player;
    p.hp = Math.min(p.hp, 0);
    this.dead = { how, place: this.place.name, depth: this.place.depth, turns: this.turn, kills: p.kills, name: p.name, cls: p.cls, level: p.level };
    this.log("You die.", "hurt");
    this.events.push({ type: "death" });
  }

  // Why the player can't rest now (null if they can): a monster in sight, or
  // nothing to rest for.
  cantRest() {
    if (this.dead) return "dead";
    if (this.monsterInSight()) return "You can't rest with an enemy in sight.";
    if (this.player.hp >= this.player.maxHp && !Object.keys(this.player.ailments).length) return "You don't need rest.";
    return null;
  }
  monsterInSight() {
    return this.actors.some((a) => a !== this.player && this.isVisible(a.x, a.y));
  }
  // Is something about that should stop the player resting: a monster in
  // sight, or one chasing within earshot?
  disturbed() {
    const p = this.player;
    return this.monsterInSight() || this.actors.some((a) => a !== p && (a.state === "aggressive" || a.state === "suspicious") && Math.hypot(a.x - p.x, a.y - p.y) <= 12);
  }

  // What the monsters notice: each that sees or hears the player grows more
  // aware (more when close, when the player is lit, when it's alert), and
  // less while it doesn't. A third aware, suspicious; fully, alarmed, and its
  // pack with it. Aggressive packs give up after GOBLIN.calm turns of not
  // seeing the player, or when they are far off, but stay suspicious.
  notice() {
    const p = this.player, W = this.level.w, lit = this.playerLit(), range = lit ? AWARE.seeLit : AWARE.seeDark;
    const angry = new Set();
    for (const g of this.actors) {
      if (g === p) continue;
      const d = Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)), sees = this.inView[g.y * W + g.x] === 1;
      g.sees = sees;
      if (g.state === "aggressive" || g.state === "fleeing") continue;
      const S = SENSES[g.state] ?? SENSES.neutral;
      let gain = 0;
      if (sees && d <= range) gain += ((lit ? AWARE.sight : AWARE.sightDark) * (1 - (d - 1) / range) + (d <= 1 ? (lit ? AWARE.near : AWARE.nearDark) : 0)) * S.see;
      for (const n of this.noises ?? []) {
        const dn = Math.hypot(g.x - n.x, g.y - n.y);
        if (dn <= n.r) gain += AWARE.hear * n.loud * (1 - dn / (n.r + 1)) * S.hear;
      }
      if (g.wary) gain *= AWARE.wary;
      if (gain > 0) {
        g.aware = Math.min(1, (g.aware ?? 0) + gain);
        g.lastSpot = { x: p.x, y: p.y };
      } else g.aware = Math.max(0, (g.aware ?? 0) - AWARE.ebb);
      if (g.aware >= 1) angry.add(g.leader);
      else if (g.aware >= 1 / 3 && g.state !== "suspicious") {
        g.state = "suspicious";
        this.events.push({ type: "suspect", actor: g });
      } else if (g.state === "suspicious" && g.aware < AWARE.calm) g.state = "neutral";
    }
    for (const g of this.actors) {
      if (g === p || !angry.has(g.leader) || g.state === "fleeing") continue;
      g.state = "aggressive";
      g.calm = 0;
      g.aware = 1;
    }
    // (A pack keeps on while any of it sees the player.)
    for (const g of this.actors) {
      if (g === p || g.state !== "aggressive" || g.leader !== g) continue;
      const pack = this.pack(g), far = pack.every((a) => Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) > GOBLIN.lose);
      const calm = pack.some((a) => a.sees) ? 0 : (g.calm ?? 0) + 1;
      for (const a of pack) {
        if (a.state !== "aggressive") continue;
        a.calm = calm;
        if (far || calm >= GOBLIN.calm) {
          a.state = "suspicious";
          a.aware = 0.6;
          a.lastSpot = { x: p.x, y: p.y };
        }
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
      if (!this.dead) this.strike(g);
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
    const L = g.leader, k = MONSTERS[g.kind].wander;
    if (L === g) {
      if (this.rng.chance(0.4 * k)) this.randomStep(g);
      return;
    }
    const near = (x, y) => Math.max(Math.abs(x - L.x), Math.abs(y - L.y)) <= 2;
    if (!near(g.x, g.y)) return this.stepToward(g, L.x, L.y);
    if (this.rng.chance(0.6 * k)) this.randomStep(g, near);
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
