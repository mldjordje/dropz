"use client";

import { useEffect, useState } from "react";

type Settings = {
  name: string | null;
  logo_url: string | null;
  currency: string | null;
  locale: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
};

const EMPTY: Settings = {
  name: "", logo_url: "", currency: "RSD", locale: "sr", phone: "", email: "",
  address: "", instagram: "", facebook: "", tiktok: "",
};

const FIELDS: { key: keyof Settings; label: string; placeholder?: string }[] = [
  { key: "name", label: "Naziv studija", placeholder: "Dropz Tattoo Studio" },
  { key: "logo_url", label: "Logo URL", placeholder: "/media/logo.webp" },
  { key: "phone", label: "Telefon", placeholder: "+381 60 ..." },
  { key: "email", label: "Email", placeholder: "studio@..." },
  { key: "address", label: "Adresa", placeholder: "Ulica i broj, grad" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "currency", label: "Valuta", placeholder: "RSD" },
  { key: "locale", label: "Primarni jezik", placeholder: "sr" },
];

export function PodesavanjaTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setSettings({ ...EMPTY, ...(data.settings ?? {}) });
        else setError("Ne mogu da učitam podešavanja.");
      })
      .catch(() => setError("Ne mogu da učitam podešavanja."));
  }, []);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setSaved(true);
    } catch {
      setError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm__content" style={{ maxWidth: 640 }}>
      {error && <p className="adm__err" role="alert">{error}</p>}
      {!settings && !error && <p className="adm__empty">Učitavanje…</p>}

      {settings && (
        <>
          <section className="adm__content-section">
            <h3>Podaci studija</h3>
            <p className="adm__hint" style={{ marginBottom: 14 }}>
              Ovi podaci se koriste za kontakt, društvene mreže i SEO strukturu sajta.
            </p>
            <div className="adm__content-grid">
              {FIELDS.map((f) => (
                <label key={f.key} className="adm__content-field">
                  <span>{f.label}</span>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={settings[f.key] ?? ""}
                    onChange={(e) => {
                      setSettings({ ...settings, [f.key]: e.target.value });
                      setSaved(false);
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="adm__content-save">
            <button type="button" className="adm__resched-confirm" onClick={save} disabled={busy}>
              {busy ? "Čuvam…" : "Sačuvaj podešavanja"}
            </button>
            {saved && <span className="adm__hint">Sačuvano.</span>}
          </div>
        </>
      )}
    </div>
  );
}
