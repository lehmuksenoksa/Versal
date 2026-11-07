// The regions: where each kind of ground lies (each square's `area`), and
// a level changing from one kind to another across it (`from`, `to`).

import { AREAS, DUNGEON, clamp, valueNoise } from "./make.js";
import { hypot } from "../dmath.js";

export function layRegions(g) {
  const { S, rng, W, H, area, idx } = g;
  // Regions: seed points spread apart, each tile going to the nearest by a
  // distance warped with noise (so the borders wander); types by the mix.
  const regions = g.regions;
  for (let k = 0; k < Math.max(1, Math.round(S.regions)); k++) {
    let best = null;
    for (let t = 0; t < 30; t++) {
      const x = rng.range(0.1, 0.9) * W, y = rng.range(0.1, 0.9) * H;
      const d = Math.min(Infinity, ...regions.map((q) => hypot(x - q.x, y - q.y)));
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
  // (A level changing across: the far kind more and more to the right, the
  // border wandering and fraying.)
  const from = AREAS.indexOf(S.from), to = AREAS.indexOf(S.to), across = from >= 0 && to >= 0;
  Object.assign(g, { from, to, across });
  const blot = valueNoise(rng, W, H, 5);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (across) {
        const t = x / W + (wx(x, y) - 0.5) * 0.45 + (blot(x, y) - 0.5) * 0.3;
        area[idx(x, y)] = t > 0.5 ? to : from;
        continue;
      }
      const px = x + 0.5 + (wx(x, y) - 0.5) * 14, py = y + 0.5 + (wy(x, y) - 0.5) * 14;
      let best = 0, bd = Infinity;
      regions.forEach((r, k) => {
        const d = hypot(px - r.x, py - r.y);
        if (d < bd) { bd = d; best = k; }
      });
      area[idx(x, y)] = regions[best].type;
    }
  g.typeAt = (x, y) => area[idx(clamp(x, 0, W - 1), clamp(y, 0, H - 1))];
}
