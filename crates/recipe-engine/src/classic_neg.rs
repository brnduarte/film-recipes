//! Classic Negative film simulation — Phase 2 recipe. Publicly documented
//! characteristics: modeled on color negative film for everyday/street
//! shooting, higher contrast and deeper shadows than Classic Chrome, muted
//! color with a distinctive cool-shadow/warm-highlight cast.
//!
//! This crate's per-film characteristic tone curve is currently only
//! implemented for Classic Chrome (`tone.rs::film_characteristic_curve`
//! falls back to identity for every other simulation, a known limitation
//! documented there). Classic Negative is therefore differentiated from
//! Classic Chrome here via dynamic range, tone, color, and Color Chrome
//! Effect only — not a distinct S-curve — until that limitation is
//! revisited. Provisional pending a reference photo comparison.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The Classic Negative recipe: DR400 for the wide latitude this look is
/// typically shot with, punchier highlight/shadow tone than Classic Chrome
/// for deeper contrast, reduced color, and Weak Color Chrome Effect for
/// separated, muted tones.
pub fn classic_neg_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 2, shadow: -2 },
        color: -2,
        sharpness: 0,
        noise_reduction: -2,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}
