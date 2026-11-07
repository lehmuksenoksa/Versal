// The one rule of the structure (spec/rebuild-plan.md, section 3): the rules
// (js/rules) import only each other and the content (js/content), never the
// drawing or the interface, so they run anywhere, headless.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const DIR = new URL("../js/rules/", import.meta.url);

test("the rules import only the rules and the content", () => {
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(new URL(f, DIR), "utf8");
    for (const [, from] of src.matchAll(/^import\b[^"']*["']([^"']+)["']/gm)) {
      const ok = (from.startsWith("./") && !from.slice(2).includes("/")) || from.startsWith("../content/");
      assert.ok(ok, `js/rules/${f} imports ${from}`);
    }
  }
});
