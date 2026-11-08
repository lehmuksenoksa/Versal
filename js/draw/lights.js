// Drawing the light family (features.json): the things that hold a fire.
// Only the cold thing is drawn here; the flames and glows go over it as it
// burns (render.js, fire.js). Each takes the thing and the pen's hand
// (features.js).

// A brazier's bowl, its radius in squares (render.js draws its near rim
// again over the flame).
export const BRAZIER_BOWL = 0.35;

// A wall torch: an iron ring on a short bracket out from the wall, sizes in
// squares (the bracket from the wall's face to the ring, the ring's radius;
// chosen on the options pages, spec/light-set.md). The torch's point (`x`,
// `y`) is 0.15 out from the wall's face, so the ring's middle is
// `TORCH_RING_IN` further out still: there its flame burns (render.js).
export const TORCH = { bracket: 0.085, ring: 0.09 };
export const TORCH_RING_IN = TORCH.bracket + TORCH.ring - 0.15;

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
    // each, its long wick a short stroke leaning out of it. (Their flames
    // drawn over them as they burn: render.js.)
    for (const [dx, dy] of f.flames) {
      const cx = x + dx * TS, cy = y + dy * TS;
      P.round(cx, cy, TS * 0.12, 1.5, PAPER);
      if (mode === "paper" || mode === "ink") {
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1.5, TS * 0.035);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + TS * 0.021, cy - TS * 0.084, cx + TS * 0.014, cy - TS * 0.14);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  torch(f, { P, x, y, TS, PAPER }) {
    // A torch on the wall: a short iron bracket from the wall's face (`dx`,
    // `dy`: toward the wall) to an iron ring. (Its flame drawn over the ring
    // as it burns: render.js.)
    const fx = x + f.dx * TS * 0.15, fy = y + f.dy * TS * 0.15, cx = x - f.dx * TS * TORCH_RING_IN, cy = y - f.dy * TS * TORCH_RING_IN;
    P.line(fx, fy, cx + f.dx * TS * TORCH.ring, cy + f.dy * TS * TORCH.ring, 2.4);
    P.round(cx, cy, TS * TORCH.ring, 1.57, PAPER);
  },

  campfire(f, { P, x, y, TS, INK }) {
    // Five logs laid to the middle, seen from above as the map is: square-
    // ended bars of ink, like an asterisk.
    const t = TS * 0.05, r = TS * 0.31;
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      P.shape([[x - s * t, y + c * t], [x + c * r - s * t, y + s * r + c * t], [x + c * r + s * t, y + s * r - c * t], [x + s * t, y - c * t]], 0, INK);
    }
  },
};
