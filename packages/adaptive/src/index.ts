// On-device adaptive-recipe engine. Given a decoded photo + the selected
// recipe, it reads the image (Stage 1), predicts adaptive deltas (Stage 2),
// and blends them at a strength into a ManualAdjustments the existing render
// pipeline applies (Stage 3). 100% local — nothing about the photo leaves the
// device; it only emits values the engine can already render.

import type { ManualAdjustments, Recipe } from "@film-recipes/core-types";
import { analyzeImage } from "./analyze.ts";
import { predict } from "./predict.ts";
import { adaptManual } from "./blend.ts";
import type { ImageAnalysis, Prediction } from "./types.ts";

export { analyzeImage } from "./analyze.ts";
export { predict } from "./predict.ts";
export { adaptManual, NEUTRAL_MANUAL } from "./blend.ts";
export { deriveAssumptions, isMonochrome } from "./assumptions.ts";
export type * from "./types.ts";

interface RgbaImage {
  width: number;
  height: number;
  rgba: Uint8Array | Uint8ClampedArray;
}

export interface AdaptResult {
  analysis: ImageAnalysis;
  prediction: Prediction;
  /** Ready-to-apply grade at the prediction's suggested strength. */
  manual: ManualAdjustments;
}

/** One-shot convenience: analyze → predict → blend at the suggested strength.
 *  Callers that expose a strength slider keep `prediction` and re-run
 *  `adaptManual(prediction, strength)` themselves as the slider moves. */
export function adaptRecipe(image: RgbaImage, recipe: Recipe, recipeId: string): AdaptResult {
  const analysis = analyzeImage(image);
  const prediction = predict(analysis, recipe, recipeId);
  const manual = adaptManual(prediction, prediction.strength);
  return { analysis, prediction, manual };
}
