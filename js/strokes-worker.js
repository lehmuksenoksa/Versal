// The hatching's strokes for the GPU, made off the main thread so the game
// needn't wait for them: given a level's size, square size and seed, the
// strokes (as Expression would make them) as strokeBuffers lays them out,
// sent back without copying.

import { hatchSolid, STROKES_SEED } from "./hatching.js";
import { RNG } from "./rng.js";
import { strokeBuffers } from "./gpu.js";

self.onmessage = ({ data: { id, W, H, TS, seed } }) => {
  const b = strokeBuffers(hatchSolid(W * TS, H * TS, TS, new RNG(seed ^ STROKES_SEED)));
  self.postMessage({ id, ...b }, [b.verts.buffer, b.index.buffer, b.table.buffer, b.table2.buffer]);
};
