"use client";

import { useEffect, useState } from "react";
import { DostupnostTab } from "../../DostupnostTab";
import { StaffScheduleTab } from "../../StaffScheduleTab";

// Staff get their own schedule editor (weekly hours + date exceptions).
// The owner gets a switcher: the studio consult-days calendar ("svejedno"
// consultations) plus every artist's work schedule — since per-artist hours now
// drive both consultations and tattoo sessions, the owner manages them here too.

type Artist = { id: number; name: string; role: "owner" | "staff"; active: boolean };

// "consult" = studio consult-days manager; a number = that artist's schedule.
type View = "consult" | number;

export default function DostupnostPage() {
  const [role, setRole] = useState<"owner" | "staff" | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [view, setView] = useState<View>("consult");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data?.ok && setRole(data.role))
      .catch(() => alive && setRole("owner"));
    return () => {
      alive = false;
    };
  }, []);

  // Owner also needs the team roster to switch between artists' schedules.
  useEffect(() => {
    if (role !== "owner") return;
    let alive = true;
    fetch("/api/admin/staff", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.ok) setArtists((data.staff as Artist[]).filter((a) => a.active));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [role]);

  if (role === null) return null;
  if (role === "staff") return <StaffScheduleTab />;

  const activeArtist = typeof view === "number" ? artists.find((a) => a.id === view) ?? null : null;

  return (
    <div className="adm__avail-owner">
      <div className="adm__avail-switch" role="tablist" aria-label="Šta uređuješ">
        <button
          type="button"
          role="tab"
          aria-selected={view === "consult"}
          className={`adm__switch-chip${view === "consult" ? " adm__switch-chip--on" : ""}`}
          onClick={() => setView("consult")}
        >
          Konsultacije (studio)
        </button>
        {artists.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={view === a.id}
            className={`adm__switch-chip${view === a.id ? " adm__switch-chip--on" : ""}`}
            onClick={() => setView(a.id)}
          >
            {a.name}
            {a.role === "owner" ? " ★" : ""}
          </button>
        ))}
      </div>

      {view === "consult" ? (
        <>
          <p className="adm__hint adm__avail-note">
            Termini za besplatnu konsultaciju bez izabranog artiste („svejedno"). Kada klijent izabere
            konkretnog artistu, važi raspored tog artiste (kartice iznad).
          </p>
          <DostupnostTab />
        </>
      ) : (
        // Remount per artist so the editor reloads that artist's schedule.
        <StaffScheduleTab key={view} staffId={view as number} artistName={activeArtist?.name} />
      )}
    </div>
  );
}
