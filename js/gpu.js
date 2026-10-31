// The map drawn on the GPU: one WebGL2 pass a frame doing what
// Expression.compose does with canvases, and the hatching inked by the GPU
// from every stroke's shape, kept on it from the start, instead of each
// stroke being inked afresh on a canvas as the map is explored.
//
// The strokes' shapes are sent once: each a strip along its middle line,
// wide enough for it at its thickest, each point of it knowing how far along
// the stroke it is and how far from the middle line. When the map's ink is
// redrawn (a step), one draw of all of them works out, for each pixel of
// each, whether the stroke shows there and how much, by the same rules as
// the canvas drawing's (from the depth map at the stroke's middle and at the
// pixel), into one picture: in red the hatching in sight, in green beyond
// it, in blue the cover's thickening strokes. Each frame reads it.
//
// Everything else comes from the Expression (drawn without its strokes:
// its `solid` emptied): the paper, the walls' and floor's ink, the cover's
// fill, the sight, the light and the lamps; the flicker is a few numbers.

import { HATCH } from "./hatching.js";

const R = 8; // mask pixels per square, as Expression's
const TABLE_W = 1024;
// The level's lights' warmth, and the map fading into the darkness at its
// edges (in squares), as Expression's and Renderer's.
const LAMP_WARMTH = 0.7, EDGE_FADE = 1.5;

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

// The map's layers that never change, as one picture: the floor's shadow,
// its markings, the walls and the doors (the doors' drawn again as they open
// and shut), each how solid it is.
const PACK_FS = `#version 300 es
precision highp float;
uniform sampler2D uShadow, uMark, uWall, uDoor; uniform vec2 uSize;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  o = vec4(texture(uShadow, uv).a, texture(uMark, uv).a, texture(uWall, uv).a, texture(uDoor, uv).a);
}`;

// The sight as it was, eased toward the sight now by `k` (into a texture of
// its own: as a new sight is cast, and each frame while it eases).
const EASE_FS = `#version 300 es
precision highp float;
uniform sampler2D uFrom, uTo; uniform float uK; uniform vec2 uSize;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  o = mix(texture(uFrom, uv), texture(uTo, uv), uK);
}`;

const COMPOSE_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uLit, uLayers, uFloor, uMasks, uHatch, uPMasks, uPHatch, uSeen, uSight, uLampSight, uLight, uLamp;
uniform vec2 uCam, uCanvas, uPaper, uMask, uSightSize, uMap, uSightFrom;
uniform float uSc, uScale, uTS, uSightScale, uFade, uFadeK;
uniform vec4 uLightBox; uniform vec2 uLightC, uLightShift; uniform float uLightK, uBright, uLightSize, uLightOn;
uniform vec3 uDark, uOut, uWarm, uSeeHatchC, uMemHatchC, uSeeMarkC, uSeeWallC, uMemMarkC, uMemWallC, uShadowC;
uniform float uSeeMark, uSeeWall, uMemMark, uMemWall;
uniform float uWarmth, uLampWarmth, uNearInk, uNearSoft;
uniform vec4 uFires[8]; uniform float uFireK[8]; uniform float uFireDim[8]; uniform int uFireN;
out vec4 o;

vec4 paperAt(sampler2D t, vec2 p) { return texture(t, p * uScale / uPaper); }
vec3 over(vec3 c, vec3 s, float a) { return mix(c, s, clamp(a, 0.0, 1.0)); }

// One colour over another, as a canvas lays them (straight alpha).
vec4 overA(vec4 d, vec4 s) {
  float a = s.a + d.a * (1.0 - s.a);
  return vec4(a > 0.0 ? (s.rgb * s.a + d.rgb * d.a * (1.0 - s.a)) / a : d.rgb, a);
}

// The inks of one state (as now, or as before a redraw while the new fades
// in) over c, as the canvas drawing lays them: in sight (m) the floor's
// shadow and markings, the walls and doors, beyond it the same fainter,
// each as well as the floor was seen there (masks.r; the shape of what was
// seen, and all the rock, as \`shapeRock\`); under them the hatching (h),
// cleared off floor glimpsed (masks.g); then the cover (masks.b, and its
// strokes in h.b).
vec3 inked(vec3 c, float m, vec4 mk, vec3 h, vec4 L, float shapeRock, float floorA) {
  float mask = mk.r * shapeRock, clear = floorA * mk.g * shapeRock;
  vec4 se = overA(overA(overA(vec4(uShadowC, L.r), vec4(uSeeMarkC, L.g * uSeeMark)), vec4(uSeeWallC, L.b * uSeeWall)), vec4(uSeeWallC, L.a * uSeeWall));
  vec4 me = overA(overA(vec4(uMemMarkC, L.g * uMemMark), vec4(uMemWallC, L.b * uMemWall)), vec4(uMemWallC, L.a * uMemWall));
  se.a *= mask;
  me.a *= mask;
  // (The hatching under the rest of each ink, cleared off seen floor.)
  float hm = h.g * (1.0 - clear), hs = h.r * (1.0 - clear);
  vec4 cm = overA(vec4(uMemHatchC, hm), me), cs = overA(vec4(uSeeHatchC, hs), se);
  c = over(c, cm.rgb, cm.a * (1.0 - m));
  c = over(c, cs.rgb, cs.a * m);
  float cov = 1.0 - (1.0 - mk.b) * (1.0 - h.b);
  return over(c, uOut, cov);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 p = uCam + frag / uSc;
  if (p.x < 0.0 || p.y < 0.0 || p.x >= uMap.x || p.y >= uMap.y) { o = vec4(uOut, 1.0); return; }
  vec3 c = uDark, lit = paperAt(uLit, p).rgb;
  // The player's light, flickering in brightness and size about its middle.
  float lp = 0.0;
  if (uLightOn > 0.5) {
    vec2 q = (p - uLightShift - uLightC) / uLightK + uLightC, uv = (q - uLightBox.xy) * uLightBox.w / uLightSize;
    if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) lp = texture(uLight, uv).a * uBright;
  }
  c = over(c, lit, lp);
  // The level's lights: each fire flickering its own way about it; warmed
  // twice over but where the player's light warms it once.
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
    c = over(c, lit * (1.0 - w1 * (1.0 - uWarm)) * (1.0 - w2 * (1.0 - uWarm)), la);
  }
  // Where the ink in sight goes; the inks, the old fading out under the new.
  float m = sight;
  if (uNearInk + uNearSoft > 0.0) m = max(m, smoothstep((uNearInk + uNearSoft) * uTS, uNearInk * uTS, distance(p, uSightFrom)));
  float floorA = paperAt(uFloor, p).a, shapeRock = max(seen, 1.0 - floorA);
  vec4 L = paperAt(uLayers, p);
  vec2 mp = p * ${R}.0 / uTS / uMask;
  vec3 now = inked(c, m, texture(uMasks, mp), paperAt(uHatch, p).rgb, L, shapeRock, floorA);
  if (uFade > 0.5) c = mix(inked(c, m, texture(uPMasks, mp), paperAt(uPHatch, p).rgb, L, shapeRock, floorA), now, uFadeK);
  else c = now;
  // The warmth of the player's light; and the map fading into the darkness
  // at its edges.
  c *= 1.0 - uWarmth * 0.35 * lp * (1.0 - uWarm);
  vec2 e = min(p, uMap - p) / (${EDGE_FADE} * uTS);
  float keep = clamp(e.x, 0.0, 1.0) * clamp(e.y, 0.0, 1.0);
  o = vec4(mix(uOut, c, keep), 1.0);
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

// WebGL2 to draw with on `canvas`, or null if there is none, or only one
// done in software (slower than the canvases), unless `force`.
export function gpuContext(canvas, force = false) {
  try {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false, alpha: false });
    if (!gl) return null;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    if (!force && /swiftshader|llvmpipe|software|softpipe/i.test(name)) return null;
    gl.rendererName = name;
    return gl;
  } catch {
    return null;
  }
}

export class GpuMap {
  // `exp`: an Expression whose strokes (`strokes`, its `solid`) were taken
  // away before it was drawn.
  constructor(gl, exp, strokes) {
    this.gl = gl;
    this.exp = exp;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.compose = program(gl, QUAD_VS, COMPOSE_FS);
    this.ease = program(gl, QUAD_VS, EASE_FS);
    this.packProg = program(gl, QUAD_VS, PACK_FS);
    // (Time spent sending pictures to the GPU, for the performance readout.)
    this.sentMs = 0;
    this.sentPx = 0;
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.tex = {};
    this.versions = {};
    this.sources = {};
    this.locs = new Map();
    this.layStrokes(strokes);
  }

  // A texture by name, made or remade from `src` (a canvas, or { w, h, data,
  // internal, format, type }) if `version` has changed.
  // With `rect` ([x, y, w, h]), and the texture already made from the same
  // canvas, only that part of it is sent.
  texture(name, src, version, filter = this.gl.LINEAR, rect = null) {
    const gl = this.gl, t0 = performance.now();
    let t = this.tex[name];
    if (t && this.versions[name] === version) return t;
    const same = t && this.sources[name] === src && !src.data;
    if (!t) t = this.tex[name] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (same && rect) {
      const [x, y] = rect, w = Math.min(rect[2], src.width - x), h = Math.min(rect[3], src.height - y);
      if (w > 0 && h > 0) {
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x);
        gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
        this.sentPx += w * h;
      }
    } else {
      if (src.data) gl.texImage2D(gl.TEXTURE_2D, 0, src.internal, src.w, src.h, 0, src.format, src.type, src.data);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
      this.sentPx += src.data ? src.w * src.h : src.width * src.height;
    }
    this.sources[name] = src;
    this.versions[name] = version;
    this.sentMs += performance.now() - t0;
    return t;
  }

  // A float picture at mask resolution, as a texture.
  maskTexture(name, data, version) {
    const gl = this.gl, { mw, mh } = this.exp;
    return this.texture(name, { w: mw, h: mh, data, internal: gl.R32F, format: gl.RED, type: gl.FLOAT }, version, gl.NEAREST);
  }

  // Every stroke's shape, once, onto the GPU (see the top), with the table
  // of the strokes' middles, ranks, widths and lengths.
  layStrokes(strokes) {
    const gl = this.gl;
    const pmax = Math.max(HATCH.pstart, HATCH.pmid, HATCH.pend), widest = 6;
    const n = strokes.length, rows = Math.max(1, Math.ceil(n / TABLE_W));
    const table = new Float32Array(TABLE_W * rows * 4), table2 = new Float32Array(TABLE_W * rows * 4);
    let nv = 0, ni = 0;
    for (const st of strokes) if (st.path.length >= 2) { nv += (st.path.length + 2) * 2; ni += (st.path.length + 1) * 6; }
    const verts = new Float32Array(nv * 5), index = new Uint32Array(ni);
    let vi = 0, ii = 0;
    const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    strokes.forEach((st, id) => {
      const P = st.path;
      if (P.length < 2) return;
      const cum = [0];
      for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      // (Wide enough for it at its thickest, and a little for the edge.)
      const L = cum.at(-1) || 1, half = L / 2, W = (pmax * st.scale * widest) / 2 + 2;
      const [mx, my] = P[P.length >> 1];
      table.set([mx, my, st.rank, st.scale], id * 4);
      table2.set([half, W, 0, 0], id * 4);
      const base = vi / 5;
      // Along the middle line, and on past each end as far as the widest end.
      const pts = P.map((q, i) => [q[0], q[1], (2 * cum[i]) / L - 1]);
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
    this.hatchPics = [];
  }

  // The picture the strokes are inked into for ink set `k` (one for each of
  // the Expression's two), at the drawing's size.
  hatchPic(k) {
    const gl = this.gl, E = this.exp, cw = E.paper.width, ch = E.paper.height;
    let h = this.hatchPics[k];
    if (h && h.w === cw && h.h === ch) return h;
    if (h) {
      gl.deleteTexture(h.t);
      gl.deleteFramebuffer(h.fb);
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return (this.hatchPics[k] = { t, fb, w: cw, h: ch, inked: null });
  }

  // Ink every stroke into hatching picture `h`, as the depth map now is.
  // Overlapping strokes: the most of them.
  inkStrokes(h) {
    const gl = this.gl, E = this.exp, S = E.S, p = this.strokeProg;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, h.fb);
    gl.viewport(0, 0, h.w, h.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // (`coverU` changes in place, so it is sent each time.)
    this.versions.u = null;
    const tex = { uGrey: this.maskTexture("grey", E.grey, E.grey), uU: this.maskTexture("u", E.coverU ?? new Float32Array(E.mw * E.mh).fill(1), E.grey), uTable: this.tex.table, uTable2: this.tex.table2 };
    let unit = 0;
    for (const [name, t] of Object.entries(tex)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(this.loc(p, name), unit++);
    }
    const f = (name, ...v) => gl[`uniform${v.length}f`](this.loc(p, name), ...v);
    f("uSize", h.w, h.h); f("uScale", E.scale); f("uMask", E.mw, E.mh); f("uTS", E.TS);
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
  }

  loc(p, name) {
    const key = p === this.compose ? name : `s:${name}`;
    if (!this.locs.has(key)) this.locs.set(key, this.gl.getUniformLocation(p, name));
    return this.locs.get(key);
  }

  // One state's inks, as textures (see Expression.gpuSteps): its masks,
  // and its strokes inked into a picture of their own.
  inks(state) {
    const gl = this.gl, E = this.exp, k = state.k, h = this.hatchPic(k);
    if (h.inked !== state.t) {
      this.inkStrokes(h);
      h.inked = state.t;
    }
    const masks = this.texture(`masks${k}`, { w: E.mw, h: E.mh, data: E.inkMask, internal: gl.RGBA16F, format: gl.RGBA, type: gl.FLOAT }, state.t);
    return [masks, h.t];
  }

  // A picture on the GPU to draw into, `w` by `h`: its texture and frame.
  pic(w, h) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, fb, w, h };
  }

  // Draw with program `p` into picture `into` from `textures` ({ name:
  // texture }), with `floats` ({ name: value }) set.
  pass(p, into, textures, floats = {}) {
    const gl = this.gl;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.fb);
    gl.viewport(0, 0, into.w, into.h);
    let unit = 0;
    for (const [name, tex] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(p, name), unit++);
    }
    for (const [name, v] of Object.entries(floats)) gl.uniform1f(gl.getUniformLocation(p, name), v);
    gl.uniform2f(gl.getUniformLocation(p, "uSize"), into.w, into.h);
    this.quadDraw(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // The layers that never change, packed into one picture (see PACK_FS);
  // again when the doors are drawn again, or the drawings remade.
  layersTexture() {
    const E = this.exp, w = E.paper.width, h = E.paper.height;
    if (!this.layersPic || this.layersPic.w !== w || this.layersPic.h !== h) this.layersPic = this.pic(w, h);
    const v = `${E.shadowLayer.width}|${E.doorsDrawn}|${w}`;
    if (this.layersPic.v !== v) {
      const tex = {
        uShadow: this.texture("shadow", E.shadowLayer, E.shadowLayer),
        uMark: this.texture("mark", E.markLayer, E.markLayer),
        uWall: this.texture("wall", E.wallLayer, E.wallLayer),
        uDoor: this.texture("door", E.doorLayer, E.doorsDrawn),
      };
      this.pass(this.packProg, this.layersPic, tex);
      this.layersPic.v = v;
    }
    return this.layersPic.t;
  }

  // The shape of what has been seen: only what has changed in it sent.
  seenTexture() {
    const E = this.exp, c = E.seenShape, fresh = this.sources.seen !== c;
    if (!fresh && !E.seenChanged) return this.tex.seen;
    const t = this.texture("seen", c, {}, undefined, fresh ? null : E.seenChanged);
    E.seenChanged = null;
    return t;
  }

  // The sight, easing in as the canvas drawing's does: from what showed as
  // it was cast anew (a picture kept on the GPU) toward what is in sight
  // now, into a picture of the sight as it shows.
  sightTexture(now) {
    const E = this.exp, S = E.S, target = E.sightCanvas.target, w = target.width, h = target.height;
    if (!this.sightPics || this.sightPics.w !== w || this.sightPics.h !== h) {
      this.sightPics = { w, h, from: this.pic(w, h), spare: this.pic(w, h), eased: this.pic(w, h), cast: null, at: 0, k: 1 };
      this.versions.sightTo = null;
    }
    const P = this.sightPics, tau = Math.max(1, S.reveal * 350), kAt = (t) => 1 - Math.exp(-(t - P.at) / tau);
    if (P.cast !== E.sightCasts) {
      // A new sight: what shows now becomes where it eases from.
      if (P.cast !== null && this.tex.sightTo) {
        this.pass(this.ease, P.spare, { uFrom: P.from.t, uTo: this.tex.sightTo }, { uK: kAt(now) });
        [P.from, P.spare] = [P.spare, P.from];
      }
      this.texture("sightTo", target, E.sightCasts);
      // (The first sight shows at once.)
      P.at = P.cast === null ? -1e9 : now;
      P.cast = E.sightCasts;
      P.k = -1;
    }
    // (Eased again each frame until it is all but there.)
    const k = kAt(now);
    if (P.k < 0.999) {
      this.pass(this.ease, P.eased, { uFrom: P.from.t, uTo: this.tex.sightTo }, { uK: k });
      P.k = k;
    }
    return P.eased.t;
  }

  // The one quad, drawn with program `p`.
  quadDraw(p) {
    const gl = this.gl, l = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Draw the view onto the canvas: the camera at map point `cam`, `sc`
  // device pixels a map unit, the player's light (where the letter is drawn)
  // at map point `light`, at
  // `now` (ms). As drawMap does, a new drawing of the inks fades in over the
  // old.
  draw(cam, sc, light, now) {
    const gl = this.gl, E = this.exp, S = E.S, st = E.stat, t = now / 1000;
    if (!st) return;
    const { mw, mh, TS } = E, cv = gl.canvas;
    const fadeK = Math.max(0, Math.min(1, (now - st.t) / Math.max(1, S.reveal * 1000)));
    if (fadeK >= 1) E.prev = null;
    const prev = E.prev && E.prev.t ? E.prev : null;
    const [masks, hatch] = this.inks(st);
    const [pMasks, pHatch] = prev ? this.inks(prev) : [masks, hatch];
    // (What changed is sent again: the paper, the masks after a redraw, the
    // shape of what has been seen as it grows, the sight as it eases, the
    // light when cast anew, the lamps when relit.)
    const T = {
      uLit: this.texture("lit", E.lit, `${E.lit.width}x${E.lit.height}|${E.painted}`),
      uLayers: this.layersTexture(), uFloor: this.texture("floor", E.floorLayer, E.floorLayer),
      uMasks: masks, uHatch: hatch, uPMasks: pMasks, uPHatch: pHatch,
      uSeen: this.seenTexture(),
      uSight: this.sightTexture(now),
      uLampSight: this.texture("lampSight", E.sightCanvas.lamps, `${E.sightCasts}|${E.sightCanvas.lamps.width}`),
      uLight: this.texture("light", E.lightReach ?? E.lit, `${E.lightFrom}|${E.lightReach?.width}`),
      uLamp: this.maskTexture("lamp", E.lampLevel ?? new Float32Array(mw * mh), E.lampLevel),
    };
    const p = this.compose;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    let unit = 0;
    for (const [name, tex] of Object.entries(T)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(this.loc(p, name), unit++);
    }
    const u = (name, ...v) => gl[`uniform${v.length}f`](this.loc(p, name), ...v);
    u("uCam", ...cam); u("uSc", sc); u("uCanvas", cv.width, cv.height);
    u("uPaper", E.paper.width, E.paper.height); u("uMask", mw, mh); u("uScale", E.scale); u("uTS", TS); u("uMap", E.W * TS, E.H * TS);
    u("uSightScale", E.sightScale); u("uSightSize", E.sightCanvas.eased.width, E.sightCanvas.eased.height);
    u("uSightFrom", ...(E.sightFrom ?? [-1e9, -1e9]));
    u("uFade", prev ? 1 : 0); u("uFadeK", fadeK);
    // The light's flicker, as castLight's: brightness and size.
    const box = E.lightBox;
    u("uLightOn", box && E.lightReach ? 1 : 0);
    if (box && E.lightReach) {
      const wave = (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 12.7 + 1) + 0.4 * Math.sin(t * 3.1 + 2)) / 2;
      const swell = (Math.sin(t * 5.1) + 0.5 * Math.sin(t * 8.9 + 0.7) + 0.3 * Math.sin(t * 13.3 + 2)) / 1.8;
      u("uBright", 1 - S.flicker * 0.25 * (wave + 1) / 2);
      u("uLightK", 1 + S.flickerSize * swell);
      u("uLightBox", box.x, box.y, box.w, box.res);
      u("uLightSize", E.lightReach.width);
      // (Cast from the player's square; following the letter on its way.)
      const [lx, ly] = E.lightFrom ?? [light.x, light.y];
      u("uLightC", lx, ly);
      u("uLightShift", light.x - lx, light.y - ly);
    }
    u("uDark", ...hex(S.darkColor)); u("uOut", ...hex(S.outColor)); u("uWarm", 1, 196 / 255, 120 / 255);
    u("uWarmth", S.warmth); u("uLampWarmth", LAMP_WARMTH); u("uNearInk", S.nearInk); u("uNearSoft", S.nearSoft);
    u("uSeeHatchC", ...hex(S.seeHatchC)); u("uMemHatchC", ...hex(S.memHatchC));
    u("uSeeMarkC", ...hex(S.seeMarkC)); u("uSeeWallC", ...hex(S.seeWallC)); u("uMemMarkC", ...hex(S.memMarkC)); u("uMemWallC", ...hex(S.memWallC));
    u("uSeeMark", S.seeMark); u("uSeeWall", S.seeWall); u("uMemMark", S.memMark); u("uMemWall", S.memWall);
    u("uShadowC", 70 / 255, 62 / 255, 55 / 255);
    // Each fire in sight flickering its own way (as compose's).
    const fires = (E.lampsSeen ?? []).filter((l) => l.fire).slice(0, 8);
    gl.uniform1i(this.loc(p, "uFireN"), fires.length);
    fires.forEach((l, i) => {
      const { x, y, out, ph } = l.fire;
      gl.uniform4f(this.loc(p, `uFires[${i}]`), x * TS, y * TS, out * TS, ph);
      gl.uniform1f(this.loc(p, `uFireK[${i}]`), 1 + 0.04 * (0.6 * Math.sin(t * 4.3 + ph * 1.3) + 0.4 * Math.sin(t * 9.1 + ph * 0.6)));
      const k = Math.max(0, Math.min(1, 0.5 + 0.3 * Math.sin(t * 5.3 + ph) + 0.2 * Math.sin(t * 11.7 + ph * 1.9) + 0.15 * Math.sin(t * 17.9 + ph * 0.7)));
      gl.uniform1f(this.loc(p, `uFireDim[${i}]`), 0.3 * k);
    });
    this.quadDraw(p);
  }
}
