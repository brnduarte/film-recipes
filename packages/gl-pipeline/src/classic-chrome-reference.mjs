// Pure-JS mirror of packages/gl-pipeline/src/shaders/classic-chrome.frag.glsl
// (which is itself a GLSL mirror of crates/recipe-engine's Rust pipeline).
//
// This file exists so the shader's math can be checked for parity against
// the Rust golden fixtures (packages/gl-pipeline/test/parity.mjs) without
// needing a WebGL context in the test runner. It intentionally follows the
// GLSL source structure/naming (not idiomatic JS) so a diff against the
// .glsl file is easy to eyeball when either side changes.
//
// Recipe-derived constants below are fixed to classic_chrome_recipe()'s
// values (DR400, tone{highlight:-2, shadow:-1}, color:-2,
// color_chrome_effect: Weak, color_chrome_fx_blue: Off, WB: default/5500K,
// exposure: 0) — same fixed inputs the .glsl uniforms would carry for this
// recipe.

const WB_GAIN = [1, 1, 1]; // default WhiteBalance is a no-op, see white_balance.rs
const EXPOSURE_STOPS = 0.0;
const SATURATION_GAIN = 1.0 + -2 * 0.1; // recipe.color = -2
const COLOR_CHROME_AMOUNT = 0.35; // Weak
const COLOR_CHROME_FX_BLUE_AMOUNT = 0.0; // Off

function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}

function mix(a, b, t) {
  return a + t * (b - a);
}

function applyCurve3(x, p0, p1, p2, p3) {
  x = clamp(x, 0, 1);
  if (x <= p1[0]) return mix(p0[1], p1[1], (x - p0[0]) / (p1[0] - p0[0]));
  if (x <= p2[0]) return mix(p1[1], p2[1], (x - p1[0]) / (p2[0] - p1[0]));
  return mix(p2[1], p3[1], (x - p2[0]) / (p3[0] - p2[0]));
}

function applyCurve4(x, p0, p1, p2, p3, p4) {
  x = clamp(x, 0, 1);
  if (x <= p1[0]) return mix(p0[1], p1[1], (x - p0[0]) / (p1[0] - p0[0]));
  if (x <= p2[0]) return mix(p1[1], p2[1], (x - p1[0]) / (p2[0] - p1[0]));
  if (x <= p3[0]) return mix(p2[1], p3[1], (x - p2[0]) / (p3[0] - p2[0]));
  return mix(p3[1], p4[1], (x - p3[0]) / (p4[0] - p3[0]));
}

function dynamicRangeCurve(x) {
  const shadowLift = 0.05;
  const highlightPull = 0.07;
  return applyCurve3(
    x,
    [0.0, Math.max(shadowLift, 0.0)],
    [0.25, 0.25 + shadowLift * 0.5],
    [0.75, 0.75 - highlightPull * 0.5],
    [1.0, Math.min(1.0 - highlightPull, 1.0)],
  );
}

function filmCurve(x) {
  return applyCurve4(x, [0.0, 0.02], [0.18, 0.16], [0.5, 0.5], [0.82, 0.86], [1.0, 0.97]);
}

function splitTone([r, g, b]) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const shadowWeight = Math.pow(1.0 - luma, 2.0) * 0.04;
  const highlightWeight = Math.pow(luma, 2.0) * 0.03;
  return [
    clamp(r - shadowWeight * 0.5 + highlightWeight, 0, 1),
    clamp(g + shadowWeight * 0.3 + highlightWeight * 0.5, 0, 1),
    clamp(b + shadowWeight * 0.6 - highlightWeight * 0.5, 0, 1),
  ];
}

function rgbToHsv([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue;
  if (delta < 1e-10) hue = 0.0;
  else if (max === r) hue = 60.0 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60.0 * ((b - r) / delta + 2.0);
  else hue = 60.0 * ((r - g) / delta + 4.0);
  if (hue < 0) hue += 360.0;
  const sat = max < 1e-10 ? 0.0 : delta / max;
  return [hue, sat, max];
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const hPrime = h / 60.0;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let r1, g1, b1;
  const sector = Math.floor(hPrime) % 6;
  if (sector === 0) [r1, g1, b1] = [c, x, 0];
  else if (sector === 1) [r1, g1, b1] = [x, c, 0];
  else if (sector === 2) [r1, g1, b1] = [0, c, x];
  else if (sector === 3) [r1, g1, b1] = [0, x, c];
  else if (sector === 4) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return [r1 + m, g1 + m, b1 + m];
}

function colorChromeEffect(rgb, amount) {
  if (amount <= 0) return rgb;
  const [h, s, v] = rgbToHsv(rgb);
  const compressed = s - amount * s * s * 0.5;
  return hsvToRgb(h, clamp(compressed, 0, 1), v);
}

function colorChromeFxBlue(rgb, amount) {
  if (amount <= 0) return rgb;
  const [h, s, v] = rgbToHsv(rgb);
  if (h < 200.0 || h > 260.0) return rgb;
  const compressed = s - amount * s * s * 0.6;
  return hsvToRgb(h, clamp(compressed, 0, 1), v);
}

export function classicChromeReference([r, g, b]) {
  // 1. White balance
  let rgb = [r * WB_GAIN[0], g * WB_GAIN[1], b * WB_GAIN[2]];

  // 2. Exposure
  const gain = Math.pow(2.0, EXPOSURE_STOPS);
  rgb = rgb.map((c) => c * gain);

  // 3. Dynamic range + film curve, then split-tone
  rgb = rgb.map((c) => filmCurve(dynamicRangeCurve(c)));
  rgb = splitTone(rgb);

  // 4. Saturation
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  rgb = rgb.map((c) => luma + (c - luma) * SATURATION_GAIN);

  // 5-6. Color Chrome Effect / FX Blue
  rgb = colorChromeEffect(rgb, COLOR_CHROME_AMOUNT);
  rgb = colorChromeFxBlue(rgb, COLOR_CHROME_FX_BLUE_AMOUNT);

  return rgb.map((c) => clamp(c, 0, 1));
}
