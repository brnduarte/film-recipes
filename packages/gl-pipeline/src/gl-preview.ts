// WebGL2 preview renderer: uploads a decoded image once, then does cheap
// GPU-only redraws on every slider/recipe change (no re-decode). Per the
// plan, live preview is "WebGL2 shaders on a downsampled proxy texture,
// identical on both [web and desktop]" — so this class lives here in
// gl-pipeline rather than in processing-web, and Tauri desktop (which also
// renders its UI in a webview) can reuse it unchanged in Phase 3.

import vertSrc from "./shaders/preview.vert.glsl?raw";
import recipeFragSrc from "./shaders/recipe.frag.glsl?raw";
import { computeUniformsForRecipe } from "./recipe-uniforms";
import { link, setRecipeUniforms } from "./gl-program";
import type { ManualAdjustments, Recipe } from "@film-recipes/core-types";

export class GlPreview {
  private gl: WebGL2RenderingContext;
  private recipeProgram: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.recipeProgram = link(gl, vertSrc, recipeFragSrc);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** Upload decoded RGBA once per image (the expensive, one-time step). */
  uploadImage(rgba: Uint8Array, width: number, height: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  }

  /**
   * Cheap, GPU-only redraw — this is what runs on every slider/recipe/split
   * change. `splitX` is the before/after divider position in [0,1]: pixels
   * left of it show the untouched original, pixels right of it show the full
   * `recipe` + `manual` grade. `splitX = 0` (the default) applies the recipe
   * everywhere; `splitX = 1` shows the original everywhere.
   */
  draw(splitX: number, recipe: Recipe, manual: ManualAdjustments) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const u = computeUniformsForRecipe(recipe, manual);
    const program = this.recipeProgram;
    gl.useProgram(program);
    setRecipeUniforms(gl, program, u, splitX);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
