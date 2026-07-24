"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

// Cinematic intro: the logo gets ink-wiped in while a counter and progress
// line run 0->100 and studio status words cycle underneath; at 100 a neon seam
// flashes across the screen and the black curtain splits horizontally.
const WORDS = ["priprema mašinice", "sterilizacija", "mešanje tinte", "prva linija"];

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);
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
    let wordIndex = -1;
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(counter, {
      v: 100,
      duration: 2.1,
      ease: "power2.out",
      onUpdate: () => {
        const v = Math.round(counter.v);
        if (countRef.current) countRef.current.textContent = String(v).padStart(3, "0");
        if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
        const next = Math.min(Math.floor((v / 100) * WORDS.length), WORDS.length - 1);
        if (next !== wordIndex && wordRef.current) {
          wordIndex = next;
          wordRef.current.textContent = WORDS[next];
          gsap.fromTo(wordRef.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 0.85, y: 0, duration: 0.35, ease: "power2.out" });
        }
      },
    }, 0);
    if (logoRef.current) {
      // ink wipe: the wordmark gets "drawn" left to right, then breathes with glow
      tl.fromTo(
        logoRef.current,
        { autoAlpha: 0, clipPath: "inset(0 100% 0 0)", filter: "blur(10px) drop-shadow(0 0 0 rgba(166,114,255,0))" },
        { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", filter: "blur(0px) drop-shadow(0 0 30px rgba(166,114,255,.6))", duration: 1.5, ease: "power2.inOut" },
        0.15,
      );
      tl.to(logoRef.current, { scale: 1.03, duration: 0.5, ease: "power2.out" }, 1.75);
    }
    tl.to(".preloader__inner", { autoAlpha: 0, scale: 0.96, duration: 0.45, ease: "power2.in" }, 2.15);
    // neon seam flash, then the curtain splits along it
    tl.fromTo(".preloader__seam", { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.4, ease: "power3.inOut" }, 2.3);
    tl.to(".preloader__half--top", { yPercent: -101, duration: 1.0, ease: "power4.inOut" }, 2.6);
    tl.to(".preloader__half--bottom", { yPercent: 101, duration: 1.0, ease: "power4.inOut" }, 2.6);
    tl.to(".preloader__seam", { autoAlpha: 0, duration: 0.5, ease: "power2.out" }, 2.75);

    return () => {
      tl.kill();
      window.clearTimeout(safety);
      document.body.style.overflow = "";
    };
  }, [onDone]);

  if (hidden) return null;

  return (
    <div className="preloader preloader--split" ref={root} aria-hidden="true">
      <div className="preloader__half preloader__half--top" />
      <div className="preloader__half preloader__half--bottom" />
      <i className="preloader__seam" />
      <div className="preloader__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="preloader__logo" ref={logoRef} src="/media/dropz%20logo%20vektor%20OKVIR-01.webp" alt="Dropz Tattoo" />
        <div className="preloader__meter">
          <span className="preloader__count" ref={countRef}>000</span>
          <span className="preloader__word" ref={wordRef} />
        </div>
        <span className="preloader__bar"><i ref={barRef} /></span>
      </div>
    </div>
  );
}
