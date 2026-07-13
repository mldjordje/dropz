"use client";

// Standalone proving ground for lib/fluid — full-screen sim + fps meter + tall
// scroll body so scroll injection can be tested. Not linked from the site.

import { useEffect, useRef } from "react";
import { useFluid } from "@/lib/fluid/useFluid";

export default function FluidTestPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsRef = useRef<HTMLDivElement | null>(null);
  const { engineRef, status } = useFluid(canvasRef);

  useEffect(() => {
    // debug handle for benchmarking from the console / CDP
    (window as unknown as { __fluid?: unknown }).__fluid = engineRef.current;
  }, [engineRef, status]);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 500) {
        const fps = (frames * 1000) / (now - last);
        if (fpsRef.current) {
          fpsRef.current.textContent = `${fps.toFixed(0)} fps (rAF) / ${engineRef.current?.fps.toFixed(0) ?? "-"} fps (engine)`;
        }
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      engineRef.current?.setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [engineRef]);

  return (
    <div style={{ background: "#000", minHeight: "500vh" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, display: "block" }}
      />
      <div
        ref={fpsRef}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10,
          color: "#a672ff",
          fontFamily: "monospace",
          fontSize: 14,
          background: "rgba(0,0,0,.5)",
          padding: "4px 8px",
        }}
      >
        …
      </div>
      {status === "fallback" && (
        <div style={{ position: "fixed", top: 40, left: 12, zIndex: 10, color: "#f3effa", fontFamily: "monospace" }}>
          FALLBACK MODE (no WebGL2 or reduced motion)
        </div>
      )}
      <div style={{ position: "fixed", bottom: 12, left: 12, zIndex: 10, color: "#7130ff", fontFamily: "monospace", fontSize: 12 }}>
        move cursor = ink trail · click = burst · scroll = needle injection
      </div>
    </div>
  );
}
