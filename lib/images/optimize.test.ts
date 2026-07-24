import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeToWebp, toWebpFilename, MAX_WIDTH } from "./optimize";

// A 3000px JPEG stands in for the phone photos admins actually upload.
async function bigJpeg() {
  return sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 20, g: 8, b: 40 } },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
}

describe("optimizeToWebp", () => {
  it("re-encodes to webp and caps the width", async () => {
    const meta = await sharp(await optimizeToWebp(await bigJpeg())).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(MAX_WIDTH);
  });

  it("never upscales a small image", async () => {
    const small = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();
    const meta = await sharp(await optimizeToWebp(small)).metadata();
    expect(meta.width).toBe(400);
  });

  it("honours a custom maxWidth", async () => {
    const meta = await sharp(await optimizeToWebp(await bigJpeg(), { maxWidth: 800 })).metadata();
    expect(meta.width).toBe(800);
  });

  it("accepts an ArrayBuffer, as handed over by File.arrayBuffer()", async () => {
    const buf = await bigJpeg();
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    await expect(optimizeToWebp(ab)).resolves.toBeInstanceOf(Buffer);
  });

  it("rejects data that isn't an image", async () => {
    await expect(optimizeToWebp(Buffer.from("not an image"))).rejects.toThrow();
  });
});

describe("toWebpFilename", () => {
  it("swaps the extension", () => {
    expect(toWebpFilename("IMG_2288.jpeg")).toBe("IMG_2288.webp");
    expect(toWebpFilename("photo.final.PNG")).toBe("photo.final.webp");
  });

  it("appends when there is no extension", () => {
    expect(toWebpFilename("scan")).toBe("scan.webp");
  });
});
