#version 300 es
precision highp float;

// "Before" side of the before/after toggle: the untouched decode, with no
// recipe or manual adjustments applied at all.

uniform sampler2D u_image;
uniform float u_exposure; // always 0 for the "before" view; kept as a
                           // uniform (not hardcoded) in case a future
                           // "preview exposure on the original" mode wants it.

in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 color = src.rgb * pow(2.0, u_exposure);
  outColor = vec4(clamp(color, 0.0, 1.0), src.a);
}
