import sharp from "sharp";

// Single source of truth for image compression: the build-time script that
// converts public/media, and every upload route, run the exact same pipeline.

// Nothing on the site is displayed wider than a full-bleed hero, so 2000px is
// already 2x for the largest render box.
export const MAX_WIDTH = 2000;
export const WEBP_QUALITY = 80;

export type OptimizeOptions = {
  maxWidth?: number;
  quality?: number;
};

// Takes any raster input (JPEG/PNG/HEIC/WebP/AVIF/TIFF/GIF) and returns WebP
// bytes: EXIF-rotated, stripped of metadata, capped at maxWidth.
export async function optimizeToWebp(
  input: Buffer | Uint8Array | ArrayBuffer,
  options: OptimizeOptions = {},
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer);
  return sharp(buffer, { animated: true })
    .rotate() // bake in EXIF orientation before metadata is dropped
    .resize({
      width: options.maxWidth ?? MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: options.quality ?? WEBP_QUALITY, effort: 5 })
    .toBuffer();
}

// "IMG_2288.jpeg" -> "IMG_2288.webp"; keeps the name recognisable in Blob.
export function toWebpFilename(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, "") || "image"}.webp`;
}
