import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { cleanText } from "@/lib/tattoo";
import { emailAddressFromContact } from "@/lib/email-payload";
import { queueQuietly, queueStudioNotice } from "@/lib/email";

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
  const contact = cleanText(body.contact, 160, 5);
  const description = cleanText(body.description, 2000, 10);
  const bodyPart = optionalText(body.bodyPart, 120);
  const size = optionalText(body.size, 120);
  const budget = optionalText(body.budget, 60);
  const referenceUrl = optionalUrl(body.referenceUrl);

  if (!name || !contact || !description) {
    return NextResponse.json(
      { ok: false, message: "Unesi ime, kontakt i malo detaljniji opis ideje." },
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
  const customerEmail = emailAddressFromContact(contact);
  const details =
    `Novi javni tattoo upit #${inquiryId}\n\n` +
    `Ime: ${name}\nKontakt: ${contact}\nDeo tela: ${bodyPart || "—"}\n` +
    `Veličina: ${size || "—"}\nBudžet: ${budget || "—"}\n` +
    `Referenca: ${referenceUrl || "—"}\n\n${description}`;

  await Promise.all([
    queueStudioNotice({
      templateKey: "public-inquiry-studio-notice",
      subject: `Novi tattoo upit: ${name}`,
      body: details,
      replyTo: customerEmail ?? undefined,
    }),
    customerEmail
      ? queueQuietly({
          userId: null,
          recipient: customerEmail,
          templateKey: "public-inquiry-received",
          subject: "Primili smo tvoju tattoo ideju",
          body:
            `Zdravo ${name},\n\nPrimili smo tvoju tattoo ideju #${inquiryId}. ` +
            "Pregledaćemo detalje i javiti ti se sa narednim korakom, obično u roku od 24h.\n\nDropz Tattoo",
          replyTo: process.env.EMAIL_REPLY_TO,
        })
      : Promise.resolve({ queued: false, sent: false }),
  ]);

  return NextResponse.json({ ok: true, id: inquiryId }, { status: 201 });
}
