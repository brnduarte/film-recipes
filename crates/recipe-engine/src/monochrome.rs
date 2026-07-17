//! Monochrome / Sepia film simulations — Phase 2 recipes. Publicly
//! documented characteristics: Monochrome is the plain neutral black &
//! white mode (no per-filter contrast shaping beyond what ACROS adds — see
//! `acros_filter` on both recipes here for the shared Yellow/Red/Green
//! emulation, deferred to Phase 2's full parameter set same as ACROS);
//! Sepia is the same neutral B&W base with a warm brown-toned cast.
//! Provisional pending a reference photo comparison.
//!
//! Both are forced fully desaturated by `acros::is_monochrome` in the
//! saturation stage of `pipeline::apply_recipe_to_pixel`. That desaturation
//! collapses every channel to the same luma value, which would erase any
//! warm tint applied *before* it — so Sepia's cast can't be built via
//! `Recipe.color` or white balance the way a color recipe would be. Instead
//! `apply_sepia_tone` is a dedicated post-saturation pipeline stage (see
//! `pipeline.rs`), applied only when `film_simulation == FilmSimulation::Sepia`,
//! mirroring how Classic Chrome's split-tone is a special-cased post-curve
//! stage.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The Monochrome recipe: DR100 (no latitude-extension need for a neutral
/// B&W baseline), identity tone, no color settings (monochrome is forced
/// downstream), and neutral sharpness/NR.
pub fn monochrome_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Monochrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr100,
        tone: ToneSetting { highlight: 0, shadow: 0 },
        color: 0,
        sharpness: 0,
        noise_reduction: 0,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}

/// The Sepia recipe: same neutral B&W base as Monochrome. Its warm cast
/// comes entirely from `apply_sepia_tone`, not from any field here.
pub fn sepia_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Sepia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr100,
        tone: ToneSetting { highlight: 0, shadow: 0 },
        color: 0,
        sharpness: 0,
        noise_reduction: 0,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}

/// Warm brown-toned multiply applied to an already fully-desaturated pixel
/// (R=G=B=luma at this point in the pipeline). Weights are a simple,
/// characteristic sepia multiply (brighten red, dim blue) rather than a
/// physically modeled dye-cloud simulation.
pub fn apply_sepia_tone(rgb: [f32; 3]) -> [f32; 3] {
    let luma = rgb[1]; // R=G=B already, any channel is the luma value
    [
        (luma * 1.07).clamp(0.0, 1.0),
        (luma * 0.86).clamp(0.0, 1.0),
        (luma * 0.62).clamp(0.0, 1.0),
    ]
}
