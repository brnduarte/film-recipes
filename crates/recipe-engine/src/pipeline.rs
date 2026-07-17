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
use crate::recipe::{ColorGrade, ColorGradeStop, ManualAdjustments, Recipe};
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

    // 5. Saturation (recipe `color` field, -4..+4 -> multiplicative).
    // Monochrome simulations (ACROS, Monochrome, Sepia) are always fully
    // desaturated, since `color`'s -4..+4 range only reaches a 0.6 minimum
    // gain and can't represent true monochrome on its own.
    let sat_gain = if crate::acros::is_monochrome(recipe.film_simulation) {
        0.0
    } else {
        1.0 + (recipe.color as f32) * 0.1
    };
    rgb = apply_saturation(rgb, sat_gain);

    // 6-7. Color Chrome Effect / FX Blue
    rgb = apply_color_chrome_effect(rgb, recipe.color_chrome_effect);
    rgb = apply_color_chrome_fx_blue(rgb, recipe.color_chrome_fx_blue);

    // 8. Sepia tint (post-saturation special case — see monochrome.rs doc
    // comment for why this can't be done earlier in the pipeline).
    if recipe.film_simulation == crate::recipe::FilmSimulation::Sepia {
        rgb = crate::monochrome::apply_sepia_tone(rgb);
    }

    // 9. Manual global adjustments (user sliders), graded on top of the
    // finished recipe look — see `apply_manual_grade`.
    rgb = apply_manual_grade(rgb, manual);

    [rgb[0].clamp(0.0, 1.0), rgb[1].clamp(0.0, 1.0), rgb[2].clamp(0.0, 1.0)]
}

/// User-facing global grade applied after the recipe (white balance,
/// contrast, highlights, shadows, levels, saturation). Manual exposure is
/// folded into the recipe's exposure stage earlier, so it's not repeated
/// here. Stage order is authoritative and must match the GLSL mirror in
/// recipe.frag.glsl exactly (parity harness enforces it).
fn apply_manual_grade(mut rgb: [f32; 3], m: &ManualAdjustments) -> [f32; 3] {
    // White balance: warm (+) boosts red and cuts blue; cool (-) the reverse.
    let wb = m.white_balance;
    rgb = [rgb[0] * (1.0 + wb * 0.2), rgb[1], rgb[2] * (1.0 - wb * 0.2)];

    // Contrast: linear slope around a 0.5 pivot.
    let contrast = 1.0 + m.contrast;
    rgb = [
        (rgb[0] - 0.5) * contrast + 0.5,
        (rgb[1] - 0.5) * contrast + 0.5,
        (rgb[2] - 0.5) * contrast + 0.5,
    ];

    // Highlights / shadows: tonal-range-weighted lift, each computed from the
    // same input value so the two don't interfere.
    rgb = [manual_tone(rgb[0], m), manual_tone(rgb[1], m), manual_tone(rgb[2], m)];

    // Levels: remap [black_level, white_level] onto [0, 1].
    let range = (m.white_level - m.black_level).max(1e-3);
    rgb = [
        (rgb[0] - m.black_level) / range,
        (rgb[1] - m.black_level) / range,
        (rgb[2] - m.black_level) / range,
    ];

    // Saturation: luma-pivot multiply.
    let sat = 1.0 + m.saturation;
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    rgb = [
        luma + (rgb[0] - luma) * sat,
        luma + (rgb[1] - luma) * sat,
        luma + (rgb[2] - luma) * sat,
    ];

    // Color grade: luminance color-map tint (last, so it colors the finished
    // tonal result). See `apply_color_grade`.
    apply_color_grade(rgb, &m.color_grade)
}

/// Luminance color-map grade. The grade's stops are ordered shadows→highlights
/// and spread evenly across the tonal range; each pixel is nudged toward the
/// stop color interpolated at its own luma. The stop color has its own luma
/// subtracted first so only the *chroma* is added, preserving overall
/// brightness/detail. Mirrored in recipe.frag.glsl / recipe-uniforms.ts /
/// recipe-reference.mjs — keep the math identical for parity.
fn apply_color_grade(rgb: [f32; 3], g: &ColorGrade) -> [f32; 3] {
    if !g.enabled || g.stops.is_empty() || g.intensity <= 0.0 {
        return rgb;
    }
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    let tint = grade_interpolate_stop(luma, g);
    let tint_luma = 0.2126 * tint[0] + 0.7152 * tint[1] + 0.0722 * tint[2];
    let k = g.intensity;
    [
        rgb[0] + (tint[0] - tint_luma) * k,
        rgb[1] + (tint[1] - tint_luma) * k,
        rgb[2] + (tint[2] - tint_luma) * k,
    ]
}

/// Interpolate the grade tint (linear RGB) for a given luma across the stops,
/// which are treated as evenly spaced over [0,1] from shadows to highlights.
fn grade_interpolate_stop(luma: f32, g: &ColorGrade) -> [f32; 3] {
    let n = g.stops.len();
    if n == 1 {
        return grade_stop_rgb(&g.stops[0]);
    }
    let x = luma.clamp(0.0, 1.0);
    let seg = x * (n as f32 - 1.0);
    let i = (seg.floor() as usize).min(n - 2);
    let t = seg - i as f32;
    let a = grade_stop_rgb(&g.stops[i]);
    let b = grade_stop_rgb(&g.stops[i + 1]);
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

fn grade_stop_rgb(s: &ColorGradeStop) -> [f32; 3] {
    grade_hsv_to_rgb(s.hue, s.saturation, s.value)
}

/// HSV→RGB using the standard sextant formula (mirrors color_chrome.rs so the
/// grade's handle colors match the rest of the engine's hue math).
fn grade_hsv_to_rgb(h: f32, s: f32, v: f32) -> [f32; 3] {
    let c = v * s;
    let h_prime = h.rem_euclid(360.0) / 60.0;
    let x = c * (1.0 - (h_prime.rem_euclid(2.0) - 1.0).abs());
    let (r1, g1, b1) = match h_prime as i32 {
        0 => (c, x, 0.0),
        1 => (x, c, 0.0),
        2 => (0.0, c, x),
        3 => (0.0, x, c),
        4 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let m = v - c;
    [r1 + m, g1 + m, b1 + m]
}

fn manual_tone(x: f32, m: &ManualAdjustments) -> f32 {
    let highlight_weight = ((x - 0.5) * 2.0).clamp(0.0, 1.0);
    let shadow_weight = ((0.5 - x) * 2.0).clamp(0.0, 1.0);
    x + m.highlights * 0.25 * highlight_weight + m.shadows * 0.25 * shadow_weight
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
