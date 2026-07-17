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
// recipe resolver. The base film simulations remain internal pipeline
// building blocks (crates/recipe-engine) but are no longer offered as
// standalone selectable recipes.
export interface RecipeCatalogEntry {
  id: string;
  name: string;
  description: string;
}

// Named community recipes, in the SAME order as Rust's `named_recipes_json`
// (crates/wasm-bridge) so they pair positionally with the `Recipe[]` the
// backend returns. Values sourced from community film-simulation recipes.
export const NAMED_RECIPES: RecipeCatalogEntry[] = [
  // ── Kodak film stocks ──────────────────────────────────────────────
  {
    id: "kodak-portra-160",
    name: "Kodak Portra 160",
    description: "Soft, clean portrait film with muted color and gentle tones.",
  },
  {
    id: "kodak-portra-400",
    name: "Kodak Portra 400",
    description: "Soft pastel portrait-negative look — warm WB, gentle contrast, Strong Color Chrome.",
  },
  {
    id: "kodak-portra-800",
    name: "Kodak Portra 800",
    description: "Moodier, cooler high-speed Portra — deep tone, Strong Color Chrome, large grain.",
  },
  {
    id: "kodak-gold-200",
    name: "Kodak Gold 200",
    description: "Warm, golden consumer-film look with punchy color and wide dynamic range.",
  },
  {
    id: "kodak-ultramax-400",
    name: "Kodak Ultramax 400",
    description: "Contrasty consumer film with bold large grain and saturated color.",
  },
  {
    id: "kodachrome-64",
    name: "Kodachrome 64",
    description: "Iconic warm saturated slide film with golden cast and fine grain.",
  },
  {
    id: "kodachrome-25",
    name: "Kodachrome 25",
    description: "Ultra-sharp, finest-grain slide film — the cleanest of the Kodachrome family.",
  },
  {
    id: "kodak-vision3-250d",
    name: "Kodak Vision3 250D",
    description: "Cinematic motion-picture daylight stock with faded highlights and lifted shadows.",
  },
  {
    id: "kodak-gold-max-expired",
    name: "Kodak Gold Max Expired",
    description: "Warm expired consumer-film aesthetic with strong grain and nostalgic color shift.",
  },

  // ── Additional film stocks ─────────────────────────────────────────
  {
    id: "superia-xtra-400",
    name: "Superia Xtra 400",
    description: "Warm everyday consumer film with punchy saturated color.",
  },
  {
    id: "natura-1600",
    name: "Natura 1600",
    description: "High-ISO Japanese film — muted, desaturated, heavy grain, soft and dreamy.",
  },
  {
    id: "reala-ace",
    name: "Reala Ace",
    description: "Soft yet colorful analog-like aesthetic with strong Color Chrome.",
  },
  {
    id: "easy-reala-ace",
    name: "Easy Reala Ace",
    description: "Gentle, true-to-life with neutral, natural color reproduction.",
  },
  {
    id: "color-negative",
    name: "Color Negative",
    description: "Clean warm daylight film with gentle tones and natural color.",
  },
  {
    id: "industrial-100",
    name: "Industrial 100",
    description: "Very warm industrial look with strong red/blue shift and lifted shadows.",
  },
  {
    id: "pro-negative-160c",
    name: "PRO Negative 160C",
    description: "Versatile everyday recipe emulating a discontinued warm 160-speed film stock.",
  },
  {
    id: "provia-positive",
    name: "Provia Positive",
    description: "Vivid slide-film character with Strong Color Chrome and punchy color.",
  },
  {
    id: "vivid-velvia",
    name: "Vivid Velvia",
    description: "Highly saturated landscape recipe — maximum punch for nature and scenery.",
  },

  // ── Nostalgic / retro looks ────────────────────────────────────────
  {
    id: "nostalgia-negative",
    name: "Nostalgia Negative",
    description: "Vibrant, dreamlike vintage look — warm Daylight WB, Strong Color Chrome, +4 color.",
  },
  {
    id: "timeless-negative",
    name: "Timeless Negative",
    description: "Faded 1970s aesthetic with desaturated color and strong highlight lift.",
  },
  {
    id: "nostalgic-air",
    name: "Nostalgic Air",
    description: "Dreamy ethereal look with heavy warm shift and soft focus feel.",
  },
  {
    id: "emulsion-86",
    name: "Emulsion '86",
    description: "Warm mid-80s film aesthetic with strong grain, high color, and lifted shadows.",
  },
  {
    id: "seventies-summer",
    name: "1970's Summer",
    description: "Faded 70s vacation-snapshot aesthetic — desaturated, heavy grain, deep blue pull.",
  },
  {
    id: "summer-of-1960",
    name: "Summer of 1960",
    description: "Sun-bleached 60s look with extreme highlight lift, soft focus, and punchy color.",
  },
  {
    id: "california-summer",
    name: "California Summer",
    description: "Sun-drenched coastal warmth with dreamy softness and saturated tones.",
  },
  {
    id: "classic-retro",
    name: "Classic Retro",
    description: "Contrasty, desaturated retro look with extreme highlight lift and cool-warm tension.",
  },
  {
    id: "classic-amber",
    name: "Classic Amber",
    description: "Golden amber cast with Fluorescent WB, lifted shadows and high vintage color.",
  },
  {
    id: "classic-color",
    name: "Classic Color",
    description: "Warm sunny daylight look — Kodak-like color negative rendering.",
  },
  {
    id: "pacific-blues",
    name: "Pacific Blues",
    description: "Deep blue-toned film with lifted shadows, heavy grain, and a moody coastal palette.",
  },
  {
    id: "pushed-analog",
    name: "Pushed Analog",
    description: "Pushed film aesthetic with lifted highlights/shadows and heavy color saturation.",
  },

  // ── Cinema / Eterna looks ──────────────────────────────────────────
  {
    id: "vintage-cinema",
    name: "Vintage Cinema",
    description: "Warm golden-hour cinematic look with high highlight lift and deep shadow.",
  },
  {
    id: "vintage-eterna",
    name: "Vintage Eterna",
    description: "Large grain vintage motion-picture look with lifted highlights and muted tones.",
  },
  {
    id: "eterna-summer",
    name: "Eterna Summer",
    description: "Warm summer movie look with extreme blue pull, Strong Color Chrome.",
  },
  {
    id: "cinestill-800t",
    name: "CineStill 800T",
    description: "Tungsten-balanced night film with fluorescent WB, heavy grain, and neon color.",
  },
  {
    id: "cinestill-400d",
    name: "CineStill 400D",
    description: "Daylight cinema film with cool fluorescent WB and polished, subtle film look.",
  },
  {
    id: "vintage-bronze",
    name: "Vintage Bronze",
    description: "Desaturated alternative-process look with extreme warm red/blue shift.",
  },
  {
    id: "chrome-1960",
    name: "1960 Chrome",
    description: "Vintage magazine Ektachrome look with muted tones and large grain.",
  },
  {
    id: "fluorescent-night",
    name: "Fluorescent Night",
    description: "Urban night photography with cool fluorescent WB and saturated neon tones.",
  },

  // ── Black & White ──────────────────────────────────────────────────
  {
    id: "ilford-fp4",
    name: "Ilford FP4 Plus 125",
    description: "Classic fine-grain B&W with neutral tones and gentle contrast.",
  },
  {
    id: "classic-bw",
    name: "Classic B&W",
    description: "High-contrast street B&W with bold grain, extreme shadow lift, and punchy highlights.",
  },
  {
    id: "kodak-tmax-p3200",
    name: "Kodak T-Max P3200",
    description: "Pushed high-ISO B&W with heavy grain, contrasty lifted shadows, and gritty texture.",
  },
];
