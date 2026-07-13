"use client";

// v3 landing: one continuous fluid-ink "session". A single scroll source drives
// the engine's uProgress AND every DOM reveal; the page ends with the ink
// resolving into the wordmark and igniting. See docs/07.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import { FluidEngine } from "@/lib/fluid/engine";
import { BookingForm } from "../../booking/BookingForm";
import { copy, Locale } from "../content";
import { Navigation } from "../Navigation";
import { Preloader } from "../Preloader";
import { CursorV3 } from "./CursorV3";
import { FluidStage } from "./FluidStage";
import { buildLogoMask } from "./logoMask";
import { BookingV3, CraftV3, FinaleV3, HeroV3, PathsV3, ProcessV3, VoicesV3, WorkV3 } from "./Sections";

export function LandingV3() {
  const [locale, setLocale] = useState<Locale>("sr");
  const [ready, setReady] = useState(false);
  const engineRef = useRef<FluidEngine | null>(null);
  const finaleProgress = useRef(0);
  const text = copy[locale];

  const handleEngine = useCallback((engine: FluidEngine | null) => {
    engineRef.current = engine;
    if (!engine) return;
    buildLogoMask("/media/logo.jpg", window.innerWidth / window.innerHeight)
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
        engine.setProgress(max > 0 ? window.scrollY / max : 0);

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
        gsap.from(".v3-hero__sub, .v3-hero__cue, .v3-hero__meta", {
          autoAlpha: 0,
          y: 26,
          duration: 1.0,
          stagger: 0.12,
          delay: 0.85,
          ease: "power3.out",
          immediateRender: false,
        });

        // portfolio: ink-wipe reveals firing the moment each piece enters
        gsap.utils.toArray<HTMLElement>(".v3-piece").forEach((piece) => {
          const mask = piece.querySelector(".v3-piece__mask");
          const img = piece.querySelector("img");
          if (!mask || !img) return;
          gsap.fromTo(
            mask,
            { clipPath: "inset(100% 0% 0% 0%)" },
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

        // big titles: blur-focus in, early
        gsap.utils.toArray<HTMLElement>(".v3-blur-title").forEach((el) => {
          gsap.from(el, {
            autoAlpha: 0,
            y: 70,
            filter: "blur(20px)",
            duration: 1.15,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 88%" },
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

        gsap.from(".v3-step", {
          autoAlpha: 0,
          y: 54,
          duration: 0.95,
          stagger: 0.12,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-process__grid", start: "top 88%" },
        });

        gsap.from(".v3-quote", {
          autoAlpha: 0,
          y: 50,
          duration: 0.95,
          stagger: 0.15,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: ".v3-voices__grid", start: "top 88%" },
        });

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

      // chapter changes pump a row of colored ink into the field (soft rise,
      // matching the slower scroll injection)
      [".v3-work", ".v3-craft", ".v3-process", ".v3-voices", ".v3-paths", ".v3-booking", ".v3-finale"].forEach((selector) => {
        ScrollTrigger.create({
          trigger: selector,
          start: "top 75%",
          onEnter: () => {
            const engine = engineRef.current;
            if (!engine) return;
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
      <div className="v3-content">
        <HeroV3 subline={text.heroSubline} scrollCue={text.scroll} />
        <WorkV3 index={text.workIndex} title={text.workTitle} body={text.workBody} />
        <CraftV3 index={text.craftIndex} title={text.craftTitle} body={text.craftBody} />
        <ProcessV3 index={text.processIndex} title={text.processTitle} steps={text.processSteps} />
        <VoicesV3 index={text.voicesIndex} title={text.voicesTitle} voices={text.voices} />
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
          <BookingForm labels={text.bookingForm} locale={locale} />
        </BookingV3>
        <FinaleV3 title={text.finale} action={text.finalAction} />
      </div>
    </main>
  );
}
