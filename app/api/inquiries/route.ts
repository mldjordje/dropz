import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { cleanText } from "@/lib/tattoo";
import { normalizePhone } from "@/lib/phone";
import { queueStudioNotice } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return cleanText(value, max);
}

function optionalUrl(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().slice(0, 1000) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Neispravan zahtev." }, { status: 400 });
  }

  // Quietly accept bot submissions without storing or notifying.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const name = cleanText(body.name, 120, 2);
  const contact = normalizePhone(body.contact);
  const description = cleanText(body.description, 2000, 10);
  const bodyPart = optionalText(body.bodyPart, 120);
  const size = optionalText(body.size, 120);
  const budget = optionalText(body.budget, 60);
  const referenceUrl = optionalUrl(body.referenceUrl);

  if (!name || !description) {
    return NextResponse.json(
      { ok: false, message: "Unesi ime, broj telefona i malo detaljniji opis ideje." },
      { status: 400 },
    );
  }
  if (!contact) {
    return NextResponse.json(
      { ok: false, message: "Broj telefona nije ispravan.", code: "bad_phone" },
      { status: 400 },
    );
  }
  if (body.referenceUrl && !referenceUrl) {
    return NextResponse.json({ ok: false, message: "Link ka referenci nije ispravan." }, { status: 400 });
  }

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO public_inquiries
      (name, contact, description, body_part, size, budget, reference_url)
    VALUES
      (${name}, ${contact}, ${description}, ${bodyPart}, ${size}, ${budget}, ${referenceUrl})
    RETURNING id
  `) as { id: number }[];
  const inquiryId = rows[0].id;
  const details =
    `Novi javni tattoo upit #${inquiryId}\n\n` +
    `Ime: ${name}\nTelefon: ${contact}\nDeo tela: ${bodyPart || "—"}\n` +
    `Veličina: ${size || "—"}\nBudžet: ${budget || "—"}\n` +
    `Referenca: ${referenceUrl || "—"}\n\n${description}`;

  await queueStudioNotice({
    templateKey: "public-inquiry-studio-notice",
    subject: `Novi tattoo upit: ${name}`,
    body: details,
  });

  return NextResponse.json({ ok: true, id: inquiryId }, { status: 201 });
}
