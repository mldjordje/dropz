import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCopyOverrides } from "@/lib/content";
import { locales } from "@/components/landing/content";

export async function GET() {
  try {
    const overrides = await getCopyOverrides();
    return NextResponse.json({ ok: true, overrides });
  } catch {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: { locale?: string; values?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const locale = body.locale;
  if (!locale || !(locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ ok: false, message: "Invalid locale" }, { status: 400 });
  }
  if (typeof body.values !== "object" || body.values === null || Array.isArray(body.values)) {
    return NextResponse.json({ ok: false, message: "values must be an object" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO site_content (key, value, updated_at)
    VALUES (${`copy_${locale}`}, ${JSON.stringify(body.values)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}
