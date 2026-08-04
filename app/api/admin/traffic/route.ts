import { NextResponse } from "next/server";
import { getTrafficReport } from "@/lib/traffic";
import { pickDays } from "@/lib/traffic-shape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const days = pickDays(new URL(request.url).searchParams.get("days"));
  const result = await getTrafficReport(days);

  if (result.ok) {
    return NextResponse.json({ ok: true, days, ...result.report });
  }

  return NextResponse.json({ days, ...result });
}
