"use client";

// The base layer of the whole site: full-viewport fluid ink. Opaque on black,
// z-index 0 — NOT a blended overlay (the v2 mistake). Content floats above it.

import { useEffect, useRef } from "react";
import { FluidEngine } from "@/lib/fluid/engine";
import { useFluid } from "@/lib/fluid/useFluid";

export function FluidStage({ onEngine }: { onEngine: (engine: FluidEngine | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { engineRef, status } = useFluid(canvasRef);

  useEffect(() => {
    onEngine(status === "running" ? engineRef.current : null);
  }, [status, engineRef, onEngine]);

  return (
    <>
      <canvas ref={canvasRef} className="v3-fluid" aria-hidden="true" />
      {status === "fallback" && <div className="v3-fluid v3-fluid--fallback" aria-hidden="true" />}
    </>
  );
}
