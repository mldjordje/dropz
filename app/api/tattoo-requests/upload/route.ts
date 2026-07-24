import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth/user-session";
import { optimizeToWebp, toWebpFilename } from "@/lib/images/optimize";

export const runtime = "nodejs"; // sharp needs the Node runtime

const MAX_BYTES = 25 * 1024 * 1024; // 25MB in — everything is re-encoded anyway

// Reference photos are only ever viewed in a small preview / lightbox.
const REFERENCE_MAX_WIDTH = 1600;

// Client: upload a reference image for a tattoo request. Mirrors the admin
// portfolio upload; degrades to 501 while blob storage isn't configured (the
// form then simply submits without images).
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, message: "Upload slika još nije podešen." },
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
    return NextResponse.json({ ok: false, message: "Slika je prevelika (max 25MB)" }, { status: 400 });
  }

  // Clients upload straight from a phone camera roll — downscale and re-encode
  // to WebP so the admin request list stays light.
  let optimized: Buffer;
  try {
    optimized = await optimizeToWebp(await file.arrayBuffer(), { maxWidth: REFERENCE_MAX_WIDTH });
  } catch {
    return NextResponse.json({ ok: false, message: "Sliku nije moguce obraditi." }, { status: 400 });
  }

  const blob = await put(
    `requests/${user.uid}/${Date.now()}-${toWebpFilename(file.name)}`,
    optimized,
    { access: "public", addRandomSuffix: true, contentType: "image/webp" },
  );

  return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
}
