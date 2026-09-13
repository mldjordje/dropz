import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DEFAULT_EUR_RATE, splitSession, type Split } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const METHODS = ["cash", "card", "transfer"] as const;
const TREND_MONTHS = 6;

type Sql = ReturnType<typeof getSql>;

type Row = {
  id: number; kind: string; date: string; start_time: string; end_time: string; status: string;
  price: number | null; deposit: number | null; deposit_paid: boolean; paid: boolean;
  payment_method: string | null; label: string;
  artist_id: number | null; artist_name: string | null; artist_role: string | null;
};
type SplitRow = Row & { by_owner: boolean; split: Split };
type StaffRow = { id: number; name: string; role: string; active: boolean };

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(y, m, 1);
  return {
    from: `${month}-01`,
    to: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`,
  };
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getEurRate(sql: Sql) {
  const rows = (await sql`SELECT eur_rate::float8 AS eur_rate FROM studio_settings WHERE id = 1`) as { eur_rate: number | null }[];
  const rate = rows[0]?.eur_rate;
  return rate && rate > 0 ? rate : DEFAULT_EUR_RATE;
}

// Appointments without an artist predate roles and belong to the owner.
const isOwnerRow = (r: { artist_id: number | null; artist_role: string | null }) =>
  r.artist_id == null || r.artist_role === "owner";

function summarize(rows: SplitRow[]) {
  const t = {
    priced: 0, collected: 0, outstanding: 0, sessions: rows.length, done: 0, paidSessions: 0,
    ownerEarned: 0, ownerFromOwn: 0, ownerFromStaff: 0, artistEarned: 0,
    methods: { cash: 0, card: 0, transfer: 0, other: 0 },
  };
  for (const r of rows) {
    if (r.price != null) t.priced += r.price;
    if (r.paid && r.price != null) t.collected += r.price;
    else if (r.deposit_paid && r.deposit != null) t.collected += r.deposit;
    if (r.status === "done") t.done += 1;
    if (r.paid && r.price != null && r.price > 0) {
      t.paidSessions += 1;
      t.ownerEarned += r.split.owner;
      t.artistEarned += r.split.artist;
      if (r.by_owner) t.ownerFromOwn += r.split.owner;
      else t.ownerFromStaff += r.split.owner;
      const method = (METHODS as readonly string[]).includes(r.payment_method ?? "")
        ? (r.payment_method as (typeof METHODS)[number])
        : "other";
      t.methods[method] += r.price;
    }
  }
  t.outstanding = Math.max(0, t.priced - t.collected);
  return t;
}

// Admin finance. Owner: whole studio, optional ?artistId filter, per-artist
// team table with debts, payouts and a 6-month trend. Staff: pinned to their
// own sessions, same shape. A session counts toward earnings once it is paid
// in full; the owner/artist split follows lib/earnings.ts.
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const isOwner = session.role === "owner";
  if (!isOwner && !session.staffId) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const selfId = isOwner ? null : session.staffId;

  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }
  const { from, to } = monthRange(month);
  const trendFrom = monthRange(shiftMonth(month, -(TREND_MONTHS - 1))).from;

  const sql = getSql();
  const rate = await getEurRate(sql);

  const staff = (await sql`
    SELECT id, name, role, active FROM staff
    WHERE (${isOwner} OR id = ${selfId})
    ORDER BY (role = 'owner') DESC, name
  `) as StaffRow[];
  const ownerId = staff.find((s) => s.role === "owner")?.id ?? null;

  const requested = Number(params.get("artistId") ?? 0);
  const artistFilter = isOwner ? (Number.isInteger(requested) && requested > 0 ? requested : null) : selfId;
  const belongsTo = (r: { artist_id: number | null }, id: number) =>
    r.artist_id === id || (r.artist_id == null && id === ownerId);

  const withSplit = (r: Row): SplitRow => {
    const byOwner = isOwnerRow(r);
    return { ...r, by_owner: byOwner, split: splitSession(r.price, rate, byOwner) };
  };

  // Every paid session in the trend window plus the whole selected month —
  // one query each; totals, team table and trend are derived in memory.
  const [monthRaw, trendRaw, paidStaffRaw, payoutTotals, payouts] = await Promise.all([
    sql`
      SELECT a.id, a.kind, a.date::text AS date, a.start_time, a.end_time, a.status,
             a.price::float8 AS price, a.deposit::float8 AS deposit,
             a.deposit_paid, a.paid, a.payment_method,
             a.artist_id, s.name AS artist_name, s.role AS artist_role,
             COALESCE(NULLIF(a.title, ''), u.name, 'Termin') AS label
      FROM appointments a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN staff s ON s.id = a.artist_id
      WHERE a.date >= ${from} AND a.date < ${to} AND a.status <> 'canceled'
        AND (${isOwner} OR a.artist_id = ${selfId})
      ORDER BY a.date ASC, a.start_time ASC
    `,
    sql`
      SELECT a.date::text AS date, a.price::float8 AS price, a.artist_id, s.role AS artist_role
      FROM appointments a
      LEFT JOIN staff s ON s.id = a.artist_id
      WHERE a.paid AND a.status <> 'canceled' AND a.price > 0
        AND a.date >= ${trendFrom} AND a.date < ${to}
        AND (${isOwner} OR a.artist_id = ${selfId})
    `,
    // All-time paid sessions of artists (not the owner) — the base of their debt.
    sql`
      SELECT a.artist_id, a.price::float8 AS price
      FROM appointments a
      JOIN staff s ON s.id = a.artist_id
      WHERE s.role = 'staff' AND a.paid AND a.status <> 'canceled' AND a.price > 0
        AND (${isOwner} OR a.artist_id = ${selfId})
    `,
    sql`
      SELECT staff_id, SUM(amount)::float8 AS total FROM staff_payouts
      WHERE (${isOwner} OR staff_id = ${selfId})
      GROUP BY staff_id
    `,
    sql`
      SELECT p.id, p.staff_id, s.name AS staff_name, p.amount::float8 AS amount,
             p.paid_on::text AS paid_on, p.note
      FROM staff_payouts p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.paid_on >= ${from} AND p.paid_on < ${to}
        AND (${isOwner} OR p.staff_id = ${selfId})
      ORDER BY p.paid_on DESC, p.id DESC
    `,
  ]);

  const monthRows = (monthRaw as Row[]).map(withSplit);
  const payoutRows = payouts as { id: number; staff_id: number; staff_name: string; amount: number; paid_on: string; note: string | null }[];

  const owedAll = new Map<number, number>();
  for (const r of paidStaffRaw as { artist_id: number; price: number }[]) {
    owedAll.set(r.artist_id, (owedAll.get(r.artist_id) ?? 0) + splitSession(r.price, rate, false).owner);
  }
  const paidOutAll = new Map((payoutTotals as { staff_id: number; total: number }[]).map((p) => [p.staff_id, p.total]));

  const team = staff
    .map((s) => {
      const rows = monthRows.filter((r) => belongsTo(r, s.id));
      const t = summarize(rows);
      const isStaff = s.role === "staff";
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        active: s.active,
        sessions: t.sessions,
        paidSessions: t.paidSessions,
        collected: t.ownerEarned + t.artistEarned,
        artistShare: t.artistEarned,
        ownerShare: t.ownerEarned,
        unpaid: t.outstanding,
        payoutsMonth: payoutRows.filter((p) => p.staff_id === s.id).reduce((sum, p) => sum + p.amount, 0),
        owedTotal: isStaff ? owedAll.get(s.id) ?? 0 : 0,
        paidOutTotal: isStaff ? paidOutAll.get(s.id) ?? 0 : 0,
        balance: isStaff ? (owedAll.get(s.id) ?? 0) - (paidOutAll.get(s.id) ?? 0) : 0,
      };
    })
    .filter((t) => t.active || t.sessions > 0 || Math.abs(t.balance) > 0.5);

  const appointments = artistFilter == null ? monthRows : monthRows.filter((r) => belongsTo(r, artistFilter));

  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => ({
    month: shiftMonth(month, i - (TREND_MONTHS - 1)),
    collected: 0,
    owner: 0,
    artist: 0,
  }));
  for (const raw of trendRaw as { date: string; price: number; artist_id: number | null; artist_role: string | null }[]) {
    if (artistFilter != null && !belongsTo(raw, artistFilter)) continue;
    const point = trend.find((p) => p.month === raw.date.slice(0, 7));
    if (!point) continue;
    const split = splitSession(raw.price, rate, isOwnerRow(raw));
    point.collected += raw.price;
    point.owner += split.owner;
    point.artist += split.artist;
  }

  return NextResponse.json({
    ok: true,
    role: session.role,
    rate,
    month,
    artistId: artistFilter ?? 0,
    ownerId,
    appointments,
    totals: summarize(appointments),
    team,
    trend,
    payouts: artistFilter == null ? payoutRows : payoutRows.filter((p) => p.staff_id === artistFilter),
  });
}

// PATCH { id, ...payment fields } — owner on any appointment, staff on their own.
// PATCH { eurRate } — owner only.
export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const sql = getSql();

  if ("eurRate" in body) {
    if (session.role !== "owner") {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    const rate = Number(body.eurRate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 10_000) {
      return NextResponse.json({ ok: false, message: "Invalid rate" }, { status: 400 });
    }
    await sql`UPDATE studio_settings SET eur_rate = ${rate}, updated_at = now() WHERE id = 1`;
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = (await sql`SELECT id, artist_id FROM appointments WHERE id = ${id}`) as { id: number; artist_id: number | null }[];
  if (existing.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  if (session.role !== "owner" && (session.staffId === null || existing[0].artist_id !== session.staffId)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
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

  await sql`
    UPDATE appointments SET
      price = CASE WHEN ${price !== undefined} THEN ${price ?? null} ELSE price END,
      deposit = CASE WHEN ${deposit !== undefined} THEN ${deposit ?? null} ELSE deposit END,
      deposit_paid = COALESCE(${depositPaid ?? null}, deposit_paid),
      paid = COALESCE(${paid ?? null}, paid),
      payment_method = CASE WHEN ${method !== undefined} THEN ${method ?? null} ELSE payment_method END
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
