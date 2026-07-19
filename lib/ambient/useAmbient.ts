"use client";

// Thin React wiring for AmbientEngine — mirrors lib/fluid/useFluid.ts but far
// lighter: pointer position only (no splats/scroll injection), same
// visibility-pause / resize / reduced-motion handling.

import { useEffect, useRef, useState } from "react";
import { AmbientEngine } from "./engine";

export type AmbientStatus = "pending" | "running" | "fallback";

export function useAmbient(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<AmbientEngine | null>(null);
  const [status, setStatus] = useState<AmbientStatus>("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStatus("fallback");
      return;
    }

    const engine = new AmbientEngine();
    if (!engine.mount(canvas)) {
      setStatus("fallback");
      engine.dispose();
      return;
    }
    engineRef.current = engine;
    setStatus("running");

    const onPointerMove = (e: PointerEvent) => {
      engine.setPointer(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    const onVisibility = () => {
      if (document.hidden) engine.pause();
      else engine.resume();
    };
    const onResize = () => engine.resize();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      engineRef.current = null;
    };
  }, [canvasRef]);

  return { engineRef, status };
}
