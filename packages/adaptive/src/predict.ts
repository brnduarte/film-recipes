// Stage 2 — the rule-based "AI". Maps image analysis + the recipe's assumptions
// to full-strength, clip-safe DELTA adjustments (ManualAdjustments-shaped), plus
// a suggested 0..100 strength governor. Deltas are relative stylistic/corrective
// shifts applied on top of the recipe, never absolutes — this is what lets one
// recipe adapt across different starting photos.

import type { ManualAdjustments, Recipe } from "@film-recipes/core-types";
import type { AnalysisContext, ImageAnalysis, Prediction, RecipeAssumptions } from "./types.ts";
import { deriveAssumptions } from "./assumptions.ts";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** log2 with a floor so pure-black regions don't blow up the exposure math. */
function evToward(target: number, current: number): number {
  return Math.log2(target / Math.max(current, 0.04));
}

/** Ideal median brightness per scene — low-light keeps some mood, high-key
 *  stays bright, everything else aims for a balanced midtone. */
function targetLuma(scene: ImageAnalysis["scene"]): number {
  switch (scene) {
    case "low_light":
      return 0.4;
    case "high_key":
      return 0.62;
    default:
      return 0.5;
  }
}

/** Suggested default intensity: full (100) unless applying the recipe would
 *  fight already-clipped tones — then ease off, per the doc's "auto-reduce if
 *  it would clip an already-blown sky". */
function suggestStrength(a: ImageAnalysis): number {
  let governor = 1.0;
  if (a.highlightClip > 0.05) governor -= Math.min(0.3, (a.highlightClip - 0.05) * 3);
  if (a.shadowClip > 0.05) governor -= Math.min(0.15, (a.shadowClip - 0.05) * 1.5);
  return Math.round(clamp(governor, 0.5, 1.0) * 100);
}

function buildContext(a: ImageAnalysis): AnalysisContext {
  return {
    scene: a.scene,
    skin_detected: a.skinFraction > 0.05,
    ...(a.facesDetected !== undefined ? { faces_detected: a.facesDetected } : {}),
    exposure_bias_detected: a.exposureBias,
    contrast_detected: a.contrastState,
  };
}

function computeDeltas(a: ImageAnalysis, asm: RecipeAssumptions): Partial<ManualAdjustments> {
  const portrait = a.scene === "portrait" || a.skinFraction > 0.1;
  // Skin-tone guard: the more skin in frame, the less we shove color/WB around.
  const skinGuard = 1 - Math.min(0.6, a.skinFraction * 1.5);

  // ── Exposure ──────────────────────────────────────────────────────────
  // The recipe already applies its own `exposure_compensation` before this
  // delta ever reaches the render pipeline — recipe + manual exposure combine
  // additively into ONE multiplicative gain, applied before any tone curve
  // (see pipeline.rs). So "how much brighter should this get" has to reason
  // about the TOTAL stops the photo will actually receive, not just our own
  // contribution — otherwise a recipe that already pushes +1 EV on a backlit
  // scene gets a second push stacked blindly on top, and the near-white point
  // sails past clipping before any highlight recovery gets a say.
  const idealTotalEv = evToward(targetLuma(a.scene), a.p50) * 0.6;

  // Cap the TOTAL exposure (recipe + delta) so the near-white point (p95),
  // once that gain actually lands, stays under a safe ceiling. This mirrors
  // the real pipeline math instead of a flat "back off a bit" heuristic that
  // has no idea how much headroom this particular photo has left.
  const HIGHLIGHT_CEILING = 0.92;
  const maxTotalEv = Math.log2(HIGHLIGHT_CEILING / Math.max(a.p95, 0.04));
  const totalEv = clamp(Math.min(idealTotalEv, maxTotalEv), -1.2, 1.2);
  const exposure = clamp(totalEv - asm.exposureCompensation, -1.2, 1.2);

  // Brightening we deliberately withheld from the exposure channel to protect
  // highlights — redirected into shadow lift below (which only touches the
  // bottom half of the tonal range) instead of just being lost.
  const evShortfall = Math.max(0, idealTotalEv - maxTotalEv);

  // ── Highlights / shadows ─────────────────────────────────────────────
  // Recover highlights that are already clipped in the source AND whatever
  // the capped total exposure gain would still push toward the ceiling.
  // Lift only genuinely crushed shadows, plus whatever brightening the
  // highlight cap above couldn't safely hand to exposure.
  const projectedP95 = a.p95 * Math.pow(2, totalEv);
  let highlights = -clamp(a.highlightClip * 6 + Math.max(0, projectedP95 - 0.95) * 4, 0, 0.7);
  let shadows = clamp((0.06 - a.p5) * 4, 0, 0.5);
  shadows = Math.min(0.6, shadows + evShortfall * 0.5);
  if (a.scene === "high_key") highlights = Math.min(highlights, -0.15); // protect the bright key
  if (a.scene === "low_light") shadows = Math.min(0.6, shadows + 0.1); // open the mood a touch

  // ── Contrast ─────────────────────────────────────────────────────────
  // Add contrast to flat frames, relax it on already-harsh ones.
  let contrast = clamp((0.6 - a.contrastSpread) * 0.7, -0.35, 0.4);
  if (asm.alreadyContrasty && contrast > 0) contrast *= 0.4;
  if (portrait && contrast > 0) contrast *= 0.6; // keep skin soft

  // ── White balance ────────────────────────────────────────────────────
  // Neutralize a color cast (manual WB is warm(+)/cool(-), so oppose the bias).
  let white_balance = 0;
  if (!asm.monochrome) {
    white_balance = clamp(-a.temperatureBias * 0.5, -0.5, 0.5) * skinGuard;
    if (asm.assumesLowLight) white_balance *= 0.25; // preserve the neon/tungsten intent
  }

  // ── Saturation ───────────────────────────────────────────────────────
  let saturation = 0;
  if (!asm.monochrome) {
    if (asm.alreadySaturated) saturation = -0.1; // headroom against clipping
    else if (a.scene === "landscape") saturation = 0.08; // a little pop for scenery
    saturation *= skinGuard;
  }

  // Only emit fields that actually move, keeping the contract tidy.
  const deltas: Partial<ManualAdjustments> = {};
  if (Math.abs(exposure) >= 0.01) deltas.exposure = round(exposure);
  if (Math.abs(contrast) >= 0.01) deltas.contrast = round(contrast);
  if (Math.abs(highlights) >= 0.01) deltas.highlights = round(highlights);
  if (Math.abs(shadows) >= 0.01) deltas.shadows = round(shadows);
  if (Math.abs(white_balance) >= 0.01) deltas.white_balance = round(white_balance);
  if (Math.abs(saturation) >= 0.01) deltas.saturation = round(saturation);
  return deltas;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

export function predict(analysis: ImageAnalysis, recipe: Recipe, recipeId: string): Prediction {
  const assumptions = deriveAssumptions(recipe, recipeId);
  return {
    recipe: recipeId,
    strength: suggestStrength(analysis),
    predicted_adjustments: computeDeltas(analysis, assumptions),
    analysis_context: buildContext(analysis),
  };
}
