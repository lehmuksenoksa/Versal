// What the player sees (field of view), what the monsters notice (sight, sound, the lamp), secret doors found, and noise.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, GOBLIN, AWARE, NOISE, SENSES, SECRET, PLAYER } from "./content.js";
import { monTrait } from "./traits.js";
import { T, isOpen } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { lineClear } from "./sightline.js";
import { hypot } from "./dmath.js";
import { DIM, LIT } from "./light.js";
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
    this.visible.fill(0);
    for (const k of this.los.cells) {
      const x = k % w, y = (k - x) / w;
      // (In the dark, round: a square whose middle is within dark sight and a half.)
      if (this.light.at(x, y) === 0 && (x - px) * (x - px) + (y - py) * (y - py) > (dark + 0.5) * (dark + 0.5)) continue;
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
  // (light-and-dread.md, section 2): 0 nothing (not in sight); 1 only that
  // something's there (dark, within their dark sight); 2 its kind (dim; or
  // dark, next to them: `darkKind`, spec/sight.md, yours: "the player should
  // make out if the monster right next to them is a goblin or a rat"); 3
  // everything (lit).
  knowAt(x, y) {
    if (!this.isVisible(x, y)) return KNOW.nothing;
    const l = this.light.at(x, y), dx = x - this.player.x, dy = y - this.player.y, r = PLAYER.darkKind + 0.5;
    if (l === LIT) return KNOW.all;
    return l === DIM || dx * dx + dy * dy <= r * r ? KNOW.kind : KNOW.something;
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
    const p = this.player, W = this.level.w, lit = this.playerLit(), range = lit ? AWARE.seeLit : AWARE.seeDark;
    const angry = new Set();
    for (const g of this.actors) {
      if (g === p) continue;
      const d = Math.max(Math.abs(g.x - p.x), Math.abs(g.y - p.y)), sees = this.inView[g.y * W + g.x] === 1;
      g.sees = sees;
      if (g.state === "aggressive" || g.state === "fleeing") continue;
      const S = SENSES[g.state] ?? SENSES.neutral, T = monTrait(g);
      // (A watchful monster sees further in the dark; a sleepy one hears less.)
      const far = lit ? range : range * (T.see ?? 1);
      let gain = 0;
      if (sees && d <= far) gain += ((lit ? AWARE.sight : AWARE.sightDark) * (1 - (d - 1) / far) + (d <= 1 ? (lit ? AWARE.near : AWARE.nearDark) : 0)) * S.see;
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
