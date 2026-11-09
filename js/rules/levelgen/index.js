// Level generation by areas: the order of it all (see ../levelgen.js for
// what a level is). Each part is its own file; they work on the level in the
// making (make.js) in this order, which is the order the dice are thrown in,
// so the same seed makes the same level.

import { T } from "../dungeon.js";
import { DUNGEON, LEVELGEN_DEFAULTS, clamp, valueNoise, makeLevel } from "./make.js";
import { layRegions } from "./regions.js";
import { placeRooms, carveRooms } from "./rooms.js";
import { chooseHallKinds } from "./halls.js";
import { digCorridors } from "./corridors.js";
import { furnishRooms } from "./furnish.js";
import { placeDoors, hideSecretDoors } from "./doors.js";
import { placeLights, hallBraziers } from "./lights.js";
import { hypot } from "../dmath.js";

export { AREAS, LIGHTS, lightReach, LEVELGEN_DEFAULTS } from "./make.js";

export function generateAreas(rng, settings = {}) {
  const S = { ...LEVELGEN_DEFAULTS, ...settings };
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = tryAreas(S, rng);
    if (level) return withMargin(level, Math.max(0, Math.round(S.margin)));
  }
  throw new Error("level generation failed");
}

// The level with `m` squares of rock added all round: every square's values
// moved (rock outside; the region of the nearest square), and everything
// placed in squares moved with them (each thing once: the start may be the
// stairs).
function withMargin(L, m) {
  if (!m) return L;
  const W0 = L.w, H0 = L.h, W = W0 + 2 * m, H = H0 + 2 * m, n = W * H;
  const grow = (a, key) => {
    const b = new a.constructor(n);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const ix = x - m, iy = y - m, inside = ix >= 0 && iy >= 0 && ix < W0 && iy < H0;
        b[y * W + x] = inside ? a[iy * W0 + ix] : key === "area" ? a[clamp(iy, 0, H0 - 1) * W0 + clamp(ix, 0, W0 - 1)] : key === "roomOf" || key === "wallOf" ? -1 : 0;
      }
    return b;
  };
  const out = { ...L, w: W, h: H };
  for (const [key, v] of Object.entries(L)) if (ArrayBuffer.isView(v) && v.length === W0 * H0) out[key] = grow(v, key);
  const moved = new Set();
  const move = (o) => {
    if (!o || moved.has(o)) return;
    moved.add(o);
    if (Array.isArray(o)) { o[0] += m; o[1] += m; return; }
    o.x += m;
    o.y += m;
    if (o.cx !== undefined) { o.cx += m; o.cy += m; }
    if (o.fx !== undefined) { o.fx += m; o.fy += m; }
    if (o.seat) move(o.seat);
  };
  for (const key of ["rooms", "doors", "secrets", "features", "posts", "recesses", "lights", "regions"]) for (const o of L[key] ?? []) move(o);
  for (const o of [L.start, L.stairsUp, L.stairsDown]) move(o);
  out.blocks = new Set([...L.blocks].map((j) => (Math.floor(j / W0) + m) * W + (j % W0) + m));
  out.idx = (x, y) => y * W + x;
  out.get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : out.tiles[y * W + x]);
  return out;
}

function tryAreas(S, rng) {
  const g = makeLevel(S, rng);
  layRegions(g);
  if (!placeRooms(g)) return null;
  chooseHallKinds(g);
  // (The hewing's noise, for the halls: made here, its dice in their turn.)
  g.hewNoise = valueNoise(rng, g.W, g.H, 2.2);
  carveRooms(g);
  digCorridors(g);
  furnishRooms(g);
  placeDoors(g);
  placeLights(g);
  const { W, H, n, tiles, cave, area, rubble, roomOf, idx, floorAt, rooms, regions, from, to, across, doors, features, posts, recesses, lights, blocks } = g;

  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : tiles[idx(x, y)]);
  // (The player starts in a built room: a dungeon's if there is one. On a
  // level changing across, in the leftmost room of its first kind (built if
  // it can), the stairs down in the rightmost of the other, the throne room
  // the biggest hall on the far side.)
  const built = rooms.filter((r) => !r.cave && !r.collapsed), dungeonRooms = built.filter((r) => r.type === DUNGEON);
  let startRoom = rng.pick(dungeonRooms.length ? dungeonRooms : built.length ? built : rooms), downRoom = null, throneRoom = null;
  if (across) {
    const byX = (list) => [...list].sort((a, b) => a.cx - b.cx);
    const first = rooms.filter((r) => r.type === from), firm = first.filter((r) => !r.collapsed && r.cx < W * 0.4);
    startRoom = byX(firm.length ? firm : first.length ? first : rooms)[0];
    const far = byX(rooms.filter((r) => r.type === to && r !== startRoom));
    if (S.throne) throneRoom = rooms.find((r) => r.hallKind === "L") ?? [...far.slice(-Math.max(1, Math.ceil(far.length / 3)))].sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? null;
    if (S.down) downRoom = byX(far.filter((r) => r !== throneRoom && !r.collapsed)).at(-1) ?? byX(rooms.filter((r) => r !== startRoom)).at(-1);
  }
  // The stairs: in the middle of their rooms, on floor, drawn and kept clear.
  const stairsAt = (r) => {
    let best = null;
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!floorAt(x, y) || blocks.has(idx(x, y))) continue;
        const d = hypot(x - r.cx, y - r.cy);
        if (!best || d < best.d) best = { x, y, d };
      }
    return best && { x: best.x, y: best.y };
  };
  const stairsUp = across && S.up ? stairsAt(startRoom) : null, stairsDown = downRoom ? stairsAt(downRoom) : null;
  // (The throne room lit: braziers down its middle, either side of where the
  // king stands; any it had already taken away.)
  if (throneRoom) {
    const T0 = throneRoom, inT = (o) => o.x >= T0.x && o.y >= T0.y && o.x < T0.x + T0.w && o.y < T0.y + T0.h;
    for (const list of [lights, features]) for (let i = list.length - 1; i >= 0; i--) if ((list[i].kind ?? list[i].type) === "brazier" && inT(list[i])) list.splice(i, 1);
    for (const j of [...blocks]) if (inT({ x: j % W, y: Math.floor(j / W) }) && !lights.some((l) => idx(Math.floor(l.x), Math.floor(l.y)) === j)) blocks.delete(j);
    T0.lit = false;
    hallBraziers(g, T0, true);
  }
  for (const [st, dir] of [[stairsUp, "up"], [stairsDown, "down"]]) {
    if (!st) continue;
    for (let i = features.length - 1; i >= 0; i--) if (features[i].type !== "post" && Math.abs(features[i].x - st.x - 0.5) < 1 && Math.abs(features[i].y - st.y - 0.5) < 1) features.splice(i, 1);
    rubble[idx(st.x, st.y)] = 0;
    features.push({ type: "stairs", dir, x: st.x + 0.5, y: st.y + 0.5 });
  }
  // (Where the player arrives, and the way on: the stairs down, or the
  // king's seat.)
  const arrive = stairsUp ?? stairsAt(startRoom), goals = [stairsDown, throneRoom && (throneRoom.seat ?? { x: throneRoom.cx, y: throneRoom.cy })].filter(Boolean);
  const secrets = hideSecretDoors(g, startRoom, arrive, goals);
  // Which room each square is part of: its floor (`roomOf`; corridors and
  // passages, none: -1), and the rock bordering it, its walls, columns and
  // formations among them (`wallOf`: the room of the floor next to it).
  const wallOf = new Int16Array(n).fill(-1);
  for (let j = 0; j < n; j++) if (tiles[j] !== T.FLOOR) roomOf[j] = -1;
  for (const d of doors) roomOf[idx(d.x, d.y)] = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tiles[idx(x, y)] === T.FLOOR) continue;
      for (let k = 0; k < 9 && wallOf[idx(x, y)] < 0; k++) {
        const nx = x + (k % 3) - 1, ny = y + ((k / 3) | 0) - 1;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) wallOf[idx(x, y)] = roomOf[idx(nx, ny)];
      }
    }
  return {
    w: W, h: H, tiles, cave, rooms, roomOf, wallOf, area, rubble, doors, secrets, features, posts, recesses, lights, blocks, regions,
    // (Arriving without stairs: on the open square nearest the start room's
    // middle, not on a brazier standing there.)
    start: stairsUp ?? stairsAt(startRoom) ?? { x: startRoom.cx, y: startRoom.cy },
    startRoom, stairsUp, stairsDown, throneRoom,
    idx, get,
  };
}
