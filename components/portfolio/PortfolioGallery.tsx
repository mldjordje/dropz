"use client";

// Editorial portfolio gallery: large alternating pieces, scroll-based ink
// reveals (IntersectionObserver adds .is-in), category filters and a lightbox.
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

type Category = { id: number; name: string; slug: string };
type Work = { id: number; title: string; image_url: string; category_id: number | null; alt: string | null };

export function PortfolioGallery({ categories, works }: { categories: Category[]; works: Work[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<Work | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const visible = useMemo(
    () => (active === null ? works : works.filter((w) => w.category_id === active)),
    [works, active],
  );

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number | null) => (id !== null ? map.get(id) ?? "" : "");
  }, [categories]);

  // Scroll-based reveal: each piece wipes in the first time it enters the viewport.
  useEffect(() => {
    const items = gridRef.current?.querySelectorAll<HTMLElement>(".pfx__item:not(.is-in)");
    if (!items || items.length === 0) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    // Anything already in the viewport reveals immediately — no flash of
    // hidden content while waiting for the first observer callback.
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  // Lightbox: Escape closes, body scroll locks while open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  if (works.length === 0) {
    return <p className="pfp__empty">Galerija se puni — novi radovi stižu uskoro.</p>;
  }

  return (
    <div className="pfx">
      {categories.length > 0 && (
        <div className="pfp__filters">
          <button type="button" className="bkf__pill" aria-pressed={active === null} onClick={() => setActive(null)}>
            Sve
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="bkf__pill"
              aria-pressed={active === c.id}
              onClick={() => setActive(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="pfx__grid" ref={gridRef}>
        {visible.map((w, i) => (
          <figure key={w.id} className="pfx__item">
            <button type="button" className="pfx__open" onClick={() => setLightbox(w)} aria-label={`Uvećaj: ${w.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary blob/remote hosts */}
              <img src={w.image_url} alt={w.alt || w.title} loading={i < 2 ? "eager" : "lazy"} />
            </button>
            <figcaption>
              <em>{String(i + 1).padStart(3, "0")}</em>
              <strong>{w.title}</strong>
              {categoryName(w.category_id) && <span>{categoryName(w.category_id)}</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {lightbox && (
        <div className="pfx__lb" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={() => setLightbox(null)}>
          <button type="button" className="pfx__lb-x" aria-label="Zatvori" onClick={() => setLightbox(null)}>
            <X size={22} strokeWidth={1.5} />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary blob/remote hosts */}
            <img src={lightbox.image_url} alt={lightbox.alt || lightbox.title} />
            <figcaption>
              <strong>{lightbox.title}</strong>
              {categoryName(lightbox.category_id) && <span>{categoryName(lightbox.category_id)}</span>}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
