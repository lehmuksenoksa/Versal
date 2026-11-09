// Sightlines and light: the region visible from a point, cast against the
// map's wall outlines, as a polygon. Rays go to every wall corner nearby
// (and just either side of it), stop at the first wall they meet, and the
// hits, taken in angle order, outline what can be seen.

import { feature } from "./content.js";
import { sin, cos, atan2, hypot } from "./dmath.js";

// A pillar's outline (a feature of type "post", in squares), as corners
// [x, y] times `scale`: a hexagon if round, else a square set square.
export function postOutline(f, scale = 1) {
  const n = f.shape === "round" ? 6 : 4, r = scale * (f.shape === "round" ? 0.21 : 0.26), a0 = n === 4 ? Math.PI / 4 : 0;
  return Array.from({ length: n }, (_, i) => [f.x * scale + r * cos(a0 + (i * 2 * Math.PI) / n), f.y * scale + r * sin(a0 + (i * 2 * Math.PI) / n)]);
}

// The outline of a big thing that throws a shadow from the level's lights
// (corners [x, y] times `scale`), or null: sarcophagi, altars (not one with
// candles on it), tables, shelves, crates and barrels: by the outline its
// kind has (features.json).
export function shadeOutline(f, scale = 1) {
  if (f.holds) return null;
  const box = (w, h, rot = 0) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const dx = (u * w) / 2, dy = (v * h) / 2;
    return [(f.x + dx * cos(rot) - dy * sin(rot)) * scale, (f.y + dx * sin(rot) + dy * cos(rot)) * scale];
  });
  const shape = feature(f).outline;
  if (shape === "box") return box(f.w, f.h);
  if (shape === "square") return box(f.s, f.s, f.rot ?? 0);
  if (shape === "hex") return Array.from({ length: 6 }, (_, i) => [(f.x + f.r * cos((i * Math.PI) / 3)) * scale, (f.y + f.r * sin((i * Math.PI) / 3)) * scale]);
  return null;
}

// Is (x, y) inside the outline `pts`?
export function insideOutline(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Does the line from (ax, ay) to (bx, by) cross the outline `pts`?
export function crossesOutline(ax, ay, bx, by, pts) {
  const side = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  for (let i = 0; i < pts.length; i++) {
    const [cx, cy] = pts[i], [dx, dy] = pts[(i + 1) % pts.length];
    if (side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) <= 0 && side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) <= 0) return true;
  }
  return false;
}

// ---- The line of sight and light (spec/light-rebuild.md, S1) ----
// One test for the rules' light, the player's sight and the monsters' alike:
// a line must keep CLEAR of every wall square on its way, and of every
// pillar (yours: "For corners, stricter looks a lot better"): a tenth of a
// square. So nothing squeezes through a diagonal gap between two walls.
export const CLEAR = 0.1;

// An outline's box, [x0, y0, x1, y1] (worked out once, kept aside: not part
// of the level's state).
const BOXES = new WeakMap();
function boxOf(pts) {
  let B = BOXES.get(pts);
  if (!B) {
    const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
    BOXES.set(pts, (B = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]));
  }
  return B;
}

// The distance from (px, py) to the segment (ax, ay)-(bx, by).
function pointSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  const ex = ax + dx * t - px, ey = ay + dy * t - py;
  return Math.sqrt(ex * ex + ey * ey);
}

// Does the segment cross the box [x0, x1] × [y0, y1] (Liang–Barsky)?
function segInBox(ax, ay, bx, by, x0, y0, x1, y1) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

// The distance from the segment to the square (x, y) (0 if it crosses it).
function segSquare(ax, ay, bx, by, x, y) {
  if (segInBox(ax, ay, bx, by, x, y, x + 1, y + 1)) return 0;
  let d = Math.min(pointSeg(x, y, ax, ay, bx, by), pointSeg(x + 1, y, ax, ay, bx, by), pointSeg(x, y + 1, ax, ay, bx, by), pointSeg(x + 1, y + 1, ax, ay, bx, by));
  for (const [px, py] of [[ax, ay], [bx, by]]) {
    const ex = Math.max(x - px, 0, px - x - 1), ey = Math.max(y - py, 0, py - y - 1);
    d = Math.min(d, Math.sqrt(ex * ex + ey * ey));
  }
  return d;
}

// The distance from the segment to the outline `pts` (0 if it crosses it).
function segOutline(ax, ay, bx, by, pts) {
  if (crossesOutline(ax, ay, bx, by, pts)) return 0;
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [cx, cy] = pts[i], [dx, dy] = pts[(i + 1) % pts.length];
    d = Math.min(d, pointSeg(cx, cy, ax, ay, bx, by), pointSeg(ax, ay, cx, cy, dx, dy), pointSeg(bx, by, cx, cy, dx, dy));
  }
  return d;
}

// Is the line from (ax, ay) to the middle of the square (tx, ty) clear: no
// wall square nearer it than CLEAR (`opaque(x, y)`; the square it ends in
// aside), no pillar (`pillars`, outlines) nearer than CLEAR, and crossing
// none of `things` (the big furniture's outlines, for the level's lights: they
// only stop a line that crosses them, and not one that ends inside them)?
export function lineClear(ax, ay, tx, ty, opaque, pillars = [], things = []) {
  const bx = tx + 0.5, by = ty + 0.5;
  // (The squares the line passes, walked one by one, and those round each:
  // a wall among them too near stops it.)
  const dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const near = (gx, gy) => {
    for (let y = gy - 1; y <= gy + 1; y++)
      for (let x = gx - 1; x <= gx + 1; x++) {
        if ((x === tx && y === ty) || !opaque(x, y)) continue;
        // (A square whose middle is further than its half-diagonal and CLEAR
        // from the line can't be near it.)
        if (Math.abs((x + 0.5 - ax) * dy - (y + 0.5 - ay) * dx) / len > 0.7072 + CLEAR) continue;
        if (segSquare(ax, ay, bx, by, x, y) < CLEAR) return true;
      }
    return false;
  };
  let gx = Math.floor(ax), gy = Math.floor(ay);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
  let tX = dx ? (sx > 0 ? gx + 1 - ax : ax - gx) * tdx : Infinity, tY = dy ? (sy > 0 ? gy + 1 - ay : ay - gy) * tdy : Infinity;
  for (let i = 0; i < 4096; i++) {
    if (near(gx, gy)) return false;
    if (gx === tx && gy === ty) break;
    if (tX < tY) { gx += sx; tX += tdx; }
    else { gy += sy; tY += tdy; }
  }
  // (A pillar nowhere near the line's box passed over at once.)
  const lx0 = Math.min(ax, bx) - CLEAR, lx1 = Math.max(ax, bx) + CLEAR, ly0 = Math.min(ay, by) - CLEAR, ly1 = Math.max(ay, by) + CLEAR;
  for (const pts of pillars) {
    const B = boxOf(pts);
    if (B[2] < lx0 || B[0] > lx1 || B[3] < ly0 || B[1] > ly1) continue;
    if (segOutline(ax, ay, bx, by, pts) < CLEAR) return false;
  }
  for (const pts of things) if (!insideOutline(bx, by, pts) && !insideOutline(ax, ay, pts) && crossesOutline(ax, ay, bx, by, pts)) return false;
  return true;
}

export class Walls {
  // loops: closed outlines of the floor, as arrays of {x, y} in map pixels.
  constructor(loops, bucket) {
    this.bucket = bucket;
    this.cells = new Map();
    for (const loop of loops)
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        this.add({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
      }
  }

  add(s) {
    const z = this.bucket;
    for (let j = Math.floor(Math.min(s.y0, s.y1) / z); j <= Math.floor(Math.max(s.y0, s.y1) / z); j++)
      for (let i = Math.floor(Math.min(s.x0, s.x1) / z); i <= Math.floor(Math.max(s.x0, s.x1) / z); i++) {
        const k = i * 65536 + j;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(s);
      }
  }

  // Take segment `s` (as added) away again.
  remove(s) {
    for (const [k, list] of this.cells) {
      const i = list.indexOf(s);
      if (i >= 0) list.splice(i, 1);
      if (!list.length) this.cells.delete(k);
    }
  }

  // The wall segments touching the square of half-size r around (x, y).
  near(x, y, r) {
    const z = this.bucket, out = new Set();
    for (let j = Math.floor((y - r) / z); j <= Math.floor((y + r) / z); j++)
      for (let i = Math.floor((x - r) / z); i <= Math.floor((x + r) / z); i++)
        for (const s of this.cells.get(i * 65536 + j) || []) out.add(s);
    return [...out];
  }

  // The polygon visible from (px, py) out to distance r (bounded by a square
  // of half-size r; callers clip it to a circle).
  visible(px, py, r) {
    const segs = this.near(px, py, r);
    const box = [[px - r, py - r], [px + r, py - r], [px + r, py + r], [px - r, py + r]];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = box[i], [x1, y1] = box[(i + 1) % 4];
      segs.push({ x0, y0, x1, y1 });
    }
    // Rays go to every wall corner within reach and to every point where a
    // wall crosses the edge of the reach (so long walls that run out of
    // reach still let a ray down the corridor they line).
    // (A corner two walls share is aimed at once.)
    const angles = [], aimed = new Set();
    const aim = (x, y) => {
      const a = atan2(y - py, x - px);
      angles.push(a - 1e-4, a, a + 1e-4);
    };
    const edges = segs.slice(-4);
    for (const s of segs) {
      for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y1]]) {
        if (Math.abs(x - px) > r || Math.abs(y - py) > r) continue;
        const k = `${x},${y}`;
        if (aimed.has(k)) continue;
        aimed.add(k);
        aim(x, y);
      }
      for (const e of edges) {
        const ax = s.x1 - s.x0, ay = s.y1 - s.y0, bx = e.x1 - e.x0, by = e.y1 - e.y0, den = ax * by - ay * bx;
        if (Math.abs(den) < 1e-12) continue;
        const qx = e.x0 - s.x0, qy = e.y0 - s.y0;
        const t = (qx * by - qy * bx) / den, u = (qx * ay - qy * ax) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) aim(s.x0 + ax * t, s.y0 + ay * t);
      }
    }
    angles.sort((a, b) => a - b);
    // The walls nearest first, so each ray stops looking once the rest are
    // all further off than what it has hit.
    const dist = (s) => {
      const ex = s.x1 - s.x0, ey = s.y1 - s.y0, L = ex * ex + ey * ey;
      const t = L ? Math.max(0, Math.min(1, ((px - s.x0) * ex + (py - s.y0) * ey) / L)) : 0;
      return hypot(s.x0 + ex * t - px, s.y0 + ey * t - py);
    };
    const near = segs.map((s) => [dist(s), s]).sort((a, b) => a[0] - b[0]);
    const pts = [];
    for (const a of angles) {
      const dx = cos(a), dy = sin(a);
      let best = Infinity;
      for (const [d, s] of near) {
        if (d > best) break;
        const ex = s.x1 - s.x0, ey = s.y1 - s.y0, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        const qx = s.x0 - px, qy = s.y0 - py;
        const t = (qx * ey - qy * ex) / den, u = (qx * dy - qy * dx) / den;
        if (t > 0 && t < best && u >= -1e-9 && u <= 1 + 1e-9) best = t;
      }
      if (best < Infinity) pts.push([px + dx * best, py + dy * best]);
    }
    const path = new Path2D();
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    // What can be seen when looking `depth` further into the walls along
    // each line of sight: the outline pushed outward along its rays. Only
    // wall faces the player actually looks at are reached, never round a
    // corner.
    path.beyond = (depth) => {
      const out = new Path2D();
      pts.forEach(([x, y], i) => {
        const dx = x - px, dy = y - py, d = hypot(dx, dy) || 1, k = (d + depth) / d;
        i ? out.lineTo(px + dx * k, py + dy * k) : out.moveTo(px + dx * k, py + dy * k);
      });
      out.closePath();
      return out;
    };
    return path;
  }
}
