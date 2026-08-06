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
    inquiry: string;
    directions: string;
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
        <Link href="/booking">{labels.booking}</Link>
        <Link href="/upit">{labels.inquiry}</Link>
        <a href="#location">{labels.directions}</a>
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
        {/* Lands on /booking, where consultation and inquiry are both offered —
            the old /upit target hid the consultation path entirely. */}
        <Link className="nav-cta" href="/booking" aria-label={labels.reserve}>
          <span>{labels.reserve}</span><ArrowUpRight size={16} strokeWidth={1.5} />
        </Link>
        <MobileMenu labels={labels} variant="nav" locale={locale} onLocaleChange={setLocale} isHome />
      </div>
    </header>
  );
}
