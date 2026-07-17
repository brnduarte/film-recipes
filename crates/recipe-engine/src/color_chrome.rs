//! Color Chrome Effect / Color Chrome FX Blue: a per-pixel saturation
//! compression that deepens color separation in strongly saturated areas
//! (most visible in reds/oranges for CCE, and specifically blues for FX
//! Blue) instead of letting them clip to a flat saturated blob.
//!
//! Modeled here as: convert to a cheap HSV-like saturation/value split,
//! apply a saturation-dependent compression curve (stronger effect the more
//! saturated the pixel already is), convert back. This is a simplification
//! of the actual per-hue tone mapping, sufficient for the Spike C
//! "is it convincing" gate; can be refined once a real reference photo is
//! available for comparison.

use crate::recipe::ColorChromeStrength;

fn strength_factor(strength: ColorChromeStrength) -> f32 {
    match strength {
        ColorChromeStrength::Off => 0.0,
        ColorChromeStrength::Weak => 0.35,
        ColorChromeStrength::Strong => 0.7,
    }
}

fn rgb_to_hsv(rgb: [f32; 3]) -> (f32, f32, f32) {
    let [r, g, b] = rgb;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;

    let hue = if delta < f32::EPSILON {
        0.0
    } else if max == r {
        60.0 * (((g - b) / delta).rem_euclid(6.0))
    } else if max == g {
        60.0 * ((b - r) / delta + 2.0)
    } else {
        60.0 * ((r - g) / delta + 4.0)
    };

    let sat = if max < f32::EPSILON { 0.0 } else { delta / max };
    (hue, sat, max)
}

fn hsv_to_rgb(h: f32, s: f32, v: f32) -> [f32; 3] {
    let c = v * s;
    let h_prime = h / 60.0;
    let x = c * (1.0 - (h_prime.rem_euclid(2.0) - 1.0).abs());
    let (r1, g1, b1) = match h_prime as i32 {
        0 => (c, x, 0.0),
        1 => (x, c, 0.0),
        2 => (0.0, c, x),
        3 => (0.0, x, c),
        4 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let m = v - c;
    [r1 + m, g1 + m, b1 + m]
}

/// Apply Color Chrome Effect: compresses saturation for already-saturated
/// pixels, proportional to how saturated they already are, so mid-saturation
/// areas are mostly untouched but near-clipped saturated colors gain
/// separation instead of flattening out.
pub fn apply_color_chrome_effect(rgb: [f32; 3], strength: ColorChromeStrength) -> [f32; 3] {
    let amount = strength_factor(strength);
    if amount <= 0.0 {
        return rgb;
    }
    let (h, s, v) = rgb_to_hsv(rgb);
    // Compression grows with s^2 so it's negligible below ~mid saturation.
    let compressed = s - amount * s * s * 0.5;
    hsv_to_rgb(h, compressed.clamp(0.0, 1.0), v)
}

/// Apply Color Chrome FX Blue: same idea as CCE but restricted to the blue
/// hue range (~200-260 degrees), matching the blue-sky/water-specific
/// effect.
pub fn apply_color_chrome_fx_blue(rgb: [f32; 3], strength: ColorChromeStrength) -> [f32; 3] {
    let amount = strength_factor(strength);
    if amount <= 0.0 {
        return rgb;
    }
    let (h, s, v) = rgb_to_hsv(rgb);
    if !(200.0..=260.0).contains(&h) {
        return rgb;
    }
    let compressed = s - amount * s * s * 0.6;
    hsv_to_rgb(h, compressed.clamp(0.0, 1.0), v)
}
