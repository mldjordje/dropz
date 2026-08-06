import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicInquiry = {
  id: number;
  name: string;
  contact: string;
  description: string;
  body_part: string | null;
  size: string | null;
  budget: string | null;
  reference_url: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
};

export async function GET() {
  const sql = getSql();
  const inquiries = (await sql`
    SELECT id, name, contact, description, body_part, size, budget,
           reference_url, status, created_at
    FROM public_inquiries
    ORDER BY created_at DESC
    LIMIT 300
  `) as PublicInquiry[];
  return NextResponse.json({ ok: true, inquiries });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const id = Number(body.id);
  const status = body.status;
  if (!Number.isInteger(id) || !["new", "contacted", "closed"].includes(String(status))) {
    return NextResponse.json({ ok: false, message: "Neispravan zahtev." }, { status: 400 });
  }
  const sql = getSql();
  const rows = (await sql`
    UPDATE public_inquiries
    SET status = ${String(status)}
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Upit nije nađen." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
