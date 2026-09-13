// Staff earnings: EUR rate for the owner/artist split rules and a ledger of
// payouts artists hand over to the owner.
// Run: node scripts/migrate-staff-earnings.mjs  (reads DATABASE_URL from .env.local)
// Additive and idempotent.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE studio_settings ADD COLUMN IF NOT EXISTS eur_rate NUMERIC NOT NULL DEFAULT 117.2`;
await sql`
  CREATE TABLE IF NOT EXISTS staff_payouts (
    id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS staff_payouts_staff ON staff_payouts (staff_id, paid_on)`;

const [settings] = await sql`SELECT eur_rate::float8 AS eur_rate FROM studio_settings WHERE id = 1`;
console.log("eur_rate:", settings?.eur_rate, "· staff_payouts ready.");
