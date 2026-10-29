// Renders a level once, offscreen, in the manner of a hand-inked dungeon map:
// heavy walls drawn as chains of short pen strokes (straight in rooms, jagged
// in caves), a grey shadow cast down and to the right, bold stone hatching in
// the rock (see hatching.js), a hand-drawn floor grid and pencilled room numbers.

import { T, isOpen } from "./dungeon.js";
import { RNG } from "./rng.js";
import { hatchRock, hatchSettings, distanceTransform } from "./hatching.js";

export const INK = "#1b1815";
export const PAPER = "#f7f2e6";
const SHADOW = "rgba(70, 62, 55, 0.3)";

// Wall and grid settings chosen in the hatching mockup, in pixels at 32 px
// tiles (scaled to the actual tile size when drawn).
const WALL = { weight: 8, inside: 0.1, seg: 0.3, kink: 1.2, bow: 0.3, vary: 0 };
const GRID = { wobble: 0.8, breaks: 0.35 };

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
  hatchRock(ctx, rockGeometry(W * TS, H * TS, TS, floor, loops), hatchSettings(TS), rng.fork());
  // Floors are painted over the hatching, which leaves it cut cleanly at the walls.
  ctx.fillStyle = PAPER;
  ctx.fill(floor, "evenodd");

  ctx.save();
  ctx.clip(floor, "evenodd");
  drawShadow(ctx, level, TS, floor);
  drawGrid(ctx, W, H, TS, rng.fork(), open);
  ctx.restore();

  drawWalls(ctx, loops, TS, rng);
  drawRoomKeys(ctx, level, TS);

  return { canvas, ctx };
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

// Walls as chains of short pen strokes, each tilted slightly off the wall
// line and bowed a little; neighbours share their end points. The chain is
// pushed out into the rock, so most of the wall's weight lies outside the room.
function drawWalls(ctx, loops, TS, rng) {
  const k = TS / 32, weight = WALL.weight * k, seg = WALL.seg * TS;
  const shift = weight * (0.5 - WALL.inside);
  ctx.fillStyle = INK;
  for (const loop of loops) {
    const n = loop.length;
    // Normals pointing into the rock (loops keep the floor on their left).
    const normal = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    };
    // Each corner moves out along the mitre of its two walls.
    const P = loop.map((p, i) => {
      const [ax, ay] = normal(loop[(i - 1 + n) % n], p), [bx, by] = normal(p, loop[(i + 1) % n]);
      const dot = ax * bx + ay * by;
      const [mx, my] = dot > -0.7 ? [(ax + bx) / (1 + dot), (ay + by) / (1 + dot)] : [bx, by];
      return [p.x + mx * shift, p.y + my * shift];
    });
    for (let i = 0; i < n; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % n];
      const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const pts = [[x0, y0]];
      for (let at = seg * rng.range(0.7, 1.3); at < len - seg * 0.4; at += seg * rng.range(0.7, 1.3)) {
        const off = rng.range(-1, 1) * WALL.kink * k;
        pts.push([x0 + ux * at - uy * off, y0 + uy * at + ux * off]);
      }
      pts.push([x1, y1]);
      for (let j = 0; j < pts.length - 1; j++) wallStroke(ctx, pts[j], pts[j + 1], weight, WALL.bow * k, rng);
    }
  }
}

function wallStroke(ctx, [x0, y0], [x1, y1], weight, bowAmp, rng) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const n = Math.max(3, Math.round(len / 3));
  const bow = rng.range(-1, 1) * bowAmp;
  const ends = 1 - WALL.vary * rng.range(0, 0.6), mid = 1 + WALL.vary * rng.range(-0.3, 1);
  const half = (t) => (weight / 2) * (ends + (mid - ends) * Math.sin(Math.PI * t));
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, off = bow * Math.sin(Math.PI * t), h = half(t);
    const cx = x0 + dx * t + nx * off, cy = y0 + dy * t + ny * off;
    L.push([cx + nx * h, cy + ny * h]);
    R.push([cx - nx * h, cy - ny * h]);
  }
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill();
  for (const [x, y, t] of [[x0, y0, 0], [x1, y1, 1]]) {
    ctx.beginPath();
    ctx.arc(x, y, half(t), 0, Math.PI * 2);
    ctx.fill();
  }
}

// What the hatching needs to know about the map: the wall segments (with
// normals into the rock) and the distance from any point to the floor,
// from a distance transform of the rasterised floor.
function rockGeometry(W, H, TS, floor, loops) {
  const walls = [];
  for (const loop of loops)
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length], L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L > 0) walls.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, nx: -(b.y - a.y) / L, ny: (b.x - a.x) / L });
    }
  const FR = TS / 16, FW = Math.ceil(W / FR), FH = Math.ceil(H / FR);
  const c = document.createElement("canvas");
  c.width = FW;
  c.height = FH;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.scale(1 / FR, 1 / FR);
  g.fill(floor, "evenodd");
  const px = g.getImageData(0, 0, FW, FH).data, isFloor = new Uint8Array(FW * FH);
  for (let i = 0; i < FW * FH; i++) isFloor[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  const dist = distanceTransform(isFloor, FW, FH);
  const distAt = (x, y) => {
    const i = Math.min(FW - 1, Math.max(0, Math.floor(x / FR))), j = Math.min(FH - 1, Math.max(0, Math.floor(y / FR)));
    return dist[j * FW + i] * FR;
  };
  return { W, H, TS, walls, distAt };
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

// The rock, shifted down and right, painted grey onto the
// floor (the caller has clipped to it): light falls from the top left.
function drawShadow(ctx, level, TS, floor) {
  const off = TS * 0.22;
  const solid = new Path2D();
  solid.rect(-TS, -TS, (level.w + 2) * TS, (level.h + 2) * TS);
  solid.addPath(floor);
  ctx.save();
  ctx.translate(off, off);
  ctx.fillStyle = SHADOW;
  ctx.fill(solid, "evenodd");
  ctx.restore();
}

// The floor grid, one thin pen stroke per tile edge: each slightly tilted and
// bowed, often stopping short of a crossing, now and then broken mid-way.
function drawGrid(ctx, W, H, TS, rng, open) {
  const k = TS / 32, wob = GRID.wobble * k, brk = GRID.breaks;
  ctx.strokeStyle = "rgba(27, 24, 21, 0.75)";
  ctx.lineCap = "round";
  const edge = (x0, y0, x1, y1) => {
    const ux = (x1 - x0) / TS, uy = (y1 - y0) / TS, nx = -uy, ny = ux;
    const a = rng.chance(brk) ? rng.range(1, 3.5) * k : -0.4;
    const b = TS - (rng.chance(brk) ? rng.range(1, 3.5) * k : -0.4);
    let pieces = [[a, b]];
    if (rng.chance(brk * 0.5)) {
      const m = rng.range(0.3, 0.7) * TS, gap = rng.range(1.5, 3.5) * k;
      pieces = [[a, m - gap / 2], [m + gap / 2, b]];
    }
    for (const [p, q] of pieces) {
      const s0 = rng.range(-0.5, 0.5) * wob, s1 = rng.range(-0.5, 0.5) * wob, bow = rng.range(-1, 1) * wob;
      const m = (p + q) / 2, sm = (s0 + s1) / 2 + bow;
      ctx.lineWidth = rng.range(0.6, 1.05) * Math.max(1, k);
      ctx.beginPath();
      ctx.moveTo(x0 + ux * p + nx * s0, y0 + uy * p + ny * s0);
      ctx.quadraticCurveTo(x0 + ux * m + nx * sm, y0 + uy * m + ny * sm, x0 + ux * q + nx * s1, y0 + uy * q + ny * s1);
      ctx.stroke();
    }
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!open(x, y)) continue;
      if (open(x + 1, y)) edge((x + 1) * TS, y * TS, (x + 1) * TS, (y + 1) * TS);
      if (open(x, y + 1)) edge(x * TS, (y + 1) * TS, (x + 1) * TS, (y + 1) * TS);
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
