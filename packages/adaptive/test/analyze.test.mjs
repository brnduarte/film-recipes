// Unit tests for the on-device image analysis (Stage 1). Builds synthetic RGBA
// buffers and checks the derived tonal/color/scene signals.
//
// Run with: node packages/adaptive/test/analyze.test.mjs

import { analyzeImage } from "../src/analyze.ts";

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

/** Build a WxH image by calling fn(x,y) -> [r,g,b]. */
function makeImage(width, height, fn) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}

const W = 64;
const H = 64;

// ── Mid-gray: balanced exposure, neutral scene, no cast ────────────────────
{
  const a = analyzeImage(makeImage(W, H, () => [128, 128, 128]));
  check("gray meanLuma ~0.5", Math.abs(a.meanLuma - 0.502) < 0.02);
  check("gray exposure ok", a.exposureBias === "ok");
  check("gray scene neutral", a.scene === "neutral");
  check("gray no highlight clip", a.highlightClip < 0.001);
  check("gray no cast", Math.abs(a.temperatureBias) < 0.01);
}

// ── Very dark: underexposed, low-light scene ───────────────────────────────
{
  const a = analyzeImage(makeImage(W, H, () => [16, 16, 16]));
  check("dark meanLuma low", a.meanLuma < 0.1);
  check("dark underexposed", a.exposureBias === "underexposed");
  check("dark scene low_light", a.scene === "low_light");
}

// ── Skin-tone field: high skinFraction, portrait scene ─────────────────────
{
  const a = analyzeImage(makeImage(W, H, () => [200, 140, 110]));
  check("skin fraction high", a.skinFraction > 0.5);
  check("skin scene portrait", a.scene === "portrait");
}

// ── Bright blue sky: high skyFraction, landscape scene ─────────────────────
{
  const a = analyzeImage(makeImage(W, H, () => [80, 140, 230]));
  check("sky fraction high", a.skyFraction > 0.5);
  check("sky scene landscape", a.scene === "landscape");
  check("sky cool cast", a.temperatureBias < 0);
}

// ── Warm cast: positive temperatureBias ────────────────────────────────────
{
  const a = analyzeImage(makeImage(W, H, () => [190, 120, 70]));
  check("warm cast positive", a.temperatureBias > 0.1);
}

console.log(`\nadaptive/analyze: ${failures === 0 ? "all checks passed" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
