import Link from "next/link";
import { SITE } from "@/lib/site";
import { isOpenDay, weekHours } from "@/lib/hours";

// Every route-shell page was previously footer-less, so the studio's address
// appeared nowhere on the site — Google cross-checks on-page NAP against the
// Business Profile, and assistants read it as the citation. Rendered from
// lib/site.ts so it can never drift from the JSON-LD.

const LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/artisti", label: "Artisti" },
  { href: "/booking", label: "Termini" },
  { href: "/upit", label: "Upit" },
  { href: "/edukacija", label: "Edukacija" },
  { href: "/aftercare", label: "Nega tetovaže" },
  { href: "/kontakt", label: "Kontakt" },
];

export function SiteFooter() {
  const week = weekHours();

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <section className="site-footer__block">
          <h2>Dropz Tattoo Studio</h2>
          <address>
            {SITE.street}
            <br />
            {SITE.postalCode} {SITE.city}, Srbija
          </address>
          <a href={`tel:${SITE.phone}`}>{SITE.phoneDisplay}</a>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </section>

        <section className="site-footer__block">
          <h2>Radno vreme</h2>
          <dl className="site-footer__hours">
            {week.map((d) => (
              <div key={d.day}>
                <dt>{d.short}</dt>
                <dd>{isOpenDay(d) ? `${d.opens}–${d.closes}` : "Zatvoreno"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="site-footer__block">
          <h2>Studio</h2>
          <ul className="site-footer__links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="site-footer__block">
          <h2>Pratite nas</h2>
          <ul className="site-footer__links">
            <li>
              <a href={SITE.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={SITE.googleMaps} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            </li>
          </ul>
        </section>
      </div>

      <p className="site-footer__legal">
        © {new Date().getFullYear()} {SITE.name} — tattoo studio u Nišu. Autorske tetovaže,
        besplatne konsultacije i online rezervacija termina.
      </p>
    </footer>
  );
}
