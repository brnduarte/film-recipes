#version 300 es
precision highp float;

// Classic Chrome preview shader — GLSL mirror of
// crates/recipe-engine/src/{white_balance,tone,classic_chrome,color_chrome,pipeline}.rs
//
// Stage order MUST match recipe-engine::pipeline::PIPELINE_ORDER exactly:
//   1. White balance
//   2. Exposure
//   3. Dynamic range + film characteristic tone curve (+ split-tone)
//   4. Saturation
//   5. Color Chrome Effect
//   6. Color Chrome FX Blue
// (Sharpness/NR/grain/vignette are non-per-pixel stages, not in this shader.)
//
// NOT YET visually validated against a real Fuji Classic Chrome JPEG — see
// crates/recipe-engine/src/classic_chrome.rs doc comment. Control points
// below must be kept numerically identical to the Rust implementation; see
// packages/gl-pipeline/src/classic-chrome-reference.ts for the parity test
// that checks this.

uniform sampler2D u_image;

// Recipe-derived uniforms (all provided by JS, computed from a Recipe).
uniform vec3 u_wbGain;       // kelvin_to_rgb_gain() * shift, from white_balance.rs
uniform float u_exposureStops;
uniform float u_saturationGain; // 1.0 + color * 0.1
uniform float u_colorChromeAmount;     // strength_factor(color_chrome_effect)
uniform float u_colorChromeFxBlueAmount; // strength_factor(color_chrome_fx_blue)

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

// tone.rs::dynamic_range_curve for DR400, tone{highlight:-2, shadow:-1}
// (Classic Chrome's fixed recipe values — see classic_chrome.rs).
float dynamicRangeCurve(float x) {
  const float shadowLift = 0.05; // 0.06 - abs(-1)*0.01, classic_chrome.rs tone.shadow=-1
  const float highlightPull = 0.07; // 0.10 + (-2)*0.015
  return applyCurve3(
    x,
    vec2(0.0, max(shadowLift, 0.0)),
    vec2(0.25, 0.25 + shadowLift * 0.5),
    vec2(0.75, 0.75 - highlightPull * 0.5),
    vec2(1.0, min(1.0 - highlightPull, 1.0))
  );
}

// classic_chrome.rs::tone_curve()
float filmCurve(float x) {
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
vec3 splitTone(vec3 rgb) {
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

void main() {
  vec3 rgb = texture(u_image, v_uv).rgb;

  // 1. White balance
  rgb *= u_wbGain;

  // 2. Exposure
  rgb *= pow(2.0, u_exposureStops);

  // 3. Dynamic range + film curve + split-tone
  rgb = vec3(
    filmCurve(dynamicRangeCurve(rgb.r)),
    filmCurve(dynamicRangeCurve(rgb.g)),
    filmCurve(dynamicRangeCurve(rgb.b))
  );
  rgb = splitTone(rgb);

  // 4. Saturation (pipeline.rs::apply_saturation)
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = luma + (rgb - luma) * u_saturationGain;

  // 5-6. Color Chrome Effect / FX Blue
  rgb = colorChromeEffect(rgb, u_colorChromeAmount);
  rgb = colorChromeFxBlue(rgb, u_colorChromeFxBlueAmount);

  outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
