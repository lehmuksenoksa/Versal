// The rules' own maths (js/rules/dmath.js): within a hair of the engine's
// own answers, and the rules use no maths an engine works out its own way.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { sin, cos, atan, atan2, hypot } from "../js/rules/dmath.js";

test("sine, cosine, arctangent and distance, as Math has them to a hair", () => {
  let worst = 0;
  for (let i = -20000; i <= 20000; i++) {
    const x = i * 0.0031415, y = Math.sin(i * 0.7) * 50;
    worst = Math.max(worst, Math.abs(sin(x) - Math.sin(x)), Math.abs(cos(x) - Math.cos(x)), Math.abs(atan(x) - Math.atan(x)), Math.abs(atan2(y, x) - Math.atan2(y, x)), Math.abs(hypot(x, y) - Math.hypot(x, y)) / (1 + Math.hypot(x, y)));
  }
  for (const [y, x] of [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]]) assert.ok(Math.abs(atan2(y, x) - Math.atan2(y, x)) < 1e-15, `atan2(${y}, ${x})`);
  assert.ok(worst < 1e-13, `off by ${worst}`);
});

test("the rules use no maths an engine works out its own way", () => {
  const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(new URL(`${e.name}/`, d)) : e.name.endsWith(".js") ? [new URL(e.name, d)] : []));
  const bad = [];
  for (const f of files(new URL("../js/rules/", import.meta.url))) {
    if (f.pathname.endsWith("/dmath.js")) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/Math\.(sin|cos|tan|asin|acos|atan2?|hypot|exp|expm1|log|log1p|log2|log10|pow|cbrt|sinh|cosh|tanh)\b/g)) bad.push(`${f.pathname.split("/js/rules/")[1]}: Math.${m[1]}`);
  }
  assert.deepEqual(bad, []);
});
