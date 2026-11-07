// The level in the making (spec/rebuild-plan.md, R8): what every part of
// the generator works on, kept in one object (`g`), and the helpers they
// share. The parts, in the order the generator calls them (index.js): the
// regions, the rooms, the king's halls, the rooms carved, the corridors, the
// furnishing, the doors, the lights, the stairs and the secret doors. Each
// part throws the dice in turn: the order is the levels' (the same seed, the
// same level), so it stays as it is.

import { T } from "../dungeon.js";
import LIGHTS_DATA from "../../content/lights.json" with { type: "json" };
import TUNING from "../../content/tuning.json" with { type: "json" };

export const AREAS = ["dungeon", "cavern", "collapsed", "halls"];
export const DUNGEON = 0, CAVERN = 1, COLLAPSED = 2, HALLS = 3;

// The kinds of light, by `kind` in `lights` (js/content/lights.json): how far
// each lights, in bands (full, then dim, then a faint band counted as dark),
// the flame's size and where it stands. Campfires in caves; braziers in rooms
// and the king's halls; candles on an altar.
export const LIGHTS = LIGHTS_DATA.lights;

// The generator's settings (tuning.json, `levelgen`): the level's size and
// margin; regions; rooms, loops and doors; long loops and shortcuts; caves;
// dungeon room kinds, furnishing, recesses and columns; collapse and rubble;
// lights; secret doors; and a level's ground, stairs and throne.
export const LEVELGEN_DEFAULTS = TUNING.levelgen;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Smooth value noise, 0 to 1, varying over `cell` squares.
export function valueNoise(rng, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = Float32Array.from({ length: gw * gh }, () => rng.next());
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = clamp(x / cell, 0, gw - 1.001), fy = clamp(y / cell, 0, gh - 1.001), i = Math.floor(fx), j = Math.floor(fy);
    const u = s(fx - i), v = s(fy - j), a = g[j * gw + i], b = g[j * gw + i + 1], c = g[(j + 1) * gw + i], d = g[(j + 1) * gw + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// A new level in the making, all rock, `S` its settings, `rng` its dice.
export function makeLevel(S, rng) {
  const W = Math.round(S.w), H = Math.round(S.h), n = W * H;
  const tiles = new Uint8Array(n), cave = new Uint8Array(n), area = new Uint8Array(n), rubble = new Uint8Array(n);
  const idx = (x, y) => y * W + x;
  const floorAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && tiles[idx(x, y)] === T.FLOOR;
  const g = {
    S, rng, W, H, n, tiles, cave, area, rubble, idx, floorAt,
    // (Each square carved for a room is that room's: `roomOf`, the room's
    // index, -1 for none.)
    roomOf: new Int16Array(n).fill(-1),
    rooms: [], regions: [],
    // (The halls' columns, put back after the corridors: halls.js.)
    hallColumns: [],
    // (The furnishing's: furnish.js; the doors kept for every jail cell,
    // `mustDoor`, and the niches, which take no door.)
    features: [], posts: [], recesses: [], mustDoor: new Set(), niches: new Set(), roomLights: [],
    doors: [], lights: [], blocks: new Set(),
  };
  // The floor of a room reachable from its middle (within its box, and a
  // square round it), as a set of tile indices.
  g.reach = (r) => {
    const got = new Set([idx(r.cx, r.cy)]), q = [[r.cx, r.cy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = idx(nx, ny);
        if (nx < r.x - 1 || ny < r.y - 1 || nx > r.x + r.w || ny > r.y + r.h || got.has(j) || !floorAt(nx, ny)) continue;
        got.add(j);
        q.push([nx, ny]);
      }
    }
    return got;
  };
  g.floorIn = (r) => {
    let c = 0;
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (floorAt(x, y)) c++;
    return c;
  };
  return g;
}
