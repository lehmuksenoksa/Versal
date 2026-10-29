// Recursive shadowcasting field of view.
const OCTANTS = [
  [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
  [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1],
];

export function computeFov(W, H, ox, oy, radius, opaque, mark) {
  mark(ox, oy);
  for (const [xx, xy, yx, yy] of OCTANTS) castLight(1, 1.0, 0.0, xx, xy, yx, yy);

  function castLight(row, start, end, xx, xy, yx, yy) {
    if (start < end) return;
    const r2 = radius * radius;
    for (let j = row; j <= radius; j++) {
      let dx = -j - 1;
      const dy = -j;
      let blocked = false;
      let newStart = start;
      while (dx <= 0) {
        dx++;
        const X = ox + dx * xx + dy * xy;
        const Y = oy + dx * yx + dy * yy;
        const lSlope = (dx - 0.5) / (dy + 0.5);
        const rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        const inside = X >= 0 && Y >= 0 && X < W && Y < H;
        if (inside && dx * dx + dy * dy <= r2) mark(X, Y);
        const solid = !inside || opaque(X, Y);
        if (blocked) {
          if (solid) { newStart = rSlope; continue; }
          blocked = false;
          start = newStart;
        } else if (solid && j < radius) {
          blocked = true;
          castLight(j + 1, start, lSlope, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  }
}
