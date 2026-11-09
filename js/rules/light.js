// One model of light (spec/light-set.md, L1; light-and-dread.md, section 1):
// each square of the level the World is on dark (0), dim (1) or lit (2). Lit
// within a light's lit band, dim within its dim band, each written in whole
// steps and reaching half a step more (spec/light-rebuild.md, S2: no faint
// band; what's seen past a light is the dark vision's); along
// lines of sight, walls, shut doors and pillars stopping it (and the big
// furniture, the fixed lights'); where lights meet, the brightest. Every light
// a source: the level's own (braziers, candles, campfires: `level.lights`,
// worked out again when one changes or a door opens or shuts, `changed`),
// and the carried ones (the player's lamp, a cultist's lantern: each turn).
// Their bands: js/content/lights.json.
//
// A part of its own, owned by the World (`world.light`): its state is the
// level's lights; what it keeps is worked out from them, not saved.
import { LIGHTS, lightReach } from "./levelgen.js";
import { MONSTERS } from "./content.js";
import { isOpen } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { shadeOutline, lineClear } from "./sightline.js";
import { hypot } from "./dmath.js";

export const DARK = 0, DIM = 1, LIT = 2;

export class Light {
  constructor(world) {
    this.w = world;
    // (The level worked out for, its fixed lights' light, and with the
    // carried ones: now.)
    this.of = null;
    this.fixed = null;
    this.now = null;
    this.carried = null;
  }

  // A light or a door changed: the fixed lights worked out again.
  changed() { this.fixed = null; this.carried = null; }

  // How light the square (x, y) is.
  at(x, y) {
    const L = this.w.level;
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return DARK;
    if (this.of !== L || !this.now) this.update();
    return this.now[y * L.w + x];
  }

  // Worked out for now (each turn, as the World looks about: senses.js).
  update() {
    const w = this.w, L = w.level;
    if (this.of !== L || !this.fixed) {
      this.of = L;
      this.fixed = new Uint8Array(L.w * L.h);
      // (What stops light, a square each: rock, and shut doors.)
      this.block = new Uint8Array(L.w * L.h);
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) this.block[y * L.w + x] = !isOpen(w.tileAt(x, y)) || w.shut(x, y) ? 1 : 0;
      this.shades = (L.features ?? []).map((f) => shadeOutline(f)).filter(Boolean);
      this.pillarShades = w.pillars.map((p) => p.pts);
      for (const l of L.lights ?? []) if (!l.out) this.shine(this.fixed, l.x, l.y, l.kind, this.shades);
      this.carried = null;
    }
    // (The carried lights: cast past pillars only, not the furniture, which
    // the one carrying may stand among. Worked out again only when one of
    // them has moved, or the fixed lights have.)
    const carriers = [...(w.sneaking ? [] : [["lamp", w.player.x, w.player.y]]), ...w.actors.filter((a) => a !== w.player && MONSTERS[a.kind]?.lantern).map((a) => ["lantern", a.x, a.y])];
    const key = carriers.join(";");
    if (this.carried === key && this.now) return;
    this.carried = key;
    this.now = this.fixed.slice();
    for (const [kind, x, y] of carriers) this.shine(this.now, x + 0.5, y + 0.5, kind, []);
  }

  // A light of `kind` at (lx, ly) (squares, its middle) onto `map`, its
  // line stopped by walls and pillars, and the furniture `shades` crosses.
  shine(map, lx, ly, kind, shades) {
    const L = this.w.level, W = L.w, H = L.h, R = lightReach(LIGHTS[kind] ?? LIGHTS.fire), far = R.dim, block = this.block;
    const opaque = (x, y) => x < 0 || y < 0 || x >= W || y >= H || block[y * W + x] === 1;
    const close = (pts) => pts.some(([x, y]) => Math.abs(x - lx) <= far + 1 && Math.abs(y - ly) <= far + 1);
    const pillars = this.pillarShades.filter(close), things = shades.filter(close);
    // (And a clear line from the light to the square's middle, kept clear of
    // walls and pillars by a tenth of a square: lineClear, sightline.js;
    // the furniture only stops a line that crosses it.)
    computeFov(L.w, L.h, Math.floor(lx), Math.floor(ly), far, opaque, (x, y) => {
      const cx = x + 0.5, cy = y + 0.5, d = hypot(cx - lx, cy - ly);
      if (d > far) return;
      if (!opaque(x, y) && !lineClear(lx, ly, x, y, opaque, pillars, things)) return;
      const v = d <= R.lit ? LIT : DIM, k = y * W + x;
      if (v > map[k]) map[k] = v;
    });
  }
}
