"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Locale, locales } from "./content";
import { MobileMenu } from "@/components/layout/MobileMenu";

type NavigationProps = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  labels: {
    work: string;
    process: string;
    portfolio: string;
    education: string;
    aftercare: string;
    booking: string;
    contact: string;
    reserve: string;
    account: string;
  };
};

export function Navigation({ locale, setLocale, labels }: NavigationProps) {
  return (
    <header className="site-nav">
      <a className="site-nav__brand" href="#top" aria-label="Dropz Tattoo home"><Image src="/media/dropz%20logo%20vektor%20OKVIR-01.webp" alt="Dropz Tattoo" width={168} height={100} priority /></a>
      <nav className="site-nav__links" aria-label="Glavna navigacija">
        <a href="#work">{labels.work}</a>
        <a href="#craft">{labels.process}</a>
        <Link href="/portfolio">{labels.portfolio}</Link>
        <Link href="/edukacija">{labels.education}</Link>
        <Link href="/aftercare">{labels.aftercare}</Link>
        <a href="#booking">{labels.booking}</a>
        <Link href="/kontakt">{labels.contact}</Link>
        <Link href="/nalog">{labels.account}</Link>
      </nav>
      <div className="site-nav__tools">
        <div className="locale-switcher" aria-label="Jezik">
          {locales.map((item) => (
            <button key={item} type="button" onClick={() => setLocale(item)} aria-pressed={locale === item}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <a className="nav-cta" href="#booking">
          <span>{labels.reserve}</span><ArrowUpRight size={16} strokeWidth={1.5} />
        </a>
        <MobileMenu labels={labels} variant="nav" locale={locale} onLocaleChange={setLocale} isHome />
      </div>
    </header>
  );
}
