#version 300 es
precision highp float;

// Spike B preview shader: minimal stand-in for the recipe pipeline.
// Applies exposure gain + a simple S-curve contrast on GPU only, so slider
// drags never re-touch the WASM decode or CPU — validates the
// "decode once, GPU-only interaction" architecture from the plan.

uniform sampler2D u_image;
uniform float u_exposure; // stops, -2..+2
uniform float u_contrast; // 0..1

in vec2 v_uv;
out vec4 outColor;

vec3 applyContrast(vec3 c, float amount) {
  return mix(c, smoothstep(0.0, 1.0, c), amount);
}

void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 color = src.rgb * pow(2.0, u_exposure);
  color = applyContrast(color, u_contrast);
  outColor = vec4(clamp(color, 0.0, 1.0), src.a);
}
