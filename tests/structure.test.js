// The one rule of the structure (spec/rebuild-plan.md, section 3): the rules
// (js/rules) import only each other and the content (js/content), never the
// drawing or the interface, so they run anywhere, headless.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const DIR = new URL("../js/rules/", import.meta.url), RULES = DIR.pathname, CONTENT = new URL("../js/content/", import.meta.url).pathname;

// (Every file in js/rules, its folders too.)
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(new URL(`${e.name}/`, dir)) : e.name.endsWith(".js") ? [new URL(e.name, dir)] : []));

test("the rules import only the rules and the content", () => {
  for (const f of files(DIR)) {
    const src = readFileSync(f, "utf8"), name = f.pathname.slice(RULES.length);
    for (const [, from] of src.matchAll(/^(?:import|export)\b[^"']*from\s*["']([^"']+)["']/gm)) {
      const to = new URL(from, f).pathname;
      const ok = from.startsWith(".") && (to.startsWith(RULES) || to.startsWith(CONTENT));
      assert.ok(ok, `js/rules/${name} imports ${from}`);
    }
  }
});
