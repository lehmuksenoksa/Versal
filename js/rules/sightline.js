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
