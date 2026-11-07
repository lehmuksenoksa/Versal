// The browser check: the page loads, the game starts, a few turns are played
// by keys, and nothing goes wrong on the page (no errors). Screenshots of
// fixed seeds go to tests/browser/shots/ to look at (and, later, to compare).
// Uses the Playwright and Chromium already on the machine; serves the
// repository itself.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = new URL("../..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(path.endsWith("/") ? join(path, "index.html") : path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;
await mkdir(join(ROOT, "tests/browser/shots"), { recursive: true });

const browser = await chromium.launch();
const problems = [];
for (const seed of [123, 4567]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => problems.push(`seed ${seed}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`seed ${seed}: console: ${m.text()}`); });
  await page.goto(`http://localhost:${port}/index.html?seed=${seed}&name=Tester`);
  await page.waitForTimeout(2500);
  const before = await page.screenshot({ path: join(ROOT, `tests/browser/shots/seed-${seed}-start.png`) });
  for (const key of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowUp", "z", "ArrowRight", "ArrowDown", "ArrowRight"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  const after = await page.screenshot({ path: join(ROOT, `tests/browser/shots/seed-${seed}-played.png`) });
  // (The keys must have done something: the view moved on.)
  if (before.equals(after)) problems.push(`seed ${seed}: nothing changed after the keys were pressed`);
  await page.close();
}
// Resuming: play a few turns, leave, come back: the same run, offered as such;
// N then starts a new one.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`resume: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`resume: console: ${m.text()}`); });
  await page.goto(`http://localhost:${port}/index.html?name=Tester`);
  await page.waitForTimeout(2500);
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "z", "z"]) { await page.keyboard.press(key); await page.waitForTimeout(150); }
  const before = await page.evaluate(() => { const w = window.versal.world, t0 = performance.now(); w.save(); return { turn: w.turn, x: w.player.x, y: w.player.y, seed: w.places[0].seed, ms: performance.now() - t0 }; });
  await page.reload();
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => { const w = window.versal.world; return { turn: w.turn, x: w.player.x, y: w.player.y, seed: w.places[0].seed, said: w.messages.at(-1)?.text ?? "" }; });
  if (after.seed !== before.seed || after.x !== before.x || after.y !== before.y) problems.push(`resume: not the same run (before ${JSON.stringify(before)}, after ${JSON.stringify(after)})`);
  if (!after.said.startsWith("You take up your run")) problems.push(`resume: not offered as resumed (last message: ${after.said})`);
  await page.keyboard.press("N");
  await page.waitForTimeout(1500);
  const fresh = await page.evaluate(() => { const w = window.versal.world; return { turn: w.turn, seed: w.places[0].seed }; });
  if (fresh.seed === before.seed || fresh.turn !== 0) problems.push("resume: N didn't start a new run");
  console.log(`Resume: turn ${before.turn} kept; saving took ${before.ms.toFixed(1)} ms.`);
  await context.close();
}
await browser.close();
server.close();
if (problems.length) { console.error("Browser check failed:\n" + problems.join("\n")); process.exit(1); }
console.log("Browser check: the page loads and plays, no errors.");
