//! Dumps Classic Chrome pipeline output for a fixed set of input pixels as
//! JSON, used as the golden fixture for the Rust/GLSL parity test in
//! packages/gl-pipeline/test/parity.mjs. Run with:
//!   cargo run -p recipe-engine --example dump_classic_chrome_golden > \
//!     packages/gl-pipeline/test/classic-chrome-golden.json

use recipe_engine::classic_chrome::classic_chrome_recipe;
use recipe_engine::pipeline::apply_recipe_to_pixel;
use recipe_engine::recipe::ManualAdjustments;

fn main() {
    let recipe = classic_chrome_recipe();
    let manual = ManualAdjustments::default();

    let samples: &[(&str, [f32; 3])] = &[
        ("black", [0.0, 0.0, 0.0]),
        ("white", [1.0, 1.0, 1.0]),
        ("mid_gray", [0.5, 0.5, 0.5]),
        ("vivid_red", [0.9, 0.1, 0.1]),
        ("vivid_blue", [0.1, 0.2, 0.9]),
        ("sky_blue", [0.4, 0.6, 0.9]),
        ("skin_tone", [0.87, 0.68, 0.56]),
        ("deep_green", [0.15, 0.45, 0.2]),
        ("shadow_detail", [0.08, 0.08, 0.1]),
        ("highlight_detail", [0.92, 0.9, 0.85]),
    ];

    println!("[");
    for (i, (name, rgb)) in samples.iter().enumerate() {
        let out = apply_recipe_to_pixel(*rgb, &recipe, &manual);
        let comma = if i + 1 < samples.len() { "," } else { "" };
        println!(
            "  {{ \"name\": \"{name}\", \"input\": [{}, {}, {}], \"expected\": [{}, {}, {}] }}{comma}",
            rgb[0], rgb[1], rgb[2], out[0], out[1], out[2]
        );
    }
    println!("]");
}
