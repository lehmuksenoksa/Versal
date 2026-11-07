// Drawing the furniture family (features.json): outlined in ink over the
// paper. Each takes the thing and the pen's hand (features.js).

const lerp = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t];

// A tomb's slab: sarcophagus and altar differ only in weight and inset.
const slab = (weight, inset) => (f, { P, x, y, w, h, TS, OUT, IN, PAPER }) => {
  P.box(x, y, w, h, 0, OUT + weight, PAPER);
  const d = TS * inset;
  P.box(x, y, w - 2 * d, h - 2 * d, 0, IN);
};

export const furniture = {
  crate(f, { P, x, y, TS, OUT, IN, PAPER }) {
    // A box with a cross brace.
    const s = f.s * TS, c = P.box(x, y, s, s, f.rot, OUT, PAPER), m = [x, y], i = c.map((p) => lerp(p, m, 0.16));
    P.line(...i[0], ...i[2], IN);
    P.line(...i[1], ...i[3], IN);
  },

  barrel(f, { P, x, y, TS, OUT, IN, PAPER }) {
    P.round(x, y, f.r * TS, OUT, PAPER);
    P.round(x, y, f.r * TS * 0.48, IN);
  },

  shelf(f, { P, rng, x, y, w, h, TS, OUT, IN, PAPER }) {
    // A long shelf, split into bays, a few things on it.
    P.box(x, y, w, h, 0, OUT, PAPER);
    const long = w > h, L = long ? w : h;
    for (let i = 1; i < f.n; i++) {
      const t = -L / 2 + (L * i) / f.n;
      long ? P.line(x + t, y - h / 2, x + t, y + h / 2, IN) : P.line(x - w / 2, y + t, x + w / 2, y + t, IN);
    }
    for (let i = 0; i < f.n; i++) {
      if (!rng.chance(0.6)) continue;
      const t = -L / 2 + (L * (i + rng.range(0.3, 0.7))) / f.n, [px, py] = long ? [x + t, y] : [x, y + t];
      rng.chance(0.5) ? P.round(px, py, TS * 0.09, 1.4) : P.box(px, py, TS * 0.17, TS * 0.17, rng.range(-0.3, 0.3), 1.4);
    }
  },

  table(f, { P, rng, x, y, w, h, OUT, PAPER }) {
    P.box(x, y, w, h, rng.range(-0.02, 0.02), OUT, PAPER);
  },

  bench(f, { P, x, y, w, h, IN, PAPER }) {
    P.box(x, y, w, h, 0, IN + 0.5, PAPER);
  },

  chair(f, { P, rng, x, y, TS, turn, OUT, IN, PAPER }) {
    // A seat, its back the heavier line, away from the table.
    const s = f.s * TS;
    P.box(x, y, s, s, rng.range(-0.08, 0.08), IN + 0.3, PAPER);
    P.line(...turn(s / 2, -s / 2), ...turn(s / 2, s / 2), OUT);
  },

  bed(f, { P, w, h, TS, turn, OUT, IN, PAPER }) {
    // A frame, a pillow at the head, the edge of the blanket.
    const L = f.hx ? w : h, Wd = f.hx ? h : w;
    P.shape([turn(L / 2, -Wd / 2), turn(L / 2, Wd / 2), turn(-L / 2, Wd / 2), turn(-L / 2, -Wd / 2)], OUT, PAPER);
    const p0 = L / 2 - TS * 0.07, p1 = L / 2 - TS * 0.3;
    P.shape([turn(p0, -Wd * 0.33), turn(p0, Wd * 0.33), turn(p1, Wd * 0.33), turn(p1, -Wd * 0.33)], IN);
    P.line(...turn(L / 2 - TS * 0.45, -Wd / 2), ...turn(L / 2 - TS * 0.45, Wd / 2), IN);
  },

  coffin(f, { P, w, h, turn, OUT, IN, PAPER }) {
    // Wide at the shoulders, narrowing to head and foot; its lid inset.
    const L = (f.hx ? w : h) / 2, Wd = (f.hx ? h : w) / 2;
    const outline = (s) => [[L, -0.62], [L * 0.45, -1], [-L, -0.5], [-L, 0.5], [L * 0.45, 1], [L, 0.62]].map(([al, ac]) => turn(al * s, ac * Wd * s));
    P.shape(outline(1), OUT, PAPER);
    P.shape(outline(0.68), IN);
  },

  sarcophagus: slab(0.4, 0.17),
  altar: slab(0, 0.12),
};
