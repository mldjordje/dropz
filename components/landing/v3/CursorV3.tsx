"use client";

// Custom cursor: a neon dot + trailing ring, magnetic pull toward [data-magnetic]
// targets. Skipped entirely on touch devices and reduced motion.

import { useEffect, useRef, useState } from "react";

export function CursorV3() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let scale = 1;
    let raf = 0;
    let magnet: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const target = (e.target as HTMLElement | null)?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (target !== magnet) {
        magnet = target;
        scale = magnet ? 2.6 : 1;
      }
    };

    const loop = () => {
      let tx = x;
      let ty = y;
      if (magnet) {
        const rect = magnet.getBoundingClientRect();
        tx = rect.left + rect.width / 2 + (x - rect.left - rect.width / 2) * 0.35;
        ty = rect.top + rect.height / 2 + (y - rect.top - rect.height / 2) * 0.35;
      }
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} className="v3-cursor v3-cursor--ring" aria-hidden="true" />
      <div ref={dotRef} className="v3-cursor v3-cursor--dot" aria-hidden="true" />
    </>
  );
}
