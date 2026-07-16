// Rust/GLSL parity test: checks that classic-chrome-reference.mjs (a JS
// mirror of the .frag.glsl shader) produces the same output as the Rust
// pipeline (recipe-engine), within floating-point tolerance.
//
// Regenerate the golden fixture after any Rust pipeline change:
//   cargo run -p recipe-engine --example dump_classic_chrome_golden > \
//     packages/gl-pipeline/test/classic-chrome-golden.json
//
// Run with: node packages/gl-pipeline/test/parity.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classicChromeReference } from "../src/classic-chrome-reference.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(
  readFileSync(join(__dirname, "classic-chrome-golden.json"), "utf8"),
);

const TOLERANCE = 0.002; // ~0.5/255 8-bit levels

let failures = 0;
for (const { name, input, expected } of golden) {
  const actual = classicChromeReference(input);
  const diffs = actual.map((c, i) => Math.abs(c - expected[i]));
  const maxDiff = Math.max(...diffs);
  const pass = maxDiff <= TOLERANCE;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${name}: input=${JSON.stringify(input)} ` +
      `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)} ` +
      `maxDiff=${maxDiff.toFixed(5)}`,
  );
}

console.log(`\n${golden.length - failures}/${golden.length} parity checks passed`);
if (failures > 0) {
  console.error(`${failures} parity check(s) FAILED — GLSL/Rust pipeline have diverged`);
  process.exit(1);
}
