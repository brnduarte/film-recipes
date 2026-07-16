//! Classic Chrome film simulation — the first recipe implemented, per
//! Phase 0 Spike C. Publicly documented characteristics used as the basis
//! for these control points: a muted, documentary/reportage look with
//! subdued saturation (especially reds/yellows), deep but not crushed
//! blacks, a soft highlight rolloff, and a slight cool/green cast in
//! shadows versus a slightly warm neutral in highlights.
//!
//! IMPORTANT: this has not yet been visually validated against a real Fuji
//! Classic Chrome JPEG (Spike C exit criteria) — no reference photo has
//! been supplied. The control points below are a best-effort starting point
//! from public descriptions of the simulation, not measured from a real
//! camera output. Treat as provisional pending that comparison.

use crate::curves::ToneCurve;
use crate::recipe::{
    AcrosFilter, ColorChromeStrength, DynamicRange, FilmSimulation, GrainSettings, Recipe,
    ToneSetting, WhiteBalance,
};

/// The Classic Chrome recipe: DR400 for the flatter, wider-latitude base
/// this look is typically shot with, pulled highlights, lifted-but-controlled
/// shadows, reduced color and a touch of Color Chrome Effect for the deeper
/// saturated-color separation the look is known for.
pub fn classic_chrome_recipe() -> Recipe {
    Recipe {
        film_simulation: FilmSimulation::ClassicChrome,
        acros_filter: AcrosFilter::None,
        dynamic_range: DynamicRange::Dr400,
        tone: ToneSetting { highlight: -2, shadow: -1 },
        color: -2,
        sharpness: -1,
        noise_reduction: -2,
        grain: GrainSettings::default(), // grain deferred, see plan risk #2
        color_chrome_effect: ColorChromeStrength::Weak,
        color_chrome_fx_blue: ColorChromeStrength::Off,
        white_balance: WhiteBalance::default(),
        exposure_compensation: 0.0,
    }
}

/// Characteristic S-curve: flatter shadows and highlights than a linear
/// response (the "faded film" look), slightly steeper midtones for
/// documentary-style punch.
pub fn tone_curve() -> ToneCurve {
    ToneCurve::new(vec![
        (0.0, 0.02),
        (0.18, 0.16),
        (0.5, 0.5),
        (0.82, 0.86),
        (1.0, 0.97),
    ])
}

/// Small additive split-tone: shadows shifted slightly toward cyan/green,
/// highlights shifted slightly warm, weighted by luma so midtones are
/// mostly untouched.
pub fn apply_split_tone(rgb: [f32; 3]) -> [f32; 3] {
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    let shadow_weight = (1.0 - luma).powf(2.0) * 0.04;
    let highlight_weight = luma.powf(2.0) * 0.03;

    [
        (rgb[0] - shadow_weight * 0.5 + highlight_weight).clamp(0.0, 1.0),
        (rgb[1] + shadow_weight * 0.3 + highlight_weight * 0.5).clamp(0.0, 1.0),
        (rgb[2] + shadow_weight * 0.6 - highlight_weight * 0.5).clamp(0.0, 1.0),
    ]
}
