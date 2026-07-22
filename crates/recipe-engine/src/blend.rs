//! Photoshop-style blend-mode compositing: `ManualAdjustments::overlay`
//! "self-blends" the fully-graded recipe result with itself using one of a
//! curated subset of Photoshop's blend modes, mixed in by an opacity — the
//! classic Photoshop punch trick of duplicating a layer, setting it to
//! Multiply/Soft Light/etc., and dialing opacity, rather than a duplicate
//! layer composited against the pre-recipe original. That means it can only
//! ever enhance the grade (`opacity=0` is the recipe unchanged; `opacity=1`
//! is the full self-blend), never erase it back to the untouched photo.
//! Applied as the final step of `pipeline::apply_manual_grade`, mirrored in
//! `recipe.frag.glsl` / `recipe-uniforms.ts` / `recipe-reference.mjs`.
//!
//! Only 8 modes are offered, not Photoshop's full ~27-mode set: no Normal/
//! Dissolve/Darken/Screen/Color Dodge/Linear Burn/Linear Dodge/Vivid Light/
//! Linear Light/Pin Light/Darker or Lighter Color/Subtract/Divide, AND —
//! this is the one that actually matters — no Lighten/Hue/Saturation/Color/
//! Luminosity either, despite those being common Photoshop modes, because
//! **self-blending an identical layer with any of them is mathematically
//! guaranteed to be a no-op**: `max(x, x) == x` (Lighten), and Hue/Saturation/
//! Color/Luminosity each just swap a color component (hue, saturation, hue+
//! saturation, or luma) between two layers — when both layers are the same
//! pixel, that swap changes nothing, at any opacity. This isn't a bug to work
//! around, it's inherent to what "self-blend" means for those modes (real
//! Photoshop shows the exact same nothing if you duplicate a layer and set
//! one of these). The 8 modes below all remain meaningful under self-blend:
//! Multiply/ColorBurn/HardMix noticeably deepen shadows, Overlay/SoftLight/
//! HardLight add contrast, Difference/Exclusion fade toward black or flatten.
//! (Overlay and HardLight happen to produce pixel-identical output under
//! self-blend — Overlay(Cb,Cs) == HardLight(Cs,Cb), and swapping arguments
//! that are equal is a no-op — so the two will look the same here; both are
//! kept since neither is "wrong" and users may reach for either by habit.)
//!
//! The formulas are the standard per-channel ones from the W3C/PDF
//! compositing spec's "Blend Mode" appendix, which is also exactly what
//! Photoshop implements for these modes.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BlendMode {
    Multiply,
    ColorBurn,
    Overlay,
    SoftLight,
    HardLight,
    HardMix,
    Difference,
    Exclusion,
}

/// A blend-mode compositing layer on top of the finished recipe grade.
/// Disabled by default, so `ManualAdjustments::default()` stays a no-op.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Overlay {
    pub enabled: bool,
    pub mode: BlendMode,
    pub opacity: f32, // 0..1
}

impl Default for Overlay {
    fn default() -> Self {
        Self { enabled: false, mode: BlendMode::Multiply, opacity: 0.5 }
    }
}

fn multiply(b: f32, s: f32) -> f32 {
    b * s
}

fn color_burn(b: f32, s: f32) -> f32 {
    if b >= 1.0 {
        1.0
    } else if s <= 0.0 {
        0.0
    } else {
        1.0 - ((1.0 - b) / s).min(1.0)
    }
}

fn overlay_fn(b: f32, s: f32) -> f32 {
    if b <= 0.5 {
        2.0 * b * s
    } else {
        1.0 - 2.0 * (1.0 - b) * (1.0 - s)
    }
}

fn hard_light(b: f32, s: f32) -> f32 {
    if s <= 0.5 {
        2.0 * b * s
    } else {
        1.0 - 2.0 * (1.0 - b) * (1.0 - s)
    }
}

fn soft_light_d(x: f32) -> f32 {
    if x <= 0.25 {
        ((16.0 * x - 12.0) * x + 4.0) * x
    } else {
        x.sqrt()
    }
}

fn soft_light(b: f32, s: f32) -> f32 {
    if s <= 0.5 {
        b - (1.0 - 2.0 * s) * b * (1.0 - b)
    } else {
        b + (2.0 * s - 1.0) * (soft_light_d(b) - b)
    }
}

fn hard_mix(b: f32, s: f32) -> f32 {
    if b + s >= 1.0 {
        1.0
    } else {
        0.0
    }
}

fn difference(b: f32, s: f32) -> f32 {
    (b - s).abs()
}

fn exclusion(b: f32, s: f32) -> f32 {
    b + s - 2.0 * b * s
}

fn per_channel(b: [f32; 3], s: [f32; 3], f: fn(f32, f32) -> f32) -> [f32; 3] {
    [f(b[0], s[0]), f(b[1], s[1]), f(b[2], s[2])]
}

/// Generic two-layer blend: `base` is the backdrop (`Cb` in spec terms),
/// `src` the blend/source layer (`Cs`). `apply_overlay` calls this as a
/// self-blend (`base == src`, the finished recipe result blended with
/// itself), but the formula itself doesn't assume that.
pub fn blend_pixel(base: [f32; 3], src: [f32; 3], mode: BlendMode) -> [f32; 3] {
    match mode {
        BlendMode::Multiply => per_channel(base, src, multiply),
        BlendMode::ColorBurn => per_channel(base, src, color_burn),
        BlendMode::Overlay => per_channel(base, src, overlay_fn),
        BlendMode::SoftLight => per_channel(base, src, soft_light),
        BlendMode::HardLight => per_channel(base, src, hard_light),
        BlendMode::HardMix => per_channel(base, src, hard_mix),
        BlendMode::Difference => per_channel(base, src, difference),
        BlendMode::Exclusion => per_channel(base, src, exclusion),
    }
}

/// Self-blend `graded` with itself using `overlay.mode` (pass the same pixel
/// as both `original` and `graded` — see the module doc for why this adds on
/// top of the recipe rather than compositing against the pre-recipe photo),
/// mixed in by `overlay.opacity`. A no-op when disabled or at zero opacity.
pub fn apply_overlay(original: [f32; 3], graded: [f32; 3], overlay: &Overlay) -> [f32; 3] {
    if !overlay.enabled || overlay.opacity <= 0.0 {
        return graded;
    }
    let blended = blend_pixel(original, graded, overlay.mode);
    let o = overlay.opacity.clamp(0.0, 1.0);
    [
        original[0] + (blended[0] - original[0]) * o,
        original[1] + (blended[1] - original[1]) * o,
        original[2] + (blended[2] - original[2]) * o,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_overlay_is_a_no_op() {
        let original = [0.2, 0.5, 0.8];
        let graded = [0.9, 0.1, 0.4];
        let overlay = Overlay { enabled: false, mode: BlendMode::Multiply, opacity: 1.0 };
        assert_eq!(apply_overlay(original, graded, &overlay), graded);
    }

    #[test]
    fn zero_opacity_is_a_no_op() {
        let original = [0.2, 0.5, 0.8];
        let graded = [0.9, 0.1, 0.4];
        let overlay = Overlay { enabled: true, mode: BlendMode::Multiply, opacity: 0.0 };
        assert_eq!(apply_overlay(original, graded, &overlay), graded);
    }

    #[test]
    fn full_opacity_multiply_matches_formula() {
        let original = [0.5, 0.4, 0.2];
        let graded = [0.8, 0.6, 0.9];
        let overlay = Overlay { enabled: true, mode: BlendMode::Multiply, opacity: 1.0 };
        let out = apply_overlay(original, graded, &overlay);
        for i in 0..3 {
            let expected = original[i] * graded[i];
            assert!((out[i] - expected).abs() < 1e-6, "channel {i}: expected {expected}, got {}", out[i]);
        }
    }

    #[test]
    fn half_opacity_interpolates_between_original_and_blend() {
        let original = [0.5, 0.5, 0.5];
        let graded = [0.8, 0.8, 0.8];
        let overlay = Overlay { enabled: true, mode: BlendMode::Multiply, opacity: 0.5 };
        let blended = blend_pixel(original, graded, BlendMode::Multiply);
        let expected = [
            original[0] + (blended[0] - original[0]) * 0.5,
            original[1] + (blended[1] - original[1]) * 0.5,
            original[2] + (blended[2] - original[2]) * 0.5,
        ];
        assert_eq!(apply_overlay(original, graded, &overlay), expected);
    }

    #[test]
    fn difference_is_symmetric_and_zero_for_equal_inputs() {
        let a = [0.3, 0.6, 0.9];
        assert_eq!(blend_pixel(a, a, BlendMode::Difference), [0.0, 0.0, 0.0]);
        let b = [0.9, 0.1, 0.4];
        assert_eq!(blend_pixel(a, b, BlendMode::Difference), blend_pixel(b, a, BlendMode::Difference));
    }

    #[test]
    fn hard_mix_is_binary_per_channel() {
        let out = blend_pixel([0.6, 0.3, 0.5], [0.6, 0.3, 0.5], BlendMode::HardMix);
        for c in out {
            assert!(c == 0.0 || c == 1.0, "expected a binary 0/1 result, got {c}");
        }
    }

    /// Every offered mode must actually change the pixel under self-blend —
    /// this is the regression test for the bug that prompted removing
    /// Lighten/Hue/Saturation/Color/Luminosity: those are mathematically
    /// identity when base == src, so picking them in the UI silently did
    /// nothing at any opacity. Every mode kept here must not have that property.
    #[test]
    fn every_offered_mode_is_non_identity_under_self_blend() {
        let samples = [[0.8_f32, 0.3, 0.3], [0.2, 0.6, 0.9], [0.1, 0.9, 0.4]];
        for mode in [
            BlendMode::Multiply,
            BlendMode::ColorBurn,
            BlendMode::Overlay,
            BlendMode::SoftLight,
            BlendMode::HardLight,
            BlendMode::HardMix,
            BlendMode::Difference,
            BlendMode::Exclusion,
        ] {
            let changes_something = samples.iter().any(|&s| {
                let out = blend_pixel(s, s, mode);
                (out[0] - s[0]).abs() > 1e-4 || (out[1] - s[1]).abs() > 1e-4 || (out[2] - s[2]).abs() > 1e-4
            });
            assert!(changes_something, "{mode:?} is an identity no-op under self-blend");
        }
    }

    #[test]
    fn outputs_stay_in_unit_range_for_unit_inputs() {
        let base = [0.1, 0.6, 0.95];
        let src = [0.85, 0.05, 0.5];
        for mode in [
            BlendMode::Multiply,
            BlendMode::ColorBurn,
            BlendMode::Overlay,
            BlendMode::SoftLight,
            BlendMode::HardLight,
            BlendMode::HardMix,
            BlendMode::Difference,
            BlendMode::Exclusion,
        ] {
            let out = blend_pixel(base, src, mode);
            for c in out {
                assert!((0.0..=1.0).contains(&c), "{mode:?} produced out-of-range channel {c}");
            }
        }
    }
}
