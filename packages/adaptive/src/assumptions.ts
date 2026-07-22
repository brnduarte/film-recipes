// What a recipe "assumes" about its input, so adaptation respects the look's
// intent instead of flattening it. Derived mostly from the Recipe's own fields
// (single source of truth — the numeric values live in Rust) plus a tiny
// override set for scene-intent flags that can't be read off the numbers.

import type { FilmSimulation, Recipe } from "@film-recipes/core-types";
import type { RecipeAssumptions } from "./types.ts";

const MONOCHROME_SIMS: FilmSimulation[] = ["Acros", "Monochrome", "Sepia"];

/** Recipes deliberately built around a tungsten / neon / night ambience: their
 *  warm-or-cool cast is the point, so we must not neutralize it. Keyed by
 *  catalog id (see packages/recipes-catalog). */
const LOW_LIGHT_RECIPES = new Set<string>(["cinestill-800t", "fluorescent-night"]);

export function isMonochrome(sim: FilmSimulation): boolean {
  return MONOCHROME_SIMS.includes(sim);
}

export function deriveAssumptions(recipe: Recipe, recipeId: string): RecipeAssumptions {
  return {
    monochrome: isMonochrome(recipe.film_simulation),
    // +3/+4 color is already very saturated (Velvia, vivid recipes).
    alreadySaturated: recipe.color >= 3,
    // Deepened shadows or pushed highlights => the look is already contrasty.
    alreadyContrasty: recipe.tone.shadow <= -2 || recipe.tone.highlight >= 2,
    assumesLowLight: LOW_LIGHT_RECIPES.has(recipeId),
  };
}
