"use client";

// v3 sections — editorial DOM overlay floating above the fluid. Sections are
// transparent (the ink shows through everywhere); legibility comes from local
// scrims behind text, never from dimming the whole scene.

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ---------- Hero ----------

type HeroProps = {
  subline: string;
  scrollCue: string;
  bookLabel: string;
  callLabel: string;
};

export function HeroV3({ subline, scrollCue, bookLabel, callLabel }: HeroProps) {
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
      <div className="v3-hero__actions">
        {/* primary: rotating conic border + ink fill rising on hover */}
        <a href="#booking" className="v3-cta v3-cta--book" data-magnetic>
          <span className="v3-cta__frame" aria-hidden="true" />
          <span className="v3-cta__ink" aria-hidden="true" />
          <span className="v3-cta__label">
            <i>{bookLabel}</i>
            <i aria-hidden="true">{bookLabel}</i>
          </span>
          <ArrowUpRight className="v3-cta__icon" size={15} strokeWidth={1.6} />
        </a>
        {/* secondary: ghost with live pulsing dot */}
        <a href="tel:0601453087" className="v3-cta v3-cta--call" data-magnetic>
          <span className="v3-cta__pulse" aria-hidden="true" />
          <span className="v3-cta__label">
            <i>{callLabel}</i>
            <i aria-hidden="true">{callLabel}</i>
          </span>
          <Phone className="v3-cta__icon" size={13} strokeWidth={1.6} />
        </a>
      </div>
      <div className="v3-hero__cue" aria-hidden="true">
        <i />
        <span>{scrollCue}</span>
      </div>
    </section>
  );
}

// ---------- Work ----------

// Static fallback gallery — used whenever the DB has no portfolio works yet
// (or is unreachable), so the section never looks broken.
// Captions stay style-neutral here — real titles come from the admin
// (portfolio works with the "Landing" flag), where each caption is editable.
const pieces = [
  { src: "/media/DSC04808.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 001", cls: "v3-piece--a", speed: 0.4 },
  { src: "/media/IMG_2288.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 002", cls: "v3-piece--b", speed: -0.6 },
  { src: "/media/IMG_8123.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 003", cls: "v3-piece--c", speed: 0.8 },
  { src: "/media/IMG_0941.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 004", cls: "v3-piece--d", speed: -0.4 },
  { src: "/media/FullSizeRender.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 005", cls: "v3-piece--e", speed: 0.6 },
  { src: "/media/IMG_4676.jpeg", alt: "Dropz tattoo rad", cap: "Dropz — 006", cls: "v3-piece--f", speed: -0.8 },
] as const;

// Positional layout classes cycle for DB-sourced works so the scattered
// editorial grid still holds regardless of how many pieces the admin adds.
const POSITIONS = [
  { cls: "v3-piece--a", speed: 0.4 },
  { cls: "v3-piece--b", speed: -0.6 },
  { cls: "v3-piece--c", speed: 0.8 },
  { cls: "v3-piece--d", speed: -0.4 },
  { cls: "v3-piece--e", speed: 0.6 },
  { cls: "v3-piece--f", speed: -0.8 },
] as const;

const marqueeTerms = ["Realizam", "Hiperrealizam", "Portreti", "Black&Grey", "Fine line", "Custom", "Cover-up", "Chicano", "Japanese", "American Traditional"];

type ApiCategory = { id: number; name: string; slug: string };
type ApiWork = { id: number; title: string; image_url: string; category_id: number | null; alt?: string | null; featured?: boolean };

type GalleryItem = {
  key: string;
  src: string;
  alt: string;
  cap: string;
  cls: string;
  speed: number;
  categoryId: number | null;
};

const ALL_FILTER = "all";

export function WorkV3({ index, title, body, allLabel }: { index: string; title: string; body: string; allLabel: string }) {
  const track = [...marqueeTerms, ...marqueeTerms];
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [dbWorks, setDbWorks] = useState<ApiWork[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<number | typeof ALL_FILTER>(ALL_FILTER);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portfolio", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        if (Array.isArray(data.works) && data.works.length > 0) {
          // Landing shows only works flagged for it; if none are flagged, show all.
          const all = data.works as ApiWork[];
          const featured = all.filter((w) => w.featured !== false);
          setDbWorks(featured.length > 0 ? featured : all);
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
      })
      .catch(() => {
        // network/DB unreachable — keep the static fallback gallery
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items: GalleryItem[] = useMemo(() => {
    if (dbWorks && dbWorks.length > 0) {
      return dbWorks.map((w, i) => {
        const pos = POSITIONS[i % POSITIONS.length];
        return {
          key: `db-${w.id}`,
          src: w.image_url,
          alt: w.alt || w.title,
          cap: w.title,
          cls: pos.cls,
          speed: pos.speed,
          categoryId: w.category_id,
        };
      });
    }
    return pieces.map((p) => ({
      key: p.src,
      src: p.src,
      alt: p.alt,
      cap: p.cap,
      cls: p.cls,
      speed: p.speed,
      categoryId: null,
    }));
  }, [dbWorks]);

  // Only offer chips for categories that actually have a work attached.
  const usableCategories = useMemo(
    () => categories.filter((c) => (dbWorks ?? []).some((w) => w.category_id === c.id)),
    [categories, dbWorks],
  );

  const visibleItems = activeFilter === ALL_FILTER ? items : items.filter((it) => it.categoryId === activeFilter);

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
      {usableCategories.length > 0 && (
        <div className="v3-work__filters" role="group" aria-label={allLabel}>
          <button
            type="button"
            className="v3-filter"
            aria-pressed={activeFilter === ALL_FILTER}
            onClick={() => setActiveFilter(ALL_FILTER)}
          >
            {allLabel}
          </button>
          {usableCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="v3-filter"
              aria-pressed={activeFilter === c.id}
              onClick={() => setActiveFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="v3-work__grid">
        {visibleItems.map((piece) => (
          <figure key={piece.key} className={`v3-piece ${piece.cls}`} data-speed={piece.speed}>
            <div className="v3-piece__mask">
              <Image src={piece.src} alt={piece.alt} fill sizes="(max-width: 700px) 92vw, 44vw" quality={70} unoptimized={piece.key.startsWith("db-")} />
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

// ---------- Process ----------

type Step = { readonly title: string; readonly body: string };

export function ProcessV3({ index, title, steps }: { index: string; title: string; steps: readonly Step[] }) {
  return (
    <section className="v3-process" id="process">
      <span className="v3-index">{index}</span>
      <h2 className="v3-process__title v3-blur-title">{title}</h2>
      <ol className="v3-process__grid">
        {steps.map((step, i) => (
          <li key={step.title} className="v3-step">
            <span className="v3-step__num">{String(i + 1).padStart(2, "0")}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- Voices ----------

type Voice = { readonly quote: string; readonly author: string };

export function VoicesV3({ index, title, voices }: { index: string; title: string; voices: readonly Voice[] }) {
  return (
    <section className="v3-voices" id="voices">
      <span className="v3-index">{index}</span>
      <h2 className="v3-voices__title v3-blur-title">{title}</h2>
      <div className="v3-voices__grid">
        {voices.map((voice) => (
          <blockquote key={voice.author} className="v3-quote">
            <p>“{voice.quote}”</p>
            <cite>{voice.author}</cite>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

// ---------- Education ----------

type EduProgram = { readonly name: string; readonly meta: string; readonly desc: string };

type EduProps = {
  index: string;
  title: string;
  body: string;
  start: EduProgram;
  pro: EduProgram;
  action: string;
};

export function EduV3({ index, title, body, start, pro, action }: EduProps) {
  return (
    <section className="v3-edu" id="edukacija">
      <div className="v3-edu__media" aria-hidden="true">
        <video
          className="v3-edu__video"
          poster="/media/dragan-skola-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/media/dragan-skola.mp4" type="video/mp4" />
        </video>
        <span className="v3-edu__media-frame" />
      </div>
      <div className="v3-edu__copy">
        <span className="v3-index">{index}</span>
        <h2 className="v3-edu__title v3-blur-title">{title}</h2>
        <p className="v3-edu__body">{body}</p>
        <div className="v3-edu__programs">
          {[start, pro].map((program) => (
            <Link key={program.name} href="/edukacija" className="v3-edu__program" data-magnetic>
              <strong>{program.name}</strong>
              <small>{program.meta}</small>
              <p>{program.desc}</p>
            </Link>
          ))}
        </div>
        <Link href="/edukacija" className="v3-edu__cta" data-magnetic>
          <span>{action}</span>
          <ArrowUpRight size={15} strokeWidth={1.6} />
        </Link>
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
        <a href="#booking" className="v3-path" data-magnetic onPointerEnter={push} onPointerDown={push}>
          <small>{props.consultMeta}</small>
          <strong>{props.consult}</strong>
          <span>{props.consultAction} <ArrowUpRight size={15} strokeWidth={1.6} /></span>
        </a>
        <i className="v3-paths__divider" aria-hidden="true" />
        <Link href="/nalog?novi=1" className="v3-path" data-magnetic onPointerEnter={push} onPointerDown={push}>
          <small>{props.inquiryMeta}</small>
          <strong>{props.inquiry}</strong>
          <span>{props.inquiryAction} <ArrowUpRight size={15} strokeWidth={1.6} /></span>
        </Link>
      </div>
    </section>
  );
}

// ---------- Booking ----------

type BookingProps = {
  index: string;
  title: string;
  body: string;
  children: React.ReactNode; // the form (client state lives in BookingForm)
};

export function BookingV3({ index, title, body, children }: BookingProps) {
  return (
    <section className="v3-booking" id="booking">
      <header className="v3-booking__head">
        <span className="v3-index">{index}</span>
        <h2 className="v3-booking__title v3-blur-title">{title}</h2>
        <p className="v3-booking__body">{body}</p>
      </header>
      <div className="v3-booking__panel">{children}</div>
    </section>
  );
}

// ---------- Finale ----------

export function FinaleV3({ title, action }: { title: string; action: string }) {
  return (
    <section className="v3-finale" id="finale">
      <div className="v3-finale__stage">
        <p className="v3-finale__line">{title}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="v3-finale__logo" src="/media/dropz%20logo%20vektor%20OKVIR-01.png" alt="Dropz Tattoo" loading="lazy" />
        <a className="v3-finale__cta" data-magnetic href="#booking">
          <span>{action}</span>
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </a>
        <footer className="v3-finale__footer">
          <span>Niš, Srbija</span>
          <span>Uto–Sub · 11–19h</span>
          <a href="tel:0601453087">060 1453087</a>
          <a href="https://www.instagram.com/dropz.tattoo/" target="_blank" rel="noreferrer">Instagram</a>
          <span>© Dropz Tattoo</span>
        </footer>
      </div>
    </section>
  );
}
