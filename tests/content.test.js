// The content check: every file in js/content parses, and every entry has the
// fields its kind needs, and points only at things that exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const DIR = new URL("../js/content/", import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8"));
const need = (where, o, fields) => { for (const f of fields) assert.ok(o[f] !== undefined, `${where}: no ${f}`); };

test("every content file parses", () => {
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json"))) assert.doesNotThrow(() => load(f), f);
});

test("monsters, items, lights and places have what they need", () => {
  const { monsters } = load("monsters.json"), { items } = load("items.json"), { lights } = load("lights.json"), { places } = load("places.json");
  for (const [k, m] of Object.entries(monsters)) need(`monster ${k}`, m, ["glyph", "name", "speed", "wander", "pack", "hp", "hit", "dmg", "verb", "xp"]);
  for (const [k, it] of Object.entries(items)) {
    need(`item ${k}`, it, ["glyph", "name", "cat", "depth", "weight"]);
    if (it.cat === "weapon") need(`item ${k}`, it, ["dmg", "hands"]);
    if (it.cat === "armour") need(`item ${k}`, it, ["slot", "def"]);
    if (it.cat === "potion") need(`item ${k}`, it, ["heal"]);
  }
  for (const [k, l] of Object.entries(lights)) need(`light ${k}`, l, ["full", "dim", "dark", "flame", "foot"]);
  places.forEach((p, i) => {
    need(`place ${i + 1}`, p, ["name", "depth", "from", "to", "spawns"]);
    assert.equal(p.depth, i + 1, `place ${i + 1}: depth ${p.depth}`);
    for (const [ground, kinds] of Object.entries(p.spawns)) for (const kind of Object.keys(kinds)) assert.ok(monsters[kind], `place ${p.name}, ${ground}: no monster ${kind}`);
  });
});

test("traits point only at things that exist", () => {
  const { monsters } = load("monsters.json"), { items } = load("items.json"), T = load("traits.json");
  for (const [k, t] of Object.entries(T.items)) for (const on of t.on) assert.ok(items[on], `item trait ${k}: no item ${on}`);
  for (const [k, t] of Object.entries(T.monsters)) for (const on of t.on) assert.ok(monsters[on], `monster trait ${k}: no monster ${on}`);
  for (const k of T.baneOf) assert.ok(monsters[k], `baneOf: no monster ${k}`);
  for (const [k, t] of Object.entries(T.rooms)) need(`room trait ${k}`, t, ["kinds", "about"]);
});
