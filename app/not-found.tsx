import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Stranica nije pronađena",
  robots: { index: false, follow: true },
};

// A dead end used to hit the bare Next default. Link out into the site so a 404
// from a stale SERP result or an old shared link still converts.
const LINKS = [
  { href: "/portfolio", label: "Portfolio", desc: "Autorski radovi studija po stilovima" },
  { href: "/booking", label: "Zakaži termin", desc: "Besplatna konsultacija, online kalendar" },
  { href: "/edukacija", label: "Edukacija", desc: "START i PRO tattoo obuke" },
  { href: "/kontakt", label: "Kontakt", desc: "Adresa, telefon i radno vreme" },
];

export default function NotFound() {
  return (
    <main className="route-shell notfound">
      <RouteChrome />
      <div className="route-index">Greška 404</div>
      <h1>Ova strana<br />ne postoji.</h1>
      <p>
        Link je verovatno star ili pogrešno otkucan. Evo gde većina ljudi ionako ide:
      </p>

      <ul className="notfound__links">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>
              <span>
                <strong>{link.label}</strong>
                <small>{link.desc}</small>
              </span>
              <ArrowUpRight size={16} strokeWidth={1.5} />
            </Link>
          </li>
        ))}
      </ul>

      <SiteFooter />
    </main>
  );
}
