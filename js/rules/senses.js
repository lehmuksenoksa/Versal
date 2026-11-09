// What the player sees (field of view), what the monsters notice (sight, sound, the lamp), secret doors found, and noise.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, GOBLIN, AWARE, NOISE, SENSES, SECRET, PLAYER } from "./content.js";
import { monTrait } from "./traits.js";
import { T, isOpen } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { lineClear } from "./sightline.js";
import { hypot } from "./dmath.js";
import { DARK, DIM, LIT } from "./light.js";
import { LIGHTS } from "./levelgen.js";

// What the player can tell of a thing (knowAt).
export const KNOW = { nothing: 0, something: 1, kind: 2, all: 3 };

// How far round them the player sees: the lamp lit, as far as its dim light
// reaches and their dark sight past it; out, their dark sight.
export const sightRound = (sneaking) => (sneaking ? PLAYER.darkSight : LIGHTS.lamp.dim + PLAYER.darkSight);

export const senseMethods = {
  // What the player can see: squares in sight past the walls and shut doors
  // (and the pillars: a square is hidden behind one when the line between
  // the middles of the two squares crosses it, as the map draws it).
  // (By light (light-and-dread.md, section 2): every lit or dim square in
  // line of sight, however far; in the dark, the player's dark sight round
  // them.)
  updateFov() {
    // (What's lit first: the light model, light.js.)
    this.light.update();
    const { w, h } = this.level, { x: px, y: py } = this.player, opaque = (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y);
    const far = Math.max(w, h), dark = PLAYER.darkSight;
    // (Along a clear line from the player's middle to the square's, as light
    // goes: lineClear, sightline.js; walls themselves seen as they're cast.)
    const ax = px + 0.5, ay = py + 0.5, pillars = this.pillars.map((p) => p.pts);
    const sees = (x, y) => opaque(x, y) || lineClear(ax, ay, x, y, opaque, pillars);
    // (The squares in line of sight, kept until the player moves or a door
    // or a secret door changes (`losKey`, forgotten in moves.js and here);
    // only the light on them worked out again.)
    const key = `${this.place.depth}:${px},${py}`;
    if (this.los?.key !== key || this.los.level !== this.level) {
      const cells = [];
      computeFov(w, h, px, py, far, opaque, (x, y) => { if (sees(x, y)) cells.push(y * w + x); });
      // (And the squares from which a monster could see the player, as near
      // as `GOBLIN.lose`: the same lines, the other way, so the same squares.)
      const R2 = GOBLIN.lose * GOBLIN.lose, near = cells.filter((k) => {
        const x = k % w, y = (k - x) / w;
        return (x - px) * (x - px) + (y - py) * (y - py) <= R2;
      });
      this.los = { key, level: this.level, cells, near };
    }
    this.looked[py * w + px] |= this.sneaking ? 2 : 1;
    // (Seen: every lit or dim square in line of sight, however far; and a dark
    // one by the player's dark vision, whose distance is from the player or
    // from a lit or dim square they see, whichever is nearer (spec/sight.md;
    // spec/light-rebuild.md, S3): within `darkSight` (and a half) that
    // something's there, within `darkKind` its kind (`los.tell`, 1 and 2).
    // Kept with the lines, not saved.)
    const L = this.light, cells = this.los.cells, R1 = (PLAYER.darkKind + 0.5) ** 2, R3 = (dark + 0.5) ** 2, reach = Math.ceil(dark + 0.5);
    const lit = (this.los.lit ??= new Uint8Array(w * h)), tell = (this.los.tell ??= new Uint8Array(w * h));
    lit.fill(0);
    tell.fill(0);
    let any = false;
    for (const k of cells) {
      const x = k % w;
      if (L.at(x, (k - x) / w) > 0) lit[k] = any = 1;
    }
    this.visible.fill(0);
    for (const k of cells) {
      const x = k % w, y = (k - x) / w;
      if (!lit[k]) {
        let near = (x - px) * (x - px) + (y - py) * (y - py);
        if (any && near > R1)
          for (let dy = -reach; dy <= reach; dy++)
            for (let dx = -reach; dx <= reach; dx++) {
              const d = dx * dx + dy * dy, X = x + dx, Y = y + dy;
              if (d < near && X >= 0 && Y >= 0 && X < w && Y < h && lit[Y * w + X]) near = d;
            }
        if (near > R3) continue;
        tell[k] = near <= R1 ? 2 : 1;
      }
      this.visible[k] = 1;
      this.seen[k] = 1;
    }
    this.inView.fill(0);
    for (const k of this.los.near) this.inView[k] = 1;
    // (A monster whose kind the player has told stays told, `told`, though it
    // goes off into the dark; lost from sight (`lost`, the turn), for
    // `player.remember` turns more, so it's known again if it's back soon.
    // Yours: "seen monsters should be remembered. It's strange they turn into
    // question marks"; "remember them for a few turns, so if they reappear
    // soon, they're still seen the same way. Don't remember them in the last
    // seen position.")
    for (const a of this.actors) {
      if (a === this.player) continue;
      if (this.isVisible(a.x, a.y)) {
        a.lost = null;
        if (this.knowAt(a.x, a.y) >= KNOW.kind) a.told = true;
      } else if (a.told) {
        a.lost ??= this.turn;
        if (this.turn - a.lost >= PLAYER.remember) a.told = false;
      }
    }
    // (And a thing on the floor, once seen (`seen`, for the map to remember
    // it by) or told (`told`), stays so while it lies there: yours, "Also
    // seen items".)
    for (const it of this.items) {
      if (!this.isVisible(it.x, it.y)) continue;
      it.seen = true;
      if (!it.told && this.knowAt(it.x, it.y) >= KNOW.kind) it.told = true;
    }
  },

  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; },

  // What the player can tell of what's at (x, y), by the light there
  // (light-and-dread.md, section 2): 0 nothing (not in sight); 3 everything
  // (lit); 2 its kind (dim; or dark, within their dark vision's `darkKind`
  // of them or of a lit or dim square they see: spec/sight.md, yours: "the
  // player should make out if the monster right next to them is a goblin or
  // a rat"); else 1, only that something's there.
  knowAt(x, y) {
    if (!this.isVisible(x, y)) return KNOW.nothing;
    const l = this.light.at(x, y);
    if (l === LIT) return KNOW.all;
    return l === DIM || this.los?.tell?.[y * this.level.w + x] === 2 ? KNOW.kind : KNOW.something;
  },

  // What the player can tell of the monster `a`: as of its square, but its
  // kind if told and not long lost from sight (`told`, updateFov).
  knowOf(a) {
    const k = this.knowAt(a.x, a.y);
    return k === KNOW.something && a.told ? KNOW.kind : k;
  },

  // The same for a thing on the floor (an entry of `items`): its kind once
  // told while it has lain there.
  knowOfItem(it) {
    const k = this.knowAt(it.x, it.y);
    return k === KNOW.something && it.told ? KNOW.kind : k;
  },

  // The player spends a turn searching for secret doors.
  search() {
    if (this.ended) return false;
    this.events.push({ type: "search" });
    return this.tick(true);
  },

  // Each turn, the player may see a secret door in sight close by (more
  // likely searching): it is a door from then on, shut.
  spot(searching) {
    const p = this.player, L = this.level;
    for (const s of L.secrets ?? []) {
      const d = Math.max(Math.abs(s.x - p.x), Math.abs(s.y - p.y));
      if (s.found || d > SECRET.reach || !this.isVisible(s.x, s.y)) continue;
      const chance = d <= 1 ? (searching ? SECRET.searchNear : SECRET.near) : searching ? SECRET.searchFar : SECRET.far;
      if (!this.dice.world.chance(chance)) continue;
      s.found = true;
      L.tiles[s.y * L.w + s.x] = T.FLOOR;
      this.los = null;
      this.light.changed();
      const door = { x: s.x, y: s.y, dx: s.dx, dy: s.dy, open: false, secret: true };
      L.doors.push(door);
      this.doors.set(s.y * L.w + s.x, door);
      this.events.push({ type: "secret", door });
      this.log("You find a secret door.", "good");
    }
  },

  // Lamp out (sneaking) or lit again: how far round them the player sees,
  // by its light or their dark sight (`sight`, for the view to draw).
  setSneaking(on) {
    this.sneaking = on;
    this.sight = sightRound(on);
    this.updateFov();
    this.events.push({ type: "sneak", on });
    this.log(on ? "You put out your lamp." : "You light your lamp.");
  },

  // What the monster `g` can tell of the player by its own eyes
  // (spec/light-rebuild.md, S4; spec/sight.md): 3 clearly, 2 their kind (it
  // sees them), 1 a glimpse, 0 nothing; with how far its sight went
  // (`sightOf`: { tell, far }, `far` for how much a sighting counts by how
  // near). Along the same lines as the player's sight (`inView`). Its
  // Vision by the light on the player's square (dim: none clear, each
  // halved); its dark vision from itself, or from a lit or dim square near
  // the player it sees, but past a light no better than its Vision would see
  // them lit; the better of the two. Light-shy: dark vision only, from
  // itself, a band worse on a dim square, two on a lit one, and a light's own
  // square in the way stops it.
  sightOf(g) {
    const p = this.player, M = MONSTERS[g.kind], W = this.level.w;
    if (this.inView[g.y * W + g.x] !== 1) return { tell: 0, far: 1 };
    const d2 = (g.x - p.x) ** 2 + (g.y - p.y) ** 2, Lp = this.light.at(p.x, p.y);
    // (A band of n reaches the middles within n and a half; 0 is no band.)
    const within = (n, r2) => n > 0 && r2 <= (n + 0.5) ** 2;
    const band = (b, r2) => (!b ? 0 : within(b[0], r2) ? 3 : within(b[1], r2) ? 2 : within(b[2], r2) ? 1 : 0);
    const reach = (b) => (b ? b[2] + 0.5 : 0);
    const plus = monTrait(g).dark ?? 0, dark = M.dark && M.dark.map((n) => n + plus);
    if (M.lightShy) {
      if (this.lightBetween(g)) return { tell: 0, far: 1 };
      return { tell: Math.max(0, band(dark, d2) - Lp), far: reach(dark) };
    }
    const half = M.vision && M.vision.map((n) => n / 2);
    const see = !M.vision || Lp === DARK ? 0 : Lp === LIT ? band(M.vision, d2) : Math.min(2, band(half, d2));
    let best = { tell: see, far: Lp === LIT ? reach(M.vision) : reach(half) };
    if (dark) {
      // (The nearest lit or dim square to the player that it sees: theirs, if so.)
      let D2 = d2;
      if (Lp > DARK) D2 = 0;
      else {
        const R = Math.ceil(dark[2] + 0.5), opaque = (x, y) => !isOpen(this.tileAt(x, y)) || this.shut(x, y), pillars = this.pillars.map((q) => q.pts);
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const x = p.x + dx, y = p.y + dy, e = dx * dx + dy * dy;
            if (e < D2 && this.light.at(x, y) > DARK && lineClear(g.x + 0.5, g.y + 0.5, x, y, opaque, pillars)) D2 = e;
          }
      }
      let dv = band(dark, D2);
      if (D2 < d2) dv = Math.min(dv, band(M.vision, d2));
      if (dv > best.tell) best = { tell: dv, far: D2 < d2 ? reach(M.vision) : reach(dark) };
    }
    return best;
  },

  tellOf(g) { return this.sightOf(g).tell; },

  // Does a light's own square stand between the monster `g` and the player
  // (a level's light's, a lantern carrier's), stopping a light-shy one's
  // sight as rock does?
  lightBetween(g) {
    const p = this.player, squares = new Set();
    for (const l of this.level.lights ?? []) if (!l.out) squares.add(`${Math.floor(l.x)},${Math.floor(l.y)}`);
    for (const a of this.actors) if (a !== g && a !== p && MONSTERS[a.kind]?.lantern) squares.add(`${a.x},${a.y}`);
    if (!squares.size) return false;
    const ax = g.x + 0.5, ay = g.y + 0.5, bx = p.x + 0.5, by = p.y + 0.5, n = Math.ceil(Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) / 0.1);
    for (let i = 1; i < n; i++) {
      const x = Math.floor(ax + ((bx - ax) * i) / n), y = Math.floor(ay + ((by - ay) * i) / n);
      if ((x === g.x && y === g.y) || (x === p.x && y === p.y)) continue;
      if (squares.has(`${x},${y}`)) return true;
    }
    return false;
  },

  // Is the player lit: their square dim or lit (their lamp, a light's,
  // a cultist's lantern's: light.js)?
  playerLit() {
    const p = this.player;
    return this.light.at(p.x, p.y) >= 1;
  },

  // What the monsters notice: each that sees or hears the player grows more
  // aware (more when close, when the player is lit, when it's alert), and
  // less while it doesn't. A third aware, suspicious; fully, alarmed, and its
  // pack with it. Aggressive packs give up after GOBLIN.calm turns of not
  // seeing the player, or when they are far off, but stay suspicious.
  notice() {
    const p = this.player;
    const angry = new Set();
    for (const g of this.actors) {
      if (g === p) continue;
      // (By its own eyes, sightOf: seeing the player counts as a sighting
      // did, a glimpse as a sighting in the dark did; more the nearer, and
      // next to it more again.)
      const { tell, far } = this.sightOf(g), d = hypot(g.x - p.x, g.y - p.y);
      g.sees = tell > 0;
      g.tell = tell;
      if (g.state === "aggressive" || g.state === "fleeing") continue;
      const S = SENSES[g.state] ?? SENSES.neutral, T = monTrait(g);
      let gain = 0;
      if (tell > 0) gain += ((tell >= 2 ? AWARE.sight : AWARE.sightDark) * Math.max(0, 1 - (d - 1) / far) + (d <= 1.5 ? (tell >= 2 ? AWARE.near : AWARE.nearDark) : 0)) * S.see;
      for (const n of this.noises ?? []) {
        const dn = hypot(g.x - n.x, g.y - n.y);
        if (dn <= n.r) gain += AWARE.hear * n.loud * (1 - dn / (n.r + 1)) * S.hear * (T.hear ?? 1);
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
        // (Zombies never give up.)
        if ((MONSTERS[a.kind].relentless || monTrait(a).relentless) && !far) continue;
        if (far || calm >= GOBLIN.calm) {
          a.state = "suspicious";
          a.aware = 0.6;
          a.lastSpot = { x: p.x, y: p.y };
        }
      }
    }
  },

  monsterInSight() {
    return this.actors.some((a) => a !== this.player && this.isVisible(a.x, a.y));
  },

  // Is something about that should stop the player resting: a monster in
  // sight, or one chasing within earshot?
  disturbed() {
    const p = this.player;
    return this.monsterInSight() || this.actors.some((a) => a !== p && (a.state === "aggressive" || a.state === "suspicious") && hypot(a.x - p.x, a.y - p.y) <= 12);
  },

  // A noise the player makes, at their square, heard this turn.
  makeNoise(kind, x = this.player.x, y = this.player.y) {
    // (In an echoing room, or wading, twice as far.)
    const R = this.roomTraitAt(x, y);
    (this.noises ??= []).push({ x, y, r: NOISE[kind][0] * (R === "echoing" || R === "flooded" ? 2 : 1), loud: NOISE[kind][1] });
  },
};
