"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { InkFallback } from "./InkFallback";
import { InkWorld } from "./InkWorld";

export function InkScene({ progress, pointer, velocity }: { progress: number; pointer: { x: number; y: number }; velocity: number }) {
  const [mode, setMode] = useState<"fallback" | "webgl">("fallback");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    const webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    setMode(!reduce && webgl ? "webgl" : "fallback");
  }, []);

  return (
    <div className="webgl-stage" data-renderer={mode}>
      {mode === "webgl" ? (
        <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <InkWorld progress={progress} pointer={pointer} velocity={velocity} />
        </Canvas>
      ) : (
        <InkFallback progress={progress} />
      )}
    </div>
  );
}
