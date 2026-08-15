"use client";

// Perpetual "offer ends soon" countdown — always ticks down to the end of the
// current week, so it never needs manual resetting and always reads as an
// active discount. Client-only: renders nothing until mounted, to avoid an
// SSR/client time mismatch.
import { useEffect, useState } from "react";

function msUntilWeekEnd(): number {
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7; // Mon=0..Sun=6
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayIdx), 23, 59, 59, 999);
  return end.getTime() - now.getTime();
}

function fmt(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s };
}

export function EduCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilWeekEnd());
    const id = setInterval(() => setRemaining(msUntilWeekEnd()), 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null;
  const { d, h, m, s } = fmt(remaining);

  return (
    <p className="edu-countdown" role="status">
      <span>Popust ističe za</span>
      <strong>
        {d > 0 && `${d}d `}
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </strong>
    </p>
  );
}
