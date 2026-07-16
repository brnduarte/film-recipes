// Computes GLSL uniforms for shaders/recipe.frag.glsl from a `Recipe` (plus
// a manual exposure override, in stops). Mirrors the fixed, non-per-pixel
// inputs that crates/recipe-engine's pipeline.rs/tone.rs/color_chrome.rs
// compute from a Recipe: dynamic range + tone -> shadow lift/highlight pull
// (tone.rs::dynamic_range_curve), color -> saturation gain
// (pipeline.rs::apply_recipe_to_pixel step 5, including the acros.rs
// monochrome special-case), and color chrome strengths -> amounts
// (color_chrome.rs::strength_factor).
//
// White balance mirrors crates/recipe-engine/src/white_balance.rs: the
// Tanner Helland Kelvin->RGB polynomial, normalized to a 5500K reference so
// an unmodified recipe is a no-op, then Fuji's red/blue shift (each step a
// ~2% multiplicative nudge). Named recipes derive most of their look from
// these WB shifts, so this must be live in the preview.
//
// See recipe-reference.mjs for a plain-JS duplicate of this same math, used
// by the Node-based parity test (test/parity.mjs) against the Rust golden
// fixture — duplicated rather than imported so the Node test has no
// TS/bundler dependency, matching the existing classic-chrome-reference.mjs
// precedent.

import type { ColorChromeStrength, DynamicRange, FilmSimulation, Recipe, ToneSetting, WhiteBalance } from "@fuji-recipes/core-types";

// white_balance.rs::REFERENCE_KELVIN
const REFERENCE_KELVIN = 5500;

// white_balance.rs::raw_kelvin_rgb — Tanner Helland polynomial fit.
function rawKelvinRgb(kelvin: number): [number, number, number] {
  const temp = Math.min(Math.max(kelvin, 1000), 40000) / 100.0;

  const red = temp <= 66.0 ? 255.0 : clamp(329.69873 * Math.pow(temp - 60.0, -0.13320476), 0.0, 255.0);
  const green =
    temp <= 66.0
      ? clamp(99.4708 * Math.log(temp) - 161.11957, 0.0, 255.0)
      : clamp(288.12216 * Math.pow(temp - 60.0, -0.075514846), 0.0, 255.0);
  const blue =
    temp >= 66.0 ? 255.0 : temp <= 19.0 ? 0.0 : clamp(138.51773 * Math.log(temp - 10.0) - 305.0448, 0.0, 255.0);

  return [red, green, blue];
}

// white_balance.rs::kelvin_to_rgb_gain
function kelvinToRgbGain(kelvin: number): [number, number, number] {
  const raw = rawKelvinRgb(kelvin);
  const reference = rawKelvinRgb(REFERENCE_KELVIN);
  return [reference[0] / raw[0], reference[1] / raw[1], reference[2] / raw[2]];
}

// white_balance.rs::apply_white_balance — the per-channel gain (the per-pixel
// multiply happens in the shader via u_wbGain).
function wbGainForRecipe(wb: WhiteBalance): [number, number, number] {
  const [gr, gg, gb] = kelvinToRgbGain(wb.kelvin);
  const redShift = 1.0 + wb.red_shift * 0.02;
  const blueShift = 1.0 + wb.blue_shift * 0.02;
  return [gr * redShift, gg, gb * blueShift];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

export interface RecipeUniforms {
  wbGain: [number, number, number];
  exposureStops: number;
  shadowLift: number;
  highlightPull: number;
  useClassicChromeCurve: boolean;
  saturationGain: number;
  colorChromeAmount: number;
  colorChromeFxBlueAmount: number;
  useSepiaTone: boolean;
}

// acros.rs::is_monochrome
export function isMonochrome(sim: FilmSimulation): boolean {
  return sim === "Acros" || sim === "Monochrome" || sim === "Sepia";
}

// color_chrome.rs::strength_factor
export function strengthFactor(strength: ColorChromeStrength): number {
  switch (strength) {
    case "Off":
      return 0.0;
    case "Weak":
      return 0.35;
    case "Strong":
      return 0.7;
  }
}

// tone.rs::dynamic_range_curve's shadow_lift/highlight_pull computation
// (the curve itself is evaluated on the GPU; only these two scalars are
// precomputed here).
function dynamicRangeParams(dr: DynamicRange, tone: ToneSetting): { shadowLift: number; highlightPull: number } {
  const drShadowLift = dr === "Dr100" ? 0.0 : dr === "Dr200" ? 0.03 : 0.06;
  const drHighlightPull = dr === "Dr100" ? 0.0 : dr === "Dr200" ? 0.05 : 0.1;

  const shadowLift = drShadowLift + Math.max(tone.shadow, 0) * 0.015 - Math.abs(Math.min(tone.shadow, 0)) * 0.01;
  const highlightPull =
    drHighlightPull + Math.max(tone.highlight, 0) * 0.02 - Math.abs(Math.min(tone.highlight, 0)) * 0.015;

  return { shadowLift, highlightPull };
}

export function computeUniformsForRecipe(recipe: Recipe, manualExposureStops: number): RecipeUniforms {
  const { shadowLift, highlightPull } = dynamicRangeParams(recipe.dynamic_range, recipe.tone);

  return {
    wbGain: wbGainForRecipe(recipe.white_balance),
    exposureStops: recipe.exposure_compensation + manualExposureStops,
    shadowLift,
    highlightPull,
    useClassicChromeCurve: recipe.film_simulation === "ClassicChrome",
    saturationGain: isMonochrome(recipe.film_simulation) ? 0.0 : 1.0 + recipe.color * 0.1,
    colorChromeAmount: strengthFactor(recipe.color_chrome_effect),
    colorChromeFxBlueAmount: strengthFactor(recipe.color_chrome_fx_blue),
    useSepiaTone: recipe.film_simulation === "Sepia",
  };
}
