//! Canonical `Recipe` / `EditInstructionSet` / `Preset` data model.
//!
//! Defined once here in Rust (source of truth); mirrored by hand in
//! `packages/core-types/src/index.ts` (TS), kept in sync via the
//! round-trip schema-parity test in
//! `packages/core-types/test/schema-parity.mjs`. See docs/recipe-schema.md.

use serde::{Deserialize, Serialize};

/// Film simulation modes relevant to recipe building.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilmSimulation {
    Provia,
    Velvia,
    Astia,
    ClassicChrome,
    ClassicNeg,
    ProNegHi,
    ProNegStd,
    Eterna,
    EternaBleachBypass,
    NostalgicNeg,
    RealaAce,
    Acros,
    Monochrome,
    Sepia,
}

/// ACROS/Monochrome yellow/red/green filter emulation. `None` when the
/// active `film_simulation` is not ACROS or Monochrome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AcrosFilter {
    None,
    Yellow,
    Red,
    Green,
}

/// DR (dynamic range) setting: widens tonal range by underexposing the
/// base capture and lifting shadows in-camera. Represented here as the
/// nominal percentage, applied as a highlight-rolloff/shadow-lift strength.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DynamicRange {
    Dr100,
    Dr200,
    Dr400,
}

/// -2..+4 in the camera's own step scale (Soft..Hard), stored as a signed strength.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ToneSetting {
    pub highlight: i8, // -2..+4
    pub shadow: i8,    // -2..+4
}

impl Default for ToneSetting {
    fn default() -> Self {
        Self { highlight: 0, shadow: 0 }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ColorChromeStrength {
    Off,
    Weak,
    Strong,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct GrainSettings {
    pub strength: ColorChromeStrength, // Off/Weak/Strong reused: the camera uses same 3-step scale
    pub size: GrainSize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GrainSize {
    Fine,
    Large,
}

impl Default for GrainSettings {
    fn default() -> Self {
        Self { strength: ColorChromeStrength::Off, size: GrainSize::Fine }
    }
}

// Preset modes (Daylight, Shade, Fluorescent, etc.) collapse to an
// equivalent Kelvin+shift pair at recipe-authoring time, so downstream code
// only ever deals with `Kelvin`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WhiteBalanceMode {
    Auto,
    Kelvin,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct WhiteBalance {
    pub mode: WhiteBalanceMode,
    pub kelvin: u32, // 2500..10000
    pub red_shift: i8, // -9..+9, camera WB shift scale
    pub blue_shift: i8, // -9..+9
}

impl Default for WhiteBalance {
    fn default() -> Self {
        Self { mode: WhiteBalanceMode::Kelvin, kelvin: 5500, red_shift: 0, blue_shift: 0 }
    }
}

/// All real recipe parameters — the "what film simulation this is"
/// definition, independent of any particular photo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Recipe {
    pub film_simulation: FilmSimulation,
    pub acros_filter: AcrosFilter,
    pub dynamic_range: DynamicRange,
    pub tone: ToneSetting,
    pub color: i8,     // -4..+4, saturation
    pub sharpness: i8, // -4..+4
    pub noise_reduction: i8, // -4..+4
    pub grain: GrainSettings,
    pub color_chrome_effect: ColorChromeStrength,
    pub color_chrome_fx_blue: ColorChromeStrength,
    pub white_balance: WhiteBalance,
    pub exposure_compensation: f32, // stops, -2.0..+2.0
}

impl Recipe {
    /// Neutral Provia baseline — every other recipe starts from this and
    /// overrides fields, matching how a shooter builds a recipe.
    pub fn provia_baseline() -> Self {
        Self {
            film_simulation: FilmSimulation::Provia,
            acros_filter: AcrosFilter::None,
            dynamic_range: DynamicRange::Dr100,
            tone: ToneSetting::default(),
            color: 0,
            sharpness: 0,
            noise_reduction: 0,
            grain: GrainSettings::default(),
            color_chrome_effect: ColorChromeStrength::Off,
            color_chrome_fx_blue: ColorChromeStrength::Off,
            white_balance: WhiteBalance::default(),
            exposure_compensation: 0.0,
        }
    }
}

/// Non-destructive, **session-only** edit state for one open photo. Never
/// persisted or written to storage — `source_image_id` is only ever a
/// runtime map key (`sourceImageId -> ArrayBuffer/ImageBitmap`), never a
/// file path or storage reference.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EditInstructionSet {
    pub source_image_id: String,
    pub base_recipe: Recipe,
    pub overrides: RecipeOverrides,
    pub manual_adjustments: ManualAdjustments,
    pub crop: Option<Crop>,
}

/// Sparse per-field overrides on top of `base_recipe`. All `None` means
/// "use the recipe as authored."
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RecipeOverrides {
    pub color: Option<i8>,
    pub sharpness: Option<i8>,
    pub noise_reduction: Option<i8>,
    pub tone: Option<ToneSetting>,
}

/// Color-harmony families the color wheel offers as starting layouts. Each
/// spreads a set of hue handles around the wheel at fixed relative angles;
/// the handles then become luminance-ordered grade stops (shadows→highlights).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ColorHarmony {
    Monochromatic,
    Analogous,
    Complementary,
    SplitComplementary,
    Triad,
    Square,
}

impl Default for ColorHarmony {
    fn default() -> Self {
        ColorHarmony::Complementary
    }
}

/// One color-wheel handle: an HSV color. `hue` is the wheel angle, `saturation`
/// the radial distance from center, `value` the handle brightness. Converted to
/// an RGB tint at grade time (see `pipeline::apply_color_grade`).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ColorGradeStop {
    pub hue: f32,        // 0..360 degrees (wheel angle)
    pub saturation: f32, // 0..1 (wheel radius)
    pub value: f32,      // 0..1 (handle brightness)
}

impl Default for ColorGradeStop {
    fn default() -> Self {
        Self { hue: 0.0, saturation: 0.0, value: 0.5 }
    }
}

/// Luminance color-map grade: the handles in `stops` are ordered from shadows
/// to highlights and spread evenly across the tonal range, then the image is
/// tinted toward the interpolated stop color by each pixel's luma. Disabled by
/// default (empty look), so `ManualAdjustments::default()` stays a no-op.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ColorGrade {
    pub enabled: bool,
    pub harmony: ColorHarmony,
    pub intensity: f32, // 0..1 overall tint strength
    pub stops: Vec<ColorGradeStop>, // shadows→highlights, spread across luma
}

impl Default for ColorGrade {
    fn default() -> Self {
        Self {
            enabled: false,
            harmony: ColorHarmony::default(),
            intensity: 0.5,
            stops: Vec::new(),
        }
    }
}

/// Global, non-destructive manual adjustments applied *after* the recipe's
/// baked-in look — the user-facing edit sliders. Every field defaults to a
/// no-op identity (see `Default`), so `ManualAdjustments::default()` leaves a
/// recipe untouched. Applied per-pixel by `pipeline::apply_manual_grade` and
/// mirrored in the GLSL preview (recipe.frag.glsl / recipe-uniforms.ts).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ManualAdjustments {
    pub exposure: f32,      // stops, combines additively with recipe exposure comp
    pub white_balance: f32, // -1..+1, cool..warm temperature shift
    pub contrast: f32,      // -1..+1, S-slope around a 0.5 pivot
    pub highlights: f32,    // -1..+1, recover(-)/boost(+) upper tones
    pub shadows: f32,       // -1..+1, crush(-)/lift(+) lower tones
    pub saturation: f32,    // -1..+1, luma-pivot saturation
    pub black_level: f32,   // 0..+1, levels black point (default 0.0)
    pub white_level: f32,   // 0..+1, levels white point (default 1.0)
    #[serde(default)]
    pub color_grade: ColorGrade, // luminance color-map tint (default: disabled)
}

impl Default for ManualAdjustments {
    fn default() -> Self {
        Self {
            exposure: 0.0,
            white_balance: 0.0,
            contrast: 0.0,
            highlights: 0.0,
            shadows: 0.0,
            saturation: 0.0,
            black_level: 0.0,
            white_level: 1.0,
            color_grade: ColorGrade::default(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Crop {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation_degrees: f32,
}

/// The only thing actually saved to IndexedDB. No crop, no image reference —
/// presets describe a *look*, not an edit of a specific photo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub favorite: bool,
    pub order: u32,
    pub recipe: Recipe,
    pub manual_adjustments: ManualAdjustments,
    pub created_at: String, // RFC3339
    pub updated_at: String, // RFC3339
    pub schema_version: u32,
}

pub const CURRENT_PRESET_SCHEMA_VERSION: u32 = 1;

/// JSON export/import envelope for presets, per plan section 3.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetExport {
    pub schema_version: u32,
    pub exported_at: String, // RFC3339
    pub presets: Vec<Preset>,
}
