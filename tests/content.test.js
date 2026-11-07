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

test("every kind of feature is listed, and drawn by its family", async () => {
  const { features } = load("features.json"), { FAMILIES } = await import("../js/draw/features.js");
  const { World } = await import("../js/rules/world.js");
  const OUTLINES = [null, "box", "square", "hex"];
  for (const [k, f] of Object.entries(features)) {
    need(`feature ${k}`, f, ["family", "lift", "shadow", "outline"]);
    assert.ok(FAMILIES[f.family], `feature ${k}: no family ${f.family}`);
    assert.equal(typeof FAMILIES[f.family][k], "function", `feature ${k}: its family ${f.family} doesn't draw it`);
    assert.ok(OUTLINES.includes(f.outline), `feature ${k}: no outline ${f.outline}`);
  }
  for (const [name, table] of Object.entries(FAMILIES))
    for (const k of Object.keys(table)) assert.equal(features[k]?.family, name, `${name} draws ${k}, which the data puts in ${features[k]?.family ?? "no family"}`);
  // What the levels make, on a few seeds and every depth.
  for (const seed of [3, 17, 41, 77]) {
    const w = new World(seed);
    for (let depth = 1; depth <= 3; depth++) {
      if (depth > 1) w.enter(depth, "down");
      for (const f of w.level.features ?? []) assert.ok(features[f.type], `seed ${seed}, depth ${depth}: a ${f.type}, not in features.json`);
    }
  }
});

test("every kind of room and hall is furnished, lit and planned", async () => {
  const { kinds, halls } = load("rooms.json");
  const { FURNISH, LIGHTINGS } = await import("../js/rules/levelgen/kinds.js");
  const { PLANS } = await import("../js/rules/levelgen/halls.js");
  const FITS = ["short", "long", "longEven", "even", "squarish"];
  for (const [k, d] of Object.entries(kinds)) {
    need(`room kind ${k}`, d, ["weight", "fits", "light", "about"]);
    assert.equal(typeof FURNISH[k], "function", `room kind ${k}: no furnishing in kinds.js`);
    assert.equal(typeof LIGHTINGS[d.light], "function", `room kind ${k}: no lighting ${d.light}`);
    for (const f of Object.keys(d.fits)) assert.ok(FITS.includes(f), `room kind ${k}: fits by ${f}?`);
  }
  for (const k of Object.keys(FURNISH)) assert.ok(kinds[k], `kinds.js furnishes ${k}, not in rooms.json`);
  for (const [k, d] of Object.entries(halls)) {
    need(`hall ${k}`, d, ["about"]);
    assert.ok((d.rank !== undefined && d.fits) || d.placed, `hall ${k}: neither chosen by fit (rank, fits) nor placed`);
    // (A's plan is hewHall's.)
    if (k !== "A") assert.equal(typeof PLANS[k], "function", `hall ${k}: no plan in halls.js`);
  }
  for (const k of Object.keys(PLANS)) assert.ok(halls[k], `halls.js plans ${k}, not in rooms.json`);
});
