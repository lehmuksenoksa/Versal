// The rules' own maths (spec/groundwork.md, section 8): sine, cosine, the
// angle of a line and a distance, worked out the same in every browser.
// JavaScript leaves Math.sin, cos, atan2 and hypot to each engine, which may
// differ in the last digit; now and then a rounding then goes the other way,
// a level comes out different, and a replay made in one browser goes off
// course in another. These use only adding, multiplying, dividing, rounding
// and the square root, which every engine must work out exactly alike.
// (Sine, cosine and arctangent by fdlibm's polynomials, as most C libraries
// do; within a few parts in 10^16 of the true values.)

// π/2 in two parts, the first exact to 33 bits, for reducing an angle.
const PIO2_HI = 1.57079632673412561417e+00, PIO2_LO = 6.07710050650619224932e-11;
const S = [-1.66666666666666324348e-01, 8.33333333332248946124e-03, -1.98412698298579493134e-04, 2.75573137070700676789e-06, -2.50507602534068634195e-08, 1.58969099521155010221e-10];
const C = [4.16666666666666019037e-02, -1.38888888888741095749e-03, 2.48015872894767294178e-05, -2.75573143513906633035e-07, 2.08757232129817482790e-09, -1.13596475577881948265e-11];

// Sine and cosine of x in [-π/4, π/4].
const ksin = (x) => { const z = x * x; return x + x * z * (S[0] + z * (S[1] + z * (S[2] + z * (S[3] + z * (S[4] + z * S[5]))))); };
const kcos = (x) => { const z = x * x; return 1 - 0.5 * z + z * z * (C[0] + z * (C[1] + z * (C[2] + z * (C[3] + z * (C[4] + z * C[5]))))); };

// x as a quarter turn `q` (0 to 3) and what's left, in [-π/4, π/4].
function reduce(x) {
  const k = Math.round(x / PIO2_HI);
  return [(x - k * PIO2_HI) - k * PIO2_LO, ((k % 4) + 4) % 4];
}

export function sin(x) {
  const [y, q] = reduce(x);
  return q === 0 ? ksin(y) : q === 1 ? kcos(y) : q === 2 ? -ksin(y) : -kcos(y);
}

export function cos(x) {
  const [y, q] = reduce(x);
  return q === 0 ? kcos(y) : q === 1 ? -ksin(y) : q === 2 ? -kcos(y) : ksin(y);
}

const ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];

export function atan(x) {
  const neg = x < 0;
  let a = neg ? -x : x, id;
  if (a < 0.4375) id = -1;
  else if (a < 1.1875) {
    if (a < 0.6875) { id = 0; a = (2 * a - 1) / (2 + a); }
    else { id = 1; a = (a - 1) / (a + 1); }
  } else if (a < 2.4375) { id = 2; a = (a - 1.5) / (1 + 1.5 * a); }
  else { id = 3; a = -1 / a; }
  const z = a * a, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  const r = id < 0 ? a - a * (s1 + s2) : ATAN_HI[id] - ((a * (s1 + s2) - ATAN_LO[id]) - a);
  return neg ? -r : r;
}

// The angle of the line from the origin to (x, y), from -π to π.
export function atan2(y, x) {
  if (x > 0) return atan(y / x);
  if (x < 0) return y >= 0 ? atan(y / x) + Math.PI : atan(y / x) - Math.PI;
  return y > 0 ? Math.PI / 2 : y < 0 ? -Math.PI / 2 : 0;
}

// The length of (x, y).
export const hypot = (x, y) => Math.sqrt(x * x + y * y);
