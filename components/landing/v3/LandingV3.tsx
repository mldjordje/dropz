"use client";

// v3 landing: one continuous fluid-ink "session". A single scroll source drives
// the engine's uProgress AND every DOM reveal; the page ends with the ink
// resolving into the wordmark and igniting. See docs/07.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import { FluidEngine } from "@/lib/fluid/engine";
import { BookingChoice } from "../../booking/BookingChoice";
import { copy, Locale } from "../content";
import { Navigation } from "../Navigation";
import { Preloader } from "../Preloader";
import { CursorV3 } from "./CursorV3";
import { FluidStage } from "./FluidStage";
import { VoltmeterV3 } from "./VoltmeterV3";
import { buildLogoMask } from "./logoMask";
import { BookingV3, CraftV3, EduV3, FinaleV3, HeroV3, PathsV3, ProcessV3, VoicesV3, WorkV3 } from "./Sections";

export function LandingV3({ copyData }: { copyData?: typeof copy }) {
  const [locale, setLocale] = useState<Locale>("sr");
  const [ready, setReady] = useState(false);
  const engineRef = useRef<FluidEngine | null>(null);
  const finaleProgress = useRef(0);
  const text = (copyData ?? copy)[locale];

  const handleEngine = useCallback((engine: FluidEngine | null) => {
    engineRef.current = engine;
    if (!engine) return;
    buildLogoMask("/media/dropz%20png%20logo%20original-01.png", window.innerWidth / window.innerHeight)
      .then((mask) => engineRef.current === engine && engine.setMask(mask))
      .catch(() => {}); // no mask -> finale still works, just without the settle
  }, []);

  const pushInk = useCallback((clientX: number, clientY: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const x = clientX / window.innerWidth;
    const y = 1 - clientY / window.innerHeight;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      engine.splat({
        x,
        y,
        dx: Math.cos(angle) * 1100,
        dy: Math.sin(angle) * 1100,
        color: engine.chapterColor(0.3),
        radius: 0.0055,
      });
    }
  }, []);

  // Single scroll source: Lenis raf + ScrollTrigger.update + engine progress/ignite.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // low lerp = heavy, cinematic glide (was .09 — read as too fast)
    const lenis = reduce ? null : new Lenis({ lerp: 0.06, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      ScrollTrigger.update();
      const engine = engineRef.current;
      if (engine) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        engine.setProgress(p);

        // needle tracer: a glowing needle-point sweeps a descending S-path as
        // you scroll, injecting a thin ink trail into the fluid — the needle
        // literally "draws" the page. Glow + ink flow scale with scroll speed.
        // ignite envelope: builds through the finale scrub, flickers 2-3 beats,
        // then locks to a steady neon hold
        const fp = finaleProgress.current;
        const base = Math.min(Math.max((fp - 0.45) / 0.4, 0), 1);
        const t = time / 1000;
        const flicker =
          fp < 0.88
            ? 0.68 + 0.32 * Math.abs(Math.sin(t * 23.0) * Math.sin(t * 6.4))
            : 0.94 + 0.06 * Math.sin(t * 2.6);
        engine.setIgnite(base * flicker);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  // Reveal choreography. Every tween: immediateRender:false (content must default
  // to visible), reveals start as sections ENTER (~top 88-92%) — the v2 lesson.
  useEffect(() => {
    if (!ready) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (!reduce) {
        gsap.from(".v3-hero__title .v3-line i", {
          yPercent: 118,
          duration: 1.4,
          stagger: 0.13,
          ease: "power4.out",
          delay: 0.1,
          immediateRender: false,
        });
        gsap.from(".v3-hero__sub, .v3-hero__actions .v3-cta, .v3-hero__cue, .v3-hero__meta", {
          autoAlpha: 0,
          y: 26,
          duration: 1.0,
          stagger: 0.12,
          delay: 0.85,
          ease: "power3.out",
          immediateRender: false,
        });

        // portfolio: ink-wipe reveals firing the moment each piece enters.
        // Wipe direction cycles per piece (bottom / left / right / center-out)
        // and the cycle starts at a random offset each visit, so the gallery
        // never replays the exact same choreography twice.
        const wipes = [
          "inset(100% 0% 0% 0%)", // from bottom
          "inset(0% 100% 0% 0%)", // from left
          "inset(0% 0% 0% 100%)", // from right
          "inset(0% 50% 0% 50%)", // center-out
        ];
        const wipeSeed = Math.floor(Math.random() * wipes.length);
        gsap.utils.toArray<HTMLElement>(".v3-piece").forEach((piece, i) => {
          const mask = piece.querySelector(".v3-piece__mask");
          const img = piece.querySelector("img");
          if (!mask || !img) return;
          gsap.fromTo(
            mask,
            { clipPath: wipes[(wipeSeed + i) % wipes.length] },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.25,
              ease: "power4.out",
              immediateRender: false,
              scrollTrigger: { trigger: piece, start: "top 92%" },
            },
          );
          gsap.fromTo(
            img,
            { scale: 1.3 },
            {
              scale: 1,
              duration: 1.6,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: { trigger: piece, start: "top 92%" },
            },
          );
        });

        // parallax drift per piece
        gsap.utils.toArray<HTMLElement>(".v3-piece").forEach((piece) => {
          const speed = parseFloat(piece.dataset.speed ?? "0");
          if (!speed) return;
          gsap.fromTo(
            piece,
            { y: speed * 90 },
            {
              y: -speed * 90,
              ease: "none",
              scrollTrigger: { trigger: piece, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });

        // big titles: reveal style cycles per title (blur-focus / slide-skew /
        // scale-settle / letterspace-contract) with a random start offset so
        // repeat visits get a different sequence
        const titleReveals: gsap.TweenVars[] = [
          { autoAlpha: 0, y: 70, filter: "blur(20px)" },
          { autoAlpha: 0, x: -90, skewX: 7, filter: "blur(6px)" },
          { autoAlpha: 0, scale: 1.18, y: 30, filter: "blur(12px)", transformOrigin: "left bottom" },
          { autoAlpha: 0, y: 44, letterSpacing: "0.14em", filter: "blur(8px)" },
        ];
        const titleSeed = Math.floor(Math.random() * titleReveals.length);
        gsap.utils.toArray<HTMLElement>(".v3-blur-title").forEach((el, i) => {
          gsap.from(el, {
            ...titleReveals[(titleSeed + i) % titleReveals.length],
            duration: 1.15,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });

        // section index labels: tracking contracts as they surface
        gsap.utils.toArray<HTMLElement>(".v3-index").forEach((el) => {
          gsap.from(el, {
            autoAlpha: 0,
            letterSpacing: "0.6em",
            duration: 1.1,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 94%" },
          });
        });

        gsap.from(".v3-work__body, .v3-craft__body", {
          autoAlpha: 0,
          y: 34,
          duration: 1.0,
          ease: "power3.out",
          immediateRender: false,
          stagger: 0.1,
          scrollTrigger: { trigger: ".v3-work__head", start: "top 85%" },
        });

        gsap.from(".v3-path", {
          autoAlpha: 0,
          y: 60,
          duration: 1.0,
          stagger: 0.14,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-paths__split", start: "top 86%" },
        });

        // process steps: alternate slide-in from left/right instead of a uniform rise
        gsap.utils.toArray<HTMLElement>(".v3-step").forEach((el, i) => {
          gsap.from(el, {
            autoAlpha: 0,
            x: i % 2 === 0 ? -60 : 60,
            y: 30,
            duration: 0.95,
            delay: i * 0.12,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: ".v3-process__grid", start: "top 88%" },
          });
        });

        // quotes: tilt-in, each card from a slightly different angle
        gsap.utils.toArray<HTMLElement>(".v3-quote").forEach((el, i) => {
          gsap.from(el, {
            autoAlpha: 0,
            y: 50,
            rotate: i % 2 === 0 ? -3.5 : 3.5,
            transformOrigin: i % 2 === 0 ? "left bottom" : "right bottom",
            duration: 0.95,
            delay: i * 0.15,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: ".v3-voices__grid", start: "top 88%" },
          });
        });

        // education: video sinks into place while the copy column slides up past it
        gsap.from(".v3-edu__media", {
          autoAlpha: 0,
          y: 90,
          scale: 0.94,
          duration: 1.2,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-edu", start: "top 85%" },
        });
        gsap.from(".v3-edu__body, .v3-edu__program, .v3-edu__cta", {
          autoAlpha: 0,
          y: 46,
          duration: 1.0,
          stagger: 0.12,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-edu", start: "top 80%" },
        });
        // slow counter-parallax so the portrait video drifts against the scroll
        gsap.fromTo(
          ".v3-edu__media",
          { yPercent: 6 },
          {
            yPercent: -6,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: ".v3-edu", start: "top bottom", end: "bottom top", scrub: true },
          },
        );

        // marquee reacts to scroll velocity: skews with the scroll direction
        const marqueeTrack = document.querySelector<HTMLElement>(".v3-marquee__track");
        if (marqueeTrack) {
          const toSkew = gsap.quickTo(marqueeTrack, "skewX", { duration: 0.4, ease: "power2.out" });
          ScrollTrigger.create({
            trigger: ".v3-marquee",
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => toSkew(Math.max(-9, Math.min(9, self.getVelocity() / 260))),
          });
        }

        gsap.from(".v3-booking__panel", {
          autoAlpha: 0,
          y: 70,
          duration: 1.15,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-booking", start: "top 78%" },
        });
      }

      // pinned scrub stages drive their own --p (also under reduced motion —
      // these are position-only, no autoplaying movement)
      [".v3-craft", ".v3-finale"].forEach((selector) => {
        const section = document.querySelector<HTMLElement>(selector);
        if (!section) return;
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => {
            section.style.setProperty("--p", self.progress.toFixed(4));
            if (selector === ".v3-finale") finaleProgress.current = self.progress;
          },
        });
      });

      // chapter changes pump colored ink into the field — but each section gets
      // a different choreography (rising row / ring burst / diagonal sweep /
      // curtain fall / twin vortices), offset randomly per visit so the same
      // section doesn't always announce itself the same way.
      type InkPattern = (engine: FluidEngine) => void;
      const inkPatterns: InkPattern[] = [
        // rising row
        (engine) => {
          for (let i = 0; i < 4; i++) {
            engine.splat({
              x: 0.2 + i * 0.2,
              y: 0.25 + Math.random() * 0.2,
              dx: (Math.random() - 0.5) * 260,
              dy: 260 + Math.random() * 220,
              color: engine.chapterColor(0.15),
              radius: 0.0058,
            });
          }
        },
        // ring burst from a random off-center point
        (engine) => {
          const cx = 0.35 + Math.random() * 0.3;
          const cy = 0.4 + Math.random() * 0.25;
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            engine.splat({
              x: cx + Math.cos(a) * 0.04,
              y: cy + Math.sin(a) * 0.04,
              dx: Math.cos(a) * 340,
              dy: Math.sin(a) * 340,
              color: engine.chapterColor(0.12),
              radius: 0.0046,
            });
          }
        },
        // diagonal sweep, direction flips randomly
        (engine) => {
          const dir = Math.random() < 0.5 ? 1 : -1;
          for (let i = 0; i < 5; i++) {
            const t = i / 4;
            engine.splat({
              x: dir > 0 ? 0.12 + t * 0.76 : 0.88 - t * 0.76,
              y: 0.2 + t * 0.6,
              dx: dir * (240 + Math.random() * 120),
              dy: 140 + Math.random() * 100,
              color: engine.chapterColor(0.15),
              radius: 0.005,
            });
          }
        },
        // curtain fall from the top edge
        (engine) => {
          for (let i = 0; i < 5; i++) {
            engine.splat({
              x: 0.15 + i * 0.175,
              y: 0.85 + Math.random() * 0.08,
              dx: (Math.random() - 0.5) * 160,
              dy: -(260 + Math.random() * 200),
              color: engine.chapterColor(0.15),
              radius: 0.0052,
            });
          }
        },
        // twin counter-rotating vortices
        (engine) => {
          for (const [cx, spin] of [[0.32, 1], [0.68, -1]] as const) {
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2;
              engine.splat({
                x: cx + Math.cos(a) * 0.05,
                y: 0.5 + Math.sin(a) * 0.05,
                dx: -Math.sin(a) * 300 * spin,
                dy: Math.cos(a) * 300 * spin,
                color: engine.chapterColor(0.12),
                radius: 0.0044,
              });
            }
          }
        },
      ];
      const patternSeed = Math.floor(Math.random() * inkPatterns.length);
      [".v3-work", ".v3-craft", ".v3-process", ".v3-voices", ".v3-edu", ".v3-paths", ".v3-booking", ".v3-finale"].forEach((selector, idx) => {
        ScrollTrigger.create({
          trigger: selector,
          start: "top 75%",
          onEnter: () => {
            const engine = engineRef.current;
            if (!engine) return;
            inkPatterns[(patternSeed + idx) % inkPatterns.length](engine);
          },
        });
      });

      ScrollTrigger.refresh();
    });
    return () => ctx.revert();
  }, [ready]);

  return (
    <main className="v3-shell">
      {!ready && <Preloader onDone={() => setReady(true)} />}
      <FluidStage onEngine={handleEngine} />
      <CursorV3 />
      <Navigation locale={locale} setLocale={setLocale} labels={text.nav} />
      <VoltmeterV3 />
      <div className="v3-content">
        <HeroV3 subline={text.heroSubline} scrollCue={text.scroll} bookLabel={text.heroBook} callLabel={text.heroCall} />
        <WorkV3 index={text.workIndex} title={text.workTitle} body={text.workBody} allLabel={text.workAll} />
        <CraftV3 index={text.craftIndex} title={text.craftTitle} body={text.craftBody} />
        <ProcessV3 index={text.processIndex} title={text.processTitle} steps={text.processSteps} />
        <VoicesV3 index={text.voicesIndex} title={text.voicesTitle} voices={text.voices} />
        <EduV3
          index={text.eduIndex}
          title={text.eduTitle}
          body={text.eduBody}
          start={text.eduStart}
          pro={text.eduPro}
          action={text.eduAction}
        />
        <PathsV3
          index={text.pathsIndex}
          title={text.pathsTitle}
          consult={text.consult}
          consultMeta={text.consultMeta}
          consultAction={text.consultAction}
          inquiry={text.inquiry}
          inquiryMeta={text.inquiryMeta}
          inquiryAction={text.inquiryAction}
          onInkPush={pushInk}
        />
        <BookingV3 index={text.bookingIndex} title={text.bookingTitle} body={text.bookingBody}>
          <BookingChoice labels={text.bookingForm} locale={locale} initialMode="consult" />
        </BookingV3>
        <FinaleV3 title={text.finale} action={text.finalAction} />
      </div>
    </main>
  );
}
