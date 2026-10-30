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

  it("reports storage unavailable when blob token is missing", async () => {
    getServerEnvMock.mockReturnValue({ BLOB_READ_WRITE_TOKEN: undefined });

    const { isMediaStorageConfigured } = await import(
      "@/lib/media-storage/provider"
    );

    expect(isMediaStorageConfigured()).toBe(false);
  });

  it("reports storage available when blob token is configured", async () => {
    getServerEnvMock.mockReturnValue({ BLOB_READ_WRITE_TOKEN: "blob-token" });

    const { isMediaStorageConfigured } = await import(
      "@/lib/media-storage/provider"
    );

    expect(isMediaStorageConfigured()).toBe(true);
  });

  it("uses the disk fixture instead of Vercel Blob when a fixture dir is set", async () => {
    getServerEnvMock.mockReturnValue({
      BLOB_READ_WRITE_TOKEN: "blob-token",
      NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR: "test-results/media",
    });

    const { getMediaStorageProvider, isMediaStorageConfigured } = await import(
      "@/lib/media-storage/provider"
    );

    expect(isMediaStorageConfigured()).toBe(true);
    await expect(getMediaStorageProvider()).resolves.toEqual({
      kind: "fixture",
      rootDir: "test-results/media",
    });
  });
});
