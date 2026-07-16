//! Astia (Soft) film simulation — Phase 2 recipe. Publicly documented
//! characteristics: Fuji's portrait-oriented simulation, designed for soft,
//! faithful, flattering skin tones with gentler contrast than Provia while
//! keeping natural (not desaturated) color elsewhere.
//!
//! Not yet visually validated against a real Fuji Astia JPEG — provisional
//! pending a reference photo comparison, same caveat as every other
//! recipe in this crate.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The Astia recipe: DR200 for a wider, softer latitude, a gentle highlight
/// pull for smooth skin-tone rolloff, and slightly reduced sharpness/color
/// versus Provia for the softer overall look.
pub fn astia_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Astia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: 0 },
        color: -1,
        sharpness: -1,
        noise_reduction: -1,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}
