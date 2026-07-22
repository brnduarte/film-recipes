// TS mirror of crates/recipe-engine/src/recipe.rs — source of truth is Rust.
//
// Field names intentionally match serde's default (snake_case) JSON output
// exactly, since these types describe the wire/storage format (IndexedDB,
// preset JSON export/import), not idiomatic TS naming. Kept in sync via the
// round-trip schema-parity test in test/schema-parity.mjs. See
// docs/recipe-schema.md.

export type FilmSimulation =
  | "Provia"
  | "Velvia"
  | "Astia"
  | "ClassicChrome"
  | "ClassicNeg"
  | "ProNegHi"
  | "ProNegStd"
  | "Eterna"
  | "EternaBleachBypass"
  | "NostalgicNeg"
  | "RealaAce"
  | "Acros"
  | "Monochrome"
  | "Sepia";

export type AcrosFilter = "None" | "Yellow" | "Red" | "Green";

export type DynamicRange = "Dr100" | "Dr200" | "Dr400";

export interface ToneSetting {
  highlight: number; // -2..+4
  shadow: number; // -2..+4
}

export type ColorChromeStrength = "Off" | "Weak" | "Strong";

export type GrainSize = "Fine" | "Large";

export interface GrainSettings {
  strength: ColorChromeStrength;
  size: GrainSize;
}

export type WhiteBalanceMode = "Auto" | "Kelvin";

export interface WhiteBalance {
  mode: WhiteBalanceMode;
  kelvin: number; // 2500..10000
  red_shift: number; // -9..+9
  blue_shift: number; // -9..+9
}

export interface Recipe {
  film_simulation: FilmSimulation;
  acros_filter: AcrosFilter;
  dynamic_range: DynamicRange;
  tone: ToneSetting;
  color: number; // -4..+4
  sharpness: number; // -4..+4
  noise_reduction: number; // -4..+4
  grain: GrainSettings;
  color_chrome_effect: ColorChromeStrength;
  color_chrome_fx_blue: ColorChromeStrength;
  white_balance: WhiteBalance;
  exposure_compensation: number; // stops, -2.0..+2.0
}

export interface RecipeOverrides {
  color?: number | null;
  sharpness?: number | null;
  noise_reduction?: number | null;
  tone?: ToneSetting | null;
}

export type ColorHarmony =
  | "Monochromatic"
  | "Analogous"
  | "Complementary"
  | "SplitComplementary"
  | "Triad"
  | "Square";

/** One color-wheel handle (HSV). hue = wheel angle, saturation = radius. */
export interface ColorGradeStop {
  hue: number; // 0..360 degrees
  saturation: number; // 0..1
  value: number; // 0..1
}

/** Luminance color-map grade — stops spread shadows→highlights across luma. */
export interface ColorGrade {
  enabled: boolean;
  harmony: ColorHarmony;
  intensity: number; // 0..1 overall tint strength
  stops: ColorGradeStop[];
}

/** Blend modes offered for `Overlay.mode` — a curated subset of Photoshop's
 *  full ~27-mode set, restricted to modes that actually do something when
 *  self-blended (see `Overlay`'s doc comment): Lighten/Hue/Saturation/Color/
 *  Luminosity are deliberately excluded because self-blending an identical
 *  layer with any of them is mathematically always a no-op. */
export type OverlayBlendMode =
  | "Multiply"
  | "ColorBurn"
  | "Overlay"
  | "SoftLight"
  | "HardLight"
  | "HardMix"
  | "Difference"
  | "Exclusion";

/** Photoshop-style blend-mode composite: the finished recipe result is
 *  self-blended with `mode`, then mixed back in by `opacity` — the classic
 *  Photoshop "duplicate layer, set to Multiply/Soft Light/etc., dial opacity"
 *  punch trick (opacity 0 is the recipe unchanged, opacity 1 is the full
 *  self-blend). Adds on top of the recipe rather than compositing against
 *  the pre-recipe photo, so it can only enhance the grade, never erase it.
 *  Disabled by default so `ManualAdjustments::default()` stays a no-op. */
export interface Overlay {
  enabled: boolean;
  mode: OverlayBlendMode;
  opacity: number; // 0..1
}

export interface ManualAdjustments {
  exposure: number; // stops, combines additively with recipe exposure comp
  white_balance: number; // -1..+1, cool..warm temperature shift
  contrast: number; // -1..+1, S-slope around a 0.5 pivot
  highlights: number; // -1..+1, recover(-)/boost(+) upper tones
  shadows: number; // -1..+1, crush(-)/lift(+) lower tones
  saturation: number; // -1..+1, luma-pivot saturation
  black_level: number; // 0..+1, levels black point (default 0.0)
  white_level: number; // 0..+1, levels white point (default 1.0)
  color_grade: ColorGrade; // luminance color-map tint (default: disabled)
  overlay: Overlay; // Photoshop-style blend-mode composite (default: disabled)
}

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_degrees: number;
}

/** Non-destructive, session-only edit state. Never persisted. */
export interface EditInstructionSet {
  source_image_id: string;
  base_recipe: Recipe;
  overrides: RecipeOverrides;
  manual_adjustments: ManualAdjustments;
  crop: Crop | null;
}

/** The only thing actually saved to IndexedDB. */
export interface Preset {
  id: string;
  name: string;
  favorite: boolean;
  order: number;
  recipe: Recipe;
  manual_adjustments: ManualAdjustments;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
  schema_version: number;
}

export const CURRENT_PRESET_SCHEMA_VERSION = 1;

export interface PresetExport {
  schema_version: number;
  exported_at: string; // RFC3339
  presets: Preset[];
}
