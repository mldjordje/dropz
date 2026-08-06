"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TattooStatus =
  | "pending"
  | "revision_requested"
  | "quoted"
  | "accepted"
  | "scheduled"
  | "done"
  | "canceled";

type TattooRequest = {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string | null;
  user_phone: string | null;
  user_gender: "male" | "female" | null;
  description: string;
  size: string | null;
  body_part: string | null;
  budget: string | null;
  image_urls: string[];
  status: TattooStatus;
  session_count: number | null;
  session_minutes: number | null;
  price: string | null;
  admin_note: string | null;
  quote_revision_note: string | null;
  sessions_done: number;
  created_at: string;
};

type PublicInquiry = {
  id: number;
  name: string;
  contact: string;
  description: string;
  body_part: string | null;
  size: string | null;
  budget: string | null;
  reference_url: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
};

type SlotRequest = {
  id: number;
  request_id: number;
  session_number: number;
  requested_date: string;
  requested_start: string;
  requested_end: string;
  proposed_date: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  assigned_staff_id: number | null;
  assigned_staff_name: string | null;
  appointment_id: number | null;
  status: "pending_owner" | "alternative_proposed" | "confirmed" | "rejected" | "declined";
  owner_note: string | null;
  description: string;
  session_minutes: number;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  created_at: string;
};

type StaffMember = {
  id: number;
  name: string;
  role: "owner" | "staff";
  active: boolean;
};

const FILTERS = [
  { key: "attention", label: "Za obradu" },
  { key: "quoted", label: "Čeka klijenta" },
  { key: "active", label: "Aktivni" },
  { key: "all", label: "Svi" },
  { key: "canceled", label: "Otkazani" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_LABEL: Record<TattooStatus, string> = {
  pending: "Čeka procenu",
  revision_requested: "Traži novu procenu",
  quoted: "Čeka klijenta",
  accepted: "Procena prihvaćena",
  scheduled: "Aktivno",
  done: "Završeno",
  canceled: "Otkazano",
};

const SLOT_STATUS_LABEL: Record<SlotRequest["status"], string> = {
  pending_owner: "Čeka ownera",
  alternative_proposed: "Čeka klijenta",
  confirmed: "Potvrđeno",
  rejected: "Odbijeno",
  declined: "Klijent odbio",
};

const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

function fmtDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

function fmtCreated(iso: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function RequestsTab() {
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [publicInquiries, setPublicInquiries] = useState<PublicInquiry[]>([]);
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([]);
  const [filter, setFilter] = useState<FilterKey>("attention");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [requestRes, slotRes, inquiryRes] = await Promise.all([
        fetch("/api/admin/tattoo-requests", { cache: "no-store" }),
        fetch("/api/admin/tattoo-slot-requests", { cache: "no-store" }),
        fetch("/api/admin/inquiries", { cache: "no-store" }),
      ]);
      const [requestData, slotData, inquiryData] = await Promise.all([
        requestRes.json(),
        slotRes.json(),
        inquiryRes.json(),
      ]);
      if (!requestData.ok || !slotData.ok || !inquiryData.ok) {
        throw new Error("load");
      }
      setRequests(requestData.requests);
      setSlotRequests(slotData.slotRequests);
      setPublicInquiries(inquiryData.inquiries);
    } catch {
      setError("Ne mogu da učitam tattoo zahteve.");
    } finally {
      setLoading(false);
    }
  }, []);

  const setPublicInquiryStatus = async (
    id: number,
    status: PublicInquiry["status"],
  ) => {
    const response = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.message ?? "Status upita nije sačuvan.");
      return;
    }
    await load();
  };

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    switch (filter) {
      case "attention":
        return requests.filter((item) =>
          item.status === "pending" || item.status === "revision_requested",
        );
      case "quoted":
        return requests.filter((item) => item.status === "quoted");
      case "active":
        return requests.filter((item) =>
          item.status === "accepted" || item.status === "scheduled",
        );
      case "canceled":
        return requests.filter((item) => item.status === "canceled");
      default:
        return requests;
    }
  }, [filter, requests]);

  const activeSlots = useMemo(
    () =>
      slotRequests.filter(
        (item) =>
          item.status === "pending_owner" ||
          item.status === "alternative_proposed",
      ),
    [slotRequests],
  );

  const setStatus = async (id: number, status: "pending" | "canceled") => {
    const response = await fetch("/api/admin/tattoo-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.message ?? "Status nije sačuvan.");
      return;
    }
    await load();
  };

  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [qSessions, setQSessions] = useState(1);
  const [qMinutes, setQMinutes] = useState(120);
  const [qPrice, setQPrice] = useState("");
  const [qNote, setQNote] = useState("");
  const [qBusy, setQBusy] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  const openQuote = (item: TattooRequest) => {
    setQuoteId(item.id);
    setQSessions(item.session_count ?? 1);
    setQMinutes(item.session_minutes ?? 120);
    setQPrice(item.price ?? "");
    setQNote(item.admin_note ?? "");
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
      const response = await fetch("/api/admin/tattoo-requests", {
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
      const data = await response.json();
      if (!response.ok || !data.ok) {
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

  const [slotBusy, setSlotBusy] = useState<number | null>(null);
  const [artistBySlot, setArtistBySlot] = useState<Record<number, string>>({});
  const [alternativeId, setAlternativeId] = useState<number | null>(null);
  const [alternativeDate, setAlternativeDate] = useState("");
  const [alternativeStart, setAlternativeStart] = useState("");
  const [alternativeNote, setAlternativeNote] = useState("");
  const [availableBySlot, setAvailableBySlot] = useState<Record<number, StaffMember[]>>({});
  const [alternativeStaff, setAlternativeStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all(
      activeSlots.map(async (item) => {
        const query = new URLSearchParams({
          date: item.requested_date,
          start: item.requested_start,
          duration: String(item.session_minutes),
        });
        const response = await fetch(
          `/api/admin/tattoo-slot-requests/availability?${query}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        return [item.id, data.ok ? data.artists : []] as const;
      }),
    )
      .then((entries) => {
        if (live) setAvailableBySlot(Object.fromEntries(entries));
      })
      .catch(() => {
        if (live) setAvailableBySlot({});
      });
    return () => {
      live = false;
    };
  }, [activeSlots]);

  const alternativeItem = activeSlots.find((item) => item.id === alternativeId) ?? null;
  useEffect(() => {
    if (!alternativeItem || !alternativeDate || !alternativeStart) {
      setAlternativeStaff([]);
      return;
    }
    let live = true;
    const query = new URLSearchParams({
      date: alternativeDate,
      start: alternativeStart,
      duration: String(alternativeItem.session_minutes),
    });
    fetch(`/api/admin/tattoo-slot-requests/availability?${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (live) setAlternativeStaff(data.ok ? data.artists : []);
      })
      .catch(() => {
        if (live) setAlternativeStaff([]);
      });
    return () => {
      live = false;
    };
  }, [alternativeDate, alternativeItem, alternativeStart]);

  const runSlotAction = async (
    item: SlotRequest,
    action: "confirm" | "reject" | "propose_alternative",
  ) => {
    const artistId = Number(artistBySlot[item.id]);
    if (action !== "reject" && !Number.isInteger(artistId)) {
      setError("Izaberi radnika za termin.");
      return;
    }
    if (action === "propose_alternative" && (!alternativeDate || !alternativeStart)) {
      setError("Izaberi novi datum i vreme.");
      return;
    }
    setSlotBusy(item.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/tattoo-slot-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          action,
          artistId: action === "reject" ? undefined : artistId,
          date: action === "propose_alternative" ? alternativeDate : undefined,
          start: action === "propose_alternative" ? alternativeStart : undefined,
          note: action === "propose_alternative" ? alternativeNote.trim() || undefined : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Odluka nije sačuvana.");
        return;
      }
      setAlternativeId(null);
      setAlternativeDate("");
      setAlternativeStart("");
      setAlternativeNote("");
      await load();
    } catch {
      setError("Odluka nije sačuvana.");
    } finally {
      setSlotBusy(null);
    }
  };

  return (
    <>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <section className="adm__slot-requests">
        <div className="adm__section-head">
          <div>
            <h2>Javni upiti</h2>
            <p className="adm__hint">Poslati sa sajta bez obavezne prijave.</p>
          </div>
          {publicInquiries.filter((item) => item.status === "new").length > 0 && (
            <em className="adm__nav-badge">
              {publicInquiries.filter((item) => item.status === "new").length}
            </em>
          )}
        </div>
        {publicInquiries.length === 0 && !loading && (
          <p className="adm__empty">Nema javnih upita.</p>
        )}
        <div className="adm__list">
          {publicInquiries.map((item) => (
            <article key={item.id} className="adm__row adm__row--request">
              <div className="adm__who">
                <strong>
                  {item.name}
                  <span className="adm__kind">{fmtCreated(item.created_at)}</span>
                </strong>
                <a href={item.contact.includes("@") ? `mailto:${item.contact}` : `tel:${item.contact}`}>
                  {item.contact}
                </a>
                <p>{item.description}</p>
                <div className="adm__req-meta">
                  {item.size && <span>Veličina: {item.size}</span>}
                  {item.body_part && <span>Deo tela: {item.body_part}</span>}
                  {item.budget && <span>Budžet: {item.budget}</span>}
                  {item.reference_url && (
                    <a href={item.reference_url} target="_blank" rel="noreferrer">Otvori referencu</a>
                  )}
                </div>
              </div>
              <div className="adm__actions">
                <span className={`adm__status adm__status--${item.status}`}>
                  {item.status === "new" ? "Novo" : item.status === "contacted" ? "Kontaktiran" : "Zatvoren"}
                </span>
                <div className="adm__btns">
                  {item.status === "new" && (
                    <button onClick={() => setPublicInquiryStatus(item.id, "contacted")}>Kontaktiran</button>
                  )}
                  {item.status !== "closed" && (
                    <button onClick={() => setPublicInquiryStatus(item.id, "closed")}>Zatvori</button>
                  )}
                  {item.status === "closed" && (
                    <button onClick={() => setPublicInquiryStatus(item.id, "new")}>Vrati</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="adm__slot-requests">
        <div className="adm__section-head">
          <div>
            <h2>Zahtevi termina</h2>
            <p className="adm__hint">Radnik se dodeljuje tek pri potvrdi ili slanju alternative.</p>
          </div>
          {activeSlots.length > 0 && <em className="adm__nav-badge">{activeSlots.length}</em>}
        </div>
        {activeSlots.length === 0 && !loading && (
          <p className="adm__empty">Nema zahteva termina koji čekaju odluku.</p>
        )}
        <div className="adm__list">
          {activeSlots.map((item) => (
            <article key={item.id} className="adm__row adm__row--request">
              <div className="adm__who">
                <strong>
                  {item.user_name ?? item.user_email}
                  <span className="adm__kind">Sesija {item.session_number}</span>
                </strong>
                <a href={`mailto:${item.user_email}`}>{item.user_email}</a>
                {item.user_phone && <a href={`tel:${item.user_phone}`}>{item.user_phone}</a>}
                <p>{item.description}</p>
                <div className="adm__req-quote-info">
                  Klijent traži: {item.requested_date} · {item.requested_start}–{item.requested_end}
                </div>
                {item.status === "alternative_proposed" && item.proposed_date && (
                  <div className="adm__req-quote-info">
                    Poslata alternativa: {item.proposed_date} · {item.proposed_start}–{item.proposed_end}
                    {item.assigned_staff_name ? ` · ${item.assigned_staff_name}` : ""}
                  </div>
                )}
              </div>
              <div className="adm__actions">
                <span className={`adm__status adm__status--req-${item.status}`}>
                  {SLOT_STATUS_LABEL[item.status]}
                </span>
                <label className="adm__req-artist">
                  Radnik
                  <select
                    value={artistBySlot[item.id] ?? item.assigned_staff_id ?? ""}
                    onChange={(event) =>
                      setArtistBySlot((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    disabled={slotBusy === item.id}
                  >
                    <option value="">— izaberi —</option>
                    {(alternativeId === item.id
                      ? alternativeStaff
                      : availableBySlot[item.id] ?? []
                    ).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}{member.role === "owner" ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="adm__btns">
                  {item.status === "pending_owner" && (
                    <button
                      type="button"
                      disabled={slotBusy === item.id}
                      onClick={() => runSlotAction(item, "confirm")}
                    >
                      Potvrdi
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={slotBusy === item.id}
                    onClick={() => {
                      setAlternativeId((current) => current === item.id ? null : item.id);
                    setAlternativeDate(item.proposed_date ?? item.requested_date);
                    setAlternativeStart(item.proposed_start ?? item.requested_start);
                    setAlternativeNote(item.owner_note ?? "");
                    setArtistBySlot((current) => ({ ...current, [item.id]: "" }));
                    }}
                  >
                    Predloži drugo vreme
                  </button>
                  <button
                    type="button"
                    disabled={slotBusy === item.id}
                    onClick={() => runSlotAction(item, "reject")}
                  >
                    Odbij
                  </button>
                </div>
              </div>
              {alternativeId === item.id && (
                <div className="adm__quote">
                  <div className="adm__quote-grid">
                    <label>
                      Novi datum
                      <input
                        type="date"
                        value={alternativeDate}
                        onChange={(event) => setAlternativeDate(event.target.value)}
                      />
                    </label>
                    <label>
                      Novo vreme
                      <input
                        type="time"
                        step={1800}
                        value={alternativeStart}
                        onChange={(event) => setAlternativeStart(event.target.value)}
                      />
                    </label>
                    <label>
                      Trajanje
                      <input value={fmtDuration(item.session_minutes)} disabled />
                    </label>
                  </div>
                  <label className="adm__quote-note">
                    Napomena klijentu (opciono)
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={alternativeNote}
                      onChange={(event) => setAlternativeNote(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="adm__resched-confirm"
                    disabled={slotBusy === item.id}
                    onClick={() => runSlotAction(item, "propose_alternative")}
                  >
                    Pošalji alternativu
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="adm__filters">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className="adm__filter"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="adm__list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && visible.length === 0 && <p className="adm__empty">Nema zahteva za ovaj filter.</p>}
        {visible.map((item) => (
          <article key={item.id} className="adm__row adm__row--request">
            <div className="adm__who">
              <strong>
                {item.user_name ?? item.user_email}
                <span className="adm__kind">{fmtCreated(item.created_at)}</span>
              </strong>
              <a href={`mailto:${item.user_email}`}>{item.user_email}</a>
              {item.user_phone && <a href={`tel:${item.user_phone}`}>{item.user_phone}</a>}
              <span className="adm__kind">
                {item.user_gender === "male" ? "Muški" : item.user_gender === "female" ? "Ženski" : "Profil nepotpun"}
              </span>
              <p>{item.description}</p>
              <div className="adm__req-meta">
                {item.size && <span>Veličina: {item.size}</span>}
                {item.body_part && <span>Deo tela: {item.body_part}</span>}
                {item.budget && <span>Budžet: {item.budget} €</span>}
              </div>
              {item.image_urls.length > 0 && (
                <div className="adm__req-thumbs">
                  {item.image_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Referenca" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {item.status === "revision_requested" && item.quote_revision_note && (
                <div className="adm__req-revision">
                  <strong>Klijent traži novu procenu:</strong> {item.quote_revision_note}
                </div>
              )}
              {item.session_count && item.session_minutes && (
                <div className="adm__req-quote-info">
                  Procena: {item.session_count} × {fmtDuration(item.session_minutes)} — {item.price}
                  {item.session_count > 1 && ` (odrađeno ${item.sessions_done}/${item.session_count})`}
                </div>
              )}
            </div>
            <div className="adm__actions">
              <span className={`adm__status adm__status--req-${item.status}`}>
                {STATUS_LABEL[item.status]}
              </span>
              <div className="adm__btns">
                {(item.status === "pending" ||
                  item.status === "revision_requested" ||
                  item.status === "quoted") && (
                  <button onClick={() => quoteId === item.id ? setQuoteId(null) : openQuote(item)}>
                    {quoteId === item.id
                      ? "Zatvori"
                      : item.status === "quoted"
                        ? "Izmeni procenu"
                        : "Proceni"}
                  </button>
                )}
                {item.status !== "canceled" && item.status !== "done" && (
                  <button onClick={() => setStatus(item.id, "canceled")}>Otkaži upit</button>
                )}
                {item.status === "canceled" && (
                  <button onClick={() => setStatus(item.id, "pending")}>Vrati</button>
                )}
              </div>
            </div>
            {quoteId === item.id && (
              <div className="adm__quote">
                <div className="adm__quote-grid">
                  <label>
                    Broj termina
                    <select value={qSessions} onChange={(event) => setQSessions(Number(event.target.value))}>
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Trajanje termina
                    <select value={qMinutes} onChange={(event) => setQMinutes(Number(event.target.value))}>
                      {DURATIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>{fmtDuration(minutes)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cena
                    <input
                      type="text"
                      value={qPrice}
                      onChange={(event) => setQPrice(event.target.value)}
                      placeholder="npr. 250€ ili 30.000 RSD"
                    />
                  </label>
                </div>
                <label className="adm__quote-note">
                  Napomena klijentu (opciono)
                  <textarea rows={2} value={qNote} onChange={(event) => setQNote(event.target.value)} />
                </label>
                {qError && <p className="adm__err" role="alert">{qError}</p>}
                <button
                  type="button"
                  className="adm__resched-confirm"
                  disabled={qBusy}
                  onClick={sendQuote}
                >
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
