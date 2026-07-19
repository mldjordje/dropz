// Single-pass ambient ink drift — cheap alternative to the landing's full
// stable-fluids sim (lib/fluid). No framebuffers, no advection: one fbm noise
// field sampled twice and tinted with the brand ramp. Meant for route pages
// where the background should read as "alive" without competing for GPU/battery
// with actual page content (forms, calendars).

export const ambientVertexShader = `#version 300 es
precision highp float;
const vec2 verts[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main() {
  gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0);
}`;

export const ambientFragmentShader = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 aspectUv = uv;
  aspectUv.x *= uResolution.x / uResolution.y;

  vec2 drift = vec2(uTime * 0.015, uTime * 0.011);
  vec2 pointerPull = (uPointer - 0.5) * 0.12;
  float n = fbm(aspectUv * 2.2 + drift + pointerPull);
  float n2 = fbm(aspectUv * 3.6 - drift * 1.4);
  float ink = smoothstep(0.35, 0.85, n * 0.6 + n2 * 0.4);

  vec3 base = vec3(0.02, 0.004, 0.04);
  vec3 violet = vec3(0.443, 0.188, 1.0);
  vec3 neon = vec3(0.65, 0.447, 1.0);
  vec3 col = mix(base, violet, ink * 0.55);
  col = mix(col, neon, pow(ink, 3.0) * 0.35);

  float vig = smoothstep(1.05, 0.35, length(uv - 0.5) * 1.35);
  col *= mix(0.55, 1.0, vig);

  float grain = (hash(gl_FragCoord.xy + uTime * 60.0) - 0.5) * 0.02;
  col += grain;

  fragColor = vec4(col, 1.0);
}`;
