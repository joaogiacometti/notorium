import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: () => getServerEnvMock(),
}));

vi.mock("@/lib/media-storage/vercel-blob-provider", () => ({
  createVercelBlobMediaStorageProvider: () => ({}),
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
});
