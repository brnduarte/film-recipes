//! Authoritative processing stage order. Every film simulation's Rust
//! implementation AND its GLSL preview shader counterpart must apply stages
//! in exactly this order — this is what the plan's shader-parity harness
//! checks. If you add a stage, add it here first, then in both
//! implementations.
//!
//! Sharpness, noise reduction, and grain are neighborhood/stochastic
//! operations, not pure per-pixel functions, so they aren't part of
//! `apply_recipe_to_pixel`. They still occupy fixed slots in this order for
//! documentation purposes; grain in particular is explicitly deferred to its
//! own R&D spike per the plan's risk #2 (authentic film grain isn't uniform
//! noise) and is a no-op until then.

use crate::color_chrome::{apply_color_chrome_effect, apply_color_chrome_fx_blue};
use crate::recipe::{ManualAdjustments, Recipe};
use crate::tone::apply_tone;
use crate::white_balance::apply_white_balance;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PipelineStage {
    WhiteBalance,
    Exposure,
    DynamicRangeAndTone,
    FilmCurve,
    Saturation,
    ColorChromeEffect,
    ColorChromeFxBlue,
    Sharpness,      // neighborhood op, not applied per-pixel here
    NoiseReduction, // neighborhood op, not applied per-pixel here
    Grain,          // deferred per plan risk #2, no-op until its own spike
    Vignette,       // applied at buffer level (needs pixel position), not here
}

pub const PIPELINE_ORDER: &[PipelineStage] = &[
    PipelineStage::WhiteBalance,
    PipelineStage::Exposure,
    PipelineStage::DynamicRangeAndTone,
    PipelineStage::FilmCurve,
    PipelineStage::Saturation,
    PipelineStage::ColorChromeEffect,
    PipelineStage::ColorChromeFxBlue,
    PipelineStage::Sharpness,
    PipelineStage::NoiseReduction,
    PipelineStage::Grain,
    PipelineStage::Vignette,
];

/// Apply every per-pixel stage of the recipe pipeline to one linear RGB
/// pixel (each channel in [0,1]). This is the Rust source-of-truth used by
/// full-resolution export; the live preview's GLSL shader must produce the
/// same result for the same recipe (mirrored, since GLSL and Rust can't
/// share source).
pub fn apply_recipe_to_pixel(mut rgb: [f32; 3], recipe: &Recipe, manual: &ManualAdjustments) -> [f32; 3] {
    // 1. White balance
    rgb = apply_white_balance(rgb, &recipe.white_balance);

    // 2. Exposure (recipe + manual override combine additively, in stops)
    let total_stops = recipe.exposure_compensation + manual.exposure;
    let gain = 2f32.powf(total_stops);
    rgb = [rgb[0] * gain, rgb[1] * gain, rgb[2] * gain];

    // 3+4. Dynamic range / shadow-highlight tone + film characteristic curve
    rgb = apply_tone(rgb, recipe);

    // 5. Saturation (recipe `color` field, -4..+4 -> multiplicative)
    let sat_gain = 1.0 + (recipe.color as f32) * 0.1;
    rgb = apply_saturation(rgb, sat_gain);

    // 6-7. Color Chrome Effect / FX Blue
    rgb = apply_color_chrome_effect(rgb, recipe.color_chrome_effect);
    rgb = apply_color_chrome_fx_blue(rgb, recipe.color_chrome_fx_blue);

    [rgb[0].clamp(0.0, 1.0), rgb[1].clamp(0.0, 1.0), rgb[2].clamp(0.0, 1.0)]
}

fn apply_saturation(rgb: [f32; 3], gain: f32) -> [f32; 3] {
    // Rec. 709 luma as the desaturation pivot.
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    [
        luma + (rgb[0] - luma) * gain,
        luma + (rgb[1] - luma) * gain,
        luma + (rgb[2] - luma) * gain,
    ]
}

/// Apply the pixel-level pipeline to an interleaved RGB f32 buffer in place.
pub fn apply_recipe_to_buffer(pixels: &mut [f32], recipe: &Recipe, manual: &ManualAdjustments) {
    for chunk in pixels.chunks_exact_mut(3) {
        let out = apply_recipe_to_pixel([chunk[0], chunk[1], chunk[2]], recipe, manual);
        chunk[0] = out[0];
        chunk[1] = out[1];
        chunk[2] = out[2];
    }
}
