import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { cleanText } from "@/lib/tattoo";
import { seedDefaultHours, type StaffMember } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Team management — owner only (middleware blocks staff from this route, and
// the owner check below is defense in depth).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function forbidden() {
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

  const sql = getSql();
  const staff = (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at
    FROM staff ORDER BY (role = 'owner') DESC, name
  `) as StaffMember[];
  return NextResponse.json({ ok: true, staff });
}

// POST { email, name } — add an artist. Their gmail is the key: when they sign
// in with Google, the panel opens with the staff role.
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Neispravan email." }, { status: 400 });
  }
  const name = cleanText(body.name, 120);
  if (!name) {
    return NextResponse.json({ ok: false, message: "Ime je obavezno." }, { status: 400 });
  }

  const sql = getSql();
  const existing = (await sql`SELECT id FROM staff WHERE lower(email) = ${email}`) as { id: number }[];
  if (existing.length > 0) {
    return NextResponse.json({ ok: false, message: "Taj email je već u timu." }, { status: 409 });
  }

  const rows = (await sql`
    INSERT INTO staff (email, name, role)
    VALUES (${email}, ${name}, 'staff')
    RETURNING id, email, name, role, active, avatar_url, created_at
  `) as StaffMember[];
  await seedDefaultHours(sql, rows[0].id);

  return NextResponse.json({ ok: true, member: rows[0] }, { status: 201 });
}

// PATCH { id, name?, email?, active? } — edit a member. The owner row can be
// renamed / re-mailed but never deactivated.
export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

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

  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at FROM staff WHERE id = ${id}
  `) as StaffMember[];
  const current = rows[0];
  if (!current) {
    return NextResponse.json({ ok: false, message: "Član nije nađen." }, { status: 404 });
  }

  let name = current.name;
  if (body.name !== undefined) {
    const cleaned = cleanText(body.name, 120);
    if (!cleaned) return NextResponse.json({ ok: false, message: "Neispravno ime." }, { status: 400 });
    name = cleaned;
  }

  let email = current.email;
  if (body.email !== undefined) {
    const next = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(next)) {
      return NextResponse.json({ ok: false, message: "Neispravan email." }, { status: 400 });
    }
    const clash = (await sql`
      SELECT id FROM staff WHERE lower(email) = ${next} AND id <> ${id}
    `) as { id: number }[];
    if (clash.length > 0) {
      return NextResponse.json({ ok: false, message: "Taj email je već u timu." }, { status: 409 });
    }
    email = next;
  }

  let active = current.active;
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ ok: false, message: "Invalid active" }, { status: 400 });
    }
    if (current.role === "owner" && body.active === false) {
      return NextResponse.json({ ok: false, message: "Owner ne može biti deaktiviran." }, { status: 400 });
    }
    active = body.active;
  }

  // Changing the email unbinds the previous Google account.
  const googleReset = email !== current.email;
  await sql`
    UPDATE staff
    SET name = ${name}, email = ${email}, active = ${active},
        google_id = CASE WHEN ${googleReset} THEN NULL ELSE google_id END
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
