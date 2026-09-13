import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DATE_RE } from "@/lib/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner-only ledger of money an artist handed over (their debt from the
// owner's share of paid sessions). Middleware lets staff reach /api/admin/finance/*,
// so the role check here is the real gate.

function forbidden() {
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

// POST { staffId, amount, date?, note? }
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const staffId = Number(body.staffId);
  const amount = Number(body.amount);
  if (!Number.isInteger(staffId)) return badRequest("Invalid staffId");
  if (!Number.isFinite(amount) || amount <= 0) return badRequest("Iznos mora biti veći od 0.");
  const date = typeof body.date === "string" && DATE_RE.test(body.date) ? body.date : null;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;

  const sql = getSql();
  const artist = (await sql`SELECT id FROM staff WHERE id = ${staffId} AND role = 'staff'`) as { id: number }[];
  if (artist.length === 0) {
    return NextResponse.json({ ok: false, message: "Radnik nije nađen." }, { status: 404 });
  }

  const inserted = (await sql`
    INSERT INTO staff_payouts (staff_id, amount, paid_on, note)
    VALUES (${staffId}, ${amount}, COALESCE(${date}::date, CURRENT_DATE), ${note})
    RETURNING id
  `) as { id: number }[];
  return NextResponse.json({ ok: true, id: inserted[0].id });
}

// DELETE { id }
export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const id = Number(body.id);
  if (!Number.isInteger(id)) return badRequest("Invalid id");

  const sql = getSql();
  const deleted = (await sql`DELETE FROM staff_payouts WHERE id = ${id} RETURNING id`) as { id: number }[];
  if (deleted.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
