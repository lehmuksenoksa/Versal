// A replay played again here (js/rules/replay.js): a run saved from the
// game (? then "Save a replay", or offered when something goes wrong), made
// again call by call from its seed.
//
//   node tools/replay.mjs versal-replay.json            how it went
//   node tools/replay.mjs versal-replay.json --to 500   stop at call 500, and
//                                                       draw the world there
//   node tools/replay.mjs versal-replay.json --log 20   and its last 20 messages
//
// It reports where the replay went off course, if it did (the rules have
// changed since it was made, or a bug), and an error thrown, with the call
// it came at: the bug, found again.
import { readFileSync } from "node:fs";
import { World } from "../js/rules/world.js";
import { picture } from "../tests/support/scenario.js";

const args = process.argv.slice(2), file = args.find((a) => !a.startsWith("--"));
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : null; };
if (!file) { console.log("node tools/replay.mjs <replay.json> [--to N] [--log N]"); process.exit(1); }
const data = JSON.parse(readFileSync(file, "utf8"));
if (data.game !== "Versal" || !Array.isArray(data.history)) { console.log(`${file}: not a Versal replay`); process.exit(1); }

const upTo = opt("to") ?? Infinity, r = World.replay(data, { upTo }), w = r.w;
console.log(`Seed ${data.seed}, ${data.name}: recorded to turn ${data.turn} on depth ${data.depth}, ${data.history.length} entries.`);
console.log(`Played ${r.calls} calls: turn ${w.turn}, depth ${w.place.depth}, ${w.player.hp}/${w.player.maxHp} hit points${w.dead ? `, dead (${w.dead.how})` : w.won ? ", won" : ""}; ${r.checks} checkpoints matched.`);
if (r.offCourse !== undefined) { console.log(`OFF COURSE at entry ${r.offCourse}: the game here isn't the one recorded (the rules changed since, or a bug).`); process.exitCode = 1; }
if (r.error) { console.log(`ERROR at entry ${r.at} (${data.history[r.at]}):\n${r.error.stack}`); process.exitCode = 1; }
if (opt("to") !== null || r.error || r.offCourse !== undefined) console.log(`\n${picture(w)}`);
const n = opt("log") ?? (r.error ? 10 : 0);
if (n) console.log(`\n${w.messages.slice(-n).map((m) => m.text).join("\n")}`);
