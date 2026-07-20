import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Who is looking at the admin panel — the shell uses this to decide which
// navigation (owner vs staff) to render. Auth enforced by middleware.ts.
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    role: session.role,
    staffId: session.staffId,
    name: session.name,
  });
}
