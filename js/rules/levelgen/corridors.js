// The corridors joining the rooms, more ways round (loops, long loops,
// shortcuts), the halls' columns put back, and rubble on the cave floors.

import { T } from "../dungeon.js";
import { DUNGEON, CAVERN, COLLAPSED, HALLS, clamp, valueNoise } from "./make.js";

export function digCorridors(g) {
  const { S, rng, W, H, n, tiles, cave, rubble, roomOf, idx, floorAt, typeAt, rooms, hallColumns } = g;
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
}
