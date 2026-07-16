//! Pro Neg Hi / Pro Neg Std film simulations — Phase 2 recipes. Publicly
//! documented characteristics: both modeled on professional portrait
//! negative film with soft, natural skin-tone gradation; Hi is the
//! higher-contrast studio variant, Std is flatter/softer for wide-latitude
//! work. Provisional pending a reference photo comparison.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// Pro Neg Hi: DR200, mild highlight punch for a touch more contrast than
/// Std, slightly reduced color for natural skin tones.
pub fn pro_neg_hi_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ProNegHi,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 1, shadow: 0 },
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

/// Pro Neg Std: DR400 for the flattest, widest-latitude gradation in the
/// pair, softer tone and sharpness than Hi.
pub fn pro_neg_std_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ProNegStd,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: -1 },
        color: -1,
        sharpness: -2,
        noise_reduction: -1,
        grain: GrainSettings::default(),
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}
