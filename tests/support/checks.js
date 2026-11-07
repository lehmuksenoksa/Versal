// Checks on a world's state that must always hold, and on a level's shape.
import { isWalkable, DIRS8 } from "../../js/rules/dungeon.js";

// Things that must be true after every step of play. Returns a list of what
// isn't (empty when all is well).
export function invariants(w) {
  const bad = [], p = w.player, L = w.level, seen = new Set();
  if (p.hp > p.maxHp) bad.push(`player hp ${p.hp} over max ${p.maxHp}`);
  for (const a of w.actors) {
    if (a.x < 0 || a.y < 0 || a.x >= L.w || a.y >= L.h) bad.push(`${a.kind} ${a.id} off the map at ${a.x},${a.y}`);
    else if (!isWalkable(w.tileAt(a.x, a.y))) bad.push(`${a.kind} ${a.id} in a wall at ${a.x},${a.y}`);
    const k = `${a.x},${a.y}`;
    if (seen.has(k)) bad.push(`two actors on ${k}`);
    seen.add(k);
    if (a !== p && !(a.hp > 0)) bad.push(`${a.kind} ${a.id} still about with hp ${a.hp}`);
  }
  return bad;
}

// The squares reachable on foot from (x0, y0), through doors and secret doors
// (a secret door's square counts as floor), ignoring monsters.
export function reachable(L, x0, y0) {
  const open = new Uint8Array(L.w * L.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (isWalkable(L.get(x, y))) open[y * L.w + x] = 1;
  for (const s of L.secrets ?? []) open[s.y * L.w + s.x] = 1;
  const blocks = L.blocks ?? new Set();
  const got = new Uint8Array(L.w * L.h), q = [y0 * L.w + x0];
  got[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % L.w, y = (q[i] - x) / L.w;
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy, n = ny * L.w + nx;
      if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h || got[n] || !open[n] || blocks.has(n)) continue;
      got[n] = 1;
      q.push(n);
    }
  }
  return got;
}
