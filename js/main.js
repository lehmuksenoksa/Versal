// Bootstrap: fonts, input and the animation loop.

import { World, ITEMS } from "./rules/world.js";
import { Renderer, bindZoom } from "./render.js";
import { UI } from "./ui.js";
import { wayTo, WALK } from "./rules/travel.js";
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
  world.act({ do: "move", dx, dy });
}

// A new run: a new level, the lamp lit, and the player's name asked over it
// (the last one offered).
function newRun() {
  stopGoing();
  ui.toggleDrawer(false);
  ui.togglePanel("sheet");
  document.body.dataset.started = "1";
  offerNew = null;
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  saved = { turn: -1, depth: 0 };
  // (The level is there at once; the name asked over it, in the corner,
  // and the player named when it's given. `?name=…` skips the question, for
  // trying things out.)
  const q = new URLSearchParams(location.search), given = q.get("name");
  // (`?seed=…` makes the same run every time, for tests.)
  broken = false;
  world = guard(new World(q.has("seed") ? Number(q.get("seed")) : undefined, { name: given || ui.lastName() || "Adventurer" }));
  renderer.setWorld(world);
  renderer.showLamp();
  if (!given) ui.askName((name) => { world.player.name = name; window.focus(); });
  window.focus();
}

// A replay of the run (js/rules/replay.js), saved as a file: its seed and
// every move, to be played again exactly (tools/replay.mjs).
function saveReplay() {
  if (!world) return;
  const data = world.replay(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  a.download = `versal-replay-${data.seed}-turn${data.turn}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
ui.onSaveReplay = saveReplay;

// Something gone wrong in the rules (a bug): the run is no longer saved, so
// the last good save stays (the page taken up again from a few turns
// before), and the replay is offered, to see it happen again.
let broken = false;
function guard(w) {
  for (const k of ["act", "goOn", "stop"]) {
    const call = w[k];
    w[k] = (...args) => {
      try { return call.apply(w, args); }
      catch (err) {
        console.error(err);
        if (!broken) {
          broken = true;
          window.versalError?.(`Something went wrong in the game: ${err?.stack || err}\nThe run is no longer saved (taking it up again starts from a few turns before). Press ? and "Save a replay of this run" to keep what happened.`);
        }
        return false;
      }
    };
  }
  return w;
}

// Saving the run (spec/rebuild-plan.md, R4): kept in the browser as it's
// played (every few turns, on a new level, and when the page is left), and
// taken up again when the page opens; gone when the run ends. `?seed=…`
// (tests) always starts afresh.
const SAVE_KEY = "versal.run", SAVE_EVERY = 5;
let saved = { turn: -1, depth: 0 }, offerNew = null;
function saveRun() {
  if (!world || broken) return;
  try {
    if (world.ended) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(world.save()));
  } catch {}
  saved = { turn: world.turn, depth: world.place.depth };
}
function keepSaved() {
  if (!world) return;
  if (world.ended ? saved.turn !== -2 : world.turn - saved.turn >= SAVE_EVERY || world.place.depth !== saved.depth) {
    saveRun();
    if (world.ended) saved.turn = -2;
  }
  // (The offer of a new run lapses once the resumed one goes on.)
  if (offerNew !== null && world.turn !== offerNew) offerNew = null;
}
function savedRun() {
  if (new URLSearchParams(location.search).has("seed")) return null;
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? World.restore(JSON.parse(text)) : null;
  } catch { return null; }
}
// The page opening: the run left last time, if there is one, else a new one.
function startOrResume() {
  const w = savedRun();
  if (!w) return newRun();
  ui.toggleDrawer(false);
  ui.togglePanel("sheet");
  document.body.dataset.started = "1";
  world = guard(w);
  // (Whatever was under way when the page was left, not carried on.)
  world.stop();
  renderer.setWorld(world);
  // (The lamp as it was left, drawn so.)
  renderer.showLamp();
  saved = { turn: world.turn, depth: world.place.depth };
  world.log("You take up your run where you left it. (N: a new run instead.)");
  offerNew = world.turn;
  window.focus();
}
window.addEventListener("pagehide", saveRun);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveRun(); });

// Activities (js/rules/actions.js: resting, walking, exploring) carried on a
// turn at a time, the rules deciding when each stops: a turn every `REST_MS`
// resting, every `WALK.every` walking. Any key or click stops one.
const REST_MS = 60;
let goingOn = null;
const doing = (kind) => !!world?.doing && (!kind || (kind === "rest") === (world.doing.do === "rest"));
function begin(cmd) {
  stopGoing();
  if (!world.act(cmd) || !world.doing) return;
  renderer.preview = null;
  if (world.doing.do === "rest") goingOn = setTimeout(goOn, REST_MS);
  else goOn();
}
function goOn() {
  goingOn = null;
  if (!world?.doing) return;
  if (ui.blocking) return stopGoing();
  world.goOn();
  if (world.doing) goingOn = setTimeout(goOn, world.doing.do === "rest" ? REST_MS : WALK.every);
}
function stopGoing(why = null) {
  clearTimeout(goingOn);
  goingOn = null;
  world?.stop(why);
}

window.addEventListener("keydown", (e) => {
  if (!world || e.ctrlKey || e.metaKey || e.altKey || ui.asking) return;
  if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
  // (Any key stops a walk.)
  if (doing("walk")) { e.preventDefault(); return stopGoing(); }
  // Tab: the whole level, as far as it's been seen; Tab again, or any other
  // key, back.
  if (e.key === "Tab") { e.preventDefault(); return toggleWhole(); }
  if (renderer.whole) renderer.showWhole(null);
  // (Any key ends a run that's over, stops resting.)
  if (world.ended) { e.preventDefault(); return newRun(); }
  if (doing("rest")) { e.preventDefault(); return stopGoing("You stop resting."); }
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
  // (Just after resuming: N for a new run instead.)
  if (offerNew !== null && (e.key === "n" || e.key === "N")) { e.preventDefault(); return newRun(); }
  // (Capitals first: W and D aren't the moves w and d.)
  if (e.key === "W" || e.key === "D") {
    e.preventDefault();
    const can = e.key === "W" ? world.player.pack.some((i) => ["weapon", "armour"].includes(ITEMS[i.type].cat)) : world.player.pack.length;
    if (!can) return world.log(e.key === "W" ? "You have nothing to wield or wear." : "You carry nothing.");
    return ui.ask(e.key);
  }
  const dir = KEYS[e.code] || KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  // (Shift and an arrow or a number-pad key: run that way. Not Shift and
  // WASD: W and D are wield and drop.)
  if (dir && e.shiftKey && /^(Arrow|Numpad)/.test(e.code)) {
    e.preventDefault();
    return begin({ do: "run", dx: dir[0], dy: dir[1] });
  }
  if (dir) {
    e.preventDefault();
    step(dir[0], dir[1], e.repeat);
  } else if (e.key === "." || e.key === " ") {
    // Wait a turn and watch the goblins.
    e.preventDefault();
    world.act({ do: "wait" });
  } else if (e.key === "c" || e.key === "C") {
    // Close a door next to the player.
    e.preventDefault();
    world.act({ do: "close" });
  } else if (e.key === "x" || e.key === "X") {
    // Explore: walk to the nearest place not yet seen, and on.
    e.preventDefault();
    begin({ do: "explore" });
  } else if (e.key === "z" || e.key === "Z") {
    // Search for secret doors close by (a turn).
    e.preventDefault();
    world.act({ do: "search" });
  } else if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    begin({ do: "rest" });
  } else if (e.key === "f" || e.key === "F") {
    // Put the lamp out (sneak), or light it again.
    e.preventDefault();
    toggleLamp();
  } else if (e.key === ">" || e.key === "<") {
    e.preventDefault();
    world.act({ do: "stairs", dir: e.key === ">" ? "down" : "up" });
  } else if (e.key === "," || e.key === "g") {
    e.preventDefault();
    world.act({ do: "pickUp" });
  } else if (e.key === "q") {
    // Drink: a potion at once when there's one kind, else ask which.
    e.preventDefault();
    const kinds = world.player.pack.filter((i) => ITEMS[i.type].cat === "potion");
    if (!kinds.length) world.log("You have nothing to drink.");
    else if (kinds.length === 1) world.act({ do: "drink", key: kinds[0].key });
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
  if (verb === "q") world.act({ do: "drink", key });
  else if (verb === "W") world.act({ do: "wield", key });
  else if (verb === "D") world.act({ do: "drop", key });
  else if (verb === "t") world.act({ do: "takeOff", where: key });
  else if (verb === "pick") world.act({ do: "pickUp" });
}
// The lamp out or lit again (the rules), and drawn so.
function toggleLamp() {
  if (!world || world.dead) return;
  world.act({ do: "lamp" });
  renderer.showLamp();
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
  for (const t of tries) {
    const [dx, dy] = stepAt(t);
    if (world.act({ do: "move", dx, dy })) return true;
  }
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

// (Not walking far, badly hurt: the touch walk's own check.)
const tooHurt = () => world.player.hp < world.player.maxHp * WALK.tooHurt;


// A click on the map (a mouse): on a monster next to you, strike it; further
// off, walk up to it. On an open door next to you, close it (a shut one, a
// step opens it). On a thing, walk to it and pick it up (on your own square,
// pick it up). Anywhere else seen, walk there.
function clickAt(tx, ty) {
  const p = world.player, dx = tx - p.x, dy = ty - p.y, d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d === 0) return world.itemsAt(p.x, p.y).length ? world.act({ do: "pickUp" }) : undefined;
  const g = world.actorAt(tx, ty);
  if (g && g !== p && world.isVisible(tx, ty)) return d === 1 ? world.act({ do: "move", dx, dy }) : begin({ do: "walk", to: { x: tx, y: ty }, near: true });
  const door = world.doorAt(tx, ty);
  if (door && d === 1) return door.open ? world.act({ do: "close", x: tx, y: ty }) : world.act({ do: "move", dx, dy });
  const things = world.seen[ty * world.level.w + tx] && world.itemsAt(tx, ty).length;
  begin({ do: "walk", to: { x: tx, y: ty }, then: things ? { do: "pickUp" } : null });
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
  if (!hover || !shift || !world || doing("walk") || ui.blocking || world.ended) { renderer.preview = null; return; }
  const key = `${hover.x},${hover.y},${world.turn},${world.player.x},${world.player.y}`;
  if (key === hover.key) return;
  hover.key = key;
  const p = world.player, g = world.actorAt(hover.x, hover.y), mon = g && g !== p && world.isVisible(hover.x, hover.y);
  let way = wayTo(world, hover.x, hover.y);
  if (way && mon) way = way.slice(0, -1);
  renderer.preview = way && way.length ? { way, end: way[way.length - 1] } : null;
}

// The tip (tips.js) for what the mouse has rested on a moment: a plate
// beside it (flipped to its left by the screen's edge).
const TIP_DELAY = 250;
const tipEl = document.getElementById("tip");
function updateTip(now) {
  let t = null;
  if (hover && shift && world && !doing("walk") && !ui.blocking && !world.ended && now - hover.since >= TIP_DELAY)
    t = tipFor(world, hover.x, hover.y, (a) => renderer.inSight((a.x + 0.5) * renderer.TS, (a.y + 0.5) * renderer.TS));
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
  if (doing("walk")) return stopGoing();
  // (With Shift held, a mouse click walks, strikes, picks up or closes;
  // without, it steps and holds to walk, as a finger, below.)
  setShift(e.shiftKey);
  if (e.pointerType === "mouse" && e.shiftKey) {
    if (doing("rest")) return stopGoing("You stop resting.");
    const t = tileUnder(e.clientX, e.clientY);
    if (t && !world.ended) clickAt(t.x, t.y);
    if (renderer.whole) renderer.showWhole(null);
    return;
  }
  if (doing("rest")) stopGoing("You stop resting.");
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
button("act-search", () => world.act({ do: "search" }));
button("act-pack", () => ui.togglePanel("i"));
// (The stairs: whichever way the ones underfoot go.)
button("act-stairs", () => world.act({ do: "stairs", dir: world.level.stairsDown && world.level.stairsDown.x === world.player.x && world.level.stairsDown.y === world.player.y ? "down" : "up" }));
button("act-rest", () => (doing("rest") ? stopGoing("You stop resting.") : begin({ do: "rest" })));
button("act-lamp", () => toggleLamp());
button("act-close", () => world.act({ do: "close" }));
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
    keepSaved();
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
window.versal = { get world() { return world; }, get walking() { return doing("walk"); }, renderer, ui, newRun, saveReplay };

(async () => {
  try {
    await document.fonts.load('800 48px "Texturina"', "@g");
    await document.fonts.load('600 48px "Texturina"', "@g");
    await document.fonts.load('italic 16px "IM Fell English"');
  } catch {
    // Fall back to whatever serif is available.
  }
  startOrResume();
  requestAnimationFrame(loop);
})();
