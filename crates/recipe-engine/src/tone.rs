//! Dynamic range (shadow lift / highlight rolloff) + per-film characteristic
//! tone curve, combined into one stage since both operate on luma before
//! saturation/color-chrome.

use crate::curves::ToneCurve;
use crate::recipe::{DynamicRange, FilmSimulation, Recipe, ToneSetting};

fn dynamic_range_curve(dr: DynamicRange, tone: ToneSetting) -> ToneCurve {
    // DR400/DR200 lift shadows and extend highlight rolloff versus DR100.
    // `tone.highlight`/`tone.shadow` (-2..+4) fine-tune on top, matching the
    // the in-camera Highlight/Shadow menu.
    let dr_shadow_lift = match dr {
        DynamicRange::Dr100 => 0.0,
        DynamicRange::Dr200 => 0.03,
        DynamicRange::Dr400 => 0.06,
    };
    let dr_highlight_pull = match dr {
        DynamicRange::Dr100 => 0.0,
        DynamicRange::Dr200 => 0.05,
        DynamicRange::Dr400 => 0.10,
    };

    let shadow_lift: f32 = dr_shadow_lift + (tone.shadow.max(0) as f32) * 0.015
        - (tone.shadow.min(0) as f32).abs() * 0.01;
    let highlight_pull: f32 = dr_highlight_pull + (tone.highlight.max(0) as f32) * 0.02
        - (tone.highlight.min(0) as f32).abs() * 0.015;

    ToneCurve::new(vec![
        (0.0, shadow_lift.max(0.0)),
        (0.25, 0.25 + shadow_lift * 0.5),
        (0.75, 0.75 - highlight_pull * 0.5),
        (1.0, (1.0 - highlight_pull).min(1.0)),
    ])
}

/// Per-film characteristic curve, applied after the dynamic-range curve.
/// Only Classic Chrome is implemented for Spike C; other simulations fall
/// back to identity until their own recipe pass (tracked by the plan's
/// 11-recipe rollout in Phase 2).
fn film_characteristic_curve(sim: FilmSimulation) -> ToneCurve {
    match sim {
        FilmSimulation::ClassicChrome => crate::classic_chrome::tone_curve(),
        _ => ToneCurve::identity(),
    }
}

pub fn apply_tone(rgb: [f32; 3], recipe: &Recipe) -> [f32; 3] {
    let dr_curve = dynamic_range_curve(recipe.dynamic_range, recipe.tone);
    let film_curve = film_characteristic_curve(recipe.film_simulation);

    let mut out = [0.0; 3];
    for i in 0..3 {
        out[i] = film_curve.apply(dr_curve.apply(rgb[i]));
    }

    // Classic Chrome's documented look includes a subtle split-tone: cool
    // (slightly cyan/green) shadows, warm-neutral highlights. Applied as a
    // small additive shift weighted by luma, after the main curve.
    if recipe.film_simulation == FilmSimulation::ClassicChrome {
        out = crate::classic_chrome::apply_split_tone(out);
    }

    out
}
