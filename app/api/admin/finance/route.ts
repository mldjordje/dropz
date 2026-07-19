import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const METHODS = ["cash", "card", "transfer"] as const;

// Admin: monthly finance view over appointments (price / deposit / payment tracking).
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const next = new Date(y, m, 1);
  const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  const sql = getSql();
  const rows = (await sql`
    SELECT a.id, a.kind, a.date::text AS date, a.start_time, a.end_time, a.status,
           a.price::float8 AS price, a.deposit::float8 AS deposit,
           a.deposit_paid, a.paid, a.payment_method,
           COALESCE(NULLIF(a.title, ''), u.name, 'Termin') AS label
    FROM appointments a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.date >= ${from} AND a.date < ${to} AND a.status <> 'canceled'
    ORDER BY a.date ASC, a.start_time ASC
  `) as {
    id: number; kind: string; date: string; start_time: string; end_time: string; status: string;
    price: number | null; deposit: number | null; deposit_paid: boolean; paid: boolean;
    payment_method: string | null; label: string;
  }[];

  const totals = rows.reduce(
    (acc, r) => {
      if (r.price != null) acc.priced += r.price;
      if (r.paid && r.price != null) acc.collected += r.price;
      else if (r.deposit_paid && r.deposit != null) acc.collected += r.deposit;
      if (r.status === "done") acc.doneCount += 1;
      return acc;
    },
    { priced: 0, collected: 0, doneCount: 0 },
  );

  return NextResponse.json({
    ok: true,
    appointments: rows,
    totals: {
      priced: totals.priced,
      collected: totals.collected,
      outstanding: Math.max(0, totals.priced - totals.collected),
      sessions: rows.length,
      done: totals.doneCount,
    },
  });
}

// Admin: update payment fields on one appointment.
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const toNum = (v: unknown): number | null => {
    if (v === null || v === "" || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const price = "price" in body ? toNum(body.price) : undefined;
  const deposit = "deposit" in body ? toNum(body.deposit) : undefined;
  const depositPaid = typeof body.deposit_paid === "boolean" ? body.deposit_paid : undefined;
  const paid = typeof body.paid === "boolean" ? body.paid : undefined;
  const method =
    typeof body.payment_method === "string" && (METHODS as readonly string[]).includes(body.payment_method)
      ? body.payment_method
      : body.payment_method === null
        ? null
        : undefined;

  const sql = getSql();
  const updated = (await sql`
    UPDATE appointments SET
      price = CASE WHEN ${price !== undefined} THEN ${price ?? null} ELSE price END,
      deposit = CASE WHEN ${deposit !== undefined} THEN ${deposit ?? null} ELSE deposit END,
      deposit_paid = COALESCE(${depositPaid ?? null}, deposit_paid),
      paid = COALESCE(${paid ?? null}, paid),
      payment_method = CASE WHEN ${method !== undefined} THEN ${method ?? null} ELSE payment_method END
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  if (updated.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
