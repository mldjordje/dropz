"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

// "Moji radovi": every artist uploads and manages the works shown on their
// public /artisti/<slug> page. Uploads go through /api/admin/upload (Vercel
// Blob) and are attributed to the signed-in staff member server-side.

type Work = {
  id: number;
  title: string;
  image_url: string;
  alt: string | null;
  sort: number;
  created_at: string;
};

export function MyWorksTab() {
  const [works, setWorks] = useState<Work[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/my-works", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setWorks(data.works);
    } catch {
      setError("Ne mogu da učitam radove.");
      setWorks([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (files: FileList) => {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const up = await fetch("/api/admin/upload", { method: "POST", body: form });
        const upData = await up.json();
        if (!up.ok || !upData.ok) {
          setError(upData.message ?? "Upload nije uspeo.");
          return;
        }
        const res = await fetch("/api/admin/my-works", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: upData.url, title: title.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.message ?? "Čuvanje rada nije uspelo.");
          return;
        }
      }
      setTitle("");
      await load();
    } catch {
      setError("Upload nije uspeo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/my-works", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Brisanje nije uspelo.");
        return;
      }
      await load();
    } catch {
      setError("Brisanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm__myworks">
      <h1>Moji radovi</h1>
      <p className="adm__hint">
        Slike koje dodaš ovde prikazuju se na tvojoj javnoj stranici na sajtu. Naziv je opcion —
        upiši ga pre izbora slike ako želiš.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__myworks-add">
        <input
          type="text"
          placeholder="Naziv rada (opciono)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          <ImagePlus size={16} strokeWidth={1.6} /> {busy ? "Upload…" : "Dodaj sliku"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && e.target.files.length > 0 && upload(e.target.files)}
        />
      </div>

      <div className="adm__myworks-grid">
        {works === null && <p className="adm__hint">Učitavanje…</p>}
        {works?.length === 0 && <p className="adm__empty">Još nema radova — dodaj prvu sliku.</p>}
        {works?.map((w) => (
          <figure key={w.id} className="adm__myworks-item">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob-hosted work */}
            <img src={w.image_url} alt={w.alt ?? w.title} loading="lazy" />
            <figcaption>
              <span>{w.title}</span>
              <button type="button" aria-label="Obriši rad" onClick={() => remove(w.id)} disabled={busy}>
                <Trash2 size={14} strokeWidth={1.6} />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
