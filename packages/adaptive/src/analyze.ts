// Stage 1 — "read the photo". Computes tonal + color statistics and a coarse
// scene label from the already-decoded RGBA buffer that's sitting in memory.
// Runs entirely on-device (a single strided pass over the pixels); it never
// copies, uploads, or persists the image.

import type {
  ContrastState,
  ExposureBias,
  ImageAnalysis,
  SceneType,
} from "./types.ts";

/** Rec.709 luma weights (approximate on sRGB values — fine for analysis). */
const LR = 0.2126;
const LG = 0.7152;
const LB = 0.0722;

/** Cap the number of sampled pixels so analysis stays fast even on a 60MP RAW.
 *  We stride across the whole image so the sample is spatially representative. */
const MAX_SAMPLES = 60_000;

interface RgbaImage {
  width: number;
  height: number;
  rgba: Uint8Array | Uint8ClampedArray;
}

/** Skin-tone test on 0..255 RGB — a standard, lighting-tolerant heuristic.
 *  Used as a dependency-free proxy for "there are people here" so the predictor
 *  can protect skin from extreme grades without shipping a face-detection model. */
function isSkin(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );
}

function classifyExposure(meanLuma: number, highlightClip: number, shadowClip: number): ExposureBias {
  if (meanLuma > 0.66 || highlightClip > 0.12) {
    return meanLuma > 0.74 ? "overexposed" : "slightly_overexposed";
  }
  if (meanLuma < 0.34 || shadowClip > 0.12) {
    return meanLuma < 0.26 ? "underexposed" : "slightly_underexposed";
  }
  return "ok";
}

function classifyContrast(spread: number): ContrastState {
  if (spread < 0.42) return "flat";
  if (spread > 0.85) return "high";
  return "normal";
}

function classifyScene(a: {
  meanLuma: number;
  highlightClip: number;
  skinFraction: number;
  skyFraction: number;
}): SceneType {
  if (a.meanLuma < 0.22) return "low_light";
  if (a.meanLuma > 0.72 && a.highlightClip > 0.02) return "high_key";
  if (a.skinFraction > 0.1) return "portrait";
  if (a.skyFraction > 0.12) return "landscape";
  return "neutral";
}

/** Percentile lookup (0..1) from a cumulative 256-bin luma histogram. */
function percentile(hist: Uint32Array, total: number, fraction: number): number {
  const target = fraction * total;
  let cum = 0;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum >= target) return i / 255;
  }
  return 1;
}

export function analyzeImage(image: RgbaImage): ImageAnalysis {
  const { rgba, width, height } = image;
  const pixelCount = width * height;
  // Stride in whole pixels so we visit ~MAX_SAMPLES evenly across the frame.
  const stride = Math.max(1, Math.floor(pixelCount / MAX_SAMPLES));

  const hist = new Uint32Array(256);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let skin = 0;
  let sky = 0;
  let samples = 0;

  for (let p = 0; p < pixelCount; p += stride) {
    const i = p * 4;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    const luma = LR * r + LG * g + LB * b; // 0..255
    hist[luma | 0]++;
    sumR += r;
    sumG += g;
    sumB += b;

    if (isSkin(r, g, b)) skin++;
    // Blue-dominant and reasonably bright → sky / open water / cool background.
    if (b >= r && b >= g && b - r > 12 && luma > 102) sky++;

    samples++;
  }

  const meanR = sumR / samples / 255;
  const meanG = sumG / samples / 255;
  const meanB = sumB / samples / 255;
  const meanLuma = (LR * sumR + LG * sumG + LB * sumB) / samples / 255;

  let shadowClip = 0;
  for (let i = 0; i <= 5; i++) shadowClip += hist[i];
  shadowClip /= samples;
  let highlightClip = 0;
  for (let i = 252; i < 256; i++) highlightClip += hist[i];
  highlightClip /= samples;

  const p5 = percentile(hist, samples, 0.05);
  const p50 = percentile(hist, samples, 0.5);
  const p95 = percentile(hist, samples, 0.95);
  const contrastSpread = Math.max(0, p95 - p5);

  // Warm(+)/cool(-): red vs blue channel balance. Green vs magenta for tint.
  const temperatureBias = clampUnit((meanR - meanB) * 2.5);
  const tintBias = clampUnit((meanG - (meanR + meanB) / 2) * 2.5);

  const skinFraction = skin / samples;
  const skyFraction = sky / samples;

  const scene = classifyScene({ meanLuma, highlightClip, skinFraction, skyFraction });

  return {
    meanLuma,
    p5,
    p50,
    p95,
    shadowClip,
    highlightClip,
    contrastSpread,
    temperatureBias,
    tintBias,
    skinFraction,
    skyFraction,
    exposureBias: classifyExposure(meanLuma, highlightClip, shadowClip),
    contrastState: classifyContrast(contrastSpread),
    scene,
    sampleCount: samples,
  };
}

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
