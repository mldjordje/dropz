"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDate, todayIso } from "./shared";

type EventRow = {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  event_date: string;
  location: string | null;
};

export function EventsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error("");
      setEvents(data.events);
    } catch {
      setError("Ne mogu da učitam događaje. Proveri konekciju sa bazom.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayIso();
  const upcoming = events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events.filter((e) => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));

  // ---- create/edit form (shared) ----
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setEventDate("");
    setLocation("");
    setBody("");
    setImageUrl("");
    setUrlMode(false);
    setUploadMsg(null);
    setFormError(null);
  };

  const startEdit = (e: EventRow) => {
    setEditId(e.id);
    setTitle(e.title);
    setEventDate(e.event_date.slice(0, 10));
    setLocation(e.location ?? "");
    setBody(e.body ?? "");
    setImageUrl(e.image_url ?? "");
    setUrlMode(Boolean(e.image_url));
    setUploadMsg(null);
    setFormError(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploadBusy(true);
    setUploadMsg(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (res.status === 501) {
        setUrlMode(true);
        setUploadMsg(data.message ?? "Upload nije podešen; nalepi URL slike ručno.");
        return;
      }
      if (!res.ok || !data.ok) {
        setUploadMsg(data.message ?? "Otpremanje nije uspelo.");
        return;
      }
      setImageUrl(data.url);
      setUploadMsg(null);
    } catch {
      setUploadMsg("Otpremanje nije uspelo.");
    } finally {
      setUploadBusy(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !eventDate) {
      setFormError("Naslov i datum su obavezni.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        title: title.trim(),
        event_date: eventDate,
        location: location.trim() || undefined,
        body: body.trim() || undefined,
        image_url: imageUrl.trim() || null,
      };
      const res = await fetch("/api/admin/events", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data.message ?? "Čuvanje nije uspelo.");
        return;
      }
      resetForm();
      await load();
    } catch {
      setFormError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Obrisati ovaj događaj?")) return;
    try {
      const res = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("");
      if (editId === id) resetForm();
      await load();
    } catch {
      setError("Brisanje nije uspelo.");
    }
  };

  return (
    <div className="adm__events">
      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__editor">
        <h3>{editId ? "Izmeni događaj" : "Novi događaj"}</h3>
        <label className="adm__cal-field">
          Naslov
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </label>
        <div className="adm__cal-panel-row">
          <label className="adm__cal-field">
            Datum
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} disabled={busy} />
          </label>
          <label className="adm__cal-field">
            Lokacija (opciono)
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={busy} />
          </label>
        </div>
        <label className="adm__cal-field">
          Tekst (opciono)
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} />
        </label>

        <div className="adm__cal-field">
          <span>Slika (opciono)</span>
          {!urlMode ? (
            <>
              <input
                type="file"
                accept="image/*"
                disabled={uploadBusy || busy}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" onClick={() => setUrlMode(true)} disabled={busy}>Nalepi URL umesto</button>
            </>
          ) : (
            <input
              type="text"
              placeholder="https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={busy}
            />
          )}
          {uploadMsg && <p className="adm__hint">{uploadMsg}</p>}
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary uploaded/external URL
            <img src={imageUrl} alt="" className="adm__events-preview" />
          )}
        </div>

        {formError && <p className="adm__err" role="alert">{formError}</p>}
        <div className="adm__cal-panel-actions">
          <button type="button" className="adm__resched-confirm" onClick={submit} disabled={busy || uploadBusy}>
            {busy ? "Čuvanje…" : editId ? "Sačuvaj izmene" : "Dodaj događaj"}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} disabled={busy}>Otkaži izmenu</button>
          )}
        </div>
      </div>

      {loading && <p className="adm__empty">Učitavanje…</p>}

      {!loading && (
        <>
          <h3>Predstojeći ({upcoming.length})</h3>
          <div className="adm__list">
            {upcoming.length === 0 && <p className="adm__empty">Nema predstojećih događaja.</p>}
            {upcoming.map((e) => (
              <article key={e.id} className="adm__row">
                <div className="adm__when">
                  <strong>{fmtDate(e.event_date)}</strong>
                  {e.location && <span>{e.location}</span>}
                </div>
                <div className="adm__who">
                  <strong>{e.title}</strong>
                  {e.body && <p>{e.body}</p>}
                </div>
                <div className="adm__actions">
                  <div className="adm__btns">
                    <button onClick={() => startEdit(e)}>Izmeni</button>
                    <button onClick={() => remove(e.id)}>Obriši</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <h3>Održani ({past.length})</h3>
          <div className="adm__list">
            {past.length === 0 && <p className="adm__empty">Nema održanih događaja.</p>}
            {past.map((e) => (
              <article key={e.id} className="adm__row">
                <div className="adm__when">
                  <strong>{fmtDate(e.event_date)}</strong>
                  {e.location && <span>{e.location}</span>}
                </div>
                <div className="adm__who">
                  <strong>{e.title}</strong>
                  {e.body && <p>{e.body}</p>}
                </div>
                <div className="adm__actions">
                  <div className="adm__btns">
                    <button onClick={() => startEdit(e)}>Izmeni</button>
                    <button onClick={() => remove(e.id)}>Obriši</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
