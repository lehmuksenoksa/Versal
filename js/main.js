// Bootstrap: fonts, input and the animation loop.

import { World } from "./world.js";
import { Renderer } from "./render.js";

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
};

const canvas = document.getElementById("view");
const renderer = new Renderer(canvas);
let world = null;
let lastMove = 0;

function step(dx, dy, repeat) {
  const now = performance.now();
  if (repeat && now - lastMove < 110) return;
  lastMove = now;
  world.playerMove(dx, dy);
}

window.addEventListener("keydown", (e) => {
  if (!world || e.ctrlKey || e.metaKey || e.altKey) return;
  const dir = KEYS[e.code] || KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (dir) {
    e.preventDefault();
    step(dir[0], dir[1], e.repeat);
  } else if (e.key === "." || e.key === " ") {
    // Wait a turn and watch the goblins.
    e.preventDefault();
    world.tick();
  }
});

// Click or tap: one step toward that spot.
canvas.addEventListener("click", (e) => {
  if (!world) return;
  const r = canvas.getBoundingClientRect();
  const t = renderer.screenToTile(e.clientX - r.left, e.clientY - r.top);
  const dx = Math.sign(t.x - world.player.x), dy = Math.sign(t.y - world.player.y);
  if (dx || dy) step(dx, dy, false);
});

window.addEventListener("resize", () => renderer.resize());

function loop(now) {
  renderer.frame(now);
  requestAnimationFrame(loop);
}

// A handle for poking at things from the browser console.
window.versal = { get world() { return world; }, renderer };

(async () => {
  try {
    await document.fonts.load('800 48px "Texturina"', "@g");
    await document.fonts.load('600 48px "Texturina"', "@g");
    await document.fonts.load('italic 16px "IM Fell English"');
  } catch {
    // Fall back to whatever serif is available.
  }
  world = new World();
  renderer.setWorld(world);
  requestAnimationFrame(loop);
})();
