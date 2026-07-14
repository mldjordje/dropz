import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

// Admin: upload a portfolio image via Vercel Blob. Auth is enforced by
// middleware.ts for the /api/admin/:path* matcher. Degrades gracefully when
// blob storage isn't configured yet — the admin UI falls back to a URL
// text input on a 501.
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, message: "Upload nije podešen (BLOB_READ_WRITE_TOKEN); nalepi URL slike ručno." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Fajl nije prosleđen" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "Fajl mora biti slika" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "Slika je prevelika (max 8MB)" }, { status: 400 });
  }

  const blob = await put(`portfolio/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
}
