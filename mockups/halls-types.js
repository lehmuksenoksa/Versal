// Kinds of hall for the goblin king's halls, for the halls mockup
// (mockups/halls.html): each a small level of its own (one hall, a passage
// or two out of it) in the shape the map drawing takes (see maprender.js),
// drawn with the furniture the game already draws. A prototype only: the
// game's halls are made in levelgen.js (hewHall).
import { T, carveCave } from "../js/dungeon.js";
import { RNG } from "../js/rng.js";

// A little value noise (cells `cell` squares across), for hewing walls in
// runs rather than square by square.
function noise(rng, W, H, cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, g = Array.from({ length: gw * gh }, () => rng.next());
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
    const v = (i, j) => g[(j + 1) * gw + i + 1];
    return (v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx) * (1 - ty) + (v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx) * ty;
  };
}

// A small level: the hall's floor from `inside`, hewn roughly; passages out
// (`ways`: [x0, y0, x1, y1] runs, two wide); then `columns` (squares of
// rock), `cores` (squares of rock left standing, hewn rough too), features.
function build(seed, W, H, { inside, ways = [], columns = [], cores = null, features = [], cave = null, rough = 1, roughAt = () => 1, rubble = 0.5 }) {
  const rng = new RNG(seed), n = W * H, idx = (x, y) => y * W + x;
  const tiles = new Uint8Array(n), caveA = new Uint8Array(n).fill(1), rub = new Uint8Array(n);
  const keep = new Set();
  const floorAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && tiles[idx(x, y)] === T.FLOOR;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (inside(x, y)) tiles[idx(x, y)] = T.FLOOR;
  if (cave) cave(rng, (x, y) => { tiles[idx(x, y)] = T.FLOOR; });
  // Hewn unevenly, in runs: some of the wall cut back a square, some left
  // standing in.
  const nz = noise(rng, W, H, 2.2), edge = [];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const f = floorAt(x, y), side = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floorAt(x + dx, y + dy) !== f);
      if (side) edge.push([x, y, f]);
    }
  for (const [x, y, f] of edge) {
    const v = nz(x, y), k = rough * roughAt(x, y);
    if (f && v < 0.3 * k) tiles[idx(x, y)] = T.ROCK;
    else if (!f && v > 1 - 0.3 * k && x > 1 && y > 1 && x < W - 2 && y < H - 2) tiles[idx(x, y)] = T.FLOOR;
  }
  // The ways out, cut cleanly.
  for (const [x0, y0, x1, y1] of ways)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x >= 0 && y >= 0 && x < W && y < H) tiles[idx(x, y)] = T.FLOOR;
  // Uncut cores, rough-edged; columns.
  if (cores) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cores(x, y, nz(x, y))) tiles[idx(x, y)] = T.ROCK;
  for (const [x, y] of columns) { tiles[idx(x, y)] = T.ROCK; keep.add(idx(x, y)); }
  // Floor cut off from the middle of the ways filled in.
  const start = ways.length ? [ways[0][0], ways[0][1]] : [W >> 1, H >> 1], seen = new Set([idx(...start)]), q = [start];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (floorAt(x + dx, y + dy) && !seen.has(idx(x + dx, y + dy))) { seen.add(idx(x + dx, y + dy)); q.push([x + dx, y + dy]); }
  }
  for (let j = 0; j < n; j++) if (tiles[j] === T.FLOOR && !seen.has(j)) tiles[j] = T.ROCK;
  // Grit along the walls, less in the open (none under furniture).
  const under = (x, y) => features.some((f) => Math.abs(f.x - x - 0.5) < (f.w ?? 1) / 2 + 0.3 && Math.abs(f.y - y - 0.5) < (f.h ?? 1) / 2 + 0.3);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (!floorAt(x, y) || under(x, y)) continue;
      let wall = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) wall ||= !floorAt(x + dx, y + dy);
      if (rng.chance(rubble * (wall ? 0.8 : 0.3))) rub[idx(x, y)] = wall ? rng.int(1, 3) : 1;
    }
  return { w: W, h: H, tiles, cave: caveA, rubble: rub, features, recesses: [], doors: [], secrets: [], rooms: [], roomOf: new Int16Array(n).fill(-1), idx, get: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]) };
}

const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
// Rows of columns evenly about the middle of a run from a to b (inclusive),
// `step` apart, two in from the ends at least.
const spread = (a, b, step) => {
  const len = b - a + 1;
  let k = 2;
  while ((k) * step <= len - 5) k++;
  const span = (k - 1) * step, s = a + Math.round((len - 1 - span) / 2);
  return Array.from({ length: k }, (_, i) => s + i * step);
};
const bed = (x, y, hx, hy) => ({ type: "bed", x, y, w: hx ? 1.62 : 0.74, h: hx ? 0.74 : 1.62, hx, hy });

export const HALL_TYPES = [
  {
    id: "A", name: "Columned hall, standing either way",
    line: "Today's hall, but halls come tall as often as wide, and the rows follow the long way: here they run down.",
    make: (seed) => {
      const W = 17, H = 23, x0 = 3, x1 = 13, y0 = 3, y1 = 19;
      const rows = spread(y0, y1, 3), cols = [];
      for (const y of rows) cols.push([x0 + 2, y], [x1 - 2, y]);
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways: [[7, 0, 8, y0], [x1, 11, W - 1, 12]], columns: cols, rough: 0.8 });
    },
  },
  {
    id: "B", name: "Forest of columns",
    line: "A low wide hall held up by columns in a grid: many shadows, many ways round, easy to lose a goblin in.",
    make: (seed) => {
      const W = 23, H = 19, x0 = 3, x1 = 19, y0 = 3, y1 = 15, cols = [];
      for (const x of spread(x0, x1, 3)) for (const y of spread(y0, y1, 3)) cols.push([x, y]);
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways: [[0, 9, x0, 10], [x1, 4, W - 1, 5]], columns: cols });
    },
  },
  {
    id: "C", name: "Round hall, a ring of columns",
    line: "Dug round, eight columns in a ring about the middle: a moot, or where the king's guard drills.",
    make: (seed) => {
      const W = 21, H = 21, c = 10, R = 7.6, cols = [];
      for (let k = 0; k < 8; k++) cols.push([Math.round(c + 4.6 * Math.cos((k * Math.PI) / 4)), Math.round(c + 4.6 * Math.sin((k * Math.PI) / 4))]);
      return build(seed, W, H, { inside: (x, y) => Math.hypot(x - c, y - c) < R, ways: [[0, 9, 3, 10], [c, 17, c + 1, H - 1]], columns: cols, rough: 0.7 });
    },
  },
  {
    id: "D", name: "Crossing",
    line: "Two naves crossing, a column at each corner of the crossing: four ways in, four ways round.",
    make: (seed) => {
      const W = 23, H = 23, c = 11;
      const inside = (x, y) => (Math.abs(x - c) <= 3 && y >= 2 && y <= 20) || (Math.abs(y - c) <= 3 && x >= 2 && x <= 20);
      const cols = [[c - 2, c - 2], [c + 2, c - 2], [c - 2, c + 2], [c + 2, c + 2], [c - 2, 5], [c + 2, 5], [c - 2, 17], [c + 2, 17], [5, c - 2], [5, c + 2], [17, c - 2], [17, c + 2]];
      return build(seed, W, H, { inside, ways: [[0, c, 2, c + 1], [c, 20, c + 1, H - 1]], columns: cols, rough: 0.5 });
    },
  },
  {
    id: "E", name: "Gallery",
    line: "Long and narrow, one row of columns along one side, niches cut in the other: goblins on watch in them.",
    make: (seed) => {
      const W = 27, H = 13, x0 = 2, x1 = 24, y0 = 4, y1 = 8, cols = [], ways = [[0, 6, x0, 7], [x1, 6, W - 1, 7]];
      for (const x of spread(x0, x1, 3)) { cols.push([x, y0 + 1]); ways.push([x, y1 + 1, x, y1 + 1]); }
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways, columns: cols, rough: 0.6 });
    },
  },
  {
    id: "F", name: "Split hall",
    line: "Two halls side by side, a wall of uncut rock between them pierced by arches: fight, then slip through.",
    make: (seed) => {
      const W = 25, H = 19, x0 = 3, x1 = 21, y0 = 3, y1 = 15;
      return build(seed, W, H, {
        inside: box(x0, y0, x1, y1), ways: [[0, 5, x0, 6], [x1, 12, W - 1, 13]], rough: 0.7,
        cores: (x, y, v) => (y === 9 || (y === 10 && v > 0.5)) && x >= x0 && x <= x1 && ![6, 7, 12, 13, 17, 18].includes(x),
      });
    },
  },
  {
    id: "G", name: "Feasting hall",
    line: "Long tables and benches, room to brawl: the warband eats here, and wakes to anything loud.",
    make: (seed) => {
      const W = 23, H = 15, x0 = 3, x1 = 19, y0 = 3, y1 = 11, f = [];
      for (const ty of [5.5, 9.5]) {
        f.push({ type: "table", x: 11.5, y: ty, w: 11, h: 0.95 });
        f.push({ type: "bench", x: 11.5, y: ty - 0.95, w: 10, h: 0.38 }, { type: "bench", x: 11.5, y: ty + 0.95, w: 10, h: 0.38 });
      }
      f.push({ type: "table", x: 18.5, y: 7.5, w: 0.95, h: 3.6 });
      for (const y of [6.6, 8.4]) f.push({ type: "chair", x: 19.4, y, s: 0.38, hx: 1, hy: 0 });
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways: [[0, 6, x0, 7], [11, y1, 12, H - 1]], features: f, rubble: 0.3 });
    },
  },
  {
    id: "H", name: "Guardroom",
    line: "Small, close to the throne: bunks along the walls, a table in the middle, never empty.",
    make: (seed) => {
      const W = 17, H = 15, x0 = 3, x1 = 13, y0 = 3, y1 = 11, f = [];
      for (const x of [4.5, 6.5, 9.5, 11.5]) f.push(bed(x, 4.3, 0, -1), bed(x, 10.7, 0, 1));
      f.push({ type: "table", x: 8.5, y: 7.5, w: 1.75, h: 0.9 });
      for (const [x, y, hx, hy] of [[8.0, 6.6, 0, -1], [9.0, 8.4, 0, 1]]) f.push({ type: "chair", x, y, s: 0.36, hx, hy });
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways: [[0, 7, x0, 8], [x1, 7, W - 1, 8]], features: f, rough: 0.6, rubble: 0.3 });
    },
  },
  {
    id: "I", name: "Storeroom",
    line: "Stacks of crates and barrels in rows, narrow aisles between: loot, and corners to hide behind.",
    make: (seed) => {
      const W = 21, H = 17, x0 = 3, x1 = 17, y0 = 3, y1 = 13, f = [], rng = new RNG(seed ^ 77);
      for (const sx of [4, 8, 13]) for (const sy of [4, 9]) {
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) {
          if (rng.chance(0.15)) continue;
          const x = sx + dx + 0.5 + rng.range(-0.05, 0.05), y = sy + dy + 0.5 + rng.range(-0.05, 0.05), s = rng.range(0.7, 0.82);
          f.push(rng.chance(0.6) ? { type: "crate", x, y, s, rot: rng.range(-0.2, 0.2) } : { type: "barrel", x, y, r: s * 0.48 });
        }
      }
      return build(seed, W, H, { inside: box(x0, y0, x1, y1), ways: [[0, 7, x0, 8]], features: f, rough: 0.7, rubble: 0.25 });
    },
  },
  {
    id: "J", name: "Round an uncut core",
    line: "Dug round a great block of rock left standing: a loop to circle, sightlines that end at the corners.",
    make: (seed) => {
      const W = 25, H = 19, x0 = 3, x1 = 21, y0 = 3, y1 = 15;
      return build(seed, W, H, {
        inside: box(x0, y0, x1, y1), ways: [[0, 9, x0, 10], [x1, 4, W - 1, 5]],
        cores: (x, y, v) => x >= 7 + (v > 0.6) && x <= 17 - (v < 0.35) && y >= 7 + (v < 0.3) && y <= 11 - (v > 0.65),
      });
    },
  },
  {
    id: "K", name: "Half dug, half cave",
    line: "Begun in a cave and never finished: rough cave at one end, squared off and columned at the other.",
    make: (seed) => {
      const W = 27, H = 17, cols = [];
      for (const x of [16, 19, 22]) cols.push([x, 5], [x, 11]);
      return build(seed, W, H, {
        inside: box(14, 3, 24, 13), ways: [[0, 8, 3, 9], [24, 7, W - 1, 8]], columns: cols, roughAt: (x) => (x < 14 ? 1.4 : 0.35),
        cores: (x, y, v) => (Math.hypot(x - 7, y - 6) < 1.3 + v) || (Math.hypot(x - 10, y - 11) < 0.8 + v * 0.8),
        cave: (rng, put) => carveCave({ x: 2, y: 2, w: 14, h: 13, cx: 9, cy: 8 }, rng, put),
      });
    },
  },
  {
    id: "L", name: "Throne room with an apse",
    line: "A nave of columns leading to a rounded end where the king sits (the throne a drawing still to mock up).",
    make: (seed) => {
      const W = 19, H = 27, c = 9, cols = [];
      for (const y of spread(10, 22, 3)) cols.push([c - 3, y], [c + 3, y]);
      const inside = (x, y) => (Math.abs(x - c) <= 6 && y >= 9 && y <= 23) || Math.hypot(x - c, y - 9) < 4.6;
      return build(seed, W, H, { inside, ways: [[c, 23, c + 1, H - 1]], columns: cols, rough: 0.35 });
    },
  },
];
