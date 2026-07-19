import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const FIELDS = ["name", "logo_url", "currency", "locale", "phone", "email", "address", "instagram", "facebook", "tiktok"] as const;
type Field = (typeof FIELDS)[number];

// Admin: studio settings (single row, id=1). Groundwork for white-label/multi-tenant.
export async function GET() {
  const sql = getSql();
  const rows = (await sql`
    SELECT name, logo_url, currency, locale, phone, email, address, instagram, facebook, tiktok, updated_at
    FROM studio_settings WHERE id = 1
  `) as Record<string, string | null>[];
  return NextResponse.json({ ok: true, settings: rows[0] ?? null });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const values: Partial<Record<Field, string | null>> = {};
  for (const f of FIELDS) {
    if (f in body) {
      const v = body[f];
      if (v !== null && typeof v !== "string") {
        return NextResponse.json({ ok: false, message: `Invalid ${f}` }, { status: 400 });
      }
      values[f] = typeof v === "string" ? v.trim().slice(0, 300) || null : null;
    }
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ ok: false, message: "Nothing to update" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    UPDATE studio_settings SET
      name = CASE WHEN ${"name" in values} THEN ${values.name ?? null} ELSE name END,
      logo_url = CASE WHEN ${"logo_url" in values} THEN ${values.logo_url ?? null} ELSE logo_url END,
      currency = CASE WHEN ${"currency" in values} THEN COALESCE(${values.currency ?? null}, 'RSD') ELSE currency END,
      locale = CASE WHEN ${"locale" in values} THEN COALESCE(${values.locale ?? null}, 'sr') ELSE locale END,
      phone = CASE WHEN ${"phone" in values} THEN ${values.phone ?? null} ELSE phone END,
      email = CASE WHEN ${"email" in values} THEN ${values.email ?? null} ELSE email END,
      address = CASE WHEN ${"address" in values} THEN ${values.address ?? null} ELSE address END,
      instagram = CASE WHEN ${"instagram" in values} THEN ${values.instagram ?? null} ELSE instagram END,
      facebook = CASE WHEN ${"facebook" in values} THEN ${values.facebook ?? null} ELSE facebook END,
      tiktok = CASE WHEN ${"tiktok" in values} THEN ${values.tiktok ?? null} ELSE tiktok END,
      updated_at = now()
    WHERE id = 1
  `;
  return NextResponse.json({ ok: true });
}
