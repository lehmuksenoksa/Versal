// The level checks (spec/rebuild-plan.md, R7): what must hold of every level
// the game makes, its monsters and things in it, before anyone plays it.
import { World } from "../../js/rules/world.js";
import { isWalkable, DIRS8 } from "../../js/rules/dungeon.js";
import { reachable } from "./checks.js";

// A level of depth `depth` for `seed`, made and filled as the game does
// (deeper ones straight away: each depth is a level the game could make).
export function levelFor(seed, depth) {
  const w = new World(seed);
  if (depth > 1) w.enter(depth, "down");
  return w;
}

// What's wrong with the level the world `w` stands on (empty when all's
// well). Reaching counts secret doors as found: a player can find them.
export function levelProblems(w) {
  const bad = [], L = w.level, W = L.w, p = w.player, got = reachable(L, p.x, p.y);
  const floor = (x, y) => isWalkable(L.get(x, y)) && !L.blocks?.has(y * W + x);
  const reach = (x, y) => !!got[y * W + x];
  const doorish = new Set([...(L.doors ?? []), ...(L.secrets ?? [])].map((d) => d.y * W + d.x));
  // (The player arrives on open floor; the stairs are on open floor and can be reached.)
  if (!floor(p.x, p.y)) bad.push(`arrives in rock at ${p.x},${p.y}`);
  for (const [n, s] of [["down", L.stairsDown], ["up", L.stairsUp]])
    if (s && !floor(s.x, s.y)) bad.push(`the stairs ${n} in rock at ${s.x},${s.y}`);
    else if (s && !reach(s.x, s.y)) bad.push(`the stairs ${n} can't be reached`);
  // (Every room can be reached.)
  for (const r of L.rooms ?? []) {
    let any = false;
    for (let y = r.y; y < r.y + r.h && !any; y++) for (let x = r.x; x < r.x + r.w && !any; x++) any = reach(x, y);
    if (!any) bad.push(`a room at ${r.x},${r.y} can't be reached`);
  }
  // (Every thing lying about is on open floor and can be reached; every
  // monster on open floor; the king, on the last level, can be reached.)
  for (const f of w.items)
    if (!floor(f.x, f.y)) bad.push(`a ${f.item.type} in rock at ${f.x},${f.y}`);
    else if (!reach(f.x, f.y)) bad.push(`a ${f.item.type} can't be reached at ${f.x},${f.y}`);
  for (const a of w.actors) if (a !== p && !floor(a.x, a.y)) bad.push(`a ${a.kind} in rock at ${a.x},${a.y}`);
  if (L.throneRoom) {
    const king = w.actors.find((a) => a.kind === "king");
    if (!king) bad.push("no king in the throne room");
    else if (!reach(king.x, king.y)) bad.push("the king can't be reached");
  }
  // (Doors and secret doors stand in a wall, between two ways through:
  // floor, or another door.)
  for (const d of [...(L.doors ?? []), ...(L.secrets ?? [])]) {
    const through = (x, y) => isWalkable(L.get(x, y)) || doorish.has(y * W + x);
    if (!through(d.x + d.dx, d.y + d.dy) || !through(d.x - d.dx, d.y - d.dy)) bad.push(`a door at ${d.x},${d.y} leads nowhere`);
    if (isWalkable(L.get(d.x + d.dy, d.y + d.dx)) || isWalkable(L.get(d.x - d.dy, d.y - d.dx))) bad.push(`a door at ${d.x},${d.y} not in a wall`);
  }
  // (The map's edge is rock all round: nothing walks off it.)
  for (let x = 0; x < W; x++) if (isWalkable(L.get(x, 0)) || isWalkable(L.get(x, L.h - 1))) { bad.push("the map's edge open"); break; }
  for (let y = 0; y < L.h; y++) if (isWalkable(L.get(0, y)) || isWalkable(L.get(W - 1, y))) { bad.push("the map's edge open"); break; }
  // (Furniture stands on floor, none on the stairs; every light on floor.)
  for (const f of L.features ?? []) {
    if (f.type === "post" || f.type === "candles") continue;
    const x = Math.floor(f.x), y = Math.floor(f.y);
    if (!isWalkable(L.get(x, y))) bad.push(`a ${f.type} in rock at ${x},${y}`);
    for (const s of [L.stairsDown, L.stairsUp]) if (s && f.type !== "stairs" && s.x === x && s.y === y) bad.push(`a ${f.type} on the stairs`);
  }
  for (const l of L.lights ?? []) if (!isWalkable(L.get(Math.floor(l.x), Math.floor(l.y)))) bad.push(`a ${l.kind} in rock`);
  return bad;
}

// Does the way on (the stairs down, or the king) need a secret door found?
// Not wrong, but counted: a level the player can only leave by searching.
export function needsSecret(w) {
  const L = w.level, W = L.w, goal = L.stairsDown ?? w.actors.find((a) => a.kind === "king");
  if (!goal) return false;
  const got = new Uint8Array(W * L.h), q = [w.player.y * W + w.player.x];
  got[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % W, y = (q[i] - x) / W;
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= L.h || got[n] || !isWalkable(L.get(nx, ny)) || L.blocks?.has(n)) continue;
      got[n] = 1;
      q.push(n);
    }
  }
  return !got[goal.y * W + goal.x];
}

// The checks for one depth, `seeds` levels of it.
export function checkDepth(depth, seeds) {
  const problems = [];
  let secret = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const w = levelFor(seed, depth);
    for (const b of levelProblems(w)) problems.push(`seed ${seed}, depth ${depth}: ${b}`);
    if (needsSecret(w)) secret++;
  }
  return { problems, secret };
}
