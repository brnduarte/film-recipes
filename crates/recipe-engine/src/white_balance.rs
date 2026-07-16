//! White balance: Kelvin temperature -> RGB channel gain, plus Fuji's
//! red/blue shift fine-tuning applied on top.

use crate::recipe::WhiteBalance;

/// Kelvin at which `kelvin_to_rgb_gain` returns exactly [1,1,1]. Chosen to
/// match `WhiteBalance::default().kelvin` so an unmodified recipe is a
/// no-op on WB, which downstream code (and tests) rely on.
const REFERENCE_KELVIN: u32 = 5500;

/// Raw blackbody-radiation Kelvin -> RGB, using the widely-used Tanner
/// Helland polynomial fit (same approximation commonly used in GLSL
/// color-temperature shaders, so it round-trips cleanly to the preview
/// shader). Not itself a correction gain — see `kelvin_to_rgb_gain`.
fn raw_kelvin_rgb(kelvin: u32) -> [f32; 3] {
    let temp = (kelvin.clamp(1000, 40000) as f32) / 100.0;

    let red = if temp <= 66.0 {
        255.0
    } else {
        (329.698_73 * (temp - 60.0).powf(-0.133_204_76)).clamp(0.0, 255.0)
    };

    let green = if temp <= 66.0 {
        (99.470_80 * temp.ln() - 161.119_57).clamp(0.0, 255.0)
    } else {
        (288.122_16 * (temp - 60.0).powf(-0.075_514_846)).clamp(0.0, 255.0)
    };

    let blue = if temp >= 66.0 {
        255.0
    } else if temp <= 19.0 {
        0.0
    } else {
        (138.517_73 * (temp - 10.0).ln() - 305.044_8).clamp(0.0, 255.0)
    };

    [red, green, blue]
}

/// Correction gain for a chosen white-balance Kelvin: the multiplier that,
/// applied to a pixel lit by `kelvin` light, cancels its color cast relative
/// to `REFERENCE_KELVIN`. Normalized so `kelvin == REFERENCE_KELVIN` yields
/// exactly [1,1,1].
pub fn kelvin_to_rgb_gain(kelvin: u32) -> [f32; 3] {
    let raw = raw_kelvin_rgb(kelvin);
    let reference = raw_kelvin_rgb(REFERENCE_KELVIN);
    [reference[0] / raw[0], reference[1] / raw[1], reference[2] / raw[2]]
}

/// Apply full white balance (Kelvin gain + Fuji-scale red/blue shift) to a
/// linear RGB pixel.
pub fn apply_white_balance(rgb: [f32; 3], wb: &WhiteBalance) -> [f32; 3] {
    let [gr, gg, gb] = kelvin_to_rgb_gain(wb.kelvin);

    // Fuji's WB shift is a -9..+9 scale; empirically each step is roughly a
    // 2% multiplicative nudge on the respective channel.
    let red_shift = 1.0 + (wb.red_shift as f32) * 0.02;
    let blue_shift = 1.0 + (wb.blue_shift as f32) * 0.02;

    [
        rgb[0] * gr * red_shift,
        rgb[1] * gg,
        rgb[2] * gb * blue_shift,
    ]
}
