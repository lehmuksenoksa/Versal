// The torn plates under the words around the map, as chosen in the ink
// ledger mockup (mockups/ledger.html; the shapes saved in
// mockups/ledger/plates.json, copied here): each a black area (an edited
// polyline) and a band round it, in which its edge is drawn as cave walls are
// (points along the band's middle, each moved about in it, some dropped),
// then torn. The shapes were made for a 1280 by 800 screen with a 340-pixel
// sidebar: the corner stays as it is at the top left, the sidebar's edge keeps
// to the right edge (stretched to the screen's height), and the drawer's to
// the drawer.

export const SHAPES = {"plates":{"corner":{"seed":81016,"band":33,"chars":42,"skew":24,"step":30,"jitter":0.9,"cut":0.55,"tear":1.4},"side":{"seed":273917,"band":34,"skew":40,"step":89,"jitter":1,"cut":0.55,"tear":1.55},"drawer":{"seed":635060,"band":33,"step":30,"jitter":0.9,"cut":0.55,"tear":1.4}},"areas":{"corner":[[644,0],[552,56],[460,79],[364,154],[163,159],[77,191],[0,181]],"side":[[952,800],[942,728],[950,660],[955,565],[948,506],[936,339],[942,200],[933,165],[932,96],[920,48],[924,0]],"drawer":[[940,509],[796,503],[573,517],[463,522],[150,544],[0,547]]}};
// The screen the shapes were made for, and the drawer's size there.
const MADE = { w: 1280, h: 800, drawerW: 940, drawerH: 520 };

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// A polyline carried off the screen at both ends (`name` says which way), and
// the black area it bounds (the black on the right of the way along).
function extended(name, a) {
  const f = a[0], l = a[a.length - 1];
  if (name === "drawer") return [[f[0] + 30, f[1]], ...a, [-30, l[1]]];
  if (name === "corner") return [[f[0], -30], ...a, [-30, l[1]]];
  return [[f[0], f[1] + 30], ...a, [l[0], -30]];
}
const l = (a) => a[a.length - 1];
function blackArea(name, a) {
  if (name === "drawer") return [...extended(name, a), [-30, -30], [a[0][0] + 30, -30]];
  if (name === "corner") return [...extended(name, a), [-30, -30]];
  return [...extended(name, a), [l(a)[0] + 400, -30], [a[0][0] + 400, a[0][1] + 30]];
}
// A polyline moved `d` to the left of the way along it (out of the black), mitred.
function offsetPoly(pts, d) {
  const seg = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[1] - a[1]) / L, -(b[0] - a[0]) / L]; };
  return pts.map((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    const n1 = i > 0 ? seg(o, p) : seg(p, q), n2 = i < pts.length - 1 ? seg(p, q) : n1;
    let mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(3, 1 / Math.max(0.33, mx * n2[0] + my * n2[1]));
    return [p[0] + mx * d * k, p[1] + my * d * k];
  });
}
const insidePoly = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
function nearestOn(pts, x, y) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), px = ax + dx * t, py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (!best || d < best.d) best = { x: px, y: py, d };
  }
  return best;
}

// Points along a line every `step` (give or take), each moved across the band
// (and a little along), some dropped. Off the screen they stay put.
function caveLine(line, P, rnd, off) {
  const out = [line[0]];
  let dropped = false;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1], L = Math.hypot(bx - ax, by - ay);
    if (L < 0.01) continue;
    const tx = (bx - ax) / L, ty = (by - ay) / L;
    for (let d = P.step * (0.4 + rnd() * 0.6); d < L; d += P.step * (0.6 + rnd() * 0.8)) {
      const x = ax + tx * d, y = ay + ty * d;
      if (off(x, y)) { out.push([x, y]); continue; }
      if (!dropped && rnd() < P.cut) { dropped = true; continue; }
      dropped = false;
      const across = (rnd() * 2 - 1) * P.jitter * P.band / 2, along = (rnd() - 0.5) * P.step * 0.3;
      out.push([x + tx * along + ty * across, y + ty * along - tx * across]);
    }
    out.push([bx, by]);
  }
  return out;
}

// One plate filled: its edge drawn in its band, torn every 3px (not off the
// screen), and kept in the band.
function plate(g, name, P, a, W, H) {
  const off = (x, y) => x < 0 || y < 0 || x > W || y > H;
  const ext = extended(name, a), area = blackArea(name, a);
  const pts = [...caveLine(offsetPoly(ext, P.band / 2), P, mulberry(P.seed * 7919 + (name === "side" ? 29 : 13)), off), ...area.slice(ext.length)];
  const rnd = mulberry(P.seed * 31 + 7);
  const waves = (n, f0, f1) => Array.from({ length: n }, () => [f0 + rnd() * (f1 - f0), rnd() * 6.28, 0.5 + rnd()]);
  const SLOW = waves(4, 0.008, 0.03), QUICK = waves(5, 0.08, 0.22);
  const noise = (t, w) => w.reduce((s, [f, p, k]) => s + k * Math.sin(t * f + p), 0) / w.reduce((s, [, , k]) => s + k, 0);
  const keep = (x, y) => {
    if (off(x, y)) return [x, y];
    const near = nearestOn(ext, x, y);
    if (insidePoly(area, x, y)) return [near.x, near.y];
    if (near.d > P.band) { const k = P.band / near.d; return [near.x + (x - near.x) * k, near.y + (y - near.y) * k]; }
    return [x, y];
  };
  g.beginPath();
  let t = 0, first = true;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, by - ay);
    if (L < 0.01) continue;
    const tx = (bx - ax) / L, ty = (by - ay) / L;
    for (let d = 0; d < L; d += 3, t += 3) {
      const x = ax + tx * d, y = ay + ty * d, on = !off(x, y);
      const k = on ? P.tear * (7 * noise(t, SLOW) + 2.2 * noise(t, QUICK) + (rnd() - 0.5) * 2.4) : 0;
      const [px, py] = keep(x - ty * k, y + tx * k);
      g[first ? "moveTo" : "lineTo"](px, py);
      first = false;
    }
  }
  g.closePath();
  g.fill();
}

const sized = (c, W, H) => {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
};

// The corner's plate and the sidebar's, on a canvas over the whole screen
// (W by H CSS pixels).
export function drawPlates(c, W, H) {
  const g = sized(c, W, H);
  g.fillStyle = "#000";
  const S = SHAPES.plates;
  plate(g, "corner", S.corner, SHAPES.areas.corner, W, H);
  plate(g, "side", S.side, SHAPES.areas.side.map(([x, y]) => [W - (MADE.w - x), (y * H) / MADE.h]), W, H);
}

// The drawer's dark grey sheet with its torn foot, on a canvas W wide (its
// foot drawn for a drawer DH tall), H tall.
export function drawDrawer(c, W, DH, H, colour) {
  const g = sized(c, W, H);
  g.fillStyle = colour;
  plate(g, "drawer", SHAPES.plates.drawer, SHAPES.areas.drawer.map(([x, y]) => [(x * W) / MADE.drawerW, (y * DH) / MADE.drawerH]), W, H);
}
