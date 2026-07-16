//! Core recipe math: curves, white balance, grain, Color Chrome Effect, tone.
//!
//! `pipeline.rs` defines the authoritative per-pixel stage order that the
//! GLSL preview shaders must mirror. `classic_chrome.rs`, `velvia.rs`, and
//! `acros.rs` are the Phase 1 recipe implementations (Provia's baseline
//! lives directly on `Recipe::provia_baseline()`).

pub mod acros;
pub mod astia;
pub mod classic_chrome;
pub mod classic_neg;
pub mod color_chrome;
pub mod curves;
pub mod eterna;
pub mod monochrome;
pub mod named_recipes;
pub mod pipeline;
pub mod pro_neg;
pub mod recipe;
pub mod tone;
pub mod velvia;
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
    fn velvia_increases_saturation_of_muted_color() {
        let provia = Recipe::provia_baseline();
        let velvia = super::velvia::velvia_recipe();
        let manual = ManualAdjustments::default();

        let muted_green = [0.3, 0.45, 0.32];
        let provia_out = apply_recipe_to_pixel(muted_green, &provia, &manual);
        let velvia_out = apply_recipe_to_pixel(muted_green, &velvia, &manual);

        let sat = |rgb: [f32; 3]| rgb[0].max(rgb[1]).max(rgb[2]) - rgb[0].min(rgb[1]).min(rgb[2]);
        assert!(
            sat(velvia_out) > sat(provia_out),
            "expected Velvia to be more saturated than Provia: velvia={velvia_out:?} provia={provia_out:?}"
        );
    }

    #[test]
    fn acros_is_fully_desaturated() {
        let acros = super::acros::acros_recipe();
        let manual = ManualAdjustments::default();

        let vivid_red = [0.9, 0.1, 0.1];
        let out = apply_recipe_to_pixel(vivid_red, &acros, &manual);

        assert!(
            (out[0] - out[1]).abs() < 1e-6 && (out[1] - out[2]).abs() < 1e-6,
            "expected fully desaturated (R=G=B) output, got {out:?}"
        );
    }

    #[test]
    fn monochrome_is_fully_desaturated() {
        let mono = super::monochrome::monochrome_recipe();
        let manual = ManualAdjustments::default();

        let vivid_red = [0.9, 0.1, 0.1];
        let out = apply_recipe_to_pixel(vivid_red, &mono, &manual);

        assert!(
            (out[0] - out[1]).abs() < 1e-6 && (out[1] - out[2]).abs() < 1e-6,
            "expected fully desaturated (R=G=B) output, got {out:?}"
        );
    }

    #[test]
    fn sepia_applies_warm_tint_after_desaturation() {
        let sepia = super::monochrome::sepia_recipe();
        let manual = ManualAdjustments::default();

        let vivid_red = [0.9, 0.1, 0.1];
        let out = apply_recipe_to_pixel(vivid_red, &sepia, &manual);

        // Warm cast: red channel > green > blue, and not fully desaturated
        // (unlike plain Monochrome) since the sepia tint is applied after
        // the desaturation stage.
        assert!(out[0] > out[1] && out[1] > out[2], "expected warm R>G>B cast, got {out:?}");
    }

    #[test]
    fn eterna_bleach_bypass_is_not_fully_desaturated() {
        let recipe = super::eterna::eterna_bleach_bypass_recipe();
        let manual = ManualAdjustments::default();

        let vivid_red = [0.9, 0.1, 0.1];
        let out = apply_recipe_to_pixel(vivid_red, &recipe, &manual);

        // Bleach bypass retains partial color — R, G, B must not collapse
        // to the same value the way true monochrome recipes do.
        assert!(
            (out[0] - out[1]).abs() > 1e-6,
            "expected partial color retained, got fully desaturated {out:?}"
        );
    }

    #[test]
    fn named_recipe_white_balance_shifts_color_cast() {
        // Portra 400's warm Auto WB (+2 red, -4 blue) must actually push a
        // neutral gray warm — red up, blue down — proving the recipe's white
        // balance is wired through the pipeline, not ignored.
        let portra = super::named_recipes::kodak_portra_400_recipe();
        let manual = ManualAdjustments::default();

        let out = apply_recipe_to_pixel([0.5, 0.5, 0.5], &portra, &manual);
        assert!(
            out[0] > out[2],
            "expected a warm cast (red > blue) from the recipe's WB shift, got {out:?}"
        );
    }

    #[test]
    fn wes_anderson_cool_kelvin_differs_from_neutral() {
        // 4350K is well below the 5500K reference, so the Kelvin gain alone
        // (before shifts) must move the result away from a neutral-WB
        // Classic Chrome render — confirming Kelvin is live, not just shifts.
        let wes = super::named_recipes::wes_anderson_recipe();
        let mut neutral = wes.clone();
        neutral.white_balance = super::recipe::WhiteBalance::default();
        let manual = ManualAdjustments::default();

        let wes_out = apply_recipe_to_pixel([0.5, 0.5, 0.5], &wes, &manual);
        let neutral_out = apply_recipe_to_pixel([0.5, 0.5, 0.5], &neutral, &manual);
        assert!(
            wes_out != neutral_out,
            "expected the recipe's white balance to change the output vs neutral WB"
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
