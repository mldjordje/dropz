import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Edukacija — tattoo obuke",
  description:
    "START obuka od 6 dana i PRO mentorski program od 2 meseca u Dropz Tattoo Studiju u Nišu. Nauči tetoviranje u profesionalnom studiju, uz mentora.",
  alternates: { canonical: "/edukacija" },
};

const startItems = [
  "Rad sa tattoo mašinicom i opremom",
  "Higijena i sterilizacija",
  "Pravilno podešavanje mašine",
  "Vežbe na veštačkoj koži",
  "Osnove linija, senčenja i pakovanja boje",
  "Organizacija rada u tattoo studiju",
];

const proItems = [
  "Rad sa opremom i mašinama",
  "Higijena i sterilizacija",
  "Crtanje i priprema dizajna",
  "Rad na modelima uz nadzor mentora",
  "Komunikacija sa klijentima",
  "Fotografisanje radova i izgradnja portfolija",
  "Saveti za pokretanje karijere tattoo artista",
];

export default function EducationPage() {
  return (
    <main className="route-shell edu-shell">
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">05 / Edukacija</div>
      <h1>Zanat se uči<br />iz prve ruke.</h1>

      <section className="edu-intro">
        <div className="edu-intro__media">
          <video
            className="edu-intro__video"
            poster="/media/dragan-skola-poster.jpg"
            controls
            playsInline
            preload="metadata"
          >
            <source src="/media/dragan-skola.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="edu-intro__copy">
          <p>
            U Dropz Tattoo Studiju u Nišu učiš tetoviranje onako kako se zanat oduvek prenosio — direktno, u
            studiju, uz mentora. Bilo da praviš prve korake ili želiš da tetoviranje postane tvoja profesija,
            postoje dva programa.
          </p>
          <p className="edu-intro__note">
            Broj mesta je ograničen — radimo sa malim brojem polaznika, da bi svako dobio maksimalnu pažnju.
          </p>
        </div>
      </section>

      <section className="edu-programs">
        <article className="edu-program">
          <header className="edu-program__head">
            <span className="edu-program__tag">Obuka</span>
            <h2>START</h2>
            <p className="edu-program__meta"><span>6 dana</span><span>800€</span></p>
          </header>
          <p className="edu-program__lede">
            Šestodnevna obuka za sve koji žele da naprave prve korake u svetu tetoviranja i upoznaju se sa
            radom u profesionalnom tattoo studiju.
          </p>
          <h3>Tokom obuke prolaziš</h3>
          <ul>
            {startItems.map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
          <p className="edu-program__goal">
            Cilj obuke je da stekneš kvalitetnu osnovu i razumeš kako izgleda profesionalno tetoviranje.
          </p>
          <p className="edu-program__spots">Broj mesta je ograničen — rad u malim grupama.</p>
        </article>

        <article className="edu-program edu-program--pro">
          <header className="edu-program__head">
            <span className="edu-program__tag">Mentorski program</span>
            <h2>PRO</h2>
            <p className="edu-program__meta"><span>2 meseca</span><span>2.500€</span></p>
          </header>
          <p className="edu-program__lede">
            Ovo nije klasičan kurs, već dvomesečni mentorski program za one koji žele da tetoviranje postane
            njihova profesija. Dva meseca radiš direktno sa mentorom u studiju i prolaziš ceo proces učenja —
            od rada sa mašinicom i vežbi na veštačkoj koži do rada na modelima uz nadzor.
          </p>
          <h3>Program obuhvata</h3>
          <ul>
            {proItems.map((item) => (
              <li key={item}><Check size={14} strokeWidth={2} /> {item}</li>
            ))}
          </ul>
          <p className="edu-program__goal">
            Cilj nije samo da završiš obuku, već da izađeš spreman za profesionalan rad.
          </p>
          <p className="edu-program__spots">Broj mesta je veoma ograničen — rad je individualan.</p>
        </article>
      </section>

      <section className="edu-apply">
        <h2>Kako se prijaviti?</h2>
        <p>
          Prijava ide telefonom — pozovi nas, reci nam da li crtaš, da li si nekada koristio/la tattoo
          mašinicu i koliko vremena možeš da posvetiš učenju. Svoje crteže ili radove možeš nam poslati i na
          Instagram.
        </p>
        <div className="edu-apply__actions">
          <a className="route-contact" href="tel:0601453087">
            Pozovi za prijavu — 060 145 3087 <ArrowUpRight />
          </a>
          <a className="edu-apply__alt" href="https://www.instagram.com/dropz.tattoo/" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </section>
    </main>
  );
}
