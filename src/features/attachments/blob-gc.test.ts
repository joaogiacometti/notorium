import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMediaStorageProviderMock, collectAllReferencedPathnamesMock } =
  vi.hoisted(() => ({
    getMediaStorageProviderMock: vi.fn(),
    collectAllReferencedPathnamesMock: vi.fn(),
  }));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

vi.mock("@/features/attachments/blob-references", () => ({
  collectAllReferencedPathnames: collectAllReferencedPathnamesMock,
}));

function entry(pathname: string, ageMs: number) {
  return { pathname, uploadedAt: new Date(Date.now() - ageMs) };
}

const DAY = 24 * 60 * 60 * 1000;

describe("selectOrphanBlobs", () => {
  it("collects only unreferenced blobs older than the grace period", async () => {
    const { selectOrphanBlobs } = await import(
      "@/features/attachments/blob-gc"
    );

    const entries = [
      entry("notorium/notes/u/referenced.png", 10 * DAY),
      entry("notorium/mindmaps/u/orphan.png", 10 * DAY),
      entry("notorium/mindmaps/u/fresh.png", 1000),
    ];
    const referenced = new Set(["notorium/notes/u/referenced.png"]);

    const result = selectOrphanBlobs(entries, referenced, Date.now(), DAY);

    expect(result.orphans).toEqual(["notorium/mindmaps/u/orphan.png"]);
    expect(result.skippedTooNew).toBe(1);
  });
});

describe("sweepOrphanBlobs", () => {
  const deleteFilesMock = vi.fn();
  const listFileEntriesMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteFiles: deleteFilesMock,
      listFileEntries: listFileEntriesMock,
    });
  });

  it("returns null when storage is not configured", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);
    const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");

    expect(await sweepOrphanBlobs()).toBeNull();
  });

  it("deletes orphaned blobs and reports counts", async () => {
    listFileEntriesMock.mockResolvedValue([
      entry("notorium/notes/u/keep.png", 10 * DAY),
      entry("notorium/library/u/orphan.pdf", 10 * DAY),
    ]);
    collectAllReferencedPathnamesMock.mockResolvedValue(
      new Set(["notorium/notes/u/keep.png"]),
    );

    const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");
    const report = await sweepOrphanBlobs({ minAgeMs: DAY });

    expect(deleteFilesMock).toHaveBeenCalledWith({
      pathnames: ["notorium/library/u/orphan.pdf"],
    });
    expect(report).toMatchObject({
      scanned: 2,
      referenced: 1,
      orphaned: 1,
      deleted: 1,
      dryRun: false,
    });
  });

  it("does not delete when dryRun is set", async () => {
    listFileEntriesMock.mockResolvedValue([
      entry("notorium/library/u/orphan.pdf", 10 * DAY),
    ]);
    collectAllReferencedPathnamesMock.mockResolvedValue(new Set<string>());

    const { sweepOrphanBlobs } = await import("@/features/attachments/blob-gc");
    const report = await sweepOrphanBlobs({ minAgeMs: DAY, dryRun: true });

    expect(deleteFilesMock).not.toHaveBeenCalled();
    expect(report).toMatchObject({ orphaned: 1, deleted: 0, dryRun: true });
  });
});

describe("purgeUserBlobs", () => {
  const deleteFilesMock = vi.fn();
  const listFilePathnamesMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getMediaStorageProviderMock.mockResolvedValue({
      deleteFiles: deleteFilesMock,
      listFilePathnames: listFilePathnamesMock,
    });
  });

  it("lists every context prefix including library and deletes the union", async () => {
    listFilePathnamesMock.mockImplementation(
      ({ prefix }: { prefix: string }) =>
        prefix.includes("/library/")
          ? Promise.resolve(["notorium/library/u/book.pdf"])
          : Promise.resolve([]),
    );
    listFilePathnamesMock.mockImplementationOnce(() =>
      Promise.resolve(["notorium/notes/u/a.png"]),
    );

    const { purgeUserBlobs } = await import("@/features/attachments/blob-gc");
    await purgeUserBlobs("u");

    const prefixes = listFilePathnamesMock.mock.calls.map(
      (call) => call[0].prefix,
    );
    expect(prefixes).toContain("notorium/library/u/");
    expect(deleteFilesMock).toHaveBeenCalledTimes(1);
    expect(deleteFilesMock.mock.calls[0][0].pathnames).toContain(
      "notorium/library/u/book.pdf",
    );
  });

  it("swallows storage failures so account deletion still succeeds", async () => {
    listFilePathnamesMock.mockResolvedValue(["notorium/notes/u/a.png"]);
    deleteFilesMock.mockRejectedValue(new Error("boom"));

    const { purgeUserBlobs } = await import("@/features/attachments/blob-gc");

    await expect(purgeUserBlobs("u")).resolves.toBeUndefined();
  });

  it("does nothing when storage is not configured", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce(null);

    const { purgeUserBlobs } = await import("@/features/attachments/blob-gc");
    await purgeUserBlobs("u");

    expect(listFilePathnamesMock).not.toHaveBeenCalled();
  });
});
