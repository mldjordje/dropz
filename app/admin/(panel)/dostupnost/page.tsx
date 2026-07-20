"use client";

import { useEffect, useState } from "react";
import { DostupnostTab } from "../../DostupnostTab";
import { StaffScheduleTab } from "../../StaffScheduleTab";

// Owner keeps the consult-days manager; staff get their own schedule editor
// (weekly hours + date exceptions). Role decides which one renders.
export default function DostupnostPage() {
  const [role, setRole] = useState<"owner" | "staff" | null>(null);

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

  if (role === null) return null;
  return role === "staff" ? <StaffScheduleTab /> : <DostupnostTab />;
}
