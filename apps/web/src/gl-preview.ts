import vertSrc from "./shaders/preview.vert.glsl?raw";
import debugFragSrc from "./shaders/preview.frag.glsl?raw";
import classicChromeFragSrc from "../../../packages/gl-pipeline/src/shaders/classic-chrome.frag.glsl?raw";

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

export type PreviewMode = "debug" | "classic-chrome";

// Fixed uniforms matching classic_chrome_recipe() in
// crates/recipe-engine/src/classic_chrome.rs — kept identical to
// packages/gl-pipeline/src/classic-chrome-reference.mjs's constants.
const CLASSIC_CHROME_UNIFORMS = {
  wbGain: [1, 1, 1] as const,
  exposureStops: 0.0,
  saturationGain: 1.0 + -2 * 0.1,
  colorChromeAmount: 0.35, // Weak
  colorChromeFxBlueAmount: 0.0, // Off
};

export class GlPreview {
  private gl: WebGL2RenderingContext;
  private debugProgram: WebGLProgram;
  private classicChromeProgram: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.debugProgram = link(gl, vertSrc, debugFragSrc);
    this.classicChromeProgram = link(gl, vertSrc, classicChromeFragSrc);

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

  /** Cheap, GPU-only redraw — this is what runs on every slider/mode change. */
  draw(mode: PreviewMode, exposure: number, contrast: number) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (mode === "debug") {
      const program = this.debugProgram;
      gl.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_exposure"), exposure);
      gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), contrast);
    } else {
      const program = this.classicChromeProgram;
      gl.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
      gl.uniform3fv(gl.getUniformLocation(program, "u_wbGain"), CLASSIC_CHROME_UNIFORMS.wbGain);
      // Exposure slider is a manual adjustment (pipeline.rs adds
      // recipe.exposure_compensation + manual.exposure in stops), so it
      // should still move the image in every mode, on top of the recipe's
      // own baseline exposure_compensation (0 for Classic Chrome).
      gl.uniform1f(gl.getUniformLocation(program, "u_exposureStops"), CLASSIC_CHROME_UNIFORMS.exposureStops + exposure);
      gl.uniform1f(gl.getUniformLocation(program, "u_saturationGain"), CLASSIC_CHROME_UNIFORMS.saturationGain);
      gl.uniform1f(gl.getUniformLocation(program, "u_colorChromeAmount"), CLASSIC_CHROME_UNIFORMS.colorChromeAmount);
      gl.uniform1f(
        gl.getUniformLocation(program, "u_colorChromeFxBlueAmount"),
        CLASSIC_CHROME_UNIFORMS.colorChromeFxBlueAmount,
      );
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
