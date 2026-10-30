// How the map is shown as it is explored. Colour comes from the light only:
// where the player's candle falls, in flat bands (full, dim and dark), the
// paper floor and a rim of the rock's colour;
// everywhere else, one colour of darkness. Ink shows the map: in sight, the
// full ink (black walls, the floor grid and its shadow, the hatching);
// beyond sight, fainter walls and lighter hatching. The hatching is one
// pattern for all the rock (the map hatched as solid stone), inked by a
// depth map from the known walls. Ground never seen fades into black fog.
//
// The slow part, the ink and the fog, is redrawn only when more ground is
// known (`rebuild`); the light, the darkness and which ink shows are laid
// down each frame (`update`, `drawMap`). The settings were chosen in the
// expression mockup (mockups/expression.html), which uses this module too.

import { renderMap, drawPaper, drawDoors, wallLine } from "./maprender.js";
import { hatchSolid, inkRecorded, nearestSeeds } from "./hatching.js";
import { RNG } from "./rng.js";
import { Walls } from "./sightline.js";
import { T } from "./dungeon.js";

export const EXPRESSION_DEFAULTS = {
  // Sight: clear out to `sight` tiles, then fading out with distance over
  // `sightFade`; where walls block the view the edge softens over
  // `blockSoft`. Changes ease in over `reveal` seconds.
  sight: 8, sightFade: 1.5, blockSoft: 0.1, reveal: 0.4,
  // Known walls and hatching this near the player (in tiles) keep the ink
  // in sight, seen or not (round a corner), softening over `nearSoft`.
  nearInk: 3, nearSoft: 1.5,
  // The candle, in flat bands counted in squares out from the player: full
  // brightness for `lightFull` squares (the player's the first), then dim
  // (`dimLevel`) for `lightDim` squares, then dark (`darkLevel`) for
  // `lightDark`, the bands' edges ragged by `lightRag` tiles. The bands drawn
  // as `lightFill` "tones" or "strokes" (hatched), with an inked line where
  // the light changes as strong as `lightEdge`. It lights a rim of rock
  // about `lightWall` tiles past a wall's face. The flame's size sets how
  // wide the dim and dark sides of its shadows are. Flicker in brightness
  // and in size, and warmth.
  lightFull: 5, lightDim: 1, lightDark: 2, dimLevel: 0.75, darkLevel: 0.2, lightFill: "tones", lightEdge: 0, lightRag: 0.2, lightWall: 0.6, flame: 0.25, flicker: 0.4, flickerSize: 0.02, warmth: 0.7,
  // The colour of everything the candle doesn't light.
  darkColor: "#3b3936",
  // The ink in sight and beyond it: colour and strength of the floor
  // markings, walls and hatching; the hatching beyond sight is inked from a
  // weaker depth map.
  seeMarkC: "#1b1815", seeMark: 1, seeWallC: "#1b1815", seeWall: 1, seeHatchC: "#1b1815", seeHatch: 1,
  memWeight: 0.35, memMarkC: "#8a7f72", memMark: 0, memWallC: "#6b5f52", memWall: 0.55, memHatchC: "#6b5f52", memHatch: 0.55,
  // The depth map: how it is made, black up to `full` tiles from the known
  // walls and white from `reach`, its ragged edge, and (for some ways of
  // making it) how openings soften it.
  depth: "distance", full: 0.3, reach: 3.2, ragged: 0.6, opening: 1, taper: 2,
  // The hatching from black to white: strokes kept, their width, length and
  // ink in mid grey (each going on to nothing at white, but ink).
  keepGrey: 0.85, wBlack: 1.5, wGrey: 1.5, lenGrey: 0.6, inkGrey: 1,
  // Unexplored ground: its colour, how it fades in, and from where; and for
  // hexes, how far apart they are (in squares).
  outColor: "#000000", fadeStyle: "strokes", fadeBy: "distance", fadeStart: 2.75, fadeWidth: 3.75, hexSize: 1.5,
  // The rock outside the rooms, where lit: the paper toned toward a colour.
  rockColor: "#8f8a80", rockTone: 0.85,
};
// Settings that only change what is laid down each frame; `sight`,
// `sightFade` and `flame` also change what is seen, and the rest mean redrawing the ink.
export const LIVE_SETTINGS = new Set(["sight", "sightFade", "blockSoft", "reveal", "nearInk", "nearSoft", "lightFull", "lightDim", "lightDark", "dimLevel", "darkLevel", "lightFill", "lightEdge", "lightRag", "lightWall", "flame", "flicker", "flickerSize", "warmth", "darkColor", "rockColor", "rockTone"]);

const R = 8; // mask pixels per tile
// Lights in the level (campfires): their bands, in squares from the
// light, like the candle's; and how far off the player sees what they light.
const LAMPS = { fire: { full: 2.5, dim: 1.5, dark: 2 } };
// Lit places (rooms, stretches of corridor): lit throughout, the light
// pouring out of them in bands as the player's, in squares past their edge.
const LIT = { dim: 1, dark: 2 };
const LAMP_SEE = 24;
// How much a fire's light swells and shrinks as it flickers (of its size).
const FIRE_SWELL = 0.04;
// How warm their light is (as `warmth`; theirs whatever the player's lamp).
const LAMP_WARMTH = 0.7;
// The rock this close to known floor (in tiles) shows the walls' ink.
const WALL_BAND = 0.5;
// Walls show beside floor seen this near (in tiles, over the floor).
const WALL_SPREAD = 0.75;
const PAPER_RGB = [247, 242, 230];
// The most pixels in one of the full-map drawings, and in the sight and
// light over them (lower, as they change every frame).
const DRAWING_PIXELS = 8e6, SIGHT_PIXELS = 3e6;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// How floor seen `v` well (0 to 1) is drawn: barely glimpsed, it stays rock;
// seen a little better, its hatching fades away; seen better still, the
// floor itself, its markings and walls come in.
const clearOf = (v) => smooth((v - 0.1) / 0.35);
const drawnAs = (v) => smooth((v - 0.4) / 0.6);
// Out of date everywhere (see rebuildSteps); and the union of two areas
// [x0, y0, x1, y1] (or either being ALL, or null for none).
const ALL = "all";
const unite = (a, b) => (a === ALL || b === ALL ? ALL : !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
// Run a generator to the end; its result.
const run = (gen) => {
  let r;
  while (!(r = gen.next()).done);
  return r.value;
};
const blank = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

// Random numbers for a cell (x, y) of some grid, the same each time.
function cellRng(x, y, salt) {
  let a = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise over the map, 0 to 1, varying over `cell` map units.
function valueNoise(rng, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = Float32Array.from({ length: gw * gh }, () => rng.next());
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.max(0, Math.min(gw - 2, Math.floor(fx))), j = Math.max(0, Math.min(gh - 2, Math.floor(fy)));
    const u = s(fx - i), v = s(fy - j), a = g[j * gw + i], b = g[j * gw + i + 1], c = g[(j + 1) * gw + i], d = g[(j + 1) * gw + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Blur `a` (w by h) in place: a box blur of radius r, twice each way.
function blur(a, w, h, r) {
  if (r < 1) return;
  const tmp = new Float32Array(Math.max(w, h)), k = 1 / (2 * r + 1);
  // One pass along a line of `len` values starting at `start`, `step` apart.
  const line = (start, step, len) => {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += a[start + Math.max(0, Math.min(len - 1, i)) * step];
    for (let i = 0; i < len; i++) {
      tmp[i] = sum * k;
      sum += a[start + Math.min(len - 1, i + r + 1) * step] - a[start + Math.max(0, i - r) * step];
    }
    for (let i = 0; i < len; i++) a[start + i * step] = tmp[i];
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) line(y * w, 1, w);
    for (let x = 0; x < w; x++) line(x, w, h);
  }
}

export class Expression {
  // The map hatched as solid rock, noise for ragged edges and stipple dots:
  // everything that depends only on the level and the tile size.
  constructor(level, seed, TS, settings = {}) {
    const { w: W, h: H } = level;
    Object.assign(this, { level, seed, TS, W, H, mw: W * R, mh: H * R });
    this.S = { ...EXPRESSION_DEFAULTS, ...settings };
    this.solid = hatchSolid(W * TS, H * TS, TS, new RNG(seed ^ 0x5011d));
    this.noise = valueNoise(new RNG(seed ^ 0x7a9), W * TS, H * TS, TS * 3.5);
    this.fine = valueNoise(new RNG(seed ^ 0xf1e), W * TS, H * TS, TS * 0.5);
    // Stipple dots: scattered over the whole map, each with a rank (which
    // comes in first) and a size.
    const dr = new RNG(seed ^ 0xd07);
    this.dots = Array.from({ length: W * H * 40 }, () => [dr.range(0, W * TS), dr.range(0, H * TS), dr.next(), dr.range(0.6, 1.4)]);
    this.seen = new Float32Array(this.mw * this.mh);
    this.visNow = new Float32Array(this.mw * this.mh);
    this.player = null;
  }

  // Draw at `scale` device pixels per map unit (capped, to keep the full-map
  // drawings to a sensible size): the map without its hatching as separate
  // layers, the paper, the floor at mask resolution, and the walls to cast
  // sight and light against.
  setScale(scale) {
    const { level, W, H, TS, seed, mw, mh } = this, area = W * TS * H * TS;
    this.scale = Math.min(scale, Math.sqrt(DRAWING_PIXELS / area));
    this.sightScale = Math.min(scale, Math.sqrt(SIGHT_PIXELS / area));
    const layer = (o) => renderMap(level, TS, this.scale, seed, { hatch: false, paper: false, floor: false, grid: false, walls: false, keys: false, ...o });
    const drawn = layer({ floor: true, shadow: false });
    this.floorLayer = drawn.canvas; // (for its shape)
    this.shadowLayer = layer({ floor: true, fill: false }).canvas;
    // (The things in the rooms cut out of the grid and inked with the walls,
    // as the layers are recoloured.)
    this.markLayer = layer({ grid: true, keys: true, furniture: "erase" }).canvas;
    this.wallLayer = layer({ walls: true, doors: false, furniture: "ink" }).canvas;
    const cw = drawn.canvas.width, ch = drawn.canvas.height;
    // The doors, a layer of their own (redrawn as they open).
    this.doorLayer = blank(cw, ch);
    this.drawDoorLayer();
    this.paper = blank(cw, ch);
    const pg = this.paper.getContext("2d");
    pg.scale(this.scale, this.scale);
    drawPaper(pg, W * TS, H * TS, new RNG(seed));
    this.floorPath = drawn.floor;
    const c = blank(mw, mh), g = c.getContext("2d", { willReadFrequently: true });
    g.scale(R / TS, R / TS);
    g.fill(drawn.floor, "evenodd");
    const a = g.getImageData(0, 0, mw, mh).data;
    this.floor = new Uint8Array(mw * mh);
    for (let j = 0; j < mw * mh; j++) this.floor[j] = a[j * 4 + 3] >= 128 ? 1 : 0;
    this.walls = new Walls(drawn.loops, TS * 2);
    // The light is cast against the walls and the posts (which don't block
    // sight): the light's shadows of them, slivers fanning out.
    this.lightWalls = new Walls(drawn.loops, TS * 2);
    for (const f of level.features ?? []) {
      if (f.type !== "post") continue;
      const n = f.shape === "round" ? 6 : 4, r = TS * (f.shape === "round" ? 0.21 : 0.26), a0 = n === 4 ? Math.PI / 4 : 0;
      const at = (i) => [f.x * TS + r * Math.cos(a0 + (i * 2 * Math.PI) / n), f.y * TS + r * Math.sin(a0 + (i * 2 * Math.PI) / n)];
      for (let i = 0; i < n; i++) {
        const [x0, y0] = at(i), [x1, y1] = at(i + 1);
        this.lightWalls.add({ x0, y0, x1, y1 });
      }
    }
    // Shut doors stop sight and light: a wall across the way where each is.
    this.doorWalls = new Map();
    for (const d of level.doors ?? []) this.doorChanged(d, true);
    this.lightLamps();
    this.rock = new Path2D();
    this.rock.rect(-W * TS, -H * TS, W * TS * 3, H * TS * 3);
    this.rock.addPath(drawn.floor);
    const sw = Math.ceil(W * TS * this.sightScale), sh = Math.ceil(H * TS * this.sightScale);
    this.sightCanvas = { target: blank(sw, sh), eased: blank(sw, sh), tmp: blank(sw, sh), lamps: blank(sw, sh) };
    this.lightReach = null;
    this.sightFrom = this.lightFrom = null;
    this.stat = this.prev = null;
    this.job = null;
    this.bufs = this.hi = this.scratch = this.tints = this.nearFloor = null; // (made at the new size when drawn)
    this.paint();
    // The exact shape of all that has been seen, at full resolution, recast
    // from every place it was seen from (see learn).
    this.seenShape = blank(cw, ch);
    this.shapeRock();
    for (const v of this.viewpoints?.values() ?? []) this.addShape(v);
    if (this.player) {
      this.learn(this.player.x, this.player.y);
      this.rebuild();
    }
  }

  // What the light shows: the paper floor, and the rock toned toward its
  // colour.
  paint() {
    const S = this.S;
    if (!this.lit || this.lit.width !== this.paper.width || this.lit.height !== this.paper.height) this.lit = blank(this.paper.width, this.paper.height);
    const g = this.lit.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.drawImage(this.paper, 0, 0);
    if (S.rockTone > 0) {
      g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      g.globalCompositeOperation = "multiply";
      g.globalAlpha = S.rockTone;
      g.fillStyle = S.rockColor;
      g.fill(this.rock, "evenodd");
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }

  // Change settings. Those that only change sight and light apply at once;
  // the rest need the drawing redone, which is left to the caller (as
  // `rebuild`, perhaps after a pause). Returns whether it is needed.
  set(changes) {
    Object.assign(this.S, changes);
    this.sightFrom = this.lightFrom = null;
    const keys = Object.keys(changes);
    if (this.player && keys.some((k) => k === "sight" || k === "sightFade" || k === "flame")) {
      this.learn(this.player.x, this.player.y);
      return true;
    }
    const redraw = keys.some((k) => !LIVE_SETTINGS.has(k));
    if (redraw) {
      this.outOfDate();
      if (keys.some((k) => /C$/.test(k))) this.tints = null;
    }
    if (keys.some((k) => k === "rockColor" || k === "rockTone")) this.paint();
    return redraw;
  }

  // Everything to be redrawn in full.
  outOfDate() {
    for (const buf of this.bufs ?? []) buf.stale = ALL;
  }

  // Forget everything seen.
  forget() {
    this.seen.fill(0);
    this.outOfDate();
    this.viewpoints?.clear();
    this.seenShape?.getContext("2d").clearRect(0, 0, this.seenShape.width, this.seenShape.height);
    this.shapeRock();
    if (this.player) this.learn(this.player.x, this.player.y);
  }

  // All the rock, in `seenShape` from the start (it goes with the floor seen
  // wherever the shape is used; and the level's lights show only on what is
  // in it, never on floor not seen).
  shapeRock() {
    if (!this.seenShape) return;
    const g = this.seenShape.getContext("2d");
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    g.fillStyle = "#000";
    g.fill(this.rock, "evenodd");
  }

  // The floor the player sees from tile (tx, ty), at mask resolution, and
  // how well: unblocked by walls, fully out to `sight`, then less and less
  // over the fade with distance. Each bit of floor is remembered as well as
  // it has ever been seen. Returns whether anything is now better known.
  learn(tx, ty) {
    const { mw, mh, floor, seen, S, TS } = this, px = (tx + 0.5) * TS, py = (ty + 0.5) * TS, far = S.sight + S.sightFade;
    this.player = { x: tx, y: ty };
    // (Further, where lights near by may light what can be seen far off.)
    const near = (l) => Math.hypot(Math.max(l.x0 - tx - 0.5, 0, tx + 0.5 - l.x1), Math.max(l.y0 - ty - 0.5, 0, ty + 0.5 - l.y1)) < LAMP_SEE;
    const lamps = this.lampLevel && this.lamps.some(near);
    const reach = lamps ? Math.max(far, LAMP_SEE) : far;
    // (The view from the flame's points; and, as far as lights may light
    // what is seen, from the same points, so the two agree.)
    // (The one view serves for both when lights are near: what it sees beyond
    // `far` counts only where lit.)
    this.lampView = lamps ? this.viewFrom(px, py, (LAMP_SEE + 1) * TS) : null;
    const path = this.lampView ?? this.viewFrom(px, py, (far + 1) * TS);
    // Only the square the view can reach is looked at.
    const m = Math.ceil((reach + 1) * R) + 1, cx = Math.floor((px * R) / TS), cy = Math.floor((py * R) / TS);
    const x0 = Math.max(0, cx - m), y0 = Math.max(0, cy - m), x1 = Math.min(mw, cx + m), y1 = Math.min(mh, cy + m), bw = x1 - x0, bh = y1 - y0;
    const c = blank(bw, bh), g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(R / TS, 0, 0, R / TS, -x0, -y0);
    g.fill(path);
    if (this.lampView) g.fill(this.lampView);
    const a = g.getImageData(0, 0, bw, bh).data;
    let grew = false;
    const vis = new Float32Array(mw * mh), level = (j) => {
      const d = Math.hypot(((j % mw) + 0.5) / R - px / TS, (((j / mw) | 0) + 0.5) / R - py / TS);
      const near = S.sightFade > 0 ? 1 - smooth((d - S.sight) / S.sightFade) : d <= S.sight ? 1 : 0;
      // (What a light lights is seen, however far.)
      return lamps && this.lampLevel[j] > 0 ? Math.max(near, clamp01(this.lampLevel[j] / Math.max(0.01, S.darkLevel))) : near;
    };
    // In sight: floor at least half inside the view (`vis`, for what is in
    // sight now). Remembered as seen: any of it inside, and the floor next to
    // that, so the coarse record reaches past the true edge of the view; the
    // drawing is trimmed to that edge by `seenShape`.
    // (For the rock that goes with it: any floor the view touches, and the
    // floor next to that, so rock behind walls seen edge-on goes with it.)
    const touched = new Uint8Array(bw * bh), visRock = new Float32Array(mw * mh);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const j = y * mw + x, b = (y - y0) * bw + (x - x0);
        if (!floor[j] || a[b * 4 + 3] === 0) continue;
        touched[b] = 1;
        if (a[b * 4 + 3] >= 128) vis[j] = level(j);
      }
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const j = y * mw + x;
        if (!floor[j]) continue;
        let near = touched[(y - y0) * bw + (x - x0)];
        for (let k = 0; k < 9 && !near; k++) {
          const nx = x + (k % 3) - 1, ny = y + ((k / 3) | 0) - 1;
          near = nx >= x0 && ny >= y0 && nx < x1 && ny < y1 && touched[(ny - y0) * bw + (nx - x0)];
        }
        if (!near) continue;
        const v = level(j);
        if (!(v > 0.01)) continue;
        visRock[j] = v;
        // Only a real change is worth redrawing for (seeing ground a little
        // better as the player comes closer is not).
        if (v > seen[j]) {
          if (v - seen[j] > 0.15 || (seen[j] < 0.5 && v >= 0.5)) grew = true;
          seen[j] = v;
          this.changed = unite(this.changed, [x, y, x + 1, y + 1]);
        }
      }
    const key = `${tx},${ty},${far},${S.flame},${this.doorsChanged ?? 0}`;
    if (!this.viewpoints) this.viewpoints = new Map();
    if (!this.viewpoints.has(key)) {
      const v = { path, px, py, far, lamps: this.lampView };
      this.viewpoints.set(key, v);
      this.addShape(v);
    }
    this.visNow = vis;
    // (The lights that light anything in sight now: a few points round each.)
    this.lampsSeen = (this.lamps ?? []).filter((l) => lamps && l.cells.some((j) => vis[j] > 0.01));
    this.sightRock(visRock, x0, y0, x1, y1);
    return grew;
  }

  // What can be seen from (px, py), out to `r`: from any of the flame's
  // points, so what the light reaches is seen.
  // (Its `beyond(depth)`: the same view pushed that far on into the rock.)
  viewFrom(px, py, r) {
    const f = this.S.flame * this.TS, path = new Path2D(), views = [this.walls.visible(px, py, r)];
    if (f > 0) for (const [dx, dy] of [[f, 0], [-f, 0], [0, f], [0, -f]]) views.push(this.walls.visible(px + dx, py + dy, r));
    for (const v of views) path.addPath(v);
    path.beyond = (depth) => {
      const out = new Path2D();
      for (const v of views) out.addPath(v.beyond(depth));
      return out;
    };
    return path;
  }

  // Add one view to `seenShape`: the floor seen from (px, py) out to `far`
  // tiles, and the rock in a band all round it (where the walls' ink is,
  // however edge-on the walls are seen).
  addShape({ path, px, py, far, lamps }) {
    // (`lamps`: the far view, cut to where the lights reach.)
    if (!this.seenShape) return;
    const TS = this.TS;
    const draw = (g, path) => {
      g.fillStyle = "#000";
      g.fill(path);
      g.save();
      g.clip(this.rock, "evenodd");
      g.strokeStyle = "#000";
      g.lineWidth = 2 * WALL_BAND * TS;
      g.lineJoin = "round";
      g.stroke(path);
      g.restore();
    };
    const g = this.seenShape.getContext("2d");
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    g.save();
    g.beginPath();
    g.arc(px, py, (far + WALL_BAND) * TS, 0, Math.PI * 2);
    g.clip();
    draw(g, path);
    g.restore();
    // Further off, what lights light: the far view cut to where they reach.
    if (lamps && this.lampSight) {
      const c = this.lampScratch && this.lampScratch.width === this.seenShape.width ? this.lampScratch : (this.lampScratch = blank(this.seenShape.width, this.seenShape.height));
      const lg = c.getContext("2d"), r = (LAMP_SEE + 1) * TS;
      lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.clearRect(0, 0, c.width, c.height);
      lg.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      lg.save();
      lg.beginPath();
      lg.rect(px - r, py - r, 2 * r, 2 * r);
      lg.clip();
      draw(lg, lamps);
      lg.globalCompositeOperation = "destination-in";
      lg.imageSmoothingEnabled = true;
      lg.drawImage(this.lampSight, 0, 0, this.W * TS, this.H * TS);
      lg.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(c, 0, 0);
    }
  }

  // How well the map point (x, y) is in sight from the player's tile, 0 to 1.
  inSight(x, y) {
    const i = Math.floor((x * R) / this.TS), k = Math.floor((y * R) / this.TS);
    return i < 0 || k < 0 || i >= this.mw || k >= this.mh ? 0 : this.visNow[k * this.mw + i];
  }

  // The ground that goes with the floor in sight: everything not drawn as
  // floor (rock, and floor not yet seen alike) takes how well its nearest
  // drawn floor is in sight now (`vis`), out to the hatching's reach,
  // softened. Its walls and hatching are drawn in the in-sight look.
  sightRock(vis, vx0 = 0, vy0 = 0, vx1 = this.mw, vy1 = this.mh) {
    const { mw, mh, floor, seen, S } = this, br = Math.round(R * 0.5);
    // Only round the square in view: out to the hatching's reach from it,
    // and as far again for the floor that might be nearer.
    const m = Math.ceil(2 * S.reach * R) + 3 * br;
    const x0 = Math.max(0, vx0 - m), y0 = Math.max(0, vy0 - m), x1 = Math.min(mw, vx1 + m), y1 = Math.min(mh, vy1 + m);
    const bw = x1 - x0, bh = y1 - y0, n = bw * bh, at = (b) => (y0 + ((b / bw) | 0)) * mw + x0 + (b % bw);
    const any = new Uint8Array(n);
    for (let b = 0; b < n; b++) {
      const j = at(b);
      any[b] = floor[j] && drawnAs(seen[j]) > 0 ? 1 : 0;
    }
    const { d2, sx, sy } = nearestSeeds(any, bw, bh), far = (S.reach * R) ** 2;
    const v = new Float32Array(n);
    for (let b = 0; b < n; b++) {
      if (any[b]) v[b] = vis[at(b)];
      else if (sx[b] >= 0 && d2[b] <= far) v[b] = vis[(y0 + sy[b]) * mw + x0 + sx[b]];
    }
    // (Softened with the floor in it, so it doesn't dip along the walls, where
    // the remembered look would show through the ink.)
    blur(v, bw, bh, br);
    const img = new ImageData(bw, bh);
    for (let b = 0; b < n; b++) if (!any[b]) img.data[b * 4 + 3] = Math.round(255 * v[b]);
    if (!this.rockSight) this.rockSight = blank(mw, mh);
    const g = this.rockSight.getContext("2d");
    if (this.rockBox) g.clearRect(...this.rockBox);
    g.putImageData(img, x0, y0);
    this.rockBox = [x0, y0, bw, bh];
  }


  // The depth map: for each mask pixel, 0 (black: the heaviest hatching) to 1
  // (white: none). Three ways to make it from the known floor, its walls and
  // its openings. (A generator, so the work can be spread over frames.)
  *depthSteps(isKnown, d2, sx, sy) {
    const { mw, mh, floor, noise, S, TS } = this, n = mw * mh;
    const grey = new Float32Array(n);
    // The ragged edge: a slowly varying factor about 1.
    const rag = (j) => Math.max(0.1, 1 + S.ragged * (2 * noise(((j % mw) + 0.5) * (TS / R), (((j / mw) | 0) + 0.5) * (TS / R)) - 1));
    const full = Math.min(S.full, S.reach - 0.05);
    // Walls: rock next to known floor. Openings: floor not known, next to known floor.
    const nextToKnown = (x, y) => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < mw && ny < mh && isKnown[ny * mw + nx]) return true;
        }
      return false;
    };
    const walls = new Uint8Array(n), openings = new Uint8Array(n);
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const j = y * mw + x;
        if (isKnown[j] || !nextToKnown(x, y)) continue;
        if (floor[j]) openings[j] = 1;
        else walls[j] = 1;
      }
    yield;

    if (S.depth === "distance") {
      // Distance from the known floor; white past openings. Each point looks
      // one step from its nearest known floor toward itself: rock there is a
      // wall, floor an opening. Softened (lighter only), so the hatching fades
      // out quicker round the end of a wall beside an opening.
      const behind = new Float32Array(n).fill(1);
      for (let j = 0; j < n; j++) {
        if (isKnown[j] || sx[j] < 0) continue;
        const dx = (j % mw) - sx[j], dy = ((j / mw) | 0) - sy[j], l = Math.hypot(dx, dy) || 1;
        const nx = sx[j] + Math.round(dx / l), ny = sy[j] + Math.round(dy / l);
        if (nx >= 0 && ny >= 0 && nx < mw && ny < mh && floor[ny * mw + nx]) behind[j] = 0;
      }
      const soft = behind.slice();
      blur(soft, mw, mh, Math.round(S.opening * R * 0.6));
      for (let j = 0; j < n; j++) {
        if (isKnown[j]) continue;
        const k = rag(j), f = full * k, r = S.reach * k;
        const g = smooth((Math.sqrt(d2[j]) / R - f) / (r - f));
        grey[j] = 1 - (1 - g) * Math.min(behind[j], soft[j]);
      }
    } else if (S.depth === "blend") {
      // Black from the walls, by distance from them, times a fade to white
      // toward the openings.
      const dW = nearestSeeds(walls, mw, mh).d2, dO = nearestSeeds(openings, mw, mh).d2;
      for (let j = 0; j < n; j++) {
        if (isKnown[j]) continue;
        const k = rag(j), f = full * k, r = S.reach * k;
        const dark = (1 - smooth((Math.sqrt(dW[j]) / R - f) / (r - f))) * smooth(Math.sqrt(dO[j]) / R / (S.taper * k));
        grey[j] = 1 - dark;
      }
    } else {
      // Diffused: walls held black and openings white, the darkness spreading
      // out between them and fading (a screened diffusion, solved at half the
      // mask resolution). Its ratio to the same spread with the openings not
      // held white says how much the openings eat into the darkness; that
      // tapers the darkness by distance from the walls, so it keeps its width.
      const h = 2, hw = Math.ceil(mw / h), hh = Math.ceil(mh / h), hn = hw * hh, Rh = R / h;
      const KNOWN = 3, WALL = 1, OPEN = 2;
      const type = new Uint8Array(hn);
      const at = (x, y) => Math.min(mh - 1, y * h + 1) * mw + Math.min(mw - 1, x * h + 1);
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) type[y * hw + x] = isKnown[at(x, y)] ? KNOWN : 0;
      for (let y = 0; y < hh; y++)
        for (let x = 0; x < hw; x++) {
          const i = y * hw + x;
          if (type[i]) continue;
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < hw && ny < hh && type[ny * hw + nx] === KNOWN) { near = true; break; }
            }
          if (near) type[i] = floor[at(x, y)] ? OPEN : WALL;
        }
      const L = Math.max(0.3, S.reach / 2) * Rh, ks = 1 / (L * L);
      const wallSeed = new Uint8Array(hn);
      for (let i = 0; i < hn; i++) wallSeed[i] = type[i] === WALL ? 1 : 0;
      const dW = nearestSeeds(wallSeed, hw, hh).d2;
      // Only near the walls and openings is there anything to spread: the
      // box round them, out to where it has died away.
      let bx0 = hw, by0 = hh, bx1 = 0, by1 = 0;
      for (let y = 0; y < hh; y++)
        for (let x = 0; x < hw; x++) {
          const t = type[y * hw + x];
          if (t !== WALL && t !== OPEN) continue;
          bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x + 1); by1 = Math.max(by1, y + 1);
        }
      const bm = Math.ceil(5 * L);
      bx0 = Math.max(0, bx0 - bm); by0 = Math.max(0, by0 - bm); bx1 = Math.min(hw, bx1 + bm); by1 = Math.min(hh, by1 + bm);
      const spread = function* (openWhite) {
        const u = new Float32Array(hn);
        const fixed = (i) => type[i] === WALL || type[i] === KNOWN || (openWhite && type[i] === OPEN);
        for (let i = 0; i < hn; i++) u[i] = type[i] === WALL ? 1 : type[i] === KNOWN || (openWhite && type[i] === OPEN) ? 0 : Math.exp(-Math.sqrt(dW[i]) / L);
        const step = (x, y) => {
          const i = y * hw + x;
          if (fixed(i)) return;
          let sum = 0, cnt = 0;
          if (x > 0 && type[i - 1] !== KNOWN) { sum += u[i - 1]; cnt++; }
          if (x < hw - 1 && type[i + 1] !== KNOWN) { sum += u[i + 1]; cnt++; }
          if (y > 0 && type[i - hw] !== KNOWN) { sum += u[i - hw]; cnt++; }
          if (y < hh - 1 && type[i + hw] !== KNOWN) { sum += u[i + hw]; cnt++; }
          if (cnt) u[i] += 1.7 * (sum / (cnt + ks) - u[i]);
        };
        for (let it = 0; it < 60; it++) {
          if (it % 2) { for (let y = by1 - 1; y >= by0; y--) for (let x = bx1 - 1; x >= bx0; x--) step(x, y); }
          else for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) step(x, y);
          if (it % 10 === 9) yield;
        }
        return u;
      };
      const withOpen = yield* spread(true), without = yield* spread(false), keep = new Float32Array(hn);
      for (let i = 0; i < hn; i++) keep[i] = without[i] > 1e-6 ? clamp01(withOpen[i] / without[i]) : 0;
      const dWall = nearestSeeds(walls, mw, mh).d2, beyond = (S.reach * (1 + S.ragged) * R) ** 2;
      for (let j = 0; j < n; j++) {
        if (isKnown[j]) continue;
        if (dWall[j] >= beyond) { grey[j] = 1; continue; } // past any hatching
        // Bilinear, from the half-resolution grid.
        const fx = Math.max(0, Math.min(hw - 1.001, ((j % mw) + 0.5) / h - 0.5)), fy = Math.max(0, Math.min(hh - 1.001, (((j / mw) | 0) + 0.5) / h - 0.5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, i = y0 * hw + x0;
        const t = (keep[i] * (1 - tx) + keep[i + 1] * tx) * (1 - ty) + (keep[i + hw] * (1 - tx) + keep[i + hw + 1] * tx) * ty;
        const k = rag(j), f = full * k, r = S.reach * k;
        grey[j] = 1 - (1 - smooth((Math.sqrt(dWall[j]) / R - f) / (r - f))) * smooth(t);
      }
    }
    if (S.depth !== "distance") {
      // Past the edge of the known floor, floor not yet seen is an opening:
      // no hatching there, however near a known wall's end (so none spills
      // onto a room's floor just past what is seen). Each point looks one
      // step from its nearest known floor toward itself; floor there makes it
      // white. Softened a little, lighter only.
      yield;
      const behind = new Float32Array(n).fill(1);
      for (let j = 0; j < n; j++) {
        if (isKnown[j] || sx[j] < 0 || grey[j] >= 1) continue;
        const dx = (j % mw) - sx[j], dy = ((j / mw) | 0) - sy[j], l = Math.hypot(dx, dy) || 1;
        const nx = sx[j] + Math.round(dx / l), ny = sy[j] + Math.round(dy / l);
        if (nx >= 0 && ny >= 0 && nx < mw && ny < mh && floor[ny * mw + nx]) behind[j] = 0;
      }
      const soft = behind.slice();
      blur(soft, mw, mh, Math.round(R * 0.3));
      for (let j = 0; j < n; j++) if (!isKnown[j] && grey[j] < 1) grey[j] = 1 - (1 - grey[j]) * Math.min(behind[j], soft[j]);
    }
    // The known floor itself: white (no strokes start there to reach past
    // what is seen).
    for (let j = 0; j < n; j++) if (isKnown[j]) grey[j] = 1;
    return grey;
  }

  // Draw `src` onto `g` (scaled to fit), cut to `mask` (mask resolution, or
  // full if `hiMask`; none for all of it) and to `shape` (full resolution)
  // if given, recoloured unless `colour` is null, at the given strength,
  // with compositing `op`. Only `this.area` (a canvas rectangle) is touched,
  // if set.
  lay(g, src, mask, colour, strength, shape = null, op = "source-over", hiMask = false) {
    if (strength <= 0) return;
    const w = this.scratch, wg = w.getContext("2d");
    wg.save();
    wg.setTransform(1, 0, 0, 1, 0, 0);
    if (this.area) {
      wg.beginPath();
      wg.rect(...this.area);
      wg.clip();
    }
    wg.globalCompositeOperation = "source-over";
    wg.clearRect(0, 0, w.width, w.height);
    wg.imageSmoothingEnabled = true;
    wg.drawImage(src, 0, 0, w.width, w.height);
    if (colour) {
      wg.globalCompositeOperation = "source-in";
      wg.fillStyle = colour;
      wg.fillRect(0, 0, w.width, w.height);
    }
    if (mask) {
      wg.globalCompositeOperation = "destination-in";
      wg.imageSmoothingEnabled = true;
      if (hiMask) wg.drawImage(mask, 0, 0);
      else wg.drawImage(mask, 0, 0, w.width, w.height);
    }
    if (shape) {
      wg.globalCompositeOperation = "destination-in";
      wg.drawImage(shape, 0, 0);
    }
    wg.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, strength);
    g.globalCompositeOperation = op;
    g.drawImage(w, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }

  // The drawing, redone whenever more ground is known: the known map in its
  // in-sight look and in its remembered look, and the cover over ground not
  // yet seen. The new drawing cross-fades in.
  rebuild() {
    this.job = this.again = null;
    this.prev = null; // (no waiting for a fade)
    run(this.rebuildSteps());
  }

  // Redo the drawing a slice at a time over the coming frames (see update),
  // so nothing stops while it is done. Asked again meanwhile, it is done once
  // more after.
  rebuildSoon() {
    if (this.job) this.again = true;
    else this.job = this.rebuildSteps();
  }

  // The work of redrawing, in slices. The looks and cover are kept in two
  // sets of canvases, shown in turn: each redraw goes into the set not on
  // show, and only where it is out of date (what changed since that set was
  // last drawn, out to as far as such a change reaches); the rest of it is
  // as it was.
  *rebuildSteps() {
    const { mw, mh, floor, seen, solid, scale, S, TS } = this, n = mw * mh;
    const cw = this.paper.width, ch = this.paper.height;
    if (!this.bufs) this.bufs = [0, 1].map(() => ({ see: blank(cw, ch), mem: blank(cw, ch), cover: blank(cw, ch), stale: ALL }));
    if (!this.scratch) this.scratch = blank(cw, ch);
    if (!this.hi) this.hi = [blank(cw, ch), blank(cw, ch), blank(cw, ch)];
    // What changed since the last redraw: both sets are now out of date there.
    const changed = this.changed;
    this.changed = null;
    for (const buf of this.bufs) buf.stale = unite(buf.stale, changed);
    const buf = this.bufs[this.stat === this.bufs[0] ? 1 : 0];
    // Known: floor seen at least half well (for the shape of the hatching and
    // the cover); the drawing of the floor and its walls fades with how well
    // it was seen.
    const known = new Uint8Array(n), glimpsed = new Uint8Array(n);
    for (let j = 0; j < n; j++) {
      known[j] = floor[j] && seen[j] >= 0.5 ? 1 : 0;
      glimpsed[j] = floor[j] && seen[j] > 0.01 ? 1 : 0;
    }
    const { d2, sx, sy } = nearestSeeds(known, mw, mh);
    yield;
    const grey = yield* this.depthSteps(known, d2, sx, sy);
    // The set to draw into may still be fading out: wait for it.
    while (this.prev === buf) yield;
    // The area to redraw, in mask pixels: what is out of date, out to as far
    // as a change can reach (the depth map, the walls' ink, the cover), and
    // that in canvas pixels.
    const reachOut = Math.ceil(R * (2 + Math.max(S.reach * (1 + S.ragged), 2.5 * S.reach, S.taper * (1 + S.ragged), S.opening, (S.fadeStart + S.fadeWidth) * (1 + S.ragged))));
    const st = buf.stale === ALL ? [0, 0, mw, mh] : buf.stale;
    if (!st) { buf.t = performance.now(); this.prev = this.stat; this.stat = buf; return; }
    const ax0 = Math.max(0, st[0] - reachOut), ay0 = Math.max(0, st[1] - reachOut), ax1 = Math.min(mw, st[2] + reachOut), ay1 = Math.min(mh, st[3] + reachOut);
    const k = (TS / R) * scale; // canvas pixels per mask pixel
    const rx = Math.floor(ax0 * k), ry = Math.floor(ay0 * k), rw = Math.ceil(ax1 * k) - rx, rh = Math.ceil(ay1 * k) - ry;
    // (Pixel values just outside are computed too, as the drawing blends
    // between them.)
    const area = [Math.max(0, ax0 - 2), Math.max(0, ay0 - 2), Math.min(mw, ax1 + 2), Math.min(mh, ay1 + 2)];
    // Strokes reaching into the area: their middles at most two tiles out.
    const sx0 = (ax0 * TS) / R - 2 * TS, sy0 = (ay0 * TS) / R - 2 * TS, sx1 = (ax1 * TS) / R + 2 * TS, sy1 = (ay1 * TS) / R + 2 * TS;
    const nearArea = (x, y) => x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1;
    this.area = [rx, ry, rw, rh];
    const clip = (g) => {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.beginPath();
      g.rect(rx, ry, rw, rh);
      g.clip();
    };

    const cell = (x, y) => {
      const i = Math.floor((x * R) / TS), j = Math.floor((y * R) / TS);
      return i < 0 || j < 0 || i >= mw || j >= mh ? -1 : j * mw + i;
    };
    const greyAt = (x, y) => {
      const j = cell(x, y);
      return j < 0 ? 1 : grey[j];
    };
    // Black to mid grey to white: from the black value through the grey one
    // to `white`.
    const ramp = (g, black, mid, white) => (g < 0.5 ? black + (mid - black) * g * 2 : mid + (white - mid) * (g - 0.5) * 2);

    // Known floor and the band of rock where its walls are inked (rock in
    // the band goes with its nearest glimpsed floor), and floor glimpsed,
    // whose hatching is cleared: at mask resolution, then at full
    // resolution, the floor cut to the exact shape of what has been seen
    // (walls are drawn beside seen floor, their faces seen or not).
    // (For its walls, floor counts as seen as well as the floor within
    // WALL_SPREAD of it, over the floor only: so the walls beside seen floor
    // show even where only a strip down its middle was in view.)
    const band = (WALL_BAND * R) ** 2, mask = blank(mw, mh), img = new ImageData(mw, mh);
    const seenW = seen.slice();
    for (let pass = 0; pass < Math.round(WALL_SPREAD * R); pass++) {
      const from = seenW.slice();
      for (let y = 1; y < mh - 1; y++)
        for (let x = 1; x < mw - 1; x++) {
          const j = y * mw + x;
          if (!floor[j]) continue;
          const v = Math.max(from[j - 1], from[j + 1], from[j - mw], from[j + mw], from[j - mw - 1], from[j - mw + 1], from[j + mw - 1], from[j + mw + 1]);
          if (v > seenW[j]) seenW[j] = v;
        }
    }
    if (!this.nearFloor) this.nearFloor = nearestSeeds(floor, mw, mh);
    const near = this.nearFloor;
    for (let j = 0; j < n; j++) {
      const a = drawnAs(floor[j] ? seen[j] : near.d2[j] < band ? seenW[near.sy[j] * mw + near.sx[j]] : 0);
      img.data[j * 4 + 3] = Math.round(255 * a);
    }
    mask.getContext("2d").putImageData(img, 0, 0);
    const glimpsedMask = blank(mw, mh), gi = new ImageData(mw, mh);
    for (let j = 0; j < n; j++) if (floor[j]) gi.data[j * 4 + 3] = Math.round(255 * clearOf(seen[j]));
    glimpsedMask.getContext("2d").putImageData(gi, 0, 0);
    const [shape, maskHi, glimpsedHi] = this.hi;
    for (const [c, from] of [[shape, null], [maskHi, mask], [glimpsedHi, glimpsedMask]]) {
      const g = c.getContext("2d");
      clip(g);
      g.clearRect(rx, ry, rw, rh);
      g.imageSmoothingEnabled = true;
      // (The shape copied: more may be seen while this is being done.)
      g.drawImage(from || this.seenShape, 0, 0, cw, ch);
      if (from) {
        // (The shape with all the rock added: only the floor is cut.)
        const sg = this.scratch.getContext("2d");
        clip(sg);
        sg.clearRect(rx, ry, rw, rh);
        sg.drawImage(shape, 0, 0);
        sg.setTransform(scale, 0, 0, scale, 0, 0);
        sg.fillStyle = "#000";
        sg.fill(this.rock, "evenodd");
        sg.restore();
        g.globalCompositeOperation = "destination-in";
        g.drawImage(this.scratch, 0, 0);
      }
      g.restore();
    }
    yield;
    // The ink, in sight ("see") or beyond it ("mem"), on clear: the hatching
    // (strokes inked from the depth map; beyond sight with its darkness
    // scaled by `memWeight`, so fewer, thinner, shorter strokes keep closer
    // to the walls), cleared off floor that has been seen; then, in sight,
    // the floor's shadow; and the floor markings and walls.
    const look = function* (pre, c) {
      const g = c.getContext("2d");
      clip(g);
      g.clearRect(rx, ry, rw, rh);
      const weight = pre === "mem" ? S.memWeight : 1, strength = S[pre + "Hatch"];
      if (strength > 0) {
        g.setTransform(scale, 0, 0, scale, 0, 0);
        g.fillStyle = S[pre + "HatchC"];
        const gAt = (x, y) => 1 - (1 - greyAt(x, y)) * weight;
        const widthAt = (x, y) => ramp(gAt(x, y), S.wBlack, S.wGrey, 0);
        let count = 0;
        for (const st of solid) {
          if (++count % 2000 === 0) yield;
          const [x, y] = st.path[st.path.length >> 1];
          if (!nearArea(x, y)) continue;
          const gr = gAt(x, y);
          if (gr >= 0.999) continue;
          // Drop strokes by rank: a group's own rank, plus more for each later
          // stroke in it, so groups lose their last strokes first.
          if (st.rank >= ramp(gr, 1, S.keepGrey, 0)) continue;
          const keep = ramp(gr, 1, S.lenGrey, 0), a = ramp(gr, 1, S.inkGrey, S.inkGrey);
          if (keep < 0.03 || a < 0.02) continue;
          g.globalAlpha = Math.min(1, a * strength);
          g.beginPath();
          inkRecorded(g, st, keep, 1, widthAt);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      yield;
      this.lay(g, this.floorLayer, glimpsedHi, null, 1, null, "destination-out", true);
      if (pre === "see") this.lay(g, this.shadowLayer, maskHi, null, 1, null, "source-over", true);
      yield;
      // The markings and walls together, cut to the floor's mask once.
      const w = this.scratch, wg = w.getContext("2d");
      clip(wg);
      wg.clearRect(rx, ry, rw, rh);
      for (const [layer, c2, a] of [[this.markLayer, S[pre + "MarkC"], S[pre + "Mark"]], [this.wallLayer, S[pre + "WallC"], S[pre + "Wall"]], [this.doorLayer, S[pre + "WallC"], S[pre + "Wall"]]]) {
        if (!(a > 0)) continue;
        wg.globalAlpha = Math.min(1, a);
        wg.drawImage(this.tinted(layer, c2), 0, 0);
      }
      wg.globalAlpha = 1;
      wg.globalCompositeOperation = "destination-in";
      wg.drawImage(maskHi, 0, 0);
      wg.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(w, 0, 0);
      g.restore();
    }.bind(this);

    // Ground not yet seen. `u` runs from 0 where the cover starts to 1 where it
    // is solid: by distance from the known floor (with the ragged edge), or
    // from where the hatching gives out. (Worked out as far as the strokes
    // reaching into the area come from.)
    yield;
    const u = new Float32Array(n).fill(1), um = 2 * R + 2;
    for (let y = Math.max(0, area[1] - um); y < Math.min(mh, area[3] + um); y++)
      for (let x = Math.max(0, area[0] - um); x < Math.min(mw, area[2] + um); x++) {
        const j = y * mw + x;
        if (known[j]) { u[j] = -1; continue; }
        if (S.fadeBy === "hatching") { u[j] = (grey[j] - 0.4) / 0.6; continue; }
        const mx = (x + 0.5) * (TS / R), my = (y + 0.5) * (TS / R);
        const kr = Math.max(0.1, 1 + S.ragged * (2 * this.noise(mx, my) - 1));
        u[j] = (Math.sqrt(d2[j]) / R - S.fadeStart * kr) / Math.max(0.01, S.fadeWidth * kr);
      }
    const cg = buf.cover.getContext("2d");
    clip(cg);
    cg.clearRect(rx, ry, rw, rh);
    const coverWith = (alpha) => this.lay(cg, this.picture(S.outColor, alpha, area), null, null, 1);
    if (S.fadeStyle === "gradient") coverWith((j) => smooth(u[j]));
    else if (S.fadeStyle === "edge")
      // A sharp edge halfway through, wandering with a finer noise.
      coverWith((j) => {
        const x = ((j % mw) + 0.5) * (TS / R), y = (((j / mw) | 0) + 0.5) * (TS / R);
        return smooth((u[j] - 0.5 + (this.fine(x, y) - 0.5) * 0.5) / 0.1);
      });
    else if (S.fadeStyle === "cave") {
      // A ragged edge drawn like a cave's wall: where the cover starts,
      // traced on a grid of half squares fixed to the map, each point where
      // it crosses a side jittered by that side's place on the map (so
      // neighbours share it), solid beyond, and the line inked with the
      // walls' pen strokes.
      cg.setTransform(scale, 0, 0, scale, 0, 0);
      const h = TS / 2, salt = this.seed ^ 0xc4e;
      const uAt = (i, j) => u[cell(i * h, j * h)] ?? 1;
      const inside = (i, j) => uAt(i, j) >= 0;
      // Where the edge crosses the side from lattice point (i, j) one step
      // right (d 0) or down (d 1).
      const cross = (i, j, d) => {
        const a = uAt(i, j), b = d ? uAt(i, j + 1) : uAt(i + 1, j), t = clamp01(a / (a - b));
        const r = cellRng(2 * i + d, j, salt);
        return [(i + (d ? 0 : t)) * h + (r() - 0.5) * 0.4 * TS, (j + (d ? t : 0)) * h + (r() - 0.5) * 0.4 * TS];
      };
      const fill = new Path2D(), lines = [];
      for (let j = Math.floor(sy0 / h); j <= Math.ceil(sy1 / h); j++)
        for (let i = Math.floor(sx0 / h); i <= Math.ceil(sx1 / h); i++) {
          // The cell's corners in turn and the sides from each to the next;
          // the part inside, and the edge across it.
          const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
          const sides = [[i, j, 0], [i + 1, j, 1], [i, j + 1, 0], [i, j, 1]];
          const ins = corners.map(([a, b]) => inside(a, b));
          if (!ins.some(Boolean)) continue;
          const poly = [];
          for (let k = 0; k < 4; k++) {
            if (ins[k]) poly.push({ p: [corners[k][0] * h, corners[k][1] * h] });
            if (ins[k] !== ins[(k + 1) % 4]) poly.push({ p: cross(...sides[k]), edge: true });
          }
          fill.moveTo(...poly[0].p);
          for (const { p } of poly.slice(1)) fill.lineTo(...p);
          fill.closePath();
          for (let k = 0; k < poly.length; k++) {
            const a = poly[k], b = poly[(k + 1) % poly.length];
            if (a.edge && b.edge) lines.push([a.p, b.p, cellRng(i, j, salt ^ (k + 1))]);
          }
        }
      cg.fillStyle = S.outColor;
      cg.fill(fill);
      cg.fillStyle = S.seeWallC;
      for (const [a, b, r] of lines) wallLine(cg, a, b, TS, { range: (lo, hi) => lo + (hi - lo) * r() });
    } else if (S.fadeStyle === "hexes") {
      // Hexes fixed to the map, each as big as the cover is solid at its
      // middle (touching, and solid behind, at the far end), a little uneven
      // as if drawn by hand.
      coverWith((j) => smooth((u[j] - 1.25) / 0.25));
      cg.setTransform(scale, 0, 0, scale, 0, 0);
      cg.fillStyle = cg.strokeStyle = S.outColor;
      const uXY = (x, y) => u[cell(x, y)] ?? 1;
      const hs = S.hexSize * TS, rh = hs / Math.sqrt(3), hy = (hs * Math.sqrt(3)) / 2;
      cg.beginPath();
      for (let r = Math.floor(sy0 / hy) - 1; r <= Math.ceil(sy1 / hy) + 1; r++) {
        const off = r & 1 ? hs / 2 : 0;
        for (let c = Math.floor((sx0 - off) / hs) - 1; c <= Math.ceil((sx1 - off) / hs) + 1; c++) {
          const rng = cellRng(c, r, this.seed ^ 0x4e7);
          const cx = c * hs + off + (rng() - 0.5) * 0.08 * hs, cy = r * hy + (rng() - 0.5) * 0.08 * hs, turn = (rng() - 0.5) * 0.12;
          const k = Math.min(1.12, 1.12 * uXY(cx, cy));
          if (!(k > 0.08) || !nearArea(cx, cy)) continue;
          // Six corners, and each side bowed a little in or out.
          const pts = [];
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 2 + (i * Math.PI) / 3 + turn, rr = rh * k * (0.92 + 0.16 * rng());
            pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
          }
          cg.moveTo(...pts[0]);
          for (let i = 0; i < 6; i++) {
            const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 6], bow = (rng() - 0.5) * 0.12 * rh * k;
            const mx = (x0 + x1) / 2 - cx, my = (y0 + y1) / 2 - cy, ml = Math.hypot(mx, my) || 1;
            cg.quadraticCurveTo(cx + mx + (mx / ml) * bow, cy + my + (my / ml) * bow, x1, y1);
          }
          cg.closePath();
        }
      }
      cg.fill();
      // (Corners softened, as a pen draws them.)
      cg.lineJoin = "round";
      cg.lineWidth = TS * 0.05;
      cg.stroke();
    } else {
      // Solid only toward the far end; before that, the hatching's strokes
      // (all of them) thickening, or dots coming in denser and bigger.
      coverWith((j) => smooth((u[j] - 0.55) / 0.45));
      cg.setTransform(scale, 0, 0, scale, 0, 0);
      cg.fillStyle = S.outColor;
      const uXY = (x, y) => u[cell(x, y)] ?? 1;
      let count = 0;
      if (S.fadeStyle === "strokes")
        for (const st of solid) {
          if (++count % 2000 === 0) yield;
          const [x, y] = st.path[st.path.length >> 1];
          if (!nearArea(x, y) || !(uXY(x, y) > 0)) continue;
          cg.beginPath();
          inkRecorded(cg, st, 1, 1, (px, py) => Math.max(0, 1 + 5 * Math.min(1, uXY(px, py))));
          cg.fill();
        }
      else {
        cg.beginPath();
        for (const [x, y, rank, size] of this.dots) {
          if (!nearArea(x, y)) continue;
          const v = uXY(x, y);
          if (!(v > 0) || rank > v) continue;
          const r = TS * 0.05 * size * (0.6 + Math.min(1, v));
          cg.moveTo(x + r, y);
          cg.arc(x, y, r, 0, Math.PI * 2);
        }
        cg.fill();
      }
    }
    cg.restore();
    yield;
    yield* look("see", buf.see);
    yield* look("mem", buf.mem);
    this.area = null;
    buf.stale = null;
    buf.t = performance.now();
    this.grey = grey;
    this.prev = this.stat;
    this.stat = buf;
  }

  // A colour at mask resolution, `alpha(j)` from 0 to 1 at each mask pixel
  // (worked out only within `area`, [x0, y0, x1, y1]; none elsewhere).
  picture(hex, alpha, area = [0, 0, this.mw, this.mh]) {
    const { mw, mh } = this, [r, gr, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const img = new ImageData(mw, mh);
    for (let y = area[1]; y < area[3]; y++)
      for (let x = area[0]; x < area[2]; x++) {
        const j = y * mw + x, a = alpha(j);
        if (!(a > 0)) continue;
        img.data[j * 4] = r;
        img.data[j * 4 + 1] = gr;
        img.data[j * 4 + 2] = b;
        img.data[j * 4 + 3] = Math.round(255 * Math.min(1, a));
      }
    const c = blank(mw, mh);
    c.getContext("2d").putImageData(img, 0, 0);
    return c;
  }

  // The doors as they are, open or shut.
  drawDoorLayer() {
    const g = this.doorLayer.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.doorLayer.width, this.doorLayer.height);
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    drawDoors(g, this.level.doors ?? [], this.TS, this.seed);
  }

  // Door `d` has opened or shut: the wall across its way is taken away or
  // put back, and (unless `quiet`, as when first set up) it is redrawn,
  // and what can be seen and lit found again.
  doorChanged(d, quiet = false) {
    const TS = this.TS, key = d.y * this.W + d.x;
    const old = this.doorWalls.get(key);
    if (old) {
      this.walls.remove(old);
      this.lightWalls.remove(old);
    }
    this.doorWalls.delete(key);
    if (!d.open) {
      // (On the door's line, reaching a little into the walls either side.)
      const cx = (d.x + 0.5 + d.dx * 0.25) * TS, cy = (d.y + 0.5 + d.dy * 0.25) * TS, h = TS * 0.6;
      const s = { x0: cx + d.dy * h, y0: cy - d.dx * h, x1: cx - d.dy * h, y1: cy + d.dx * h };
      this.walls.add(s);
      this.lightWalls.add(s);
      this.doorWalls.set(key, s);
    }
    if (quiet) return;
    this.lightLamps();
    // (So the view from where the player stands is taken again.)
    this.doorsChanged = (this.doorsChanged ?? 0) + 1;
    this.drawDoorLayer();
    this.tints?.delete(this.doorLayer);
    this.changed = unite(this.changed, [(d.x - 1) * R, (d.y - 1) * R, (d.x + 2) * R, (d.y + 2) * R]);
    this.sightFrom = this.lightFrom = null;
    if (this.player) this.learn(this.player.x, this.player.y);
  }

  // A layer of the map recoloured (kept until the scale changes).
  tinted(layer, colour) {
    if (!this.tints) this.tints = new Map();
    let byColour = this.tints.get(layer);
    if (!byColour) this.tints.set(layer, (byColour = new Map()));
    let c = byColour.get(colour);
    if (!c) {
      c = blank(layer.width, layer.height);
      const g = c.getContext("2d");
      g.drawImage(layer, 0, 0);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = colour;
      g.fillRect(0, 0, c.width, c.height);
      byColour.set(colour, c);
    }
    return c;
  }

  // The depth map as a picture (black: the heaviest hatching), to look at.
  depthPicture() {
    const { mw, mh, grey } = this, im = new ImageData(mw, mh);
    for (let j = 0; j < mw * mh; j++) {
      im.data[j * 4] = im.data[j * 4 + 1] = im.data[j * 4 + 2] = Math.round(255 * (grey ? grey[j] : 1));
      im.data[j * 4 + 3] = 255;
    }
    const c = blank(mw, mh);
    c.getContext("2d").putImageData(im, 0, 0);
    return c;
  }

  // Each frame, with the player drawn at map point (px, py): sight cast from
  // there when it moves, eased toward, and the candle.
  update(now, dt, px, py) {
    // Some of the redrawing, if there is any to do: slices until about 8 ms
    // are spent (at least one).
    if (this.job) {
      const t0 = performance.now();
      do {
        if (this.job.next().done) {
          this.job = this.again ? this.rebuildSteps() : null;
          this.again = false;
          break;
        }
      } while (performance.now() - t0 < 8);
    }
    if (!this.sightFrom || this.sightFrom[0] !== px || this.sightFrom[1] !== py) this.castSight(px, py);
    if (now < this.easeUntil) this.easeSight(dt);
    this.castLight(px, py, now / 1000);
  }

  // What is in sight from (px, py): the floor the player can see and the
  // ground that goes with it (see sightRock), clear out to `sight` and
  // fading out with distance after it; where walls block the view the edge
  // is nearly sharp.
  castSight(px, py) {
    const { S, TS } = this, { target } = this.sightCanvas, g = target.getContext("2d"), far = S.sight + S.sightFade;
    const path = this.viewFrom(px, py, (Math.max(far, this.lightOut()) + 1) * TS);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, target.width, target.height);
    g.setTransform(this.sightScale, 0, 0, this.sightScale, 0, 0);
    const grad = g.createRadialGradient(px, py, 0, px, py, far * TS);
    grad.addColorStop(0, "#000");
    const clear = S.sight / far;
    for (let k = 0; k <= 6; k++) grad.addColorStop(clear + (1 - clear) * (k / 6), `rgba(0, 0, 0, ${smooth(1 - k / 6)})`);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.rockSight, 0, 0, this.W * TS, this.H * TS);
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = grad;
    g.fillRect(px - far * TS, py - far * TS, 2 * far * TS, 2 * far * TS);
    g.globalCompositeOperation = "source-over";
    g.filter = S.blockSoft > 0 ? `blur(${S.blockSoft * TS * this.sightScale * 0.5}px)` : "none";
    g.fill(path);
    g.filter = "none";
    // And what lights light, far off, in view from the player's square (and
    // the rock they light past the walls in view).
    // (Kept apart too, `lamps`: where their light is seen, for showing it only
    // there, not on rock seen from its dark side.)
    const lg = this.sightCanvas.lamps.getContext("2d");
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.clearRect(0, 0, target.width, target.height);
    if (this.lampView && this.lampSight) {
      for (const c of [g, lg]) {
        c.save();
        c.setTransform(this.sightScale, 0, 0, this.sightScale, 0, 0);
        c.imageSmoothingEnabled = true;
        c.save();
        c.clip(this.lampView);
        c.drawImage(this.lampSight, 0, 0, this.W * TS, this.H * TS);
        c.restore();
        c.clip(this.lampView.beyond(S.lightWall * TS));
        c.clip(this.rock, "evenodd");
        c.drawImage(this.lampSight, 0, 0, this.W * TS, this.H * TS);
        c.restore();
      }
      // (The rock round lit floor seen as far off as the floor is: round the
      // lights in sight, behind the walls in view.)
      g.save();
      g.beginPath();
      for (const l of this.lampsSeen ?? []) g.rect(l.x0 * TS, l.y0 * TS, (l.x1 - l.x0) * TS, (l.y1 - l.y0) * TS);
      g.clip();
      g.clip(this.lampView.beyond(S.reach * TS));
      g.clip(this.rock, "evenodd");
      g.drawImage(this.rockSight, 0, 0, this.W * TS, this.H * TS);
      g.restore();
    }
    this.sightFrom = [px, py];
    this.easeUntil = performance.now() + S.reveal * 1500 + 100;
  }

  // Ease the sight laid over the map toward what is in sight now.
  easeSight(dt) {
    const { target, eased, tmp } = this.sightCanvas, S = this.S;
    const rate = S.reveal > 0 ? Math.min(1, dt / (S.reveal * 0.35)) : 1;
    const tg = tmp.getContext("2d"), eg = eased.getContext("2d");
    tg.clearRect(0, 0, tmp.width, tmp.height);
    tg.drawImage(eased, 0, 0);
    eg.clearRect(0, 0, eased.width, eased.height);
    eg.globalAlpha = 1 - rate;
    eg.drawImage(tmp, 0, 0);
    eg.globalAlpha = rate;
    eg.globalCompositeOperation = "lighter";
    eg.drawImage(target, 0, 0);
    eg.globalCompositeOperation = "source-over";
    eg.globalAlpha = 1;
  }

  // The candle, drawn flat like the rest of the map. For each place the
  // player stands: what the light reaches (seen from a few points across
  // the flame: full, dim or dark by how many see it; and a rim of the rock
  // past the wall faces it falls on); and the bands, full, dim and dark.
  // All the edges ragged by noise fixed to the map, so nothing wavers. The
  // bands in flat tones, or (`lightFill` "strokes") all paper with the
  // dim and dark bands hatched; and perhaps an inked line where the light
  // changes (`lightEdge`). Each frame, the whole flickers in brightness and
  // (unless it is inked, as the ink stays put) grows and shrinks a little
  // about the player.
  castLight(px, py, t) {
    const { S, TS } = this, rag = S.lightRag * TS;
    // The bands' outer edges: full, dim and dark.
    const rFull = (S.lightFull - 0.5) * TS, rad = rFull + S.lightDim * TS, out = this.lightOut() * TS;
    this.lightBox = null;
    if (!(out > 0)) return;
    const strokes = S.lightFill === "strokes", inked = strokes || S.lightEdge > 0;
    // Drawn on a square just big enough for the light round the player.
    const half = (out + rag) * (1 + S.flickerSize) + TS, res = Math.min(this.scale, 1024 / (2 * half));
    const size = Math.ceil(2 * half * res), box = { x: px - half, y: py - half, w: 2 * half, res };
    const toBox = (g) => g.setTransform(res, 0, 0, res, -box.x * res, -box.y * res);
    if (!this.lightReach || this.lightReach.width !== size) {
      for (const k of ["lightReach", "lightCanvas", "lightInk", "lightTmp", "lightMask"]) this[k] = blank(size, size);
      this.lightFrom = null;
    }
    if (!this.lightFrom || this.lightFrom[0] !== px || this.lightFrom[1] !== py) {
      // How much of the light reaches each point: in red, how many of the
      // flame's points see it (each adding 51); in green, the share of the
      // depths past the walls' faces the rim reaches, from the flame's
      // middle (opaque fills, added).
      const f = S.flame * TS, depths = 5, p = this.lightWalls.visible(px, py, half);
      const pts = f > 0 ? [[f, 0], [-f, 0], [0, f], [0, -f]] : [];
      const g = this.lightReach.getContext("2d", { willReadFrequently: true });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, size, size);
      toBox(g);
      g.globalCompositeOperation = "lighter";
      g.fillStyle = `rgb(${f > 0 ? 51 : 255}, 0, 0)`;
      g.fill(p);
      for (const [dx, dy] of pts) g.fill(this.lightWalls.visible(px + dx, py + dy, half));
      if (S.lightWall > 0) {
        g.fillStyle = `rgb(0, 51, 0)`;
        for (let i = 1; i <= depths; i++) g.fill(p.beyond((S.lightWall * TS * i) / depths));
      }
      g.globalCompositeOperation = "source-over";
      // Each point's band (3 full, 2 dim, 1 dark, 0 none): the least of what
      // reaches it and its band by distance. What reaches it: on the floor,
      // full if the whole flame sees it, dim if most of it does, dark if
      // some; in the rock, the most of that and the rim (full where most of
      // the rim reaches, dim at its edge, the threshold wandering with a
      // fine noise). As tones, or all paper if hatched.
      const reachImg = g.getImageData(0, 0, size, size), rd = reachImg.data, level = new Uint8Array(size * size);
      const tone = strokes ? [0, 255, 255, 255] : [0, Math.round(255 * S.darkLevel), Math.round(255 * S.dimLevel), 255];
      const nearEdge = (d) => Math.abs(d - rFull) < rag || Math.abs(d - rad) < rag || Math.abs(d - out) < rag;
      for (let y = 0; y < size; y++) {
        const my = box.y + (y + 0.5) / res;
        for (let x = 0; x < size; x++) {
          const p = y * size + x, i = p * 4, mx = box.x + (x + 0.5) / res;
          let n = -1, m = -1;
          const noiseAt = () => (n < 0 ? (n = this.fine(mx, my)) : n);
          const wander = () => (m < 0 ? (m = 0.65 * noiseAt() + 0.35 * this.noise(mx, my)) : m);
          // The shadows' edges, which run out from the player, ragged like
          // the bands': near one, what reaches a point a little to the side,
          // by the same noise.
          let j = i;
          const dx = mx - px, dy = my - py, d = Math.sqrt(dx * dx + dy * dy);
          if (rag > 0 && d > TS) {
            const sx = (-dy / d) * rag * res, sy = (dx / d) * rag * res;
            const at = (k) => {
              const qx = Math.round(x + sx * k), qy = Math.round(y + sy * k);
              return qx < 0 || qy < 0 || qx >= size || qy >= size ? -1 : (qy * size + qx) * 4;
            };
            const a = at(1), b = at(-1), same = (q) => q >= 0 && rd[q] === rd[i] && rd[q + 1] === rd[i + 1];
            if (!same(a) || !same(b)) j = at(2 * wander() - 1);
          }
          const seen = j < 0 ? 0 : Math.round(rd[j] / 51), rim = j < 0 ? 0 : rd[j + 1] / 255;
          let reached = seen >= 5 ? 3 : seen >= 3 ? 2 : seen >= 1 ? 1 : 0;
          const fx = Math.floor((mx * R) / TS), fy = Math.floor((my * R) / TS);
          if (!(fx >= 0 && fy >= 0 && fx < this.mw && fy < this.mh && this.floor[fy * this.mw + fx]) && rim > 0.03)
            reached = Math.max(reached, rim >= 0.97 || rim > 0.25 + 0.45 * noiseAt() ? 3 : rim > 0.08 + 0.2 * noiseAt() ? 2 : 0);
          let band = 0;
          if (reached) {
            if (d < out + rag) {
              const e = nearEdge(d) ? d + rag * (2 * wander() - 1) : d;
              band = e < rFull ? 3 : e < rad ? 2 : e < out ? 1 : 0;
            }
          }
          level[p] = Math.min(reached, band);
          rd[i + 3] = tone[level[p]];
        }
      }
      g.putImageData(reachImg, 0, 0);
      this.inkLight(level, box, size, toBox);
      this.lightFrom = [px, py];
    }
    const wave = (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2)) / 2;
    const bright = 1 - S.flicker * 0.25 * (wave + 1) / 2;
    // The size flickers too, on a wave of its own.
    const swell = (Math.sin(t * 5.1) + 0.5 * Math.sin(t * 8.9 + 0.7) + 0.3 * Math.sin(t * 13.3 + 2)) / 1.8;
    const k = inked ? 1 : 1 + S.flickerSize * swell, cx = (px - box.x) * res, cy = (py - box.y) * res;
    const g = this.lightCanvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.globalAlpha = bright;
    g.setTransform(k, 0, 0, k, cx * (1 - k), cy * (1 - k));
    g.drawImage(this.lightReach, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    this.lightBox = box;
  }

  // The light's ink, if it has any (onto `lightInk`, from the bands in
  // `level`): hatched, strokes one way over the dim and dark bands and
  // crossed the other way over the dark (on the floor, fixed to the map);
  // and a line, its width wandering, on the floor where the band changes.
  inkLight(level, box, size, toBox) {
    const { S, TS, mw } = this, res = box.res, ig = this.lightInk.getContext("2d");
    ig.setTransform(1, 0, 0, 1, 0, 0);
    ig.clearRect(0, 0, size, size);
    this.lightInked = S.lightFill === "strokes" || S.lightEdge > 0;
    const mg = this.lightMask.getContext("2d"), tmp = this.lightTmp, tg = tmp.getContext("2d");
    const maskOf = (keep) => {
      const im = new ImageData(size, size);
      for (let p = 0; p < size * size; p++) if (keep(level[p])) im.data[p * 4 + 3] = 255;
      mg.putImageData(im, 0, 0);
    };
    if (S.lightFill === "strokes") {
      // Strokes in each tile from its own random numbers, so they stay put.
      const tx0 = Math.floor(box.x / TS), ty0 = Math.floor(box.y / TS), tx1 = Math.ceil((box.x + box.w) / TS), ty1 = Math.ceil((box.y + box.w) / TS);
      for (const [cross, keep] of [[false, (l) => l === 1 || l === 2], [true, (l) => l === 1]]) {
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, size, size);
        toBox(tg);
        tg.save();
        tg.clip(this.floorPath, "evenodd");
        tg.strokeStyle = S.seeHatchC;
        tg.lineCap = "round";
        tg.globalAlpha = 0.85;
        for (let ty = ty0; ty < ty1; ty++)
          for (let tx = tx0; tx < tx1; tx++) {
            const r = cellRng(tx, ty, this.seed ^ (cross ? 0x5a : 0xa5));
            for (let k = 0; k < 5; k++) {
              const x = (tx + r()) * TS, y = (ty + r()) * TS, a = (cross ? 0.85 : -0.8) + (r() - 0.5) * 0.3;
              const len = (0.35 + 0.3 * r()) * TS, bow = (r() - 0.5) * 0.12 * TS, c = Math.cos(a), sn = Math.sin(a);
              tg.lineWidth = TS * (0.04 + 0.03 * r());
              tg.beginPath();
              tg.moveTo(x - (c * len) / 2, y - (sn * len) / 2);
              tg.quadraticCurveTo(x - sn * bow, y + c * bow, x + (c * len) / 2, y + (sn * len) / 2);
              tg.stroke();
            }
          }
        tg.restore();
        maskOf(keep);
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.globalCompositeOperation = "destination-in";
        tg.drawImage(this.lightMask, 0, 0);
        tg.globalCompositeOperation = "source-over";
        ig.drawImage(tmp, 0, 0);
      }
    }
    if (S.lightEdge > 0) {
      const im = new ImageData(size, size), d = im.data, ink = [1, 3, 5].map((i) => parseInt(S.seeWallC.slice(i, i + 2), 16));
      for (let y = 0; y < size - 1; y++) {
        const my = box.y + (y + 0.5) / res, fy = Math.floor((my * R) / TS);
        for (let x = 0; x < size - 1; x++) {
          const p = y * size + x, l = level[p];
          if (l === level[p + 1] && l === level[p + size]) continue;
          const mx = box.x + (x + 0.5) / res, fx = Math.floor((mx * R) / TS);
          if (fx < 0 || fy < 0 || fx >= mw || fy >= this.mh || !this.floor[fy * mw + fx]) continue;
          const rr = TS * 0.03 * res * (1.5 - this.fine(mx, my)), ri = Math.ceil(rr);
          for (let dy = -ri; dy <= ri; dy++)
            for (let dx = -ri; dx <= ri; dx++) {
              const qx = x + dx, qy = y + dy;
              if (dx * dx + dy * dy > rr * rr || qx < 0 || qy < 0 || qx >= size || qy >= size) continue;
              const q = (qy * size + qx) * 4;
              d[q] = ink[0];
              d[q + 1] = ink[1];
              d[q + 2] = ink[2];
              d[q + 3] = 255;
            }
        }
      }
      mg.putImageData(im, 0, 0);
      ig.globalAlpha = Math.min(1, S.lightEdge);
      ig.drawImage(this.lightMask, 0, 0);
      ig.globalAlpha = 1;
    }
  }

  // How far the light reaches, in tiles from the player's middle.
  lightOut() {
    const S = this.S;
    return S.lightFull - 0.5 + S.lightDim + S.lightDark;
  }

  // The light, onto `g` (its transform the world's).
  drawLightBox(g) {
    const b = this.lightBox;
    if (b) g.drawImage(this.lightCanvas, b.x, b.y, b.w, b.w);
  }

  // A canvas the size of `ctx`'s, for compositing what is in view.
  work(ctx) {
    const c = ctx.canvas;
    if (!this.workCanvas || this.workCanvas.width !== c.width || this.workCanvas.height !== c.height) this.workCanvas = blank(c.width, c.height);
    return this.workCanvas;
  }

  // Draw the part of `img` (a full-map drawing at `s` pixels per map unit)
  // in view onto `g`, whose transform is the world's. `view` is the region
  // in view, in map units: { x, y, w, h }.
  region(g, img, s, view) {
    const mw = this.W * this.TS, mh = this.H * this.TS;
    const x0 = Math.max(0, view.x), y0 = Math.max(0, view.y), x1 = Math.min(mw, view.x + view.w), y1 = Math.min(mh, view.y + view.h);
    if (x1 > x0 && y1 > y0) g.drawImage(img, x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s, x0, y0, x1 - x0, y1 - y0);
  }

  // The map, onto `ctx` (its transform the world's), as drawn (see compose);
  // new ink cross-fades in.
  drawMap(ctx, view, now) {
    if (!this.stat) return;
    const k = clamp01((now - this.stat.t) / Math.max(1, this.S.reveal * 1000));
    if (k >= 1) this.prev = null; // done with: let it go
    if (!this.prev) {
      this.compose(ctx, this.stat, view);
      return;
    }
    // Fading in: all of it with the old ink, then all of it with the new,
    // put together whole first and laid over it (fading in layer by layer
    // would let things show through halfway).
    this.compose(ctx, this.prev, view);
    const c = ctx.canvas;
    if (!this.fadeCanvas || this.fadeCanvas.width !== c.width || this.fadeCanvas.height !== c.height) this.fadeCanvas = blank(c.width, c.height);
    const fg = this.fadeCanvas.getContext("2d"), T = ctx.getTransform();
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.clearRect(0, 0, c.width, c.height);
    fg.setTransform(T);
    this.compose(fg, this.stat, view);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = k;
    ctx.drawImage(this.fadeCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setTransform(T);
  }

  // Everything, onto `g` (its transform the world's), with the ink in `st`:
  // the darkness; what the light shows, through the light; the ink beyond
  // sight outside the eased sight, and the ink in sight within it; the fog;
  // and the light's warmth.
  compose(g, st, view) {
    const S = this.S, T = g.getTransform(), w = this.work(g), wg = w.getContext("2d"), ss = this.sightScale;
    const mw = this.W * this.TS, mh = this.H * this.TS;
    g.imageSmoothingEnabled = wg.imageSmoothingEnabled = true;
    const x0 = Math.max(0, view.x), y0 = Math.max(0, view.y), x1 = Math.min(mw, view.x + view.w), y1 = Math.min(mh, view.y + view.h);
    if (!(x1 > x0 && y1 > y0)) return;
    g.fillStyle = S.darkColor;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const box = this.screenBox(T, g.canvas);
    if (box) {
      // The lit picture, through the light.
      const c = this.boxCanvas || (this.boxCanvas = blank(1, 1)), bg = c.getContext("2d");
      if (c.width < box.w || c.height < box.h) { c.width = Math.max(c.width, box.w); c.height = Math.max(c.height, box.h); }
      bg.setTransform(1, 0, 0, 1, 0, 0);
      bg.globalCompositeOperation = "source-over";
      bg.clearRect(0, 0, c.width, c.height);
      bg.setTransform(T.a, 0, 0, T.d, T.e - box.x0, T.f - box.y0);
      bg.imageSmoothingEnabled = true;
      this.region(bg, this.lit, this.scale, box.view);
      bg.globalCompositeOperation = "destination-in";
      this.drawLightBox(bg);
      bg.globalCompositeOperation = "source-over";
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(c, 0, 0, box.w, box.h, box.x0, box.y0, box.w, box.h);
      g.setTransform(T);
      // The light's own ink.
      if (this.lightInked) {
        const b = this.lightBox;
        g.drawImage(this.lightInk, b.x, b.y, b.w, b.w);
      }
    }
    // The lit picture through the level's lights, where in sight (fires
    // flickering a little), warmed: only round the lights near the player, the
    // only ones that can be in sight.
    const lamp = this.lampCanvas && this.lampBox(T, g.canvas);
    if (lamp) {
      const t = performance.now() / 1000;
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.globalCompositeOperation = "source-over";
      wg.clearRect(lamp.x0, lamp.y0, lamp.w, lamp.h);
      wg.save();
      wg.beginPath();
      wg.rect(lamp.x0, lamp.y0, lamp.w, lamp.h);
      wg.clip();
      wg.setTransform(T);
      this.region(wg, this.lit, this.scale, lamp.view);
      // (Warmed twice over, as where the player's lamp warms it too: so the
      // same with the lamp lit or out. Where the lamp's light is, it does
      // the second warming itself.)
      {
        const warm = `rgba(255, 196, 120, ${LAMP_WARMTH * 0.35})`, v = lamp.view;
        wg.globalCompositeOperation = "multiply";
        wg.fillStyle = warm;
        wg.fillRect(v.x, v.y, v.w, v.h);
        const c = this.warm2 || (this.warm2 = blank(1, 1)), cg = c.getContext("2d");
        if (c.width !== w.width || c.height !== w.height) { c.width = w.width; c.height = w.height; }
        cg.setTransform(1, 0, 0, 1, 0, 0);
        cg.globalCompositeOperation = "source-over";
        cg.clearRect(lamp.x0, lamp.y0, lamp.w, lamp.h);
        cg.setTransform(T);
        cg.fillStyle = warm;
        cg.fillRect(v.x, v.y, v.w, v.h);
        if (S.warmth > 0) {
          cg.globalCompositeOperation = "destination-out";
          this.drawLightBox(cg);
          cg.globalCompositeOperation = "source-over";
        }
        wg.setTransform(1, 0, 0, 1, 0, 0);
        wg.drawImage(c, lamp.x0, lamp.y0, lamp.w, lamp.h, lamp.x0, lamp.y0, lamp.w, lamp.h);
        wg.setTransform(T);
      }
      // (Where the lights fall: the steady light, and each fire's swelling
      // and shrinking a little about it, on a wave of its own.)
      const m = this.lampMask || (this.lampMask = blank(1, 1)), mg = m.getContext("2d");
      if (m.width !== w.width || m.height !== w.height) { m.width = w.width; m.height = w.height; }
      mg.setTransform(1, 0, 0, 1, 0, 0);
      mg.clearRect(lamp.x0, lamp.y0, lamp.w, lamp.h);
      mg.setTransform(T);
      mg.imageSmoothingEnabled = true;
      this.region(mg, this.lampCanvas, R / this.TS, lamp.view);
      for (const l of this.lampsSeen) {
        if (!l.fire) continue;
        const { x, y, ph, pic, at } = l.fire, TS = this.TS;
        const k = 1 + FIRE_SWELL * (0.6 * Math.sin(t * 4.3 + ph * 1.3) + 0.4 * Math.sin(t * 9.1 + ph * 0.6));
        mg.save();
        mg.translate(x * TS, y * TS);
        mg.scale(k, k);
        mg.translate(-x * TS, -y * TS);
        mg.drawImage(pic, (at[0] * TS) / R, (at[1] * TS) / R, (pic.width * TS) / R, (pic.height * TS) / R);
        mg.restore();
      }
      wg.globalCompositeOperation = "destination-in";
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.drawImage(m, lamp.x0, lamp.y0, lamp.w, lamp.h, lamp.x0, lamp.y0, lamp.w, lamp.h);
      wg.setTransform(T);
      this.region(wg, this.sightCanvas.eased, ss, lamp.view);
      this.region(wg, this.sightCanvas.lamps, ss, lamp.view);
      this.region(wg, this.seenShape, this.scale, lamp.view);
      // A fire's light flickers in brightness too, each its own way, dimming
      // most toward its edge. (Lit places are steady.)
      wg.globalCompositeOperation = "destination-out";
      wg.setTransform(T);
      for (const l of this.lampsSeen) {
        if (!l.fire) continue;
        const { x, y, out, full, ph } = l.fire, TS = this.TS;
        const k = clamp01(0.5 + 0.3 * Math.sin(t * 5.3 + ph) + 0.2 * Math.sin(t * 11.7 + ph * 1.9) + 0.15 * Math.sin(t * 17.9 + ph * 0.7));
        const grad = wg.createRadialGradient(x * TS, y * TS, 0, x * TS, y * TS, out * TS);
        grad.addColorStop(0, `rgba(0, 0, 0, ${0.04 * k})`);
        grad.addColorStop(full / out, `rgba(0, 0, 0, ${0.08 * k})`);
        grad.addColorStop(1, `rgba(0, 0, 0, ${0.3 * k})`);
        wg.fillStyle = grad;
        wg.fillRect((x - out) * TS, (y - out) * TS, 2 * out * TS, 2 * out * TS);
      }
      wg.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(w, lamp.x0, lamp.y0, lamp.w, lamp.h, lamp.x0, lamp.y0, lamp.w, lamp.h);
      g.setTransform(T);
    }
    // Where the ink in sight goes: the eased sight, and all round the player
    // out to `nearInk`.
    const mc = this.inkMask || (this.inkMask = blank(1, 1));
    if (mc.width !== w.width || mc.height !== w.height) { mc.width = w.width; mc.height = w.height; }
    const mg = mc.getContext("2d");
    mg.setTransform(1, 0, 0, 1, 0, 0);
    mg.clearRect(0, 0, mc.width, mc.height);
    mg.setTransform(T);
    mg.imageSmoothingEnabled = true;
    this.region(mg, this.sightCanvas.eased, ss, view);
    if (this.sightFrom && S.nearInk + S.nearSoft > 0) {
      const [px, py] = this.sightFrom, r0 = S.nearInk * this.TS, r1 = (S.nearInk + S.nearSoft) * this.TS;
      const grad = mg.createRadialGradient(px, py, 0, px, py, r1);
      grad.addColorStop(0, "#000");
      for (let i = 0; i <= 6; i++) grad.addColorStop((r0 + ((r1 - r0) * i) / 6) / r1, `rgba(0, 0, 0, ${smooth(1 - i / 6)})`);
      mg.globalCompositeOperation = "lighten";
      mg.fillStyle = grad;
      mg.fillRect(px - r1, py - r1, 2 * r1, 2 * r1);
      mg.globalCompositeOperation = "source-over";
    }
    // The two inks, each where it belongs.
    for (const [ink, op] of [[st.mem, "destination-out"], [st.see, "destination-in"]]) {
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.globalCompositeOperation = "source-over";
      wg.clearRect(0, 0, w.width, w.height);
      wg.setTransform(T);
      this.region(wg, ink, this.scale, view);
      wg.globalCompositeOperation = op;
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.drawImage(mc, 0, 0);
      wg.globalCompositeOperation = "source-over";
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(w, 0, 0);
      g.setTransform(T);
    }
    this.region(g, st.cover, this.scale, view);
    // The warmth where the light falls.
    if (box && S.warmth > 0) {
      const warm = this.warmCanvas || (this.warmCanvas = blank(1, 1)), lc = this.lightCanvas;
      if (warm.width !== lc.width || warm.height !== lc.height) { warm.width = lc.width; warm.height = lc.height; }
      const hg = warm.getContext("2d");
      hg.globalCompositeOperation = "source-over";
      hg.clearRect(0, 0, warm.width, warm.height);
      hg.drawImage(lc, 0, 0);
      hg.globalCompositeOperation = "source-in";
      hg.fillStyle = `rgba(255, 196, 120, ${S.warmth * 0.35})`;
      hg.fillRect(0, 0, warm.width, warm.height);
      const b = this.lightBox;
      g.globalCompositeOperation = "multiply";
      g.drawImage(warm, b.x, b.y, b.w, b.w);
      g.globalCompositeOperation = "source-over";
    }
  }

  // The box round the level's lights that light anything in sight, in view,
  // on a canvas with transform `T`, in whole pixels, and that in map units;
  // null if none.
  lampBox(T, canvas) {
    const TS = this.TS;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of this.lampsSeen ?? []) {
      x0 = Math.min(x0, (l.x0 - 1) * TS);
      y0 = Math.min(y0, (l.y0 - 1) * TS);
      x1 = Math.max(x1, (l.x1 + 1) * TS);
      y1 = Math.max(y1, (l.y1 + 1) * TS);
    }
    if (!(x1 > x0)) return null;
    const X0 = Math.max(0, Math.floor(T.a * x0 + T.e)), Y0 = Math.max(0, Math.floor(T.d * y0 + T.f));
    const X1 = Math.min(canvas.width, Math.ceil(T.a * x1 + T.e)), Y1 = Math.min(canvas.height, Math.ceil(T.d * y1 + T.f));
    if (!(X1 > X0 && Y1 > Y0)) return null;
    return { x0: X0, y0: Y0, w: X1 - X0, h: Y1 - Y0, view: { x: (X0 - T.e) / T.a, y: (Y0 - T.f) / T.d, w: (X1 - X0) / T.a, h: (Y1 - Y0) / T.d } };
  }

  // The light's square on a canvas with transform `T`, in whole pixels (so
  // nothing shows at its edges), and that in map units; null if none.
  screenBox(T, canvas) {
    const b = this.lightBox;
    if (!b) return null;
    const x0 = Math.max(0, Math.floor(T.a * b.x + T.e)), y0 = Math.max(0, Math.floor(T.d * b.y + T.f));
    const x1 = Math.min(canvas.width, Math.ceil(T.a * (b.x + b.w) + T.e)), y1 = Math.min(canvas.height, Math.ceil(T.d * (b.y + b.w) + T.f));
    if (!(x1 > x0 && y1 > y0)) return null;
    return { x0, y0, w: x1 - x0, h: y1 - y0, view: { x: (x0 - T.e) / T.a, y: (y0 - T.f) / T.d, w: (x1 - x0) / T.a, h: (y1 - y0) / T.d } };
  }

  // How lit the map point (x, y) is, 0 to 1, roughly: by which band of the
  // light it is in, if in sight.
  // The level's lights (campfires), each cast against the walls, posts and
  // shut doors and lighting the rim of rock past them, in bands with ragged
  // edges like the candle's; and its lit places, lit throughout, the light
  // pouring out of their openings in bands the same way. As `lampLevel`
  // (mask resolution), as a picture to show the lit map through
  // (`lampCanvas`), and what it lets the player see from afar
  // (`lampSight`). Each light and lit place, for finding those in sight:
  // `lamps` (each the box it lights { x0, y0, x1, y1 }, in squares, and
  // some of the map points it lights to look for, `cells`).
  lightLamps() {
    const { mw, mh, TS, S, level: L } = this, lights = L.lights ?? [], places = this.litPlaces();
    this.lampLevel = this.lampCanvas = this.lampSight = null;
    this.lamps = [];
    if (!lights.length && !places.length) return;
    const level = (this.lampLevel = new Float32Array(mw * mh)), steady = new Float32Array(mw * mh);
    // (Every fourth map point each way that the light being laid lights; and
    // a fire's light kept apart, `own`, to flicker in size; the rest,
    // `steady`.)
    let cells, own = null;
    const mark = (x, y, j, v) => {
      if (v > level[j]) level[j] = v;
      if (v > 0 && !(x & 3) && !(y & 3)) cells.add(j);
      if (!own) { if (v > steady[j]) steady[j] = v; }
      else if (own.a) { const k = (y - own.y0) * own.w + (x - own.x0); if (v > own.a[k]) own.a[k] = v; }
    };
    const rag = (mx, my) => S.lightRag * (2 * (0.65 * this.fine(mx, my) + 0.35 * this.noise(mx, my)) - 1);
    // Lights the map points round (x, y) (squares) in line of sight within
    // `out`, `band(e)` of how far each is (`dist(mx, my)`, squares), raggedly.
    // (Past the walls in view only into the rock, not past shut doors.)
    const shine = (x, y, out, dist, band) => {
      const view = this.lightWalls.visible(x * TS, y * TS, (out + 0.5) * TS), rim = view.beyond(S.lightWall * TS);
      const m = Math.ceil((out + 1) * R), cx = Math.floor(x * R), cy = Math.floor(y * R);
      const x0 = Math.max(0, cx - m), y0 = Math.max(0, cy - m), x1 = Math.min(mw, cx + m), y1 = Math.min(mh, cy + m), bw = x1 - x0, bh = y1 - y0;
      const c = blank(bw, bh), g = c.getContext("2d", { willReadFrequently: true });
      g.setTransform(R / TS, 0, 0, R / TS, -x0, -y0);
      g.fillStyle = "#f00";
      g.fill(rim);
      g.fillStyle = "#0f0";
      g.fill(view);
      const a = g.getImageData(0, 0, bw, bh).data;
      if (own) Object.assign(own, { x0, y0, w: bw, h: bh, a: new Float32Array(bw * bh) });
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const b = ((y - y0) * bw + (x - x0)) * 4, j = y * mw + x;
          if (a[b + 3] < 128 || (a[b + 1] < 128 && this.floor[j])) continue;
          const mx = (x + 0.5) * (TS / R), my = (y + 0.5) * (TS / R);
          mark(x, y, j, band(dist(mx, my) + rag(mx, my)));
        }
    };
    for (const l of lights) {
      const B = LAMPS[l.kind] ?? LAMPS.fire, out = B.full + B.dim + B.dark;
      cells = new Set();
      own = {};
      shine(l.x, l.y, out, (mx, my) => Math.hypot(mx / TS - l.x, my / TS - l.y), (e) => (e < B.full ? 1 : e < B.full + B.dim ? S.dimLevel : e < out ? S.darkLevel : 0));
      // (Its light as a picture of its own, at mask resolution.)
      const c = blank(own.w, own.h), im = new ImageData(own.w, own.h);
      for (let k = 0; k < own.a.length; k++) im.data[k * 4 + 3] = Math.round(255 * own.a[k]);
      c.getContext("2d").putImageData(im, 0, 0);
      this.lamps.push({ x0: l.x - out, y0: l.y - out, x1: l.x + out, y1: l.y + out, cells: [...cells], fire: { x: l.x, y: l.y, out, full: B.full, ph: this.lamps.length * 2.4, pic: c, at: [own.x0, own.y0] } });
      own = null;
    }
    const out = LIT.dim + LIT.dark;
    for (const p of places) {
      cells = new Set();
      // Throughout: its squares, and the rock round them as far as a light
      // lights past a wall.
      const wall = Math.ceil(S.lightWall * R);
      for (const [x, y] of p.squares)
        for (let my = y * R - wall; my < (y + 1) * R + wall; my++)
          for (let mx = x * R - wall; mx < (x + 1) * R + wall; mx++) {
            if (mx < 0 || my < 0 || mx >= mw || my >= mh) continue;
            const j = my * mw + mx, inside = mx >= x * R && mx < (x + 1) * R && my >= y * R && my < (y + 1) * R;
            if (inside || (!this.floor[j] && Math.hypot(Math.max(x * R - mx - 0.5, 0, mx + 0.5 - (x + 1) * R), Math.max(y * R - my - 0.5, 0, my + 0.5 - (y + 1) * R)) / R + rag((mx + 0.5) * (TS / R), (my + 0.5) * (TS / R)) < S.lightWall)) mark(mx, my, j, 1);
          }
      // Out of each opening: from each of its squares by unlit floor, the
      // bands by how far past that square's edge.
      for (const [x, y] of p.edges)
        shine(x + 0.5, y + 0.5, out + 0.5, (mx, my) => Math.hypot(Math.max(x - mx / TS, 0, mx / TS - x - 1), Math.max(y - my / TS, 0, my / TS - y - 1)), (e) => (e <= 0 ? 1 : e < LIT.dim ? S.dimLevel : e < out ? S.darkLevel : 0));
      this.lamps.push({ x0: p.x0 - out, y0: p.y0 - out, x1: p.x1 + out, y1: p.y1 + out, cells: [...cells] });
    }
    const pic = (level, alpha) => {
      const c = blank(mw, mh), im = new ImageData(mw, mh);
      for (let j = 0; j < mw * mh; j++) im.data[j * 4 + 3] = Math.round(255 * alpha(level[j]));
      c.getContext("2d").putImageData(im, 0, 0);
      return c;
    };
    // (`lampCanvas`: the steady light; the fires' are laid over it as drawn.)
    this.lampCanvas = pic(steady, (v) => v);
    this.lampSight = pic(level, (v) => clamp01(v / Math.max(0.01, S.darkLevel)));
  }

  // The level's lit places: each a run of lit squares ([x, y]s), its box
  // (x0, y0, x1, y1, in squares), and its `edges`, the squares of it by floor
  // not lit (where its light pours out).
  litPlaces() {
    const L = this.level, lit = L.lit, W = L.w, H = L.h, done = new Uint8Array(W * H), places = [];
    if (!lit) return places;
    const floor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && L.tiles[y * W + x] === T.FLOOR;
    for (let i = 0; i < W * H; i++) {
      if (!lit[i] || done[i]) continue;
      const squares = [], edges = [], q = [i];
      done[i] = 1;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      while (q.length) {
        const j = q.pop(), x = j % W, y = (j - x) / W;
        squares.push([x, y]);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
        let edge = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy, n = ny * W + nx;
            if (!floor(nx, ny)) continue;
            if (!lit[n]) edge = true;
            else if (!done[n] && (dx === 0 || dy === 0)) { done[n] = 1; q.push(n); }
          }
        if (edge) edges.push([x, y]);
      }
      places.push({ squares, edges, x0, y0, x1, y1 });
    }
    return places;
  }

  lightAt(x, y) {
    const S = this.S, from = this.lightFrom ?? [-1e9, -1e9], TS = this.TS, r = (S.lightFull - 0.5 + S.lightDim) * TS;
    const d = Math.hypot(x - from[0], y - from[1]), i = Math.floor((x * R) / TS), k = Math.floor((y * R) / TS);
    const lamp = this.lampLevel && i >= 0 && k >= 0 && i < this.mw && k < this.mh ? this.lampLevel[k * this.mw + i] : 0;
    return Math.max(lamp, d < (S.lightFull - 0.5) * TS ? 1 : d < r ? S.dimLevel : d < this.lightOut() * TS ? S.darkLevel : 0) * this.inSight(x, y);
  }


}
