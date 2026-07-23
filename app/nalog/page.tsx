import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth/user-session";
import { LogoutButton } from "@/components/account/LogoutButton";
import { ProfileCard } from "@/components/account/ProfileCard";
import { TattooRequests } from "@/components/account/TattooRequests";
import { RouteChrome } from "@/components/layout/RouteChrome";

export const metadata: Metadata = {
  title: "Moj nalog",
  description: "Prijava i pregled tvojih tattoo zahteva i termina u Dropz Tattoo studiju.",
  robots: { index: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  config: "Prijava trenutno nije dostupna. Pokušaj kasnije.",
  prijava: "Prijava je prekinuta. Pokušaj ponovo.",
  razmena: "Google prijava nije uspela. Pokušaj ponovo.",
  token: "Google prijava nije uspela. Pokušaj ponovo.",
  email: "Google nalog nema potvrđen email. Pokušaj sa drugim nalogom.",
};

export default async function NalogPage({
  searchParams,
}: {
  searchParams: Promise<{ greska?: string; novi?: string; artist?: string }>;
}) {
  const user = await getSessionUser();
  const { greska, novi, artist } = await searchParams;
  const error = greska ? ERROR_MESSAGES[greska] ?? ERROR_MESSAGES.prijava : null;

  // "?novi=1" (from the landing / /upit CTAs) drops the visitor straight into
  // the request form — through the Google login too, via the next param.
  const openForm = novi === "1";
  const preselectArtist = artist && /^\d+$/.test(artist) ? Number(artist) : null;
  const nextPath = `/nalog${openForm ? `?novi=1${preselectArtist ? `&artist=${preselectArtist}` : ""}` : ""}`;

  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">Nalog</div>
      <h1>Moj<br />nalog.</h1>
      <p>
        {user
          ? "Ovde ćeš pratiti svoje tattoo zahteve, procene i termine."
          : "Prijavi se da pošalješ tattoo zahtev i pratiš svoje termine. Za besplatnu konsultaciju prijava nije potrebna."}
      </p>
      <div className="route-booking account">
        {error ? <div className="account__error" role="alert">{error}</div> : null}
        {user ? (
          <>
            <div className="account__user">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, unknown host list
                <img src={user.avatar} alt="" width={56} height={56} referrerPolicy="no-referrer" />
              ) : null}
              <div>
                <strong>{user.name ?? "Bez imena"}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <ProfileCard />
            <TattooRequests autoOpenForm={openForm} preselectArtist={preselectArtist} />
            <LogoutButton />
          </>
        ) : (
          <a className="bkf__submit" href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}>
            <span>Prijavi se Google nalogom</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </a>
        )}
      </div>
    </main>
  );
}
