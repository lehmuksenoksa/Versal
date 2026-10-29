// Headless smoke test: a simple bot plays full games against the rules engine.
// Usage: node tools/bot.mjs [games]
import { Game } from "../js/game.js";
import { bfs, isWalkable, DIRS8, T } from "../js/dungeon.js";

function botTurn(g) {
  const p = g.player, L = g.level;
  const adj = g.actors.find((a) => a !== p && !a.friendly && Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) === 1);
  if (adj) return g.playerMove(adj.x - p.x, adj.y - p.y);
  if (p.hp < p.maxHp * 0.4 && p.potions > 0) return g.quaff();
  if (g.hostilesInView().length >= 3 && p.scrolls > 0) return g.read();
  if (L.down && g.tileAt(p.x, p.y) === T.STAIRS_DOWN && g.turn > 150 * g.depth) return g.descend();
  // Head for: a visible hostile, else unexplored frontier, else stairs.
  const goals = new Set();
  for (const a of g.hostilesInView()) goals.add(a.y * L.w + a.x);
  if (!goals.size)
    for (let i = 0; i < L.tiles.length; i++) {
      if (!g.seen[i] || !isWalkable(L.tiles[i])) continue;
      const x = i % L.w, y = (i / L.w) | 0;
      if (DIRS8.some(([dx, dy]) => !g.isSeen(x + dx, y + dy))) goals.add(i);
    }
  if (!goals.size && L.down) goals.add(L.down.y * L.w + L.down.x);
  if (!goals.size) {
    const boss = g.actors.find((a) => a.boss);
    if (boss) goals.add(boss.y * L.w + boss.x);
  }
  // Multi-source BFS from goals; step downhill.
  const d = new Int32Array(L.tiles.length).fill(1e9), q = [...goals];
  for (const i of q) d[i] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % L.w, y = (i / L.w) | 0;
    for (const [dx, dy] of DIRS8) {
      const j = (y + dy) * L.w + x + dx;
      if (x + dx < 0 || y + dy < 0 || x + dx >= L.w || y + dy >= L.h) continue;
      if (d[j] <= d[i] + 1 || !isWalkable(L.tiles[j])) continue;
      d[j] = d[i] + 1; q.push(j);
    }
  }
  let best = null;
  for (const [dx, dy] of DIRS8) {
    const j = (p.y + dy) * L.w + p.x + dx;
    if (d[j] < (best?.d ?? d[p.y * L.w + p.x])) best = { dx, dy, d: d[j] };
  }
  if (best) return g.playerMove(best.dx, best.dy);
  return g.wait();
}

const N = +process.argv[2] || 30;
const tally = { dead: 0, won: 0, stuck: 0 };
const depths = [0, 0, 0, 0];
for (let n = 0; n < N; n++) {
  const g = new Game(1000 + n);
  g.player.hp = g.player.maxHp = 400; // a sturdy bot so it reaches the deep levels
  let steps = 0;
  while (g.state === "play" && steps++ < 5000) {
    botTurn(g);
    g.events.length = 0;
    for (const a of g.actors) {
      if (!isWalkable(g.tileAt(a.x, a.y))) throw new Error(`actor ${a.name} inside wall at ${a.x},${a.y}`);
      if (g.actors.some((b) => b !== a && b.x === a.x && b.y === a.y)) throw new Error(`stacked actors at ${a.x},${a.y}`);
    }
  }
  depths[g.depth]++;
  if (g.state === "play") tally.stuck++; else tally[g.state]++;
  if (n < 5) console.log(`game ${n}: ${g.state} depth ${g.depth} turn ${g.turn} lvl ${g.player.level} kills ${g.kills} gold ${g.player.gold}`);
}
console.log(tally, "final depth histogram", depths.slice(1));
