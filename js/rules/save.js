// Saving and restoring a run (spec/rebuild-plan.md, R4): everything a run is,
// as plain data that JSON can hold, and back again exactly, so play goes on
// as if never stopped.
//
// The world's state is a graph: the same object reached by two ways (a
// monster's pack leader, a room a rat calls home, the level the world stands
// on and the same level among the places kept). Each object is written once,
// with an id; reached again, it's written as a reference to that id. Maps,
// Sets, typed arrays and the dice are written as tagged objects; functions are
// left out and made again on restoring (a level's `get` and `idx`).

import { RNG } from "./rng.js";
import { T } from "./dungeon.js";

// (Raised when what a run holds changes so an older save would play wrong:
// 2, curses and sourceless light pared away, R6; 3, a level's state kept on
// the level only, groundwork G4; 4, the dice in streams, G5.)
const VERSION = 4;
const TYPED = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };

const toBase64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromBase64 = (b64) => {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

// Write `root` (and everything reachable from it) as plain data.
export function encode(root) {
  const ids = new Map();
  const enc = (v) => {
    if (v === undefined) return { $u: 1 };
    if (v === null || typeof v === "boolean" || typeof v === "string") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : { $n: String(v) };
    if (typeof v === "function") return undefined;
    if (ids.has(v)) return { $ref: ids.get(v) };
    const id = ids.size;
    ids.set(v, id);
    if (v instanceof RNG) return { $id: id, $rng: [v.seed, v.state] };
    const typed = Object.entries(TYPED).find(([, C]) => v instanceof C);
    if (typed) return { $id: id, $ta: typed[0], b64: toBase64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
    if (v instanceof Map) return { $id: id, $map: [...v].map(([k, x]) => [enc(k), enc(x)]) };
    if (v instanceof Set) return { $id: id, $set: [...v].map(enc) };
    if (Array.isArray(v)) return { $id: id, $arr: v.map((x) => { const e = enc(x); return e === undefined ? { $u: 1 } : e; }) };
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new Error(`can't save a ${proto?.constructor?.name ?? "thing"}`);
    const out = { $id: id };
    for (const [k, x] of Object.entries(v)) {
      const e = enc(x);
      if (e !== undefined) out[k] = e;
    }
    return out;
  };
  return enc(root);
}

// Read back what `encode` wrote.
export function decode(data) {
  const byId = [];
  const dec = (v) => {
    if (v === null || typeof v !== "object") return v;
    if ("$u" in v) return undefined;
    if ("$n" in v) return Number(v.$n);
    if ("$ref" in v) return byId[v.$ref];
    if ("$rng" in v) {
      const r = new RNG(v.$rng[0]);
      r.state = v.$rng[1];
      byId[v.$id] = r;
      return r;
    }
    if ("$ta" in v) {
      const bytes = fromBase64(v.b64), C = TYPED[v.$ta];
      const out = new C(bytes.buffer, 0, bytes.byteLength / C.BYTES_PER_ELEMENT);
      byId[v.$id] = out;
      return out;
    }
    if ("$map" in v) {
      const out = new Map();
      byId[v.$id] = out;
      for (const [k, x] of v.$map) out.set(dec(k), dec(x));
      return out;
    }
    if ("$set" in v) {
      const out = new Set();
      byId[v.$id] = out;
      for (const x of v.$set) out.add(dec(x));
      return out;
    }
    if ("$arr" in v) {
      const out = [];
      byId[v.$id] = out;
      for (const x of v.$arr) out.push(dec(x));
      return out;
    }
    const out = {};
    byId[v.$id] = out;
    for (const [k, x] of Object.entries(v)) if (k !== "$id") out[k] = dec(x);
    return out;
  };
  return dec(data);
}

// A level's ways of reading its squares, made again as the generator makes
// them (levelgen.js).
export function relink(level) {
  const W = level.w, H = level.h;
  level.idx = (x, y) => y * W + x;
  level.get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.ROCK : level.tiles[y * W + x]);
}

// The World as plain data, and a World from it (`proto`: World.prototype).
// What's only kept for the turn being played (the events not yet drawn, the
// noises of the turn, the way-finding cache) starts again empty.
export function saveWorld(w) {
  const { events, noises, chaseMap, ...rest } = w;
  return { version: VERSION, world: encode(rest) };
}
export function restoreWorld(data, proto) {
  if (data?.version !== VERSION) throw new Error(`a save of version ${data?.version}, this game reads ${VERSION}`);
  const w = Object.assign(Object.create(proto), decode(data.world));
  w.events = [];
  w.noises = [];
  w.chaseMap = null;
  for (const st of w.places) if (st?.level) relink(st.level);
  return w;
}
