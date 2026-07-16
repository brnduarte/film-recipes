#version 300 es
// Full-screen triangle, no vertex buffer needed.
out vec2 v_uv;

void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = vec2(pos.x, 1.0 - pos.y);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
