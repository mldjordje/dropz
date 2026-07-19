"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { fmtDate } from "./shared";

type Client = {
  id: number;
  name: string | null;
  email: string;
  avatar_url: string | null;
  admin_note: string | null;
  created_at: string;
  last_login_at: string;
  requests_count: number;
  sessions_done: number;
  last_visit: string | null;
  next_visit: string | null;
};

type ClientRequest = {
  id: number;
  description: string;
  size: string | null;
  body_part: string | null;
  image_urls: string[];
  status: string;
  session_count: number | null;
  price: string | null;
  sessions_done: number;
  created_at: string;
};

type ClientAppointment = {
  id: number;
  kind: string;
  title: string | null;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  status: string;
};

const REQ_STATUS: Record<string, string> = {
  pending: "Na čekanju",
  quoted: "Ponuda poslata",
  scheduled: "Zakazano",
  done: "Završeno",
  canceled: "Otkazano",
};

const APPT_STATUS: Record<string, string> = {
  scheduled: "Zakazano",
  done: "Završeno",
  canceled: "Otkazano",
};

export function KlijentiTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ requests: ClientRequest[]; appointments: ClientAppointment[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setClients(data.clients);
    } catch {
      setError("Ne mogu da učitam klijente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const onSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), 300);
  };

  const openClient = async (c: Client) => {
    if (openId === c.id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(c.id);
    setDetail(null);
    setNote(c.admin_note ?? "");
    setNoteSaved(false);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${c.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setDetail({ requests: data.requests, appointments: data.appointments });
    } finally {
      setDetailLoading(false);
    }
  };

  const saveNote = async () => {
    if (openId == null) return;
    setNoteBusy(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/admin/clients/${openId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: note }),
      });
      const data = await res.json();
      if (data.ok) {
        setClients((cs) => cs.map((c) => (c.id === openId ? { ...c, admin_note: note.trim() || null } : c)));
        setNoteSaved(true);
      }
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <div className="adm__clients">
      <div className="adm__search">
        <Search size={15} strokeWidth={1.6} />
        <input
          type="search"
          placeholder="Pretraži po imenu ili emailu…"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && clients.length === 0 && <p className="adm__empty">Nema klijenata.</p>}
        {clients.map((c) => (
          <article key={c.id} className="adm__row adm__client-row">
            <button type="button" className="adm__client-main" onClick={() => openClient(c)} aria-expanded={openId === c.id}>
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="adm__client-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="adm__client-avatar adm__client-avatar--fallback">
                  {(c.name ?? c.email).slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="adm__client-id">
                <strong>{c.name ?? c.email}</strong>
                <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}>{c.email}</a>
              </span>
              <span className="adm__client-meta">
                <em>{c.requests_count}</em> zahteva · <em>{c.sessions_done}</em> sesija
                {c.last_visit && <> · poslednja {fmtDate(c.last_visit)}</>}
                {c.next_visit && <> · sledeća {fmtDate(c.next_visit)}</>}
              </span>
              {c.admin_note && <span className="adm__badge adm__badge--override">Napomena</span>}
            </button>

            {openId === c.id && (
              <div className="adm__client-detail">
                {detailLoading && <p className="adm__empty">Učitavanje…</p>}

                {detail && (
                  <>
                    <div className="adm__client-cols">
                      <section>
                        <h4>Tattoo zahtevi</h4>
                        {detail.requests.length === 0 && <p className="adm__hint">Nema zahteva.</p>}
                        {detail.requests.map((r) => (
                          <div key={r.id} className="adm__client-item">
                            <span className={`adm__status adm__status--req-${r.status}`}>
                              {REQ_STATUS[r.status] ?? r.status}
                            </span>
                            <p>{r.description}</p>
                            <small>
                              {[r.body_part, r.size, r.price ? `${r.price}` : null].filter(Boolean).join(" · ")}
                              {r.session_count ? ` · ${r.sessions_done}/${r.session_count} sesija` : ""}
                            </small>
                          </div>
                        ))}
                      </section>
                      <section>
                        <h4>Termini</h4>
                        {detail.appointments.length === 0 && <p className="adm__hint">Nema termina.</p>}
                        {detail.appointments.map((a) => (
                          <div key={a.id} className="adm__client-item">
                            <span className={`adm__status adm__status--${a.status === "scheduled" ? "confirmed" : a.status}`}>
                              {APPT_STATUS[a.status] ?? a.status}
                            </span>
                            <p>
                              {fmtDate(a.date)} · {a.start_time}–{a.end_time}
                              {a.title ? ` · ${a.title}` : ""}
                            </p>
                            {a.note && <small>{a.note}</small>}
                          </div>
                        ))}
                      </section>
                    </div>

                    <div className="adm__client-note">
                      <h4>Napomena o klijentu</h4>
                      <textarea
                        rows={3}
                        placeholder="npr. alergija na lateks, preferira popodnevne termine…"
                        value={note}
                        onChange={(e) => {
                          setNote(e.target.value);
                          setNoteSaved(false);
                        }}
                      />
                      <div className="adm__editor-actions">
                        <button type="button" onClick={saveNote} disabled={noteBusy}>
                          {noteBusy ? "Čuvam…" : "Sačuvaj napomenu"}
                        </button>
                        {noteSaved && <span className="adm__hint">Sačuvano.</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
