import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
  inArray: (column: unknown, values: unknown) => ({ column, values }),
}));

vi.mock("@/db/schema", () => ({
  assessment: "assessment_table",
  assessmentAttachment: "assessment_attachment_table",
  flashcard: "flashcard_table",
  mindmap: "mindmap_table",
  note: "note_table",
}));

vi.mock("@/features/attachments/pathname", () => ({
  getOwnedAttachmentPathnames: (pathnames: string[]) => pathnames,
}));

vi.mock("@/features/subjects/queries", () => ({
  getDescendantSubjectIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/mindmaps/utils", () => ({
  getMindmapImagePathnames: (data: string | null) => (data ? [data] : []),
}));

vi.mock("@/lib/editor/rich-text", () => ({
  getInternalAttachmentPathnames: (value: string) => (value ? [value] : []),
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: vi.fn(),
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
        case "assessment_attachment_table":
          return {
            innerJoin: () => ({
              where: () =>
                Promise.resolve([
                  { blobPathname: "notorium/assessments/u/a.pdf" },
                ]),
            }),
          };
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

    expect(pathnames).toEqual([
      "note-image",
      "notorium/mindmaps/u/node.png",
      "notorium/assessments/u/a.pdf",
    ]);
  });
});
