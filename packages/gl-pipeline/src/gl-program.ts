// Shared WebGL2 helpers used by both the live preview (`GlPreview`) and the
// offscreen recipe-thumbnail renderer (`RecipeThumbnailRenderer`), so the
// recipe shader program and its uniform wiring live in exactly one place and
// can't drift between the big preview and the little swatches.

import type { RecipeUniforms } from "./recipe-uniforms";

export function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
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

export function link(gl: WebGL2RenderingContext, vertSource: string, fragSource: string): WebGLProgram {
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

/**
 * Push a computed recipe's uniforms into the recipe shader program.
 * `splitX` is the before/after divider position in [0,1]; 0 (the default)
 * renders the recipe everywhere — used for thumbnails and export.
 */
export function setRecipeUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  u: RecipeUniforms,
  splitX = 0,
) {
  gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
  gl.uniform1f(gl.getUniformLocation(program, "u_splitX"), splitX);
  gl.uniform3fv(gl.getUniformLocation(program, "u_wbGain"), u.wbGain);
  gl.uniform1f(gl.getUniformLocation(program, "u_exposureStops"), u.exposureStops);
  gl.uniform1f(gl.getUniformLocation(program, "u_shadowLift"), u.shadowLift);
  gl.uniform1f(gl.getUniformLocation(program, "u_highlightPull"), u.highlightPull);
  gl.uniform1i(gl.getUniformLocation(program, "u_useClassicChromeCurve"), u.useClassicChromeCurve ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, "u_saturationGain"), u.saturationGain);
  gl.uniform1f(gl.getUniformLocation(program, "u_colorChromeAmount"), u.colorChromeAmount);
  gl.uniform1f(gl.getUniformLocation(program, "u_colorChromeFxBlueAmount"), u.colorChromeFxBlueAmount);
  gl.uniform1i(gl.getUniformLocation(program, "u_useSepiaTone"), u.useSepiaTone ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualWhiteBalance"), u.manualWhiteBalance);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualContrast"), u.manualContrast);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualHighlights"), u.manualHighlights);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualShadows"), u.manualShadows);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualSaturation"), u.manualSaturation);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualBlackLevel"), u.manualBlackLevel);
  gl.uniform1f(gl.getUniformLocation(program, "u_manualWhiteLevel"), u.manualWhiteLevel);

  // Color grade (luminance color-map). Stops are precomputed to linear RGB.
  gl.uniform1i(gl.getUniformLocation(program, "u_colorGradeEnabled"), u.colorGradeEnabled ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, "u_colorGradeIntensity"), u.colorGradeIntensity);
  gl.uniform1i(gl.getUniformLocation(program, "u_colorGradeStopCount"), u.colorGradeStopCount);
  gl.uniform3fv(gl.getUniformLocation(program, "u_colorGradeColors"), u.colorGradeColors);

  // Overlay (Photoshop-style blend-mode composite).
  gl.uniform1i(gl.getUniformLocation(program, "u_overlayEnabled"), u.overlayEnabled ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(program, "u_overlayMode"), u.overlayMode);
  gl.uniform1f(gl.getUniformLocation(program, "u_overlayOpacity"), u.overlayOpacity);
}
