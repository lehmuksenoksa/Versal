// Furnishing the clean dungeon rooms: each of a kind, with what goes with
// it; lights in those to be lit; recesses in the walls.

import { T } from "../dungeon.js";
import { DUNGEON } from "./make.js";

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
  const KINDS = ["plain", "store", "gallery", "hall", "crypt", "jail", "barracks", "dining", "shrine"];
  const lo = (r) => Math.min(r.w, r.h), hi = (r) => Math.max(r.w, r.h);
  // Where each kind fits.
  const fits = {
    plain: () => true, store: () => true, crypt: () => true,
    gallery: (r) => lo(r) >= 4 && hi(r) >= 6 && hi(r) % 2 === 0,
    hall: (r) => lo(r) >= 4 && r.w % 2 === 0 && r.h % 2 === 0,
    jail: (r) => hi(r) >= 5,
    barracks: (r) => lo(r) >= 4 && hi(r) >= 5,
    dining: (r) => lo(r) >= 3 && hi(r) >= 4,
    shrine: (r) => lo(r) >= 4,
  };
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
    const weights = KINDS.map((k) => (fits[k](r) ? Math.max(0, S[k]) : 0)), total = weights.reduce((a, b) => a + b, 0);
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
    if (lo(r) >= 7 && kind !== "hall" && kind !== "gallery" && rng.chance(lightIt ? 0.85 : S.supports)) {
      const ia = Math.max(2, Math.round(A * 0.28)), ib = Math.max(2, Math.round(B * 0.28));
      const as = [ia, A - 1 - ia], bs = [...new Set([ib, B - 1 - ib])];
      if (A % 2 === 1 && A >= 2 * B - 1 && A >= 11) as.push((A - 1) / 2);
      const sq = as.flatMap((a) => bs.map((b) => at(a, b)));
      if (sq.every((p) => free(...p))) for (const p of sq) column(...p);
    }
    if (kind === "store") {
      // Shelves along a wall or two (the longest free stretch of each, up to
      // four squares), and things in the corners.
      for (const sd of rng.shuffle([...SIDES]).slice(0, rng.int(1, 2))) {
        let best = null;
        for (let u = 0, run = 0; u <= sd.len(r); u++) {
          const [x, y] = u < sd.len(r) ? sd.at(r, u, -1) : [-1, -1];
          if (u < sd.len(r) && free(x, y)) run++;
          else {
            if (run >= 2 && (!best || run > best[1])) best = [u - run, run];
            run = 0;
          }
        }
        if (!best) continue;
        const n = Math.min(4, best[1]), u0 = best[0] + Math.floor((best[1] - n) / 2), [x, y] = mid(r, sd, u0 + (n - 1) / 2, -1);
        features.push({ type: "shelf", x: x - sd.into[0] * 0.22, y: y - sd.into[1] * 0.22, ...wh(sd, n - 0.15, 0.48), n });
        for (let u = u0; u < u0 + n; u++) take(...sd.at(r, u, -1));
      }
      corners(Math.round(r.w * r.h * (0.08 + 0.2 * S.decor)));
    } else if (kind === "plain") {
      if (rng.chance(S.decor * 0.7)) corners(rng.int(1, 3));
    } else if (kind === "gallery") {
      // Posts along both long walls, a square in from them, on every other
      // crossing (the long way being even, they sit evenly).
      for (let a = 2; a <= A - 2; a += 2) for (const b of [1, B - 1]) post(...at(a, b));
      if (rng.chance(S.decor * 0.5)) corners(rng.int(1, 2));
    } else if (kind === "hall") {
      // Filled with posts (the room being even each way): on every other
      // crossing right across it, and half posts on the walls in step with
      // them (where the wall is whole).
      for (let y = r.y + 2; y <= r.y + r.h - 2; y += 2) for (let x = r.x + 2; x <= r.x + r.w - 2; x += 2) post(x, y);
      r.halfPosts = true;
      for (const sd of SIDES)
        for (let u = 2; u < sd.len(r); u += 2) {
          // (The crossing between squares u - 1 and u of the wall.)
          if (!solid(r, sd, u - 1, u, 0, 0)) continue;
          const [ax, ay] = mid(r, sd, u - 1, -1), [bx, by] = mid(r, sd, u, -1);
          features.push({ type: "post", x: (ax + bx) / 2 - sd.into[0] * 0.5, y: (ay + by) / 2 - sd.into[1] * 0.5, shape });
        }
    } else if (kind === "crypt") {
      // Niches two deep cut every other square round the walls, each with a
      // coffin; a sarcophagus in the middle of a bigger crypt.
      for (const sd of SIDES)
        for (let u = 1; u < sd.len(r) - 1; u += 2) {
          if (!solid(r, sd, u - 1, u + 1, 0, 2)) continue;
          hollow(r, sd, u, 0);
          hollow(r, sd, u, 1);
          niches.add(sd.at(r, u, 0).join());
          const [x, y] = mid(r, sd, u, 0.5);
          features.push({ type: "coffin", x, y, ...wh(sd, 0.66, 1.6), hx: -sd.into[0], hy: -sd.into[1] });
        }
      if (lo(r) >= 5) features.push({ type: "sarcophagus", x: r.x + r.w / 2, y: r.y + r.h / 2, ...(across ? { w: 2.1, h: 1.05 } : { w: 1.05, h: 2.1 }) });
    } else if (kind === "jail") {
      // Cells two by two cut behind a wall (or more), each through a doorway
      // with a door, a bench against its back wall.
      let cells = 0;
      for (const sd of rng.shuffle([...SIDES])) {
        if (cells >= 2) break;
        const cw = 2, cd = 2;
        for (let u = 0; u + cw - 1 < sd.len(r); u += cw + 1) {
          if (!solid(r, sd, u - 1, u + cw, 0, cd + 1)) continue;
          const du = u + rng.int(0, cw - 1);
          hollow(r, sd, du, 0);
          mustDoor.add(sd.at(r, du, 0).join());
          for (let v = 1; v <= cd; v++) for (let a = u; a < u + cw; a++) hollow(r, sd, a, v);
          const [x, y] = mid(r, sd, u + (cw - 1) / 2, cd);
          features.push({ type: "bench", x: x - sd.into[0] * 0.27, y: y - sd.into[1] * 0.27, ...wh(sd, cw - 0.45, 0.4) });
          cells++;
        }
      }
      if (rng.chance(S.decor)) corners(rng.int(1, 2));
    } else if (kind === "barracks") {
      // Beds in a row along each long wall (one, in a narrow room), every
      // other square, heads to the wall, the rows matching.
      const [a0, n] = spread(A, 1, 2);
      for (const sd of B >= 5 ? longSides : [rng.pick(longSides)])
        for (let i = 0; i < n; i++) {
          const u = a0 + 2 * i, [x1, y1] = sd.at(r, u, -1), [x2, y2] = sd.at(r, u, -2);
          if (!free(x1, y1) || !free(x2, y2)) continue;
          take(x1, y1);
          take(x2, y2);
          const [x, y] = mid(r, sd, u, -1.5);
          features.push({ type: "bed", x: x - sd.into[0] * 0.1, y: y - sd.into[1] * 0.1, ...wh(sd, 0.74, 1.62), hx: -sd.into[0], hy: -sd.into[1] });
        }
      if (rng.chance(S.decor)) corners(rng.int(1, 2));
    } else if (kind === "dining") {
      // Tables two squares long, chairs either side, in rows with room to
      // walk between them.
      const [a0, na] = spread(A - 2, 2, 3), [b0, nb] = spread(B - 2, 1, 3);
      for (let i = 0; i < na; i++)
        for (let k = 0; k < nb; k++) {
          const a = 1 + a0 + 3 * i, b = 1 + b0 + 3 * k, t1 = at(a, b), t2 = at(a + 1, b);
          if (!free(...t1) || !free(...t2)) continue;
          take(...t1);
          take(...t2);
          const [cx, cy] = at(a + 1, b + 0.5);
          features.push({ type: "table", x: cx, y: cy, ...(across ? { w: 1.75, h: 0.9 } : { w: 0.9, h: 1.75 }) });
          for (const t of [a, a + 1])
            for (const side of [-1, 1]) {
              const c = at(t, b + side);
              if (!free(...c) || !rng.chance(0.85)) continue;
              const [x, y] = at(t + 0.5, b + 0.5 + side * 0.78);
              features.push({ type: "chair", x, y, s: 0.36, hx: across ? 0 : side, hy: across ? side : 0 });
            }
        }
      if (rng.chance(S.decor)) corners(rng.int(1, 3));
    } else if (kind === "shrine") {
      // An altar against a wall with no way in, pillars either side of it two
      // squares off.
      const closed = SIDES.filter((sd, si) => !open.has(si)), sd = closed.length ? rng.pick(closed) : rng.pick(SIDES);
      const L = sd.len(r), [ax, ay] = mid(r, sd, (L - 1) / 2, -1);
      features.push({ type: "altar", x: ax - sd.into[0] * 0.12, y: ay - sd.into[1] * 0.12, ...wh(sd, 1.7, 0.75) });
      for (const [x, y] of [sd.at(r, Math.round((L - 1) / 2 - 2), -1), sd.at(r, Math.round((L - 1) / 2 + 2), -1)]) take(x, y);
      if (L >= 6) {
        const along = [-sd.into[1], sd.into[0]];
        for (const side of [-1, 1]) post(Math.round(ax + sd.into[0] * 0.5 + along[0] * side * 2), Math.round(ay + sd.into[1] * 0.5 + along[1] * side * 2));
      }
    }
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
      if (kind === "shrine") {
        // Candles on the altar (which then throws no shadow of its own).
        const altar = features.findLast((f) => f.type === "altar");
        if (altar) {
          altar.holds = true;
          const along = altar.w > altar.h, flames = [-0.55, 0, 0.55].map((t) => (along ? [t, 0] : [0, t]));
          roomLights.push({ x: altar.x, y: altar.y, kind: "candles", flames });
          features.push({ type: "candles", x: altar.x, y: altar.y, flames });
        }
      } else if (kind === "crypt") {
        // A brazier at one end of the long way (the sarcophagus throwing its
        // shadow on toward the other); in the middle of a small crypt.
        if (lo(r) >= 5) brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
        else brazier((A - 1) / 2, (B - 1) / 2);
      } else if (kind === "dining" || kind === "barracks") {
        // A brazier at one end of a dining hall (the tables throwing their
        // shadows down the room), of a barracks (between the rows of beds).
        // (Hearths are set aside for now: see BACKLOG.md.)
        brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
      } else if (kind === "gallery") {
        // Braziers down the middle, between the rows of posts.
        const [a0, n] = spread(A, 1, 5);
        for (let i = 0; i < n; i++) brazier(a0 + 5 * i, (B - 1) / 2);
      } else {
        // In the middle (any columns round it throwing shadows out to the
        // corners); in a long room, two, a third of the way from each end.
        if (A >= 10) {
          brazier(Math.round((A - 1) / 3), (B - 1) / 2);
          brazier(Math.round((2 * (A - 1)) / 3), (B - 1) / 2);
        } else brazier((A - 1) / 2, (B - 1) / 2);
      }
      if (roomLights.length > before) r.lit = true;
    }
    // Recesses: rows of shallow alcoves (a fifth of a square deep) along a
    // wall or two, evenly spaced, clear of the ways in.
    if (kind !== "crypt" && !r.halfPosts && rng.chance(S.recesses)) {
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
