#version 300 es
precision highp float;

// Generalized recipe preview shader — GLSL mirror of
// crates/recipe-engine/src/{white_balance,tone,classic_chrome,color_chrome,
// pipeline}.rs, driven entirely by uniforms so ONE compiled program covers
// every Phase 1 recipe (Provia/Velvia/ClassicChrome/Acros), matching how
// `pipeline::apply_recipe_to_pixel` takes any `Recipe` rather than having a
// separate function per film simulation. Uniform values are computed from a
// `Recipe` by recipe-uniforms.ts (see that file for the Rust formulas each
// uniform mirrors).
//
// Stage order MUST match recipe-engine::pipeline::PIPELINE_ORDER exactly:
//   1. White balance
//   2. Exposure
//   3. Dynamic range curve + film characteristic curve (+ split-tone)
//   4. Saturation
//   5. Color Chrome Effect
//   6. Color Chrome FX Blue
//   7. Sepia tint (Sepia only, post-saturation — see monochrome.rs)
// (Sharpness/NR/grain/vignette are non-per-pixel stages, not in this shader.)
//
// LIMITATION: only Classic Chrome has a non-identity film characteristic
// curve + split-tone in the Rust side today (tone.rs::film_characteristic_curve
// falls back to identity for every other simulation) — that's why this is
// captured as a single u_useClassicChromeCurve bool rather than a generic
// per-recipe control-point uniform array. If a future recipe (Phase 2) gets
// its own curve, this shader (and recipe-uniforms.ts / recipe-reference.mjs)
// needs to generalize further.
//
// NOT YET visually validated against real Fuji reference JPEGs — see the
// doc comments on classic_chrome.rs / velvia.rs / acros.rs.

uniform sampler2D u_image;

uniform vec3 u_wbGain;          // kelvin_to_rgb_gain() * shift, from white_balance.rs
uniform float u_exposureStops;  // recipe.exposure_compensation + manual.exposure
uniform float u_shadowLift;     // tone.rs::dynamic_range_curve shadow_lift
uniform float u_highlightPull;  // tone.rs::dynamic_range_curve highlight_pull
uniform bool u_useClassicChromeCurve; // film_characteristic_curve != identity
uniform float u_saturationGain; // 1.0 + color * 0.1, or 0.0 if monochrome
uniform float u_colorChromeAmount;      // strength_factor(color_chrome_effect)
uniform float u_colorChromeFxBlueAmount; // strength_factor(color_chrome_fx_blue)
uniform bool u_useSepiaTone;            // film_simulation == Sepia, monochrome.rs::apply_sepia_tone

// Manual global grade (ManualAdjustments), pipeline.rs::apply_manual_grade.
uniform float u_manualWhiteBalance; // -1..+1 cool..warm
uniform float u_manualContrast;     // -1..+1
uniform float u_manualHighlights;   // -1..+1
uniform float u_manualShadows;      // -1..+1
uniform float u_manualSaturation;   // -1..+1
uniform float u_manualBlackLevel;   // levels black point
uniform float u_manualWhiteLevel;   // levels white point

// Before/after split: pixels with v_uv.x < u_splitX render the untouched
// original (the "before" side); pixels to the right render the full recipe.
// u_splitX = 0.0 shows the recipe everywhere (used for thumbnails/exports);
// u_splitX = 1.0 shows the untouched original everywhere.
uniform float u_splitX;

in vec2 v_uv;
out vec4 outColor;

// --- curves.rs::ToneCurve::apply, unrolled for fixed-size control-point
// lists (3-segment / 4 points, and 4-segment / 5 points) ---
float applyCurve3(float x, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
  x = clamp(x, 0.0, 1.0);
  if (x <= p1.x) return mix(p0.y, p1.y, (x - p0.x) / (p1.x - p0.x));
  if (x <= p2.x) return mix(p1.y, p2.y, (x - p1.x) / (p2.x - p1.x));
  return mix(p2.y, p3.y, (x - p2.x) / (p3.x - p2.x));
}

float applyCurve4(float x, vec2 p0, vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  x = clamp(x, 0.0, 1.0);
  if (x <= p1.x) return mix(p0.y, p1.y, (x - p0.x) / (p1.x - p0.x));
  if (x <= p2.x) return mix(p1.y, p2.y, (x - p1.x) / (p2.x - p1.x));
  if (x <= p3.x) return mix(p2.y, p3.y, (x - p2.x) / (p3.x - p2.x));
  return mix(p3.y, p4.y, (x - p3.x) / (p4.x - p3.x));
}

// tone.rs::dynamic_range_curve, parameterized by the two uniforms above
// (computed per-recipe in recipe-uniforms.ts, since dynamic_range + tone are
// fixed inputs, not per-pixel).
float dynamicRangeCurve(float x) {
  float shadowLift = max(u_shadowLift, 0.0);
  float highlightPull = u_highlightPull;
  return applyCurve3(
    x,
    vec2(0.0, shadowLift),
    vec2(0.25, 0.25 + u_shadowLift * 0.5),
    vec2(0.75, 0.75 - highlightPull * 0.5),
    vec2(1.0, min(1.0 - highlightPull, 1.0))
  );
}

// classic_chrome.rs::tone_curve() — the only non-identity film curve among
// the Phase 1 recipes (see LIMITATION note above).
float classicChromeCurve(float x) {
  return applyCurve4(
    x,
    vec2(0.0, 0.02),
    vec2(0.18, 0.16),
    vec2(0.5, 0.5),
    vec2(0.82, 0.86),
    vec2(1.0, 0.97)
  );
}

// classic_chrome.rs::apply_split_tone
vec3 classicChromeSplitTone(vec3 rgb) {
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float shadowWeight = pow(1.0 - luma, 2.0) * 0.04;
  float highlightWeight = pow(luma, 2.0) * 0.03;
  return clamp(
    rgb + vec3(
      -shadowWeight * 0.5 + highlightWeight,
      shadowWeight * 0.3 + highlightWeight * 0.5,
      shadowWeight * 0.6 - highlightWeight * 0.5
    ),
    0.0,
    1.0
  );
}

// color_chrome.rs rgb_to_hsv / hsv_to_rgb, standard GLSL formulation.
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// color_chrome.rs::apply_color_chrome_effect
vec3 colorChromeEffect(vec3 rgb, float amount) {
  if (amount <= 0.0) return rgb;
  vec3 hsv = rgb2hsv(rgb);
  float compressed = hsv.y - amount * hsv.y * hsv.y * 0.5;
  return hsv2rgb(vec3(hsv.x, clamp(compressed, 0.0, 1.0), hsv.z));
}

// color_chrome.rs::apply_color_chrome_fx_blue (hue range 200-260 degrees ->
// 0.5556-0.7222 in GLSL's [0,1] hue space)
vec3 colorChromeFxBlue(vec3 rgb, float amount) {
  if (amount <= 0.0) return rgb;
  vec3 hsv = rgb2hsv(rgb);
  float hueDegrees = hsv.x * 360.0;
  if (hueDegrees < 200.0 || hueDegrees > 260.0) return rgb;
  float compressed = hsv.y - amount * hsv.y * hsv.y * 0.6;
  return hsv2rgb(vec3(hsv.x, clamp(compressed, 0.0, 1.0), hsv.z));
}

// monochrome.rs::apply_sepia_tone
vec3 sepiaTone(vec3 rgb) {
  float luma = rgb.g; // R=G=B already, any channel is the luma value
  return clamp(vec3(luma * 1.07, luma * 0.86, luma * 0.62), 0.0, 1.0);
}

void main() {
  vec3 rgb = texture(u_image, v_uv).rgb;

  // Left of the split shows the untouched original for before/after compare.
  if (v_uv.x < u_splitX) {
    outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
    return;
  }

  // 1. White balance
  rgb *= u_wbGain;

  // 2. Exposure
  rgb *= pow(2.0, u_exposureStops);

  // 3. Dynamic range curve + film characteristic curve, then split-tone
  rgb = vec3(dynamicRangeCurve(rgb.r), dynamicRangeCurve(rgb.g), dynamicRangeCurve(rgb.b));
  if (u_useClassicChromeCurve) {
    rgb = vec3(classicChromeCurve(rgb.r), classicChromeCurve(rgb.g), classicChromeCurve(rgb.b));
    rgb = classicChromeSplitTone(rgb);
  }

  // 4. Saturation (pipeline.rs::apply_saturation)
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = luma + (rgb - luma) * u_saturationGain;

  // 5-6. Color Chrome Effect / FX Blue
  rgb = colorChromeEffect(rgb, u_colorChromeAmount);
  rgb = colorChromeFxBlue(rgb, u_colorChromeFxBlueAmount);

  // 7. Sepia tint (post-saturation special case)
  if (u_useSepiaTone) {
    rgb = sepiaTone(rgb);
  }

  // 8. Manual global grade (pipeline.rs::apply_manual_grade) — order must
  // match the Rust mirror exactly.
  rgb.r *= 1.0 + u_manualWhiteBalance * 0.2;
  rgb.b *= 1.0 - u_manualWhiteBalance * 0.2;
  rgb = (rgb - 0.5) * (1.0 + u_manualContrast) + 0.5;
  vec3 highlightWeight = clamp((rgb - 0.5) * 2.0, 0.0, 1.0);
  vec3 shadowWeight = clamp((0.5 - rgb) * 2.0, 0.0, 1.0);
  rgb = rgb + u_manualHighlights * 0.25 * highlightWeight + u_manualShadows * 0.25 * shadowWeight;
  float levelsRange = max(u_manualWhiteLevel - u_manualBlackLevel, 1e-3);
  rgb = (rgb - u_manualBlackLevel) / levelsRange;
  float manualLuma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = manualLuma + (rgb - manualLuma) * (1.0 + u_manualSaturation);

  outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
