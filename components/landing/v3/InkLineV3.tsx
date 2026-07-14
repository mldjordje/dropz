"use client";

// The One Line: a single continuous stroke that opens the site and never lifts.
// Act 1 (time-based, right after the preloader): a needle draws "DROPZ" as one
// monoline stroke in the hero — the first-seconds hook.
// Act 2 (scroll-scrubbed): a page-long line whose waypoints are MEASURED from
// the real DOM (gallery pieces, process steps, booking panel...), smoothed with
// Catmull-Rom and rebuilt on every ScrollTrigger refresh/resize — so it weaves
// around the actual layout in pixel space, no viewBox stretching, no drift
// when images load. Ignites white at the finale.

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

type Pt = { x: number; y: number };

// deterministic jitter so the line feels hand-guided, not CAD-perfect
function jitter(i: number, amp: number) {
  return Math.sin(i * 12.9898) * 43758.5453 % 1 * amp - amp / 2;
}

// Catmull-Rom -> cubic bezier path (continuous tangents = no kinks)
function toPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// Waypoints measured from the live layout. All coords relative to the wrapper
// (absolute inset:0 of .v3-content), i.e. document space minus wrapper top.
function buildWaypoints(wrap: HTMLElement): Pt[] {
  const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
  const W = wrap.clientWidth;
  const vh = window.innerHeight;
  const docY = (r: DOMRect) => r.top + window.scrollY - wrapTop;
  const rect = (sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    return el ? el.getBoundingClientRect() : null;
  };
  const pts: Pt[] = [];
  const push = (x: number, y: number, i = pts.length) =>
    pts.push({ x: Math.max(10, Math.min(W - 10, x + jitter(i, 30))), y });

  // start under the hero lettering (right side), sweep toward the CTA row
  push(W * 0.84, vh * 0.42);
  push(W * 0.6, vh * 0.62);
  push(W * 0.2, vh * 0.86);

  // weave around each gallery piece: pass on its outer side
  document.querySelectorAll<HTMLElement>(".v3-piece").forEach((piece) => {
    const r = piece.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const side = cx < W / 2 ? r.right + 60 : r.left - 60;
    push(side, docY(r) + r.height * 0.5);
  });

  // craft: dive along the left edge of the pinned video stage
  const craft = rect(".v3-craft");
  if (craft) {
    push(W * 0.08, docY(craft) + craft.height * 0.22);
    push(W * 0.05, docY(craft) + craft.height * 0.55);
    push(W * 0.1, docY(craft) + craft.height * 0.85);
  }

  // process: stitch across the steps, alternating sides
  document.querySelectorAll<HTMLElement>(".v3-step").forEach((step, i) => {
    const r = step.getBoundingClientRect();
    push(i % 2 === 0 ? r.left - 36 : r.right + 36, docY(r) + r.height * 0.5);
  });

  // voices: swing wide right, loop back across the quotes
  const voices = rect(".v3-voices");
  if (voices) {
    push(W * 0.82, docY(voices) + voices.height * 0.3);
    push(W * 0.3, docY(voices) + voices.height * 0.62);
    push(W * 0.66, docY(voices) + voices.height * 0.9);
  }

  // paths: slide through the divider between the two options
  const split = rect(".v3-paths__split");
  if (split) push(W * 0.5, docY(split) + split.height * 0.5);

  // booking: trace the outer edge of the panel
  const panel = rect(".v3-booking__panel");
  if (panel) {
    push(panel.right + 40, docY(panel) - 40);
    push(panel.right + 24, docY(panel) + panel.height * 0.55);
    push(W * 0.34, docY(panel) + panel.height + 60);
  }

  // finale: spiral toward the wordmark and stop there
  const finale = rect(".v3-finale");
  if (finale) {
    push(W * 0.7, docY(finale) + finale.height * 0.3);
    push(W * 0.32, docY(finale) + finale.height * 0.5);
    push(W * 0.5, docY(finale) + finale.height * 0.62);
  }
  return pts;
}

export function InkLineV3({ ready }: { ready: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoSvgRef = useRef<SVGSVGElement>(null);
  const logoPathRef = useRef<SVGPathElement>(null);
  const logoGlowRef = useRef<SVGPathElement>(null);
  const logoTipRef = useRef<SVGCircleElement>(null);
  const pageSvgRef = useRef<SVGSVGElement>(null);
  const pagePathRef = useRef<SVGPathElement>(null);
  const pageGlowRef = useRef<SVGPathElement>(null);
  const pageTipRef = useRef<SVGCircleElement>(null);

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

  // Act 2 — measured page line, scrubbed by scroll
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const wrap = wrapRef.current;
    const svg = pageSvgRef.current;
    const path = pagePathRef.current;
    const glow = pageGlowRef.current;
    const tip = pageTipRef.current;
    if (!wrap || !svg || !path || !glow || !tip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let len = 0;
    let wrapTop = 0;
    // arc-length <-> document-y lookup so the drawing edge tracks the viewport
    let table: { l: number; y: number }[] = [];
    const rebuild = () => {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      if (W < 10 || H < 10) return;
      wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); // 1:1 px — no stretching
      const d = toPath(buildWaypoints(wrap));
      path.setAttribute("d", d);
      glow.setAttribute("d", d);
      len = path.getTotalLength();
      if (!reduce) {
        path.style.strokeDasharray = glow.style.strokeDasharray = String(len);
      }
      table = [];
      let maxY = 0;
      for (let i = 0; i <= 400; i++) {
        const l = (len * i) / 400;
        maxY = Math.max(maxY, path.getPointAtLength(l).y); // monotonic despite loops
        table.push({ l, y: maxY });
      }
    };
    // length whose drawn end sits at document y (binary search + lerp)
    const lenAtY = (y: number) => {
      if (table.length === 0) return 0;
      if (y <= table[0].y) return 0;
      if (y >= table[table.length - 1].y) return len;
      let lo = 0;
      let hi = table.length - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (table[m].y < y) lo = m;
        else hi = m;
      }
      const a = table[lo];
      const b = table[hi];
      const f = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return a.l + (b.l - a.l) * f;
    };

    rebuild();
    if (reduce) {
      tip.style.display = "none";
      return;
    }

    const proxy = { t: 0 };
    const apply = () => {
      const off = len * (1 - proxy.t);
      path.style.strokeDashoffset = glow.style.strokeDashoffset = String(off);
      const pt = path.getPointAtLength(len * proxy.t);
      tip.setAttribute("cx", String(pt.x));
      tip.setAttribute("cy", String(pt.y));
      tip.style.opacity = proxy.t > 0.003 && proxy.t < 0.998 ? "1" : "0";
      wrap.classList.toggle("is-lit", proxy.t > 0.96); // finale ignite
    };
    apply();

    // drawn end rides ~65% down the current viewport — always visible while scrolling
    const targetT = () => {
      const y = window.scrollY + window.innerHeight * 0.65 - wrapTop;
      return len > 0 ? Math.min(Math.max(lenAtY(y) / len, 0), 1) : 0;
    };
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: () => {
        // short eased chase = smooth draw without double-scrub lag
        gsap.to(proxy, { t: targetT(), duration: 0.22, ease: "power1.out", overwrite: true, onUpdate: apply });
      },
      // fires after fonts/images settle layout — the fix for drifting anchors
      onRefresh: () => {
        rebuild();
        proxy.t = targetT();
        apply();
      },
    });
    return () => {
      st.kill();
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
      {/* Act 2: the page-long line, geometry injected at runtime */}
      <svg ref={pageSvgRef} className="v3-inkline__page" fill="none">
        <path ref={pageGlowRef} className="v3-inkline__glow" />
        <path ref={pagePathRef} className="v3-inkline__stroke" />
        <circle ref={pageTipRef} className="v3-inkline__spark" r="4" opacity="0" />
      </svg>
    </div>
  );
}
