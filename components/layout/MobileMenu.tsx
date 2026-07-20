"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { SITE } from "@/lib/site";
import { locales, type Locale } from "@/components/landing/content";

type MobileMenuProps = {
  labels: {
    work: string;
    process: string;
    portfolio: string;
    education: string;
    booking: string;
    reserve: string;
    account: string;
  };
  /** Fixed self-positioned trigger for route pages without a header. Omit when
   * nesting inside site-nav — that variant is placed by the flex layout instead. */
  variant?: "nav" | "route";
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  /** True only on the homepage, where #section hashes resolve without a path prefix. */
  isHome?: boolean;
};

// Full-screen ink-reveal menu shared by the homepage header and every route
// page (which otherwise has no persistent nav at all on mobile). One instance
// per mount owns its own open state — cheap enough, and keeps each page's
// header self-contained.
export function MobileMenu({ labels, variant = "route", locale, onLocaleChange, isHome = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const titleId = useId();

  // The overlay portals to <body> — nesting a position:fixed layer inside
  // .site-nav would trap it in that 88px bar, since backdrop-filter there
  // establishes a containing block for fixed descendants.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const prefix = isHome ? "" : "/";
  const links = [
    { key: "work", label: labels.work, href: `${prefix}#work` },
    { key: "process", label: labels.process, href: `${prefix}#craft` },
    { key: "portfolio", label: labels.portfolio, href: "/portfolio" },
    { key: "education", label: labels.education, href: "/edukacija" },
    { key: "booking", label: labels.booking, href: `${prefix}#booking` },
    { key: "account", label: labels.account, href: "/nalog" },
  ];

  const trigger = (
    <button
      type="button"
      className={`mnav__btn mnav__btn--${variant}${open ? " mnav__btn--open" : ""}`}
      aria-expanded={open}
      aria-controls={titleId}
      aria-label={open ? "Zatvori meni" : "Otvori meni"}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? <X size={20} strokeWidth={1.6} /> : <Menu size={20} strokeWidth={1.6} />}
    </button>
  );

  const overlay = (
    <div
      id={titleId}
      className={`mnav__overlay${open ? " mnav__overlay--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <nav className="mnav__panel" aria-label="Glavna navigacija">
        <ol className="mnav__list">
          {links.map((link, i) => {
            const current = pathname === link.href;
            return (
              <li key={link.key} className="mnav__item" style={{ transitionDelay: open ? `${240 + i * 70}ms` : "0ms" }}>
                <Link
                  href={link.href}
                  className="mnav__link"
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="mnav__index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mnav__label">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mnav__footer" style={{ transitionDelay: open ? `${240 + links.length * 70}ms` : "0ms" }}>
          {locale && onLocaleChange && (
            <div className="mnav__locale" aria-label="Jezik">
              {locales.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={locale === item}
                  onClick={() => onLocaleChange(item)}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <a className="mnav__cta" href={`${prefix}#booking`} onClick={() => setOpen(false)}>
            <span>{labels.reserve}</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </a>
          <a className="mnav__phone" href={`tel:${SITE.phone}`}>{SITE.phone}</a>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {trigger}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
