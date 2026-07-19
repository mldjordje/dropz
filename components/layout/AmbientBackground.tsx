"use client";

import { useRef } from "react";
import { useAmbient } from "@/lib/ambient/useAmbient";

// Route-page counterpart to the landing's FluidStage — same "ink is energy"
// language, a fraction of the GPU cost. On WebGL failure or
// prefers-reduced-motion it renders nothing and route-shell's own CSS
// radial-gradient (app/globals.css) carries the background alone.
export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useAmbient(canvasRef);

  return <canvas ref={canvasRef} className="route-ambient" aria-hidden="true" />;
}
