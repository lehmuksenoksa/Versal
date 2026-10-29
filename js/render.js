// Per-frame drawing: the pre-inked map, live blackletter creatures with idle
// animation, doors, fog of war, particles and floating text.

import { renderMap, inkBlot, INK, PAPER } from "./maprender.js";
import { drawVersal } from "./versal.js";
import { RNG } from "./rng.js";
import { T } from "./dungeon.js";

const GLYPH_FONT = "UnifrakturMaguntia, UnifrakturCook, serif";
const TEXT_FONT = '"IM Fell English", Georgia, serif';
const DESK = "#2b221c";

const COLORS = {
  player: "#1c3a72",
  unaware: INK,
  awake: "#6e1a12",
  friendly: "#2d5a2c",
};

// Idle motion per creature. Offsets are in tiles; t in seconds.
const POSES = {
  hop(t, ph, awake) {
    const h = Math.abs(Math.sin(t * (awake ? 4.2 : 3) + ph));
    const land = Math.pow(1 - h, 6);
    return { oy: -h * 0.2, sx: 1 + 0.16 * land - 0.04 * h, sy: 1 - 0.2 * land + 0.08 * h, shadow: h };
  },
  scurry(t, ph) {
    return { rot: Math.sin(t * 15 + ph) * 0.09, sx: 1 + Math.sin(t * 30 + ph) * 0.03 };
  },
  flutter(t, ph) {
    const beat = Math.sin(t * 24 + ph);
    return { ox: Math.sin(t * 4.3 + ph) * 0.16, oy: -0.14 + Math.sin(t * 7.7 + ph * 2) * 0.12, sx: 1 + 0.24 * beat, sy: 1 - 0.1 * beat, shadow: 0.8 };
  },
  skitter(t, ph) {
    return { ox: Math.sin(t * 6 + ph) * 0.05, oy: -Math.abs(Math.sin(t * 6 + ph)) * 0.07, rot: Math.sin(t * 12 + ph) * 0.06 };
  },
  sway(t, ph) {
    return { rot: Math.sin(t * 1.3 + ph) * 0.17, ox: Math.sin(t * 1.3 + ph) * 0.04, sy: 1 + Math.sin(t * 2.6 + ph) * 0.03 };
  },
  rattle(t, ph) {
    const fit = Math.sin(t * 1.7 + ph) > 0.55 ? 1 : 0.15;
    return { ox: Math.sin(t * 47 + ph) * 0.02 * fit, rot: Math.sin(t * 39 + ph) * 0.06 * fit };
  },
  stomp(t, ph) {
    const s = Math.abs(Math.sin(t * 2.4 + ph));
    return { oy: -s * 0.07, rot: Math.sin(t * 2.4 + ph) * 0.07, sy: 1 - Math.pow(1 - s, 8) * 0.08 };
  },
  lumber(t, ph) {
    return { rot: Math.sin(t * 1.1 + ph) * 0.08, sy: 1 + Math.sin(t * 2.2 + ph) * 0.04, oy: -Math.abs(Math.sin(t * 1.1 + ph)) * 0.05 };
  },
  bob(t, ph) {
    return { oy: Math.sin(t * 1.5 + ph) * 0.03, rot: Math.sin(t * 0.7 + ph) * 0.05 };
  },
  breathe(t) {
    return { sy: 1 + Math.sin(t * 2.2) * 0.035, sx: 1 - Math.sin(t * 2.2) * 0.015 };
  },
};
// Creatures that dart about within their tile, the way a swarm mills around.
const DARTERS = { goblin: [0.22, 0.6, 1.3], rat: [0.26, 0.25, 0.8], kobold: [0.12, 0.8, 1.8] };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.views = new Map();
    this.ghosts = [];
    this.particles = [];
    this.texts = [];
    this.doorAnims = new Map();
    this.blots = [];
    this.shake = { t0: 0, amp: 0 };
    this.cam = { x: 0, y: 0, snap: true };
    this.hover = null;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.glyphMetrics = new Map();
    this.rng = new RNG(12345);
    this.resize();
  }

  setGame(game) {
    this.game = game;
    this.buildLevel();
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
      if (this.game) this.buildLevel(true);
    }
  }

  buildLevel(keepBlots = false) {
    const g = this.game, L = g.level;
    if (!keepBlots) this.blots = [];
    const { canvas, ctx } = renderMap(L, this.TS, this.dpr, g.seed * 31 + g.depth);
    this.map = canvas;
    this.mapCtx = ctx;
    for (const b of this.blots) inkBlot(ctx, b.x * this.TS + this.TS / 2, b.y * this.TS + this.TS / 2, this.TS, new RNG(b.seed));
    this.fog = document.createElement("canvas");
    this.fog.width = L.w;
    this.fog.height = L.h;
    this.fogCtx = this.fog.getContext("2d");
    this.fogImg = this.fogCtx.createImageData(L.w, L.h);
    if (!keepBlots) {
      this.fogA = new Float32Array(L.w * L.h).fill(1);
      this.views.clear();
      this.ghosts = [];
      this.particles = [];
      this.texts = [];
      this.doorAnims.clear();
      this.cam.snap = true;
    }
  }

  view(a) {
    let v = this.views.get(a.id);
    if (!v) {
      v = { x: a.x, y: a.y, fx: a.x, fy: a.y, t0: 0, dur: 1, phase: Math.random() * 6.28, alpha: 0, dart: { ox: 0, oy: 0, tx: 0, ty: 0, next: 0 } };
      this.views.set(a.id, v);
    }
    return v;
  }

  // ---------- events from the game -------------------------------------------

  consume(now) {
    const g = this.game, TS = this.TS;
    const evs = g.events.splice(0);
    for (const e of evs) {
      switch (e.type) {
        case "level": this.buildLevel(); break;
        case "move": {
          const v = this.view(e.actor);
          const k = clamp01((now - v.t0) / v.dur);
          v.fx = v.fx + (v.x - v.fx) * ease(k);
          v.fy = v.fy + (v.y - v.fy) * ease(k);
          v.x = e.tx; v.y = e.ty; v.t0 = now;
          v.dur = e.actor.kind === "rat" ? 90 : e.actor.kind === "zombie" ? 260 : e.actor === g.player ? 120 : 150;
          break;
        }
        case "lunge": this.view(e.actor).lunge = { dx: e.dx, dy: e.dy, t0: now }; break;
        case "hurt": {
          const v = this.view(e.actor);
          v.hurtT0 = now;
          this.floatText(`${e.amount}`, e.actor.x, e.actor.y, "#a3201a", now, e.actor.boss ? 1.4 : 1);
          this.burst(e.actor.x, e.actor.y, "ink", 7, now);
          if (e.actor === g.player) this.addShake(now, 3);
          break;
        }
        case "miss": this.floatText(e.text || "miss", e.actor.x, e.actor.y, "#6b6157", now, 0.8, true); break;
        case "heal": this.floatText(`+${e.amount}`, e.actor.x, e.actor.y, "#2d6a2c", now, 1); this.burst(e.actor.x, e.actor.y, "gold", 10, now); break;
        case "levelup": this.floatText("Level!", e.actor.x, e.actor.y, "#9a7414", now, 1.2); this.burst(e.actor.x, e.actor.y, "gold", 24, now); break;
        case "die": {
          if (e.actor === g.player) { this.addShake(now, 6); break; }
          const v = this.view(e.actor);
          this.ghosts.push({ actor: e.actor, x: v.x, y: v.y, t0: now, phase: v.phase });
          const seed = Math.floor(Math.random() * 1e9);
          this.blots.push({ x: e.x, y: e.y, seed });
          inkBlot(this.mapCtx, e.x * TS + TS / 2, e.y * TS + TS / 2, TS, new RNG(seed));
          this.burst(e.x, e.y, "ink", e.actor.boss ? 40 : 14, now);
          if (e.actor.boss) { this.burst(e.x, e.y, "gold", 60, now); this.addShake(now, 8); }
          this.views.delete(e.actor.id);
          break;
        }
        case "alert": this.view(e.actor).alertT0 = now; break;
        case "talk": this.view(e.actor).talkT0 = now; break;
        case "door": this.doorAnims.set(e.door, now); break;
        case "summon": {
          const v = this.view(e.actor);
          v.fx = e.fx; v.fy = e.fy; v.t0 = now; v.dur = 260; v.spawnT0 = now;
          break;
        }
        case "pickup":
          this.burst(e.x, e.y, "gold", 12, now);
          if (e.item.kind === "gold") this.floatText(`${e.item.amount}`, e.x, e.y, "#9a7414", now, 0.9);
          break;
        case "breath": {
          e.path.forEach((p, i) => {
            for (let k = 0; k < 12; k++) this.particles.push(this.fireParticle(p.x, p.y, now + i * 45 + k * 6));
          });
          this.addShake(now, 4);
          break;
        }
        case "smite": {
          for (const p of e.targets) this.burst(p.x, p.y, "gold", 26, now);
          this.addShake(now, 3);
          break;
        }
      }
    }
    return evs.length > 0;
  }

  // ---------- effects ----------------------------------------------------------

  addShake(now, amp) {
    if (this.reduced) amp *= 0.3;
    this.shake = { t0: now, amp: Math.max(amp, this.shake.amp * Math.max(0, 1 - (now - this.shake.t0) / 300)) };
  }

  floatText(text, x, y, color, now, size = 1, italic = false) {
    this.texts.push({ text, x: x + 0.5 + (Math.random() - 0.5) * 0.3, y, color, t0: now, size, italic });
  }

  burst(x, y, kind, n, now) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * (kind === "gold" ? 3.2 : 2.4) + 0.6;
      this.particles.push({
        kind, x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === "gold" ? 1.2 : 0.5),
        t0: now, life: kind === "gold" ? 700 + Math.random() * 400 : 450 + Math.random() * 300,
        size: kind === "gold" ? 0.07 + Math.random() * 0.06 : 0.03 + Math.random() * 0.05,
      });
    }
  }

  fireParticle(x, y, t0) {
    return {
      kind: "fire", x: x + 0.5 + (Math.random() - 0.5) * 0.6, y: y + 0.5 + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random() * 1.2, t0, life: 500 + Math.random() * 400, size: 0.16 + Math.random() * 0.16,
    };
  }

  // ---------- coordinate helpers ----------------------------------------------

  screenToTile(px, py) {
    return { x: Math.floor((px + this.cam.x) / this.TS), y: Math.floor((py + this.cam.y) / this.TS) };
  }

  busy(now) {
    for (const v of this.views.values()) if (now - v.t0 < v.dur) return true;
    return false;
  }

  // ---------- the frame --------------------------------------------------------

  frame(now) {
    const g = this.game;
    if (!g) return;
    this.consume(now);
    const ctx = this.ctx, TS = this.TS, L = g.level, t = now / 1000;
    const dt = Math.min(0.1, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    const motion = this.reduced ? 0.35 : 1;

    // Camera follows the player's displayed position.
    const pv = this.view(g.player);
    const pk = ease(clamp01((now - pv.t0) / pv.dur));
    const px = (pv.fx + (pv.x - pv.fx) * pk + 0.5) * TS, py = (pv.fy + (pv.y - pv.fy) * pk + 0.5) * TS;
    const mw = L.w * TS, mh = L.h * TS;
    const fit = (target, view, size) => (size + 64 < view ? (size - view) / 2 : Math.max(-32, Math.min(size - view + 32, target)));
    const tx = fit(px - this.vw / 2, this.vw, mw), ty = fit(py - this.vh / 2, this.vh, mh);
    if (this.cam.snap) { this.cam.x = tx; this.cam.y = ty; this.cam.snap = false; }
    const f = 1 - Math.exp(-dt * 7);
    this.cam.x += (tx - this.cam.x) * f;
    this.cam.y += (ty - this.cam.y) * f;
    const sk = Math.max(0, 1 - (now - this.shake.t0) / 300) * this.shake.amp;
    const cx = Math.round((this.cam.x + (Math.random() - 0.5) * sk) * this.dpr) / this.dpr;
    const cy = Math.round((this.cam.y + (Math.random() - 0.5) * sk) * this.dpr) / this.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = DESK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, -cx * this.dpr, -cy * this.dpr);

    // The page itself, with a soft drop shadow onto the desk.
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

    // Items: remembered once seen, so they show faintly under the fog.
    for (const it of g.items) {
      if (!g.isSeen(it.x, it.y)) continue;
      const ph = (it.id * 1.7) % 6.28;
      const oy = (Math.sin(t * 2 + ph) * 0.05 - 0.02) * motion;
      this.drawGlyph(ctx, it.glyph, (it.x + 0.5) * TS, (it.y + 0.5 + oy) * TS, TS * 0.82, it.color, {});
      if (g.isVisible(it.x, it.y) && Math.sin(t * 1.3 + ph) > 0.97) this.glint(ctx, (it.x + 0.62) * TS, (it.y + 0.3) * TS, TS);
    }

    this.drawFog(ctx, dt);

    // Creatures, back to front. Bosses overflow their tile, so they sit above
    // the fog, and ordinary creatures go on top so none hide behind a capital.
    const shown = [];
    for (const a of [...g.actors].sort((a, b) => a.y - b.y)) {
      const v = this.view(a);
      const vis = a === g.player || g.isVisible(a.x, a.y);
      v.alpha += ((vis ? 1 : 0) - v.alpha) * Math.min(1, dt * 10);
      if (v.alpha >= 0.02) shown.push([a, v]);
    }
    for (const [a, v] of shown) if (a.boss) this.drawBoss(ctx, a, v, now, t, motion);
    for (const [a, v] of shown) if (!a.boss) this.drawActor(ctx, a, v, now, t, motion);
    this.drawGhosts(ctx, now);
    this.drawParticles(ctx, now, dt);
    this.drawTexts(ctx, now);
    this.drawHover(ctx);

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
    const feet = y + (m.asc + m.desc) / 2;
    ctx.save();
    ctx.globalAlpha = p.alpha ?? 1;
    ctx.translate(x, feet);
    if (p.rot) ctx.rotate(p.rot);
    ctx.scale(p.sx ?? 1, p.sy ?? 1);
    ctx.font = `${size}px ${GLYPH_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = "rgba(247, 242, 230, 0.85)";
    ctx.strokeText(ch, 0, -m.desc);
    ctx.fillStyle = color;
    ctx.fillText(ch, 0, -m.desc);
    ctx.restore();
  }

  pose(a, v, now, t, motion) {
    const TS = this.TS;
    const style = a === this.game.player ? "breathe" : a.def.anim || "breathe";
    const p = { ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, shadow: 0, ...POSES[style](t, v.phase, a.awake) };
    p.ox *= motion; p.oy *= motion; p.rot *= motion;
    p.sx = 1 + (p.sx - 1) * motion; p.sy = 1 + (p.sy - 1) * motion;

    const dart = DARTERS[a.kind];
    if (dart && motion > 0.5) {
      const d = v.dart, [range, minT, maxT] = dart;
      if (now > d.next) {
        const r = a.awake ? range * 0.5 : range;
        d.tx = (Math.random() - 0.5) * 2 * r;
        d.ty = (Math.random() - 0.5) * 2 * r * 0.6;
        d.next = now + (minT + Math.random() * (maxT - minT)) * 1000;
      }
      const k = 1 - Math.exp(-(a.kind === "rat" ? 22 : 12) / 60);
      d.ox += (d.tx - d.ox) * k;
      d.oy += (d.ty - d.oy) * k;
      p.ox += d.ox;
      p.oy += d.oy;
    }

    // Movement tween; hoppers arc high between tiles.
    const k = clamp01((now - v.t0) / v.dur);
    const e = ease(k);
    let x = v.fx + (v.x - v.fx) * e, y = v.fy + (v.y - v.fy) * e;
    if (k < 1) p.oy -= Math.sin(Math.PI * k) * (style === "hop" ? 0.32 : 0.08) * motion;
    if (v.lunge) {
      const lk = (now - v.lunge.t0) / 200;
      if (lk < 1) {
        const s = Math.sin(Math.PI * lk) * 0.38;
        x += v.lunge.dx * s; y += v.lunge.dy * s;
      } else v.lunge = null;
    }
    let hurt = 0;
    if (v.hurtT0) {
      hurt = Math.max(0, 1 - (now - v.hurtT0) / 320);
      p.ox += Math.sin(now * 0.11) * 0.07 * hurt;
    }
    if (v.spawnT0) {
      const sk = clamp01((now - v.spawnT0) / 320);
      const pop = sk < 1 ? sk * (1 + Math.sin(sk * Math.PI) * 0.5) : 1;
      p.sx *= pop; p.sy *= pop;
    }
    return { cx: (x + 0.5 + p.ox) * TS, cy: (y + 0.5 + p.oy) * TS, baseY: (y + 0.5) * TS, bx: (x + 0.5) * TS, p, hurt };
  }

  drawActor(ctx, a, v, now, t, motion) {
    const TS = this.TS, g = this.game;
    const { cx, cy, bx, baseY, p, hurt } = this.pose(a, v, now, t, motion);
    // Pencil shadow on the floor, smaller when airborne.
    ctx.save();
    ctx.globalAlpha = 0.16 * v.alpha;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(bx + (cx - bx) * 0.6, baseY + TS * 0.36, TS * 0.26 * (1 - p.shadow * 0.35), TS * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    let color = a === g.player ? COLORS.player : a.friendly ? COLORS.friendly : a.awake ? COLORS.awake : COLORS.unaware;
    if (hurt > 0.4) color = "#c4321f";
    const size = TS * (a === g.player ? 0.95 : 1.05);
    this.drawGlyph(ctx, a.glyph, cx, cy, size, color, { ...p, alpha: v.alpha });

    if (v.alertT0 && now - v.alertT0 < 1000) {
      const k = (now - v.alertT0) / 1000;
      this.drawGlyph(ctx, "!", cx, cy - TS * (0.75 + k * 0.25), TS * 0.6, "#b0241a", { alpha: (1 - k) * v.alpha, sy: 1 + Math.sin(k * 20) * 0.1 * (1 - k) });
    }
    if (v.talkT0 && now - v.talkT0 < 1600) {
      const k = (now - v.talkT0) / 1600;
      ctx.save();
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.font = `italic ${TS * 0.5}px ${TEXT_FONT}`;
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.friendly;
      ctx.fillText("❧", cx, cy - TS * 0.7 - k * TS * 0.2);
      ctx.restore();
    }
    // A thin health stroke once a creature is wounded.
    if (a !== g.player && !a.friendly && a.hp < a.maxHp) {
      const w = TS * 0.7, f = Math.max(0, a.hp / a.maxHp);
      ctx.save();
      ctx.globalAlpha = 0.8 * v.alpha;
      ctx.fillStyle = "rgba(27,24,21,0.25)";
      ctx.fillRect(bx - w / 2, baseY + TS * 0.44, w, 2);
      ctx.fillStyle = "#a3201a";
      ctx.fillRect(bx - w / 2, baseY + TS * 0.44, w * f, 2);
      ctx.restore();
    }
  }

  drawBoss(ctx, a, v, now, t, motion) {
    const TS = this.TS;
    const { bx, baseY, hurt } = this.pose(a, v, now, t, motion);
    const size = TS * 2.2;
    ctx.save();
    ctx.globalAlpha = v.alpha;
    drawVersal(ctx, {
      letter: a.glyph, motif: a.def.motif, x: bx, y: baseY - TS * 0.25, size, t: t * motion + v.phase,
      awake: a.awake, flash: hurt,
      onFlame: (fx, fy) => {
        if (Math.random() < 0.3) this.particles.push({ kind: "fire", x: fx / TS, y: fy / TS, vx: (Math.random() - 0.5) * 0.6, vy: -0.8, t0: now, life: 400, size: 0.08 });
      },
    });
    ctx.restore();
    if (a.awake) {
      const w = TS * 2, f = Math.max(0, a.hp / a.maxHp), y = baseY + TS * 1.05;
      ctx.save();
      ctx.globalAlpha = v.alpha;
      ctx.fillStyle = "rgba(27,24,21,0.3)";
      ctx.fillRect(bx - w / 2, y, w, 3);
      ctx.fillStyle = "#a3201a";
      ctx.fillRect(bx - w / 2, y, w * f, 3);
      ctx.font = `italic ${TS * 0.36}px ${TEXT_FONT}`;
      ctx.textAlign = "center";
      ctx.fillStyle = INK;
      ctx.fillText(`the ${a.name}`, bx, y + TS * 0.42);
      ctx.restore();
    }
  }

  drawGhosts(ctx, now) {
    const TS = this.TS;
    this.ghosts = this.ghosts.filter((gh) => now - gh.t0 < 600);
    for (const gh of this.ghosts) {
      const k = (now - gh.t0) / 600;
      const x = (gh.x + 0.5) * TS, y = (gh.y + 0.5) * TS;
      if (gh.actor.boss) {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        drawVersal(ctx, { letter: gh.actor.glyph, motif: gh.actor.def.motif, x, y: y - TS * 0.25, size: TS * 2.2 * (1 + k * 0.4), t: now / 1000, awake: true, flash: 1 - k });
        ctx.restore();
      } else {
        this.drawGlyph(ctx, gh.actor.glyph, x, y - k * TS * 0.3, TS * 1.05 * (1 + k * 0.5), "#8a2016", { alpha: 1 - k, rot: (k * 0.6) * (gh.phase > 3 ? 1 : -1) });
      }
    }
  }

  drawParticles(ctx, now, dt) {
    const TS = this.TS;
    this.particles = this.particles.filter((p) => now - p.t0 < p.life);
    ctx.save();
    for (const p of this.particles) {
      const age = now - p.t0;
      if (age < 0) continue;
      const k = age / p.life;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "ink") p.vy += 6 * dt;
      if (p.kind === "gold") { p.vx *= 0.96; p.vy = p.vy * 0.96 + 1.5 * dt; }
      const x = p.x * TS, y = p.y * TS;
      if (p.kind === "fire") {
        const r = p.size * TS * (0.6 + k * 1.2);
        const col = k < 0.25 ? "251, 227, 154" : k < 0.5 ? "240, 138, 36" : k < 0.75 ? "192, 40, 27" : "70, 60, 55";
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.fillStyle = `rgb(${col})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "gold") {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = k < 0.5 ? "#e7c460" : "#b88a24";
        const r = p.size * TS * (1 - k * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - r, y - r * 0.12, r * 2, r * 0.24);
      } else {
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(x, y, p.size * TS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  glint(ctx, x, y, TS) {
    ctx.save();
    ctx.strokeStyle = "#c79a2e";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - TS * 0.12, y); ctx.lineTo(x + TS * 0.12, y);
    ctx.moveTo(x, y - TS * 0.12); ctx.lineTo(x, y + TS * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  drawDoors(ctx, now) {
    const g = this.game, TS = this.TS;
    for (const door of g.level.doors.values()) {
      if (!g.isSeen(door.x, door.y)) continue;
      const cx = (door.x + 0.5) * TS, cy = (door.y + 0.5) * TS;
      const t0 = this.doorAnims.get(door);
      const k = door.open ? (t0 === undefined ? 1 : ease(clamp01((now - t0) / 280))) : 0;
      ctx.save();
      ctx.translate(cx, cy);
      // Passage runs horizontally for axis "h": the slab stands vertical across it.
      if (door.axis === "v") ctx.rotate(Math.PI / 2);
      const L = TS * 0.94, W = TS * 0.24;
      ctx.translate(0, -L / 2);
      ctx.rotate(-k * Math.PI / 2);
      ctx.fillStyle = PAPER;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.fillRect(-W / 2, 0, W, L);
      ctx.strokeRect(-W / 2, 0, W, L);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, L * 0.12); ctx.lineTo(0, L * 0.88);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFog(ctx, dt) {
    const g = this.game, L = g.level, d = this.fogImg.data, a = this.fogA;
    const rate = Math.min(1, dt * 6);
    for (let i = 0; i < a.length; i++) {
      const target = g.visible[i] ? 0 : g.seen[i] ? 0.52 : 1;
      a[i] += (target - a[i]) * rate;
      d[i * 4] = 247; d[i * 4 + 1] = 242; d[i * 4 + 2] = 230;
      d[i * 4 + 3] = Math.round(a[i] * 255);
    }
    this.fogCtx.putImageData(this.fogImg, 0, 0);
    ctx.save();
    // Plain bilinear: the "high" filter rings and leaves bright halos at the fog edge.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.drawImage(this.fog, 0, 0, L.w, L.h, 0, 0, L.w * this.TS, L.h * this.TS);
    ctx.restore();
  }

  drawTexts(ctx, now) {
    const TS = this.TS;
    this.texts = this.texts.filter((tx) => now - tx.t0 < 1000);
    ctx.save();
    ctx.textAlign = "center";
    for (const tx of this.texts) {
      const k = (now - tx.t0) / 1000;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `${tx.italic ? "italic " : ""}${Math.round(TS * 0.55 * tx.size)}px ${TEXT_FONT}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(247,242,230,0.9)";
      const y = (tx.y + 0.1 - k * 0.7) * TS;
      ctx.strokeText(tx.text, tx.x * TS, y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x * TS, y);
    }
    ctx.restore();
  }

  drawHover(ctx) {
    const g = this.game, h = this.hover, TS = this.TS;
    if (!h || !g.isSeen(h.x, h.y)) return;
    const a = g.isVisible(h.x, h.y) && g.actorAt(h.x, h.y);
    const it = g.itemAt(h.x, h.y);
    let label = null;
    if (a) label = a === g.player ? "you" : a.friendly ? a.name : `${a.boss ? "the " : "a "}${a.name}${a.awake ? "" : ", unaware"}`;
    else if (it) label = it.kind === "gold" ? `${it.amount} gold` : it.name;
    else if (g.tileAt(h.x, h.y) === T.STAIRS_DOWN) label = "a stair down";
    else if (g.tileAt(h.x, h.y) === T.STAIRS_UP) label = "the way you came";
    if (!label) return;
    ctx.save();
    ctx.font = `italic ${Math.round(TS * 0.42)}px ${TEXT_FONT}`;
    ctx.textAlign = "center";
    const x = (h.x + 0.5) * TS, y = (h.y - (a?.boss ? 1.4 : 0.25)) * TS;
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(247,242,230,0.92)";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.fillRect(x - w / 2, y - TS * 0.42, w, TS * 0.56);
    ctx.strokeRect(x - w / 2, y - TS * 0.42, w, TS * 0.56);
    ctx.fillStyle = INK;
    ctx.fillText(label, x, y);
    ctx.restore();
  }
}
