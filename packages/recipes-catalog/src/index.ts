// Display-only metadata for the recipe selector UI, addressed by a stable
// string `id`. Deliberately does NOT duplicate any numeric Recipe field
// (tone/color/DR/etc.) — those live only in Rust
// (crates/recipe-engine/src/named_recipes.rs) to avoid a second source of
// truth that could drift. The actual Recipe values reach the UI at runtime
// through the wasm-bridge/native processing backend, not through this
// catalog.
//
// The named recipes (which can share a base `film_simulation`) are paired
// positionally with the Rust `named_recipes_json` order — see the UI's
// recipe resolver. The base Fuji film simulations remain internal pipeline
// building blocks (crates/recipe-engine) but are no longer offered as
// standalone selectable recipes.
export interface RecipeCatalogEntry {
  id: string;
  name: string;
  description: string;
}

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
