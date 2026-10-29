// Per-frame drawing: the pre-inked map, doors, and the animated blackletter
// glyphs for the player and the goblins.

import { renderMap, INK, PAPER } from "./maprender.js";

const GLYPH_FONT = "UnifrakturMaguntia, serif";
const DESK = "#2b221c";
const PLAYER_INK = "#1c3a72";

// Idle motion. Offsets are in tiles; t in seconds.
const POSES = {
  // Goblins hop, squashing as they land and stretching as they rise.
  hop(t, ph) {
    const h = Math.abs(Math.sin(t * 3 + ph));
    const land = Math.pow(1 - h, 6);
    return { oy: -h * 0.2, sx: 1 + 0.16 * land - 0.04 * h, sy: 1 - 0.2 * land + 0.08 * h, shadow: h };
  },
  breathe(t) {
    return { sy: 1 + Math.sin(t * 2.2) * 0.035, sx: 1 - Math.sin(t * 2.2) * 0.015 };
  },
};

// Goblins also dart about inside their tile, so a pack looks like it is milling.
// [range in tiles, min and max seconds between darts]
const DART = [0.22, 0.6, 1.3];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.views = new Map();
    this.doorAnims = new Map();
    this.cam = { x: 0, y: 0, snap: true };
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.glyphMetrics = new Map();
    this.resize();
  }

  setWorld(world) {
    this.world = world;
    this.buildMap();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.vw = Math.max(1, r.width);
    this.vh = Math.max(1, r.height);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
    const ts = this.vw < 560 ? 28 : this.vw < 1000 ? 34 : 40;
    if (ts !== this.TS) {
      this.TS = ts;
      this.glyphMetrics.clear();
      if (this.world) this.buildMap();
    }
  }

  buildMap() {
    this.map = renderMap(this.world.level, this.TS, this.dpr, this.world.seed).canvas;
  }

  view(a) {
    let v = this.views.get(a.id);
    if (!v) {
      v = { x: a.x, y: a.y, fx: a.x, fy: a.y, t0: 0, dur: 1, phase: Math.random() * 6.28, dart: { ox: 0, oy: 0, tx: 0, ty: 0, next: 0 } };
      this.views.set(a.id, v);
    }
    return v;
  }

  consume(now) {
    for (const e of this.world.events.splice(0)) {
      if (e.type === "move") {
        // Start the tween from wherever the glyph is drawn right now.
        const v = this.view(e.actor);
        const k = ease(clamp01((now - v.t0) / v.dur));
        v.fx += (v.x - v.fx) * k;
        v.fy += (v.y - v.fy) * k;
        v.x = e.actor.x;
        v.y = e.actor.y;
        v.t0 = now;
        v.dur = e.actor === this.world.player ? 120 : 150;
      }
      if (e.type === "door") this.doorAnims.set(e.door, now);
    }
  }

  screenToTile(px, py) {
    return { x: Math.floor((px + this.cam.x) / this.TS), y: Math.floor((py + this.cam.y) / this.TS) };
  }

  frame(now) {
    const w = this.world;
    if (!w) return;
    this.consume(now);
    const ctx = this.ctx, TS = this.TS, L = w.level, t = now / 1000;
    const dt = Math.min(0.1, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    const motion = this.reduced ? 0.35 : 1;

    // Camera follows the player's drawn position.
    const pv = this.view(w.player);
    const pk = ease(clamp01((now - pv.t0) / pv.dur));
    const px = (pv.fx + (pv.x - pv.fx) * pk + 0.5) * TS, py = (pv.fy + (pv.y - pv.fy) * pk + 0.5) * TS;
    const mw = L.w * TS, mh = L.h * TS;
    const fit = (target, view, size) => (size + 64 < view ? (size - view) / 2 : Math.max(-32, Math.min(size - view + 32, target)));
    const tx = fit(px - this.vw / 2, this.vw, mw), ty = fit(py - this.vh / 2, this.vh, mh);
    if (this.cam.snap) { this.cam.x = tx; this.cam.y = ty; this.cam.snap = false; }
    const f = 1 - Math.exp(-dt * 7);
    this.cam.x += (tx - this.cam.x) * f;
    this.cam.y += (ty - this.cam.y) * f;
    const cx = Math.round(this.cam.x * this.dpr) / this.dpr, cy = Math.round(this.cam.y * this.dpr) / this.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = DESK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, -cx * this.dpr, -cy * this.dpr);

    // The page, casting a soft shadow onto the desk.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, mw, mh);
    ctx.restore();
    const sx0 = Math.max(0, cx), sy0 = Math.max(0, cy);
    const sx1 = Math.min(mw, cx + this.vw), sy1 = Math.min(mh, cy + this.vh);
    if (sx1 > sx0 && sy1 > sy0)
      ctx.drawImage(this.map, sx0 * this.dpr, sy0 * this.dpr, (sx1 - sx0) * this.dpr, (sy1 - sy0) * this.dpr, sx0, sy0, sx1 - sx0, sy1 - sy0);

    this.drawDoors(ctx, now);
    for (const a of [...w.actors].sort((a, b) => a.y - b.y)) this.drawActor(ctx, a, this.view(a), now, t, motion);

    // Candlelit vignette in screen space.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vg = ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.75);
    vg.addColorStop(0, "rgba(40, 24, 10, 0)");
    vg.addColorStop(1, "rgba(40, 24, 10, 0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  metrics(ch, size) {
    const key = ch + size;
    let m = this.glyphMetrics.get(key);
    if (!m) {
      this.ctx.font = `${size}px ${GLYPH_FONT}`;
      const mm = this.ctx.measureText(ch);
      m = { asc: mm.actualBoundingBoxAscent || size * 0.5, desc: mm.actualBoundingBoxDescent || 0 };
      this.glyphMetrics.set(key, m);
    }
    return m;
  }

  // Draws a glyph centred on (x, y), squashing and rotating about its feet.
  drawGlyph(ctx, ch, x, y, size, color, p) {
    const m = this.metrics(ch, size);
    ctx.save();
    ctx.translate(x, y + (m.asc + m.desc) / 2);
    if (p.rot) ctx.rotate(p.rot);
    ctx.scale(p.sx ?? 1, p.sy ?? 1);
    ctx.font = `${size}px ${GLYPH_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    // A paper-coloured halo keeps the letter legible over grid and hatching.
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = "rgba(247, 242, 230, 0.85)";
    ctx.strokeText(ch, 0, -m.desc);
    ctx.fillStyle = color;
    ctx.fillText(ch, 0, -m.desc);
    ctx.restore();
  }

  pose(a, v, now, t, motion) {
    const goblin = a.kind === "goblin";
    const p = { ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, shadow: 0, ...(goblin ? POSES.hop(t, v.phase) : POSES.breathe(t)) };
    p.oy *= motion;
    p.sx = 1 + (p.sx - 1) * motion;
    p.sy = 1 + (p.sy - 1) * motion;

    if (goblin && motion > 0.5) {
      const d = v.dart, [range, minT, maxT] = DART;
      if (now > d.next) {
        d.tx = (Math.random() - 0.5) * 2 * range;
        d.ty = (Math.random() - 0.5) * 2 * range * 0.6;
        d.next = now + (minT + Math.random() * (maxT - minT)) * 1000;
      }
      d.ox += (d.tx - d.ox) * 0.18;
      d.oy += (d.ty - d.oy) * 0.18;
      p.ox += d.ox;
      p.oy += d.oy;
    }

    // Tween between tiles; goblins arc high as they hop across.
    const k = clamp01((now - v.t0) / v.dur);
    const e = ease(k);
    const x = v.fx + (v.x - v.fx) * e, y = v.fy + (v.y - v.fy) * e;
    if (k < 1) p.oy -= Math.sin(Math.PI * k) * (goblin ? 0.32 : 0.08) * motion;
    return { cx: (x + 0.5 + p.ox) * this.TS, cy: (y + 0.5 + p.oy) * this.TS, bx: (x + 0.5) * this.TS, baseY: (y + 0.5) * this.TS, p };
  }

  drawActor(ctx, a, v, now, t, motion) {
    const TS = this.TS;
    const { cx, cy, bx, baseY, p } = this.pose(a, v, now, t, motion);
    // Pencil shadow on the floor, smaller while airborne.
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(bx + (cx - bx) * 0.6, baseY + TS * 0.36, TS * 0.26 * (1 - p.shadow * 0.35), TS * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const player = a === this.world.player;
    this.drawGlyph(ctx, a.glyph, cx, cy, TS * (player ? 0.95 : 1.05), player ? PLAYER_INK : INK, p);
  }

  drawDoors(ctx, now) {
    const TS = this.TS;
    for (const door of this.world.level.doors.values()) {
      const t0 = this.doorAnims.get(door);
      const k = door.open ? (t0 === undefined ? 1 : ease(clamp01((now - t0) / 280))) : 0;
      ctx.save();
      ctx.translate((door.x + 0.5) * TS, (door.y + 0.5) * TS);
      // For axis "h" the passage runs left-right, so the slab stands upright across it.
      if (door.axis === "v") ctx.rotate(Math.PI / 2);
      const len = TS * 0.94, wid = TS * 0.24;
      // Swing about the hinge at one end.
      ctx.translate(0, -len / 2);
      ctx.rotate((-k * Math.PI) / 2);
      ctx.fillStyle = PAPER;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.fillRect(-wid / 2, 0, wid, len);
      ctx.strokeRect(-wid / 2, 0, wid, len);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, len * 0.12);
      ctx.lineTo(0, len * 0.88);
      ctx.stroke();
      ctx.restore();
    }
  }
}
