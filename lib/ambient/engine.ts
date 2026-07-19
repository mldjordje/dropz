// Ambient ink-drift background — raw WebGL2, single fullscreen-triangle draw
// call per frame, no framebuffers or physics. See shader.ts for rationale.
//
// Imperative API mirrors lib/fluid/engine.ts's shape for consistency:
//   const engine = new AmbientEngine();
//   engine.mount(canvas)  -> false if WebGL2 unsupported (caller shows fallback)
//   engine.setPointer(x, y)  // normalized 0..1, y up
//   engine.resize(); engine.pause(); engine.resume(); engine.dispose();

import { ambientFragmentShader, ambientVertexShader } from "./shader";

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class AmbientEngine {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private raf = 0;
  private running = false;
  private startTime = 0;
  private pointer: [number, number] = [0.5, 0.5];
  private uTime: WebGLUniformLocation | null = null;
  private uResolution: WebGLUniformLocation | null = null;
  private uPointer: WebGLUniformLocation | null = null;

  mount(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return false;

    const vertex = compile(gl, gl.VERTEX_SHADER, ambientVertexShader);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, ambientFragmentShader);
    if (!vertex || !fragment) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

    this.gl = gl;
    this.program = program;
    this.canvas = canvas;
    this.uTime = gl.getUniformLocation(program, "uTime");
    this.uResolution = gl.getUniformLocation(program, "uResolution");
    this.uPointer = gl.getUniformLocation(program, "uPointer");

    this.resize();
    this.startTime = performance.now();
    this.running = true;
    this.loop();
    return true;
  }

  setPointer(x: number, y: number) {
    this.pointer = [x, y];
  }

  // Capped at 1x device pixels — this is an ambient backdrop, not the hero
  // piece, so we skip HiDPI supersampling to keep it cheap on phones.
  resize() {
    const canvas = this.canvas;
    const gl = this.gl;
    if (!canvas || !gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resume() {
    if (this.running || !this.gl) return;
    this.running = true;
    this.loop();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    const gl = this.gl;
    if (gl && this.program) gl.deleteProgram(this.program);
    this.gl = null;
    this.program = null;
    this.canvas = null;
  }

  private loop = () => {
    if (!this.running) return;
    const gl = this.gl;
    const canvas = this.canvas;
    if (gl && this.program && canvas) {
      gl.useProgram(this.program);
      gl.uniform1f(this.uTime, (performance.now() - this.startTime) / 1000);
      gl.uniform2f(this.uResolution, canvas.width, canvas.height);
      gl.uniform2f(this.uPointer, this.pointer[0], this.pointer[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
