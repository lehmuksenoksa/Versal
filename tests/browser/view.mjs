// The view lock (spec/groundwork.md, G3): the game's view, as the player
// sees it, at fixed seeds and moments, compared pixel for pixel with
// tests/browser/view-baseline.json. A change meant to leave the view alone
// (splitting expression.js, say) must pass it; a change meant to change it
// is recorded again on purpose (--record).
//
// To be the same every time: the page's clock stopped and stepped by hand
// (animations, flicker, fading are by the clock), Math.random seeded (the
// view's small touches: a monster's sway, its sounds), the run by its seed,
// and its moves the crude bot's (tests/support/bot.js, playing in the page
// on the game's own World), each turn given time to draw.
//
//   node tests/browser/view.mjs            compare
//   node tests/browser/view.mjs --record   record the baseline again
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = new URL("../..", import.meta.url).pathname, BASE = join(ROOT, "tests/browser/view-baseline.json");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };
const SEEDS = [3, 41, 999], STEPS = 60, record = process.argv.includes("--record");

const server = createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  try { const body = await readFile(path); res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch();
const hashes = {}, shots = [];

// A seeded Math.random for the page (mulberry32), before any script runs.
const SEEDED = `(() => { let a = 0x5eed; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

for (const seed of SEEDS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // (The page's clock stopped from the start: no frame is drawn while it
  // loads, however long that takes, so every run starts from the same
  // place; then stepped by hand.)
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.addInitScript(SEEDED);
  await page.goto(`http://localhost:${server.address().port}/index.html?seed=${seed}&name=Tester`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.versal?.world, null, { polling: 100, timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const settle = async () => {
    for (let i = 0; i < 12; i++) { await page.clock.runFor(250); await page.waitForTimeout(40); }
  };
  const shot = async (name) => {
    await settle();
    const png = await page.locator("#view").screenshot();
    hashes[`${seed}/${name}`] = createHash("sha256").update(png).digest("hex").slice(0, 16);
    if (record) shots.push(writeFile(join(ROOT, `tests/browser/shots/view-${seed}-${name}.png`), png));
  };
  await shot("start");
  // (The bot's moves, in the page, on the game's World; a frame or two each.)
  await page.evaluate(async (steps) => {
    const { botStep } = await import("/tests/support/bot.js"), { RNG } = await import("/js/rules/rng.js");
    const w = window.versal.world, r = new RNG(7), mem = { depth: 0, onLevel: 0, more: true };
    window.__bot = { r, mem };
    for (let i = 0; i < steps && !w.ended; i++) botStep(w, r, mem);
  }, STEPS);
  await shot("played");
  await page.keyboard.press("f");
  await shot("lamp-out");
  await page.keyboard.press("Tab");
  await shot("whole");
  if (errors.length) { console.log(`seed ${seed}: errors: ${errors.join("; ")}`); process.exitCode = 1; }
  await page.close();
}
await Promise.all(shots);
await browser.close();
server.close();

if (record) {
  await writeFile(BASE, JSON.stringify(hashes, null, 2) + "\n");
  console.log(`Recorded ${Object.keys(hashes).length} views.`);
} else {
  const want = JSON.parse(await readFile(BASE, "utf8"));
  const differ = Object.keys(want).filter((k) => want[k] !== hashes[k]);
  if (differ.length) { console.log(`Views differ from the baseline: ${differ.join(", ")}`); process.exitCode = 1; }
  else console.log(`Views: all ${Object.keys(want).length} match the baseline, pixel for pixel.`);
}
