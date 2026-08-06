// Adds the required consultation phone column to bookings.
// Run: node scripts/migrate-booking-phone.mjs  (reads DATABASE_URL from .env.local)
// Additive and idempotent: existing rows keep phone = NULL and the admin UI
// falls back to the old free-text `contact` field for them.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT`;

const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'bookings' ORDER BY ordinal_position
`;
console.log("bookings columns:", cols.map((c) => c.column_name).join(", "));
