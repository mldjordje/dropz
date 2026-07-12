"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

// Cinematic intro: the dropz logo glows in while a counter runs 0->100,
// then the black curtain lifts to reveal the hero.
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
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
    if (logoRef.current) {
      tl.fromTo(logoRef.current, { autoAlpha: 0, scale: 0.86, filter: "blur(12px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.3, ease: "power2.out" }, 0);
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="preloader__logo" ref={logoRef} src="/media/logo.jpg" alt="Dropz Tattoo" />
        <span className="preloader__count" ref={countRef}>000</span>
      </div>
    </div>
  );
}
