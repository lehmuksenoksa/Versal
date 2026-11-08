// The lights' flames, drawn each frame over the map, in the map's inks
// (sienna, ochre and a straw heart), outlined in dark red: as set on the
// flame workbench (spec/light-set.md). Redrawn eight times a second, each drawing a
// little different, as a hand-animated fire on twos. How each light's flame
// is drawn (its size, where it sits, its flicker) is the light's data
// (js/content/lights.json, `flame`).

import { RNG } from "./rules/rng.js";

// (The outline a dark red, not the map's black ink.)
const COLOURS = { outer: "#a8552c", mid: "#c98d3e", heart: "#efd9a0", edge: "#6b2414" };
const RATE = 8;

// The big flame (campfires, braziers): a round bulb and three tongues, the
// middle one tallest, standing on (cx, by); `s` the bulb's radius, `R` the
// frame's dice, `f` how far it wavers.
function bigPath(g, cx, by, s, R, f) {
  const j = () => R.range(-1, 1) * f * s, cy = by - s;
  g.beginPath();
  g.moveTo(cx + s, cy);
  g.bezierCurveTo(cx + s * 1.05, cy - s * 0.6, cx + s * 0.7 + j(), cy - s * 1.0 + j(), cx + s * 0.55 + j(), cy - s * 1.35 + j());
  g.bezierCurveTo(cx + s * 0.4, cy - s * 0.95, cx + s * 0.25, cy - s * 0.9, cx + s * 0.15 + j(), cy - s * 1.0);
  g.bezierCurveTo(cx + s * 0.25 + j(), cy - s * 1.6, cx + j(), cy - s * 2.0 + j(), cx - s * 0.05 + j() * 1.5, cy - s * 2.3 + j() * 1.5);
  g.bezierCurveTo(cx - s * 0.3, cy - s * 1.7, cx - s * 0.4, cy - s * 1.2, cx - s * 0.45 + j(), cy - s * 0.95);
  g.bezierCurveTo(cx - s * 0.55, cy - s * 1.05, cx - s * 0.7 + j(), cy - s * 1.15, cx - s * 0.8 + j(), cy - s * 1.25 + j());
  g.bezierCurveTo(cx - s * 1.0, cy - s * 0.8, cx - s * 1.05, cy - s * 0.35, cx - s, cy);
  g.arc(cx, cy, s, Math.PI, 0, true);
  g.closePath();
}

// A small flame (torches, candles): squat, a round bulb and two or three
// short tongues (`tips`, [x, height] in bulbs), standing on (x, y).
const TIPS = { 2: [[0.45, 1.05], [-0.35, 1.45]], 3: [[0.6, 0.95], [0, 1.45], [-0.6, 1.05]] };
function squatPath(g, x, y, s, tips, R, f) {
  const cy = y - s;
  g.beginPath();
  g.moveTo(x + s, cy);
  let px = x + s, py = cy;
  tips.forEach(([tx, th], i) => {
    const X = x + (tx + R.range(-1, 1) * f) * s, Y = cy - (th + R.range(-1, 1) * f * 2) * s;
    g.quadraticCurveTo((px + X) / 2 + s * 0.25, (py + Y) / 2, X, Y);
    const n = tips[i + 1];
    if (n) {
      const nx = x + ((tx + n[0]) / 2) * s, ny = cy - Math.min(th, n[1]) * s * 0.45;
      g.quadraticCurveTo((X + nx) / 2 + s * 0.05, (Y + ny) / 2, nx, ny);
      px = nx;
      py = ny;
    } else {
      px = X;
      py = Y;
    }
  });
  g.quadraticCurveTo(x - s * 1.05, cy - s * 0.45, x - s, cy);
  g.arc(x, cy, s, Math.PI, 0, true);
  g.closePath();
}

// The flame's outline, `F.outline` the pen's widths (none if 0).
function edge(g, F, TS) {
  if (!F.outline) return;
  g.lineWidth = (F.outline * TS) / 32;
  g.strokeStyle = COLOURS.edge;
  g.lineJoin = "round";
  g.stroke();
}

// A light's flame at (x, y) in pixels (the place its data gives, already
// added), `TS` a square's size, at time `t` (seconds); `seed` keeps flames
// apart; `F` the light's `flame` (lights.json).
export function drawFlame(g, x, y, TS, t, seed, alpha, F) {
  const R = new RNG(17 + Math.floor(t * RATE) * 13 + seed * 7919), s = F.size * TS, f = F.flicker ?? 0.1;
  g.save();
  g.globalAlpha = alpha;
  if (F.tongues) {
    // (Its bulb on the spot: it stands a bulb below it.)
    const tips = TIPS[F.tongues] ?? TIPS[2], by = y + s;
    squatPath(g, x, by, s, tips, R, f);
    g.fillStyle = COLOURS.outer;
    g.fill();
    edge(g, F, TS);
    squatPath(g, x, by + s * 0.05, s * 0.6, tips.map(([a, b]) => [a, b * 0.9]), R, f);
    g.fillStyle = COLOURS.mid;
    g.fill();
    g.beginPath();
    g.arc(x, by - s * 0.75, s * 0.32, 0, 2 * Math.PI);
  } else {
    bigPath(g, x, y + s * 0.9, s, R, f);
    g.fillStyle = COLOURS.outer;
    g.fill();
    edge(g, F, TS);
    bigPath(g, x, y + s * 0.9, s * 0.62, R, f);
    g.fillStyle = COLOURS.mid;
    g.fill();
    g.beginPath();
    g.arc(x, y + s * 0.35, s * 0.32, 0, 2 * Math.PI);
  }
  g.fillStyle = COLOURS.heart;
  g.fill();
  g.restore();
}
