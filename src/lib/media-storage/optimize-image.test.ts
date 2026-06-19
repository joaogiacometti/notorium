import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimizeImageForStorage } from "@/lib/media-storage/optimize-image";

// A large, low-entropy PNG re-encodes to a much smaller WebP, so the helper takes
// the optimized branch deterministically.
async function createLargePng(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .png()
    .toBuffer();

  return new Uint8Array(buffer);
}

async function createGif(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 10, g: 200, b: 80 },
    },
  })
    .gif()
    .toBuffer();

  return new Uint8Array(buffer);
}

describe("optimizeImageForStorage", () => {
  it("re-encodes a raster image to webp with a .webp filename and fewer bytes", async () => {
    const bytes = await createLargePng();

    const result = await optimizeImageForStorage({
      bytes,
      mimeType: "image/png",
      fileName: "screenshot.PNG",
    });

    expect(result.mimeType).toBe("image/webp");
    expect(result.fileName).toBe("screenshot.webp");
    expect(result.bytes.byteLength).toBeLessThan(bytes.byteLength);

    const metadata = await sharp(Buffer.from(result.bytes)).metadata();
    expect(metadata.format).toBe("webp");
  });

  it("produces a decodable webp from a gif", async () => {
    const bytes = await createGif();

    const result = await optimizeImageForStorage({
      bytes,
      mimeType: "image/gif",
      fileName: "loop.gif",
    });

    expect(result.mimeType).toBe("image/webp");
    const metadata = await sharp(Buffer.from(result.bytes)).metadata();
    expect(metadata.format).toBe("webp");
  });

  it("caps oversized images to the max dimension", async () => {
    const buffer = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 50, g: 50, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeImageForStorage({
      bytes: new Uint8Array(buffer),
      mimeType: "image/png",
      fileName: "huge.png",
    });

    const metadata = await sharp(Buffer.from(result.bytes)).metadata();
    expect(metadata.width).toBeLessThanOrEqual(2048);
    expect(metadata.height).toBeLessThanOrEqual(2048);
  });

  it("returns non-image uploads unchanged", async () => {
    const bytes = new Uint8Array(Buffer.from("%PDF-1.7 fake"));

    const result = await optimizeImageForStorage({
      bytes,
      mimeType: "application/pdf",
      fileName: "rubric.pdf",
    });

    expect(result.mimeType).toBe("application/pdf");
    expect(result.fileName).toBe("rubric.pdf");
    expect(result.bytes).toBe(bytes);
  });

  it("returns the original when bytes cannot be decoded as an image", async () => {
    const bytes = new Uint8Array(Buffer.from("not really an image"));

    const result = await optimizeImageForStorage({
      bytes,
      mimeType: "image/png",
      fileName: "broken.png",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.fileName).toBe("broken.png");
    expect(result.bytes).toBe(bytes);
  });
});
