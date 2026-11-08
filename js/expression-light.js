// The view's light (spec/light-set.md, L4): the player's lamp cast against
// the walls in ragged bands, the level's lights and the lanterns carried
// about, inked onto the map, and what it says how lit a point is
// (`lightAt`; the level's lights and lanterns alone, `sourcesAt`). Drawn
// from the same numbers as the rules' light (js/rules/light.js,
// lights.json), and checked against it square by square
// (tests/browser/light.mjs). Methods of the view (expression.js), joined to
// it there.

// (The view's constants and helpers it shares: expression.js. Used only
// inside the methods, so importing them from the file that imports this one
// is safe.)
import { LAMPS, LAMP_SEE, R, blank, cellRng, clamp01, unite } from "./expression.js";

// How many times finer than the map points the lights' picture is drawn
// without the GPU (lampPicture).
const LAMP_FINE = 3;

export const lightMethods = {
  // The candle, drawn flat like the rest of the map. For each place the
  // player stands: what the light reaches (seen from a few points across
  // the flame: full, dim or dark by how many see it; and a rim of the rock
  // past the wall faces it falls on); and the bands, full, dim and dark.
  // All the edges ragged by noise fixed to the map, so nothing wavers. The
  // bands in flat tones, or (`lightFill` "strokes") all paper with the
  // dim and dark bands hatched; and perhaps an inked line where the light
  // changes (`lightEdge`). Each frame, the whole flickers in brightness and
  // (unless it is inked, as the ink stays put) grows and shrinks a little
  // about the player.
  castLight(px, py, t, quick = false) {
    const { S, TS } = this, rag = S.lightRag * TS;
    // The bands' outer edges: full, dim and dark.
    const rFull = (S.lightFull - 0.5) * TS, rad = rFull + S.lightDim * TS, out = this.lightOut() * TS;
    const lastBox = this.lightBox;
    this.lightBox = null;
    if (!(out > 0)) return;
    const strokes = S.lightFill === "strokes", inked = strokes || S.lightEdge > 0;
    // Drawn on a square just big enough for the light round the player.
    const half = (out + rag) * (1 + S.flickerSize) + TS, res = Math.min(this.scale, 1024 / (2 * half));
    const size = Math.ceil(2 * half * res), box = { x: px - half, y: py - half, w: 2 * half, res };
    const toBox = (g) => g.setTransform(res, 0, 0, res, -box.x * res, -box.y * res);
    if (!this.lightReach || this.lightReach.width !== size) {
      for (const k of ["lightReach", "lightCanvas", "lightInk", "lightTmp", "lightMask"]) this[k] = blank(size, size);
      this.lightFrom = null;
    }
    if (!this.lightFrom || this.lightFrom[0] !== px || this.lightFrom[1] !== py) {
      // (The light as it was kept, `lightPrev`, for the GPU to fade from as
      // the player steps: so shadows don't jump.)
      if (this.lightFrom && lastBox) {
        const was = this.lightReach;
        this.lightReach = this.lightReachPrev?.width === size ? this.lightReachPrev : blank(size, size);
        this.lightReachPrev = was;
        this.lightPrev = { box: lastBox, from: this.lightFrom, t: performance.now(), casts: this.lightCasts ?? 0, quick };
      } else this.lightPrev = null;
      // How much of the light reaches each point: in red, how many of the
      // flame's points see it (each adding 51); in green, the share of the
      // depths past the walls' faces the rim reaches, from the flame's
      // middle (opaque fills, added).
      const f = S.flame * TS, depths = 5, p = this.lightWalls.visible(px, py, half);
      const pts = f > 0 ? [[f, 0], [-f, 0], [0, f], [0, -f]] : [];
      const g = this.lightReach.getContext("2d", { willReadFrequently: true });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, size, size);
      toBox(g);
      g.globalCompositeOperation = "lighter";
      g.fillStyle = `rgb(${f > 0 ? 51 : 255}, 0, 0)`;
      g.fill(p);
      for (const [dx, dy] of pts) g.fill(this.lightWalls.visible(px + dx, py + dy, half));
      if (S.lightWall > 0) {
        g.fillStyle = `rgb(0, 51, 0)`;
        for (let i = 1; i <= depths; i++) g.fill(p.beyond((S.lightWall * TS * i) / depths));
      }
      g.globalCompositeOperation = "source-over";
      // Each point's band (3 full, 2 dim, 1 dark, 0 none): the least of what
      // reaches it and its band by distance. What reaches it: on the floor,
      // full if the whole flame sees it, dim if most of it does, dark if
      // some; in the rock, the most of that and the rim (full where most of
      // the rim reaches, dim at its edge, the threshold wandering with a
      // fine noise). As tones, or all paper if hatched.
      const reachImg = g.getImageData(0, 0, size, size), rd = reachImg.data, level = new Uint8Array(size * size);
      const tone = strokes ? [0, 255, 255, 255] : [0, Math.round(255 * S.darkLevel), Math.round(255 * S.dimLevel), 255];
      const nearEdge = (d) => Math.abs(d - rFull) < rag || Math.abs(d - rad) < rag || Math.abs(d - out) < rag;
      for (let y = 0; y < size; y++) {
        const my = box.y + (y + 0.5) / res;
        for (let x = 0; x < size; x++) {
          const p = y * size + x, i = p * 4, mx = box.x + (x + 0.5) / res;
          let n = -1, m = -1;
          const noiseAt = () => (n < 0 ? (n = this.fine(mx, my)) : n);
          const wander = () => (m < 0 ? (m = 0.65 * noiseAt() + 0.35 * this.noise(mx, my)) : m);
          // The shadows' edges, which run out from the player, ragged like
          // the bands': near one, what reaches a point a little to the side,
          // by the same noise.
          let j = i;
          const dx = mx - px, dy = my - py, d = Math.sqrt(dx * dx + dy * dy);
          if (rag > 0 && d > TS) {
            const sx = (-dy / d) * rag * res, sy = (dx / d) * rag * res;
            const at = (k) => {
              const qx = Math.round(x + sx * k), qy = Math.round(y + sy * k);
              return qx < 0 || qy < 0 || qx >= size || qy >= size ? -1 : (qy * size + qx) * 4;
            };
            const a = at(1), b = at(-1), same = (q) => q >= 0 && rd[q] === rd[i] && rd[q + 1] === rd[i + 1];
            if (!same(a) || !same(b)) j = at(2 * wander() - 1);
          }
          const seen = j < 0 ? 0 : Math.round(rd[j] / 51), rim = j < 0 ? 0 : rd[j + 1] / 255;
          let reached = seen >= 5 ? 3 : seen >= 3 ? 2 : seen >= 1 ? 1 : 0;
          const fx = Math.floor((mx * R) / TS), fy = Math.floor((my * R) / TS);
          if (!(fx >= 0 && fy >= 0 && fx < this.mw && fy < this.mh && this.floor[fy * this.mw + fx]) && rim > 0.03)
            reached = Math.max(reached, rim >= 0.97 || rim > 0.25 + 0.45 * noiseAt() ? 3 : rim > 0.08 + 0.2 * noiseAt() ? 2 : 0);
          let band = 0;
          if (reached) {
            if (d < out + rag) {
              const e = nearEdge(d) ? d + rag * (2 * wander() - 1) : d;
              band = e < rFull ? 3 : e < rad ? 2 : e < out ? 1 : 0;
            }
          }
          level[p] = Math.min(reached, band);
          rd[i + 3] = tone[level[p]];
        }
      }
      g.putImageData(reachImg, 0, 0);
      this.inkLight(level, box, size, toBox);
      this.lightFrom = [px, py];
      this.lightCasts = (this.lightCasts ?? 0) + 1;
    }
    const wave = (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2)) / 2;
    const bright = 1 - S.flicker * 0.25 * (wave + 1) / 2;
    // The size flickers too, on a wave of its own.
    const swell = (Math.sin(t * 5.1) + 0.5 * Math.sin(t * 8.9 + 0.7) + 0.3 * Math.sin(t * 13.3 + 2)) / 1.8;
    const k = inked ? 1 : 1 + S.flickerSize * swell, cx = (px - box.x) * res, cy = (py - box.y) * res;
    const g = this.lightCanvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.globalAlpha = bright;
    g.setTransform(k, 0, 0, k, cx * (1 - k), cy * (1 - k));
    g.drawImage(this.lightReach, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    this.lightBox = box;
  },

  // The light's ink, if it has any (onto `lightInk`, from the bands in
  // `level`): hatched, strokes one way over the dim and dark bands and
  // crossed the other way over the dark (on the floor, fixed to the map);
  // and a line, its width wandering, on the floor where the band changes.
  inkLight(level, box, size, toBox) {
    const { S, TS, mw } = this, res = box.res, ig = this.lightInk.getContext("2d");
    ig.setTransform(1, 0, 0, 1, 0, 0);
    ig.clearRect(0, 0, size, size);
    this.lightInked = S.lightFill === "strokes" || S.lightEdge > 0;
    const mg = this.lightMask.getContext("2d"), tmp = this.lightTmp, tg = tmp.getContext("2d");
    const maskOf = (keep) => {
      const im = new ImageData(size, size);
      for (let p = 0; p < size * size; p++) if (keep(level[p])) im.data[p * 4 + 3] = 255;
      mg.putImageData(im, 0, 0);
    };
    if (S.lightFill === "strokes") {
      // Strokes in each tile from its own random numbers, so they stay put.
      const tx0 = Math.floor(box.x / TS), ty0 = Math.floor(box.y / TS), tx1 = Math.ceil((box.x + box.w) / TS), ty1 = Math.ceil((box.y + box.w) / TS);
      for (const [cross, keep] of [[false, (l) => l === 1 || l === 2], [true, (l) => l === 1]]) {
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, size, size);
        toBox(tg);
        tg.save();
        tg.clip(this.floorPath, "evenodd");
        tg.strokeStyle = S.seeHatchC;
        tg.lineCap = "round";
        tg.globalAlpha = 0.85;
        for (let ty = ty0; ty < ty1; ty++)
          for (let tx = tx0; tx < tx1; tx++) {
            const r = cellRng(tx, ty, this.seed ^ (cross ? 0x5a : 0xa5));
            for (let k = 0; k < 5; k++) {
              const x = (tx + r()) * TS, y = (ty + r()) * TS, a = (cross ? 0.85 : -0.8) + (r() - 0.5) * 0.3;
              const len = (0.35 + 0.3 * r()) * TS, bow = (r() - 0.5) * 0.12 * TS, c = Math.cos(a), sn = Math.sin(a);
              tg.lineWidth = TS * (0.04 + 0.03 * r());
              tg.beginPath();
              tg.moveTo(x - (c * len) / 2, y - (sn * len) / 2);
              tg.quadraticCurveTo(x - sn * bow, y + c * bow, x + (c * len) / 2, y + (sn * len) / 2);
              tg.stroke();
            }
          }
        tg.restore();
        maskOf(keep);
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.globalCompositeOperation = "destination-in";
        tg.drawImage(this.lightMask, 0, 0);
        tg.globalCompositeOperation = "source-over";
        ig.drawImage(tmp, 0, 0);
      }
    }
    if (S.lightEdge > 0) {
      const im = new ImageData(size, size), d = im.data, ink = [1, 3, 5].map((i) => parseInt(S.seeWallC.slice(i, i + 2), 16));
      for (let y = 0; y < size - 1; y++) {
        const my = box.y + (y + 0.5) / res, fy = Math.floor((my * R) / TS);
        for (let x = 0; x < size - 1; x++) {
          const p = y * size + x, l = level[p];
          if (l === level[p + 1] && l === level[p + size]) continue;
          const mx = box.x + (x + 0.5) / res, fx = Math.floor((mx * R) / TS);
          if (fx < 0 || fy < 0 || fx >= mw || fy >= this.mh || !this.floor[fy * mw + fx]) continue;
          const rr = TS * 0.03 * res * (1.5 - this.fine(mx, my)), ri = Math.ceil(rr);
          for (let dy = -ri; dy <= ri; dy++)
            for (let dx = -ri; dx <= ri; dx++) {
              const qx = x + dx, qy = y + dy;
              if (dx * dx + dy * dy > rr * rr || qx < 0 || qy < 0 || qx >= size || qy >= size) continue;
              const q = (qy * size + qx) * 4;
              d[q] = ink[0];
              d[q + 1] = ink[1];
              d[q + 2] = ink[2];
              d[q + 3] = 255;
            }
        }
      }
      mg.putImageData(im, 0, 0);
      ig.globalAlpha = Math.min(1, S.lightEdge);
      ig.drawImage(this.lightMask, 0, 0);
      ig.globalAlpha = 1;
    }
  },

  // How far the light reaches, in tiles from the player's middle.
  lightOut() {
    const S = this.S;
    return S.lightFull - 0.5 + S.lightDim + S.lightDark;
  },

  // The light, onto `g` (its transform the world's).
  drawLightBox(g) {
    const b = this.lightBox;
    if (b) g.drawImage(this.lightCanvas, b.x, b.y, b.w, b.w);
  },

  // The box round the level's lights that light anything in sight, in view,
  // on a canvas with transform `T`, in whole pixels, and that in map units;
  // null if none.
  lampBox(T, canvas) {
    const TS = this.TS;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of this.lampsSeen ?? []) {
      x0 = Math.min(x0, (l.x0 - 1) * TS);
      y0 = Math.min(y0, (l.y0 - 1) * TS);
      x1 = Math.max(x1, (l.x1 + 1) * TS);
      y1 = Math.max(y1, (l.y1 + 1) * TS);
    }
    if (!(x1 > x0)) return null;
    const X0 = Math.max(0, Math.floor(T.a * x0 + T.e)), Y0 = Math.max(0, Math.floor(T.d * y0 + T.f));
    const X1 = Math.min(canvas.width, Math.ceil(T.a * x1 + T.e)), Y1 = Math.min(canvas.height, Math.ceil(T.d * y1 + T.f));
    if (!(X1 > X0 && Y1 > Y0)) return null;
    return { x0: X0, y0: Y0, w: X1 - X0, h: Y1 - Y0, view: { x: (X0 - T.e) / T.a, y: (Y0 - T.f) / T.d, w: (X1 - X0) / T.a, h: (Y1 - Y0) / T.d } };
  },

  // The level's lights (campfires, braziers, candles), each cast against the
  // walls, posts and shut doors and lighting the rim of rock past them, in
  // bands with ragged edges like the candle's. As `lampLevel` (mask
  // resolution), unbanded (`lampSoft`, for the screen to band smoothly: see
  // lampPicture), and what it lets the player see from afar (`lampSight`). Each light, for
  // finding those in sight: `lamps` (each the box it lights { x0, y0, x1,
  // y1 }, in squares, and some of the map points it lights to look for,
  // `cells`).
  //
  // And the lanterns carried about (`this.lanterns`, squares { x, y }: the
  // cultists'), laid over the rest, which is kept (`lampBase`) so that only
  // they need laying again as they move (`onlyLanterns`).
  lightLamps(onlyLanterns = false, dirty = null) {
    const { mw, mh, TS, S, level: L } = this, lanterns = this.lanterns ?? [], base = onlyLanterns ? this.lampBase : null;
    const keep = base && dirty && this.lampSight ? { sight: this.lampSight } : null;
    const lights = base ? [] : L.lights ?? [];
    this.lampLevel = this.lampSoft = this.lampSight = null;
    this.lamps = base ? base.lamps.slice() : [];
    if (!base) this.lampBase = null;
    if (!lights.length && !lanterns.length && !this.lamps.length) return;
    const level = (this.lampLevel = base ? base.level.slice() : new Float32Array(mw * mh));
    const soft = (this.lampSoft = base ? base.soft.slice() : new Float32Array(mw * mh));
    // (Every fourth map point each way that the light being laid lights.)
    let cells;
    const mark = (x, y, j, v, u) => {
      if (v > level[j]) level[j] = v;
      if (u > soft[j]) soft[j] = u;
      if (v > 0 && !(x & 3) && !(y & 3)) cells.add(j);
    };
    const rag = (mx, my) => S.lightRag * (2 * (0.65 * this.fine(mx, my) + 0.35 * this.noise(mx, my)) - 1);
    // The light unbanded, for the screen to band smoothly between the map
    // points (`lampSoft`): falling steadily with how far, `e` (squares), and
    // crossing halfway between two bands' levels just where the bands part
    // (as js/gpu.js's lampBands reads it); `B` the light's bands.
    const unbanded = (e, B) => {
      const k = [[0, 1], [B.full, (S.dimLevel + 1) / 2], [B.full + B.dim, (S.darkLevel + S.dimLevel) / 2], [B.full + B.dim + B.dark, S.darkLevel / 2], [B.full + B.dim + B.dark + 0.5, 0]];
      for (let i = 1; i < k.length; i++) if (e < k[i][0]) return k[i - 1][1] + ((e - k[i - 1][0]) / (k[i][0] - k[i - 1][0])) * (k[i][1] - k[i - 1][1]);
      return 0;
    };
    // Lights the map points round (x, y) (squares) in line of sight within
    // `out`, `band(e)` of how far each is (`dist(mx, my)`, squares), raggedly,
    // `B` its bands. (Past the walls in view only into the rock, not past
    // shut doors.)
    const shine = (x, y, out, dist, band, B) => {
      const view = this.lampWalls.visible(x * TS, y * TS, (out + 0.5) * TS), rim = view.beyond(S.lightWall * TS);
      const m = Math.ceil((out + 1) * R), cx = Math.floor(x * R), cy = Math.floor(y * R);
      const x0 = Math.max(0, cx - m), y0 = Math.max(0, cy - m), x1 = Math.min(mw, cx + m), y1 = Math.min(mh, cy + m), bw = x1 - x0, bh = y1 - y0;
      const c = blank(bw, bh), g = c.getContext("2d", { willReadFrequently: true });
      g.setTransform(R / TS, 0, 0, R / TS, -x0, -y0);
      g.fillStyle = "#f00";
      g.fill(rim);
      g.fillStyle = "#0f0";
      g.fill(view);
      const a = g.getImageData(0, 0, bw, bh).data;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const b = ((y - y0) * bw + (x - x0)) * 4, j = y * mw + x;
          if (a[b + 3] < 128 || (a[b + 1] < 128 && this.floor[j])) continue;
          const mx = (x + 0.5) * (TS / R), my = (y + 0.5) * (TS / R);
          const e = dist(mx, my) + rag(mx, my);
          mark(x, y, j, band(e), unbanded(e, B));
        }
    };
    for (const l of lights) {
      const B = LAMPS[l.kind] ?? LAMPS.fire, out = B.full + B.dim + B.dark;
      cells = new Set();
      shine(l.x, l.y, out, (mx, my) => Math.hypot(mx / TS - l.x, my / TS - l.y), (e) => (e < B.full ? 1 : e < B.full + B.dim ? S.dimLevel : e < out ? S.darkLevel : 0), B);
      this.lamps.push({ x0: l.x - out, y0: l.y - out, x1: l.x + out, y1: l.y + out, cells: [...cells], fire: { x: l.x, y: l.y, out, full: B.full, ph: this.lamps.length * 2.4 } });
    }
    if (!base) this.lampBase = { level: level.slice(), soft: soft.slice(), lamps: this.lamps.slice() };
    // The lanterns: steady, in their own bands (LIGHTS.lantern).
    const LB = LAMPS.lantern, lout = LB.full + LB.dim + LB.dark;
    for (const l of lanterns) {
      cells = new Set();
      const x = l.x + 0.5, y = l.y + 0.5;
      shine(x, y, lout, (mx, my) => Math.hypot(mx / TS - x, my / TS - y), (e) => (e < LB.full ? 1 : e < LB.full + LB.dim ? S.dimLevel : e < lout ? S.darkLevel : 0), LB);
      this.lamps.push({ x0: x - lout, y0: y - lout, x1: x + lout, y1: y + lout, cells: [...cells], lantern: true });
    }
    // (Only the box `dirty` painted again into the pictures `keep`, when
    // only the lanterns moved.)
    const [bx0, by0, bx1, by1] = keep ? dirty.map((v, i) => Math.max(0, Math.min(i % 2 ? mh : mw, v))) : [0, 0, mw, mh];
    this.lampPicDirty = keep && this.lampPic && this.lampPicDirty !== true ? unite(this.lampPicDirty, [bx0, by0, bx1, by1]) : true;
    const pic = (level, alpha, c) => {
      const w = bx1 - bx0, h = by1 - by0;
      c ??= blank(mw, mh);
      if (w <= 0 || h <= 0) return c;
      const im = new ImageData(w, h);
      for (let y = by0; y < by1; y++)
        for (let x = bx0; x < bx1; x++) im.data[((y - by0) * w + (x - bx0)) * 4 + 3] = Math.round(255 * alpha(level[y * mw + x]));
      c.getContext("2d").putImageData(im, bx0, by0);
      return c;
    };
    this.lampSight = pic(level, (v) => clamp01(v / Math.max(0.01, S.darkLevel)), keep?.sight);
  },

  // The lights as a picture to show the lit map through, for drawing without
  // the GPU: banded from the light unbanded (`lampSoft`), read smoothly
  // between the map points, LAMP_FINE times finer than them, so that each
  // band's edge is a smooth line, not a staircase of map points (as the GPU
  // draws it, js/gpu.js lampBands). Made when first asked for, and again
  // where the light changed (`lampPicDirty`). Null if there are no lights.
  lampPicture() {
    const { mw, mh, S } = this, soft = this.lampSoft;
    if (!soft) return (this.lampPic = null);
    const F = LAMP_FINE, W = mw * F, H = mh * F;
    if (!this.lampPic || this.lampPic.width !== W || this.lampPic.height !== H) this.lampPicDirty = true;
    const box = this.lampPicDirty;
    if (!box) return this.lampPic;
    this.lampPicDirty = null;
    const c = box === true ? (this.lampPic = blank(W, H)) : this.lampPic;
    const [x0, y0, x1, y1] = box === true ? [0, 0, mw, mh] : box, w = (x1 - x0) * F, h = (y1 - y0) * F;
    if (w <= 0 || h <= 0) return c;
    const dk = S.darkLevel, dm = S.dimLevel, t1 = dk / 2, t2 = (dk + dm) / 2, t3 = (dm + 1) / 2;
    const A = [0, Math.round(255 * dk), Math.round(255 * dm), 255];
    const im = new ImageData(w, h), d = im.data;
    for (let Y = 0; Y < h; Y++) {
      const fy = (y0 * F + Y + 0.5) / F - 0.5, ky = Math.max(0, Math.min(mh - 1, Math.floor(fy))), ky1 = Math.min(mh - 1, ky + 1), ty = Math.max(0, Math.min(1, fy - ky));
      for (let X = 0; X < w; X++) {
        const fx = (x0 * F + X + 0.5) / F - 0.5, kx = Math.max(0, Math.min(mw - 1, Math.floor(fx))), kx1 = Math.min(mw - 1, kx + 1), tx = Math.max(0, Math.min(1, fx - kx));
        const a = soft[ky * mw + kx], b = soft[ky * mw + kx1], e = soft[ky1 * mw + kx], f = soft[ky1 * mw + kx1];
        const v = (a + (b - a) * tx) * (1 - ty) + (e + (f - e) * tx) * ty;
        d[(Y * w + X) * 4 + 3] = A[v < t1 ? 0 : v < t2 ? 1 : v < t3 ? 2 : 3];
      }
    }
    c.getContext("2d").putImageData(im, x0 * F, y0 * F);
    return c;
  },

  // The lanterns carried about moved (squares { x, y }): their light laid
  // again, and the view taken again where it changed. True if it did.
  setLanterns(list) {
    const key = list.map((l) => `${l.x},${l.y}`).join(";");
    if (key === (this.lanternKey ?? "")) return false;
    const B = LAMPS.lantern, out = Math.ceil(B.full + B.dim + B.dark) + 1, moved = [...(this.lanterns ?? []), ...list], p = this.player;
    let dirty = null;
    for (const l of moved) dirty = unite(dirty, [(l.x - out) * R, (l.y - out) * R, (l.x + out + 1) * R, (l.y + out + 1) * R]);
    this.changed = unite(this.changed, dirty);
    this.lanternKey = key;
    this.lanterns = list;
    this.lightLamps(true, dirty);
    this.doorsChanged = (this.doorsChanged ?? 0) + 1;
    // (The view taken again only if the player might see their light.)
    if (p && moved.some((l) => Math.max(Math.abs(l.x - p.x), Math.abs(l.y - p.y)) <= LAMP_SEE + out)) {
      this.sightFrom = this.lightFrom = null;
      this.learn(p.x, p.y);
    }
    return true;
  },

  // How lit the map point (x, y) is, 0 to 1, roughly: by which band of the
  // light it is in, if in sight.
  lightAt(x, y) {
    const S = this.S, from = this.lightFrom ?? [-1e9, -1e9], TS = this.TS, r = (S.lightFull - 0.5 + S.lightDim) * TS;
    const d = Math.hypot(x - from[0], y - from[1]);
    return Math.max(this.sourcesAt(x, y), d < (S.lightFull - 0.5) * TS ? 1 : d < r ? S.dimLevel : d < this.lightOut() * TS ? S.darkLevel : 0) * this.inSight(x, y);
  },

  // The level's lights and the lanterns at the map point (x, y), 0 to 1,
  // without the player's own (lit, the lamp; out, the faint glow of their
  // dark sight, which is sight, not light).
  sourcesAt(x, y) {
    const i = Math.floor((x * R) / this.TS), k = Math.floor((y * R) / this.TS);
    return this.lampLevel && i >= 0 && k >= 0 && i < this.mw && k < this.mh ? this.lampLevel[k * this.mw + i] : 0;
  }
};
