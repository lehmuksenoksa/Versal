// Small seeded PRNG (mulberry32) with a few convenience helpers.
export class RNG {
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Inclusive integer range.
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  range(a, b) { return a + this.next() * (b - a); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  fork() { return new RNG(Math.floor(this.next() * 2 ** 32)); }
}

// A seed of its own for one part of a run (`seed` the run's; `part` a name,
// `n` a number: a level's depth), mixed so neighbours share nothing.
export function seedFor(seed, part, n = 0) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const c of `${part}:${n}`) h = Math.imul(h ^ c.charCodeAt(0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
