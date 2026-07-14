// Stable-fluids ink engine — raw WebGL2, ping-pong FBOs, framework-agnostic.
// Solver structure adapted from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT).
//
// Imperative API:
//   const engine = new FluidEngine();
//   engine.mount(canvas)  -> false if WebGL2/float unsupported (caller shows fallback)
//   engine.splat({ x, y, dx, dy, color?, radius? })   // x,y in [0,1], y up
//   engine.addScrollForce(v)                          // scroll velocity, px/frame
//   engine.setProgress(p)                             // page progress 0..1
//   engine.setIgnite(i)                               // finale ignite envelope 0..1
//   engine.setMask(source)                            // wordmark mask (canvas/img)
//   engine.resize(); engine.pause(); engine.resume(); engine.dispose();

import {
  advectionShader,
  baseVertexShader,
  bloomPrefilterShader,
  blurShader,
  clearShader,
  copyShader,
  curlShader,
  displayShader,
  divergenceShader,
  gradientSubtractShader,
  pressureShader,
  splatShader,
  vorticityShader,
} from "./shaders";
import { CHAPTER_MOTIFS, motifPlacement } from "./motifs";

export interface SplatOptions {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color?: [number, number, number];
  radius?: number;
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

const isMobile = () =>
  typeof window !== "undefined" && (navigator.maxTouchPoints > 1 || /Mobi|Android/i.test(navigator.userAgent));

// Brand ink ramp: deep violet -> neon -> white-hot (docs/04 + 07).
// Darkened ~15% overall (cinematic calm, less purple wash) — hues unchanged.
const RAMP: [number, number, number][] = [
  [0.377, 0.16, 0.85], // #7130ff, darkened ~15%
  [0.553, 0.38, 0.85], // #a672ff, darkened ~15%
  [0.62, 0.487, 0.85], // darkened ~15%
  [0.81, 0.796, 0.833], // #f3effa, darkened ~15%
];

function smoothstep01(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

function sampleRamp(t: number): [number, number, number] {
  const clamped = Math.min(Math.max(t, 0), 0.999);
  const scaled = clamped * (RAMP.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

class GLProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation> = {};

  constructor(gl: WebGL2RenderingContext, vertex: WebGLShader, fragmentSource: string) {
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`fluid: program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name;
      this.uniforms[name] = gl.getUniformLocation(program, name)!;
    }
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`fluid: shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export class FluidEngine {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private raf = 0;
  private running = false;
  private disposed = false;
  private lastTime = 0;

  private mobile = false;
  private simRes = 256;
  private dyeRes = 1024;
  private pressureIterations = 24;

  // tuning — calmer/cinematic pass: motion dies out sooner, ink covers less
  // of the screen, less turbulence. See docs/07 client feedback: "too fast,
  // too much purple."
  private densityDissipation = 0.75; // was 0.62 — ink fades a bit sooner, still lingers
  private velocityDissipation = 0.4; // was 0.22 — motion settles faster, calmer
  private pressureDecay = 0.8;
  private curlStrength = 20; // was 34 — less turbulent swirling
  private splatForce = 3600; // was 6000 — pointer drag ~40% gentler
  private baseSplatRadius = 0.0028;

  private progress = 0;
  private ignite = 0;
  private time = 0;

  // fps governor
  private frameEMA = 16.7;
  private slowFrames = 0;
  private governorLevel = 0;

  // idle emitters keep the ink alive
  private emitters = [
    { x: 0.3, y: 0.62, a: 0.4 },
    { x: 0.68, y: 0.4, a: 2.6 },
    { x: 0.52, y: 0.75, a: 4.4 },
  ];
  private lastInputAt = 0;
  private scrollAccum = 0;
  private needlePhase = 0;
  private lastChapter = 0; // 7 scroll chapters; a new one gets announced by one slow ink drop
  private motifDrawn = 0; // points of the current chapter's motif emitted so far
  private motifChapter = -1; // chapter the draw state belongs to

  private pendingSplats: SplatOptions[] = [];

  // GL objects
  private quadVAO: WebGLVertexArrayObject | null = null;
  private programs: Record<string, GLProgram> = {};
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private divergenceFBO!: FBO;
  private curlFBO!: FBO;
  private pressureFBO!: DoubleFBO;
  private bloomFBO!: FBO;
  private bloomTempFBO!: FBO;
  private maskTexture: WebGLTexture | null = null;
  private maskData: { data: Uint8ClampedArray; width: number; height: number } | null = null;
  private halfFloat = 0;
  private supportLinear = true;

  mount(canvas: HTMLCanvasElement): boolean {
    if (this.disposed) return false;
    this.canvas = canvas;
    this.mobile = isMobile();
    this.simRes = this.mobile ? 128 : 256;
    this.dyeRes = this.mobile ? 512 : 1024;
    this.pressureIterations = this.mobile ? 14 : 24;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) return false;
    if (this.isSoftwareRenderer(gl)) return false;
    if (!gl.getExtension("EXT_color_buffer_float")) return false;
    this.supportLinear = !!gl.getExtension("OES_texture_float_linear") || true; // half-float linear is core in WebGL2
    this.gl = gl;
    this.halfFloat = gl.HALF_FLOAT;

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);

    this.resizeCanvas();

    const vertex = compileShader(gl, gl.VERTEX_SHADER, baseVertexShader);
    const make = (src: string) => new GLProgram(gl, vertex, src);
    this.programs = {
      copy: make(copyShader),
      clear: make(clearShader),
      splat: make(splatShader),
      advection: make(advectionShader),
      divergence: make(divergenceShader),
      curl: make(curlShader),
      vorticity: make(vorticityShader),
      pressure: make(pressureShader),
      gradient: make(gradientSubtractShader),
      bloomPrefilter: make(bloomPrefilterShader),
      blur: make(blurShader),
      display: make(displayShader),
    };

    // fullscreen quad
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const elements = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    this.initFramebuffers();

    // seed: a few dim blooms so first paint is alive (fewer/softer — calm open)
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const seed = sampleRamp(Math.random() * 0.5);
      this.pendingSplats.push({
        x: 0.35 + Math.random() * 0.3,
        y: 0.35 + Math.random() * 0.3,
        dx: Math.cos(angle) * 300,
        dy: Math.sin(angle) * 300,
        color: [seed[0] * 0.6, seed[1] * 0.6, seed[2] * 0.6],
        radius: 0.005 + Math.random() * 0.004,
      });
    }

    this.lastTime = performance.now();
    this.lastInputAt = this.lastTime;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
    return true;
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.pause();
  };

  private isSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debug) return false;
    const renderer = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
    return renderer.includes("swiftshader") || renderer.includes("software") || renderer.includes("llvmpipe");
  }

  private resizeCanvas() {
    if (!this.canvas) return;
    const dprCap = this.mobile ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  resize() {
    if (!this.gl || !this.canvas) return;
    const prevW = this.canvas.width;
    const prevH = this.canvas.height;
    this.resizeCanvas();
    if (this.canvas.width !== prevW || this.canvas.height !== prevH) this.initFramebuffers();
  }

  private getResolution(base: number) {
    const gl = this.gl!;
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(base);
    const max = Math.round(base * aspect);
    return gl.drawingBufferWidth > gl.drawingBufferHeight
      ? { width: max, height: min }
      : { width: min, height: max };
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO {
    const gl = this.gl!;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): DoubleFBO {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, filter);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, filter);
    return {
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      get read() { return fbo1; },
      set read(v: FBO) { fbo1 = v; },
      get write() { return fbo2; },
      set write(v: FBO) { fbo2 = v; },
      swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; },
    } as DoubleFBO;
  }

  private deleteFBO(f: FBO) {
    const gl = this.gl!;
    gl.deleteTexture(f.texture);
    gl.deleteFramebuffer(f.fbo);
  }

  private deleteDoubleFBO(f: DoubleFBO) {
    this.deleteFBO(f.read);
    this.deleteFBO(f.write);
  }

  private initFramebuffers() {
    const gl = this.gl!;
    if (this.velocity) {
      this.deleteDoubleFBO(this.velocity);
      this.deleteDoubleFBO(this.dye);
      this.deleteDoubleFBO(this.pressureFBO);
      this.deleteFBO(this.divergenceFBO);
      this.deleteFBO(this.curlFBO);
      this.deleteFBO(this.bloomFBO);
      this.deleteFBO(this.bloomTempFBO);
    }
    const sim = this.getResolution(this.simRes);
    const dye = this.getResolution(this.dyeRes);
    const bloom = this.getResolution(Math.max(this.dyeRes >> 2, 128));
    const filter = this.supportLinear ? gl.LINEAR : gl.NEAREST;

    this.velocity = this.createDoubleFBO(sim.width, sim.height, gl.RG16F, gl.RG, this.halfFloat, filter);
    this.dye = this.createDoubleFBO(dye.width, dye.height, gl.RGBA16F, gl.RGBA, this.halfFloat, filter);
    this.pressureFBO = this.createDoubleFBO(sim.width, sim.height, gl.R16F, gl.RED, this.halfFloat, gl.NEAREST);
    this.divergenceFBO = this.createFBO(sim.width, sim.height, gl.R16F, gl.RED, this.halfFloat, gl.NEAREST);
    this.curlFBO = this.createFBO(sim.width, sim.height, gl.R16F, gl.RED, this.halfFloat, gl.NEAREST);
    this.bloomFBO = this.createFBO(bloom.width, bloom.height, gl.RGBA16F, gl.RGBA, this.halfFloat, filter);
    this.bloomTempFBO = this.createFBO(bloom.width, bloom.height, gl.RGBA16F, gl.RGBA, this.halfFloat, filter);
  }

  private blit(target: FBO | null) {
    const gl = this.gl!;
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ---------- public inputs ----------

  splat(options: SplatOptions) {
    this.pendingSplats.push(options);
    this.lastInputAt = performance.now();
  }

  addScrollForce(velocity: number) {
    this.scrollAccum += velocity;
    if (Math.abs(velocity) > 2) this.lastInputAt = performance.now();
  }

  setProgress(p: number) {
    this.progress = Math.min(Math.max(p, 0), 1);
  }

  setIgnite(i: number) {
    this.ignite = Math.min(Math.max(i, 0), 1);
  }

  /** Color for the current chapter, with dramaturgy: deep violet hero ->
   * near-monochrome charcoal ink through the middle chapters (violet survives
   * only as rare accent splats) -> violet returns for the closing chapters.
   * Capped below white-hot: white is reserved for dense cores and the ignite. */
  chapterColor(jitter = 0.18): [number, number, number] {
    const p = this.progress;
    const t = Math.min(p * 0.55 + Math.random() * jitter, 0.72);
    const c = sampleRamp(t);
    // 0 at hero and finale, 1 through the middle of the page
    const mid =
      smoothstep01((p - 0.14) / 0.16) * (1 - smoothstep01((p - 0.62) / 0.16));
    // 12% of mid-page splats stay fully violet — accents, not wallpaper
    const desat = Math.random() < 0.12 ? 0 : 0.78 * mid;
    const luma = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const boost = 0.18; // was 0.32 — dimmer HDR dye, less purple wash from bloom
    return [
      (c[0] + (luma - c[0]) * desat) * boost,
      (c[1] + (luma - c[1]) * desat) * boost,
      (c[2] + (luma - c[2]) * desat) * boost,
    ];
  }

  setMask(source: TexImageSource & (HTMLCanvasElement | HTMLImageElement)) {
    const gl = this.gl;
    if (!gl) return;
    if (!this.maskTexture) this.maskTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // keep CPU copy for splat biasing (sample points inside the wordmark)
    const c = document.createElement("canvas");
    const w = 256;
    const h = Math.max(1, Math.round((source.height / source.width) * 256)) || 128;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(source, 0, 0, w, h);
    this.maskData = { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
  }

  /** Random point inside the wordmark (uv, y up). Null if no mask. */
  maskPoint(): { x: number; y: number } | null {
    if (!this.maskData) return null;
    const { data, width, height } = this.maskData;
    for (let i = 0; i < 24; i++) {
      const px = Math.floor(Math.random() * width);
      const py = Math.floor(Math.random() * height);
      if (data[(py * width + px) * 4] > 128) {
        return { x: px / width, y: 1 - py / height };
      }
    }
    return null;
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resume() {
    if (this.disposed || !this.gl || this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.pause();
    this.disposed = true;
    if (this.canvas) this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    const gl = this.gl;
    if (gl) {
      if (this.velocity) {
        this.deleteDoubleFBO(this.velocity);
        this.deleteDoubleFBO(this.dye);
        this.deleteDoubleFBO(this.pressureFBO);
        this.deleteFBO(this.divergenceFBO);
        this.deleteFBO(this.curlFBO);
        this.deleteFBO(this.bloomFBO);
        this.deleteFBO(this.bloomTempFBO);
      }
      if (this.maskTexture) gl.deleteTexture(this.maskTexture);
      Object.values(this.programs).forEach((p) => gl.deleteProgram(p.program));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.gl = null;
    this.canvas = null;
  }

  // ---------- frame loop ----------

  private tick = (now: number) => {
    if (!this.running || !this.gl) return;
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;
    this.time += dt;

    this.governor(now, dt);
    this.drive(now, dt);
    this.step(dt);
    this.render();

    this.raf = requestAnimationFrame(this.tick);
  };

  private governor(now: number, dt: number) {
    this.frameEMA = this.frameEMA * 0.95 + dt * 1000 * 0.05;
    if (this.frameEMA > 20) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 90 && this.governorLevel < 2) {
      this.governorLevel++;
      this.slowFrames = 0;
      this.frameEMA = 16.7;
      if (this.governorLevel === 1) {
        this.pressureIterations = Math.max(10, Math.floor(this.pressureIterations * 0.6));
      } else {
        this.simRes = Math.max(96, this.simRes >> 1);
        this.dyeRes = Math.max(384, this.dyeRes >> 1);
        this.initFramebuffers();
      }
    }
  }

  /** Autonomous inputs: idle drift, scroll needle-path injection. */
  private drive(now: number, dt: number) {
    // chapter transition -> one slow, wide ink drop announces the section
    // (composition alternates sides). Replaces part of the continuous scroll
    // pumping with a deliberate, cinematic beat.
    const chapter = Math.min(Math.floor(this.progress * 7), 6);
    if (chapter !== this.lastChapter) {
      this.lastChapter = chapter;
      const cx = chapter % 2 === 0 ? 0.34 : 0.66;
      const cy = 0.5 + (Math.random() - 0.5) * 0.18;
      const c = this.chapterColor(0.08);
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.pendingSplats.push({
          x: cx + (Math.random() - 0.5) * 0.05,
          y: cy + (Math.random() - 0.5) * 0.05,
          dx: Math.cos(a) * 90,
          dy: Math.sin(a) * 90,
          color: [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5],
          radius: this.baseSplatRadius * 2.6,
        });
      }
    }

    // needle-draw: the chapter's tattoo motif gets "needle-drawn" stroke by
    // stroke as its chapter is scrolled through, then faintly reinforced so
    // it survives dissipation while on screen. See lib/fluid/motifs.ts.
    const motif = CHAPTER_MOTIFS[chapter];
    if (motif) {
      if (this.motifChapter !== chapter) {
        this.motifChapter = chapter;
        this.motifDrawn = 0;
      }
      const local = Math.min(Math.max(this.progress * 7 - chapter, 0), 1); // progress within the chapter
      const reveal = smoothstep01((local - 0.12) / 0.6); // draw window: 12%..72% of the chapter
      const target = Math.floor(reveal * motif.points.length);
      const place = motifPlacement(chapter);
      const aspect = this.canvas ? this.canvas.height / this.canvas.width : 0.6; // keep motif proportions in uv space
      const perFrame = this.mobile ? 2 : 4; // cap emission per frame so fast scroll catches up over ~1s
      const dye = 0.55; // denser than ambient so the line reads
      let emitted = 0;
      while (this.motifDrawn < target && emitted < perFrame) {
        const pt = motif.points[this.motifDrawn++];
        emitted++;
        const c = this.chapterColor(0.06);
        this.pendingSplats.push({
          x: place.x + (pt.x - 0.5) * place.scale * aspect,
          y: place.y + (pt.y - 0.5) * place.scale,
          dx: pt.tx * 220, // velocity along the stroke -> organic smear
          dy: pt.ty * 220,
          color: [c[0] * dye, c[1] * dye, c[2] * dye],
          radius: this.baseSplatRadius * 0.55, // thin, needle-like line
        });
      }
      // reinforcement: once (partially) drawn, faintly re-ink random points already
      // drawn so the piece survives dissipation while its chapter is on screen
      if (this.motifDrawn > 8 && Math.random() < (this.mobile ? 0.18 : 0.35)) {
        const pt = motif.points[Math.floor(Math.random() * this.motifDrawn)];
        const c = this.chapterColor(0.06);
        this.pendingSplats.push({
          x: place.x + (pt.x - 0.5) * place.scale * aspect,
          y: place.y + (pt.y - 0.5) * place.scale,
          dx: pt.tx * 40,
          dy: pt.ty * 40,
          color: [c[0] * 0.22, c[1] * 0.22, c[2] * 0.22],
          radius: this.baseSplatRadius * 0.5,
        });
      }
    } else {
      this.motifChapter = -1;
      this.motifDrawn = 0;
    }

    // scroll -> rhythmic dye along a sinuous vertical "needle path".
    // Tuned cinematic: long accumulator tail, low velocities, wide soft blooms —
    // the ink should billow and drift with the scroll, not shoot.
    // Force and dye both halved vs. the original pass so scrolling doesn't churn the ink.
    const scroll = this.scrollAccum;
    this.scrollAccum *= 0.86;
    const mag = Math.abs(scroll);
    if (mag > 1.5) {
      this.needlePhase += dt * 1.7 + mag * 0.0006;
      const surge = Math.min(mag / 120, 1.1);
      const count = mag > 90 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const yPos = 0.82 - ((this.needlePhase * 0.13 + i * 0.31) % 0.66);
        const x = 0.5 + Math.sin(this.needlePhase * 1.7 + i * 2.1) * 0.22;
        const dir = scroll > 0 ? -1 : 1;
        const c = this.chapterColor();
        this.pendingSplats.push({
          x,
          y: yPos,
          dx: Math.sin(this.needlePhase * 2.2 + i) * 55 * surge, // was 110 — halved
          dy: dir * (95 + 115 * surge), // was (190 + 230 * surge) — halved
          color: [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5], // halved dye so scroll doesn't churn ink
          radius: this.baseSplatRadius * (1.35 + surge * 0.75),
        });
      }
    }

    // idle: wandering emitters keep ink breathing — slowed way down, softer,
    // dimmer: soft slow blooms read as cinematic instead of busy.
    const idleFor = now - this.lastInputAt;
    const idleGain = Math.min(idleFor / 2500, 1) * 0.75 + 0.25;
    for (const e of this.emitters) {
      e.a += (Math.random() - 0.5) * 0.35;
      e.x += Math.cos(e.a) * 0.0005 * idleGain; // was 0.0011 — slower wander
      e.y += Math.sin(e.a) * 0.0005 * idleGain; // was 0.0011 — slower wander
      if (e.x < 0.12 || e.x > 0.88) e.a = Math.PI - e.a;
      if (e.y < 0.14 || e.y > 0.86) e.a = -e.a;
      e.x = Math.min(Math.max(e.x, 0.1), 0.9);
      e.y = Math.min(Math.max(e.y, 0.12), 0.88);
      if (Math.random() < 0.28 * idleGain) {
        // was 0.5 * idleGain — fewer idle spawns
        const c = this.chapterColor(0.3);
        this.pendingSplats.push({
          x: e.x,
          y: e.y,
          dx: Math.cos(e.a) * 130 * idleGain, // was 260 — gentler splat force
          dy: Math.sin(e.a) * 130 * idleGain, // was 260 — gentler splat force
          color: [c[0] * 0.25, c[1] * 0.25, c[2] * 0.25], // was 0.35 — dimmer, less purple
          radius: this.baseSplatRadius * 1.7, // was 1.4 — slightly larger/softer bloom
        });
      }
    }

    // finale: bias dye into the wordmark
    if (this.progress > 0.74 && this.maskData) {
      const settle = (this.progress - 0.74) / 0.26;
      const shots = Math.round(settle * 5);
      for (let i = 0; i < shots; i++) {
        const p = this.maskPoint();
        if (!p) break;
        const c = sampleRamp(0.4 + settle * 0.35);
        this.pendingSplats.push({
          x: p.x,
          y: p.y,
          dx: (Math.random() - 0.5) * 120,
          dy: (Math.random() - 0.5) * 120,
          color: [c[0] * 0.3, c[1] * 0.3, c[2] * 0.3], // was 0.4 — dimmer settle dye
          radius: this.baseSplatRadius * 0.8,
        });
      }
    }
  }

  private step(dt: number) {
    const gl = this.gl!;
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.quadVAO);

    // splats
    const splats = this.pendingSplats;
    this.pendingSplats = [];
    for (const s of splats) this.applySplat(s);

    const { curl, vorticity, divergence, clear, pressure, gradient, advection } = this.programs;
    const velTexel: [number, number] = [this.velocity.texelSizeX, this.velocity.texelSizeY];

    gl.useProgram(curl.program);
    gl.uniform2f(curl.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(curl.uniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.curlFBO);

    gl.useProgram(vorticity.program);
    gl.uniform2f(vorticity.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(vorticity.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(vorticity.uniforms.uCurl, this.curlFBO.attach(1));
    gl.uniform1f(vorticity.uniforms.curl, this.curlStrength);
    gl.uniform1f(vorticity.uniforms.dt, dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.useProgram(divergence.program);
    gl.uniform2f(divergence.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(divergence.uniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.divergenceFBO);

    gl.useProgram(clear.program);
    gl.uniform1i(clear.uniforms.uTexture, this.pressureFBO.read.attach(0));
    gl.uniform1f(clear.uniforms.value, this.pressureDecay);
    this.blit(this.pressureFBO.write);
    this.pressureFBO.swap();

    gl.useProgram(pressure.program);
    gl.uniform2f(pressure.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(pressure.uniforms.uDivergence, this.divergenceFBO.attach(0));
    for (let i = 0; i < this.pressureIterations; i++) {
      gl.uniform1i(pressure.uniforms.uPressure, this.pressureFBO.read.attach(1));
      this.blit(this.pressureFBO.write);
      this.pressureFBO.swap();
    }

    gl.useProgram(gradient.program);
    gl.uniform2f(gradient.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(gradient.uniforms.uPressure, this.pressureFBO.read.attach(0));
    gl.uniform1i(gradient.uniforms.uVelocity, this.velocity.read.attach(1));
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.useProgram(advection.program);
    gl.uniform2f(advection.uniforms.texelSize, velTexel[0], velTexel[1]);
    gl.uniform1i(advection.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(advection.uniforms.uSource, this.velocity.read.attach(0));
    gl.uniform1f(advection.uniforms.dt, dt);
    gl.uniform1f(advection.uniforms.dissipation, this.velocityDissipation);
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(advection.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(advection.uniforms.uSource, this.dye.read.attach(1));
    gl.uniform1f(advection.uniforms.dissipation, this.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private applySplat(s: SplatOptions) {
    const gl = this.gl!;
    const { splat } = this.programs;
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const radius = (s.radius ?? this.baseSplatRadius) * (aspect > 1 ? 1 : aspect);
    const color = s.color ?? this.chapterColor();

    gl.useProgram(splat.program);
    gl.uniform1f(splat.uniforms.aspectRatio, aspect);
    gl.uniform2f(splat.uniforms.point, s.x, s.y);
    gl.uniform1f(splat.uniforms.radius, radius);

    gl.uniform1i(splat.uniforms.uTarget, this.velocity.read.attach(0));
    gl.uniform3f(splat.uniforms.color, s.dx, s.dy, 0);
    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(splat.uniforms.uTarget, this.dye.read.attach(0));
    gl.uniform3f(splat.uniforms.color, color[0], color[1], color[2]);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private render() {
    const gl = this.gl!;
    const { bloomPrefilter, blur, display } = this.programs;

    // bloom: threshold -> separable blur on downsampled target
    // threshold raised slightly (was 0.55) so less of the ambient dye blooms —
    // a big contributor to the "too much purple glow" feedback.
    const threshold = 0.65;
    const knee = threshold * 0.7;
    gl.useProgram(bloomPrefilter.program);
    gl.uniform3f(bloomPrefilter.uniforms.curve, threshold - knee, knee * 2, 0.25 / knee);
    gl.uniform1f(bloomPrefilter.uniforms.threshold, threshold);
    gl.uniform1i(bloomPrefilter.uniforms.uTexture, this.dye.read.attach(0));
    this.blit(this.bloomFBO);

    gl.useProgram(blur.program);
    for (let i = 0; i < 2; i++) {
      gl.uniform2f(blur.uniforms.uDirection, this.bloomFBO.texelSizeX * (1 + i), 0);
      gl.uniform1i(blur.uniforms.uTexture, this.bloomFBO.attach(0));
      this.blit(this.bloomTempFBO);
      gl.uniform2f(blur.uniforms.uDirection, 0, this.bloomFBO.texelSizeY * (1 + i));
      gl.uniform1i(blur.uniforms.uTexture, this.bloomTempFBO.attach(0));
      this.blit(this.bloomFBO);
    }

    gl.useProgram(display.program);
    gl.uniform1i(display.uniforms.uTexture, this.dye.read.attach(0));
    gl.uniform1i(display.uniforms.uBloom, this.bloomFBO.attach(1));
    if (this.maskTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.uniform1i(display.uniforms.uMask, 2);
      gl.uniform1f(display.uniforms.uHasMask, 1);
    } else {
      gl.uniform1f(display.uniforms.uHasMask, 0);
    }
    gl.uniform1f(display.uniforms.uProgress, this.progress);
    gl.uniform1f(display.uniforms.uIgnite, this.ignite);
    gl.uniform1f(display.uniforms.uTime, this.time);
    gl.uniform2f(display.uniforms.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.blit(null);
  }

  /**
   * Synchronous cost probe: run `frames` full sim+render steps back-to-back and
   * time them with a gl.finish() fence. Returns ms per frame (CPU+GPU). Lets us
   * verify the 60fps budget even when rAF is throttled (hidden tab).
   */
  benchmark(frames = 120): number {
    const gl = this.gl;
    if (!gl) return -1;
    const wasRunning = this.running;
    this.pause();
    // gl.finish() is unreliable in Chrome; a 1px readPixels is a hard pipeline sync.
    const px = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) {
      this.drive(performance.now(), 1 / 60);
      this.step(1 / 60);
      this.render();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const ms = (performance.now() - t0) / frames;
    if (wasRunning) this.resume();
    return ms;
  }

  get splatForceScale() {
    return this.splatForce;
  }

  get fps() {
    return 1000 / this.frameEMA;
  }
}
