// One model of light (spec/light-set.md, L1; light-and-dread.md, section 1):
// each square of the level the World is on dark (0), dim (1) or lit (2). Lit
// within a light's full band, dim within its dim and faint bands (the faint
// one drawn fainter, played as dim: "Can we treat dim and faint band same
// from gameplay perspective, but show them differently visually?"); along
// lines of sight, walls, shut doors and pillars stopping it (and the big
// furniture, the fixed lights'); where lights meet, the brightest. Every light
// a source: the level's own (braziers, candles, campfires: `level.lights`,
// worked out again when one changes or a door opens or shuts, `changed`),
// and the carried ones (the player's lamp, a cultist's lantern: each turn).
// Their bands: js/content/lights.json.
//
// A part of its own, owned by the World (`world.light`): its state is the
// level's lights; what it keeps is worked out from them, not saved.
import { LIGHTS } from "./levelgen.js";
import { MONSTERS } from "./content.js";
import { isOpen } from "./dungeon.js";
import { computeFov } from "./fov.js";
import { shadeOutline, crossesOutline, insideOutline } from "./sightline.js";
import { hypot } from "./dmath.js";

export const DARK = 0, DIM = 1, LIT = 2;

// How far into a wall's corner a light's line may cut and still get past.
const GRAZE = 0.1;

export class Light {
  constructor(world) {
    this.w = world;
    // (The level worked out for, its fixed lights' light, and with the
    // carried ones: now.)
    this.of = null;
    this.fixed = null;
    this.now = null;
  }

  // A light or a door changed: the fixed lights worked out again.
  changed() { this.fixed = null; }

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
      this.shades = [...w.pillars.map((p) => p.pts), ...(L.features ?? []).map((f) => shadeOutline(f)).filter(Boolean)];
      this.pillarShades = w.pillars.map((p) => p.pts);
      for (const l of L.lights ?? []) if (!l.out) this.shine(this.fixed, l.x, l.y, l.kind, this.shades);
    }
    this.now = this.fixed.slice();
    // (The carried lights: cast past pillars only, not the furniture, which
    // the one carrying may stand among.)
    if (!w.sneaking) this.shine(this.now, w.player.x + 0.5, w.player.y + 0.5, "lamp", this.pillarShades);
    for (const a of w.actors) if (a !== w.player && MONSTERS[a.kind]?.lantern) this.shine(this.now, a.x + 0.5, a.y + 0.5, "lantern", this.pillarShades);
  }

  // A light of `kind` at (lx, ly) (squares, its middle) onto `map`.
  shine(map, lx, ly, kind, shades) {
    const w = this.w, L = w.level, W = L.w, B = LIGHTS[kind] ?? LIGHTS.fire, far = B.full + B.dim + B.dark;
    const opaque = (x, y) => !isOpen(w.tileAt(x, y)) || w.shut(x, y);
    const near = shades.filter((pts) => pts.some(([x, y]) => Math.abs(x - lx) <= far + 1 && Math.abs(y - ly) <= far + 1));
    // (A clear line from the light to the square's middle too: the casting
    // is generous at walls' corners, where the light's line would cut
    // across one; the view draws by the line. A line grazing a wall's corner,
    // no more than a tenth of a square into it, gets past, as in the view,
    // whose walls are drawn along the squares' edges.)
    const clear = (cx, cy, x, y) => {
      const d = hypot(cx - lx, cy - ly), n = Math.ceil(d / 0.05);
      for (let i = 1; i < n; i++) {
        const px = lx + ((cx - lx) * i) / n, py = ly + ((cy - ly) * i) / n, sx = Math.floor(px), sy = Math.floor(py);
        if ((sx === x && sy === y) || !opaque(sx, sy)) continue;
        if (Math.min(px - sx, sx + 1 - px, py - sy, sy + 1 - py) > GRAZE) return false;
      }
      return true;
    };
    computeFov(L.w, L.h, Math.floor(lx), Math.floor(ly), far, opaque, (x, y) => {
      const cx = x + 0.5, cy = y + 0.5, d = hypot(cx - lx, cy - ly);
      if (d > far) return;
      if (!opaque(x, y) && !clear(cx, cy, x, y)) return;
      if (near.some((pts) => !insideOutline(cx, cy, pts) && crossesOutline(lx, ly, cx, cy, pts))) return;
      const v = d <= B.full ? LIT : DIM, k = y * W + x;
      if (v > map[k]) map[k] = v;
    });
  }
}
