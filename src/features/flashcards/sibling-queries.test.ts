import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  eq: vi.fn((column, value) => ({ column, value })),
  inArray: vi.fn((column, values) => ({ column, values })),
  or: vi.fn((...conditions) => conditions),
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id",
    userId: "flashcard_user_id",
    clozeNoteId: "flashcard_cloze_note_id",
    occlusionNoteId: "flashcard_occlusion_note_id",
  },
}));

function mockSelectRows(...rowSets: unknown[][]): void {
  for (const rows of rowSets) {
    selectMock.mockImplementationOnce(() => ({
      from: () => ({ where: vi.fn().mockResolvedValue(rows) }),
    }));
  }
}

describe("flashcard sibling expansion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expands both cloze and occlusion notes for lifecycle mutations", async () => {
    mockSelectRows(
      [
        { clozeNoteId: "cloze-1", occlusionNoteId: null },
        { clozeNoteId: null, occlusionNoteId: "occlusion-1" },
      ],
      [{ id: "cloze-sibling" }, { id: "occlusion-sibling" }],
    );
    const { expandFlashcardNoteSiblingIds } = await import(
      "@/features/flashcards/sibling-queries"
    );

    await expect(
      expandFlashcardNoteSiblingIds("user-1", ["selected-1", "selected-2"]),
    ).resolves.toEqual([
      "selected-1",
      "selected-2",
      "cloze-sibling",
      "occlusion-sibling",
    ]);
  });

  it("expands only occlusion siblings for reset mutations", async () => {
    mockSelectRows(
      [{ clozeNoteId: "cloze-1", occlusionNoteId: "occlusion-1" }],
      [{ id: "occlusion-sibling" }],
    );
    const { expandOcclusionSiblingIds } = await import(
      "@/features/flashcards/sibling-queries"
    );

    await expect(
      expandOcclusionSiblingIds("user-1", ["selected"]),
    ).resolves.toEqual(["selected", "occlusion-sibling"]);
  });
});
