// Levels: making a level when first come to, entering one and keeping it as left, filling it with monsters, lights and things; the stairs.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, PACK, PLACES, feature } from "./content.js";
import { MONSTER_TRAITS, MONSTER_TRAIT, ROOM_TRAITS, ROOM_TRAIT, roomKind } from "./traits.js";
import { roomAt } from "./names.js";
import { T, isOpen, DIRS8 } from "./dungeon.js";
import { generateAreas, AREAS } from "./levelgen.js";
import { postOutline } from "./sightline.js";
import { RNG, seedFor } from "./rng.js";

export const levelMethods = {
  // A level: its map, its monsters and things, what's been seen of it.
  // (A level given (`this.given`, by depth: a small map for a test) is
  // taken as it is: lit by its own lights, nothing else put in it.)
  makePlace(depth) {
    // (Its own dice, by the run's seed and its depth: made, then peopled.)
    const P = PLACES[depth - 1], rng = new RNG(seedFor(this.runSeed, "level", depth)), seed = rng.seed, given = this.given?.[depth];
    const level = given ?? generateAreas(rng, { from: P.from, to: P.to, up: !!P.up, down: !!P.down, throne: !!P.throne });
    const W = level.w, H = level.h;
    const st = {
      P, level, seed, dice: rng, ...(given ? { given: true } : {}),
      // Pillars on grid crossings, which no step goes diagonally past; and the
      // doors, by their square.
      posts: new Set((level.posts ?? []).map(([x, y]) => y * (W + 1) + x)),
      pillars: (level.features ?? []).filter((f) => feature(f).pillar).map((f) => ({ x: f.x, y: f.y, pts: postOutline(f) })),
      doors: new Map((level.doors ?? []).map((d) => [d.y * W + d.x, d])),
      // Squares in the way though floor (campfires).
      blocks: level.blocks ?? new Set(),
      actors: [], items: [],
      visible: new Uint8Array(W * H), seen: new Uint8Array(W * H),
      // What has a line of sight to the player (for monsters noticing them,
      // whatever the player can see).
      inView: new Uint8Array(W * H),
    };
    return st;
  },

  // Go to level `depth` (made if it hasn't been): the player arriving on the
  // stairs from where they came (`via` "down": the stairs up; "up": down).
  // (The level's state stays the level's: the World reaches it through
  // `here`, the level it's on (world.js); the player is among the level's
  // actors while on it, first.)
  enter(depth, via = null) {
    if (this.here) this.here.actors = this.here.actors.filter((a) => a !== this.player);
    const fresh = !this.places[depth - 1];
    if (fresh) this.places[depth - 1] = this.makePlace(depth);
    const st = this.places[depth - 1];
    this.here = st;
    this.place = st.P;
    const L = this.level, at = via === "up" ? L.stairsDown ?? L.start : L.stairsUp ?? L.start;
    this.player.x = at.x;
    this.player.y = at.y;
    // (The room arrived in needs no naming on the first step.)
    const r0 = roomAt(L, at.x, at.y);
    if (r0) r0.entered = true;
    st.actors.unshift(this.player);
    if (fresh) this.furnish(st);
    this.updateFov();
  },

  // A new level's monsters and things (a level given: nothing; its lights
  // are the light model's, light.js).
  furnish(st) {
    if (!st.given) this.populate(st);
  },

  // A new level's monsters and things.
  populate(st) {
    const level = this.level, P = st.P, rng = st.dice;
    // A pack round every campfire, awake; and in about a third of the rooms,
    // each of a kind found in that room's ground (round a campfire, goblins
    // if there are any there). Not where the player arrives, nor near the stairs.
    const away = (r) => r !== level.startRoom && r !== level.throneRoom;
    const rooms = rng.shuffle(level.rooms.filter(away)).sort((a, b) => (b.campfire ? 1 : 0) - (a.campfire ? 1 : 0));
    const packs = Math.max(Math.round(level.rooms.length / 3), rooms.filter((r) => r.campfire).length);
    for (const room of rooms.slice(0, packs)) {
      const table = P.spawns[AREAS[room.type]] ?? Object.values(P.spawns)[0];
      let kind = room.campfire && table.goblin ? "goblin" : null;
      if (!kind) {
        let r = rng.next() * Object.values(table).reduce((a, b) => a + b, 0);
        kind = Object.keys(table).find((k) => (r -= table[k]) < 0) ?? Object.keys(table)[0];
      }
      const M = MONSTERS[kind];
      this.spawnPack(room, rng.int(...(room.kind === "crypt" && M.crypt ? M.crypt : M.pack)), room.campfire ? "neutral" : null, kind, kind === "goblin" && rng.chance(P.warriors) ? "warrior" : null, rng);
    }
    // The goblin king on his throne, his guard round him.
    if (level.throneRoom) this.spawnPack(level.throneRoom, 5, "neutral", "warrior", "king", rng);
    // Rooms with a trait (traits.js): a few, each a trait picked first (of
    // those with a room to fit), then a room of a kind it fits.
    for (let n = rng.int(...ROOM_TRAIT.count); n > 0; n--) {
      const free = (t) => level.rooms.filter((r) => away(r) && !r.trait && ROOM_TRAITS[t].kinds.includes(roomKind(r)));
      const traits = Object.keys(ROOM_TRAITS).filter((t) => free(t).length);
      if (!traits.length) break;
      // (Ones not used yet on this level first.)
      const fresh = traits.filter((t) => !level.rooms.some((r) => r.trait === t)), t = rng.pick(fresh.length ? fresh : traits);
      rng.pick(free(t)).trait = t;
    }
    // Things lying about: a few in the rooms (not the one the player starts
    // in, nor a looted one); more in a stocked one.
    for (const room of rng.shuffle(level.rooms.filter((r) => away(r) && r.trait !== "looted")).slice(0, Math.round(level.rooms.length / PACK.perRooms))) {
      const spot = this.freeSpotIn(room, rng);
      if (spot) this.items.push({ x: spot.x, y: spot.y, item: this.randomItem(rng) });
    }
    // An infested room's nest, against a wall (a free square with rock
    // beyond it, not by a way in), and its rats.
    for (const room of level.rooms.filter((r) => r.trait === "infested")) {
      const spots = [];
      for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
        if (!this.isFree(x, y) || (level.features ?? []).some((f) => Math.abs(f.x - x - 0.5) < (f.w ?? 1) / 2 + 1.2 && Math.abs(f.y - y - 0.5) < (f.h ?? 1) / 2 + 1.2)) continue;
        if (DIRS8.some(([dx, dy]) => this.doorAt(x + dx, y + dy) || (isOpen(this.tileAt(x + dx, y + dy)) && !(x + dx >= room.x && y + dy >= room.y && x + dx < room.x + room.w && y + dy < room.y + room.h)))) continue;
        // (Along a wall, not in a corner: open either side along it.)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isOpen(this.tileAt(x + dx, y + dy)) && isOpen(this.tileAt(x + dy, y + dx)) && isOpen(this.tileAt(x - dy, y - dx))) spots.push({ x, y, dx, dy });
      }
      if (!spots.length) { delete room.trait; continue; }
      room.nest = rng.pick(spots);
      this.spawnPack({ x: room.nest.x - 1, y: room.nest.y - 1, w: 3, h: 3 }, rng.int(...ROOM_TRAITS.infested.rats), null, "rat", null, rng);
      for (const a of this.actors) if (a.kind === "rat" && !a.home && Math.abs(a.x - room.nest.x) <= 1 && Math.abs(a.y - room.nest.y) <= 1) a.home = room;
    }
    for (const room of level.rooms.filter((r) => r.trait === "stocked")) {
      for (let k = 0; k < ROOM_TRAITS.stocked.more; k++) {
        const spot = this.freeSpotIn(room, rng);
        if (spot) this.items.push({ x: spot.x, y: spot.y, item: this.randomItem(rng) });
      }
    }
  },

  // Take the stairs where the player stands (`dir` "down" or "up").
  takeStairs(dir) {
    if (this.ended) return false;
    const L = this.level, p = this.player, st = dir === "down" ? L.stairsDown : L.stairsUp;
    if (!st || st.x !== p.x || st.y !== p.y) {
      this.log(dir === "down" ? "There are no stairs down here." : "There are no stairs up here.");
      return false;
    }
    const from = this.level, depth = this.place.depth + (dir === "down" ? 1 : -1);
    this.enter(depth, dir);
    this.events.push({ type: "level", from });
    this.log(dir === "down" ? `You go down into ${this.place.name.toLowerCase()}.` : `You climb back up to ${this.place.name.toLowerCase()}.`);
    return true;
  },

  // A pack of `n` of a kind in a room (led, `leaderKind`, by another kind:
  // a goblin warrior; the goblin king, in the middle of the room).
  // (`rng`: the dice: making a level, its own; in play, the rest's.)
  spawnPack(room, n, state = null, kind = "goblin", leaderKind = null, rng = this.dice.world) {
    let leader = null;
    // (A trait for the whole pack, now and then; its leader may have its own.)
    const traitOf = (k) => { const fit = Object.keys(MONSTER_TRAITS).filter((t) => MONSTER_TRAITS[t].on.includes(k)); return fit.length ? rng.pick(fit) : null; };
    const packTrait = kind !== "king" && rng.chance(MONSTER_TRAIT.chance) ? traitOf(kind) : null;
    const leaderTrait = leaderKind && leaderKind !== "king" && rng.chance(MONSTER_TRAIT.leader) ? traitOf(leaderKind) : null;
    if (packTrait && MONSTER_TRAITS[packTrait].sleepy && state !== "neutral") state = "sleeping";
    state ??= rng.chance(0.35) && !MONSTERS[kind].patrol ? "sleeping" : "neutral";
    for (let k = 0; k < n; k++) {
      const kk = k === 0 && leaderKind ? leaderKind : kind;
      const spot = kk === "king" ? (room.seat ?? { x: room.cx, y: room.cy }) : this.freeSpotIn(room, rng);
      if (!spot || !this.isFree(spot.x, spot.y)) continue;
      const trait = k === 0 && leaderKind ? leaderTrait : packTrait;
      leader = this.placeMonster(kk, spot.x, spot.y, { state, trait, leader, rng }).leader;
    }
    // (How big the pack was, for its morale.)
    if (leader) for (const a of this.pack(leader)) a.packSize = this.pack(leader).length;
  },

  // A monster of `kind` at (x, y), in `state` (asleep, or milling about if
  // not given), with a `trait` if any, following `leader` (else leading
  // itself); its hit points thrown, its energy part-way to its first move.
  placeMonster(kind, x, y, { state = "neutral", trait = null, leader = null, rng = this.dice.world } = {}) {
    const hp = Math.max(1, Math.round(rng.int(...MONSTERS[kind].hp) * ((trait && MONSTER_TRAITS[trait].hp) || 1)));
    const g = { id: this.nextId++, kind, glyph: MONSTERS[kind].glyph, x, y, state, calm: 0, hp, maxHp: hp, energy: rng.next(), ...(trait ? { trait } : {}) };
    g.leader = leader || g;
    this.actors.push(g);
    return g;
  },

  freeSpotIn(room, rng = this.dice.world) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rng.int(room.x, room.x + room.w - 1), y = rng.int(room.y, room.y + room.h - 1);
      if (this.tileAt(x, y) === T.FLOOR && this.isFree(x, y)) return { x, y };
    }
    return null;
  },
};
