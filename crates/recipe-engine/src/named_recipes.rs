//! Named community "recipes" — the popular looks (Kodak Portra 400, Kodak
//! Gold 200, etc.) that Fuji shooters build on top of a base film simulation
//! by dialing in white balance, dynamic range, tone, color, and Color Chrome
//! settings. Values transcribed from Alex Armitage's published X-E5 recipes
//! (https://www.alexarmitage.com/blog/2025/12/20/fujifilm-x-e5-recipes).
//!
//! These differ from the 12 base film simulations in `built_in_recipes`:
//! several share the same base (`ClassicChrome`), so they are keyed by a
//! stable string id in the UI catalog (packages/recipes-catalog), not by
//! `film_simulation`.
//!
//! Where the reference uses half-steps that don't fit Fuji's integer
//! highlight/shadow scale (`ToneSetting` is `i8`), the value is rounded away
//! from zero (e.g. -1.5 -> -2, +0.5 -> +1). Grain, clarity, and sharpness/NR
//! are carried in the `Recipe` for fidelity but are not yet applied by the
//! pipeline (deferred, see feedback memory) — the visible look here comes
//! from white balance, dynamic range, tone, color, and Color Chrome.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance, WhiteBalanceMode,
};

/// Kodak Portra 400 — Classic Chrome base, warm Auto WB with a strong blue
/// pull, gentle DR200, subdued tone and Strong Color Chrome for that soft,
/// pastel portrait-negative look.
pub fn kodak_portra_400_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: -1 },
        color: 2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -4,
        },
        exposure_compensation: 0.0,
    }
}

/// Kodak Gold 200 — Classic Chrome base, Daylight WB pushed warm, DR400 with
/// a lifted shadow and pulled highlight, higher color for the punchy,
/// golden consumer-film look.
pub fn kodak_gold_200_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 1 },
        color: 3,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 4,
            blue_shift: -5,
        },
        exposure_compensation: 0.0,
    }
}

/// Kodak Portra 800 — Classic Chrome base, cooler 6600K WB, DR400, deep
/// tone and Strong Color Chrome for the moodier high-speed-film variant.
pub fn kodak_portra_800_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: 3,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 6600,
            red_shift: -1,
            blue_shift: -3,
        },
        exposure_compensation: 0.0,
    }
}

/// Bright Kodak — Classic Chrome base, Daylight WB with a heavy blue pull,
/// DR400, maximally deep tone and the highest color for a bright, contrasty,
/// saturated look. No Color Chrome.
pub fn bright_kodak_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -2 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 3,
            blue_shift: -7,
        },
        exposure_compensation: 0.0,
    }
}

/// Grainy Day — the one Classic Negative base here, warm Auto WB, DR200,
/// lifted highlight and higher color for a muted, moody street look.
pub fn grainy_day_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 1, shadow: 0 },
        color: 3,
        sharpness: -4,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 4,
            blue_shift: -4,
        },
        exposure_compensation: 0.0,
    }
}

/// Wes Anderson — Classic Chrome base, cool 4350K WB with a strong warm
/// red/blue shift for the signature pastel, storybook palette. DR-P Strong
/// maps to DR400 (this crate's widest latitude). Highlight/shadow tone left
/// neutral (unspecified in the reference).
pub fn wes_anderson_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 0, shadow: 0 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4350,
            red_shift: 6,
            blue_shift: -8,
        },
        exposure_compensation: 0.0,
    }
}
