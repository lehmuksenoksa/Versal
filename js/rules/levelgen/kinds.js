// The dungeon rooms' kinds, furnished (spec/rebuild-plan.md, R8): a
// function a kind (FURNISH), and a function a way of lighting one (LIGHTINGS);
// which kinds there are, where each fits and how it's lit are data
// (js/content/rooms.json). A new kind is an entry there and a function here.
//
// Each takes the room's furnishing hand (furnish.js): the room `r`, its
// squares by the long way and across (`at`, `A`, `B`, `across`, `longSides`),
// what's free and taking a square (`free`, `take`), posts and columns
// (`post`, `column`), things in the corners (`corners`), evenly spaced places
// (`spread`), the room's sides and the rock round it (`SIDES`, `solid`,
// `hollow`, `mid`, `wh`), and the level's lists (`features`, `mustDoor`,
// `niches`, `roomLights`). Each is the old branch moved as it was: the dice
// thrown in the same order.

export const FURNISH = {
  plain({ S, rng, corners }) {
    if (rng.chance(S.decor * 0.7)) corners(rng.int(1, 3));
  },

  store({ r, S, rng, features, free, take, corners, mid, wh, SIDES }) {
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
  },

  gallery({ S, rng, at, A, B, post, corners }) {
    // Posts along both long walls, a square in from them, on every other
    // crossing (the long way being even, they sit evenly).
    for (let a = 2; a <= A - 2; a += 2) for (const b of [1, B - 1]) post(...at(a, b));
    if (rng.chance(S.decor * 0.5)) corners(rng.int(1, 2));
  },

  hall({ r, features, posts, across, post, solid, mid, SIDES, shape }) {
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
  },

  crypt({ r, features, niches, across, solid, hollow, mid, wh, lo, SIDES }) {
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
  },

  jail({ r, S, rng, features, mustDoor, corners, solid, hollow, mid, wh, SIDES }) {
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
  },

  barracks({ r, S, rng, features, A, B, longSides, free, take, corners, spread, mid, wh }) {
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
  },

  dining({ S, rng, features, at, A, B, across, free, take, corners, spread }) {
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
  },

  shrine({ r, rng, features, open, take, post, mid, wh, SIDES }) {
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
  },
};

// The lit rooms' lights, set so the columns, posts and big furniture throw
// shadows to sneak in (`brazier(a, b)`: one on the free square nearest a
// place along and across the room).
export const LIGHTINGS = {
  altarCandles({ features, roomLights }) {
    // Candles on the altar (which then throws no shadow of its own).
    const altar = features.findLast((f) => f.type === "altar");
    if (altar) {
      altar.holds = true;
      const along = altar.w > altar.h, flames = [-0.55, 0, 0.55].map((t) => (along ? [t, 0] : [0, t]));
      roomLights.push({ x: altar.x, y: altar.y, kind: "candles", flames });
      features.push({ type: "candles", x: altar.x, y: altar.y, flames });
    }
  },

  endOrMiddle({ r, rng, at, A, B, lo, brazier }) {
    // A brazier at one end of the long way (the sarcophagus throwing its
    // shadow on toward the other); in the middle of a small crypt.
    if (lo(r) >= 5) brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
    else brazier((A - 1) / 2, (B - 1) / 2);
  },

  end({ rng, at, A, B, brazier }) {
    // A brazier at one end of a dining hall (the tables throwing their
    // shadows down the room), of a barracks (between the rows of beds).
    // (Hearths are set aside for now: see BACKLOG.md.)
    brazier(rng.chance(0.5) ? 1 : A - 2, (B - 1) / 2);
  },

  downTheMiddle({ posts, A, B, spread, brazier }) {
    // Braziers down the middle, between the rows of posts.
    const [a0, n] = spread(A, 1, 5);
    for (let i = 0; i < n; i++) brazier(a0 + 5 * i, (B - 1) / 2);
  },

  middle({ A, B, corners, brazier }) {
    // In the middle (any columns round it throwing shadows out to the
    // corners); in a long room, two, a third of the way from each end.
    if (A >= 10) {
      brazier(Math.round((A - 1) / 3), (B - 1) / 2);
      brazier(Math.round((2 * (A - 1)) / 3), (B - 1) / 2);
    } else brazier((A - 1) / 2, (B - 1) / 2);
  },
};
