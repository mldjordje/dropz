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
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS tattoo_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    size TEXT,
    body_part TEXT,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    session_count INT,
    session_minutes INT,
    price TEXT,
    admin_note TEXT,
    sessions_done INT NOT NULL DEFAULT 0,
    quoted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS tattoo_requests_user ON tattoo_requests (user_id)
`;

await sql`
  CREATE INDEX IF NOT EXISTS tattoo_requests_status ON tattoo_requests (status)
`;

await sql`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    href TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, read_at)
`;

await sql`
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'manual',
    title TEXT,
    request_id INT REFERENCES tattoo_requests(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS appointments_date ON appointments (date)
`;

await sql`
  CREATE TABLE IF NOT EXISTS working_hours (
    weekday INT PRIMARY KEY,
    open_time TEXT,
    close_time TEXT
  )
`;

// Seed default working hours once (Mon-Sat 10:00-20:00, Sunday closed).
// Weekday convention: 0 = Monday ... 6 = Sunday.
await sql`
  INSERT INTO working_hours (weekday, open_time, close_time)
  SELECT d, CASE WHEN d = 6 THEN NULL ELSE '10:00' END, CASE WHEN d = 6 THEN NULL ELSE '20:00' END
  FROM generate_series(0, 6) AS d
  ON CONFLICT (weekday) DO NOTHING
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
console.log("users table ready.");
console.log("tattoo_requests table ready.");
console.log("notifications table ready.");
console.log("appointments table ready.");
console.log("working_hours table ready (Mon-Sat 10-20 seeded).");
console.log("consult_days table ready.");
console.log("portfolio_categories table ready.");
console.log("portfolio_works table ready.");
