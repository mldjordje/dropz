// GLSL sources for the stable-fluids engine (GLSL ES 1.0, runs on a WebGL2 context).
// Solver passes adapted from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT).

export const baseVertexShader = /* glsl */ `
  precision highp float;

  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const copyShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  uniform sampler2D uTexture;

  void main () {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

export const clearShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

export const splatShader = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

export const advectionShader = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;

  void main () {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
  }
`;

export const divergenceShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;

    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

export const curlShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

export const vorticityShader = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

export const pressureShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

export const gradientSubtractShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

export const bloomPrefilterShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 curve;
  uniform float threshold;

  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    float rq = clamp(br - curve.x, 0.0, curve.y);
    rq = curve.z * rq * rq;
    c *= max(rq, br - threshold) / max(br, 0.0001);
    gl_FragColor = vec4(c, 0.0);
  }
`;

export const blurShader = /* glsl */ `
  precision mediump float;
  precision mediump sampler2D;

  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uDirection;

  void main () {
    vec3 sum = texture2D(uTexture, vUv).rgb * 0.2270270270;
    sum += texture2D(uTexture, vUv + uDirection * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(uTexture, vUv - uDirection * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(uTexture, vUv + uDirection * 3.2307692308).rgb * 0.0702702703;
    sum += texture2D(uTexture, vUv - uDirection * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(sum, 0.0);
  }
`;

export const displayShader = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform sampler2D uMask;
  uniform float uHasMask;
  uniform float uProgress;
  uniform float uIgnite;
  uniform float uTime;
  uniform vec2 uResolution;

  float hash (vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    vec3 bloom = texture2D(uBloom, vUv).rgb;

    float lum = dot(c, vec3(0.299, 0.587, 0.114));

    // white-hot core only where dye is VERY dense (#f3effa) — mids stay purple
    vec3 hot = vec3(0.953, 0.937, 0.980);
    c += hot * smoothstep(1.2, 2.8, lum) * 0.55;

    c += bloom * (0.9 + uIgnite * 2.6);

    // finale: ink (and its bloom) settles into the wordmark, the rest recedes to void
    if (uHasMask > 0.5) {
      float m = texture2D(uMask, vUv).r;
      float settle = smoothstep(0.72, 0.96, uProgress);
      c *= mix(1.0, mix(0.06, 1.55, m), settle);
      c += vec3(0.651, 0.447, 1.0) * m * uIgnite * 1.35;
      c += hot * m * uIgnite * uIgnite * 0.5;
    }

    // film grain (animated)
    float grain = hash(vUv * uResolution + mod(uTime, 64.0));
    c += (grain - 0.5) * 0.045;

    // vignette
    vec2 q = vUv - 0.5;
    c *= 1.0 - dot(q, q) * 0.5;

    gl_FragColor = vec4(max(c, 0.0), 1.0);
  }
`;
