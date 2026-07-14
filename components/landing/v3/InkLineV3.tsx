"use client";

// The One Line: a single continuous stroke that opens the site and never lifts.
// Act 1 (time-based, right after the preloader): a needle draws "DROPZ" as one
// monoline stroke in the hero — the first-seconds hook.
// Act 2 (scroll-scrubbed): the same line exits the lettering and weaves through
// every chapter — S-curves through the gallery, a dive along the craft video,
// a stitch zigzag through the process steps, a cursive loop at voices — and
// ignites at the finale. Scrolling back "erases" it. Precision is the rule.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

// Monoline "DROPZ" — ONE path, pen never lifts (connectors are part of the look).
const LOGO_PATH =
  "M20,130 L20,30 C80,30 100,55 100,80 C100,105 80,130 20,130 " +
  "L130,130 L130,30 C180,30 186,48 186,60 C186,74 178,82 130,82 L192,130 " +
  "L255,130 a45,50 0 1 1 0.2,0 " +
  "L320,130 L320,30 C372,30 378,50 378,63 C378,77 370,86 320,86 " +
  "L405,30 L505,30 L405,130 L505,130 C538,130 546,142 548,164";

// Page journey in a 100x1000 normalized space (stretched to the full page).
// Waypoints roughly track the chapters: work waves, craft dive, process stitch,
// voices loop, paths S, booking frame, finale hook.
const PAGE_PATH =
  "M88,2 C82,28 30,36 22,58 C16,74 66,86 76,104 " +
  "C88,124 24,142 18,166 C12,190 80,206 84,232 C88,258 22,272 16,296 " +
  "C12,316 10,330 9,352 C8,372 10,392 14,412 " +
  "L46,436 L16,452 L48,470 L18,486 L50,504 L20,520 " +
  "C34,532 60,534 66,548 C72,562 58,572 50,564 C44,556 52,546 64,548 " +
  "C84,556 80,584 60,600 " +
  "C36,626 32,652 56,668 C74,680 60,690 48,700 " +
  "C36,716 70,724 74,752 C78,788 70,812 52,828 " +
  "C30,852 26,880 50,900 C66,914 58,936 50,946 C46,956 50,962 52,968";

export function InkLineV3({ ready }: { ready: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoSvgRef = useRef<SVGSVGElement>(null);
  const logoPathRef = useRef<SVGPathElement>(null);
  const logoGlowRef = useRef<SVGPathElement>(null);
  const logoTipRef = useRef<SVGCircleElement>(null);
  const pagePathRef = useRef<SVGPathElement>(null);
  const pageGlowRef = useRef<SVGPathElement>(null);
  const pageTipRef = useRef<HTMLDivElement>(null);

  // Act 1 — needle draws the lettering once the preloader clears
  useEffect(() => {
    if (!ready) return;
    const path = logoPathRef.current;
    const glow = logoGlowRef.current;
    const tip = logoTipRef.current;
    if (!path || !glow || !tip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = path.getTotalLength();
    if (reduce) {
      path.style.strokeDasharray = glow.style.strokeDasharray = "none";
      tip.style.opacity = "0";
      return;
    }
    path.style.strokeDasharray = glow.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = glow.style.strokeDashoffset = String(len);
    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: 2.7,
      delay: 0.35,
      ease: "power2.inOut",
      onUpdate: () => {
        const off = len * (1 - proxy.t);
        path.style.strokeDashoffset = glow.style.strokeDashoffset = String(off);
        const pt = path.getPointAtLength(len * proxy.t);
        tip.setAttribute("cx", String(pt.x));
        tip.setAttribute("cy", String(pt.y));
        tip.style.opacity = proxy.t < 1 ? "1" : "0";
      },
      onComplete: () => {
        tip.style.opacity = "0";
        logoSvgRef.current?.classList.add("is-set"); // settled: soft neon hold
      },
    });
    return () => {
      tween.kill();
    };
  }, [ready]);

  // Act 2 — scroll scrubs the page line; tip rides the drawn end
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const path = pagePathRef.current;
    const glow = pageGlowRef.current;
    const tip = pageTipRef.current;
    const wrap = wrapRef.current;
    if (!path || !glow || !tip || !wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = path.getTotalLength();
    if (reduce) {
      path.style.strokeDasharray = glow.style.strokeDasharray = "none";
      tip.style.display = "none";
      return;
    }
    path.style.strokeDasharray = glow.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = glow.style.strokeDashoffset = String(len);

    let box = wrap.getBoundingClientRect();
    let wrapTop = box.top + window.scrollY;
    const remeasure = () => {
      box = wrap.getBoundingClientRect();
      wrapTop = box.top + window.scrollY;
    };

    const proxy = { t: 0 };
    const apply = () => {
      const t = proxy.t;
      const off = len * (1 - t);
      path.style.strokeDashoffset = glow.style.strokeDashoffset = String(off);
      const pt = path.getPointAtLength(len * t);
      // path space (100x1000, stretched) -> viewport px; tip is a fixed element
      const x = (pt.x / 100) * box.width;
      const y = wrapTop + (pt.y / 1000) * box.height - window.scrollY;
      tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      tip.style.opacity = t > 0.004 && t < 0.998 ? "1" : "0";
      wrap.classList.toggle("is-lit", t > 0.965); // finale: line ignites
    };
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      scrub: 0.75,
      onUpdate: (self) => {
        gsap.to(proxy, { t: self.progress, duration: 0.12, overwrite: true, onUpdate: apply });
      },
      onRefresh: () => {
        remeasure();
        apply();
      },
    });
    window.addEventListener("resize", remeasure);
    return () => {
      st.kill();
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  return (
    <div ref={wrapRef} className="v3-inkline" aria-hidden="true">
      {/* Act 1: hero lettering */}
      <svg ref={logoSvgRef} className="v3-inkline__logo" viewBox="0 0 560 170" fill="none">
        <path ref={logoGlowRef} className="v3-inkline__glow" d={LOGO_PATH} />
        <path ref={logoPathRef} className="v3-inkline__stroke" d={LOGO_PATH} />
        <circle ref={logoTipRef} className="v3-inkline__spark" r="3.6" cx="20" cy="130" opacity="0" />
      </svg>
      {/* Act 2: the page-long line */}
      <svg className="v3-inkline__page" viewBox="0 0 100 1000" preserveAspectRatio="none" fill="none">
        <path ref={pageGlowRef} className="v3-inkline__glow" d={PAGE_PATH} vectorEffect="non-scaling-stroke" />
        <path ref={pagePathRef} className="v3-inkline__stroke" d={PAGE_PATH} vectorEffect="non-scaling-stroke" />
      </svg>
      <div ref={pageTipRef} className="v3-inkline__tip" />
    </div>
  );
}
