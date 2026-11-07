// A campfire's flame, drawn each frame over the map: a cartoon fire, a round
// bulb licking up in tongues, red, then orange, then a pale yellow heart.
// Redrawn eight times a second, each drawing a little different, as a hand-
// animated fire on twos.

import { RNG } from "./rules/rng.js";

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
// (seconds), `TS` the square's size; `seed` keeps fires apart. `size` scales
// it, and `foot` sets where it stands (squares below the middle).
export function drawFire(g, x, y, TS, t, seed = 0, alpha = 1, size = 1, foot = 0.24) {
  const rng = new RNG(17 + Math.floor(t * RATE) * 13 + seed * 7919), r = (a, b) => rng.range(a, b);
  const jit = () => r(-0.45, 0.45) * TS / 32, b = size * SIZE * 0.2 * r(0.96, 1.04) * TS, by = y + TS * foot;
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

// A candle's flame seen from above, as the map is (chosen in
// mockups/lights.html, candles A): a ragged ring of small tongues licking out
// round a pale heart, turning, outlined in ink; and a soft warm glow round it,
// breathing. (x, y) is the wick, `TS` the square's size, `t` the time in
// seconds; `seed` keeps candles apart.
const INK = "#1b1815";
export function drawCandle(g, x, y, TS, t, seed = 0, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  const f = 1 + 0.06 * Math.sin(t * 7 + seed) + 0.04 * Math.sin(t * 17 + seed * 2), R = 0.42 * TS * f;
  const grad = g.createRadialGradient(x, y, 0, x, y, R);
  grad.addColorStop(0, "rgba(255, 214, 120, 0.6)");
  grad.addColorStop(0.45, "rgba(255, 170, 70, 0.27)");
  grad.addColorStop(1, "rgba(255, 150, 60, 0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, R, 0, 2 * Math.PI);
  g.fill();
  const n = 5, r = 0.085 * TS, pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * 2 * Math.PI + t * 0.6 + seed, tip = i % 2 === 0;
    const rr = r * (tip ? 0.85 + 0.25 * Math.sin(t * (6 + (i % 3)) + i * 1.7 + seed) : 0.5);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  g.beginPath();
  const [lx, ly] = pts.at(-1);
  g.moveTo((pts[0][0] + lx) / 2, (pts[0][1] + ly) / 2);
  pts.forEach(([px, py], i) => {
    const [qx, qy] = pts[(i + 1) % pts.length];
    g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
  });
  g.closePath();
  g.fillStyle = COLOURS.mid;
  g.fill();
  g.lineWidth = (0.9 * TS) / 32;
  g.strokeStyle = INK;
  g.lineJoin = "round";
  g.stroke();
  g.beginPath();
  g.arc(x, y, r * 0.38 * (1 + 0.1 * Math.sin(t * 9 + seed)), 0, 2 * Math.PI);
  g.fillStyle = COLOURS.heart;
  g.fill();
  g.restore();
}
