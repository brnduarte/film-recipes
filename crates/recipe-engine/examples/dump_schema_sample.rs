//! Dumps a sample `Preset` (which nests `Recipe`, `ToneSetting`,
//! `GrainSettings`, `WhiteBalance`, `ManualAdjustments`) as JSON — the
//! golden fixture for the Rust/TS schema-parity test in
//! packages/core-types/test/schema-parity.mjs. Run with:
//!   cargo run -p recipe-engine --example dump_schema_sample > \
//!     packages/core-types/test/schema-sample.json

use recipe_engine::recipe::{
    ColorGrade, ColorGradeStop, ColorHarmony, GrainSettings, ManualAdjustments, Preset, Recipe,
};

fn main() {
    // Populate color_grade with a stop so the schema-parity test can inspect
    // the nested ColorGrade / ColorGradeStop key sets too.
    let manual_adjustments = ManualAdjustments {
        color_grade: ColorGrade {
            enabled: true,
            harmony: ColorHarmony::Complementary,
            intensity: 0.6,
            stops: vec![ColorGradeStop { hue: 30.0, saturation: 0.8, value: 0.7 }],
        },
        ..Default::default()
    };

    let preset = Preset {
        id: "preset-classic-chrome-default".to_string(),
        name: "Classic Chrome".to_string(),
        favorite: false,
        order: 0,
        recipe: Recipe {
            grain: GrainSettings::default(),
            ..recipe_engine::classic_chrome::classic_chrome_recipe()
        },
        manual_adjustments,
        created_at: "2026-07-16T00:00:00Z".to_string(),
        updated_at: "2026-07-16T00:00:00Z".to_string(),
        schema_version: recipe_engine::recipe::CURRENT_PRESET_SCHEMA_VERSION,
    };

    println!("{}", serde_json::to_string_pretty(&preset).unwrap());
}
