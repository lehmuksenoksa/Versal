// Furnishing the clean dungeon rooms: each of a kind (rooms.json), with
// what goes with it (kinds.js); lights in those to be lit; recesses in the
// walls.

import { T } from "../dungeon.js";
import { DUNGEON, ROOM_KINDS, fits } from "./make.js";
import { FURNISH, LIGHTINGS } from "./kinds.js";

export function furnishRooms(g) {
  const { S, rng, W, H, tiles, roomOf, idx, floorAt, rooms } = g;
  // Furnishing the clean dungeon rooms (built, in a dungeon region, not
  // fallen in): each of a kind, with what goes with it (pillars, niches and
  // cells cut into the rock round it, furniture), and now and then rows of
  // shallow recesses in its walls. Each thing is { type, x, y, ... } in
  // squares (x, y its middle). Furniture is only drawn; columns (pillars
  // filling a square) are rock; posts (pillars on a grid crossing) only
  // block a step diagonally past them.
  const { features, posts, recesses, mustDoor, niches, roomLights } = g;
  // A room's sides: its squares just outside the wall (v 0) and on into the
  // rock (v 1, 2, ...; v -1 is the floor just inside), u along the side;
  // and the way into the room from there.
  const SIDES = [
    { at: (r, u, v) => [r.x + u, r.y - 1 - v], len: (r) => r.w, into: [0, 1] },
    { at: (r, u, v) => [r.x + u, r.y + r.h + v], len: (r) => r.w, into: [0, -1] },
    { at: (r, u, v) => [r.x - 1 - v, r.y + u], len: (r) => r.h, into: [1, 0] },
    { at: (r, u, v) => [r.x + r.w + v, r.y + u], len: (r) => r.h, into: [-1, 0] },
  ];
  // Rock all over u0..u1, v0..v1 of a side, inside the level's edge.
  const solid = (r, sd, u0, u1, v0, v1) => {
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const [x, y] = sd.at(r, u, v);
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || tiles[idx(x, y)] !== T.ROCK) return false;
      }
    return true;
  };
  const hollow = (r, sd, u, v) => {
    const [x, y] = sd.at(r, u, v);
    tiles[idx(x, y)] = T.FLOOR;
    roomOf[idx(x, y)] = rooms.indexOf(r);
  };
  // The middle of a side's square (u and v may be fractions).
  const mid = (r, sd, u, v) => {
    const [x, y] = sd.at(r, u, v);
    return [x + 0.5, y + 0.5];
  };
  // Width and height (in squares) from the lengths along a side (a) and
  // across it (b).
  const wh = (sd, a, b) => (sd.into[0] ? { w: b, h: a } : { w: a, h: b });
  const thing = (x, y, size) =>
    features.push(rng.chance(0.6) ? { type: "crate", x, y, s: size, rot: rng.range(-0.25, 0.25) } : { type: "barrel", x, y, r: size * 0.5 });
  // One thing in the square at (x, y), or two smaller ones.
  const stuff = (x, y) => {
    if (rng.chance(0.3)) {
      thing(x + rng.range(0.27, 0.33), y + rng.range(0.27, 0.38), rng.range(0.38, 0.44));
      thing(x + rng.range(0.67, 0.73), y + rng.range(0.62, 0.73), rng.range(0.38, 0.44));
    } else thing(x + 0.5 + rng.range(-0.06, 0.06), y + 0.5 + rng.range(-0.06, 0.06), rng.range(0.58, 0.72));
  };
  // The kinds (rooms.json), in their order; how likely each, the level's
  // settings' weight (rooms.json's unless changed) where it fits.
  const KINDS = Object.keys(ROOM_KINDS);
  const lo = (r) => Math.min(r.w, r.h), hi = (r) => Math.max(r.w, r.h);
  for (const r of rooms) {
    if (r.cave || r.collapsed || r.type !== DUNGEON) continue;
    const inRoom = (x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    // Kept clear: the floor just inside each way in (and the sides with one).
    const used = new Set(), open = new Set();
    SIDES.forEach((sd, si) => {
      for (let u = 0; u < sd.len(r); u++) {
        const [x, y] = sd.at(r, u, 0);
        if (!floorAt(x, y)) continue;
        open.add(si);
        const ix = x + sd.into[0], iy = y + sd.into[1];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inRoom(ix + dx, iy + dy)) used.add(idx(ix + dx, iy + dy));
      }
    });
    const free = (x, y) => inRoom(x, y) && !used.has(idx(x, y));
    const take = (x, y) => used.add(idx(x, y));
    const shape = rng.chance(0.6) ? "round" : "square";
    // A post on the grid crossing (x, y); a column filling the square (x, y),
    // if it is free: rock, walled and hatched like the rest.
    const post = (x, y) => {
      features.push({ type: "post", x, y, shape });
      posts.push([x, y]);
      for (const [px, py] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) take(px, py);
    };
    const column = (x, y) => {
      if (!free(x, y)) return false;
      tiles[idx(x, y)] = T.ROCK;
      take(x, y);
      return true;
    };
    // Things in the free squares along the walls, nearest the corners first,
    // up to `count`.
    const corners = (count) => {
      const spots = [];
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
          if (!edge || !free(x, y)) continue;
          const d = Math.min(x - r.x, r.x + r.w - 1 - x) + Math.min(y - r.y, r.y + r.h - 1 - y);
          spots.push([d + rng.range(0, 2.5), x, y]);
        }
      spots.sort((a, b) => a[0] - b[0]);
      for (const [, x, y] of spots.slice(0, count)) {
        stuff(x, y);
        take(x, y);
      }
    };
    // Evenly spaced places `pitch` apart along a length, centred: the first
    // and how many, each `size` long.
    const spread = (length, size, pitch) => {
      const n = Math.max(0, Math.floor((length - size) / pitch) + 1);
      return [Math.floor((length - (pitch * (n - 1) + size)) / 2), n];
    };
    const weights = KINDS.map((k) => (fits(r, ROOM_KINDS[k].fits) ? Math.max(0, S[k]) : 0)), total = weights.reduce((a, b) => a + b, 0);
    let pick = rng.next() * total, kind = "plain";
    if (total > 0) kind = KINDS[Math.max(0, weights.findIndex((w) => (pick -= w) < 0))];
    r.kind = kind;
    const across = r.w >= r.h; // (the room's long way is across)
    // A square of the room by its place along the long way (a) and across it (b).
    const at = (a, b) => (across ? [r.x + a, r.y + b] : [r.x + b, r.y + a]);
    const A = across ? r.w : r.h, B = across ? r.h : r.w;
    const longSides = SIDES.filter((sd) => (sd.into[0] === 0) === across);
    // Columns holding up a big room (seven squares or more each way, not
    // already pillared), before anything else goes in: a few, set evenly
    // about its middle, four a third of the way in from the walls (and two
    // more in the middle of a long one), all or none.
    // (A room to be lit (see below) has them more often: their shadows are
    // somewhere to sneak.)
    const lightIt = rng.chance(S.litRooms);
    if (lo(r) >= 7 && ROOM_KINDS[kind].columns !== false && rng.chance(lightIt ? 0.85 : S.supports)) {
      const ia = Math.max(2, Math.round(A * 0.28)), ib = Math.max(2, Math.round(B * 0.28));
      const as = [ia, A - 1 - ia], bs = [...new Set([ib, B - 1 - ib])];
      if (A % 2 === 1 && A >= 2 * B - 1 && A >= 11) as.push((A - 1) / 2);
      const sq = as.flatMap((a) => bs.map((b) => at(a, b)));
      if (sq.every((p) => free(...p))) for (const p of sq) column(...p);
    }
    // The kind's furniture (kinds.js), with the room's furnishing hand.
    const hand = { r, S, rng, features, posts, mustDoor, niches, open, at, A, B, across, longSides, free, take, post, column, corners, spread, solid, hollow, mid, wh, lo, hi, SIDES, roomLights, floorAt, idx, shape };
    FURNISH[kind](hand);
    // Lit rooms, lit by lights of their own that suit them, set so the
    // columns, posts and big furniture throw shadows to sneak in.
    if (lightIt) {
      const before = roomLights.length;
      // A brazier on a free square (in the way), the nearest free one to the
      // place (a, b) along and across the room.
      const brazier = (a, b) => {
        let bestSq = null;
        for (let y = r.y; y < r.y + r.h; y++)
          for (let x = r.x; x < r.x + r.w; x++) {
            if (!free(x, y) || !floorAt(x, y)) continue;
            const [px, py] = at(a, b), d = Math.hypot(x - px, y - py);
            if (d <= 1.5 && (!bestSq || d < bestSq.d)) bestSq = { x, y, d };
          }
        if (!bestSq) return;
        take(bestSq.x, bestSq.y);
        roomLights.push({ x: bestSq.x + 0.5, y: bestSq.y + 0.5, kind: "brazier", block: idx(bestSq.x, bestSq.y) });
        features.push({ type: "brazier", x: bestSq.x + 0.5, y: bestSq.y + 0.5 });
      };
      hand.brazier = brazier;
      LIGHTINGS[ROOM_KINDS[kind].light](hand);
      if (roomLights.length > before) r.lit = true;
    }
    // Recesses: rows of shallow alcoves (a fifth of a square deep) along a
    // wall or two, evenly spaced, clear of the ways in.
    if (ROOM_KINDS[kind].recesses !== false && !r.halfPosts && rng.chance(S.recesses)) {
      const pitch = rng.pick([2, 3]), wide = rng.range(0.45, 0.65);
      for (const sd of rng.chance(0.5) ? longSides : [rng.pick(SIDES)]) {
        const [u0, n] = spread(sd.len(r) - 2, 1, pitch);
        for (let i = 0; i < n; i++) {
          const u = 1 + u0 + pitch * i;
          if (!solid(r, sd, u - 1, u + 1, 0, 0)) continue;
          const [x, y] = sd.at(r, u, -1);
          recesses.push({ x, y, dx: -sd.into[0], dy: -sd.into[1], w: wide });
        }
      }
    }
  }
}
