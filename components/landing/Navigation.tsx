"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Locale, locales } from "./content";

type NavigationProps = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  labels: { work: string; process: string; booking: string; reserve: string };
};

export function Navigation({ locale, setLocale, labels }: NavigationProps) {
  return (
    <header className="site-nav">
      <a className="site-nav__brand" href="#top" aria-label="Dropz Tattoo home"><Image src="/media/dropz%20logo%20vektor%20OKVIR-01.png" alt="Dropz Tattoo" width={168} height={100} priority /></a>
      <nav className="site-nav__links" aria-label="Glavna navigacija">
        <a href="#work">{labels.work}</a>
        <a href="#craft">{labels.process}</a>
        <a href="#booking">{labels.booking}</a>
      </nav>
      <div className="site-nav__tools">
        <div className="locale-switcher" aria-label="Jezik">
          {locales.map((item) => (
            <button key={item} type="button" onClick={() => setLocale(item)} aria-pressed={locale === item}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <Link className="nav-cta" href="/booking">
          <span>{labels.reserve}</span><ArrowUpRight size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  );
}
