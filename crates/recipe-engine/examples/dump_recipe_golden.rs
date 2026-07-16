//! Dumps `apply_recipe_to_pixel` output for a fixed set of test pixels
//! across all Phase 1 recipes — the golden fixture for the generalized
//! Rust/GLSL parity test in packages/gl-pipeline/test/parity.mjs (which
//! checks recipe-reference.mjs, the JS mirror of recipe.frag.glsl, against
//! this same Rust math). Run with:
//!   cargo run -p recipe-engine --example dump_recipe_golden > \
//!     packages/gl-pipeline/test/recipe-golden.json

use recipe_engine::pipeline::apply_recipe_to_pixel;
use recipe_engine::recipe::{ManualAdjustments, Recipe};
use serde::Serialize;

#[derive(Serialize)]
struct RecipeGolden {
    name: &'static str,
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

fn golden_for(name: &'static str, recipe: &Recipe) -> RecipeGolden {
    let manual = ManualAdjustments::default();
    RecipeGolden {
        name,
        pixels: TEST_PIXELS
            .iter()
            .map(|&input| PixelGolden { input, expected: apply_recipe_to_pixel(input, recipe, &manual) })
            .collect(),
    }
}

fn main() {
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
        golden_for("bright-kodak", &recipe_engine::named_recipes::bright_kodak_recipe()),
        golden_for("grainy-day", &recipe_engine::named_recipes::grainy_day_recipe()),
        golden_for("wes-anderson", &recipe_engine::named_recipes::wes_anderson_recipe()),
    ];

    println!("{}", serde_json::to_string_pretty(&goldens).unwrap());
}
