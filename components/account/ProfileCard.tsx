"use client";

// Customer profile. Phone, birthday and gender are mandatory before the account
// can be used. Birthday remains set-once to protect the birthday discount.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cake, Check, Gift, X } from "lucide-react";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  birthday: string | null;
  gender: "male" | "female" | null;
  city: string | null;
  birthdayLocked: boolean;
  completed: boolean;
  dismissed: boolean;
};

function fmtBirthday(iso: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`),
  );
}

export function ProfileCard({ mandatory = false }: { mandatory?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [city, setCity] = useState("");

  const hydrate = useCallback((p: Profile) => {
    setProfile(p);
    setPhone(p.phone ?? "");
    setBirthday(p.birthday ?? "");
    setGender(p.gender ?? "");
    setCity(p.city ?? "");
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok) hydrate(d.profile as Profile);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [hydrate]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", phone, birthday, gender, city }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Čuvanje nije uspelo.");
        return;
      }
      hydrate(data.profile as Profile);
      setOpen(false);
      setOk(true);
      if (mandatory) router.refresh();
    } catch {
      setError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded || !profile) return null;

  // --- Editing form ---
  if (open || mandatory) {
    return (
      <div className="prof bkf">
        <div className="prof__head">
          <h2>Moji podaci</h2>
          {!mandatory && (
            <button type="button" className="prof__x" aria-label="Zatvori" onClick={() => setOpen(false)}>
              <X size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
        <p className="prof__lede">
          {mandatory
            ? "Dopuni obavezne podatke da bi mogao/la da koristiš nalog i pošalješ tattoo upit."
            : "Podaci su vidljivi samo studiju. Datum rođenja ti donosi 10% rođendanski popust."}
        </p>

        <div className="bkf__field">
          <label htmlFor="prof-phone">Telefon *</label>
          <input
            id="prof-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="06x xxx xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="bkf__field">
          <label htmlFor="prof-birthday">
            <Cake size={12} strokeWidth={1.8} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Datum rođenja *
          </label>
          {profile.birthdayLocked ? (
            <p className="prof__locked">
              {profile.birthday ? fmtBirthday(profile.birthday) : "—"}
              <small>Datum rođenja je sačuvan i ne može se menjati.</small>
            </p>
          ) : (
            <>
              <input
                id="prof-birthday"
                type="date"
                value={birthday}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setBirthday(e.target.value)}
                required
              />
              <small className="prof__hint">Unosi se jednom — proveri pre čuvanja.</small>
            </>
          )}
        </div>

        <div className="bkf__field">
          <label htmlFor="prof-gender">Pol *</label>
          <select
            id="prof-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as "" | "male" | "female")}
            required
          >
            <option value="">Izaberi</option>
            <option value="male">Muški</option>
            <option value="female">Ženski</option>
          </select>
        </div>

        <div className="bkf__field">
          <label htmlFor="prof-city">Grad</label>
          <input
            id="prof-city"
            type="text"
            autoComplete="address-level2"
            placeholder="Niš"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {error && <div className="account__error" role="alert">{error}</div>}

        <button type="button" className="bkf__submit" onClick={save} disabled={busy}>
          <span>{busy ? "Čuvam…" : "Sačuvaj"}</span>
          <Check size={16} strokeWidth={1.6} />
        </button>
      </div>
    );
  }

  // --- Completed summary ---
  if (profile.completed) {
    return (
      <div className="prof prof--done">
        {ok && <div className="treq__ok" role="status">Podaci su sačuvani. Hvala!</div>}
        <div className="prof__head">
          <h2>Moji podaci</h2>
          <button type="button" className="prof__edit" onClick={() => { setOk(false); setOpen(true); }}>
            Izmeni
          </button>
        </div>
        <dl className="prof__list">
          <div><dt>Telefon</dt><dd>{profile.phone || "—"}</dd></div>
          <div><dt>Grad</dt><dd>{profile.city || "—"}</dd></div>
          <div><dt>Pol</dt><dd>{profile.gender === "male" ? "Muški" : "Ženski"}</dd></div>
          <div>
            <dt>Rođendan</dt>
            <dd>{profile.birthday ? fmtBirthday(profile.birthday) : "—"}</dd>
          </div>
        </dl>
        {profile.birthday && (
          <p className="prof__gift">
            <Gift size={14} strokeWidth={1.6} /> Na rođendan te čeka 10% popusta na tetovažu.
          </p>
        )}
      </div>
    );
  }

  // Defensive fallback: incomplete profiles are normally rendered as mandatory
  // by the server component.
  return (
    <div className="prof prof--invite">
      <div className="prof__gifticon" aria-hidden="true"><Gift size={20} strokeWidth={1.5} /></div>
      <div className="prof__invite-copy">
        <strong>Dopuni svoj profil</strong>
        <span>
          Dodaj telefon, datum rođenja i pol. Na rođendan dobijaš <em>10% popusta</em> na tetovažu.
        </span>
      </div>
      <div className="prof__invite-actions">
        <button type="button" className="prof__cta" onClick={() => setOpen(true)}>Dopuni</button>
      </div>
    </div>
  );
}
