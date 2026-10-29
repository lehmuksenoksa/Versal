// Bootstrap: fonts, input, the animation loop, and the title/ending cards.

import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { UI } from "./ui.js";
import { drawVersal } from "./versal.js";
import { MONSTERS } from "./content.js";
import { T } from "./dungeon.js";

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  8: [0, -1], 2: [0, 1], 4: [-1, 0], 6: [1, 0], 7: [-1, -1], 9: [1, -1], 1: [-1, 1], 3: [1, 1],
  Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1],
};

const canvas = document.getElementById("view");
const renderer = new Renderer(canvas);
let game = null;
let travel = null;
let lastAction = 0;
let endShown = false;

const ui = new UI({
  quaff: () => act(() => game.quaff()),
  read: () => act(() => game.read()),
  wait: () => act(() => game.wait()),
  descend: () => act(() => game.descend()),
});

function newGame() {
  game = new Game();
  renderer.setGame(game);
  endShown = false;
  ui.update(game);
  hideCard();
}

function act(fn) {
  if (!game || game.state !== "play" || !cardEl.hidden) return false;
  stopTravel();
  const r = fn();
  lastAction = performance.now();
  ui.update(game);
  return r;
}

function stopTravel() {
  if (travel) clearInterval(travel);
  travel = null;
}

// ---------- keyboard ---------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!cardEl.hidden) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cardAction(); }
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = KEYS[e.code?.startsWith("Numpad") ? e.code.slice(6) : key] || KEYS[key];
  const now = performance.now();
  if (dir) {
    e.preventDefault();
    if (e.repeat && now - lastAction < 110) return;
    act(() => game.playerMove(dir[0], dir[1]));
    return;
  }
  const commands = {
    ".": () => game.wait(), " ": () => game.wait(), 5: () => game.wait(), Clear: () => game.wait(),
    ">": () => game.descend(), Enter: () => game.descend(),
    q: () => game.quaff(), r: () => game.read(),
  };
  const cmd = commands[e.key] || commands[key];
  if (cmd) {
    e.preventDefault();
    if (e.repeat && now - lastAction < 110) return;
    act(cmd);
  }
});

// ---------- pointer ------------------------------------------------------------

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  renderer.hover = renderer.screenToTile(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener("pointerleave", () => (renderer.hover = null));
canvas.addEventListener("click", (e) => {
  if (!game || game.state !== "play") return;
  const r = canvas.getBoundingClientRect();
  const t = renderer.screenToTile(e.clientX - r.left, e.clientY - r.top);
  const p = game.player, dx = t.x - p.x, dy = t.y - p.y;
  if (dx === 0 && dy === 0) {
    act(() => (game.tileAt(p.x, p.y) === T.STAIRS_DOWN ? game.descend() : game.wait()));
    return;
  }
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
    act(() => game.playerMove(dx, dy));
    return;
  }
  if (!game.isSeen(t.x, t.y)) return;
  stopTravel();
  travel = setInterval(() => {
    const going = game.travelStep(t.x, t.y);
    ui.update(game);
    if (!going) stopTravel();
  }, 85);
});

window.addEventListener("resize", () => renderer.resize());

// ---------- cards: title, death, victory -------------------------------------

const cardEl = document.getElementById("card");
const cardCanvas = document.getElementById("card-versal");
let cardMode = "title";

function showCard(mode) {
  cardMode = mode;
  const g = game;
  const title = document.getElementById("card-title");
  const body = document.getElementById("card-body");
  const btn = document.getElementById("card-button");
  if (mode === "title") {
    title.textContent = "Versal";
    body.innerHTML = "A small descent through three leaves of an ill-tempered manuscript. Goblins swarm in the margins; the great beasts are drawn as illuminated capitals. Slay the Dragon on the third leaf.";
    btn.textContent = "Open the book";
  } else if (mode === "dead") {
    title.textContent = "Here endeth the tale";
    body.textContent = `Slain by ${g.deathBy} on leaf ${g.depth}, at level ${g.player.level}, carrying ${g.player.gold} gold and ${g.kills} kills to the grave.`;
    btn.textContent = "Begin anew";
  } else {
    title.textContent = "Finis";
    body.textContent = `The Dragon is undone, and the book may close. You reached level ${g.player.level} with ${g.player.gold} gold and ${g.kills} kills, in ${g.turn} turns.`;
    btn.textContent = "Read it again";
  }
  cardEl.hidden = false;
  btn.focus({ preventScroll: true });
}

function hideCard() { cardEl.hidden = true; }

function cardAction() {
  if (cardMode === "title") { hideCard(); if (!game) newGame(); }
  else newGame();
}
document.getElementById("card-button").addEventListener("click", cardAction);

function drawCardArt(now) {
  if (cardEl.hidden) return;
  const ctx = cardCanvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = cardCanvas.clientWidth || 200;
  if (cardCanvas.width !== Math.round(size * dpr)) cardCanvas.width = cardCanvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const t = now / 1000;
  if (cardMode === "dead" && game?.deathBy && !game.deathBy.startsWith("the ")) {
    // The creature that killed you, hopping about on its own.
    const kind = Object.keys(MONSTERS).find((k) => game.deathBy.endsWith(" " + MONSTERS[k].name));
    const glyph = kind ? MONSTERS[kind].glyph : "@";
    const h = Math.abs(Math.sin(t * 3.4));
    ctx.save();
    ctx.translate(size / 2, size * 0.78 - h * size * 0.12);
    ctx.scale(1 + Math.pow(1 - h, 6) * 0.15, 1 - Math.pow(1 - h, 6) * 0.18);
    ctx.font = `${size * 0.8}px UnifrakturMaguntia, serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#6e1a12";
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
    return;
  }
  const letter = cardMode === "won" ? "F" : cardMode === "dead" ? (game.deathBy.includes("Dragon") ? "D" : "G") : "V";
  const motif = cardMode === "dead" ? (letter === "D" ? "dragon" : "crown") : "vines";
  drawVersal(ctx, { letter, motif, x: size / 2, y: size / 2 + size * 0.05, size: size * 0.56, t, awake: true });
}

// ---------- title versal in the codex, and the main loop ----------------------

const titleCanvas = document.getElementById("title-versal");
function drawTitle(now) {
  const ctx = titleCanvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = titleCanvas.clientWidth || 64;
  if (titleCanvas.width !== Math.round(size * dpr)) titleCanvas.width = titleCanvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  drawVersal(ctx, { letter: "V", motif: "vines", x: size / 2, y: size / 2, size: size * 0.7, t: now / 1000, awake: true });
}

function loop(now) {
  if (game) {
    renderer.frame(now);
    if (game.state !== "play" && !endShown) {
      endShown = true;
      stopTravel();
      ui.update(game);
      setTimeout(() => showCard(game.state), 1300);
    }
  }
  drawTitle(now);
  drawCardArt(now);
  requestAnimationFrame(loop);
}

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('48px "UnifrakturMaguntia"'),
      document.fonts.load('700 48px "UnifrakturCook"'),
      document.fonts.load('16px "IM Fell English"'),
      document.fonts.load('italic 16px "IM Fell English"'),
    ]);
  } catch {
    // Fall back to whatever serif is available; the game still plays.
  }
  newGame();
  showCard("title");
  requestAnimationFrame(loop);
}

// A handle for poking at the game from the browser console.
window.versal = { get game() { return game; }, renderer };

boot();
