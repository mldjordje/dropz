"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { track } from "@vercel/analytics/react";

type FormState = {
  name: string;
  contact: string;
  description: string;
  bodyPart: string;
  size: string;
  budget: string;
  referenceUrl: string;
  website: string;
};

const INITIAL: FormState = {
  name: "",
  contact: "",
  description: "",
  bodyPart: "",
  size: "",
  budget: "",
  referenceUrl: "",
  website: "",
};

export function PublicInquiryForm({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [started, setStarted] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    if (!started) {
      setStarted(true);
      track("inquiry_form_start", { placement: compact ? "landing" : "page" });
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (
      form.name.trim().length < 2 ||
      form.contact.trim().length < 5 ||
      form.description.trim().length < 10
    ) {
      setError("Unesi ime, kontakt i malo detaljniji opis ideje.");
      track("inquiry_form_error", { reason: "missing_fields" });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Upit trenutno ne može da se pošalje.");
      }
      setSent(true);
      setForm(INITIAL);
      track("inquiry_submit_success", { placement: compact ? "landing" : "page" });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Upit trenutno ne može da se pošalje. Pokušaj ponovo.",
      );
      track("inquiry_form_error", { reason: "submit_failed" });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="inq-success" role="status">
        <Check aria-hidden="true" />
        <div>
          <strong>Ideja je poslata.</strong>
          <p>Studio će pregledati detalje i javiti ti se na ostavljeni kontakt, obično u roku od 24h.</p>
          <Link href="/nalog">Želiš da kasnije pratiš procenu? Napravi nalog opciono.</Link>
        </div>
      </div>
    );
  }

  return (
    <form className={`inq-form${compact ? " inq-form--compact" : ""}`} onSubmit={submit} noValidate>
      <div className="inq-form__trust">
        <strong>Bez naloga. Bez obaveze.</strong>
        <span>Pošalji ideju za oko 2 minuta — procena cene i trajanja stiže na tvoj kontakt.</span>
      </div>

      <div className="inq-form__grid">
        <label>
          Ime i prezime *
          <input
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </label>
        <label>
          Telefon, email ili Instagram *
          <input
            type="text"
            autoComplete="email"
            placeholder="Kako da ti odgovorimo?"
            value={form.contact}
            onChange={(event) => update("contact", event.target.value)}
          />
        </label>
        <label className="inq-form__wide">
          Opiši ideju *
          <textarea
            rows={5}
            minLength={10}
            maxLength={2000}
            placeholder="Motiv, stil i sve što je važno za ideju..."
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </label>
        <label>
          Deo tela
          <input
            type="text"
            placeholder="npr. podlaktica"
            value={form.bodyPart}
            onChange={(event) => update("bodyPart", event.target.value)}
          />
        </label>
        <label>
          Približna veličina
          <input
            type="text"
            placeholder="npr. 15 × 10 cm"
            value={form.size}
            onChange={(event) => update("size", event.target.value)}
          />
        </label>
        <label>
          Okvirni budžet
          <input
            type="text"
            inputMode="numeric"
            placeholder="opciono"
            value={form.budget}
            onChange={(event) => update("budget", event.target.value)}
          />
        </label>
        <label>
          Link ka referenci
          <input
            type="url"
            inputMode="url"
            placeholder="Instagram, Pinterest, Drive..."
            value={form.referenceUrl}
            onChange={(event) => update("referenceUrl", event.target.value)}
          />
        </label>
      </div>

      <label className="inq-form__honeypot" aria-hidden="true" hidden>
        Website
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          value={form.website}
          onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
        />
      </label>

      {error && <p className="inq-form__error" role="alert">{error}</p>}
      <div className="inq-form__foot">
        <p>Slanjem upita ne rezervišeš termin i nemaš nikakvu obavezu.</p>
        <button type="submit" className="bkf__submit" disabled={busy}>
          <span>{busy ? "Slanje…" : "Pošalji ideju"}</span>
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </form>
  );
}
