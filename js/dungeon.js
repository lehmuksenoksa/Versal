// Map generation: rooms (rectangular, or irregular caves) joined by corridors,
// plus the furniture a Dyson-style map would show (pillars, wells, rubble).

export const T = {
  ROCK: 0,
  FLOOR: 1,
  DOOR: 2,
  PILLAR: 3,
  WELL: 5,
};

export const isOpen = (t) => t !== T.ROCK;
export const isWalkable = (t) => t === T.FLOOR || t === T.DOOR;

export const DIRS8 = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
  [1, -1], [1, 1], [-1, 1], [-1, -1],
];

export function generateLevel(rng) {
  const W = 64, H = 44;
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = tryGenerate(W, H, rng);
    if (level) return level;
  }
  throw new Error("dungeon generation failed");
}

function tryGenerate(W, H, rng) {
  const tiles = new Uint8Array(W * H);
  const corridor = new Uint8Array(W * H);
  const cave = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const rooms = [];

  const target = rng.int(10, 14);
  for (let tries = 0; tries < 600 && rooms.length < target; tries++) {
    const isCave = rng.chance(0.35);
    const big = rng.chance(0.25);
    const w = isCave ? rng.int(6, 12) : big ? rng.int(9, 13) : rng.int(4, 9);
    const h = isCave ? rng.int(5, 9) : big ? rng.int(7, 9) : rng.int(4, 7);
    const x = rng.int(2, W - w - 3);
    const y = rng.int(2, H - h - 3);
    const r = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), cave: isCave };
    const clash = rooms.some(
      (o) => x - 2 < o.x + o.w && x + w + 2 > o.x && y - 2 < o.y + o.h && y + h + 2 > o.y
    );
    if (!clash) rooms.push(r);
  }
  if (rooms.length < 7) return null;

  for (const r of rooms) {
    if (r.cave) carveCave(r, rng, (x, y) => { tiles[idx(x, y)] = T.FLOOR; cave[idx(x, y)] = 1; });
    else
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) tiles[idx(x, y)] = T.FLOOR;
  }

  const carve = (x, y) => {
    if (tiles[idx(x, y)] === T.ROCK) {
      tiles[idx(x, y)] = T.FLOOR;
      corridor[idx(x, y)] = 1;
    }
  };
  const connect = (a, b) => {
    let x = a.cx, y = a.cy;
    const horizFirst = rng.chance(0.5);
    const stepX = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); carve(x, y); } };
    const stepY = () => { while (y !== b.cy) { y += Math.sign(b.cy - y); carve(x, y); } };
    if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
  };
  const dist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);

  // Prim's MST over room centres keeps corridors short and the map connected.
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
  // A few loops so the map is not a pure tree.
  for (let k = rng.int(2, 4); k > 0; k--) {
    const a = rng.pick(rooms);
    const near = rooms.filter((r) => r !== a).sort((p, q) => dist(a, p) - dist(a, q));
    connect(a, near[rng.int(1, Math.min(2, near.length - 1))]);
  }

  // Doors where a corridor meets a room through a one-tile gap.
  const doors = new Map();
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]);
  const inAnyRoom = (x, y) =>
    rooms.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  for (const r of rooms) {
    if (r.cave) continue;
    const ring = [];
    for (let x = r.x; x < r.x + r.w; x++) ring.push([x, r.y - 1, "v"], [x, r.y + r.h, "v"]);
    for (let y = r.y; y < r.y + r.h; y++) ring.push([r.x - 1, y, "h"], [r.x + r.w, y, "h"]);
    for (const [x, y, axis] of ring) {
      if (get(x, y) !== T.FLOOR || !corridor[idx(x, y)] || inAnyRoom(x, y)) continue;
      const sideA = axis === "h" ? get(x, y - 1) : get(x - 1, y);
      const sideB = axis === "h" ? get(x, y + 1) : get(x + 1, y);
      if (sideA !== T.ROCK || sideB !== T.ROCK) continue;
      const crowded = DIRS8.some(([dx, dy]) => doors.has(idx(x + dx, y + dy)));
      if (crowded || !rng.chance(0.6)) continue;
      tiles[idx(x, y)] = T.DOOR;
      doors.set(idx(x, y), { x, y, axis, open: false });
    }
  }

  const startRoom = rng.pick(rooms);
  const level = {
    w: W, h: H, tiles, cave, rooms, doors,
    decor: [],
    start: { x: startRoom.cx, y: startRoom.cy },
    startRoom,
    idx, get,
  };
  furnish(level, rng, corridor);
  return level;
}

function furnish(level, rng, corridor) {
  const { tiles, rooms, idx } = level;
  const keepClear = new Set();
  const markClear = (x, y) => { for (const [dx, dy] of [[0, 0], ...DIRS8]) keepClear.add(idx(x + dx, y + dy)); };
  markClear(level.start.x, level.start.y);

  const tryBlock = (x, y, type) => {
    const i = idx(x, y);
    if (tiles[i] !== T.FLOOR || corridor[i] || keepClear.has(i)) return false;
    // Never block the tile just inside a doorway or corridor mouth.
    if (DIRS8.slice(0, 4).some(([dx, dy]) => corridor[idx(x + dx, y + dy)])) return false;
    tiles[i] = type;
    if (!connected(level)) { tiles[i] = T.FLOOR; return false; }
    return true;
  };

  for (const r of rooms) {
    const x0 = r.x, y0 = r.y, x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
    const roll = rng.next();
    if (r.cave) {
      r.kind = "cave";
    } else if (r.w >= 8 && r.h >= 6 && roll < 0.45) {
      r.kind = "hall";
      for (let x = x0 + 1; x <= x1 - 1; x += 2) {
        tryBlock(x, y0 + 1, T.PILLAR);
        tryBlock(x, y1 - 1, T.PILLAR);
      }
    } else if (roll < 0.6 && r.w >= 5 && r.h >= 5) {
      r.kind = "well";
      tryBlock(r.cx, r.cy, T.WELL);
    } else {
      r.kind = "plain";
    }
    // Cosmetic rubble, usually tucked into corners; caves get more of it.
    for (let k = r.cave ? rng.int(2, 4) : rng.int(0, 2); k > 0; k--) {
      const corner = !r.cave && rng.chance(0.7);
      const x = corner ? rng.pick([x0, x1]) : rng.int(x0, x1);
      const y = corner ? rng.pick([y0, y1]) : rng.int(y0, y1);
      if (tiles[idx(x, y)] === T.FLOOR) level.decor.push({ type: "rubble", x, y, seed: rng.next() });
    }
  }
  // Occasional debris in corridors.
  for (let i = 0; i < tiles.length; i++)
    if (corridor[i] && tiles[i] === T.FLOOR && rng.chance(0.02))
      level.decor.push({ type: "rubble", x: i % level.w, y: Math.floor(i / level.w), seed: rng.next(), small: true });
}

// A cave: a noisy ellipse inside the room's box, smoothed by a cellular
// automaton pass and trimmed to the part connected to its centre.
function carveCave(r, rng, setFloor) {
  const { x: X, y: Y, w, h } = r;
  let open = new Uint8Array(w * h);
  const at = (g, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
      open[y * w + x] = dx * dx + dy * dy < 1 + rng.range(-0.45, 0.35) ? 1 : 0;
    }
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += at(open, x + dx, y + dy);
        next[y * w + x] = n >= 5 ? 1 : 0;
      }
    open = next;
  }
  const cx = r.cx - X, cy = r.cy - Y;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) open[(cy + dy) * w + cx + dx] = 1;
  const seen = new Uint8Array(w * h), q = [cy * w + cx];
  seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % w, y = (q[i] / w) | 0;
    setFloor(X + x, Y + y);
    for (const [dx, dy] of DIRS8.slice(0, 4)) {
      const j = (y + dy) * w + x + dx;
      if (at(open, x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); }
    }
  }
}

export function bfs(tiles, W, H, sx, sy, passable = isWalkable) {
  const d = new Int32Array(W * H).fill(1e9);
  const q = [sy * W + sx];
  d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (d[j] <= d[i] + 1 || !passable(tiles[j])) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  return d;
}

function connected(level) {
  const { tiles, w, h } = level;
  const d = bfs(tiles, w, h, level.start.x, level.start.y);
  for (let i = 0; i < tiles.length; i++) if (isWalkable(tiles[i]) && d[i] >= 1e9) return false;
  return true;
}
