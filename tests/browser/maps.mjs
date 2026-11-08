// The map drawing check: draws fixed levels in each of renderMap's modes in a
// headless browser and compares each drawing's pixels (a hash) with the
// baseline (tests/browser/maps-baseline.json). `--record` records the
// baseline again: only when the drawing is meant to change.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = new URL("../..", import.meta.url).pathname, BASE = join(ROOT, "tests/browser/maps-baseline.json");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(ROOT)) return res.writeHead(403).end();
  try { res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(await readFile(path)); } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/tests/browser/maps.html`, { waitUntil: "commit" });
await page.waitForFunction(() => window.mapHashes, null, { timeout: 120000 });
const got = await page.evaluate(() => window.mapHashes);
await browser.close();
server.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
if (process.argv.includes("--record")) {
  await writeFile(BASE, JSON.stringify(got, null, 1) + "\n");
  console.log(`Recorded ${Object.keys(got).length} map drawings.`);
} else {
  const want = JSON.parse(await readFile(BASE, "utf8"));
  const differ = Object.keys(want).filter((k) => want[k] !== got[k]);
  if (differ.length) { console.error(`Map drawings differ from the baseline: ${differ.join(", ")}`); process.exit(1); }
  console.log(`Map drawings: all ${Object.keys(want).length} match the baseline, pixel for pixel.`);
}
