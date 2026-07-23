import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Light phone check: digits, spaces, and + - ( ) / only, 6–24 chars. We store
// contact info, not verify it — the studio confirms by calling.
const PHONE_RE = /^[+()/\s-]*\d[\d()/\s-]{5,23}$/;
const MIN_AGE = 16; // studio does not tattoo minors
const MAX_AGE = 100;

type ProfileRow = {
  name: string | null;
  email: string;
  phone: string | null;
  birthday: string | null;
  city: string | null;
  birthday_locked_at: string | null;
  profile_completed_at: string | null;
  profile_prompt_dismissed_at: string | null;
};

function shapeProfile(row: ProfileRow) {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthday: row.birthday, // YYYY-MM-DD or null
    city: row.city,
    birthdayLocked: row.birthday_locked_at !== null,
    completed: row.profile_completed_at !== null,
    dismissed: row.profile_prompt_dismissed_at !== null,
  };
}

async function loadProfile(uid: number): Promise<ProfileRow | null> {
  const rows = (await getSql()`
    SELECT name, email, phone, birthday::text AS birthday, city,
           birthday_locked_at, profile_completed_at, profile_prompt_dismissed_at
    FROM users WHERE id = ${uid} LIMIT 1
  `) as ProfileRow[];
  return rows[0] ?? null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const row = await loadProfile(user.uid);
  if (!row) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile: shapeProfile(row) }, { headers: { "Cache-Control": "no-store" } });
}

// Validates a YYYY-MM-DD birthday: real calendar date, in the past, plausible age.
function validateBirthday(value: string): { date: string } | { error: string } {
  if (!DATE_RE.test(value)) return { error: "Datum rođenja nije ispravan." };
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { error: "Datum rođenja nije ispravan." };
  // Guard against JS Date coercing e.g. 2020-02-31.
  const [y, m, day] = value.split("-").map(Number);
  if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) {
    return { error: "Datum rođenja nije ispravan." };
  }
  const now = new Date();
  if (d > now) return { error: "Datum rođenja ne može biti u budućnosti." };
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < day)) age--;
  if (age < MIN_AGE) return { error: `Moraš imati najmanje ${MIN_AGE} godina.` };
  if (age > MAX_AGE) return { error: "Datum rođenja nije ispravan." };
  return { date: value };
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const sql = getSql();

  // "dismiss" just records that the client closed the prompt — non-blocking,
  // they can still complete it later from their account.
  if (body.action === "dismiss") {
    await sql`UPDATE users SET profile_prompt_dismissed_at = now() WHERE id = ${user.uid}`;
    const row = await loadProfile(user.uid);
    return NextResponse.json({ ok: true, profile: row ? shapeProfile(row) : null });
  }

  const current = await loadProfile(user.uid);
  if (!current) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  // Phone (optional).
  let phone: string | null = current.phone;
  if (body.phone !== undefined) {
    if (body.phone === null || body.phone === "") {
      phone = null;
    } else if (typeof body.phone === "string" && PHONE_RE.test(body.phone.trim())) {
      phone = body.phone.trim().slice(0, 40);
    } else {
      return NextResponse.json({ ok: false, message: "Broj telefona nije ispravan." }, { status: 400 });
    }
  }

  // City (optional).
  let city: string | null = current.city;
  if (body.city !== undefined) {
    if (body.city === null || body.city === "") {
      city = null;
    } else if (typeof body.city === "string") {
      city = body.city.trim().slice(0, 80) || null;
    } else {
      return NextResponse.json({ ok: false, message: "Grad nije ispravan." }, { status: 400 });
    }
  }

  // Birthday: set-once. Locked after first save so the birthday discount can't
  // be moved around month to month. Silently keeps the locked value if a new
  // one is sent; only validates when actually setting it the first time.
  let birthday: string | null = current.birthday;
  let lockBirthday = false;
  if (body.birthday !== undefined && !current.birthday_locked_at) {
    if (body.birthday === null || body.birthday === "") {
      birthday = null;
    } else if (typeof body.birthday === "string") {
      const result = validateBirthday(body.birthday.trim());
      if ("error" in result) {
        return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
      }
      birthday = result.date;
      lockBirthday = true;
    } else {
      return NextResponse.json({ ok: false, message: "Datum rođenja nije ispravan." }, { status: 400 });
    }
  }

  await sql`
    UPDATE users SET
      phone = ${phone},
      city = ${city},
      birthday = ${birthday},
      birthday_locked_at = CASE WHEN ${lockBirthday} THEN now() ELSE birthday_locked_at END,
      profile_completed_at = COALESCE(profile_completed_at, now())
    WHERE id = ${user.uid}
  `;

  const row = await loadProfile(user.uid);
  return NextResponse.json({ ok: true, profile: row ? shapeProfile(row) : null });
}
