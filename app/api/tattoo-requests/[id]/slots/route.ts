import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { hasCompleteProfile } from "@/lib/auth/profile";
import { MONTH_RE } from "@/lib/availability";
import { getBookableRequest } from "@/lib/tattoo";
import { getAnonymousTattooMonth } from "@/lib/tattoo-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anonymous studio availability. The response intentionally contains no staff
// id, name, avatar or hint about which team member is free.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasCompleteProfile(user.uid))) {
    return NextResponse.json(
      { ok: false, code: "profile_required", message: "Dopuni profil pre izbora termina." },
      { status: 428 },
    );
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }

  const sql = getSql();
  const bookable = await getBookableRequest(sql, requestId, user.uid);
  if (!bookable) {
    return NextResponse.json(
      { ok: false, message: "Zahtev trenutno nije spreman za izbor termina." },
      { status: 409 },
    );
  }

  const duration = bookable.session_minutes as number;
  const days = await getAnonymousTattooMonth(sql, month, duration);
  return NextResponse.json({ ok: true, days, duration });
}
