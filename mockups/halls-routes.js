// Routes through a level, for the halls mockup (mockups/halls.html): how
// loopy a generated level is, and a prototype of adding ways round
// (shortcuts dug where two places close through the rock are far apart on
// foot). Works on a level from levelgen.js, in place; no DOM, so it runs in
// node too (the measuring script in the scratchpad).
import { T } from "../js/dungeon.js";
import { AREAS } from "../js/levelgen.js";

const DUNGEON = AREAS.indexOf("dungeon"), CAVERN = AREAS.indexOf("cavern"), HALLS = AREAS.indexOf("halls");
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Squares one can walk (secret doors counted: found, they are ways).
function passable(L) {
  const W = L.w, pass = new Uint8Array(W * L.h);
  for (let j = 0; j < pass.length; j++) pass[j] = L.tiles[j] === T.FLOOR ? 1 : 0;
  for (const s of L.secrets ?? []) pass[s.y * W + s.x] = 1;
  return pass;
}

// The rooms and the passages between them as a graph: a node for each room,
// one for each run of corridor (floor in no room); an edge where they touch.
// Then: independent loops (edges - nodes + parts), the rooms on a loop (an
// edge that isn't a bridge), dead ends (one way in), and how many bridges
// lie between the start and the goal (chokepoints: no way round).
export function measure(L, goalRoom = L.throneRoom ?? L.rooms.find((r) => L.stairsDown && L.stairsDown.x >= r.x && L.stairsDown.y >= r.y && L.stairsDown.x < r.x + r.w && L.stairsDown.y < r.y + r.h)) {
  const W = L.w, H = L.h, n = W * H, pass = passable(L), R = L.rooms.length;
  const node = new Int32Array(n).fill(-1);
  for (let j = 0; j < n; j++) if (pass[j] && L.roomOf[j] >= 0) node[j] = L.roomOf[j];
  let next = R;
  for (let j = 0; j < n; j++) {
    if (!pass[j] || node[j] >= 0) continue;
    const id = next++, q = [j];
    node[j] = id;
    while (q.length) {
      const k = q.pop(), x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, m = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !pass[m] || node[m] >= 0 || L.roomOf[m] >= 0) continue;
        node[m] = id;
        q.push(m);
      }
    }
  }
  const V = next, adj = Array.from({ length: V }, () => new Set());
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = node[y * W + x];
      if (a < 0) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= W || ny >= H) continue;
        const b = node[ny * W + nx];
        if (b >= 0 && b !== a) { adj[a].add(b); adj[b].add(a); }
      }
    }
  // (Rooms with no floor left aren't counted.)
  const live = Array.from({ length: V }, (_, v) => adj[v].size > 0 || v >= R);
  let E = 0;
  for (const s of adj) E += s.size;
  E /= 2;
  // Bridges (Tarjan), and the parts.
  const tin = new Int32Array(V).fill(-1), low = new Int32Array(V), bridges = new Set();
  let timer = 0, parts = 0;
  for (let s = 0; s < V; s++) {
    if (tin[s] >= 0 || !live[s]) continue;
    parts++;
    const stack = [[s, -1, [...adj[s]], 0]];
    tin[s] = low[s] = timer++;
    while (stack.length) {
      const top = stack[stack.length - 1], [v, p, nb] = top;
      if (top[3] < nb.length) {
        const u = nb[top[3]++];
        if (u === p) continue;
        if (tin[u] >= 0) low[v] = Math.min(low[v], tin[u]);
        else { tin[u] = low[u] = timer++; stack.push([u, v, [...adj[u]], 0]); }
      } else {
        stack.pop();
        if (p >= 0) {
          low[p] = Math.min(low[p], low[v]);
          if (low[v] > tin[p]) bridges.add(`${Math.min(p, v)},${Math.max(p, v)}`);
        }
      }
    }
  }
  const isBridge = (a, b) => bridges.has(`${Math.min(a, b)},${Math.max(a, b)}`);
  const rooms = [...Array(R).keys()].filter((r) => adj[r].size > 0);
  const onLoop = rooms.filter((r) => [...adj[r]].some((u) => !isBridge(r, u))).length;
  const deadEnds = rooms.filter((r) => adj[r].size === 1).length;
  // Chokepoints from start to goal: bridges on the (only) way through the
  // tree of 2-edge-connected parts.
  let chokes = null;
  const si = L.rooms.indexOf(L.startRoom), gi = goalRoom ? L.rooms.indexOf(goalRoom) : -1;
  if (si >= 0 && gi >= 0) {
    // BFS counting bridges crossed, 0-1 BFS.
    const d = new Int32Array(V).fill(1e9), dq = [si];
    d[si] = 0;
    while (dq.length) {
      const v = dq.shift();
      for (const u of adj[v]) {
        const c = d[v] + (isBridge(v, u) ? 1 : 0);
        if (c < d[u]) { d[u] = c; isBridge(v, u) ? dq.push(u) : dq.unshift(u); }
      }
    }
    chokes = d[gi];
  }
  // Rooms one must pass through to get from start to goal (no way round).
  let forced = null;
  if (si >= 0 && gi >= 0) {
    const reaches = (skip) => {
      const seen = new Uint8Array(V), q = [si];
      seen[si] = 1;
      while (q.length) {
        const v = q.pop();
        if (v === gi) return true;
        for (const u of adj[v]) if (u !== skip && !seen[u]) { seen[u] = 1; q.push(u); }
      }
      return false;
    };
    forced = rooms.filter((r) => r !== si && r !== gi && !reaches(r)).length;
  }
  return { rooms: rooms.length, loops: E - V + parts, onLoop: onLoop / rooms.length, deadEnds, chokes, forced };
}

// Walking distances from (x, y), eight ways.
function walk(pass, W, H, from) {
  const d = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
  let h = 0, t = 0;
  d[from] = 0;
  q[t++] = from;
  while (h < t) {
    const k = q[h++], x = k % W, y = (k / W) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, m = ny * W + nx;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H || d[m] >= 0 || !pass[m]) continue;
        // (No cutting a corner of rock.)
        if (dx && dy && (!pass[y * W + nx] || !pass[ny * W + x])) continue;
        d[m] = d[k] + 1;
        q[t++] = m;
      }
  }
  return d;
}

// Shortcuts: straight runs of rock, `maxLen` squares at most, between two
// floors that are at least `minWalk` steps apart on foot (and `ratio` times
// the run): the most worthwhile dug first, up to `count`, each one changing
// what the next is worth. Dug as the ground there is: a corridor with a door
// into a dungeon room (`secret` of them secret), a winding crawl in caverns,
// two squares wide in the halls. Returns the runs dug.
export function addShortcuts(L, rng, { count = 5, maxLen = 5, minWalk = 28, ratio = 5, secret = 0.3, kinds = null } = {}) {
  const W = L.w, H = L.h, dug = [];
  const roomAt = (j) => L.roomOf[j];
  for (let c = 0; c < count; c++) {
    const pass = passable(L), cand = [];
    for (let y = 2; y < H - 2; y++)
      for (let x = 2; x < W - 2; x++) {
        if (!pass[y * W + x]) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          // A run of rock from beside (x, y), walled along both sides.
          let len = 0, ok = true, ex = x + dx, ey = y + dy;
          while (ex > 1 && ey > 1 && ex < W - 2 && ey < H - 2 && !pass[ey * W + ex] && len <= maxLen) {
            if (pass[(ey + dx) * W + ex + dy] || pass[(ey - dx) * W + ex - dy]) { ok = false; break; }
            len++; ex += dx; ey += dy;
          }
          if (!ok || len < 1 || len > maxLen || !pass[ey * W + ex]) continue;
          // (Not through a hall's column or a cave's formation: both sides
          // must be different places, not one room.)
          const a = roomAt(y * W + x), b = roomAt(ey * W + ex);
          if (a >= 0 && a === b) continue;
          const area = L.area[(y + dy) * W + x + dx];
          if (kinds && !kinds.includes(AREAS[area])) continue;
          cand.push({ x, y, dx, dy, len, ex, ey, area });
        }
      }
    rng.shuffle(cand);
    let best = null;
    // (Distances from each start square, kept: many runs start alike.)
    const cache = new Map();
    for (const k of cand.slice(0, 2500)) {
      const from = k.y * W + k.x;
      if (!cache.has(from)) cache.set(from, walk(pass, W, H, from));
      const d = cache.get(from)[k.ey * W + k.ex];
      const gain = d < 0 ? 1e6 : d - k.len - 1;
      if (d >= 0 && (d < minWalk || d < ratio * (k.len + 1))) continue;
      if (!best || gain > best.gain) best = { ...k, gain, walk: d };
    }
    if (!best) break;
    dig(L, best, rng, secret);
    dug.push(best);
  }
  return dug;
}

function dig(L, k, rng, secret) {
  const W = L.w, { x, y, dx, dy, len, area } = k;
  const sq = Array.from({ length: len }, (_, i) => [x + dx * (i + 1), y + dy * (i + 1)]);
  const roomEnd = (fx, fy) => L.roomOf[fy * W + fx];
  for (const [sx, sy] of sq) {
    const j = sy * W + sx;
    L.tiles[j] = T.FLOOR;
    L.roomOf[j] = -1;
    if (area !== DUNGEON) L.cave[j] = 1;
    if (area === HALLS) {
      // (Hewn two wide.)
      const kx = sx + dy, ky = sy + dx, m = ky * W + kx;
      if (L.tiles[m] !== T.FLOOR && kx > 1 && ky > 1 && kx < W - 2 && ky < L.h - 2) { L.tiles[m] = T.FLOOR; L.cave[m] = 1; L.roomOf[m] = -1; }
    } else if (area === CAVERN && rng.chance(0.5)) {
      // (A crawl, its sides nibbled.)
      const s = rng.chance(0.5) ? 1 : -1, kx = sx + dy * s, ky = sy + dx * s, m = ky * W + kx;
      if (rng.chance(0.35) && kx > 1 && ky > 1 && kx < W - 2 && ky < L.h - 2) { L.tiles[m] = T.FLOOR; L.cave[m] = 1; L.roomOf[m] = -1; }
    }
  }
  if (area !== DUNGEON) return;
  // A door where it meets a dungeon room (the first square of the run, by
  // the room); now and then a secret one.
  for (const [[fx, fy], [sx, sy], ddx, ddy] of [[[x, y], sq[0], -dx, -dy], [[k.ex, k.ey], sq[len - 1], dx, dy]]) {
    const r = L.rooms[roomEnd(fx, fy)];
    if (!r || r.cave || r.collapsed || r.halls) continue;
    if (rng.chance(secret)) {
      L.tiles[sy * W + sx] = T.ROCK;
      (L.secrets ??= []).push({ x: sx, y: sy, dx: ddx, dy: ddy });
      k.secret = true;
    } else L.doors.push({ x: sx, y: sy, dx: ddx, dy: ddy, open: rng.chance(0.25) });
  }
}

// Long loops: corridors between rooms close as the crow flies but far apart
// on foot (each room's four nearest), the worst first, dead ends (rooms with
// one way in) before the rest, up to `count`. Dug as the ground they cross:
// straight and a square wide in built ground, wider and rougher in caverns
// and the halls. (A hall's columns, and squares of rock standing alone in a
// room, are left standing.)
export function addLoops(L, rng, { count = 4, ratio = 2.5, deadFirst = true } = {}) {
  const W = L.w, H = L.h, made = [];
  const keep = [];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const j = y * W + x;
      if (L.tiles[j] === T.FLOOR) continue;
      const r = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => L.roomOf[(y + dy) * W + x + dx]);
      if (r[0] >= 0 && r.every((v) => v === r[0])) keep.push(j);
    }
  for (let c = 0; c < count; c++) {
    const pass = passable(L), m = measureLinks(L, pass);
    const centre = (r) => {
      // (The room's floor square nearest its middle.)
      let best = null;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (pass[y * W + x] && L.roomOf[y * W + x] === L.rooms.indexOf(r)) { const d = Math.abs(x - r.cx) + Math.abs(y - r.cy); if (!best || d < best.d) best = { x, y, d }; }
      return best;
    };
    let best = null;
    for (const [ai, a] of L.rooms.entries()) {
      const ca = centre(a);
      if (!ca) continue;
      const d = walk(pass, W, H, ca.y * W + ca.x);
      const near = L.rooms.map((b, bi) => ({ b, bi, s: Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) })).filter((o) => o.bi !== ai).sort((p, q) => p.s - q.s).slice(0, 4);
      for (const { b, bi, s } of near) {
        const cb = centre(b);
        if (!cb || m.linked(ai, bi)) continue;
        const w = d[cb.y * W + cb.x], score = (w < 0 ? 99 : w / s) + (deadFirst && (m.deg[ai] === 1 || m.deg[bi] === 1) ? 2 : 0);
        if (w >= 0 && w / s < ratio) continue;
        if (!best || score > best.score) best = { a: ca, b: cb, score, ai, bi };
      }
    }
    if (!best) break;
    corridor(L, best.a, best.b, rng);
    made.push(best);
  }
  for (const j of keep) L.tiles[j] = T.ROCK;
  return made;
}

// Which rooms are directly linked (by one run of corridor, or touching),
// and how many ways each room has.
function measureLinks(L, pass) {
  const W = L.w, H = L.h, n = W * H, comp = new Int32Array(n).fill(-1);
  let id = 0;
  for (let j = 0; j < n; j++) {
    if (!pass[j] || L.roomOf[j] >= 0 || comp[j] >= 0) continue;
    const q = [j];
    comp[j] = id;
    while (q.length) {
      const k = q.pop(), x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, m = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !pass[m] || L.roomOf[m] >= 0 || comp[m] >= 0) continue;
        comp[m] = id;
        q.push(m);
      }
    }
    id++;
  }
  const touch = L.rooms.map(() => new Set());
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const r = L.roomOf[y * W + x];
      if (r < 0 || !pass[y * W + x]) continue;
      for (const [dx, dy] of N4) {
        const m = (y + dy) * W + x + dx;
        if (comp[m] >= 0) touch[r].add(`c${comp[m]}`);
        else if (L.roomOf[m] >= 0 && L.roomOf[m] !== r && pass[m]) touch[r].add(`r${L.roomOf[m]}`);
      }
    }
  return {
    deg: touch.map((s) => s.size),
    linked: (a, b) => touch[a].has(`r${b}`) || [...touch[a]].some((k) => k[0] === "c" && touch[b].has(k)),
  };
}

// A corridor from a to b: across then down (or down then across), as the
// ground it crosses is dug.
function corridor(L, a, b, rng) {
  const W = L.w, H = L.h;
  let x = a.x, y = a.y;
  const first = rng.chance(0.5);
  const put = (px, py, cave) => {
    if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1) return;
    const j = py * W + px;
    if (L.tiles[j] !== T.FLOOR) { L.tiles[j] = T.FLOOR; L.roomOf[j] = -1; if (cave) L.cave[j] = 1; }
  };
  const step = (dx, dy) => {
    x += dx; y += dy;
    const area = L.area[y * W + x];
    if (area === HALLS) { put(x, y, 1); put(x + Math.abs(dy), y + Math.abs(dx), 1); }
    else if (area === CAVERN) {
      put(x, y, 1);
      if (rng.chance(0.6)) put(x + Math.abs(dy) * (rng.chance(0.5) ? 1 : -1), y + Math.abs(dx) * (rng.chance(0.5) ? 1 : -1), 1);
    } else put(x, y, area !== DUNGEON && rng.chance(0.1));
  };
  const legs = first ? [[Math.sign(b.x - x), 0, Math.abs(b.x - x)], [0, Math.sign(b.y - y), Math.abs(b.y - y)]] : [[0, Math.sign(b.y - y), Math.abs(b.y - y)], [Math.sign(b.x - x), 0, Math.abs(b.x - x)]];
  for (const [dx, dy, k] of legs) for (let i = 0; i < k; i++) step(dx, dy);
}
