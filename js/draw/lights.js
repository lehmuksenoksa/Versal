// Drawing the light family (features.json): the things that hold a fire.
// Only the cold thing is drawn here; the flames and glows go over it as it
// burns (render.js, fire.js). Each takes the thing and the pen's hand
// (features.js).

// A brazier's bowl, its radius in squares (render.js draws its near rim
// again over the flame).
export const BRAZIER_BOWL = 0.35;

export const lights = {
  brazier(f, { P, x, y, TS, OUT, IN, PAPER, INK }) {
    // A round bowl of coals on three short legs, big enough to hold its
    // fire, the flame down inside the bowl.
    const r = TS * BRAZIER_BOWL;
    for (const a of [0.5, 0.5 + (2 * Math.PI) / 3, 0.5 + (4 * Math.PI) / 3].map((a) => a + Math.PI / 2)) P.line(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45, OUT);
    P.round(x, y, r, OUT, PAPER);
    P.round(x, y, r * 0.62, IN, INK);
  },

  candles(f, { P, ctx, mode, x, y, TS, PAPER, INK }) {
    // Three fat candles standing on an altar, seen from above: a round
    // each, its wick a dot.
    for (const [dx, dy] of f.flames) {
      const cx = x + dx * TS, cy = y + dy * TS;
      P.round(cx, cy, TS * 0.12, 1.5, PAPER);
      if (mode === "paper" || mode === "ink") {
        ctx.save();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(cx, cy, TS * 0.12 * 0.22, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }
  },

  torch(f, { P, x, y, TS, INK }) {
    // A torch in an iron bracket on the wall: the bracket from the wall's
    // face to the torch's head, a round of ink. (Its flame drawn over it as
    // it burns: render.js.) A stand-in: its look to choose.
    const wx = x + f.dx * TS * 0.15, wy = y + f.dy * TS * 0.15;
    P.line(wx, wy, x, y, 2.4);
    P.round(x, y, TS * 0.08, 1.2, INK);
  },

  campfire(f, { P, x, y, TS, INK }) {
    // A teepee of three logs seen from the side: plain bars of ink leaning
    // together, crossing a little past their point.
    const w = 0.4, foot = 0.28, top = -0.14, th = 0.09, poke = 0.07;
    for (const u of [-0.5, 0.5, 0]) {
      const bx = x + u * w * TS, by = y + foot * TS, tx = x - u * poke * TS, ty = y + top * TS;
      const len = Math.hypot(tx - bx, ty - by), nx = (-(ty - by) / len) * th * TS * 0.5, ny = ((tx - bx) / len) * th * TS * 0.5;
      P.shape([[bx + nx, by + ny], [tx + nx, ty + ny], [tx - nx, ty - ny], [bx - nx, by - ny]], 0, INK);
    }
  },
};
