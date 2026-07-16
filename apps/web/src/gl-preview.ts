import vertSrc from "./shaders/preview.vert.glsl?raw";
import fragSrc from "./shaders/preview.frag.glsl?raw";

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

export class GlPreview {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private uExposure: WebGLUniformLocation | null;
  private uContrast: WebGLUniformLocation | null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.uExposure = gl.getUniformLocation(program, "u_exposure");
    this.uContrast = gl.getUniformLocation(program, "u_contrast");
  }

  /** Upload decoded RGBA once per image (the expensive, one-time step). */
  uploadImage(rgba: Uint8Array, width: number, height: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  }

  /** Cheap, GPU-only redraw — this is what runs on every slider input event. */
  draw(exposure: number, contrast: number) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_image"), 0);
    gl.uniform1f(this.uExposure, exposure);
    gl.uniform1f(this.uContrast, contrast);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
