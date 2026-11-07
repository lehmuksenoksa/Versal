// What the level generator makes, seed by seed, as fingerprints: every
// place's settings (js/content/places.json), levels straight from
// generateAreas, written down whole (tiles, rooms, features, lights, doors,
// secrets, everything it returns) and hashed. A refactoring of the generator
// must leave every fingerprint the same (spec/rebuild-plan.md, R8).
import { createHash } from "node:crypto";
import { generateAreas } from "../../js/rules/levelgen.js";
import { PLACES } from "../../js/rules/content.js";
import { RNG } from "../../js/rules/rng.js";

export const PRINT_SEEDS = 60;

// Plain data from a level: Sets and typed arrays as arrays, the rooms (which
// refer to one another) by index, functions left out.
function plain(level) {
  const rooms = level.rooms ?? [];
  const seen = new WeakSet();
  const out = (v, depth = 0) => {
    if (v === null || typeof v !== "object") return typeof v === "function" ? undefined : v;
    if (ArrayBuffer.isView(v)) return Array.from(v);
    if (v instanceof Set) return [...v].map((x) => out(x, depth + 1));
    if (v instanceof Map) return [...v].map(([k, x]) => [out(k, depth + 1), out(x, depth + 1)]);
    if (depth > 0 && rooms.includes(v)) return { room: rooms.indexOf(v) };
    if (seen.has(v)) return "(again)";
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => out(x, depth + 1));
    const o = {};
    for (const k of Object.keys(v).sort()) { const x = out(v[k], depth + 1); if (x !== undefined) o[k] = x; }
    return o;
  };
  return { ...out(level), rooms: rooms.map((r) => { const o = {}; for (const k of Object.keys(r).sort()) o[k] = out(r[k], 1); return o; }) };
}

export function levelPrints() {
  const prints = {};
  PLACES.forEach((P, i) => {
    for (let seed = 1; seed <= PRINT_SEEDS; seed++) {
      const level = generateAreas(new RNG(seed * 7919 + i), { from: P.from, to: P.to, up: !!P.up, down: !!P.down, throne: !!P.throne });
      prints[`${i + 1}/${seed}`] = createHash("sha256").update(JSON.stringify(plain(level))).digest("hex").slice(0, 16);
    }
  });
  return prints;
}
