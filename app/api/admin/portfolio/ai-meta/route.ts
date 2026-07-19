import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isValidImageUrl, slugify } from "@/lib/portfolio";
import { SITE } from "@/lib/site";

// Admin: AI metadata for a portfolio work. Sends the image to Claude and gets
// back alt text, description, tags and an SEO title (Serbian), for the admin
// to review before saving. Degrades gracefully when ANTHROPIC_API_KEY is unset.

const SCHEMA = {
  type: "object" as const,
  properties: {
    alt: { type: "string" as const, description: "Kratak alt tekst slike na srpskom (latinica), max 120 karaktera" },
    description: { type: "string" as const, description: "Opis rada za stranicu, 2-3 rečenice na srpskom (latinica)" },
    tags: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "5-8 tagova malim slovima: stil (npr. fineline, blackwork, realizam), motiv, deo tela ako se vidi",
    },
    seo_title: { type: "string" as const, description: "SEO naslov stranice na srpskom, max 60 karaktera, uključi stil tetovaže" },
  },
  required: ["alt", "description", "tags", "seo_title"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "AI nije podešen (ANTHROPIC_API_KEY nedostaje) — popuni polja ručno." },
      { status: 501 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const imageUrl = body.image_url;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!isValidImageUrl(imageUrl)) {
    return NextResponse.json({ ok: false, message: "Neispravan URL slike" }, { status: 400 });
  }

  // Fetch the image server-side (works for blob URLs and same-origin paths in dev).
  const absoluteUrl = imageUrl.startsWith("/") ? `${SITE.url}${imageUrl}` : imageUrl;
  let imageData: string;
  let mediaType: string;
  try {
    const res = await fetch(absoluteUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    mediaType = contentType.split(";")[0];
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)) {
      return NextResponse.json({ ok: false, message: "Nepodržan format slike" }, { status: 400 });
    }
    imageData = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json({ ok: false, message: "Ne mogu da preuzmem sliku" }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg", data: imageData },
            },
            {
              type: "text",
              text:
                `Ovo je fotografija tetovaže iz portfolija studija "${SITE.name}" (${SITE.city}).` +
                (title ? ` Naslov rada: "${title}".` : "") +
                " Generiši SEO metapodatke na srpskom jeziku (latinica).",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ ok: false, message: "AI je odbio zahtev — popuni polja ručno." }, { status: 502 });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    const meta = JSON.parse(textBlock.text) as {
      alt: string;
      description: string;
      tags: string[];
      seo_title: string;
    };

    return NextResponse.json({
      ok: true,
      meta: {
        alt: meta.alt.slice(0, 200),
        description: meta.description.slice(0, 1000),
        tags: meta.tags.slice(0, 10).map((t) => t.toLowerCase().trim()).filter(Boolean),
        seo_title: meta.seo_title.slice(0, 80),
        slug: slugify(title || meta.seo_title),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "AI generisanje nije uspelo — pokušaj ponovo." }, { status: 502 });
  }
}
