// The map composited on the GPU (a mockup): one WebGL2 pass a frame doing
// what Expression.compose does with canvases; and the hatching inked by the
// GPU from every stroke's shape, kept on it from the start, instead of each
// stroke being inked afresh on a canvas as the depth map changes.
//
// The strokes' shapes are sent once: each a strip along its middle line,
// wide enough for it at its thickest, each point of it knowing how far along
// the stroke it is and how far from the middle line. When the depth map
// changes (a step), one draw of all of them works out, for each pixel of
// each, whether the stroke shows there and how much, by the same rules as
// the canvas drawing's (from the depth map at the stroke's middle and at the
// pixel), into one picture: in red the hatching in sight, in green beyond
// it, in blue the cover's thickening strokes. Each frame only reads it.
//
// It reads an Expression drawn without its strokes (`solid` emptied) for
// everything else: the paper, the walls' and floor's ink, the cover's fill,
// the sight, the light and the lamps.

import { HATCH } from "../js/hatching.js";

const R = 8; // mask pixels per square, as Expression's
const TABLE_W = 1024;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

const STROKE_VS = `#version 300 es
in vec2 aPos; in float aId; in float aS; in float aD;
uniform vec2 uSize; uniform float uScale;
flat out int vId; out float vS; out float vD; out vec2 vP;
void main() {
  vId = int(aId); vS = aS; vD = aD; vP = aPos;
  gl_Position = vec4(aPos * uScale / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;
const STROKE_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uGrey, uU, uTable, uTable2;
uniform vec2 uMask; uniform float uTS, uScale, uMemWeight, uSeeHatch, uMemHatch, uKeepGrey, uLenGrey, uInkGrey, uWBlack, uWGrey;
uniform vec3 uProf;
flat in int vId; in float vS; in float vD; in vec2 vP;
out vec4 o;
float prof(float t) { return max(0.03, uProf.x * 2.0 * (t - 0.5) * (t - 1.0) - uProf.y * 4.0 * t * (t - 1.0) + uProf.z * 2.0 * t * (t - 0.5)); }
float ramp(float g, float b, float m, float w) { return g < 0.5 ? b + (m - b) * g * 2.0 : m + (w - m) * (g - 0.5) * 2.0; }
float maskAt(sampler2D t, vec2 p, float dflt) {
  ivec2 c = ivec2(floor(p * ${R}.0 / uTS));
  if (c.x < 0 || c.y < 0 || c.x >= int(uMask.x) || c.y >= int(uMask.y)) return dflt;
  return texelFetch(t, c, 0).r;
}
// How much of this stroke shows here: as the hatching in sight (mode 0),
// beyond it (1), or the cover's thickening strokes (2).
float stroke(vec4 rec, vec4 rec2, int mode) {
  float s = vS, d = abs(vD) * rec2.y, keep, a, wm;
  if (mode == 2) {
    if (!(maskAt(uU, rec.xy, 1.0) > 0.0)) return 0.0;
    keep = 1.0; a = 1.0; wm = max(0.0, 1.0 + 5.0 * min(1.0, maskAt(uU, vP, 1.0)));
  } else {
    float weight = mode == 1 ? uMemWeight : 1.0, strength = mode == 1 ? uMemHatch : uSeeHatch;
    float gr = 1.0 - (1.0 - maskAt(uGrey, rec.xy, 1.0)) * weight;
    if (gr >= 0.999 || rec.z >= ramp(gr, 1.0, uKeepGrey, 0.0)) return 0.0;
    keep = ramp(gr, 1.0, uLenGrey, 0.0); a = min(1.0, ramp(gr, 1.0, uInkGrey, uInkGrey) * strength);
    if (keep < 0.03 || a < 0.02) return 0.0;
    wm = ramp(1.0 - (1.0 - maskAt(uGrey, vP, 1.0)) * weight, uWBlack, uWGrey, 0.0);
  }
  float as = abs(s), hw, dist;
  if (as <= keep) { hw = prof((s / keep + 1.0) * 0.5) * rec.w * wm * 0.5; dist = d; }
  else { hw = prof(s > 0.0 ? 1.0 : 0.0) * rec.w * wm * 0.5; dist = length(vec2((as - keep) * rec2.x, d)); }
  float aa = 0.5 / uScale;
  return clamp((hw - dist) / (2.0 * aa) + 0.5, 0.0, 1.0) * a;
}
void main() {
  ivec2 at = ivec2(vId % ${TABLE_W}, vId / ${TABLE_W});
  vec4 rec = texelFetch(uTable, at, 0), rec2 = texelFetch(uTable2, at, 0);
  o = vec4(stroke(rec, rec2, 0), stroke(rec, rec2, 1), stroke(rec, rec2, 2), 1.0);
}`;

const QUAD_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COMPOSE_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uLit, uSee, uMem, uCover, uGlimpse, uFloor, uSeen, uSight, uLampSight, uLight, uLamp, uGrey, uU, uTable, uTable2;
uniform sampler2D uHatchPic;
uniform vec2 uCam, uCanvas, uPaper, uMask, uSightSize, uMap, uSightFrom;
uniform float uSc, uScale, uTS, uSightScale;
uniform vec4 uLightBox; uniform vec2 uLightC; uniform float uLightK, uBright, uLightSize, uLightOn;
uniform vec3 uDark, uOut, uWarm, uSeeHatchC, uMemHatchC, uProf;
uniform float uWarmth, uLampWarmth, uNearInk, uNearSoft;
uniform float uSeeHatch, uMemHatch, uMemWeight, uKeepGrey, uLenGrey, uInkGrey, uWBlack, uWGrey;
uniform vec4 uFires[8]; uniform float uFireK[8]; uniform float uFireDim[8]; uniform int uFireN;
uniform int uHatch;
out vec4 o;

float prof(float t) { return max(0.03, uProf.x * 2.0 * (t - 0.5) * (t - 1.0) - uProf.y * 4.0 * t * (t - 1.0) + uProf.z * 2.0 * t * (t - 0.5)); }
float ramp(float g, float b, float m, float w) { return g < 0.5 ? b + (m - b) * g * 2.0 : m + (w - m) * (g - 0.5) * 2.0; }
float maskAt(sampler2D t, vec2 p, float dflt) {
  ivec2 c = ivec2(floor(p * ${R}.0 / uTS));
  if (c.x < 0 || c.y < 0 || c.x >= int(uMask.x) || c.y >= int(uMask.y)) return dflt;
  return texelFetch(t, c, 0).r;
}
vec4 paperAt(sampler2D t, vec2 p) { return texture(t, p * uScale / uPaper); }

vec3 over(vec3 c, vec3 s, float a) { return mix(c, s, clamp(a, 0.0, 1.0)); }

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 p = uCam + frag / uSc;
  if (p.x < 0.0 || p.y < 0.0 || p.x >= uMap.x || p.y >= uMap.y) { o = vec4(uOut, 1.0); return; }
  vec3 hatch = uHatch == 1 ? paperAt(uHatchPic, p).rgb : vec3(0.0);
  vec3 c = uDark;
  vec3 lit = paperAt(uLit, p).rgb;
  // The player's light, flickering in brightness and size about its middle.
  float lp = 0.0;
  if (uLightOn > 0.5) {
    vec2 q = (p - uLightC) / uLightK + uLightC, uv = (q - uLightBox.xy) * uLightBox.w / uLightSize;
    if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) lp = texture(uLight, uv).a * uBright;
  }
  c = over(c, lit, lp);
  // The level's lights: each fire's own flicker about it; warmed twice over
  // but where the player's light warms it once.
  vec2 sp = p * uSightScale / uSightSize;
  float sight = texture(uSight, sp).a, seen = paperAt(uSeen, p).a;
  vec2 lq = p; float dim = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uFireN) break;
    vec4 f = uFires[i];
    float d = distance(p, f.xy);
    if (d < f.z) { lq = (p - f.xy) / uFireK[i] + f.xy; dim = 1.0 - uFireDim[i] * smoothstep(0.0, f.z, d); break; }
  }
  float la = texture(uLamp, lq * ${R}.0 / uTS / uMask).r * sight * texture(uLampSight, sp).a * seen * dim;
  if (la > 0.0) {
    float w1 = uLampWarmth * 0.35, w2 = w1 * (uWarmth > 0.0 ? 1.0 - lp : 1.0);
    vec3 warm = lit * (1.0 - w1 * (1.0 - uWarm)) * (1.0 - w2 * (1.0 - uWarm));
    c = over(c, warm, la);
  }
  // Where the ink in sight goes, and the two inks.
  float m = sight;
  if (uNearInk + uNearSoft > 0.0) m = max(m, smoothstep((uNearInk + uNearSoft) * uTS, uNearInk * uTS, distance(p, uSightFrom)));
  float clear = paperAt(uFloor, p).a * paperAt(uGlimpse, p).a;
  vec4 mem = paperAt(uMem, p), see = paperAt(uSee, p);
  if (uHatch == 1) {
    float hm = hatch.g * (1.0 - clear), hs = hatch.r * (1.0 - clear);
    // (The hatching under the rest of each ink.)
    float am = mem.a + hm * (1.0 - mem.a), as = see.a + hs * (1.0 - see.a);
    mem = vec4(am > 0.0 ? (mem.rgb * mem.a + uMemHatchC * hm * (1.0 - mem.a)) / am : mem.rgb, am);
    see = vec4(as > 0.0 ? (see.rgb * see.a + uSeeHatchC * hs * (1.0 - see.a)) / as : see.rgb, as);
  }
  c = over(c, mem.rgb, mem.a * (1.0 - m));
  c = over(c, see.rgb, see.a * m);
  // The cover: its fill, and its thickening strokes.
  float cov = paperAt(uCover, p).a;
  cov = 1.0 - (1.0 - cov) * (1.0 - hatch.b);
  c = over(c, uOut, cov);
  // The warmth of the player's light.
  c *= 1.0 - uWarmth * 0.35 * lp * (1.0 - uWarm);
  o = vec4(c, 1.0);
}`;

function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class GpuView {
  constructor(canvas, exp, strokes) {
    const gl = (this.gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }));
    if (!gl) throw new Error("No WebGL2");
    this.canvas = canvas;
    this.exp = exp;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.compose = program(gl, QUAD_VS, COMPOSE_FS);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.tex = {};
    this.seenVersions = {};
    const t0 = performance.now();
    this.layStrokes(strokes);
    gl.finish();
    this.strokeMs = performance.now() - t0;
  }

  // A texture by name, made or remade from `src` (a canvas, or { w, h, data,
  // format }) if `version` has changed.
  texture(name, src, version, filter = this.gl.LINEAR) {
    const gl = this.gl;
    let t = this.tex[name];
    if (t && this.seenVersions[name] === version) return t;
    if (!t) t = this.tex[name] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (src.data) gl.texImage2D(gl.TEXTURE_2D, 0, src.internal, src.w, src.h, 0, src.format, src.type, src.data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    this.seenVersions[name] = version;
    this.uploads = (this.uploads ?? 0) + 1;
    return t;
  }

  // Every stroke's shape, once, onto the GPU (see the top), with the table of
  // the strokes' middles, ranks, widths and lengths; and the picture they
  // are inked into.
  layStrokes(strokes) {
    const gl = this.gl, E = this.exp, cw = E.paper.width, ch = E.paper.height;
    this.size = [cw, ch];
    const pmax = Math.max(HATCH.pstart, HATCH.pmid, HATCH.pend), widest = 6;
    const n = strokes.length, rows = Math.ceil(n / TABLE_W);
    const table = new Float32Array(TABLE_W * rows * 4), table2 = new Float32Array(TABLE_W * rows * 4);
    let nv = 0, ni = 0;
    for (const st of strokes) if (st.path.length >= 2) { nv += (st.path.length + 2) * 2; ni += (st.path.length + 1) * 6; }
    const verts = new Float32Array(nv * 5), index = new Uint32Array(ni);
    let vi = 0, ii = 0;
    strokes.forEach((st, id) => {
      const P = st.path;
      if (P.length < 2) return;
      const cum = [0];
      for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      const L = cum.at(-1) || 1, half = L / 2, W = (pmax * st.scale * widest) / 2 + 1 / E.scale;
      const [mx, my] = P[P.length >> 1];
      table.set([mx, my, st.rank, st.scale], id * 4);
      table2.set([half, W, 0, 0], id * 4);
      const base = vi / 5;
      // Along the middle line, and on past each end as far as the widest end.
      const pts = P.map((q, i) => [q[0], q[1], (2 * cum[i]) / L - 1]);
      const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
      const [sx, sy] = dir(P[1], P[0]), [ex, ey] = dir(P.at(-2), P.at(-1));
      pts.unshift([P[0][0] + sx * W, P[0][1] + sy * W, -1 - W / half]);
      pts.push([P.at(-1)[0] + ex * W, P.at(-1)[1] + ey * W, 1 + W / half]);
      for (let i = 0; i < pts.length; i++) {
        const [tx, ty] = dir(pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, i + 1)]);
        const nx = -ty * W, ny = tx * W, [x, y, s] = pts[i];
        verts.set([x + nx, y + ny, id, s, 1, x - nx, y - ny, id, s, -1], vi);
        vi += 10;
        if (i) {
          const a = base + 2 * (i - 1);
          index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], ii);
          ii += 6;
        }
      }
    });
    const tableTex = (name, data) => this.texture(name, { w: TABLE_W, h: rows, data, internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT }, 1, gl.NEAREST);
    tableTex("table", table);
    tableTex("table2", table2);
    const prog = (this.strokeProg = program(gl, STROKE_VS, STROKE_FS));
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, vi), gl.STATIC_DRAW);
    const at = (name, size, off) => {
      const l = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, gl.FLOAT, false, 20, off);
    };
    at("aPos", 2, 0); at("aId", 1, 8); at("aS", 1, 12); at("aD", 1, 16);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index.subarray(0, ii), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.indexCount = ii;
    // The picture the strokes are inked into, at the drawing's resolution.
    const t = (this.hatchPic = gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    this.hatchFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hatchFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.strokeCount = n;
  }

  // Ink every stroke into the hatching picture, as the depth map now is (once
  // a step). Overlapping strokes: the most of them.
  inkStrokes(T) {
    const gl = this.gl, E = this.exp, S = E.S, p = this.strokeProg, [cw, ch] = this.size;
    const t0 = performance.now();
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hatchFb);
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let unit = 0;
    for (const name of ["uGrey", "uU", "uTable", "uTable2"]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, T[name]);
      gl.uniform1i(gl.getUniformLocation(p, name), unit++);
    }
    const f = (name, ...v) => gl[`uniform${v.length}f`](gl.getUniformLocation(p, name), ...v);
    f("uSize", cw, ch); f("uScale", E.scale); f("uMask", E.mw, E.mh); f("uTS", E.TS);
    f("uMemWeight", S.memWeight); f("uSeeHatch", S.seeHatch); f("uMemHatch", S.memHatch);
    f("uKeepGrey", S.keepGrey); f("uLenGrey", S.lenGrey); f("uInkGrey", S.inkGrey); f("uWBlack", S.wBlack); f("uWGrey", S.wGrey);
    f("uProf", HATCH.pstart, HATCH.pmid, HATCH.pend);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (this.timeInk) { gl.finish(); this.inkMs = performance.now() - t0; }
  }

  // Draw the view: camera at map point `cam`, `sc` device pixels a map unit,
  // the player's light at `light` ({ x, y } map point), at time `t` (s).
  draw(cam, sc, light, t, { hatch = true } = {}) {
    const gl = this.gl, E = this.exp, S = E.S, st = E.stat;
    if (!st) return;
    const { mw, mh, TS } = E, [cw, ch] = this.size;
    const L = gl.LINEAR, N = gl.NEAREST;
    // (What changed since last drawn is sent again: the inks after a redraw,
    // the sight as it eases, the light when cast anew.)
    const inkV = `${st.t}`;
    const T = {
      uLit: this.texture("lit", E.lit, E.lit),
      uSee: this.texture("see", st.see, inkV), uMem: this.texture("mem", st.mem, inkV), uCover: this.texture("cover", st.cover, inkV),
      uGlimpse: this.texture("glimpse", E.hi[2], inkV), uFloor: this.texture("floor", E.floorLayer, 1),
      uSeen: this.texture("seen", E.seenShape, `${E.viewpoints?.size}`),
      uSight: this.texture("sight", E.sightCanvas.eased, E.sightVersion),
      uLampSight: this.texture("lampSight", E.sightCanvas.lamps, `${E.sightFrom}`),
      uLight: this.texture("light", E.lightReach ?? E.lit, `${E.lightFrom}`),
      uLamp: this.texture("lamp", { w: mw, h: mh, data: E.lampLevel ?? new Float32Array(mw * mh), internal: gl.R32F, format: gl.RED, type: gl.FLOAT }, E.lampLevel ? 1 : 0, N),
      uGrey: this.texture("grey", { w: mw, h: mh, data: E.grey, internal: gl.R32F, format: gl.RED, type: gl.FLOAT }, inkV, N),
      uU: this.texture("u", { w: mw, h: mh, data: E.coverU ?? new Float32Array(mw * mh).fill(1), internal: gl.R32F, format: gl.RED, type: gl.FLOAT }, inkV, N),
      uTable: this.tex.table, uTable2: this.tex.table2,
    };
    // (The strokes inked again when the depth map has changed.)
    if (hatch && this.inkedFor !== inkV) {
      this.inkStrokes(T);
      this.inkedFor = inkV;
    }
    const p = this.compose;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    let unit = 0;
    for (const [name, tex] of Object.entries(T)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(p, name), unit++);
    }
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.hatchPic);
    gl.uniform1i(gl.getUniformLocation(p, "uHatchPic"), unit++);
    const u = (name, ...v) => {
      const l = gl.getUniformLocation(p, name);
      if (v.length === 1) gl.uniform1f(l, v[0]); else if (v.length === 2) gl.uniform2f(l, ...v); else if (v.length === 3) gl.uniform3f(l, ...v); else gl.uniform4f(l, ...v);
    };
    u("uCam", ...cam); u("uSc", sc); u("uCanvas", this.canvas.width, this.canvas.height);
    u("uPaper", cw, ch); u("uMask", mw, mh); u("uScale", E.scale); u("uTS", TS); u("uMap", E.W * TS, E.H * TS);
    u("uSightScale", E.sightScale); u("uSightSize", E.sightCanvas.eased.width, E.sightCanvas.eased.height);
    u("uSightFrom", ...(E.sightFrom ?? [-1e9, -1e9]));
    // The light's flicker, as castLight's: brightness and size.
    const box = E.lightBox;
    u("uLightOn", box && E.lightReach ? 1 : 0);
    if (box) {
      const wave = (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2)) / 2;
      const swell = (Math.sin(t * 5.1) + 0.5 * Math.sin(t * 8.9 + 0.7) + 0.3 * Math.sin(t * 13.3 + 2)) / 1.8;
      u("uBright", 1 - S.flicker * 0.25 * (wave + 1) / 2);
      u("uLightK", 1 + S.flickerSize * swell);
      u("uLightBox", box.x, box.y, box.w, box.res);
      u("uLightSize", E.lightReach.width);
      u("uLightC", light.x, light.y);
    }
    u("uDark", ...hex(S.darkColor)); u("uOut", ...hex(S.outColor)); u("uWarm", 1, 196 / 255, 120 / 255);
    u("uWarmth", S.warmth); u("uLampWarmth", 0.7); u("uNearInk", S.nearInk); u("uNearSoft", S.nearSoft);
    u("uSeeHatchC", ...hex(S.seeHatchC)); u("uMemHatchC", ...hex(S.memHatchC)); u("uProf", HATCH.pstart, HATCH.pmid, HATCH.pend);
    u("uSeeHatch", S.seeHatch); u("uMemHatch", S.memHatch); u("uMemWeight", S.memWeight);
    u("uKeepGrey", S.keepGrey); u("uLenGrey", S.lenGrey); u("uInkGrey", S.inkGrey); u("uWBlack", S.wBlack); u("uWGrey", S.wGrey);
    gl.uniform1i(gl.getUniformLocation(p, "uHatch"), hatch ? 1 : 0);
    // Each fire in sight flickering its own way (as compose's).
    const fires = (E.lampsSeen ?? []).filter((l) => l.fire).slice(0, 8);
    gl.uniform1i(gl.getUniformLocation(p, "uFireN"), fires.length);
    fires.forEach((l, i) => {
      const { x, y, out, ph } = l.fire;
      gl.uniform4f(gl.getUniformLocation(p, `uFires[${i}]`), x * TS, y * TS, out * TS, ph);
      gl.uniform1f(gl.getUniformLocation(p, `uFireK[${i}]`), 1 + 0.04 * (0.6 * Math.sin(t * 4.3 + ph * 1.3) + 0.4 * Math.sin(t * 9.1 + ph * 0.6)));
      const k = Math.max(0, Math.min(1, 0.5 + 0.3 * Math.sin(t * 5.3 + ph) + 0.2 * Math.sin(t * 11.7 + ph * 1.9) + 0.15 * Math.sin(t * 17.9 + ph * 0.7)));
      gl.uniform1f(gl.getUniformLocation(p, `uFireDim[${i}]`), 0.3 * k);
    });
    const l = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
