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
      this.shades = [...w.pillars.map((p) => p.pts), ...(L.features ?? []).map((f) => shadeOutline(f)).filter(Boolean)];
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
    for (const [kind, x, y] of carriers) this.shine(this.now, x + 0.5, y + 0.5, kind, this.pillarShades);
  }

  // A light of `kind` at (lx, ly) (squares, its middle) onto `map`.
  shine(map, lx, ly, kind, shades) {
    const L = this.w.level, W = L.w, H = L.h, B = LIGHTS[kind] ?? LIGHTS.fire, far = B.full + B.dim + B.dark, block = this.block;
    const opaque = (x, y) => x < 0 || y < 0 || x >= W || y >= H || block[y * W + x] === 1;
    const near = shades.filter((pts) => pts.some(([x, y]) => Math.abs(x - lx) <= far + 1 && Math.abs(y - ly) <= far + 1));
    // (A clear line from the light to the square's middle too: the casting
    // is generous at walls' corners, where the light's line would cut
    // across one; the view draws by the line. A line grazing a wall's corner,
    // no more than a tenth of a square into it, gets past, as in the view,
    // whose walls are drawn along the squares' edges.)
    // (First the squares the line crosses: none of them a wall but its own,
    // and it's clear; else the fine walk, a twentieth of a square at a
    // time, which decides.)
    const crossesWall = (cx, cy, x, y) => {
      let gx = Math.floor(lx), gy = Math.floor(ly);
      const dx = cx - lx, dy = cy - ly, sx = Math.sign(dx), sy = Math.sign(dy);
      const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
      let tx = dx ? (sx > 0 ? gx + 1 - lx : lx - gx) * tdx : Infinity, ty = dy ? (sy > 0 ? gy + 1 - ly : ly - gy) * tdy : Infinity;
      const wall = (a, b) => (a !== x || b !== y) && opaque(a, b);
      for (let i = 0; i < 64 && (gx !== x || gy !== y); i++) {
        // (Through a corner exactly: both squares beside it counted.)
        if (Math.abs(tx - ty) < 1e-9) { if (wall(gx + sx, gy) || wall(gx, gy + sy)) return true; gx += sx; gy += sy; tx += tdx; ty += tdy; }
        else if (tx < ty) { gx += sx; tx += tdx; }
        else { gy += sy; ty += tdy; }
        if (tx > 1 + 1e-9 && ty > 1 + 1e-9 && (gx !== x || gy !== y)) return true;
        if (wall(gx, gy)) return true;
      }
      return false;
    };
    const clear = (cx, cy, x, y) => {
      if (!crossesWall(cx, cy, x, y)) return true;
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
