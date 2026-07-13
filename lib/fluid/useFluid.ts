"use client";

// Thin React wiring for FluidEngine: pointer/touch -> splats, scroll -> injection,
// visibility pause, resize, prefers-reduced-motion. Keeps all GL out of React state.

import { useEffect, useRef, useState } from "react";
import { FluidEngine } from "./engine";

export type FluidStatus = "pending" | "running" | "fallback";

export function useFluid(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<FluidEngine | null>(null);
  const [status, setStatus] = useState<FluidStatus>("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStatus("fallback");
      return;
    }

    const engine = new FluidEngine();
    if (!engine.mount(canvas)) {
      setStatus("fallback");
      engine.dispose();
      return;
    }
    engineRef.current = engine;
    setStatus("running");

    // pointer -> velocity + dye splats along movement vector
    let px = -1;
    let py = -1;
    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight;
      if (px >= 0) {
        const dx = (x - px) * engine.splatForceScale;
        const dy = (y - py) * engine.splatForceScale;
        if (Math.abs(dx) + Math.abs(dy) > 2) {
          engine.splat({ x, y, dx, dy, color: engine.chapterColor(), radius: 0.0032 });
        }
      }
      px = x;
      py = y;
    };
    const onPointerDown = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        engine.splat({
          x,
          y,
          dx: Math.cos(a) * 900,
          dy: Math.sin(a) * 900,
          color: engine.chapterColor(0.35),
          radius: 0.005,
        });
      }
    };
    const onPointerLeave = () => {
      px = -1;
      py = -1;
    };

    // scroll velocity -> needle injection (works with Lenis since it scrolls the window)
    let lastScroll = window.scrollY;
    let scrollRaf = 0;
    const pumpScroll = () => {
      const s = window.scrollY;
      engine.addScrollForce(s - lastScroll);
      lastScroll = s;
      scrollRaf = requestAnimationFrame(pumpScroll);
    };
    scrollRaf = requestAnimationFrame(pumpScroll);

    const onVisibility = () => {
      if (document.hidden) engine.pause();
      else engine.resume();
    };
    const onResize = () => engine.resize();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerout", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      engineRef.current = null;
    };
  }, [canvasRef]);

  return { engineRef, status };
}
