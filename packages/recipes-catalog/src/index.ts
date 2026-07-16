import type { FilmSimulation } from "@fuji-recipes/core-types";

// Display-only metadata for the recipe selector UI, addressed by a stable
// string `id`. Deliberately does NOT duplicate any numeric Recipe field
// (tone/color/DR/etc.) — those live only in Rust
// (crates/recipe-engine/src/{classic_chrome,velvia,astia,classic_neg,
// pro_neg,eterna,acros,monochrome,named_recipes}.rs,
// Recipe::provia_baseline()) to avoid a second source of truth that could
// drift. The actual Recipe values reach the UI at runtime through the
// wasm-bridge/native processing backend, not through this catalog.
//
// Built-in film simulations are paired to their `Recipe` by
// `filmSimulation`; the named community recipes (which can share a base
// `film_simulation`) are paired positionally with the Rust
// `named_recipes_json` order instead — see the UI's recipe resolver.
export interface RecipeCatalogEntry {
  id: string;
  name: string;
  description: string;
}

export interface BuiltInRecipeCatalogEntry extends RecipeCatalogEntry {
  filmSimulation: FilmSimulation;
}

// All 12 built-in film simulations (Phase 1's original 4 plus Phase 2's
// remaining 8). `id` is the film simulation name so the DOM id scheme
// (`recipe-${id.toLowerCase()}`, relied on by e2e tests) stays stable.
export const BUILT_IN_RECIPES: BuiltInRecipeCatalogEntry[] = [
  {
    id: "Provia",
    filmSimulation: "Provia",
    name: "Provia",
    description: "Fuji's standard, neutral color simulation — a balanced baseline for everyday shooting.",
  },
  {
    id: "Velvia",
    filmSimulation: "Velvia",
    name: "Velvia",
    description: "Vivid and high-contrast, modeled on Velvia slide film — punchy color and deep blacks.",
  },
  {
    id: "Astia",
    filmSimulation: "Astia",
    name: "Astia",
    description: "Fuji's portrait-oriented simulation — soft, faithful skin tones with gentle contrast.",
  },
  {
    id: "ClassicChrome",
    filmSimulation: "ClassicChrome",
    name: "Classic Chrome",
    description: "A muted, documentary look with subdued saturation and a soft highlight rolloff.",
  },
  {
    id: "ClassicNeg",
    filmSimulation: "ClassicNeg",
    name: "Classic Negative",
    description: "Modeled on color negative film for street shooting — deeper contrast, muted color.",
  },
  {
    id: "ProNegHi",
    filmSimulation: "ProNegHi",
    name: "Pro Neg Hi",
    description: "Professional portrait negative film look, studio contrast, natural skin-tone gradation.",
  },
  {
    id: "ProNegStd",
    filmSimulation: "ProNegStd",
    name: "Pro Neg Std",
    description: "Flatter, wide-latitude variant of Pro Neg for soft, natural skin tones.",
  },
  {
    id: "Eterna",
    filmSimulation: "Eterna",
    name: "Eterna",
    description: "Cinema-film-inspired, very low contrast and subdued color for a flat, grading-ready base.",
  },
  {
    id: "EternaBleachBypass",
    filmSimulation: "EternaBleachBypass",
    name: "Eterna Bleach Bypass",
    description: "Emulates the bleach bypass lab process — high contrast with heavy, partial desaturation.",
  },
  {
    id: "Acros",
    filmSimulation: "Acros",
    name: "ACROS",
    description: "A high-sharpness monochrome simulation with deep, smooth blacks.",
  },
  {
    id: "Monochrome",
    filmSimulation: "Monochrome",
    name: "Monochrome",
    description: "Fuji's plain neutral black & white mode.",
  },
  {
    id: "Sepia",
    filmSimulation: "Sepia",
    name: "Sepia",
    description: "Neutral black & white with a warm, brown-toned cast.",
  },
];

// Named community recipes, in the SAME order as Rust's `named_recipes_json`
// (crates/wasm-bridge) so they pair positionally with the `Recipe[]` the
// backend returns. Their looks come largely from white-balance shifts on top
// of a base film simulation — see crates/recipe-engine/src/named_recipes.rs.
export const NAMED_RECIPES: RecipeCatalogEntry[] = [
  {
    id: "kodak-portra-400",
    name: "Kodak Portra 400",
    description: "Soft pastel portrait-negative look — warm WB, gentle contrast, Strong Color Chrome.",
  },
  {
    id: "kodak-gold-200",
    name: "Kodak Gold 200",
    description: "Warm, golden consumer-film look with punchy color and a wide dynamic range.",
  },
  {
    id: "kodak-portra-800",
    name: "Kodak Portra 800",
    description: "Moodier, cooler high-speed variant of Portra — deep tone, Strong Color Chrome.",
  },
  {
    id: "bright-kodak",
    name: "Bright Kodak",
    description: "Bright, contrasty and saturated — heavy blue pull and the deepest tone.",
  },
  {
    id: "grainy-day",
    name: "Grainy Day",
    description: "Muted, moody Classic Negative street look with a warm cast and lifted highlights.",
  },
  {
    id: "wes-anderson",
    name: "Wes Anderson",
    description: "Pastel, storybook palette — cool Kelvin with a strong warm shift for symmetry-core scenes.",
  },
];
