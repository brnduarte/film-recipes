import { create } from "zustand";
import type { Recipe } from "@fuji-recipes/core-types";

export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

interface EditorState {
  status: string;
  decoded: DecodedImage | null;
  /** Built-in film-simulation recipes, read from Rust at startup — see processing-web's getBuiltInRecipes(). */
  recipes: Recipe[];
  /** Named community recipes, positionally paired with recipes-catalog's NAMED_RECIPES — see getNamedRecipes(). */
  namedRecipes: Recipe[];
  /** Stable catalog id of the selected recipe (a BUILT_IN_RECIPES or NAMED_RECIPES entry). */
  selectedRecipeId: string;
  /** Manual exposure override, in stops (ManualAdjustments.exposure). */
  manualExposure: number;
  /** True while the before/after toggle is showing the untouched decode. */
  showOriginal: boolean;

  setStatus: (status: string) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setNamedRecipes: (recipes: Recipe[]) => void;
  setDecoded: (decoded: DecodedImage | null) => void;
  setSelectedRecipeId: (id: string) => void;
  setManualExposure: (exposure: number) => void;
  setShowOriginal: (show: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  status: "Loading WASM module…",
  decoded: null,
  recipes: [],
  namedRecipes: [],
  selectedRecipeId: "Provia",
  manualExposure: 0,
  showOriginal: false,

  setStatus: (status) => set({ status }),
  setRecipes: (recipes) => set({ recipes }),
  setNamedRecipes: (namedRecipes) => set({ namedRecipes }),
  setDecoded: (decoded) => set({ decoded }),
  setSelectedRecipeId: (selectedRecipeId) => set({ selectedRecipeId }),
  setManualExposure: (manualExposure) => set({ manualExposure }),
  setShowOriginal: (showOriginal) => set({ showOriginal }),
}));
