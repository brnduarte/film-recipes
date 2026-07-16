//! ACROS film simulation — Phase 1 recipe #3. Publicly documented
//! characteristics: monochrome with deep, smooth blacks, high sharpness,
//! and fine, well-controlled grain (Fuji markets it specifically for grain
//! quality — deferred here per the plan's grain R&D spike, risk #2). Full
//! desaturation is applied unconditionally for monochrome simulations by
//! `pipeline::apply_recipe_to_pixel`, so `Recipe.color` is not meaningful
//! for this recipe.
//!
//! Per-filter (Yellow/Red/Green) channel-mix weighting is deferred to
//! Phase 2's full parameter set; `acros_filter` is `None` here.
//!
//! Not yet visually validated against a real Fuji ACROS JPEG — provisional
//! pending a reference photo comparison.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The ACROS recipe: DR200 for slightly extended highlight/shadow latitude,
/// a mild highlight pull for smooth rolloff, no color settings (monochrome
/// is forced downstream), and elevated sharpness for ACROS's characteristic
/// crisp detail.
pub fn acros_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Acros,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: 0 },
        color: 0,
        sharpness: 1,
        noise_reduction: -2,
        grain: GrainSettings::default(), // grain deferred, see plan risk #2
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}

/// True for film simulations that are always fully desaturated, regardless
/// of `Recipe.color` — used by `pipeline::apply_recipe_to_pixel` to force
/// saturation gain to 0 rather than relying on the normal -4..+4 `color`
/// mapping (which only reaches a 0.6 minimum gain, not true monochrome).
pub fn is_monochrome(sim: FilmSimulation) -> bool {
    matches!(sim, FilmSimulation::Acros | FilmSimulation::Monochrome | FilmSimulation::Sepia)
}
