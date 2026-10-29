// Per-frame drawing: the pre-inked map, what the player can see and remembers,
// lighting, and the animated letters for the player and the goblins.

import { renderMap, INK, PAPER } from "./maprender.js";
import { Walls } from "./sightline.js";

const DESK = "#2b221c";
export const ZOOM = { start: 0.75, min: 0.4, max: 2, step: 1.25 };

// How the player and monsters are lettered, as chosen in the character
// mockup (mockups/glyphs.html). Sizes are in tiles; bold and halo are
// fractions of the letter size; tilt is the most a letter leans, in radians.
const LETTERING = {
  font: "Texturina, Georgia, serif",
  player: { weight: 800, size: 0.9, ink: "#a3261b" },
  monster: { weight: 600, size: 1.05, ink: INK },
  bold: 0.025,
  halo: 0.1,
  tilt: 0.06,
};

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
  sight: 9, // how far the player sees, in tiles
  unknown: "dark", // what hides unexplored ground: "paper" (the blank page) or "dark"
  softness: 2, // width of the soft edge of what's in sight, in tiles
  memory: "sepia", // remembered but out of sight: "faded", "pencil", "sepia" or "unchanged"
  fade: 0.85, // how far remembered areas wash out toward the paper
  reveal: 0.3, // seconds for newly seen ground to ink in
  light: "candle", // "none" or "candle" (a warm light carried by the player)
  radius: 3, // light radius in tiles
  dark: 0.7, // darkness beyond the light
  warmth: 1, // warm tint near the light
  flicker: 0.3,
  shadowSoft: 0.3, // how soft the edges of the light's shadows are, in tiles (0 is hard)
  lightUnknown: "yes", // does the light also fall on unexplored ground? "no" or "yes"
  rock: 0.5, // how much darker the rock outside the rooms is than the floor
};
// Sight and light reach this far past a wall into the rock, so the walls and
// the hatching just behind them show.
const BAND = { sight: 2.4, light: 0.6 };
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
    this.zoom = ZOOM.start;
    this.layer = document.createElement("canvas");
    this.resize();
  }

  // Change how sight, memory and light are shown.
  setVis(changes) {
    const old = this.vis;
    this.vis = { ...old, ...changes };
    if (!this.world) return;
    if (this.vis.rock !== old.rock) this.toneMap();
    if (this.vis.memory !== old.memory || this.vis.fade !== old.fade || this.vis.rock !== old.rock) this.buildMemory();
    this.sightFrom = null; // recompute sight and light
    if (this.vis.sight !== old.sight) {
      this.world.sight = this.vis.sight;
      this.world.updateFov();
    }
  }

  setWorld(world) {
    this.world = world;
    this.views.clear();
    this.seenHard = null; // start the new map unseen, so it inks in
    this.cam.snap = true;
    this.buildMap();
  }

  // Zoom the view. The map is redrawn at the new resolution once zooming
  // pauses; until then the old drawing is scaled.
  setZoom(z) {
    z = Math.max(ZOOM.min, Math.min(ZOOM.max, z));
    if (z === this.zoom) return;
    this.zoom = z;
    this.sightFrom = null; // redraw the light at the new resolution
    clearTimeout(this.rebuild);
    if (this.world) this.rebuild = setTimeout(() => this.buildMap(), 300);
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
    this.mapScale = this.dpr * this.zoom;
    const drawn = renderMap(L, this.TS, this.mapScale, this.world.seed);
    this.rawMap = drawn.canvas;
    // Everything but the floor: the rock outside the rooms.
    this.rock = new Path2D();
    this.rock.rect(-L.w * this.TS, -L.h * this.TS, L.w * this.TS * 3, L.h * this.TS * 3);
    this.rock.addPath(drawn.floor);
    this.toneMap();
    this.walls = new Walls(drawn.loops, this.TS * 2);
    this.buildMemory();
    // What is in sight now and what has been seen, as masks over the map:
    // "hard" is exact, "soft" eases toward it (so new ground inks in) with
    // a blurred edge.
    if (!this.seenHard) {
      [this.visHard, this.seenHard, this.maskVis, this.maskSeen, this.maskTmp] = [0, 0, 0, 0, 0].map(() => this.makeMask(L));
      this.maskLight = document.createElement("canvas");
      this.hit = document.createElement("canvas").getContext("2d");
    }
  }

  makeMask(L) {
    const c = document.createElement("canvas");
    c.width = L.w * MASK_RES;
    c.height = L.h * MASK_RES;
    return c;
  }

  // The map with the rock outside the rooms darkened (the ink stays black).
  toneMap() {
    const v = this.vis;
    if (!(v.rock > 0)) { this.map = this.rawMap; return; }
    const c = this.map && this.map !== this.rawMap && this.map.width === this.rawMap.width && this.map.height === this.rawMap.height ? this.map : document.createElement("canvas");
    c.width = this.rawMap.width;
    c.height = this.rawMap.height;
    const g = c.getContext("2d");
    g.drawImage(this.rawMap, 0, 0);
    g.setTransform(this.mapScale, 0, 0, this.mapScale, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = `rgba(150, 142, 132, ${v.rock})`;
    g.fill(this.rock, "evenodd");
    this.map = c;
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

  // Sight and light are recomputed when the player's drawn position moves;
  // the soft masks then ease toward the new state for a moment.
  updateMasks(dt, now, px, py) {
    const v = this.vis;
    const moved = !this.sightFrom || this.sightFrom[0] !== px || this.sightFrom[1] !== py;
    if (moved) {
      this.castSight(px, py);
      this.easeUntil = now + v.reveal * 1500 + 200;
    }
    if (now > this.easeUntil) return;
    this.easeMasks(dt);
  }

  castSight(px, py) {
    const v = this.vis, TS = this.TS, k = MASK_RES / TS;
    const sight = v.sight * TS, light = v.light === "candle" ? v.radius * TS * 1.1 : 0;
    this.sightPath = this.walls.visible(px, py, Math.max(sight, light) + TS);
    this.sightFrom = [px, py];

    // In sight now: the visible polygon within reach, plus the rock just past
    // the walls it meets.
    const g = this.visHard.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.visHard.width, this.visHard.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = g.strokeStyle = "#fff";
    g.save();
    g.beginPath();
    g.arc(px, py, sight, 0, Math.PI * 2);
    g.clip();
    g.fill(this.sightPath);
    g.restore();
    g.save();
    g.clip(this.rock, "evenodd");
    g.beginPath();
    g.arc(px, py, sight + BAND.sight * TS, 0, Math.PI * 2);
    g.clip();
    g.lineWidth = BAND.sight * TS * 2;
    g.lineJoin = "round";
    g.stroke(this.sightPath);
    g.restore();
    this.seenHard.getContext("2d").drawImage(this.visHard, 0, 0);

    // The light: bright at the player, fading out at its radius, reaching only
    // what can be seen from here (and the face of the walls). It is drawn at
    // screen resolution, so hard shadows stay crisp, on a square canvas just
    // big enough for the light around the player.
    if (!light) { this.lightBox = null; return; }
    const R = v.radius * TS;
    const half = (R + BAND.light * TS) * 1.15 + v.shadowSoft * TS * 2;
    const res = Math.min(this.dpr * this.zoom, 2048 / (2 * half));
    const size = Math.ceil(2 * half * res);
    if (this.maskLight.width !== size) this.maskLight.width = this.maskLight.height = size;
    this.lightBox = { x: px - half, y: py - half, w: 2 * half };
    const lg = this.maskLight.getContext("2d");
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.clearRect(0, 0, size, size);
    lg.setTransform(res, 0, 0, res, -(px - half) * res, -(py - half) * res);
    const grad = lg.createRadialGradient(px, py, 0, px, py, R);
    grad.addColorStop(0, "rgba(0, 0, 0, 1)");
    grad.addColorStop(0.55, "rgba(0, 0, 0, 0.8)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    lg.filter = v.shadowSoft > 0 ? `blur(${v.shadowSoft * TS * res}px)` : "none";
    lg.fillStyle = lg.strokeStyle = grad;
    lg.fill(this.sightPath);
    lg.save();
    lg.clip(this.rock, "evenodd");
    lg.lineWidth = BAND.light * TS * 2;
    lg.lineJoin = "round";
    lg.stroke(this.sightPath);
    lg.restore();
    lg.filter = "none";
  }

  easeMasks(dt) {
    const v = this.vis;
    // Ease the soft masks toward the hard ones: soft = soft + (max-ish(hard, blur(hard)) - soft) * rate.
    const rate = v.reveal > 0 ? Math.min(1, dt / (v.reveal * 0.35)) : 1;
    const blur = `blur(${Math.max(0.01, v.softness * MASK_RES * 0.6)}px)`;
    const tmp = this.maskTmp.getContext("2d");
    for (const [hard, soft] of [[this.visHard, this.maskVis], [this.seenHard, this.maskSeen]]) {
      const sg = soft.getContext("2d");
      tmp.clearRect(0, 0, soft.width, soft.height);
      tmp.drawImage(soft, 0, 0);
      sg.clearRect(0, 0, soft.width, soft.height);
      sg.globalAlpha = 1 - rate;
      sg.drawImage(this.maskTmp, 0, 0);
      sg.globalAlpha = rate;
      sg.globalCompositeOperation = "lighter";
      // The blurred edge only spreads outward: what is actually in sight
      // stays at full strength (blur + hard, capped at 1 by "lighter").
      sg.filter = blur;
      sg.drawImage(hard, 0, 0);
      sg.filter = "none";
      sg.drawImage(hard, 0, 0);
      sg.globalCompositeOperation = "source-over";
      sg.globalAlpha = 1;
    }
  }

  // Is the map point (x, y) in sight?
  inSight(x, y) {
    const [px, py] = this.sightFrom;
    return Math.hypot(x - px, y - py) <= this.vis.sight * this.TS && this.hit.isPointInPath(this.sightPath, x, y);
  }

  view(a) {
    let v = this.views.get(a.id);
    if (!v) {
      v = { x: a.x, y: a.y, fx: a.x, fy: a.y, t0: 0, dur: 1, phase: Math.random() * 6.28, tilt: Math.random() * 2 - 1, dart: { ox: 0, oy: 0, tx: 0, ty: 0, next: 0 } };
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
    return { x: Math.floor((px / this.zoom + this.cam.x) / this.TS), y: Math.floor((py / this.zoom + this.cam.y) / this.TS) };
  }

  frame(now) {
    const w = this.world;
    if (!w) return;
    this.consume(now);
    const ctx = this.ctx, TS = this.TS, L = w.level, t = now / 1000;
    const dt = Math.min(0.1, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    const motion = this.reduced ? 0.35 : 1;
    // The view in map units, and map units to device pixels.
    const vw = this.vw / this.zoom, vh = this.vh / this.zoom, sc = this.dpr * this.zoom, ms = this.mapScale;

    // Camera follows the player's drawn position.
    const pv = this.view(w.player);
    const pk = ease(clamp01((now - pv.t0) / pv.dur));
    const px = (pv.fx + (pv.x - pv.fx) * pk + 0.5) * TS, py = (pv.fy + (pv.y - pv.fy) * pk + 0.5) * TS;
    const mw = L.w * TS, mh = L.h * TS;
    const fit = (target, view, size) => (size + 64 < view ? (size - view) / 2 : Math.max(-32, Math.min(size - view + 32, target)));
    const tx = fit(px - vw / 2, vw, mw), ty = fit(py - vh / 2, vh, mh);
    if (this.cam.snap) { this.cam.x = tx; this.cam.y = ty; this.cam.snap = false; }
    const f = 1 - Math.exp(-dt * 7);
    this.cam.x += (tx - this.cam.x) * f;
    this.cam.y += (ty - this.cam.y) * f;
    const cx = Math.round(this.cam.x * sc) / sc, cy = Math.round(this.cam.y * sc) / sc;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = DESK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(sc, 0, 0, sc, -cx * sc, -cy * sc);

    // The page, casting a soft shadow onto the desk.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, mw, mh);
    ctx.restore();
    const world = [sc, 0, 0, sc, -cx * sc, -cy * sc];
    const drawRegion = (g, img) => {
      const sx0 = Math.max(0, cx), sy0 = Math.max(0, cy);
      const sx1 = Math.min(mw, cx + vw), sy1 = Math.min(mh, cy + vh);
      if (sx1 > sx0 && sy1 > sy0)
        g.drawImage(img, sx0 * ms, sy0 * ms, (sx1 - sx0) * ms, (sy1 - sy0) * ms, sx0, sy0, sx1 - sx0, sy1 - sy0);
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

    this.updateMasks(dt, now, px, py);
    const v = this.vis;
    // Remembered ground everywhere, the fresh ink only where the player can see.
    drawRegion(ctx, this.memory);
    if (this.memory !== this.map) masked((g) => drawRegion(g, this.map), this.maskVis, "destination-in");
    for (const a of [...w.actors].sort((a, b) => a.y - b.y)) {
      const view = this.view(a);
      // Goblins show only while in sight, fading in and out.
      const target = a === w.player || this.inSight((a.x + 0.5) * TS, (a.y + 0.5) * TS) ? 1 : 0;
      if (view.alpha === undefined) view.alpha = target;
      view.alpha += (target - view.alpha) * Math.min(1, dt * 8);
      if (view.alpha > 0.02) this.drawActor(ctx, a, view, now, t, motion);
    }

    // A warm light carried by the player (see castSight): darkness everywhere
    // but where the light reaches, and a warm tint within it. Walls cast
    // shadows because the light only reaches what is in sight.
    const candle = () => {
      const fl = 1 + v.flicker * 0.05 * (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2));
      const g = this.layer.getContext("2d");
      // The light mask, flickering in size about the player.
      const b = this.lightBox;
      const light = () => b && g.drawImage(this.maskLight, px + (b.x - px) * fl, py + (b.y - py) * fl, b.w * fl, b.w * fl);
      const shade = (paint) => {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, this.layer.width, this.layer.height);
        g.setTransform(...world);
        g.imageSmoothingEnabled = true;
        paint();
        g.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(this.layer, 0, 0);
        ctx.restore();
      };
      // Darkness only where the light doesn't reach...
      if (v.dark > 0)
        shade(() => {
          g.fillStyle = `rgba(40, 24, 10, ${v.dark})`;
          g.fillRect(cx, cy, vw, vh);
          g.globalCompositeOperation = "destination-out";
          light();
        });
      // ...and a warm tint where it does.
      if (v.warmth > 0)
        shade(() => {
          g.fillStyle = `rgba(255, 205, 140, ${v.warmth * 0.4})`;
          g.fillRect(cx, cy, vw, vh);
          g.globalCompositeOperation = "destination-in";
          light();
        });
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

  metrics(ch, font) {
    const key = ch + font;
    let m = this.glyphMetrics.get(key);
    if (!m) {
      this.ctx.font = font;
      const mm = this.ctx.measureText(ch);
      m = { asc: mm.actualBoundingBoxAscent || this.TS * 0.5, desc: mm.actualBoundingBoxDescent || 0 };
      this.glyphMetrics.set(key, m);
    }
    return m;
  }

  // Draws a letter centred on (x, y), squashing and rotating about its feet.
  drawGlyph(ctx, ch, x, y, style, p) {
    const size = style.size * this.TS, font = `${style.weight} ${size}px ${LETTERING.font}`;
    const m = this.metrics(ch, font);
    ctx.save();
    ctx.globalAlpha = p.alpha ?? 1;
    ctx.translate(x, y + (m.asc + m.desc) / 2);
    if (p.rot) ctx.rotate(p.rot);
    ctx.scale(p.sx ?? 1, p.sy ?? 1);
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    // A paper-coloured halo keeps the letter legible over grid and hatching.
    ctx.lineWidth = size * LETTERING.halo;
    ctx.strokeStyle = "rgba(247, 242, 230, 0.9)";
    ctx.strokeText(ch, 0, -m.desc);
    // A little extra weight, to stand up to the heavy map lines.
    ctx.lineWidth = size * LETTERING.bold;
    ctx.strokeStyle = style.ink;
    ctx.strokeText(ch, 0, -m.desc);
    ctx.fillStyle = style.ink;
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
    // A hatched shadow: three short pen strokes on the floor, drawn in
    // closer while the creature is in the air.
    const w = TS * 0.22 * (1 - p.shadow * 0.35), sx = bx + (cx - bx) * 0.6, sy = baseY + TS * 0.38;
    ctx.save();
    ctx.globalAlpha = 0.55 * v.alpha;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, TS * 0.04);
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(sx + k * w * 0.6 - w * 0.2, sy + w * 0.25);
      ctx.lineTo(sx + k * w * 0.6 + w * 0.2, sy - w * 0.25);
    }
    ctx.stroke();
    ctx.restore();
    const style = a === this.world.player ? LETTERING.player : LETTERING.monster;
    this.drawGlyph(ctx, a.glyph, cx, cy, style, { ...p, rot: p.rot + LETTERING.tilt * v.tilt * motion, alpha: v.alpha });
  }
}

// Zoom with the mouse wheel or trackpad, the + and - keys, and 0 to reset.
export function bindZoom(renderer, canvas) {
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    renderer.setZoom(renderer.zoom * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key === "+" || e.key === "=") renderer.setZoom(renderer.zoom * ZOOM.step);
    else if (e.key === "-" || e.key === "_") renderer.setZoom(renderer.zoom / ZOOM.step);
    else if (e.key === "0") renderer.setZoom(ZOOM.start);
    else return;
    e.preventDefault();
  });
}
