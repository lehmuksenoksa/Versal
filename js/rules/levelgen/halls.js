// The king's halls: which kind of hall each is (`hallKind`), and each hewn
// out of the rock to its plan.

import { T, carveCave } from "../dungeon.js";
import { CAVERN } from "./make.js";

export function chooseHallKinds(g) {
  const { rng, rooms, across, S, to, typeAt } = g;
  // Kinds of hall (the king's), each its own plan, by where it is and what
  // fits it (`hallKind`). The throne room (the biggest hall in the far third,
  // on a level with a throne) is L: a nave of columns leading to an apse
  // where the king sits. The hall most by the caverns is K: begun in
  // a cave and squared off at the other end. The smallest of the rest, when
  // there are four halls or more, is I: a storeroom. The others take turns
  // at A (columns in rows along the long way), B (a forest of columns), C
  // (round, a ring of columns, cut clean), D (a crossing), F (split by a
  // wall of rock with gaps in it) and J (dug round an uncut core), each
  // where it fits.
  const halls = rooms.filter((r) => r.halls);
  if (halls.length) {
    if (across && S.throne) {
      const far = rooms.filter((r) => r.type === to).sort((a, b) => a.cx - b.cx);
      const T0 = [...far.slice(-Math.max(1, Math.ceil(far.length / 3)))].sort((a, b) => b.w * b.h - a.w * a.h)[0];
      if (T0?.halls) T0.hallKind = "L";
    }
    const caveNear = (r) => {
      let c = 0;
      for (let y = r.y - 4; y < r.y + r.h + 4; y++) for (let x = r.x - 4; x < r.x + r.w + 4; x++) if (typeAt(x, y) === CAVERN) c++;
      return c;
    };
    halls.filter((r) => !r.hallKind).map((r) => [r, caveNear(r)]).filter(([, c]) => c > 12).sort((a, b) => b[1] - a[1]).slice(0, 1).forEach(([r]) => (r.hallKind = "K"));
    const left = halls.filter((r) => !r.hallKind);
    if (halls.length >= 4 && left.length >= 2) left.sort((a, b) => a.w * a.h - b.w * b.h)[0].hallKind = "I";
    const fits = {
      A: () => true, B: () => true, F: (r) => Math.max(r.w, r.h) >= 13,
      C: (r) => Math.min(r.w, r.h) >= 11 && Math.abs(r.w - r.h) <= 4, D: (r) => Math.min(r.w, r.h) >= 13,
      J: (r) => Math.min(r.w, r.h) >= 11 && Math.max(r.w, r.h) >= 13,
    };
    // (The biggest first, and the kinds used least, those that fit fewest
    // halls before the rest.)
    const used = Object.fromEntries(Object.keys(fits).map((k) => [k, 0])), rank = { D: 0, J: 1, C: 2, F: 3, B: 4, A: 5 };
    for (const r of halls.filter((r) => !r.hallKind).sort((a, b) => b.w * b.h - a.w * a.h)) {
      const order = Object.keys(fits).map((k) => [k, used[k] + rank[k] * 0.1 + rng.next() * 0.25]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
      r.hallKind = order.find((k) => fits[k](r));
      used[r.hallKind]++;
    }
  }
}

  // A hall dug out of the rock: its walls hewn unevenly, in stretches of a
  // few squares cut a square further back or left a square standing in, its
  // corners cut off; and two rows of rough columns along it, evenly spaced
  // and even about its middle, a broad aisle down the middle and narrower
  // ones along the walls. (The columns, rock a square each, are kept in
  // `hallColumns`, put back after the corridors, which may cut through.)
export function hewHall(g, r, ri) {
  const { rng, W, H, tiles, cave, roomOf, idx, floorAt, reach, hallColumns } = g;
    const open = (x, y) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
      tiles[idx(x, y)] = T.FLOOR;
      cave[idx(x, y)] = 1;
      roomOf[idx(x, y)] = ri;
    };
    const shut = (x, y) => {
      tiles[idx(x, y)] = T.ROCK;
      cave[idx(x, y)] = 1;
      roomOf[idx(x, y)] = -1;
    };
    // Each side, from corner to corner: [x, y] of its i-th square inside, and
    // the way out through the wall.
    const sides = [
      { len: r.w, at: (i) => [r.x + i, r.y], out: [0, -1] },
      { len: r.w, at: (i) => [r.x + i, r.y + r.h - 1], out: [0, 1] },
      { len: r.h, at: (i) => [r.x, r.y + i], out: [-1, 0] },
      { len: r.h, at: (i) => [r.x + r.w - 1, r.y + i], out: [1, 0] },
    ];
    for (const sd of sides)
      for (let i = 1; i < sd.len - 1; ) {
        const run = Math.min(rng.int(2, 4), sd.len - 1 - i), v = rng.next(), cut = v < 0.35 ? 1 : v < 0.65 ? -1 : 0;
        for (let k = i; k < i + run; k++) {
          const [x, y] = sd.at(k);
          if (cut > 0) open(x + sd.out[0], y + sd.out[1]);
          else if (cut < 0) shut(x, y);
        }
        i += run;
      }
    // The corners cut off: the corner square, and on a bigger hall sometimes
    // the squares beside it too.
    for (const [cx, cy, sx, sy] of [[r.x, r.y, 1, 1], [r.x + r.w - 1, r.y, -1, 1], [r.x, r.y + r.h - 1, 1, -1], [r.x + r.w - 1, r.y + r.h - 1, -1, -1]]) {
      shut(cx, cy);
      if (rng.chance(0.5)) shut(cx + sx, cy);
      if (rng.chance(0.5)) shut(cx, cy + sy);
    }
    // (Any square dug out that the corners' cutting left cut off, filled in.)
    const kept = reach(r);
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (floorAt(x, y) && !kept.has(idx(x, y))) shut(x, y);
    // The rows of columns, along the hall's longer way: as many as fit three
    // or four squares apart, two squares in from the ends at least, an even
    // spread (so they sit evenly about the middle).
    const along = r.w >= r.h, len = along ? r.w : r.h, wide = along ? r.h : r.w;
    let best = null;
    for (const step of [3, 4])
      for (let k = 2; (k - 1) * step <= len - 5; k++) {
        const span = (k - 1) * step;
        if (span % 2) continue;
        if (!best || k > best.k || (k === best.k && span > best.span)) best = { k, step, span };
      }
    if (!best) return;
    const off = wide >= 13 ? 3 : 2, start = (len - 1 - best.span) / 2;
    // (Kept for lighting it: the columns' places along it, and the middle of
    // the aisle between the rows.)
    r.nave = { along, mid: (wide - 1) / 2, us: Array.from({ length: best.k }, (_, k) => start + k * best.step) };
    for (const across of [off, wide - 1 - off])
      for (let k = 0; k < best.k; k++) {
        const u = start + k * best.step, [x, y] = along ? [r.x + u, r.y + across] : [r.x + across, r.y + u];
        shut(x, y);
        hallColumns.push(idx(x, y));
      }

}

  // The other kinds of hall (A is hewHall's): the plan's floor (`inside`,
  // by u along the hall and v across it), the rest of the box shut; the
  // walls hewn unevenly in runs (by noise; C cut clean, its walls as built
  // ones); rock left standing in it (`cores`: walls, a core) and columns,
  // both put back after the corridors; floor cut off filled in. And where
  // its braziers go (`lamps`, squares; the throne room's either side of the
  // king's seat, `seat`), what a storeroom stacks (`stacks`).
export function hewKind(g, r, ri) {
  const { rng, W, H, tiles, cave, roomOf, idx, floorAt, typeAt, hewNoise, hallColumns } = g;
    const kind = r.hallKind ?? "A";
    if (kind === "A") return hewHall(g, r, ri);
    const along = r.w >= r.h, len = along ? r.w : r.h, wide = along ? r.h : r.w, mid = (wide - 1) / 2, cu = (len - 1) / 2;
    let flip = false;
    const at = (u, v) => {
      const uu = Math.round(flip ? len - 1 - u : u), vv = Math.round(v);
      return along ? [r.x + uu, r.y + vv] : [r.x + vv, r.y + uu];
    };
    // (Places along a run of n squares: as many as fit three or four apart,
    // two in from the ends at least, evenly about its middle.)
    const rows = (n) => {
      let best = null;
      for (const step of [3, 4])
        for (let k = 2; (k - 1) * step <= n - 5; k++) {
          const span = (k - 1) * step;
          if ((n - 1 - span) % 2 === 0 && (!best || k > best.k)) best = { k, step, start: (n - 1 - span) / 2 };
        }
      return best ? Array.from({ length: best.k }, (_, i) => best.start + i * best.step) : [Math.floor((n - 1) / 2)];
    };
    const off = wide >= 13 ? 3 : 2;
    let inside = () => true, rough = 0.8, cut = false;
    const cols = [], cores = [], lamps = [];
    if (kind === "B") {
      for (const u of rows(len)) for (const v of rows(wide)) cols.push([u, v]);
      lamps.push(...(len >= 15 ? [[Math.round(len / 3), mid], [Math.round((2 * len) / 3) - 1, mid]] : [[cu, mid]]));
    } else if (kind === "C") {
      cut = true;
      rough = 0;
      inside = (u, v) => ((u - cu) / (len / 2)) ** 2 + ((v - mid) / (wide / 2)) ** 2 < 0.97;
      for (let k = 0; k < 8; k++) cols.push([cu + Math.cos((k * Math.PI) / 4) * len * 0.29, mid + Math.sin((k * Math.PI) / 4) * wide * 0.29]);
      lamps.push([cu, mid]);
    } else if (kind === "D") {
      rough = 0.5;
      inside = (u, v) => Math.abs(u - cu) <= 3 || Math.abs(v - mid) <= 3;
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) cols.push([cu + a, mid + b]);
      for (const s of [-1, 1]) {
        if (len >= 15) cols.push([cu + s * 6, mid - 2], [cu + s * 6, mid + 2]);
        if (wide >= 15) cols.push([cu - 2, mid + s * 6], [cu + 2, mid + s * 6]);
      }
      lamps.push([cu, mid]);
    } else if (kind === "F") {
      rough = 0.7;
      const gaps = [0.25, 0.5, 0.75].map((t) => Math.round(t * (len - 1)));
      for (let u = 0; u < len; u++) {
        if (gaps.some((g) => u === g || u === g + 1)) continue;
        cores.push([u, mid]);
        if (hewNoise(...at(u, mid + 1)) > 0.5 && wide >= 11) cores.push([u, mid + 1]);
      }
      lamps.push([Math.round(len * 0.375), Math.round(mid / 2)], [Math.round(len * 0.625), Math.round(mid + 1 + (wide - mid - 1) / 2)]);
    } else if (kind === "J") {
      for (let u = 3; u <= len - 4; u++)
        for (let v = 3; v <= wide - 4; v++) {
          const t = hewNoise(...at(u, v)), edge = u === 3 || u === len - 4 || v === 3 || v === wide - 4;
          if (!edge || t > 0.3) cores.push([u, v]);
        }
      lamps.push([cu, 1], [cu, wide - 2]);
    } else if (kind === "I") {
      rough = 0.7;
      r.stacks = [];
      for (let u = 1; u + 2 <= len - 2; u += 4) for (let v = 1; v + 1 <= wide - 2; v += 3) r.stacks.push({ squares: [0, 1, 2].flatMap((du) => [0, 1].map((dv) => at(u + du, v + dv))) });
    } else if (kind === "K") {
      // (The cave end toward the caverns.)
      const cavernBy = (u0, u1) => {
        let c = 0;
        for (let u = u0; u <= u1; u++) for (let v = -3; v < wide + 3; v++) if (typeAt(...at(u, v)) === CAVERN) c++;
        return c;
      };
      flip = cavernBy(len - 4, len + 3) > cavernBy(-4, 3);
      const h0 = Math.floor(len * 0.45);
      rough = 0.35;
      inside = (u) => u >= h0;
      for (const u of rows(len - h0).map((u) => u + h0)) cols.push([u, off], [u, wide - 1 - off]);
      lamps.push([Math.round((h0 + len - 1) / 2), mid]);
    } else if (kind === "L") {
      // (The apse at the end toward the level's edge.)
      flip = along ? r.cx < W / 2 : r.cy < H / 2;
      const ar = Math.max(3, Math.floor((wide - 1) / 2) - 1), un = len - 1 - ar;
      rough = 0.45;
      inside = (u, v) => u <= un || Math.hypot(u - un, v - mid) < ar + 0.6;
      for (const u of rows(un + 1)) cols.push([u, off], [u, wide - 1 - off]);
      const us = un + Math.max(1, ar - 2);
      r.seat = (([x, y]) => ({ x, y }))(at(us, mid));
      lamps.push([us, mid - 2], [us, mid + 2]);
    }
    const sq = (list) => list.map(([u, v]) => at(u, v));
    const colSq = sq(cols), coreSq = sq(cores);
    const set = (x, y, floor) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
      tiles[idx(x, y)] = floor ? T.FLOOR : T.ROCK;
      cave[idx(x, y)] = cut ? 0 : 1;
      roomOf[idx(x, y)] = floor ? ri : -1;
    };
    for (let u = 0; u < len; u++) for (let v = 0; v < wide; v++) if (!inside(u, v)) set(...at(u, v), false);
    if (kind === "K") {
      const [x0, y0] = at(0, 0), [x1, y1] = at(Math.ceil(len * 0.6), wide - 1);
      const box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1 };
      box.cx = box.x + (box.w >> 1);
      box.cy = box.y + (box.h >> 1);
      carveCave(box, rng, (x, y) => set(x, y, true));
    }
    // Hewn unevenly (not near the columns, the rock left standing, the seat).
    const near = new Set();
    for (const [x, y] of [...colSq, ...coreSq, ...(r.seat ? [[r.seat.x, r.seat.y]] : [])]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near.add(idx(x + dx, y + dy));
    if (rough > 0) {
      const edge = [];
      for (let y = r.y - 1; y <= r.y + r.h; y++)
        for (let x = r.x - 1; x <= r.x + r.w; x++) {
          const f = floorAt(x, y);
          if (!near.has(idx(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floorAt(x + dx, y + dy) !== f)) edge.push([x, y, f]);
        }
      for (const [x, y, f] of edge) {
        const t = hewNoise(x, y);
        if (f && t < 0.3 * rough) set(x, y, false);
        else if (!f && t > 1 - 0.3 * rough) set(x, y, true);
      }
    } else for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) cave[idx(x, y)] = 0;
    for (const [x, y] of [...coreSq, ...colSq]) {
      set(x, y, false);
      hallColumns.push(idx(x, y));
    }
    // (Floor cut off from the most of it, filled in.)
    const parts = [], seen = new Set();
    for (let y = r.y - 1; y <= r.y + r.h; y++)
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (!floorAt(x, y) || seen.has(idx(x, y))) continue;
        const part = [idx(x, y)], q = [[x, y]];
        seen.add(idx(x, y));
        while (q.length) {
          const [px, py] = q.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = px + dx, ny = py + dy;
            if (nx < r.x - 1 || ny < r.y - 1 || nx > r.x + r.w || ny > r.y + r.h || !floorAt(nx, ny) || seen.has(idx(nx, ny))) continue;
            seen.add(idx(nx, ny));
            part.push(idx(nx, ny));
            q.push([nx, ny]);
          }
        }
        parts.push(part);
      }
    parts.sort((a, b) => b.length - a.length);
    for (const part of parts.slice(1)) for (const j of part) set(j % W, Math.floor(j / W), false);
    r.lamps = sq(lamps);

}
