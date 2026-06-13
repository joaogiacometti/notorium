import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OcclusionRegion } from "@/features/flashcards/occlusion";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn((_values?: unknown) => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const getDeckRecordForUserMock = vi.fn();
const countFlashcardsByDeckForUserMock = vi.fn();
const getOcclusionSiblingsForUserMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();
const deleteImagesMock = vi.fn();
const getMediaStorageProviderMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    occlusionNoteId: "flashcard_occlusion_note_id_column",
    occlusionMaskId: "flashcard_occlusion_mask_id_column",
  },
}));

vi.mock("@/features/decks/queries", () => ({
  getDeckRecordForUser: getDeckRecordForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsByDeckForUser: countFlashcardsByDeckForUserMock,
  getOcclusionSiblingsForUser: getOcclusionSiblingsForUserMock,
}));

vi.mock("@/lib/media-storage/provider", () => ({
  getMediaStorageProvider: getMediaStorageProviderMock,
}));

const scheduling = {
  state: "new" as const,
  dueAt: new Date("2026-06-12T10:00:00.000Z"),
  stability: null,
  difficulty: null,
  ease: 250,
  intervalDays: 0,
  learningStep: null,
  lastReviewedAt: null,
  reviewCount: 0,
  lapseCount: 0,
};

// A pathname must match notorium/<context>/<userId>/<file> to count as owned.
const imageA = "notorium/flashcards/user-1/aaa-image.png";
const imageB = "notorium/flashcards/user-1/bbb-image.png";

function regions(): OcclusionRegion[] {
  return [
    { id: "mask-1", x: 0.1, y: 0.1, width: 0.3, height: 0.2, label: "Aorta" },
    { id: "mask-2", x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  getDeckRecordForUserMock.mockResolvedValue({ id: "deck-1", name: "Anatomy" });
  countFlashcardsByDeckForUserMock.mockResolvedValue(0);
  getInitialFlashcardSchedulingStateMock.mockReturnValue(scheduling);
  deleteImagesMock.mockResolvedValue(undefined);
  getMediaStorageProviderMock.mockResolvedValue({
    deleteImages: deleteImagesMock,
  });
});

describe("createOcclusionNoteForUser", () => {
  it("fans out one sibling per region and returns the first", async () => {
    insertReturningMock.mockResolvedValueOnce([
      { id: "sib-1" },
      { id: "sib-2" },
    ]);

    const { createOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const result = await createOcclusionNoteForUser("user-1", {
      deckId: "deck-1",
      occlusionImagePathname: imageA,
      occlusionRegions: regions(),
    });

    expect(result).toEqual({ success: true, flashcard: { id: "sib-1" } });

    const values = insertValuesMock.mock.calls[0]?.[0] as Array<{
      type: string;
      occlusionMaskId: string;
      occlusionNoteId: string;
      occlusionImagePathname: string;
      front: string;
      frontNormalized: string;
    }>;
    expect(values).toHaveLength(2);
    expect(values.map((card) => card.occlusionMaskId)).toEqual([
      "mask-1",
      "mask-2",
    ]);
    expect(new Set(values.map((card) => card.occlusionNoteId)).size).toBe(1);
    expect(values[0].type).toBe("occlusion");
    expect(values[0].occlusionImagePathname).toBe(imageA);
    expect(values[0].front).toBe("Image occlusion · Aorta");
    expect(values[0].frontNormalized).toContain("occlusion:");
  });

  it("rejects when no region survives sanitizing", async () => {
    const { createOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const result = await createOcclusionNoteForUser("user-1", {
      deckId: "deck-1",
      occlusionImagePathname: imageA,
      occlusionRegions: [{ id: "x", x: 0, y: 0, width: 0, height: 0 }],
    });

    expect(result.success).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects when the deck would exceed its card limit", async () => {
    countFlashcardsByDeckForUserMock.mockResolvedValueOnce(2000);

    const { createOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const result = await createOcclusionNoteForUser("user-1", {
      deckId: "deck-1",
      occlusionImagePathname: imageA,
      occlusionRegions: regions(),
    });

    expect(result.success).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("editOcclusionNoteForUser", () => {
  it("updates kept masks, inserts new ones, and deletes removed ones", async () => {
    const existing = {
      id: "sib-1",
      type: "occlusion" as const,
      occlusionNoteId: "note-1",
      occlusionMaskId: "mask-1",
      occlusionImagePathname: imageA,
      deckId: "deck-1",
    };
    const stale = { id: "sib-stale", occlusionMaskId: "mask-old" };
    getOcclusionSiblingsForUserMock
      .mockResolvedValueOnce([existing, stale])
      .mockResolvedValueOnce([
        existing,
        { id: "sib-2", occlusionMaskId: "mask-2" },
      ]);

    const { editOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const result = await editOcclusionNoteForUser(
      "user-1",
      {
        id: "sib-1",
        deckId: "deck-1",
        occlusionImagePathname: imageA,
        occlusionRegions: regions(),
      },
      existing as never,
    );

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1); // mask-1 kept
    expect(insertMock).toHaveBeenCalledTimes(1); // mask-2 added
    expect(deleteMock).toHaveBeenCalledTimes(1); // mask-old removed
    // Image unchanged, so no blob deletion.
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });

  it("deletes the previous image when the source image is replaced", async () => {
    const existing = {
      id: "sib-1",
      type: "occlusion" as const,
      occlusionNoteId: "note-1",
      occlusionMaskId: "mask-1",
      occlusionImagePathname: imageA,
      deckId: "deck-1",
    };
    getOcclusionSiblingsForUserMock
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([existing]);

    const { editOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    await editOcclusionNoteForUser(
      "user-1",
      {
        id: "sib-1",
        deckId: "deck-1",
        occlusionImagePathname: imageB,
        occlusionRegions: regions(),
      },
      existing as never,
    );

    expect(deleteImagesMock).toHaveBeenCalledWith({ pathnames: [imageA] });
  });
});

describe("deleteOcclusionNoteForUser", () => {
  it("removes every sibling and deletes the shared image", async () => {
    const siblings = [
      { id: "sib-1", occlusionImagePathname: imageA },
      { id: "sib-2", occlusionImagePathname: imageA },
    ];
    getOcclusionSiblingsForUserMock.mockResolvedValueOnce(siblings);

    const { deleteOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const removed = await deleteOcclusionNoteForUser("user-1", "note-1");

    expect(removed).toEqual(siblings);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteImagesMock).toHaveBeenCalledWith({ pathnames: [imageA] });
  });

  it("does nothing when the note has no siblings", async () => {
    getOcclusionSiblingsForUserMock.mockResolvedValueOnce([]);

    const { deleteOcclusionNoteForUser } = await import(
      "@/features/flashcards/occlusion-mutations"
    );

    const removed = await deleteOcclusionNoteForUser("user-1", "empty");

    expect(removed).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(deleteImagesMock).not.toHaveBeenCalled();
  });
});
