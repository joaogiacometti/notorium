import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("@/db/schema", () => ({
  note: "note_table",
  flashcard: "flashcard_table",
  mindmap: "mindmap_table",
  assessmentAttachment: "assessment_attachment_table",
  libraryBook: "library_book_table",
}));

vi.mock("@/features/mindmaps/utils", () => ({
  getMindmapImagePathnames: (data: string | null) => (data ? [data] : []),
}));

vi.mock("@/lib/editor/rich-text", () => ({
  getInternalAttachmentPathnames: (value: string) =>
    value ? value.split(",").filter(Boolean) : [],
}));

describe("collectAllReferencedPathnames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockImplementation((table: string) => {
      switch (table) {
        case "note_table":
          return Promise.resolve([{ content: "note-a" }, { content: null }]);
        case "flashcard_table":
          return Promise.resolve([
            { front: "front-a", back: "back-a", occlusionImagePathname: null },
            {
              front: "",
              back: "",
              occlusionImagePathname: "notorium/flashcards/u/occ.png",
            },
          ]);
        case "mindmap_table":
          return Promise.resolve([{ data: "mindmap-a" }, { data: null }]);
        case "assessment_attachment_table":
          return Promise.resolve([{ blobPathname: "assess-a" }]);
        case "library_book_table":
          return Promise.resolve([{ blobPathname: "library-a" }]);
        default:
          return Promise.resolve([]);
      }
    });
  });

  it("unions referenced pathnames across every media-bearing table", async () => {
    const { collectAllReferencedPathnames } = await import(
      "@/features/attachments/blob-references"
    );

    const referenced = await collectAllReferencedPathnames();

    expect(referenced).toEqual(
      new Set([
        "note-a",
        "front-aback-a",
        "notorium/flashcards/u/occ.png",
        "mindmap-a",
        "assess-a",
        "library-a",
      ]),
    );
  });
});
