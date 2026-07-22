// Pure-JS mirror of shaders/recipe.frag.glsl (itself a GLSL mirror of
// crates/recipe-engine's Rust pipeline) plus the uniform-computation math in
// recipe-uniforms.ts. Exists so the shader's math can be checked for parity
// against the Rust golden fixtures (test/parity.mjs) without a WebGL
// context or a TS/bundler toolchain in the Node test runner. Intentionally
// duplicates recipe-uniforms.ts's formulas (rather than importing it) so
// this file has zero build-step dependency — see that file's header comment.
//
// Recipe shape expected: { film_simulation, dynamic_range,
// tone: { highlight, shadow }, color, color_chrome_effect,
// color_chrome_fx_blue, exposure_compensation,
// white_balance: { kelvin, red_shift, blue_shift } }, matching the
// snake_case wire format in packages/core-types.

function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}

function mix(a, b, t) {
  return a + t * (b - a);
}

function isMonochrome(sim) {
  return sim === "Acros" || sim === "Monochrome" || sim === "Sepia";
}

function strengthFactor(strength) {
  if (strength === "Off") return 0.0;
  if (strength === "Weak") return 0.35;
  return 0.7; // Strong
}

// white_balance.rs mirror.
const REFERENCE_KELVIN = 5500;

function rawKelvinRgb(kelvin) {
  const temp = clamp(kelvin, 1000, 40000) / 100.0;
  const red = temp <= 66.0 ? 255.0 : clamp(329.69873 * Math.pow(temp - 60.0, -0.13320476), 0.0, 255.0);
  const green =
    temp <= 66.0
      ? clamp(99.4708 * Math.log(temp) - 161.11957, 0.0, 255.0)
      : clamp(288.12216 * Math.pow(temp - 60.0, -0.075514846), 0.0, 255.0);
  const blue =
    temp >= 66.0 ? 255.0 : temp <= 19.0 ? 0.0 : clamp(138.51773 * Math.log(temp - 10.0) - 305.0448, 0.0, 255.0);
  return [red, green, blue];
}

function kelvinToRgbGain(kelvin) {
  const raw = rawKelvinRgb(kelvin);
  const reference = rawKelvinRgb(REFERENCE_KELVIN);
  return [reference[0] / raw[0], reference[1] / raw[1], reference[2] / raw[2]];
}

function wbGainForRecipe(wb) {
  const [gr, gg, gb] = kelvinToRgbGain(wb.kelvin);
  const redShift = 1.0 + wb.red_shift * 0.02;
  const blueShift = 1.0 + wb.blue_shift * 0.02;
  return [gr * redShift, gg, gb * blueShift];
}

function dynamicRangeParams(dr, tone) {
  const drShadowLift = dr === "Dr100" ? 0.0 : dr === "Dr200" ? 0.03 : 0.06;
  const drHighlightPull = dr === "Dr100" ? 0.0 : dr === "Dr200" ? 0.05 : 0.1;
  const shadowLift = drShadowLift + Math.max(tone.shadow, 0) * 0.015 - Math.abs(Math.min(tone.shadow, 0)) * 0.01;
  const highlightPull =
    drHighlightPull + Math.max(tone.highlight, 0) * 0.02 - Math.abs(Math.min(tone.highlight, 0)) * 0.015;
  return { shadowLift, highlightPull };
}

// Must match the mode indices documented at u_overlayMode in
// shaders/recipe.frag.glsl / BLEND_MODE_INDEX in recipe-uniforms.ts.
const BLEND_MODE_INDEX = {
  Multiply: 0,
  ColorBurn: 1,
  Overlay: 2,
  SoftLight: 3,
  HardLight: 4,
  HardMix: 5,
  Difference: 6,
  Exclusion: 7,
};

const NEUTRAL_OVERLAY = { enabled: false, mode: "Multiply", opacity: 0.5 };

// Identity manual grade — a no-op, matching ManualAdjustments::default().
const NEUTRAL_MANUAL = {
  exposure: 0,
  white_balance: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  black_level: 0,
  white_level: 1,
  color_grade: { enabled: false, harmony: "Complementary", intensity: 0.5, stops: [] },
  overlay: NEUTRAL_OVERLAY,
};

const MAX_GRADE_STOPS = 6;

// pipeline.rs::grade_hsv_to_rgb — standard HSV sextant conversion (hue deg).
function gradeHsvToRgb(h, s, v) {
  const c = v * s;
  const hPrime = (((h % 360) + 360) % 360) / 60.0;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let r1, g1, b1;
  const sextant = Math.floor(hPrime);
  if (sextant === 0) [r1, g1, b1] = [c, x, 0];
  else if (sextant === 1) [r1, g1, b1] = [x, c, 0];
  else if (sextant === 2) [r1, g1, b1] = [0, c, x];
  else if (sextant === 3) [r1, g1, b1] = [0, x, c];
  else if (sextant === 4) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return [r1 + m, g1 + m, b1 + m];
}

function computeUniformsForRecipe(recipe, manual) {
  const { shadowLift, highlightPull } = dynamicRangeParams(recipe.dynamic_range, recipe.tone);
  const grade = manual.color_grade ?? NEUTRAL_MANUAL.color_grade;
  const stopCount = Math.min(grade.stops.length, MAX_GRADE_STOPS);
  const colorGradeColors = grade.stops
    .slice(0, MAX_GRADE_STOPS)
    .map((s) => gradeHsvToRgb(s.hue, s.saturation, s.value));
  const overlay = manual.overlay ?? NEUTRAL_OVERLAY;
  return {
    wbGain: wbGainForRecipe(recipe.white_balance),
    exposureStops: recipe.exposure_compensation + manual.exposure,
    shadowLift,
    highlightPull,
    useClassicChromeCurve: recipe.film_simulation === "ClassicChrome",
    saturationGain: isMonochrome(recipe.film_simulation) ? 0.0 : 1.0 + recipe.color * 0.1,
    colorChromeAmount: strengthFactor(recipe.color_chrome_effect),
    colorChromeFxBlueAmount: strengthFactor(recipe.color_chrome_fx_blue),
    useSepiaTone: recipe.film_simulation === "Sepia",
    manualWhiteBalance: manual.white_balance,
    manualContrast: manual.contrast,
    manualHighlights: manual.highlights,
    manualShadows: manual.shadows,
    manualSaturation: manual.saturation,
    manualBlackLevel: manual.black_level,
    manualWhiteLevel: manual.white_level,
    colorGradeEnabled: grade.enabled && stopCount > 0 && grade.intensity > 0,
    colorGradeIntensity: grade.intensity,
    colorGradeStopCount: stopCount,
    colorGradeColors,
    overlayEnabled: overlay.enabled && overlay.opacity > 0,
    overlayMode: BLEND_MODE_INDEX[overlay.mode],
    overlayOpacity: overlay.opacity,
  };
}

// pipeline.rs::apply_color_grade — interpolate a tint across evenly-spaced
// stops by luma, add the chroma offset (tint minus its own luma).
function colorGrade(rgb, u) {
  if (!u.colorGradeEnabled || u.colorGradeStopCount <= 0 || u.colorGradeIntensity <= 0) {
    return rgb;
  }
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const n = u.colorGradeStopCount;
  let tint;
  if (n === 1) {
    tint = u.colorGradeColors[0];
  } else {
    const x = clamp(luma, 0, 1);
    const seg = x * (n - 1);
    let i = Math.floor(seg);
    if (i > n - 2) i = n - 2;
    const t = seg - i;
    const a = u.colorGradeColors[i];
    const b = u.colorGradeColors[i + 1];
    tint = [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  }
  const tintLuma = 0.2126 * tint[0] + 0.7152 * tint[1] + 0.0722 * tint[2];
  const k = u.colorGradeIntensity;
  return [rgb[0] + (tint[0] - tintLuma) * k, rgb[1] + (tint[1] - tintLuma) * k, rgb[2] + (tint[2] - tintLuma) * k];
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

function dynamicRangeCurve(x, shadowLift, highlightPull) {
  return applyCurve3(
    x,
    [0.0, Math.max(shadowLift, 0.0)],
    [0.25, 0.25 + shadowLift * 0.5],
    [0.75, 0.75 - highlightPull * 0.5],
    [1.0, Math.min(1.0 - highlightPull, 1.0)],
  );
}

function classicChromeCurve(x) {
  return applyCurve4(x, [0.0, 0.02], [0.18, 0.16], [0.5, 0.5], [0.82, 0.86], [1.0, 0.97]);
}

function classicChromeSplitTone([r, g, b]) {
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

function sepiaTone([, g]) {
  const luma = g; // R=G=B already, any channel is the luma value
  return [clamp(luma * 1.07, 0, 1), clamp(luma * 0.86, 0, 1), clamp(luma * 0.62, 0, 1)];
}

// blend.rs mirror: Photoshop-style blend modes, base=original (Cb),
// src=graded recipe result (Cs). Per-channel formulas.
function bmMultiply(b, s) { return b * s; }
function bmColorBurn(b, s) {
  if (b >= 1.0) return 1.0;
  if (s <= 0.0) return 0.0;
  return 1.0 - Math.min((1.0 - b) / s, 1.0);
}
function bmOverlay(b, s) { return b <= 0.5 ? 2.0 * b * s : 1.0 - 2.0 * (1.0 - b) * (1.0 - s); }
function bmHardLight(b, s) { return s <= 0.5 ? 2.0 * b * s : 1.0 - 2.0 * (1.0 - b) * (1.0 - s); }
function bmSoftLightD(x) { return x <= 0.25 ? ((16.0 * x - 12.0) * x + 4.0) * x : Math.sqrt(x); }
function bmSoftLight(b, s) {
  return s <= 0.5 ? b - (1.0 - 2.0 * s) * b * (1.0 - b) : b + (2.0 * s - 1.0) * (bmSoftLightD(b) - b);
}
function bmHardMix(b, s) { return b + s >= 1.0 ? 1.0 : 0.0; }
function bmDifference(b, s) { return Math.abs(b - s); }
function bmExclusion(b, s) { return b + s - 2.0 * b * s; }

const BLEND_SEPARABLE = [bmMultiply, bmColorBurn, bmOverlay, bmSoftLight, bmHardLight, bmHardMix, bmDifference, bmExclusion];

// blend.rs::blend_pixel dispatcher.
function blendPixel(base, src, mode) {
  const fn = BLEND_SEPARABLE[BLEND_MODE_INDEX[mode]];
  return [fn(base[0], src[0]), fn(base[1], src[1]), fn(base[2], src[2])];
}

// blend.rs::apply_overlay — self-blend `graded` with itself by mode, mixed
// in by opacity (0 = the recipe unchanged, 1 = the full self-blend). Adds on
// top of the recipe rather than compositing against the pre-recipe photo.
function applyOverlay(graded, u) {
  if (!u.overlayEnabled || u.overlayOpacity <= 0.0) return graded;
  const mode = Object.keys(BLEND_MODE_INDEX).find((k) => BLEND_MODE_INDEX[k] === u.overlayMode);
  const blended = blendPixel(graded, graded, mode);
  const o = clamp(u.overlayOpacity, 0, 1);
  return [
    graded[0] + (blended[0] - graded[0]) * o,
    graded[1] + (blended[1] - graded[1]) * o,
    graded[2] + (blended[2] - graded[2]) * o,
  ];
}

export function recipeReference([r, g, b], recipe, manual = NEUTRAL_MANUAL) {
  const u = computeUniformsForRecipe(recipe, manual);

  // 1. White balance
  let rgb = [r * u.wbGain[0], g * u.wbGain[1], b * u.wbGain[2]];

  // 2. Exposure
  const gain = Math.pow(2.0, u.exposureStops);
  rgb = rgb.map((c) => c * gain);

  // 3. Dynamic range curve + film characteristic curve, then split-tone
  rgb = rgb.map((c) => dynamicRangeCurve(c, u.shadowLift, u.highlightPull));
  if (u.useClassicChromeCurve) {
    rgb = rgb.map(classicChromeCurve);
    rgb = classicChromeSplitTone(rgb);
  }

  // 4. Saturation
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  rgb = rgb.map((c) => luma + (c - luma) * u.saturationGain);

  // 5-6. Color Chrome Effect / FX Blue
  rgb = colorChromeEffect(rgb, u.colorChromeAmount);
  rgb = colorChromeFxBlue(rgb, u.colorChromeFxBlueAmount);

  // 7. Sepia tint (post-saturation special case)
  if (u.useSepiaTone) {
    rgb = sepiaTone(rgb);
  }

  // 8. Manual global grade (pipeline.rs::apply_manual_grade) — order must
  // match the Rust mirror exactly.
  rgb = [rgb[0] * (1.0 + u.manualWhiteBalance * 0.2), rgb[1], rgb[2] * (1.0 - u.manualWhiteBalance * 0.2)];
  const contrast = 1.0 + u.manualContrast;
  rgb = rgb.map((c) => (c - 0.5) * contrast + 0.5);
  rgb = rgb.map((c) => {
    const highlightWeight = clamp((c - 0.5) * 2.0, 0, 1);
    const shadowWeight = clamp((0.5 - c) * 2.0, 0, 1);
    return c + u.manualHighlights * 0.25 * highlightWeight + u.manualShadows * 0.25 * shadowWeight;
  });
  const levelsRange = Math.max(u.manualWhiteLevel - u.manualBlackLevel, 1e-3);
  rgb = rgb.map((c) => (c - u.manualBlackLevel) / levelsRange);
  const manualLuma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const sat = 1.0 + u.manualSaturation;
  rgb = rgb.map((c) => manualLuma + (c - manualLuma) * sat);

  // 9. Color grade (luminance color-map).
  rgb = colorGrade(rgb, u);

  // 10. Overlay: blend-mode self-composite.
  rgb = applyOverlay(rgb, u);

  return rgb.map((c) => clamp(c, 0, 1));
}
