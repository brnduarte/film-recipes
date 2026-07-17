import { create } from "zustand";
import type { ColorGrade, ManualAdjustments, Recipe } from "@film-recipes/core-types";

export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** Identity color grade — disabled, matching ColorGrade::default(). */
export const NEUTRAL_COLOR_GRADE: ColorGrade = {
  enabled: false,
  harmony: "Complementary",
  intensity: 0.5,
  stops: [],
};

/** Identity manual grade — a no-op, matching ManualAdjustments::default(). */
export const NEUTRAL_MANUAL: ManualAdjustments = {
  exposure: 0,
  white_balance: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  black_level: 0,
  white_level: 1,
  color_grade: { ...NEUTRAL_COLOR_GRADE },
};

interface EditorState {
  status: string;
  decoded: DecodedImage | null;
  /** Named community recipes, positionally paired with recipes-catalog's NAMED_RECIPES — see getNamedRecipes(). */
  namedRecipes: Recipe[];
  /** Stable catalog id of the selected recipe (a NAMED_RECIPES entry). */
  selectedRecipeId: string;
  /** Global manual grade applied on top of the selected recipe. */
  manual: ManualAdjustments;
  /** Before/after divider position in [0,1]: pixels left of it show the
   *  untouched original, pixels right of it show the recipe. 0.5 = centered. */
  splitX: number;
  /** Per-recipe preview thumbnails (PNG data URLs), keyed by catalog id.
   *  Regenerated from the current photo each time one is decoded. */
  recipeThumbnails: Record<string, string>;

  setStatus: (status: string) => void;
  setNamedRecipes: (recipes: Recipe[]) => void;
  setDecoded: (decoded: DecodedImage | null) => void;
  setSelectedRecipeId: (id: string) => void;
  setManual: (patch: Partial<ManualAdjustments>) => void;
  setColorGrade: (patch: Partial<ColorGrade>) => void;
  resetManual: () => void;
  setSplitX: (splitX: number) => void;
  setRecipeThumbnails: (thumbnails: Record<string, string>) => void;
  /** Reset all per-session editor state to defaults. Called when a new session
   *  begins (sign-in) so one user never sees the previous user's photo,
   *  recipe, or adjustments — the store is a module singleton that outlives
   *  sign-out, so it must be explicitly cleared. Preserves loaded-once data
   *  (namedRecipes) and the WASM status. */
  resetSession: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  status: "Loading WASM module…",
  decoded: null,
  namedRecipes: [],
  selectedRecipeId: "kodak-portra-400",
  manual: { ...NEUTRAL_MANUAL },
  splitX: 0.5,
  recipeThumbnails: {},

  setStatus: (status) => set({ status }),
  setNamedRecipes: (namedRecipes) => set({ namedRecipes }),
  setDecoded: (decoded) => set({ decoded }),
  setSelectedRecipeId: (selectedRecipeId) => set({ selectedRecipeId }),
  setManual: (patch) => set((s) => ({ manual: { ...s.manual, ...patch } })),
  setColorGrade: (patch) =>
    set((s) => ({ manual: { ...s.manual, color_grade: { ...s.manual.color_grade, ...patch } } })),
  resetManual: () => set({ manual: { ...NEUTRAL_MANUAL, color_grade: { ...NEUTRAL_COLOR_GRADE } } }),
  setSplitX: (splitX) => set({ splitX }),
  setRecipeThumbnails: (recipeThumbnails) => set({ recipeThumbnails }),
  resetSession: () =>
    set({
      decoded: null,
      selectedRecipeId: "kodak-portra-400",
      manual: { ...NEUTRAL_MANUAL, color_grade: { ...NEUTRAL_COLOR_GRADE } },
      splitX: 0.5,
      recipeThumbnails: {},
    }),
}));
