//! Eterna / Eterna Bleach Bypass film simulations — Phase 2 recipes.
//! Publicly documented characteristics: Eterna is a cinema-film-inspired
//! simulation with very low contrast, wide latitude, and subdued color for
//! a flat, grading-ready base. Eterna Bleach Bypass emulates the bleach
//! bypass film-lab process: silver retained during development yields high
//! contrast combined with heavy desaturation (but not full monochrome) for
//! a gritty, high-contrast look. Provisional pending a reference photo
//! comparison.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// Eterna: DR400 plus the most extreme available shadow/highlight softening
/// (`ToneSetting`'s -2 floor) for the flattest possible base, and heavily
/// reduced color for the subdued cinematic look.
pub fn eterna_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Eterna,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -2 },
        color: -3,
        sharpness: -2,
        noise_reduction: -2,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}

/// Eterna Bleach Bypass: DR100 (contrast-built, not a flat capture), strong
/// highlight punch with a touch of shadow lift to avoid fully crushing
/// blacks, and heavy (but not full) desaturation — this recipe is
/// deliberately not in `acros::is_monochrome`, since the bleach-bypass look
/// retains partial color rather than going fully gray.
pub fn eterna_bleach_bypass_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::EternaBleachBypass,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr100,
        tone: ToneSetting { highlight: 3, shadow: -1 },
        color: -3,
        sharpness: 1,
        noise_reduction: -1,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}
