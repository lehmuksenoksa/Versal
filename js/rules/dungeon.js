// Map generation: rooms (rectangular, or irregular caves) joined by corridors.

export const T = {
  ROCK: 0,
  FLOOR: 1,
};

export const isOpen = (t) => t !== T.ROCK;
export const isWalkable = (t) => t === T.FLOOR;

export const DIRS8 = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
  [1, -1], [1, 1], [-1, 1], [-1, -1],
];

// The level's size in squares. Room counts and the like scale with its area
// (they were set for 64 by 44).
export const LEVEL = { w: 96, h: 64 };

export function generateLevel(rng) {
  const { w: W, h: H } = LEVEL;
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = tryGenerate(W, H, rng);
    if (level) return level;
  }
  throw new Error("dungeon generation failed");
}

function tryGenerate(W, H, rng) {
  const tiles = new Uint8Array(W * H);
  const cave = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const rooms = [];

  const per = (W * H) / (64 * 44), more = (n) => Math.round(n * per);
  const target = more(rng.int(10, 14));
  for (let tries = 0; tries < more(600) && rooms.length < target; tries++) {
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
  if (rooms.length < more(7)) return null;

  for (const r of rooms) {
    if (r.cave) carveCave(r, rng, (x, y) => { tiles[idx(x, y)] = T.FLOOR; cave[idx(x, y)] = 1; });
    else
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) tiles[idx(x, y)] = T.FLOOR;
  }

  const carve = (x, y) => {
    tiles[idx(x, y)] = T.FLOOR;
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
  for (let k = more(rng.int(2, 4)); k > 0; k--) {
    const a = rng.pick(rooms);
    const near = rooms.filter((r) => r !== a).sort((p, q) => dist(a, p) - dist(a, q));
    connect(a, near[rng.int(1, Math.min(2, near.length - 1))]);
  }

  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]);
  const startRoom = rng.pick(rooms);
  const level = {
    w: W, h: H, tiles, cave, rooms,
    start: { x: startRoom.cx, y: startRoom.cy },
    startRoom,
    idx, get,
  };
  return level;
}

// A cave: a noisy ellipse inside the room's box, smoothed by a cellular
// automaton pass and trimmed to the part connected to its centre.
export function carveCave(r, rng, setFloor) {
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
