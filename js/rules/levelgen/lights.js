// The lights: campfires in big caves (with rock formations round them for
// shadows), the dungeon rooms' lights (furnish.js), braziers in the king's
// halls; and a storeroom's stacks.

import { T } from "../dungeon.js";
import { computeFov } from "../fov.js";
import { LIGHTS } from "./make.js";
import { sin, cos, hypot } from "../dmath.js";

// Lights: campfires in big caves, in the middle of open floor (each
// { x, y, kind: "fire" } in squares, and a thing drawn; the fire's square
// is in the way: `blocks`); braziers and candles in the rooms that are lit.
// (No place is lit without a light of its own: spec/light-and-dread.md.)
// Braziers down the middle of a hall, between the rows of its columns: in
// line with every other column (the middle one among them), so each
// brazier lights the aisle and the columns beside it throw stripes of
// shadow across the side aisles.
// (`flank`: either side of its middle, for the throne room, where the king
// stands.)
export function hallBraziers(g, r, flank = false) {
  const { floorAt, blocks, idx, rubble, lights, features } = g;
  // (A hall of another kind than A: its braziers where its plan puts them,
  // on the free floor square nearest each.)
  if (r.lamps) {
    if (r.lit) return;
    for (const [lx, ly] of r.lamps) {
      let spot = null;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = lx + dx, y = ly + dy, d = Math.abs(dx) + Math.abs(dy);
          if (floorAt(x, y) && !blocks.has(idx(x, y)) && !(r.seat && r.seat.x === x && r.seat.y === y) && (!spot || d < spot.d)) spot = { x, y, d };
        }
      if (!spot) continue;
      blocks.add(idx(spot.x, spot.y));
      rubble[idx(spot.x, spot.y)] = 0;
      lights.push({ x: spot.x + 0.5, y: spot.y + 0.5, kind: "brazier" });
      features.push({ type: "brazier", x: spot.x + 0.5, y: spot.y + 0.5 });
      r.lit = true;
    }
    return;
  }
  const N = r.nave;
  if (!N || r.lit) return;
  const K = N.us.length, m = (K - 1) / 2;
  const pick = K % 2 ? N.us.filter((_, i) => Math.abs(i - m) % 2 === (flank ? 1 : 0)) : K === 2 ? (flank ? N.us : [(N.us[0] + N.us[1]) / 2]) : [N.us[K / 2 - 1], N.us[K / 2]];
  for (const u of pick) {
    const a = Math.round(u), b = Math.round(N.mid), [x, y] = N.along ? [r.x + a, r.y + b] : [r.x + b, r.y + a];
    if (!floorAt(x, y) || blocks.has(idx(x, y))) continue;
    blocks.add(idx(x, y));
    rubble[idx(x, y)] = 0;
    lights.push({ x: x + 0.5, y: y + 0.5, kind: "brazier" });
    features.push({ type: "brazier", x: x + 0.5, y: y + 0.5 });
    r.lit = true;
  }

}

export function placeLights(g) {
  const { S, rng, W, H, tiles, rubble, idx, floorAt, rooms, roomLights, lights, blocks, features, reach, floorIn } = g;
  // Rock formations set round a cave's campfire (at (fx, fy)) to throw
  // shadows the player can creep along: a few small clumps two to four
  // squares from it, each kept only if it makes the darkest way across the
  // cave (from one way in to another) or up to the fire (to a dark square
  // beside the camp) darker; until each is lit for a square at most. The
  // light as the game reckons it: what the fire lights in its full and dim
  // bands, in line of sight.
  const shadowLanes = (r, fx, fy) => {
    const F = LIGHTS.fire, far = F.full + F.dim;
    const x0 = r.x - 1, y0 = r.y - 1, bw = r.w + 2, bh = r.h + 2, inBox = (x, y) => x >= x0 && y >= y0 && x < x0 + bw && y < y0 + bh;
    const k = (x, y) => (y - y0) * bw + (x - x0);
    const fire = idx(fx, fy);
    // The ways in: floor on the box's edge with floor beyond it, a square
    // from each stretch.
    const ways = [], onWay = new Set();
    for (let y = y0; y < y0 + bh; y++)
      for (let x = x0; x < x0 + bw; x++) {
        if (x !== x0 && y !== y0 && x !== x0 + bw - 1 && y !== y0 + bh - 1) continue;
        if (!floorAt(x, y)) continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inBox(x + dx, y + dy) && floorAt(x + dx, y + dy))) continue;
        onWay.add(idx(x, y));
        if (!ways.some(([wx, wy]) => Math.max(Math.abs(wx - x), Math.abs(wy - y)) <= 2)) ways.push([x, y]);
      }
    if (!ways.length) return;
    const litNow = () => {
      const L = new Uint8Array(bw * bh);
      computeFov(W, H, fx, fy, far, (x, y) => !floorAt(x, y), (x, y) => { if (inBox(x, y)) L[k(x, y)] = 1; });
      return L;
    };
    // The fewest lit squares on a way from `from` to any of `to` (a test on
    // squares), stepping as the player does (diagonals too), round the fire.
    const darkest = (L, from, to) => {
      const cost = new Int16Array(bw * bh).fill(9999), q = [[from[0], from[1]]];
      cost[k(...from)] = L[k(...from)];
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i], c = cost[k(x, y)];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if ((!dx && !dy) || !inBox(nx, ny) || !floorAt(nx, ny) || idx(nx, ny) === fire) continue;
            const nc = c + L[k(nx, ny)];
            if (nc < cost[k(nx, ny)]) {
              cost[k(nx, ny)] = nc;
              q.push([nx, ny]);
            }
          }
      }
      let best = 9999;
      for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (to(x, y, L)) best = Math.min(best, cost[k(x, y)]);
      return best;
    };
    const score = () => {
      const L = litNow();
      // (Across: the best way between two ways in, if there are two.)
      let across = 0;
      if (ways.length > 1) {
        across = 9999;
        for (let i = 0; i < ways.length; i++) for (let j = i + 1; j < ways.length; j++) across = Math.min(across, darkest(L, ways[i], (x, y) => x === ways[j][0] && y === ways[j][1]));
      }
      // (Up to the fire: to a dark square no more than three from it.)
      let up = 9999;
      for (const w of ways) up = Math.min(up, darkest(L, w, (x, y, L) => !L[k(x, y)] && hypot(x - fx, y - fy) <= 3));
      return Math.max(0, across - 1) + Math.max(0, up - 1);
    };
    let now = score();
    for (let placed = 0; placed < 4 && now > 0; placed++) {
      let best = null;
      for (let t = 0; t < 40; t++) {
        const a = rng.range(0, 2 * Math.PI), d = rng.range(2, 3.8), cx = Math.round(fx + cos(a) * d), cy = Math.round(fy + sin(a) * d);
        const clump = [[cx, cy]], want = rng.int(1, 3);
        for (let g = 0; g < want * 4 && clump.length < want; g++) {
          const [bx, by] = rng.pick(clump), [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
          if (!clump.some(([ax, ay]) => ax === bx + dx && ay === by + dy)) clump.push([bx + dx, by + dy]);
        }
        // Standing free: floor all round, clear of the fire and the ways in.
        const ok = clump.every(([x, y]) => {
          if (!inBox(x, y) || Math.max(Math.abs(x - fx), Math.abs(y - fy)) < 2 || onWay.has(idx(x, y))) return false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!floorAt(x + dx, y + dy) && !clump.some(([ax, ay]) => ax === x + dx && ay === y + dy)) return false;
          return true;
        });
        if (!ok) continue;
        for (const [x, y] of clump) tiles[idx(x, y)] = T.ROCK;
        const v = reach(r).size === floorIn(r) ? score() : Infinity;
        for (const [x, y] of clump) tiles[idx(x, y)] = T.FLOOR;
        if (v < now && (!best || v < best.v)) best = { v, clump };
      }
      if (!best) break;
      for (const [x, y] of best.clump) {
        tiles[idx(x, y)] = T.ROCK;
        rubble[idx(x, y)] = 0;
      }
      now = best.v;
    }
  };
  for (const r of rooms) {
    if (!r.cave || !rng.chance(S.campfires)) continue;
    let best = null;
    for (let y = r.y + 1; y < r.y + r.h - 1; y++)
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        let open = true;
        for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1 && open; dx++) open = floorAt(x + dx, y + dy);
        const d = hypot(x - r.cx, y - r.cy);
        if (open && (!best || d < best.d)) best = { x, y, d };
      }
    if (!best || best.d > 3) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) rubble[idx(best.x + dx, best.y + dy)] = 0;
    blocks.add(idx(best.x, best.y));
    r.campfire = true;
    lights.push({ x: best.x + 0.5, y: best.y + 0.5, kind: "fire" });
    features.push({ type: "campfire", x: best.x + 0.5, y: best.y + 0.5 });
    shadowLanes(r, best.x, best.y);
  }
  // The dungeon rooms' lights (see the furnishing).
  for (const l of roomLights) {
    if (l.block !== undefined) blocks.add(l.block);
    lights.push({ x: l.x, y: l.y, kind: l.kind, ...(l.flames ? { flames: l.flames } : {}) });
  }
  // Braziers down the middle of some of the king's halls (and the throne
  // room's, when it is chosen).
  // A storeroom's stacks: a crate or a barrel on most squares of each.
  for (const r of rooms)
    for (const st of r.stacks ?? [])
      for (const [x, y] of st.squares) {
        if (!floorAt(x, y) || rng.chance(0.15)) continue;
        rubble[idx(x, y)] = 0;
        const fx = x + 0.5 + rng.range(-0.05, 0.05), fy = y + 0.5 + rng.range(-0.05, 0.05), size = rng.range(0.7, 0.82);
        features.push(rng.chance(0.6) ? { type: "crate", x: fx, y: fy, s: size, rot: rng.range(-0.2, 0.2) } : { type: "barrel", x: fx, y: fy, r: size * 0.48 });
      }
  for (const r of rooms) if (r.halls && !r.stacks && rng.chance(S.litHalls)) hallBraziers(g, r);
}
