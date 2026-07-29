import { NextResponse } from "next/server";

const retired = () =>
  NextResponse.json(
    { ok: false, message: "Koristi zajednički Portfolio." },
    { status: 410 },
  );

export const GET = retired;
export const POST = retired;
export const PATCH = retired;
export const DELETE = retired;
