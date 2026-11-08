// The lights' flames, drawn each frame over the map: in the map's inks
// (sienna, ochre and a straw heart) outlined in dark red, as set on the flame
// workbench (spec/light-set.md), or, being tried in the test room, in ink,
// filled as a lit square (STYLES; the test room's picker sets `VERSAL_FLAMES`). Redrawn eight times a second, each drawing a
// little different, as a hand-animated fire on twos. How each light's flame
// is drawn (its size, where it sits, its flicker) is the light's data
// (js/content/lights.json, `flame`).

import { RNG } from "./rules/rng.js";
import { INK } from "./maprender.js";

// A square lit by a level's light, as drawn: the paper, warmed by the light
// (js/gpu.js: the lit paper × the lights' warmth, the player's lamp out).
const LIT = "#f3d3a9";

// How each style fills the flame, its middle and its heart (null: not
// drawn; `line`: the middle drawn as an ink line, not filled), and its
// outline's colour and weight (pen widths; null: the light's `outline`).
export const STYLES = {
  // (The outline a dark red, not the map's black ink.)
  inks: { name: "In the map's inks", outer: "#a8552c", mid: "#c98d3e", heart: "#efd9a0", edge: "#6b2414", weight: null },
  paper: { name: "Ink on a lit square", outer: LIT, mid: null, heart: null, edge: INK, weight: [1.9, 1.3] },
  line: { name: "An inner line", outer: LIT, mid: null, line: true, heart: null, edge: INK, weight: [1.9, 1.3] },
  heart: { name: "A warm middle", outer: LIT, mid: "#efd9a0", heart: null, edge: INK, weight: [1.9, 1.3] },
};
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

// The flame's outline in style `C`, `F.outline` the pen's widths if the
// style sets none, or if the flame was set on the workbench (`workbench`;
// none if 0); `w` the weight to draw it at.
function edge(g, C, F, TS, small, w = C.weight && !F.workbench ? C.weight[small ? 1 : 0] : F.outline) {
  if (!w) return;
  g.lineWidth = (w * TS) / 32;
  g.strokeStyle = C.edge;
  g.lineJoin = "round";
  g.stroke();
}

// The flame's middle, its path just made: filled, or drawn as a thin line.
function middle(g, C, F, TS, small) {
  if (C.line) edge(g, C, null, TS, small, (F.workbench ? F.outline : C.weight[small ? 1 : 0]) * 0.55);
  else if (C.mid) {
    g.fillStyle = C.mid;
    g.fill();
  }
}

// A light's flame at (x, y) in pixels (the place its data gives, already
// added), `TS` a square's size, at time `t` (seconds); `seed` keeps flames
// apart; `F` the light's `flame` (lights.json). (A big flame of `shape`
// "two" is drawn as a small one, two tongues, standing where a big one
// stands.)
export function drawFlame(g, x, y, TS, t, seed, alpha, F) {
  const R = new RNG(17 + Math.floor(t * RATE) * 13 + seed * 7919), s = F.size * TS, f = F.flicker ?? 0.1;
  const C = STYLES[globalThis.VERSAL_FLAMES] ?? STYLES.inks, small = !!F.tongues;
  g.save();
  g.globalAlpha = alpha;
  if (small || F.shape === "two") {
    // (A small one's bulb on the spot: it stands a bulb below it.)
    const tips = TIPS[F.tongues ?? 2] ?? TIPS[2], by = small ? y + s : y + s * 0.9;
    squatPath(g, x, by, s, tips, R, f);
    g.fillStyle = C.outer;
    g.fill();
    edge(g, C, F, TS, small);
    squatPath(g, x, by + s * 0.05, s * 0.6, tips.map(([a, b]) => [a, b * 0.9]), R, f);
    middle(g, C, F, TS, small);
    g.beginPath();
    g.arc(x, by - s * 0.75, s * 0.32, 0, 2 * Math.PI);
  } else {
    bigPath(g, x, y + s * 0.9, s, R, f);
    g.fillStyle = C.outer;
    g.fill();
    edge(g, C, F, TS, small);
    bigPath(g, x, y + s * 0.9, s * 0.62, R, f);
    middle(g, C, F, TS, small);
    g.beginPath();
    g.arc(x, y + s * 0.35, s * 0.32, 0, 2 * Math.PI);
  }
  if (C.heart) {
    g.fillStyle = C.heart;
    g.fill();
  }
  g.restore();
}
