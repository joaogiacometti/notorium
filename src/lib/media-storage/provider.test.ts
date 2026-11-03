import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: () => getServerEnvMock(),
}));

vi.mock("@/lib/media-storage/vercel-blob-provider", () => ({
  createVercelBlobMediaStorageProvider: () => ({ kind: "vercel" }),
}));

vi.mock("@/lib/media-storage/fixture-provider", () => ({
  createFixtureMediaStorageProvider: (rootDir: string) => ({
    kind: "fixture",
    rootDir,
  }),
}));

describe("media storage provider", () => {
  beforeEach(() => {
    vi.resetModules();
    getServerEnvMock.mockReset();
  });

  it("uses Vercel Blob when no fixture dir is set", async () => {
    getServerEnvMock.mockReturnValue({ BLOB_READ_WRITE_TOKEN: "blob-token" });

    const { getMediaStorageProvider } = await import(
      "@/lib/media-storage/provider"
    );

    await expect(getMediaStorageProvider()).resolves.toEqual({
      kind: "vercel",
    });
  });

  it("uses the disk fixture instead of Vercel Blob when a fixture dir is set", async () => {
    getServerEnvMock.mockReturnValue({
      BLOB_READ_WRITE_TOKEN: "blob-token",
      NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR: "test-results/media",
    });

    const { getMediaStorageProvider } = await import(
      "@/lib/media-storage/provider"
    );

    await expect(getMediaStorageProvider()).resolves.toEqual({
      kind: "fixture",
      rootDir: "test-results/media",
    });
  });
});
