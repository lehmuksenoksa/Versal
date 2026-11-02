// Bootstrap: fonts, input and the animation loop.

import { World, ITEMS, MONSTERS, monName } from "./world.js";
import { Renderer, bindZoom } from "./render.js";
import { UI } from "./ui.js";
import { wayTo, wayToExplore, WALK } from "./travel.js";
import { tipFor, tipHtml } from "./tips.js";

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
  stopWalk();
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
    // (Resting, the player looks about for secret doors as searching does.)
    world.tick(true, true);
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
  // (Any key stops a walk.)
  if (walking) { e.preventDefault(); return stopWalk(); }
  // Tab: the whole level, as far as it's been seen; Tab again, or any other
  // key, back.
  if (e.key === "Tab") { e.preventDefault(); return toggleWhole(); }
  if (renderer.whole) renderer.showWhole(null);
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
  } else if (e.key === "x" || e.key === "X") {
    // Explore: walk to the nearest place not yet seen, and on.
    e.preventDefault();
    startWalk({ explore: true });
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
    if ([...now].some((id) => !hold.seen.has(id)) || world.player.hp < hold.hp) return endHold();
    hold.seen = now;
  }
  hold.timer = setTimeout(walk, HOLD.every);
}

function endHold() {
  if (hold) clearTimeout(hold.timer);
  hold = null;
}

// Walking by itself (travel.js): to a square clicked, or exploring (x). A
// step every `WALK.every` ms, the way found afresh each step; stopped by a
// monster not in sight before coming into it, a hit point lost, something
// underfoot (not what it was walking to), a key or a click. `to`: the square;
// `near`: stop next to it (a monster); `then`: what to do on getting there.
let walking = null;
const tooHurt = () => world.player.hp < world.player.maxHp * WALK.tooHurt;

function startWalk(opts) {
  stopWalk();
  // (No exploring with a monster in sight that's after you.)
  const after = opts.explore && world.actors.find((a) => a !== world.player && world.isVisible(a.x, a.y) && (a.state === "aggressive" || a.state === "suspicious"));
  if (after) return world.log(`Not with ${an(monName(after))} about.`);
  const way = opts.explore ? wayToExplore(world) : wayTo(world, opts.to.x, opts.to.y);
  if (!way) return world.log(opts.explore ? "There's nothing left to explore that you can reach." : "You can't see a way there.");
  if (way.length > 1 && tooHurt()) return world.log("You're too hurt to go far. Rest first (r).");
  walking = { ...opts, seen: goblinsInSight(), hp: world.player.hp, from: { x: world.player.x, y: world.player.y } };
  renderer.preview = null;
  walkStep();
}

function stopWalk() {
  if (!walking) return;
  clearTimeout(walking.timer);
  walking = null;
}

function walkStep() {
  const W = walking;
  if (!W || !world || world.ended || ui.blocking) return stopWalk();
  const p = world.player;
  const way = W.explore ? wayToExplore(world) : wayTo(world, W.to.x, W.to.y);
  const there = way && (W.near ? way.length <= 1 : way.length === 0);
  if (!way || there) {
    stopWalk();
    if (!way && W.explore) world.log("There's nothing left to explore that you can reach.");
    if (there) W.then?.();
    return;
  }
  const s = way[0];
  if (!world.playerMove(s.x - p.x, s.y - p.y)) return stopWalk();
  // (Stopped by what's come into sight, a hurt, or something underfoot.)
  const now = goblinsInSight(), fresh = world.actors.find((a) => now.has(a.id) && !W.seen.has(a.id));
  if (fresh) {
    world.log(`You stop: ${an(monName(fresh))} comes into sight.`);
    return stopWalk();
  }
  W.seen = now;
  if (p.hp < W.hp || world.ended) return stopWalk();
  const atEnd = !W.explore && p.x === W.to.x && p.y === W.to.y;
  if (!atEnd && world.itemsAt(p.x, p.y).length) return stopWalk();
  W.timer = setTimeout(walkStep, WALK.every);
}
const an = (name) => (/^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`);

// A click on the map (a mouse): on a monster next to you, strike it; further
// off, walk up to it. On an open door next to you, close it (a shut one, a
// step opens it). On a thing, walk to it and pick it up (on your own square,
// pick it up). Anywhere else seen, walk there.
function clickAt(tx, ty) {
  const p = world.player, dx = tx - p.x, dy = ty - p.y, d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d === 0) return world.itemsAt(p.x, p.y).length ? world.pickUp() : undefined;
  const g = world.actorAt(tx, ty);
  if (g && g !== p && world.isVisible(tx, ty)) return d === 1 ? world.playerMove(dx, dy) : startWalk({ to: { x: tx, y: ty }, near: true });
  const door = world.doorAt(tx, ty);
  if (door && d === 1) return door.open ? world.closeDoorAt(tx, ty) : world.playerMove(dx, dy);
  const things = world.seen[ty * world.level.w + tx] && world.itemsAt(tx, ty).length;
  startWalk({ to: { x: tx, y: ty }, then: things ? () => world.pickUp() : null });
}

// Where a click would take you, shown while the mouse rests on the map: the
// way as a dotted trail (renderer.preview), found again as things change.
let hover = null;
// (Shown, and clicks walking, only while Shift is held: `shift`, kept from
// the keys and the mouse.)
let shift = false;
const setShift = (on) => { if (shift !== on) { shift = on; if (hover) hover.since = performance.now(); } };
window.addEventListener("keydown", (e) => e.key === "Shift" && setShift(true), true);
window.addEventListener("keyup", (e) => e.key === "Shift" && setShift(false), true);
window.addEventListener("blur", () => setShift(false));
function updatePreview() {
  if (!hover || !shift || !world || walking || ui.blocking || world.ended) { renderer.preview = null; return; }
  const key = `${hover.x},${hover.y},${world.turn},${world.player.x},${world.player.y}`;
  if (key === hover.key) return;
  hover.key = key;
  const p = world.player, g = world.actorAt(hover.x, hover.y), mon = g && g !== p && world.isVisible(hover.x, hover.y);
  let way = wayTo(world, hover.x, hover.y);
  if (way && mon) way = way.slice(0, -1);
  renderer.preview = way && way.length ? { way, end: way[way.length - 1] } : null;
}

// The tip (tips.js) for what the mouse has rested on a moment: a plate
// beside it (flipped to its left by the screen's edge), a ring round it.
const TIP_DELAY = 250;
const tipEl = document.getElementById("tip");
function updateTip(now) {
  let t = null;
  if (hover && shift && world && !walking && !ui.blocking && !world.ended && now - hover.since >= TIP_DELAY)
    t = tipFor(world, hover.x, hover.y, (a) => renderer.inSight((a.x + 0.5) * renderer.TS, (a.y + 0.5) * renderer.TS));
  renderer.tipRing = t?.at ?? null;
  if (!t) {
    if (!tipEl.hidden) tipEl.hidden = true;
    return;
  }
  const html = tipHtml(t);
  if (html !== tipEl.dataset.html) { tipEl.innerHTML = html; tipEl.dataset.html = html; }
  tipEl.hidden = false;
  const c = renderer.drawnCam, S = renderer.TS * renderer.zoom, r = canvas.getBoundingClientRect();
  const ax = t.at ? r.left + ((t.at.x + 0.5) * renderer.TS - c[0]) * renderer.zoom : hover.cx, ay = t.at ? r.top + ((t.at.y + 0.5) * renderer.TS - c[1]) * renderer.zoom : hover.cy;
  const gap = t.at ? S * 0.7 : 18, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let left = ax + gap, top = ay - (t.at ? S * 0.2 + 14 : -14);
  if (left + w > window.innerWidth - (ui.insetRight ?? 0) - 8) left = ax - gap - w;
  top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
  tipEl.style.left = `${Math.round(left)}px`;
  tipEl.style.top = `${Math.round(top)}px`;
}

// The whole level as far as it's been seen (Tab), or back.
function toggleWhole() {
  if (renderer.whole) return renderer.showWhole(null);
  const L = world.level, W = L.w;
  let x0 = W, y0 = L.h, x1 = -1, y1 = -1;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < W; x++) {
    if (!world.seen[y * W + x]) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 >= 0) renderer.showWhole({ x0, y0, x1, y1 });
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
  e.preventDefault();
  // (A click or tap stops a walk, and does nothing else.)
  if (walking) return stopWalk();
  // (With Shift held, a mouse click walks, strikes, picks up or closes;
  // without, it steps and holds to walk, as a finger, below.)
  setShift(e.shiftKey);
  if (e.pointerType === "mouse" && e.shiftKey) {
    if (resting) return stopRest("You stop resting.");
    const t = tileUnder(e.clientX, e.clientY);
    if (t && !world.ended) clickAt(t.x, t.y);
    if (renderer.whole) renderer.showWhole(null);
    return;
  }
  if (resting) stopRest("You stop resting.");
  canvas.setPointerCapture?.(e.pointerId);
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  endHold();
  if (fingers.size === 2) {
    pinch = { from: Math.max(1, spread()), zoom: renderer.zoom };
    return;
  }
  if (fingers.size > 2 || pinch) return;
  hold = { x: e.clientX, y: e.clientY, seen: goblinsInSight(), tap: true, hp: world.player.hp };
  hold.timer = setTimeout(() => {
    if (!hold) return;
    // (Too hurt, no walking: the tap still steps.)
    if (tooHurt()) return world.log("You're too hurt to go far. Rest first (r).");
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

// The square under a point on the screen, as drawn.
function tileUnder(clientX, clientY) {
  const r = canvas.getBoundingClientRect(), c = renderer.drawnCam;
  if (!c) return null;
  return { x: Math.floor(((clientX - r.left) / renderer.zoom + c[0]) / renderer.TS), y: Math.floor(((clientY - r.top) / renderer.zoom + c[1]) / renderer.TS) };
}
// (The mouse resting on the map: what a click would do, shown.)
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const t = tileUnder(e.clientX, e.clientY);
  if (!t) return;
  setShift(e.shiftKey);
  if (!hover || hover.x !== t.x || hover.y !== t.y) hover = { x: t.x, y: t.y, since: performance.now() };
  Object.assign(hover, { cx: e.clientX, cy: e.clientY });
});
canvas.addEventListener("pointerleave", () => { hover = null; renderer.preview = null; });
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
    updatePreview();
    updateTip(now);
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
window.versal = { get world() { return world; }, get walking() { return walking; }, renderer, ui, newRun };

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
