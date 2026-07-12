"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { Craft } from "./Craft";
import { copy, Locale } from "./content";
import { Finale } from "./Finale";
import { Hero } from "./Hero";
import { InkScene } from "./InkScene";
import { Navigation } from "./Navigation";
import { Paths } from "./Paths";
import { Preloader } from "./Preloader";
import { normalizeScroll } from "./scroll";
import { Work } from "./Work";

export function LandingPage() {
  const [locale, setLocale] = useState<Locale>("sr");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState(0);
  const lastScroll = useRef(0);
  const text = copy[locale];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.075, smoothWheel: true });
    let frame = 0;
    const update = (time: number) => {
      lenis?.raf(time);
      ScrollTrigger.update();
      const nextScroll = window.scrollY;
      const nextProgress = normalizeScroll(nextScroll, document.documentElement.scrollHeight, window.innerHeight);
      setProgress(nextProgress);
      setVelocity((current) => current * 0.82 + Math.abs(nextScroll - lastScroll.current) * 0.18);
      lastScroll.current = nextScroll;
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); lenis?.destroy(); };
  }, []);

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      setPointer({ x: event.clientX / window.innerWidth * 2 - 1, y: -(event.clientY / window.innerHeight * 2 - 1) });
    };
    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    }, { threshold: 0.14 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [locale]);

  // Kinetic type: hero chars fly up on reveal, section titles focus-pull in on scroll.
  useEffect(() => {
    if (!ready) return;
    gsap.registerPlugin(SplitText, ScrollTrigger);
    const ctx = gsap.context(() => {
      const title = document.querySelector(".hero-v2__title");
      let split: SplitText | null = null;
      if (title) {
        split = new SplitText(title, { type: "chars" });
        gsap.from(split.chars, { yPercent: 130, autoAlpha: 0, stagger: 0.045, duration: 0.95, ease: "power4.out", delay: 0.1 });
      }

      gsap.utils.toArray<HTMLElement>([".work-v2__copy h2", ".craft__title", ".finale__line"]).forEach((element) => {
        gsap.from(element, {
          autoAlpha: 0,
          filter: "blur(22px)",
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 82%" },
        });
      });

      // Pinned scrubbing: drive each sticky chapter's --p from its OWN scroll span
      // (0 when the section top hits the viewport top, 1 when its bottom leaves).
      (["hero-v2", "work-v2", "craft-v2", "paths-v2"] as const).forEach((name) => {
        const section = document.querySelector<HTMLElement>(`.${name}`);
        if (!section) return;
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => section.style.setProperty("--p", self.progress.toFixed(4)),
        });
      });

      // Choreographed beats inside the pinned conversion stage.
      gsap.from(".branch--left", { xPercent: -8, autoAlpha: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".paths-v2", start: "top 60%" } });
      gsap.from(".branch--right", { xPercent: 8, autoAlpha: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".paths-v2", start: "top 60%" } });

      // Preloader just unlocked scroll and changed layout height — recompute trigger positions.
      ScrollTrigger.refresh();

      return () => split?.revert();
    });
    return () => ctx.revert();
  }, [ready]);

  return (
    <main className="site-shell" style={{ "--scroll-progress": progress } as React.CSSProperties}>
      {!ready && <Preloader onDone={() => setReady(true)} />}
      <InkScene progress={progress} pointer={pointer} velocity={velocity} />
      <Navigation locale={locale} setLocale={setLocale} labels={text.nav} />
      <div className="scroll-meter" aria-hidden="true"><span style={{ transform: `scaleY(${progress})` }} /></div>
      <Hero line={text.heroLine} subline={text.heroSubline} scroll={text.scroll} />
      <Work index={text.workIndex} title={text.workTitle} body={text.workBody} />
      <Craft index={text.craftIndex} title={text.craftTitle} body={text.craftBody} />
      <Paths index={text.pathsIndex} title={text.pathsTitle} consult={text.consult} consultMeta={text.consultMeta} consultAction={text.consultAction} inquiry={text.inquiry} inquiryMeta={text.inquiryMeta} inquiryAction={text.inquiryAction} />
      <Finale title={text.finale} action={text.finalAction} />
    </main>
  );
}
