//! Velvia film simulation — Phase 1 recipe #2. Publicly documented
//! characteristics: the most vivid, high-contrast, highly saturated
//! simulation (modeled on Velvia slide film), punchy blacks, minimal
//! dynamic-range flattening (shot at base DR since the look is built on
//! contrast, not a wide flat capture).
//!
//! Like Classic Chrome, this has not been visually validated against a real
//! a Velvia JPEG — provisional pending a reference photo comparison.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The Velvia recipe: base DR100 (no shadow lift needed for a high-contrast
/// look), punched highlight/shadow tone for extra contrast, maximum color
/// saturation, and Strong Color Chrome Effect for the deep, separated color
/// the simulation is known for.
pub fn velvia_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Velvia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr100,
        tone: ToneSetting { highlight: 1, shadow: 1 },
        color: 4,
        sharpness: 1,
        noise_reduction: -1,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}
