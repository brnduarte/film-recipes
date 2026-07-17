//! Named community "recipes" — the popular looks that shooters build
//! on top of a base film simulation by dialing in white balance, dynamic
//! range, tone, color, grain, and Color Chrome settings. Values transcribed
//! from community film-simulation recipes.
//!
//! These differ from the 12 base film simulations in `built_in_recipes`:
//! several share the same base (e.g. ClassicChrome), so they are keyed by a
//! stable string id in the UI catalog (packages/recipes-catalog), not by
//! `film_simulation`.
//!
//! Where the reference uses half-steps that don't fit the integer
//! highlight/shadow scale (`ToneSetting` is `i8`), the value is rounded away
//! from zero (e.g. -1.5 -> -2, +0.5 -> +1). Grain, clarity, and sharpness/NR
//! are carried in the `Recipe` for fidelity but are not yet applied by the
//! pipeline (deferred) — the visible look comes from white balance, dynamic
//! range, tone, color, and Color Chrome.

use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, GrainSize,
    Recipe, ToneSetting, WhiteBalance, WhiteBalanceMode,
};

// ── Kodak film stocks ────────────────────────────────────────────────

/// Kodak Portra 160 — Classic Chrome, Daylight WB, warm shift, gentle DR.
/// Soft, clean portrait film with muted color. DR-P mapped to DR400.
pub fn kodak_portra_160_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 0, shadow: 0 }, // DR-P replaces tone
        color: 0,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500, // Daylight
            red_shift: 4,
            blue_shift: -5,
        },
        exposure_compensation: 0.67,
    }
}

/// Kodak Portra 400 v2 — Classic Chrome, 5200K WB, strong blue pull, Strong
/// Color Chrome. Soft pastel portrait-negative look.
pub fn kodak_portra_400_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 0, shadow: -2 },
        color: 2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5200,
            red_shift: 1,
            blue_shift: -6,
        },
        exposure_compensation: 0.67,
    }
}

/// Kodak Portra 800 v3 — Classic Chrome, 6600K WB, DR400, Strong Color
/// Chrome. Moodier, cooler high-speed film variant.
pub fn kodak_portra_800_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: 3,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 6600,
            red_shift: -1,
            blue_shift: -3,
        },
        exposure_compensation: 0.67,
    }
}

/// Kodak Gold 200 — Classic Chrome, Daylight WB, warm golden consumer-film
/// look with punchy color and wide DR.
pub fn kodak_gold_200_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 1 },
        color: 3,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 4,
            blue_shift: -5,
        },
        exposure_compensation: 0.67,
    }
}

/// Kodak Ultramax 400 — Classic Chrome, contrasty consumer film with bold
/// grain and saturated color.
pub fn kodak_ultramax_400_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 1, shadow: 1 },
        color: 4,
        sharpness: 0,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 1,
            blue_shift: -5,
        },
        exposure_compensation: 0.67,
    }
}

/// Kodachrome 64 — Classic Chrome, Daylight WB, warm red/blue shift for the
/// iconic saturated slide-film look with a warm golden cast.
pub fn kodachrome_64_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 0, shadow: 1 },
        color: 2,
        sharpness: 1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -5,
        },
        exposure_compensation: 0.33,
    }
}

/// Kodachrome 25 — Classic Chrome, fine-grained, high sharpness, Strong
/// Color Chrome. The sharpest, cleanest of the Kodachrome family.
pub fn kodachrome_25_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 1, shadow: -1 },
        color: 1,
        sharpness: 3,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Off, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -4,
        },
        exposure_compensation: 0.33,
    }
}

/// Kodak Vision3 250D v2 — Nostalgic Neg, cinematic motion-picture daylight
/// stock with faded highlights, lifted shadows, and fluorescent WB.
pub fn kodak_vision3_250d_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 4, shadow: 3 },
        color: -1,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000, // Fluorescent 1
            red_shift: -5,
            blue_shift: 0,
        },
        exposure_compensation: 0.33,
    }
}

/// Kodak Gold Max 400 Expired — Reala Ace, warm expired consumer-film look
/// with strong grain, faded tones, and a nostalgic color shift.
pub fn kodak_gold_max_expired_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 2 },
        color: -2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 6700,
            red_shift: 1,
            blue_shift: 4,
        },
        exposure_compensation: 1.0,
    }
}

// ── Additional film stocks ───────────────────────────────────────────

/// Superia Xtra 400 — Classic Negative, warm everyday consumer film with
/// punchy saturated color and a slightly lifted shadow.
pub fn superia_xtra_400_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 0, shadow: -1 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 3,
            blue_shift: -5,
        },
        exposure_compensation: 0.5,
    }
}

/// Natura 1600 — Classic Negative, high-ISO Japanese film with
/// muted desaturated palette, heavy grain, and a soft, dreamy quality.
pub fn natura_1600_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 2 },
        color: -2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: -1,
            blue_shift: -2,
        },
        exposure_compensation: 0.67,
    }
}

/// Reala Ace — Classic Negative base, soft yet colorful analog-like
/// aesthetic with strong Color Chrome and wide dynamic range.
pub fn reala_ace_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -2 },
        color: 2,
        sharpness: 0,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: -1,
            blue_shift: 1,
        },
        exposure_compensation: 0.33,
    }
}

/// Easy Reala Ace — Reala Ace base, gentle and true-to-life with minimal
/// processing for a neutral, natural look.
pub fn easy_reala_ace_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: 0 },
        color: 0,
        sharpness: 0,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 0,
            blue_shift: 0,
        },
        exposure_compensation: 0.67,
    }
}

/// Color Negative — Reala Ace base, clean, warm daylight film with
/// gentle tones and natural color.
pub fn color_negative_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: -1 },
        color: 2,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5000,
            red_shift: 0,
            blue_shift: -2,
        },
        exposure_compensation: 0.67,
    }
}

/// Industrial 100 — Reala Ace, very warm (3100K) industrial look
/// with strong red/blue shift and lifted shadows.
pub fn industrial_100_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 1, shadow: 2 },
        color: -1,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 3100,
            red_shift: 8,
            blue_shift: -8,
        },
        exposure_compensation: 0.0,
    }
}

/// PRO Negative 160C — Reala Ace, versatile everyday recipe emulating a
/// discontinued warm 160-speed film stock. Gentle, warm tones.
pub fn pro_negative_160c_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: -1 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 1,
            blue_shift: -2,
        },
        exposure_compensation: 0.33,
    }
}

/// Provia Positive — Provia base, vivid slide-film character with Strong
/// Color Chrome, punchy color and fine grain.
pub fn provia_positive_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Provia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: 1 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -3,
        },
        exposure_compensation: 0.67,
    }
}

/// Vivid Velvia — Velvia base, highly saturated landscape recipe with
/// Strong Color Chrome and positive Clarity for maximum punch.
pub fn vivid_velvia_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Velvia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: -1 },
        color: 4,
        sharpness: 1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 1,
            blue_shift: -3,
        },
        exposure_compensation: 0.67,
    }
}

// ── Nostalgic / retro looks ──────────────────────────────────────────

/// Nostalgia Negative — Nostalgic Neg, warm Daylight WB, DR400, Strong
/// Color Chrome, +4 color. Vibrant, dreamlike vintage look.
pub fn nostalgia_negative_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: 1 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 3,
            blue_shift: -3,
        },
        exposure_compensation: 0.33,
    }
}

/// Timeless Negative — Nostalgic Neg, 1970s aesthetic with faded tones,
/// desaturated color, and strong highlight lift.
pub fn timeless_negative_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 2, shadow: -2 },
        color: -3,
        sharpness: 0,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -3,
        },
        exposure_compensation: 0.0,
    }
}

/// Nostalgic Air — Nostalgic Neg, dreamy ethereal look with +5 red shift,
/// maximum color and soft focus feel.
pub fn nostalgic_air_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: 0 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 5,
            blue_shift: -1,
        },
        exposure_compensation: 1.0,
    }
}

/// Emulsion '86 — Nostalgic Neg, warm vintage look with strong grain,
/// high color, and lifted shadows for a mid-80s film aesthetic.
pub fn emulsion_86_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 2 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -1,
        },
        exposure_compensation: 1.0,
    }
}

/// 1970's Summer — Nostalgic Neg, strongly desaturated, heavy grain, deep
/// blue pull for faded 70s vacation-snapshot aesthetic.
pub fn seventies_summer_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: -2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 6500,
            red_shift: -1,
            blue_shift: -4,
        },
        exposure_compensation: 0.67,
    }
}

/// Summer of 1960 — Nostalgic Neg, extreme highlight lift, deep blue push,
/// soft focus, and punchy color for a sun-bleached 60s look.
pub fn summer_of_1960_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 4, shadow: 2 },
        color: 3,
        sharpness: -4,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5250,
            red_shift: -3,
            blue_shift: -5,
        },
        exposure_compensation: 0.67,
    }
}

/// California Summer — Nostalgic Neg, sun-drenched coastal warmth with
/// wide DR, desaturated blue pull, and soft dreamy feel.
pub fn california_summer_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 6700,
            red_shift: -1,
            blue_shift: -6,
        },
        exposure_compensation: 1.0,
    }
}

/// Classic Retro — Classic Negative, contrasty, desaturated retro look
/// with extreme highlight lift and cool-warm tension.
pub fn classic_retro_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 4, shadow: -2 },
        color: -1,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 0,
            blue_shift: -3,
        },
        exposure_compensation: -0.67,
    }
}

/// Classic Amber — Classic Negative, warm amber cast with Fluorescent WB,
/// lifted shadows and high color for a golden vintage tone.
pub fn classic_amber_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 3 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000,
            red_shift: 1,
            blue_shift: -6,
        },
        exposure_compensation: 1.0,
    }
}

/// Classic Color — Classic Chrome, warm sunny daylight look, Kodak-like
/// color negative rendering with Strong Color Chrome.
pub fn classic_color_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -1, shadow: -2 },
        color: 3,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5300,
            red_shift: 0,
            blue_shift: -6,
        },
        exposure_compensation: 0.5,
    }
}

/// Pacific Blues — Classic Negative, deep blue-toned film with lifted
/// shadows, heavy grain, and a moody coastal palette.
pub fn pacific_blues_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: 3 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5800,
            red_shift: 1,
            blue_shift: -3,
        },
        exposure_compensation: 1.0,
    }
}

/// Pushed Analog — Reala Ace, pushed film aesthetic with lifted highlights/
/// shadows, heavy color, and a film-grain texture.
pub fn pushed_analog_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::RealaAce,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 2, shadow: 2 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Strong,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000,
            red_shift: -3,
            blue_shift: -2,
        },
        exposure_compensation: 0.5,
    }
}

// ── Cinema / Eterna looks ────────────────────────────────────────────

/// Vintage Cinema — Nostalgic Neg, 4900K WB with unusual +3 blue shift,
/// high highlight lift and deep shadow. Warm golden-hour cinematic look.
pub fn vintage_cinema_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 3, shadow: -2 },
        color: -1,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4900,
            red_shift: 3,
            blue_shift: 3,
        },
        exposure_compensation: -0.33,
    }
}

/// Vintage Eterna — Eterna, large grain vintage motion-picture look with
/// lifted highlights and muted tones.
pub fn vintage_eterna_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Eterna,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr100,
        tone: ToneSetting { highlight: 3, shadow: -1 },
        color: 2,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Auto,
            kelvin: 5500,
            red_shift: 2,
            blue_shift: -5,
        },
        exposure_compensation: -0.33,
    }
}

/// Eterna Summer — Eterna, warm Daylight WB with extreme blue pull,
/// lifted highlights, Strong Color Chrome for a summer movie look.
pub fn eterna_summer_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Eterna,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 3, shadow: 0 },
        color: 4,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 3,
            blue_shift: -7,
        },
        exposure_compensation: 0.33,
    }
}

/// CineStill 800T — Eterna, tungsten-balanced night film with Fluorescent 3
/// WB, heavy grain, Strong Color Chrome, and high color saturation.
pub fn cinestill_800t_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Eterna,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 0, shadow: 2 },
        color: 4,
        sharpness: -3,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 3800, // Fluorescent 3
            red_shift: -6,
            blue_shift: -4,
        },
        exposure_compensation: 0.33,
    }
}

/// CineStill 400D v2 — Astia, daylight cinema film with cool fluorescent
/// WB, magenta bias, Strong Color Chrome. Subtle, polished film look.
pub fn cinestill_400d_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Astia,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -2, shadow: 0 },
        color: 2,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000, // Fluorescent 1
            red_shift: -2,
            blue_shift: 4,
        },
        exposure_compensation: 0.67,
    }
}

/// Vintage Bronze — Eterna Bleach Bypass, warm Daylight WB with extreme
/// red/blue shift, desaturated alternative-process look.
pub fn vintage_bronze_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::EternaBleachBypass,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 0, shadow: -1 },
        color: 0,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 6,
            blue_shift: -8,
        },
        exposure_compensation: -0.33,
    }
}

/// 1960 Chrome — Eterna Bleach Bypass, vintage magazine Ektachrome look
/// with muted tones, Strong Color Chrome, and large grain.
pub fn chrome_1960_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::EternaBleachBypass,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: 2,
        sharpness: -1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000,
            red_shift: -2,
            blue_shift: -4,
        },
        exposure_compensation: 0.67,
    }
}

/// Fluorescent Night — Nostalgic Neg, urban night photography with cool
/// fluorescent WB, heavy red pull, and saturated neon tones.
pub fn fluorescent_night_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::NostalgicNeg,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: -2 },
        color: 4,
        sharpness: -2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Fine },
        color_chrome_effect: ColorChromeStrength::Strong,
        color_chrome_fx_blue: ColorChromeStrength::Weak,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 4000, // Fluorescent 2
            red_shift: -8,
            blue_shift: -1,
        },
        exposure_compensation: 0.0,
    }
}

// ── Black & White ────────────────────────────────────────────────────

/// Ilford FP4 Plus 125 — Monochrome, classic fine-grain B&W with neutral
/// tones and gentle contrast.
pub fn ilford_fp4_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Monochrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: -1, shadow: -2 },
        color: 0,
        sharpness: 0,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Weak, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 6,
            blue_shift: -8,
        },
        exposure_compensation: -0.33,
    }
}

/// Classic B&W — Acros+G, high-contrast street black and white with bold
/// grain, extreme shadow lift, and punchy highlights.
pub fn classic_bw_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Acros,
        acros_filter: AcrosFilter::Green,
        dynamic_range: DynamicRange::Dr200,
        tone: ToneSetting { highlight: 3, shadow: 4 },
        color: 0,
        sharpness: 1,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 2850, // Incandescent
            red_shift: -9,
            blue_shift: 9,
        },
        exposure_compensation: 0.33,
    }
}

/// Kodak T-Max P3200 — Acros, pushed high-ISO B&W with heavy grain,
/// contrasty lifted shadows, and gritty texture.
pub fn kodak_tmax_p3200_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::Acros,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: 1, shadow: 3 },
        color: 0,
        sharpness: 2,
        noise_reduction: -4,
        grain: GrainSettings { strength: ColorChromeStrength::Strong, size: GrainSize::Large },
        color_chrome_effect: ColorChromeStrength::Off,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance {
            mode: WhiteBalanceMode::Kelvin,
            kelvin: 5500,
            red_shift: 4,
            blue_shift: 7,
        },
        exposure_compensation: 0.33,
    }
}
