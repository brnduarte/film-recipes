// WebGL2 preview renderer: uploads a decoded image once, then does cheap
// GPU-only redraws on every slider/recipe change (no re-decode). Per the
// plan, live preview is "WebGL2 shaders on a downsampled proxy texture,
// identical on both [web and desktop]" — so this class lives here in
// gl-pipeline rather than in processing-web, and Tauri desktop (which also
// renders its UI in a webview) can reuse it unchanged in Phase 3.

import vertSrc from "./shaders/preview.vert.glsl?raw";
import debugFragSrc from "./shaders/debug.frag.glsl?raw";
import recipeFragSrc from "./shaders/recipe.frag.glsl?raw";
import { computeUniformsForRecipe } from "./recipe-uniforms";
import type { Recipe } from "@fuji-recipes/core-types";

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vertSource: string, fragSource: string): WebGLProgram {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSource);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSource);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

export class GlPreview {
  private gl: WebGL2RenderingContext;
  private debugProgram: WebGLProgram;
  private recipeProgram: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.debugProgram = link(gl, vertSrc, debugFragSrc);
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
   * Cheap, GPU-only redraw — this is what runs on every slider/recipe/mode
   * change. `showOriginal` renders the untouched decode (the "before" side
   * of the before/after toggle); otherwise `recipe` + `manualExposureStops`
   * (from ManualAdjustments.exposure) are applied via the generalized
   * recipe shader.
   */
  draw(showOriginal: boolean, recipe: Recipe, manualExposureStops: number) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (showOriginal) {
      const program = this.debugProgram;
      gl.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_exposure"), 0);
    } else {
      const u = computeUniformsForRecipe(recipe, manualExposureStops);
      const program = this.recipeProgram;
      gl.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
      gl.uniform3fv(gl.getUniformLocation(program, "u_wbGain"), u.wbGain);
      gl.uniform1f(gl.getUniformLocation(program, "u_exposureStops"), u.exposureStops);
      gl.uniform1f(gl.getUniformLocation(program, "u_shadowLift"), u.shadowLift);
      gl.uniform1f(gl.getUniformLocation(program, "u_highlightPull"), u.highlightPull);
      gl.uniform1i(gl.getUniformLocation(program, "u_useClassicChromeCurve"), u.useClassicChromeCurve ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_saturationGain"), u.saturationGain);
      gl.uniform1f(gl.getUniformLocation(program, "u_colorChromeAmount"), u.colorChromeAmount);
      gl.uniform1f(gl.getUniformLocation(program, "u_colorChromeFxBlueAmount"), u.colorChromeFxBlueAmount);
      gl.uniform1i(gl.getUniformLocation(program, "u_useSepiaTone"), u.useSepiaTone ? 1 : 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
