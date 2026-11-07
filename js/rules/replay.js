// Replays (spec/groundwork.md, section 8): a run is its seed and the calls
// made into the rules, in order: every action (`act`), every turn of an
// activity (`goOn`), every stop (`stop`). Played again from the seed, they
// make the very same run, so a playtest's odd moment can be watched again,
// call by call, here (tools/replay.mjs).
//
// The World notes each call from outside it (`history`, kept and saved with
// the run), not the calls the rules make to themselves; every 100, a
// checkpoint, the game's fingerprint, so a replay that goes off course
// (the rules changed since, or a bug) says where.
//
// A call as text: a step, "m" and its way as on a number pad ("m6": east);
// a turn of an activity "."; a stop "!" and why; any other action, its
// command as JSON; a checkpoint "#" and the fingerprint.

const WAYS = { "-1,1": 1, "0,1": 2, "1,1": 3, "-1,0": 4, "1,0": 6, "-1,-1": 7, "0,-1": 8, "1,-1": 9 };
const BY_DIGIT = Object.fromEntries(Object.entries(WAYS).map(([k, d]) => [d, k.split(",").map(Number)]));

export function encodeCall(cmd) {
  if (cmd.do === "move" && WAYS[`${cmd.dx},${cmd.dy}`]) return `m${WAYS[`${cmd.dx},${cmd.dy}`]}`;
  return JSON.stringify(cmd);
}
export function decodeCall(code) {
  if (code[0] === "m") { const [dx, dy] = BY_DIGIT[code[1]]; return { do: "move", dx, dy }; }
  return JSON.parse(code);
}

// The game's state in a few characters: the turn, where the player is and
// how they are, every monster, the things, and the dice (FNV-1a).
export function fingerprint(w) {
  const p = w.player;
  const actors = w.actors.filter((a) => a !== p).map((a) => `${a.id}:${a.kind}@${a.x},${a.y}:${a.hp}:${a.state}`).sort().join(";");
  const dice = Object.values(w.dice).map((r) => r.state).join(",");
  const text = [w.turn, w.place.depth, p.x, p.y, p.hp, p.xp, p.level, w.sneaking ? 1 : 0, actors, w.items.length, dice].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Methods of the World (world.js): noting each call from outside.
export const replayMethods = {
  // Run `fn`, the call `code`, noted if it comes from outside the rules.
  noted(code, fn) {
    if (this.noting) return fn();
    this.noting = true;
    try {
      this.history.push(code);
      return fn();
    } finally {
      this.noting = false;
      if (this.history.length % 100 === 0) this.history.push(`#${fingerprint(this)}`);
    }
  },

  // The run as a replay: what to make it again from, and the calls.
  replay() {
    return { game: "Versal", replay: 1, seed: this.runSeed, name: this.player.name, turn: this.turn, depth: this.place.depth, history: this.history.slice() };
  },
};

// Play a replay again (`data`, from world.replay()) on a new World (`World`,
// passed in: world.js imports this file). Stops at the end, at call `upTo`,
// at the first checkpoint that doesn't match (`offCourse`: the call it's
// at), or at an error thrown (`error`, and the call). `each(w, i)` after
// each call.
export function replayRun(data, World, { upTo = Infinity, each = null } = {}) {
  const w = new World(data.seed, { name: data.name });
  let calls = 0, checks = 0;
  for (let i = 0; i < data.history.length && calls < upTo; i++) {
    const code = data.history[i];
    if (code[0] === "#") {
      if (fingerprint(w) !== code.slice(1)) return { w, calls, checks, offCourse: i };
      checks++;
      continue;
    }
    try {
      if (code === ".") w.goOn();
      else if (code[0] === "!") w.stop(...JSON.parse(code.slice(1)));
      else w.act(decodeCall(code));
    } catch (error) {
      return { w, calls, checks, error, at: i };
    }
    calls++;
    each?.(w, i);
  }
  return { w, calls, checks };
}
