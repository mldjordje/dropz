"use client";

// Voltmeter HUD: a tiny analog gauge reading scroll velocity like a tattoo
// machine's power supply — needle kicks and the housing buzzes while you
// scroll, settles to zero at rest. Pure decoration, pointer-events: none.

import { useEffect, useRef } from "react";

const MIN_ANGLE = -64;
const MAX_ANGLE = 64;
const MAX_VOLTS = 12;

export function VoltmeterV3() {
  const hudRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const digitsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // static gauge at 0V
    let lastY = window.scrollY;
    let level = 0; // smoothed 0..1
    let raf = 0;
    const loop = () => {
      const vel = window.scrollY - lastY;
      lastY = window.scrollY;
      const target = Math.min(Math.abs(vel) / 38, 1);
      level += (target - level) * (target > level ? 0.4 : 0.06); // kick fast, settle slow
      const needle = needleRef.current;
      if (needle) {
        const ang = MIN_ANGLE + (MAX_ANGLE - MIN_ANGLE) * level;
        needle.setAttribute("transform", `rotate(${ang.toFixed(2)} 60 62)`);
      }
      if (digitsRef.current) digitsRef.current.textContent = (level * MAX_VOLTS).toFixed(1);
      const hud = hudRef.current;
      if (hud) {
        // machine buzz: jitter scales with power
        const j = level * 1.3;
        hud.style.transform = j > 0.05 ? `translate(${(Math.random() - 0.5) * j}px, ${(Math.random() - 0.5) * j}px)` : "";
        hud.classList.toggle("is-hot", level > 0.55);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 9 tick marks along the arc
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = ((MIN_ANGLE + ((MAX_ANGLE - MIN_ANGLE) * i) / 8) * Math.PI) / 180;
    const major = i % 2 === 0;
    const r1 = major ? 38 : 41;
    return (
      <line
        key={i}
        x1={60 + Math.sin(a) * r1}
        y1={62 - Math.cos(a) * r1}
        x2={60 + Math.sin(a) * 45}
        y2={62 - Math.cos(a) * 45}
        className={major ? "v3-volt__tick v3-volt__tick--major" : "v3-volt__tick"}
      />
    );
  });

  return (
    <div className="v3-volt" aria-hidden="true">
      <div ref={hudRef} className="v3-volt__hud">
        <svg viewBox="0 0 120 78">
          <path className="v3-volt__arc" d="M19.6,33.7 A49,49 0 0 1 100.4,33.7" />
          {ticks}
          <line ref={needleRef} className="v3-volt__needle" x1="60" y1="62" x2="60" y2="20" transform={`rotate(${MIN_ANGLE} 60 62)`} />
          <circle className="v3-volt__pivot" cx="60" cy="62" r="2.6" />
        </svg>
        <p className="v3-volt__read">
          <span ref={digitsRef}>0.0</span>V · needle
        </p>
      </div>
    </div>
  );
}
