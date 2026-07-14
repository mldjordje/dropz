"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

type Marker = { id: string; y: number; side: "left" | "right"; label: string };

const CHAPTERS = [
  { selector: ".v3-work", label: "01" },
  { selector: ".v3-craft", label: "02" },
  { selector: ".v3-process", label: "03" },
  { selector: ".v3-paths", label: "04" },
  { selector: ".v3-booking", label: "05" },
] as const;

function chapterMark(index: number) {
  const variants = [
    <path key="a" d="M12 1v22M2 12h20M6 6l12 12M18 6L6 18" />,
    <path key="b" d="M12 1 22 12 12 23 2 12 12 1ZM1 12h22M12 1v22" />,
    <path key="c" d="M3 5h18M3 19h18M6 2l12 20M18 2 6 22" />,
    <path key="d" d="M12 1v22M1 12h22M4 4l16 16M20 4 4 20" />,
    <path key="e" d="M12 1 18 7 12 12 6 7 12 1ZM12 12l6 5-6 6-6-6 6-5Z" />,
  ];
  return variants[index % variants.length];
}

export function InkLineV3({ ready }: { ready: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<SVGCircleElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const buildMarkers = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      setMarkers(
        CHAPTERS.flatMap(({ selector, label }, index) => {
          const section = document.querySelector<HTMLElement>(selector);
          if (!section) return [];
          const rect = section.getBoundingClientRect();
          return [{
            id: selector,
            y: rect.top + window.scrollY - wrapTop + Math.min(170, rect.height * 0.18),
            side: index % 2 === 0 ? "right" : "left",
            label,
          }];
        }),
      );
    };
    buildMarkers();
    ScrollTrigger.addEventListener("refreshInit", buildMarkers);
    const resize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", resize);
    return () => {
      ScrollTrigger.removeEventListener("refreshInit", buildMarkers);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const needle = needleRef.current;
    const contact = contactRef.current;
    if (!needle || !contact || reduce) return;
    const timeline = gsap.timeline({ delay: 0.22 });
    timeline
      .fromTo(needle, { x: 46, y: -64, rotate: -5, autoAlpha: 0 }, { x: 0, y: 0, rotate: 0, autoAlpha: 1, duration: 1.5, ease: "power4.out" })
      .fromTo(contact, { attr: { r: 2 }, autoAlpha: 0 }, { attr: { r: 9 }, autoAlpha: 1, duration: 0.08, ease: "power1.out" }, "-=0.18")
      .to(contact, { attr: { r: 2.6 }, duration: 0.7, ease: "power3.out" });
    return () => {
      timeline.kill();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".v3-inkmark").forEach((mark) => {
        gsap.fromTo(mark, { autoAlpha: 0, scale: 0.62 }, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: mark.dataset.target, start: "top 72%" },
        });
      });
    }, wrapRef);
    return () => ctx.revert();
  }, [ready, markers]);

  return (
    <div ref={wrapRef} className="v3-inkline" aria-hidden="true">
      <svg className="v3-inkline__hero" viewBox="0 0 1440 1060" fill="none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="needle-metal" x1="0" x2="1">
            <stop stopColor="#2a2927" />
            <stop offset="0.34" stopColor="#f4f0ea" />
            <stop offset="0.53" stopColor="#77736d" />
            <stop offset="0.7" stopColor="#e2ded7" />
            <stop offset="1" stopColor="#191919" />
          </linearGradient>
          <filter id="contact-bloom"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <g ref={needleRef} className="v3-inkline__needle">
          <path d="M1194 30 674 674" stroke="url(#needle-metal)" strokeWidth="30" strokeLinecap="round" />
          <path d="M1188 28 681 658" stroke="rgba(255,255,255,.48)" strokeWidth="2" strokeLinecap="round" />
          <path d="M674 674 604 792" stroke="#e9e4dc" strokeWidth="5" strokeLinecap="round" />
          <path d="M674 674 604 792" stroke="rgba(255,255,255,.6)" strokeWidth="1" strokeLinecap="round" />
          <circle cx="1178" cy="50" r="25" fill="#171717" stroke="rgba(255,255,255,.34)" strokeWidth="2" />
          <circle cx="1178" cy="50" r="13" fill="none" stroke="#a7a29b" strokeWidth="2" />
        </g>
        <circle className="v3-inkline__bloom" cx="604" cy="792" r="15" filter="url(#contact-bloom)" />
        <circle ref={contactRef} className="v3-inkline__contact" cx="604" cy="792" r="2.6" />
        <path className="v3-inkline__thread" d="M604 792c-92 20-116 82-172 102-63 23-109 5-168 47" />
      </svg>
      {markers.map((marker, index) => (
        <div
          key={marker.id}
          className={`v3-inkmark v3-inkmark--${marker.side}`}
          data-target={marker.id}
          style={{ top: marker.y }}
        >
          <span>{marker.label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">{chapterMark(index)}</svg>
        </div>
      ))}
    </div>
  );
}
