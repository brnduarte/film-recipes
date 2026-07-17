// Rust/GLSL parity test: checks that recipe-reference.mjs (a JS mirror of
// shaders/recipe.frag.glsl) produces the same output as the Rust pipeline
// (recipe-engine), across all Phase 1 recipes, within floating-point
// tolerance.
//
// Regenerate the golden fixture after any Rust pipeline change:
//   cargo run -p recipe-engine --example dump_recipe_golden > \
//     packages/gl-pipeline/test/recipe-golden.json
//
// Run with: node packages/gl-pipeline/test/parity.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recipeReference } from "../src/recipe-reference.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(__dirname, "recipe-golden.json"), "utf8"));

// Fixed recipe parameters, must stay identical to
// crates/recipe-engine/src/{classic_chrome,velvia,astia,classic_neg,
// pro_neg,eterna,acros,monochrome,named_recipes}.rs and
// Recipe::provia_baseline() (recipe.rs). ManualAdjustments::default()
// .exposure is 0, matching dump_recipe_golden.rs.
//
// Every fixture carries a `white_balance` now that recipe-reference.mjs
// applies the Kelvin gain + red/blue shift — the base film simulations use
// the neutral default (5500K, no shift, a WB no-op); the named recipes carry
// their real WB, which is where most of their look comes from.
const NEUTRAL_WB = { kelvin: 5500, red_shift: 0, blue_shift: 0 };

const RECIPES = {
  Provia: {
    film_simulation: "Provia",
    dynamic_range: "Dr100",
    tone: { highlight: 0, shadow: 0 },
    color: 0,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Velvia: {
    film_simulation: "Velvia",
    dynamic_range: "Dr100",
    tone: { highlight: 1, shadow: 1 },
    color: 4,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Astia: {
    film_simulation: "Astia",
    dynamic_range: "Dr200",
    tone: { highlight: -1, shadow: 0 },
    color: -1,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  ClassicChrome: {
    film_simulation: "ClassicChrome",
    dynamic_range: "Dr400",
    tone: { highlight: -2, shadow: -1 },
    color: -2,
    color_chrome_effect: "Weak",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  ClassicNeg: {
    film_simulation: "ClassicNeg",
    dynamic_range: "Dr400",
    tone: { highlight: 2, shadow: -2 },
    color: -2,
    color_chrome_effect: "Weak",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  ProNegHi: {
    film_simulation: "ProNegHi",
    dynamic_range: "Dr200",
    tone: { highlight: 1, shadow: 0 },
    color: -1,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  ProNegStd: {
    film_simulation: "ProNegStd",
    dynamic_range: "Dr400",
    tone: { highlight: -1, shadow: -1 },
    color: -1,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Eterna: {
    film_simulation: "Eterna",
    dynamic_range: "Dr400",
    tone: { highlight: -2, shadow: -2 },
    color: -3,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  EternaBleachBypass: {
    film_simulation: "EternaBleachBypass",
    dynamic_range: "Dr100",
    tone: { highlight: 3, shadow: -1 },
    color: -3,
    color_chrome_effect: "Weak",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Acros: {
    film_simulation: "Acros",
    dynamic_range: "Dr200",
    tone: { highlight: -1, shadow: 0 },
    color: 0,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Monochrome: {
    film_simulation: "Monochrome",
    dynamic_range: "Dr100",
    tone: { highlight: 0, shadow: 0 },
    color: 0,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  Sepia: {
    film_simulation: "Sepia",
    dynamic_range: "Dr100",
    tone: { highlight: 0, shadow: 0 },
    color: 0,
    color_chrome_effect: "Off",
    color_chrome_fx_blue: "Off",
    white_balance: NEUTRAL_WB,
    exposure_compensation: 0.0,
  },
  "kodak-portra-400": {
    film_simulation: "ClassicChrome",
    dynamic_range: "Dr400",
    tone: { highlight: 0, shadow: -2 },
    color: 2,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Off",
    white_balance: { kelvin: 5200, red_shift: 1, blue_shift: -6 },
    exposure_compensation: 0.67,
  },
  "kodak-gold-200": {
    film_simulation: "ClassicChrome",
    dynamic_range: "Dr400",
    tone: { highlight: -2, shadow: 1 },
    color: 3,
    color_chrome_effect: "Weak",
    color_chrome_fx_blue: "Off",
    white_balance: { kelvin: 5500, red_shift: 4, blue_shift: -5 },
    exposure_compensation: 0.67,
  },
  "kodak-portra-800": {
    film_simulation: "ClassicChrome",
    dynamic_range: "Dr400",
    tone: { highlight: -2, shadow: -1 },
    color: 3,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Off",
    white_balance: { kelvin: 6600, red_shift: -1, blue_shift: -3 },
    exposure_compensation: 0.67,
  },
  "nostalgia-negative": {
    film_simulation: "NostalgicNeg",
    dynamic_range: "Dr400",
    tone: { highlight: -1, shadow: 1 },
    color: 4,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Weak",
    white_balance: { kelvin: 5500, red_shift: 3, blue_shift: -3 },
    exposure_compensation: 0.33,
  },
  "classic-retro": {
    film_simulation: "ClassicNeg",
    dynamic_range: "Dr400",
    tone: { highlight: 4, shadow: -2 },
    color: -1,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Strong",
    white_balance: { kelvin: 5500, red_shift: 0, blue_shift: -3 },
    exposure_compensation: -0.67,
  },
  "cinestill-800t": {
    film_simulation: "Eterna",
    dynamic_range: "Dr400",
    tone: { highlight: 0, shadow: 2 },
    color: 4,
    color_chrome_effect: "Strong",
    color_chrome_fx_blue: "Weak",
    white_balance: { kelvin: 3800, red_shift: -6, blue_shift: -4 },
    exposure_compensation: 0.33,
  },
};

const TOLERANCE = 0.002; // ~0.5/255 8-bit levels

let total = 0;
let failures = 0;
for (const { name, pixels, manual } of golden) {
  // "<recipe>+manual" fixtures reuse the base recipe params and layer on the
  // golden's manual grade (dump_recipe_golden.rs) — strip the suffix to look
  // up the shared recipe fixture.
  const recipe = RECIPES[name.replace(/\+manual$/, "")];
  if (!recipe) {
    console.error(`FAIL: no JS-side recipe fixture defined for "${name}"`);
    failures++;
    continue;
  }
  for (const { input, expected } of pixels) {
    total++;
    const actual = recipeReference(input, recipe, manual);
    const diffs = actual.map((c, i) => Math.abs(c - expected[i]));
    const maxDiff = Math.max(...diffs);
    const pass = maxDiff <= TOLERANCE;
    if (!pass) failures++;
    console.log(
      `${pass ? "PASS" : "FAIL"} ${name} input=${JSON.stringify(input)} ` +
        `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)} ` +
        `maxDiff=${maxDiff.toFixed(5)}`,
    );
  }
}

console.log(`\n${total - failures}/${total} parity checks passed`);
if (failures > 0) {
  console.error(`${failures} parity check(s) FAILED — GLSL/Rust pipeline have diverged`);
  process.exit(1);
}
