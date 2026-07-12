"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

// Cinematic intro: counter 0->100 while the dropz ink line draws itself,
// then the black curtain lifts to reveal the hero.
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(safety);
      document.body.style.overflow = "";
      setHidden(true);
      onDone();
    };
    // Safety net: never trap the user behind the curtain if the animation stalls
    // (e.g. a backgrounded tab pausing requestAnimationFrame).
    const safety = window.setTimeout(finish, 4500);

    if (reduce) {
      if (countRef.current) countRef.current.textContent = "100";
      const timer = window.setTimeout(finish, 300);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(safety);
        document.body.style.overflow = "";
      };
    }

    const counter = { v: 0 };
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(counter, {
      v: 100,
      duration: 2.1,
      ease: "power2.out",
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
      },
    }, 0);
    if (pathRef.current) {
      tl.fromTo(pathRef.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.1, ease: "power1.inOut" }, 0);
    }
    tl.to(".preloader__inner", { autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 2.0);
    tl.to(root.current, { yPercent: -100, duration: 1.0, ease: "power4.inOut" }, 2.3);

    return () => {
      tl.kill();
      window.clearTimeout(safety);
      document.body.style.overflow = "";
    };
  }, [onDone]);

  if (hidden) return null;

  return (
    <div className="preloader" ref={root} aria-hidden="true">
      <div className="preloader__inner">
        <svg className="preloader__mark" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
          <path
            ref={pathRef}
            pathLength={1}
            d="M780 -40 C760 140 495 145 530 300 C565 455 755 410 650 555 C545 700 310 570 365 760 C405 895 650 825 530 1050"
          />
        </svg>
        <div className="preloader__meta">
          <span>Dropz Tattoo</span>
          <span className="preloader__count" ref={countRef}>000</span>
        </div>
      </div>
    </div>
  );
}
