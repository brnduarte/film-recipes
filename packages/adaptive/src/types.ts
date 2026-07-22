// Shared types for the on-device adaptive-recipe engine. Everything here is
// pure data — the whole package runs locally, never sends the photo anywhere,
// and only ever emits ManualAdjustments-shaped values the render pipeline can
// already apply (see packages/gl-pipeline). No cloud, no model downloads.

import type { ManualAdjustments } from "@film-recipes/core-types";

/** Coarse scene label inferred from image statistics (Stage 1 / Phase 2). */
export type SceneType = "portrait" | "landscape" | "low_light" | "high_key" | "neutral";

/** Graded exposure verdict, matching the doc's `exposure_bias_detected`. */
export type ExposureBias =
  | "underexposed"
  | "slightly_underexposed"
  | "ok"
  | "slightly_overexposed"
  | "overexposed";

export type ContrastState = "flat" | "normal" | "high";

/** Read-the-photo output: tonal/color state + coarse semantics. All tonal
 *  fields are normalized to 0..1 (luma) and bias fields to -1..+1. */
export interface ImageAnalysis {
  meanLuma: number; // 0..1 average perceived brightness
  p5: number; // 0..1 near-black point (5th percentile)
  p50: number; // 0..1 median
  p95: number; // 0..1 near-white point (95th percentile)
  shadowClip: number; // 0..1 fraction of crushed pixels (luma <= ~2%)
  highlightClip: number; // 0..1 fraction of blown pixels (luma >= ~99%)
  contrastSpread: number; // 0..1 (p95 - p5)
  temperatureBias: number; // -1..+1 warm(+)/cool(-) cast
  tintBias: number; // -1..+1 green(+)/magenta(-) cast (analysis only; not renderable in v1)
  skinFraction: number; // 0..1 share of skin-tone pixels (proxy for people/faces)
  skyFraction: number; // 0..1 share of blue-dominant pixels (proxy for sky/open scene)
  exposureBias: ExposureBias;
  contrastState: ContrastState;
  scene: SceneType;
  /** Present only if a platform on-device face detector ran; otherwise omitted. */
  facesDetected?: number;
  sampleCount: number;
}

/** Transparent reasoning surfaced to the user, mirrors the doc's contract. */
export interface AnalysisContext {
  scene: SceneType;
  skin_detected: boolean;
  faces_detected?: number;
  exposure_bias_detected: ExposureBias;
  contrast_detected: ContrastState;
}

/** The AI's output for one photo+recipe — the doc's "Example Output Contract".
 *  `predicted_adjustments` are full-strength, clip-safe DELTAS over a neutral
 *  manual grade; `strength` is a 0..100 governor that scales them all. */
export interface Prediction {
  recipe: string; // catalog id of the recipe being adapted
  strength: number; // 0..100 suggested default intensity
  predicted_adjustments: Partial<ManualAdjustments>;
  analysis_context: AnalysisContext;
}

/** What a recipe "assumes" about its input, so adaptation can respect its
 *  intent (e.g. don't neutralize the tungsten cast a night film wants). */
export interface RecipeAssumptions {
  monochrome: boolean; // B&W/sepia — skip WB/saturation/tint corrections
  alreadySaturated: boolean; // Velvia/Kodachrome — avoid pushing saturation further
  alreadyContrasty: boolean; // damp added contrast
  assumesLowLight: boolean; // tungsten/neon night films — preserve the ambient cast
  /** Recipe's own exposure_compensation (stops). Combines additively with our
   *  predicted exposure delta in the render pipeline (recipe + manual → one
   *  gain, applied before any highlight rolloff) — so the predictor must
   *  reason about the TOTAL stops the photo will receive, not just its own
   *  contribution, or it stacks blindly on top of whatever the recipe already
   *  pushes. */
  exposureCompensation: number;
}
