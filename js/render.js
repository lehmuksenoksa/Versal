// Per-frame drawing: the camera, the map as explored (see expression.js:
// hatching, what is in sight and remembered, the candle), and the animated
// letters for the player and the goblins.

import { INK, PAPER } from "./maprender.js";
import { Expression, EXPRESSION_DEFAULTS } from "./expression.js";

export { EXPRESSION_DEFAULTS };

const DESK = "#2b221c";
export const ZOOM = { start: 0.48, min: 0.4, max: 2, step: 1.25 };

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
  // Aggressive goblins lunge at the player (along dx, dy) within their
  // square: a quick hop out, a squash as they land, a slower step back.
  lunge(t, ph, dx, dy) {
    const k = (t / 0.62 + ph) % 1, out = 0.28;
    const reach = k < out ? 1 - Math.pow(1 - k / out, 3) : 1 - ease((k - out) / (1 - out));
    const h = k < out ? Math.sin((Math.PI * k) / out) : 0, land = Math.exp(-(((k - out) / 0.06) ** 2));
    return { ox: dx * 0.22 * reach, oy: dy * 0.22 * reach - h * 0.12, sx: 1 + 0.2 * land - 0.04 * h, sy: 1 - 0.24 * land + 0.1 * h, rot: dx * 0.18 * reach, shadow: h };
  },
  // Sleepers lie still, slumped a little, breathing slowly.
  sleep(t, ph) {
    const b = 0.5 + 0.5 * Math.sin(t * 1.4 + ph * 6);
    return { sy: 0.9 - 0.07 * b, sx: 1.04 + 0.03 * b, rot: ph > 0.5 ? 0.16 : -0.16 };
  },
};

// The noises goblins make, written above them as they happen: when they
// move, while aggressive, while asleep. Each with its words, how far off
// (in tiles) it is heard out of sight, and how long it shows (seconds).
const SOUNDS = {
  move: { words: ["scuttle", "scrabble", "skitter", "scritch", "pitter-pat", "scuff"], range: 7, dur: 1.1 },
  growl: { words: ["grr", "grrr", "hsss", "grrk", "rrr"], range: 10, dur: 1.2 },
  alarm: { words: ["grr!", "GRR!", "hsss!", "rraah!"], range: 12, dur: 1.4 },
  snore: { words: ["zzz", "zz", "zzZ", "z"], range: 5, dur: 1.8 },
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
    this.cam = { x: 0, y: 0, snap: true };
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.glyphMetrics = new Map();
    // Noises showing, and when each pack was last heard moving.
    this.sounds = [];
    this.packHeard = new Map();
    this.settings = { ...EXPRESSION_DEFAULTS };
    this.zoom = ZOOM.start;
    this.resize();
  }

  // Change how the map is shown (see EXPRESSION_DEFAULTS). Changes that need
  // the drawing redone wait for a pause.
  setVis(changes) {
    Object.assign(this.settings, changes);
    if (!this.exp) return;
    if (this.exp.set(changes)) this.redraw(150);
    if ("sight" in changes) {
      this.world.sight = this.settings.sight;
      this.world.updateFov();
    }
  }

  setWorld(world) {
    this.world = world;
    this.world.sight = this.settings.sight;
    this.world.updateFov();
    this.views.clear();
    this.sounds = [];
    this.packHeard.clear();
    this.exp = null; // a new map starts unseen
    this.cam.snap = true;
    this.buildMap();
  }

  // Zoom the view. The map is redrawn at the new resolution once zooming
  // pauses; until then the old drawing is scaled.
  setZoom(z) {
    z = Math.max(ZOOM.min, Math.min(ZOOM.max, z));
    if (z === this.zoom) return;
    this.zoom = z;
    clearTimeout(this.rescale);
    if (this.world) this.rescale = setTimeout(() => this.buildMap(), 300);
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

  // The map's drawing for this level, tile size and zoom.
  buildMap() {
    const w = this.world;
    if (!this.exp || this.exp.level !== w.level || this.exp.TS !== this.TS) {
      this.exp = new Expression(w.level, w.seed, this.TS, this.settings);
      this.exp.player = { x: w.player.x, y: w.player.y };
    }
    this.exp.setScale(this.dpr * this.zoom); // learns what is seen and draws
  }

  // Redo the drawing after `delay` ms, a slice each frame (newly seen ground
  // inks in once it is done).
  redraw(delay) {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.exp?.rebuildSoon(), delay);
  }

  // Is the map point (x, y) in sight?
  inSight(x, y) {
    return this.exp.inSight(x, y) >= 0.5;
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
        // A pack on the move is heard now and then (not every goblin, every
        // step).
        if (e.actor.kind === "goblin") {
          const pack = e.actor.leader.id;
          if (now - (this.packHeard.get(pack) ?? -1e9) > 900 && Math.random() < 0.6) {
            this.packHeard.set(pack, now);
            this.hear(e.actor, "move", now);
          }
        }
        // What the player sees from the new tile; the drawing is redone once
        // the step is over.
        if (e.actor === this.world.player && this.exp?.learn(e.actor.x, e.actor.y)) this.redraw(v.dur + 30);
      } else if (e.type === "door" && this.exp) {
        // A door opened: drawn open, and what is beyond it seen.
        this.exp.doorChanged(e.door);
        this.redraw(30);
      }
    }
  }

  // A noise from actor `a`, if the player sees it or is near enough to hear
  // it: written above it, fainter the further off it is when out of sight.
  hear(a, kind, now) {
    const S = SOUNDS[kind], p = this.world.player, TS = this.TS;
    const d = Math.hypot(a.x - p.x, a.y - p.y), seen = this.inSight((a.x + 0.5) * TS, (a.y + 0.5) * TS);
    if (!seen && d > S.range) return;
    const v = this.view(a), j = (r) => (Math.random() - 0.5) * 2 * r;
    this.sounds.push({
      text: S.words[Math.floor(Math.random() * S.words.length)], kind, t0: now, dur: S.dur * 1000,
      x: (v.x + 0.5 + j(0.25)) * TS, y: (v.y + 0.1) * TS, rot: j(0.18),
      alpha: seen ? 1 : 0.9 * (1 - (0.45 * d) / S.range),
    });
    if (this.sounds.length > 60) this.sounds.shift();
  }

  // Noises from the goblins' states: a growl as one turns aggressive and now
  // and then while it is; a snore now and then while asleep.
  listen(now) {
    for (const a of this.world.actors) {
      if (a.kind !== "goblin") continue;
      const v = this.view(a);
      if (v.state !== a.state) {
        // (One shout from a pack as it turns, not one from each.)
        if (v.state !== undefined && a.state === "aggressive" && now - (this.packHeard.get(-a.leader.id) ?? -1e9) > 1000) {
          this.packHeard.set(-a.leader.id, now);
          this.hear(a, "alarm", now);
        }
        v.state = a.state;
        v.nextSound = now + (a.state === "sleeping" ? 1500 + Math.random() * 3500 : 1500 + Math.random() * 2500);
      }
      if (now < v.nextSound) continue;
      if (a.state === "aggressive") {
        this.hear(a, "growl", now);
        v.nextSound = now + 1300 + Math.random() * 2400;
      } else if (a.state === "sleeping") {
        this.hear(a, "snore", now);
        v.nextSound = now + 2500 + Math.random() * 3000;
      } else v.nextSound = Infinity;
    }
  }

  // The noises, rising and fading: small heavy lettering, slanted, in ink
  // with a paper halo; snores drifting off to the side.
  drawSounds(ctx, now) {
    const TS = this.TS;
    this.sounds = this.sounds.filter((s) => now - s.t0 < s.dur);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    for (const s of this.sounds) {
      const k = (now - s.t0) / s.dur, size = TS * (s.kind === "alarm" ? 0.66 : s.kind === "snore" ? 0.46 + 0.14 * k : s.kind === "growl" ? 0.54 : 0.46);
      const a = s.alpha * Math.min(1, k / 0.08) * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45);
      ctx.save();
      ctx.translate(s.x + (s.kind === "snore" ? k * TS * 0.35 : 0), s.y - k * TS * (s.kind === "snore" ? 0.6 : 0.45));
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `italic 800 ${size}px ${LETTERING.font}`;
      ctx.lineWidth = size * 0.26;
      ctx.strokeStyle = PAPER;
      ctx.strokeText(s.text, 0, 0);
      ctx.fillStyle = INK;
      ctx.fillText(s.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  screenToTile(px, py) {
    return { x: Math.floor((px / this.zoom + this.cam.x) / this.TS), y: Math.floor((py / this.zoom + this.cam.y) / this.TS) };
  }

  frame(now) {
    const w = this.world;
    if (!w || !this.exp) return;
    this.consume(now);
    const ctx = this.ctx, TS = this.TS, L = w.level, t = now / 1000;
    const dt = Math.min(0.1, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    const motion = this.reduced ? 0.35 : 1;
    // The view in map units, and map units to device pixels.
    const vw = this.vw / this.zoom, vh = this.vh / this.zoom, sc = this.dpr * this.zoom;

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

    // The map as explored (light and darkness included), then the letters.
    const view = { x: cx, y: cy, w: vw, h: vh };
    this.exp.update(now, dt, px, py);
    this.exp.drawMap(ctx, view, now);
    for (const a of [...w.actors].sort((a, b) => a.y - b.y)) {
      const v = this.view(a);
      // Goblins show only while in sight, fading in and out.
      const target = a === w.player || this.inSight((a.x + 0.5) * TS, (a.y + 0.5) * TS) ? 1 : 0;
      if (v.alpha === undefined) v.alpha = target;
      v.alpha += (target - v.alpha) * Math.min(1, dt * 8);
      if (v.alpha > 0.02) this.drawActor(ctx, a, v, now, t, motion);
    }
    // What can be heard, seen or not.
    this.listen(now);
    this.drawSounds(ctx, now);
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
    // A paper-coloured halo keeps the letter legible over grid and hatching
    // (only as far as the light shows the paper).
    ctx.lineWidth = size * LETTERING.halo;
    ctx.strokeStyle = `rgba(247, 242, 230, ${0.9 * (p.lit ?? 1)})`;
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
    const goblin = a.kind === "goblin", pl = this.world.player;
    let idle = POSES.breathe(t);
    if (goblin && a.state === "aggressive") {
      const dx = pl.x - a.x, dy = pl.y - a.y, d = Math.hypot(dx, dy) || 1;
      idle = POSES.lunge(t, v.phase / 6.28, dx / d, dy / d);
    } else if (goblin && a.state === "sleeping") idle = POSES.sleep(t, v.phase / 6.28);
    else if (goblin) idle = POSES.hop(t, v.phase);
    const p = { ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, shadow: 0, ...idle };
    p.ox *= motion;
    p.oy *= motion;
    p.rot *= motion;
    p.sx = 1 + (p.sx - 1) * motion;
    p.sy = 1 + (p.sy - 1) * motion;

    // (Only the milling dart about.)
    if (goblin && a.state === "neutral" && motion > 0.5) {
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
    this.drawGlyph(ctx, a.glyph, cx, cy, style, { ...p, rot: p.rot + LETTERING.tilt * v.tilt * motion, alpha: v.alpha, lit: this.exp.lightAt(bx, baseY) });
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
