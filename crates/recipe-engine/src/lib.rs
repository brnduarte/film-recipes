//! Core recipe math: curves, white balance, grain, Color Chrome Effect, tone.
//!
//! `pipeline.rs` defines the authoritative per-pixel stage order that the
//! GLSL preview shaders must mirror. `classic_chrome.rs` is the first real
//! recipe implementation (Phase 0 Spike C).

pub mod classic_chrome;
pub mod color_chrome;
pub mod curves;
pub mod pipeline;
pub mod recipe;
pub mod tone;
pub mod white_balance;

#[cfg(test)]
mod tests {
    use super::pipeline::apply_recipe_to_pixel;
    use super::recipe::{ManualAdjustments, Recipe};

    #[test]
    fn provia_baseline_is_near_identity_at_mid_gray() {
        let recipe = Recipe::provia_baseline();
        let manual = ManualAdjustments::default();
        let out = apply_recipe_to_pixel([0.5, 0.5, 0.5], &recipe, &manual);
        // Neutral WB (5500K, no shift), no exposure/tone/color changes:
        // mid-gray should come back very close to itself.
        for c in out {
            assert!((c - 0.5).abs() < 0.02, "expected ~0.5, got {c}");
        }
    }

    #[test]
    fn classic_chrome_lifts_black_and_pulls_white() {
        let recipe = super::classic_chrome::classic_chrome_recipe();
        let manual = ManualAdjustments::default();

        let black = apply_recipe_to_pixel([0.0, 0.0, 0.0], &recipe, &manual);
        let white = apply_recipe_to_pixel([1.0, 1.0, 1.0], &recipe, &manual);

        // "Faded film" look: pure black lifts above 0, pure white pulls
        // below 1 — this is the defining visual signature of the curve in
        // classic_chrome::tone_curve().
        assert!(black[1] > 0.0, "expected lifted black, got {black:?}");
        assert!(white[1] < 1.0, "expected pulled white, got {white:?}");
    }

    #[test]
    fn classic_chrome_reduces_saturation_of_vivid_red() {
        let provia = Recipe::provia_baseline();
        let classic_chrome = super::classic_chrome::classic_chrome_recipe();
        let manual = ManualAdjustments::default();

        let vivid_red = [0.9, 0.1, 0.1];
        let provia_out = apply_recipe_to_pixel(vivid_red, &provia, &manual);
        let cc_out = apply_recipe_to_pixel(vivid_red, &classic_chrome, &manual);

        let sat = |rgb: [f32; 3]| rgb[0].max(rgb[1]).max(rgb[2]) - rgb[0].min(rgb[1]).min(rgb[2]);
        assert!(
            sat(cc_out) < sat(provia_out),
            "expected Classic Chrome to be less saturated than Provia on vivid red: cc={cc_out:?} provia={provia_out:?}"
        );
    }

    #[test]
    fn pipeline_order_has_no_duplicate_stages() {
        let order = super::pipeline::PIPELINE_ORDER;
        for (i, a) in order.iter().enumerate() {
            for b in &order[i + 1..] {
                assert_ne!(a, b, "duplicate pipeline stage: {a:?}");
            }
        }
    }
}
