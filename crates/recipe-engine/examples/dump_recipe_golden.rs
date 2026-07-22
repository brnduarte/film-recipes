//! Dumps `apply_recipe_to_pixel` output for a fixed set of test pixels
//! across all Phase 1 recipes — the golden fixture for the generalized
//! Rust/GLSL parity test in packages/gl-pipeline/test/parity.mjs (which
//! checks recipe-reference.mjs, the JS mirror of recipe.frag.glsl, against
//! this same Rust math). Run with:
//!   cargo run -p recipe-engine --example dump_recipe_golden > \
//!     packages/gl-pipeline/test/recipe-golden.json

use recipe_engine::blend::{BlendMode, Overlay};
use recipe_engine::pipeline::apply_recipe_to_pixel;
use recipe_engine::recipe::{ColorGrade, ColorGradeStop, ColorHarmony, ManualAdjustments, Recipe};
use serde::Serialize;

#[derive(Serialize)]
struct RecipeGolden {
    name: &'static str,
    manual: ManualAdjustments,
    pixels: Vec<PixelGolden>,
}

#[derive(Serialize)]
struct PixelGolden {
    input: [f32; 3],
    expected: [f32; 3],
}

const TEST_PIXELS: &[[f32; 3]] = &[
    [0.0, 0.0, 0.0],
    [1.0, 1.0, 1.0],
    [0.5, 0.5, 0.5],
    [0.9, 0.1, 0.1],
    [0.3, 0.45, 0.32],
    [0.1, 0.3, 0.9],
];

fn golden_with(name: &'static str, recipe: &Recipe, manual: ManualAdjustments) -> RecipeGolden {
    let pixels = TEST_PIXELS
        .iter()
        .map(|&input| PixelGolden { input, expected: apply_recipe_to_pixel(input, recipe, &manual) })
        .collect();
    RecipeGolden { name, manual, pixels }
}

fn golden_for(name: &'static str, recipe: &Recipe) -> RecipeGolden {
    golden_with(name, recipe, ManualAdjustments::default())
}

fn main() {
    // A non-default manual grade exercised on two recipes so the parity
    // harness covers pipeline.rs::apply_manual_grade, not just the default
    // (no-op) path.
    let manual_grade = ManualAdjustments {
        exposure: 0.0,
        white_balance: 0.6,
        contrast: 0.35,
        highlights: -0.5,
        shadows: 0.4,
        saturation: 0.25,
        black_level: 0.05,
        white_level: 0.92,
        ..Default::default()
    };

    // A teal-shadows / orange-highlights split (Complementary harmony) so the
    // parity harness covers pipeline.rs::apply_color_grade too.
    let manual_color_grade = ManualAdjustments {
        color_grade: ColorGrade {
            enabled: true,
            harmony: ColorHarmony::Complementary,
            intensity: 0.6,
            stops: vec![
                ColorGradeStop { hue: 190.0, saturation: 0.7, value: 0.6 },
                ColorGradeStop { hue: 30.0, saturation: 0.8, value: 0.7 },
            ],
        },
        ..Default::default()
    };

    // Two overlay blend modes at different opacities, so the parity harness
    // covers pipeline.rs's overlay self-blend compositing stage
    // (blend::apply_overlay) beyond just the default mode.
    let manual_overlay_multiply = ManualAdjustments {
        overlay: Overlay { enabled: true, mode: BlendMode::Multiply, opacity: 0.6 },
        ..Default::default()
    };
    let manual_overlay_soft_light = ManualAdjustments {
        overlay: Overlay { enabled: true, mode: BlendMode::SoftLight, opacity: 1.0 },
        ..Default::default()
    };

    let goldens = vec![
        golden_for("Provia", &Recipe::provia_baseline()),
        golden_for("Velvia", &recipe_engine::velvia::velvia_recipe()),
        golden_for("Astia", &recipe_engine::astia::astia_recipe()),
        golden_for("ClassicChrome", &recipe_engine::classic_chrome::classic_chrome_recipe()),
        golden_for("ClassicNeg", &recipe_engine::classic_neg::classic_neg_recipe()),
        golden_for("ProNegHi", &recipe_engine::pro_neg::pro_neg_hi_recipe()),
        golden_for("ProNegStd", &recipe_engine::pro_neg::pro_neg_std_recipe()),
        golden_for("Eterna", &recipe_engine::eterna::eterna_recipe()),
        golden_for("EternaBleachBypass", &recipe_engine::eterna::eterna_bleach_bypass_recipe()),
        golden_for("Acros", &recipe_engine::acros::acros_recipe()),
        golden_for("Monochrome", &recipe_engine::monochrome::monochrome_recipe()),
        golden_for("Sepia", &recipe_engine::monochrome::sepia_recipe()),
        golden_for("kodak-portra-400", &recipe_engine::named_recipes::kodak_portra_400_recipe()),
        golden_for("kodak-gold-200", &recipe_engine::named_recipes::kodak_gold_200_recipe()),
        golden_for("kodak-portra-800", &recipe_engine::named_recipes::kodak_portra_800_recipe()),
        golden_for("nostalgia-negative", &recipe_engine::named_recipes::nostalgia_negative_recipe()),
        golden_for("classic-retro", &recipe_engine::named_recipes::classic_retro_recipe()),
        golden_for("cinestill-800t", &recipe_engine::named_recipes::cinestill_800t_recipe()),
        golden_with("Provia+manual", &Recipe::provia_baseline(), manual_grade.clone()),
        golden_with("cinestill-800t+manual", &recipe_engine::named_recipes::cinestill_800t_recipe(), manual_grade),
        golden_with("Provia+grade", &Recipe::provia_baseline(), manual_color_grade.clone()),
        golden_with("ClassicChrome+grade", &recipe_engine::classic_chrome::classic_chrome_recipe(), manual_color_grade),
        golden_with("Provia+overlay", &Recipe::provia_baseline(), manual_overlay_multiply),
        golden_with("kodak-portra-400+overlay", &recipe_engine::named_recipes::kodak_portra_400_recipe(), manual_overlay_soft_light),
    ];

    println!("{}", serde_json::to_string_pretty(&goldens).unwrap());
}
