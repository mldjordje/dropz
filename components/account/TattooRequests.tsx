"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bell, ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";

type TattooStatus = "pending" | "quoted" | "scheduled" | "done" | "canceled";

type Artist = {
  id: number;
  name: string;
  role: "owner" | "staff";
  avatar_url: string | null;
  slug: string | null;
};

type TattooRequest = {
  id: number;
  description: string;
  size: string | null;
  body_part: string | null;
  budget: string | null;
  image_urls: string[];
  status: TattooStatus;
  artist_id: number | null;
  artist_name: string | null;
  session_count: number | null;
  session_minutes: number | null;
  price: string | null;
  admin_note: string | null;
  sessions_done: number;
  created_at: string;
  next_session: { date: string; start: string; end: string } | null;
};

type Notification = {
  id: number;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<TattooStatus, string> = {
  pending: "Čeka procenu",
  quoted: "Procena stigla",
  scheduled: "Zakazano",
  done: "Završeno",
  canceled: "Otkazano",
};

const MAX_IMAGES = 5;

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

function fmtDay(date: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function canBook(r: TattooRequest): boolean {
  if (!r.session_count || !r.session_minutes) return false;
  if (r.sessions_done >= r.session_count) return false;
  if (r.next_session) return false;
  return r.status === "quoted" || r.status === "scheduled";
}

const MAX_MONTHS_AHEAD = 3;

function monthKey(offset: number) {
  const d = new Date();
  const base = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function daysInMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function leadBlanks(key: string) {
  const [y, m] = key.split("-").map(Number);
  return (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
}

const WEEKDAYS = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

// Calendar for picking the next session of a quoted request: only days with a
// free contiguous block of the estimated duration are enabled.
function BookSession({ request, onBooked }: { request: TattooRequest; onBooked: () => Promise<void> }) {
  const [offset, setOffset] = useState(1); // slots start tomorrow; current month still useful
  const [days, setDays] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const key = useMemo(() => monthKey(offset - 1), [offset]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setDate(null);
    setStart(null);
    fetch(`/api/tattoo-requests/${request.id}/slots?month=${key}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!live) return;
        if (data.ok) setDays(data.days);
        else setError(data.message ?? "Ne mogu da učitam termine.");
      })
      .catch(() => live && setError("Ne mogu da učitam termine."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [key, request.id, refresh]);

  const confirm = async () => {
    if (!date || !start) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tattoo-requests/${request.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, start }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Zakazivanje nije uspelo.");
        if (data.code === "slot_taken") {
          setRefresh((v) => v + 1); // refetch current month
        }
        return;
      }
      await onBooked();
    } catch {
      setError("Zakazivanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="treq__book">
      <div className="bkf__cal">
        <div className="bkf__cal-head">
          <button type="button" aria-label="Prethodni mesec" disabled={offset <= 1} onClick={() => setOffset((v) => v - 1)}>
            <ChevronLeft size={16} strokeWidth={1.6} />
          </button>
          <strong>{monthLabel(key)}</strong>
          <button
            type="button"
            aria-label="Sledeći mesec"
            disabled={offset >= MAX_MONTHS_AHEAD + 1}
            onClick={() => setOffset((v) => v + 1)}
          >
            <ChevronRight size={16} strokeWidth={1.6} />
          </button>
        </div>
        <div className="bkf__cal-grid" role="grid">
          {WEEKDAYS.map((w) => (
            <span key={w} className="bkf__wd">{w}</span>
          ))}
          {Array.from({ length: leadBlanks(key) }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth(key) }, (_, i) => {
            const d = `${key}-${String(i + 1).padStart(2, "0")}`;
            const open = Boolean(days[d]);
            return (
              <button
                key={d}
                type="button"
                className="bkf__day"
                disabled={!open || busy}
                aria-pressed={date === d}
                onClick={() => {
                  setDate(d);
                  setStart(null);
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {loading && <p className="bkf__hint">Učitavanje…</p>}
        {!loading && Object.keys(days).length === 0 && (
          <p className="bkf__hint">Nema slobodnih blokova u ovom mesecu — probaj sledeći.</p>
        )}
      </div>

      {date && (
        <div className="bkf__slots">
          {(days[date] ?? []).map((s) => (
            <button key={s} type="button" className="bkf__pill bkf__slot" aria-pressed={start === s} onClick={() => setStart(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="account__error" role="alert">{error}</div>}
      <button type="button" className="bkf__submit" onClick={confirm} disabled={!date || !start || busy}>
        <span>
          {busy
            ? "Zakazivanje…"
            : date && start
              ? `Potvrdi ${fmtDay(date)} u ${start}`
              : "Izaberi dan i vreme"}
        </span>
        <ArrowUpRight size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function TattooRequests({
  autoOpenForm = false,
  preselectArtist = null,
}: {
  /** Open the new-request form immediately (?novi=1 deep link). */
  autoOpenForm?: boolean;
  /** Artist id to preselect in the picker (?artist=N, from artist pages). */
  preselectArtist?: number | null;
}) {
  const [requests, setRequests] = useState<TattooRequest[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        fetch("/api/tattoo-requests", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
      ]);
      const reqData = await reqRes.json();
      if (!reqData.ok) throw new Error(reqData.message);
      setRequests(reqData.requests);
      const notifData = await notifRes.json();
      if (notifData.ok) {
        setNotifications(notifData.notifications);
        // Seen on this page — clear the unread flag.
        if (notifData.unread > 0) fetch("/api/notifications", { method: "PATCH" });
      }
    } catch {
      setError("Ne mogu da učitam zahteve. Osveži stranicu.");
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Team roster for the artist picker (loaded once; empty list hides the field).
  useEffect(() => {
    fetch("/api/artists", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => data.ok && setArtists(data.artists))
      .catch(() => {});
  }, []);

  // ---- new request form ----
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [bookId, setBookId] = useState<number | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState<number | null>(preselectArtist);
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [budget, setBudget] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadOff, setUploadOff] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setFormError(null);
    try {
      for (const file of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/tattoo-requests/upload", { method: "POST", body: form });
        if (res.status === 501) {
          setUploadOff(true);
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setFormError(data.message ?? "Upload slike nije uspeo.");
          return;
        }
        setImages((prev) => [...prev, data.url]);
      }
    } catch {
      setFormError("Upload slike nije uspeo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (description.trim().length < 5) {
      setFormError("Opiši tetovažu (bar par reči).");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/tattoo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          size: size.trim() || undefined,
          bodyPart: bodyPart.trim() || undefined,
          budget: budget.trim() || undefined,
          imageUrls: images,
          artistId: artistId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data.message ?? "Slanje nije uspelo.");
        return;
      }
      setDescription("");
      setSize("");
      setBodyPart("");
      setBudget("");
      setImages([]);
      setArtistId(null);
      setShowForm(false);
      setOkMsg("Zahtev je poslat. Javićemo ti se sa procenom termina i cene.");
      await load();
    } catch {
      setFormError("Slanje nije uspelo. Pokušaj ponovo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="treq">
      {notifications.length > 0 && (
        <div className="treq__notifs">
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className={`treq__notif${n.read_at ? "" : " treq__notif--unread"}`}>
              <Bell size={14} strokeWidth={1.5} />
              <div>
                <strong>{n.title}</strong>
                {n.body && <span>{n.body}</span>}
                <small>{fmtDate(n.created_at)}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="account__error" role="alert">{error}</div>}
      {okMsg && <div className="treq__ok" role="status">{okMsg}</div>}

      <div className="treq__head">
        <h2>Tattoo zahtevi</h2>
        <button type="button" className="treq__new" onClick={() => { setShowForm((v) => !v); setOkMsg(null); }}>
          {showForm ? "Zatvori" : "Novi zahtev"}
        </button>
      </div>

      {showForm && (
        <div className="bkf treq__form">
          {artists.length > 0 && (
            <div className="bkf__field">
              <span className="bkf__label">Izaberi artista (opciono)</span>
              <div className="treq__artists">
                <button
                  type="button"
                  className="treq__artist"
                  aria-pressed={artistId === null}
                  onClick={() => setArtistId(null)}
                  disabled={busy}
                >
                  <span className="treq__artist-avatar treq__artist-avatar--any">?</span>
                  <span className="treq__artist-name">Svejedno mi je</span>
                  <small>studio bira</small>
                </button>
                {artists.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`treq__artist${a.role === "owner" ? " treq__artist--featured" : ""}`}
                    aria-pressed={artistId === a.id}
                    onClick={() => setArtistId(a.id)}
                    disabled={busy}
                  >
                    <span className="treq__artist-avatar">
                      {a.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- google-hosted avatar
                        <img src={a.avatar_url} alt="" />
                      ) : (
                        a.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span className="treq__artist-name">{a.name}</span>
                    {a.role === "owner" && <small className="treq__artist-badge">★ Head artist</small>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bkf__field">
            <label htmlFor="treq-desc">Opis tetovaže *</label>
            <textarea
              id="treq-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Motiv, stil (npr. fine line, blackwork), boje, posebne želje…"
              disabled={busy}
            />
          </div>
          <div className="bkf__field">
            <label htmlFor="treq-size">Okvirna veličina</label>
            <input
              id="treq-size"
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="npr. 15cm"
              disabled={busy}
            />
          </div>
          <div className="bkf__field">
            <label htmlFor="treq-part">Deo tela</label>
            <input
              id="treq-part"
              type="text"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="npr. podlaktica"
              disabled={busy}
            />
          </div>
          <div className="bkf__field">
            <label htmlFor="treq-budget">Budžet u evrima (opciono)</label>
            <input
              id="treq-budget"
              type="text"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="npr. 150–250 €"
              disabled={busy}
            />
          </div>

          <div className="bkf__field">
            <span className="bkf__label">Reference (do {MAX_IMAGES} slika)</span>
            {uploadOff ? (
              <span className="treq__upload-off">Upload slika još nije dostupan — pošalji zahtev bez slika, reference možeš doneti na konsultaciju.</span>
            ) : (
              <>
                <div className="treq__thumbs">
                  {images.map((url) => (
                    <span key={url} className="treq__thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob-hosted reference */}
                      <img src={url} alt="Referenca" />
                      <button
                        type="button"
                        aria-label="Ukloni sliku"
                        onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                        disabled={busy}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      className="treq__add-img"
                      onClick={() => fileRef.current?.click()}
                      disabled={busy || uploading}
                      aria-label="Dodaj sliku"
                    >
                      <ImagePlus size={18} strokeWidth={1.5} />
                      {uploading ? "…" : ""}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
              </>
            )}
          </div>

          {formError && <div className="account__error" role="alert">{formError}</div>}
          <button type="button" className="bkf__submit" onClick={submit} disabled={busy || uploading}>
            <span>{busy ? "Slanje…" : "Pošalji zahtev"}</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="treq__list">
        {requests === null && <div className="treq__empty">Učitavanje…</div>}
        {requests?.length === 0 && !showForm && (
          <div className="treq__empty">Još nemaš nijedan zahtev. Klikni „Novi zahtev" i opiši tetovažu koju želiš.</div>
        )}
        {requests?.map((r) => (
          <article key={r.id} className="treq__item">
            <div className="treq__item-top">
              <span className={`treq__status treq__status--${r.status}`}>{STATUS_LABEL[r.status]}</span>
              <small>{fmtDate(r.created_at)}</small>
            </div>
            <p className="treq__desc">{r.description}</p>
            {(r.size || r.body_part || r.budget || r.artist_name) && (
              <div className="treq__meta">
                {r.artist_name && <span>Artist: {r.artist_name}</span>}
                {r.size && <span>Veličina: {r.size}</span>}
                {r.body_part && <span>Deo tela: {r.body_part}</span>}
                {r.budget && <span>Budžet: {r.budget} €</span>}
              </div>
            )}
            {r.status !== "pending" && r.status !== "canceled" && r.session_count && r.session_minutes && (
              <div className="treq__quote">
                <strong>Procena</strong>
                <span>
                  {r.session_count === 1
                    ? `1 termin od ${fmtDuration(r.session_minutes)}`
                    : `${r.session_count} termina po ${fmtDuration(r.session_minutes)}`}
                  {" — "}{r.price}
                </span>
                {r.session_count > 1 && r.sessions_done > 0 && (
                  <span>Odrađeno: {r.sessions_done}/{r.session_count}</span>
                )}
                {r.admin_note && <em>{r.admin_note}</em>}
                {r.next_session && (
                  <span className="treq__quote-next">
                    Sledeća sesija: {fmtDay(r.next_session.date)} u {r.next_session.start}.
                  </span>
                )}
              </div>
            )}
            {canBook(r) && (
              <>
                <button
                  type="button"
                  className="treq__new treq__book-toggle"
                  onClick={() => setBookId((v) => (v === r.id ? null : r.id))}
                >
                  {bookId === r.id ? "Zatvori" : r.sessions_done > 0 ? "Zakaži sledeću sesiju" : "Zakaži termin"}
                </button>
                {bookId === r.id && (
                  <BookSession
                    request={r}
                    onBooked={async () => {
                      setBookId(null);
                      setOkMsg("Termin je zakazan. Vidimo se!");
                      await load();
                    }}
                  />
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
