// The balance maths (spec/10-building-it.md, "maths first"): what the fight
// rules give, worked out exactly from the content's numbers, with no play.
// Checked against fights played by the game's own rules (tests/balance.test.js).
//
// The rules it follows (js/rules/fight.js, js/rules/world.js):
// - the player's blow lands with WHACK (always, on a monster unaware, and
//   then SNEAK_HIT times as hard); its damage is even from lo to hi;
// - a monster acts `speed` times a turn (its energy carried over); next to
//   the player, each act is a blow, landing with its `hit`, damage even
//   across its `dmg`; armour then takes off an even 0 to its defence (no
//   more than the blow);
// - the player strikes first each turn, so a monster killed with the n-th
//   blow has had n - 1 turns to strike back.

import { MONSTERS, ITEMS, PACK, PLAYER, LEVELS, WHACK, SNEAK_HIT, AILMENTS } from "../../js/rules/content.js";

const range = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const mean = ([a, b]) => (a + b) / 2;

// The player's blow from to, with weapon `weapon` (a type, or null: bare
// hands) at level `level` (attack() in fight.js: better every other level).
export function blow(weapon, level = 1) {
  const b = Math.floor((level - 1) / 2), d = weapon ? ITEMS[weapon].dmg : PACK.bare;
  const lo = Math.max(1, d[0] + b);
  return [lo, Math.max(lo, d[1] + b)];
}

// The expected number of blows to bring down `hp` (a number, or [least,
// most], even between), each landing with `hit`, damage even over `dmg`; a
// monster that heals `regen` a turn (a troll) healing after each blow it
// lives through, up to what it started with.
export function blowsToKill(hp, dmg, hit = WHACK, regen = 0) {
  const hps = Array.isArray(hp) ? range(hp) : [hp], ds = range(dmg);
  // (Counted in halves when the healing is: every number whole.)
  const k = Number.isInteger(regen) ? 1 : 2, r = regen * k;
  const one = (H) => {
    // f[n]: the blows still needed with n (in k-ths) left: one more, then on
    // a hit f of what's left, healed; on a miss, f of n healed. With no
    // healing, worked out in one pass; with it, until it settles.
    const top = H * k, f = new Float64Array(top + 1), heal = (n) => Math.min(top, n + r);
    for (let pass = 0; pass < (r ? 2000 : 1); pass++) {
      let change = 0;
      for (let n = 1; n <= top; n++) {
        const onHit = ds.reduce((s, d) => s + (n - d * k > 0 ? f[heal(n - d * k)] : 0), 0) / ds.length;
        const v = r ? 1 + hit * onHit + (1 - hit) * f[heal(n)] : (1 + hit * onHit) / hit;
        change = Math.max(change, Math.abs(v - f[n]));
        f[n] = v;
      }
      if (r && change < 1e-9) break;
    }
    return f[top];
  };
  return hps.reduce((s, H) => s + one(H), 0) / hps.length;
}

// What one of a monster's acts next to the player takes off them, on
// average, through armour of `def`.
export function hurtPerAct(kind, def = 0) {
  const M = MONSTERS[kind], ds = range(M.dmg);
  let sum = 0;
  for (const d of ds) for (let s = 0; s <= def; s++) sum += d - Math.min(d, s);
  return (M.hit * sum) / (ds.length * (def + 1));
}

// A bat's acts are not all blows: it flits off two times in five, even
// chasing (`erratic`), and has to come back. Counted as 0.6 of its acts a
// blow: roughly, not exactly.
export const blowsPerAct = (kind) => (MONSTERS[kind].erratic ? 0.6 : 1);

// One fight, the player against one monster of `kind` next to them and
// aware: the blows it takes, the hit points the player loses to its blows,
// and the turns it would take it to kill the player from `hp` (no other
// help). (`sneak`: the first blow at it unaware, sure and SNEAK_HIT times as
// hard; after it, healing counted from what's left, roughly.)
export function duel(kind, { weapon = "dagger", level = 1, def = 0, hp = null, sneak = false } = {}) {
  const M = MONSTERS[kind], [lo, hi] = blow(weapon, level), regen = M.regen ?? 0, dmg = [lo, hi];
  let blows;
  if (sneak) {
    // (The first blow sure, and harder; the rest as usual.)
    const first = range([lo * SNEAK_HIT, hi * SNEAK_HIT]), hps = range(M.hp);
    blows = 1 + hps.reduce((s, n) => s + first.reduce((t, d) => t + (n - d > 0 ? blowsToKill(n - d, dmg, WHACK, regen) : 0), 0) / first.length, 0) / hps.length;
  } else blows = blowsToKill(M.hp, dmg, WHACK, regen);
  const perTurn = M.speed * blowsPerAct(kind) * hurtPerAct(kind, def);
  const lost = (blows - 1) * perTurn;
  const playerHp = hp ?? PLAYER.hp + (level - 1) * LEVELS.hp;
  // (The chance it leaves the player bleeding or poisoned: at least one of
  // its blows doing so in the fight; then the ailment's whole harm, as it
  // runs its course. Ailments don't add up: the longer one stands.)
  const acts = (blows - 1) * M.speed * blowsPerAct(kind);
  const landHard = M.bleeds ? M.hit * pHard(kind, def, AILMENTS.bleeding.at) * AILMENTS.bleeding.chance : 0;
  const bleed = M.bleeds ? (1 - (1 - landHard) ** acts) * mean(AILMENTS.bleeding.turns) / AILMENTS.bleeding.every : 0;
  const poison = M.poison ? (1 - (1 - M.hit * M.poison) ** acts) * mean(AILMENTS.poisoned.turns) / AILMENTS.poisoned.every : 0;
  return { kind, blows, lost, ailing: bleed + poison, perTurn, killsIn: perTurn ? playerHp / perTurn : Infinity, xp: M.xp };
}

// The chance a blow of `kind`, through armour `def`, still does `at` or more.
function pHard(kind, def, at) {
  const ds = range(MONSTERS[kind].dmg);
  let n = 0;
  for (const d of ds) for (let s = 0; s <= def; s++) if (d - Math.min(d, s) >= at) n++;
  return n / (ds.length * (def + 1));
}

// A pack of `n` of `kind` fought one after another: in the open, all still
// standing strike each turn (`open`); in a corridor's mouth, only one
// (`narrow`). Hit points lost to blows, and blows needed.
export function packFight(kind, n, opts = {}) {
  const one = duel(kind, opts), t = one.blows;
  // (In the open: while the j-th falls, the n - j + 1 still standing strike;
  // the one falling doesn't on its last turn.)
  let open = 0;
  for (let j = 1; j <= n; j++) open += ((n - j + 1) * t - 1) * one.perTurn;
  return { blows: n * t, narrow: n * one.lost, open, xp: n * one.xp };
}

// The level a player reaches with `xp` (LEVELS.xp, all told).
export function levelFor(xp) {
  let level = 1;
  while (LEVELS.xp[level] !== undefined && xp >= LEVELS.xp[level]) level++;
  return level;
}
