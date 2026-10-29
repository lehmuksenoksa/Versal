// How the map is shown as it is explored: one hatching for all the rock (the
// map hatched as solid stone, inked by a depth map from the known walls),
// what is in sight drawn over what is remembered, ground never seen covered
// in black, and the player's candle with darkness outside it.
//
// The slow part, the drawing of the known map in its in-sight and remembered
// looks and the cover over unseen ground, is redone only when more ground is
// known (`rebuild`). Sight, light and darkness are laid over it each frame
// (`update`, `drawMap`, `drawLight`). The settings were chosen in the
// expression mockup (mockups/expression.html), which uses this module too.

import { renderMap, drawPaper } from "./maprender.js";
import { hatchSolid, inkRecorded, nearestSeeds } from "./hatching.js";
import { RNG } from "./rng.js";
import { Walls } from "./sightline.js";

export const EXPRESSION_DEFAULTS = {
  // Sight: clear out to `sight` tiles, then fading out with distance over
  // `sightFade`; where walls block the view the edge softens over
  // `blockSoft`. Changes ease in over `reveal` seconds.
  sight: 8, sightFade: 2.5, blockSoft: 0.1, reveal: 0.4,
  // The candle: its reach, full brightness out to `lightFull` of it, how far
  // it lights the rock past a wall's face, the flame's size (how soft its
  // shadows are), flicker in brightness and in size, and warmth.
  radius: 5, lightFull: 0.6, lightWall: 1.5, flame: 0.3, flicker: 0.4, flickerSize: 0.04, warmth: 0.7,
  // Darkness outside the candlelight: its colour, how much ground in sight
  // darkens, and how much more remembered ground does.
  darkColor: "#16181d", dark: 0.75, memShade: 0.3,
  // The in-sight and remembered looks: floor tint (from paper to the rock's
  // tone), and colour and strength of the floor markings, walls and
  // hatching; remembered hatching is inked from a weaker depth map.
  seeFloorMix: 0.15, seeMarkC: "#1b1815", seeMark: 1, seeWallC: "#1b1815", seeWall: 1, seeHatchC: "#1b1815", seeHatch: 1,
  memWeight: 0.35, memFloorMix: 0.55, memMarkC: "#8a7f72", memMark: 0, memWallC: "#6b5f52", memWall: 0.7, memHatchC: "#6b5f52", memHatch: 1,
  // The depth map: how it is made, black up to `full` tiles from the known
  // walls and white from `reach`, its ragged edge, and (for some ways of
  // making it) how openings soften it.
  depth: "diffuse", full: 0.3, reach: 3.2, ragged: 0.6, opening: 1, taper: 2,
  // The hatching from black to white: strokes kept, their width, length and
  // ink in mid grey (each going on to nothing at white, but ink).
  keepGrey: 0.85, wBlack: 1.5, wGrey: 1.5, lenGrey: 0.6, inkGrey: 1,
  // Unexplored ground: its colour, how it fades in, and from where.
  outColor: "#000000", fadeStyle: "strokes", fadeBy: "distance", fadeStart: 2.75, fadeWidth: 3.75,
  // The rock outside the rooms, toned toward a colour.
  rockColor: "#8f8a80", rockTone: 0.85, rockBy: "flat",
};
// Settings that only change how sight and light are laid over the drawing;
// `sight` and `sightFade` also change what is seen, and the rest mean
// redrawing it.
export const LIVE_SETTINGS = new Set(["sight", "sightFade", "blockSoft", "reveal", "radius", "lightFull", "lightWall", "flame", "flicker", "flickerSize", "warmth", "darkColor", "dark", "memShade"]);

const R = 8; // mask pixels per tile
// The rock this close to known floor (in tiles) shows the walls' ink.
const WALL_BAND = 0.5;
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
  const tmp = new Float32Array(Math.max(w, h));
  const pass = (len, count, at) => {
    for (let c = 0; c < count; c++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += a[at(c, Math.max(0, Math.min(len - 1, i)))];
      for (let i = 0; i < len; i++) {
        tmp[i] = sum / (2 * r + 1);
        sum += a[at(c, Math.min(len - 1, i + r + 1))] - a[at(c, Math.max(0, i - r))];
      }
      for (let i = 0; i < len; i++) a[at(c, i)] = tmp[i];
    }
  };
  for (let k = 0; k < 2; k++) {
    pass(w, h, (y, x) => y * w + x);
    pass(h, w, (x, y) => y * w + x);
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
    const drawn = layer({ floor: true });
    this.floorLayer = drawn.canvas;
    this.floorPlain = layer({ floor: true, shadow: false }).canvas; // remembered floor: no shadow
    this.markLayer = layer({ grid: true, keys: true }).canvas;
    this.wallLayer = layer({ walls: true }).canvas;
    const cw = drawn.canvas.width, ch = drawn.canvas.height;
    this.paper = blank(cw, ch);
    const pg = this.paper.getContext("2d");
    pg.scale(this.scale, this.scale);
    drawPaper(pg, W * TS, H * TS, new RNG(seed));
    const c = blank(mw, mh), g = c.getContext("2d", { willReadFrequently: true });
    g.scale(R / TS, R / TS);
    g.fill(drawn.floor, "evenodd");
    const a = g.getImageData(0, 0, mw, mh).data;
    this.floor = new Uint8Array(mw * mh);
    for (let j = 0; j < mw * mh; j++) this.floor[j] = a[j * 4 + 3] >= 128 ? 1 : 0;
    this.walls = new Walls(drawn.loops, TS * 2);
    this.rock = new Path2D();
    this.rock.rect(-W * TS, -H * TS, W * TS * 3, H * TS * 3);
    this.rock.addPath(drawn.floor);
    const sw = Math.ceil(W * TS * this.sightScale), sh = Math.ceil(H * TS * this.sightScale);
    this.sightCanvas = { target: blank(sw, sh), eased: blank(sw, sh), tmp: blank(sw, sh) };
    // The rock, for cutting the light to (see castLight).
    this.rockPicture = blank(sw, sh);
    const rg = this.rockPicture.getContext("2d");
    rg.scale(this.sightScale, this.sightScale);
    rg.fill(this.rock, "evenodd");
    this.lightReach = null;
    this.sightFrom = this.lightFrom = null;
    this.stat = this.prev = null;
    this.job = null;
    // The exact shape of all that has been seen, at full resolution, recast
    // from every place it was seen from (see learn).
    this.seenShape = blank(cw, ch);
    for (const v of this.viewpoints?.values() ?? []) this.addShape(v);
    if (this.player) {
      this.learn(this.player.x, this.player.y);
      this.rebuild();
    }
  }

  // Change settings. Those that only change sight and light apply at once;
  // the rest need the drawing redone, which is left to the caller (as
  // `rebuild`, perhaps after a pause). Returns whether it is needed.
  set(changes) {
    Object.assign(this.S, changes);
    this.sightFrom = this.lightFrom = null;
    const keys = Object.keys(changes);
    if (this.player && keys.some((k) => k === "sight" || k === "sightFade")) {
      this.learn(this.player.x, this.player.y);
      return true;
    }
    return keys.some((k) => !LIVE_SETTINGS.has(k));
  }

  // Forget everything seen.
  forget() {
    this.seen.fill(0);
    this.viewpoints?.clear();
    this.seenShape?.getContext("2d").clearRect(0, 0, this.seenShape.width, this.seenShape.height);
    if (this.player) this.learn(this.player.x, this.player.y);
  }

  // The floor the player sees from tile (tx, ty), at mask resolution, and
  // how well: unblocked by walls, fully out to `sight`, then less and less
  // over the fade with distance. Each bit of floor is remembered as well as
  // it has ever been seen. Returns whether anything is now better known.
  learn(tx, ty) {
    const { mw, mh, floor, seen, S, TS } = this, px = (tx + 0.5) * TS, py = (ty + 0.5) * TS, far = S.sight + S.sightFade;
    this.player = { x: tx, y: ty };
    const path = this.walls.visible(px, py, (far + 1) * TS);
    const c = blank(mw, mh), g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(R / TS, 0, 0, R / TS, 0, 0);
    g.fill(path);
    const a = g.getImageData(0, 0, mw, mh).data;
    let grew = false;
    const vis = new Float32Array(mw * mh), level = (j) => {
      const d = Math.hypot(((j % mw) + 0.5) / R - px / TS, (((j / mw) | 0) + 0.5) / R - py / TS);
      return S.sightFade > 0 ? 1 - smooth((d - S.sight) / S.sightFade) : d <= S.sight ? 1 : 0;
    };
    // In sight: floor at least half inside the view (`vis`, for what is in
    // sight now). Remembered as seen: any of it inside, and the floor next to
    // that, so the coarse record reaches past the true edge of the view; the
    // drawing is trimmed to that edge by `seenShape`.
    const touched = new Uint8Array(mw * mh);
    for (let j = 0; j < mw * mh; j++) {
      if (!floor[j] || a[j * 4 + 3] === 0) continue;
      touched[j] = 1;
      if (a[j * 4 + 3] >= 128) vis[j] = level(j);
    }
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const j = y * mw + x;
        if (!floor[j]) continue;
        let near = touched[j];
        for (let k = 0; k < 9 && !near; k++) {
          const nx = x + (k % 3) - 1, ny = y + ((k / 3) | 0) - 1;
          near = nx >= 0 && ny >= 0 && nx < mw && ny < mh && touched[ny * mw + nx];
        }
        if (!near) continue;
        const v = level(j);
        if (!(v > 0.01)) continue;
        // Only a real change is worth redrawing for (seeing ground a little
        // better as the player comes closer is not).
        if (v > seen[j]) {
          if (v - seen[j] > 0.15 || (seen[j] < 0.5 && v >= 0.5)) grew = true;
          seen[j] = v;
        }
      }
    const key = `${tx},${ty},${far}`;
    if (!this.viewpoints) this.viewpoints = new Map();
    if (!this.viewpoints.has(key)) {
      const v = { path, px, py, far };
      this.viewpoints.set(key, v);
      this.addShape(v);
    }
    this.visNow = vis;
    this.sightRock(vis);
    return grew;
  }

  // Add one view to `seenShape`: the floor seen from (px, py) out to `far`
  // tiles, and the rock just past the wall faces seen (where their ink is).
  addShape({ path, px, py, far }) {
    if (!this.seenShape) return;
    const g = this.seenShape.getContext("2d"), TS = this.TS;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    g.save();
    g.beginPath();
    g.arc(px, py, (far + WALL_BAND) * TS, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = "#000";
    g.fill(path);
    g.clip(this.rock, "evenodd");
    g.fill(path.beyond(WALL_BAND * TS));
    g.restore();
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
  sightRock(vis) {
    const { mw, mh, floor, seen, S } = this, n = mw * mh, any = new Uint8Array(n);
    for (let j = 0; j < n; j++) any[j] = floor[j] && drawnAs(seen[j]) > 0 ? 1 : 0;
    const { d2, sx, sy } = nearestSeeds(any, mw, mh), far = (S.reach * R) ** 2;
    const v = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      if (any[j]) v[j] = vis[j];
      else if (sx[j] >= 0 && d2[j] <= far) v[j] = vis[sy[j] * mw + sx[j]];
    }
    // (Softened with the floor in it, so it doesn't dip along the walls, where
    // the remembered look would show through the ink.)
    blur(v, mw, mh, Math.round(R * 0.5));
    const img = new ImageData(mw, mh);
    for (let j = 0; j < n; j++) if (!any[j]) img.data[j * 4 + 3] = Math.round(255 * v[j]);
    if (!this.rockSight) this.rockSight = blank(mw, mh);
    this.rockSight.getContext("2d").putImageData(img, 0, 0);
  }

  // The depth map: for each mask pixel, 0 (black: the heaviest hatching) to 1
  // (white: none). Three ways to make it from the known floor, its walls and
  // its openings. (A generator, so the work can be spread over frames.)
  *depthSteps(isKnown, d2) {
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
      const { sx, sy } = nearestSeeds(isKnown, mw, mh);
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
          if (it % 2) { for (let y = hh - 1; y >= 0; y--) for (let x = hw - 1; x >= 0; x--) step(x, y); }
          else for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) step(x, y);
          if (it % 10 === 9) yield;
        }
        return u;
      };
      const withOpen = yield* spread(true), without = yield* spread(false), keep = new Float32Array(hn);
      for (let i = 0; i < hn; i++) keep[i] = without[i] > 1e-6 ? clamp01(withOpen[i] / without[i]) : 0;
      const dWall = nearestSeeds(walls, mw, mh).d2;
      for (let j = 0; j < n; j++) {
        if (isKnown[j]) continue;
        // Bilinear, from the half-resolution grid.
        const fx = Math.max(0, Math.min(hw - 1.001, ((j % mw) + 0.5) / h - 0.5)), fy = Math.max(0, Math.min(hh - 1.001, (((j / mw) | 0) + 0.5) / h - 0.5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, i = y0 * hw + x0;
        const t = (keep[i] * (1 - tx) + keep[i + 1] * tx) * (1 - ty) + (keep[i + hw] * (1 - tx) + keep[i + hw + 1] * tx) * ty;
        const k = rag(j), f = full * k, r = S.reach * k;
        grey[j] = 1 - (1 - smooth((Math.sqrt(dWall[j]) / R - f) / (r - f))) * smooth(t);
      }
    }
    return grey;
  }

  // Lay a colour over canvas `g` from mask resolution: `alpha(j)` from 0 to 1
  // at each mask pixel, with the given compositing.
  overlay(g, hex, alpha, op, shape = null) {
    const { mw, mh } = this, [r, gr, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const img = new ImageData(mw, mh);
    for (let j = 0; j < mw * mh; j++) {
      const a = alpha(j);
      if (!(a > 0)) continue;
      img.data[j * 4] = r;
      img.data[j * 4 + 1] = gr;
      img.data[j * 4 + 2] = b;
      img.data[j * 4 + 3] = Math.round(255 * Math.min(1, a));
    }
    const c = blank(mw, mh);
    c.getContext("2d").putImageData(img, 0, 0);
    if (shape) {
      // Cut to the shape at full resolution first.
      this.lay(g, c, null, null, 1, shape, op);
      return;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = op;
    g.imageSmoothingEnabled = true;
    g.drawImage(c, 0, 0, g.canvas.width, g.canvas.height);
    g.globalCompositeOperation = "source-over";
  }

  // Draw `src` onto `g` (scaled to fit), cut to `mask` (mask resolution; none
  // for all of it) and to `shape` (full resolution) if given, recoloured
  // unless `colour` is null, at the given strength, with compositing `op`.
  lay(g, src, mask, colour, strength, shape = null, op = "source-over") {
    if (strength <= 0) return;
    const w = this.scratch, wg = w.getContext("2d");
    wg.setTransform(1, 0, 0, 1, 0, 0);
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
      wg.drawImage(mask, 0, 0, w.width, w.height);
    }
    if (shape) {
      wg.globalCompositeOperation = "destination-in";
      wg.drawImage(shape, 0, 0);
    }
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
    run(this.rebuildSteps());
  }

  // Redo the drawing a slice at a time over the coming frames (see update),
  // so nothing stops while it is done. Asked again meanwhile, it is done once
  // more after.
  rebuildSoon() {
    if (this.job) this.again = true;
    else this.job = this.rebuildSteps();
  }

  // The work of redrawing, in slices.
  *rebuildSteps() {
    const { mw, mh, floor, seen, solid, scale, S, TS } = this, n = mw * mh;
    const cw = this.paper.width, ch = this.paper.height;
    this.scratch = blank(cw, ch);
    // Known: floor seen at least half well (for the shape of the hatching and
    // the cover); the drawing of the floor and its walls fades with how well
    // it was seen.
    const known = new Uint8Array(n), glimpsed = new Uint8Array(n);
    for (let j = 0; j < n; j++) {
      known[j] = floor[j] && seen[j] >= 0.5 ? 1 : 0;
      glimpsed[j] = floor[j] && seen[j] > 0.01 ? 1 : 0;
    }
    const { d2 } = nearestSeeds(known, mw, mh);
    yield;
    // (A copy: more may be seen while this is being done.)
    const shape = blank(cw, ch);
    shape.getContext("2d").drawImage(this.seenShape, 0, 0);
    const grey = yield* this.depthSteps(known, d2);
    const cell = (x, y) => {
      const i = Math.floor((x * R) / TS), k = Math.floor((y * R) / TS);
      return i < 0 || k < 0 || i >= mw || k >= mh ? -1 : k * mw + i;
    };
    const greyAt = (x, y) => {
      const j = cell(x, y);
      return j < 0 ? 1 : grey[j];
    };
    // Black to mid grey to white: from the black value through the grey one
    // to `white`.
    const ramp = (g, black, mid, white) => (g < 0.5 ? black + (mid - black) * g * 2 : mid + (white - mid) * (g - 0.5) * 2);

    // The hatching as ink on clear, which the looks colour: at full weight,
    // and (for the remembered look) with the depth map's darkness scaled by
    // `weight`, so fewer, thinner, shorter strokes keep closer to the walls.
    const inkAt = function* (weight) {
      const ink = blank(cw, ch), ig = ink.getContext("2d");
      ig.setTransform(scale, 0, 0, scale, 0, 0);
      ig.fillStyle = "#000";
      const gAt = (x, y) => 1 - (1 - greyAt(x, y)) * weight;
      const widthAt = (x, y) => ramp(gAt(x, y), S.wBlack, S.wGrey, 0);
      let count = 0;
      for (const st of solid) {
        if (++count % 2000 === 0) yield;
        const [x, y] = st.path[st.path.length >> 1], g = gAt(x, y);
        if (g >= 0.999) continue;
        // Drop strokes by rank: a group's own rank, plus more for each later
        // stroke in it, so groups lose their last strokes first.
        if (st.rank >= ramp(g, 1, S.keepGrey, 0)) continue;
        const keep = ramp(g, 1, S.lenGrey, 0), a = ramp(g, 1, S.inkGrey, S.inkGrey);
        if (keep < 0.03 || a < 0.02) continue;
        ig.globalAlpha = a;
        ig.beginPath();
        inkRecorded(ig, st, keep, 1, widthAt);
        ig.fill();
      }
      return ink;
    };
    const inks = { see: yield* inkAt(1), mem: yield* inkAt(S.memWeight) };

    // Known floor and the band of rock where its walls are inked.
    // (Rock in the band goes with its nearest glimpsed floor.)
    const band = (WALL_BAND * R) ** 2, mask = blank(mw, mh), img = new ImageData(mw, mh);
    const near = nearestSeeds(glimpsed, mw, mh);
    for (let j = 0; j < n; j++) {
      const a = drawnAs(floor[j] ? seen[j] : near.d2[j] < band ? seen[near.sy[j] * mw + near.sx[j]] : 0);
      img.data[j * 4 + 3] = Math.round(255 * a);
    }
    mask.getContext("2d").putImageData(img, 0, 0);
    // Floor glimpsed has its hatching cleared, in the rock's tone.
    const glimpsedMask = blank(mw, mh), gi = new ImageData(mw, mh);
    for (let j = 0; j < n; j++) if (floor[j]) gi.data[j * 4 + 3] = Math.round(255 * clearOf(seen[j]));
    glimpsedMask.getContext("2d").putImageData(gi, 0, 0);
    // The paper toned like the rock.
    const stone = "#" + PAPER_RGB.map((p, i) => {
      const r = parseInt(S.rockColor.slice(1 + 2 * i, 3 + 2 * i), 16);
      return Math.round(p * (1 - S.rockTone + (S.rockTone * r) / 255)).toString(16).padStart(2, "0");
    }).join("");

    // A look: paper, the rock toned, the hatching, then the floor (painted over
    // it), tinted toward the rock's colour, its markings and its walls.
    const look = function* (pre) {
      const c = blank(cw, ch), g = c.getContext("2d");
      g.drawImage(this.paper, 0, 0);
      if (S.rockTone > 0) this.overlay(g, S.rockColor, (j) => S.rockTone * (S.rockBy === "depth" ? 1 - grey[j] : 1), "multiply");
      yield;
      this.lay(g, inks[pre], null, S[pre + "HatchC"], S[pre + "Hatch"]);
      yield;
      this.lay(g, this.floorLayer, glimpsedMask, stone, 1, shape);
      yield;
      this.lay(g, pre === "mem" ? this.floorPlain : this.floorLayer, mask, null, 1, shape);
      yield;
      this.overlay(g, S.rockColor, (j) => (floor[j] ? S.rockTone * S[pre + "FloorMix"] * drawnAs(seen[j]) : 0), "multiply", shape);
      yield;
      this.lay(g, this.markLayer, mask, S[pre + "MarkC"], S[pre + "Mark"], shape);
      yield;
      this.lay(g, this.wallLayer, mask, S[pre + "WallC"], S[pre + "Wall"], shape);
      yield;
      return c;
    }.bind(this);

    // Ground not yet seen. `u` runs from 0 where the cover starts to 1 where it
    // is solid: by distance from the known floor (with the ragged edge), or
    // from where the hatching gives out.
    yield;
    const u = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      if (known[j]) { u[j] = -1; continue; }
      if (S.fadeBy === "hatching") { u[j] = (grey[j] - 0.4) / 0.6; continue; }
      const x = ((j % mw) + 0.5) * (TS / R), y = (((j / mw) | 0) + 0.5) * (TS / R);
      const k = Math.max(0.1, 1 + S.ragged * (2 * this.noise(x, y) - 1));
      u[j] = (Math.sqrt(d2[j]) / R - S.fadeStart * k) / Math.max(0.01, S.fadeWidth * k);
    }
    const cover = blank(cw, ch), cg = cover.getContext("2d");
    if (S.fadeStyle === "gradient") this.overlay(cg, S.outColor, (j) => smooth(u[j]), "source-over");
    else if (S.fadeStyle === "edge")
      // A sharp edge halfway through, wandering with a finer noise.
      this.overlay(cg, S.outColor, (j) => {
        const x = ((j % mw) + 0.5) * (TS / R), y = (((j / mw) | 0) + 0.5) * (TS / R);
        return smooth((u[j] - 0.5 + (this.fine(x, y) - 0.5) * 0.5) / 0.1);
      }, "source-over");
    else {
      // Solid only toward the far end; before that, the hatching's strokes
      // (all of them) thickening, or dots coming in denser and bigger.
      this.overlay(cg, S.outColor, (j) => smooth((u[j] - 0.55) / 0.45), "source-over");
      cg.setTransform(scale, 0, 0, scale, 0, 0);
      cg.fillStyle = S.outColor;
      const uXY = (x, y) => u[cell(x, y)] ?? 1;
      let count = 0;
      if (S.fadeStyle === "strokes")
        for (const st of solid) {
          if (++count % 2000 === 0) yield;
          const [x, y] = st.path[st.path.length >> 1];
          if (!(uXY(x, y) > 0)) continue;
          cg.beginPath();
          inkRecorded(cg, st, 1, 1, (px, py) => Math.max(0, 1 + 5 * Math.min(1, uXY(px, py))));
          cg.fill();
        }
      else {
        cg.beginPath();
        for (const [x, y, rank, size] of this.dots) {
          const v = uXY(x, y);
          if (!(v > 0) || rank > v) continue;
          const r = TS * 0.05 * size * (0.6 + Math.min(1, v));
          cg.moveTo(x + r, y);
          cg.arc(x, y, r, 0, Math.PI * 2);
        }
        cg.fill();
      }
    }
    yield;
    const see = yield* look("see"), mem = yield* look("mem");
    this.grey = grey;
    this.prev = this.stat;
    this.stat = { see, mem, cover, t: performance.now() };
    this.scratch = null;
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
    const path = this.walls.visible(px, py, (Math.max(far, S.radius) + 1) * TS);
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

  // The candle: a flame of some size, so each wall casts a shadow that is
  // sharp close to it and softer further off (the light reaches what can be
  // seen from a few points across the flame, and the rock just past the wall
  // faces it falls on). That reach is drawn once for each place the player
  // stands; over it, full brightness out to `lightFull` of the candle's
  // radius, then fading out, flickering in brightness and in size.
  castLight(px, py, t) {
    const { S, TS } = this, rad = S.radius * TS;
    this.lightBox = null;
    if (!(rad > 0)) return;
    // Drawn on a square just big enough for the light round the player.
    const half = rad * (1 + S.flickerSize) + S.lightWall * TS + TS, res = Math.min(this.scale, 640 / (2 * half));
    const size = Math.ceil(2 * half * res), box = { x: px - half, y: py - half, w: 2 * half, res };
    const toBox = (g) => g.setTransform(res, 0, 0, res, -box.x * res, -box.y * res);
    if (!this.lightReach || this.lightReach.width !== size) {
      this.lightReach = blank(size, size);
      this.lightRockCut = blank(size, size);
      this.lightCanvas = blank(size, size);
      this.lightFrom = null;
    }
    if (!this.lightFrom || this.lightFrom[0] !== px || this.lightFrom[1] !== py) {
      const f = S.flame * TS, reach = rad * (1 + S.flickerSize) + TS;
      const pts = f > 0 ? [[0, 0], [f, 0], [-f, 0], [0, f], [0, -f]] : [[0, 0]];
      const paths = pts.map(([dx, dy]) => this.walls.visible(px + dx, py + dy, reach));
      const g = this.lightReach.getContext("2d"), r = this.lightRockCut.getContext("2d");
      for (const c of [g, r]) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, size, size);
        toBox(c);
        c.fillStyle = "#000";
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = 1 / paths.length;
      }
      // (The rock part softened, so the light fades off into the rock
      // rather than stopping at an edge.)
      r.filter = S.lightWall > 0 ? `blur(${S.lightWall * TS * res * 0.35}px)` : "none";
      for (const p of paths) {
        g.fill(p);
        r.fill(p.beyond(S.lightWall * TS));
      }
      r.filter = "none";
      // The rock part: cut to the rock, then added in.
      r.globalAlpha = 1;
      r.globalCompositeOperation = "destination-in";
      r.setTransform(1, 0, 0, 1, 0, 0);
      const ss = this.sightScale;
      r.drawImage(this.rockPicture, box.x * ss, box.y * ss, box.w * ss, box.w * ss, 0, 0, size, size);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.drawImage(this.lightRockCut, 0, 0);
      g.globalCompositeOperation = "source-over";
      r.globalCompositeOperation = "source-over";
      this.lightFrom = [px, py];
    }
    const wave = (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2)) / 2;
    const bright = 1 - S.flicker * 0.25 * (wave + 1) / 2;
    // The size flickers too, on a wave of its own: the whole pool of light
    // grows and shrinks a little.
    const swell = (Math.sin(t * 5.1) + 0.5 * Math.sin(t * 8.9 + 0.7) + 0.3 * Math.sin(t * 13.3 + 2)) / 1.8;
    const r = rad * (1 + S.flickerSize * swell);
    const light = this.lightCanvas, g = light.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.globalAlpha = bright;
    g.drawImage(this.lightReach, 0, 0);
    g.globalAlpha = 1;
    toBox(g);
    const grad = g.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, "#000");
    for (let k = 0; k <= 8; k++) grad.addColorStop(S.lightFull + (1 - S.lightFull) * (k / 8), `rgba(0, 0, 0, ${smooth(1 - k / 8)})`);
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = grad;
    g.fillRect(box.x, box.y, box.w, box.w);
    g.globalCompositeOperation = "source-over";
    this.lightBox = box;
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
  // a new drawing cross-fades in.
  drawMap(ctx, view, now) {
    if (!this.stat) return;
    const k = clamp01((now - this.stat.t) / Math.max(1, this.S.reveal * 1000));
    if (k >= 1) this.prev = null; // done with: let it go
    if (!this.prev) {
      this.compose(ctx, this.stat, view);
      return;
    }
    // Fading in: the old drawing in full, then the new one, put together
    // whole first and laid over it (fading it in layer by layer would let
    // the looks show through the cover halfway).
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

  // One drawing, onto `g` (its transform the world's): the remembered look,
  // the in-sight look through the eased sight, and the cover.
  compose(g, st, view) {
    const T = g.getTransform(), w = this.work(g), wg = w.getContext("2d");
    g.imageSmoothingEnabled = wg.imageSmoothingEnabled = true;
    this.region(g, st.mem, this.scale, view);
    wg.setTransform(1, 0, 0, 1, 0, 0);
    wg.globalCompositeOperation = "source-over";
    wg.clearRect(0, 0, w.width, w.height);
    wg.setTransform(T);
    this.region(wg, st.see, this.scale, view);
    wg.globalCompositeOperation = "destination-in";
    this.region(wg, this.sightCanvas.eased, this.sightScale, view);
    wg.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(w, 0, 0);
    g.setTransform(T);
    this.region(g, st.cover, this.scale, view);
  }


  // Darkness outside the candlelight (the remembered amount everywhere, cut
  // back to the in-sight amount where sight reaches, and away where the light
  // falls), and a warm tint within it; multiplied, so ink stays black.
  drawLight(ctx, view) {
    const S = this.S, T = ctx.getTransform(), w = this.work(ctx), wg = w.getContext("2d");
    const { eased } = this.sightCanvas, ss = this.sightScale;
    const pass = (paint) => {
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.globalCompositeOperation = "source-over";
      wg.clearRect(0, 0, w.width, w.height);
      wg.setTransform(T);
      wg.imageSmoothingEnabled = true;
      paint();
      wg.globalCompositeOperation = "source-over";
      wg.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(w, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(T);
    };
    const memDark = S.dark + (1 - S.dark) * S.memShade;
    pass(() => {
      wg.globalAlpha = memDark;
      wg.fillStyle = S.darkColor;
      wg.fillRect(view.x, view.y, view.w, view.h);
      wg.globalAlpha = memDark > 0 ? 1 - S.dark / memDark : 0;
      wg.globalCompositeOperation = "destination-out";
      this.region(wg, eased, ss, view);
      wg.globalAlpha = 1;
      this.drawLightBox(wg);
      // The warm tint where the light falls, in the same pass.
      if (S.warmth > 0 && this.lightBox) {
        const warm = this.warmCanvas || (this.warmCanvas = blank(1, 1)), c = this.lightCanvas;
        if (warm.width !== c.width || warm.height !== c.height) { warm.width = c.width; warm.height = c.height; }
        const hg = warm.getContext("2d");
        hg.globalCompositeOperation = "source-over";
        hg.clearRect(0, 0, warm.width, warm.height);
        hg.drawImage(c, 0, 0);
        hg.globalCompositeOperation = "source-in";
        hg.fillStyle = `rgba(255, 196, 120, ${S.warmth * 0.35})`;
        hg.fillRect(0, 0, warm.width, warm.height);
        const b = this.lightBox;
        wg.globalCompositeOperation = "source-over";
        wg.drawImage(warm, b.x, b.y, b.w, b.w);
      }
    });
  }
}
