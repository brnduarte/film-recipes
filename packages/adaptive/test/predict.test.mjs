// Unit tests for the rule-based predictor (Stage 2) and the strength blend
// (Stage 3). Feeds hand-built ImageAnalysis objects so the rules are checked
// in isolation, independent of the pixel-level analysis.
//
// Run with: node packages/adaptive/test/predict.test.mjs

import { predict, adaptManual, NEUTRAL_MANUAL } from "../src/index.ts";

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

/** Minimal ImageAnalysis with neutral defaults; override per test. */
function analysis(over = {}) {
  return {
    meanLuma: 0.5,
    p5: 0.1,
    p50: 0.5,
    p95: 0.7,
    shadowClip: 0,
    highlightClip: 0,
    contrastSpread: 0.6,
    temperatureBias: 0,
    tintBias: 0,
    skinFraction: 0,
    skyFraction: 0,
    exposureBias: "ok",
    contrastState: "normal",
    scene: "neutral",
    sampleCount: 1000,
    ...over,
  };
}

function recipe(over = {}) {
  return {
    film_simulation: "Provia",
    acros_filter: "None",
    dynamic_range: "Dr100",
    tone: { highlight: 0, shadow: 0 },
    color: 0,
    sharpness: 0,
    noise_reduction: 0,
    grain: { strength: "Off", size: "Fine" },
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: { mode: "Kelvin", kelvin: 5500, red_shift: 0, blue_shift: 0 },
    exposure_compensation: 0,
    ...over,
  };
}

// ── Contract shape ─────────────────────────────────────────────────────────
{
  const p = predict(analysis(), recipe(), "kodak-portra-400");
  check("contract recipe id", p.recipe === "kodak-portra-400");
  check("contract has strength", typeof p.strength === "number");
  check("contract has predicted_adjustments", typeof p.predicted_adjustments === "object");
  check("contract context scene", p.analysis_context.scene === "neutral");
  check("contract context exposure", p.analysis_context.exposure_bias_detected === "ok");
}

// ── Well-exposed neutral photo: no-op deltas, full strength ────────────────
{
  const p = predict(analysis(), recipe(), "provia-positive");
  check("neutral yields no deltas", Object.keys(p.predicted_adjustments).length === 0);
  check("neutral full strength", p.strength === 100);
}

// ── Underexposed low-light: lifts exposure ─────────────────────────────────
{
  const p = predict(analysis({ meanLuma: 0.2, p50: 0.2, p5: 0.02, scene: "low_light", exposureBias: "underexposed" }), recipe(), "cinestill-800t");
  check("underexposed lifts exposure", p.predicted_adjustments.exposure > 0);
}

// ── Blown highlights: recovers highlights and eases strength ────────────────
{
  const p = predict(analysis({ highlightClip: 0.2, p95: 0.99, meanLuma: 0.6, p50: 0.65 }), recipe(), "vivid-velvia");
  check("blown recovers highlights", p.predicted_adjustments.highlights < 0);
  check("blown eases strength", p.strength < 100);
}

// ── Monochrome recipe: no color/WB moves ───────────────────────────────────
{
  const p = predict(analysis({ temperatureBias: 0.5, scene: "landscape" }), recipe({ film_simulation: "Acros" }), "ilford-fp4");
  check("mono no white_balance", p.predicted_adjustments.white_balance === undefined);
  check("mono no saturation", p.predicted_adjustments.saturation === undefined);
}

// ── Already-saturated recipe: does not push saturation up ───────────────────
{
  const p = predict(analysis({ scene: "landscape" }), recipe({ film_simulation: "Velvia", color: 4 }), "vivid-velvia");
  const sat = p.predicted_adjustments.saturation ?? 0;
  check("saturated recipe not boosted", sat <= 0);
}

// ── Warm cast neutralized toward cool ──────────────────────────────────────
{
  const p = predict(analysis({ temperatureBias: 0.6 }), recipe(), "kodak-gold-200");
  check("warm cast cooled", p.predicted_adjustments.white_balance < 0);
}

// ── Skin guard: portrait damps WB correction vs non-portrait ───────────────
{
  const withSkin = predict(analysis({ temperatureBias: 0.6, skinFraction: 0.3, scene: "portrait" }), recipe(), "kodak-portra-400");
  const noSkin = predict(analysis({ temperatureBias: 0.6, skinFraction: 0 }), recipe(), "kodak-portra-400");
  check("skin damps WB", Math.abs(withSkin.predicted_adjustments.white_balance) < Math.abs(noSkin.predicted_adjustments.white_balance));
}

// ── Blend: strength 0 == neutral, and scaling is monotonic ─────────────────
{
  const p = predict(analysis({ meanLuma: 0.2, p50: 0.2, p5: 0.02, scene: "low_light", exposureBias: "underexposed" }), recipe(), "kodak-portra-400");
  const zero = adaptManual(p, 0);
  check("blend@0 exposure neutral", zero.exposure === NEUTRAL_MANUAL.exposure);
  check("blend@0 white_level neutral", zero.white_level === 1);
  const half = adaptManual(p, 50);
  const full = adaptManual(p, 100);
  check("blend scales up", full.exposure > half.exposure && half.exposure > 0);
  check("blend within range", full.exposure <= 2 && full.exposure >= -2);
}

console.log(`\nadaptive/predict: ${failures === 0 ? "all checks passed" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
