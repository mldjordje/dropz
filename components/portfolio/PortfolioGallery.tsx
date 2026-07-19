"use client";

import { useMemo, useState } from "react";

type Category = { id: number; name: string; slug: string };
type Work = { id: number; title: string; image_url: string; category_id: number | null };

export function PortfolioGallery({ categories, works }: { categories: Category[]; works: Work[] }) {
  const [active, setActive] = useState<number | null>(null);

  const visible = useMemo(
    () => (active === null ? works : works.filter((w) => w.category_id === active)),
    [works, active],
  );

  if (works.length === 0) {
    return <p className="pfp__empty">Galerija se puni — novi radovi stižu uskoro.</p>;
  }

  return (
    <div className="pfp">
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
      <div className="pfp__grid">
        {visible.map((w) => (
          <figure key={w.id} className="pfp__item">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary blob/remote hosts */}
            <img src={w.image_url} alt={w.title} loading="lazy" />
            <figcaption>{w.title}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
