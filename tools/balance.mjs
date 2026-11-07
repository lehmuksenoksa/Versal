// The balance report (spec/10-building-it.md, "maths first"): the fight
// curves worked out by the maths (tools/balance/maths.js, checked against
// the rules by tests/balance.test.js), and what each depth holds, counted on
// levels the game makes. No play, no drawing; a few seconds.
//
//   node tools/balance.mjs            the report, as Markdown
//   node tools/balance.mjs --write    and into spec/balance-now.md
//
// What it can't yet say: oil and dread (not in the game yet), the Depth and
// Level of monsters and the two-fifths rule (round 28; not in the content
// yet), stealth (its own small simulation, when the stealth rules come).

import { writeFileSync } from "node:fs";
import { World, MONSTERS, ITEMS, PLACES, PLAYER, LEVELS, WHACK, SNEAK_HIT } from "../js/rules/world.js";
import { duel, packFight, blow, levelFor, mean } from "./balance/maths.js";

const SEEDS = Number(process.env.BALANCE_SEEDS ?? 100);
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "–");
const out = [];
const say = (s = "") => out.push(s);
// (`align`: a letter a column, l or r; numbers right, the first column left.)
const table = (head, rows, align = "l" + "r".repeat(head.length - 1)) => {
  say(`| ${head.join(" | ")} |`);
  say(`|${head.map((h, i) => (align[i] === "r" ? "---:" : "---")).join("|")}|`);
  for (const r of rows) say(`| ${r.join(" | ")} |`);
  say();
};

// The gear and level a player might have at each depth: the assumptions the
// tables below are worked out for. (Not measured: a guess to read against.)
const GEAR = [
  { at: "depth 1", weapon: "dagger", level: 1, def: 0, armour: "no armour" },
  { at: "depth 2", weapon: "sword", level: 3, def: 2, armour: "chainmail" },
  { at: "depth 3", weapon: "axe", level: 5, def: 3, armour: "chainmail and helmet" },
];

say("# The balance now");
say();
say("Written by `node tools/balance.mjs --write` from the content and the rules as they are; do not edit");
say("by hand. The maths is checked against fights played by the game's own rules (`tests/balance.test.js`).");
say(`The levels: ${SEEDS} made for each depth, as the game makes them.`);
say();

// ---- The player ----
say("## The player's blow");
say();
say(`Lands ${Math.round(WHACK * 100)}% of the time on a monster that's aware of them; always, and ${SNEAK_HIT} times as hard, on one`);
say(`asleep or unaware. Better by 1 every other level. Starts with ${PLAYER.hp} hit points, ${LEVELS.hp} more each level.`);
say();
table(["Weapon", "Level 1", "Level 3", "Level 5", "Level 7", "Hands"], Object.entries(ITEMS).filter(([, d]) => d.cat === "weapon").map(([k, d]) => [k, ...[1, 3, 5, 7].map((l) => { const b = blow(k, l); return `${b[0]}–${b[1]} (${f1(WHACK * mean(b))} a turn)`; }), d.hands]));

// ---- One fight ----
say("## One fight, one monster");
say();
say("Next to the player and aware of them: the blows it takes to bring down, the hit points its blows take off");
say("the player meanwhile (bleeding and poison as they run their course after, apart), and how many turns it");
say("would take it alone to kill the player from full health. Worked out for the gear and level a player might");
say("have arriving at each depth: a guess to read against, not measured.");
say();
for (const g of GEAR) {
  say(`**${g.at}:** ${g.weapon}, level ${g.level}, ${g.armour} (${PLAYER.hp + (g.level - 1) * LEVELS.hp} hit points).`);
  say();
  table(["Monster", "Hit points", "Blows", "Lost", "Bleeding, poison", "Kills you in", "Blows, from a sneak blow", "XP"],
    Object.keys(MONSTERS).map((k) => {
      const d = duel(k, g), s = duel(k, { ...g, sneak: true }), M = MONSTERS[k];
      return [k + (M.erratic ? " (rough)" : ""), `${M.hp[0]}–${M.hp[1]}`, f1(d.blows), f1(d.lost), d.ailing ? f1(d.ailing) : "", d.killsIn > 999 ? "–" : `${f1(d.killsIn)} turns`, f1(s.blows), M.xp];
    }));
}

// ---- What each depth holds ----
say("## What each depth holds");
say();
const depths = PLACES.map((P, i) => {
  const depth = i + 1, kinds = {}, packs = [], items = {};
  let rooms = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const w = new World(seed);
    if (depth > 1) w.enter(depth, "down");
    rooms += w.level.rooms.length;
    const leaders = new Map();
    for (const a of w.actors) {
      if (a === w.player) continue;
      kinds[a.kind] = (kinds[a.kind] ?? 0) + 1;
      const L = leaders.get(a.leader) ?? [];
      L.push(a.kind);
      leaders.set(a.leader, L);
    }
    packs.push(...leaders.values());
    for (const f of w.items) items[f.item.type] = (items[f.item.type] ?? 0) + 1;
  }
  return { depth, name: P.name, kinds, packs, items, rooms: rooms / SEEDS };
});
table(["Depth", "Rooms", "Monsters (each kind, on average)", "Things (on average)"], depths.map((d) => [
  `${d.depth}, ${d.name}`, f1(d.rooms),
  Object.entries(d.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${f1(n / SEEDS)}`).join(", "),
  Object.entries(d.items).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${f1(n / SEEDS)}`).join(", "),
]), "lrll");

// ---- Clearing a level ----
say("## Clearing a level, and what it gives");
say();
say("Every pack on the level fought, one pack at a time, with that depth's gear: the hit points it costs fighting");
say("each pack where only one can reach the player (a corridor's mouth) and in the open (all of the pack at once).");
say("Against it: the healing potions on the level, and the turns of rest to heal the rest. The experience is all of");
say("it, and the level it brings the player to, all told from the start.");
say();
let xp = 0;
const POTION = mean(ITEMS.potion.heal);
table(["Depth", "Packs", "XP", "Level after", "Lost, one at a time", "Lost, in the open", "Potions heal", "Rest to heal the rest (one at a time)"], depths.map((d, i) => {
  const g = GEAR[i] ?? GEAR.at(-1);
  let narrow = 0, open = 0, gain = 0;
  for (const pack of d.packs) {
    // (A pack of one kind, or led by another: each part fought as its own.)
    const byKind = {};
    for (const k of pack) byKind[k] = (byKind[k] ?? 0) + 1;
    for (const [k, n] of Object.entries(byKind)) {
      const f = packFight(k, n, g);
      narrow += f.narrow;
      open += f.open;
      gain += f.xp;
    }
  }
  narrow /= SEEDS; open /= SEEDS; gain /= SEEDS;
  xp += gain;
  const heal = ((d.items.potion ?? 0) / SEEDS) * POTION;
  return [`${d.depth} (${g.weapon}, level ${g.level}, ${g.armour})`, f1(d.packs.length / SEEDS), Math.round(gain), levelFor(xp), f1(narrow), f1(open), f1(heal), `${Math.round(Math.max(0, narrow - heal) * PLAYER.restHeal)} turns`];
}));
say(`(Resting heals a hit point every ${PLAYER.restHeal} turns; walking about, every ${PLAYER.heal}. A potion heals ${ITEMS.potion.heal[0]}–${ITEMS.potion.heal[1]}.`);
say("Murky potions, traits on things and monsters, and rooms' traits are left out of these sums.)");
say();

// ---- Not yet ----
say("## Not in the maths yet");
say();
say("- **Oil and dread:** not in the game yet (the light feature set).");
say("- **Monsters' Depth and Level, and the two-fifths rule** (round 28): not in the content yet.");
say("- **Stealth:** how often a level can be crossed unseen; its own small simulation, with the stealth rules.");
say("- **Traits** on things, monsters and rooms: left out of the sums above.");

const text = out.join("\n") + "\n";
if (process.argv.includes("--write")) writeFileSync(new URL("../spec/balance-now.md", import.meta.url), text);
process.stdout.write(text);
