"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Category = { id: number; name: string; slug: string };
type Work = {
  id: number;
  title: string;
  image_url: string;
  category_id: number | null;
  alt: string | null;
  description: string | null;
  tags: string[];
  seo_title: string | null;
  featured: boolean;
};

const NO_CATEGORY = "__none__";

export function PortfolioTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error("");
      setCategories(data.categories);
      setWorks(data.works);
    } catch {
      setError("Ne mogu da učitam portfolio. Proveri konekciju sa bazom.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id !== null ? map.get(id) ?? "Ostalo" : "Bez kategorije");
  }, [categories]);

  // ---- categories ----
  const [newCategory, setNewCategory] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCatBusy(true);
    setCatError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCatError(res.status === 409 ? "Taj stil već postoji." : "Dodavanje nije uspelo.");
        return;
      }
      setNewCategory("");
      await load();
    } catch {
      setCatError("Dodavanje nije uspelo.");
    } finally {
      setCatBusy(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!window.confirm("Obrisati ovaj stil? Radovi ostaju, samo bez kategorije.")) return;
    setCatBusy(true);
    setCatError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("");
      await load();
    } catch {
      setCatError("Brisanje nije uspelo.");
    } finally {
      setCatBusy(false);
    }
  };

  // ---- works form ----
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [imageUrl, setImageUrl] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [workBusy, setWorkBusy] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);

  // SEO / AI metadata fields
  const [alt, setAlt] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const generateAiMeta = async () => {
    if (!imageUrl.trim()) return;
    setAiBusy(true);
    setAiMsg(null);
    try {
      const res = await fetch("/api/admin/portfolio/ai-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl.trim(), title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAiMsg(data.message ?? "AI generisanje nije uspelo.");
        return;
      }
      setAlt(data.meta.alt);
      setDescription(data.meta.description);
      setTags(data.meta.tags.join(", "));
      setSeoTitle(data.meta.seo_title);
      setAiMsg("AI opis generisan — pregledaj i izmeni po potrebi.");
    } catch {
      setAiMsg("AI generisanje nije uspelo.");
    } finally {
      setAiBusy(false);
    }
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

  const addWork = async () => {
    const t = title.trim();
    if (!t || !imageUrl.trim()) {
      setWorkError("Popuni naslov i sliku.");
      return;
    }
    setWorkBusy(true);
    setWorkError(null);
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          image_url: imageUrl.trim(),
          category_id: categoryId === NO_CATEGORY ? null : Number(categoryId),
          alt: alt.trim(),
          description: description.trim(),
          seo_title: seoTitle.trim(),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setWorkError(data.message ?? "Dodavanje nije uspelo.");
        return;
      }
      setTitle("");
      setImageUrl("");
      setCategoryId(NO_CATEGORY);
      setUrlMode(false);
      setUploadMsg(null);
      setAlt("");
      setDescription("");
      setTags("");
      setSeoTitle("");
      setAiMsg(null);
      await load();
    } catch {
      setWorkError("Dodavanje nije uspelo.");
    } finally {
      setWorkBusy(false);
    }
  };

  // ---- edit / landing toggle / reorder ----
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [edTitle, setEdTitle] = useState("");
  const [edCategory, setEdCategory] = useState(NO_CATEGORY);
  const [edImage, setEdImage] = useState("");
  const [edAlt, setEdAlt] = useState("");
  const [edDescription, setEdDescription] = useState("");
  const [edTags, setEdTags] = useState("");
  const [edSeoTitle, setEdSeoTitle] = useState("");
  const [edBusy, setEdBusy] = useState(false);
  const [edError, setEdError] = useState<string | null>(null);
  const [edUploadBusy, setEdUploadBusy] = useState(false);

  const openEdit = (w: Work) => {
    setEditWork(w);
    setEdTitle(w.title);
    setEdCategory(w.category_id !== null ? String(w.category_id) : NO_CATEGORY);
    setEdImage(w.image_url);
    setEdAlt(w.alt ?? "");
    setEdDescription(w.description ?? "");
    setEdTags((w.tags ?? []).join(", "));
    setEdSeoTitle(w.seo_title ?? "");
    setEdError(null);
  };

  const handleEditFile = async (file: File | null) => {
    if (!file) return;
    setEdUploadBusy(true);
    setEdError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEdError(data.message ?? "Otpremanje nije uspelo — nalepi URL ručno.");
        return;
      }
      setEdImage(data.url);
    } catch {
      setEdError("Otpremanje nije uspelo.");
    } finally {
      setEdUploadBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editWork) return;
    if (!edTitle.trim() || !edImage.trim()) {
      setEdError("Naslov i slika su obavezni.");
      return;
    }
    setEdBusy(true);
    setEdError(null);
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editWork.id,
          title: edTitle.trim(),
          image_url: edImage.trim(),
          category_id: edCategory === NO_CATEGORY ? null : Number(edCategory),
          alt: edAlt.trim(),
          description: edDescription.trim(),
          seo_title: edSeoTitle.trim(),
          tags: edTags.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEdError(data.message ?? "Čuvanje nije uspelo.");
        return;
      }
      setEditWork(null);
      await load();
    } catch {
      setEdError("Čuvanje nije uspelo.");
    } finally {
      setEdBusy(false);
    }
  };

  const toggleFeatured = async (w: Work) => {
    setWorkError(null);
    // Optimistic flip so the toggle feels instant.
    setWorks((list) => list.map((x) => (x.id === w.id ? { ...x, featured: !w.featured } : x)));
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, featured: !w.featured }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("");
    } catch {
      setWorks((list) => list.map((x) => (x.id === w.id ? { ...x, featured: w.featured } : x)));
      setWorkError("Izmena nije uspela.");
    }
  };

  const moveWork = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= works.length) return;
    const next = [...works];
    [next[index], next[target]] = [next[target], next[index]];
    setWorks(next);
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((w) => w.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("");
    } catch {
      setWorkError("Promena redosleda nije uspela.");
      await load();
    }
  };

  const deleteWork = async (id: number) => {
    if (!window.confirm("Obrisati ovaj rad iz portfolija?")) return;
    setWorkError(null);
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("");
      await load();
    } catch {
      setWorkError("Brisanje nije uspelo.");
    }
  };

  return (
    <div className="adm__portfolio">
      {error && <p className="adm__err" role="alert">{error}</p>}

      <section className="adm__pf-section">
        <h3>Stilovi</h3>
        {catError && <p className="adm__err" role="alert">{catError}</p>}
        <div className="adm__pf-chips">
          {categories.length === 0 && <span className="adm__hint">Još nema stilova.</span>}
          {categories.map((c) => (
            <span key={c.id} className="adm__chip">
              {c.name}
              <button type="button" onClick={() => deleteCategory(c.id)} disabled={catBusy} aria-label={`Obriši ${c.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="adm__pf-row">
          <input
            type="text"
            placeholder="Novi stil (npr. Fine line)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={catBusy}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <button type="button" onClick={addCategory} disabled={catBusy || !newCategory.trim()}>
            Dodaj stil
          </button>
        </div>
      </section>

      <section className="adm__pf-section">
        <h3>Dodaj rad</h3>
        {workError && <p className="adm__err" role="alert">{workError}</p>}
        <div className="adm__pf-form">
          <input
            type="text"
            placeholder="Naslov rada"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={workBusy}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={workBusy}>
            <option value={NO_CATEGORY}>Bez kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {!urlMode ? (
            <div className="adm__pf-upload">
              <label className="adm__pf-file">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadBusy || workBusy}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {uploadBusy ? "Otpremanje…" : imageUrl ? "Slika izabrana ✓" : "Izaberi sliku"}
              </label>
              <button type="button" className="adm__pf-link" onClick={() => setUrlMode(true)} disabled={workBusy}>
                Nalepi URL umesto
              </button>
            </div>
          ) : (
            <div className="adm__pf-upload">
              <input
                type="text"
                placeholder="https://... ili /media/slika.webp"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={workBusy}
              />
              <button type="button" className="adm__pf-link" onClick={() => { setUrlMode(false); setUploadMsg(null); }} disabled={workBusy}>
                Otpremi fajl umesto
              </button>
            </div>
          )}
          {uploadMsg && <p className="adm__hint">{uploadMsg}</p>}
          {imageUrl && !urlMode && <p className="adm__hint">{imageUrl}</p>}

          <div className="adm__pf-ai">
            <button
              type="button"
              className="adm__pf-link"
              onClick={generateAiMeta}
              disabled={aiBusy || workBusy || !imageUrl.trim()}
            >
              {aiBusy ? "AI generiše…" : "✦ Generiši AI opis i tagove"}
            </button>
            {aiMsg && <p className="adm__hint">{aiMsg}</p>}
            <input
              type="text"
              placeholder="SEO naslov (za Google)"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              disabled={workBusy}
            />
            <input
              type="text"
              placeholder="Alt tekst slike"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              disabled={workBusy}
            />
            <textarea
              rows={3}
              placeholder="Opis rada (prikazuje se na stranici rada)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={workBusy}
            />
            <input
              type="text"
              placeholder="Tagovi, odvojeni zarezom (fineline, ruka, cvet…)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={workBusy}
            />
          </div>

          <button type="button" className="adm__pf-submit" onClick={addWork} disabled={workBusy || uploadBusy || !title.trim() || !imageUrl.trim()}>
            Dodaj rad
          </button>
        </div>
      </section>

      <section className="adm__pf-section">
        <h3>Radovi</h3>
        <p className="adm__hint">
          Redosled ovde je redosled na sajtu. „Landing" određuje da li se rad prikazuje u sekciji Radovi
          na početnoj strani — stranica /portfolio uvek prikazuje sve radove.
        </p>
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && works.length === 0 && <p className="adm__empty">Nema radova u portfoliju.</p>}
        <div className="adm__pf-grid">
          {works.map((w, i) => (
            <article key={w.id} className="adm__pf-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.image_url} alt={w.title} />
              <div className="adm__pf-card-body">
                <strong>{w.title}</strong>
                <span className="adm__badge adm__badge--default">{categoryName(w.category_id)}</span>
                <label className="adm__pf-feat">
                  <input type="checkbox" checked={w.featured} onChange={() => toggleFeatured(w)} />
                  Landing
                </label>
              </div>
              <div className="adm__pf-card-actions">
                <button type="button" onClick={() => moveWork(i, -1)} disabled={i === 0} aria-label="Pomeri gore">↑</button>
                <button type="button" onClick={() => moveWork(i, 1)} disabled={i === works.length - 1} aria-label="Pomeri dole">↓</button>
                <button type="button" onClick={() => openEdit(w)}>Izmeni</button>
                <button type="button" onClick={() => deleteWork(w.id)}>Obriši</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editWork && (
        <div className="adm__modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditWork(null); }}>
          <div className="adm__pf-section adm__modal-box" role="dialog" aria-modal="true" aria-label="Izmena rada">
            <button type="button" className="adm__modal-x" aria-label="Zatvori" onClick={() => setEditWork(null)}>×</button>
            <h3>Izmena rada</h3>
            {edError && <p className="adm__err" role="alert">{edError}</p>}
            <div className="adm__pf-form">
              <input
                type="text"
                placeholder="Naslov rada"
                value={edTitle}
                onChange={(e) => setEdTitle(e.target.value)}
                disabled={edBusy}
              />
              <select value={edCategory} onChange={(e) => setEdCategory(e.target.value)} disabled={edBusy}>
                <option value={NO_CATEGORY}>Bez kategorije</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              {edImage && <img className="adm__pf-edit-preview" src={edImage} alt="" />}
              <div className="adm__pf-upload">
                <label className="adm__pf-file">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={edUploadBusy || edBusy}
                    onChange={(e) => handleEditFile(e.target.files?.[0] ?? null)}
                  />
                  {edUploadBusy ? "Otpremanje…" : "Zameni sliku"}
                </label>
                <input
                  type="text"
                  placeholder="https://... ili /media/slika.webp"
                  value={edImage}
                  onChange={(e) => setEdImage(e.target.value)}
                  disabled={edBusy}
                />
              </div>

              <input
                type="text"
                placeholder="SEO naslov (za Google)"
                value={edSeoTitle}
                onChange={(e) => setEdSeoTitle(e.target.value)}
                disabled={edBusy}
              />
              <input
                type="text"
                placeholder="Alt tekst slike"
                value={edAlt}
                onChange={(e) => setEdAlt(e.target.value)}
                disabled={edBusy}
              />
              <textarea
                rows={3}
                placeholder="Opis rada"
                value={edDescription}
                onChange={(e) => setEdDescription(e.target.value)}
                disabled={edBusy}
              />
              <input
                type="text"
                placeholder="Tagovi, odvojeni zarezom"
                value={edTags}
                onChange={(e) => setEdTags(e.target.value)}
                disabled={edBusy}
              />

              <div className="adm__cal-panel-actions">
                <button type="button" className="adm__resched-confirm" onClick={saveEdit} disabled={edBusy || edUploadBusy}>
                  {edBusy ? "Čuvanje…" : "Sačuvaj izmene"}
                </button>
                <button type="button" onClick={() => setEditWork(null)} disabled={edBusy}>Otkaži</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
