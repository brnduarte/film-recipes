import { create } from "zustand";
import type { ManualAdjustments, Recipe } from "@fuji-recipes/core-types";

export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

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
  /** True while the before/after toggle is showing the untouched decode. */
  showOriginal: boolean;

  setStatus: (status: string) => void;
  setNamedRecipes: (recipes: Recipe[]) => void;
  setDecoded: (decoded: DecodedImage | null) => void;
  setSelectedRecipeId: (id: string) => void;
  setManual: (patch: Partial<ManualAdjustments>) => void;
  resetManual: () => void;
  setShowOriginal: (show: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  status: "Loading WASM module…",
  decoded: null,
  namedRecipes: [],
  selectedRecipeId: "kodak-portra-400",
  manual: { ...NEUTRAL_MANUAL },
  showOriginal: false,

  setStatus: (status) => set({ status }),
  setNamedRecipes: (namedRecipes) => set({ namedRecipes }),
  setDecoded: (decoded) => set({ decoded }),
  setSelectedRecipeId: (selectedRecipeId) => set({ selectedRecipeId }),
  setManual: (patch) => set((s) => ({ manual: { ...s.manual, ...patch } })),
  resetManual: () => set({ manual: { ...NEUTRAL_MANUAL } }),
  setShowOriginal: (showOriginal) => set({ showOriginal }),
}));
