// Level generation by areas. The level is split into a few regions, each of
// a type that sets how its rooms and corridors are made:
//   dungeon: built square rooms and straight corridors;
//   cavern: misshapen caves (the big ones with rock formations standing in
//     them) joined by winding passages of varying width;
//   collapsed: built rooms and caves mixed, some of the rooms half fallen in,
//     with rubble on their floors and along their corridors;
//   halls: the goblin king's: big halls hewn roughly out of the rock, held
//     up by rough columns, joined by wide hewn passages.
// Or (`from` and `to` set) the level changes from one kind to the other,
// gradually, across it from left to right: the player starts on the left
// (by the stairs up, `stairsUp`, if `up`), the stairs down (`stairsDown`, if
// `down`) are on the far right, and (`throne`) the far right's biggest hall
// is the throne room (`throneRoom`).
// A corridor changes as it crosses from one region into another.
// The level has the shape the game and the map drawing expect (see
// dungeon.js), and also `area` (each tile's region type, an index into
// AREAS), `rubble` (0 to 3 for each tile), `doors` (each { x, y, dx, dy, open }:
// a door in the tile at x, y, the dungeon room it opens into that way, shut
// or open), `secrets` (secret doors, as doors, their squares rock until
// found), `features` (things drawn in the dungeon rooms: see the
// furnishing), `posts` (pillars on grid crossings, [x, y]: no step
// diagonally past one), `recesses` (shallow alcoves in the walls, each
// { x, y, dx, dy, w }: in the wall that way from the square x, y, w squares
// wide), `lights` (campfires, each { x, y, kind } in squares), `lit` (the
// squares of lit rooms and corridors), `blocks` (squares in the way though
// floor: campfires), `roomOf` and `wallOf` (which room, an index into
// `rooms`, each square's floor and each bit of rock bordering it is part
// of; -1 for none: corridors, passages), each room's `kind`,
// and `regions` (their seed points and types).
// Columns are rock, a square each.

import { T, carveCave } from "./dungeon.js";
import { computeFov } from "./fov.js";
import LIGHTS_DATA from "./content/lights.json" with { type: "json" };
import TUNING from "./content/tuning.json" with { type: "json" };

export const AREAS = ["dungeon", "cavern", "collapsed", "halls"];
const DUNGEON = 0, CAVERN = 1, COLLAPSED = 2, HALLS = 3;

// The kinds of light, by `kind` in `lights` (js/content/lights.json): how far
// each lights, in bands (full, then dim, then a faint band counted as dark),
// the flame's size and where it stands. Campfires in caves; braziers in rooms
// and the king's halls; candles on an altar.
export const LIGHTS = LIGHTS_DATA.lights;

// The generator's settings (tuning.json, `levelgen`): the level's size and
// margin; regions; rooms, loops and doors; long loops and shortcuts; caves;
// dungeon room kinds, furnishing, recesses and columns; collapse and rubble;
// lights; secret doors; and a level's ground, stairs and throne.
export const LEVELGEN_DEFAULTS = TUNING.levelgen;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Smooth value noise, 0 to 1, varying over `cell` squares.
function valueNoise(rng, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = Float32Array.from({ length: gw * gh }, () => rng.next());
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = clamp(x / cell, 0, gw - 1.001), fy = clamp(y / cell, 0, gh - 1.001), i = Math.floor(fx), j = Math.floor(fy);
    const u = s(fx - i), v = s(fy - j), a = g[j * gw + i], b = g[j * gw + i + 1], c = g[(j + 1) * gw + i], d = g[(j + 1) * gw + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function generateAreas(rng, settings = {}) {
  const S = { ...LEVELGEN_DEFAULTS, ...settings };
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = tryAreas(S, rng);
    if (level) return withMargin(level, Math.max(0, Math.round(S.margin)));
  }
  throw new Error("level generation failed");
}

// The level with `m` squares of rock added all round: every square's values
// moved (rock outside; the region of the nearest square), and everything
// placed in squares moved with them (each thing once: the start may be the
// stairs).
function withMargin(L, m) {
  if (!m) return L;
  const W0 = L.w, H0 = L.h, W = W0 + 2 * m, H = H0 + 2 * m, n = W * H;
  const grow = (a, key) => {
    const b = new a.constructor(n);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const ix = x - m, iy = y - m, inside = ix >= 0 && iy >= 0 && ix < W0 && iy < H0;
        b[y * W + x] = inside ? a[iy * W0 + ix] : key === "area" ? a[clamp(iy, 0, H0 - 1) * W0 + clamp(ix, 0, W0 - 1)] : key === "roomOf" || key === "wallOf" ? -1 : 0;
      }
    return b;
  };
  const out = { ...L, w: W, h: H };
  for (const [key, v] of Object.entries(L)) if (ArrayBuffer.isView(v) && v.length === W0 * H0) out[key] = grow(v, key);
  const moved = new Set();
  const move = (o) => {
    if (!o || moved.has(o)) return;
    moved.add(o);
    if (Array.isArray(o)) { o[0] += m; o[1] += m; return; }
    o.x += m;
    o.y += m;
    if (o.cx !== undefined) { o.cx += m; o.cy += m; }
    if (o.seat) move(o.seat);
  };
  for (const key of ["rooms", "doors", "secrets", "features", "posts", "recesses", "lights", "regions"]) for (const o of L[key] ?? []) move(o);
  for (const o of [L.start, L.stairsUp, L.stairsDown]) move(o);
  out.blocks = new Set([...L.blocks].map((j) => (Math.floor(j / W0) + m) * W + (j % W0) + m));
  out.idx = (x, y) => y * W + x;
  out.get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : out.tiles[y * W + x]);
  return out;
}

function tryAreas(S, rng) {
  const W = Math.round(S.w), H = Math.round(S.h), n = W * H;
  const tiles = new Uint8Array(n), cave = new Uint8Array(n), area = new Uint8Array(n), rubble = new Uint8Array(n);
  const idx = (x, y) => y * W + x;
  const floorAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && tiles[idx(x, y)] === T.FLOOR;

  // Regions: seed points spread apart, each tile going to the nearest by a
  // distance warped with noise (so the borders wander); types by the mix.
  const regions = [];
  for (let k = 0; k < Math.max(1, Math.round(S.regions)); k++) {
    let best = null;
    for (let t = 0; t < 30; t++) {
      const x = rng.range(0.1, 0.9) * W, y = rng.range(0.1, 0.9) * H;
      const d = Math.min(Infinity, ...regions.map((q) => Math.hypot(x - q.x, y - q.y)));
      if (!best || d > best.d) best = { x, y, d };
    }
    regions.push(best);
  }
  const weights = AREAS.map((a) => Math.max(0, S[a])), total = weights.reduce((a, b) => a + b, 0);
  for (const r of regions) {
    let v = rng.next() * total;
    r.type = total > 0 ? weights.findIndex((w) => (v -= w) < 0) : DUNGEON;
    if (r.type < 0) r.type = DUNGEON;
  }
  const wx = valueNoise(rng, W, H, 9), wy = valueNoise(rng, W, H, 9);
  // (A level changing across: the far kind more and more to the right, the
  // border wandering and fraying.)
  const from = AREAS.indexOf(S.from), to = AREAS.indexOf(S.to), across = from >= 0 && to >= 0;
  const blot = valueNoise(rng, W, H, 5);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (across) {
        const t = x / W + (wx(x, y) - 0.5) * 0.45 + (blot(x, y) - 0.5) * 0.3;
        area[idx(x, y)] = t > 0.5 ? to : from;
        continue;
      }
      const px = x + 0.5 + (wx(x, y) - 0.5) * 14, py = y + 0.5 + (wy(x, y) - 0.5) * 14;
      let best = 0, bd = Infinity;
      regions.forEach((r, k) => {
        const d = Math.hypot(px - r.x, py - r.y);
        if (d < bd) { bd = d; best = k; }
      });
      area[idx(x, y)] = regions[best].type;
    }
  const typeAt = (x, y) => area[idx(clamp(x, 0, W - 1), clamp(y, 0, H - 1))];

  // Rooms: a spot, and a room of its region's kind there.
  const rooms = [], target = Math.round((S.density * n) / 100);
  for (let tries = 0; tries < target * 50 && rooms.length < target; tries++) {
    const sx = rng.int(2, W - 3), sy = rng.int(2, H - 3), type = typeAt(sx, sy);
    const isCave = type === CAVERN || (type === COLLAPSED && rng.chance(0.4));
    let w, h;
    if (type === HALLS) {
      // (Big halls, an odd number of squares each way, so their rows of
      // columns sit evenly about the middle; standing tall as often as
      // lying wide.)
      let a = rng.int(5, 8) * 2 + 1, b = rng.int(4, 6) * 2 + 1;
      if (b > a) [a, b] = [b, a];
      [w, h] = rng.chance(0.5) ? [a, b] : [b, a];
    } else if (isCave) {
      w = Math.round(rng.int(7, 16) * S.caveSize);
      h = Math.round(rng.int(6, 12) * S.caveSize);
    } else {
      const big = rng.chance(0.25);
      w = big ? rng.int(9, 13) : rng.int(4, 9);
      h = big ? rng.int(7, 9) : rng.int(4, 7);
      // (Half of them an even number of squares each way, which pillars on
      // the grid crossings need to sit evenly.)
      if (rng.chance(0.5)) {
        w += w % 2;
        h += h % 2;
      }
    }
    w = clamp(w, 4, W - 6);
    h = clamp(h, 4, H - 6);
    const x = clamp(sx - (w >> 1), 2, W - w - 3), y = clamp(sy - (h >> 1), 2, H - h - 3);
    // (Halls further apart: their walls are dug out a square here and there.)
    if (rooms.some((o) => { const m = type === HALLS || o.halls ? 3 : 2; return x - m < o.x + o.w && x + w + m > o.x && y - m < o.y + o.h && y + h + m > o.y; })) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), cave: isCave, type, halls: type === HALLS, collapsed: !isCave && type === COLLAPSED && rng.chance(S.collapse) });
  }
  if (rooms.length < Math.max(3, target * 0.5)) return null;

  // Kinds of hall (the king's), each its own plan, by where it is and what
  // fits it (`hallKind`). The throne room (the biggest hall in the far third,
  // on a level with a throne) is L: a nave of columns leading to an apse
  // where the king sits. The hall most by the caverns is K: begun in
  // a cave and squared off at the other end. The smallest of the rest, when
  // there are four halls or more, is I: a storeroom. The others take turns
  // at A (columns in rows along the long way), B (a forest of columns), C
  // (round, a ring of columns, cut clean), D (a crossing), F (split by a
  // wall of rock with gaps in it) and J (dug round an uncut core), each
  // where it fits.
  const halls = rooms.filter((r) => r.halls);
  if (halls.length) {
    if (across && S.throne) {
      const far = rooms.filter((r) => r.type === to).sort((a, b) => a.cx - b.cx);
      const T0 = [...far.slice(-Math.max(1, Math.ceil(far.length / 3)))].sort((a, b) => b.w * b.h - a.w * a.h)[0];
      if (T0?.halls) T0.hallKind = "L";
    }
    const caveNear = (r) => {
      let c = 0;
      for (let y = r.y - 4; y < r.y + r.h + 4; y++) for (let x = r.x - 4; x < r.x + r.w + 4; x++) if (typeAt(x, y) === CAVERN) c++;
      return c;
    };
    halls.filter((r) => !r.hallKind).map((r) => [r, caveNear(r)]).filter(([, c]) => c > 12).sort((a, b) => b[1] - a[1]).slice(0, 1).forEach(([r]) => (r.hallKind = "K"));
    const left = halls.filter((r) => !r.hallKind);
    if (halls.length >= 4 && left.length >= 2) left.sort((a, b) => a.w * a.h - b.w * b.h)[0].hallKind = "I";
    const fits = {
      A: () => true, B: () => true, F: (r) => Math.max(r.w, r.h) >= 13,
      C: (r) => Math.min(r.w, r.h) >= 11 && Math.abs(r.w - r.h) <= 4, D: (r) => Math.min(r.w, r.h) >= 13,
      J: (r) => Math.min(r.w, r.h) >= 11 && Math.max(r.w, r.h) >= 13,
    };
    // (The biggest first, and the kinds used least, those that fit fewest
    // halls before the rest.)
    const used = Object.fromEntries(Object.keys(fits).map((k) => [k, 0])), rank = { D: 0, J: 1, C: 2, F: 3, B: 4, A: 5 };
    for (const r of halls.filter((r) => !r.hallKind).sort((a, b) => b.w * b.h - a.w * a.h)) {
      const order = Object.keys(fits).map((k) => [k, used[k] + rank[k] * 0.1 + rng.next() * 0.25]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
      r.hallKind = order.find((k) => fits[k](r));
      used[r.hallKind]++;
    }
  }

  // The floor of a room reachable from its middle (within its box, and a
  // square round it), as a set of tile indices.
  const reach = (r) => {
    const got = new Set([idx(r.cx, r.cy)]), q = [[r.cx, r.cy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = idx(nx, ny);
        if (nx < r.x - 1 || ny < r.y - 1 || nx > r.x + r.w || ny > r.y + r.h || got.has(j) || !floorAt(nx, ny)) continue;
        got.add(j);
        q.push([nx, ny]);
      }
    }
    return got;
  };
  const floorIn = (r) => {
    let c = 0;
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (floorAt(x, y)) c++;
    return c;
  };

  // A hall dug out of the rock: its walls hewn unevenly, in stretches of a
  // few squares cut a square further back or left a square standing in, its
  // corners cut off; and two rows of rough columns along it, evenly spaced
  // and even about its middle, a broad aisle down the middle and narrower
  // ones along the walls. (The columns, rock a square each, are kept in
  // `hallColumns`, put back after the corridors, which may cut through.)
  const hallColumns = [];
  const hewHall = (r, ri) => {
    const open = (x, y) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
      tiles[idx(x, y)] = T.FLOOR;
      cave[idx(x, y)] = 1;
      roomOf[idx(x, y)] = ri;
    };
    const shut = (x, y) => {
      tiles[idx(x, y)] = T.ROCK;
      cave[idx(x, y)] = 1;
      roomOf[idx(x, y)] = -1;
    };
    // Each side, from corner to corner: [x, y] of its i-th square inside, and
    // the way out through the wall.
    const sides = [
      { len: r.w, at: (i) => [r.x + i, r.y], out: [0, -1] },
      { len: r.w, at: (i) => [r.x + i, r.y + r.h - 1], out: [0, 1] },
      { len: r.h, at: (i) => [r.x, r.y + i], out: [-1, 0] },
      { len: r.h, at: (i) => [r.x + r.w - 1, r.y + i], out: [1, 0] },
    ];
    for (const sd of sides)
      for (let i = 1; i < sd.len - 1; ) {
        const run = Math.min(rng.int(2, 4), sd.len - 1 - i), v = rng.next(), cut = v < 0.35 ? 1 : v < 0.65 ? -1 : 0;
        for (let k = i; k < i + run; k++) {
          const [x, y] = sd.at(k);
          if (cut > 0) open(x + sd.out[0], y + sd.out[1]);
          else if (cut < 0) shut(x, y);
        }
        i += run;
      }
    // The corners cut off: the corner square, and on a bigger hall sometimes
    // the squares beside it too.
    for (const [cx, cy, sx, sy] of [[r.x, r.y, 1, 1], [r.x + r.w - 1, r.y, -1, 1], [r.x, r.y + r.h - 1, 1, -1], [r.x + r.w - 1, r.y + r.h - 1, -1, -1]]) {
      shut(cx, cy);
      if (rng.chance(0.5)) shut(cx + sx, cy);
      if (rng.chance(0.5)) shut(cx, cy + sy);
    }
    // (Any square dug out that the corners' cutting left cut off, filled in.)
    const kept = reach(r);
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (floorAt(x, y) && !kept.has(idx(x, y))) shut(x, y);
    // The rows of columns, along the hall's longer way: as many as fit three
    // or four squares apart, two squares in from the ends at least, an even
    // spread (so they sit evenly about the middle).
    const along = r.w >= r.h, len = along ? r.w : r.h, wide = along ? r.h : r.w;
    let best = null;
    for (const step of [3, 4])
      for (let k = 2; (k - 1) * step <= len - 5; k++) {
        const span = (k - 1) * step;
        if (span % 2) continue;
        if (!best || k > best.k || (k === best.k && span > best.span)) best = { k, step, span };
      }
    if (!best) return;
    const off = wide >= 13 ? 3 : 2, start = (len - 1 - best.span) / 2;
    // (Kept for lighting it: the columns' places along it, and the middle of
    // the aisle between the rows.)
    r.nave = { along, mid: (wide - 1) / 2, us: Array.from({ length: best.k }, (_, k) => start + k * best.step) };
    for (const across of [off, wide - 1 - off])
      for (let k = 0; k < best.k; k++) {
        const u = start + k * best.step, [x, y] = along ? [r.x + u, r.y + across] : [r.x + across, r.y + u];
        shut(x, y);
        hallColumns.push(idx(x, y));
      }
  };

  // The other kinds of hall (A is hewHall's): the plan's floor (`inside`,
  // by u along the hall and v across it), the rest of the box shut; the
  // walls hewn unevenly in runs (by noise; C cut clean, its walls as built
  // ones); rock left standing in it (`cores`: walls, a core) and columns,
  // both put back after the corridors; floor cut off filled in. And where
  // its braziers go (`lamps`, squares; the throne room's either side of the
  // king's seat, `seat`), what a storeroom stacks (`stacks`).
  const hewNoise = valueNoise(rng, W, H, 2.2);
  const hewKind = (r, ri) => {
    const kind = r.hallKind ?? "A";
    if (kind === "A") return hewHall(r, ri);
    const along = r.w >= r.h, len = along ? r.w : r.h, wide = along ? r.h : r.w, mid = (wide - 1) / 2, cu = (len - 1) / 2;
    let flip = false;
    const at = (u, v) => {
      const uu = Math.round(flip ? len - 1 - u : u), vv = Math.round(v);
      return along ? [r.x + uu, r.y + vv] : [r.x + vv, r.y + uu];
    };
    // (Places along a run of n squares: as many as fit three or four apart,
    // two in from the ends at least, evenly about its middle.)
    const rows = (n) => {
      let best = null;
      for (const step of [3, 4])
        for (let k = 2; (k - 1) * step <= n - 5; k++) {
          const span = (k - 1) * step;
          if ((n - 1 - span) % 2 === 0 && (!best || k > best.k)) best = { k, step, start: (n - 1 - span) / 2 };
        }
      return best ? Array.from({ length: best.k }, (_, i) => best.start + i * best.step) : [Math.floor((n - 1) / 2)];
    };
    const off = wide >= 13 ? 3 : 2;
    let inside = () => true, rough = 0.8, cut = false;
    const cols = [], cores = [], lamps = [];
    if (kind === "B") {
      for (const u of rows(len)) for (const v of rows(wide)) cols.push([u, v]);
      lamps.push(...(len >= 15 ? [[Math.round(len / 3), mid], [Math.round((2 * len) / 3) - 1, mid]] : [[cu, mid]]));
    } else if (kind === "C") {
      cut = true;
      rough = 0;
      inside = (u, v) => ((u - cu) / (len / 2)) ** 2 + ((v - mid) / (wide / 2)) ** 2 < 0.97;
      for (let k = 0; k < 8; k++) cols.push([cu + Math.cos((k * Math.PI) / 4) * len * 0.29, mid + Math.sin((k * Math.PI) / 4) * wide * 0.29]);
      lamps.push([cu, mid]);
    } else if (kind === "D") {
      rough = 0.5;
      inside = (u, v) => Math.abs(u - cu) <= 3 || Math.abs(v - mid) <= 3;
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) cols.push([cu + a, mid + b]);
      for (const s of [-1, 1]) {
        if (len >= 15) cols.push([cu + s * 6, mid - 2], [cu + s * 6, mid + 2]);
        if (wide >= 15) cols.push([cu - 2, mid + s * 6], [cu + 2, mid + s * 6]);
      }
      lamps.push([cu, mid]);
    } else if (kind === "F") {
      rough = 0.7;
      const gaps = [0.25, 0.5, 0.75].map((t) => Math.round(t * (len - 1)));
      for (let u = 0; u < len; u++) {
        if (gaps.some((g) => u === g || u === g + 1)) continue;
        cores.push([u, mid]);
        if (hewNoise(...at(u, mid + 1)) > 0.5 && wide >= 11) cores.push([u, mid + 1]);
      }
      lamps.push([Math.round(len * 0.375), Math.round(mid / 2)], [Math.round(len * 0.625), Math.round(mid + 1 + (wide - mid - 1) / 2)]);
    } else if (kind === "J") {
      for (let u = 3; u <= len - 4; u++)
        for (let v = 3; v <= wide - 4; v++) {
          const t = hewNoise(...at(u, v)), edge = u === 3 || u === len - 4 || v === 3 || v === wide - 4;
          if (!edge || t > 0.3) cores.push([u, v]);
        }
      lamps.push([cu, 1], [cu, wide - 2]);
    } else if (kind === "I") {
      rough = 0.7;
      r.stacks = [];
      for (let u = 1; u + 2 <= len - 2; u += 4) for (let v = 1; v + 1 <= wide - 2; v += 3) r.stacks.push({ squares: [0, 1, 2].flatMap((du) => [0, 1].map((dv) => at(u + du, v + dv))) });
    } else if (kind === "K") {
      // (The cave end toward the caverns.)
      const cavernBy = (u0, u1) => {
        let c = 0;
        for (let u = u0; u <= u1; u++) for (let v = -3; v < wide + 3; v++) if (typeAt(...at(u, v)) === CAVERN) c++;
        return c;
      };
      flip = cavernBy(len - 4, len + 3) > cavernBy(-4, 3);
      const h0 = Math.floor(len * 0.45);
      rough = 0.35;
      inside = (u) => u >= h0;
      for (const u of rows(len - h0).map((u) => u + h0)) cols.push([u, off], [u, wide - 1 - off]);
      lamps.push([Math.round((h0 + len - 1) / 2), mid]);
    } else if (kind === "L") {
      // (The apse at the end toward the level's edge.)
      flip = along ? r.cx < W / 2 : r.cy < H / 2;
      const ar = Math.max(3, Math.floor((wide - 1) / 2) - 1), un = len - 1 - ar;
      rough = 0.45;
      inside = (u, v) => u <= un || Math.hypot(u - un, v - mid) < ar + 0.6;
      for (const u of rows(un + 1)) cols.push([u, off], [u, wide - 1 - off]);
      const us = un + Math.max(1, ar - 2);
      r.seat = (([x, y]) => ({ x, y }))(at(us, mid));
      lamps.push([us, mid - 2], [us, mid + 2]);
    }
    const sq = (list) => list.map(([u, v]) => at(u, v));
    const colSq = sq(cols), coreSq = sq(cores);
    const set = (x, y, floor) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
      tiles[idx(x, y)] = floor ? T.FLOOR : T.ROCK;
      cave[idx(x, y)] = cut ? 0 : 1;
      roomOf[idx(x, y)] = floor ? ri : -1;
    };
    for (let u = 0; u < len; u++) for (let v = 0; v < wide; v++) if (!inside(u, v)) set(...at(u, v), false);
    if (kind === "K") {
      const [x0, y0] = at(0, 0), [x1, y1] = at(Math.ceil(len * 0.6), wide - 1);
      const box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1 };
      box.cx = box.x + (box.w >> 1);
      box.cy = box.y + (box.h >> 1);
      carveCave(box, rng, (x, y) => set(x, y, true));
    }
    // Hewn unevenly (not near the columns, the rock left standing, the seat).
    const near = new Set();
    for (const [x, y] of [...colSq, ...coreSq, ...(r.seat ? [[r.seat.x, r.seat.y]] : [])]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near.add(idx(x + dx, y + dy));
    if (rough > 0) {
      const edge = [];
      for (let y = r.y - 1; y <= r.y + r.h; y++)
        for (let x = r.x - 1; x <= r.x + r.w; x++) {
          const f = floorAt(x, y);
          if (!near.has(idx(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floorAt(x + dx, y + dy) !== f)) edge.push([x, y, f]);
        }
      for (const [x, y, f] of edge) {
        const t = hewNoise(x, y);
        if (f && t < 0.3 * rough) set(x, y, false);
        else if (!f && t > 1 - 0.3 * rough) set(x, y, true);
      }
    } else for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) cave[idx(x, y)] = 0;
    for (const [x, y] of [...coreSq, ...colSq]) {
      set(x, y, false);
      hallColumns.push(idx(x, y));
    }
    // (Floor cut off from the most of it, filled in.)
    const parts = [], seen = new Set();
    for (let y = r.y - 1; y <= r.y + r.h; y++)
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (!floorAt(x, y) || seen.has(idx(x, y))) continue;
        const part = [idx(x, y)], q = [[x, y]];
        seen.add(idx(x, y));
        while (q.length) {
          const [px, py] = q.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = px + dx, ny = py + dy;
            if (nx < r.x - 1 || ny < r.y - 1 || nx > r.x + r.w || ny > r.y + r.h || !floorAt(nx, ny) || seen.has(idx(nx, ny))) continue;
            seen.add(idx(nx, ny));
            part.push(idx(nx, ny));
            q.push([nx, ny]);
          }
        }
        parts.push(part);
      }
    parts.sort((a, b) => b.length - a.length);
    for (const part of parts.slice(1)) for (const j of part) set(j % W, Math.floor(j / W), false);
    r.lamps = sq(lamps);
  };

  const fine = valueNoise(rng, W, H, 2.5);
  // (Each square carved for a room is that room's: `roomOf`, the room's
  // index, -1 for none.)
  const roomOf = new Int16Array(n).fill(-1);
  for (const [ri, r] of rooms.entries()) {
    if (r.cave) {
      carveCave(r, rng, (x, y) => {
        tiles[idx(x, y)] = T.FLOOR;
        cave[idx(x, y)] = 1;
        roomOf[idx(x, y)] = ri;
      });
      // Rock formations in a big cave: small clumps of rock (walled like the
      // cave) where the floor all round is open, kept only if the cave's
      // floor stays in one piece.
      const size = floorIn(r);
      if (size < 40) continue;
      const count = Math.round((S.formations * size) / 30 * rng.range(0.6, 1.4));
      for (let f = 0, tries = 0; f < count && tries < count * 10; tries++) {
        const fx = rng.int(r.x + 1, r.x + r.w - 2), fy = rng.int(r.y + 1, r.y + r.h - 2);
        if (Math.max(Math.abs(fx - r.cx), Math.abs(fy - r.cy)) < 2) continue;
        const clump = [[fx, fy]], want = rng.int(1, Math.max(1, Math.round(S.formationSize)));
        for (let g = 0; g < want * 4 && clump.length < want; g++) {
          const [bx, by] = rng.pick(clump), [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
          const nx = bx + dx, ny = by + dy;
          if (!clump.some(([ax, ay]) => ax === nx && ay === ny) && Math.max(Math.abs(nx - r.cx), Math.abs(ny - r.cy)) >= 2) clump.push([nx, ny]);
        }
        // Open floor all round it.
        const ok = clump.every(([cx, cy]) => {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!floorAt(cx + dx, cy + dy) && !clump.some(([ax, ay]) => ax === cx + dx && ay === cy + dy)) return false;
          return true;
        });
        if (!ok) continue;
        for (const [cx, cy] of clump) tiles[idx(cx, cy)] = T.ROCK;
        if (reach(r).size !== floorIn(r)) {
          for (const [cx, cy] of clump) tiles[idx(cx, cy)] = T.FLOOR;
          continue;
        }
        f++;
      }
    } else {
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          tiles[idx(x, y)] = T.FLOOR;
          roomOf[idx(x, y)] = ri;
          // (A hall's walls hewn roughly, as a cave's.)
          if (r.halls) cave[idx(x, y)] = 1;
        }
      if (r.halls) {
        hewKind(r, ri);
        continue;
      }
      if (!r.collapsed) continue;
      // Fallen in from a corner or a side: a ragged blob of rock (its edge,
      // and the walls about it, ragged like a cave's), leaving the middle;
      // floor cut off by it is buried too.
      const corners = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]], [ux, uy] = rng.pick(corners);
      const ex = r.x + ux * r.w, ey = r.y + uy * r.h, rad = Math.min(r.w, r.h) * rng.range(0.5, 0.85);
      for (let y = r.y - 2; y < r.y + r.h + 2; y++)
        for (let x = r.x - 2; x < r.x + r.w + 2; x++) {
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
          const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey) / rad + (fine(x, y) - 0.5) * 0.7;
          if (d >= 1) continue;
          cave[idx(x, y)] = 1;
          if (Math.max(Math.abs(x - r.cx), Math.abs(y - r.cy)) > 1) tiles[idx(x, y)] = T.ROCK;
        }
      const kept = reach(r);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!kept.has(idx(x, y))) tiles[idx(x, y)] = T.ROCK;
      // Rubble on the floor near what fell.
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          if (!floorAt(x, y)) continue;
          let near = false;
          for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) near = !floorAt(x + dx, y + dy) && cave[idx(x + dx, y + dy)] === 1;
          if (near && rng.chance(S.rubble)) rubble[idx(x, y)] = rng.int(1, 3);
        }
    }
  }

  // Corridors. In built ground, straight: along one axis, then the other. In
  // caverns, winding (mostly toward the far end, now and then aside) and
  // as wide as the passage width, wandering. In collapsed ground, straight
  // but here and there fallen in, with rubble.
  const width = valueNoise(rng, W, H, 6);
  const dig = (x, y, t) => {
    tiles[idx(x, y)] = T.FLOOR;
    if (t === HALLS) {
      // (Wide hewn passages: two squares, rough.)
      cave[idx(x, y)] = 1;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < W - 1 && ny < H - 1 && typeAt(nx, ny) === HALLS) {
          tiles[idx(nx, ny)] = T.FLOOR;
          cave[idx(nx, ny)] = 1;
        }
      }
    } else if (t === CAVERN) {
      cave[idx(x, y)] = 1;
      const r = Math.max(0, (S.passage * (0.4 + 1.2 * width(x, y)) - 1) / 2);
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const nx = x + dx, ny = y + dy;
          if (dx * dx + dy * dy > r * r + 0.25 || nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || typeAt(nx, ny) === DUNGEON) continue;
          tiles[idx(nx, ny)] = T.FLOOR;
          cave[idx(nx, ny)] = 1;
        }
    } else if (t === COLLAPSED) {
      if (rng.chance(0.08)) {
        // A fall: the corridor caved out a little, rubble about.
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || !rng.chance(0.5)) continue;
          tiles[idx(nx, ny)] = T.FLOOR;
          cave[idx(nx, ny)] = 1;
          if (rng.chance(S.rubble)) rubble[idx(nx, ny)] = rng.int(1, 3);
        }
        cave[idx(x, y)] = 1;
      }
      if (rng.chance(S.rubble * 0.3)) rubble[idx(x, y)] = Math.max(rubble[idx(x, y)], rng.int(1, 2));
    }
  };
  const connect = (a, b) => {
    let x = a.cx, y = a.cy;
    const across = rng.chance(0.5);
    // Where a cavern passage heads: points along a bend from a to b (one bow
    // to the side, at least two squares, and each point jittered), then b.
    const len = Math.hypot(b.cx - a.cx, b.cy - a.cy), px = -(b.cy - a.cy) / (len || 1), py = (b.cx - a.cx) / (len || 1);
    const bow = (rng.chance(0.5) ? 1 : -1) * Math.max(2, rng.range(0.1, 0.35) * len), ways = [];
    for (let i = 1, m = Math.max(2, Math.round(len / 4)); i < m; i++) {
      const t = i / m, off = bow * Math.sin(Math.PI * t) + rng.range(-1.5, 1.5);
      ways.push([clamp(Math.round(a.cx + (b.cx - a.cx) * t + px * off), 2, W - 3), clamp(Math.round(a.cy + (b.cy - a.cy) * t + py * off), 2, H - 3)]);
    }
    ways.push([b.cx, b.cy]);
    for (let step = 0; step < 4 * (W + H) && (x !== b.cx || y !== b.cy); step++) {
      const t = typeAt(x, y);
      // (Points nearly reached, or already passed along the way, are done.)
      while (ways.length > 1 && (Math.hypot(ways[0][0] - x, ways[0][1] - y) < 2 || (ways[0][0] - x) * (b.cx - a.cx) + (ways[0][1] - y) * (b.cy - a.cy) < 0)) ways.shift();
      let dx = Math.sign(b.cx - x), dy = Math.sign(b.cy - y);
      if (t === CAVERN) {
        // Toward the next point, across or down in proportion to how far
        // each way it is (so slanting stretches slant), now and then aside.
        const [wx, wy] = ways[0], ax = Math.abs(wx - x), ay = Math.abs(wy - y);
        dx = Math.sign(wx - x);
        dy = Math.sign(wy - y);
        if (dx && dy) {
          if (rng.next() < ax / (ax + ay)) dy = 0;
          else dx = 0;
        }
        if (rng.chance(0.12)) [dx, dy] = dx ? [0, rng.chance(0.5) ? 1 : -1] : [rng.chance(0.5) ? 1 : -1, 0];
      } else if (across ? dx : !dy) dy = 0;
      else dx = 0;
      x = clamp(x + dx, 1, W - 2);
      y = clamp(y + dy, 1, H - 2);
      dig(x, y, t);
    }
    // (Should winding not get there, straight the rest of the way.)
    while (x !== b.cx) dig((x += Math.sign(b.cx - x)), y, typeAt(x, y) === CAVERN ? DUNGEON : typeAt(x, y));
    while (y !== b.cy) dig(x, (y += Math.sign(b.cy - y)), typeAt(x, y) === CAVERN ? DUNGEON : typeAt(x, y));
  };
  const dist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
  // Prim's tree over the rooms' middles keeps corridors short and the level
  // connected; then a few loops.
  const inTree = new Set([0]);
  while (inTree.size < rooms.length) {
    let best = null;
    for (const i of inTree)
      for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(rooms[i], rooms[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    connect(rooms[best.i], rooms[best.j]);
    inTree.add(best.j);
  }
  for (let k = Math.round(S.loops * rooms.length); k > 0; k--) {
    const a = rng.pick(rooms);
    const near = rooms.filter((r) => r !== a).sort((p, q) => dist(a, p) - dist(a, q));
    connect(a, near[rng.int(1, Math.min(2, near.length - 1))]);
  }
  // More ways round. Walking distances (eight ways, no cutting a corner of
  // rock) from a square; which rooms are joined directly (by one run of
  // corridor, or touching), and how many ways into each.
  const walkFrom = (from) => {
    const d = new Int32Array(n).fill(-1), q = new Int32Array(n);
    let h = 0, t = 0;
    d[from] = 0;
    q[t++] = from;
    while (h < t) {
      const k = q[h++], x = k % W, y = (k / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, m = ny * W + nx;
          if ((!dx && !dy) || !floorAt(nx, ny) || d[m] >= 0 || (dx && dy && (!floorAt(nx, y) || !floorAt(x, ny)))) continue;
          d[m] = d[k] + 1;
          q[t++] = m;
        }
    }
    return d;
  };
  const links = () => {
    const comp = new Int32Array(n).fill(-1);
    let id = 0;
    for (let j = 0; j < n; j++) {
      if (tiles[j] !== T.FLOOR || roomOf[j] >= 0 || comp[j] >= 0) continue;
      const q = [j];
      comp[j] = id;
      while (q.length) {
        const k = q.pop(), x = k % W, y = (k / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const m = (y + dy) * W + x + dx;
          if (!floorAt(x + dx, y + dy) || roomOf[m] >= 0 || comp[m] >= 0) continue;
          comp[m] = id;
          q.push(m);
        }
      }
      id++;
    }
    const touch = rooms.map(() => new Set());
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const ri = roomOf[idx(x, y)];
        if (ri < 0 || !floorAt(x, y)) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const m = idx(x + dx, y + dy);
          if (comp[m] >= 0) touch[ri].add(`c${comp[m]}`);
          else if (roomOf[m] >= 0 && roomOf[m] !== ri && floorAt(x + dx, y + dy)) touch[ri].add(`r${roomOf[m]}`);
        }
      }
    return { ways: touch.map((s) => s.size), linked: (a, b) => touch[a].has(`r${b}`) || [...touch[a]].some((k) => k[0] === "c" && touch[b].has(k)) };
  };
  // (A room's floor square nearest its middle.)
  const middleOf = (ri) => {
    const r = rooms[ri];
    let best = null;
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const d = Math.abs(x - r.cx) + Math.abs(y - r.cy);
        if (floorAt(x, y) && roomOf[idx(x, y)] === ri && (!best || d < best.d)) best = { j: idx(x, y), d };
      }
    return best?.j;
  };
  // Long loops: of each room's four nearest, those it is at least two and a
  // half times as far from on foot as as the crow flies (and not joined to
  // already), the worst first, rooms with one way in before the rest; each
  // dug as a corridor between them.
  for (let k = 0; k < S.longLoops; k++) {
    const L = links(), mids = rooms.map((_, ri) => middleOf(ri));
    let best = null;
    for (const [ai, a] of rooms.entries()) {
      if (mids[ai] === undefined) continue;
      const d = walkFrom(mids[ai]);
      const near = rooms.map((b, bi) => ({ bi, s: Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) })).filter((o) => o.bi !== ai).sort((p, q) => p.s - q.s).slice(0, 4);
      for (const { bi, s } of near) {
        if (mids[bi] === undefined || L.linked(ai, bi)) continue;
        const w = d[mids[bi]];
        if (w >= 0 && w < 2.5 * s) continue;
        const score = (w < 0 ? 99 : w / s) + (L.ways[ai] === 1 || L.ways[bi] === 1 ? 2 : 0);
        if (!best || score > best.score) best = { ai, bi, score };
      }
    }
    if (!best) break;
    connect(rooms[best.ai], rooms[best.bi]);
  }
  // Shortcuts: straight runs of rock, eight squares at most and walled
  // along both sides, between floors (not of one room: not through a
  // column) at least 24 steps and four times the run apart on foot; the
  // most worthwhile dug first (as the ground there is), each changing what
  // the next is worth.
  for (let k = 0; k < S.shortcuts; k++) {
    const cand = [];
    for (let y = 2; y < H - 2; y++)
      for (let x = 2; x < W - 2; x++) {
        if (!floorAt(x, y)) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          let len = 0, ok = true, ex = x + dx, ey = y + dy;
          while (ex > 1 && ey > 1 && ex < W - 2 && ey < H - 2 && !floorAt(ex, ey) && len <= 8) {
            if (floorAt(ex + dy, ey + dx) || floorAt(ex - dy, ey - dx)) { ok = false; break; }
            len++;
            ex += dx;
            ey += dy;
          }
          if (!ok || len < 1 || len > 8 || !floorAt(ex, ey)) continue;
          const a = roomOf[idx(x, y)], b = roomOf[idx(ex, ey)];
          if (a >= 0 && a === b) continue;
          cand.push({ x, y, dx, dy, len });
        }
      }
    rng.shuffle(cand);
    const cache = new Map();
    let best = null;
    for (const c of cand.slice(0, 2500)) {
      const from = idx(c.x, c.y);
      if (!cache.has(from)) cache.set(from, walkFrom(from));
      const d = cache.get(from)[idx(c.x + c.dx * (c.len + 1), c.y + c.dy * (c.len + 1))];
      if (d >= 0 && (d < 24 || d < 4 * (c.len + 1))) continue;
      const gain = d < 0 ? 1e6 : d - c.len - 1;
      if (!best || gain > best.gain) best = { ...c, gain };
    }
    if (!best) break;
    for (let i = 1; i <= best.len; i++) {
      const x = best.x + best.dx * i, y = best.y + best.dy * i;
      dig(x, y, typeAt(x, y));
    }
  }
  // (The halls' columns, where corridors cut through them, put back.)
  for (const j of hallColumns) tiles[j] = T.ROCK;
  // Rubble and grit strewn on cave floors, more along the walls.
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const j = idx(x, y);
      if (tiles[j] !== T.FLOOR || !cave[j]) continue;
      let wall = false;
      for (let dy = -1; dy <= 1 && !wall; dy++) for (let dx = -1; dx <= 1 && !wall; dx++) wall = !floorAt(x + dx, y + dy);
      if (rng.chance(S.caveRubble * (wall ? 0.8 : 0.3))) rubble[j] = Math.max(rubble[j], wall ? rng.int(1, 3) : 1);
    }
  // No rubble where the floor isn't.
  for (let j = 0; j < n; j++) if (tiles[j] !== T.FLOOR) rubble[j] = 0;

  // Furnishing the clean dungeon rooms (built, in a dungeon region, not
  // fallen in): each of a kind, with what goes with it (pillars, niches and
  // cells cut into the rock round it, furniture), and now and then rows of
  // shallow recesses in its walls. Each thing is { type, x, y, ... } in
  // squares (x, y its middle). Furniture is only drawn; columns (pillars
  // filling a square) are rock; posts (pillars on a grid crossing) only
  // block a step diagonally past them.
  const features = [], posts = [], recesses = [], mustDoor = new Set(), niches = new Set(), roomLights = [];
  // A room's sides: its squares just outside the wall (v 0) and on into the
  // rock (v 1, 2, ...; v -1 is the floor just inside), u along the side;
  // and the way into the room from there.
  const SIDES = [
    { at: (r, u, v) => [r.x + u, r.y - 1 - v], len: (r) => r.w, into: [0, 1] },
    { at: (r, u, v) => [r.x + u, r.y + r.h + v], len: (r) => r.w, into: [0, -1] },
    { at: (r, u, v) => [r.x - 1 - v, r.y + u], len: (r) => r.h, into: [1, 0] },
    { at: (r, u, v) => [r.x + r.w + v, r.y + u], len: (r) => r.h, into: [-1, 0] },
  ];
  // Rock all over u0..u1, v0..v1 of a side, inside the level's edge.
  const solid = (r, sd, u0, u1, v0, v1) => {
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const [x, y] = sd.at(r, u, v);
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || tiles[idx(x, y)] !== T.ROCK) return false;
      }
    return true;
  };
  const hollow = (r, sd, u, v) => {
    const [x, y] = sd.at(r, u, v);
    tiles[idx(x, y)] = T.FLOOR;
    roomOf[idx(x, y)] = rooms.indexOf(r);
  };
  // The middle of a side's square (u and v may be fractions).
  const mid = (r, sd, u, v) => {
    const [x, y] = sd.at(r, u, v);
    return [x + 0.5, y + 0.5];
  };
  // Width and height (in squares) from the lengths along a side (a) and
  // across it (b).
  const wh = (sd, a, b) => (sd.into[0] ? { w: b, h: a } : { w: a, h: b });
  const thing = (x, y, size) =>
    features.push(rng.chance(0.6) ? { type: "crate", x, y, s: size, rot: rng.range(-0.25, 0.25) } : { type: "barrel", x, y, r: size * 0.5 });
  // One thing in the square at (x, y), or two smaller ones.
  const stuff = (x, y) => {
    if (rng.chance(0.3)) {
      thing(x + rng.range(0.27, 0.33), y + rng.range(0.27, 0.38), rng.range(0.38, 0.44));
      thing(x + rng.range(0.67, 0.73), y + rng.range(0.62, 0.73), rng.range(0.38, 0.44));
    } else thing(x + 0.5 + rng.range(-0.06, 0.06), y + 0.5 + rng.range(-0.06, 0.06), rng.range(0.58, 0.72));
  };
  const KINDS = ["plain", "store", "gallery", "hall", "crypt", "jail", "barracks", "dining", "shrine"];
  const lo = (r) => Math.min(r.w, r.h), hi = (r) => Math.max(r.w, r.h);
  // Where each kind fits.
  const fits = {
    plain: () => true, store: () => true, crypt: () => true,
    gallery: (r) => lo(r) >= 4 && hi(r) >= 6 && hi(r) % 2 === 0,
    hall: (r) => lo(r) >= 4 && r.w % 2 === 0 && r.h % 2 === 0,
    jail: (r) => hi(r) >= 5,
    barracks: (r) => lo(r) >= 4 && hi(r) >= 5,
    dining: (r) => lo(r) >= 3 && hi(r) >= 4,
    shrine: (r) => lo(r) >= 4,
  };
  for (const r of rooms) {
    if (r.cave || r.collapsed || r.type !== DUNGEON) continue;
    const inRoom = (x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    // Kept clear: the floor just inside each way in (and the sides with one).
    const used = new Set(), open = new Set();
    SIDES.forEach((sd, si) => {
      for (let u = 0; u < sd.len(r); u++) {
        const [x, y] = sd.at(r, u, 0);
        if (!floorAt(x, y)) continue;
        open.add(si);
        const ix = x + sd.into[0], iy = y + sd.into[1];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inRoom(ix + dx, iy + dy)) used.add(idx(ix + dx, iy + dy));
      }
    });
    const free = (x, y) => inRoom(x, y) && !used.has(idx(x, y));
    const take = (x, y) => used.add(idx(x, y));
    const shape = rng.chance(0.6) ? "round" : "square";
    // A post on the grid crossing (x, y); a column filling the square (x, y),
    // if it is free: rock, walled and hatched like the rest.
    const post = (x, y) => {
      features.push({ type: "post", x, y, shape });
      posts.push([x, y]);
      for (const [px, py] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) take(px, py);
    };
    const column = (x, y) => {
      if (!free(x, y)) return false;
      tiles[idx(x, y)] = T.ROCK;
      take(x, y);
      return true;
    };
    // Things in the free squares along the walls, nearest the corners first,
    // up to `count`.
    const corners = (count) => {
      const spots = [];
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
          if (!edge || !free(x, y)) continue;
          const d = Math.min(x - r.x, r.x + r.w - 1 - x) + Math.min(y - r.y, r.y + r.h - 1 - y);
          spots.push([d + rng.range(0, 2.5), x, y]);
        }
      spots.sort((a, b) => a[0] - b[0]);
      for (const [, x, y] of spots.slice(0, count)) {
        stuff(x, y);
        take(x, y);
      }
    };
    // Evenly spaced places `pitch` apart along a length, centred: the first
    // and how many, each `size` long.
    const spread = (length, size, pitch) => {
      const n = Math.max(0, Math.floor((length - size) / pitch) + 1);
      return [Math.floor((length - (pitch * (n - 1) + size)) / 2), n];
    };
    const weights = KINDS.map((k) => (fits[k](r) ? Math.max(0, S[k]) : 0)), total = weights.reduce((a, b) => a + b, 0);
    let pick = rng.next() * total, kind = "plain";
    if (total > 0) kind = KINDS[Math.max(0, weights.findIndex((w) => (pick -= w) < 0))];
    r.kind = kind;
    const across = r.w >= r.h; // (the room's long way is across)
    // A square of the room by its place along the long way (a) and across it (b).
    const at = (a, b) => (across ? [r.x + a, r.y + b] : [r.x + b, r.y + a]);
    const A = across ? r.w : r.h, B = across ? r.h : r.w;
    const longSides = SIDES.filter((sd) => (sd.into[0] === 0) === across);
    // Columns holding up a big room (seven squares or more each way, not
    // already pillared), before anything else goes in: a few, set evenly
    // about its middle, four a third of the way in from the walls (and two
    // more in the middle of a long one), all or none.
    // (A room to be lit (see below) has them more often: their shadows are
    // somewhere to sneak.)
    const lightIt = rng.chance(S.litRooms);
    if (lo(r) >= 7 && kind !== "hall" && kind !== "gallery" && rng.chance(lightIt ? 0.85 : S.supports)) {
      const ia = Math.max(2, Math.round(A * 0.28)), ib = Math.max(2, Math.round(B * 0.28));
      const as = [ia, A - 1 - ia], bs = [...new Set([ib, B - 1 - ib])];
      if (A % 2 === 1 && A >= 2 * B - 1 && A >= 11) as.push((A - 1) / 2);
      const sq = as.flatMap((a) => bs.map((b) => at(a, b)));
      if (sq.every((p) => free(...p))) for (const p of sq) column(...p);
    }
    if (kind === "store") {
      // Shelves along a wall or two (the longest free stretch of each, up to
      // four squares), and things in the corners.
      for (const sd of rng.shuffle([...SIDES]).slice(0, rng.int(1, 2))) {
        let best = null;
        for (let u = 0, run = 0; u <= sd.len(r); u++) {
          const [x, y] = u < sd.len(r) ? sd.at(r, u, -1) : [-1, -1];
          if (u < sd.len(r) && free(x, y)) run++;
          else {
            if (run >= 2 && (!best || run > best[1])) best = [u - run, run];
            run = 0;
          }
        }
        if (!best) continue;
        const n = Math.min(4, best[1]), u0 = best[0] + Math.floor((best[1] - n) / 2), [x, y] = mid(r, sd, u0 + (n - 1) / 2, -1);
        features.push({ type: "shelf", x: x - sd.into[0] * 0.22, y: y - sd.into[1] * 0.22, ...wh(sd, n - 0.15, 0.48), n });
        for (let u = u0; u < u0 + n; u++) take(...sd.at(r, u, -1));
      }
      corners(Math.round(r.w * r.h * (0.08 + 0.2 * S.decor)));
    } else if (kind === "plain") {
      if (rng.chance(S.decor * 0.7)) corners(rng.int(1, 3));
    } else if (kind === "gallery") {
      // Posts along both long walls, a square in from them, on every other
      // crossing (the long way being even, they sit evenly).
      for (let a = 2; a <= A - 2; a += 2) for (const b of [1, B - 1]) post(...at(a, b));
      if (rng.chance(S.decor * 0.5)) corners(rng.int(1, 2));
    } else if (kind === "hall") {
      // Filled with posts (the room being even each way): on every other
      // crossing right across it, and half posts on the walls in step with
      // them (where the wall is whole).
      for (let y = r.y + 2; y <= r.y + r.h - 2; y += 2) for (let x = r.x + 2; x <= r.x + r.w - 2; x += 2) post(x, y);
      r.halfPosts = true;
      for (const sd of SIDES)
        for (let u = 2; u < sd.len(r); u += 2) {
          // (The crossing between squares u - 1 and u of the wall.)
          if (!solid(r, sd, u - 1, u, 0, 0)) continue;
          const [ax, ay] = mid(r, sd, u - 1, -1), [bx, by] = mid(r, sd, u, -1);
          features.push({ type: "post", x: (ax + bx) / 2 - sd.into[0] * 0.5, y: (ay + by) / 2 - sd.into[1] * 0.5, shape });
        }
    } else if (kind === "crypt") {
      // Niches two deep cut every other square round the walls, each with a
      // coffin; a sarcophagus in the middle of a bigger crypt.
      for (const sd of SIDES)
        for (let u = 1; u < sd.len(r) - 1; u += 2) {
          if (!solid(r, sd, u - 1, u + 1, 0, 2)) continue;
          hollow(r, sd, u, 0);
          hollow(r, sd, u, 1);
          niches.add(sd.at(r, u, 0).join());
          const [x, y] = mid(r, sd, u, 0.5);
          features.push({ type: "coffin", x, y, ...wh(sd, 0.66, 1.6), hx: -sd.into[0], hy: -sd.into[1] });
        }
      if (lo(r) >= 5) features.push({ type: "sarcophagus", x: r.x + r.w / 2, y: r.y + r.h / 2, ...(across ? { w: 2.1, h: 1.05 } : { w: 1.05, h: 2.1 }) });
    } else if (kind === "jail") {
      // Cells two by two cut behind a wall (or more), each through a doorway
      // with a door, a bench against its back wall.
      let cells = 0;
      for (const sd of rng.shuffle([...SIDES])) {
        if (cells >= 2) break;
        const cw = 2, cd = 2;
        for (let u = 0; u + cw - 1 < sd.len(r); u += cw + 1) {
          if (!solid(r, sd, u - 1, u + cw, 0, cd + 1)) continue;
          const du = u + rng.int(0, cw - 1);
          hollow(r, sd, du, 0);
          mustDoor.add(sd.at(r, du, 0).join());
          for (let v = 1; v <= cd; v++) for (let a = u; a < u + cw; a++) hollow(r, sd, a, v);
          const [x, y] = mid(r, sd, u + (cw - 1) / 2, cd);
          features.push({ type: "bench", x: x - sd.into[0] * 0.27, y: y - sd.into[1] * 0.27, ...wh(sd, cw - 0.45, 0.4) });
          cells++;
        }
      }
      if (rng.chance(S.decor)) corners(rng.int(1, 2));
    } else if (kind === "barracks") {
      // Beds in a row along each long wall (one, in a narrow room), every
      // other square, heads to the wall, the rows matching.
      const [a0, n] = spread(A, 1, 2);
      for (const sd of B >= 5 ? longSides : [rng.pick(longSides)])
        for (let i = 0; i < n; i++) {
          const u = a0 + 2 * i, [x1, y1] = sd.at(r, u, -1), [x2, y2] = sd.at(r, u, -2);
          if (!free(x1, y1) || !free(x2, y2)) continue;
          take(x1, y1);
          take(x2, y2);
          const [x, y] = mid(r, sd, u, -1.5);
          features.push({ type: "bed", x: x - sd.into[0] * 0.1, y: y - sd.into[1] * 0.1, ...wh(sd, 0.74, 1.62), hx: -sd.into[0], hy: -sd.into[1] });
        }
      if (rng.chance(S.decor)) corners(rng.int(1, 2));
    } else if (kind === "dining") {
      // Tables two squares long, chairs either side, in rows with room to
      // walk between them.
      const [a0, na] = spread(A - 2, 2, 3), [b0, nb] = spread(B - 2, 1, 3);
      for (let i = 0; i < na; i++)
        for (let k = 0; k < nb; k++) {
          const a = 1 + a0 + 3 * i, b = 1 + b0 + 3 * k, t1 = at(a, b), t2 = at(a + 1, b);
          if (!free(...t1) || !free(...t2)) continue;
          take(...t1);
          take(...t2);
          const [cx, cy] = at(a + 1, b + 0.5);
          features.push({ type: "table", x: cx, y: cy, ...(across ? { w: 1.75, h: 0.9 } : { w: 0.9, h: 1.75 }) });
          for (const t of [a, a + 1])
            for (const side of [-1, 1]) {
              const c = at(t, b + side);
              if (!free(...c) || !rng.chance(0.85)) continue;
              const [x, y] = at(t + 0.5, b + 0.5 + side * 0.78);
              features.push({ type: "chair", x, y, s: 0.36, hx: across ? 0 : side, hy: across ? side : 0 });
            }
        }
      if (rng.chance(S.decor)) corners(rng.int(1, 3));
    } else if (kind === "shrine") {
      // An altar against a wall with no way in, pillars either side of it two
      // squares off.
      const closed = SIDES.filter((sd, si) => !open.has(si)), sd = closed.length ? rng.pick(closed) : rng.pick(SIDES);
      const L = sd.len(r), [ax, ay] = mid(r, sd, (L - 1) / 2, -1);
      features.push({ type: "altar", x: ax - sd.into[0] * 0.12, y: ay - sd.into[1] * 0.12, ...wh(sd, 1.7, 0.75) });
      for (const [x, y] of [sd.at(r, Math.round((L - 1) / 2 - 2), -1), sd.at(r, Math.round((L - 1) / 2 + 2), -1)]) take(x, y);
      if (L >= 6) {
        const along = [-sd.into[1], sd.into[0]];
        for (const side of [-1, 1]) post(Math.round(ax + sd.into[0] * 0.5 + along[0] * side * 2), Math.round(ay + sd.into[1] * 0.5 + along[1] * side * 2));
      }
    }
    // Lit rooms, lit by lights of their own that suit them, set so the
    // columns, posts and big furniture throw shadows to sneak in.
    if (lightIt) {
      const before = roomLights.length;
      // A brazier on a free square (in the way), the nearest free one to the
      // place (a, b) along and across the room.
      const brazier = (a, b) => {
        let bestSq = null;
        for (let y = r.y; y < r.y + r.h; y++)
          for (let x = r.x; x < r.x + r.w; x++) {
            if (!free(x, y) || !floorAt(x, y)) continue;
            const [px, py] = at(a, b), d = Math.hypot(x - px, y - py);
            if (d <= 1.5 && (!bestSq || d < bestSq.d)) bestSq = { x, y, d };
          }
        if (!bestSq) return;
        take(bestSq.x, bestSq.y);
        roomLights.push({ x: bestSq.x + 0.5, y: bestSq.y + 0.5, kind: "brazier", block: idx(bestSq.x, bestSq.y) });
        features.push({ type: "brazier", x: bestSq.x + 0.5, y: bestSq.y + 0.5 });
      };
      if (kind === "shrine") {
        // Candles on the altar (which then throws no shadow of its own).
        const altar = features.findLast((f) => f.type === "altar");
        if (altar) {
          altar.holds = true;
          const along = altar.w > altar.h, flames = [-0.55, 0, 0.55].map((t) => (along ? [t, 0] : [0, t]));
          roomLights.push({ x: altar.x, y: altar.y, kind: "candles", flames });
          features.push({ type: "candles", x: altar.x, y: altar.y, flames });
        }
      } else if (kind === "crypt") {
        // A brazier at one end of the long way (the sarcophagus throwing its
        // shadow on toward the other); in the middle of a small crypt.
        if (lo(r) >= 5) brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
        else brazier((A - 1) / 2, (B - 1) / 2);
      } else if (kind === "dining" || kind === "barracks") {
        // A brazier at one end of a dining hall (the tables throwing their
        // shadows down the room), of a barracks (between the rows of beds).
        // (Hearths are set aside for now: see BACKLOG.md.)
        brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
      } else if (kind === "gallery") {
        // Braziers down the middle, between the rows of posts.
        const [a0, n] = spread(A, 1, 5);
        for (let i = 0; i < n; i++) brazier(a0 + 5 * i, (B - 1) / 2);
      } else {
        // In the middle (any columns round it throwing shadows out to the
        // corners); in a long room, two, a third of the way from each end.
        if (A >= 10) {
          brazier(Math.round((A - 1) / 3), (B - 1) / 2);
          brazier(Math.round((2 * (A - 1)) / 3), (B - 1) / 2);
        } else brazier((A - 1) / 2, (B - 1) / 2);
      }
      if (roomLights.length > before) r.lit = true;
    }
    // Recesses: rows of shallow alcoves (a fifth of a square deep) along a
    // wall or two, evenly spaced, clear of the ways in.
    if (kind !== "crypt" && !r.halfPosts && rng.chance(S.recesses)) {
      const pitch = rng.pick([2, 3]), wide = rng.range(0.45, 0.65);
      for (const sd of rng.chance(0.5) ? longSides : [rng.pick(SIDES)]) {
        const [u0, n] = spread(sd.len(r) - 2, 1, pitch);
        for (let i = 0; i < n; i++) {
          const u = 1 + u0 + pitch * i;
          if (!solid(r, sd, u - 1, u + 1, 0, 0)) continue;
          const [x, y] = sd.at(r, u, -1);
          recesses.push({ x, y, dx: -sd.into[0], dy: -sd.into[1], w: wide });
        }
      }
    }
  }

  // Doors: only into clean dungeon rooms (built, in a dungeon region, not
  // fallen in), where the way in is one square wide, walled on both sides
  // (just outside the room, the way in going into it), and that square and
  // the walls beside it are plain built ground: no rubble, nothing caved.
  const doors = [];
  const plain = (x, y) => area[idx(x, y)] === DUNGEON && !cave[idx(x, y)] && !rubble[idx(x, y)];
  for (const r of rooms) {
    if (r.cave || r.collapsed || r.type !== DUNGEON) continue;
    const ways = [];
    for (let x = r.x; x < r.x + r.w; x++) ways.push([x, r.y - 1, 0, 1], [x, r.y + r.h, 0, -1]);
    for (let y = r.y; y < r.y + r.h; y++) ways.push([r.x - 1, y, 1, 0], [r.x + r.w, y, -1, 0]);
    for (const [x, y, dx, dy] of ways) {
      // (A way in: floor on both sides of the wall's square; not a niche.)
      if (!floorAt(x, y) || !floorAt(x + dx, y + dy) || !floorAt(x - dx, y - dy) || niches.has([x, y].join())) continue;
      // Walled to either side, along the wall.
      if (floorAt(x + dy, y + dx) || floorAt(x - dy, y - dx)) continue;
      if (!plain(x, y) || !plain(x + dy, y + dx) || !plain(x - dy, y - dx)) continue;
      // (Every cell of a jail has its door.)
      if (mustDoor.has([x, y].join()) || rng.chance(S.doors)) doors.push({ x, y, dx, dy, open: rng.chance(S.openDoors) });
    }
  }

  // Lights: campfires in big caves, in the middle of open floor (each
  // { x, y, kind: "fire" } in squares, and a thing drawn; the fire's square
  // is in the way: `blocks`); and lit places, some dungeon rooms and
  // stretches of dungeon corridor, lit throughout (`lit`, a square each).
  // Braziers down the middle of a hall, between the rows of its columns: in
  // line with every other column (the middle one among them), so each
  // brazier lights the aisle and the columns beside it throw stripes of
  // shadow across the side aisles.
  // (`flank`: either side of its middle, for the throne room, where the king
  // stands.)
  const hallBraziers = (r, flank = false) => {
    // (A hall of another kind than A: its braziers where its plan puts them,
    // on the free floor square nearest each.)
    if (r.lamps) {
      if (r.lit) return;
      for (const [lx, ly] of r.lamps) {
        let spot = null;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const x = lx + dx, y = ly + dy, d = Math.abs(dx) + Math.abs(dy);
            if (floorAt(x, y) && !blocks.has(idx(x, y)) && !(r.seat && r.seat.x === x && r.seat.y === y) && (!spot || d < spot.d)) spot = { x, y, d };
          }
        if (!spot) continue;
        blocks.add(idx(spot.x, spot.y));
        rubble[idx(spot.x, spot.y)] = 0;
        lights.push({ x: spot.x + 0.5, y: spot.y + 0.5, kind: "brazier" });
        features.push({ type: "brazier", x: spot.x + 0.5, y: spot.y + 0.5 });
        r.lit = true;
      }
      return;
    }
    const N = r.nave;
    if (!N || r.lit) return;
    const K = N.us.length, m = (K - 1) / 2;
    const pick = K % 2 ? N.us.filter((_, i) => Math.abs(i - m) % 2 === (flank ? 1 : 0)) : K === 2 ? (flank ? N.us : [(N.us[0] + N.us[1]) / 2]) : [N.us[K / 2 - 1], N.us[K / 2]];
    for (const u of pick) {
      const a = Math.round(u), b = Math.round(N.mid), [x, y] = N.along ? [r.x + a, r.y + b] : [r.x + b, r.y + a];
      if (!floorAt(x, y) || blocks.has(idx(x, y))) continue;
      blocks.add(idx(x, y));
      rubble[idx(x, y)] = 0;
      lights.push({ x: x + 0.5, y: y + 0.5, kind: "brazier" });
      features.push({ type: "brazier", x: x + 0.5, y: y + 0.5 });
      r.lit = true;
    }
  };
  // Rock formations set round a cave's campfire (at (fx, fy)) to throw
  // shadows the player can creep along: a few small clumps two to four
  // squares from it, each kept only if it makes the darkest way across the
  // cave (from one way in to another) or up to the fire (to a dark square
  // beside the camp) darker; until each is lit for a square at most. The
  // light as the game reckons it: what the fire lights in its full and dim
  // bands, in line of sight.
  const shadowLanes = (r, fx, fy) => {
    const F = LIGHTS.fire, far = F.full + F.dim;
    const x0 = r.x - 1, y0 = r.y - 1, bw = r.w + 2, bh = r.h + 2, inBox = (x, y) => x >= x0 && y >= y0 && x < x0 + bw && y < y0 + bh;
    const k = (x, y) => (y - y0) * bw + (x - x0);
    const fire = idx(fx, fy);
    // The ways in: floor on the box's edge with floor beyond it, a square
    // from each stretch.
    const ways = [], onWay = new Set();
    for (let y = y0; y < y0 + bh; y++)
      for (let x = x0; x < x0 + bw; x++) {
        if (x !== x0 && y !== y0 && x !== x0 + bw - 1 && y !== y0 + bh - 1) continue;
        if (!floorAt(x, y)) continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inBox(x + dx, y + dy) && floorAt(x + dx, y + dy))) continue;
        onWay.add(idx(x, y));
        if (!ways.some(([wx, wy]) => Math.max(Math.abs(wx - x), Math.abs(wy - y)) <= 2)) ways.push([x, y]);
      }
    if (!ways.length) return;
    const litNow = () => {
      const L = new Uint8Array(bw * bh);
      computeFov(W, H, fx, fy, far, (x, y) => !floorAt(x, y), (x, y) => { if (inBox(x, y)) L[k(x, y)] = 1; });
      return L;
    };
    // The fewest lit squares on a way from `from` to any of `to` (a test on
    // squares), stepping as the player does (diagonals too), round the fire.
    const darkest = (L, from, to) => {
      const cost = new Int16Array(bw * bh).fill(9999), q = [[from[0], from[1]]];
      cost[k(...from)] = L[k(...from)];
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i], c = cost[k(x, y)];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if ((!dx && !dy) || !inBox(nx, ny) || !floorAt(nx, ny) || idx(nx, ny) === fire) continue;
            const nc = c + L[k(nx, ny)];
            if (nc < cost[k(nx, ny)]) {
              cost[k(nx, ny)] = nc;
              q.push([nx, ny]);
            }
          }
      }
      let best = 9999;
      for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (to(x, y, L)) best = Math.min(best, cost[k(x, y)]);
      return best;
    };
    const score = () => {
      const L = litNow();
      // (Across: the best way between two ways in, if there are two.)
      let across = 0;
      if (ways.length > 1) {
        across = 9999;
        for (let i = 0; i < ways.length; i++) for (let j = i + 1; j < ways.length; j++) across = Math.min(across, darkest(L, ways[i], (x, y) => x === ways[j][0] && y === ways[j][1]));
      }
      // (Up to the fire: to a dark square no more than three from it.)
      let up = 9999;
      for (const w of ways) up = Math.min(up, darkest(L, w, (x, y, L) => !L[k(x, y)] && Math.hypot(x - fx, y - fy) <= 3));
      return Math.max(0, across - 1) + Math.max(0, up - 1);
    };
    let now = score();
    for (let placed = 0; placed < 4 && now > 0; placed++) {
      let best = null;
      for (let t = 0; t < 40; t++) {
        const a = rng.range(0, 2 * Math.PI), d = rng.range(2, 3.8), cx = Math.round(fx + Math.cos(a) * d), cy = Math.round(fy + Math.sin(a) * d);
        const clump = [[cx, cy]], want = rng.int(1, 3);
        for (let g = 0; g < want * 4 && clump.length < want; g++) {
          const [bx, by] = rng.pick(clump), [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
          if (!clump.some(([ax, ay]) => ax === bx + dx && ay === by + dy)) clump.push([bx + dx, by + dy]);
        }
        // Standing free: floor all round, clear of the fire and the ways in.
        const ok = clump.every(([x, y]) => {
          if (!inBox(x, y) || Math.max(Math.abs(x - fx), Math.abs(y - fy)) < 2 || onWay.has(idx(x, y))) return false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!floorAt(x + dx, y + dy) && !clump.some(([ax, ay]) => ax === x + dx && ay === y + dy)) return false;
          return true;
        });
        if (!ok) continue;
        for (const [x, y] of clump) tiles[idx(x, y)] = T.ROCK;
        const v = reach(r).size === floorIn(r) ? score() : Infinity;
        for (const [x, y] of clump) tiles[idx(x, y)] = T.FLOOR;
        if (v < now && (!best || v < best.v)) best = { v, clump };
      }
      if (!best) break;
      for (const [x, y] of best.clump) {
        tiles[idx(x, y)] = T.ROCK;
        rubble[idx(x, y)] = 0;
      }
      now = best.v;
    }
  };
  const lights = [], blocks = new Set(), lit = new Uint8Array(n), doorAt = new Set(doors.map((d) => idx(d.x, d.y)));
  for (const r of rooms) {
    if (!r.cave || !rng.chance(S.campfires)) continue;
    let best = null;
    for (let y = r.y + 1; y < r.y + r.h - 1; y++)
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        let open = true;
        for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1 && open; dx++) open = floorAt(x + dx, y + dy);
        const d = Math.hypot(x - r.cx, y - r.cy);
        if (open && (!best || d < best.d)) best = { x, y, d };
      }
    if (!best || best.d > 3) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) rubble[idx(best.x + dx, best.y + dy)] = 0;
    blocks.add(idx(best.x, best.y));
    r.campfire = true;
    lights.push({ x: best.x + 0.5, y: best.y + 0.5, kind: "fire" });
    features.push({ type: "campfire", x: best.x + 0.5, y: best.y + 0.5 });
    shadowLanes(r, best.x, best.y);
  }
  // The dungeon rooms' lights (see the furnishing).
  for (const l of roomLights) {
    if (l.block !== undefined) blocks.add(l.block);
    lights.push({ x: l.x, y: l.y, kind: l.kind, ...(l.flames ? { flames: l.flames } : {}) });
  }
  // Braziers down the middle of some of the king's halls (and the throne
  // room's, when it is chosen).
  // A storeroom's stacks: a crate or a barrel on most squares of each.
  for (const r of rooms)
    for (const st of r.stacks ?? [])
      for (const [x, y] of st.squares) {
        if (!floorAt(x, y) || rng.chance(0.15)) continue;
        rubble[idx(x, y)] = 0;
        const fx = x + 0.5 + rng.range(-0.05, 0.05), fy = y + 0.5 + rng.range(-0.05, 0.05), size = rng.range(0.7, 0.82);
        features.push(rng.chance(0.6) ? { type: "crate", x: fx, y: fy, s: size, rot: rng.range(-0.2, 0.2) } : { type: "barrel", x: fx, y: fy, r: size * 0.48 });
      }
  for (const r of rooms) if (r.halls && !r.stacks && rng.chance(S.litHalls)) hallBraziers(r);
  const inRoom = (x, y) => rooms.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
  const corridor = (x, y) => floorAt(x, y) && area[idx(x, y)] === DUNGEON && !cave[idx(x, y)] && !inRoom(x, y);
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      if (!corridor(x, y) || lit[idx(x, y)] || !rng.chance(S.litCorridors)) continue;
      // (A stretch of up to eight squares along the corridor.)
      const q = [[x, y]];
      lit[idx(x, y)] = 1;
      for (let i = 0, want = rng.int(4, 8); i < q.length && q.length < want; i++)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = q[i][0] + dx, ny = q[i][1] + dy;
          if (q.length >= want || !corridor(nx, ny) || lit[idx(nx, ny)]) continue;
          lit[idx(nx, ny)] = 1;
          q.push([nx, ny]);
        }
    }

  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]);
  // (The player starts in a built room: a dungeon's if there is one. On a
  // level changing across, in the leftmost room of its first kind (built if
  // it can), the stairs down in the rightmost of the other, the throne room
  // the biggest hall on the far side.)
  const built = rooms.filter((r) => !r.cave && !r.collapsed), dungeonRooms = built.filter((r) => r.type === DUNGEON);
  let startRoom = rng.pick(dungeonRooms.length ? dungeonRooms : built.length ? built : rooms), downRoom = null, throneRoom = null;
  if (across) {
    const byX = (list) => [...list].sort((a, b) => a.cx - b.cx);
    const first = rooms.filter((r) => r.type === from), firm = first.filter((r) => !r.collapsed && r.cx < W * 0.4);
    startRoom = byX(firm.length ? firm : first.length ? first : rooms)[0];
    const far = byX(rooms.filter((r) => r.type === to && r !== startRoom));
    if (S.throne) throneRoom = rooms.find((r) => r.hallKind === "L") ?? [...far.slice(-Math.max(1, Math.ceil(far.length / 3)))].sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? null;
    if (S.down) downRoom = byX(far.filter((r) => r !== throneRoom && !r.collapsed)).at(-1) ?? byX(rooms.filter((r) => r !== startRoom)).at(-1);
  }
  // The stairs: in the middle of their rooms, on floor, drawn and kept clear.
  const stairsAt = (r) => {
    let best = null;
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!floorAt(x, y) || blocks.has(idx(x, y))) continue;
        const d = Math.hypot(x - r.cx, y - r.cy);
        if (!best || d < best.d) best = { x, y, d };
      }
    return best && { x: best.x, y: best.y };
  };
  const stairsUp = across && S.up ? stairsAt(startRoom) : null, stairsDown = downRoom ? stairsAt(downRoom) : null;
  // (The throne room lit: braziers down its middle, either side of where the
  // king stands; any it had already taken away.)
  if (throneRoom) {
    const T0 = throneRoom, inT = (o) => o.x >= T0.x && o.y >= T0.y && o.x < T0.x + T0.w && o.y < T0.y + T0.h;
    for (const list of [lights, features]) for (let i = list.length - 1; i >= 0; i--) if ((list[i].kind ?? list[i].type) === "brazier" && inT(list[i])) list.splice(i, 1);
    for (const j of [...blocks]) if (inT({ x: j % W, y: Math.floor(j / W) }) && !lights.some((l) => idx(Math.floor(l.x), Math.floor(l.y)) === j)) blocks.delete(j);
    T0.lit = false;
    hallBraziers(T0, true);
  }
  for (const [st, dir] of [[stairsUp, "up"], [stairsDown, "down"]]) {
    if (!st) continue;
    for (let i = features.length - 1; i >= 0; i--) if (features[i].type !== "post" && Math.abs(features[i].x - st.x - 0.5) < 1 && Math.abs(features[i].y - st.y - 0.5) < 1) features.splice(i, 1);
    rubble[idx(st.x, st.y)] = 0;
    features.push({ type: "stairs", dir, x: st.x + 0.5, y: st.y + 0.5 });
  }
  // Secret doors: their squares rock until found (each { x, y, dx, dy }, as
  // a door).
  const secrets = [], inStart = (x, y) => x >= startRoom.x && y >= startRoom.y && x < startRoom.x + startRoom.w && y < startRoom.y + startRoom.h;
  for (const d of [...doors]) {
    if (mustDoor.has([d.x, d.y].join()) || inStart(d.x + d.dx, d.y + d.dy) || inStart(d.x - d.dx, d.y - d.dy) || !rng.chance(S.secretDoors)) continue;
    doors.splice(doors.indexOf(d), 1);
    tiles[idx(d.x, d.y)] = T.ROCK;
    lit[idx(d.x, d.y)] = 0;
    secrets.push({ x: d.x, y: d.y, dx: d.dx, dy: d.dy });
  }
  // Which room each square is part of: its floor (`roomOf`; corridors and
  // passages, none: -1), and the rock bordering it, its walls, columns and
  // formations among them (`wallOf`: the room of the floor next to it).
  const wallOf = new Int16Array(n).fill(-1);
  for (let j = 0; j < n; j++) if (tiles[j] !== T.FLOOR) roomOf[j] = -1;
  for (const d of doors) roomOf[idx(d.x, d.y)] = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tiles[idx(x, y)] === T.FLOOR) continue;
      for (let k = 0; k < 9 && wallOf[idx(x, y)] < 0; k++) {
        const nx = x + (k % 3) - 1, ny = y + ((k / 3) | 0) - 1;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) wallOf[idx(x, y)] = roomOf[idx(nx, ny)];
      }
    }
  return {
    w: W, h: H, tiles, cave, rooms, roomOf, wallOf, area, rubble, doors, secrets, features, posts, recesses, lights, lit, blocks, regions,
    start: stairsUp ?? { x: startRoom.cx, y: startRoom.cy },
    startRoom, stairsUp, stairsDown, throneRoom,
    idx, get,
  };
}
