// Per-frame drawing: the pre-inked map, what the player can see and remembers,
// lighting, and the animated blackletter glyphs for the player and the goblins.

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

// How sight, memory and light are shown. The visibility mockup
// (mockups/visibility.html) edits these live.
export const VIS_DEFAULTS = {
  sight: 9, // tiles the player can see (used by the World)
  unknown: "paper", // what hides unexplored ground: "paper" (the blank page) or "dark"
  edge: "soft", // edge of the seen area: "soft", "ragged" (inked, irregular) or "tiles"
  softness: 0.6, // width of a soft or ragged edge, in tiles
  memory: "pencil", // remembered but out of sight: "faded", "pencil", "sepia" or "unchanged"
  fade: 0.35, // how far remembered areas wash out toward the paper
  reveal: 0.3, // seconds for newly seen ground to ink in
  light: "candle", // "none" or "candle" (a warm light carried by the player)
  radius: 8, // light radius in tiles
  dark: 0.3, // darkness beyond the light
  warmth: 0.35, // warm tint near the light
  flicker: 0.3,
  lightUnknown: "no", // does the light also fall on unexplored ground? "no" or "yes"
};
const MEMORY_FILTERS = {
  faded: "none",
  pencil: "grayscale(1) contrast(0.6) brightness(1.12)",
  sepia: "sepia(0.9) contrast(0.72) brightness(1.06)",
  unchanged: "none",
};
const MASK_RES = 8; // mask pixels per tile

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.views = new Map();
    this.cam = { x: 0, y: 0, snap: true };
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.glyphMetrics = new Map();
    this.vis = { ...VIS_DEFAULTS };
    this.layer = document.createElement("canvas");
    this.resize();
  }

  // Change how sight, memory and light are shown.
  setVis(changes) {
    const old = this.vis;
    this.vis = { ...old, ...changes };
    if (!this.world) return;
    if (this.vis.memory !== old.memory || this.vis.fade !== old.fade) this.buildMemory();
    if (this.vis.edge !== old.edge || this.vis.softness !== old.softness) this.maskDirty = true;
    if (this.vis.sight !== old.sight) {
      this.world.sight = this.vis.sight;
      this.world.updateFov();
    }
  }

  setWorld(world) {
    this.world = world;
    this.views.clear();
    this.visA = null; // start the new map unseen, so it inks in
    this.cam.snap = true;
    this.buildMap();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.vw = Math.max(1, r.width);
    this.vh = Math.max(1, r.height);
    this.canvas.width = this.layer.width = Math.round(this.vw * this.dpr);
    this.canvas.height = this.layer.height = Math.round(this.vh * this.dpr);
    const ts = this.vw < 560 ? 28 : this.vw < 1000 ? 34 : 40;
    if (ts !== this.TS) {
      this.TS = ts;
      this.glyphMetrics.clear();
      if (this.world) this.buildMap();
    }
  }

  buildMap() {
    const L = this.world.level;
    this.map = renderMap(L, this.TS, this.dpr, this.world.seed).canvas;
    this.buildMemory();
    // How visible and how known each tile is, easing toward the world's
    // current state so newly seen ground inks in.
    if (!this.visA || this.visA.length !== L.w * L.h) {
      this.visA = new Float32Array(L.w * L.h);
      this.seenA = new Float32Array(L.w * L.h);
      this.tileMask = document.createElement("canvas");
      this.tileMask.width = L.w;
      this.tileMask.height = L.h;
      this.tileImg = this.tileMask.getContext("2d").createImageData(L.w, L.h);
      this.maskVis = this.makeMask(L);
      this.maskSeen = this.makeMask(L);
      this.grain = edgeNoise(L.w * MASK_RES, L.h * MASK_RES);
    }
    this.maskDirty = true;
  }

  makeMask(L) {
    const c = document.createElement("canvas");
    c.width = L.w * MASK_RES;
    c.height = L.h * MASK_RES;
    return c;
  }

  // The map as remembered: washed out, greyed or browned.
  buildMemory() {
    const v = this.vis;
    if (v.memory === "unchanged") { this.memory = this.map; return; }
    const c = document.createElement("canvas");
    c.width = this.map.width;
    c.height = this.map.height;
    const g = c.getContext("2d");
    g.filter = MEMORY_FILTERS[v.memory];
    g.drawImage(this.map, 0, 0);
    g.filter = "none";
    g.fillStyle = `rgba(247, 242, 230, ${v.fade})`;
    g.fillRect(0, 0, c.width, c.height);
    this.memory = c;
  }

  updateMasks(dt) {
    const w = this.world, v = this.vis;
    const rate = v.reveal > 0 ? Math.min(1, dt / (v.reveal * 0.35)) : 1;
    let changed = this.maskDirty;
    for (let i = 0; i < this.visA.length; i++) {
      const tv = w.visible[i], ts = w.seen[i];
      const nv = this.visA[i] + (tv - this.visA[i]) * rate, ns = this.seenA[i] + (ts - this.seenA[i]) * rate;
      this.visA[i] = Math.abs(nv - tv) < 0.004 ? tv : nv;
      this.seenA[i] = Math.abs(ns - ts) < 0.004 ? ts : ns;
      if (nv !== tv || ns !== ts) changed = true;
    }
    if (!changed) return;
    this.maskDirty = false;
    this.paintMask(this.maskVis, this.visA);
    this.paintMask(this.maskSeen, this.seenA);
  }

  // Scale a per-tile value up to a smooth mask; "ragged" thresholds it
  // against a noise pattern for an irregular, inked edge.
  paintMask(mask, values) {
    const v = this.vis, d = this.tileImg.data;
    for (let i = 0; i < values.length; i++) d[i * 4 + 3] = Math.round(values[i] * 255);
    this.tileMask.getContext("2d").putImageData(this.tileImg, 0, 0);
    const g = mask.getContext("2d", { willReadFrequently: v.edge === "ragged" });
    g.clearRect(0, 0, mask.width, mask.height);
    g.imageSmoothingEnabled = v.edge !== "tiles";
    g.filter = v.edge === "tiles" ? "none" : `blur(${Math.max(0.01, v.softness * MASK_RES * 0.6)}px)`;
    g.drawImage(this.tileMask, 0, 0, mask.width, mask.height);
    g.filter = "none";
    if (v.edge !== "ragged") return;
    const img = g.getImageData(0, 0, mask.width, mask.height), p = img.data, n = this.grain;
    for (let i = 0; i < n.length; i++) {
      const a = p[i * 4 + 3] / 255;
      if (a <= 0 || a >= 1) continue;
      p[i * 4 + 3] = a + (n[i] - 0.5) * 0.9 > 0.5 ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
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
    const world = [this.dpr, 0, 0, this.dpr, -cx * this.dpr, -cy * this.dpr];
    const drawRegion = (g, img) => {
      const sx0 = Math.max(0, cx), sy0 = Math.max(0, cy);
      const sx1 = Math.min(mw, cx + this.vw), sy1 = Math.min(mh, cy + this.vh);
      if (sx1 > sx0 && sy1 > sy0)
        g.drawImage(img, sx0 * this.dpr, sy0 * this.dpr, (sx1 - sx0) * this.dpr, (sy1 - sy0) * this.dpr, sx0, sy0, sx1 - sx0, sy1 - sy0);
    };
    // Draw `paint` into the offscreen layer, keep (or cut away) the masked
    // part, and lay the result over the canvas.
    const masked = (paint, mask, op) => {
      const g = this.layer.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.layer.width, this.layer.height);
      g.setTransform(...world);
      paint(g);
      g.globalCompositeOperation = op;
      g.imageSmoothingEnabled = true;
      g.drawImage(mask, 0, 0, mw, mh);
      g.globalCompositeOperation = "source-over";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.layer, 0, 0);
      ctx.setTransform(...world);
    };

    this.updateMasks(dt);
    const v = this.vis;
    // Remembered ground everywhere, the fresh ink only where the player can see.
    drawRegion(ctx, this.memory);
    if (this.memory !== this.map) masked((g) => drawRegion(g, this.map), this.maskVis, "destination-in");

    for (const a of [...w.actors].sort((a, b) => a.y - b.y)) {
      const view = this.view(a);
      // Goblins show only while in sight, fading in and out.
      const target = a === w.player || w.isVisible(a.x, a.y) ? 1 : 0;
      if (view.alpha === undefined) view.alpha = target;
      view.alpha += (target - view.alpha) * Math.min(1, dt * 8);
      if (view.alpha > 0.02) this.drawActor(ctx, a, view, now, t, motion);
    }

    const candle = () => {
      // A warm light carried by the player, darkening toward its edge.
      const fl = 1 + v.flicker * 0.05 * (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2));
      const R = v.radius * TS * fl;
      const g = ctx.createRadialGradient(px, py, R * 0.1, px, py, R);
      g.addColorStop(0, `rgba(255, 214, 150, ${v.warmth * 0.4})`);
      g.addColorStop(0.5, `rgba(255, 205, 140, ${v.warmth * 0.18})`);
      g.addColorStop(1, `rgba(40, 24, 10, ${v.dark})`);
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = g;
      ctx.fillRect(cx, cy, this.vw, this.vh);
      ctx.restore();
    };
    if (v.light === "candle" && v.lightUnknown !== "yes") candle();
    // Ground never seen is hidden: blank paper, or darkness.
    masked((g) => {
      g.fillStyle = v.unknown === "dark" ? DESK : PAPER;
      g.fillRect(0, 0, mw, mh);
    }, this.maskSeen, "destination-out");

    if (v.light === "candle" && v.lightUnknown === "yes") candle();
    if (v.light !== "candle") {
      // Without a light, a gentle vignette in screen space.
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const vg = ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.75);
      vg.addColorStop(0, "rgba(40, 24, 10, 0)");
      vg.addColorStop(1, "rgba(40, 24, 10, 0.35)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
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
    ctx.globalAlpha = p.alpha ?? 1;
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
    ctx.globalAlpha = 0.16 * v.alpha;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(bx + (cx - bx) * 0.6, baseY + TS * 0.36, TS * 0.26 * (1 - p.shadow * 0.35), TS * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const player = a === this.world.player;
    this.drawGlyph(ctx, a.glyph, cx, cy, TS * (player ? 0.95 : 1.05), player ? PLAYER_INK : INK, { ...p, alpha: v.alpha });
  }
}

// Value noise plus fine grain over the mask, for the ragged edge.
function edgeNoise(w, h) {
  const cell = 6, gw = Math.ceil(w / cell) + 2, lat = Float32Array.from({ length: gw * (Math.ceil(h / cell) + 2) }, Math.random);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, t = fy - j;
      const a = lat[j * gw + i] + (lat[j * gw + i + 1] - lat[j * gw + i]) * u;
      const b = lat[(j + 1) * gw + i] + (lat[(j + 1) * gw + i + 1] - lat[(j + 1) * gw + i]) * u;
      out[y * w + x] = (a + (b - a) * t) * 0.75 + Math.random() * 0.25;
    }
  return out;
}
