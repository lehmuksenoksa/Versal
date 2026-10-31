// Bootstrap: fonts, input and the animation loop.

import { World } from "./world.js";
import { Renderer, bindZoom } from "./render.js";

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
  } else if (e.key === "c" || e.key === "C") {
    // Close a door next to the player.
    e.preventDefault();
    world.closeDoor();
  } else if (e.key === "e" || e.key === "E") {
    // Search for secret doors close by (a turn).
    e.preventDefault();
    world.search();
  } else if (e.key === "f" || e.key === "F") {
    // Put the lamp out (sneak), or light it again.
    e.preventDefault();
    renderer.toggleLamp();
  }
});

// Touch and mouse: a tap steps once toward the finger, which way by the
// angle from the player (straight up, down and across taking more of it
// than the diagonals, `straight`); held, the player keeps walking, steered
// by the finger, sliding round a wall in the way, until a goblin not in
// sight before comes into it. Too near the player (`dead`, in squares), no
// step.
const HOLD = { delay: 280, every: 160, dead: 0.45, straight: 27.5 };
let hold = null;

function dirTo(clientX, clientY) {
  const r = canvas.getBoundingClientRect(), p = renderer.playerOnScreen();
  if (!p) return null;
  const x = clientX - r.left - p.x, y = clientY - r.top - p.y;
  if (Math.hypot(x, y) < HOLD.dead * p.size) return null;
  const a = Math.atan2(y, x), q = Math.PI / 2, c = Math.round(a / q) * q;
  const along = Math.abs(a - c) <= (HOLD.straight * Math.PI) / 180 ? c : Math.round((a - q / 2) / q) * q + q / 2;
  return { a, along };
}

const stepAt = (t) => [Math.round(Math.cos(t)), Math.round(Math.sin(t))];

// A step along `d`; walking, if that way is blocked, the way 45° either side
// nearer the finger.
function stepToward(d, walking) {
  const tries = [d.along];
  if (walking) tries.push(...[d.along + Math.PI / 4, d.along - Math.PI / 4].sort((p, q) => Math.abs(Math.atan2(Math.sin(p - d.a), Math.cos(p - d.a))) - Math.abs(Math.atan2(Math.sin(q - d.a), Math.cos(q - d.a)))));
  for (const t of tries) if (world.playerMove(...stepAt(t))) return true;
  return false;
}

const goblinsInSight = () => new Set(world.actors.filter((a) => a.kind === "goblin" && world.isVisible(a.x, a.y)).map((a) => a.id));

function walk() {
  if (!hold || !world) return;
  const d = dirTo(hold.x, hold.y);
  if (d) {
    stepToward(d, true);
    const now = goblinsInSight();
    if ([...now].some((id) => !hold.seen.has(id))) return endHold();
    hold.seen = now;
  }
  hold.timer = setTimeout(walk, HOLD.every);
}

function endHold() {
  if (hold) clearTimeout(hold.timer);
  hold = null;
}

// (A tap steps as the finger lifts, so that a second finger coming down,
// a pinch to zoom, takes no step. Two fingers zoom by how far apart they
// are; the view stays on the player, as with the wheel.)
const fingers = new Map();
let pinch = null;
const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

canvas.addEventListener("pointerdown", (e) => {
  if (!world || e.button > 0) return;
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  endHold();
  if (fingers.size === 2) {
    pinch = { from: Math.max(1, spread()), zoom: renderer.zoom };
    return;
  }
  if (fingers.size > 2 || pinch) return;
  hold = { x: e.clientX, y: e.clientY, seen: goblinsInSight(), tap: true };
  hold.timer = setTimeout(() => {
    if (!hold) return;
    hold.tap = false;
    walk();
  }, HOLD.delay);
});
canvas.addEventListener("pointermove", (e) => {
  const f = fingers.get(e.pointerId);
  if (!f) return;
  Object.assign(f, { x: e.clientX, y: e.clientY });
  if (pinch && fingers.size === 2) renderer.setZoom(pinch.zoom * (spread() / pinch.from));
  else if (hold) Object.assign(hold, { x: e.clientX, y: e.clientY });
});
const lift = (e) => {
  if (!fingers.delete(e.pointerId)) return;
  if (hold?.tap && e.type === "pointerup") {
    const d = dirTo(hold.x, hold.y);
    if (d) stepToward(d, false);
  }
  endHold();
  if (!fingers.size) pinch = null;
};
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(type, lift);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// The action strip (touch screens): search (or wait), the lamp, closing a
// door; kept up to date each frame.
const act = (id, fn) => document.getElementById(id)?.addEventListener("click", () => world && fn());
act("act-search", () => world.search());
act("act-lamp", () => renderer.toggleLamp());
act("act-close", () => world.closeDoor());
function updateActions() {
  const lamp = document.getElementById("act-lamp"), close = document.getElementById("act-close");
  if (!world || !lamp) return;
  // (The view keeps above the strip.)
  const strip = document.getElementById("actions").getBoundingClientRect();
  renderer.inset = strip.height ? window.innerHeight - strip.top : 0;
  const label = world.sneaking ? "Light lamp" : "Lamp out";
  if (lamp.textContent !== label) lamp.textContent = label;
  const can = world.canCloseDoor();
  if (close.disabled === can) close.disabled = !can;
}

window.addEventListener("resize", () => renderer.resize());
bindZoom(renderer, canvas);

const shown = new Set();
function loop(now) {
  // (A frame that fails doesn't stop the ones after it.)
  try {
    renderer.frame(now);
    updateActions();
  } catch (err) {
    console.error(err);
    // (Shown on the page, once each.)
    const msg = `${err?.stack || err}`;
    if (!shown.has(msg)) { shown.add(msg); window.versalError?.(msg); }
  }
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
  document.body.dataset.started = "1";
  requestAnimationFrame(loop);
})();
