// Drawing the structure family (features.json): posts and stairs, kept with
// the walls once seen. Each takes the thing and the pen's hand (features.js).

export const structure = {
  post(f, { P, rng, x, y, TS, INK }) {
    const r = TS * 0.21, tilt = rng.range(-0.05, 0.05);
    const draw = (d, fill, width) => (f.shape === "round" ? P.round(x + d, y + d, r, width, fill) : P.box(x + d, y + d, r * 1.75, r * 1.75, tilt, width, fill));
    draw(0, INK, 1.6);
  },

  stairs(f, { P, rng, x, y, TS, OUT, IN, PAPER }) {
    // A flight of steps seen from above: a frame, and treads across it,
    // narrowing the way down (wider the way up), an arrow to say which.
    const s = TS * 0.82, top = y - s / 2;
    P.box(x, y, s, s, rng.range(-0.03, 0.03), OUT, PAPER);
    for (let i = 1; i < 5; i++) {
      const t = i / 5, half = (s / 2) * (f.dir === "down" ? 1 - t * 0.55 : 0.45 + t * 0.55) * 0.86;
      P.line(x - half, top + s * t, x + half, top + s * t, IN);
    }
    const ay = f.dir === "down" ? 1 : -1, tip = y + ay * s * 0.32;
    P.line(x - s * 0.12, tip - ay * s * 0.14, x, tip, IN + 0.4);
    P.line(x + s * 0.12, tip - ay * s * 0.14, x, tip, IN + 0.4);
  },
};
