// Bootstrap: fonts, input and the animation loop.

import { World, ITEMS } from "./world.js";
import { Renderer, bindZoom } from "./render.js";
import { UI } from "./ui.js";

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
};

const canvas = document.getElementById("view");
const renderer = new Renderer(canvas);
const ui = new UI();
let world = null;
let lastMove = 0;

function step(dx, dy, repeat) {
  const now = performance.now();
  if (repeat && now - lastMove < 110) return;
  lastMove = now;
  world.playerMove(dx, dy);
}

// A new run: a new level, the lamp lit, and the player's name asked over it
// (the last one offered).
function newRun() {
  stopRest(null);
  ui.toggleDrawer(false);
  ui.togglePanel("sheet");
  document.body.dataset.started = "1";
  // (The level is there at once; the name asked over it, in the corner,
  // and the player named when it's given. `?name=…` skips the question, for
  // trying things out.)
  if (world?.sneaking) renderer.toggleLamp();
  const given = new URLSearchParams(location.search).get("name");
  world = new World(undefined, { name: given || ui.lastName() || "Adventurer" });
  renderer.setWorld(world);
  if (!given) ui.askName((name) => { world.player.name = name; window.focus(); });
  window.focus();
}

// Resting: a turn every `REST_MS` until healed and well, or until something
// comes into sight or chases near by, or a key or tap.
const REST_MS = 60;
let resting = null;
function startRest() {
  if (!world || world.ended || resting) return;
  const why = world.cantRest();
  if (why) return world.log(why);
  world.log("You rest.");
  resting = setInterval(() => {
    const p = world.player;
    if (world.ended) return stopRest(null);
    if (world.disturbed()) return stopRest("Something stirs. You stop resting.");
    world.tick(false, true);
    if (!world.dead && p.hp >= p.maxHp && !Object.keys(p.ailments).length) stopRest("You feel rested.", "good");
  }, REST_MS);
}
function stopRest(why, kind) {
  if (!resting) return;
  clearInterval(resting);
  resting = null;
  if (why) world.log(why, kind);
}

window.addEventListener("keydown", (e) => {
  if (!world || e.ctrlKey || e.metaKey || e.altKey || ui.asking) return;
  if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
  // (Any key ends a run that's over, stops resting.)
  if (world.ended) { e.preventDefault(); return newRun(); }
  if (resting) { e.preventDefault(); return stopRest("You stop resting."); }
  if (ui.helpOpen) {
    if (e.key === "?" || e.key === "Escape") { e.preventDefault(); ui.toggleHelp(false); }
    return;
  }
  // A question waiting for a letter (which thing to drink, wield, drop, take off).
  if (ui.prompt) {
    e.preventDefault();
    if (e.key === "Escape") return ui.endAsk();
    const verb = ui.prompt.verb;
    if (verb === "t") {
      const where = { a: "hand", b: "off", c: "head", d: "body" }[e.key];
      if (where) { ui.endAsk(); act(verb, where); }
    } else if (/^[a-j]$/.test(e.key)) { ui.endAsk(); act(verb, e.key); }
    return;
  }
  // (Capitals first: W and D aren't the moves w and d.)
  if (e.key === "W" || e.key === "D") {
    e.preventDefault();
    const can = e.key === "W" ? world.player.pack.some((i) => ["weapon", "armour"].includes(ITEMS[i.type].cat)) : world.player.pack.length;
    if (!can) return world.log(e.key === "W" ? "You have nothing to wield or wear." : "You carry nothing.");
    return ui.ask(e.key);
  }
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
  } else if (e.key === "z" || e.key === "Z") {
    // Search for secret doors close by (a turn).
    e.preventDefault();
    world.search();
  } else if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    startRest();
  } else if (e.key === "f" || e.key === "F") {
    // Put the lamp out (sneak), or light it again.
    e.preventDefault();
    if (!world.dead) renderer.toggleLamp();
  } else if (e.key === ">" || e.key === "<") {
    e.preventDefault();
    world.takeStairs(e.key === ">" ? "down" : "up");
  } else if (e.key === "," || e.key === "g") {
    e.preventDefault();
    world.pickUp();
  } else if (e.key === "q") {
    // Drink: a potion at once when there's one kind, else ask which.
    e.preventDefault();
    const kinds = world.player.pack.filter((i) => ITEMS[i.type].cat === "potion");
    if (!kinds.length) world.log("You have nothing to drink.");
    else if (kinds.length === 1) world.drink(kinds[0].key);
    else ui.ask("q");
  } else if (e.key === "t") {
    e.preventDefault();
    if (!Object.values(world.player.equip).some(Boolean)) world.log("You wear and hold nothing.");
    else ui.ask("t");
  } else if (["e", "i", "l"].includes(e.key.toLowerCase())) {
    e.preventDefault();
    ui.togglePanel(e.key.toLowerCase());
  } else if (e.key === "m" || e.key === "M") {
    e.preventDefault();
    ui.toggleDrawer();
  } else if (e.key === "?") {
    e.preventDefault();
    ui.toggleHelp(true);
  } else if (e.key === "Escape") {
    ui.toggleDrawer(false);
    ui.togglePanel("sheet");
  }
});
// Doing something with a thing: drinking, wielding or wearing, dropping (by
// its letter), taking off (by where), picking up.
function act(verb, key) {
  if (!world || world.ended) return;
  if (verb === "q") world.drink(key);
  else if (verb === "W") world.wield(key);
  else if (verb === "D") world.drop(key);
  else if (verb === "t") world.takeOff(key);
  else if (verb === "pick") world.pickUp();
}
ui.onAct = (verb, key) => { ui.endAsk(); act(verb, key); };
// A tap ends a run that's over; the help closes when tapped.
document.getElementById("death").addEventListener("click", () => world?.ended && newRun());
document.getElementById("help").addEventListener("click", () => ui.toggleHelp(false));

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

const goblinsInSight = () => new Set(world.actors.filter((a) => a !== world.player && world.isVisible(a.x, a.y)).map((a) => a.id));

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
  // (Kept from the browser, a press doesn't give the page the keys: in a
  // frame, as in the Claude app, it takes them itself.)
  window.focus();
  if (!world || e.button > 0 || ui.asking) return;
  if (resting) stopRest("You stop resting.");
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
const button = (id, fn) => document.getElementById(id)?.addEventListener("click", () => world && !ui.asking && fn());
button("act-search", () => world.search());
button("act-pack", () => ui.togglePanel("i"));
// (The stairs: whichever way the ones underfoot go.)
button("act-stairs", () => world.takeStairs(world.level.stairsDown && world.level.stairsDown.x === world.player.x && world.level.stairsDown.y === world.player.y ? "down" : "up"));
button("act-rest", () => (resting ? stopRest("You stop resting.") : startRest()));
button("act-lamp", () => renderer.toggleLamp());
button("act-close", () => world.closeDoor());
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
  // (The stairs' button only on stairs.)
  const L = world.level, p = world.player, on = [L.stairsDown, L.stairsUp].some((st) => st && st.x === p.x && st.y === p.y);
  const stairs = document.getElementById("act-stairs");
  if (stairs.hidden === on) stairs.hidden = !on;
}

window.addEventListener("resize", () => renderer.resize());
bindZoom(renderer, canvas);

const shown = new Set();
function loop(now) {
  // (A frame that fails doesn't stop the ones after it.)
  try {
    renderer.insetRight = ui.insetRight;
    renderer.lookMarks = ui.panel === "l";
    renderer.frame(now);
    if (world) ui.update(world);
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
window.versal = { get world() { return world; }, renderer, ui, newRun };

(async () => {
  try {
    await document.fonts.load('800 48px "Texturina"', "@g");
    await document.fonts.load('600 48px "Texturina"', "@g");
    await document.fonts.load('italic 16px "IM Fell English"');
  } catch {
    // Fall back to whatever serif is available.
  }
  newRun();
  requestAnimationFrame(loop);
})();
