// Level generation by areas. The level is split into a few regions, each of
// a type that sets how its rooms and corridors are made:
//   dungeon: built square rooms and straight corridors;
//   cavern: misshapen caves (the big ones with rock formations standing in
//     them) joined by winding passages of varying width;
//   collapsed: built rooms and caves mixed, some of the rooms half fallen in,
//     with rubble on their floors and along their corridors.
// A corridor changes as it crosses from one region into another.
// The level has the shape the game and the map drawing expect (see
// dungeon.js), and also `area` (each tile's region type, an index into
// AREAS), `rubble` (0 to 3 for each tile), `doors` (each { x, y, dx, dy, open }:
// a door in the tile at x, y, the dungeon room it opens into that way, shut
// or open), `features` (things drawn in the dungeon rooms: see the
// furnishing), each room's `kind`, and `regions` (their seed points and
// types).

import { T, carveCave } from "./dungeon.js";

export const AREAS = ["dungeon", "cavern", "collapsed"];
const DUNGEON = 0, CAVERN = 1, COLLAPSED = 2;

export const LEVELGEN_DEFAULTS = {
  // The level's size in squares.
  w: 96, h: 64,
  // How many regions, and how likely each type is.
  regions: 3, dungeon: 2, cavern: 2, collapsed: 1,
  // Rooms per 100 squares of level; extra corridors (making loops) per room;
  // the share of doorways into clean dungeon rooms that have a door, and of
  // those doors left open.
  density: 0.4, loops: 0.2, doors: 0.8, openDoors: 0.25,
  // Caves' size; rock formations per 30 squares of a big cave, and their
  // largest size in squares; cavern passages' width in squares.
  caveSize: 1, formations: 1.5, formationSize: 10, passage: 2,
  // Dungeon rooms: how likely each kind is (where it fits); how furnished
  // they are; how often a room has recesses in its walls.
  plain: 3, store: 1, gallery: 1, hall: 0.7, crypt: 0.7, jail: 0.7, barracks: 0.7, dining: 0.7, shrine: 0.5,
  decor: 0.6, recesses: 0.4,
  // In collapsed regions: the share of built rooms fallen in; and how much
  // rubble lies about. On cave floors, the rubble and grit (more along the
  // walls).
  collapse: 0.6, rubble: 0.5, caveRubble: 0.5,
};

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
    if (level) return level;
  }
  throw new Error("level generation failed");
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
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
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
    if (isCave) {
      w = Math.round(rng.int(7, 16) * S.caveSize);
      h = Math.round(rng.int(6, 12) * S.caveSize);
    } else {
      const big = rng.chance(0.25);
      w = big ? rng.int(9, 13) : rng.int(4, 9);
      h = big ? rng.int(7, 9) : rng.int(4, 7);
    }
    w = clamp(w, 4, W - 6);
    h = clamp(h, 4, H - 6);
    const x = clamp(sx - (w >> 1), 2, W - w - 3), y = clamp(sy - (h >> 1), 2, H - h - 3);
    if (rooms.some((o) => x - 2 < o.x + o.w && x + w + 2 > o.x && y - 2 < o.y + o.h && y + h + 2 > o.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), cave: isCave, type, collapsed: !isCave && type === COLLAPSED && rng.chance(S.collapse) });
  }
  if (rooms.length < Math.max(3, target * 0.5)) return null;

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

  const fine = valueNoise(rng, W, H, 2.5);
  for (const r of rooms) {
    if (r.cave) {
      carveCave(r, rng, (x, y) => {
        tiles[idx(x, y)] = T.FLOOR;
        cave[idx(x, y)] = 1;
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
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[idx(x, y)] = T.FLOOR;
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
    if (t === CAVERN) {
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
  // cells cut into the rock round it, furniture), and now and then recesses
  // in its walls. Only drawn: nothing here is in the way. Each thing is
  // { type, x, y, ... } in squares (x, y its middle).
  const features = [], mustDoor = new Set();
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
    features.push(rng.chance(0.6) ? { type: "crate", x, y, w: size, h: size, rot: rng.range(-0.3, 0.3) } : { type: "barrel", x, y, r: size * 0.5 });
  // One thing in the square at (x, y), or two smaller ones.
  const stuff = (x, y) => {
    if (rng.chance(0.3)) {
      thing(x + rng.range(0.25, 0.35), y + rng.range(0.25, 0.4), rng.range(0.38, 0.45));
      thing(x + rng.range(0.65, 0.75), y + rng.range(0.6, 0.75), rng.range(0.38, 0.45));
    } else thing(x + 0.5 + rng.range(-0.08, 0.08), y + 0.5 + rng.range(-0.08, 0.08), rng.range(0.55, 0.72));
  };
  const KINDS = ["plain", "store", "gallery", "hall", "crypt", "jail", "barracks", "dining", "shrine"];
  const lo = (r) => Math.min(r.w, r.h), hi = (r) => Math.max(r.w, r.h);
  // Where each kind fits.
  const fits = {
    plain: () => true, store: () => true, crypt: () => true,
    gallery: (r) => lo(r) >= 4 && hi(r) >= 6,
    hall: (r) => lo(r) >= 6,
    jail: (r) => hi(r) >= 5,
    barracks: (r) => lo(r) >= 4,
    dining: (r) => lo(r) >= 4 && hi(r) >= 6,
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
    // A pillar on the grid crossing (x, y), round or square.
    const pillar = (x, y, shape) => {
      features.push({ type: "pillar", x, y, shape });
      for (const [px, py] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) take(px, py);
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
    const weights = KINDS.map((k) => (fits[k](r) ? Math.max(0, S[k]) : 0)), total = weights.reduce((a, b) => a + b, 0);
    let pick = rng.next() * total, kind = "plain";
    if (total > 0) kind = KINDS[Math.max(0, weights.findIndex((w) => (pick -= w) < 0))];
    r.kind = kind;
    const across = r.w >= r.h; // (the room's long way is across)
    const shape = rng.chance(0.6) ? "round" : "square";
    if (kind === "store") corners(Math.round(r.w * r.h * (0.15 + 0.3 * S.decor)));
    else if (kind === "plain") {
      if (rng.chance(S.decor * 0.7)) corners(rng.int(1, 3));
    } else if (kind === "gallery") {
      // Pillars along both long walls, a square in from them, on every other
      // grid crossing.
      const L = across ? r.w : r.h, n = Math.floor((L - 2) / 2) + 1, start = 1 + Math.floor((L - 2 - 2 * (n - 1)) / 2);
      for (let i = 0; i < n; i++) {
        const a = start + 2 * i;
        if (across) {
          pillar(r.x + a, r.y + 1, shape);
          pillar(r.x + a, r.y + r.h - 1, shape);
        } else {
          pillar(r.x + 1, r.y + a, shape);
          pillar(r.x + r.w - 1, r.y + a, shape);
        }
      }
      if (rng.chance(S.decor * 0.5)) corners(rng.int(1, 2));
    } else if (kind === "hall") {
      // A grid of pillars on every other crossing, two squares in.
      for (let y = r.y + 2; y <= r.y + r.h - 2; y += 2) for (let x = r.x + 2; x <= r.x + r.w - 2; x += 2) pillar(x, y, shape);
    } else if (kind === "crypt") {
      // Niches two deep cut every other square round the walls, each with a
      // coffin; a sarcophagus in the middle of a bigger crypt.
      for (const sd of SIDES)
        for (let u = 1; u < sd.len(r) - 1; u += 2) {
          if (!solid(r, sd, u - 1, u + 1, 0, 2)) continue;
          hollow(r, sd, u, 0);
          hollow(r, sd, u, 1);
          const [x, y] = mid(r, sd, u, 0.5);
          features.push({ type: "coffin", x, y, ...wh(sd, 0.62, 1.55) });
        }
      if (lo(r) >= 5) features.push({ type: "coffin", big: true, x: r.x + r.w / 2, y: r.y + r.h / 2, ...(across ? { w: 2.1, h: 1.05 } : { w: 1.05, h: 2.1 }) });
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
          features.push({ type: "bench", x: x - sd.into[0] * 0.28, y: y - sd.into[1] * 0.28, ...wh(sd, cw - 0.5, 0.36) });
          cells++;
        }
      }
      if (rng.chance(S.decor)) corners(rng.int(1, 2));
    } else if (kind === "barracks") {
      // Beds along the long walls, their heads to the wall.
      for (const sd of SIDES) {
        if (sd.len(r) !== hi(r)) continue;
        for (let u = rng.int(0, 1); u < sd.len(r); u += 2) {
          const [x1, y1] = sd.at(r, u, -1), [x2, y2] = sd.at(r, u, -2);
          if (!free(x1, y1) || !free(x2, y2)) continue;
          take(x1, y1);
          take(x2, y2);
          const [x, y] = mid(r, sd, u, -1.5);
          features.push({ type: "bed", x, y, ...wh(sd, 0.72, 1.6), hx: -sd.into[0], hy: -sd.into[1] });
        }
      }
      if (rng.chance(S.decor)) corners(1);
    } else if (kind === "dining") {
      // A long table down the middle, benches either side.
      const L = (across ? r.w : r.h) - 4, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      features.push({ type: "table", x: cx, y: cy, ...(across ? { w: L, h: 0.95 } : { w: 0.95, h: L }) });
      for (const o of [-0.85, 0.85]) features.push({ type: "bench", x: cx + (across ? 0 : o), y: cy + (across ? o : 0), ...(across ? { w: L - 0.4, h: 0.32 } : { w: 0.32, h: L - 0.4 }) });
      if (rng.chance(S.decor)) corners(rng.int(1, 3));
    } else if (kind === "shrine") {
      // An altar against a wall with no way in, pillars either side of it,
      // two squares off, on the grid crossings a square out from the wall.
      const closed = SIDES.filter((sd, si) => !open.has(si)), sd = closed.length ? rng.pick(closed) : rng.pick(SIDES);
      const L = sd.len(r), [ax, ay] = mid(r, sd, (L - 1) / 2, -1);
      features.push({ type: "altar", x: ax - sd.into[0] * 0.12, y: ay - sd.into[1] * 0.12, ...wh(sd, 1.7, 0.75) });
      if (L >= 6) {
        const along = [-sd.into[1], sd.into[0]];
        for (const side of [-1, 1]) pillar(Math.round(ax + sd.into[0] * 0.5 + along[0] * side * 2), Math.round(ay + sd.into[1] * 0.5 + along[1] * side * 2), shape);
      }
    }
    // Recesses: shallow alcoves in the walls, one or two squares wide.
    if (kind !== "crypt" && kind !== "jail" && rng.chance(S.recesses))
      for (let t = 0, made = 0, want = rng.int(1, 3); t < 12 && made < want; t++) {
        const sd = rng.pick(SIDES), wide = rng.chance(0.3) ? 2 : 1, u = rng.int(0, sd.len(r) - wide);
        if (!solid(r, sd, u - 1, u + wide, 0, 1)) continue;
        for (let a = u; a < u + wide; a++) hollow(r, sd, a, 0);
        made++;
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
      // (A way in: floor on both sides of the wall's square; not a recess.)
      if (!floorAt(x, y) || !floorAt(x + dx, y + dy) || !floorAt(x - dx, y - dy)) continue;
      // Walled to either side, along the wall.
      if (floorAt(x + dy, y + dx) || floorAt(x - dy, y - dx)) continue;
      if (!plain(x, y) || !plain(x + dy, y + dx) || !plain(x - dy, y - dx)) continue;
      // (Every cell of a jail has its door.)
      if (mustDoor.has([x, y].join()) || rng.chance(S.doors)) doors.push({ x, y, dx, dy, open: rng.chance(S.openDoors) });
    }
  }

  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]);
  const startRoom = rng.pick(rooms);
  return {
    w: W, h: H, tiles, cave, rooms, area, rubble, doors, features, regions,
    start: { x: startRoom.cx, y: startRoom.cy },
    startRoom,
    idx, get,
  };
}
