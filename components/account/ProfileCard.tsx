"use client";

// Optional client profile. Appears in the account after login as a gentle,
// dismissible invite — never blocks anything. Completing it is worth it for the
// client: a birthday on file unlocks a 10% birthday discount the studio honors.
// The birthday is set-once (locked server-side) to keep the discount honest.

import { useCallback, useEffect, useState } from "react";
import { Cake, Check, Gift, X } from "lucide-react";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  birthday: string | null;
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

export function ProfileCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [city, setCity] = useState("");

  const hydrate = useCallback((p: Profile) => {
    setProfile(p);
    setPhone(p.phone ?? "");
    setBirthday(p.birthday ?? "");
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
        body: JSON.stringify({ action: "save", phone, birthday, city }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Čuvanje nije uspelo.");
        return;
      }
      hydrate(data.profile as Profile);
      setOpen(false);
      setOk(true);
    } catch {
      setError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    // Optimistic — the invite disappears immediately; the record is best-effort.
    setProfile((p) => (p ? { ...p, dismissed: true } : p));
    try {
      await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
    } catch {
      /* non-critical */
    }
  };

  if (!loaded || !profile) return null;

  // --- Editing form ---
  if (open) {
    return (
      <div className="prof bkf">
        <div className="prof__head">
          <h2>Moji podaci</h2>
          <button type="button" className="prof__x" aria-label="Zatvori" onClick={() => setOpen(false)}>
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
        <p className="prof__lede">
          Sve je opciono i vidljivo samo studiju. Datum rođenja ti donosi <strong>10% rođendanski popust</strong>.
        </p>

        <div className="bkf__field">
          <label htmlFor="prof-phone">Telefon</label>
          <input
            id="prof-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="06x xxx xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="bkf__field">
          <label htmlFor="prof-birthday">
            <Cake size={12} strokeWidth={1.8} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Datum rođenja
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
              />
              <small className="prof__hint">Unosi se jednom — proveri pre čuvanja.</small>
            </>
          )}
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

  // --- Dismissed but not completed: quiet re-entry point ---
  if (profile.dismissed) {
    return (
      <button type="button" className="prof__reopen" onClick={() => setOpen(true)}>
        <Gift size={13} strokeWidth={1.6} /> Dopuni profil i otključaj rođendanski popust
      </button>
    );
  }

  // --- First-time invite ---
  return (
    <div className="prof prof--invite">
      <div className="prof__gifticon" aria-hidden="true"><Gift size={20} strokeWidth={1.5} /></div>
      <div className="prof__invite-copy">
        <strong>Dopuni svoj profil</strong>
        <span>
          Dodaj telefon i datum rođenja (opciono). Na rođendan dobijaš <em>10% popusta</em> na tetovažu.
        </span>
      </div>
      <div className="prof__invite-actions">
        <button type="button" className="prof__cta" onClick={() => setOpen(true)}>Dopuni</button>
        <button type="button" className="prof__later" onClick={dismiss}>Ne sada</button>
      </div>
    </div>
  );
}
