// Walking somewhere by itself: to a square clicked (the shortest way through
// squares seen), or exploring (to the nearest place not yet seen). The ways
// are found here; main.js takes the steps, a turn at a time, and stops them
// (WALK): a monster not in sight before comes into it, a hit point lost,
// something underfoot, a key or a click.
import { DIRS8 } from "./dungeon.js";

// Below this share of their hit points the player won't set off on a walk
// of more than a step.
export const WALK = { every: 70, tooHurt: 1 / 3 };

// Can the player step from (x, y) by (dx, dy) on the way: onto a square seen
// and walkable (a shut door too: the step opens it), not diagonally past a
// post, and not into a monster in sight (but the last, `end`).
function passable(w, x, y, dx, dy, end) {
  const nx = x + dx, ny = y + dy, W = w.level.w;
  if (nx < 0 || ny < 0 || nx >= W || ny >= w.level.h) return false;
  if (!w.seen[ny * W + nx] || !w.walkable(nx, ny) || !w.canStep(x, y, dx, dy)) return false;
  const a = w.actorAt(nx, ny);
  if (a && a !== w.player && !(end && nx === end.x && ny === end.y) && w.isVisible(nx, ny)) return false;
  return true;
}

// Breadth-first from the player till `goal(x, y)` says so; the way there as
// squares (not the player's), or null. Straight steps tried before diagonal
// ones, so the way keeps to the grid where it can.
const ORDER = [...DIRS8].sort(([ax, ay], [bx, by]) => Math.abs(ax) + Math.abs(ay) - (Math.abs(bx) + Math.abs(by)));
function search(w, goal, end = null, limit = 4000) {
  const W = w.level.w, p = w.player, start = p.y * W + p.x;
  const prev = new Map([[start, -1]]), queue = [start];
  for (let i = 0; i < queue.length && i < limit; i++) {
    const k = queue[i], x = k % W, y = (k - x) / W;
    if (k !== start && goal(x, y)) {
      const way = [];
      for (let c = k; c !== start; c = prev.get(c)) way.unshift({ x: c % W, y: Math.floor(c / W) });
      return way;
    }
    for (const [dx, dy] of ORDER) {
      const n = (y + dy) * W + x + dx;
      if (prev.has(n) || !passable(w, x, y, dx, dy, end)) continue;
      prev.set(n, k);
      queue.push(n);
    }
  }
  return null;
}

// The way to (tx, ty), or null (not seen, or no way through what's seen).
export function wayTo(w, tx, ty) {
  const W = w.level.w;
  if (tx < 0 || ty < 0 || tx >= W || ty >= w.level.h || !w.seen[ty * W + tx]) return null;
  if (tx === w.player.x && ty === w.player.y) return [];
  if (!w.walkable(tx, ty)) return null;
  return search(w, (x, y) => x === tx && y === ty, { x: tx, y: ty });
}

// The way to the nearest square seen and walkable next to one not seen yet;
// null when the level's all seen (that can be reached).
// (Next to it by a step: a square diagonally past a post is hidden behind
// it, and standing there would never show it; explore would turn back and
// forth between the squares beside the post.)
export function wayToExplore(w) {
  const W = w.level.w, H = w.level.h;
  const unseenNear = (x, y) => DIRS8.some(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < W && ny < H && !w.seen[ny * W + nx] && w.canStep(x, y, dx, dy);
  });
  return search(w, (x, y) => unseenNear(x, y), null, W * H);
}
