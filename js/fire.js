// A campfire's flame, drawn each frame over the map: a cartoon fire, a round
// bulb licking up in tongues, red, then orange, then a pale yellow heart.
// Redrawn eight times a second, each drawing a little different, as a hand-
// animated fire on twos.

import { RNG } from "./rng.js";

const COLOURS = { outer: "#f2541b", mid: "#fba52b", heart: "#fde48e" };
const SIZE = 1.45, RATE = 8;

// A tongue of flame standing on (bx, by), `w` wide, `h` tall, its tip leaning
// `lean`; its sides a little off by `jit`.
function tongue(g, bx, by, w, h, lean, jit) {
  const tx = bx + lean + jit(), ty = by - h + jit();
  g.beginPath();
  g.moveTo(tx, ty);
  g.bezierCurveTo(bx + lean * 0.4 - w * 0.12 + jit(), by - h * 0.5, bx - w / 2 + jit(), by - h * 0.25, bx - w / 2, by);
  g.bezierCurveTo(bx - w / 2, by + w * 0.55, bx + w / 2, by + w * 0.55, bx + w / 2, by);
  g.bezierCurveTo(bx + w / 2 + jit(), by - h * 0.25, bx + lean * 0.4 + w * 0.12 + jit(), by - h * 0.5, tx, ty);
  g.closePath();
}

// One layer of the fire: a bulb `b` across, standing on (cx, by), its top
// licking up in `tips` (each { x, h, lean, notch } in bulbs, right to left);
// `J` puts the hand off a little.
function layer(g, cx, by, b, tips, fill, J) {
  const cy = by - b;
  g.beginPath();
  g.moveTo(cx + b, cy);
  let px = cx + b, py = cy;
  tips.forEach((t, i) => {
    const tx = cx + (t.x + t.lean) * b + J(), ty = cy - t.h * b + J();
    // (Up to the tip, bowing out; then down into the notch before the next.)
    g.bezierCurveTo(px + (i ? 0 : 0.08 * b), py - 0.35 * t.h * b, tx + 0.35 * b - t.lean * b * 0.5, cy - t.h * b * 0.55, tx, ty);
    const n = tips[i + 1];
    if (!n) return;
    const nx = cx + ((t.x + n.x) / 2) * b + J(), ny = cy - Math.min(t.h, n.h) * b * t.notch;
    g.bezierCurveTo(tx - 0.05 * b, ty + 0.35 * t.h * b, nx + 0.2 * b, ny - 0.1 * b, nx, ny);
    px = nx;
    py = ny;
  });
  const l = tips.at(-1);
  g.bezierCurveTo(cx + (l.x - 0.35) * b, cy - l.h * b * 0.5, cx - b * 1.04, cy - b * 0.35, cx - b, cy);
  g.arc(cx, cy, b, Math.PI, 0, true);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

// The fire in the middle of square (x, y) (centre, in pixels) at time `t`
// (seconds), `TS` the square's size; `seed` keeps fires apart.
export function drawFire(g, x, y, TS, t, seed = 0, alpha = 1) {
  const rng = new RNG(17 + Math.floor(t * RATE) * 13 + seed * 7919), r = (a, b) => rng.range(a, b);
  const jit = () => r(-0.45, 0.45) * TS / 32, b = SIZE * 0.2 * r(0.96, 1.04) * TS, by = y + TS * 0.24;
  const outer = [0.56, -0.02, -0.6].map((tx, i) => ({ x: tx + r(-0.08, 0.08), h: i === 1 ? r(1.75, 2.15) : r(0.95, 1.4), lean: r(-0.22, 0.22), notch: r(0.35, 0.6) }));
  const mid = [
    { x: 0.45 + r(-0.1, 0.1), h: r(0.8, 1.15), lean: r(-0.15, 0.15), notch: r(0.35, 0.55) },
    { x: -0.25 + r(-0.1, 0.1), h: r(1.3, 1.65), lean: r(-0.2, 0.2), notch: 0.5 },
  ];
  g.save();
  g.globalAlpha = alpha;
  // (Off by more, the bigger the layer.)
  const J = (s) => () => jit() * s * b / (0.2 * TS);
  layer(g, x, by, b, outer, COLOURS.outer, J(1));
  layer(g, x + r(-0.04, 0.04) * b, by, b * 0.68, mid, COLOURS.mid, J(0.68));
  tongue(g, x + r(-0.05, 0.05) * b, by - b * 0.18, b * 0.62, b * r(0.75, 1), r(-0.12, 0.12) * b, jit);
  g.fillStyle = COLOURS.heart;
  g.fill();
  g.restore();
}
