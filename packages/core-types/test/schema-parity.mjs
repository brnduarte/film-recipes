// Rust/TS schema parity test: checks that the field names in the Rust
// serde JSON output (schema-sample.json) match the field names declared in
// src/index.ts's Preset/Recipe/etc. interfaces, catching drift between the
// two hand-maintained definitions.
//
// Regenerate the golden fixture after any Rust recipe.rs change:
//   cargo run -p recipe-engine --example dump_schema_sample > \
//     packages/core-types/test/schema-sample.json
//
// Run with: node packages/core-types/test/schema-parity.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  readFileSync(join(__dirname, "schema-sample.json"), "utf8"),
);

// Expected key sets, hand-transcribed from src/index.ts (TS has no runtime
// reflection, so this is the parity check's source of truth on the TS side).
const EXPECTED_KEYS = {
  Preset: [
    "id", "name", "favorite", "order", "recipe",
    "manual_adjustments", "created_at", "updated_at", "schema_version",
  ],
  Recipe: [
    "film_simulation", "acros_filter", "dynamic_range", "tone", "color",
    "sharpness", "noise_reduction", "grain", "color_chrome_effect",
    "color_chrome_fx_blue", "white_balance", "exposure_compensation",
  ],
  ToneSetting: ["highlight", "shadow"],
  GrainSettings: ["strength", "size"],
  WhiteBalance: ["mode", "kelvin", "red_shift", "blue_shift"],
  ManualAdjustments: [
    "exposure", "white_balance", "contrast", "highlights",
    "shadows", "saturation", "black_level", "white_level", "color_grade",
  ],
  ColorGrade: ["enabled", "harmony", "intensity", "stops"],
  ColorGradeStop: ["hue", "saturation", "value"],
};

function checkKeys(typeName, expected, actual) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = [...expected].sort();
  const missing = expectedKeys.filter((k) => !actualKeys.includes(k));
  const extra = actualKeys.filter((k) => !expectedKeys.includes(k));
  const pass = missing.length === 0 && extra.length === 0;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${typeName}: keys=${JSON.stringify(actualKeys)}` +
      (missing.length ? ` MISSING=${JSON.stringify(missing)}` : "") +
      (extra.length ? ` EXTRA=${JSON.stringify(extra)}` : ""),
  );
  return pass;
}

let failures = 0;
if (!checkKeys("Preset", EXPECTED_KEYS.Preset, sample)) failures++;
if (!checkKeys("Recipe", EXPECTED_KEYS.Recipe, sample.recipe)) failures++;
if (!checkKeys("ToneSetting", EXPECTED_KEYS.ToneSetting, sample.recipe.tone)) failures++;
if (!checkKeys("GrainSettings", EXPECTED_KEYS.GrainSettings, sample.recipe.grain)) failures++;
if (!checkKeys("WhiteBalance", EXPECTED_KEYS.WhiteBalance, sample.recipe.white_balance)) failures++;
if (!checkKeys("ManualAdjustments", EXPECTED_KEYS.ManualAdjustments, sample.manual_adjustments)) failures++;
if (!checkKeys("ColorGrade", EXPECTED_KEYS.ColorGrade, sample.manual_adjustments.color_grade)) failures++;
if (!checkKeys("ColorGradeStop", EXPECTED_KEYS.ColorGradeStop, sample.manual_adjustments.color_grade.stops[0])) failures++;

const total = Object.keys(EXPECTED_KEYS).length;
console.log(`\n${total - failures}/${total} schema parity checks passed`);
if (failures > 0) {
  console.error(`${failures} schema parity check(s) FAILED — Rust recipe.rs and TS core-types/src/index.ts have diverged`);
  process.exit(1);
}
