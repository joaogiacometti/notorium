import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFixtureBlob } from "@/lib/media-storage/fixture-blob-store";
import { createFixtureMediaStorageProvider } from "@/lib/media-storage/fixture-provider";

const PDF_PATH = "notorium/pdfs/user-1/abc-book.pdf";

describe("createFixtureMediaStorageProvider", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(tmpdir(), "notorium-media-fixture-"));
    await writeFixtureBlob(
      rootDir,
      PDF_PATH,
      new TextEncoder().encode("0123456789"),
      "application/pdf",
    );
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("reports a stored blob's size and type, and null when missing", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    await expect(provider.headBlob(PDF_PATH)).resolves.toEqual({
      size: 10,
      contentType: "application/pdf",
      uploadedAt: expect.any(Date),
    });
    await expect(
      provider.headBlob("notorium/pdfs/user-1/missing.pdf"),
    ).resolves.toBeNull();
  });

  it("reads a byte range as partial content", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    const blob = await provider.readBlob({
      pathname: PDF_PATH,
      range: "bytes=2-4",
    });

    expect(blob?.contentRange).toBe("bytes 2-4/10");
    expect(blob?.size).toBe(3);
    await expect(new Response(blob?.stream).text()).resolves.toBe("234");
  });

  it("reads an empty blob without a range", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);
    const emptyPath = "notorium/pdfs/user-1/empty.pdf";
    await writeFixtureBlob(rootDir, emptyPath, new Uint8Array(), "text/plain");

    const blob = await provider.readBlob({ pathname: emptyPath });

    expect(blob?.size).toBe(0);
    await expect(new Response(blob?.stream).text()).resolves.toBe("");
  });

  it("rejects a range past the end like storage does", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    await expect(
      provider.readBlob({ pathname: PDF_PATH, range: "bytes=10-" }),
    ).rejects.toThrow("bytes=10-");
  });

  it("lists by prefix and deletes stored blobs", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    await expect(
      provider.listImagePathnames({ prefix: "notorium/pdfs/" }),
    ).resolves.toEqual([PDF_PATH]);
    await provider.deleteImages({ pathnames: [PDF_PATH] });
    await expect(
      provider.listImagePathnames({ prefix: "notorium/pdfs/" }),
    ).resolves.toEqual([]);
  });

  it("issues a client token the Vercel Blob client accepts", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    const token = await provider.createClientUploadToken({
      pathname: PDF_PATH,
      maximumSizeInBytes: 100,
      allowedContentTypes: ["application/pdf"],
    });

    expect(token.startsWith("vercel_blob_client_")).toBe(true);
    expect(token.split("_")[3]).toBe("fixture");
  });

  it("refuses pathnames that escape the fixture folder", async () => {
    const provider = createFixtureMediaStorageProvider(rootDir);

    await expect(provider.headBlob("../outside.pdf")).rejects.toThrow(
      "../outside.pdf",
    );
  });
});
