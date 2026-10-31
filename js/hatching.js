// Stone hatching for the rock around the rooms, ported from the "Cells with
// zones" mockup (mockups/hatching.html, panel H2).
//
// The rock near the walls is cut into triangles (some merged into four-sided
// cells), stretched along a direction that leans off "straight away from the
// wall". Each cell is filled with a few strokes parallel to one of its edges;
// after 3-5 strokes the rest of the cell is cut off and filled in another
// direction, so groups stay small and end against each other. No strokes run
// along a wall, and neighbouring cells are never parallel.

// The settings chosen in the mockup, in pixels at 32 px tiles; `hatchSettings`
// scales the pixel values to the actual tile size.
// The hatching's strokes' random numbers: the level's seed, this mixed in.
export const STROKES_SEED = 0x5011d;

export const HATCH = {
  weight: 3.6, vary: 0.15, curve: 0.03, wobble: 0.4, maxLines: 4, spacing: 8.75,
  depth: 1.6, wallang: 0.15, tri: 0.9, stretch: 2, quads: 0.4, seam: 0,
  fan: 0.35, angjit: 0.025, gapvar: 0.13, zonew: 0, radtol: 0.75, nearz: 0.85,
  encl: 2.6, nearw: 0.7, flecks: 1, pstart: 1, pmid: 1.1, pend: 0.65,
};
const PIXEL_KEYS = ["weight", "wobble", "spacing"];

export function hatchSettings(TS) {
  const o = { ...HATCH };
  for (const k of PIXEL_KEYS) o[k] *= TS / 32;
  return o;
}

// geo: { W, H, TS, walls: [{x0, y0, x1, y1, nx, ny}] with (nx, ny) pointing
// into the rock, distAt(x, y): distance to the nearest floor (0 on floor) }.
export function hatchRock(ctx, geo, o, rng) {
  const { W, H, TS, walls, distAt } = geo;
  const sp = o.spacing, r = o.tri * TS;
  const stretch = Math.sqrt(o.stretch), along = r * stretch, across = r / stretch;

  // Which points may be hatched: rock within a noisy depth of the floor.
  const depthNoise = valueNoise(rng, W, H, TS * 3.5);
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const d = distAt(x, y);
    return d > 0 && d < o.depth * TS * (0.55 + 0.9 * depthNoise(x, y));
  };

  const wallGrid = new Grid(TS);
  for (const w of walls) wallGrid.addSeg(w);
  // Near a wall, a stroke has to cross it at a decent angle, never run along it.
  const wallAngleOK = (x, y, ang) => {
    for (const w of wallGrid.near(x, y, TS * 0.9)) {
      const dx = w.x1 - w.x0, dy = w.y1 - w.y0, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - w.x0) * dx + (y - w.y0) * dy) / L));
      if (Math.hypot(x - w.x0 - dx * t, y - w.y0 - dy * t) < TS * 0.9 && lineAngleDiff(ang, Math.atan2(dy, dx)) < o.wallang) return false;
    }
    return true;
  };

  // Straight away from the nearest wall (the slope of the distance field).
  const outward = (x, y) => {
    const e = 3, gx = distAt(x + e, y) - distAt(x - e, y), gy = distAt(x, y + e) - distAt(x, y - e);
    return gx || gy ? Math.atan2(gy, gx) : null;
  };
  // Cells stretch outward, leaning left or right by a slowly varying amount.
  const noise = valueNoise(rng, W, H, TS * 4);
  const flow = (x, y) => {
    const a = outward(x, y);
    return a === null ? noise(x, y) * Math.PI * 2 : a + (noise(x, y) * 2 - 1) * o.radtol * 1.5;
  };

  // Cell corners: points along the walls first, so cell edges line up with
  // them, then scattered through the rock, spaced further apart along the flow.
  const pts = [], wallPt = new Set(), ptGrid = new Grid(along * 1.4);
  const addPt = (x, y) => { ptGrid.addPoint(x, y, pts.length); pts.push([x, y]); };
  for (const w of walls) {
    const len = Math.hypot(w.x1 - w.x0, w.y1 - w.y0), n = Math.max(1, Math.round(len / (across * 1.1)));
    for (let k = 0; k <= n; k++) {
      const x = w.x0 + ((w.x1 - w.x0) * k) / n, y = w.y0 + ((w.y1 - w.y0) * k) / n;
      if (ptGrid.near(x, y, across * 0.5).some((i) => Math.hypot(pts[i][0] - x, pts[i][1] - y) < across * 0.5)) continue;
      wallPt.add(pts.length);
      addPt(x, y);
    }
  }
  const tooClose = (x, y, scale) => {
    const f = flow(x, y), ux = Math.cos(f), uy = Math.sin(f);
    return ptGrid.near(x, y, along * scale).some((i) => {
      const dx = pts[i][0] - x, dy = pts[i][1] - y, a = dx * ux + dy * uy, c = -dx * uy + dy * ux;
      return (a / (along * scale)) ** 2 + (c / (across * scale)) ** 2 < 1;
    });
  };
  const tries = Math.round(((W + 2 * r) * (H + 2 * r)) / (TS * TS)) * 20;
  for (let k = 0; k < tries; k++) {
    const x = rng.range(-r, W + r), y = rng.range(-r, H + r), d = distAt(x, y);
    if (d <= 0 || d > (o.depth + 1) * TS || tooClose(x, y, rng.range(0.75, 1.3))) continue;
    addPt(x, y);
  }

  // Keep the triangles in the rock that reach into the hatched area.
  const isIn = (i) => inside(pts[i][0], pts[i][1]);
  const tris = delaunay(pts).filter((t) => {
    const gx = (pts[t.a][0] + pts[t.b][0] + pts[t.c][0]) / 3, gy = (pts[t.a][1] + pts[t.b][1] + pts[t.c][1]) / 3;
    return distAt(gx, gy) > 0 && (inside(gx, gy) || isIn(t.a) + isIn(t.b) + isIn(t.c) >= 2);
  });
  const key = (a, b) => (a < b ? a + "," + b : b + "," + a);
  const triByEdge = new Map();
  for (const t of tris) for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
    const k = key(a, b);
    if (!triByEdge.has(k)) triByEdge.set(k, []);
    triByEdge.get(k).push(t);
  }

  // Merge some neighbouring triangles into convex four-sided cells, across
  // the longer shared edge.
  const cells = [], merged = new Set();
  const cross = (p, a, b) => (pts[a][0] - pts[p][0]) * (pts[b][1] - pts[p][1]) - (pts[a][1] - pts[p][1]) * (pts[b][0] - pts[p][0]);
  for (const t of rng.shuffle([...tris])) {
    if (merged.has(t)) continue;
    merged.add(t);
    let cell = [t.a, t.b, t.c];
    if (rng.chance(o.quads)) {
      const sides = [[t.a, t.b, t.c], [t.b, t.c, t.a], [t.c, t.a, t.b]].sort(
        ([a, b], [c, d]) => Math.hypot(pts[d][0] - pts[c][0], pts[d][1] - pts[c][1]) - Math.hypot(pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]));
      for (const [a, b, c] of sides) {
        const nb = (triByEdge.get(key(a, b)) || []).find((q) => q !== t && !merged.has(q));
        if (!nb) continue;
        const d = [nb.a, nb.b, nb.c].find((v) => v !== a && v !== b);
        const quad = [a, d, b, c];
        const signs = quad.map((v, i) => Math.sign(cross(v, quad[(i + 1) % 4], quad[(i + 2) % 4])));
        if (signs.every((x) => x === signs[0])) { merged.add(nb); cell = quad; break; }
      }
    }
    cells.push({ v: cell });
  }
  const cellByEdge = new Map();
  for (const c of cells) {
    c.g = [0, 1].map((k) => c.v.reduce((s, i) => s + pts[i][k], 0) / c.v.length);
    for (let i = 0; i < c.v.length; i++) {
      const k = key(c.v[i], c.v[(i + 1) % c.v.length]);
      if (!cellByEdge.has(k)) cellByEdge.set(k, []);
      cellByEdge.get(k).push(c);
    }
  }
  const onWall = (a, b) => wallPt.has(a) && wallPt.has(b) && distAt((pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2) < 1.5;

  // Zones: enclosed (floor on most sides within reach), near a wall, or far
  // from the walls. Each zone likes strokes leaning off the outward direction
  // by its own amount. With zone pull at 0 (the chosen setting) zones are
  // skipped entirely; they stay here for tuning.
  const zoneOf = (x, y) => {
    let hits = 0;
    for (let k = 0; k < 8; k++) {
      const dx = Math.cos((k * Math.PI) / 4), dy = Math.sin((k * Math.PI) / 4);
      for (let t = 2; t < o.encl * TS; t += 3) if (distAt(x + dx * t, y + dy * t) <= 0) { hits++; break; }
    }
    if (hits >= 5) return "enclosed";
    return distAt(x, y) < o.nearz * TS ? "near" : "far";
  };
  const zoneScore = (c, ang) => {
    if (!o.zonew || c.pref === null) return 0;
    const lean = c.zone === "far" ? o.radtol : c.zone === "near" ? Math.min(o.radtol, 0.45) : Math.min(o.radtol, 0.35);
    const tol = Math.max(0.3, lean);
    return o.zonew * Math.max(-1, 1 - Math.abs(lineAngleDiff(ang, c.pref) - lean) / tol);
  };
  if (o.zonew) for (const c of cells) {
    c.zone = zoneOf(c.g[0], c.g[1]);
    c.pref = outward(c.g[0], c.g[1]);
  }

  // Choose each cell's stroke edge, nearest the walls first.
  const order = rng.shuffle(cells).sort((p, q) => distAt(...p.g) - distAt(...q.g));
  for (const c of order) {
    let best = null;
    const m = c.v.length;
    const neighbours = [];
    for (let j = 0; j < m; j++)
      for (const nb of cellByEdge.get(key(c.v[j], c.v[(j + 1) % m]))) if (nb !== c) neighbours.push(nb);
    for (let i = 0; i < m; i++) {
      const a = c.v[i], b = c.v[(i + 1) % m];
      if (onWall(a, b)) continue;
      const ang = Math.atan2(pts[b][1] - pts[a][1], pts[b][0] - pts[a][0]);
      let nearestNb = Math.PI / 2;
      for (const nb of neighbours) if (nb.ang !== undefined) nearestNb = Math.min(nearestNb, lineAngleDiff(ang, nb.ang));
      let score = nearestNb;
      if (!wallAngleOK(c.g[0], c.g[1], ang)) score -= 0.6;
      // Owning an edge that a neighbour's strokes already end against turns
      // those ends into T-junctions.
      const k = key(a, b);
      if (cellByEdge.get(k).some((nb) => nb !== c && nb.ang !== undefined && nb.own !== k)) score += 0.25;
      // Prefer an edge whose stack of strokes fits within the group size.
      const ux = pts[b][0] - pts[a][0], uy = pts[b][1] - pts[a][1], L = Math.hypot(ux, uy);
      const h = Math.max(...c.v.map((v) => Math.abs(ux * (pts[v][1] - pts[a][1]) - uy * (pts[v][0] - pts[a][0])) / L));
      if (h / sp > o.maxLines + 0.5) score -= 0.35;
      score += zoneScore(c, ang);
      // Never parallel to a neighbour.
      if (nearestNb < 0.4) score -= 1.5;
      score += rng.range(0, 0.15);
      if (!best || score > best.score) best = { score, a, b, ang, k };
    }
    if (best) Object.assign(c, { ang: best.ang, ea: best.a, own: best.k });
  }

  // Where the hatched area gives out, strokes are cut by the wandering edge
  // with some overshoot, rather than at straight cell edges.
  const fray = (s) => {
    const inA = inside(s.x0, s.y0), inB = inside(s.x1, s.y1);
    if (inA && inB) return s;
    const L = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    if (!inA && !inB) return inside((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2) && L > sp ? s : null;
    const [fx, fy, tx, ty] = inA ? [s.x0, s.y0, s.x1, s.y1] : [s.x1, s.y1, s.x0, s.y0];
    const ux = (tx - fx) / L, uy = (ty - fy) / L;
    let t = 0;
    while (t < L && inside(fx + ux * t, fy + uy * t)) t += 1;
    t = Math.min(L, Math.max(0, t + rng.range(-0.5, 0.8) * sp));
    if (t < sp * 0.6) return null;
    return inA ? { x0: fx, y0: fy, x1: fx + ux * t, y1: fy + uy * t } : { x0: fx + ux * t, y0: fy + uy * t, x1: fx, y1: fy };
  };

  const store = new SegStore(24);
  for (const w of walls) store.add({ ...w, w: TS * 0.2 });
  const off0 = o.weight * 0.6, trim = o.weight * 0.45;
  const stroke = (s, g, weight = 1) => {
    inkStroke(ctx, s, o, rng, g, distAt, TS, weight);
    addStroke(store, s);
  };

  // Strokes across convex polygon `poly` parallel to its edge i. After 3-5
  // strokes the rest is cut off along the last one and filled as a cell of
  // its own, turned to a new direction, so its strokes end against that one.
  function fillPoly(poly, i, c) {
    const m = poly.length, [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % m];
    const L0 = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L0, uy = (by - ay) / L0;
    let nx = -uy, ny = ux;
    const gx = poly.reduce((t, p) => t + p[0], 0) / m, gy = poly.reduce((t, p) => t + p[1], 0) / m;
    if ((gx - ax) * nx + (gy - ay) * ny < 0) { nx = -nx; ny = -ny; }
    const h = Math.max(...poly.map(([x, y]) => (x - ax) * nx + (y - ay) * ny));
    const g = { bend: (rng.chance(0.5) ? 1 : -1) * o.curve }, flip = rng.chance(0.5);
    const cap = Math.min(o.maxLines, rng.int(3, 5));
    // Where a line through (qx, qy) along (dx, dy) enters and leaves the cell.
    const clip = (qx, qy, dx, dy) => {
      let t0 = Infinity, t1 = -Infinity;
      for (let j = 0; j < m; j++) {
        const [p1x, p1y] = poly[j], [p2x, p2y] = poly[(j + 1) % m];
        const ex = p2x - p1x, ey = p2y - p1y, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const wx = p1x - qx, wy = p1y - qy;
        const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
        if (u >= -1e-6 && u <= 1 + 1e-6) { t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
      }
      return [t0, t1];
    };
    // The group fans: each stroke turns a little further than the last, plus a
    // small jitter of its own; gaps vary too.
    const fanStep = ((rng.chance(0.5) ? 1 : -1) * o.fan * rng.range(0.5, 1)) / Math.max(1, cap - 1);
    let d = off0, k = 0;
    for (; d < h - 0.8; d += sp * (1 + rng.range(-1, 1) * o.gapvar)) {
      if (k === cap && h - d > sp * 1.2) break;
      let qx = ax + nx * d, qy = ay + ny * d;
      let [t0, t1] = clip(qx, qy, ux, uy);
      if (!(t1 > t0)) continue;
      // Turn the stroke about its middle, then clip again.
      const turn = fanStep * (k - (cap - 1) / 2) + rng.range(-1, 1) * o.angjit;
      const cs = Math.cos(turn), sn = Math.sin(turn), dx = ux * cs - uy * sn, dy = ux * sn + uy * cs;
      qx += (ux * (t0 + t1)) / 2;
      qy += (uy * (t0 + t1)) / 2;
      [t0, t1] = clip(qx, qy, dx, dy);
      if (!(t1 > t0)) continue;
      // Ends stop short of the edges by uneven amounts, so they stagger.
      const e0 = trim + rng.range(0, o.seam) * sp, e1 = trim + rng.range(0, o.seam) * sp;
      if (t1 - t0 > e0 + e1 + 0.6) { t0 += e0; t1 -= e1; }
      let s = { x0: qx + dx * t0, y0: qy + dy * t0, x1: qx + dx * t1, y1: qy + dy * t1 };
      if (flip) s = { x0: s.x1, y0: s.y1, x1: s.x0, y1: s.y0 };
      k++;
      s = fray(s);
      if (s) stroke(s, g);
    }
    if (d >= h - 0.8) return;
    // Cut off the rest, half a spacing past the last stroke.
    const cut = d - sp * 0.5, rest = [];
    for (let j = 0; j < m; j++) {
      const P = poly[j], Q = poly[(j + 1) % m];
      const dp = (P[0] - ax) * nx + (P[1] - ay) * ny - cut, dq = (Q[0] - ax) * nx + (Q[1] - ay) * ny - cut;
      if (dp >= 0) rest.push(P);
      if (dp >= 0 !== dq >= 0) { const f = dp / (dp - dq); rest.push([P[0] + (Q[0] - P[0]) * f, P[1] + (Q[1] - P[1]) * f]); }
    }
    if (rest.length < 3) return;
    // Its new edge to stack from: any but the cut, well away from our direction.
    const ang = Math.atan2(uy, ux);
    let best = null;
    for (let j = 0; j < rest.length; j++) {
      const [px, py] = rest[j], [qx, qy] = rest[(j + 1) % rest.length];
      if (Math.hypot(qx - px, qy - py) < sp) continue;
      const a2 = Math.atan2(qy - py, qx - px);
      let score = lineAngleDiff(a2, ang);
      if (score < 0.5) continue;
      if (!wallAngleOK((px + qx) / 2, (py + qy) / 2, a2)) score -= 0.6;
      score += zoneScore(c, a2) + rng.range(0, 0.2);
      if (!best || score > best.score) best = { score, j };
    }
    if (best) fillPoly(rest, best.j, c);
  }

  ctx.fillStyle = INK_FILL;
  for (const c of order) if (c.ang !== undefined) fillPoly(c.v.map((v) => pts[v]), c.v.indexOf(c.ea), c);

  // Where the hatching gives out it breaks into short dashes that carry on
  // the direction of the nearest stroke.
  if (o.flecks > 0) {
    const reach = TS * 0.45;
    for (let n = Math.round(((W * H) / (sp * sp)) * 0.35 * o.flecks); n > 0; n--) {
      const x = rng.range(0, W), y = rng.range(0, H);
      if (inside(x, y) || distAt(x, y) <= 0) continue;
      let edge = false;
      for (let k = 0; k < 8 && !edge; k++) edge = inside(x + Math.cos(k * 0.785) * reach, y + Math.sin(k * 0.785) * reach);
      if (!edge) continue;
      const near = store.nearest(x, y, TS * 0.8);
      if (!near.seg || near.d < sp * 0.8) continue;
      const a = Math.atan2(near.seg.y1 - near.seg.y0, near.seg.x1 - near.seg.x0) + rng.range(-0.1, 0.1);
      const len = sp * rng.range(0.5, 1.6), dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
      const s = { x0: x - dx, y0: y - dy, x1: x + dx, y1: y + dy };
      if (store.hit(s.x0, s.y0, (dx * 2) / len, (dy * 2) / len, len).seg) continue;
      stroke(s, { bend: 0 }, 0.85);
    }
  }
}

// The hatching of a map that is solid rock throughout, as a list of strokes
// rather than ink: no walls, so the cells lie every which way. Each stroke
// has its centreline (`path`), full width (`scale`) and a `rank` from 0 to 1:
// a group's rank, plus more for each later stroke in the group. The renderer
// thins it out away from the walls in sight (see Renderer.drawDeep).
export function hatchSolid(W, H, TS, rng) {
  const o = { ...hatchSettings(TS), depth: 1e4, nearw: 0, flecks: 0, record: [] };
  const far = TS * 50;
  const nop = () => {};
  const ctx = { beginPath: nop, moveTo: nop, lineTo: nop, closePath: nop, fill: nop, arc: nop };
  hatchRock(ctx, { W, H, TS, walls: [], distAt: () => far }, o, rng);
  for (const st of o.record) {
    if (st.g.rank === undefined) st.g.rank = rng.next();
    st.rank = 0.65 * st.g.rank + 0.35 * Math.min(1, st.idx / 3);
    delete st.g;
  }
  return o.record;
}

// Add one recorded stroke to the current path of `ctx` (the caller fills
// it), keeping only the middle `keep` of its length and its width times
// `weight` (and times `widthAt(x, y)` along it, if given); the ends taper as
// a whole stroke's would.
export function inkRecorded(ctx, st, keep, weight = 1, widthAt = null) {
  const P = st.path, n = P.length - 1;
  if (n < 1) return;
  const a = ((1 - keep) / 2) * n, b = ((1 + keep) / 2) * n;
  const at = (t) => {
    const i = Math.min(n - 1, Math.floor(t)), f = t - i;
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
  };
  const m = Math.max(3, Math.round((b - a) * 1.5)), C = [], L = [], R = [];
  for (let k = 0; k <= m; k++) C.push(at(a + ((b - a) * k) / m));
  for (let k = 0; k <= m; k++) {
    const [x0, y0] = C[Math.max(0, k - 1)], [x1, y1] = C[Math.min(m, k + 1)];
    const dl = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / dl, ny = (x1 - x0) / dl;
    const w = (profile(HATCH, k / m) * st.scale * weight * (widthAt ? widthAt(C[k][0], C[k][1]) : 1)) / 2;
    L.push([C[k][0] + nx * w, C[k][1] + ny * w]);
    R.push([C[k][0] - nx * w, C[k][1] - ny * w]);
  }
  const outline = L.concat(R.reverse());
  let area = 0;
  outline.forEach(([x, y], i) => {
    const [x1, y1] = outline[(i + 1) % outline.length];
    area += x * y1 - x1 * y;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  // The round ends wind the same way as the outline (a clockwise arc has a
  // positive area here), so where they overlap the fill doesn't cancel out.
  for (const [[x, y], t] of [[C[0], 0], [C[m], 1]]) {
    const r = (profile(HATCH, t) * st.scale * weight * (widthAt ? widthAt(x, y) : 1)) / 2;
    if (r <= 0) continue;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2, area < 0);
  }
}

const INK_FILL = "#1b1815";

// ---------- strokes ----------------------------------------------------------------

// Thickness multiplier along a stroke, t from 0 (start) to 1 (end): the
// parabola through the start, middle and end values.
function profile(o, t) {
  const v = o.pstart * 2 * (t - 0.5) * (t - 1) - o.pmid * 4 * t * (t - 1) + o.pend * 2 * t * (t - 0.5);
  return Math.max(0.03, v);
}

// A hand-inked stroke from (x0, y0) to (x1, y1): bowed by the group's bend,
// with a little tremor, its thickness following the profile, heavier near walls.
function inkStroke(ctx, s, o, rng, g, distAt, TS, weight) {
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const nx = -dy / len, ny = dx / len, n = Math.max(6, Math.round(len / 3));
  const bow = g.bend * len * rng.range(0.8, 1.2), ph = rng.range(0, 6.28);
  const near = 1 + o.nearw * Math.max(0, 1 - distAt((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2) / (o.depth * TS));
  const scale = o.weight * weight * near * (1 + rng.range(-1, 1) * o.vary * 0.5);
  const L = [], R = [];
  s.path = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = bow * Math.sin(Math.PI * t) + o.wobble * 0.3 * Math.sin(t * 5 + ph) * Math.sin(Math.PI * t);
    const cx = s.x0 + dx * t + nx * off, cy = s.y0 + dy * t + ny * off, w = (profile(o, t) * scale) / 2;
    L.push([cx + nx * w, cy + ny * w]);
    R.push([cx - nx * w, cy - ny * w]);
    s.path.push([cx, cy]);
  }
  // A stroke's place in its group: thinning drops a group's last strokes first.
  if (o.record) o.record.push({ path: s.path, scale, g, idx: (g.n = (g.n || 0) + 1) - 1 });
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill();
  // Round the ends.
  for (const [x, y, t] of [[s.x0, s.y0, 0], [s.x1, s.y1, 1]]) {
    ctx.beginPath();
    ctx.arc(x, y, (profile(o, t) * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  s.w = Math.max(o.pstart, o.pmid, o.pend) * scale;
}

// Store a drawn stroke for collisions along its real, curved centreline.
function addStroke(store, s) {
  const P = s.path;
  if (!P) return; // too short to draw
  for (let i = 0; i < P.length - 1; i += 2) {
    const j = Math.min(i + 2, P.length - 1);
    store.add({ x0: P[i][0], y0: P[i][1], x1: P[j][0], y1: P[j][1], w: s.w });
  }
}

// Smallest angle between two undirected line directions, in [0, pi/2].
function lineAngleDiff(a, b) {
  const d = Math.abs(a - b) % Math.PI;
  return Math.min(d, Math.PI - d);
}

// ---------- spatial lookups --------------------------------------------------------

// A bucket grid of points (by index) or segments.
class Grid {
  constructor(size) {
    this.size = size;
    this.cells = new Map();
  }
  put(i, j, v) {
    const k = i * 65536 + j;
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(v);
  }
  addPoint(x, y, v) { this.put(Math.floor(x / this.size), Math.floor(y / this.size), v); }
  addSeg(s) {
    const z = this.size;
    for (let j = Math.floor(Math.min(s.y0, s.y1) / z); j <= Math.floor(Math.max(s.y0, s.y1) / z); j++)
      for (let i = Math.floor(Math.min(s.x0, s.x1) / z); i <= Math.floor(Math.max(s.x0, s.x1) / z); i++) this.put(i, j, s);
  }
  // Everything stored in the buckets within r of (x, y) (may repeat segments).
  near(x, y, r) {
    const z = this.size, out = [];
    for (let j = Math.floor((y - r) / z); j <= Math.floor((y + r) / z); j++)
      for (let i = Math.floor((x - r) / z); i <= Math.floor((x + r) / z); i++) {
        const c = this.cells.get(i * 65536 + j);
        if (c) for (const v of c) out.push(v);
      }
    return out;
  }
}

// Strokes drawn so far, for collisions.
class SegStore {
  constructor(bucket) { this.grid = new Grid(bucket); }
  add(s) { this.grid.addSeg(s); }
  // The nearest stored segment within r of a point.
  nearest(x, y, r) {
    let best = Infinity, which = null;
    for (const s of this.grid.near(x, y, r)) {
      const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / L));
      const d = Math.hypot(x - s.x0 - dx * t, y - s.y0 - dy * t);
      if (d < best) { best = d; which = s; }
    }
    return { d: best, seg: which };
  }
  // Distance along a ray to the first stored segment it hits.
  hit(px, py, dx, dy, maxT) {
    let best = maxT, which = null;
    const mx = px + (dx * maxT) / 2, my = py + (dy * maxT) / 2;
    for (const s of this.grid.near(mx, my, maxT / 2 + 1)) {
      const ex = s.x1 - s.x0, ey = s.y1 - s.y0, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = s.x0 - px, qy = s.y0 - py;
      const t = (qx * ey - qy * ex) / den, u = (qx * dy - qy * dx) / den;
      if (t > 0.01 && t < best && u >= 0 && u <= 1) { best = t; which = s; }
    }
    return { t: best, seg: which };
  }
}

// ---------- geometry -----------------------------------------------------------------

// Delaunay triangulation (Bowyer-Watson), returning triangles as {a, b, c}
// indices. Points are inserted in a sweep order and only triangles near the
// sweep are searched, which keeps it fast for a whole map.
function delaunay(pts) {
  const n = pts.length, big = 1e6;
  const P = pts.concat([[-big, -big], [2 * big, -big], [-big, 2 * big]]);
  const tri = (a, b, c) => {
    const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r2 = (ax - ux) ** 2 + (ay - uy) ** 2;
    return { a, b, c, ux, uy, r2, right: ux + Math.sqrt(r2) };
  };
  // Sweep left to right: a triangle whose circumcircle lies wholly left of the
  // sweep line can never be touched again, so it is retired.
  const order = [...Array(n).keys()].sort((i, j) => P[i][0] - P[j][0]);
  let open = [tri(n, n + 1, n + 2)];
  const done = [];
  for (const i of order) {
    const [x, y] = P[i], edges = new Map(), keep = [];
    for (const t of open) {
      if (t.right < x) { done.push(t); continue; }
      if ((x - t.ux) ** 2 + (y - t.uy) ** 2 < t.r2) {
        for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
          const k = a < b ? a * 1e6 + b : b * 1e6 + a;
          edges.set(k, edges.has(k) ? null : [a, b]);
        }
      } else keep.push(t);
    }
    open = keep;
    for (const e of edges.values()) if (e) open.push(tri(e[0], e[1], i));
  }
  return done.concat(open).filter((t) => t.a < n && t.b < n && t.c < n);
}

// Smooth value noise in [0, 1] over pixel coordinates, with lattice spacing `cell`.
function valueNoise(rng, W, H, cell) {
  const gw = Math.ceil(W / cell) + 3, gh = Math.ceil(H / cell) + 3;
  const lat = Array.from({ length: gw * gh }, () => rng.next());
  const at = (i, j) => lat[Math.max(0, Math.min(gh - 1, j + 1)) * gw + Math.max(0, Math.min(gw - 1, i + 1))];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy);
    let u = fx - i, v = fy - j;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

// Exact Euclidean distance transform (Felzenszwalb & Huttenlocher) of a
// binary grid: for each cell, the distance in cells to the nearest set cell.
// For each pixel of a w×h grid, the nearest pixel marked in `seed`: its
// coordinates (sx, sy, -1 when there is none) and squared distance (d2), by
// two sweeps passing each pixel's nearest seed on to its neighbours (a vector
// distance transform).
export function nearestSeeds(seed, w, h) {
  const n = w * h, sx = new Int32Array(n).fill(-1), sy = new Int32Array(n), d2 = new Float64Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) if (seed[i]) { sx[i] = i % w; sy[i] = (i / w) | 0; d2[i] = 0; }
  // Pixel i at (x, y) takes neighbour j's seed if it is nearer.
  const take = (i, x, y, j) => {
    const s = sx[j];
    if (s < 0) return;
    const dx = x - s, dy = y - sy[j], dd = dx * dx + dy * dy;
    if (dd < d2[i]) { d2[i] = dd; sx[i] = s; sy[i] = sy[j]; }
  };
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      if (d2[i] === 0) continue;
      if (x > 0) take(i, x, y, i - 1);
      if (y > 0) {
        if (x > 0) take(i, x, y, i - w - 1);
        take(i, x, y, i - w);
        if (x < w - 1) take(i, x, y, i - w + 1);
      }
    }
    for (let x = w - 2; x >= 0; x--) if (d2[row + x] !== 0) take(row + x, x, y, row + x + 1);
  }
  for (let y = h - 1; y >= 0; y--) {
    const row = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const i = row + x;
      if (d2[i] === 0) continue;
      if (x < w - 1) take(i, x, y, i + 1);
      if (y < h - 1) {
        if (x < w - 1) take(i, x, y, i + w + 1);
        take(i, x, y, i + w);
        if (x > 0) take(i, x, y, i + w - 1);
      }
    }
    for (let x = 1; x < w; x++) if (d2[row + x] !== 0) take(row + x, x, y, row + x - 1);
  }
  return { d2, sx, sy };
}

export function distanceTransform(grid, w, h) {
  const INF = 1e20, f = new Float64Array(Math.max(w, h));
  const d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = grid[i] ? 0 : INF;
  const pass = (n, get, set) => {
    for (let q = 0; q < n; q++) f[q] = get(q);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
    for (let q = 0; q < n; q++) set(q, d[q]);
  };
  for (let x = 0; x < w; x++) pass(h, (y) => out[y * w + x], (y, val) => (out[y * w + x] = val));
  for (let y = 0; y < h; y++) pass(w, (x) => out[y * w + x], (x, val) => (out[y * w + x] = val));
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(out[i]);
  return out;
}
