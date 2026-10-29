// Renders a level once, offscreen, in the manner of a hand-inked dungeon map:
// heavy wall lines, clustered stone hatching outside the walls, a faint grid
// on the floor, and furniture drawn in pen.

import { T, isOpen } from "./dungeon.js";
import { RNG } from "./rng.js";

export const INK = "#1b1815";
export const PAPER = "#f7f2e6";
const GRID = "rgba(96, 122, 140, 0.32)";

export function renderMap(level, TS, scale, seed) {
  const { w: W, h: H } = level;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(W * TS * scale);
  canvas.height = Math.ceil(H * TS * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const rng = new RNG(seed);
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && isOpen(level.tiles[y * W + x]);

  drawPaper(ctx, W * TS, H * TS, rng);
  drawHatching(ctx, level, TS, rng, open);
  // Floors are painted over the hatching, which leaves it cut cleanly at the walls.
  ctx.fillStyle = PAPER;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (open(x, y)) ctx.fillRect(x * TS - 0.5, y * TS - 0.5, TS + 1, TS + 1);
  drawGrid(ctx, W, H, TS, rng, open);
  drawCracks(ctx, level, TS, rng, open);
  drawFurniture(ctx, level, TS, rng);
  drawWalls(ctx, W, H, TS, rng, open);
  drawRoomKeys(ctx, level, TS);

  return { canvas, ctx };
}

// A pen line with a little hand tremor. Endpoints stay exact so corners meet.
export function penLine(ctx, x1, y1, x2, y2, rng, amp = 0.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const n = Math.max(2, Math.round(len / 6));
  const p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28);
  const f1 = rng.range(0.03, 0.07), f2 = rng.range(0.12, 0.2);
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= n; i++) {
    const t = i / n, d = t * len;
    const env = Math.min(1, d / 5, (len - d) / 5);
    const off = amp * env * (0.65 * Math.sin(d * f1 + p1) + 0.35 * Math.sin(d * f2 + p2));
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
}

function penCircle(ctx, cx, cy, r, rng, amp = 0.4) {
  const n = Math.max(12, Math.round(r * 1.5));
  const p = rng.range(0, 6.28);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + amp * Math.sin(a * 3 + p) * (i === n ? 0 : 1);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function drawPaper(ctx, w, h, rng) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // Faint foxing and fibres so the page doesn't read as flat digital white.
  for (let i = 0; i < 14; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), r = rng.range(60, 220);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(150, 110, 60, 0.05)");
    g.addColorStop(1, "rgba(150, 110, 60, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fillStyle = "rgba(80, 60, 30, 0.07)";
  for (let i = 0; i < (w * h) / 220; i++) ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(0.6, 1.4), rng.range(0.6, 1.4));
}

function drawHatching(ctx, level, TS, rng, open) {
  const { w: W, h: H } = level;
  // Chebyshev distance (in tiles) from each rock tile to the nearest open tile.
  const near = new Uint8Array(W * H).fill(9);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (open(x, y)) { near[y * W + x] = 0; continue; }
      for (let r = 1; r <= 2 && near[y * W + x] === 9; r++)
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) if (open(x + dx, y + dy)) near[y * W + x] = Math.min(near[y * W + x], r);
    }
  const distToOpen = (px, py) => {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    let best = Infinity;
    for (let y = ty - 2; y <= ty + 2; y++)
      for (let x = tx - 2; x <= tx + 2; x++) {
        if (!open(x, y)) continue;
        const cx = Math.max(x * TS, Math.min(px, (x + 1) * TS));
        const cy = Math.max(y * TS, Math.min(py, (y + 1) * TS));
        best = Math.min(best, Math.hypot(px - cx, py - cy));
      }
    return best;
  };

  const step = TS * 0.46, reach = TS * 1.2;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  for (let gy = 0; gy < H * TS; gy += step)
    for (let gx = 0; gx < W * TS; gx += step) {
      const px = gx + rng.range(0, step), py = gy + rng.range(0, step);
      const t = near[Math.floor(py / TS) * W + Math.floor(px / TS)];
      if (t === 0 || t > 2) continue;
      const d = distToOpen(px, py);
      if (d > reach) continue;
      const keep = d < TS * 0.55 ? 1 : 1 - (d - TS * 0.55) / (reach - TS * 0.55);
      if (rng.next() > keep) continue;
      // One cluster: three to five short parallel strokes at a random angle.
      const a = rng.range(0, Math.PI);
      const n = rng.int(3, 5);
      const len = TS * rng.range(0.34, 0.52);
      const gap = TS * rng.range(0.085, 0.11);
      const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      ctx.lineWidth = rng.range(0.7, 1.05);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * gap;
        const l = len * rng.range(0.8, 1.05) * (1 - Math.abs(i - (n - 1) / 2) * 0.12);
        const cx = px + vx * o, cy = py + vy * o;
        ctx.moveTo(cx - ux * l / 2, cy - uy * l / 2);
        ctx.lineTo(cx + ux * l / 2 + rng.range(-0.6, 0.6), cy + uy * l / 2 + rng.range(-0.6, 0.6));
      }
      ctx.stroke();
    }
}

function drawGrid(ctx, W, H, TS, rng, open) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let x = 1; x < W; x++) {
    let run = -1;
    for (let y = 0; y <= H; y++) {
      const on = y < H && open(x - 1, y) && open(x, y);
      if (on && run < 0) run = y;
      if (!on && run >= 0) { penLine(ctx, x * TS, run * TS, x * TS, y * TS, rng, 0.3); run = -1; }
    }
  }
  for (let y = 1; y < H; y++) {
    let run = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && open(x, y - 1) && open(x, y);
      if (on && run < 0) run = x;
      if (!on && run >= 0) { penLine(ctx, run * TS, y * TS, x * TS, y * TS, rng, 0.3); run = -1; }
    }
  }
  ctx.stroke();
}

function drawWalls(ctx, W, H, TS, rng, open) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2.2, TS * 0.095);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let y = 0; y <= H; y++) {
    let run = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && open(x, y - 1) !== open(x, y);
      if (on && run < 0) run = x;
      if (!on && run >= 0) { penLine(ctx, run * TS, y * TS, x * TS, y * TS, rng, 0.55); run = -1; }
    }
  }
  for (let x = 0; x <= W; x++) {
    let run = -1;
    for (let y = 0; y <= H; y++) {
      const on = y < H && open(x - 1, y) !== open(x, y);
      if (on && run < 0) run = y;
      if (!on && run >= 0) { penLine(ctx, x * TS, run * TS, x * TS, y * TS, rng, 0.55); run = -1; }
    }
  }
  ctx.stroke();
}

function drawCracks(ctx, level, TS, rng, open) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      if (level.tiles[y * level.w + x] !== T.FLOOR || !open(x, y) || !rng.chance(0.025)) continue;
      ctx.beginPath();
      let px = (x + rng.range(0.1, 0.4)) * TS, py = (y + rng.range(0.2, 0.8)) * TS;
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        px += TS * rng.range(0.1, 0.2);
        py += TS * rng.range(-0.15, 0.15);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
}

function drawFurniture(ctx, level, TS, rng) {
  const { w: W, tiles } = level;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < tiles.length; i++) {
    const x = (i % W) * TS, y = Math.floor(i / W) * TS, cx = x + TS / 2, cy = y + TS / 2;
    switch (tiles[i]) {
      case T.PILLAR: {
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.3, rng, 0.5);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.38, rng, 0.4);
        ctx.stroke();
        break;
      }
      case T.WELL: {
        ctx.lineWidth = 2;
        ctx.fillStyle = PAPER;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.42, rng, 0.5);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        penCircle(ctx, cx, cy, TS * 0.28, rng, 0.3);
        ctx.stroke();
        // Water: a few short ripple lines inside the inner ring.
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let k = -1; k <= 1; k++) {
          const yy = cy + k * TS * 0.09;
          for (let s = 0; s <= 8; s++) {
            const xx = cx - TS * 0.16 + (s / 8) * TS * 0.32;
            const w = yy + Math.sin(s * 1.4 + k) * 1.1;
            s ? ctx.lineTo(xx, w) : ctx.moveTo(xx, w);
          }
        }
        ctx.stroke();
        ctx.fillStyle = INK;
        break;
      }
      case T.STAIRS_DOWN:
      case T.STAIRS_UP: {
        const down = tiles[i] === T.STAIRS_DOWN;
        ctx.lineWidth = 1.1;
        const steps = 6;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const half = TS * (down ? 0.42 - t * 0.17 : 0.27 + t * 0.15);
          const yy = y + TS * 0.08 + t * TS * 0.84;
          penLine(ctx, cx - half, yy, cx + half, yy, rng, 0.25);
        }
        // Side stringers.
        const h0 = TS * (down ? 0.42 : 0.27), h1 = TS * (down ? 0.25 : 0.42);
        penLine(ctx, cx - h0, y + TS * 0.08, cx - h1, y + TS * 0.92, rng, 0.25);
        penLine(ctx, cx + h0, y + TS * 0.08, cx + h1, y + TS * 0.92, rng, 0.25);
        ctx.stroke();
        if (down) {
          // The deep end in shadow.
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.moveTo(cx - TS * 0.3, y + TS * 0.64);
          ctx.lineTo(cx + TS * 0.3, y + TS * 0.64);
          ctx.lineTo(cx + h1, y + TS * 0.92);
          ctx.lineTo(cx - h1, y + TS * 0.92);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
    }
  }
  for (const d of level.decor) {
    const r = new RNG(Math.floor(d.seed * 1e9));
    const x = d.x * TS, y = d.y * TS;
    if (d.type === "rubble") drawRubble(ctx, x, y, TS, r, d.small);
    if (d.type === "coffin") drawCoffin(ctx, x + TS / 2, y + TS / 2, TS, d.vertical, r);
  }
}

function drawRubble(ctx, x, y, TS, rng, small) {
  const n = small ? rng.int(2, 4) : rng.int(5, 9);
  const ox = rng.range(0.25, 0.75) * TS, oy = rng.range(0.25, 0.75) * TS;
  ctx.lineWidth = 0.9;
  for (let k = 0; k < n; k++) {
    const sx = x + ox + rng.range(-0.28, 0.28) * TS, sy = y + oy + rng.range(-0.28, 0.28) * TS;
    const r = TS * rng.range(0.035, small ? 0.07 : 0.1);
    const sides = rng.int(4, 6);
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const rr = r * rng.range(0.7, 1.2);
      s ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    }
    ctx.closePath();
    if (rng.chance(0.35)) ctx.fill();
    else { ctx.fillStyle = PAPER; ctx.fill(); ctx.fillStyle = INK; ctx.stroke(); }
  }
}

function drawCoffin(ctx, cx, cy, TS, vertical, rng) {
  ctx.save();
  ctx.translate(cx, cy);
  if (!vertical) ctx.rotate(Math.PI / 2);
  const L = TS * 0.44, Wd = TS * 0.2;
  ctx.beginPath();
  ctx.moveTo(-Wd * 0.6, -L);
  ctx.lineTo(Wd * 0.6, -L);
  ctx.lineTo(Wd, -L * 0.45);
  ctx.lineTo(Wd * 0.7, L);
  ctx.lineTo(-Wd * 0.7, L);
  ctx.lineTo(-Wd, -L * 0.45);
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  penLine(ctx, 0, -L * 0.75, 0, -L * 0.15, rng, 0.2);
  penLine(ctx, -Wd * 0.35, -L * 0.55, Wd * 0.35, -L * 0.55, rng, 0.2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = INK;
}

function drawRoomKeys(ctx, level, TS) {
  // Small pencilled room numbers, as on a keyed adventure map.
  ctx.fillStyle = "rgba(60, 55, 50, 0.55)";
  ctx.font = `italic ${Math.round(TS * 0.36)}px "IM Fell English", Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const sorted = [...level.rooms].sort((a, b) => a.y - b.y || a.x - b.x);
  sorted.forEach((r, i) => {
    if (level.tiles[r.y * level.w + r.x] !== T.FLOOR) return;
    ctx.fillText(String(i + 1), r.x * TS + TS * 0.14, r.y * TS + TS * 0.1);
  });
}

// An ink blot, added to the map after a death so the page records the fight.
export function inkBlot(ctx, cx, cy, TS, rng, color = "rgba(92, 24, 16, 0.55)") {
  ctx.save();
  ctx.fillStyle = color;
  const r = TS * rng.range(0.16, 0.24);
  ctx.beginPath();
  penCircle(ctx, cx, cy, r, rng, r * 0.2);
  ctx.fill();
  for (let k = rng.int(4, 8); k > 0; k--) {
    const a = rng.range(0, Math.PI * 2), d = r * rng.range(1.1, 2.1), s = TS * rng.range(0.02, 0.06);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
