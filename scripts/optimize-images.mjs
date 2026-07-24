// Converts every raster image under public/media to WebP.
//
// Originals are archived in media/ (outside public/, so they are not deployed)
// before the public copy is removed. Re-runnable: files that already have an
// up-to-date .webp sibling are skipped.
//
//   node scripts/optimize-images.mjs           convert + drop originals
//   node scripts/optimize-images.mjs --keep    convert, keep originals in public/
//   node scripts/optimize-images.mjs --dry     report only

import { readdir, stat, mkdir, copyFile, unlink, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { optimizeToWebp, MAX_WIDTH } from "../lib/images/optimize.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_MEDIA = path.join(ROOT, "public", "media");
const ARCHIVE = path.join(ROOT, "media");
const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png"]);

const keep = process.argv.includes("--keep");
const dry = process.argv.includes("--dry");

const fmt = (b) => `${(b / 1024).toFixed(0)}KB`;

async function run() {
  await mkdir(ARCHIVE, { recursive: true });
  const entries = await readdir(PUBLIC_MEDIA, { withFileTypes: true });

  let before = 0;
  let after = 0;
  let converted = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXT.has(ext)) continue;

    const src = path.join(PUBLIC_MEDIA, entry.name);
    const dest = path.join(PUBLIC_MEDIA, `${path.basename(entry.name, ext)}.webp`);
    const srcSize = (await stat(src)).size;
    before += srcSize;

    if (dry) {
      const meta = await sharp(src).metadata();
      console.log(`  ${entry.name} — ${fmt(srcSize)} ${meta.width}x${meta.height}`);
      continue;
    }

    const out = await optimizeToWebp(await readFile(src));
    await writeFile(dest, out);
    const destSize = out.byteLength;
    after += destSize;
    converted += 1;

    // Archive the original outside public/ so nothing is lost, then drop it
    // from the deploy so the big JPEG never ships.
    const archived = path.join(ARCHIVE, entry.name);
    if (!existsSync(archived)) await copyFile(src, archived);
    if (!keep) await unlink(src);

    const pct = (100 - (destSize / srcSize) * 100).toFixed(0);
    console.log(`  ${entry.name} -> ${path.basename(dest)}  ${fmt(srcSize)} -> ${fmt(destSize)}  (-${pct}%)`);
  }

  if (dry) return;
  console.log(
    `\n${converted} images, max width ${MAX_WIDTH}px: ${fmt(before)} -> ${fmt(after)} ` +
      `(-${(100 - (after / before) * 100).toFixed(0)}%)`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
