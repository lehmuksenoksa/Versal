// What the player sees (field of view), what the monsters notice (sight, sound, the lamp), secret doors found, and noise.
// Methods of the World (js/rules/world.js), joined to it there.
import { MONSTERS, GOBLIN, AWARE, NOISE, SENSES, SECRET, PLAYER } from "./content.js";
import { monTrait } from "./traits.js";
import { T, isOpen } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { crossesOutline } from "./sightline.js";
import { hypot } from "./dmath.js";

export const senseMethods = {
  // What the player can see: squares in sight past the walls and shut doors
  // (and the pillars: a square is hidden behind one when the line between
  // the middles of the two squares crosses it, as the map draws it).
  updateFov() {
    // (What's lit first: the light model, light.js.)
    this.light.update();
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
  },

  isVisible(x, y) { return this.visible[y * this.level.w + x] === 1; },

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
      const door = { x: s.x, y: s.y, dx: s.dx, dy: s.dy, open: false, secret: true };
      L.doors.push(door);
      this.doors.set(s.y * L.w + s.x, door);
      this.events.push({ type: "secret", door });
      this.log("You find a secret door.", "good");
    }
  },

  // Lamp out (sneaking, seeing only so far round) or lit again (the player's
  // sight either way: tuning.json, `player.sight`).
  setSneaking(on) {
    this.sneaking = on;
    this.sight = on ? PLAYER.sight.dark : PLAYER.sight.lit;
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
