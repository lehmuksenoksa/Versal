// Illuminated initials ("versals") for boss monsters, drawn procedurally:
// a gilded square, a coloured field with white filigree, a blackletter
// capital, and the creature itself winding around and through the letter.

import { RNG } from "./rng.js";
import { INK } from "./maprender.js";

export const VERSAL_STYLES = {
  dragon: { field: "#1f3d7c", letter: "#b4271c", letterLight: "#e0503a", body: "#3e7d3a", bodyDark: "#24502a", belly: "#d7bf5a", wing: "#7b2a22" },
  crown: { field: "#7d1f17", letter: "#e2b947", letterLight: "#fbe7a1", body: "#4f8a3c", bodyDark: "#2c5a24", belly: "#9fc46a", wing: "#4f8a3c" },
  vines: { field: "#22407f", letter: "#b3261e", letterLight: "#de4a36", body: "#457f39", bodyDark: "#2a5524", belly: "#9fc46a", wing: "#457f39" },
};

const GOLD_STOPS = [[0, "#f8e39a"], [0.35, "#d3a53a"], [0.6, "#94691b"], [0.85, "#e7c665"], [1, "#b8892a"]];
const frameCache = new Map();

export function drawVersal(ctx, o) {
  const s = o.size, h = s / 2, t = o.t;
  const pal = VERSAL_STYLES[o.motif] || VERSAL_STYLES.vines;
  const awake = o.awake !== false;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.flash > 0) ctx.translate(Math.sin(t * 90) * h * 0.06 * o.flash, Math.cos(t * 77) * h * 0.04 * o.flash);
  const breath = 1 + Math.sin(t * (awake ? 2.2 : 1.1)) * 0.018;
  ctx.scale(breath, breath);

  if (o.motif === "dragon") {
    drawWing(ctx, -1, h, t, pal, awake);
    drawWing(ctx, 1, h, t, pal, awake);
  }
  if (o.motif === "crown") {
    drawEar(ctx, -1, h, t, pal);
    drawEar(ctx, 1, h, t, pal);
  }

  // Soft shadow on the page beneath the square.
  ctx.save();
  ctx.fillStyle = "rgba(40, 25, 10, 0.22)";
  ctx.fillRect(-h + s * 0.04, -h + s * 0.06, s, s);
  ctx.restore();

  const scale = Math.abs(ctx.getTransform().a) || 1;
  ctx.drawImage(frameFor(o.motif, s, scale, pal), -h, -h, s, s);
  drawSheen(ctx, h, t);

  let body = null;
  if (o.motif === "dragon") {
    body = dragonBody(h, t, awake);
    drawTube(ctx, body, 0.22, 0.62, h, pal);
  }

  drawLetter(ctx, o.letter, s, pal);

  if (o.motif === "dragon") {
    drawTube(ctx, body, 0, 0.22, h, pal);
    drawTube(ctx, body, 0.62, 1, h, pal);
    drawTailTip(ctx, body, h, pal);
    drawHead(ctx, body, h, t, pal, awake, o.onFlame);
  }
  if (o.motif === "crown") drawCrown(ctx, h, t);
  if (o.motif === "vines" || o.motif === "crown") drawVines(ctx, h, t, pal, o.motif === "crown" ? 0.6 : 1);

  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255, 245, 230, ${0.55 * o.flash})`;
    ctx.fillRect(-h, -h, s, s);
  }
  if (!awake) drawSnores(ctx, h, t, o.motif === "dragon" ? body[body.length - 1] : [h * 0.6, -h * 1.1]);
  ctx.restore();
}

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of GOLD_STOPS) g.addColorStop(p, c);
  return g;
}

// The static part (gold frame, field, filigree) is cached per size.
function frameFor(motif, s, scale, pal) {
  const px = Math.max(8, Math.round(s * scale));
  const key = `${motif}|${px}`;
  if (frameCache.has(key)) return frameCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d");
  ctx.scale(px / s, px / s);
  const b = s * 0.075;
  const rng = new RNG(motif.length * 7919);

  ctx.fillStyle = goldGradient(ctx, 0, 0, s, s);
  ctx.fillRect(0, 0, s, s);
  // Punched dots in the gilding.
  ctx.fillStyle = "rgba(110, 70, 10, 0.45)";
  const dots = 14;
  for (let i = 0; i < dots; i++) {
    const p = b / 2 + (i / (dots - 1)) * (s - b);
    for (const [x, y] of [[p, b / 2], [p, s - b / 2], [b / 2, p], [s - b / 2, p]]) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.007, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = pal.field;
  ctx.fillRect(b, b, s - 2 * b, s - 2 * b);
  // Diaper pattern of tiny quatrefoils.
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  const step = s / 9;
  for (let y = b + step / 2; y < s - b; y += step)
    for (let x = b + step / 2; x < s - b; x += step)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s * 0.009, y + dy * s * 0.009, s * 0.006, 0, Math.PI * 2);
        ctx.fill();
      }
  // White pen filigree curling from each corner.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = Math.max(0.6, s * 0.007);
  ctx.lineCap = "round";
  for (const [cx, cy, dir] of [[b, b, 0], [s - b, b, 1], [s - b, s - b, 2], [b, s - b, 3]]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((dir * Math.PI) / 2);
    ctx.beginPath();
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 3.2;
      const r = s * (0.2 - (k / 60) * 0.17);
      const x = s * 0.2 + Math.cos(a + Math.PI) * r * 0.9, y = s * 0.2 + Math.sin(a + Math.PI) * r * 0.9;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = rng.range(0, Math.PI / 2), r = s * rng.range(0.09, 0.2);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s * 0.012, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = Math.max(0.5, s * 0.005);
  ctx.strokeRect(b + s * 0.02, b + s * 0.02, s - 2 * b - s * 0.04, s - 2 * b - s * 0.04);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, s * 0.012);
  ctx.strokeRect(b, b, s - 2 * b, s - 2 * b);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth);
  frameCache.set(key, c);
  return c;
}

function drawSheen(ctx, h, t) {
  const b = h * 0.15;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-h, -h, h * 2, h * 2);
  ctx.rect(-h + b, -h + b, h * 2 - 2 * b, h * 2 - 2 * b);
  ctx.clip("evenodd");
  const p = ((t * 0.35) % 1.6) - 0.3;
  const x = -h + p * h * 4;
  const g = ctx.createLinearGradient(x - h * 0.5, -h, x + h * 0.5, h);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,250,225,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-h, -h, h * 2, h * 2);
  ctx.restore();
}

function drawLetter(ctx, letter, s, pal) {
  ctx.save();
  ctx.font = `700 ${s * 0.8}px UnifrakturCook, UnifrakturMaguntia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(letter);
  const asc = m.actualBoundingBoxAscent || s * 0.55, desc = m.actualBoundingBoxDescent || 0;
  const by = (asc - desc) / 2;
  const g = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.35);
  g.addColorStop(0, pal.letterLight);
  g.addColorStop(1, pal.letter);
  ctx.lineJoin = "round";
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = goldGradient(ctx, -s / 2, -s / 2, s / 2, s / 2);
  ctx.strokeText(letter, 0, by);
  ctx.lineWidth = s * 0.016;
  ctx.strokeStyle = INK;
  ctx.strokeText(letter, 0, by);
  ctx.fillStyle = g;
  ctx.fillText(letter, 0, by);
  // A thin white highlight down the strokes, offset up-left.
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = s * 0.005;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(letter, -s * 0.006, by - s * 0.006);
  ctx.restore();
}

// ---------- dragon -------------------------------------------------------

function catmull(points, samples) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < samples; k++) {
      const t = k / samples, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) =>
        0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)
      ));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function dragonBody(h, t, awake) {
  const k = awake ? 1 : 0.35;
  const pts = [
    [-1.28, 1.08], [-0.78, 0.84], [-0.22, 0.95], [0.38, 0.66], [0.12, 0.18],
    [-0.28, -0.12], [0.22, -0.46], [0.74, -0.7], [0.98, -1.06],
  ].map(([x, y], i) => [
    (x + Math.sin(t * 1.6 + i * 1.3) * 0.035 * k) * h,
    (y + Math.cos(t * 1.3 + i * 0.9) * 0.035 * k) * h,
  ]);
  return catmull(pts, 10);
}

function bodyWidth(f, h) {
  // Thin tail, thick belly, medium neck.
  return h * (0.035 + 0.11 * Math.sin(Math.min(1, f * 1.15) * Math.PI * 0.92) + (f > 0.8 ? 0.02 : 0));
}

function drawTube(ctx, pts, f0, f1, h, pal) {
  const n = pts.length - 1;
  const a = Math.floor(f0 * n), b = Math.ceil(f1 * n);
  ctx.save();
  ctx.lineCap = "round";
  for (const pass of [0, 1, 2]) {
    for (let i = a; i < b; i++) {
      const f = i / n, w = bodyWidth(f, h);
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      if (pass === 0) { ctx.strokeStyle = INK; ctx.lineWidth = w * 2 + h * 0.035; }
      if (pass === 1) { ctx.strokeStyle = pal.body; ctx.lineWidth = w * 2; }
      if (pass === 2) { ctx.strokeStyle = pal.belly; ctx.lineWidth = w * 0.55; ctx.globalAlpha = 0.8; }
      ctx.stroke();
    }
  }
  // Scale marks and back spines.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.bodyDark;
  ctx.fillStyle = pal.bodyDark;
  ctx.lineWidth = Math.max(0.5, h * 0.014);
  for (let i = a + 1; i < b; i += 2) {
    const f = i / n, w = bodyWidth(f, h);
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i + 1] || pts[i];
    const ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.save();
    ctx.translate(pts[i][0], pts[i][1]);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.arc(-w * 0.4, 0, w * 0.9, -0.9, 0.9);
    ctx.stroke();
    if (i % 4 === 1 && f > 0.15) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -w * 0.95);
      ctx.lineTo(0, -w * 1.75);
      ctx.lineTo(w * 0.4, -w * 0.95);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawTailTip(ctx, pts, h, pal) {
  const [x0, y0] = pts[0], [x1, y1] = pts[2];
  const ang = Math.atan2(y0 - y1, x0 - x1);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(h * 0.04, -h * 0.13, h * 0.2, 0);
  ctx.quadraticCurveTo(h * 0.04, h * 0.13, 0, 0);
  ctx.fillStyle = pal.letter;
  ctx.fill();
  ctx.lineWidth = h * 0.02;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawHead(ctx, pts, h, t, pal, awake, onFlame) {
  const [x, y] = pts[pts.length - 1], [px, py] = pts[pts.length - 4];
  const ang = Math.atan2(y - py, x - px) + Math.sin(t * 1.1) * 0.15;
  const open = awake ? Math.pow(Math.max(0, Math.sin(t * 0.9)), 6) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const u = h;
  ctx.lineWidth = u * 0.02;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  // Horns.
  ctx.beginPath();
  ctx.moveTo(u * 0.02, -u * 0.08);
  ctx.quadraticCurveTo(-u * 0.12, -u * 0.2, -u * 0.26, -u * 0.22);
  ctx.moveTo(u * 0.08, -u * 0.09);
  ctx.quadraticCurveTo(-u * 0.02, -u * 0.25, -u * 0.12, -u * 0.32);
  ctx.lineWidth = u * 0.035;
  ctx.stroke();
  // Lower jaw, hinged at the back of the head.
  ctx.save();
  ctx.translate(u * 0.02, u * 0.04);
  ctx.rotate(open * 0.55);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(u * 0.34, u * 0.02);
  ctx.lineTo(u * 0.3, u * 0.07);
  ctx.lineTo(0, u * 0.08);
  ctx.closePath();
  ctx.fillStyle = pal.bodyDark;
  ctx.fill();
  ctx.lineWidth = u * 0.018;
  ctx.stroke();
  ctx.restore();
  // Upper head and snout.
  ctx.beginPath();
  ctx.moveTo(-u * 0.06, -u * 0.1);
  ctx.quadraticCurveTo(u * 0.12, -u * 0.16, u * 0.26, -u * 0.07);
  ctx.lineTo(u * 0.42, -u * 0.03);
  ctx.lineTo(u * 0.4, u * 0.03);
  ctx.lineTo(u * 0.02, u * 0.05);
  ctx.quadraticCurveTo(-u * 0.1, u * 0.02, -u * 0.06, -u * 0.1);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = u * 0.02;
  ctx.stroke();
  // Teeth.
  ctx.fillStyle = "#fff";
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    const tx = u * (0.2 + k * 0.07);
    ctx.moveTo(tx, u * 0.035);
    ctx.lineTo(tx + u * 0.02, u * 0.075);
    ctx.lineTo(tx + u * 0.04, u * 0.035);
    ctx.fill();
  }
  // Eye: a glowing slit when awake, a closed lid when asleep.
  if (awake) {
    const glow = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(255, ${170 + glow * 60}, 40, 1)`;
    ctx.beginPath();
    ctx.ellipse(u * 0.12, -u * 0.07, u * 0.045, u * 0.028, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = u * 0.012;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(u * 0.115, -u * 0.095, u * 0.012, u * 0.05);
  } else {
    ctx.beginPath();
    ctx.moveTo(u * 0.08, -u * 0.07);
    ctx.quadraticCurveTo(u * 0.12, -u * 0.04, u * 0.16, -u * 0.07);
    ctx.stroke();
  }
  // Nostril smoke or a tongue of flame when the jaw gapes.
  if (open > 0.05) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, open * 1.4);
    for (let k = 0; k < 5; k++) {
      const len = u * (0.28 + 0.24 * open) * (1 - k * 0.12);
      const wob = Math.sin(t * 18 + k * 2) * u * 0.03;
      ctx.beginPath();
      ctx.moveTo(u * 0.36, u * 0.04);
      ctx.quadraticCurveTo(u * 0.36 + len * 0.5, u * 0.04 - u * 0.09 + wob, u * 0.36 + len, u * 0.04 + wob + (k - 2) * u * 0.035);
      ctx.quadraticCurveTo(u * 0.36 + len * 0.5, u * 0.04 + u * 0.09 + wob, u * 0.36, u * 0.06);
      ctx.fillStyle = ["#c0281b", "#e2561f", "#f08a24", "#f6b73c", "#fbe39a"][k];
      ctx.fill();
    }
    ctx.restore();
    if (onFlame && open > 0.6) onFlame(x + Math.cos(ang) * u * 0.6, y + Math.sin(ang) * u * 0.6);
  }
  ctx.restore();
}

function drawWing(ctx, side, h, t, pal, awake) {
  const flap = awake ? Math.sin(t * 2.6) * 0.32 : Math.sin(t * 0.8) * 0.05 - 0.25;
  ctx.save();
  ctx.translate(side * h * 0.55, -h * 0.72);
  ctx.rotate(side * (-0.3 + flap));
  ctx.scale(side, 1);
  const tips = [[1.05, -1.0], [1.42, -0.45], [1.3, 0.1], [0.92, 0.42]].map(([a, b]) => [a * h, b * h]);
  const elbow = [0.5 * h, -0.72 * h];
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(elbow[0], elbow[1]);
  ctx.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) {
    const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
    ctx.quadraticCurveTo((ax + bx) / 2 - h * 0.18, (ay + by) / 2 - h * 0.02, bx, by);
  }
  ctx.quadraticCurveTo(h * 0.45, h * 0.15, h * 0.1, h * 0.25);
  ctx.closePath();
  ctx.fillStyle = pal.wing;
  ctx.fill();
  ctx.lineWidth = h * 0.025;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  for (const [tx, ty] of tips) { ctx.moveTo(elbow[0], elbow[1]); ctx.lineTo(tx, ty); }
  ctx.lineWidth = h * 0.02;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.stroke();
  ctx.restore();
}

// ---------- goblin king and title flourishes ----------------------------

function drawEar(ctx, side, h, t, pal) {
  ctx.save();
  ctx.translate(side * h * 0.92, -h * 0.35);
  ctx.rotate(side * (0.15 + Math.sin(t * 4.2 + side) * 0.12));
  ctx.scale(side, 1);
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.18);
  ctx.quadraticCurveTo(h * 0.35, -h * 0.25, h * 0.62, -h * 0.42);
  ctx.quadraticCurveTo(h * 0.38, -h * 0.02, 0, h * 0.14);
  ctx.closePath();
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = h * 0.025;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(h * 0.06, -h * 0.06);
  ctx.quadraticCurveTo(h * 0.3, -h * 0.16, h * 0.48, -h * 0.34);
  ctx.lineWidth = h * 0.015;
  ctx.stroke();
  ctx.restore();
}

function drawCrown(ctx, h, t) {
  ctx.save();
  ctx.translate(0, -h * 1.02 + Math.sin(t * 3) * h * 0.03);
  ctx.rotate(Math.sin(t * 1.7) * 0.07);
  const w = h * 0.62;
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.12);
  ctx.lineTo(-w, -h * 0.12);
  const pts = 5;
  for (let i = 0; i < pts; i++) {
    const x0 = -w + (i / pts) * 2 * w, x1 = -w + ((i + 0.5) / pts) * 2 * w, x2 = -w + ((i + 1) / pts) * 2 * w;
    ctx.lineTo(x0, -h * 0.12);
    ctx.lineTo(x1, -h * (i % 2 ? 0.34 : 0.44));
    ctx.lineTo(x2, -h * 0.12);
  }
  ctx.lineTo(w, h * 0.12);
  ctx.closePath();
  ctx.fillStyle = goldGradient(ctx, -w, -h * 0.4, w, h * 0.1);
  ctx.fill();
  ctx.lineWidth = h * 0.025;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-w * 0.6 + i * w * 0.6, 0, h * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? "#2c4fa0" : "#b4271c";
    ctx.fill();
    ctx.lineWidth = h * 0.015;
    ctx.stroke();
  }
  for (let i = 0; i <= pts; i++) {
    ctx.beginPath();
    ctx.arc(-w + ((i + 0.5) / pts) * 2 * w, -h * (i % 2 ? 0.36 : 0.46), h * 0.03, 0, Math.PI * 2);
    if (i < pts) { ctx.fillStyle = "#fff6d0"; ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
}

function drawVines(ctx, h, t, pal, amount) {
  ctx.save();
  ctx.lineCap = "round";
  for (const [ox, oy, dir] of [[-1, 1, 0], [1, -1, 2]]) {
    ctx.save();
    ctx.translate(ox * h, oy * h);
    ctx.rotate((dir * Math.PI) / 2);
    const sway = Math.sin(t * 1.4 + dir) * 0.06;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const f = k / 24;
      const a = f * Math.PI * 1.6 * amount + sway * f * 4;
      const r = h * (0.25 + f * 0.45) * amount;
      pts.push([-Math.sin(a) * r * 0.9 - h * 0.05, Math.cos(a) * r * 0.5 - r * 0.5 + h * 0.08]);
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = h * 0.06;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = h * 0.035;
    ctx.strokeStyle = pal.body;
    ctx.stroke();
    for (let k = 4; k < pts.length; k += 5) {
      const [x, y] = pts[k];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * 0.9 + sway * 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(h * 0.1, -h * 0.1, h * 0.22, 0);
      ctx.quadraticCurveTo(h * 0.1, h * 0.1, 0, 0);
      ctx.fillStyle = pal.belly;
      ctx.fill();
      ctx.lineWidth = h * 0.018;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    }
    // A bud at the end of each vine.
    const [ex, ey] = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(ex, ey, h * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = pal.letter;
    ctx.fill();
    ctx.lineWidth = h * 0.02;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawSnores(ctx, h, t, [x, y]) {
  ctx.save();
  ctx.font = `${h * 0.32}px UnifrakturMaguntia, serif`;
  ctx.textAlign = "center";
  for (let k = 0; k < 3; k++) {
    const f = (t * 0.4 + k / 3) % 1;
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.85;
    ctx.fillStyle = INK;
    ctx.fillText("z", x + h * 0.2 + f * h * 0.5 + Math.sin(f * 9) * h * 0.06, y - h * 0.1 - f * h * 0.7);
  }
  ctx.restore();
}
