// Rewrites rows that still point at the old /media/*.jpeg|jpg|png files, which
// scripts/optimize-images.mjs replaced with .webp siblings. Blob URLs and
// external URLs are untouched.
//
//   node scripts/migrate-media-webp.mjs --dry   list what would change
//   node scripts/migrate-media-webp.mjs         apply
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(url);
const dry = process.argv.includes("--dry");
const PATTERN = "^/media/.*\\.(jpe?g|png)$";

const works = await sql`
  SELECT id, image_url FROM portfolio_works WHERE image_url ~* ${PATTERN}
`;
const settings = await sql`
  SELECT id, logo_url FROM studio_settings WHERE logo_url ~* ${PATTERN}
`;

for (const w of works) console.log(`portfolio_works#${w.id}: ${w.image_url}`);
for (const s of settings) console.log(`studio_settings#${s.id}.logo_url: ${s.logo_url}`);

if (dry) {
  console.log(`\n${works.length + settings.length} rows would change (dry run).`);
  process.exit(0);
}

await sql`
  UPDATE portfolio_works
  SET image_url = regexp_replace(image_url, '\\.(jpe?g|png)$', '.webp', 'i')
  WHERE image_url ~* ${PATTERN}
`;
await sql`
  UPDATE studio_settings
  SET logo_url = regexp_replace(logo_url, '\\.(jpe?g|png)$', '.webp', 'i')
  WHERE logo_url ~* ${PATTERN}
`;

console.log(`\nUpdated ${works.length} works + ${settings.length} settings.`);
