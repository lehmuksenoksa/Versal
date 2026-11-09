// The view and the rules agree on the light (spec/light-set.md, L4): at
// moments in play (the bot's moves, in the page, on the game's World), the
// lamp lit and out, every square both have in sight is the same light,
// dark, dim or lit, in the rules (js/rules/light.js) and as the view draws
// it (its light at the square's middle). Squares on a band's edge are left
// out: the view's edges are ragged on purpose. So the screen never says dark
// where a monster sees the player lit.
//
//   node tests/browser/light.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = new URL("../..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  try { const body = await readFile(path); res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch();
const problems = [];
let compared = 0, moments = 0;

for (const seed of [3, 41, 999, 2024]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => problems.push(`seed ${seed}: ${e.message}`));
  await page.goto(`http://localhost:${server.address().port}/index.html?seed=${seed}&name=Tester`);
  await page.waitForFunction(() => !!window.versal?.world, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const { RNG } = await import("/js/rules/rng.js");
    window.__bot = { r: new RNG(5), mem: { depth: 0, onLevel: 0, more: true } };
  });
  for (let m = 0; m < 6; m++) {
    // (Some of the bot's moves, then the lamp out every other moment.)
    await page.evaluate(async (m) => {
      const { botStep } = await import("/tests/support/bot.js"), w = window.versal.world, { r, mem } = window.__bot;
      for (let i = 0; i < 25 && !w.ended; i++) botStep(w, r, mem);
      if ((m % 2 === 1) !== w.sneaking) w.act({ do: "lamp" });
      window.versal.renderer.showLamp();
    }, m);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(async () => {
      const { LIGHTS } = await import("/js/rules/levelgen.js"), { MONSTERS } = await import("/js/rules/content.js");
      const w = window.versal.world, E = window.versal.renderer.exp, L = w.level, TS = window.versal.renderer.TS, out = [];
      if (!E) return { n: 0, bad: [] };
      const rules = (x, y) => w.light.at(x, y);
      // (On a band's edge: the square's middle within 0.35 of where a
      // light's lit or dim band ends; the view's edges wander by about 0.2.)
      const sources = [...(L.lights ?? []).map((l) => ({ x: l.x, y: l.y, B: LIGHTS[l.kind] ?? LIGHTS.fire })),
        ...(w.sneaking ? [] : [{ x: w.player.x + 0.5, y: w.player.y + 0.5, B: LIGHTS.lamp }]),
        ...w.actors.filter((a) => MONSTERS[a.kind]?.lantern).map((a) => ({ x: a.x + 0.5, y: a.y + 0.5, B: LIGHTS.lantern }))];
      const edge = (x, y) => sources.some(({ x: sx, y: sy, B }) => {
        const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
        return Math.abs(d - (B.lit + 0.5)) < 0.35 || Math.abs(d - (B.dim + 0.5)) < 0.35;
      });
      let n = 0;
      for (let y = 0; y < L.h; y++)
        for (let x = 0; x < L.w; x++) {
          if (!w.isVisible(x, y) || !w.walkable(x, y) || edge(x, y)) continue;
          const px = (x + 0.5) * TS, py = (y + 0.5) * TS;
          if (E.inSight(px, py) < 0.99) continue;
          // (The lamp out, the view's faint glow round the player is their
          // dark sight, not light: the level's lights and lanterns only.)
          // (The faint ring past a light, drawn at the dark band's light, is
          // the player's dark sight, not light: dark.)
          const S = E.S, v = w.sneaking ? E.sourcesAt(px, py) : E.lightAt(px, py), view = v >= 0.99 ? 2 : v > (S.darkLevel + S.dimLevel) / 2 ? 1 : 0;
          n++;
          if (view !== rules(x, y)) out.push(`${x},${y}: rules ${rules(x, y)}, view ${view} (${v.toFixed(2)})`);
        }
      return { n, bad: out, lamp: !w.sneaking, depth: w.place.depth, turn: w.turn };
    });
    moments++;
    compared += r.n;
    if (r.bad.length) problems.push(`seed ${seed}, turn ${r.turn}, depth ${r.depth}, lamp ${r.lamp ? "lit" : "out"}: ${r.bad.length} of ${r.n} squares differ: ${r.bad.slice(0, 6).join("; ")}`);
  }
  await page.close();
}
await browser.close();
server.close();
if (problems.length) { console.error(`The view and the rules disagree on the light:\n${problems.join("\n")}`); process.exit(1); }
console.log(`Light: the view and the rules agree, ${compared} squares at ${moments} moments (band edges left out).`);
