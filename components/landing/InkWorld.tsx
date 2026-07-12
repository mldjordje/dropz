"use client";

import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type InkWorldProps = {
  progress: number;
  pointer: { x: number; y: number };
  velocity: number;
};

const fieldVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Scene A — "ink in water": domain-warped fbm plasma tinted with the brand
// palette, advected by the cursor. One full-screen quad, no geometry.
const fieldFragment = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform vec2 uPointer;
  uniform vec2 uResolution;

  // Brand palette (dropz) in linear-ish rgb.
  const vec3 INK    = vec3(0.020, 0.004, 0.040); // #05010a
  const vec3 VIOLET = vec3(0.443, 0.188, 1.000); // #7130ff
  const vec3 NEON   = vec3(0.651, 0.447, 1.000); // #a672ff
  const vec3 WHITE  = vec3(0.953, 0.937, 0.980); // #f3effa

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0; float amplitude = 0.55;
    for (int i = 0; i < 5; i++) { value += amplitude * noise(p); p = p * 2.02 + 11.4; amplitude *= 0.5; }
    return value;
  }

  void main() {
    // Aspect-correct centered coordinates so the ink doesn't stretch on wide screens.
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    p += uPointer * 0.04;             // parallax pan with the cursor
    p *= 1.0 - uProgress * 0.06;      // gentle dolly-in as the page scrolls

    float t = uTime * 0.06 + uProgress * 0.8;
    float speed = clamp(uVelocity * 0.03, 0.0, 1.5);

    // Cursor acts as a flow source: swirl the domain tangentially around it.
    vec2 cur = uPointer * 0.5;
    cur.x *= uResolution.x / max(uResolution.y, 1.0);
    vec2 toCur = p - cur;
    float curDist = length(toCur);
    float swirl = exp(-curDist * curDist * 3.0) * (0.25 + speed);
    vec2 pw = p + vec2(-toCur.y, toCur.x) * swirl * 0.6;
    pw.y += uProgress * 1.4;          // ink streams upward as the page scrolls
    pw += vec2(0.0, uTime * 0.015);

    // Domain warping (Inigo Quilez) — billowing ink clouds.
    vec2 q = vec2(fbm(pw * 1.6 + vec2(0.0, t)),
                  fbm(pw * 1.6 + vec2(5.2, -t)));
    vec2 r = vec2(fbm(pw * 1.6 + q * 1.8 + vec2(1.7, 9.2) + t * 0.5),
                  fbm(pw * 1.6 + q * 1.8 + vec2(8.3, 2.8) - t * 0.4));
    float f = fbm(pw * 1.6 + r * 2.2);

    // Density: dense wisps glow, gaps stay black (transparent).
    float density = smoothstep(0.22, 0.95, f + 0.25 * length(r));

    // Scroll drives the palette: violet high on the page, igniting toward
    // neon then white-hot as you approach the finale.
    vec3 accent = mix(VIOLET, NEON, clamp(uProgress * 1.3, 0.0, 1.0));
    vec3 hot = mix(NEON, WHITE, smoothstep(0.6, 1.0, uProgress));

    vec3 col = mix(INK, accent, smoothstep(0.12, 0.60, density));
    col = mix(col, hot, smoothstep(0.55, 0.92, density) * (0.45 + speed * 0.35));

    // Bright filament veins along the warp ridges — the "ink thread" detail.
    float veins = pow(1.0 - abs(f * 2.0 - 1.0), 3.0);
    col += accent * veins * (0.12 + speed * 0.5);

    // Soft neon bloom under the cursor.
    col += NEON * exp(-curDist * curDist * 6.0) * (0.18 + speed * 0.5);

    // Vignette keeps edges dark and focus central.
    float vignette = smoothstep(1.3, 0.2, length(p));
    density = (density + veins * 0.5) * vignette;

    float alpha = clamp(density * (0.85 + speed * 0.25), 0.0, 0.95);
    gl_FragColor = vec4(col, alpha);
  }
`;

const cloudVertex = `
  attribute vec3 aContact;
  attribute vec3 aTunnel;
  attribute vec3 aLine;
  attribute vec3 aPaths;
  attribute vec3 aMark;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform vec2 uPointer;
  varying float vLight;
  varying float vSeed;

  float ease(float x) { return x * x * (3.0 - 2.0 * x); }
  void main() {
    float p = clamp(uProgress, 0.0, 1.0);
    float m1 = ease(clamp((p - .10) / .20, 0.0, 1.0));
    float m2 = ease(clamp((p - .36) / .19, 0.0, 1.0));
    float m3 = ease(clamp((p - .61) / .20, 0.0, 1.0));
    float m4 = ease(clamp((p - .84) / .16, 0.0, 1.0));
    vec3 position = mix(aContact, aTunnel, m1);
    position = mix(position, aLine, m2);
    position = mix(position, aPaths, m3);
    position = mix(position, aMark, m4);

    float speed = clamp(uVelocity * .025, 0.0, 1.0);
    float breathe = sin(uTime * (1.2 + aSeed * 1.8) + aSeed * 38.0);
    vec2 wake = position.xy - uPointer;
    float pointerDistance = length(wake);
    float push = exp(-pointerDistance * pointerDistance * 5.5) * (.035 + speed * .12);
    position.xy += normalize(wake + .0001) * push;
    position.xy += vec2(sin(uTime + aSeed * 32.0), cos(uTime * .8 + aSeed * 27.0)) * (.003 + speed * .014);
    position.z += breathe * (.018 + speed * .05);

    // Perspective parallax + scroll dolly: particles shift by their depth as the
    // cursor moves (fake camera pan) and drift toward the viewer down the page.
    position.xy += uPointer * position.z * .16;
    position.z += p * .12;
    position.xy *= 1.0 + p * .05;

    gl_Position = vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + speed * 1.8) * (1.0 + .28 * breathe);
    vLight = .36 + .64 * pow(sin(aSeed * 42.0 + uTime * 1.5) * .5 + .5, 3.0);
    vSeed = aSeed;
  }
`;

const cloudFragment = `
  uniform float uProgress;
  uniform float uVelocity;
  varying float vLight;
  varying float vSeed;
  void main() {
    vec2 uv = gl_PointCoord - .5;
    float core = smoothstep(.5, .06, length(uv));
    float halo = smoothstep(.5, .12, length(uv)) * .32;
    float tunnel = smoothstep(.12, .42, uProgress) * (1.0 - smoothstep(.58, .78, uProgress));
    float finale = smoothstep(.82, 1.0, uProgress);
    float speed = clamp(uVelocity * .026, 0.0, 1.0);
    vec3 ink = mix(vec3(.34, .06, .92), vec3(.86, .67, 1.0), vLight);
    ink = mix(ink, vec3(.96, .88, 1.0), finale * .48);
    float alpha = (core + halo) * (.18 + tunnel * .32 + speed * .18 + finale * .18);
    gl_FragColor = vec4(ink, alpha);
  }
`;

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function makeTargets(count: number) {
  const contact = new Float32Array(count * 3);
  const tunnel = new Float32Array(count * 3);
  const line = new Float32Array(count * 3);
  const paths = new Float32Array(count * 3);
  const mark = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const a = random(i + 3) * Math.PI * 2;
    const b = random(i + 79);
    const radius = Math.pow(random(i + 19), .7);
    const idx = i * 3;
    seeds[i] = b;
    sizes[i] = random(i + 157) > .965 ? 4.6 : 1.1 + random(i + 211) * 2.3;

    // Needle contact: a dense, imperfect ink nucleus.
    contact[idx] = Math.cos(a) * radius * .19;
    contact[idx + 1] = Math.sin(a) * radius * .19;
    contact[idx + 2] = (b - .5) * .25;

    // Tunnel: the camera appears to travel through a spiral of ink particles.
    const turn = b * Math.PI * 10.0 + a * .45;
    const tubeRadius = .12 + radius * .92;
    tunnel[idx] = Math.cos(turn) * tubeRadius;
    tunnel[idx + 1] = Math.sin(turn) * tubeRadius * .62;
    tunnel[idx + 2] = radius * 1.4 - .48;

    // Linework: flowing, hand-drawn curves passing across the artist chapter.
    const x = (b - .5) * 2.35;
    const strand = Math.floor(random(i + 303) * 5.0) - 2.0;
    line[idx] = x;
    line[idx + 1] = Math.sin(x * (2.5 + random(i + 333) * 2.8) + strand * 1.15) * (.12 + radius * .22) + strand * .18;
    line[idx + 2] = (random(i + 351) - .5) * .14;

    // Paths: a central split that matches the two conversion choices.
    const side = random(i + 411) > .5 ? 1.0 : -1.0;
    const travel = b * 1.2;
    paths[idx] = side * (.04 + travel * (.58 + radius * .62));
    paths[idx + 1] = (travel - .52) * 1.45 + Math.sin(travel * 8.0 + a) * .08;
    paths[idx + 2] = (random(i + 453) - .5) * .12;

    // Final mark: a compact teardrop cloud, not a copied logo.
    const mx = (random(i + 499) - .5) * .78;
    const my = (random(i + 539) - .5) * 1.18;
    const insideDrop = Math.abs(mx) < (.48 - Math.abs(my) * .29);
    mark[idx] = insideDrop ? mx : mx * .66;
    mark[idx + 1] = my + .15 - Math.abs(mx) * .28;
    mark[idx + 2] = (random(i + 571) - .5) * .08;
  }

  return { contact, tunnel, line, paths, mark, seeds, sizes };
}

export function InkWorld({ progress, pointer, velocity }: InkWorldProps) {
  const fieldMaterial = useRef<THREE.ShaderMaterial>(null);
  const cloudMaterial = useRef<THREE.ShaderMaterial>(null);
  const aberration = useRef<{ offset: THREE.Vector2 }>(null);
  const targets = useMemo(() => makeTargets(3400), []);
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);

  useFrame((state) => {
    pointerTarget.set(pointer.x, pointer.y);
    [fieldMaterial.current, cloudMaterial.current].forEach((material) => {
      if (!material) return;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = progress;
      material.uniforms.uVelocity.value = velocity;
      material.uniforms.uPointer.value.lerp(pointerTarget, .1);
    });
    if (fieldMaterial.current) {
      fieldMaterial.current.uniforms.uResolution.value.set(state.size.width, state.size.height);
    }
    if (aberration.current) {
      const amount = Math.min(velocity * 0.0001, 0.0035);
      aberration.current.offset.set(amount, amount);
    }
  });

  return (
    <>
      <mesh frustumCulled={false} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={fieldMaterial}
          transparent
          depthWrite={false}
          vertexShader={fieldVertex}
          fragmentShader={fieldFragment}
          uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 }, uVelocity: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uResolution: { value: new THREE.Vector2(1, 1) } }}
        />
      </mesh>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[targets.contact, 3]} />
          <bufferAttribute attach="attributes-aContact" args={[targets.contact, 3]} />
          <bufferAttribute attach="attributes-aTunnel" args={[targets.tunnel, 3]} />
          <bufferAttribute attach="attributes-aLine" args={[targets.line, 3]} />
          <bufferAttribute attach="attributes-aPaths" args={[targets.paths, 3]} />
          <bufferAttribute attach="attributes-aMark" args={[targets.mark, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[targets.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[targets.sizes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={cloudMaterial}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={cloudVertex}
          fragmentShader={cloudFragment}
          uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 }, uVelocity: { value: 0 }, uPointer: { value: new THREE.Vector2() } }}
        />
      </points>
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.12} luminanceSmoothing={0.5} intensity={0.9} radius={0.72} />
        <ChromaticAberration ref={aberration} blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0, 0)} radialModulation modulationOffset={0.35} />
        <Vignette eskil={false} offset={0.24} darkness={0.72} />
      </EffectComposer>
    </>
  );
}
