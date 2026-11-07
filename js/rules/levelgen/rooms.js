// The rooms: placed (each of its region's kind: built, a cave, a hall of the
// king's), then carved: caves with rock formations in the big ones, built
// rooms, halls hewn (halls.js), and some built rooms fallen in.

import { T, carveCave } from "../dungeon.js";
import { CAVERN, COLLAPSED, HALLS, clamp, valueNoise } from "./make.js";
import { hewKind } from "./halls.js";
import { hypot } from "../dmath.js";

// Rooms placed; false if too few fit (the generator tries again).
export function placeRooms(g) {
  const { S, rng, W, H, n, typeAt } = g;
  // Rooms: a spot, and a room of its region's kind there.
  const rooms = g.rooms, target = Math.round((S.density * n) / 100);
  for (let tries = 0; tries < target * 50 && rooms.length < target; tries++) {
    const sx = rng.int(2, W - 3), sy = rng.int(2, H - 3), type = typeAt(sx, sy);
    const isCave = type === CAVERN || (type === COLLAPSED && rng.chance(0.4));
    let w, h;
    if (type === HALLS) {
      // (Big halls, an odd number of squares each way, so their rows of
      // columns sit evenly about the middle; standing tall as often as
      // lying wide.)
      let a = rng.int(5, 8) * 2 + 1, b = rng.int(4, 6) * 2 + 1;
      if (b > a) [a, b] = [b, a];
      [w, h] = rng.chance(0.5) ? [a, b] : [b, a];
    } else if (isCave) {
      w = Math.round(rng.int(7, 16) * S.caveSize);
      h = Math.round(rng.int(6, 12) * S.caveSize);
    } else {
      const big = rng.chance(0.25);
      w = big ? rng.int(9, 13) : rng.int(4, 9);
      h = big ? rng.int(7, 9) : rng.int(4, 7);
      // (Half of them an even number of squares each way, which pillars on
      // the grid crossings need to sit evenly.)
      if (rng.chance(0.5)) {
        w += w % 2;
        h += h % 2;
      }
    }
    w = clamp(w, 4, W - 6);
    h = clamp(h, 4, H - 6);
    const x = clamp(sx - (w >> 1), 2, W - w - 3), y = clamp(sy - (h >> 1), 2, H - h - 3);
    // (Halls further apart: their walls are dug out a square here and there.)
    if (rooms.some((o) => { const m = type === HALLS || o.halls ? 3 : 2; return x - m < o.x + o.w && x + w + m > o.x && y - m < o.y + o.h && y + h + m > o.y; })) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), cave: isCave, type, halls: type === HALLS, collapsed: !isCave && type === COLLAPSED && rng.chance(S.collapse) });
  }
  return rooms.length >= Math.max(3, target * 0.5);
}

// The rooms carved out of the rock.
export function carveRooms(g) {
  const { S, rng, W, H, tiles, cave, rubble, roomOf, idx, floorAt, rooms, reach, floorIn } = g;
  const fine = valueNoise(rng, W, H, 2.5);
  for (const [ri, r] of rooms.entries()) {
    if (r.cave) {
      carveCave(r, rng, (x, y) => {
        tiles[idx(x, y)] = T.FLOOR;
        cave[idx(x, y)] = 1;
        roomOf[idx(x, y)] = ri;
      });
      // Rock formations in a big cave: small clumps of rock (walled like the
      // cave) where the floor all round is open, kept only if the cave's
      // floor stays in one piece.
      const size = floorIn(r);
      if (size < 40) continue;
      const count = Math.round((S.formations * size) / 30 * rng.range(0.6, 1.4));
      for (let f = 0, tries = 0; f < count && tries < count * 10; tries++) {
        const fx = rng.int(r.x + 1, r.x + r.w - 2), fy = rng.int(r.y + 1, r.y + r.h - 2);
        if (Math.max(Math.abs(fx - r.cx), Math.abs(fy - r.cy)) < 2) continue;
        const clump = [[fx, fy]], want = rng.int(1, Math.max(1, Math.round(S.formationSize)));
        for (let g = 0; g < want * 4 && clump.length < want; g++) {
          const [bx, by] = rng.pick(clump), [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
          const nx = bx + dx, ny = by + dy;
          if (!clump.some(([ax, ay]) => ax === nx && ay === ny) && Math.max(Math.abs(nx - r.cx), Math.abs(ny - r.cy)) >= 2) clump.push([nx, ny]);
        }
        // Open floor all round it.
        const ok = clump.every(([cx, cy]) => {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!floorAt(cx + dx, cy + dy) && !clump.some(([ax, ay]) => ax === cx + dx && ay === cy + dy)) return false;
          return true;
        });
        if (!ok) continue;
        for (const [cx, cy] of clump) tiles[idx(cx, cy)] = T.ROCK;
        if (reach(r).size !== floorIn(r)) {
          for (const [cx, cy] of clump) tiles[idx(cx, cy)] = T.FLOOR;
          continue;
        }
        f++;
      }
    } else {
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          tiles[idx(x, y)] = T.FLOOR;
          roomOf[idx(x, y)] = ri;
          // (A hall's walls hewn roughly, as a cave's.)
          if (r.halls) cave[idx(x, y)] = 1;
        }
      if (r.halls) {
        hewKind(g, r, ri);
        continue;
      }
      if (!r.collapsed) continue;
      // Fallen in from a corner or a side: a ragged blob of rock (its edge,
      // and the walls about it, ragged like a cave's), leaving the middle;
      // floor cut off by it is buried too.
      const corners = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]], [ux, uy] = rng.pick(corners);
      const ex = r.x + ux * r.w, ey = r.y + uy * r.h, rad = Math.min(r.w, r.h) * rng.range(0.5, 0.85);
      for (let y = r.y - 2; y < r.y + r.h + 2; y++)
        for (let x = r.x - 2; x < r.x + r.w + 2; x++) {
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
          const d = hypot(x + 0.5 - ex, y + 0.5 - ey) / rad + (fine(x, y) - 0.5) * 0.7;
          if (d >= 1) continue;
          cave[idx(x, y)] = 1;
          if (Math.max(Math.abs(x - r.cx), Math.abs(y - r.cy)) > 1) tiles[idx(x, y)] = T.ROCK;
        }
      const kept = reach(r);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!kept.has(idx(x, y))) tiles[idx(x, y)] = T.ROCK;
      // Rubble on the floor near what fell.
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          if (!floorAt(x, y)) continue;
          let near = false;
          for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) near = !floorAt(x + dx, y + dy) && cave[idx(x + dx, y + dy)] === 1;
          if (near && rng.chance(S.rubble)) rubble[idx(x, y)] = rng.int(1, 3);
        }
    }
  }
}
