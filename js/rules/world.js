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

import { MONSTERS, PLAYER } from "./content.js";
import { ROOM_TRAITS, monTrait } from "./traits.js";
import { monName } from "./names.js";
import { makeItem } from "./items.js";
import { DIRS8 } from "./dungeon.js";
import { RNG, seedFor } from "./rng.js";
import { levelMethods } from "./levels.js";
import { senseMethods, sightRound } from "./senses.js";
import { moveMethods } from "./moves.js";
import { monsterMethods } from "./monsters.js";
import { fightMethods } from "./fight.js";
import { itemMethods } from "./items.js";
import { actionMethods } from "./actions.js";
import { replayMethods, replayRun } from "./replay.js";
import { Light } from "./light.js";
import { saveWorld, restoreWorld } from "./save.js";

// The content and names, for the rest of the game to take from here.
export * from "./content.js";
export * from "./names.js";

export class World {
  // (`levels`: levels given by depth, taken instead of made: small maps for
  // tests, tests/support/scenario.js.)
  constructor(seed, { name = "Adventurer", levels = null } = {}) {
    // (How far round them the player sees: the lamp lit, at first.)
    this.sight = sightRound(false);
    if (levels) this.given = levels;
    this.sneaking = false;
    // The dice (groundwork G5), in streams, so a die added to one part
    // shifts no other's: in play, fights (blows, armour, bleeding, morale),
    // minds (how monsters move and choose), things (what's found, potions),
    // and the rest (secret doors spotted, nests refilled, the dead rising);
    // each level made and peopled by dice of its own (`runSeed` and its
    // depth: levels.js), the same level whatever's played before it.
    this.runSeed = new RNG(seed).seed;
    // (What's lit: the light model, a part of its own: light.js.)
    this.light = new Light(this);
    // (The calls made into the rules, for replays: replay.js.)
    this.history = [];
    this.noting = false;
    this.dice = Object.fromEntries(["fight", "minds", "things", "world"].map((k) => [k, new RNG(seedFor(this.runSeed, k))]));
    this.events = [];
    this.nextId = 1;
    this.player = { id: this.nextId++, kind: "player", glyph: "@", x: 0, y: 0, hp: PLAYER.hp, maxHp: PLAYER.hp, ailments: {}, healing: 0, kills: 0, name, cls: PLAYER.cls, level: 1, xp: 0,
      // What's held and worn, by where; what's carried, each with its letter.
      equip: { hand: makeItem("dagger", 1, null, true), off: null, head: null, body: null }, pack: [] };
    // (This run's murky potions: all heal, or all poison; not known till one's drunk.)
    this.murky = { good: this.dice.things.chance(0.5), known: false };
    this.stow(makeItem("potion"));
    // The turns gone by, the messages so far (each { text, turn, kind }), and
    // how the run ended (null while it goes on: died, or won).
    this.turn = 0;
    this.messages = [];
    this.dead = null;
    this.won = null;
    // The levels made so far, each kept as left (see makePlace).
    this.places = [];
    this.enter(1);
    this.log(`You come down into ${this.place.name.toLowerCase()}.`);
  }

  // Is the run over?
  get ended() { return !!(this.dead || this.won); }

  // A message for the log: `kind` "hurt" for harm done to the player, "good"
  // for the better.
  // (The same message again straight after folds into it: "You miss the
  // rat. ×3"; the numbers at the end of each kept, "You hit the rat. ×2 (3, 1)".)
  log(text, kind = "") {
    const [, base, num] = /^(.*?)(?: \(([^()]*)\))?$/.exec(text), last = this.messages[this.messages.length - 1];
    if (last && last.base === base && last.kind === kind) {
      last.n++;
      if (num !== undefined) last.nums.push(num);
      last.turn = this.turn;
      last.text = `${base} ×${last.n}${last.nums.length ? ` (${last.nums.join(", ")})` : ""}`;
      return;
    }
    this.messages.push({ text, turn: this.turn, kind, base, n: 1, nums: num !== undefined ? [num] : [] });
  }

  // Monsters bleeding (a sharp blade's work), a hit point a turn; the
  // undead of cursed rooms rising when it's time.
  monstersTurn() {
    // (A nest whose rats are all dead fills again a while later, out of sight.)
    for (const room of this.level.rooms) {
      if (room.trait !== "infested" || !room.nest || this.actors.some((a) => a.home === room)) continue;
      room.back ??= this.turn + this.dice.world.int(...ROOM_TRAITS.infested.back);
      if (this.turn < room.back || this.isVisible(room.nest.x, room.nest.y)) continue;
      room.back = null;
      this.spawnPack({ x: room.nest.x - 1, y: room.nest.y - 1, w: 3, h: 3 }, this.dice.world.int(...ROOM_TRAITS.infested.rats), "neutral", "rat");
      for (const a of this.actors) if (a.kind === "rat" && !a.home && Math.abs(a.x - room.nest.x) <= 1 && Math.abs(a.y - room.nest.y) <= 1) a.home = room;
    }
    for (const g of this.actors.filter((a) => a !== this.player && a.bleed > 0)) {
      g.bleed--;
      if (--g.hp > 0) continue;
      this.log(`The ${monName(g)} bleeds to death.`, "good");
      this.events.push({ type: "fall", target: g });
      this.fall(g);
    }
    for (const r of [...(this.rising ?? [])]) {
      if (this.turn < r.at || r.depth !== this.place.depth) continue;
      // (Where it fell, or the nearest free square; later if none.)
      const spot = [[0, 0], ...DIRS8].map(([dx, dy]) => ({ x: r.x + dx, y: r.y + dy })).find((q) => this.isFree(q.x, q.y));
      if (!spot) continue;
      this.rising.splice(this.rising.indexOf(r), 1);
      const g = r.g;
      Object.assign(g, { x: spot.x, y: spot.y, hp: Math.max(1, Math.ceil(g.maxHp / 2)), risen: true, state: "aggressive", aware: 1, calm: 0, bleed: 0 });
      g.leader = g;
      this.actors.push(g);
      if (this.isVisible(g.x, g.y)) this.log(`The ${monName(g)} rises again!`, "hurt");
    }
  }

  // A turn passes: the goblins act (each as its speed allows), then see
  // what they notice; the player's ailments and healing take their course.
  // (`resting`: a turn spent resting: healing quicker, and bleeding stops.)
  // (`cost`: how many turns the player's action takes: the monsters act as
  // much more, the ailments and healing go on each whole turn.)
  tick(searching = false, resting = false, cost = 1) {
    if (this.ended) return false;
    const before = this.turn;
    this.clock = (this.clock ?? 0) + cost;
    this.turn = Math.floor(this.clock + 1e-9);
    this.updateFov();
    this.spot(searching);
    this.chaseMap = null;
    for (const g of [...this.actors]) {
      if (g === this.player) continue;
      const M = MONSTERS[g.kind];
      if (M.regen && g.hp < g.maxHp) g.hp = Math.min(g.maxHp, g.hp + M.regen * cost);
      g.energy += M.speed * (monTrait(g).speed ?? 1) * cost;
      while (g.energy >= 1 && !this.ended && this.actors.includes(g)) {
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
    for (let t = before; t < this.turn && !this.dead; t++) {
      this.ailing(resting);
      if (!this.ended) this.monstersTurn();
    }
    return true;
  }
}

// The level the World is on, its state reached through it (`here`, a place
// kept in `places`: levels.js): its map, its seed, the pillars, doors and
// squares in the way, what its lights light, the things lying about, what's
// seen and in view, who's there (the player among them while on it). One
// place for each, so what a level keeps (lights put out, traps sprung) is
// kept with it as the World goes up and down.
for (const key of ["level", "seed", "posts", "pillars", "doors", "blocks", "items", "visible", "seen", "inView", "actors"])
  Object.defineProperty(World.prototype, key, {
    get() { return this.here[key]; },
    set(v) { this.here[key] = v; },
    configurable: true,
  });

// Saving: the run as plain data (JSON can hold it), and a run from it.
World.prototype.save = function () { return saveWorld(this); };
World.restore = (data) => { const w = restoreWorld(data, World.prototype); w.light = new Light(w); return w; };
// A replay played again (replay.js).
World.replay = (data, opts) => replayRun(data, World, opts);

// The rest of the World's ways, by part (each in its own file).
Object.assign(World.prototype, levelMethods, senseMethods, moveMethods, monsterMethods, fightMethods, itemMethods, actionMethods, replayMethods);
