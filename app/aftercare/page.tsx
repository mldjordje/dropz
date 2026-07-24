import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, AlertTriangle } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Nega tetovaže — uputstvo",
  description:
    "Kompletno uputstvo za negu tetovaže posle tetoviranja u Dropz Tattoo Studiju u Nišu — kako da tetovaža pravilno zaraste, faza po faza, i kada da se javiš lekaru.",
  alternates: { canonical: "/aftercare" },
};

const doItems = [
  "Peri ruke pre svakog dodirivanja tetovaže",
  "Peri tetovažu blagim sapunom bez mirisa, mlakom vodom",
  "Nanosi tanak sloj preporučene kreme ili pantenola",
  "Nosi labavu, čistu odeću preko tetovaže",
  "Koristi zaštitu od sunca (SPF 50) i posle zarastanja",
  "Strpljivo prati sve faze zarastanja",
];

const dontItems = [
  "Ne čačkaj, ne grebi i ne skidaj krastice",
  "Ne izlaži tetovažu suncu, solarijumu ni moru dok ne zaraste",
  "Ne kupaj se u bazenu, moru ili kadi — tuš je u redu",
  "Ne nanosi debele slojeve kreme ni vazelin",
  "Ne nosi tesnu odeću ili opremu koja trlja po tetovaži",
  "Ne bavi se intenzivnim sportom i znojenjem prvih dana",
];

const warningItems = [
  "Bol i crvenilo koji se šire ili se pojačavaju posle par dana",
  "Gnojni iscedak ili neprijatan miris",
  "Povišena telesna temperatura",
  "Jak otok koji ne prolazi",
];

export default function AftercarePage() {
  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">Nega tetovaže</div>
      <h1>Nega je pola<br />tetovaže.</h1>

      <section className="edu-intro">
        <div className="edu-intro__copy">
          <p>
            Kako će tetovaža izgledati za godinu dana ne zavisi samo od artiste — zavisi i od toga koliko
            pažljivo je neguješ dok zarasta. Ispod je uputstvo koje pratimo u Dropz Tattoo Studiju u Nišu,
            faza po faza, od prvih sati do potpunog zarastanja.
          </p>
          <p className="edu-intro__note">
            Svaki artista ti daje i usmeno uputstvo posle tetoviranja — ono ima prednost ako se u nečemu
            razlikuje od ovog teksta.
          </p>
        </div>
      </section>

      <section className="edu-programs">
        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Faza 1</span>
            <h2>Prvih par sati</h2>
            <p className="edu-program__meta"><span>0–4h</span></p>
          </header>
          <p className="edu-program__lede">
            Prvi zavoj ili foliju skidaš po uputstvu svog artiste — obično posle 2 do 4 sata. Posle toga
            tetovažu prvi put pereš čistim rukama.
          </p>
          <h3>Šta da radiš</h3>
          <ul>
            {[
              "Operi ruke pre nego što dotakneš zavoj",
              "Skini zavoj/foliju u vremenu koje ti je artista rekao",
              "Operi tetovažu blagim sapunom bez mirisa, mlakom vodom",
              "Tapkaj čistim peškirom ili papirnim ubrusom, ne trljaj",
            ].map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Faza 2</span>
            <h2>Prva nedelja</h2>
            <p className="edu-program__meta"><span>Dan 1–7</span></p>
          </header>
          <p className="edu-program__lede">
            Prve dane tetovaža je najosetljivija. Redovna higijena i tanak sloj hidratacije su sve što joj
            je potrebno — više nije bolje.
          </p>
          <h3>Šta da radiš</h3>
          <ul>
            {[
              "Peri tetovažu 2–3 puta dnevno",
              "Nanesi tanak sloj pantenola ili kreme koju ti je artista preporučio",
              "Ostavi tetovažu nepokrivenu da diše",
              "Spavaj na čistoj posteljini, po mogućstvu tetovaža da ne dodiruje čaršav",
              "Nosi laganu, čistu odeću koja ne trlja po koži",
            ].map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Faza 3</span>
            <h2>Perutanje</h2>
            <p className="edu-program__meta"><span>Nedelja 2–4</span></p>
          </header>
          <p className="edu-program__lede">
            Svrab i perutanje kože su potpuno normalan deo procesa — koža se obnavlja. Ovo je faza u kojoj
            je najlakše oštetiti tetovažu, zato je strpljenje ključno.
          </p>
          <h3>Šta da radiš</h3>
          <ul>
            {[
              "Nastavi redovno pranje i tanku hidrataciju",
              "Pusti krastice da same otpadnu",
              "Blago potapšaj kožu ako svrbi, umesto grebanja",
              "Nastavi da nosiš laganu odeću preko tetovaže",
            ].map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Faza 4</span>
            <h2>Potpuno zarastanje</h2>
            <p className="edu-program__meta"><span>2 nedelje – 2 meseca</span></p>
          </header>
          <p className="edu-program__lede">
            Površina kože izgleda zaceljeno posle otprilike 2–3 nedelje, ali dublji slojevi kože nastavljaju
            da zarastaju i do 2 meseca. Zaštita od sunca je nešto što ostaje trajno.
          </p>
          <h3>Šta da radiš</h3>
          <ul>
            {[
              "Hidriraj kožu i posle vidljivog zarastanja",
              "Koristi zaštitu od sunca (SPF 50) svaki put kad je tetovaža izložena suncu",
              "Izbegavaj solarijum trajno na predelu tetovaže",
              "Javi se artisti ako primetiš da je boja neravnomerno primljena",
            ].map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Da</span>
            <h2>Šta DA radiš</h2>
          </header>
          <ul>
            {doItems.map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Ne</span>
            <h2>Šta NE radiš</h2>
          </header>
          <ul>
            {dontItems.map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
        </article>

        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Važno</span>
            <h3><AlertTriangle size={16} strokeWidth={2} /> Kad se javiti lekaru</h3>
          </header>
          <p className="edu-program__lede">
            Blago crvenilo, toplota i osetljivost prvih dana su normalni. Javi se lekaru ili u hitnu pomoć
            ako primetiš:
          </p>
          <ul>
            {warningItems.map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
          <p className="edu-program__goal">
            Ovo uputstvo je opšta preporuka za negu i ne zamenjuje pregled i savet lekara.
          </p>
        </article>
      </section>

      <section className="edu-apply">
        <h2>Imaš pitanje o zarastanju?</h2>
        <p>
          Ako nešto oko tetovaže izgleda ili se oseća drugačije nego što si očekivao/la, javi nam se — bolje
          je proveriti nego čekati. Tu smo i za novi termin kad odlučiš da nastaviš priču.
        </p>
        <div className="edu-apply__actions">
          <a className="route-contact" href="tel:0601453087">
            Pozovi studio — 060 145 3087 <ArrowUpRight />
          </a>
          <Link className="edu-apply__alt" href="/booking">Zakaži termin</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
