import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const sql = neon(process.env.DATABASE_URL);
const limit = Number(process.argv[2] ?? 15);
const counts = await sql`
  SELECT status, count(*)::int AS count
  FROM email_outbox
  GROUP BY status
  ORDER BY status
`;
const rows = await sql`
  SELECT id, created_at, status, template_key, recipient, error
  FROM email_outbox
  ORDER BY id DESC
  LIMIT ${limit}
`;

console.log("Status:", counts.map((row) => `${row.status}=${row.count}`).join("  ") || "empty");
for (const row of rows) {
  console.log(`#${row.id} ${row.status} ${row.template_key} -> ${row.recipient}`);
  if (row.error) console.log(`  ${row.error}`);
}
