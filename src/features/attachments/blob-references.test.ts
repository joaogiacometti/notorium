import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("@/db/schema", () => ({
  note: "note_table",
  flashcard: "flashcard_table",
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
            { front: "front-a", back: "back-a" },
            { front: "", back: "" },
          ]);
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

    expect(referenced).toEqual(new Set(["note-a", "front-aback-a"]));
  });
});
