// Checks on a world's state that must always hold, and on a level's shape.
import { isWalkable, DIRS8 } from "../../js/rules/dungeon.js";
import { ITEMS, PACK, LEVELS, PLAYER } from "../../js/rules/content.js";

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
    if (a !== p && a.hp > a.maxHp) bad.push(`${a.kind} ${a.id} hp ${a.hp} over max ${a.maxHp}`);
    if (a !== p && !Number.isFinite(a.energy)) bad.push(`${a.kind} ${a.id} energy ${a.energy}`);
    if (a !== p && a.leader && !w.actors.includes(a.leader) && w.pack(a).length && !w.pack(a).includes(a.leader)) bad.push(`${a.kind} ${a.id} led by one gone`);
  }
  // (Things lying about: on open floor, on the map.)
  for (const f of w.items) if (!isWalkable(w.tileAt(f.x, f.y))) bad.push(`a ${f.item.type} in a wall at ${f.x},${f.y}`);
  // (The pack: not over full, each letter once, none empty; what's held and
  // worn where it belongs, a two-handed weapon with the off hand free.)
  if (p.pack.length > PACK.size) bad.push(`pack of ${p.pack.length}`);
  if (new Set(p.pack.map((i) => i.key)).size !== p.pack.length) bad.push("two things under one letter");
  for (const it of p.pack) if (!(it.n >= 1) || !PACK.letters.includes(it.key)) bad.push(`pack ${it.type} n ${it.n} key ${it.key}`);
  for (const [slot, it] of Object.entries(p.equip)) {
    if (!it) continue;
    const d = ITEMS[it.type], want = d.cat === "weapon" ? "hand" : d.slot;
    if (want !== slot) bad.push(`a ${it.type} in the ${slot} slot`);
  }
  if (p.equip.hand && ITEMS[p.equip.hand.type].hands === 2 && p.equip.off) bad.push("a two-handed weapon and something in the off hand");
  // (Experience and level agree; hit points as levels give them.)
  let level = 1;
  while (LEVELS.xp[level] !== undefined && p.xp >= LEVELS.xp[level]) level++;
  if (level !== p.level) bad.push(`level ${p.level} with ${p.xp} xp (should be ${level})`);
  if (p.maxHp !== PLAYER.hp + (p.level - 1) * LEVELS.hp) bad.push(`max hp ${p.maxHp} at level ${p.level}`);
  if (!w.ended && p.hp <= 0) bad.push(`alive with hp ${p.hp}`);
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
