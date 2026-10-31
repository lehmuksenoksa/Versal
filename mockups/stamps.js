// Hatching drawn two ways, for comparing (a mockup): with the pen, each
// stroke's outline filled as the game does now (`hatchPaths`), and with
// stamps, small pictures of a tapered stroke drawn once and placed, stretched
// and turned, where each stroke goes (`hatchStamps`). Both by the same rules
// as Expression's ink in sight: which strokes show, how much of each and how
// thick, from the depth map.

import { HATCH, inkRecorded } from "../js/hatching.js";

const R = 8;
const ramp = (g, black, mid, white) => (g < 0.5 ? black + (mid - black) * g * 2 : mid + (white - mid) * (g - 0.5) * 2);
const profile = (t) => Math.max(0.03, HATCH.pstart * 2 * (t - 0.5) * (t - 1) - HATCH.pmid * 4 * t * (t - 1) + HATCH.pend * 2 * t * (t - 0.5));

// For each stroke that shows: [stroke, keep, alpha, width multiplier at its
// middle]; `grey` the depth map (mask resolution, `mw` wide).
export function strokesToInk(strokes, grey, mw, mh, TS, S, weight = 1) {
  const greyAt = (x, y) => {
    const i = Math.floor((x * R) / TS), j = Math.floor((y * R) / TS);
    return i < 0 || j < 0 || i >= mw || j >= mh ? 1 : grey[j * mw + i];
  };
  const out = [];
  for (const st of strokes) {
    const [x, y] = st.path[st.path.length >> 1], gr = 1 - (1 - greyAt(x, y)) * weight;
    if (gr >= 0.999 || st.rank >= ramp(gr, 1, S.keepGrey, 0)) continue;
    const keep = ramp(gr, 1, S.lenGrey, 0), a = ramp(gr, 1, S.inkGrey, S.inkGrey);
    if (keep < 0.03 || a < 0.02) continue;
    out.push([st, keep, Math.min(1, a), (px, py) => ramp(1 - (1 - greyAt(px, py)) * weight, S.wBlack, S.wGrey, 0)]);
  }
  return out;
}

// With the pen: as Expression does.
export function hatchPaths(g, ink, colour) {
  g.fillStyle = colour;
  for (const [st, keep, a, widthAt] of ink) {
    g.globalAlpha = a;
    g.beginPath();
    inkRecorded(g, st, keep, 1, widthAt);
    g.fill();
  }
  g.globalAlpha = 1;
}

// The stamps: a tapered stroke `LEN` long, at each of `WIDTHS` thicknesses
// (map units) and bent three ways, drawn once at `scale` pixels a map unit.
const LEN = 48, WIDTHS = [0.5, 1, 1.5, 2, 3, 4, 5.5, 7.5], BENDS = [-1, 0, 1];
export function makeStamps(scale, colour) {
  return WIDTHS.map((w) =>
    BENDS.map((bend) => {
      const pad = w, c = document.createElement("canvas");
      c.width = Math.ceil((LEN + 2 * pad) * scale);
      c.height = Math.ceil((2 * w + 2 * pad + 2) * scale);
      const g = c.getContext("2d");
      g.scale(scale, scale);
      g.translate(pad, c.height / scale / 2);
      g.fillStyle = colour;
      // (A stroke along the stamp, bowed a little, its thickness following
      // the strokes' profile; round ends.)
      const n = 24, pts = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n, y = bend * 1.2 * 4 * t * (1 - t);
        pts.push([t * LEN, y, (profile(t) * w) / 2]);
      }
      g.beginPath();
      pts.forEach(([x, y, r], k) => (k ? g.lineTo(x, y - r) : g.moveTo(x, y - r)));
      for (let k = n; k >= 0; k--) g.lineTo(pts[k][0], pts[k][1] + pts[k][2]);
      g.closePath();
      g.fill();
      for (const [x, y, r] of [pts[0], pts[n]]) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      return { c, pad, w };
    }),
  );
}

// With stamps: for each stroke the stamp nearest its thickness and bend,
// stretched from the start to the end of the part of it kept.
export function hatchStamps(g, ink, stamps, scale) {
  const T = g.getTransform();
  for (const [st, keep, a, widthAt] of ink) {
    const P = st.path, n = P.length - 1;
    const at = (t) => {
      const i = Math.min(n - 1, Math.floor(t)), f = t - i;
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
    };
    const [x0, y0] = at(((1 - keep) / 2) * n), [x1, y1] = at(((1 + keep) / 2) * n), [mx, my] = at(n / 2);
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    const w = st.scale * widthAt(mx, my);
    if (!(w > 0.05)) continue;
    // (Its bend: how far its middle is off the line between its ends.)
    const off = (mx - x0) * -uy + (my - y0) * ux, b = off > 0.6 ? 2 : off < -0.6 ? 0 : 1;
    let wi = 0;
    while (wi < WIDTHS.length - 1 && Math.abs(WIDTHS[wi + 1] - w) < Math.abs(WIDTHS[wi] - w)) wi++;
    const s = stamps[wi][b], k = L / LEN;
    g.globalAlpha = a;
    g.setTransform(T.a * ux * k, T.b + T.a * uy * k, -uy * T.d, ux * T.d, T.e + T.a * x0, T.f + T.d * y0);
    g.drawImage(s.c, -s.pad, -s.c.height / scale / 2, s.c.width / scale, s.c.height / scale);
  }
  g.setTransform(T);
  g.globalAlpha = 1;
}
