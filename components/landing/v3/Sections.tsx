"use client";

// v3 sections — editorial DOM overlay floating above the fluid. Sections are
// transparent (the ink shows through everywhere); legibility comes from local
// scrims behind text, never from dimming the whole scene.

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// ---------- Hero ----------

export function HeroV3({ subline, scrollCue }: { subline: string; scrollCue: string }) {
  return (
    <section className="v3-hero" id="top">
      <p className="v3-hero__meta">
        <span>Dropz Tattoo — Niš</span>
        <span>Custom ink only</span>
      </p>
      <h1 className="v3-hero__title" aria-label="Ink is energy.">
        <span className="v3-line"><i>INK IS</i></span>
        <span className="v3-line"><i>ENERGY.</i></span>
      </h1>
      <p className="v3-hero__sub">{subline}</p>
      <div className="v3-hero__cue" aria-hidden="true">
        <i />
        <span>{scrollCue}</span>
      </div>
    </section>
  );
}

// ---------- Work ----------

const pieces = [
  { src: "/media/DSC04808.jpeg", alt: "Blackwork tattoo detail", cap: "001 — Blackwork", cls: "v3-piece--a", speed: 0.4 },
  { src: "/media/IMG_2288.jpeg", alt: "Custom tattoo composition", cap: "002 — Composition", cls: "v3-piece--b", speed: -0.6 },
  { src: "/media/IMG_8123.jpeg", alt: "Finished piece", cap: "003 — Fine line", cls: "v3-piece--c", speed: 0.8 },
  { src: "/media/IMG_0941.jpeg", alt: "Tattoo artwork", cap: "004 — Ornamental", cls: "v3-piece--d", speed: -0.4 },
  { src: "/media/FullSizeRender.jpeg", alt: "Line work", cap: "005 — Linework", cls: "v3-piece--e", speed: 0.6 },
  { src: "/media/IMG_4676.jpeg", alt: "Fine line detail", cap: "006 — Detail", cls: "v3-piece--f", speed: -0.8 },
] as const;

const marqueeTerms = ["Blackwork", "Fine line", "Ornamental", "Lettering", "Custom", "Cover-up", "Ignorant", "Dotwork"];

export function WorkV3({ index, title, body }: { index: string; title: string; body: string }) {
  const track = [...marqueeTerms, ...marqueeTerms];
  return (
    <section className="v3-work" id="work">
      <header className="v3-work__head">
        <span className="v3-index">{index}</span>
        <h2 className="v3-work__title v3-blur-title">{title}</h2>
        <p className="v3-work__body">{body}</p>
      </header>
      <div className="v3-marquee" aria-hidden="true">
        <div className="v3-marquee__track">
          {track.map((term, i) => (
            <span key={i}>{term}<em>◆</em></span>
          ))}
        </div>
      </div>
      <div className="v3-work__grid">
        {pieces.map((piece) => (
          <figure key={piece.src} className={`v3-piece ${piece.cls}`} data-speed={piece.speed}>
            <div className="v3-piece__mask">
              <Image src={piece.src} alt={piece.alt} fill sizes="(max-width: 700px) 92vw, 44vw" quality={70} />
            </div>
            <figcaption>{piece.cap}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// ---------- Craft ----------

export function CraftV3({ index, title, body }: { index: string; title: string; body: string }) {
  const lines = title.split(". ").map((line, i, arr) => (i < arr.length - 1 ? `${line}.` : line));
  return (
    <section className="v3-craft" id="craft">
      <div className="v3-craft__stage">
        <video
          className="v3-craft__video"
          poster="/media/dragan-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/media/dragan-loop.webm" type="video/webm" />
          <source src="/media/dragan-loop.mp4" type="video/mp4" />
        </video>
        <div className="v3-craft__shade" />
        <span className="v3-index v3-craft__index">{index}</span>
        <h2 className="v3-craft__manifesto" aria-label={title}>
          {lines.map((line, i) => (
            <span key={i} className="v3-craft__line">{line}</span>
          ))}
        </h2>
        <p className="v3-craft__body">{body}</p>
      </div>
    </section>
  );
}

// ---------- Paths ----------

type PathsProps = {
  index: string;
  title: string;
  consult: string;
  consultMeta: string;
  consultAction: string;
  inquiry: string;
  inquiryMeta: string;
  inquiryAction: string;
  onInkPush: (x: number, y: number) => void;
};

export function PathsV3(props: PathsProps) {
  const push = (event: React.PointerEvent) => props.onInkPush(event.clientX, event.clientY);
  return (
    <section className="v3-paths" id="paths">
      <span className="v3-index v3-paths__index">{props.index}</span>
      <h2 className="v3-paths__title v3-blur-title">{props.title}</h2>
      <div className="v3-paths__split">
        <Link href="/booking" className="v3-path" data-magnetic onPointerEnter={push} onPointerDown={push}>
          <small>{props.consultMeta}</small>
          <strong>{props.consult}</strong>
          <span>{props.consultAction} <ArrowUpRight size={15} strokeWidth={1.6} /></span>
        </Link>
        <i className="v3-paths__divider" aria-hidden="true" />
        <Link href="/upit" className="v3-path" data-magnetic onPointerEnter={push} onPointerDown={push}>
          <small>{props.inquiryMeta}</small>
          <strong>{props.inquiry}</strong>
          <span>{props.inquiryAction} <ArrowUpRight size={15} strokeWidth={1.6} /></span>
        </Link>
      </div>
    </section>
  );
}

// ---------- Finale ----------

export function FinaleV3({ title, action }: { title: string; action: string }) {
  return (
    <section className="v3-finale" id="booking">
      <div className="v3-finale__stage">
        <p className="v3-finale__line">{title}</p>
        {/* crisp wordmark snaps in as the ink resolves; black jpg background drops out via screen blend */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="v3-finale__logo" src="/media/logo.jpg" alt="Dropz Tattoo" loading="lazy" />
        <Link className="v3-finale__cta" data-magnetic href="/booking">
          <span>{action}</span>
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </Link>
        <footer className="v3-finale__footer">
          <span>Niš, Srbija</span>
          <span>Uto–Sub · 11–19h</span>
          <a href="https://www.instagram.com/dropztattoo" target="_blank" rel="noreferrer">Instagram</a>
          <span>© Dropz Tattoo</span>
        </footer>
      </div>
    </section>
  );
}
