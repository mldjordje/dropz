"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TattooStatus = "pending" | "quoted" | "scheduled" | "done" | "canceled";

type TattooRequest = {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string | null;
  description: string;
  size: string | null;
  body_part: string | null;
  image_urls: string[];
  status: TattooStatus;
  session_count: number | null;
  session_minutes: number | null;
  price: string | null;
  admin_note: string | null;
  sessions_done: number;
  quoted_at: string | null;
  created_at: string;
};

const FILTERS = [
  { key: "pending", label: "Novi" },
  { key: "quoted", label: "Procenjeni" },
  { key: "all", label: "Svi" },
  { key: "canceled", label: "Otkazani" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_LABEL: Record<TattooStatus, string> = {
  pending: "Čeka procenu",
  quoted: "Procenjeno",
  scheduled: "Zakazano",
  done: "Završeno",
  canceled: "Otkazano",
};

// 30-min steps, 30min–8h.
const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function fmtCreated(iso: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function RequestsTab() {
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/tattoo-requests", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setRequests(data.requests);
    } catch {
      setError("Ne mogu da učitam zahteve.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    switch (filter) {
      case "all":
        return requests;
      case "canceled":
        return requests.filter((r) => r.status === "canceled");
      default:
        return requests.filter((r) => r.status === filter);
    }
  }, [requests, filter]);

  const setStatus = async (id: number, status: TattooStatus) => {
    const prev = requests;
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch("/api/admin/tattoo-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setRequests(prev);
      setError("Izmena statusa nije sačuvana.");
    }
  };

  // ---- inline quote form ----
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [qSessions, setQSessions] = useState(1);
  const [qMinutes, setQMinutes] = useState(120);
  const [qPrice, setQPrice] = useState("");
  const [qNote, setQNote] = useState("");
  const [qBusy, setQBusy] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  const openQuote = (r: TattooRequest) => {
    setQuoteId(r.id);
    setQSessions(r.session_count ?? 1);
    setQMinutes(r.session_minutes ?? 120);
    setQPrice(r.price ?? "");
    setQNote(r.admin_note ?? "");
    setQError(null);
  };

  const sendQuote = async () => {
    if (!quoteId || !qPrice.trim()) {
      setQError("Cena je obavezna.");
      return;
    }
    setQBusy(true);
    setQError(null);
    try {
      const res = await fetch("/api/admin/tattoo-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quoteId,
          sessionCount: qSessions,
          sessionMinutes: qMinutes,
          price: qPrice.trim(),
          adminNote: qNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setQError(data.message ?? "Slanje procene nije uspelo.");
        return;
      }
      setQuoteId(null);
      await load();
    } catch {
      setQError("Slanje procene nije uspelo.");
    } finally {
      setQBusy(false);
    }
  };

  return (
    <>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__filters">
        {FILTERS.map((f) => (
          <button key={f.key} className="adm__filter" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="adm__list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && visible.length === 0 && <p className="adm__empty">Nema zahteva za ovaj filter.</p>}
        {visible.map((r) => (
          <article key={r.id} className="adm__row adm__row--request">
            <div className="adm__who">
              <strong>
                {r.user_name ?? r.user_email}
                <span className="adm__kind">{fmtCreated(r.created_at)}</span>
              </strong>
              <a href={`mailto:${r.user_email}`}>{r.user_email}</a>
              <p>{r.description}</p>
              <div className="adm__req-meta">
                {r.size && <span>Veličina: {r.size}</span>}
                {r.body_part && <span>Deo tela: {r.body_part}</span>}
              </div>
              {r.image_urls.length > 0 && (
                <div className="adm__req-thumbs">
                  {r.image_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary reference hosts */}
                      <img src={url} alt="Referenca" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {r.status !== "pending" && r.session_count && r.session_minutes && (
                <div className="adm__req-quote-info">
                  Procena: {r.session_count} × {fmtDuration(r.session_minutes)} — {r.price}
                  {r.session_count > 1 && ` (odrađeno ${r.sessions_done}/${r.session_count})`}
                </div>
              )}
            </div>
            <div className="adm__actions">
              <span className={`adm__status adm__status--req-${r.status}`}>{STATUS_LABEL[r.status]}</span>
              <div className="adm__btns">
                {(r.status === "pending" || r.status === "quoted") && (
                  <button onClick={() => (quoteId === r.id ? setQuoteId(null) : openQuote(r))}>
                    {quoteId === r.id ? "Zatvori" : r.status === "pending" ? "Proceni" : "Izmeni procenu"}
                  </button>
                )}
                {r.status !== "canceled" && r.status !== "done" && (
                  <button onClick={() => setStatus(r.id, "canceled")}>Otkaži</button>
                )}
                {r.status === "canceled" && <button onClick={() => setStatus(r.id, "pending")}>Vrati</button>}
              </div>
            </div>

            {quoteId === r.id && (
              <div className="adm__quote">
                <div className="adm__quote-grid">
                  <label>
                    Broj termina
                    <select value={qSessions} onChange={(e) => setQSessions(Number(e.target.value))} disabled={qBusy}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Trajanje termina
                    <select value={qMinutes} onChange={(e) => setQMinutes(Number(e.target.value))} disabled={qBusy}>
                      {DURATIONS.map((m) => (
                        <option key={m} value={m}>{fmtDuration(m)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cena
                    <input
                      type="text"
                      value={qPrice}
                      onChange={(e) => setQPrice(e.target.value)}
                      placeholder="npr. 250€ ili 30.000 RSD"
                      disabled={qBusy}
                    />
                  </label>
                </div>
                <label className="adm__quote-note">
                  Napomena klijentu (opciono)
                  <textarea
                    value={qNote}
                    onChange={(e) => setQNote(e.target.value)}
                    rows={2}
                    disabled={qBusy}
                    placeholder="npr. cena uključuje korekciju posle zarastanja"
                  />
                </label>
                {qError && <p className="adm__err" role="alert">{qError}</p>}
                <button type="button" className="adm__resched-confirm" disabled={qBusy} onClick={sendQuote}>
                  {qBusy ? "Slanje…" : "Pošalji procenu"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
