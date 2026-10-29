// Renders a level once, offscreen, in the manner of a hand-inked dungeon map:
// heavy wall lines (straight in rooms, jagged in caves), a grey shadow cast
// down and to the right of walls and pillars, bold stone hatching in the rock,
// a black floor grid, and furniture drawn in pen.

import { T, isOpen } from "./dungeon.js";
import { RNG } from "./rng.js";

export const INK = "#1b1815";
export const PAPER = "#f7f2e6";
const GRID = "rgba(27, 24, 21, 0.55)";
const SHADOW = "rgba(70, 62, 55, 0.3)";

export function renderMap(level, TS, scale, seed) {
  const { w: W, h: H } = level;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(W * TS * scale);
  canvas.height = Math.ceil(H * TS * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const rng = new RNG(seed);
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && isOpen(level.tiles[y * W + x]);

  // The outline of every open area, as closed loops through tile corners.
  const caveAt = (x, y) =>
    [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]].some(
      ([tx, ty]) => tx >= 0 && ty >= 0 && tx < W && ty < H && level.cave[ty * W + tx]
    );
  const loops = traceLoops(W, H, open).map((loop) => shapeLoop(loop, caveAt, rng, TS));
  const floor = new Path2D();
  for (const loop of loops) addLoop(floor, loop);

  drawPaper(ctx, W * TS, H * TS, rng);
  drawHatching(ctx, level, TS, rng, open);
  // Floors are painted over the hatching, which leaves it cut cleanly at the walls.
  ctx.fillStyle = PAPER;
  ctx.fill(floor, "evenodd");

  ctx.save();
  ctx.clip(floor, "evenodd");
  drawShadow(ctx, level, TS, floor);
  drawGrid(ctx, W, H, TS, rng, open);
  ctx.restore();

  drawCracks(ctx, level, TS, rng);
  drawFurniture(ctx, level, TS, rng);
  drawWalls(ctx, loops, TS, rng);
  drawRoomKeys(ctx, level, TS);

  return { canvas, ctx };
}

// A pen line with a little hand tremor. Endpoints stay exact so corners meet.
export function penLine(ctx, x1, y1, x2, y2, rng, amp = 0.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const n = Math.max(2, Math.round(len / 6));
  const p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28);
  const f1 = rng.range(0.03, 0.07), f2 = rng.range(0.12, 0.2);
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= n; i++) {
    const t = i / n, d = t * len;
    const env = Math.min(1, d / 5, (len - d) / 5);
    const off = amp * env * (0.65 * Math.sin(d * f1 + p1) + 0.35 * Math.sin(d * f2 + p2));
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
}

function penCircle(ctx, cx, cy, r, rng, amp = 0.4) {
  const n = Math.max(12, Math.round(r * 1.5));
  const p = rng.range(0, 6.28);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + amp * Math.sin(a * 3 + p) * (i === n ? 0 : 1);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ---------- outlines ---------------------------------------------------------

// Walks the boundary between open and rock tiles into closed loops of tile
// corners. Edges are directed with the open side on the left.
function traceLoops(W, H, open) {
  const key = (x, y) => y * (W + 1) + x;
  const out = new Map();
  const add = (x1, y1, x2, y2) => {
    const k = key(x1, y1);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push({ x1, y1, x2, y2, used: false });
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!open(x, y)) continue;
      if (!open(x, y - 1)) add(x + 1, y, x, y);
      if (!open(x, y + 1)) add(x, y + 1, x + 1, y + 1);
      if (!open(x - 1, y)) add(x, y, x, y + 1);
      if (!open(x + 1, y)) add(x + 1, y + 1, x + 1, y);
    }
  const loops = [];
  for (const list of out.values())
    for (const start of list) {
      if (start.used) continue;
      const loop = [];
      let e = start;
      e.used = true;
      for (;;) {
        loop.push([e.x1, e.y1]);
        if (e.x2 === start.x1 && e.y2 === start.y1) break;
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
        const choices = (out.get(key(e.x2, e.y2)) || []).filter((c) => !c.used);
        // Where two areas touch only at a corner, turn left to hug our own side.
        const rank = (c) => {
          const cx = c.x2 - c.x1, cy = c.y2 - c.y1;
          return cx === dy && cy === -dx ? 0 : cx === dx && cy === dy ? 1 : 2;
        };
        choices.sort((a, b) => rank(a) - rank(b));
        if (!choices.length) break;
        e = choices[0];
        e.used = true;
      }
      loops.push(loop);
    }
  return loops;
}

// Turns a loop of tile corners into pixel points. Built walls keep their
// straight runs; cave walls get extra points, jittered, with some corners
// cut off so the line goes jagged and angular.
function shapeLoop(loop, caveAt, rng, TS) {
  const n = loop.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = loop[i], [bx, by] = loop[(i + 1) % n];
    const ca = caveAt(ax, ay), cb = caveAt(bx, by);
    pts.push({ x: ax, y: ay, cave: ca });
    if (ca && cb) pts.push({ x: (ax + bx) / 2, y: (ay + by) / 2, cave: true });
  }
  const jagged = [];
  let dropped = false;
  for (const p of pts) {
    if (!p.cave) { jagged.push(p); continue; }
    if (!dropped && rng.chance(0.3)) { dropped = true; continue; }
    dropped = false;
    jagged.push({ x: p.x + rng.range(-0.2, 0.2), y: p.y + rng.range(-0.2, 0.2), cave: true });
  }
  // Merge collinear points along straight walls so each is one long pen stroke.
  const m = jagged.length;
  const kept = jagged.filter((p, i) => {
    if (p.cave) return true;
    const a = jagged[(i - 1 + m) % m], b = jagged[(i + 1) % m];
    if (a.cave || b.cave) return true;
    return !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y));
  });
  return kept.map((p) => ({ x: p.x * TS, y: p.y * TS, cave: p.cave }));
}

function addLoop(path, loop) {
  loop.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
  path.closePath();
}

function drawWalls(ctx, loops, TS, rng) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, TS * 0.13);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const loop of loops)
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      penLine(ctx, a.x, a.y, b.x, b.y, rng, a.cave && b.cave ? 0.3 : 0.6);
    }
  ctx.stroke();
}

// ---------- paper, shadow, grid ------------------------------------------------

function drawPaper(ctx, w, h, rng) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // Faint foxing and fibres so the page doesn't read as flat digital white.
  for (let i = 0; i < 14; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), r = rng.range(60, 220);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(150, 110, 60, 0.05)");
    g.addColorStop(1, "rgba(150, 110, 60, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fillStyle = "rgba(80, 60, 30, 0.07)";
  for (let i = 0; i < (w * h) / 220; i++) ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(0.6, 1.4), rng.range(0.6, 1.4));
}

// The rock and the pillars, shifted down and right, painted grey onto the
// floor (the caller has clipped to it): light falls from the top left.
function drawShadow(ctx, level, TS, floor) {
  const off = TS * 0.13;
  const solid = new Path2D();
  solid.rect(-TS, -TS, (level.w + 2) * TS, (level.h + 2) * TS);
  solid.addPath(floor);
  ctx.save();
  ctx.translate(off, off);
  ctx.fillStyle = SHADOW;
  ctx.fill(solid, "evenodd");
  ctx.beginPath();
  for (let i = 0; i < level.tiles.length; i++) {
    if (level.tiles[i] !== T.PILLAR) continue;
    const cx = ((i % level.w) + 0.5) * TS, cy = (Math.floor(i / level.w) + 0.5) * TS;
    ctx.moveTo(cx + TS * 0.38, cy);
    ctx.arc(cx, cy, TS * 0.38, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

// Thin black lines between floor tiles, with the odd break where the pen skipped.
function drawGrid(ctx, W, H, TS, rng, open) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = Math.max(0.7, TS * 0.022);
  ctx.lineCap = "butt";
  ctx.beginPath();
  const seg = (x1, y1, x2, y2) => {
    const j = () => rng.range(-0.3, 0.3);
    if (rng.chance(0.3)) {
      const t = rng.range(0.2, 0.75), g = rng.range(0.06, 0.16);
      ctx.moveTo(x1 + j(), y1 + j());
      ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      ctx.moveTo(x1 + (x2 - x1) * (t + g), y1 + (y2 - y1) * (t + g));
      ctx.lineTo(x2 + j(), y2 + j());
    } else {
      ctx.moveTo(x1 + j(), y1 + j());
      ctx.lineTo(x2 + j(), y2 + j());
    }
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!open(x, y)) continue;
      if (open(x + 1, y)) seg((x + 1) * TS, y * TS, (x + 1) * TS, (y + 1) * TS);
      if (open(x, y + 1)) seg(x * TS, (y + 1) * TS, (x + 1) * TS, (y + 1) * TS);
    }
  ctx.stroke();
}

// ---------- hatching -------------------------------------------------------------

// Bold stone hatching. The rock near the walls is divided into irregular
// cells (a Voronoi diagram of scattered points); each cell is filled with
// parallel strokes at its own angle, and the strokes stop just short of the
// neighbouring cells, so patches meet without crossing. How deep the hatching
// reaches into the rock wanders with a smooth noise, leaving bare paper in the
// middle of large masses.
function drawHatching(ctx, level, TS, rng, open) {
  const { w: W, h: H } = level;
  const spacing = TS * 0.8; // minimum distance between cell centres
  const reach = 1.8 * spacing; // half-size of the box each cell starts from
  const gap = TS * 0.05; // space left between neighbouring cells
  const maxDepth = 4; // tiles

  // Chebyshev distance in tiles from each tile to the nearest open tile.
  const near = new Uint8Array(W * H).fill(255);
  const q = [];
  for (let i = 0; i < W * H; i++) if (open(i % W, (i / W) | 0)) { near[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    if (near[i] >= maxDepth + 1) continue;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (near[j] > near[i] + 1) { near[j] = near[i] + 1; q.push(j); }
      }
  }
  const distToOpen = (px, py) => {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    let best = Infinity;
    for (let y = ty - maxDepth; y <= ty + maxDepth; y++)
      for (let x = tx - maxDepth; x <= tx + maxDepth; x++) {
        if (!open(x, y)) continue;
        const cx = Math.max(x * TS, Math.min(px, (x + 1) * TS));
        const cy = Math.max(y * TS, Math.min(py, (y + 1) * TS));
        best = Math.min(best, Math.hypot(px - cx, py - cy));
      }
    return best;
  };
  const depthNoise = valueNoise(rng, W, H, 3.5);

  // Scatter cell centres by dart throwing (no two closer than `spacing`).
  const cand = [];
  for (let i = 0; i < W * H; i++) {
    if (near[i] === 0 || near[i] > maxDepth) continue;
    const x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 8; k++) cand.push([(x + rng.next()) * TS, (y + rng.next()) * TS]);
  }
  rng.shuffle(cand);
  const bucket = spacing, bw = Math.ceil((W * TS) / bucket) + 1;
  const grid = new Map();
  const seeds = [];
  const nearby = (x, y, r) => {
    const res = [], bx = Math.floor(x / bucket), by = Math.floor(y / bucket), n = Math.ceil(r / bucket);
    for (let j = by - n; j <= by + n; j++)
      for (let i = bx - n; i <= bx + n; i++)
        for (const s of grid.get(j * bw + i) || []) if (Math.hypot(s.x - x, s.y - y) < r) res.push(s);
    return res;
  };
  for (const [x, y] of cand) {
    if (nearby(x, y, spacing).length) continue;
    const s = { x, y };
    const k = Math.floor(y / bucket) * bw + Math.floor(x / bucket);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(s);
    seeds.push(s);
  }
  for (const s of seeds) {
    const limit = (1.1 + 1.7 * depthNoise(s.x / TS, s.y / TS)) * TS;
    s.inked = distToOpen(s.x, s.y) < limit;
  }

  const segs = [];
  for (const s of seeds) {
    if (!s.inked) continue;
    const neighbours = nearby(s.x, s.y, reach * 1.5).filter((n) => n !== s);
    // Pick an angle unlike the neighbours that already have one.
    let best = 0, bestScore = -1;
    for (let k = 0; k < 6; k++) {
      const a = rng.range(0, Math.PI);
      let score = Math.PI;
      for (const n of neighbours)
        if (n.angle !== undefined) {
          const d = Math.abs(a - n.angle) % Math.PI;
          score = Math.min(score, Math.min(d, Math.PI - d));
        }
      if (score > bestScore) { bestScore = score; best = a; }
    }
    s.angle = best;

    // The cell as half-planes {nx, ny, c, outer}: inside where nx*x + ny*y <= c.
    const planes = [];
    for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      planes.push({ nx, ny, c: nx * s.x + ny * s.y + reach, outer: true });
    for (const n of neighbours) {
      const dx = n.x - s.x, dy = n.y - s.y, d = Math.hypot(dx, dy);
      const ux = dx / d, uy = dy / d;
      planes.push({ nx: ux, ny: uy, c: ux * (s.x + dx / 2) + uy * (s.y + dy / 2) - gap / 2, outer: !n.inked });
    }

    const ux = Math.cos(best), uy = Math.sin(best), vx = -uy, vy = ux;
    const step = TS * rng.range(0.15, 0.19);
    for (let o = -reach + rng.range(0, step); o < reach; o += step) {
      const ax = s.x + vx * o, ay = s.y + vy * o;
      let t0 = -reach * 2, t1 = reach * 2, p0 = null, p1 = null;
      for (const p of planes) {
        const den = p.nx * ux + p.ny * uy, num = p.c - (p.nx * ax + p.ny * ay);
        if (Math.abs(den) < 1e-9) { if (num < 0) { t1 = -Infinity; break; } continue; }
        const t = num / den;
        if (den > 0) { if (t < t1) { t1 = t; p1 = p; } }
        else if (t > t0) { t0 = t; p0 = p; }
      }
      let len = t1 - t0;
      if (len < TS * 0.1) continue;
      // Strokes fray where the hatching gives out into bare rock.
      if (p0?.outer) t0 += len * rng.range(0, 0.4);
      if (p1?.outer) t1 -= len * rng.range(0, 0.4);
      len = t1 - t0;
      if (len < TS * 0.08) continue;
      segs.push(ax + ux * t0, ay + uy * t0, ax + ux * t1, ay + uy * t1);
    }
  }

  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.3, TS * 0.048);
  ctx.beginPath();
  for (let i = 0; i < segs.length; i += 4) {
    ctx.moveTo(segs[i], segs[i + 1]);
    ctx.lineTo(segs[i + 2], segs[i + 3]);
  }
  ctx.stroke();
}

// Smooth value noise in [0, 1], sampled in tile units, with lattice spacing `cell`.
function valueNoise(rng, W, H, cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
  const lat = Array.from({ length: gw * gh }, () => rng.next());
  const at = (i, j) => lat[Math.max(0, Math.min(gh - 1, j)) * gw + Math.max(0, Math.min(gw - 1, i))];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy);
    let u = fx - i, v = fy - j;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

// ---------- floor details and furniture ------------------------------------------

function drawCracks(ctx, level, TS, rng) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      const i = y * level.w + x;
      if (level.tiles[i] !== T.FLOOR || level.cave[i] || !rng.chance(0.025)) continue;
      ctx.beginPath();
      let px = (x + rng.range(0.1, 0.4)) * TS, py = (y + rng.range(0.2, 0.8)) * TS;
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        px += TS * rng.range(0.1, 0.2);
        py += TS * rng.range(-0.15, 0.15);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
}

function drawFurniture(ctx, level, TS, rng) {
  const { w: W, tiles } = level;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < tiles.length; i++) {
    const x = (i % W) * TS, y = Math.floor(i / W) * TS, cx = x + TS / 2, cy = y + TS / 2;
    switch (tiles[i]) {
      case T.PILLAR: {
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.3, rng, 0.5);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.38, rng, 0.4);
        ctx.stroke();
        break;
      }
      case T.WELL: {
        ctx.lineWidth = 2;
        ctx.fillStyle = PAPER;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.42, rng, 0.5);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.28, rng, 0.3);
        ctx.stroke();
        // Water: a few short ripple lines inside the inner ring.
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let k = -1; k <= 1; k++) {
          const yy = cy + k * TS * 0.09;
          for (let s = 0; s <= 8; s++) {
            const xx = cx - TS * 0.16 + (s / 8) * TS * 0.32;
            const w = yy + Math.sin(s * 1.4 + k) * 1.1;
            s ? ctx.lineTo(xx, w) : ctx.moveTo(xx, w);
          }
        }
        ctx.stroke();
        ctx.fillStyle = INK;
        break;
      }
    }
  }
  for (const d of level.decor) {
    if (d.type === "rubble") drawRubble(ctx, d.x * TS, d.y * TS, TS, new RNG(Math.floor(d.seed * 1e9)), d.small);
  }
}

function drawRubble(ctx, x, y, TS, rng, small) {
  const n = small ? rng.int(2, 4) : rng.int(5, 9);
  const ox = rng.range(0.25, 0.75) * TS, oy = rng.range(0.25, 0.75) * TS;
  ctx.lineWidth = 0.9;
  for (let k = 0; k < n; k++) {
    const sx = x + ox + rng.range(-0.28, 0.28) * TS, sy = y + oy + rng.range(-0.28, 0.28) * TS;
    const r = TS * rng.range(0.035, small ? 0.07 : 0.1);
    const sides = rng.int(4, 6);
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const rr = r * rng.range(0.7, 1.2);
      s ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    }
    ctx.closePath();
    if (rng.chance(0.35)) ctx.fill();
    else { ctx.fillStyle = PAPER; ctx.fill(); ctx.fillStyle = INK; ctx.stroke(); }
  }
}

function drawRoomKeys(ctx, level, TS) {
  // Small pencilled room numbers, as on a keyed adventure map, in each
  // room's top-left floor tile.
  ctx.fillStyle = "rgba(60, 55, 50, 0.55)";
  ctx.font = `italic ${Math.round(TS * 0.36)}px "IM Fell English", Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const sorted = [...level.rooms].sort((a, b) => a.y - b.y || a.x - b.x);
  sorted.forEach((r, i) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        if (level.tiles[y * level.w + x] === T.FLOOR) {
          ctx.fillText(String(i + 1), x * TS + TS * 0.18, y * TS + TS * 0.14);
          return;
        }
  });
}
