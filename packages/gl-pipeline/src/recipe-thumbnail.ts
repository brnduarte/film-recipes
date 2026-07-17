// Offscreen renderer that bakes a small square preview of the *current photo*
// for each recipe, so the recipe list can show what every look will actually
// do to the user's image (not a generic sample). Reuses the exact same recipe
// shader + uniforms as the live `GlPreview`, on a tiny center-cropped proxy of
// the decoded image, so a thumbnail is a faithful (just downscaled) preview.

import vertSrc from "./shaders/preview.vert.glsl?raw";
import recipeFragSrc from "./shaders/recipe.frag.glsl?raw";
import { computeUniformsForRecipe } from "./recipe-uniforms";
import { link, setRecipeUniforms } from "./gl-program";
import type { ManualAdjustments, Recipe } from "@fuji-recipes/core-types";

export class RecipeThumbnailRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private size: number;

  /** `size` is the square thumbnail edge in device pixels (e.g. 100 for a
   *  crisp 50px @2x swatch). */
  constructor(size = 100) {
    this.size = size;
    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;

    const gl = this.canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.program = link(gl, vertSrc, recipeFragSrc);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, size, size);
  }

  /**
   * Set the source image (full decoded RGBA). Center-crops to a square and
   * downscales to the thumbnail size once, so subsequent `render()` calls are
   * cheap GPU draws. Async because it uses `createImageBitmap` for the
   * high-quality downscale.
   */
  async setImage(rgba: Uint8Array, width: number, height: number): Promise<void> {
    // Copy the decoded bytes into a fresh clamped array for ImageData (one-time
    // per upload; avoids the SharedArrayBuffer typing union on `.buffer`).
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);

    // Center-crop to square, then let the browser downscale to `size`.
    const side = Math.min(width, height);
    const sx = ((width - side) / 2) | 0;
    const sy = ((height - side) / 2) | 0;
    const bitmap = await createImageBitmap(imageData, sx, sy, side, side, {
      resizeWidth: this.size,
      resizeHeight: this.size,
      resizeQuality: "medium",
    });

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // No Y-flip: the bitmap is top-down, exactly like GlPreview's RGBA upload,
    // and the vertex shader already flips UV.y — so orientation matches the
    // big preview.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    bitmap.close();
  }

  /** Render one recipe on the current proxy and return a PNG data URL. */
  render(recipe: Recipe, manual: ManualAdjustments): string {
    const gl = this.gl;
    gl.viewport(0, 0, this.size, this.size);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.useProgram(this.program);
    setRecipeUniforms(gl, this.program, computeUniformsForRecipe(recipe, manual));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.canvas.toDataURL("image/png");
  }

  /** Free GL resources when the renderer is no longer needed. */
  dispose(): void {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
