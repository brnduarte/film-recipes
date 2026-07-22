// Stage 3 — blend the predicted deltas into a concrete ManualAdjustments at a
// given strength. Pure and cheap so the UI can re-run it live as the user drags
// the strength slider (no re-analysis needed). The deltas are already clip-safe
// from predict(); here we just scale by strength and clamp to each field's UI
// range so the result stays valid and never surprises the sliders.

import type { ManualAdjustments } from "@film-recipes/core-types";
import type { Prediction } from "./types.ts";

/** Field ranges mirror apps/web AdjustmentsPanel sliders and the render engine. */
const RANGES: Record<keyof Omit<ManualAdjustments, "color_grade">, [number, number]> = {
  exposure: [-2, 2],
  white_balance: [-1, 1],
  contrast: [-1, 1],
  highlights: [-1, 1],
  shadows: [-1, 1],
  saturation: [-1, 1],
  black_level: [0, 0.9],
  white_level: [0.1, 1],
};

/** Identity grade — matches store.NEUTRAL_MANUAL / ManualAdjustments::default(). */
export const NEUTRAL_MANUAL: ManualAdjustments = {
  exposure: 0,
  white_balance: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  black_level: 0,
  white_level: 1,
  color_grade: { enabled: false, harmony: "Complementary", intensity: 0.5, stops: [] },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** neutral + (predicted deltas × strength/100), clamped to each field's range. */
export function adaptManual(prediction: Prediction, strength: number): ManualAdjustments {
  const s = clamp(strength, 0, 100) / 100;
  const out: ManualAdjustments = { ...NEUTRAL_MANUAL, color_grade: { ...NEUTRAL_MANUAL.color_grade } };
  const deltas = prediction.predicted_adjustments;

  (Object.keys(RANGES) as (keyof typeof RANGES)[]).forEach((field) => {
    const delta = deltas[field];
    if (delta === undefined) return;
    const base = field === "white_level" ? 1 : field === "black_level" ? 0 : 0;
    const [lo, hi] = RANGES[field];
    out[field] = clamp(base + delta * s, lo, hi);
  });

  return out;
}
