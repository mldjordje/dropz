"use client";

import { useEffect, useMemo, useState } from "react";
import { copy, locales, type Locale } from "@/components/landing/content";

type Field = { path: string; label: string; kind?: "textarea" };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Hero",
    fields: [
      { path: "heroLine", label: "Glavni naslov" },
      { path: "heroSubline", label: "Podnaslov" },
      { path: "heroBook", label: "Dugme — zakazivanje" },
    ],
  },
  {
    title: "Radovi",
    fields: [
      { path: "workTitle", label: "Naslov" },
      { path: "workBody", label: "Opis", kind: "textarea" },
    ],
  },
  {
    title: "Proces",
    fields: [
      { path: "craftTitle", label: "Naslov (craft)" },
      { path: "craftBody", label: "Opis (craft)", kind: "textarea" },
      { path: "processTitle", label: "Naslov koraka" },
      { path: "processSteps.0.title", label: "Korak 1 — naziv" },
      { path: "processSteps.0.body", label: "Korak 1 — opis", kind: "textarea" },
      { path: "processSteps.1.title", label: "Korak 2 — naziv" },
      { path: "processSteps.1.body", label: "Korak 2 — opis", kind: "textarea" },
      { path: "processSteps.2.title", label: "Korak 3 — naziv" },
      { path: "processSteps.2.body", label: "Korak 3 — opis", kind: "textarea" },
      { path: "processSteps.3.title", label: "Korak 4 — naziv" },
      { path: "processSteps.3.body", label: "Korak 4 — opis", kind: "textarea" },
    ],
  },
  {
    title: "Utisci",
    fields: [
      { path: "voicesTitle", label: "Naslov" },
      { path: "voices.0.quote", label: "Utisak 1 — citat", kind: "textarea" },
      { path: "voices.0.author", label: "Utisak 1 — autor" },
      { path: "voices.1.quote", label: "Utisak 2 — citat", kind: "textarea" },
      { path: "voices.1.author", label: "Utisak 2 — autor" },
      { path: "voices.2.quote", label: "Utisak 3 — citat", kind: "textarea" },
      { path: "voices.2.author", label: "Utisak 3 — autor" },
    ],
  },
  {
    title: "Edukacija",
    fields: [
      { path: "eduTitle", label: "Naslov" },
      { path: "eduBody", label: "Opis", kind: "textarea" },
      { path: "eduStart.meta", label: "START — trajanje i cena" },
      { path: "eduStart.desc", label: "START — opis", kind: "textarea" },
      { path: "eduPro.meta", label: "PRO — trajanje i cena" },
      { path: "eduPro.desc", label: "PRO — opis", kind: "textarea" },
    ],
  },
  {
    title: "Termini i kraj",
    fields: [
      { path: "bookingTitle", label: "Naslov rezervacije" },
      { path: "bookingBody", label: "Opis rezervacije", kind: "textarea" },
      { path: "finale", label: "Završna poruka" },
      { path: "finalAction", label: "Završno dugme" },
    ],
  },
];

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

const LOCALE_LABEL: Record<Locale, string> = { sr: "Srpski", en: "English", de: "Deutsch" };

export function SadrzajTab() {
  const [locale, setLocale] = useState<Locale>("sr");
  const [overrides, setOverrides] = useState<Record<Locale, Record<string, unknown>> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaults = copy[locale];

  useEffect(() => {
    fetch("/api/admin/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setOverrides(data.overrides);
        else setError("Ne mogu da učitam sadržaj.");
      })
      .catch(() => setError("Ne mogu da učitam sadržaj."));
  }, []);

  const allFields = useMemo(() => SECTIONS.flatMap((s) => s.fields), []);

  // Rebuild the form whenever locale or loaded overrides change.
  useEffect(() => {
    if (!overrides) return;
    const next: Record<string, string> = {};
    for (const f of allFields) {
      const ov = getPath(overrides[locale], f.path);
      const def = getPath(defaults, f.path);
      next[f.path] = typeof ov === "string" ? ov : typeof def === "string" ? def : "";
    }
    setValues(next);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, overrides]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    // Store only fields that differ from the code defaults, so future default
    // updates still reach the site for untouched fields.
    const diff: Record<string, unknown> = {};
    for (const f of allFields) {
      const val = (values[f.path] ?? "").trim();
      const def = getPath(defaults, f.path);
      if (val && val !== def) setPath(diff, f.path, val);
    }
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, values: diff }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setOverrides((o) => (o ? { ...o, [locale]: diff } : o));
      setSaved(true);
    } catch {
      setError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm__content">
      <div className="adm__filters">
        {locales.map((l) => (
          <button key={l} className="adm__filter" aria-pressed={locale === l} onClick={() => setLocale(l)}>
            {LOCALE_LABEL[l]}
          </button>
        ))}
      </div>

      {error && <p className="adm__err" role="alert">{error}</p>}
      {!overrides && !error && <p className="adm__empty">Učitavanje…</p>}

      {overrides && (
        <>
          {SECTIONS.map((section) => (
            <section key={section.title} className="adm__content-section">
              <h3>{section.title}</h3>
              <div className="adm__content-grid">
                {section.fields.map((f) => {
                  const def = getPath(defaults, f.path);
                  const changed = (values[f.path] ?? "").trim() !== def;
                  return (
                    <label key={f.path} className="adm__content-field">
                      <span>
                        {f.label}
                        {changed && <em className="adm__content-changed">izmenjeno</em>}
                      </span>
                      {f.kind === "textarea" ? (
                        <textarea
                          rows={3}
                          value={values[f.path] ?? ""}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, [f.path]: e.target.value }));
                            setSaved(false);
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={values[f.path] ?? ""}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, [f.path]: e.target.value }));
                            setSaved(false);
                          }}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="adm__content-save">
            <button type="button" className="adm__resched-confirm" onClick={save} disabled={busy}>
              {busy ? "Čuvam…" : `Sačuvaj (${LOCALE_LABEL[locale]})`}
            </button>
            {saved && <span className="adm__hint">Sačuvano — sajt se osvežava u roku od minuta.</span>}
          </div>
        </>
      )}
    </div>
  );
}
