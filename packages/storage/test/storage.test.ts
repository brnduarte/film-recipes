// Exercises the real storage.ts logic against fake-indexeddb (an in-memory
// polyfill), not a hand-duplicated mirror — unlike the parity tests
// elsewhere in the repo, there's no second implementation to keep in sync
// here, so testing the real module directly is what's worth doing.
import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import type { Preset } from "@fuji-recipes/core-types";
import * as storage from "../src/index";

function samplePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: "preset-1",
    name: "My Look",
    favorite: false,
    order: 0,
    recipe: {
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
    },
    manual_adjustments: {
      exposure: 0,
      white_balance: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      saturation: 0,
      black_level: 0,
      white_level: 1,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schema_version: 1,
    ...overrides,
  };
}

let failures = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(err);
  }
}

await test("savePreset + listPresets round-trips a preset", async () => {
  await storage.savePreset(samplePreset({ id: "a", order: 0 }));
  const presets = await storage.listPresets();
  assert.equal(presets.length, 1);
  assert.equal(presets[0].id, "a");
});

await test("listPresets sorts by order", async () => {
  await storage.clearAllData();
  await storage.savePreset(samplePreset({ id: "second", order: 1 }));
  await storage.savePreset(samplePreset({ id: "first", order: 0 }));
  const presets = await storage.listPresets();
  assert.deepEqual(
    presets.map((p) => p.id),
    ["first", "second"],
  );
});

await test("savePreset upserts by id", async () => {
  await storage.clearAllData();
  await storage.savePreset(samplePreset({ id: "a", name: "Original" }));
  await storage.savePreset(samplePreset({ id: "a", name: "Renamed" }));
  const presets = await storage.listPresets();
  assert.equal(presets.length, 1);
  assert.equal(presets[0].name, "Renamed");
});

await test("deletePreset removes a preset", async () => {
  await storage.clearAllData();
  await storage.savePreset(samplePreset({ id: "a" }));
  await storage.deletePreset("a");
  const presets = await storage.listPresets();
  assert.equal(presets.length, 0);
});

await test("exportPresets produces a valid PresetExport envelope", async () => {
  await storage.clearAllData();
  await storage.savePreset(samplePreset({ id: "a" }));
  const exported = await storage.exportPresets();
  assert.equal(exported.schema_version, 1);
  assert.equal(exported.presets.length, 1);
  assert.ok(exported.exported_at);
});

await test("importPresets upserts every preset in the export", async () => {
  await storage.clearAllData();
  const exported = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    presets: [samplePreset({ id: "x" }), samplePreset({ id: "y" })],
  };
  await storage.importPresets(exported);
  const presets = await storage.listPresets();
  assert.equal(presets.length, 2);
});

await test("clearAllData wipes everything", async () => {
  await storage.savePreset(samplePreset({ id: "a" }));
  await storage.clearAllData();
  const presets = await storage.listPresets();
  assert.equal(presets.length, 0);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll storage tests passed");
}
