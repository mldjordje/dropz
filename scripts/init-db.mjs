// One-time DB setup: creates the bookings table on Neon.
// Run: node scripts/init-db.mjs  (reads DATABASE_URL from .env.local)
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'consult',
    note TEXT,
    date DATE NOT NULL,
    slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    locale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot
  ON bookings (date, slot)
  WHERE status <> 'canceled'
`;

await sql`
  CREATE TABLE IF NOT EXISTS consult_days (
    date DATE PRIMARY KEY,
    slots TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS portfolio_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sort INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS portfolio_works (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES portfolio_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("bookings table ready.");
console.log("consult_days table ready.");
console.log("portfolio_categories table ready.");
console.log("portfolio_works table ready.");
