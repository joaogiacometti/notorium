import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const selectMock = vi.fn(() => ({ from: fromMock }));
const getDescendantSubjectIdsMock = vi
  .fn()
  .mockResolvedValue(["subj", "child"]);
const inArrayMock = vi.fn((column: unknown, values: unknown) => ({
  column,
  values,
}));
const deleteImagesMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
  inArray: inArrayMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: "flashcard_table",
  mindmap: "mindmap_table",
  note: "note_table",
}));

vi.mock("@/features/attachments/pathname", () => ({
  getOwnedAttachmentPathnames: (pathnames: string[]) => pathnames,
}));

vi.mock("@/features/subjects/queries", () => ({
  getDescendantSubjectIds: getDescendantSubjectIdsMock,
}));

vi.mock("@/features/mindmaps/utils", () => ({
  getMindmapImagePathnames: (data: string | null) => (data ? [data] : []),
}));

vi.mock("@/lib/editor/rich-text", () => ({
  getInternalAttachmentPathnames: (value: string) => (value ? [value] : []),
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

describe("getSubjectAttachmentPathnamesForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockImplementation((table: string) => {
      const where = (rows: unknown[]) => ({
        where: () => Promise.resolve(rows),
      });
      switch (table) {
        case "note_table":
          return where([{ content: "note-image" }]);
        case "mindmap_table":
          return where([{ data: "notorium/mindmaps/u/node.png" }]);
        default:
          return where([]);
      }
    });
  });

  it("includes mindmap node images so deleting a subject cleans them up", async () => {
    const { getSubjectAttachmentPathnamesForUser } = await import(
      "@/features/attachments/cleanup"
    );

    const pathnames = await getSubjectAttachmentPathnamesForUser("u", "subj");

    expect(pathnames).toEqual(["note-image", "notorium/mindmaps/u/node.png"]);
    expect(inArrayMock).toHaveBeenCalledTimes(3);
    expect(inArrayMock).toHaveBeenCalledWith(undefined, ["subj", "child"]);
  });

  it("deduplicates owned pathnames before deleting provider files", async () => {
    getMediaStorageProviderMock.mockResolvedValueOnce({
      deleteImages: deleteImagesMock,
    });
    const { cleanupAttachmentPathnames } = await import(
      "@/features/attachments/cleanup"
    );

    await cleanupAttachmentPathnames("u", ["image-1", "image-1", "image-2"]);

    expect(deleteImagesMock).toHaveBeenCalledWith({
      pathnames: ["image-1", "image-2"],
    });
  });
});
