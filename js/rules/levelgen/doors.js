// Doors into the clean dungeon rooms, and some of them secret.

import { T } from "../dungeon.js";
import { DUNGEON } from "./make.js";

export function placeDoors(g) {
  const { S, rng, area, cave, rubble, idx, floorAt, rooms, niches, mustDoor } = g;
  // Doors: only into clean dungeon rooms (built, in a dungeon region, not
  // fallen in), where the way in is one square wide, walled on both sides
  // (just outside the room, the way in going into it), and that square and
  // the walls beside it are plain built ground: no rubble, nothing caved.
  const { doors } = g;
  const plain = (x, y) => area[idx(x, y)] === DUNGEON && !cave[idx(x, y)] && !rubble[idx(x, y)];
  for (const r of rooms) {
    if (r.cave || r.collapsed || r.type !== DUNGEON) continue;
    const ways = [];
    for (let x = r.x; x < r.x + r.w; x++) ways.push([x, r.y - 1, 0, 1], [x, r.y + r.h, 0, -1]);
    for (let y = r.y; y < r.y + r.h; y++) ways.push([r.x - 1, y, 1, 0], [r.x + r.w, y, -1, 0]);
    for (const [x, y, dx, dy] of ways) {
      // (A way in: floor on both sides of the wall's square; not a niche.)
      if (!floorAt(x, y) || !floorAt(x + dx, y + dy) || !floorAt(x - dx, y - dy) || niches.has([x, y].join())) continue;
      // Walled to either side, along the wall.
      if (floorAt(x + dy, y + dx) || floorAt(x - dy, y - dx)) continue;
      if (!plain(x, y) || !plain(x + dy, y + dx) || !plain(x - dy, y - dx)) continue;
      // (Every cell of a jail has its door.)
      if (mustDoor.has([x, y].join()) || rng.chance(S.doors)) doors.push({ x, y, dx, dy, open: rng.chance(S.openDoors) });
    }
  }
}

// Secret doors (none by the start room); returns them.
// (`from`: where the player arrives; `goals`: the way on, the stairs down or
// the king's seat. None is made secret that would leave the way on only
// through it: yours, "Way out shouldn't require a secret door.")
export function hideSecretDoors(g, startRoom, from = null, goals = []) {
  const { S, rng, tiles, idx, doors, mustDoor, W, H, blocks } = g;
  // (Can the player walk from `from` to every goal, as the level is now?)
  const wayOn = () => {
    if (!from) return true;
    const got = new Uint8Array(W * H), q = [idx(from.x, from.y)];
    got[q[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % W, y = (q[i] - x) / W;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, n = idx(nx, ny);
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || got[n] || tiles[n] !== T.FLOOR || blocks.has(n)) continue;
          got[n] = 1;
          q.push(n);
        }
    }
    return goals.every((s) => got[idx(s.x, s.y)]);
  };
  // Secret doors: their squares rock until found (each { x, y, dx, dy }, as
  // a door).
  // (Not by the start room; and not one of two doors in a row through a
  // thick wall, which would open onto a secret door, or two in a row.)
  const secrets = [], inStart = (x, y) => x >= startRoom.x && y >= startRoom.y && x < startRoom.x + startRoom.w && y < startRoom.y + startRoom.h;
  const doorSq = new Set(doors.map((d) => idx(d.x, d.y))), paired = (d) => doorSq.has(idx(d.x + d.dx, d.y + d.dy)) || doorSq.has(idx(d.x - d.dx, d.y - d.dy));
  for (const d of [...doors]) {
    if (mustDoor.has([d.x, d.y].join()) || inStart(d.x + d.dx, d.y + d.dy) || inStart(d.x - d.dx, d.y - d.dy) || paired(d) || !rng.chance(S.secretDoors)) continue;
    tiles[idx(d.x, d.y)] = T.ROCK;
    if (!wayOn()) {
      tiles[idx(d.x, d.y)] = T.FLOOR;
      continue;
    }
    doors.splice(doors.indexOf(d), 1);
    secrets.push({ x: d.x, y: d.y, dx: d.dx, dy: d.dy });
  }
  return secrets;
}
