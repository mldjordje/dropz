import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, Phone, Mail, Clock } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { SITE } from "@/lib/site";
import { isOpenDay, weekHours } from "@/lib/hours";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Dropz Tattoo Studio — Generala Černjajeva, 18108 Niš. Telefon 060 145 3087, besplatne konsultacije i online rezervacija termina. Radno vreme, adresa i mapa.",
  alternates: { canonical: "/kontakt" },
};

// The local-SEO staple the site was missing: one page that states the full NAP
// in plain HTML, matching the Google Business Profile character for character.
// Everything renders from lib/site.ts — see docs/08.
export default function ContactPage() {
  const week = weekHours();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${SITE.url}/kontakt#page`,
    url: `${SITE.url}/kontakt`,
    name: `Kontakt — ${SITE.name}`,
    inLanguage: "sr-RS",
    about: { "@id": `${SITE.url}/#business` },
    mainEntity: { "@id": `${SITE.url}/#business` },
  };

  return (
    <main className="route-shell kontakt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd items={[{ name: "Kontakt", path: "/kontakt" }]} />
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">Kontakt</div>
      <h1>Nađi nas<br />u Nišu.</h1>
      <p>
        Dropz Tattoo Studio se nalazi u Nišu, u ulici {SITE.street}. Za termin nije potrebno
        da dolaziš unapred — konsultacija je besplatna i zakazuje se online, a možeš i samo
        da pozoveš.
      </p>

      <div className="kontakt__grid">
        <section className="kontakt__card">
          <h2><MapPin size={15} strokeWidth={1.6} /> Adresa</h2>
          <address>
            {SITE.name}
            <br />
            {SITE.street}
            <br />
            {SITE.postalCode} {SITE.city}, Srbija
          </address>
          <a className="kontakt__link" href={SITE.googleMaps} target="_blank" rel="noreferrer">
            Otvori u Google Mapama <ArrowUpRight size={14} strokeWidth={1.6} />
          </a>
        </section>

        <section className="kontakt__card">
          <h2><Phone size={15} strokeWidth={1.6} /> Telefon i mejl</h2>
          <a className="kontakt__big" href={`tel:${SITE.phone}`}>{SITE.phoneDisplay}</a>
          <a className="kontakt__link" href={`mailto:${SITE.email}`}>
            <Mail size={14} strokeWidth={1.6} /> {SITE.email}
          </a>
          <a className="kontakt__link" href={SITE.instagram} target="_blank" rel="noreferrer">
            Instagram <ArrowUpRight size={14} strokeWidth={1.6} />
          </a>
        </section>

        <section className="kontakt__card">
          <h2><Clock size={15} strokeWidth={1.6} /> Radno vreme</h2>
          <dl className="kontakt__hours">
            {week.map((d) => (
              <div key={d.day} className={isOpenDay(d) ? undefined : "is-closed"}>
                <dt>{d.long}</dt>
                <dd>{isOpenDay(d) ? `${d.opens} — ${d.closes}` : "Zatvoreno"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="kontakt__cta">
        <h2>Kako do termina</h2>
        <p>
          Ako još nemaš gotovu ideju, zakaži besplatnu konsultaciju — kratak razgovor o motivu,
          veličini i mestu na telu. Ako već znaš šta želiš, pošalji upit sa referencama i dobićeš
          procenu cene i trajanja pre nego što biraš termin.
        </p>
        <div className="kontakt__actions">
          <Link className="route-contact" href="/booking">
            Zakaži konsultaciju <ArrowUpRight size={15} strokeWidth={1.6} />
          </Link>
          <Link className="kontakt__alt" href="/upit">Pošalji upit sa idejom</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
